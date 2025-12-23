/**
 * RealtimeWebSocketService - Quản lý WebSocket connections và real-time data streaming
 * Phase 3.1 - Real-time Data Processing
 */

import { EventEmitter } from 'events';

// Types
export interface WebSocketClient {
  id: string;
  userId?: string;
  subscribedChannels: Set<string>;
  lastHeartbeat: Date;
  metadata: Record<string, any>;
}

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'message' | 'heartbeat' | 'error';
  channel?: string;
  data?: any;
  timestamp: Date;
}

export interface ChannelSubscription {
  channel: string;
  clientIds: Set<string>;
  lastUpdate: Date;
}

export type EventType = 
  | 'spc_data_update'
  | 'oee_data_update'
  | 'alert_notification'
  | 'system_health_update'
  | 'security_event'
  | 'iot_device_update'
  | 'ai_prediction_update'
  | 'connection_status';

export interface RealtimeEvent {
  type: EventType;
  channel: string;
  data: any;
  timestamp: Date;
  source?: string;
}

// Constants
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds
const MAX_CLIENTS = 1000;
const MAX_CHANNELS_PER_CLIENT = 50;

class RealtimeWebSocketService extends EventEmitter {
  private clients: Map<string, WebSocketClient> = new Map();
  private channels: Map<string, ChannelSubscription> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private messageQueue: RealtimeEvent[] = [];
  private maxQueueSize: number = 10000;

  // Predefined channels
  private readonly SYSTEM_CHANNELS = [
    'spc:realtime',
    'oee:realtime',
    'alerts:all',
    'system:health',
    'security:events',
    'iot:devices',
    'ai:predictions'
  ];

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  /**
   * Start the WebSocket service
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startHeartbeat();
    
    // Initialize system channels
    this.SYSTEM_CHANNELS.forEach(channel => {
      this.channels.set(channel, {
        channel,
        clientIds: new Set(),
        lastUpdate: new Date()
      });
    });

    console.log('[RealtimeWebSocket] Service started');
    this.emit('service_started');
  }

  /**
   * Stop the WebSocket service
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Disconnect all clients
    this.clients.forEach((_, clientId) => {
      this.removeClient(clientId);
    });

    console.log('[RealtimeWebSocket] Service stopped');
    this.emit('service_stopped');
  }

  /**
   * Register a new client
   */
  registerClient(clientId: string, userId?: string, metadata?: Record<string, any>): WebSocketClient | null {
    if (this.clients.size >= MAX_CLIENTS) {
      console.warn('[RealtimeWebSocket] Max clients reached');
      return null;
    }

    const client: WebSocketClient = {
      id: clientId,
      userId,
      subscribedChannels: new Set(),
      lastHeartbeat: new Date(),
      metadata: metadata || {}
    };

    this.clients.set(clientId, client);
    console.log(`[RealtimeWebSocket] Client registered: ${clientId}`);
    
    this.emit('client_connected', { clientId, userId });
    return client;
  }

  /**
   * Remove a client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Unsubscribe from all channels
    client.subscribedChannels.forEach(channel => {
      this.unsubscribeFromChannel(clientId, channel);
    });

    this.clients.delete(clientId);
    console.log(`[RealtimeWebSocket] Client removed: ${clientId}`);
    
    this.emit('client_disconnected', { clientId });
  }

  /**
   * Subscribe client to a channel
   */
  subscribeToChannel(clientId: string, channel: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    if (client.subscribedChannels.size >= MAX_CHANNELS_PER_CLIENT) {
      console.warn(`[RealtimeWebSocket] Client ${clientId} reached max channels`);
      return false;
    }

    client.subscribedChannels.add(channel);

    // Create channel if not exists
    if (!this.channels.has(channel)) {
      this.channels.set(channel, {
        channel,
        clientIds: new Set(),
        lastUpdate: new Date()
      });
    }

    const channelSub = this.channels.get(channel)!;
    channelSub.clientIds.add(clientId);

    console.log(`[RealtimeWebSocket] Client ${clientId} subscribed to ${channel}`);
    this.emit('channel_subscribed', { clientId, channel });
    
    return true;
  }

  /**
   * Unsubscribe client from a channel
   */
  unsubscribeFromChannel(clientId: string, channel: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.subscribedChannels.delete(channel);

    const channelSub = this.channels.get(channel);
    if (channelSub) {
      channelSub.clientIds.delete(clientId);
      
      // Remove empty non-system channels
      if (channelSub.clientIds.size === 0 && !this.SYSTEM_CHANNELS.includes(channel)) {
        this.channels.delete(channel);
      }
    }

    console.log(`[RealtimeWebSocket] Client ${clientId} unsubscribed from ${channel}`);
    this.emit('channel_unsubscribed', { clientId, channel });
    
    return true;
  }

  /**
   * Broadcast message to all subscribers of a channel
   */
  broadcast(channel: string, data: any, eventType: EventType): number {
    const channelSub = this.channels.get(channel);
    if (!channelSub) return 0;

    const event: RealtimeEvent = {
      type: eventType,
      channel,
      data,
      timestamp: new Date()
    };

    // Add to queue
    this.addToQueue(event);

    // Update channel last update
    channelSub.lastUpdate = new Date();

    // Emit to all subscribers
    let sentCount = 0;
    channelSub.clientIds.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        this.emit(`message:${clientId}`, event);
        sentCount++;
      }
    });

    console.log(`[RealtimeWebSocket] Broadcast to ${channel}: ${sentCount} clients`);
    return sentCount;
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, data: any, eventType: EventType): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    const event: RealtimeEvent = {
      type: eventType,
      channel: 'direct',
      data,
      timestamp: new Date()
    };

    this.emit(`message:${clientId}`, event);
    return true;
  }

  /**
   * Update client heartbeat
   */
  updateHeartbeat(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastHeartbeat = new Date();
    }
  }

  /**
   * Get client info
   */
  getClient(clientId: string): WebSocketClient | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Get all clients
   */
  getAllClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Get channel subscribers count
   */
  getChannelSubscriberCount(channel: string): number {
    const channelSub = this.channels.get(channel);
    return channelSub ? channelSub.clientIds.size : 0;
  }

  /**
   * Get all channels
   */
  getAllChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Get service stats
   */
  getStats(): {
    isRunning: boolean;
    clientCount: number;
    channelCount: number;
    queueSize: number;
    channels: { name: string; subscribers: number; lastUpdate: Date }[];
  } {
    return {
      isRunning: this.isRunning,
      clientCount: this.clients.size,
      channelCount: this.channels.size,
      queueSize: this.messageQueue.length,
      channels: Array.from(this.channels.entries()).map(([name, sub]) => ({
        name,
        subscribers: sub.clientIds.size,
        lastUpdate: sub.lastUpdate
      }))
    };
  }

  /**
   * Start heartbeat checker
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeoutClients: string[] = [];

      this.clients.forEach((client, clientId) => {
        const timeSinceHeartbeat = now.getTime() - client.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > CLIENT_TIMEOUT) {
          timeoutClients.push(clientId);
        }
      });

      // Remove timed out clients
      timeoutClients.forEach(clientId => {
        console.log(`[RealtimeWebSocket] Client ${clientId} timed out`);
        this.removeClient(clientId);
      });

      // Emit heartbeat event
      this.emit('heartbeat', { 
        timestamp: now, 
        activeClients: this.clients.size,
        removedClients: timeoutClients.length
      });
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Add event to queue
   */
  private addToQueue(event: RealtimeEvent): void {
    this.messageQueue.push(event);
    
    // Trim queue if too large
    if (this.messageQueue.length > this.maxQueueSize) {
      this.messageQueue = this.messageQueue.slice(-this.maxQueueSize / 2);
    }
  }

  /**
   * Get recent events from queue
   */
  getRecentEvents(count: number = 100, channel?: string): RealtimeEvent[] {
    let events = this.messageQueue;
    
    if (channel) {
      events = events.filter(e => e.channel === channel);
    }
    
    return events.slice(-count);
  }

  // ============ Event-specific broadcast methods ============

  /**
   * Broadcast SPC data update
   */
  broadcastSpcUpdate(data: {
    planId?: number;
    productCode: string;
    workstation: string;
    cpk: number;
    mean: number;
    stdDev: number;
    violations?: string[];
  }): number {
    return this.broadcast('spc:realtime', data, 'spc_data_update');
  }

  /**
   * Broadcast OEE data update
   */
  broadcastOeeUpdate(data: {
    machineId: number;
    machineName: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }): number {
    return this.broadcast('oee:realtime', data, 'oee_data_update');
  }

  /**
   * Broadcast alert notification
   */
  broadcastAlert(data: {
    alertId: string;
    type: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    source?: string;
    metadata?: Record<string, any>;
  }): number {
    return this.broadcast('alerts:all', data, 'alert_notification');
  }

  /**
   * Broadcast system health update
   */
  broadcastSystemHealth(data: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
    services: { name: string; status: string }[];
  }): number {
    return this.broadcast('system:health', data, 'system_health_update');
  }

  /**
   * Broadcast security event
   */
  broadcastSecurityEvent(data: {
    eventType: string;
    severity: string;
    userId?: string;
    ip?: string;
    description: string;
  }): number {
    return this.broadcast('security:events', data, 'security_event');
  }

  /**
   * Broadcast IoT device update
   */
  broadcastIotUpdate(data: {
    deviceId: string;
    deviceName: string;
    status: string;
    metrics: Record<string, number>;
  }): number {
    return this.broadcast('iot:devices', data, 'iot_device_update');
  }

  /**
   * Broadcast AI prediction update
   */
  broadcastAiPrediction(data: {
    modelId: string;
    modelName: string;
    prediction: any;
    confidence: number;
    timestamp: Date;
  }): number {
    return this.broadcast('ai:predictions', data, 'ai_prediction_update');
  }
}

// Singleton instance
export const realtimeWebSocketService = new RealtimeWebSocketService();

// Export class for testing
export { RealtimeWebSocketService };
