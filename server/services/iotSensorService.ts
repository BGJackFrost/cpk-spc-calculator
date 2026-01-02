/**
 * IoT Sensor Service - Quản lý sensors và readings từ database
 */

import { getDb } from '../db';
import { 
  iotDevices, 
  iotDataPoints, 
  iotAlertHistory,
  iotAlertThresholds,
  machines,
  productionLines
} from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql, inArray } from 'drizzle-orm';

// Types
export interface SensorReading {
  id: number;
  deviceId: number;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: Date;
  quality: 'good' | 'warning' | 'critical';
}

export interface SensorDevice {
  id: number;
  name: string;
  type: string;
  machineId: number | null;
  machineName?: string;
  lineId: number | null;
  lineName?: string;
  status: 'online' | 'offline' | 'error';
  lastReading?: SensorReading;
  alertCount?: number;
}

export interface SensorAlert {
  id: number;
  deviceId: number;
  deviceName: string;
  sensorType: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  createdAt: Date;
}

// Get all sensors with latest readings
export async function getAllSensors(filters?: {
  lineId?: number;
  machineId?: number;
  sensorType?: string;
  status?: string;
}): Promise<SensorDevice[]> {
  const db = getDb();
  if (!db) return generateMockSensors(filters);

  try {
    // Query devices from database
    let query = db.select({
      id: iotDevices.id,
      name: iotDevices.name,
      type: iotDevices.deviceType,
      machineId: iotDevices.machineId,
      status: iotDevices.status,
      lastSeen: iotDevices.lastSeen,
    }).from(iotDevices);

    const devices = await query;

    if (devices.length === 0) {
      return generateMockSensors(filters);
    }

    // Get latest readings for each device
    const sensorsWithReadings = await Promise.all(
      devices.map(async (device) => {
        const readings = await db
          .select()
          .from(iotDataPoints)
          .where(eq(iotDataPoints.deviceId, device.id))
          .orderBy(desc(iotDataPoints.timestamp))
          .limit(1);

        const alertCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(iotAlertHistory)
          .where(
            and(
              eq(iotAlertHistory.deviceId, device.id),
              eq(iotAlertHistory.acknowledged, false)
            )
          );

        return {
          id: device.id,
          name: device.name,
          type: device.type || 'temperature',
          machineId: device.machineId,
          lineId: null,
          status: (device.status as 'online' | 'offline' | 'error') || 'online',
          lastReading: readings[0] ? {
            id: readings[0].id,
            deviceId: readings[0].deviceId,
            sensorType: readings[0].sensorType || 'temperature',
            value: Number(readings[0].value),
            unit: readings[0].unit || '°C',
            timestamp: readings[0].timestamp,
            quality: getQuality(Number(readings[0].value), readings[0].sensorType || 'temperature'),
          } : undefined,
          alertCount: alertCount[0]?.count || 0,
        };
      })
    );

    // Apply filters
    let filtered = sensorsWithReadings;
    if (filters?.lineId) {
      filtered = filtered.filter(s => s.lineId === filters.lineId);
    }
    if (filters?.machineId) {
      filtered = filtered.filter(s => s.machineId === filters.machineId);
    }
    if (filters?.sensorType && filters.sensorType !== 'all') {
      filtered = filtered.filter(s => s.type === filters.sensorType);
    }
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }

    return filtered;
  } catch (error) {
    console.error('Error fetching sensors:', error);
    return generateMockSensors(filters);
  }
}

// Get sensor readings history
export async function getSensorReadings(
  deviceId: number,
  timeRange: '1h' | '6h' | '24h' | '7d' = '1h'
): Promise<SensorReading[]> {
  const db = getDb();
  
  const now = new Date();
  const startTime = new Date();
  
  switch (timeRange) {
    case '1h': startTime.setHours(now.getHours() - 1); break;
    case '6h': startTime.setHours(now.getHours() - 6); break;
    case '24h': startTime.setDate(now.getDate() - 1); break;
    case '7d': startTime.setDate(now.getDate() - 7); break;
  }

  if (!db) {
    return generateMockReadings(deviceId, timeRange);
  }

  try {
    const readings = await db
      .select()
      .from(iotDataPoints)
      .where(
        and(
          eq(iotDataPoints.deviceId, deviceId),
          gte(iotDataPoints.timestamp, startTime)
        )
      )
      .orderBy(desc(iotDataPoints.timestamp))
      .limit(500);

    if (readings.length === 0) {
      return generateMockReadings(deviceId, timeRange);
    }

    return readings.map(r => ({
      id: r.id,
      deviceId: r.deviceId,
      sensorType: r.sensorType || 'temperature',
      value: Number(r.value),
      unit: r.unit || '°C',
      timestamp: r.timestamp,
      quality: getQuality(Number(r.value), r.sensorType || 'temperature'),
    }));
  } catch (error) {
    console.error('Error fetching readings:', error);
    return generateMockReadings(deviceId, timeRange);
  }
}

// Get active alerts
export async function getActiveAlerts(filters?: {
  severity?: 'warning' | 'critical';
  acknowledged?: boolean;
}): Promise<SensorAlert[]> {
  const db = getDb();
  
  if (!db) {
    return generateMockAlerts(filters);
  }

  try {
    let conditions = [];
    if (filters?.severity) {
      conditions.push(eq(iotAlertHistory.severity, filters.severity));
    }
    if (filters?.acknowledged !== undefined) {
      conditions.push(eq(iotAlertHistory.acknowledged, filters.acknowledged));
    }

    const alerts = await db
      .select({
        id: iotAlertHistory.id,
        deviceId: iotAlertHistory.deviceId,
        sensorType: iotAlertHistory.sensorType,
        value: iotAlertHistory.value,
        threshold: iotAlertHistory.threshold,
        severity: iotAlertHistory.severity,
        message: iotAlertHistory.message,
        acknowledged: iotAlertHistory.acknowledged,
        createdAt: iotAlertHistory.createdAt,
      })
      .from(iotAlertHistory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(iotAlertHistory.createdAt))
      .limit(100);

    if (alerts.length === 0) {
      return generateMockAlerts(filters);
    }

    // Get device names
    const deviceIds = [...new Set(alerts.map(a => a.deviceId))];
    const devices = await db
      .select({ id: iotDevices.id, name: iotDevices.name })
      .from(iotDevices)
      .where(inArray(iotDevices.id, deviceIds));
    
    const deviceMap = new Map(devices.map(d => [d.id, d.name]));

    return alerts.map(a => ({
      id: a.id,
      deviceId: a.deviceId,
      deviceName: deviceMap.get(a.deviceId) || `Sensor ${a.deviceId}`,
      sensorType: a.sensorType || 'temperature',
      value: Number(a.value),
      threshold: Number(a.threshold),
      severity: (a.severity as 'warning' | 'critical') || 'warning',
      message: a.message || '',
      acknowledged: a.acknowledged || false,
      createdAt: a.createdAt || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return generateMockAlerts(filters);
  }
}

// Record new sensor reading
export async function recordSensorReading(
  deviceId: number,
  sensorType: string,
  value: number,
  unit: string
): Promise<{ reading: SensorReading; alert?: SensorAlert }> {
  const db = getDb();
  const timestamp = new Date();
  const quality = getQuality(value, sensorType);

  const reading: SensorReading = {
    id: Date.now(),
    deviceId,
    sensorType,
    value,
    unit,
    timestamp,
    quality,
  };

  if (db) {
    try {
      // Insert reading
      const result = await db.insert(iotSensorReadings).values({
        deviceId,
        sensorType,
        value: value.toString(),
        unit,
        timestamp,
      });

      // Check thresholds and create alert if needed
      const thresholds = await db
        .select()
        .from(iotAlertThresholds)
        .where(
          and(
            eq(iotAlertThresholds.deviceId, deviceId),
            eq(iotAlertThresholds.sensorType, sensorType)
          )
        )
        .limit(1);

      if (thresholds.length > 0) {
        const threshold = thresholds[0];
        let alert: SensorAlert | undefined;

        if (threshold.criticalMax && value > Number(threshold.criticalMax)) {
          alert = await createAlert(db, deviceId, sensorType, value, Number(threshold.criticalMax), 'critical', `Giá trị ${value}${unit} vượt ngưỡng critical ${threshold.criticalMax}${unit}`);
        } else if (threshold.warningMax && value > Number(threshold.warningMax)) {
          alert = await createAlert(db, deviceId, sensorType, value, Number(threshold.warningMax), 'warning', `Giá trị ${value}${unit} vượt ngưỡng warning ${threshold.warningMax}${unit}`);
        } else if (threshold.criticalMin && value < Number(threshold.criticalMin)) {
          alert = await createAlert(db, deviceId, sensorType, value, Number(threshold.criticalMin), 'critical', `Giá trị ${value}${unit} dưới ngưỡng critical ${threshold.criticalMin}${unit}`);
        } else if (threshold.warningMin && value < Number(threshold.warningMin)) {
          alert = await createAlert(db, deviceId, sensorType, value, Number(threshold.warningMin), 'warning', `Giá trị ${value}${unit} dưới ngưỡng warning ${threshold.warningMin}${unit}`);
        }

        return { reading, alert };
      }
    } catch (error) {
      console.error('Error recording reading:', error);
    }
  }

  return { reading };
}

// Acknowledge alert
export async function acknowledgeAlert(alertId: number): Promise<boolean> {
  const db = getDb();
  if (!db) return true;

  try {
    await db
      .update(iotAlertHistory)
      .set({ acknowledged: true, acknowledgedAt: new Date() })
      .where(eq(iotAlertHistory.id, alertId));
    return true;
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return false;
  }
}

// Get sensor statistics
export async function getSensorStatistics(): Promise<{
  totalSensors: number;
  onlineSensors: number;
  offlineSensors: number;
  errorSensors: number;
  activeAlerts: number;
  criticalAlerts: number;
}> {
  const sensors = await getAllSensors();
  const alerts = await getActiveAlerts({ acknowledged: false });

  return {
    totalSensors: sensors.length,
    onlineSensors: sensors.filter(s => s.status === 'online').length,
    offlineSensors: sensors.filter(s => s.status === 'offline').length,
    errorSensors: sensors.filter(s => s.status === 'error').length,
    activeAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
  };
}

// Helper functions
function getQuality(value: number, sensorType: string): 'good' | 'warning' | 'critical' {
  // Default thresholds based on sensor type
  const thresholds: Record<string, { warningMin: number; warningMax: number; criticalMin: number; criticalMax: number }> = {
    temperature: { warningMin: 15, warningMax: 35, criticalMin: 10, criticalMax: 45 },
    humidity: { warningMin: 30, warningMax: 70, criticalMin: 20, criticalMax: 80 },
    pressure: { warningMin: 900, warningMax: 1100, criticalMin: 800, criticalMax: 1200 },
    vibration: { warningMin: 0, warningMax: 5, criticalMin: 0, criticalMax: 10 },
    current: { warningMin: 0, warningMax: 15, criticalMin: 0, criticalMax: 20 },
    voltage: { warningMin: 200, warningMax: 240, criticalMin: 180, criticalMax: 260 },
  };

  const t = thresholds[sensorType] || thresholds.temperature;
  
  if (value < t.criticalMin || value > t.criticalMax) return 'critical';
  if (value < t.warningMin || value > t.warningMax) return 'warning';
  return 'good';
}

async function createAlert(
  db: any,
  deviceId: number,
  sensorType: string,
  value: number,
  threshold: number,
  severity: 'warning' | 'critical',
  message: string
): Promise<SensorAlert> {
  const result = await db.insert(iotAlertHistory).values({
    deviceId,
    sensorType,
    value: value.toString(),
    threshold: threshold.toString(),
    severity,
    message,
    acknowledged: false,
    createdAt: new Date(),
  });

  // Get device name
  const devices = await db
    .select({ name: iotDevices.name })
    .from(iotDevices)
    .where(eq(iotDevices.id, deviceId))
    .limit(1);

  return {
    id: result.insertId || Date.now(),
    deviceId,
    deviceName: devices[0]?.name || `Sensor ${deviceId}`,
    sensorType,
    value,
    threshold,
    severity,
    message,
    acknowledged: false,
    createdAt: new Date(),
  };
}

// Mock data generators
function generateMockSensors(filters?: any): SensorDevice[] {
  const sensorTypes = ['temperature', 'humidity', 'pressure', 'vibration', 'current', 'voltage'];
  const units: Record<string, string> = {
    temperature: '°C',
    humidity: '%',
    pressure: 'hPa',
    vibration: 'mm/s',
    current: 'A',
    voltage: 'V',
  };
  
  const sensors: SensorDevice[] = [];
  
  for (let i = 1; i <= 20; i++) {
    const type = sensorTypes[i % sensorTypes.length];
    const value = generateMockValue(type);
    const quality = getQuality(value, type);
    
    sensors.push({
      id: i,
      name: `Sensor ${type.charAt(0).toUpperCase() + type.slice(1)} ${Math.ceil(i / sensorTypes.length)}`,
      type,
      machineId: Math.ceil(i / 4),
      machineName: `Machine ${Math.ceil(i / 4)}`,
      lineId: Math.ceil(i / 8),
      lineName: `Line ${Math.ceil(i / 8)}`,
      status: Math.random() > 0.1 ? 'online' : (Math.random() > 0.5 ? 'offline' : 'error'),
      lastReading: {
        id: i * 1000,
        deviceId: i,
        sensorType: type,
        value,
        unit: units[type],
        timestamp: new Date(Date.now() - Math.random() * 60000),
        quality,
      },
      alertCount: quality === 'critical' ? Math.floor(Math.random() * 3) + 1 : (quality === 'warning' ? Math.floor(Math.random() * 2) : 0),
    });
  }

  // Apply filters
  let filtered = sensors;
  if (filters?.lineId) {
    filtered = filtered.filter(s => s.lineId === filters.lineId);
  }
  if (filters?.machineId) {
    filtered = filtered.filter(s => s.machineId === filters.machineId);
  }
  if (filters?.sensorType && filters.sensorType !== 'all') {
    filtered = filtered.filter(s => s.type === filters.sensorType);
  }
  if (filters?.status && filters.status !== 'all') {
    filtered = filtered.filter(s => s.status === filters.status);
  }

  return filtered;
}

function generateMockValue(sensorType: string): number {
  const ranges: Record<string, { min: number; max: number }> = {
    temperature: { min: 18, max: 42 },
    humidity: { min: 25, max: 85 },
    pressure: { min: 850, max: 1150 },
    vibration: { min: 0, max: 12 },
    current: { min: 0, max: 22 },
    voltage: { min: 190, max: 250 },
  };
  
  const range = ranges[sensorType] || ranges.temperature;
  return Math.round((range.min + Math.random() * (range.max - range.min)) * 10) / 10;
}

function generateMockReadings(deviceId: number, timeRange: string): SensorReading[] {
  const readings: SensorReading[] = [];
  const sensorTypes = ['temperature', 'humidity', 'pressure', 'vibration', 'current', 'voltage'];
  const type = sensorTypes[deviceId % sensorTypes.length];
  const units: Record<string, string> = {
    temperature: '°C',
    humidity: '%',
    pressure: 'hPa',
    vibration: 'mm/s',
    current: 'A',
    voltage: 'V',
  };

  let points = 60;
  let intervalMs = 60000; // 1 minute

  switch (timeRange) {
    case '1h': points = 60; intervalMs = 60000; break;
    case '6h': points = 72; intervalMs = 300000; break;
    case '24h': points = 96; intervalMs = 900000; break;
    case '7d': points = 168; intervalMs = 3600000; break;
  }

  const now = Date.now();
  let baseValue = generateMockValue(type);

  for (let i = points - 1; i >= 0; i--) {
    // Add some variation
    baseValue += (Math.random() - 0.5) * 2;
    const value = Math.round(baseValue * 10) / 10;
    
    readings.push({
      id: deviceId * 10000 + i,
      deviceId,
      sensorType: type,
      value,
      unit: units[type],
      timestamp: new Date(now - i * intervalMs),
      quality: getQuality(value, type),
    });
  }

  return readings;
}

function generateMockAlerts(filters?: any): SensorAlert[] {
  const alerts: SensorAlert[] = [];
  const sensorTypes = ['temperature', 'humidity', 'pressure', 'vibration'];
  
  for (let i = 1; i <= 8; i++) {
    const severity = i <= 3 ? 'critical' : 'warning';
    const type = sensorTypes[i % sensorTypes.length];
    
    if (filters?.severity && filters.severity !== severity) continue;
    if (filters?.acknowledged !== undefined && filters.acknowledged !== (i > 5)) continue;
    
    alerts.push({
      id: i,
      deviceId: i,
      deviceName: `Sensor ${type.charAt(0).toUpperCase() + type.slice(1)} ${i}`,
      sensorType: type,
      value: type === 'temperature' ? 48 + i : 85 + i,
      threshold: type === 'temperature' ? 45 : 80,
      severity,
      message: `Giá trị ${type} vượt ngưỡng ${severity}`,
      acknowledged: i > 5,
      createdAt: new Date(Date.now() - i * 300000),
    });
  }

  return alerts;
}

export default {
  getAllSensors,
  getSensorReadings,
  getActiveAlerts,
  recordSensorReading,
  acknowledgeAlert,
  getSensorStatistics,
};
