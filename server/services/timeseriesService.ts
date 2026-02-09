/**
 * Timeseries Service
 * Quản lý dữ liệu time-series cho IoT sensors
 */

import { getDb } from "../db";

// Types
export interface TimeseriesDataPoint {
  timestamp: number;
  value: number;
  quality?: 'good' | 'uncertain' | 'bad';
}

export interface HourlyAggregate {
  timeBucket: number;
  minValue: number;
  maxValue: number;
  avgValue: number;
  sumValue: number;
  sampleCount: number;
  stdDev?: number;
}

export interface DailyAggregate extends HourlyAggregate {
  uptimePercent?: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

export interface DeviceStatistics {
  deviceId: number;
  totalSamples: number;
  minValue: number;
  maxValue: number;
  avgValue: number;
  stdDev: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

// Insert single data point
export async function insertTimeseriesData(
  deviceId: number,
  value: number,
  timestamp?: number,
  options?: {
    gatewayId?: number;
    sensorType?: string;
    unit?: string;
    quality?: 'good' | 'uncertain' | 'bad';
    sourceType?: 'edge' | 'direct' | 'import';
    sourceId?: string;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const ts = timestamp ?? Date.now();
  const timeBucket = Math.floor(ts / 3600000) * 3600000; // Hour bucket
  
  try {
    await db.execute(
      `INSERT INTO sensor_data_ts (device_id, gateway_id, timestamp, time_bucket, value, sensor_type, unit, quality, source_type, source_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [deviceId, options?.gatewayId, ts, timeBucket, value, options?.sensorType, options?.unit, options?.quality ?? 'good', options?.sourceType ?? 'direct', options?.sourceId]
    );
    return true;
  } catch (error) {
    console.error('[Timeseries] Error inserting data:', error);
    return false;
  }
}

// Insert batch data points
export async function insertBatchTimeseriesData(
  data: Array<{
    deviceId: number;
    timestamp: number;
    value: number;
    gatewayId?: number;
    quality?: 'good' | 'uncertain' | 'bad';
  }>
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  let inserted = 0;
  
  try {
    for (const item of data) {
      const timeBucket = Math.floor(item.timestamp / 3600000) * 3600000;
      await db.execute(
        `INSERT INTO sensor_data_ts (device_id, gateway_id, timestamp, time_bucket, value, quality, source_type) VALUES (?, ?, ?, ?, ?, ?, 'edge')`,
        [item.deviceId, item.gatewayId, item.timestamp, timeBucket, item.value, item.quality ?? 'good']
      );
      inserted++;
    }
    return inserted;
  } catch (error) {
    console.error('[Timeseries] Error batch inserting:', error);
    return inserted;
  }
}

// Query time-series data
export async function queryTimeseriesData(
  deviceId: number,
  startTime: number,
  endTime: number,
  limit: number = 1000
): Promise<TimeseriesDataPoint[]> {
  const db = await getDb();
  
  if (!db) return [];
  
  try {
    const results = await db.execute(
      `SELECT timestamp, value, quality FROM sensor_data_ts WHERE device_id = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC LIMIT ?`,
      [deviceId, startTime, endTime, limit]
    );
    
    if (!results || (results as any[]).length === 0) {
      return [];
    }
    
    return (results as any[]).map((r: any) => ({
      timestamp: r.timestamp,
      value: parseFloat(r.value),
      quality: r.quality,
    }));
  } catch (error) {
    console.error('[Timeseries] Error querying data:', error);
    return [];
  }
}

// Get hourly aggregates
export async function getHourlyAggregates(
  deviceId: number,
  startTime: number,
  endTime: number
): Promise<HourlyAggregate[]> {
  const db = await getDb();
  
  if (!db) return [];
  
  try {
    const results = await db.execute(
      `SELECT hour_bucket, min_value, max_value, avg_value, sum_value, sample_count, std_dev FROM sensor_data_hourly WHERE device_id = ? AND hour_bucket >= ? AND hour_bucket <= ? ORDER BY hour_bucket ASC`,
      [deviceId, startTime, endTime]
    );
    
    if (!results || (results as any[]).length === 0) {
      return [];
    }
    
    return (results as any[]).map((r: any) => ({
      timeBucket: r.hour_bucket,
      minValue: parseFloat(r.min_value),
      maxValue: parseFloat(r.max_value),
      avgValue: parseFloat(r.avg_value),
      sumValue: parseFloat(r.sum_value),
      sampleCount: r.sample_count,
      stdDev: r.std_dev ? parseFloat(r.std_dev) : undefined,
    }));
  } catch (error) {
    console.error('[Timeseries] Error getting hourly aggregates:', error);
    return [];
  }
}

// Get daily aggregates
export async function getDailyAggregates(
  deviceId: number,
  startTime: number,
  endTime: number
): Promise<DailyAggregate[]> {
  const db = await getDb();
  
  if (!db) return [];
  
  try {
    const results = await db.execute(
      `SELECT day_bucket, min_value, max_value, avg_value, sum_value, sample_count, std_dev, uptime_percent, p50, p95, p99 FROM sensor_data_daily WHERE device_id = ? AND day_bucket >= ? AND day_bucket <= ? ORDER BY day_bucket ASC`,
      [deviceId, startTime, endTime]
    );
    
    if (!results || (results as any[]).length === 0) {
      return [];
    }
    
    return (results as any[]).map((r: any) => ({
      timeBucket: r.day_bucket,
      minValue: parseFloat(r.min_value),
      maxValue: parseFloat(r.max_value),
      avgValue: parseFloat(r.avg_value),
      sumValue: parseFloat(r.sum_value),
      sampleCount: r.sample_count,
      stdDev: r.std_dev ? parseFloat(r.std_dev) : undefined,
      uptimePercent: r.uptime_percent ? parseFloat(r.uptime_percent) : undefined,
      p50: r.p50 ? parseFloat(r.p50) : undefined,
      p95: r.p95 ? parseFloat(r.p95) : undefined,
      p99: r.p99 ? parseFloat(r.p99) : undefined,
    }));
  } catch (error) {
    console.error('[Timeseries] Error getting daily aggregates:', error);
    return [];
  }
}

// Get device statistics
export async function getDeviceStatistics(
  deviceId: number,
  timeRange: '1h' | '24h' | '7d' | '30d' = '24h'
): Promise<DeviceStatistics> {
  const now = Date.now();
  const rangeMs = {
    '1h': 3600000,
    '24h': 86400000,
    '7d': 604800000,
    '30d': 2592000000,
  }[timeRange];
  
  const startTime = now - rangeMs;
  
  const emptyStats: DeviceStatistics = {
    deviceId,
    totalSamples: 0,
    minValue: 0,
    maxValue: 0,
    avgValue: 0,
    stdDev: 0,
    firstTimestamp: startTime,
    lastTimestamp: now,
  };
  
  const db = await getDb();
  if (!db) return emptyStats;
  
  try {
    const results = await db.execute(
      `SELECT COUNT(*) as total, MIN(value) as min_val, MAX(value) as max_val, AVG(value) as avg_val, STDDEV(value) as std_dev, MIN(timestamp) as first_ts, MAX(timestamp) as last_ts FROM sensor_data_ts WHERE device_id = ? AND timestamp >= ?`,
      [deviceId, startTime]
    );
    
    if (!results || (results as any[]).length === 0 || !(results as any[])[0].total) {
      return emptyStats;
    }
    
    const r = (results as any[])[0];
    return {
      deviceId,
      totalSamples: r.total,
      minValue: parseFloat(r.min_val),
      maxValue: parseFloat(r.max_val),
      avgValue: parseFloat(r.avg_val),
      stdDev: r.std_dev ? parseFloat(r.std_dev) : 0,
      firstTimestamp: r.first_ts,
      lastTimestamp: r.last_ts,
    };
  } catch (error) {
    console.error('[Timeseries] Error getting statistics:', error);
    return emptyStats;
  }
}

// Get downsampled data for visualization
export async function getDownsampledData(
  deviceId: number,
  startTime: number,
  endTime: number,
  targetPoints: number = 100
): Promise<TimeseriesDataPoint[]> {
  const duration = endTime - startTime;
  const bucketSize = Math.ceil(duration / targetPoints);
  
  const db = await getDb();
  
  if (!db) return [];
  
  try {
    // Use time buckets for downsampling
    const results = await db.execute(
      `SELECT FLOOR(timestamp / ?) * ? as bucket, AVG(value) as avg_value FROM sensor_data_ts WHERE device_id = ? AND timestamp >= ? AND timestamp <= ? GROUP BY bucket ORDER BY bucket ASC`,
      [bucketSize, bucketSize, deviceId, startTime, endTime]
    );
    
    if (!results || (results as any[]).length === 0) {
      return [];
    }
    
    return (results as any[]).map((r: any) => ({
      timestamp: r.bucket,
      value: parseFloat(r.avg_value),
      quality: 'good' as const,
    }));
  } catch (error) {
    console.error('[Timeseries] Error getting downsampled data:', error);
    return [];
  }
}

// Compute hourly aggregates for a specific hour
export async function computeHourlyAggregates(
  deviceId: number,
  hourBucket: number
): Promise<HourlyAggregate | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const results = await db.execute(
      `SELECT MIN(value) as min_val, MAX(value) as max_val, AVG(value) as avg_val, SUM(value) as sum_val, COUNT(*) as cnt, STDDEV(value) as std_dev, SUM(CASE WHEN quality = 'good' THEN 1 ELSE 0 END) as good_cnt, SUM(CASE WHEN quality = 'bad' THEN 1 ELSE 0 END) as bad_cnt FROM sensor_data_ts WHERE device_id = ? AND time_bucket = ?`,
      [deviceId, hourBucket]
    );
    
    if (!results || (results as any[]).length === 0 || !(results as any[])[0].cnt) {
      return null;
    }
    
    const r = (results as any[])[0];
    
    // Upsert hourly aggregate
    await db.execute(
      `INSERT INTO sensor_data_hourly (device_id, hour_bucket, min_value, max_value, avg_value, sum_value, sample_count, std_dev, good_count, bad_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE min_value = VALUES(min_value), max_value = VALUES(max_value), avg_value = VALUES(avg_value), sum_value = VALUES(sum_value), sample_count = VALUES(sample_count), std_dev = VALUES(std_dev), good_count = VALUES(good_count), bad_count = VALUES(bad_count)`,
      [deviceId, hourBucket, r.min_val, r.max_val, r.avg_val, r.sum_val, r.cnt, r.std_dev, r.good_cnt, r.bad_cnt]
    );
    
    return {
      timeBucket: hourBucket,
      minValue: parseFloat(r.min_val),
      maxValue: parseFloat(r.max_val),
      avgValue: parseFloat(r.avg_val),
      sumValue: parseFloat(r.sum_val),
      sampleCount: r.cnt,
      stdDev: r.std_dev ? parseFloat(r.std_dev) : undefined,
    };
  } catch (error) {
    console.error('[Timeseries] Error computing hourly aggregates:', error);
    return null;
  }
}

// Compute daily aggregates
export async function computeDailyAggregates(
  deviceId: number,
  dayBucket: number
): Promise<DailyAggregate | null> {
  const db = await getDb();
  if (!db) return null;
  
  try {
    const results = await db.execute(
      `SELECT MIN(min_value) as min_val, MAX(max_value) as max_val, AVG(avg_value) as avg_val, SUM(sum_value) as sum_val, SUM(sample_count) as cnt, AVG(std_dev) as std_dev, SUM(good_count) as good_cnt, SUM(bad_count) as bad_cnt FROM sensor_data_hourly WHERE device_id = ? AND hour_bucket >= ? AND hour_bucket < ?`,
      [deviceId, dayBucket, dayBucket + 86400000]
    );
    
    if (!results || (results as any[]).length === 0 || !(results as any[])[0].cnt) {
      return null;
    }
    
    const r = (results as any[])[0];
    
    // Upsert daily aggregate
    await db.execute(
      `INSERT INTO sensor_data_daily (device_id, day_bucket, min_value, max_value, avg_value, sum_value, sample_count, std_dev, good_count, bad_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE min_value = VALUES(min_value), max_value = VALUES(max_value), avg_value = VALUES(avg_value), sum_value = VALUES(sum_value), sample_count = VALUES(sample_count), std_dev = VALUES(std_dev), good_count = VALUES(good_count), bad_count = VALUES(bad_count)`,
      [deviceId, dayBucket, r.min_val, r.max_val, r.avg_val, r.sum_val, r.cnt, r.std_dev, r.good_cnt, r.bad_cnt]
    );
    
    return {
      timeBucket: dayBucket,
      minValue: parseFloat(r.min_val),
      maxValue: parseFloat(r.max_val),
      avgValue: parseFloat(r.avg_val),
      sumValue: parseFloat(r.sum_val),
      sampleCount: r.cnt,
      stdDev: r.std_dev ? parseFloat(r.std_dev) : undefined,
    };
  } catch (error) {
    console.error('[Timeseries] Error computing daily aggregates:', error);
    return null;
  }
}
