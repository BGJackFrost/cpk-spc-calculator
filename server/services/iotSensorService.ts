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
  const db = await getDb();
  if (!db) return [];

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
      return [];
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
    return [];
  }
}

// Get sensor readings history
export async function getSensorReadings(
  deviceId: number,
  timeRange: '1h' | '6h' | '24h' | '7d' = '1h'
): Promise<SensorReading[]> {
  const db = await getDb();
  
  const now = new Date();
  const startTime = new Date();
  
  switch (timeRange) {
    case '1h': startTime.setHours(now.getHours() - 1); break;
    case '6h': startTime.setHours(now.getHours() - 6); break;
    case '24h': startTime.setDate(now.getDate() - 1); break;
    case '7d': startTime.setDate(now.getDate() - 7); break;
  }

  if (!db) return [];

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
      return [];
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
    return [];
  }
}

// Get active alerts
export async function getActiveAlerts(filters?: {
  severity?: 'warning' | 'critical';
  acknowledged?: boolean;
}): Promise<SensorAlert[]> {
  const db = await getDb();
  
  if (!db) return [];

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
      return [];
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
    return [];
  }
}

// Record new sensor reading
export async function recordSensorReading(
  deviceId: number,
  sensorType: string,
  value: number,
  unit: string
): Promise<{ reading: SensorReading; alert?: SensorAlert }> {
  const db = await getDb();
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
  const db = await getDb();
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


export default {
  getAllSensors,
  getSensorReadings,
  getActiveAlerts,
  recordSensorReading,
  acknowledgeAlert,
  getSensorStatistics,
};
