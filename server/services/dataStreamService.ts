/**
 * DataStreamService - Quản lý continuous data flow và real-time metrics
 * Phase 3.1 - Real-time Data Processing
 */

import { EventEmitter } from 'events';
import { realtimeWebSocketService } from './realtimeWebSocketService';

// Types
export interface DataStream {
  id: string;
  name: string;
  type: 'spc' | 'oee' | 'iot' | 'system' | 'security' | 'ai';
  source: string;
  interval: number; // milliseconds
  isActive: boolean;
  lastData: any;
  lastUpdate: Date;
  subscribers: Set<string>;
  errorCount: number;
  metadata: Record<string, any>;
}

export interface StreamData {
  streamId: string;
  data: any;
  timestamp: Date;
  source: string;
}

export interface StreamConfig {
  name: string;
  type: DataStream['type'];
  source: string;
  interval?: number;
  metadata?: Record<string, any>;
}

// Constants
const DEFAULT_INTERVAL = 5000; // 5 seconds
const MAX_STREAMS = 100;
const MAX_ERROR_COUNT = 10;
const ERROR_RESET_INTERVAL = 60000; // 1 minute

class DataStreamService extends EventEmitter {
  private streams: Map<string, DataStream> = new Map();
  private streamIntervals: Map<string, NodeJS.Timeout> = new Map();
  private dataFetchers: Map<string, () => Promise<any>> = new Map();
  private isRunning: boolean = false;
  private errorResetInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Start the data stream service
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Start error reset interval
    this.errorResetInterval = setInterval(() => {
      this.resetErrorCounts();
    }, ERROR_RESET_INTERVAL);

    console.log('[DataStreamService] Service started');
    this.emit('service_started');
  }

  /**
   * Stop the data stream service
   */
  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;

    // Stop all streams
    this.streams.forEach((_, streamId) => {
      this.stopStream(streamId);
    });

    // Clear error reset interval
    if (this.errorResetInterval) {
      clearInterval(this.errorResetInterval);
      this.errorResetInterval = null;
    }

    console.log('[DataStreamService] Service stopped');
    this.emit('service_stopped');
  }

  /**
   * Create a new data stream
   */
  createStream(config: StreamConfig): DataStream | null {
    if (this.streams.size >= MAX_STREAMS) {
      console.warn('[DataStreamService] Max streams reached');
      return null;
    }

    const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stream: DataStream = {
      id: streamId,
      name: config.name,
      type: config.type,
      source: config.source,
      interval: config.interval || DEFAULT_INTERVAL,
      isActive: false,
      lastData: null,
      lastUpdate: new Date(),
      subscribers: new Set(),
      errorCount: 0,
      metadata: config.metadata || {}
    };

    this.streams.set(streamId, stream);
    console.log(`[DataStreamService] Stream created: ${streamId} (${config.name})`);
    
    this.emit('stream_created', { streamId, config });
    return stream;
  }

  /**
   * Register a data fetcher for a stream
   */
  registerFetcher(streamId: string, fetcher: () => Promise<any>): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;

    this.dataFetchers.set(streamId, fetcher);
    return true;
  }

  /**
   * Start a data stream
   */
  startStream(streamId: string): boolean {
    const stream = this.streams.get(streamId);
    if (!stream || stream.isActive) return false;

    const fetcher = this.dataFetchers.get(streamId);
    if (!fetcher) {
      console.warn(`[DataStreamService] No fetcher registered for stream ${streamId}`);
      return false;
    }

    stream.isActive = true;

    // Create interval for data fetching
    const interval = setInterval(async () => {
      await this.fetchAndBroadcast(streamId);
    }, stream.interval);

    this.streamIntervals.set(streamId, interval);

    // Fetch immediately
    this.fetchAndBroadcast(streamId);

    console.log(`[DataStreamService] Stream started: ${streamId}`);
    this.emit('stream_started', { streamId });
    
    return true;
  }

  /**
   * Stop a data stream
   */
  stopStream(streamId: string): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;

    stream.isActive = false;

    // Clear interval
    const interval = this.streamIntervals.get(streamId);
    if (interval) {
      clearInterval(interval);
      this.streamIntervals.delete(streamId);
    }

    console.log(`[DataStreamService] Stream stopped: ${streamId}`);
    this.emit('stream_stopped', { streamId });
    
    return true;
  }

  /**
   * Delete a data stream
   */
  deleteStream(streamId: string): boolean {
    this.stopStream(streamId);
    this.streams.delete(streamId);
    this.dataFetchers.delete(streamId);
    
    console.log(`[DataStreamService] Stream deleted: ${streamId}`);
    this.emit('stream_deleted', { streamId });
    
    return true;
  }

  /**
   * Subscribe to a stream
   */
  subscribe(streamId: string, subscriberId: string): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;

    stream.subscribers.add(subscriberId);
    this.emit('stream_subscribed', { streamId, subscriberId });
    
    return true;
  }

  /**
   * Unsubscribe from a stream
   */
  unsubscribe(streamId: string, subscriberId: string): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;

    stream.subscribers.delete(subscriberId);
    this.emit('stream_unsubscribed', { streamId, subscriberId });
    
    return true;
  }

  /**
   * Push data to a stream manually
   */
  pushData(streamId: string, data: any): boolean {
    const stream = this.streams.get(streamId);
    if (!stream) return false;

    stream.lastData = data;
    stream.lastUpdate = new Date();

    const streamData: StreamData = {
      streamId,
      data,
      timestamp: new Date(),
      source: stream.source
    };

    // Emit to local subscribers
    this.emit(`data:${streamId}`, streamData);
    this.emit('data', streamData);

    // Broadcast via WebSocket
    this.broadcastToWebSocket(stream, data);

    return true;
  }

  /**
   * Get stream info
   */
  getStream(streamId: string): DataStream | undefined {
    return this.streams.get(streamId);
  }

  /**
   * Get all streams
   */
  getAllStreams(): DataStream[] {
    return Array.from(this.streams.values());
  }

  /**
   * Get active streams
   */
  getActiveStreams(): DataStream[] {
    return Array.from(this.streams.values()).filter(s => s.isActive);
  }

  /**
   * Get streams by type
   */
  getStreamsByType(type: DataStream['type']): DataStream[] {
    return Array.from(this.streams.values()).filter(s => s.type === type);
  }

  /**
   * Get service stats
   */
  getStats(): {
    isRunning: boolean;
    totalStreams: number;
    activeStreams: number;
    streamsByType: Record<string, number>;
    totalSubscribers: number;
    totalErrors: number;
  } {
    const streams = Array.from(this.streams.values());
    const streamsByType: Record<string, number> = {};
    let totalSubscribers = 0;
    let totalErrors = 0;

    streams.forEach(stream => {
      streamsByType[stream.type] = (streamsByType[stream.type] || 0) + 1;
      totalSubscribers += stream.subscribers.size;
      totalErrors += stream.errorCount;
    });

    return {
      isRunning: this.isRunning,
      totalStreams: streams.length,
      activeStreams: streams.filter(s => s.isActive).length,
      streamsByType,
      totalSubscribers,
      totalErrors
    };
  }

  /**
   * Fetch data and broadcast to subscribers
   */
  private async fetchAndBroadcast(streamId: string): Promise<void> {
    const stream = this.streams.get(streamId);
    const fetcher = this.dataFetchers.get(streamId);
    
    if (!stream || !fetcher || !stream.isActive) return;

    try {
      const data = await fetcher();
      
      stream.lastData = data;
      stream.lastUpdate = new Date();
      stream.errorCount = 0;

      const streamData: StreamData = {
        streamId,
        data,
        timestamp: new Date(),
        source: stream.source
      };

      // Emit to local subscribers
      this.emit(`data:${streamId}`, streamData);
      this.emit('data', streamData);

      // Broadcast via WebSocket
      this.broadcastToWebSocket(stream, data);

    } catch (error) {
      stream.errorCount++;
      console.error(`[DataStreamService] Error fetching data for stream ${streamId}:`, error);
      
      this.emit('stream_error', { streamId, error });

      // Stop stream if too many errors
      if (stream.errorCount >= MAX_ERROR_COUNT) {
        console.warn(`[DataStreamService] Stream ${streamId} stopped due to too many errors`);
        this.stopStream(streamId);
      }
    }
  }

  /**
   * Broadcast data via WebSocket service
   */
  private broadcastToWebSocket(stream: DataStream, data: any): void {
    const channelMap: Record<DataStream['type'], string> = {
      spc: 'spc:realtime',
      oee: 'oee:realtime',
      iot: 'iot:devices',
      system: 'system:health',
      security: 'security:events',
      ai: 'ai:predictions'
    };

    const channel = channelMap[stream.type];
    if (channel) {
      const eventTypeMap: Record<DataStream['type'], any> = {
        spc: 'spc_data_update',
        oee: 'oee_data_update',
        iot: 'iot_device_update',
        system: 'system_health_update',
        security: 'security_event',
        ai: 'ai_prediction_update'
      };

      realtimeWebSocketService.broadcast(channel, data, eventTypeMap[stream.type]);
    }
  }

  /**
   * Reset error counts periodically
   */
  private resetErrorCounts(): void {
    this.streams.forEach(stream => {
      if (stream.errorCount > 0 && stream.errorCount < MAX_ERROR_COUNT) {
        stream.errorCount = Math.max(0, stream.errorCount - 1);
      }
    });
  }

  // ============ Predefined stream creators ============

  /**
   * Create SPC data stream
   */
  createSpcStream(name: string, fetcher: () => Promise<any>, interval?: number): DataStream | null {
    const stream = this.createStream({
      name,
      type: 'spc',
      source: 'spc_analysis',
      interval: interval || 10000,
      metadata: { category: 'quality' }
    });

    if (stream) {
      this.registerFetcher(stream.id, fetcher);
    }

    return stream;
  }

  /**
   * Create OEE data stream
   */
  createOeeStream(name: string, fetcher: () => Promise<any>, interval?: number): DataStream | null {
    const stream = this.createStream({
      name,
      type: 'oee',
      source: 'oee_records',
      interval: interval || 15000,
      metadata: { category: 'efficiency' }
    });

    if (stream) {
      this.registerFetcher(stream.id, fetcher);
    }

    return stream;
  }

  /**
   * Create IoT device stream
   */
  createIotStream(name: string, deviceId: string, fetcher: () => Promise<any>, interval?: number): DataStream | null {
    const stream = this.createStream({
      name,
      type: 'iot',
      source: `iot_device_${deviceId}`,
      interval: interval || 5000,
      metadata: { deviceId, category: 'iot' }
    });

    if (stream) {
      this.registerFetcher(stream.id, fetcher);
    }

    return stream;
  }

  /**
   * Create system health stream
   */
  createSystemHealthStream(fetcher: () => Promise<any>, interval?: number): DataStream | null {
    const stream = this.createStream({
      name: 'System Health Monitor',
      type: 'system',
      source: 'system_metrics',
      interval: interval || 30000,
      metadata: { category: 'monitoring' }
    });

    if (stream) {
      this.registerFetcher(stream.id, fetcher);
    }

    return stream;
  }

  /**
   * Create security events stream
   */
  createSecurityStream(fetcher: () => Promise<any>, interval?: number): DataStream | null {
    const stream = this.createStream({
      name: 'Security Events Monitor',
      type: 'security',
      source: 'security_audit',
      interval: interval || 10000,
      metadata: { category: 'security' }
    });

    if (stream) {
      this.registerFetcher(stream.id, fetcher);
    }

    return stream;
  }

  /**
   * Create AI predictions stream
   */
  createAiStream(name: string, modelId: string, fetcher: () => Promise<any>, interval?: number): DataStream | null {
    const stream = this.createStream({
      name,
      type: 'ai',
      source: `ai_model_${modelId}`,
      interval: interval || 60000,
      metadata: { modelId, category: 'ai' }
    });

    if (stream) {
      this.registerFetcher(stream.id, fetcher);
    }

    return stream;
  }
}

// Singleton instance
export const dataStreamService = new DataStreamService();

// Export class for testing
export { DataStreamService };
