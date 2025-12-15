/**
 * Data Collector Service
 * Kết nối và thu thập dữ liệu từ máy sản xuất qua nhiều phương thức
 */

import mysql from 'mysql2/promise';
import { getDb } from './db';
import { realtimeMachineConnections, realtimeDataBuffer, realtimeAlerts } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { EventEmitter } from 'events';

// Types
export interface ConnectionConfig {
  // Database connection
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  // File connection
  filePath?: string;
  fileType?: 'csv' | 'excel';
  // API connection
  apiUrl?: string;
  apiKey?: string;
  apiMethod?: 'GET' | 'POST';
  // OPC UA connection
  opcuaEndpoint?: string;
  opcuaSecurityPolicy?: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';
  opcuaSecurityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  opcuaUsername?: string;
  opcuaPassword?: string;
  // MQTT connection
  mqttBroker?: string;
  mqttUsername?: string;
  mqttPassword?: string;
  mqttTopic?: string;
}

export interface DataPoint {
  timestamp: Date;
  measurementName: string;
  value: number;
  unit?: string;
}

export interface CollectorStatus {
  connectionId: number;
  machineId: number;
  status: 'connected' | 'disconnected' | 'error' | 'collecting';
  lastDataAt: Date | null;
  lastError: string | null;
  dataPointsCollected: number;
}

// Base Adapter Interface
interface DataAdapter {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  fetchData(query: string, timestampColumn: string, measurementColumn: string): Promise<DataPoint[]>;
  testConnection(): Promise<{ success: boolean; message: string }>;
}

// Database Adapter
class DatabaseAdapter implements DataAdapter {
  private connection: mysql.Connection | null = null;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port || 3306,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
      });
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async fetchData(query: string, timestampColumn: string, measurementColumn: string): Promise<DataPoint[]> {
    if (!this.connection) {
      throw new Error('Not connected to database');
    }

    const [rows] = await this.connection.execute(query);
    const dataPoints: DataPoint[] = [];

    if (Array.isArray(rows)) {
      for (const row of rows as any[]) {
        dataPoints.push({
          timestamp: new Date(row[timestampColumn]),
          measurementName: measurementColumn,
          value: parseFloat(row[measurementColumn]),
        });
      }
    }

    return dataPoints;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const connected = await this.connect();
      if (connected) {
        await this.disconnect();
        return { success: true, message: 'Kết nối thành công' };
      }
      return { success: false, message: 'Không thể kết nối' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

// File Adapter (CSV/Excel)
class FileAdapter implements DataAdapter {
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    // File adapter doesn't need persistent connection
    return true;
  }

  async disconnect(): Promise<void> {
    // Nothing to disconnect
  }

  async fetchData(query: string, timestampColumn: string, measurementColumn: string): Promise<DataPoint[]> {
    const fs = await import('fs');
    const path = await import('path');
    
    if (!this.config.filePath) {
      throw new Error('File path not configured');
    }

    const filePath = this.config.filePath;
    const dataPoints: DataPoint[] = [];

    if (this.config.fileType === 'csv') {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const timestampIdx = headers.indexOf(timestampColumn);
      const measurementIdx = headers.indexOf(measurementColumn);

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length > Math.max(timestampIdx, measurementIdx)) {
          dataPoints.push({
            timestamp: new Date(values[timestampIdx]),
            measurementName: measurementColumn,
            value: parseFloat(values[measurementIdx]),
          });
        }
      }
    }

    return dataPoints;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const fs = await import('fs');
      if (this.config.filePath && fs.existsSync(this.config.filePath)) {
        return { success: true, message: 'File tồn tại và có thể đọc' };
      }
      return { success: false, message: 'File không tồn tại' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

// OPC UA Adapter (Simulated - requires node-opcua package for production)
class OpcUaAdapter implements DataAdapter {
  private config: ConnectionConfig;
  private connected: boolean = false;
  private subscriptions: Map<string, any> = new Map();

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      // In production, use node-opcua package:
      // const { OPCUAClient, SecurityPolicy, MessageSecurityMode } = require('node-opcua');
      // this.client = OPCUAClient.create({ ... });
      // await this.client.connect(this.config.opcuaEndpoint);
      
      // Simulated connection for demo
      console.log(`[OPC UA] Connecting to ${this.config.opcuaEndpoint}...`);
      
      // Validate endpoint format
      if (!this.config.opcuaEndpoint?.startsWith('opc.tcp://')) {
        throw new Error('Invalid OPC UA endpoint. Must start with opc.tcp://');
      }
      
      this.connected = true;
      console.log('[OPC UA] Connected successfully');
      return true;
    } catch (error) {
      console.error('[OPC UA] Connection error:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      // In production: await this.client.disconnect();
      this.subscriptions.clear();
      this.connected = false;
      console.log('[OPC UA] Disconnected');
    }
  }

  async subscribeToNode(nodeId: string, callback: (value: any) => void): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected to OPC UA server');
    }
    
    // In production:
    // const subscription = await this.session.createSubscription2({ ... });
    // const monitoredItem = await subscription.monitor({ nodeId: nodeId }, { ... });
    // monitoredItem.on('changed', callback);
    
    this.subscriptions.set(nodeId, callback);
    console.log(`[OPC UA] Subscribed to node: ${nodeId}`);
  }

  async fetchData(query: string, timestampColumn: string, measurementColumn: string): Promise<DataPoint[]> {
    if (!this.connected) {
      throw new Error('Not connected to OPC UA server');
    }

    const dataPoints: DataPoint[] = [];
    
    // Parse query as comma-separated NodeIds
    const nodeIds = query.split(',').map(n => n.trim());
    
    for (const nodeId of nodeIds) {
      // In production:
      // const dataValue = await this.session.read({ nodeId: nodeId, attributeId: AttributeIds.Value });
      // const value = dataValue.value.value;
      
      // Simulated data for demo
      const simulatedValue = 50 + Math.random() * 10 - 5; // Random value around 50
      
      dataPoints.push({
        timestamp: new Date(),
        measurementName: nodeId,
        value: simulatedValue,
      });
    }

    return dataPoints;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config.opcuaEndpoint) {
        return { success: false, message: 'OPC UA Endpoint không được cấu hình' };
      }

      if (!this.config.opcuaEndpoint.startsWith('opc.tcp://')) {
        return { success: false, message: 'Endpoint phải bắt đầu bằng opc.tcp://' };
      }

      // In production: actually try to connect
      // For now, just validate the format
      const connected = await this.connect();
      if (connected) {
        await this.disconnect();
        return { success: true, message: 'Kết nối OPC UA thành công (simulated)' };
      }
      return { success: false, message: 'Không thể kết nối OPC UA server' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // Browse available nodes on the server
  async browseNodes(parentNodeId?: string): Promise<{ nodeId: string; displayName: string; nodeClass: string }[]> {
    if (!this.connected) {
      throw new Error('Not connected to OPC UA server');
    }

    // In production:
    // const browseResult = await this.session.browse(parentNodeId || 'RootFolder');
    // return browseResult.references.map(ref => ({ ... }));

    // Simulated node list for demo
    return [
      { nodeId: 'ns=2;s=Temperature', displayName: 'Temperature', nodeClass: 'Variable' },
      { nodeId: 'ns=2;s=Pressure', displayName: 'Pressure', nodeClass: 'Variable' },
      { nodeId: 'ns=2;s=Speed', displayName: 'Speed', nodeClass: 'Variable' },
      { nodeId: 'ns=2;s=Vibration', displayName: 'Vibration', nodeClass: 'Variable' },
      { nodeId: 'ns=2;s=Current', displayName: 'Current', nodeClass: 'Variable' },
    ];
  }
}

// MQTT Adapter
class MqttAdapter implements DataAdapter {
  private config: ConnectionConfig;
  private connected: boolean = false;
  private messageBuffer: DataPoint[] = [];

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    try {
      // In production, use mqtt package:
      // const mqtt = require('mqtt');
      // this.client = mqtt.connect(this.config.mqttBroker, { ... });
      
      console.log(`[MQTT] Connecting to ${this.config.mqttBroker}...`);
      
      if (!this.config.mqttBroker) {
        throw new Error('MQTT Broker URL not configured');
      }
      
      this.connected = true;
      console.log('[MQTT] Connected successfully');
      return true;
    } catch (error) {
      console.error('[MQTT] Connection error:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      // In production: this.client.end();
      this.connected = false;
      console.log('[MQTT] Disconnected');
    }
  }

  async fetchData(query: string, timestampColumn: string, measurementColumn: string): Promise<DataPoint[]> {
    if (!this.connected) {
      throw new Error('Not connected to MQTT broker');
    }

    // In production, subscribe to topic and collect messages
    // For now, return buffered messages or simulated data
    
    const topic = query; // Query is the MQTT topic
    
    // Simulated data
    const simulatedValue = 50 + Math.random() * 10 - 5;
    
    return [{
      timestamp: new Date(),
      measurementName: topic,
      value: simulatedValue,
    }];
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config.mqttBroker) {
        return { success: false, message: 'MQTT Broker URL không được cấu hình' };
      }

      const connected = await this.connect();
      if (connected) {
        await this.disconnect();
        return { success: true, message: 'Kết nối MQTT thành công (simulated)' };
      }
      return { success: false, message: 'Không thể kết nối MQTT broker' };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

// API Adapter
class ApiAdapter implements DataAdapter {
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<boolean> {
    return true;
  }

  async disconnect(): Promise<void> {
    // Nothing to disconnect
  }

  async fetchData(query: string, timestampColumn: string, measurementColumn: string): Promise<DataPoint[]> {
    if (!this.config.apiUrl) {
      throw new Error('API URL not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(this.config.apiUrl, {
      method: this.config.apiMethod || 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const dataPoints: DataPoint[] = [];

    if (Array.isArray(data)) {
      for (const item of data) {
        dataPoints.push({
          timestamp: new Date(item[timestampColumn]),
          measurementName: measurementColumn,
          value: parseFloat(item[measurementColumn]),
        });
      }
    }

    return dataPoints;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.config.apiUrl) {
        return { success: false, message: 'API URL không được cấu hình' };
      }

      const response = await fetch(this.config.apiUrl, {
        method: 'HEAD',
        headers: this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {},
      });

      if (response.ok) {
        return { success: true, message: 'API có thể truy cập' };
      }
      return { success: false, message: `API trả về status ${response.status}` };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
}

// Collector Manager
export class DataCollectorManager extends EventEmitter {
  private collectors: Map<number, {
    adapter: DataAdapter;
    config: any;
    intervalId: NodeJS.Timeout | null;
    status: CollectorStatus;
  }> = new Map();

  private static instance: DataCollectorManager;

  static getInstance(): DataCollectorManager {
    if (!DataCollectorManager.instance) {
      DataCollectorManager.instance = new DataCollectorManager();
    }
    return DataCollectorManager.instance;
  }

  private createAdapter(connectionType: string, config: ConnectionConfig): DataAdapter {
    switch (connectionType) {
      case 'database':
        return new DatabaseAdapter(config);
      case 'file':
        return new FileAdapter(config);
      case 'api':
        return new ApiAdapter(config);
      case 'opcua':
        return new OpcUaAdapter(config);
      case 'mqtt':
        return new MqttAdapter(config);
      default:
        throw new Error(`Unsupported connection type: ${connectionType}`);
    }
  }

  async startCollector(connectionId: number): Promise<boolean> {
    try {
      // Get connection config from database
      const db = await getDb();
      if (!db) throw new Error('Database not connected');
      const connections = await db.select().from(realtimeMachineConnections)
        .where(eq(realtimeMachineConnections.id, connectionId));

      if (connections.length === 0) {
        throw new Error('Connection not found');
      }

      const conn = connections[0];
      
      if (!conn.isActive) {
        throw new Error('Connection is inactive');
      }

      const config: ConnectionConfig = conn.connectionConfig 
        ? JSON.parse(conn.connectionConfig) 
        : {};

      const adapter = this.createAdapter(conn.connectionType, config);
      const connected = await adapter.connect();

      if (!connected) {
        throw new Error('Failed to connect');
      }

      const status: CollectorStatus = {
        connectionId,
        machineId: conn.machineId,
        status: 'connected',
        lastDataAt: null,
        lastError: null,
        dataPointsCollected: 0,
      };

      // Start polling
      const intervalId = setInterval(async () => {
        await this.collectData(connectionId);
      }, conn.pollingIntervalMs);

      this.collectors.set(connectionId, {
        adapter,
        config: conn,
        intervalId,
        status,
      });

      // Emit status update
      this.emit('status', status);

      console.log(`[DataCollector] Started collector ${connectionId} for machine ${conn.machineId}`);
      return true;
    } catch (error: any) {
      console.error(`[DataCollector] Error starting collector ${connectionId}:`, error);
      
      // Update error in database
      const dbErr = await getDb();
      if (dbErr) {
        await dbErr.update(realtimeMachineConnections)
        .set({ lastError: error.message })
          .where(eq(realtimeMachineConnections.id, connectionId));
      }

      return false;
    }
  }

  async stopCollector(connectionId: number): Promise<void> {
    const collector = this.collectors.get(connectionId);
    if (collector) {
      if (collector.intervalId) {
        clearInterval(collector.intervalId);
      }
      await collector.adapter.disconnect();
      this.collectors.delete(connectionId);

      console.log(`[DataCollector] Stopped collector ${connectionId}`);
    }
  }

  private async collectData(connectionId: number): Promise<void> {
    const collector = this.collectors.get(connectionId);
    if (!collector) return;

    try {
      collector.status.status = 'collecting';
      this.emit('status', collector.status);

      const { adapter, config } = collector;
      const dataPoints = await adapter.fetchData(
        config.dataQuery || '',
        config.timestampColumn || 'timestamp',
        config.measurementColumn || 'value'
      );

      // Process and store data points
      for (const point of dataPoints) {
        // Calculate SPC metrics
        const spcResult = this.calculateSpcMetrics(connectionId, point.value);

        // Insert into buffer
        const dbInsert = await getDb();
        if (!dbInsert) continue;
        await dbInsert.insert(realtimeDataBuffer).values({
          connectionId,
          machineId: config.machineId,
          measurementName: point.measurementName,
          value: Math.round(point.value * 10000),
          sampledAt: point.timestamp,
          subgroupIndex: spcResult.subgroupIndex,
          subgroupMean: spcResult.mean ? Math.round(spcResult.mean * 10000) : null,
          subgroupRange: spcResult.range ? Math.round(spcResult.range * 10000) : null,
          ucl: spcResult.ucl ? Math.round(spcResult.ucl * 10000) : null,
          lcl: spcResult.lcl ? Math.round(spcResult.lcl * 10000) : null,
          isOutOfSpec: spcResult.isOutOfSpec ? 1 : 0,
          isOutOfControl: spcResult.isOutOfControl ? 1 : 0,
          violatedRules: spcResult.violatedRules.join(','),
        });

        collector.status.dataPointsCollected++;

        // Emit data event for WebSocket broadcast
        this.emit('data', {
          connectionId,
          machineId: config.machineId,
          data: {
            timestamp: point.timestamp.toISOString(),
            value: point.value,
            measurementName: point.measurementName,
            ...spcResult,
          },
        });

        // Create alert if violation detected
        if (spcResult.isOutOfControl || spcResult.violatedRules.length > 0) {
          await this.createAlert(connectionId, config.machineId, point.value, spcResult);
        }
      }

      // Update status
      collector.status.status = 'connected';
      collector.status.lastDataAt = new Date();
      collector.status.lastError = null;

      // Update database
      const dbUpdate = await getDb();
      if (dbUpdate) {
        await dbUpdate.update(realtimeMachineConnections)
        .set({ 
            lastDataAt: new Date(),
            lastError: null,
          })
          .where(eq(realtimeMachineConnections.id, connectionId));
      }

      this.emit('status', collector.status);

    } catch (error: any) {
      collector.status.status = 'error';
      collector.status.lastError = error.message;

      const dbUpdate = await getDb();
      if (dbUpdate) {
        await dbUpdate.update(realtimeMachineConnections)
          .set({ lastError: error.message })
          .where(eq(realtimeMachineConnections.id, connectionId));
      }

      this.emit('status', collector.status);
      console.error(`[DataCollector] Error collecting data for ${connectionId}:`, error);
    }
  }

  private dataBuffers: Map<number, number[]> = new Map();
  private subgroupCounters: Map<number, number> = new Map();

  private calculateSpcMetrics(connectionId: number, value: number): {
    subgroupIndex: number;
    mean: number | null;
    range: number | null;
    ucl: number | null;
    lcl: number | null;
    isOutOfSpec: boolean;
    isOutOfControl: boolean;
    violatedRules: number[];
  } {
    // Get or create buffer for this connection
    let buffer = this.dataBuffers.get(connectionId) || [];
    buffer.push(value);

    // Keep last 125 points (25 subgroups of 5)
    if (buffer.length > 125) {
      buffer = buffer.slice(-125);
    }
    this.dataBuffers.set(connectionId, buffer);

    // Calculate subgroup index
    let subgroupCounter = this.subgroupCounters.get(connectionId) || 0;
    if (buffer.length % 5 === 0) {
      subgroupCounter++;
      this.subgroupCounters.set(connectionId, subgroupCounter);
    }

    // Need at least 5 points for calculations
    if (buffer.length < 5) {
      return {
        subgroupIndex: subgroupCounter,
        mean: null,
        range: null,
        ucl: null,
        lcl: null,
        isOutOfSpec: false,
        isOutOfControl: false,
        violatedRules: [],
      };
    }

    // Calculate statistics
    const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
    const variance = buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / buffer.length;
    const stdDev = Math.sqrt(variance);

    // Calculate control limits (3-sigma)
    const ucl = mean + 3 * stdDev;
    const lcl = mean - 3 * stdDev;

    // Calculate subgroup range
    const last5 = buffer.slice(-5);
    const range = Math.max(...last5) - Math.min(...last5);

    // Check violations
    const isOutOfControl = value > ucl || value < lcl;
    const violatedRules: number[] = [];

    // Rule 1: Point outside 3σ
    if (isOutOfControl) {
      violatedRules.push(1);
    }

    // Rule 2: 9 consecutive points on same side of center
    if (buffer.length >= 9) {
      const last9 = buffer.slice(-9);
      const allAbove = last9.every(p => p > mean);
      const allBelow = last9.every(p => p < mean);
      if (allAbove || allBelow) {
        violatedRules.push(2);
      }
    }

    // Rule 3: 6 consecutive points trending up or down
    if (buffer.length >= 6) {
      const last6 = buffer.slice(-6);
      let increasing = true;
      let decreasing = true;
      for (let i = 1; i < 6; i++) {
        if (last6[i] <= last6[i-1]) increasing = false;
        if (last6[i] >= last6[i-1]) decreasing = false;
      }
      if (increasing || decreasing) {
        violatedRules.push(3);
      }
    }

    return {
      subgroupIndex: subgroupCounter,
      mean,
      range,
      ucl,
      lcl,
      isOutOfSpec: false, // Would need USL/LSL from spec
      isOutOfControl,
      violatedRules,
    };
  }

  private async createAlert(
    connectionId: number, 
    machineId: number, 
    value: number, 
    spcResult: any
  ): Promise<void> {
    const alertType = spcResult.violatedRules.length > 0 ? 'rule_violation' : 'out_of_control';
    const severity = spcResult.violatedRules.includes(1) ? 'critical' : 'warning';

    const dbAlert = await getDb();
    if (!dbAlert) return;
    await dbAlert.insert(realtimeAlerts).values({
      connectionId,
      machineId,
      alertType,
      severity,
      message: `Giá trị ${value.toFixed(4)} vi phạm ${alertType === 'rule_violation' ? `Rule ${spcResult.violatedRules.join(', ')}` : 'giới hạn kiểm soát'}`,
      ruleNumber: spcResult.violatedRules[0] || null,
      value: Math.round(value * 10000),
      threshold: spcResult.ucl ? Math.round(spcResult.ucl * 10000) : null,
    });

    // Emit alert event
    this.emit('alert', {
      connectionId,
      machineId,
      alertType,
      severity,
      value,
      violatedRules: spcResult.violatedRules,
    });
  }

  async testConnection(connectionId: number): Promise<{ success: boolean; message: string }> {
    try {
      const db = await getDb();
      if (!db) {
        return { success: false, message: 'Database not connected' };
      }
      const connections = await db.select().from(realtimeMachineConnections)
        .where(eq(realtimeMachineConnections.id, connectionId));

      if (connections.length === 0) {
        return { success: false, message: 'Không tìm thấy kết nối' };
      }

      const conn = connections[0];
      const config: ConnectionConfig = conn.connectionConfig 
        ? JSON.parse(conn.connectionConfig) 
        : {};

      const adapter = this.createAdapter(conn.connectionType, config);
      return await adapter.testConnection();
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  getStatus(connectionId: number): CollectorStatus | null {
    const collector = this.collectors.get(connectionId);
    return collector?.status || null;
  }

  getAllStatuses(): CollectorStatus[] {
    return Array.from(this.collectors.values()).map(c => c.status);
  }

  async startAllActiveCollectors(): Promise<void> {
    const dbAll = await getDb();
    if (!dbAll) return;
    const connections = await dbAll.select().from(realtimeMachineConnections)
      .where(eq(realtimeMachineConnections.isActive, 1));

    for (const conn of connections) {
      await this.startCollector(conn.id);
    }
  }

  async stopAllCollectors(): Promise<void> {
    for (const connectionId of Array.from(this.collectors.keys())) {
      await this.stopCollector(connectionId);
    }
  }
}

// Export singleton instance
export const dataCollectorManager = DataCollectorManager.getInstance();
