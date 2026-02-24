/**
 * Performance Alert Service
 * 
 * Monitors system performance metrics and triggers alerts
 * when thresholds are exceeded.
 */

import { getDb } from '../db';
import { sql, eq, desc, and, gte, lte } from 'drizzle-orm';

// Alert rule types
export type AlertRuleType = 
  | 'slow_query_threshold'
  | 'pool_utilization'
  | 'pool_queue_length'
  | 'error_rate'
  | 'cache_hit_rate'
  | 'memory_usage';

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical';

// Alert rule interface
export interface PerformanceAlertRule {
  id?: number;
  name: string;
  type: AlertRuleType;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  cooldownMinutes: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Alert record interface
export interface PerformanceAlert {
  id?: number;
  ruleId: number;
  ruleName: string;
  type: AlertRuleType;
  severity: AlertSeverity;
  message: string;
  currentValue: number;
  threshold: number;
  metadata?: Record<string, any>;
  acknowledgedAt?: Date;
  acknowledgedBy?: number;
  createdAt?: Date;
}

// In-memory storage for rules and alerts (for demo purposes)
// In production, these would be stored in database tables
let alertRules: PerformanceAlertRule[] = [
  {
    id: 1,
    name: 'Slow Query Alert',
    type: 'slow_query_threshold',
    threshold: 1000, // 1 second
    severity: 'warning',
    enabled: true,
    notifyEmail: true,
    notifyWebhook: false,
    cooldownMinutes: 5,
    description: 'Alert when queries take longer than threshold',
  },
  {
    id: 2,
    name: 'Critical Slow Query',
    type: 'slow_query_threshold',
    threshold: 5000, // 5 seconds
    severity: 'critical',
    enabled: true,
    notifyEmail: true,
    notifyWebhook: true,
    cooldownMinutes: 1,
    description: 'Critical alert for very slow queries',
  },
  {
    id: 3,
    name: 'Pool High Utilization',
    type: 'pool_utilization',
    threshold: 80, // 80%
    severity: 'warning',
    enabled: true,
    notifyEmail: true,
    notifyWebhook: false,
    cooldownMinutes: 10,
    description: 'Alert when connection pool utilization exceeds threshold',
  },
  {
    id: 4,
    name: 'Pool Critical Utilization',
    type: 'pool_utilization',
    threshold: 95, // 95%
    severity: 'critical',
    enabled: true,
    notifyEmail: true,
    notifyWebhook: true,
    cooldownMinutes: 2,
    description: 'Critical alert when pool is nearly exhausted',
  },
  {
    id: 5,
    name: 'Pool Queue Warning',
    type: 'pool_queue_length',
    threshold: 10,
    severity: 'warning',
    enabled: true,
    notifyEmail: false,
    notifyWebhook: false,
    cooldownMinutes: 5,
    description: 'Alert when connection queue grows',
  },
  {
    id: 6,
    name: 'Low Cache Hit Rate',
    type: 'cache_hit_rate',
    threshold: 50, // Below 50%
    severity: 'info',
    enabled: true,
    notifyEmail: false,
    notifyWebhook: false,
    cooldownMinutes: 30,
    description: 'Alert when cache hit rate drops below threshold',
  },
];

let alerts: PerformanceAlert[] = [];
let alertIdCounter = 1;
let ruleIdCounter = alertRules.length + 1;

// Track last alert time per rule for cooldown
const lastAlertTime: Map<number, number> = new Map();

/**
 * Get all alert rules
 */
export function getAlertRules(): PerformanceAlertRule[] {
  return alertRules;
}

/**
 * Get alert rule by ID
 */
export function getAlertRuleById(id: number): PerformanceAlertRule | undefined {
  return alertRules.find(r => r.id === id);
}

/**
 * Create a new alert rule
 */
export function createAlertRule(rule: Omit<PerformanceAlertRule, 'id' | 'createdAt' | 'updatedAt'>): PerformanceAlertRule {
  const newRule: PerformanceAlertRule = {
    ...rule,
    id: ruleIdCounter++,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  alertRules.push(newRule);
  return newRule;
}

/**
 * Update an alert rule
 */
export function updateAlertRule(id: number, updates: Partial<PerformanceAlertRule>): PerformanceAlertRule | null {
  const index = alertRules.findIndex(r => r.id === id);
  if (index === -1) return null;
  
  alertRules[index] = {
    ...alertRules[index],
    ...updates,
    updatedAt: new Date(),
  };
  return alertRules[index];
}

/**
 * Delete an alert rule
 */
export function deleteAlertRule(id: number): boolean {
  const index = alertRules.findIndex(r => r.id === id);
  if (index === -1) return false;
  alertRules.splice(index, 1);
  return true;
}

/**
 * Toggle alert rule enabled status
 */
export function toggleAlertRule(id: number, enabled: boolean): boolean {
  const rule = alertRules.find(r => r.id === id);
  if (!rule) return false;
  rule.enabled = enabled;
  rule.updatedAt = new Date();
  return true;
}

/**
 * Get all alerts with optional filters
 */
export function getAlerts(options?: {
  severity?: AlertSeverity;
  type?: AlertRuleType;
  startDate?: Date;
  endDate?: Date;
  acknowledged?: boolean;
  limit?: number;
}): PerformanceAlert[] {
  let filtered = [...alerts];
  
  if (options?.severity) {
    filtered = filtered.filter(a => a.severity === options.severity);
  }
  if (options?.type) {
    filtered = filtered.filter(a => a.type === options.type);
  }
  if (options?.startDate) {
    filtered = filtered.filter(a => a.createdAt && a.createdAt >= options.startDate!);
  }
  if (options?.endDate) {
    filtered = filtered.filter(a => a.createdAt && a.createdAt <= options.endDate!);
  }
  if (options?.acknowledged !== undefined) {
    filtered = filtered.filter(a => 
      options.acknowledged ? a.acknowledgedAt !== undefined : a.acknowledgedAt === undefined
    );
  }
  
  // Sort by createdAt descending
  filtered.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit);
  }
  
  return filtered;
}

/**
 * Get alert statistics
 */
export function getAlertStats(): {
  total: number;
  byType: Record<AlertRuleType, number>;
  bySeverity: Record<AlertSeverity, number>;
  unacknowledged: number;
  last24Hours: number;
  last7Days: number;
} {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const byType: Record<AlertRuleType, number> = {
    slow_query_threshold: 0,
    pool_utilization: 0,
    pool_queue_length: 0,
    error_rate: 0,
    cache_hit_rate: 0,
    memory_usage: 0,
  };
  
  const bySeverity: Record<AlertSeverity, number> = {
    info: 0,
    warning: 0,
    critical: 0,
  };
  
  let unacknowledged = 0;
  let last24Hours = 0;
  let last7Days = 0;
  
  for (const alert of alerts) {
    byType[alert.type]++;
    bySeverity[alert.severity]++;
    
    if (!alert.acknowledgedAt) unacknowledged++;
    if (alert.createdAt && alert.createdAt >= oneDayAgo) last24Hours++;
    if (alert.createdAt && alert.createdAt >= sevenDaysAgo) last7Days++;
  }
  
  return {
    total: alerts.length,
    byType,
    bySeverity,
    unacknowledged,
    last24Hours,
    last7Days,
  };
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: number, userId: number): boolean {
  const alert = alerts.find(a => a.id === alertId);
  if (!alert) return false;
  
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = userId;
  return true;
}

/**
 * Acknowledge multiple alerts
 */
export function acknowledgeAlerts(alertIds: number[], userId: number): number {
  let count = 0;
  for (const id of alertIds) {
    if (acknowledgeAlert(id, userId)) count++;
  }
  return count;
}

/**
 * Check if alert should be triggered (respecting cooldown)
 */
function shouldTriggerAlert(rule: PerformanceAlertRule): boolean {
  if (!rule.enabled || !rule.id) return false;
  
  const lastTime = lastAlertTime.get(rule.id);
  if (!lastTime) return true;
  
  const cooldownMs = rule.cooldownMinutes * 60 * 1000;
  return Date.now() - lastTime >= cooldownMs;
}

/**
 * Create an alert
 */
function createAlert(
  rule: PerformanceAlertRule,
  currentValue: number,
  message: string,
  metadata?: Record<string, any>
): PerformanceAlert {
  const alert: PerformanceAlert = {
    id: alertIdCounter++,
    ruleId: rule.id!,
    ruleName: rule.name,
    type: rule.type,
    severity: rule.severity,
    message,
    currentValue,
    threshold: rule.threshold,
    metadata,
    createdAt: new Date(),
  };
  
  alerts.push(alert);
  lastAlertTime.set(rule.id!, Date.now());
  
  // Keep only last 1000 alerts
  if (alerts.length > 1000) {
    alerts = alerts.slice(-1000);
  }
  
  return alert;
}

/**
 * Check slow query threshold
 */
export function checkSlowQueryThreshold(queryTime: number, queryText?: string): PerformanceAlert[] {
  const triggeredAlerts: PerformanceAlert[] = [];
  
  const rules = alertRules.filter(r => r.type === 'slow_query_threshold' && r.enabled);
  
  for (const rule of rules) {
    if (queryTime > rule.threshold && shouldTriggerAlert(rule)) {
      const alert = createAlert(
        rule,
        queryTime,
        `Query took ${queryTime}ms (threshold: ${rule.threshold}ms)`,
        { queryText: queryText?.substring(0, 500) }
      );
      triggeredAlerts.push(alert);
    }
  }
  
  return triggeredAlerts;
}

/**
 * Check pool utilization
 */
export function checkPoolUtilization(utilization: number, poolStats?: Record<string, any>): PerformanceAlert[] {
  const triggeredAlerts: PerformanceAlert[] = [];
  
  const rules = alertRules.filter(r => r.type === 'pool_utilization' && r.enabled);
  
  for (const rule of rules) {
    if (utilization > rule.threshold && shouldTriggerAlert(rule)) {
      const alert = createAlert(
        rule,
        utilization,
        `Connection pool utilization at ${utilization.toFixed(1)}% (threshold: ${rule.threshold}%)`,
        poolStats
      );
      triggeredAlerts.push(alert);
    }
  }
  
  return triggeredAlerts;
}

/**
 * Check pool queue length
 */
export function checkPoolQueueLength(queueLength: number): PerformanceAlert[] {
  const triggeredAlerts: PerformanceAlert[] = [];
  
  const rules = alertRules.filter(r => r.type === 'pool_queue_length' && r.enabled);
  
  for (const rule of rules) {
    if (queueLength > rule.threshold && shouldTriggerAlert(rule)) {
      const alert = createAlert(
        rule,
        queueLength,
        `Connection pool queue length is ${queueLength} (threshold: ${rule.threshold})`,
        { queueLength }
      );
      triggeredAlerts.push(alert);
    }
  }
  
  return triggeredAlerts;
}

/**
 * Check cache hit rate (alerts when BELOW threshold)
 */
export function checkCacheHitRate(hitRate: number): PerformanceAlert[] {
  const triggeredAlerts: PerformanceAlert[] = [];
  
  const rules = alertRules.filter(r => r.type === 'cache_hit_rate' && r.enabled);
  
  for (const rule of rules) {
    // For cache hit rate, we alert when it's BELOW threshold
    if (hitRate < rule.threshold && shouldTriggerAlert(rule)) {
      const alert = createAlert(
        rule,
        hitRate,
        `Cache hit rate is ${hitRate.toFixed(1)}% (threshold: ${rule.threshold}%)`,
        { hitRate }
      );
      triggeredAlerts.push(alert);
    }
  }
  
  return triggeredAlerts;
}

/**
 * Run all performance checks
 */
export async function runPerformanceChecks(): Promise<{
  alerts: PerformanceAlert[];
  stats: {
    poolUtilization: number;
    queueLength: number;
    cacheHitRate: number;
  };
}> {
  const triggeredAlerts: PerformanceAlert[] = [];
  
  try {
    // Get pool stats
    const { getPoolStats } = await import('./connectionPoolService');
    const poolStats = await getPoolStats();
    
    // Calculate pool utilization
    const poolUtilization = poolStats && poolStats.totalConnections > 0
      ? (poolStats.activeConnections / poolStats.totalConnections) * 100
      : 0;
    
    // Check pool utilization
    if (poolStats) {
      triggeredAlerts.push(...checkPoolUtilization(poolUtilization, poolStats));
    }
    
    // Check queue length
    triggeredAlerts.push(...checkPoolQueueLength(poolStats?.waitingRequests || 0));
    
    // Get cache stats
    const { queryCache } = await import('./queryCacheService');
    const cacheStats = queryCache.getStats();
    const cacheHitRate = cacheStats.hitRate * 100;
    
    // Check cache hit rate
    triggeredAlerts.push(...checkCacheHitRate(cacheHitRate));
    
    return {
      alerts: triggeredAlerts,
      stats: {
        poolUtilization,
        queueLength: poolStats?.waitingRequests || 0,
        cacheHitRate,
      },
    };
  } catch (error) {
    console.error('Error running performance checks:', error);
    return {
      alerts: [],
      stats: {
        poolUtilization: 0,
        queueLength: 0,
        cacheHitRate: 0,
      },
    };
  }
}

/**
 * Clear all alerts
 */
export function clearAlerts(): void {
  alerts = [];
}

/**
 * Clear old alerts (older than specified days)
 */
export function clearOldAlerts(days: number): number {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const initialCount = alerts.length;
  alerts = alerts.filter(a => a.createdAt && a.createdAt >= cutoff);
  return initialCount - alerts.length;
}

export default {
  getAlertRules,
  getAlertRuleById,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  getAlerts,
  getAlertStats,
  acknowledgeAlert,
  acknowledgeAlerts,
  checkSlowQueryThreshold,
  checkPoolUtilization,
  checkPoolQueueLength,
  checkCacheHitRate,
  runPerformanceChecks,
  clearAlerts,
  clearOldAlerts,
};
