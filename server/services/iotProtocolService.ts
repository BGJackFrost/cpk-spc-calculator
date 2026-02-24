/**
 * IoT Protocol Service - Enhanced
 * 
 * Provides unified protocol management:
 * - MQTT Client Management
 * - OPC-UA Client Management
 * - Modbus TCP/RTU Client Management
 * - Protocol Configuration
 * - Connection Monitoring
 */

import { getDb } from '../db';
import { iotDevices } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// ============ Types ============

export interface ProtocolConfig {
  protocol: 'mqtt' | 'opc_ua' | 'modbus_tcp' | 'modbus_rtu' | 'http' | 'tcp' | 'serial';
  host: string;
  port: number;
  options?: Record<string, any>;
}

export interface MQTTConfig extends ProtocolConfig {
  protocol: 'mqtt';
  clientId?: string;
  username?: string;
  password?: string;
  useTls?: boolean;
  cleanSession?: boolean;
  keepAlive?: number;
  topics?: string[];
  qos?: 0 | 1 | 2;
}

export interface OPCUAConfig extends ProtocolConfig {
  protocol: 'opc_ua';
  endpointUrl: string;
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: string;
  username?: string;
  password?: string;
  nodeIds?: string[];
  samplingInterval?: number;
}

export interface ModbusConfig extends ProtocolConfig {
  protocol: 'modbus_tcp' | 'modbus_rtu';
  unitId: number;
  baudRate?: number;
  dataBits?: number;
  stopBits?: number;
  parity?: 'none' | 'even' | 'odd';
  registers?: Array<{
    address: number;
    type: 'coil' | 'discrete' | 'holding' | 'input';
    count: number;
    name: string;
    dataType: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float32' | 'float64';
    scale?: number;
    offset?: number;
  }>;
}

export interface ConnectionStatus {
  deviceId: number;
  protocol: string;
  isConnected: boolean;
  lastConnectedAt?: Date;
  lastDisconnectedAt?: Date;
  lastError?: string;
  reconnectAttempts: number;
  latencyMs?: number;
  messagesReceived: number;
  messagesSent: number;
}

// ============ Connection State Management ============

const connectionStates = new Map<number, ConnectionStatus>();
const protocolConfigs = new Map<number, ProtocolConfig>();

// ============ MQTT Functions ============

export async function connectMQTT(deviceId: number, config: MQTTConfig): Promise<boolean> {
  console.log(`[MQTT] Connecting device ${deviceId} to ${config.host}:${config.port}`);
  
  // Store config
  protocolConfigs.set(deviceId, config);
  
  // Initialize connection state
  connectionStates.set(deviceId, {
    deviceId,
    protocol: 'mqtt',
    isConnected: false,
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
  });
  
  try {
    // Simulate MQTT connection (in production, use actual MQTT library)
    // const mqtt = require('mqtt');
    // const client = mqtt.connect(`mqtt://${config.host}:${config.port}`, {
    //   clientId: config.clientId,
    //   username: config.username,
    //   password: config.password,
    //   clean: config.cleanSession,
    //   keepalive: config.keepAlive,
    // });
    
    // Update connection state
    const state = connectionStates.get(deviceId)!;
    state.isConnected = true;
    state.lastConnectedAt = new Date();
    
    // Update device status in database
    const db = await getDb();
    await db.update(iotDevices).set({
      status: 'online',
      lastSeen: new Date().toISOString(),
    }).where(eq(iotDevices.id, deviceId));
    
    console.log(`[MQTT] Device ${deviceId} connected successfully`);
    return true;
  } catch (error: any) {
    const state = connectionStates.get(deviceId)!;
    state.isConnected = false;
    state.lastError = error.message;
    state.reconnectAttempts++;
    
    console.error(`[MQTT] Device ${deviceId} connection failed:`, error.message);
    return false;
  }
}

export async function disconnectMQTT(deviceId: number): Promise<boolean> {
  const state = connectionStates.get(deviceId);
  if (!state) return false;
  
  state.isConnected = false;
  state.lastDisconnectedAt = new Date();
  
  // Update device status
  const db = await getDb();
  await db.update(iotDevices).set({
    status: 'offline',
  }).where(eq(iotDevices.id, deviceId));
  
  console.log(`[MQTT] Device ${deviceId} disconnected`);
  return true;
}

export async function publishMQTT(deviceId: number, topic: string, message: string, qos: 0 | 1 | 2 = 0): Promise<boolean> {
  const state = connectionStates.get(deviceId);
  if (!state?.isConnected) {
    console.error(`[MQTT] Device ${deviceId} not connected`);
    return false;
  }
  
  try {
    // Simulate publish (in production, use actual MQTT client)
    console.log(`[MQTT] Device ${deviceId} publishing to ${topic}: ${message}`);
    state.messagesSent++;
    return true;
  } catch (error: any) {
    console.error(`[MQTT] Publish failed:`, error.message);
    return false;
  }
}

export async function subscribeMQTT(deviceId: number, topics: string[], qos: 0 | 1 | 2 = 0): Promise<boolean> {
  const state = connectionStates.get(deviceId);
  if (!state?.isConnected) {
    console.error(`[MQTT] Device ${deviceId} not connected`);
    return false;
  }
  
  try {
    // Simulate subscribe (in production, use actual MQTT client)
    console.log(`[MQTT] Device ${deviceId} subscribing to ${topics.join(', ')}`);
    return true;
  } catch (error: any) {
    console.error(`[MQTT] Subscribe failed:`, error.message);
    return false;
  }
}

// ============ OPC-UA Functions ============

export async function connectOPCUA(deviceId: number, config: OPCUAConfig): Promise<boolean> {
  console.log(`[OPC-UA] Connecting device ${deviceId} to ${config.endpointUrl}`);
  
  protocolConfigs.set(deviceId, config);
  
  connectionStates.set(deviceId, {
    deviceId,
    protocol: 'opc_ua',
    isConnected: false,
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
  });
  
  try {
    // Simulate OPC-UA connection (in production, use node-opcua library)
    // const { OPCUAClient } = require('node-opcua');
    // const client = OPCUAClient.create({
    //   securityMode: config.securityMode,
    //   securityPolicy: config.securityPolicy,
    // });
    // await client.connect(config.endpointUrl);
    
    const state = connectionStates.get(deviceId)!;
    state.isConnected = true;
    state.lastConnectedAt = new Date();
    
    const db = await getDb();
    await db.update(iotDevices).set({
      status: 'online',
      lastSeen: new Date().toISOString(),
    }).where(eq(iotDevices.id, deviceId));
    
    console.log(`[OPC-UA] Device ${deviceId} connected successfully`);
    return true;
  } catch (error: any) {
    const state = connectionStates.get(deviceId)!;
    state.isConnected = false;
    state.lastError = error.message;
    state.reconnectAttempts++;
    
    console.error(`[OPC-UA] Device ${deviceId} connection failed:`, error.message);
    return false;
  }
}

export async function disconnectOPCUA(deviceId: number): Promise<boolean> {
  const state = connectionStates.get(deviceId);
  if (!state) return false;
  
  state.isConnected = false;
  state.lastDisconnectedAt = new Date();
  
  const db = await getDb();
  await db.update(iotDevices).set({
    status: 'offline',
  }).where(eq(iotDevices.id, deviceId));
  
  console.log(`[OPC-UA] Device ${deviceId} disconnected`);
  return true;
}

export async function readOPCUANodes(deviceId: number, nodeIds: string[]): Promise<Array<{ nodeId: string; value: any; timestamp: Date }>> {
  const state = connectionStates.get(deviceId);
  if (!state?.isConnected) {
    console.error(`[OPC-UA] Device ${deviceId} not connected`);
    return [];
  }
  
  try {
    // Simulate read (in production, use actual OPC-UA client)
    console.log(`[OPC-UA] Device ${deviceId} reading nodes: ${nodeIds.join(', ')}`);
    state.messagesReceived += nodeIds.length;
    
    return nodeIds.map(nodeId => ({
      nodeId,
      value: Math.random() * 100, // Simulated value
      timestamp: new Date(),
    }));
  } catch (error: any) {
    console.error(`[OPC-UA] Read failed:`, error.message);
    return [];
  }
}

export async function writeOPCUANode(deviceId: number, nodeId: string, value: any): Promise<boolean> {
  const state = connectionStates.get(deviceId);
  if (!state?.isConnected) {
    console.error(`[OPC-UA] Device ${deviceId} not connected`);
    return false;
  }
  
  try {
    // Simulate write (in production, use actual OPC-UA client)
    console.log(`[OPC-UA] Device ${deviceId} writing to ${nodeId}: ${value}`);
    state.messagesSent++;
    return true;
  } catch (error: any) {
    console.error(`[OPC-UA] Write failed:`, error.message);
    return false;
  }
}

// ============ Modbus Functions ============

export async function connectModbus(deviceId: number, config: ModbusConfig): Promise<boolean> {
  console.log(`[Modbus] Connecting device ${deviceId} to ${config.host}:${config.port}`);
  
  protocolConfigs.set(deviceId, config);
  
  connectionStates.set(deviceId, {
    deviceId,
    protocol: config.protocol,
    isConnected: false,
    reconnectAttempts: 0,
    messagesReceived: 0,
    messagesSent: 0,
  });
  
  try {
    // Simulate Modbus connection (in production, use modbus-serial library)
    // const ModbusRTU = require('modbus-serial');
    // const client = new ModbusRTU();
    // await client.connectTCP(config.host, { port: config.port });
    // client.setID(config.unitId);
    
    const state = connectionStates.get(deviceId)!;
    state.isConnected = true;
    state.lastConnectedAt = new Date();
    
    const db = await getDb();
    await db.update(iotDevices).set({
      status: 'online',
      lastSeen: new Date().toISOString(),
    }).where(eq(iotDevices.id, deviceId));
    
    console.log(`[Modbus] Device ${deviceId} connected successfully`);
    return true;
  } catch (error: any) {
    const state = connectionStates.get(deviceId)!;
    state.isConnected = false;
    state.lastError = error.message;
    state.reconnectAttempts++;
    
    console.error(`[Modbus] Device ${deviceId} connection failed:`, error.message);
    return false;
  }
}

export async function disconnectModbus(deviceId: number): Promise<boolean> {
  const state = connectionStates.get(deviceId);
  if (!state) return false;
  
  state.isConnected = false;
  state.lastDisconnectedAt = new Date();
  
  const db = await getDb();
  await db.update(iotDevices).set({
    status: 'offline',
  }).where(eq(iotDevices.id, deviceId));
  
  console.log(`[Modbus] Device ${deviceId} disconnected`);
  return true;
}

export async function readModbusRegisters(
  deviceId: number,
  registerType: 'coil' | 'discrete' | 'holding' | 'input',
  address: number,
  count: number
): Promise<number[]> {
  const state = connectionStates.get(deviceId);
  if (!state?.isConnected) {
    console.error(`[Modbus] Device ${deviceId} not connected`);
    return [];
  }
  
  try {
    // Simulate read (in production, use actual Modbus client)
    console.log(`[Modbus] Device ${deviceId} reading ${registerType} registers at ${address}, count: ${count}`);
    state.messagesReceived++;
    
    // Return simulated values
    return Array(count).fill(0).map(() => Math.floor(Math.random() * 65535));
  } catch (error: any) {
    console.error(`[Modbus] Read failed:`, error.message);
    return [];
  }
}

export async function writeModbusRegister(
  deviceId: number,
  registerType: 'coil' | 'holding',
  address: number,
  value: number | boolean
): Promise<boolean> {
  const state = connectionStates.get(deviceId);
  if (!state?.isConnected) {
    console.error(`[Modbus] Device ${deviceId} not connected`);
    return false;
  }
  
  try {
    // Simulate write (in production, use actual Modbus client)
    console.log(`[Modbus] Device ${deviceId} writing to ${registerType} register at ${address}: ${value}`);
    state.messagesSent++;
    return true;
  } catch (error: any) {
    console.error(`[Modbus] Write failed:`, error.message);
    return false;
  }
}

// ============ Connection Management ============

export function getConnectionStatus(deviceId: number): ConnectionStatus | null {
  return connectionStates.get(deviceId) || null;
}

export function getAllConnectionStatuses(): ConnectionStatus[] {
  return Array.from(connectionStates.values());
}

export function getProtocolConfig(deviceId: number): ProtocolConfig | null {
  return protocolConfigs.get(deviceId) || null;
}

export async function reconnect(deviceId: number): Promise<boolean> {
  const config = protocolConfigs.get(deviceId);
  if (!config) {
    console.error(`[Protocol] No config found for device ${deviceId}`);
    return false;
  }
  
  switch (config.protocol) {
    case 'mqtt':
      return connectMQTT(deviceId, config as MQTTConfig);
    case 'opc_ua':
      return connectOPCUA(deviceId, config as OPCUAConfig);
    case 'modbus_tcp':
    case 'modbus_rtu':
      return connectModbus(deviceId, config as ModbusConfig);
    default:
      console.error(`[Protocol] Unknown protocol: ${config.protocol}`);
      return false;
  }
}

export async function disconnect(deviceId: number): Promise<boolean> {
  const state = connectionStates.get(deviceId);
  if (!state) return false;
  
  switch (state.protocol) {
    case 'mqtt':
      return disconnectMQTT(deviceId);
    case 'opc_ua':
      return disconnectOPCUA(deviceId);
    case 'modbus_tcp':
    case 'modbus_rtu':
      return disconnectModbus(deviceId);
    default:
      return false;
  }
}

// ============ Protocol Statistics ============

export function getProtocolStats(): {
  totalConnections: number;
  activeConnections: number;
  byProtocol: Record<string, { total: number; active: number }>;
  totalMessagesReceived: number;
  totalMessagesSent: number;
} {
  const states = Array.from(connectionStates.values());
  
  const byProtocol: Record<string, { total: number; active: number }> = {};
  let totalMessagesReceived = 0;
  let totalMessagesSent = 0;
  
  states.forEach(state => {
    if (!byProtocol[state.protocol]) {
      byProtocol[state.protocol] = { total: 0, active: 0 };
    }
    byProtocol[state.protocol].total++;
    if (state.isConnected) {
      byProtocol[state.protocol].active++;
    }
    totalMessagesReceived += state.messagesReceived;
    totalMessagesSent += state.messagesSent;
  });
  
  return {
    totalConnections: states.length,
    activeConnections: states.filter(s => s.isConnected).length,
    byProtocol,
    totalMessagesReceived,
    totalMessagesSent,
  };
}

// ============ Auto-Reconnect ============

let autoReconnectInterval: NodeJS.Timeout | null = null;

export function startAutoReconnect(intervalMs: number = 30000): void {
  if (autoReconnectInterval) {
    clearInterval(autoReconnectInterval);
  }
  
  autoReconnectInterval = setInterval(async () => {
    const disconnected = Array.from(connectionStates.entries())
      .filter(([_, state]) => !state.isConnected && state.reconnectAttempts < 5);
    
    for (const [deviceId, state] of disconnected) {
      console.log(`[Protocol] Auto-reconnecting device ${deviceId}...`);
      await reconnect(deviceId);
    }
  }, intervalMs);
  
  console.log(`[Protocol] Auto-reconnect started with interval ${intervalMs}ms`);
}

export function stopAutoReconnect(): void {
  if (autoReconnectInterval) {
    clearInterval(autoReconnectInterval);
    autoReconnectInterval = null;
    console.log('[Protocol] Auto-reconnect stopped');
  }
}
