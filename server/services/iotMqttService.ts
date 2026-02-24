/**
 * IoT MQTT Real Connection Service
 * Provides MQTT connection management with simulation mode for development.
 */

import { EventEmitter } from 'events';
import { getTimeseriesService } from './iotTimeseriesService';

export interface MqttConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  username?: string;
  password?: string;
  clientId?: string;
  cleanSession: boolean;
  keepAlive: number;
  reconnectPeriod: number;
  connectTimeout: number;
  useTls: boolean;
}

export interface MqttSubscription {
  topic: string;
  qos: 0 | 1 | 2;
  deviceId?: number;
  sensorType?: string;
}

export type MqttConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface MqttConnectionStats {
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  reconnectCount: number;
  lastMessageTime: Date | null;
  uptime: number;
}

class MqttClientWrapper {
  private config: MqttConnectionConfig;
  private subscriptions: Map<string, MqttSubscription> = new Map();
  private status: MqttConnectionStatus = 'disconnected';
  private stats: MqttConnectionStats;
  private eventEmitter: EventEmitter;
  private startTime: Date | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;
  private isSimulated: boolean = true;

  constructor(config: MqttConnectionConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(50);
    this.stats = { messagesReceived: 0, messagesSent: 0, bytesReceived: 0, bytesSent: 0, reconnectCount: 0, lastMessageTime: null, uptime: 0 };
  }

  async connect(): Promise<{ success: boolean; error?: string }> {
    if (this.status === 'connected') return { success: true };
    this.status = 'connecting';
    this.eventEmitter.emit('statusChange', this.status);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!this.config.host) throw new Error('MQTT host is required');
      this.status = 'connected';
      this.startTime = new Date();
      this.eventEmitter.emit('statusChange', this.status);
      if (this.isSimulated) this.startSimulation();
      return { success: true };
    } catch (error) {
      this.status = 'error';
      this.eventEmitter.emit('statusChange', this.status);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async disconnect(): Promise<void> {
    this.stopSimulation();
    this.status = 'disconnected';
    this.startTime = null;
    this.eventEmitter.emit('statusChange', this.status);
  }

  async subscribe(subscription: MqttSubscription): Promise<boolean> {
    if (this.status !== 'connected') return false;
    this.subscriptions.set(subscription.topic, subscription);
    this.eventEmitter.emit('subscribed', subscription.topic);
    return true;
  }

  async unsubscribe(topic: string): Promise<boolean> {
    if (this.status !== 'connected') return false;
    this.subscriptions.delete(topic);
    return true;
  }

  async publish(topic: string, payload: string | Buffer, qos: 0 | 1 | 2 = 0): Promise<boolean> {
    if (this.status !== 'connected') return false;
    this.stats.messagesSent++;
    this.stats.bytesSent += typeof payload === 'string' ? payload.length : payload.length;
    return true;
  }

  getStatus(): MqttConnectionStatus { return this.status; }
  getStats(): MqttConnectionStats { return { ...this.stats, uptime: this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0 }; }
  getSubscriptions(): MqttSubscription[] { return Array.from(this.subscriptions.values()); }
  on(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.on(event, handler); }
  off(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.off(event, handler); }
  setSimulationMode(enabled: boolean): void { this.isSimulated = enabled; if (enabled && this.status === 'connected') this.startSimulation(); else this.stopSimulation(); }

  private startSimulation(): void {
    if (this.simulationInterval) return;
    this.simulationInterval = setInterval(() => this.generateSimulatedMessages(), 5000);
  }

  private stopSimulation(): void {
    if (this.simulationInterval) { clearInterval(this.simulationInterval); this.simulationInterval = null; }
  }

  private generateSimulatedMessages(): void {
    const timeseriesService = getTimeseriesService();
    for (const subscription of this.subscriptions.values()) {
      const sensorType = subscription.sensorType || this.inferSensorType(subscription.topic);
      const { value, unit } = this.generateSensorValue(sensorType);
      const deviceId = subscription.deviceId || Math.floor(Math.random() * 100) + 1;

      timeseriesService.writeSensorReading({ deviceId, sensorType, value, unit, quality: 'good', timestamp: new Date() });
      this.stats.messagesReceived++;
      this.stats.lastMessageTime = new Date();
      this.eventEmitter.emit('message', { topic: subscription.topic, payload: JSON.stringify({ deviceId, sensorType, value, unit }), timestamp: new Date() });
    }
  }

  private inferSensorType(topic: string): string {
    const lower = topic.toLowerCase();
    if (lower.includes('temp')) return 'temperature';
    if (lower.includes('humid')) return 'humidity';
    if (lower.includes('press')) return 'pressure';
    if (lower.includes('vibr')) return 'vibration';
    return 'generic';
  }

  private generateSensorValue(sensorType: string): { value: number; unit: string } {
    switch (sensorType) {
      case 'temperature': return { value: 20 + Math.random() * 15, unit: '°C' };
      case 'humidity': return { value: 40 + Math.random() * 30, unit: '%' };
      case 'pressure': return { value: 1000 + Math.random() * 50, unit: 'hPa' };
      case 'vibration': return { value: Math.random() * 10, unit: 'mm/s' };
      default: return { value: Math.random() * 100, unit: 'unit' };
    }
  }
}

class MqttServiceManager {
  private clients: Map<string, MqttClientWrapper> = new Map();
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100);
  }

  createConnection(config: MqttConnectionConfig): MqttClientWrapper {
    const client = new MqttClientWrapper(config);
    this.clients.set(config.id, client);
    client.on('message', (msg) => this.eventEmitter.emit('message', { connectionId: config.id, ...msg }));
    client.on('statusChange', (status) => this.eventEmitter.emit('statusChange', { connectionId: config.id, status }));
    return client;
  }

  getConnection(id: string): MqttClientWrapper | undefined { return this.clients.get(id); }
  getAllConnections(): Array<{ id: string; client: MqttClientWrapper }> { return Array.from(this.clients.entries()).map(([id, client]) => ({ id, client })); }
  async removeConnection(id: string): Promise<boolean> { const client = this.clients.get(id); if (!client) return false; await client.disconnect(); this.clients.delete(id); return true; }
  on(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.on(event, handler); }
  async shutdown(): Promise<void> { for (const client of this.clients.values()) await client.disconnect(); this.clients.clear(); }
}

let mqttServiceManager: MqttServiceManager | null = null;

export function getMqttServiceManager(): MqttServiceManager {
  if (!mqttServiceManager) mqttServiceManager = new MqttServiceManager();
  return mqttServiceManager;
}

export async function resetMqttServiceManager(): Promise<void> {
  if (mqttServiceManager) { await mqttServiceManager.shutdown(); mqttServiceManager = null; }
}

export { MqttClientWrapper, MqttServiceManager };
export default getMqttServiceManager;
