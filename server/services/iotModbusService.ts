/**
 * IoT Modbus Connection Service
 * Provides Modbus TCP/RTU connection management with simulation mode.
 */

import { EventEmitter } from 'events';
import { getTimeseriesService } from './iotTimeseriesService';

export interface ModbusConnectionConfig {
  id: string;
  name: string;
  type: 'tcp' | 'rtu';
  host?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  slaveId: number;
  timeout: number;
  retryCount: number;
}

export interface ModbusRegisterConfig {
  address: number;
  length: number;
  type: 'coil' | 'discrete' | 'holding' | 'input';
  dataType: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'float64';
  deviceId?: number;
  sensorType?: string;
  scaleFactor?: number;
  offset?: number;
  pollInterval: number;
}

export type ModbusConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface ModbusConnectionStats {
  readCount: number;
  writeCount: number;
  errorCount: number;
  lastReadTime: Date | null;
  uptime: number;
}

class ModbusClientWrapper {
  private config: ModbusConnectionConfig;
  private polledRegisters: Map<string, ModbusRegisterConfig> = new Map();
  private status: ModbusConnectionStatus = 'disconnected';
  private stats: ModbusConnectionStats;
  private eventEmitter: EventEmitter;
  private startTime: Date | null = null;
  private pollIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isSimulated: boolean = true;

  constructor(config: ModbusConnectionConfig) {
    this.config = config;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(50);
    this.stats = { readCount: 0, writeCount: 0, errorCount: 0, lastReadTime: null, uptime: 0 };
  }

  async connect(): Promise<{ success: boolean; error?: string }> {
    if (this.status === 'connected') return { success: true };
    this.status = 'connecting';
    this.eventEmitter.emit('statusChange', this.status);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      if (this.config.type === 'tcp' && !this.config.host) throw new Error('Modbus TCP host is required');
      if (this.config.type === 'rtu' && !this.config.serialPort) throw new Error('Modbus RTU serial port is required');
      this.status = 'connected';
      this.startTime = new Date();
      this.eventEmitter.emit('statusChange', this.status);
      return { success: true };
    } catch (error) {
      this.status = 'error';
      this.eventEmitter.emit('statusChange', this.status);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async disconnect(): Promise<void> {
    this.stopAllPolling();
    this.status = 'disconnected';
    this.startTime = null;
    this.eventEmitter.emit('statusChange', this.status);
  }

  async readHoldingRegisters(address: number, length: number): Promise<number[]> {
    this.stats.readCount++;
    this.stats.lastReadTime = new Date();
    return Array(length).fill(0).map(() => Math.floor(Math.random() * 65535));
  }

  async writeRegister(address: number, value: number): Promise<boolean> {
    this.stats.writeCount++;
    return true;
  }

  startPolling(registerConfig: ModbusRegisterConfig): void {
    const key = `${registerConfig.type}_${registerConfig.address}_${registerConfig.length}`;
    if (this.pollIntervals.has(key)) return;
    this.polledRegisters.set(key, registerConfig);
    const interval = setInterval(() => this.pollRegister(registerConfig), registerConfig.pollInterval);
    this.pollIntervals.set(key, interval);
  }

  private stopAllPolling(): void {
    for (const interval of this.pollIntervals.values()) clearInterval(interval);
    this.pollIntervals.clear();
    this.polledRegisters.clear();
  }

  private async pollRegister(config: ModbusRegisterConfig): Promise<void> {
    if (this.status !== 'connected') return;
    const timeseriesService = getTimeseriesService();

    try {
      const rawValue = (await this.readHoldingRegisters(config.address, config.length))[0];
      const scaledValue = (rawValue * (config.scaleFactor || 1)) + (config.offset || 0);
      const deviceId = config.deviceId || this.config.slaveId;
      const sensorType = config.sensorType || 'modbus_register';

      timeseriesService.writeSensorReading({ deviceId, sensorType, value: scaledValue, unit: 'unit', quality: 'good', timestamp: new Date() });
      this.eventEmitter.emit('data', { address: config.address, type: config.type, value: scaledValue, timestamp: new Date() });
    } catch (error) {
      this.stats.errorCount++;
      this.eventEmitter.emit('error', { address: config.address, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  getStatus(): ModbusConnectionStatus { return this.status; }
  getStats(): ModbusConnectionStats { return { ...this.stats, uptime: this.startTime ? (Date.now() - this.startTime.getTime()) / 1000 : 0 }; }
  getPolledRegisters(): ModbusRegisterConfig[] { return Array.from(this.polledRegisters.values()); }
  on(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.on(event, handler); }
  off(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.off(event, handler); }
  setSimulationMode(enabled: boolean): void { this.isSimulated = enabled; }
}

class ModbusServiceManager {
  private clients: Map<string, ModbusClientWrapper> = new Map();
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(100);
  }

  createConnection(config: ModbusConnectionConfig): ModbusClientWrapper {
    const client = new ModbusClientWrapper(config);
    this.clients.set(config.id, client);
    client.on('data', (data) => this.eventEmitter.emit('data', { connectionId: config.id, ...data }));
    client.on('statusChange', (status) => this.eventEmitter.emit('statusChange', { connectionId: config.id, status }));
    return client;
  }

  getConnection(id: string): ModbusClientWrapper | undefined { return this.clients.get(id); }
  getAllConnections(): Array<{ id: string; client: ModbusClientWrapper }> { return Array.from(this.clients.entries()).map(([id, client]) => ({ id, client })); }
  async removeConnection(id: string): Promise<boolean> { const client = this.clients.get(id); if (!client) return false; await client.disconnect(); this.clients.delete(id); return true; }
  on(event: string, handler: (...args: any[]) => void): void { this.eventEmitter.on(event, handler); }
  async shutdown(): Promise<void> { for (const client of this.clients.values()) await client.disconnect(); this.clients.clear(); }
}

let modbusServiceManager: ModbusServiceManager | null = null;

export function getModbusServiceManager(): ModbusServiceManager {
  if (!modbusServiceManager) modbusServiceManager = new ModbusServiceManager();
  return modbusServiceManager;
}

export async function resetModbusServiceManager(): Promise<void> {
  if (modbusServiceManager) { await modbusServiceManager.shutdown(); modbusServiceManager = null; }
}

export { ModbusClientWrapper, ModbusServiceManager };
export default getModbusServiceManager;
