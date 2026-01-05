/**
 * IoT Database Service
 * Service mới để quản lý IoT với database thực, loại bỏ mock data
 */

import { getDb } from "../db";
import { 
  iotDevices, 
  iotAlarms, 
  iotAlertThresholds,
  iotDeviceData
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, or, like, isNull, isNotNull } from "drizzle-orm";

// ==================== DEVICE CRUD ====================

export interface CreateDeviceInput {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  productionLineId?: number;
  machineId?: number;
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  status?: string;
}

export interface UpdateDeviceInput extends Partial<CreateDeviceInput> {
  id: number;
}

export async function createDevice(input: CreateDeviceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [device] = await db.insert(iotDevices).values({
    deviceCode: input.deviceCode,
    deviceName: input.deviceName,
    deviceType: input.deviceType,
    manufacturer: input.manufacturer || null,
    model: input.model || null,
    serialNumber: input.serialNumber || null,
    firmwareVersion: input.firmwareVersion || null,
    productionLineId: input.productionLineId || null,
    machineId: input.machineId || null,
    location: input.location || null,
    ipAddress: input.ipAddress || null,
    macAddress: input.macAddress || null,
    status: input.status || 'offline',
    healthScore: 100,
    lastSeen: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }).$returningId();
  
  return getDeviceById(device.id);
}

export async function getDeviceById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [device] = await db.select().from(iotDevices).where(eq(iotDevices.id, id));
  return device || null;
}

export async function getDevices(options?: {
  status?: string;
  deviceType?: string;
  productionLineId?: number;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(iotDevices);
  
  const conditions = [];
  
  if (options?.status) {
    conditions.push(eq(iotDevices.status, options.status));
  }
  
  if (options?.deviceType) {
    conditions.push(eq(iotDevices.deviceType, options.deviceType));
  }
  
  if (options?.productionLineId) {
    conditions.push(eq(iotDevices.productionLineId, options.productionLineId));
  }
  
  if (options?.search) {
    conditions.push(
      or(
        like(iotDevices.deviceCode, `%${options.search}%`),
        like(iotDevices.deviceName, `%${options.search}%`)
      )
    );
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(iotDevices.createdAt)) as any;
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  
  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }
  
  return query;
}

export async function updateDevice(input: UpdateDeviceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { id, ...data } = input;
  
  await db.update(iotDevices)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(iotDevices.id, id));
  
  return getDeviceById(id);
}

export async function deleteDevice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(iotDevices).where(eq(iotDevices.id, id));
  return { success: true };
}

export async function getDeviceStats() {
  const db = await getDb();
  if (!db) return { total: 0, online: 0, offline: 0, maintenance: 0, error: 0 };
  
  const devices = await db.select().from(iotDevices);
  
  return {
    total: devices.length,
    online: devices.filter(d => d.status === 'online').length,
    offline: devices.filter(d => d.status === 'offline').length,
    maintenance: devices.filter(d => d.status === 'maintenance').length,
    error: devices.filter(d => d.status === 'error').length,
  };
}

// ==================== ALARM CRUD ====================

export interface CreateAlarmInput {
  deviceId: number;
  alarmType: string;
  alarmCode: string;
  message: string;
  severity?: string;
  value?: number;
  thresholdValue?: number;
}

export async function createAlarm(input: CreateAlarmInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [alarm] = await db.insert(iotAlarms).values({
    deviceId: input.deviceId,
    alarmType: input.alarmType as 'warning' | 'error' | 'critical',
    alarmCode: input.alarmCode,
    message: input.message,
    value: input.value?.toString() || null,
    threshold: input.thresholdValue?.toString() || null,
    createdAt: new Date(),
  }).$returningId();
  
  // Send notification for critical alarms
  if (input.alarmType === 'critical') {
    try {
      const { notifyOnCriticalAlarm } = await import('./iotNotificationService');
      await notifyOnCriticalAlarm(alarm.id, input.alarmType);
    } catch (error) {
      console.error('Error sending critical alarm notification:', error);
    }
  }
  
  return getAlarmById(alarm.id);
}

export async function getAlarmById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [alarm] = await db.select().from(iotAlarms).where(eq(iotAlarms.id, id));
  return alarm || null;
}

export async function getAlarms(options?: {
  deviceId?: number;
  alarmType?: string;
  acknowledged?: boolean;
  resolved?: boolean;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(iotAlarms);
  
  const conditions = [];
  
  if (options?.deviceId) {
    conditions.push(eq(iotAlarms.deviceId, options.deviceId));
  }
  
  if (options?.alarmType) {
    conditions.push(eq(iotAlarms.alarmType, options.alarmType as 'warning' | 'error' | 'critical'));
  }
  
  if (options?.acknowledged !== undefined) {
    if (options.acknowledged) {
      conditions.push(isNotNull(iotAlarms.acknowledgedAt));
    } else {
      conditions.push(isNull(iotAlarms.acknowledgedAt));
    }
  }
  
  if (options?.resolved !== undefined) {
    if (options.resolved) {
      conditions.push(isNotNull(iotAlarms.resolvedAt));
    } else {
      conditions.push(isNull(iotAlarms.resolvedAt));
    }
  }
  
  if (options?.startTime) {
    conditions.push(gte(iotAlarms.createdAt, options.startTime.toISOString()));
  }
  
  if (options?.endTime) {
    conditions.push(lte(iotAlarms.createdAt, options.endTime.toISOString()));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(iotAlarms.createdAt)) as any;
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  
  if (options?.offset) {
    query = query.offset(options.offset) as any;
  }
  
  return query;
}

export async function acknowledgeAlarm(id: number, acknowledgedBy?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(iotAlarms)
    .set({
      acknowledgedBy: acknowledgedBy ? parseInt(acknowledgedBy) : null,
      acknowledgedAt: new Date().toISOString(),
    })
    .where(eq(iotAlarms.id, id));
  
  return getAlarmById(id);
}

export async function resolveAlarm(id: number, resolvedBy?: string, resolution?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(iotAlarms)
    .set({
      resolvedAt: new Date().toISOString(),
    })
    .where(eq(iotAlarms.id, id));
  
  return getAlarmById(id);
}

export async function batchAcknowledgeAlarms(ids: number[], acknowledgedBy?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const results = [];
  for (const id of ids) {
    const result = await acknowledgeAlarm(id, acknowledgedBy);
    results.push(result);
  }
  
  return results;
}

export async function getAlarmStats() {
  const db = await getDb();
  if (!db) return { total: 0, unacknowledged: 0, unresolved: 0, critical: 0, error: 0, warning: 0 };
  
  const alarms = await db.select().from(iotAlarms);
  
  return {
    total: alarms.length,
    unacknowledged: alarms.filter(a => !a.acknowledgedAt).length,
    unresolved: alarms.filter(a => !a.resolvedAt).length,
    critical: alarms.filter(a => a.alarmType === 'critical').length,
    error: alarms.filter(a => a.alarmType === 'error').length,
    warning: alarms.filter(a => a.alarmType === 'warning').length,
  };
}

// ==================== THRESHOLD CRUD ====================

export interface CreateThresholdInput {
  deviceId: number;
  metric: string;
  warningLowerLimit?: number;
  warningUpperLimit?: number;
  lowerLimit?: number;
  upperLimit?: number;
  criticalLowerLimit?: number;
  criticalUpperLimit?: number;
  isEnabled?: boolean;
}

export interface UpdateThresholdInput extends Partial<CreateThresholdInput> {
  id: number;
}

export async function createThreshold(input: CreateThresholdInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [threshold] = await db.insert(iotAlertThresholds).values({
    deviceId: input.deviceId,
    metric: input.metric,
    lowerWarning: input.warningLowerLimit?.toString() || null,
    upperWarning: input.warningUpperLimit?.toString() || null,
    lowerLimit: input.lowerLimit?.toString() || null,
    upperLimit: input.upperLimit?.toString() || null,
    alertEnabled: input.isEnabled !== false ? 1 : 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).$returningId();
  
  return getThresholdById(threshold.id);
}

export async function getThresholdById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [threshold] = await db.select().from(iotAlertThresholds).where(eq(iotAlertThresholds.id, id));
  return threshold || null;
}

export async function getThresholds(options?: {
  deviceId?: number;
  metric?: string;
  isEnabled?: boolean;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select().from(iotAlertThresholds);
  
  const conditions = [];
  
  if (options?.deviceId) {
    conditions.push(eq(iotAlertThresholds.deviceId, options.deviceId));
  }
  
  if (options?.metric) {
    conditions.push(eq(iotAlertThresholds.metric, options.metric));
  }
  
  if (options?.isEnabled !== undefined) {
    conditions.push(eq(iotAlertThresholds.alertEnabled, options.isEnabled ? 1 : 0));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }
  
  return query;
}

export async function updateThreshold(input: UpdateThresholdInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { id, ...data } = input;
  
  const updateData: any = {
    updatedAt: new Date(),
  };
  
  if (data.deviceId !== undefined) updateData.deviceId = data.deviceId;
  if (data.metric !== undefined) updateData.metric = data.metric;
  if (data.warningLowerLimit !== undefined) updateData.lowerWarning = data.warningLowerLimit?.toString();
  if (data.warningUpperLimit !== undefined) updateData.upperWarning = data.warningUpperLimit?.toString();
  if (data.lowerLimit !== undefined) updateData.lowerLimit = data.lowerLimit?.toString();
  if (data.upperLimit !== undefined) updateData.upperLimit = data.upperLimit?.toString();
  if (data.isEnabled !== undefined) updateData.alertEnabled = data.isEnabled ? 1 : 0;
  
  await db.update(iotAlertThresholds)
    .set(updateData)
    .where(eq(iotAlertThresholds.id, id));
  
  return getThresholdById(id);
}

export async function deleteThreshold(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(iotAlertThresholds).where(eq(iotAlertThresholds.id, id));
  return { success: true };
}

// ==================== SEED DATA ====================

export async function seedIotDevices() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const sampleDevices = [
    { deviceCode: 'TEMP-001', deviceName: 'Temperature Sensor Line 1', deviceType: 'sensor', manufacturer: 'Siemens', model: 'S7-1200', status: 'online' },
    { deviceCode: 'TEMP-002', deviceName: 'Temperature Sensor Line 2', deviceType: 'sensor', manufacturer: 'Siemens', model: 'S7-1200', status: 'online' },
    { deviceCode: 'PRESS-001', deviceName: 'Pressure Sensor Station A', deviceType: 'sensor', manufacturer: 'ABB', model: 'PX-100', status: 'online' },
    { deviceCode: 'VIB-001', deviceName: 'Vibration Sensor Motor 1', deviceType: 'sensor', manufacturer: 'SKF', model: 'CMSS 2200', status: 'maintenance' },
    { deviceCode: 'PLC-001', deviceName: 'Main PLC Controller', deviceType: 'plc', manufacturer: 'Siemens', model: 'S7-1500', status: 'online' },
    { deviceCode: 'GW-001', deviceName: 'MQTT Gateway', deviceType: 'gateway', manufacturer: 'Advantech', model: 'WISE-4000', status: 'online' },
    { deviceCode: 'CAM-001', deviceName: 'Quality Camera Station 1', deviceType: 'camera', manufacturer: 'Cognex', model: 'IS7000', status: 'offline' },
    { deviceCode: 'FLOW-001', deviceName: 'Flow Meter Line 1', deviceType: 'sensor', manufacturer: 'Endress+Hauser', model: 'Promag', status: 'online' },
    { deviceCode: 'LEVEL-001', deviceName: 'Level Sensor Tank A', deviceType: 'sensor', manufacturer: 'Vega', model: 'Vegapuls', status: 'online' },
    { deviceCode: 'POWER-001', deviceName: 'Power Meter Main Panel', deviceType: 'sensor', manufacturer: 'Schneider', model: 'PM5000', status: 'online' },
  ];
  
  for (const device of sampleDevices) {
    try {
      await createDevice(device);
    } catch (e) {
      console.log(`Device ${device.deviceCode} may already exist`);
    }
  }
  
  return { success: true, count: sampleDevices.length };
}

export async function seedIotAlarms() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const devices = await getDevices({ limit: 5 });
  if (devices.length === 0) {
    await seedIotDevices();
  }
  
  const deviceList = await getDevices({ limit: 5 });
  
  const sampleAlarms = [
    { deviceId: deviceList[0]?.id || 1, alarmType: 'warning', alarmCode: 'TEMP_HIGH', message: 'Temperature exceeds warning threshold' },
    { deviceId: deviceList[0]?.id || 1, alarmType: 'critical', alarmCode: 'TEMP_CRITICAL', message: 'Temperature exceeds critical threshold' },
    { deviceId: deviceList[1]?.id || 2, alarmType: 'error', alarmCode: 'COMM_FAIL', message: 'Communication failure with device' },
    { deviceId: deviceList[2]?.id || 3, alarmType: 'warning', alarmCode: 'PRESS_LOW', message: 'Pressure below warning threshold' },
    { deviceId: deviceList[3]?.id || 4, alarmType: 'error', alarmCode: 'VIB_HIGH', message: 'Vibration exceeds normal range' },
  ];
  
  for (const alarm of sampleAlarms) {
    try {
      await createAlarm(alarm);
    } catch (e) {
      console.log(`Error creating alarm: ${e}`);
    }
  }
  
  return { success: true, count: sampleAlarms.length };
}

export async function seedIotThresholds() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const devices = await getDevices({ limit: 5 });
  if (devices.length === 0) {
    await seedIotDevices();
  }
  
  const deviceList = await getDevices({ limit: 5 });
  
  const sampleThresholds = [
    { deviceId: deviceList[0]?.id || 1, metric: 'temperature', warningLowerLimit: 15, warningUpperLimit: 35, lowerLimit: 10, upperLimit: 40 },
    { deviceId: deviceList[0]?.id || 1, metric: 'humidity', warningLowerLimit: 30, warningUpperLimit: 70, lowerLimit: 20, upperLimit: 80 },
    { deviceId: deviceList[2]?.id || 3, metric: 'pressure', warningLowerLimit: 2, warningUpperLimit: 8, lowerLimit: 1, upperLimit: 10 },
    { deviceId: deviceList[3]?.id || 4, metric: 'vibration', warningUpperLimit: 5, upperLimit: 10 },
    { deviceId: deviceList[4]?.id || 5, metric: 'power', warningUpperLimit: 80, upperLimit: 100 },
  ];
  
  for (const threshold of sampleThresholds) {
    try {
      await createThreshold(threshold);
    } catch (e) {
      console.log(`Error creating threshold: ${e}`);
    }
  }
  
  return { success: true, count: sampleThresholds.length };
}
