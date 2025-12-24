/**
 * MQTT Client Service
 * Kết nối với MQTT broker để nhận/gửi dữ liệu IoT realtime
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { EventEmitter } from 'events';

// Types
export interface MqttConfig {
  brokerUrl: string;
  clientId?: string;
  username?: string;
  password?: string;
  keepalive?: number;
  reconnectPeriod?: number;
  connectTimeout?: number;
}

export interface MqttMessage {
  topic: string;
  payload: string | Buffer;
  timestamp: Date;
}

export interface DeviceData {
  deviceId: string;
  metric: string;
  value: number;
  unit?: string;
  timestamp: Date;
}

// Default configuration
const DEFAULT_CONFIG: MqttConfig = {
  brokerUrl: 'mqtt://localhost:1883',
  clientId: `spc-calculator-${Date.now()}`,
  keepalive: 60,
  reconnectPeriod: 5000,
  connectTimeout: 30000,
};

// MQTT Service Class
class MqttService extends EventEmitter {
  private client: MqttClient | null = null;
  private config: MqttConfig;
  private subscriptions: Map<string, Set<(data: DeviceData) => void>> = new Map();
  private messageHistory: MqttMessage[] = [];
  private maxHistorySize = 1000;
  private isConnected = false;

  constructor(config?: Partial<MqttConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Kết nối đến MQTT broker
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.client && this.isConnected) {
        resolve(true);
        return;
      }

      const options: IClientOptions = {
        clientId: this.config.clientId,
        keepalive: this.config.keepalive,
        reconnectPeriod: this.config.reconnectPeriod,
        connectTimeout: this.config.connectTimeout,
      };

      if (this.config.username) {
        options.username = this.config.username;
        options.password = this.config.password;
      }

      console.log(`[MQTT] Connecting to ${this.config.brokerUrl}...`);
      
      this.client = mqtt.connect(this.config.brokerUrl, options);

      this.client.on('connect', () => {
        console.log('[MQTT] Connected successfully');
        this.isConnected = true;
        this.emit('connected');
        resolve(true);
      });

      this.client.on('error', (error) => {
        console.error('[MQTT] Connection error:', error.message);
        this.emit('error', error);
        if (!this.isConnected) {
          reject(error);
        }
      });

      this.client.on('close', () => {
        console.log('[MQTT] Connection closed');
        this.isConnected = false;
        this.emit('disconnected');
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
        this.emit('reconnecting');
      });

      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });

      // Timeout for initial connection
      setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('Connection timeout'));
        }
      }, this.config.connectTimeout);
    });
  }

  /**
   * Ngắt kết nối
   */
  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(true, {}, () => {
          console.log('[MQTT] Disconnected');
          this.isConnected = false;
          this.client = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Subscribe một topic
   */
  async subscribe(topic: string, callback?: (data: DeviceData) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          console.error(`[MQTT] Subscribe error for ${topic}:`, error.message);
          reject(error);
        } else {
          console.log(`[MQTT] Subscribed to ${topic}`);
          
          // Store callback
          if (callback) {
            if (!this.subscriptions.has(topic)) {
              this.subscriptions.set(topic, new Set());
            }
            this.subscriptions.get(topic)!.add(callback);
          }
          
          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe một topic
   */
  async unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        resolve();
        return;
      }

      this.client.unsubscribe(topic, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`[MQTT] Unsubscribed from ${topic}`);
          this.subscriptions.delete(topic);
          resolve();
        }
      });
    });
  }

  /**
   * Publish message
   */
  async publish(topic: string, payload: string | object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('Not connected to MQTT broker'));
        return;
      }

      const message = typeof payload === 'object' ? JSON.stringify(payload) : payload;

      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          console.error(`[MQTT] Publish error to ${topic}:`, error.message);
          reject(error);
        } else {
          console.log(`[MQTT] Published to ${topic}`);
          resolve();
        }
      });
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(topic: string, payload: Buffer): void {
    const message: MqttMessage = {
      topic,
      payload: payload.toString(),
      timestamp: new Date(),
    };

    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    // Parse device data
    try {
      const data = this.parseDeviceData(topic, payload.toString());
      
      // Emit general event
      this.emit('message', message);
      this.emit('deviceData', data);

      // Call topic-specific callbacks
      const callbacks = this.subscriptions.get(topic);
      if (callbacks) {
        callbacks.forEach(cb => cb(data));
      }

      // Also check for wildcard subscriptions
      this.subscriptions.forEach((cbs, subscribedTopic) => {
        if (this.matchTopic(subscribedTopic, topic)) {
          cbs.forEach(cb => cb(data));
        }
      });
    } catch (error) {
      console.error('[MQTT] Error parsing message:', error);
    }
  }

  /**
   * Parse device data from MQTT message
   * Expected topic format: devices/{deviceId}/metrics/{metric}
   * Expected payload: JSON with value and optional unit
   */
  private parseDeviceData(topic: string, payload: string): DeviceData {
    const parts = topic.split('/');
    let deviceId = 'unknown';
    let metric = 'value';

    // Parse topic
    if (parts.length >= 4 && parts[0] === 'devices') {
      deviceId = parts[1];
      metric = parts[3] || 'value';
    } else if (parts.length >= 2) {
      deviceId = parts[0];
      metric = parts[1];
    }

    // Parse payload
    let value = 0;
    let unit: string | undefined;

    try {
      const json = JSON.parse(payload);
      value = typeof json.value === 'number' ? json.value : parseFloat(json.value) || 0;
      unit = json.unit;
    } catch {
      // If not JSON, try to parse as number
      value = parseFloat(payload) || 0;
    }

    return {
      deviceId,
      metric,
      value,
      unit,
      timestamp: new Date(),
    };
  }

  /**
   * Match topic with wildcard support
   */
  private matchTopic(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] === '#') {
        return true;
      }
      if (patternParts[i] === '+') {
        continue;
      }
      if (patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return patternParts.length === topicParts.length;
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; brokerUrl: string; subscriptions: string[] } {
    return {
      connected: this.isConnected,
      brokerUrl: this.config.brokerUrl,
      subscriptions: Array.from(this.subscriptions.keys()),
    };
  }

  /**
   * Get message history
   */
  getHistory(limit = 100): MqttMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }
}

// Singleton instance
let mqttServiceInstance: MqttService | null = null;

export function getMqttService(config?: Partial<MqttConfig>): MqttService {
  if (!mqttServiceInstance) {
    mqttServiceInstance = new MqttService(config);
  }
  return mqttServiceInstance;
}

export function resetMqttService(): void {
  if (mqttServiceInstance) {
    mqttServiceInstance.disconnect();
    mqttServiceInstance = null;
  }
}

// Export class for testing
export { MqttService };

// Helper functions for common IoT topics
export const IoTTopics = {
  // Device metrics
  deviceMetric: (deviceId: string, metric: string) => `devices/${deviceId}/metrics/${metric}`,
  allDeviceMetrics: (deviceId: string) => `devices/${deviceId}/metrics/#`,
  allDevices: () => 'devices/#',
  
  // Alarms
  deviceAlarm: (deviceId: string) => `devices/${deviceId}/alarms`,
  allAlarms: () => 'devices/+/alarms',
  
  // Status
  deviceStatus: (deviceId: string) => `devices/${deviceId}/status`,
  allStatus: () => 'devices/+/status',
  
  // Commands
  deviceCommand: (deviceId: string) => `devices/${deviceId}/commands`,
  
  // SPC specific
  spcData: (lineId: string, machineId: string) => `spc/${lineId}/${machineId}/data`,
  spcAlert: (lineId: string) => `spc/${lineId}/alerts`,
};
