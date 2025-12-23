/**
 * DatabaseIntegration - Kết nối các services với database
 * Phase 3 - Database Integration
 */

import { db } from '../db';
import {
  slowQueryLogs, batchOperationLogs, memoryLeakReports, errorLogs,
  structuredLogs, securityAuditLogs, iotDeviceData, aiMlPredictions,
  realtimeDataStreams, analyticsCache,
  InsertSlowQueryLog, InsertBatchOperationLog, InsertMemoryLeakReport,
  InsertErrorLog, InsertStructuredLog, InsertSecurityAuditLog,
  InsertIotDeviceData, InsertAiMlPrediction, InsertRealtimeDataStream,
  InsertAnalyticsCache
} from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import crypto from 'crypto';

// ============ Slow Query Logs ============

export async function insertSlowQueryLog(data: Omit<InsertSlowQueryLog, 'id' | 'createdAt'>) {
  const queryHash = crypto.createHash('md5').update(data.queryText).digest('hex');
  return db.insert(slowQueryLogs).values({
    ...data,
    queryHash
  });
}

export async function getSlowQueryLogs(options: {
  limit?: number;
  minExecutionTime?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const { limit = 100, minExecutionTime, startDate, endDate } = options;
  
  let query = db.select().from(slowQueryLogs);
  
  const conditions = [];
  if (minExecutionTime) {
    conditions.push(gte(slowQueryLogs.executionTime, minExecutionTime));
  }
  if (startDate) {
    conditions.push(gte(slowQueryLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(slowQueryLogs.createdAt, endDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(slowQueryLogs.createdAt)).limit(limit);
}

export async function getSlowQueryStats() {
  const result = await db.select({
    totalQueries: sql<number>`COUNT(*)`,
    avgExecutionTime: sql<number>`AVG(execution_time)`,
    maxExecutionTime: sql<number>`MAX(execution_time)`,
    totalRowsExamined: sql<number>`SUM(rows_examined)`
  }).from(slowQueryLogs);
  
  return result[0];
}

// ============ Batch Operation Logs ============

export async function insertBatchOperationLog(data: Omit<InsertBatchOperationLog, 'id' | 'createdAt' | 'updatedAt'>) {
  const operationId = data.operationId || `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  return db.insert(batchOperationLogs).values({
    ...data,
    operationId
  });
}

export async function updateBatchOperationLog(operationId: string, data: Partial<InsertBatchOperationLog>) {
  return db.update(batchOperationLogs)
    .set(data)
    .where(eq(batchOperationLogs.operationId, operationId));
}

export async function getBatchOperationLog(operationId: string) {
  const result = await db.select().from(batchOperationLogs)
    .where(eq(batchOperationLogs.operationId, operationId))
    .limit(1);
  return result[0];
}

export async function getBatchOperationLogs(options: {
  limit?: number;
  status?: string;
  userId?: number;
}) {
  const { limit = 50, status, userId } = options;
  
  let query = db.select().from(batchOperationLogs);
  
  const conditions = [];
  if (status) {
    conditions.push(eq(batchOperationLogs.status, status as any));
  }
  if (userId) {
    conditions.push(eq(batchOperationLogs.userId, userId));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(batchOperationLogs.createdAt)).limit(limit);
}

// ============ Memory Leak Reports ============

export async function insertMemoryLeakReport(data: Omit<InsertMemoryLeakReport, 'id' | 'createdAt'>) {
  const reportId = data.reportId || `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  return db.insert(memoryLeakReports).values({
    ...data,
    reportId
  });
}

export async function getMemoryLeakReports(options: {
  limit?: number;
  leakSuspectedOnly?: boolean;
  startDate?: Date;
}) {
  const { limit = 100, leakSuspectedOnly, startDate } = options;
  
  let query = db.select().from(memoryLeakReports);
  
  const conditions = [];
  if (leakSuspectedOnly) {
    conditions.push(eq(memoryLeakReports.leakSuspected, 1));
  }
  if (startDate) {
    conditions.push(gte(memoryLeakReports.createdAt, startDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(memoryLeakReports.createdAt)).limit(limit);
}

// ============ Error Logs ============

export async function insertErrorLog(data: Omit<InsertErrorLog, 'id' | 'createdAt'>) {
  const errorId = data.errorId || `err_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  return db.insert(errorLogs).values({
    ...data,
    errorId
  });
}

export async function getErrorLogs(options: {
  limit?: number;
  severity?: string;
  isResolved?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
  const { limit = 100, severity, isResolved, startDate, endDate } = options;
  
  let query = db.select().from(errorLogs);
  
  const conditions = [];
  if (severity) {
    conditions.push(eq(errorLogs.severity, severity as any));
  }
  if (isResolved !== undefined) {
    conditions.push(eq(errorLogs.isResolved, isResolved ? 1 : 0));
  }
  if (startDate) {
    conditions.push(gte(errorLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(errorLogs.createdAt, endDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(errorLogs.createdAt)).limit(limit);
}

export async function resolveErrorLog(errorId: string, resolvedBy: number) {
  return db.update(errorLogs)
    .set({
      isResolved: 1,
      resolvedAt: new Date(),
      resolvedBy
    })
    .where(eq(errorLogs.errorId, errorId));
}

export async function getErrorStats() {
  const result = await db.select({
    totalErrors: sql<number>`COUNT(*)`,
    unresolvedErrors: sql<number>`SUM(CASE WHEN is_resolved = 0 THEN 1 ELSE 0 END)`,
    criticalErrors: sql<number>`SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END)`,
    highErrors: sql<number>`SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END)`
  }).from(errorLogs);
  
  return result[0];
}

// ============ Structured Logs ============

export async function insertStructuredLog(data: Omit<InsertStructuredLog, 'id' | 'createdAt'>) {
  const logId = data.logId || `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  return db.insert(structuredLogs).values({
    ...data,
    logId
  });
}

export async function getStructuredLogs(options: {
  limit?: number;
  level?: string;
  category?: string;
  service?: string;
  traceId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { limit = 100, level, category, service, traceId, startDate, endDate } = options;
  
  let query = db.select().from(structuredLogs);
  
  const conditions = [];
  if (level) {
    conditions.push(eq(structuredLogs.level, level as any));
  }
  if (category) {
    conditions.push(eq(structuredLogs.category, category));
  }
  if (service) {
    conditions.push(eq(structuredLogs.service, service));
  }
  if (traceId) {
    conditions.push(eq(structuredLogs.traceId, traceId));
  }
  if (startDate) {
    conditions.push(gte(structuredLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(structuredLogs.createdAt, endDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(structuredLogs.createdAt)).limit(limit);
}

// ============ Security Audit Logs ============

export async function insertSecurityAuditLog(data: Omit<InsertSecurityAuditLog, 'id' | 'createdAt'>) {
  const eventId = data.eventId || `sec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  return db.insert(securityAuditLogs).values({
    ...data,
    eventId
  });
}

export async function getSecurityAuditLogs(options: {
  limit?: number;
  eventCategory?: string;
  severity?: string;
  outcome?: string;
  userId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const { limit = 100, eventCategory, severity, outcome, userId, startDate, endDate } = options;
  
  let query = db.select().from(securityAuditLogs);
  
  const conditions = [];
  if (eventCategory) {
    conditions.push(eq(securityAuditLogs.eventCategory, eventCategory as any));
  }
  if (severity) {
    conditions.push(eq(securityAuditLogs.severity, severity as any));
  }
  if (outcome) {
    conditions.push(eq(securityAuditLogs.outcome, outcome as any));
  }
  if (userId) {
    conditions.push(eq(securityAuditLogs.userId, userId));
  }
  if (startDate) {
    conditions.push(gte(securityAuditLogs.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(securityAuditLogs.createdAt, endDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(securityAuditLogs.createdAt)).limit(limit);
}

export async function getSecurityStats() {
  const result = await db.select({
    totalEvents: sql<number>`COUNT(*)`,
    failedAttempts: sql<number>`SUM(CASE WHEN outcome = 'failure' THEN 1 ELSE 0 END)`,
    blockedAttempts: sql<number>`SUM(CASE WHEN outcome = 'blocked' THEN 1 ELSE 0 END)`,
    criticalEvents: sql<number>`SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END)`,
    avgRiskScore: sql<number>`AVG(risk_score)`
  }).from(securityAuditLogs);
  
  return result[0];
}

// ============ IoT Device Data ============

export async function upsertIotDeviceData(data: Omit<InsertIotDeviceData, 'id' | 'createdAt' | 'updatedAt'>) {
  // Check if device exists
  const existing = await db.select().from(iotDeviceData)
    .where(eq(iotDeviceData.deviceId, data.deviceId))
    .limit(1);
  
  if (existing.length > 0) {
    return db.update(iotDeviceData)
      .set({
        ...data,
        lastSeen: new Date()
      })
      .where(eq(iotDeviceData.deviceId, data.deviceId));
  } else {
    return db.insert(iotDeviceData).values({
      ...data,
      lastSeen: new Date()
    });
  }
}

export async function getIotDevices(options: {
  limit?: number;
  status?: string;
  deviceType?: string;
}) {
  const { limit = 100, status, deviceType } = options;
  
  let query = db.select().from(iotDeviceData);
  
  const conditions = [];
  if (status) {
    conditions.push(eq(iotDeviceData.status, status as any));
  }
  if (deviceType) {
    conditions.push(eq(iotDeviceData.deviceType, deviceType));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(iotDeviceData.updatedAt)).limit(limit);
}

export async function getIotDeviceById(deviceId: string) {
  const result = await db.select().from(iotDeviceData)
    .where(eq(iotDeviceData.deviceId, deviceId))
    .limit(1);
  return result[0];
}

export async function getIotDeviceStats() {
  const result = await db.select({
    totalDevices: sql<number>`COUNT(*)`,
    onlineDevices: sql<number>`SUM(CASE WHEN status = 'online' THEN 1 ELSE 0 END)`,
    offlineDevices: sql<number>`SUM(CASE WHEN status = 'offline' THEN 1 ELSE 0 END)`,
    errorDevices: sql<number>`SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END)`,
    avgTemperature: sql<number>`AVG(temperature)`,
    avgHumidity: sql<number>`AVG(humidity)`
  }).from(iotDeviceData);
  
  return result[0];
}

// ============ AI/ML Predictions ============

export async function insertAiMlPrediction(data: Omit<InsertAiMlPrediction, 'id' | 'createdAt'>) {
  const predictionId = data.predictionId || `pred_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  return db.insert(aiMlPredictions).values({
    ...data,
    predictionId
  });
}

export async function getAiMlPredictions(options: {
  limit?: number;
  modelId?: string;
  predictionType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const { limit = 100, modelId, predictionType, startDate, endDate } = options;
  
  let query = db.select().from(aiMlPredictions);
  
  const conditions = [];
  if (modelId) {
    conditions.push(eq(aiMlPredictions.modelId, modelId));
  }
  if (predictionType) {
    conditions.push(eq(aiMlPredictions.predictionType, predictionType));
  }
  if (startDate) {
    conditions.push(gte(aiMlPredictions.createdAt, startDate));
  }
  if (endDate) {
    conditions.push(lte(aiMlPredictions.createdAt, endDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(aiMlPredictions.createdAt)).limit(limit);
}

export async function getAiMlPredictionStats(modelId?: string) {
  let query = db.select({
    totalPredictions: sql<number>`COUNT(*)`,
    avgConfidence: sql<number>`AVG(confidence)`,
    avgLatency: sql<number>`AVG(latency)`,
    correctPredictions: sql<number>`SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END)`,
    avgError: sql<number>`AVG(ABS(error))`
  }).from(aiMlPredictions);
  
  if (modelId) {
    query = query.where(eq(aiMlPredictions.modelId, modelId)) as any;
  }
  
  const result = await query;
  return result[0];
}

// ============ Realtime Data Streams ============

export async function upsertRealtimeDataStream(data: Omit<InsertRealtimeDataStream, 'id' | 'createdAt' | 'updatedAt'>) {
  const existing = await db.select().from(realtimeDataStreams)
    .where(eq(realtimeDataStreams.streamId, data.streamId))
    .limit(1);
  
  if (existing.length > 0) {
    return db.update(realtimeDataStreams)
      .set(data)
      .where(eq(realtimeDataStreams.streamId, data.streamId));
  } else {
    return db.insert(realtimeDataStreams).values(data);
  }
}

export async function getRealtimeDataStreams(options: {
  limit?: number;
  streamType?: string;
  isActive?: boolean;
}) {
  const { limit = 100, streamType, isActive } = options;
  
  let query = db.select().from(realtimeDataStreams);
  
  const conditions = [];
  if (streamType) {
    conditions.push(eq(realtimeDataStreams.streamType, streamType as any));
  }
  if (isActive !== undefined) {
    conditions.push(eq(realtimeDataStreams.isActive, isActive ? 1 : 0));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query.orderBy(desc(realtimeDataStreams.updatedAt)).limit(limit);
}

export async function updateStreamActivity(streamId: string, isActive: boolean, subscriberCount?: number) {
  const updateData: any = {
    isActive: isActive ? 1 : 0,
    lastDataAt: new Date()
  };
  
  if (subscriberCount !== undefined) {
    updateData.subscriberCount = subscriberCount;
  }
  
  return db.update(realtimeDataStreams)
    .set(updateData)
    .where(eq(realtimeDataStreams.streamId, streamId));
}

// ============ Analytics Cache ============

export async function setAnalyticsCache(key: string, data: any, ttlSeconds: number, cacheType: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  
  const existing = await db.select().from(analyticsCache)
    .where(eq(analyticsCache.cacheKey, key))
    .limit(1);
  
  if (existing.length > 0) {
    return db.update(analyticsCache)
      .set({
        data: JSON.stringify(data),
        computedAt: now,
        expiresAt,
        hitCount: 0
      })
      .where(eq(analyticsCache.cacheKey, key));
  } else {
    return db.insert(analyticsCache).values({
      cacheKey: key,
      cacheType,
      data: JSON.stringify(data),
      computedAt: now,
      expiresAt
    });
  }
}

export async function getAnalyticsCache(key: string) {
  const result = await db.select().from(analyticsCache)
    .where(eq(analyticsCache.cacheKey, key))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const cache = result[0];
  
  // Check if expired
  if (new Date() > cache.expiresAt) {
    await db.delete(analyticsCache).where(eq(analyticsCache.cacheKey, key));
    return null;
  }
  
  // Update hit count
  await db.update(analyticsCache)
    .set({
      hitCount: sql`hit_count + 1`,
      lastAccessedAt: new Date()
    })
    .where(eq(analyticsCache.cacheKey, key));
  
  return {
    ...cache,
    data: JSON.parse(cache.data)
  };
}

export async function deleteAnalyticsCache(key: string) {
  return db.delete(analyticsCache).where(eq(analyticsCache.cacheKey, key));
}

export async function clearExpiredCache() {
  return db.delete(analyticsCache).where(lte(analyticsCache.expiresAt, new Date()));
}

export async function getCacheStats() {
  const result = await db.select({
    totalEntries: sql<number>`COUNT(*)`,
    totalHits: sql<number>`SUM(hit_count)`,
    avgHitCount: sql<number>`AVG(hit_count)`,
    expiredEntries: sql<number>`SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END)`
  }).from(analyticsCache);
  
  return result[0];
}
