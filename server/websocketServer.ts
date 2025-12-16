/**
 * WebSocket Server cho Realtime Data
 * Cung cấp kết nối realtime cho Dashboard
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { dataCollectorManager } from './dataCollector';
import { getDb } from './db';
import { systemConfig } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

interface WebSocketClient extends WebSocket {
  isAlive: boolean;
  subscriptions: Set<string>;
  userId?: string;
}

interface RealtimeMessage {
  type: 'subscribe' | 'unsubscribe' | 'data' | 'status' | 'alert' | 'ping' | 'pong';
  channel?: string;
  data?: any;
}

// WebSocket enabled flag - default is disabled
let wsEnabled = process.env.WEBSOCKET_ENABLED === 'true';
let configLoaded = false;

// Load WebSocket config from database
export async function loadWebSocketConfig(): Promise<void> {
  if (configLoaded) return;
  try {
    const db = await getDb();
    if (!db) return;
    const [config] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'websocket_enabled'))
      .limit(1);
    if (config) {
      wsEnabled = config.configValue === 'true';
      console.log(`[WebSocket] Loaded config from database: ${wsEnabled ? 'Enabled' : 'Disabled'}`);
    }
    configLoaded = true;
  } catch (error) {
    console.error('[WebSocket] Error loading config from database:', error);
  }
}

export function isWebSocketEnabled(): boolean {
  return wsEnabled;
}

export async function setWebSocketEnabled(enabled: boolean): Promise<void> {
  wsEnabled = enabled;
  console.log(`[WebSocket] ${enabled ? 'Enabled' : 'Disabled'}`);
  
  // Save to database
  try {
    const db = await getDb();
    if (!db) return;
    const [existing] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, 'websocket_enabled'))
      .limit(1);
    
    if (existing) {
      await db
        .update(systemConfig)
        .set({ configValue: enabled ? 'true' : 'false' })
        .where(eq(systemConfig.configKey, 'websocket_enabled'));
    } else {
      await db.insert(systemConfig).values({
        configKey: 'websocket_enabled',
        configValue: enabled ? 'true' : 'false',
        configType: 'boolean',
        description: 'WebSocket server enabled/disabled',
      });
    }
  } catch (error) {
    console.error('[WebSocket] Error saving config to database:', error);
  }
}

class RealtimeWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocketClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private initialized: boolean = false;

  initialize(server: HttpServer) {
    // Check if WebSocket is enabled
    if (!wsEnabled) {
      console.log('[WebSocket] Server is disabled. Set WEBSOCKET_ENABLED=true to enable.');
      return;
    }
    
    if (this.initialized) {
      console.log('[WebSocket] Server already initialized');
      return;
    }
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/realtime'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      const client = ws as WebSocketClient;
      client.isAlive = true;
      client.subscriptions = new Set();
      this.clients.add(client);

      console.log('[WebSocket] Client connected. Total clients:', this.clients.size);

      // Handle incoming messages
      client.on('message', (message: Buffer) => {
        try {
          const msg: RealtimeMessage = JSON.parse(message.toString());
          this.handleMessage(client, msg);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      });

      // Handle pong for heartbeat
      client.on('pong', () => {
        client.isAlive = true;
      });

      // Handle disconnect
      client.on('close', () => {
        this.clients.delete(client);
        console.log('[WebSocket] Client disconnected. Total clients:', this.clients.size);
      });

      // Handle errors
      client.on('error', (error) => {
        console.error('[WebSocket] Client error:', error);
        this.clients.delete(client);
      });

      // Send welcome message
      this.send(client, {
        type: 'status',
        data: { connected: true, timestamp: new Date().toISOString() }
      });
    });

    // Start heartbeat interval
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach(client => {
        if (!client.isAlive) {
          client.terminate();
          this.clients.delete(client);
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    // Listen to data collector events
    this.setupDataCollectorListeners();

    this.initialized = true;
    console.log('[WebSocket] Server initialized on /ws/realtime');
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  private setupDataCollectorListeners() {
    // Listen for new data points
    dataCollectorManager.on('data', (data: any) => {
      this.broadcast('machine-data', {
        type: 'data',
        channel: 'machine-data',
        data
      });
    });

    // Listen for status updates
    dataCollectorManager.on('status', (status: any) => {
      this.broadcast('machine-status', {
        type: 'status',
        channel: 'machine-status',
        data: status
      });
    });

    // Listen for alerts
    dataCollectorManager.on('alert', (alert: any) => {
      this.broadcast('alerts', {
        type: 'alert',
        channel: 'alerts',
        data: alert
      });
    });
  }

  private handleMessage(client: WebSocketClient, msg: RealtimeMessage) {
    switch (msg.type) {
      case 'subscribe':
        if (msg.channel) {
          client.subscriptions.add(msg.channel);
          this.send(client, {
            type: 'status',
            data: { subscribed: msg.channel }
          });
        }
        break;

      case 'unsubscribe':
        if (msg.channel) {
          client.subscriptions.delete(msg.channel);
          this.send(client, {
            type: 'status',
            data: { unsubscribed: msg.channel }
          });
        }
        break;

      case 'ping':
        this.send(client, { type: 'pong' });
        break;

      default:
        console.log('[WebSocket] Unknown message type:', msg.type);
    }
  }

  private send(client: WebSocketClient, msg: RealtimeMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(msg));
    }
  }

  private broadcast(channel: string, msg: RealtimeMessage) {
    this.clients.forEach(client => {
      // Send to all clients subscribed to this channel or to 'all'
      if (client.subscriptions.has(channel) || client.subscriptions.has('all')) {
        this.send(client, msg);
      }
    });
  }

  // Public method to broadcast data from outside
  broadcastData(channel: string, data: any) {
    this.broadcast(channel, {
      type: 'data',
      channel,
      data
    });
  }

  // Public method to broadcast alert
  broadcastAlert(alert: any) {
    this.broadcast('alerts', {
      type: 'alert',
      channel: 'alerts',
      data: alert
    });
  }

  // Get connected client count
  getClientCount(): number {
    return this.clients.size;
  }

  // Cleanup
  close() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.forEach(client => client.terminate());
    this.clients.clear();
    this.wss?.close();
  }
}

export const realtimeWebSocketServer = new RealtimeWebSocketServer();
