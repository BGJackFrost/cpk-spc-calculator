import { getDb } from "../db";
import { escalationReportConfigs, escalationReportHistory, escalationHistory } from "../../drizzle/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { sendEscalationToWebhooks } from "./escalationWebhookService";

export interface EscalationReportConfig {
  id: number;
  name: string;
  description?: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  timeOfDay: string;
  timezone: string;
  emailRecipients?: string[] | null;
  webhookConfigIds?: number[] | null;
  includeStats: boolean;
  includeTopAlerts: boolean;
  includeResolvedAlerts: boolean;
  includeTrends: boolean;
  alertTypes?: string[] | null;
  productionLineIds?: number[] | null;
  isActive: boolean;
  lastRunAt?: number | null;
  nextRunAt?: number | null;
  createdBy?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface EscalationReportData {
  periodStart: number;
  periodEnd: number;
  stats: { totalAlerts: number; resolvedAlerts: number; pendingAlerts: number; avgResolutionTimeMinutes: number | null; byAlertType: { alertType: string; count: number }[]; bySeverity: { severity: string; count: number }[] };
  topAlerts: { id: number; alertType: string; alertTitle: string; severity: string; status: string; createdAt: number }[];
  resolvedAlerts: { id: number; alertType: string; alertTitle: string; resolvedAt: number; resolutionTimeMinutes: number }[];
  trends: { date: string; totalAlerts: number; resolvedAlerts: number }[];
}

function parseConfig(row: any): EscalationReportConfig {
  return {
    ...row,
    emailRecipients: row.emailRecipients ? (typeof row.emailRecipients === 'string' ? JSON.parse(row.emailRecipients) : row.emailRecipients) : null,
    webhookConfigIds: row.webhookConfigIds ? (typeof row.webhookConfigIds === 'string' ? JSON.parse(row.webhookConfigIds) : row.webhookConfigIds) : null,
    alertTypes: row.alertTypes ? (typeof row.alertTypes === 'string' ? JSON.parse(row.alertTypes) : row.alertTypes) : null,
    productionLineIds: row.productionLineIds ? (typeof row.productionLineIds === 'string' ? JSON.parse(row.productionLineIds) : row.productionLineIds) : null,
  };
}

function calculateNextRunTime(config: EscalationReportConfig): number {
  const now = new Date();
  const [hours, minutes] = config.timeOfDay.split(':').map(Number);
  let nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);
  
  switch (config.frequency) {
    case 'daily':
      if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      const targetDay = config.dayOfWeek || 1;
      let daysToAdd = targetDay - nextRun.getDay();
      if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) daysToAdd += 7;
      nextRun.setDate(nextRun.getDate() + daysToAdd);
      break;
    case 'monthly':
      nextRun.setDate(config.dayOfMonth || 1);
      if (nextRun <= now) nextRun.setMonth(nextRun.getMonth() + 1);
      break;
  }
  return nextRun.getTime();
}

function calculateReportPeriod(config: EscalationReportConfig): { start: number; end: number } {
  const now = Date.now();
  const periods: Record<string, number> = { daily: 24 * 60 * 60 * 1000, weekly: 7 * 24 * 60 * 60 * 1000, monthly: 30 * 24 * 60 * 60 * 1000 };
  return { start: now - (periods[config.frequency] || periods.weekly), end: now };
}

export async function generateReportData(config: EscalationReportConfig, periodStart: number, periodEnd: number): Promise<EscalationReportData> {
  const db = await getDb();
  if (!db) return { periodStart, periodEnd, stats: { totalAlerts: 0, resolvedAlerts: 0, pendingAlerts: 0, avgResolutionTimeMinutes: null, byAlertType: [], bySeverity: [] }, topAlerts: [], resolvedAlerts: [], trends: [] };
  
  const alerts = await db.select().from(escalationHistory).where(and(gte(escalationHistory.createdAt, periodStart), lte(escalationHistory.createdAt, periodEnd))).orderBy(desc(escalationHistory.createdAt));
  
  const totalAlerts = alerts.length;
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved').length;
  const pendingAlerts = totalAlerts - resolvedAlerts;
  
  const resolvedWithTime = alerts.filter(a => a.status === 'resolved' && a.resolvedAt);
  let avgResolutionTimeMinutes: number | null = null;
  if (resolvedWithTime.length > 0) {
    avgResolutionTimeMinutes = Math.round(resolvedWithTime.reduce((sum, a) => sum + (Number(a.resolvedAt) - Number(a.createdAt)) / 60000, 0) / resolvedWithTime.length);
  }
  
  const byAlertType: { alertType: string; count: number }[] = [];
  const alertTypeMap = new Map<string, number>();
  alerts.forEach(a => alertTypeMap.set(a.alertType, (alertTypeMap.get(a.alertType) || 0) + 1));
  alertTypeMap.forEach((count, alertType) => byAlertType.push({ alertType, count }));
  byAlertType.sort((a, b) => b.count - a.count);
  
  const bySeverity: { severity: string; count: number }[] = [];
  const severityMap = new Map<string, number>();
  alerts.forEach(a => severityMap.set(a.severity || 'unknown', (severityMap.get(a.severity || 'unknown') || 0) + 1));
  severityMap.forEach((count, severity) => bySeverity.push({ severity, count }));
  
  const topAlerts = alerts.filter(a => a.status !== 'resolved').slice(0, 10).map(a => ({ id: a.id, alertType: a.alertType, alertTitle: a.alertTitle, severity: a.severity || 'unknown', status: a.status, createdAt: Number(a.createdAt) }));
  const resolvedAlertsList = resolvedWithTime.slice(0, 10).map(a => ({ id: a.id, alertType: a.alertType, alertTitle: a.alertTitle, resolvedAt: Number(a.resolvedAt), resolutionTimeMinutes: Math.round((Number(a.resolvedAt) - Number(a.createdAt)) / 60000) }));
  
  const trends: { date: string; totalAlerts: number; resolvedAlerts: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let t = periodStart; t < periodEnd; t += dayMs) {
    const dayAlerts = alerts.filter(a => Number(a.createdAt) >= t && Number(a.createdAt) < t + dayMs);
    trends.push({ date: new Date(t).toLocaleDateString('vi-VN'), totalAlerts: dayAlerts.length, resolvedAlerts: dayAlerts.filter(a => a.status === 'resolved').length });
  }
  
  return { periodStart, periodEnd, stats: { totalAlerts, resolvedAlerts, pendingAlerts, avgResolutionTimeMinutes, byAlertType, bySeverity }, topAlerts, resolvedAlerts: resolvedAlertsList, trends };
}

function formatEmailReport(config: EscalationReportConfig, data: EscalationReportData): { subject: string; html: string } {
  const periodEndStr = new Date(data.periodEnd).toLocaleDateString('vi-VN');
  const freqNames: Record<string, string> = { daily: 'Hàng ngày', weekly: 'Hàng tuần', monthly: 'Hàng tháng' };
  const subject = `[SPC/CPK] Báo cáo Escalation ${freqNames[config.frequency]} - ${periodEndStr}`;
  
  let html = `<div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
    <h1 style="color: #1e40af;">📊 Báo cáo Escalation</h1>
    <p style="color: #6b7280;">Kỳ báo cáo: ${new Date(data.periodStart).toLocaleDateString('vi-VN')} - ${periodEndStr}</p>`;
  
  if (config.includeStats) {
    html += `<h2 style="color: #374151;">📈 Thống kê tổng quan</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="padding: 12px; background: #f3f4f6; border: 1px solid #e5e7eb;"><strong>Tổng số</strong><br/><span style="font-size: 24px; color: #1e40af;">${data.stats.totalAlerts}</span></td>
        <td style="padding: 12px; background: #f3f4f6; border: 1px solid #e5e7eb;"><strong>Đã xử lý</strong><br/><span style="font-size: 24px; color: #059669;">${data.stats.resolvedAlerts}</span></td>
        <td style="padding: 12px; background: #f3f4f6; border: 1px solid #e5e7eb;"><strong>Đang chờ</strong><br/><span style="font-size: 24px; color: #dc2626;">${data.stats.pendingAlerts}</span></td>
        <td style="padding: 12px; background: #f3f4f6; border: 1px solid #e5e7eb;"><strong>TG xử lý TB</strong><br/><span style="font-size: 24px; color: #7c3aed;">${data.stats.avgResolutionTimeMinutes || 'N/A'} phút</span></td>
      </tr>
    </table>`;
  }
  
  html += `<p style="color: #9ca3af; font-size: 12px;">Báo cáo tự động từ SPC/CPK Alert System.</p></div>`;
  return { subject, html };
}

export async function sendEscalationReport(configId: number): Promise<{ success: boolean; emailsSent: number; webhooksSent: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, emailsSent: 0, webhooksSent: 0, error: 'Database not available' };
  
  try {
    const configs = await db.select().from(escalationReportConfigs).where(eq(escalationReportConfigs.id, configId));
    if (configs.length === 0) return { success: false, emailsSent: 0, webhooksSent: 0, error: 'Config not found' };
    const config = parseConfig(configs[0]);
    
    const { start: periodStart, end: periodEnd } = calculateReportPeriod(config);
    const reportData = await generateReportData(config, periodStart, periodEnd);
    
    let emailsSent = 0, webhooksSent = 0;
    const errors: string[] = [];
    
    if (config.emailRecipients?.length) {
      const { subject, html } = formatEmailReport(config, reportData);
      for (const email of config.emailRecipients) {
        try { await sendEmail({ to: email, subject, html }); emailsSent++; } catch (e) { errors.push(`Email to ${email}: ${e instanceof Error ? e.message : 'Unknown'}`); }
      }
    }
    
    if (config.webhookConfigIds?.length) {
      const result = await sendEscalationToWebhooks(config.webhookConfigIds, { alertType: 'escalation_report', alertTitle: `Báo cáo Escalation`, alertMessage: `Tổng: ${reportData.stats.totalAlerts}, Đã xử lý: ${reportData.stats.resolvedAlerts}`, severity: 'info', escalationLevel: 0, timestamp: Date.now() });
      webhooksSent = result.sent;
      errors.push(...result.errors);
    }
    
    const now = Date.now();
    await db.insert(escalationReportHistory).values({ configId, reportPeriodStart: periodStart, reportPeriodEnd: periodEnd, totalAlerts: reportData.stats.totalAlerts, resolvedAlerts: reportData.stats.resolvedAlerts, pendingAlerts: reportData.stats.pendingAlerts, avgResolutionTimeMinutes: reportData.stats.avgResolutionTimeMinutes, emailsSent, webhooksSent, status: errors.length === 0 ? 'sent' : (emailsSent > 0 || webhooksSent > 0) ? 'partial' : 'failed', errorMessage: errors.length > 0 ? errors.join('; ') : null, reportData: JSON.stringify(reportData), sentAt: now, createdAt: now } as any);
    
    await db.update(escalationReportConfigs).set({ lastRunAt: now, nextRunAt: calculateNextRunTime(config), updatedAt: now }).where(eq(escalationReportConfigs.id, configId));
    
    return { success: errors.length === 0, emailsSent, webhooksSent, error: errors.length > 0 ? errors.join('; ') : undefined };
  } catch (error) { return { success: false, emailsSent: 0, webhooksSent: 0, error: error instanceof Error ? error.message : 'Unknown error' }; }
}

export async function createEscalationReportConfig(data: Omit<EscalationReportConfig, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'nextRunAt'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  const nextRunAt = calculateNextRunTime(data as EscalationReportConfig);
  const result = await db.insert(escalationReportConfigs).values({
    name: data.name, description: data.description || null, frequency: data.frequency, dayOfWeek: data.dayOfWeek || null, dayOfMonth: data.dayOfMonth || null, timeOfDay: data.timeOfDay, timezone: data.timezone,
    emailRecipients: data.emailRecipients ? JSON.stringify(data.emailRecipients) : null, webhookConfigIds: data.webhookConfigIds ? JSON.stringify(data.webhookConfigIds) : null,
    includeStats: data.includeStats, includeTopAlerts: data.includeTopAlerts, includeResolvedAlerts: data.includeResolvedAlerts, includeTrends: data.includeTrends,
    alertTypes: data.alertTypes ? JSON.stringify(data.alertTypes) : null, productionLineIds: data.productionLineIds ? JSON.stringify(data.productionLineIds) : null,
    isActive: data.isActive, lastRunAt: null, nextRunAt, createdBy: data.createdBy || null, createdAt: now, updatedAt: now,
  } as any);
  return (result as any)[0].insertId;
}

export async function getEscalationReportConfigs(activeOnly = false): Promise<EscalationReportConfig[]> {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(escalationReportConfigs);
  if (activeOnly) query = query.where(eq(escalationReportConfigs.isActive, true)) as any;
  return (await query.orderBy(desc(escalationReportConfigs.createdAt))).map(parseConfig);
}

export async function getEscalationReportConfigById(id: number): Promise<EscalationReportConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(escalationReportConfigs).where(eq(escalationReportConfigs.id, id));
  return results.length === 0 ? null : parseConfig(results[0]);
}

export async function updateEscalationReportConfig(id: number, data: Partial<EscalationReportConfig>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  const updateData: any = { updatedAt: now };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.frequency !== undefined) updateData.frequency = data.frequency;
  if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
  if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth;
  if (data.timeOfDay !== undefined) updateData.timeOfDay = data.timeOfDay;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.emailRecipients !== undefined) updateData.emailRecipients = data.emailRecipients ? JSON.stringify(data.emailRecipients) : null;
  if (data.webhookConfigIds !== undefined) updateData.webhookConfigIds = data.webhookConfigIds ? JSON.stringify(data.webhookConfigIds) : null;
  if (data.includeStats !== undefined) updateData.includeStats = data.includeStats;
  if (data.includeTopAlerts !== undefined) updateData.includeTopAlerts = data.includeTopAlerts;
  if (data.includeResolvedAlerts !== undefined) updateData.includeResolvedAlerts = data.includeResolvedAlerts;
  if (data.includeTrends !== undefined) updateData.includeTrends = data.includeTrends;
  if (data.alertTypes !== undefined) updateData.alertTypes = data.alertTypes ? JSON.stringify(data.alertTypes) : null;
  if (data.productionLineIds !== undefined) updateData.productionLineIds = data.productionLineIds ? JSON.stringify(data.productionLineIds) : null;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  
  if (data.frequency || data.dayOfWeek !== undefined || data.dayOfMonth !== undefined || data.timeOfDay) {
    const currentConfig = await getEscalationReportConfigById(id);
    if (currentConfig) updateData.nextRunAt = calculateNextRunTime({ ...currentConfig, ...data });
  }
  
  await db.update(escalationReportConfigs).set(updateData).where(eq(escalationReportConfigs.id, id));
}

export async function deleteEscalationReportConfig(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(escalationReportConfigs).where(eq(escalationReportConfigs.id, id));
}

export async function getEscalationReportHistory(options: { configId?: number; limit?: number; offset?: number }): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(escalationReportHistory);
  if (options.configId) query = query.where(eq(escalationReportHistory.configId, options.configId)) as any;
  return await query.orderBy(desc(escalationReportHistory.createdAt)).limit(options.limit || 50).offset(options.offset || 0);
}

export async function getDueReports(): Promise<EscalationReportConfig[]> {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  return (await db.select().from(escalationReportConfigs).where(and(eq(escalationReportConfigs.isActive, true), lte(escalationReportConfigs.nextRunAt, now)))).map(parseConfig);
}

export async function processDueReports(): Promise<{ processed: number; sent: number; failed: number }> {
  const dueReports = await getDueReports();
  let sent = 0, failed = 0;
  for (const config of dueReports) {
    const result = await sendEscalationReport(config.id);
    if (result.success) sent++; else failed++;
  }
  return { processed: dueReports.length, sent, failed };
}
