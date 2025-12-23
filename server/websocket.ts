import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  userId?: number;
  subscriptions: Set<string>;
  subscribedPlanIds: Set<number>;
  subscribedMachineIds: Set<number>;
  subscribedFixtureIds: Set<number>;
  lastActivity: number;
}

interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
  planId?: number;
  machineId?: number;
  fixtureId?: number;
}

export interface SpcUpdateData {
  planId: number;
  planName?: string;
  cpk: number | null;
  cp: number | null;
  ppk?: number | null;
  mean: number | null;
  stdDev: number | null;
  sampleCount: number;
  timestamp: Date;
  status: string;
  violations?: string[];
  usl?: number | null;
  lsl?: number | null;
}

export interface CpkAlertData {
  planId: number;
  planName: string;
  cpk: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
  productCode?: string;
  stationName?: string;
}

export interface FixtureUpdateData {
  fixtureId: number;
  fixtureName: string;
  machineId?: number;
  machineName?: string;
  cpk: number | null;
  oocRate: number;
  sampleCount: number;
  timestamp: Date;
  status: string;
}

export interface MachineStatusData {
  machineId: number;
  machineName: string;
  status: 'running' | 'idle' | 'maintenance' | 'error' | 'offline';
  oee: number | null;
  availability?: number | null;
  performance?: number | null;
  quality?: number | null;
  timestamp: Date;
}

class RealtimeWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocketClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: false, // Disable compression for lower latency
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as WebSocketClient;
      client.isAlive = true;
      client.subscriptions = new Set();
      client.subscribedPlanIds = new Set();
      client.subscribedMachineIds = new Set();
      client.subscribedFixtureIds = new Set();
      client.lastActivity = Date.now();
      this.clients.add(client);

      console.log(`[WebSocket] Client connected. Total clients: ${this.clients.size}`);

      client.on('pong', () => {
        client.isAlive = true;
        client.lastActivity = Date.now();
      });

      client.on('message', (message: Buffer) => {
        try {
          const data: WebSocketMessage = JSON.parse(message.toString());
          client.lastActivity = Date.now();
          this.handleMessage(client, data);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      });

      client.on('close', () => {
        this.clients.delete(client);
        console.log(`[WebSocket] Client disconnected. Total clients: ${this.clients.size}`);
      });

      client.on('error', (error) => {
        console.error('[WebSocket] Client error:', error);
        this.clients.delete(client);
      });

      // Send welcome message
      this.sendToClient(client, {
        type: 'connected',
        data: { 
          message: 'Connected to SPC realtime server',
          timestamp: new Date().toISOString(),
          serverTime: Date.now()
        }
      });
    });

    // Start heartbeat (every 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          console.log('[WebSocket] Terminating inactive client');
          client.terminate();
          this.clients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    // Cleanup stale connections (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes
      this.clients.forEach((client) => {
        if (now - client.lastActivity > timeout) {
          console.log('[WebSocket] Cleaning up stale connection');
          client.terminate();
          this.clients.delete(client);
        }
      });
    }, 5 * 60 * 1000);

    console.log('[WebSocket] Server initialized on /ws');
  }

  private handleMessage(client: WebSocketClient, message: WebSocketMessage) {
    switch (message.type) {
      case 'subscribe':
        if (message.channel) {
          client.subscriptions.add(message.channel);
          console.log(`[WebSocket] Client subscribed to: ${message.channel}`);
          this.sendToClient(client, {
            type: 'subscribed',
            channel: message.channel
          });
        }
        break;

      case 'unsubscribe':
        if (message.channel) {
          client.subscriptions.delete(message.channel);
          console.log(`[WebSocket] Client unsubscribed from: ${message.channel}`);
        }
        break;

      // SPC Plan subscriptions
      case 'subscribe_plan':
        if (typeof message.planId === 'number') {
          client.subscribedPlanIds.add(message.planId);
          this.sendToClient(client, {
            type: 'subscribed',
            data: { resource: 'plan', id: message.planId }
          });
        }
        break;

      case 'unsubscribe_plan':
        if (typeof message.planId === 'number') {
          client.subscribedPlanIds.delete(message.planId);
          this.sendToClient(client, {
            type: 'unsubscribed',
            data: { resource: 'plan', id: message.planId }
          });
        }
        break;

      case 'subscribe_all_plans':
        client.subscribedPlanIds.add(-1); // -1 means all plans
        this.sendToClient(client, {
          type: 'subscribed',
          data: { resource: 'all_plans' }
        });
        break;

      // Machine subscriptions
      case 'subscribe_machine':
        if (typeof message.machineId === 'number') {
          client.subscribedMachineIds.add(message.machineId);
          this.sendToClient(client, {
            type: 'subscribed',
            data: { resource: 'machine', id: message.machineId }
          });
        }
        break;

      case 'unsubscribe_machine':
        if (typeof message.machineId === 'number') {
          client.subscribedMachineIds.delete(message.machineId);
        }
        break;

      case 'subscribe_all_machines':
        client.subscribedMachineIds.add(-1);
        this.sendToClient(client, {
          type: 'subscribed',
          data: { resource: 'all_machines' }
        });
        break;

      // Fixture subscriptions
      case 'subscribe_fixture':
        if (typeof message.fixtureId === 'number') {
          client.subscribedFixtureIds.add(message.fixtureId);
          this.sendToClient(client, {
            type: 'subscribed',
            data: { resource: 'fixture', id: message.fixtureId }
          });
        }
        break;

      case 'unsubscribe_fixture':
        if (typeof message.fixtureId === 'number') {
          client.subscribedFixtureIds.delete(message.fixtureId);
        }
        break;

      case 'subscribe_all_fixtures':
        client.subscribedFixtureIds.add(-1);
        this.sendToClient(client, {
          type: 'subscribed',
          data: { resource: 'all_fixtures' }
        });
        break;

      case 'ping':
        this.sendToClient(client, { type: 'pong', data: { timestamp: Date.now() } });
        break;

      case 'authenticate':
        if (message.data?.userId) {
          client.userId = message.data.userId;
          this.sendToClient(client, {
            type: 'authenticated',
            data: { userId: message.data.userId }
          });
        }
        break;

      default:
        console.log(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  private sendToClient(client: WebSocketClient, message: WebSocketMessage | any) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // Broadcast to all clients subscribed to a channel
  broadcast(channel: string, data: any) {
    const message: WebSocketMessage = {
      type: 'update',
      channel,
      data
    };

    this.clients.forEach((client) => {
      if (client.subscriptions.has(channel) && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Broadcast to all clients
  broadcastAll(type: string, data: any) {
    const message: WebSocketMessage = { type, data };
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Send SPC update to subscribed clients
  sendSpcUpdate(data: SpcUpdateData) {
    const message = {
      type: 'spc_update',
      data: {
        ...data,
        timestamp: data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp
      }
    };

    this.clients.forEach((client) => {
      if (
        client.subscribedPlanIds.has(data.planId) ||
        client.subscribedPlanIds.has(-1) // -1 means all plans
      ) {
        this.sendToClient(client, message);
      }
    });

    // Also broadcast to channel subscribers
    this.broadcast(`spc_plan_${data.planId}`, data);
    this.broadcast('spc_updates', data);
  }

  // Send CPK alert to all clients
  sendCpkAlert(data: CpkAlertData) {
    const message = {
      type: 'cpk_alert',
      data: {
        ...data,
        timestamp: data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp
      }
    };

    // Broadcast to all clients (alerts are important)
    this.broadcastAll('cpk_alert', message.data);
  }

  // Send fixture update to subscribed clients
  sendFixtureUpdate(data: FixtureUpdateData) {
    const message = {
      type: 'fixture_update',
      data: {
        ...data,
        timestamp: data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp
      }
    };

    this.clients.forEach((client) => {
      if (
        client.subscribedFixtureIds.has(data.fixtureId) ||
        client.subscribedFixtureIds.has(-1)
      ) {
        this.sendToClient(client, message);
      }
    });

    // Also broadcast to channel subscribers
    this.broadcast(`fixture_${data.fixtureId}`, data);
    this.broadcast('fixture_updates', data);
  }

  // Send machine status update
  sendMachineStatusUpdate(machineId: number, status: any) {
    const data: MachineStatusData = {
      machineId,
      machineName: status.machineName || `Machine ${machineId}`,
      status: status.status || 'running',
      oee: status.oee ?? null,
      availability: status.availability ?? null,
      performance: status.performance ?? null,
      quality: status.quality ?? null,
      timestamp: new Date()
    };

    const message = {
      type: 'machine_status',
      data: {
        ...data,
        timestamp: data.timestamp.toISOString()
      }
    };

    this.clients.forEach((client) => {
      if (
        client.subscribedMachineIds.has(machineId) ||
        client.subscribedMachineIds.has(-1)
      ) {
        this.sendToClient(client, message);
      }
    });

    // Also broadcast to channel subscribers
    this.broadcast('machine_status', { machineId, ...status });
    this.broadcast(`machine_${machineId}`, status);
  }

  // Send OEE update
  sendOEEUpdate(machineId: number, oeeData: any) {
    this.broadcast('oee_updates', { machineId, ...oeeData });
    this.broadcast(`oee_${machineId}`, oeeData);
  }

  // Send SPC alert (legacy support)
  sendSPCAlert(alert: any) {
    this.broadcastAll('spc_alert', alert);
  }

  // Send shift comparison update
  sendShiftComparisonUpdate(data: {
    planId: number;
    shifts: Array<{
      shiftName: string;
      avgCpk: number | null;
      sampleCount: number;
    }>;
    timestamp: Date;
  }) {
    const message = {
      type: 'shift_comparison',
      data: {
        ...data,
        timestamp: data.timestamp instanceof Date ? data.timestamp.toISOString() : data.timestamp
      }
    };

    this.clients.forEach((client) => {
      if (
        client.subscribedPlanIds.has(data.planId) ||
        client.subscribedPlanIds.has(-1)
      ) {
        this.sendToClient(client, message);
      }
    });

    this.broadcast('shift_comparison', message.data);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getStats() {
    let authenticatedCount = 0;
    let planSubscriptions = 0;
    let machineSubscriptions = 0;
    let fixtureSubscriptions = 0;

    this.clients.forEach((client) => {
      if (client.userId) authenticatedCount++;
      planSubscriptions += client.subscribedPlanIds.size;
      machineSubscriptions += client.subscribedMachineIds.size;
      fixtureSubscriptions += client.subscribedFixtureIds.size;
    });

    return {
      totalConnections: this.clients.size,
      authenticatedConnections: authenticatedCount,
      subscriptions: {
        plans: planSubscriptions,
        machines: machineSubscriptions,
        fixtures: fixtureSubscriptions
      }
    };
  }

  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clients.forEach((client) => {
      client.terminate();
    });
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
    }
    console.log('[WebSocket] Server shutdown complete');
  }
}

export const wsServer = new RealtimeWebSocketServer();
