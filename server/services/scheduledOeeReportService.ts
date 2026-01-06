/**
 * Scheduled OEE Report Service
 * Gửi báo cáo OEE định kỳ qua Telegram/Slack
 */

import { getDb } from '../db';
import { scheduledOeeReports, scheduledOeeReportHistory, productionLines, oeeRecords } from '../../drizzle/schema';
import { eq, desc, and, gte, lte, inArray, sql } from 'drizzle-orm';
import { sendTelegramAlert, getTelegramConfigById } from './telegramService';
import { sendSlackAlert, sendOeeComparisonReportToSlack } from './slackService';

export interface ScheduledOeeReportConfig {
  id: number;
  name: string;
  description?: string;
  productionLineIds: number[];
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  minute: number;
  timezone: string;
  notificationChannel: 'telegram' | 'slack' | 'both';
  telegramConfigId?: number;
  slackWebhookUrl?: string;
  includeAvailability: boolean;
  includePerformance: boolean;
  includeQuality: boolean;
  includeComparison: boolean;
  includeTrend: boolean;
  isActive: boolean;
  lastSentAt?: Date;
  nextScheduledAt?: Date;
  createdBy?: number;
}

export interface OeeReportData {
  lineId: number;
  lineName: string;
  lineCode: string;
  currentOee: number;
  targetOee: number;
  availability: number;
  performance: number;
  quality: number;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

/**
 * Lấy tất cả cấu hình báo cáo OEE định kỳ
 */
export async function getScheduledOeeReports(): Promise<ScheduledOeeReportConfig[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const reports = await db.select().from(scheduledOeeReports).orderBy(desc(scheduledOeeReports.createdAt));
    return reports.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      productionLineIds: (r.productionLineIds as number[]) || [],
      frequency: r.frequency as 'daily' | 'weekly' | 'monthly',
      dayOfWeek: r.dayOfWeek || undefined,
      dayOfMonth: r.dayOfMonth || undefined,
      hour: r.hour,
      minute: r.minute,
      timezone: r.timezone || 'Asia/Ho_Chi_Minh',
      notificationChannel: r.notificationChannel as 'telegram' | 'slack' | 'both',
      telegramConfigId: r.telegramConfigId || undefined,
      slackWebhookUrl: r.slackWebhookUrl || undefined,
      includeAvailability: r.includeAvailability === 1,
      includePerformance: r.includePerformance === 1,
      includeQuality: r.includeQuality === 1,
      includeComparison: r.includeComparison === 1,
      includeTrend: r.includeTrend === 1,
      isActive: r.isActive === 1,
      lastSentAt: r.lastSentAt ? new Date(r.lastSentAt) : undefined,
      nextScheduledAt: r.nextScheduledAt ? new Date(r.nextScheduledAt) : undefined,
      createdBy: r.createdBy || undefined,
    }));
  } catch (error) {
    console.error('Error fetching scheduled OEE reports:', error);
    return [];
  }
}

/**
 * Lấy cấu hình báo cáo theo ID
 */
export async function getScheduledOeeReportById(id: number): Promise<ScheduledOeeReportConfig | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const reports = await db.select().from(scheduledOeeReports).where(eq(scheduledOeeReports.id, id)).limit(1);
    if (reports.length === 0) return null;

    const r = reports[0];
    return {
      id: r.id,
      name: r.name,
      description: r.description || undefined,
      productionLineIds: (r.productionLineIds as number[]) || [],
      frequency: r.frequency as 'daily' | 'weekly' | 'monthly',
      dayOfWeek: r.dayOfWeek || undefined,
      dayOfMonth: r.dayOfMonth || undefined,
      hour: r.hour,
      minute: r.minute,
      timezone: r.timezone || 'Asia/Ho_Chi_Minh',
      notificationChannel: r.notificationChannel as 'telegram' | 'slack' | 'both',
      telegramConfigId: r.telegramConfigId || undefined,
      slackWebhookUrl: r.slackWebhookUrl || undefined,
      includeAvailability: r.includeAvailability === 1,
      includePerformance: r.includePerformance === 1,
      includeQuality: r.includeQuality === 1,
      includeComparison: r.includeComparison === 1,
      includeTrend: r.includeTrend === 1,
      isActive: r.isActive === 1,
      lastSentAt: r.lastSentAt ? new Date(r.lastSentAt) : undefined,
      nextScheduledAt: r.nextScheduledAt ? new Date(r.nextScheduledAt) : undefined,
      createdBy: r.createdBy || undefined,
    };
  } catch (error) {
    console.error('Error fetching scheduled OEE report:', error);
    return null;
  }
}

/**
 * Tạo cấu hình báo cáo mới
 */
export async function createScheduledOeeReport(config: Omit<ScheduledOeeReportConfig, 'id' | 'lastSentAt' | 'nextScheduledAt'>): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const nextScheduled = calculateNextScheduledTime(config);
    
    const result = await db.insert(scheduledOeeReports).values({
      name: config.name,
      description: config.description,
      productionLineIds: config.productionLineIds,
      frequency: config.frequency,
      dayOfWeek: config.dayOfWeek,
      dayOfMonth: config.dayOfMonth,
      hour: config.hour,
      minute: config.minute,
      timezone: config.timezone,
      notificationChannel: config.notificationChannel,
      telegramConfigId: config.telegramConfigId,
      slackWebhookUrl: config.slackWebhookUrl,
      includeAvailability: config.includeAvailability ? 1 : 0,
      includePerformance: config.includePerformance ? 1 : 0,
      includeQuality: config.includeQuality ? 1 : 0,
      includeComparison: config.includeComparison ? 1 : 0,
      includeTrend: config.includeTrend ? 1 : 0,
      isActive: config.isActive ? 1 : 0,
      nextScheduledAt: nextScheduled.toISOString(),
      createdBy: config.createdBy,
    });

    return Number(result[0].insertId);
  } catch (error) {
    console.error('Error creating scheduled OEE report:', error);
    return null;
  }
}

/**
 * Cập nhật cấu hình báo cáo
 */
export async function updateScheduledOeeReport(id: number, config: Partial<ScheduledOeeReportConfig>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const updateData: any = {};
    if (config.name !== undefined) updateData.name = config.name;
    if (config.description !== undefined) updateData.description = config.description;
    if (config.productionLineIds !== undefined) updateData.productionLineIds = config.productionLineIds;
    if (config.frequency !== undefined) updateData.frequency = config.frequency;
    if (config.dayOfWeek !== undefined) updateData.dayOfWeek = config.dayOfWeek;
    if (config.dayOfMonth !== undefined) updateData.dayOfMonth = config.dayOfMonth;
    if (config.hour !== undefined) updateData.hour = config.hour;
    if (config.minute !== undefined) updateData.minute = config.minute;
    if (config.timezone !== undefined) updateData.timezone = config.timezone;
    if (config.notificationChannel !== undefined) updateData.notificationChannel = config.notificationChannel;
    if (config.telegramConfigId !== undefined) updateData.telegramConfigId = config.telegramConfigId;
    if (config.slackWebhookUrl !== undefined) updateData.slackWebhookUrl = config.slackWebhookUrl;
    if (config.includeAvailability !== undefined) updateData.includeAvailability = config.includeAvailability ? 1 : 0;
    if (config.includePerformance !== undefined) updateData.includePerformance = config.includePerformance ? 1 : 0;
    if (config.includeQuality !== undefined) updateData.includeQuality = config.includeQuality ? 1 : 0;
    if (config.includeComparison !== undefined) updateData.includeComparison = config.includeComparison ? 1 : 0;
    if (config.includeTrend !== undefined) updateData.includeTrend = config.includeTrend ? 1 : 0;
    if (config.isActive !== undefined) updateData.isActive = config.isActive ? 1 : 0;

    // Recalculate next scheduled time if schedule changed
    if (config.frequency || config.dayOfWeek || config.dayOfMonth || config.hour || config.minute) {
      const current = await getScheduledOeeReportById(id);
      if (current) {
        const merged = { ...current, ...config };
        const nextScheduled = calculateNextScheduledTime(merged);
        updateData.nextScheduledAt = nextScheduled.toISOString();
      }
    }

    await db.update(scheduledOeeReports).set(updateData).where(eq(scheduledOeeReports.id, id));
    return true;
  } catch (error) {
    console.error('Error updating scheduled OEE report:', error);
    return false;
  }
}

/**
 * Xóa cấu hình báo cáo
 */
export async function deleteScheduledOeeReport(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.delete(scheduledOeeReports).where(eq(scheduledOeeReports.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting scheduled OEE report:', error);
    return false;
  }
}

/**
 * Tính thời gian gửi báo cáo tiếp theo
 */
function calculateNextScheduledTime(config: Partial<ScheduledOeeReportConfig>): Date {
  const now = new Date();
  const next = new Date();
  
  next.setHours(config.hour || 8, config.minute || 0, 0, 0);

  switch (config.frequency) {
    case 'daily':
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case 'weekly':
      const targetDay = config.dayOfWeek || 1; // Default Monday
      const currentDay = now.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }
      next.setDate(now.getDate() + daysUntilTarget);
      break;
    case 'monthly':
      const targetDate = config.dayOfMonth || 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }

  return next;
}

/**
 * Lấy dữ liệu OEE cho báo cáo
 */
async function getOeeDataForReport(lineIds: number[], days: number = 7): Promise<OeeReportData[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get production lines
    const lines = await db.select().from(productionLines).where(inArray(productionLines.id, lineIds));

    const results: OeeReportData[] = [];

    for (const line of lines) {
      // Get OEE records for this line
      const records = await db.select()
        .from(oeeRecords)
        .where(and(
          eq(oeeRecords.productionLineId, line.id),
          gte(oeeRecords.recordDate, startDate.toISOString().split('T')[0]),
          lte(oeeRecords.recordDate, endDate.toISOString().split('T')[0])
        ))
        .orderBy(desc(oeeRecords.recordDate));

      if (records.length === 0) {
        results.push({
          lineId: line.id,
          lineName: line.name,
          lineCode: line.code,
          currentOee: 0,
          targetOee: 85,
          availability: 0,
          performance: 0,
          quality: 0,
          trend: 'stable',
          changePercent: 0,
        });
        continue;
      }

      const latestRecord = records[0];
      const currentOee = Number(latestRecord.oee) || 0;
      const availability = Number(latestRecord.availability) || 0;
      const performance = Number(latestRecord.performance) || 0;
      const quality = Number(latestRecord.quality) || 0;

      // Calculate trend
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let changePercent = 0;

      if (records.length > 1) {
        const previousOee = Number(records[1].oee) || 0;
        changePercent = previousOee > 0 ? ((currentOee - previousOee) / previousOee) * 100 : 0;
        if (changePercent > 1) trend = 'up';
        else if (changePercent < -1) trend = 'down';
      }

      results.push({
        lineId: line.id,
        lineName: line.name,
        lineCode: line.code,
        currentOee,
        targetOee: 85,
        availability,
        performance,
        quality,
        trend,
        changePercent: Math.round(changePercent * 10) / 10,
      });
    }

    return results;
  } catch (error) {
    console.error('Error getting OEE data for report:', error);
    return [];
  }
}

/**
 * Format báo cáo OEE cho Telegram
 */
function formatOeeReportForTelegram(data: OeeReportData[], config: ScheduledOeeReportConfig): string {
  const lines = data.map((line, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
    const trendIcon = line.trend === 'up' ? '📈' : line.trend === 'down' ? '📉' : '➡️';
    const statusIcon = line.currentOee >= line.targetOee ? '✅' : line.currentOee >= line.targetOee * 0.9 ? '⚠️' : '❌';

    let lineText = `${medal} *${line.lineName}* (${line.lineCode})\n`;
    lineText += `${statusIcon} OEE: ${line.currentOee.toFixed(1)}% ${trendIcon} ${line.changePercent >= 0 ? '+' : ''}${line.changePercent.toFixed(1)}%\n`;
    
    if (config.includeAvailability || config.includePerformance || config.includeQuality) {
      const details = [];
      if (config.includeAvailability) details.push(`A: ${line.availability.toFixed(1)}%`);
      if (config.includePerformance) details.push(`P: ${line.performance.toFixed(1)}%`);
      if (config.includeQuality) details.push(`Q: ${line.quality.toFixed(1)}%`);
      lineText += `📊 ${details.join(' | ')}\n`;
    }

    return lineText;
  }).join('\n');

  const timeRange = config.frequency === 'daily' ? '24 giờ qua' : 
                    config.frequency === 'weekly' ? '7 ngày qua' : '30 ngày qua';

  return `📊 *Báo cáo OEE ${config.frequency === 'daily' ? 'Hàng ngày' : config.frequency === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}*

📅 *Khoảng thời gian:* ${timeRange}
📋 *Báo cáo:* ${config.name}

${lines}
⏰ Gửi lúc: ${new Date().toLocaleString('vi-VN')}`;
}

/**
 * Gửi báo cáo OEE
 */
export async function sendOeeReport(reportId: number): Promise<{ success: boolean; error?: string }> {
  const config = await getScheduledOeeReportById(reportId);
  if (!config) {
    return { success: false, error: 'Report config not found' };
  }

  const db = await getDb();
  if (!db) {
    return { success: false, error: 'Database not available' };
  }

  try {
    // Get OEE data
    const days = config.frequency === 'daily' ? 1 : config.frequency === 'weekly' ? 7 : 30;
    const oeeData = await getOeeDataForReport(config.productionLineIds, days);

    if (oeeData.length === 0) {
      return { success: false, error: 'No OEE data available' };
    }

    let telegramSuccess = true;
    let slackSuccess = true;
    let telegramError = '';
    let slackError = '';

    // Send to Telegram
    if (config.notificationChannel === 'telegram' || config.notificationChannel === 'both') {
      if (config.telegramConfigId) {
        const telegramConfig = await getTelegramConfigById(config.telegramConfigId);
        if (telegramConfig) {
          const message = formatOeeReportForTelegram(oeeData, config);
          const result = await sendTelegramMessage(telegramConfig.botToken, telegramConfig.chatId, message);
          telegramSuccess = result.success;
          telegramError = result.error || '';

          // Log history
          await db.insert(scheduledOeeReportHistory).values({
            reportId: config.id,
            reportName: config.name,
            channel: 'telegram',
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.error,
            reportData: oeeData,
          });
        }
      }
    }

    // Send to Slack
    if (config.notificationChannel === 'slack' || config.notificationChannel === 'both') {
      if (config.slackWebhookUrl) {
        const timeRange = config.frequency === 'daily' ? '24 giờ qua' : 
                          config.frequency === 'weekly' ? '7 ngày qua' : '30 ngày qua';
        const result = await sendOeeComparisonReportToSlack(config.slackWebhookUrl, oeeData, timeRange);
        slackSuccess = result.success;
        slackError = result.error || '';

        // Log history
        await db.insert(scheduledOeeReportHistory).values({
          reportId: config.id,
          reportName: config.name,
          channel: 'slack',
          status: result.success ? 'sent' : 'failed',
          errorMessage: result.error,
          reportData: oeeData,
        });
      }
    }

    // Update last sent time and next scheduled time
    const nextScheduled = calculateNextScheduledTime(config);
    await db.update(scheduledOeeReports)
      .set({
        lastSentAt: new Date().toISOString(),
        nextScheduledAt: nextScheduled.toISOString(),
      })
      .where(eq(scheduledOeeReports.id, config.id));

    const success = (config.notificationChannel === 'telegram' && telegramSuccess) ||
                    (config.notificationChannel === 'slack' && slackSuccess) ||
                    (config.notificationChannel === 'both' && (telegramSuccess || slackSuccess));

    return {
      success,
      error: !success ? `Telegram: ${telegramError}, Slack: ${slackError}` : undefined,
    };
  } catch (error) {
    console.error('Error sending OEE report:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Helper function to send Telegram message directly
 */
async function sendTelegramMessage(botToken: string, chatId: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      return { success: false, error: result.description || 'Unknown error' };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Lấy lịch sử gửi báo cáo
 */
export async function getScheduledOeeReportHistory(reportId?: number, limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select().from(scheduledOeeReportHistory);
    if (reportId) {
      query = query.where(eq(scheduledOeeReportHistory.reportId, reportId)) as any;
    }
    const history = await query.orderBy(desc(scheduledOeeReportHistory.sentAt)).limit(limit);
    return history;
  } catch (error) {
    console.error('Error fetching OEE report history:', error);
    return [];
  }
}

/**
 * Kiểm tra và gửi các báo cáo đến hạn
 */
export async function processScheduledOeeReports(): Promise<{ processed: number; sent: number; failed: number }> {
  const reports = await getScheduledOeeReports();
  const now = new Date();
  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const report of reports) {
    if (!report.isActive) continue;
    if (!report.nextScheduledAt) continue;
    
    if (new Date(report.nextScheduledAt) <= now) {
      processed++;
      const result = await sendOeeReport(report.id);
      if (result.success) {
        sent++;
      } else {
        failed++;
        console.error(`Failed to send OEE report ${report.id}: ${result.error}`);
      }
    }
  }

  return { processed, sent, failed };
}

export default {
  getScheduledOeeReports,
  getScheduledOeeReportById,
  createScheduledOeeReport,
  updateScheduledOeeReport,
  deleteScheduledOeeReport,
  sendOeeReport,
  getScheduledOeeReportHistory,
  processScheduledOeeReports,
};
