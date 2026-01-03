/**
 * Latency Auto-Record Service
 * Tự động ghi nhận latency từ MQTT messages và API calls
 */

import { getDb } from '../db';
import { latencyRecords } from '../../drizzle/schema';

export interface LatencyMetric {
  sourceType: 'mqtt' | 'api' | 'webhook' | 'database' | 'iot_device';
  sourceId: string;
  sourceName?: string;
  latencyMs: number;
  endpoint?: string;
  statusCode?: number;
  isSuccess?: boolean;
  metadata?: Record<string, any>;
}

const latencyBuffer: LatencyMetric[] = [];
const BUFFER_SIZE = 50;
const FLUSH_INTERVAL = 10000;
let flushTimer: NodeJS.Timeout | null = null;
const stats = { totalRecorded: 0, totalFlushed: 0, lastFlushAt: null as Date | null, errors: 0 };

export function startLatencyAutoRecord(): void {
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = setInterval(async () => { await flushBuffer(); }, FLUSH_INTERVAL);
}

export function stopLatencyAutoRecord(): void {
  if (flushTimer) { clearInterval(flushTimer); flushTimer = null; }
  flushBuffer();
}

export function recordLatency(metric: LatencyMetric): void {
  latencyBuffer.push({ ...metric, isSuccess: metric.isSuccess ?? true });
  stats.totalRecorded++;
  if (latencyBuffer.length >= BUFFER_SIZE) flushBuffer();
}

export async function recordLatencyImmediate(metric: LatencyMetric): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const result = await db.insert(latencyRecords).values({
      deviceId: null,
      deviceName: metric.sourceName || metric.sourceId,
      sourceType: mapSourceType(metric.sourceType),
      latencyMs: metric.latencyMs.toFixed(2),
      timestamp: new Date().toISOString(),
      metadata: { sourceType: metric.sourceType, sourceId: metric.sourceId, endpoint: metric.endpoint, statusCode: metric.statusCode, isSuccess: metric.isSuccess, ...metric.metadata },
    });
    stats.totalRecorded++;
    return result.insertId ? Number(result.insertId) : null;
  } catch (error) {
    stats.errors++;
    return null;
  }
}

function mapSourceType(type: string): 'sensor' | 'plc' | 'gateway' | 'server' {
  switch (type) {
    case 'mqtt': case 'iot_device': return 'sensor';
    case 'api': case 'webhook': return 'server';
    case 'database': return 'gateway';
    default: return 'server';
  }
}

async function flushBuffer(): Promise<void> {
  if (latencyBuffer.length === 0) return;
  const toFlush = latencyBuffer.splice(0, latencyBuffer.length);
  try {
    const db = await getDb();
    if (!db) { latencyBuffer.unshift(...toFlush); return; }
    const values = toFlush.map(metric => ({
      deviceId: null,
      deviceName: metric.sourceName || metric.sourceId,
      sourceType: mapSourceType(metric.sourceType),
      latencyMs: metric.latencyMs.toFixed(2),
      timestamp: new Date().toISOString(),
      metadata: { sourceType: metric.sourceType, sourceId: metric.sourceId, endpoint: metric.endpoint, statusCode: metric.statusCode, isSuccess: metric.isSuccess, ...metric.metadata },
    }));
    await db.insert(latencyRecords).values(values);
    stats.totalFlushed += toFlush.length;
    stats.lastFlushAt = new Date();
  } catch (error) {
    stats.errors++;
    latencyBuffer.unshift(...toFlush);
  }
}

export function getLatencyAutoRecordStats(): typeof stats & { bufferSize: number } {
  return { ...stats, bufferSize: latencyBuffer.length };
}

export function recordMqttLatency(params: { topic: string; messageId?: string; latencyMs: number; broker?: string; qos?: number; isSuccess?: boolean; }): void {
  recordLatency({ sourceType: 'mqtt', sourceId: params.topic, sourceName: 'MQTT: ' + params.topic, latencyMs: params.latencyMs, isSuccess: params.isSuccess ?? true, metadata: { messageId: params.messageId, broker: params.broker, qos: params.qos } });
}

export function recordWebhookLatency(params: { webhookId: number | string; webhookName: string; latencyMs: number; statusCode?: number; isSuccess?: boolean; targetUrl?: string; }): void {
  recordLatency({ sourceType: 'webhook', sourceId: String(params.webhookId), sourceName: params.webhookName, latencyMs: params.latencyMs, statusCode: params.statusCode, isSuccess: params.isSuccess ?? (params.statusCode ? params.statusCode < 400 : true), metadata: { targetUrl: params.targetUrl } });
}

export function recordDatabaseLatency(params: { queryType: string; tableName?: string; latencyMs: number; isSuccess?: boolean; rowsAffected?: number; }): void {
  recordLatency({ sourceType: 'database', sourceId: params.tableName || params.queryType, sourceName: 'DB: ' + params.queryType + (params.tableName ? ' on ' + params.tableName : ''), latencyMs: params.latencyMs, isSuccess: params.isSuccess ?? true, metadata: { queryType: params.queryType, tableName: params.tableName, rowsAffected: params.rowsAffected } });
}

export function recordIotDeviceLatency(params: { deviceId: string; deviceName?: string; latencyMs: number; isSuccess?: boolean; protocol?: string; dataSize?: number; }): void {
  recordLatency({ sourceType: 'iot_device', sourceId: params.deviceId, sourceName: params.deviceName || 'Device: ' + params.deviceId, latencyMs: params.latencyMs, isSuccess: params.isSuccess ?? true, metadata: { protocol: params.protocol, dataSize: params.dataSize } });
}

export default { startLatencyAutoRecord, stopLatencyAutoRecord, recordLatency, recordLatencyImmediate, recordMqttLatency, recordWebhookLatency, recordDatabaseLatency, recordIotDeviceLatency, getLatencyAutoRecordStats };
