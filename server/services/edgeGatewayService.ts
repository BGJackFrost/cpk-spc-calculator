/**
 * Edge Gateway Service
 * Quản lý Edge Gateway MVP cho 1 khu vực sản xuất
 */

import { getDb } from "../db";

// Types
export interface EdgeGateway {
  id: number;
  gatewayCode: string;
  name: string;
  description?: string | null;
  location?: string | null;
  productionLineId?: number | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  status: 'online' | 'offline' | 'syncing' | 'error' | 'maintenance';
  lastHeartbeat?: number | null;
  lastSyncAt?: number | null;
  bufferCapacity: number;
  currentBufferSize: number;
  syncInterval: number;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
  diskUsage?: number | null;
  firmwareVersion?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface EdgeDevice {
  id: number;
  gatewayId: number;
  deviceCode: string;
  name: string;
  deviceType: 'sensor' | 'plc' | 'actuator' | 'meter' | 'camera';
  protocol: 'modbus_tcp' | 'modbus_rtu' | 'opcua' | 'mqtt' | 'http' | 'serial';
  address?: string | null;
  pollingInterval: number;
  dataType: 'int16' | 'int32' | 'float32' | 'float64' | 'bool' | 'string';
  scaleFactor: number;
  offset: number;
  unit?: string | null;
  status: 'active' | 'inactive' | 'error' | 'disconnected';
  lastValue?: number | null;
  lastReadAt?: number | null;
  errorCount: number;
}

export interface CreateGatewayInput {
  gatewayCode: string;
  name: string;
  description?: string;
  location?: string;
  productionLineId?: number;
  ipAddress?: string;
  macAddress?: string;
  bufferCapacity?: number;
  syncInterval?: number;
  firmwareVersion?: string;
}

export interface CreateDeviceInput {
  gatewayId: number;
  deviceCode: string;
  name: string;
  deviceType: 'sensor' | 'plc' | 'actuator' | 'meter' | 'camera';
  protocol?: 'modbus_tcp' | 'modbus_rtu' | 'opcua' | 'mqtt' | 'http' | 'serial';
  address?: string;
  pollingInterval?: number;
  dataType?: 'int16' | 'int32' | 'float32' | 'float64' | 'bool' | 'string';
  scaleFactor?: number;
  offset?: number;
  unit?: string;
}

// Mock data for demo
const mockGateways: EdgeGateway[] = [
  {
    id: 1,
    gatewayCode: 'GW-PROD-001',
    name: 'Edge Gateway - Khu vực A',
    description: 'Gateway chính cho khu vực sản xuất A',
    location: 'Nhà máy 1 - Khu A',
    productionLineId: 1,
    ipAddress: '192.168.1.100',
    macAddress: 'AA:BB:CC:DD:EE:01',
    status: 'online',
    lastHeartbeat: Date.now() - 5000,
    lastSyncAt: Date.now() - 60000,
    bufferCapacity: 10000,
    currentBufferSize: 245,
    syncInterval: 60,
    cpuUsage: 35.5,
    memoryUsage: 42.3,
    diskUsage: 28.7,
    firmwareVersion: '2.1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    gatewayCode: 'GW-PROD-002',
    name: 'Edge Gateway - Khu vực B',
    description: 'Gateway phụ cho khu vực sản xuất B',
    location: 'Nhà máy 1 - Khu B',
    productionLineId: 2,
    ipAddress: '192.168.1.101',
    macAddress: 'AA:BB:CC:DD:EE:02',
    status: 'syncing',
    lastHeartbeat: Date.now() - 2000,
    lastSyncAt: Date.now() - 30000,
    bufferCapacity: 10000,
    currentBufferSize: 1520,
    syncInterval: 30,
    cpuUsage: 65.2,
    memoryUsage: 58.1,
    diskUsage: 45.3,
    firmwareVersion: '2.0.5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockDevices: EdgeDevice[] = [
  {
    id: 1,
    gatewayId: 1,
    deviceCode: 'TEMP-001',
    name: 'Temperature Sensor 1',
    deviceType: 'sensor',
    protocol: 'modbus_tcp',
    address: '1:40001',
    pollingInterval: 1000,
    dataType: 'float32',
    scaleFactor: 1,
    offset: 0,
    unit: '°C',
    status: 'active',
    lastValue: 25.5,
    lastReadAt: Date.now() - 1000,
    errorCount: 0,
  },
  {
    id: 2,
    gatewayId: 1,
    deviceCode: 'HUMID-001',
    name: 'Humidity Sensor 1',
    deviceType: 'sensor',
    protocol: 'modbus_tcp',
    address: '1:40002',
    pollingInterval: 2000,
    dataType: 'float32',
    scaleFactor: 1,
    offset: 0,
    unit: '%RH',
    status: 'active',
    lastValue: 65.2,
    lastReadAt: Date.now() - 2000,
    errorCount: 0,
  },
];

// Gateway CRUD operations
export async function getAllGateways(): Promise<EdgeGateway[]> {
  const db = getDb();
  if (!db) {
    return mockGateways;
  }
  
  try {
    const results = await db.execute(`SELECT * FROM edge_gateways ORDER BY created_at DESC`);
    if (!results || (results as any[]).length === 0) {
      return mockGateways;
    }
    return (results as any[]).map((r: any) => ({
      id: r.id,
      gatewayCode: r.gateway_code,
      name: r.name,
      description: r.description,
      location: r.location,
      productionLineId: r.production_line_id,
      ipAddress: r.ip_address,
      macAddress: r.mac_address,
      status: r.status,
      lastHeartbeat: r.last_heartbeat,
      lastSyncAt: r.last_sync_at,
      bufferCapacity: r.buffer_capacity ?? 10000,
      currentBufferSize: r.current_buffer_size ?? 0,
      syncInterval: r.sync_interval ?? 60,
      cpuUsage: r.cpu_usage ? parseFloat(r.cpu_usage) : null,
      memoryUsage: r.memory_usage ? parseFloat(r.memory_usage) : null,
      diskUsage: r.disk_usage ? parseFloat(r.disk_usage) : null,
      firmwareVersion: r.firmware_version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch (error) {
    console.error('[EdgeGateway] Error fetching gateways:', error);
    return mockGateways;
  }
}

export async function getGatewayById(id: number): Promise<EdgeGateway | null> {
  const db = getDb();
  if (!db) {
    return mockGateways.find(g => g.id === id) || null;
  }
  
  try {
    const results = await db.execute(`SELECT * FROM edge_gateways WHERE id = ?`, [id]);
    if (!results || (results as any[]).length === 0) return null;
    const r = (results as any[])[0];
    return {
      id: r.id,
      gatewayCode: r.gateway_code,
      name: r.name,
      description: r.description,
      location: r.location,
      productionLineId: r.production_line_id,
      ipAddress: r.ip_address,
      macAddress: r.mac_address,
      status: r.status,
      lastHeartbeat: r.last_heartbeat,
      lastSyncAt: r.last_sync_at,
      bufferCapacity: r.buffer_capacity ?? 10000,
      currentBufferSize: r.current_buffer_size ?? 0,
      syncInterval: r.sync_interval ?? 60,
      cpuUsage: r.cpu_usage ? parseFloat(r.cpu_usage) : null,
      memoryUsage: r.memory_usage ? parseFloat(r.memory_usage) : null,
      diskUsage: r.disk_usage ? parseFloat(r.disk_usage) : null,
      firmwareVersion: r.firmware_version,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  } catch (error) {
    console.error('[EdgeGateway] Error fetching gateway:', error);
    return null;
  }
}

export async function createGateway(input: CreateGatewayInput): Promise<EdgeGateway | null> {
  const db = getDb();
  if (!db) return null;
  
  try {
    await db.execute(
      `INSERT INTO edge_gateways (gateway_code, name, description, location, production_line_id, ip_address, mac_address, buffer_capacity, sync_interval, firmware_version, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'offline')`,
      [input.gatewayCode, input.name, input.description, input.location, input.productionLineId, input.ipAddress, input.macAddress, input.bufferCapacity ?? 10000, input.syncInterval ?? 60, input.firmwareVersion]
    );
    return null;
  } catch (error) {
    console.error('[EdgeGateway] Error creating gateway:', error);
    return null;
  }
}

export async function updateGateway(id: number, updates: Partial<CreateGatewayInput>): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  
  try {
    const sets: string[] = [];
    const values: any[] = [];
    
    if (updates.name) { sets.push('name = ?'); values.push(updates.name); }
    if (updates.description !== undefined) { sets.push('description = ?'); values.push(updates.description); }
    if (updates.location !== undefined) { sets.push('location = ?'); values.push(updates.location); }
    
    if (sets.length === 0) return true;
    
    values.push(id);
    await db.execute(`UPDATE edge_gateways SET ${sets.join(', ')} WHERE id = ?`, values);
    return true;
  } catch (error) {
    console.error('[EdgeGateway] Error updating gateway:', error);
    return false;
  }
}

export async function deleteGateway(id: number): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  
  try {
    await db.execute(`DELETE FROM edge_gateways WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error('[EdgeGateway] Error deleting gateway:', error);
    return false;
  }
}

// Device operations
export async function getDevicesByGateway(gatewayId: number): Promise<EdgeDevice[]> {
  const db = getDb();
  if (!db) {
    return mockDevices.filter(d => d.gatewayId === gatewayId);
  }
  
  try {
    const results = await db.execute(`SELECT * FROM edge_devices WHERE gateway_id = ?`, [gatewayId]);
    if (!results || (results as any[]).length === 0) {
      return mockDevices.filter(d => d.gatewayId === gatewayId);
    }
    return (results as any[]).map((r: any) => ({
      id: r.id,
      gatewayId: r.gateway_id,
      deviceCode: r.device_code,
      name: r.name,
      deviceType: r.device_type,
      protocol: r.protocol ?? 'modbus_tcp',
      address: r.address,
      pollingInterval: r.polling_interval ?? 1000,
      dataType: r.data_type ?? 'float32',
      scaleFactor: r.scale_factor ? parseFloat(r.scale_factor) : 1,
      offset: r.offset ? parseFloat(r.offset) : 0,
      unit: r.unit,
      status: r.status ?? 'inactive',
      lastValue: r.last_value ? parseFloat(r.last_value) : null,
      lastReadAt: r.last_read_at,
      errorCount: r.error_count ?? 0,
    }));
  } catch (error) {
    console.error('[EdgeGateway] Error fetching devices:', error);
    return [];
  }
}

export async function createDevice(input: CreateDeviceInput): Promise<EdgeDevice | null> {
  const db = getDb();
  if (!db) return null;
  
  try {
    await db.execute(
      `INSERT INTO edge_devices (gateway_id, device_code, name, device_type, protocol, address, polling_interval, data_type, scale_factor, offset, unit, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'inactive')`,
      [input.gatewayId, input.deviceCode, input.name, input.deviceType, input.protocol ?? 'modbus_tcp', input.address, input.pollingInterval ?? 1000, input.dataType ?? 'float32', input.scaleFactor ?? 1, input.offset ?? 0, input.unit]
    );
    return null;
  } catch (error) {
    console.error('[EdgeGateway] Error creating device:', error);
    return null;
  }
}

// Heartbeat and sync operations
export async function updateHeartbeat(gatewayId: number, metrics?: {
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  currentBufferSize?: number;
}): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  
  try {
    await db.execute(
      `UPDATE edge_gateways SET last_heartbeat = ?, status = 'online', cpu_usage = ?, memory_usage = ?, disk_usage = ?, current_buffer_size = ? WHERE id = ?`,
      [Date.now(), metrics?.cpuUsage, metrics?.memoryUsage, metrics?.diskUsage, metrics?.currentBufferSize, gatewayId]
    );
    return true;
  } catch (error) {
    console.error('[EdgeGateway] Error updating heartbeat:', error);
    return false;
  }
}

export async function syncData(gatewayId: number, data: Array<{
  deviceId: number;
  value: number;
  timestamp: number;
  quality?: 'good' | 'uncertain' | 'bad';
}>): Promise<{ synced: number; failed: number }> {
  const db = getDb();
  if (!db) return { synced: 0, failed: 0 };
  
  const startTime = Date.now();
  let synced = 0;
  let failed = 0;
  
  try {
    // Create sync log
    await db.execute(
      `INSERT INTO edge_sync_logs (gateway_id, sync_type, started_at, status) VALUES (?, 'incremental', ?, 'running')`,
      [gatewayId, startTime]
    );
    
    // Insert data to buffer
    for (const item of data) {
      try {
        await db.execute(
          `INSERT INTO edge_data_buffer (gateway_id, device_id, value, captured_at, quality, sync_status, synced_at) VALUES (?, ?, ?, ?, ?, 'synced', ?)`,
          [gatewayId, item.deviceId, item.value, item.timestamp, item.quality ?? 'good', Date.now()]
        );
        synced++;
      } catch (err) {
        failed++;
      }
    }
    
    // Update gateway
    await db.execute(
      `UPDATE edge_gateways SET last_sync_at = ?, status = 'online' WHERE id = ?`,
      [Date.now(), gatewayId]
    );
    
    return { synced, failed };
  } catch (error) {
    console.error('[EdgeGateway] Error syncing data:', error);
    return { synced, failed };
  }
}

// Get gateway statistics
export async function getGatewayStats(gatewayId: number): Promise<{
  totalDevices: number;
  activeDevices: number;
  totalDataPoints: number;
  pendingSync: number;
  avgLatency: number;
}> {
  const db = getDb();
  if (!db) {
    return {
      totalDevices: mockDevices.filter(d => d.gatewayId === gatewayId).length,
      activeDevices: mockDevices.filter(d => d.gatewayId === gatewayId && d.status === 'active').length,
      totalDataPoints: 15420,
      pendingSync: 245,
      avgLatency: 35,
    };
  }
  
  try {
    const devices = await db.execute(`SELECT * FROM edge_devices WHERE gateway_id = ?`, [gatewayId]);
    const deviceList = devices as any[] || [];
    const activeDevices = deviceList.filter((d: any) => d.status === 'active');
    
    return {
      totalDevices: deviceList.length,
      activeDevices: activeDevices.length,
      totalDataPoints: 0,
      pendingSync: 0,
      avgLatency: 35,
    };
  } catch (error) {
    console.error('[EdgeGateway] Error fetching stats:', error);
    return {
      totalDevices: 0,
      activeDevices: 0,
      totalDataPoints: 0,
      pendingSync: 0,
      avgLatency: 0,
    };
  }
}
