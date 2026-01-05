/**
 * IoT Seed Service
 * Seed dữ liệu mẫu cho IoT devices và alarms để testing
 */

import { getDb } from '../db';
import { iotDevices, iotAlarms } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

// Sample device data
const sampleDevices = [
  {
    deviceCode: 'TEMP-001',
    deviceName: 'Temperature Sensor - Line 1',
    deviceType: 'temperature_sensor',
    location: 'Production Line 1 - Area A',
    protocol: 'mqtt',
    ipAddress: '192.168.1.101',
    port: 1883,
    status: 'online',
    description: 'Cảm biến nhiệt độ giám sát nhiệt độ môi trường sản xuất',
  },
  {
    deviceCode: 'TEMP-002',
    deviceName: 'Temperature Sensor - Line 2',
    deviceType: 'temperature_sensor',
    location: 'Production Line 2 - Area B',
    protocol: 'mqtt',
    ipAddress: '192.168.1.102',
    port: 1883,
    status: 'online',
    description: 'Cảm biến nhiệt độ giám sát nhiệt độ môi trường sản xuất',
  },
  {
    deviceCode: 'HUM-001',
    deviceName: 'Humidity Sensor - Line 1',
    deviceType: 'humidity_sensor',
    location: 'Production Line 1 - Area A',
    protocol: 'mqtt',
    ipAddress: '192.168.1.103',
    port: 1883,
    status: 'online',
    description: 'Cảm biến độ ẩm giám sát độ ẩm môi trường',
  },
  {
    deviceCode: 'PRESS-001',
    deviceName: 'Pressure Sensor - Compressor',
    deviceType: 'pressure_sensor',
    location: 'Utility Room',
    protocol: 'modbus',
    ipAddress: '192.168.1.104',
    port: 502,
    status: 'online',
    description: 'Cảm biến áp suất máy nén khí',
  },
  {
    deviceCode: 'VIB-001',
    deviceName: 'Vibration Sensor - Motor 1',
    deviceType: 'vibration_sensor',
    location: 'Production Line 1 - Motor Area',
    protocol: 'modbus',
    ipAddress: '192.168.1.105',
    port: 502,
    status: 'online',
    description: 'Cảm biến rung động giám sát motor chính',
  },
  {
    deviceCode: 'FLOW-001',
    deviceName: 'Flow Meter - Cooling System',
    deviceType: 'flow_meter',
    location: 'Cooling System',
    protocol: 'opcua',
    ipAddress: '192.168.1.106',
    port: 4840,
    status: 'online',
    description: 'Đồng hồ đo lưu lượng hệ thống làm mát',
  },
  {
    deviceCode: 'PLC-001',
    deviceName: 'PLC Controller - Line 1',
    deviceType: 'plc',
    location: 'Control Room',
    protocol: 'opcua',
    ipAddress: '192.168.1.110',
    port: 4840,
    status: 'online',
    description: 'PLC điều khiển dây chuyền sản xuất 1',
  },
  {
    deviceCode: 'GATEWAY-001',
    deviceName: 'IoT Gateway - Main',
    deviceType: 'gateway',
    location: 'Server Room',
    protocol: 'mqtt',
    ipAddress: '192.168.1.1',
    port: 1883,
    status: 'online',
    description: 'Gateway chính kết nối các thiết bị IoT',
  },
  {
    deviceCode: 'TEMP-003',
    deviceName: 'Temperature Sensor - Warehouse',
    deviceType: 'temperature_sensor',
    location: 'Warehouse - Zone 1',
    protocol: 'mqtt',
    ipAddress: '192.168.1.107',
    port: 1883,
    status: 'offline',
    description: 'Cảm biến nhiệt độ kho hàng',
  },
  {
    deviceCode: 'ENERGY-001',
    deviceName: 'Energy Meter - Main Panel',
    deviceType: 'energy_meter',
    location: 'Electrical Room',
    protocol: 'modbus',
    ipAddress: '192.168.1.108',
    port: 502,
    status: 'online',
    description: 'Đồng hồ đo năng lượng tủ điện chính',
  },
];

// Sample alarm data generator
function generateSampleAlarms(deviceIds: number[]) {
  const alarmTypes = ['warning', 'error', 'critical'] as const;
  const alarmCodes = [
    { code: 'TEMP_HIGH', message: 'Nhiệt độ vượt ngưỡng cao', type: 'warning' },
    { code: 'TEMP_CRITICAL', message: 'Nhiệt độ quá cao - Cần xử lý ngay!', type: 'critical' },
    { code: 'HUM_LOW', message: 'Độ ẩm thấp hơn ngưỡng cho phép', type: 'warning' },
    { code: 'PRESS_HIGH', message: 'Áp suất vượt ngưỡng an toàn', type: 'error' },
    { code: 'VIB_ABNORMAL', message: 'Phát hiện rung động bất thường', type: 'warning' },
    { code: 'VIB_CRITICAL', message: 'Rung động vượt ngưỡng nguy hiểm!', type: 'critical' },
    { code: 'CONN_LOST', message: 'Mất kết nối với thiết bị', type: 'error' },
    { code: 'FLOW_LOW', message: 'Lưu lượng thấp hơn mức tối thiểu', type: 'warning' },
    { code: 'ENERGY_SPIKE', message: 'Phát hiện đột biến tiêu thụ năng lượng', type: 'warning' },
    { code: 'SENSOR_FAULT', message: 'Lỗi cảm biến - Cần kiểm tra', type: 'error' },
  ];

  const alarms = [];
  const now = Date.now();
  
  // Generate 20 sample alarms
  for (let i = 0; i < 20; i++) {
    const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
    const alarmInfo = alarmCodes[Math.floor(Math.random() * alarmCodes.length)];
    const value = (Math.random() * 100).toFixed(1);
    const threshold = (parseFloat(value) * 0.8).toFixed(1);
    
    // Random time within last 7 days
    const createdAt = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    // Some alarms are acknowledged/resolved
    const isAcknowledged = Math.random() > 0.5;
    const isResolved = isAcknowledged && Math.random() > 0.5;
    
    alarms.push({
      deviceId,
      alarmType: alarmInfo.type as 'warning' | 'error' | 'critical',
      alarmCode: alarmInfo.code,
      message: alarmInfo.message,
      value,
      threshold,
      acknowledgedAt: isAcknowledged ? new Date(createdAt.getTime() + Math.random() * 60 * 60 * 1000) : null,
      acknowledgedBy: isAcknowledged ? 1 : null,
      resolvedAt: isResolved ? new Date(createdAt.getTime() + Math.random() * 2 * 60 * 60 * 1000) : null,
      createdAt,
    });
  }

  return alarms;
}

/**
 * Seed IoT devices
 */
export async function seedIotDevices(): Promise<{
  success: boolean;
  inserted: number;
  skipped: number;
  error?: string;
}> {
  const db = getDb();
  if (!db) {
    return { success: false, inserted: 0, skipped: 0, error: 'Database not available' };
  }

  let inserted = 0;
  let skipped = 0;

  try {
    for (const device of sampleDevices) {
      // Check if device already exists
      const [existing] = await db.select()
        .from(iotDevices)
        .where(eq(iotDevices.deviceCode, device.deviceCode));

      if (existing) {
        skipped++;
        continue;
      }

      await db.insert(iotDevices).values({
        deviceCode: device.deviceCode,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        location: device.location,
        protocol: device.protocol as any,
        ipAddress: device.ipAddress,
        port: device.port,
        status: device.status as any,
        description: device.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      inserted++;
    }

    return { success: true, inserted, skipped };
  } catch (error) {
    console.error('Error seeding IoT devices:', error);
    return {
      success: false,
      inserted,
      skipped,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Seed IoT alarms
 */
export async function seedIotAlarms(): Promise<{
  success: boolean;
  inserted: number;
  error?: string;
}> {
  const db = getDb();
  if (!db) {
    return { success: false, inserted: 0, error: 'Database not available' };
  }

  try {
    // Get existing device IDs
    const devices = await db.select({ id: iotDevices.id }).from(iotDevices);
    
    if (devices.length === 0) {
      return { success: false, inserted: 0, error: 'No devices found. Please seed devices first.' };
    }

    const deviceIds = devices.map(d => d.id);
    const alarms = generateSampleAlarms(deviceIds);

    let inserted = 0;
    for (const alarm of alarms) {
      await db.insert(iotAlarms).values(alarm);
      inserted++;
    }

    return { success: true, inserted };
  } catch (error) {
    console.error('Error seeding IoT alarms:', error);
    return {
      success: false,
      inserted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear all IoT data (for testing)
 */
export async function clearIotData(): Promise<{
  success: boolean;
  deletedDevices: number;
  deletedAlarms: number;
  error?: string;
}> {
  const db = getDb();
  if (!db) {
    return { success: false, deletedDevices: 0, deletedAlarms: 0, error: 'Database not available' };
  }

  try {
    // Delete alarms first (foreign key constraint)
    const alarmsResult = await db.delete(iotAlarms);
    const devicesResult = await db.delete(iotDevices);

    return {
      success: true,
      deletedDevices: (devicesResult as any).rowsAffected || 0,
      deletedAlarms: (alarmsResult as any).rowsAffected || 0,
    };
  } catch (error) {
    console.error('Error clearing IoT data:', error);
    return {
      success: false,
      deletedDevices: 0,
      deletedAlarms: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Seed all IoT data
 */
export async function seedAllIotData(): Promise<{
  success: boolean;
  devices: { inserted: number; skipped: number };
  alarms: { inserted: number };
  error?: string;
}> {
  // Seed devices first
  const devicesResult = await seedIotDevices();
  if (!devicesResult.success) {
    return {
      success: false,
      devices: { inserted: 0, skipped: 0 },
      alarms: { inserted: 0 },
      error: devicesResult.error,
    };
  }

  // Then seed alarms
  const alarmsResult = await seedIotAlarms();
  
  return {
    success: alarmsResult.success,
    devices: { inserted: devicesResult.inserted, skipped: devicesResult.skipped },
    alarms: { inserted: alarmsResult.inserted },
    error: alarmsResult.error,
  };
}

export default {
  seedIotDevices,
  seedIotAlarms,
  seedAllIotData,
  clearIotData,
};
