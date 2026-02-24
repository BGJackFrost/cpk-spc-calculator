import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { IncomingMessage } from 'http';

interface WebSocketClient extends WebSocket {
  clientId: string;
  isAlive: boolean;
  userId?: number;
  userName?: string;
  subscriptions: Set<string>;
  rooms: Set<string>;
  subscribedPlanIds: Set<number>;
  subscribedMachineIds: Set<number>;
  subscribedFixtureIds: Set<number>;
  connectedAt: Date;
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
  private clientMap: Map<string, WebSocketClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private eventLog: Array<{ id: number; type: string; data: any; timestamp: Date; clientCount: number }> = [];
  private eventLogCounter = 0;
  private customHandlers = new Map<string, (client: WebSocketClient, data: any) => void>();
  private static MAX_CLIENTS = 200;
  private static MAX_EVENT_LOG = 200;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: false,
      maxPayload: 64 * 1024, // 64KB max message
    });
    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      if (this.clients.size >= RealtimeWebSocketServer.MAX_CLIENTS) {
        ws.close(1013, 'Too many connections');
        return;
      }

      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const clientId = url.searchParams.get('clientId') || `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      const client = ws as WebSocketClient;
      client.clientId = clientId;
      client.isAlive = true;
      client.subscriptions = new Set();
      client.rooms = new Set(['global']);
      client.subscribedPlanIds = new Set();
      client.subscribedMachineIds = new Set();
      client.subscribedFixtureIds = new Set();
      client.connectedAt = new Date();
      client.lastActivity = Date.now();
      this.clients.add(client);
      this.clientMap.set(clientId, client);
      console.log(`[WebSocket] Client ${clientId} connected. Total: ${this.clients.size}`);
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
          this.sendToClient(client, { type: 'error', data: { message: 'Invalid message format' } });
        }
      });
      client.on('close', () => {
        this.clients.delete(client);
        this.clientMap.delete(clientId);
        console.log(`[WebSocket] Client ${clientId} disconnected. Total: ${this.clients.size}`);
      });
      client.on('error', (error) => {
        console.error(`[WebSocket] Client ${clientId} error:`, error.message);
        this.clients.delete(client);
        this.clientMap.delete(clientId);
      });
      // Send welcome message
      this.sendToClient(client, {
        type: 'connected',
        data: { 
          clientId,
          message: 'Connected to SPC realtime server',
          timestamp: new Date().toISOString(),
          serverTime: Date.now(),
          rooms: Array.from(client.rooms),
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
          this.sendToClient(client, {
            type: 'subscribed',
            channel: message.channel
          });
        }
        break;
      case 'unsubscribe':
        if (message.channel) {
          client.subscriptions.delete(message.channel);
        }
        break;
      // Room management
      case 'join_room':
        if (message.data?.room) {
          client.rooms.add(message.data.room);
          this.sendToClient(client, {
            type: 'room_joined',
            data: { room: message.data.room, rooms: Array.from(client.rooms) }
          });
        }
        break;
      case 'leave_room':
        if (message.data?.room && message.data.room !== 'global') {
          client.rooms.delete(message.data.room);
          this.sendToClient(client, {
            type: 'room_left',
            data: { room: message.data.room, rooms: Array.from(client.rooms) }
          });
        }
        break;
      // User identification
      case 'identify':
        if (message.data?.userId) {
          client.userId = message.data.userId;
          client.userName = message.data.userName;
          client.rooms.add(`user:${message.data.userId}`);
          this.sendToClient(client, {
            type: 'identified',
            data: { userId: message.data.userId, rooms: Array.from(client.rooms) }
          });
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
          client.userName = message.data.userName;
          client.rooms.add(`user:${message.data.userId}`);
          this.sendToClient(client, {
            type: 'authenticated',
            data: { userId: message.data.userId, rooms: Array.from(client.rooms) }
          });
        }
        break;
      default:
        // Check custom handlers
        const handler = this.customHandlers.get(message.type);
        if (handler) {
          handler(client, message.data);
        }
        break;
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
  broadcastAll(type: string, data: any): number {
    const message = { type, data, timestamp: new Date().toISOString() };
    const payload = JSON.stringify(message);
    let sent = 0;
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
          sent++;
        } catch {}
      }
    });
    this.logEvent(type, data, sent);
    return sent;
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

   // ─── SSE Bridge: Broadcast SSE events through WebSocket ─────────
  bridgeSseEvent(eventType: string, data: any): number {
    return this.broadcastAll(eventType, data);
  }

  // ─── Room Broadcast ────────────────────────────────────────────
  broadcastToRoom(room: string, type: string, data: any): number {
    let sent = 0;
    this.clients.forEach((client) => {
      if (client.rooms.has(room) && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }));
        sent++;
      }
    });
    this.logEvent(type, data, sent);
    return sent;
  }

  // ─── Send to specific user ─────────────────────────────────────
  broadcastToUser(userId: number, type: string, data: any): number {
    return this.broadcastToRoom(`user:${userId}`, type, data);
  }

  // ─── Send to specific client ───────────────────────────────────
  sendToClientById(clientId: string, message: any): boolean {
    const client = this.clientMap.get(clientId);
    if (!client || client.readyState !== WebSocket.OPEN) return false;
    try {
      client.send(JSON.stringify({ ...message, timestamp: new Date().toISOString() }));
      return true;
    } catch {
      return false;
    }
  }

  // ─── Custom Handler Registration ──────────────────────────────
  registerHandler(action: string, handler: (client: WebSocketClient, data: any) => void): void {
    this.customHandlers.set(action, handler);
  }

  unregisterHandler(action: string): void {
    this.customHandlers.delete(action);
  }

  // ─── Event Log ─────────────────────────────────────────────────
  private logEvent(type: string, data: any, clientCount: number): void {
    this.eventLog.push({
      id: ++this.eventLogCounter,
      type,
      data,
      timestamp: new Date(),
      clientCount,
    });
    if (this.eventLog.length > RealtimeWebSocketServer.MAX_EVENT_LOG) {
      this.eventLog.splice(0, this.eventLog.length - RealtimeWebSocketServer.MAX_EVENT_LOG);
    }
  }

  getEventLog(limit: number = 50) {
    return this.eventLog.slice(-limit);
  }

  clearEventLog(): void {
    this.eventLog.length = 0;
  }

  // ─── Room Info ─────────────────────────────────────────────────
  getRooms(): Record<string, number> {
    const rooms: Record<string, number> = {};
    this.clients.forEach((client) => {
      client.rooms.forEach((room) => {
        rooms[room] = (rooms[room] || 0) + 1;
      });
    });
    return rooms;
  }

  getClientsInRoom(room: string): string[] {
    const result: string[] = [];
    this.clients.forEach((client) => {
      if (client.rooms.has(room)) {
        result.push(client.clientId);
      }
    });
    return result;
  }

  // ─── Enhanced Stats ────────────────────────────────────────────
  getDetailedStats() {
    let authenticatedCount = 0;
    let planSubscriptions = 0;
    let machineSubscriptions = 0;
    let fixtureSubscriptions = 0;
    const clientDetails: any[] = [];
    this.clients.forEach((client) => {
      if (client.userId) authenticatedCount++;
      planSubscriptions += client.subscribedPlanIds.size;
      machineSubscriptions += client.subscribedMachineIds.size;
      fixtureSubscriptions += client.subscribedFixtureIds.size;
      clientDetails.push({
        clientId: client.clientId,
        userId: client.userId,
        userName: client.userName,
        rooms: Array.from(client.rooms),
        subscriptions: Array.from(client.subscriptions),
        connectedAt: client.connectedAt?.toISOString(),
        isAlive: client.isAlive,
      });
    });
    return {
      totalConnections: this.clients.size,
      authenticatedConnections: authenticatedCount,
      rooms: this.getRooms(),
      subscriptions: {
        plans: planSubscriptions,
        machines: machineSubscriptions,
        fixtures: fixtureSubscriptions,
      },
      clients: clientDetails,
      eventLogSize: this.eventLog.length,
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
    this.clientMap.clear();
    if (this.wss) {
      this.wss.close();
    }
    console.log('[WebSocket] Server shutdown complete');
  }
}
export const wsServer = new RealtimeWebSocketServer();
