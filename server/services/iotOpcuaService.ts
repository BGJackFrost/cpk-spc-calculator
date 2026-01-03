/**
 * IoT OPC-UA Connection Service
 * Provides OPC-UA connection management with simulation mode.
 */

import { EventEmitter } from 'events';
import { getTimeseriesService } from './iotTimeseriesService';

export interface OpcuaConnectionConfig {
  id: string;
  name: string;
  endpointUrl: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: 'None' | 'Basic128Rsa15' | 'Basic256' | 'Basic256Sha256';
  username?: string;
  password?: string;
  applicationName?: string;
  requestedSessionTimeout: number;
  keepAliveInterval: number;
}

export interface OpcuaNodeConfig {
  nodeId: string;
  displayName: string;
  dataType: 'Boolean' | 'Int16' | 'Int32' | 'Float' | 'Double' | 'String';
  deviceId?: number;
  sensorType?: string;
  samplingInterval: number;
}

export type OpcuaConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface OpcuaConnectionStats {
  readCount: number;
  writeCount: number;
  subscriptionCount: number;
  reconnectCount: number;
  lastReadTime: Date | null;
  uptime: number;
}

class OpcuaClientWrapper {
  private config: OpcuaConnectionConfig;
  private monitoredNodes: Map<string, OpcuaNodeConfig> = new Map();
  private status: OpcuaConnectionStatus = 'disconnected';
  private stats: OpcuaConnectionStats;
  private eventEmitter: EventEmitter;
  private startTime: Date | null = null;
  private simulationInterval: NodeJS.Timeout | null = null;
  private isSimulated: boolean = true;

  constructor(config: OpcuaConnectionConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(50);
    this.stats = { readCount: 0, writeCount: 0, subscriptionCount: 0, reconnectCount: 0, lastReadTime: null, uptime: 0 };
  }

  async connect(): Promise<{ success: boolean; error?: string }> {
    if (this.status === 'connected') return { success: true };
    this.status = 'connecting';
    this.eventEmitter.emit('statusChange', this.status);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!this.config.endpointUrl) throw new Error('OPC-UA endpoint URL is required');
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

  async browseNodes(parentNodeId?: string): Promise<Array<{ nodeId: string; displayName: string; nodeClass: string }>> {
    return [
      { nodeId: 'ns=2;s=Temperature', displayName: 'Temperature', nodeClass: 'Variable' },
      { nodeId: 'ns=2;s=Pressure', displayName: 'Pressure', nodeClass: 'Variable' },
      { nodeId: 'ns=2;s=Humidity', displayName: 'Humidity', nodeClass: 'Variable' },
      { nodeId: 'ns=2;s=MachineStatus', displayName: 'Machine Status', nodeClass: 'Variable' },
    ];
  }

  async readNode(nodeId: string): Promise<{ value: any; statusCode: string; timestamp: Date }> {
    this.stats.readCount++;
    this.stats.lastReadTime = new Date();
    return { value: Math.random() * 100, statusCode: 'Good', timestamp: new Date() };
  }

  async writeNode(nodeId: string, value: any): Promise<{ success: boolean; statusCode: string }> {
    this.stats.writeCount++;
    return { success: true, statusCode: 'Good' };
  }

  async subscribeNode(nodeConfig: OpcuaNodeConfig): Promise<boolean> {
    if (this.status !== 'connected') return false;
    this.monitoredNodes.set(nodeConfig.nodeId, nodeConfig);
    this.stats.subscriptionCount++;
    return true;
  }

  async unsubscribeNode(nodeId: string): Promise<boolean> {
    if (!this.monitoredNodes.has(nodeId)) return false;
    this.monitoredNodes.delete(nodeId);
    this.stats.subscriptionCount--;
    return true;
  }

  getStatus(): OpcuaConnectionStatus { return this.status; }
  getStats(): OpcuaConnectionStats { return { ...this.stats, uptime: this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0 }; }
  getMonitoredNodes(): OpcuaNodeConfig[] { return Array.from(this.monitoredNodes.values()); }
  on(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.on(event, handler); }
  off(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.off(event, handler); }
  setSimulationMode(enabled: boolean): void { this.isSimulated = enabled; if (enabled && this.status === 'connected') this.startSimulation(); else this.stopSimulation(); }

  private startSimulation(): void {
    if (this.simulationInterval) return;
    this.simulationInterval = setInterval(() => this.generateSimulatedData(), 2000);
  }

  private stopSimulation(): void {
    if (this.simulationInterval) { clearInterval(this.simulationInterval); this.simulationInterval = null; }
  }

  private generateSimulatedData(): void {
    const timeseriesService = getTimeseriesService();
    for (const nodeConfig of this.monitoredNodes.values()) {
      const { value, unit } = this.generateNodeValue(nodeConfig);
      const deviceId = nodeConfig.deviceId || Math.floor(Math.random() * 100) + 1;
      const sensorType = nodeConfig.sensorType || this.inferSensorType(nodeConfig.nodeId);

      timeseriesService.writeSensorReading({ deviceId, sensorType, value, unit, quality: 'good', timestamp: new Date() });
      this.stats.readCount++;
      this.stats.lastReadTime = new Date();
      this.eventEmitter.emit('dataChange', { nodeId: nodeConfig.nodeId, value, statusCode: 'Good', timestamp: new Date() });
    }
  }

  private inferSensorType(nodeId: string): string {
    const lower = nodeId.toLowerCase();
    if (lower.includes('temp')) return 'temperature';
    if (lower.includes('press')) return 'pressure';
    if (lower.includes('humid')) return 'humidity';
    return 'generic';
  }

  private generateNodeValue(nodeConfig: OpcuaNodeConfig): { value: number; unit: string } {
    const sensorType = nodeConfig.sensorType || this.inferSensorType(nodeConfig.nodeId);
    switch (sensorType) {
      case 'temperature': return { value: 20 + Math.random() * 15, unit: '°C' };
      case 'pressure': return { value: 1000 + Math.random() * 50, unit: 'hPa' };
      case 'humidity': return { value: 40 + Math.random() * 30, unit: '%' };
      default: return { value: Math.random() * 100, unit: 'unit' };
    }
  }
}

class OpcuaServiceManager {
  private clients: Map<string, OpcuaClientWrapper> = new Map();
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100);
  }

  createConnection(config: OpcuaConnectionConfig): OpcuaClientWrapper {
    const client = new OpcuaClientWrapper(config);
    this.clients.set(config.id, client);
    client.on('dataChange', (data) => this.eventEmitter.emit('dataChange', { connectionId: config.id, ...data }));
    client.on('statusChange', (status) => this.eventEmitter.emit('statusChange', { connectionId: config.id, status }));
    return client;
  }

  getConnection(id: string): OpcuaClientWrapper | undefined { return this.clients.get(id); }
  getAllConnections(): Array<{ id: string; client: OpcuaClientWrapper }> { return Array.from(this.clients.entries()).map(([id, client]) => ({ id, client })); }
  async removeConnection(id: string): Promise<boolean> { const client = this.clients.get(id); if (!client) return false; await client.disconnect(); this.clients.delete(id); return true; }
  on(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.on(event, handler); }
  async shutdown(): Promise<void> { for (const client of this.clients.values()) await client.disconnect(); this.clients.clear(); }
}

let opcuaServiceManager: OpcuaServiceManager | null = null;

export function getOpcuaServiceManager(): OpcuaServiceManager {
  if (!opcuaServiceManager) opcuaServiceManager = new OpcuaServiceManager();
  return opcuaServiceManager;
}

export async function resetOpcuaServiceManager(): Promise<void> {
  if (opcuaServiceManager) { await opcuaServiceManager.shutdown(); opcuaServiceManager = null; }
}

export { OpcuaClientWrapper, OpcuaServiceManager };
export default getOpcuaServiceManager;
