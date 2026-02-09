import { getDb } from "../db";
import { customAlertRules, customAlertHistory } from "../../drizzle/schema";
import { eq, desc, gte, sql } from "drizzle-orm";
import { getDetailedHealth } from "./healthCheckService";

export const METRIC_TYPES = [
  "cpk", "oee", "defect_rate", "machine_downtime",
  "memory_usage", "cpu_usage", "db_latency", "response_time",
  "error_rate", "throughput", "queue_length", "disk_usage"
] as const;

export const OPERATORS = [">", "<", ">=", "<=", "==", "!=", "between", "not_between"] as const;
export const SEVERITIES = ["info", "warning", "critical", "emergency"] as const;
export const NOTIFICATION_CHANNELS = ["in_app", "email", "slack", "webhook", "sms"] as const;

export function evaluateCondition(value: number, operator: string, threshold: number, thresholdMax?: number | null): boolean {
  switch (operator) {
    case ">": return value > threshold;
    case "<": return value < threshold;
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case "==": return value === threshold;
    case "!=": return value !== threshold;
    case "between": return value >= threshold && value <= (thresholdMax ?? threshold);
    case "not_between": return value < threshold || value > (thresholdMax ?? threshold);
    default: return false;
  }
}

export async function getMetricValue(metricType: string): Promise<number | null> {
  try {
    switch (metricType) {
      case "memory_usage": {
        const health = await getDetailedHealth();
        return (health as any).memory?.systemUsagePercent ?? null;
      }
      case "cpu_usage": {
        const health = await getDetailedHealth();
        const load = (health as any).cpu?.loadAverage1m ?? 0;
        const cores = (health as any).cpu?.cores ?? 1;
        return (load / cores) * 100;
      }
      case "db_latency": {
        const health = await getDetailedHealth();
        return (health as any).database?.latencyMs ?? null;
      }
      default: return null;
    }
  } catch { return null; }
}

export function isInCooldown(lastTriggeredAt: number | null, cooldownMinutes: number): boolean {
  if (!lastTriggeredAt) return false;
  return Date.now() - lastTriggeredAt < cooldownMinutes * 60 * 1000;
}

export async function evaluateAllRules() {
  const db = await getDb();
  const rules = await db.select().from(customAlertRules).where(eq(customAlertRules.isActive, true));
  let evaluated = 0, triggered = 0, errors = 0;
  const results: Array<{ ruleId: number; ruleName: string; triggered: boolean; value: number | null; error?: string }> = [];

  for (const rule of rules) {
    try {
      const value = await getMetricValue(rule.metricType);
      if (value === null) { results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, value: null, error: "Metric not available" }); continue; }
      evaluated++;
      const now = Date.now();
      await db.update(customAlertRules).set({ lastEvaluatedAt: now, updatedAt: now }).where(eq(customAlertRules.id, rule.id));
      const breached = evaluateCondition(value, rule.operator, rule.threshold, rule.thresholdMax);
      if (breached) {
        const newConsecutive = (rule.currentConsecutiveBreaches ?? 0) + 1;
        await db.update(customAlertRules).set({ currentConsecutiveBreaches: newConsecutive, updatedAt: now }).where(eq(customAlertRules.id, rule.id));
        if (newConsecutive >= rule.consecutiveBreachesRequired && !isInCooldown(rule.lastTriggeredAt, rule.cooldownMinutes)) {
          const message = `${rule.name}: ${rule.metricType} = ${value.toFixed(2)} ${rule.operator} ${rule.threshold}`;
          await db.insert(customAlertHistory).values({ ruleId: rule.id, ruleName: rule.name, metricType: rule.metricType, currentValue: value, threshold: rule.threshold, operator: rule.operator, severity: rule.severity, status: "active", message, notificationChannels: rule.notificationChannels, triggeredAt: now });
          await db.update(customAlertRules).set({ lastTriggeredAt: now, totalTriggers: (rule.totalTriggers ?? 0) + 1, currentConsecutiveBreaches: 0, updatedAt: now }).where(eq(customAlertRules.id, rule.id));
          triggered++;
          results.push({ ruleId: rule.id, ruleName: rule.name, triggered: true, value });
        } else {
          results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, value, error: isInCooldown(rule.lastTriggeredAt, rule.cooldownMinutes) ? "In cooldown" : `Breach ${newConsecutive}/${rule.consecutiveBreachesRequired}` });
        }
      } else {
        if ((rule.currentConsecutiveBreaches ?? 0) > 0) await db.update(customAlertRules).set({ currentConsecutiveBreaches: 0, updatedAt: now }).where(eq(customAlertRules.id, rule.id));
        results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, value });
      }
    } catch (err: any) { errors++; results.push({ ruleId: rule.id, ruleName: rule.name, triggered: false, value: null, error: err.message }); }
  }
  return { evaluated, triggered, errors, results };
}

export async function getAlertStats() {
  const db = await getDb();
  const now = Date.now();
  const oneDayAgo = now - 86400000;
  const oneWeekAgo = now - 604800000;
  const [totalRules] = await db.select({ count: sql<number>`count(*)` }).from(customAlertRules);
  const [activeRules] = await db.select({ count: sql<number>`count(*)` }).from(customAlertRules).where(eq(customAlertRules.isActive, true));
  const [totalAlerts] = await db.select({ count: sql<number>`count(*)` }).from(customAlertHistory);
  const [activeAlerts] = await db.select({ count: sql<number>`count(*)` }).from(customAlertHistory).where(eq(customAlertHistory.status, "active"));
  const [alertsToday] = await db.select({ count: sql<number>`count(*)` }).from(customAlertHistory).where(gte(customAlertHistory.triggeredAt, oneDayAgo));
  const [alertsWeek] = await db.select({ count: sql<number>`count(*)` }).from(customAlertHistory).where(gte(customAlertHistory.triggeredAt, oneWeekAgo));
  const totalTriggers = await db.select({ sum: sql<number>`COALESCE(SUM(total_triggers), 0)` }).from(customAlertRules);
  return { totalRules: totalRules?.count ?? 0, activeRules: activeRules?.count ?? 0, totalAlerts: totalAlerts?.count ?? 0, activeAlerts: activeAlerts?.count ?? 0, alertsToday: alertsToday?.count ?? 0, alertsWeek: alertsWeek?.count ?? 0, totalTriggers: totalTriggers?.[0]?.sum ?? 0, lastEvaluation: Date.now() };
}
