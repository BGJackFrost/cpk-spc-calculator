import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  userId?: number;
  subscriptions: Set<string>;
}

interface WebSocketMessage {
  type: string;
  channel?: string;
  data?: any;
}

class RealtimeWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocketClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as WebSocketClient;
      client.isAlive = true;
      client.subscriptions = new Set();
      this.clients.add(client);

      console.log(`[WebSocket] Client connected. Total clients: ${this.clients.size}`);

      client.on('pong', () => {
        client.isAlive = true;
      });

      client.on('message', (message: Buffer) => {
        try {
          const data: WebSocketMessage = JSON.parse(message.toString());
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
        data: { message: 'Connected to realtime server' }
      });
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          client.terminate();
          this.clients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

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

      case 'ping':
        this.sendToClient(client, { type: 'pong' });
        break;

      default:
        console.log(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  private sendToClient(client: WebSocketClient, message: WebSocketMessage) {
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

  // Send machine status update
  sendMachineStatusUpdate(machineId: number, status: any) {
    this.broadcast('machine_status', { machineId, ...status });
    this.broadcast(`machine_${machineId}`, status);
  }

  // Send OEE update
  sendOEEUpdate(machineId: number, oeeData: any) {
    this.broadcast('oee_updates', { machineId, ...oeeData });
    this.broadcast(`oee_${machineId}`, oeeData);
  }

  // Send SPC alert
  sendSPCAlert(alert: any) {
    this.broadcastAll('spc_alert', alert);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.forEach((client) => {
      client.terminate();
    });
    this.clients.clear();
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const wsServer = new RealtimeWebSocketServer();
