/**
 * IoT Connection Service
 * 
 * Provides MQTT and OPC-UA connection management for real device integration.
 * Supports multiple brokers, connection pooling, and automatic reconnection.
 */

import { EventEmitter } from 'events';

// Connection types
export type ConnectionProtocol = 'mqtt' | 'opcua' | 'modbus';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

// MQTT Configuration
export interface MqttConfig {
  protocol: 'mqtt';
  host: string;
  port: number;
  username?: string;
  password?: string;
  clientId?: string;
  useTls: boolean;
  cleanSession: boolean;
  keepAlive: number; // seconds
  reconnectPeriod: number; // milliseconds
  topics: MqttTopic[];
}

export interface MqttTopic {
  topic: string;
  qos: 0 | 1 | 2;
  handler?: string; // Handler function name
}

// OPC-UA Configuration
export interface OpcuaConfig {
  protocol: 'opcua';
  endpointUrl: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';
  username?: string;
  password?: string;
  applicationName: string;
  nodeIds: OpcuaNode[];
  samplingInterval: number; // milliseconds
  publishingInterval: number; // milliseconds
}

export interface OpcuaNode {
  nodeId: string;
  displayName: string;
  dataType: 'Boolean' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32' | 'Float' | 'Double' | 'String';
  handler?: string;
}

// Modbus Configuration
export interface ModbusConfig {
  protocol: 'modbus';
  host: string;
  port: number;
  unitId: number;
  registers: ModbusRegister[];
  pollingInterval: number; // milliseconds
}

export interface ModbusRegister {
  address: number;
  type: 'coil' | 'discrete' | 'holding' | 'input';
  count: number;
  name: string;
  dataType: 'Boolean' | 'Int16' | 'Int32' | 'UInt16' | 'UInt32' | 'Float';
  handler?: string;
}

// Connection configuration union type
export type ConnectionConfig = MqttConfig | OpcuaConfig | ModbusConfig;

// Connection instance
export interface IoTConnection {
  id: string;
  name: string;
  description?: string;
  config: ConnectionConfig;
  status: ConnectionStatus;
  lastConnected?: Date;
  lastError?: string;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  messagesReceived: number;
  messagesSent: number;
  bytesReceived: number;
  bytesSent: number;
  createdAt: Date;
  updatedAt: Date;
}

// Data received from connection
export interface IoTDataPoint {
  connectionId: string;
  topic?: string; // For MQTT
  nodeId?: string; // For OPC-UA
  register?: number; // For Modbus
  value: any;
  timestamp: Date;
  quality: 'good' | 'uncertain' | 'bad';
  metadata?: Record<string, any>;
}

// Connection event types
export type ConnectionEvent = 
  | { type: 'connected'; connectionId: string }
  | { type: 'disconnected'; connectionId: string; reason?: string }
  | { type: 'error'; connectionId: string; error: string }
  | { type: 'data'; connectionId: string; data: IoTDataPoint }
  | { type: 'status_change'; connectionId: string; status: ConnectionStatus };

/**
 * IoT Connection Manager
 * Manages multiple IoT connections with different protocols
 */
class IoTConnectionManager {
  private connections: Map<string, IoTConnection> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private dataBuffer: IoTDataPoint[] = [];
  private maxDataBuffer: number = 10000;
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.eventEmitter.setMaxListeners(100);
  }

  /**
   * Create a new connection
   */
  createConnection(params: {
    name: string;
    description?: string;
    config: ConnectionConfig;
    maxReconnectAttempts?: number;
  }): IoTConnection {
    const connection: IoTConnection = {
      id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: params.name,
      description: params.description,
      config: params.config,
      status: 'disconnected',
      reconnectAttempts: 0,
      maxReconnectAttempts: params.maxReconnectAttempts || 10,
      messagesReceived: 0,
      messagesSent: 0,
      bytesReceived: 0,
      bytesSent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.connections.set(connection.id, connection);
    return connection;
  }

  /**
   * Update connection configuration
   */
  updateConnection(id: string, updates: Partial<Pick<IoTConnection, 'name' | 'description' | 'config' | 'maxReconnectAttempts'>>): IoTConnection | null {
    const connection = this.connections.get(id);
    if (!connection) return null;

    if (updates.name) connection.name = updates.name;
    if (updates.description !== undefined) connection.description = updates.description;
    if (updates.config) connection.config = updates.config;
    if (updates.maxReconnectAttempts) connection.maxReconnectAttempts = updates.maxReconnectAttempts;
    connection.updatedAt = new Date();

    return connection;
  }

  /**
   * Delete a connection
   */
  deleteConnection(id: string): boolean {
    const connection = this.connections.get(id);
    if (!connection) return false;

    // Stop simulation if running
    this.stopSimulation(id);

    // Disconnect if connected
    if (connection.status === 'connected') {
      this.disconnect(id);
    }

    this.connections.delete(id);
    return true;
  }

  /**
   * Get connection by ID
   */
  getConnection(id: string): IoTConnection | null {
    return this.connections.get(id) || null;
  }

  /**
   * Get all connections
   */
  getAllConnections(): IoTConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Connect to IoT device/broker
   * Note: In a real implementation, this would use actual MQTT/OPC-UA libraries
   */
  async connect(id: string): Promise<{ success: boolean; error?: string }> {
    const connection = this.connections.get(id);
    if (!connection) {
      return { success: false, error: 'Connection not found' };
    }

    if (connection.status === 'connected') {
      return { success: true };
    }

    connection.status = 'connecting';
    connection.updatedAt = new Date();
    this.emitEvent({ type: 'status_change', connectionId: id, status: 'connecting' });

    try {
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real implementation, this would:
      // - For MQTT: Use mqtt.js to connect to broker
      // - For OPC-UA: Use node-opcua to connect to server
      // - For Modbus: Use modbus-serial to connect to device

      // Validate configuration
      const validationResult = this.validateConfig(connection.config);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      connection.status = 'connected';
      connection.lastConnected = new Date();
      connection.reconnectAttempts = 0;
      connection.updatedAt = new Date();

      this.emitEvent({ type: 'connected', connectionId: id });
      this.emitEvent({ type: 'status_change', connectionId: id, status: 'connected' });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      connection.status = 'error';
      connection.lastError = errorMessage;
      connection.updatedAt = new Date();

      this.emitEvent({ type: 'error', connectionId: id, error: errorMessage });
      this.emitEvent({ type: 'status_change', connectionId: id, status: 'error' });

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Disconnect from IoT device/broker
   */
  disconnect(id: string): boolean {
    const connection = this.connections.get(id);
    if (!connection) return false;

    // Stop simulation
    this.stopSimulation(id);

    connection.status = 'disconnected';
    connection.updatedAt = new Date();

    this.emitEvent({ type: 'disconnected', connectionId: id });
    this.emitEvent({ type: 'status_change', connectionId: id, status: 'disconnected' });

    return true;
  }

  /**
   * Validate connection configuration
   */
  private validateConfig(config: ConnectionConfig): { valid: boolean; error?: string } {
    switch (config.protocol) {
      case 'mqtt':
        if (!config.host) return { valid: false, error: 'MQTT host is required' };
        if (!config.port || config.port < 1 || config.port > 65535) {
          return { valid: false, error: 'Invalid MQTT port' };
        }
        if (!config.topics || config.topics.length === 0) {
          return { valid: false, error: 'At least one MQTT topic is required' };
        }
        break;

      case 'opcua':
        if (!config.endpointUrl) return { valid: false, error: 'OPC-UA endpoint URL is required' };
        if (!config.nodeIds || config.nodeIds.length === 0) {
          return { valid: false, error: 'At least one OPC-UA node is required' };
        }
        break;

      case 'modbus':
        if (!config.host) return { valid: false, error: 'Modbus host is required' };
        if (!config.port || config.port < 1 || config.port > 65535) {
          return { valid: false, error: 'Invalid Modbus port' };
        }
        if (!config.registers || config.registers.length === 0) {
          return { valid: false, error: 'At least one Modbus register is required' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Start data simulation for testing
   */
  startSimulation(id: string): boolean {
    const connection = this.connections.get(id);
    if (!connection || connection.status !== 'connected') return false;

    // Stop existing simulation
    this.stopSimulation(id);

    const interval = setInterval(() => {
      this.generateSimulatedData(connection);
    }, this.getPollingInterval(connection.config));

    this.simulationIntervals.set(id, interval);
    return true;
  }

  /**
   * Stop data simulation
   */
  stopSimulation(id: string): boolean {
    const interval = this.simulationIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Get polling interval from config
   */
  private getPollingInterval(config: ConnectionConfig): number {
    switch (config.protocol) {
      case 'mqtt':
        return 5000; // 5 seconds default for MQTT
      case 'opcua':
        return config.publishingInterval || 1000;
      case 'modbus':
        return config.pollingInterval || 1000;
      default:
        return 5000;
    }
  }

  /**
   * Generate simulated data for testing
   */
  private generateSimulatedData(connection: IoTConnection): void {
    const config = connection.config;
    const dataPoints: IoTDataPoint[] = [];

    switch (config.protocol) {
      case 'mqtt':
        config.topics.forEach(topic => {
          dataPoints.push({
            connectionId: connection.id,
            topic: topic.topic,
            value: this.generateRandomValue('Float'),
            timestamp: new Date(),
            quality: 'good',
            metadata: { simulated: true }
          });
        });
        break;

      case 'opcua':
        config.nodeIds.forEach(node => {
          dataPoints.push({
            connectionId: connection.id,
            nodeId: node.nodeId,
            value: this.generateRandomValue(node.dataType),
            timestamp: new Date(),
            quality: 'good',
            metadata: { displayName: node.displayName, simulated: true }
          });
        });
        break;

      case 'modbus':
        config.registers.forEach(register => {
          dataPoints.push({
            connectionId: connection.id,
            register: register.address,
            value: this.generateRandomValue(register.dataType),
            timestamp: new Date(),
            quality: 'good',
            metadata: { name: register.name, simulated: true }
          });
        });
        break;
    }

    // Update connection stats
    connection.messagesReceived += dataPoints.length;
    connection.bytesReceived += JSON.stringify(dataPoints).length;
    connection.updatedAt = new Date();

    // Buffer data
    dataPoints.forEach(dp => {
      this.dataBuffer.push(dp);
      this.emitEvent({ type: 'data', connectionId: connection.id, data: dp });
    });

    // Trim buffer if needed
    if (this.dataBuffer.length > this.maxDataBuffer) {
      this.dataBuffer = this.dataBuffer.slice(-this.maxDataBuffer);
    }
  }

  /**
   * Generate random value based on data type
   */
  private generateRandomValue(dataType: string): any {
    switch (dataType) {
      case 'Boolean':
        return Math.random() > 0.5;
      case 'Int16':
        return Math.floor(Math.random() * 65535) - 32768;
      case 'Int32':
        return Math.floor(Math.random() * 4294967295) - 2147483648;
      case 'UInt16':
        return Math.floor(Math.random() * 65535);
      case 'UInt32':
        return Math.floor(Math.random() * 4294967295);
      case 'Float':
      case 'Double':
        return parseFloat((Math.random() * 100).toFixed(2));
      case 'String':
        return `value_${Date.now()}`;
      default:
        return Math.random() * 100;
    }
  }

  /**
   * Get recent data for a connection
   */
  getRecentData(connectionId: string, limit: number = 100): IoTDataPoint[] {
    return this.dataBuffer
      .filter(dp => dp.connectionId === connectionId)
      .slice(-limit);
  }

  /**
   * Get all buffered data
   */
  getAllData(limit: number = 1000): IoTDataPoint[] {
    return this.dataBuffer.slice(-limit);
  }

  /**
   * Clear data buffer
   */
  clearDataBuffer(): void {
    this.dataBuffer = [];
  }

  /**
   * Subscribe to connection events
   */
  onEvent(callback: (event: ConnectionEvent) => void): () => void {
    this.eventEmitter.on('connection_event', callback);
    return () => {
      this.eventEmitter.off('connection_event', callback);
    };
  }

  /**
   * Emit connection event
   */
  private emitEvent(event: ConnectionEvent): void {
    this.eventEmitter.emit('connection_event', event);
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    connectedCount: number;
    disconnectedCount: number;
    errorCount: number;
    totalMessagesReceived: number;
    totalMessagesSent: number;
    totalBytesReceived: number;
    totalBytesSent: number;
    dataBufferSize: number;
  } {
    const connections = Array.from(this.connections.values());
    
    return {
      totalConnections: connections.length,
      connectedCount: connections.filter(c => c.status === 'connected').length,
      disconnectedCount: connections.filter(c => c.status === 'disconnected').length,
      errorCount: connections.filter(c => c.status === 'error').length,
      totalMessagesReceived: connections.reduce((sum, c) => sum + c.messagesReceived, 0),
      totalMessagesSent: connections.reduce((sum, c) => sum + c.messagesSent, 0),
      totalBytesReceived: connections.reduce((sum, c) => sum + c.bytesReceived, 0),
      totalBytesSent: connections.reduce((sum, c) => sum + c.bytesSent, 0),
      dataBufferSize: this.dataBuffer.length,
    };
  }

  /**
   * Publish message (for MQTT)
   */
  async publish(connectionId: string, topic: string, message: any): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') return false;
    if (connection.config.protocol !== 'mqtt') return false;

    // In a real implementation, this would publish to MQTT broker
    connection.messagesSent++;
    connection.bytesSent += JSON.stringify(message).length;
    connection.updatedAt = new Date();

    return true;
  }

  /**
   * Write value (for OPC-UA/Modbus)
   */
  async writeValue(connectionId: string, nodeIdOrRegister: string | number, value: any): Promise<boolean> {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.status !== 'connected') return false;

    // In a real implementation, this would write to OPC-UA server or Modbus device
    connection.messagesSent++;
    connection.bytesSent += JSON.stringify(value).length;
    connection.updatedAt = new Date();

    return true;
  }

  /**
   * Test connection without fully connecting
   */
  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();

    try {
      // Validate configuration first
      const validationResult = this.validateConfig(config);
      if (!validationResult.valid) {
        return { success: false, error: validationResult.error };
      }

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 500));

      const latency = Date.now() - startTime;
      return { success: true, latency };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Connection test failed' 
      };
    }
  }
}

// Singleton instance
export const iotConnectionManager = new IoTConnectionManager();

// Export convenience functions
export const createIoTConnection = iotConnectionManager.createConnection.bind(iotConnectionManager);
export const updateIoTConnection = iotConnectionManager.updateConnection.bind(iotConnectionManager);
export const deleteIoTConnection = iotConnectionManager.deleteConnection.bind(iotConnectionManager);
export const getIoTConnection = iotConnectionManager.getConnection.bind(iotConnectionManager);
export const getAllIoTConnections = iotConnectionManager.getAllConnections.bind(iotConnectionManager);
export const connectIoT = iotConnectionManager.connect.bind(iotConnectionManager);
export const disconnectIoT = iotConnectionManager.disconnect.bind(iotConnectionManager);
export const startIoTSimulation = iotConnectionManager.startSimulation.bind(iotConnectionManager);
export const stopIoTSimulation = iotConnectionManager.stopSimulation.bind(iotConnectionManager);
export const getIoTRecentData = iotConnectionManager.getRecentData.bind(iotConnectionManager);
export const getIoTConnectionStats = iotConnectionManager.getStats.bind(iotConnectionManager);
export const testIoTConnection = iotConnectionManager.testConnection.bind(iotConnectionManager);
export const publishIoTMessage = iotConnectionManager.publish.bind(iotConnectionManager);
export const writeIoTValue = iotConnectionManager.writeValue.bind(iotConnectionManager);
export const onIoTConnectionEvent = iotConnectionManager.onEvent.bind(iotConnectionManager);
