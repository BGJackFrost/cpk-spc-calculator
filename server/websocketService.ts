/**
 * WebSocket Service for Real-time SPC Data
 * Provides low-latency real-time updates for SPC/CPK data
 */

import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

interface WebSocketClient {
  ws: WebSocket;
  userId?: string;
  subscribedPlans: Set<number>;
  subscribedMachines: Set<number>;
  subscribedFixtures: Set<number>;
  lastPing: number;
}

interface SpcUpdateMessage {
  type: "spc_update";
  planId: number;
  data: {
    cpk: number | null;
    cp: number | null;
    mean: number | null;
    stdDev: number | null;
    sampleCount: number;
    timestamp: Date;
    status: string;
    violations: string[];
  };
}

interface CpkAlertMessage {
  type: "cpk_alert";
  planId: number;
  planName: string;
  cpk: number;
  threshold: number;
  severity: "warning" | "critical";
  timestamp: Date;
}

interface FixtureUpdateMessage {
  type: "fixture_update";
  fixtureId: number;
  fixtureName: string;
  data: {
    cpk: number | null;
    oocRate: number;
    sampleCount: number;
    timestamp: Date;
  };
}

interface MachineStatusMessage {
  type: "machine_status";
  machineId: number;
  machineName: string;
  status: "running" | "idle" | "maintenance" | "error";
  oee: number | null;
  timestamp: Date;
}

type WebSocketMessage =
  | SpcUpdateMessage
  | CpkAlertMessage
  | FixtureUpdateMessage
  | MachineStatusMessage;

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, WebSocketClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    if (this.isInitialized) {
      console.log("[WebSocket] Already initialized");
      return;
    }

    this.wss = new WebSocketServer({ 
      server, 
      path: "/ws",
      perMessageDeflate: false, // Disable compression for lower latency
    });

    this.wss.on("connection", (ws, req) => {
      const clientIp = req.socket.remoteAddress;
      console.log(`[WebSocket] New connection from ${clientIp}`);

      const client: WebSocketClient = {
        ws,
        subscribedPlans: new Set(),
        subscribedMachines: new Set(),
        subscribedFixtures: new Set(),
        lastPing: Date.now(),
      };
      this.clients.set(ws, client);

      // Send welcome message
      this.sendToClient(ws, {
        type: "connected",
        message: "WebSocket connected successfully",
        timestamp: new Date(),
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      });

      ws.on("close", () => {
        console.log(`[WebSocket] Client disconnected`);
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("[WebSocket] Client error:", error);
        this.clients.delete(ws);
      });

      ws.on("pong", () => {
        const client = this.clients.get(ws);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });

    // Start ping interval to keep connections alive
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000); // Ping every 30 seconds

    this.isInitialized = true;
    console.log("[WebSocket] Server initialized on /ws");
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(ws: WebSocket, message: any): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case "subscribe_plan":
        if (typeof message.planId === "number") {
          client.subscribedPlans.add(message.planId);
          this.sendToClient(ws, {
            type: "subscribed",
            resource: "plan",
            id: message.planId,
          });
        }
        break;

      case "unsubscribe_plan":
        if (typeof message.planId === "number") {
          client.subscribedPlans.delete(message.planId);
          this.sendToClient(ws, {
            type: "unsubscribed",
            resource: "plan",
            id: message.planId,
          });
        }
        break;

      case "subscribe_machine":
        if (typeof message.machineId === "number") {
          client.subscribedMachines.add(message.machineId);
          this.sendToClient(ws, {
            type: "subscribed",
            resource: "machine",
            id: message.machineId,
          });
        }
        break;

      case "unsubscribe_machine":
        if (typeof message.machineId === "number") {
          client.subscribedMachines.delete(message.machineId);
          this.sendToClient(ws, {
            type: "unsubscribed",
            resource: "machine",
            id: message.machineId,
          });
        }
        break;

      case "subscribe_fixture":
        if (typeof message.fixtureId === "number") {
          client.subscribedFixtures.add(message.fixtureId);
          this.sendToClient(ws, {
            type: "subscribed",
            resource: "fixture",
            id: message.fixtureId,
          });
        }
        break;

      case "unsubscribe_fixture":
        if (typeof message.fixtureId === "number") {
          client.subscribedFixtures.delete(message.fixtureId);
          this.sendToClient(ws, {
            type: "unsubscribed",
            resource: "fixture",
            id: message.fixtureId,
          });
        }
        break;

      case "subscribe_all_plans":
        // Subscribe to all active plans
        client.subscribedPlans.add(-1); // -1 means all plans
        this.sendToClient(ws, {
          type: "subscribed",
          resource: "all_plans",
        });
        break;

      case "authenticate":
        if (message.userId) {
          client.userId = message.userId;
          this.sendToClient(ws, {
            type: "authenticated",
            userId: message.userId,
          });
        }
        break;

      case "ping":
        this.sendToClient(ws, { type: "pong", timestamp: Date.now() });
        break;

      default:
        console.log("[WebSocket] Unknown message type:", message.type);
    }
  }

  /**
   * Send message to a specific client
   */
  private sendToClient(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Ping all clients to keep connections alive
   */
  private pingClients(): void {
    const now = Date.now();
    const timeout = 60000; // 60 seconds timeout

    this.clients.forEach((client, ws) => {
      if (now - client.lastPing > timeout) {
        console.log("[WebSocket] Client timed out, closing connection");
        ws.terminate();
        this.clients.delete(ws);
        return;
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    });
  }

  /**
   * Broadcast SPC update to subscribed clients
   */
  broadcastSpcUpdate(planId: number, data: SpcUpdateMessage["data"]): void {
    const message: SpcUpdateMessage = {
      type: "spc_update",
      planId,
      data,
    };

    this.clients.forEach((client, ws) => {
      if (
        client.subscribedPlans.has(planId) ||
        client.subscribedPlans.has(-1) // -1 means all plans
      ) {
        this.sendToClient(ws, message);
      }
    });
  }

  /**
   * Broadcast CPK alert to all connected clients
   */
  broadcastCpkAlert(
    planId: number,
    planName: string,
    cpk: number,
    threshold: number,
    severity: "warning" | "critical"
  ): void {
    const message: CpkAlertMessage = {
      type: "cpk_alert",
      planId,
      planName,
      cpk,
      threshold,
      severity,
      timestamp: new Date(),
    };

    // Broadcast to all clients (alerts are important)
    this.clients.forEach((_, ws) => {
      this.sendToClient(ws, message);
    });
  }

  /**
   * Broadcast fixture update to subscribed clients
   */
  broadcastFixtureUpdate(
    fixtureId: number,
    fixtureName: string,
    data: FixtureUpdateMessage["data"]
  ): void {
    const message: FixtureUpdateMessage = {
      type: "fixture_update",
      fixtureId,
      fixtureName,
      data,
    };

    this.clients.forEach((client, ws) => {
      if (client.subscribedFixtures.has(fixtureId)) {
        this.sendToClient(ws, message);
      }
    });
  }

  /**
   * Broadcast machine status update
   */
  broadcastMachineStatus(
    machineId: number,
    machineName: string,
    status: MachineStatusMessage["status"],
    oee: number | null
  ): void {
    const message: MachineStatusMessage = {
      type: "machine_status",
      machineId,
      machineName,
      status,
      oee,
      timestamp: new Date(),
    };

    this.clients.forEach((client, ws) => {
      if (client.subscribedMachines.has(machineId)) {
        this.sendToClient(ws, message);
      }
    });
  }

  /**
   * Broadcast custom message to all clients
   */
  broadcast(message: any): void {
    this.clients.forEach((_, ws) => {
      this.sendToClient(ws, message);
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    subscriptions: {
      plans: number;
      machines: number;
      fixtures: number;
    };
  } {
    let authenticatedCount = 0;
    let planSubscriptions = 0;
    let machineSubscriptions = 0;
    let fixtureSubscriptions = 0;

    this.clients.forEach((client) => {
      if (client.userId) authenticatedCount++;
      planSubscriptions += client.subscribedPlans.size;
      machineSubscriptions += client.subscribedMachines.size;
      fixtureSubscriptions += client.subscribedFixtures.size;
    });

    return {
      totalConnections: this.clients.size,
      authenticatedConnections: authenticatedCount,
      subscriptions: {
        plans: planSubscriptions,
        machines: machineSubscriptions,
        fixtures: fixtureSubscriptions,
      },
    };
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.clients.forEach((_, ws) => {
      ws.close(1000, "Server shutting down");
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.isInitialized = false;
    console.log("[WebSocket] Server shutdown complete");
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

// Export types for use in other modules
export type {
  SpcUpdateMessage,
  CpkAlertMessage,
  FixtureUpdateMessage,
  MachineStatusMessage,
  WebSocketMessage,
};
