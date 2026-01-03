/**
 * IoT Time-series Database Service
 * In-memory time-series database for IoT sensor data with aggregation support.
 */

import { EventEmitter } from 'events';

export interface TimeseriesPoint {
  timestamp: Date;
  tags: Record<string, string | number>;
  fields: Record<string, number | string | boolean>;
}

export interface SensorReading {
  deviceId: number;
  sensorType: string;
  value: number;
  unit: string;
  quality?: 'good' | 'warning' | 'critical';
  timestamp?: Date;
}

export interface MachineStatus {
  machineId: number;
  status: string;
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  timestamp?: Date;
}

export interface AlertEvent {
  deviceId: number;
  alertType: string;
  alertCode: string;
  message: string;
  value?: number;
  threshold?: number;
  timestamp?: Date;
}

export interface QueryOptions {
  deviceId?: number;
  sensorType?: string;
  machineId?: number;
  alertType?: string;
  startTime: Date;
  endTime: Date;
  aggregation?: 'mean' | 'min' | 'max' | 'sum' | 'count';
  groupByTime?: string;
}

export interface LatencyStats {
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  sampleCount: number;
}

export class IoTTimeseriesService {
  private measurements: Map<string, TimeseriesPoint[]> = new Map();
  private eventEmitter: EventEmitter;
  private maxPointsPerMeasurement: number = 100000;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(50);
    this.measurements.set('sensor_readings', []);
    this.measurements.set('machine_status', []);
    this.measurements.set('alerts', []);
  }

  writeSensorReading(reading: SensorReading): void {
    const point: TimeseriesPoint = {
      timestamp: reading.timestamp || new Date(),
      tags: { deviceId: reading.deviceId, sensorType: reading.sensorType },
      fields: { value: reading.value, unit: reading.unit, quality: reading.quality || 'good' },
    };
    this.writePoint('sensor_readings', point);
  }

  writeSensorReadingsBatch(readings: SensorReading[]): void {
    readings.forEach(r => this.writeSensorReading(r));
  }

  writeMachineStatus(status: MachineStatus): void {
    const point: TimeseriesPoint = {
      timestamp: status.timestamp || new Date(),
      tags: { machineId: status.machineId },
      fields: { status: status.status, oee: status.oee || 0, availability: status.availability || 0, performance: status.performance || 0, quality: status.quality || 0 },
    };
    this.writePoint('machine_status', point);
  }

  writeAlertEvent(alert: AlertEvent): void {
    const point: TimeseriesPoint = {
      timestamp: alert.timestamp || new Date(),
      tags: { deviceId: alert.deviceId, alertType: alert.alertType, alertCode: alert.alertCode },
      fields: { message: alert.message, value: alert.value || 0, threshold: alert.threshold || 0 },
    };
    this.writePoint('alerts', point);
  }

  private writePoint(measurement: string, point: TimeseriesPoint): void {
    const points = this.measurements.get(measurement) || [];
    points.push(point);
    if (points.length > this.maxPointsPerMeasurement) {
      points.shift();
    }
    this.measurements.set(measurement, points);
    this.eventEmitter.emit('point', { measurement, point });
  }

  querySensorReadings(options: QueryOptions): TimeseriesPoint[] {
    const points = this.measurements.get('sensor_readings') || [];
    let filtered = points.filter(p => {
      const ts = new Date(p.timestamp);
      if (ts < options.startTime || ts > options.endTime) return false;
      if (options.deviceId && p.tags.deviceId !== options.deviceId) return false;
      if (options.sensorType && p.tags.sensorType !== options.sensorType) return false;
      return true;
    });

    if (options.aggregation && options.groupByTime) {
      return this.aggregatePoints(filtered, options.aggregation, options.groupByTime);
    }
    return filtered;
  }

  queryMachineStatus(options: QueryOptions): TimeseriesPoint[] {
    const points = this.measurements.get('machine_status') || [];
    return points.filter(p => {
      const ts = new Date(p.timestamp);
      if (ts < options.startTime || ts > options.endTime) return false;
      if (options.machineId && p.tags.machineId !== options.machineId) return false;
      return true;
    });
  }

  queryAlerts(options: QueryOptions): TimeseriesPoint[] {
    const points = this.measurements.get('alerts') || [];
    return points.filter(p => {
      const ts = new Date(p.timestamp);
      if (ts < options.startTime || ts > options.endTime) return false;
      if (options.deviceId && p.tags.deviceId !== options.deviceId) return false;
      if (options.alertType && p.tags.alertType !== options.alertType) return false;
      return true;
    });
  }

  getLatestSensorReading(deviceId: number, sensorType: string): TimeseriesPoint | null {
    const points = this.measurements.get('sensor_readings') || [];
    const filtered = points.filter(p => p.tags.deviceId === deviceId && p.tags.sensorType === sensorType);
    return filtered.length > 0 ? filtered[filtered.length - 1] : null;
  }

  getOeeTrend(options: { machineId: number; startTime: Date; endTime: Date; interval: string }): TimeseriesPoint[] {
    const points = this.queryMachineStatus({ machineId: options.machineId, startTime: options.startTime, endTime: options.endTime });
    return this.aggregatePoints(points, 'mean', options.interval);
  }

  calculateLatencyStats(options: { deviceId: number; startTime: Date; endTime: Date }): LatencyStats {
    const points = this.querySensorReadings({ deviceId: options.deviceId, startTime: options.startTime, endTime: options.endTime });
    if (points.length < 2) {
      return { avgLatencyMs: 0, minLatencyMs: 0, maxLatencyMs: 0, p50LatencyMs: 0, p95LatencyMs: 0, p99LatencyMs: 0, sampleCount: 0 };
    }

    const latencies: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const diff = new Date(points[i].timestamp).getTime() - new Date(points[i - 1].timestamp).getTime();
      latencies.push(diff);
    }
    latencies.sort((a, b) => a - b);

    const sum = latencies.reduce((a, b) => a + b, 0);
    return {
      avgLatencyMs: sum / latencies.length,
      minLatencyMs: latencies[0],
      maxLatencyMs: latencies[latencies.length - 1],
      p50LatencyMs: latencies[Math.floor(latencies.length * 0.5)],
      p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)],
      p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)],
      sampleCount: latencies.length,
    };
  }

  private aggregatePoints(points: TimeseriesPoint[], aggregation: string, interval: string): TimeseriesPoint[] {
    const intervalMs = this.parseInterval(interval);
    const buckets = new Map<number, TimeseriesPoint[]>();

    points.forEach(p => {
      const ts = new Date(p.timestamp).getTime();
      const bucketKey = Math.floor(ts / intervalMs) * intervalMs;
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey)!.push(p);
    });

    const result: TimeseriesPoint[] = [];
    buckets.forEach((bucketPoints, bucketKey) => {
      const values = bucketPoints.map(p => p.fields.value as number).filter(v => typeof v === 'number');
      let aggregatedValue = 0;
      switch (aggregation) {
        case 'mean': aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length; break;
        case 'min': aggregatedValue = Math.min(...values); break;
        case 'max': aggregatedValue = Math.max(...values); break;
        case 'sum': aggregatedValue = values.reduce((a, b) => a + b, 0); break;
        case 'count': aggregatedValue = values.length; break;
      }
      result.push({
        timestamp: new Date(bucketKey),
        tags: bucketPoints[0].tags,
        fields: { ...bucketPoints[0].fields, value: aggregatedValue },
        values: { value: aggregatedValue },
      } as any);
    });

    return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)([smhd])$/);
    if (!match) return 60000;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60000;
      case 'h': return value * 3600000;
      case 'd': return value * 86400000;
      default: return 60000;
    }
  }

  getStats(): { totalPoints: number; measurementCounts: Record<string, number>; memoryUsageMB: number } {
    let totalPoints = 0;
    const measurementCounts: Record<string, number> = {};
    this.measurements.forEach((points, name) => {
      measurementCounts[name] = points.length;
      totalPoints += points.length;
    });
    return { totalPoints, measurementCounts, memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024 };
  }

  on(event: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(event, handler);
  }

  clear(): void {
    this.measurements.forEach((_, key) => this.measurements.set(key, []));
  }
}

let instance: IoTTimeseriesService | null = null;

export function getTimeseriesService(): IoTTimeseriesService {
  if (!instance) instance = new IoTTimeseriesService();
  return instance;
}

export function resetTimeseriesService(): void {
  if (instance) instance.clear();
  instance = null;
}

export default getTimeseriesService;
