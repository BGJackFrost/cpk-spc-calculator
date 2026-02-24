/**
 * Scheduled MTTR/MTBF Report Service
 * Handles scheduled export of MTTR/MTBF reports (daily/weekly/monthly)
 * Supports both Email and Telegram notification channels
 */

import { getDb } from '../db';
import { sendEmail, getSmtpConfig } from '../emailService';
import { mttrMtbfExportService } from '../mttrMtbfExportService';
import telegramService from './telegramService';
import { sql } from 'drizzle-orm';

// Types
export interface ScheduledMttrMtbfConfig {
  id?: number;
  name: string;
  targetType: 'device' | 'machine' | 'production_line';
  targetId: number;
  targetName: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timeOfDay: string; // HH:mm
  recipients: string[]; // email addresses
  format: 'excel' | 'pdf' | 'both';
  notificationChannel: 'email' | 'telegram' | 'both'; // Phase 105: Notification channel
  telegramConfigId?: number; // Phase 105: Reference to telegram_config
  isActive: boolean;
  createdBy?: number;
  lastSentAt?: string;
  lastSentStatus?: 'success' | 'failed' | 'pending';
  lastSentError?: string;
}

/**
 * Get all scheduled MTTR/MTBF report configs
 */
export async function getScheduledMttrMtbfConfigs(userId?: number): Promise<ScheduledMttrMtbfConfig[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Use sql template literal for drizzle-orm mysql2 driver
    const query = userId 
      ? sql`SELECT * FROM scheduled_mttr_mtbf_reports WHERE created_by = ${userId} ORDER BY created_at DESC`
      : sql`SELECT * FROM scheduled_mttr_mtbf_reports ORDER BY created_at DESC`;
    const result = await db.execute(query);

    // Result is [rows, fields] for mysql2
    const rows = Array.isArray(result) ? result[0] : (result as any).rows || [];
    return (rows as any[]).map((row: any) => ({
      id: row.id,
      name: row.name,
      targetType: row.target_type,
      targetId: row.target_id,
      targetName: row.target_name,
      frequency: row.frequency,
      dayOfWeek: row.day_of_week,
      dayOfMonth: row.day_of_month,
      timeOfDay: row.time_of_day,
      recipients: JSON.parse(row.recipients || '[]'),
      format: row.format,
      notificationChannel: row.notification_channel || 'email',
      telegramConfigId: row.telegram_config_id,
      isActive: row.is_active === 1,
      createdBy: row.created_by,
      lastSentAt: row.last_sent_at,
      lastSentStatus: row.last_sent_status,
      lastSentError: row.last_sent_error,
    }));
  } catch (error) {
    console.error('[ScheduledMttrMtbf] Error getting configs:', error);
    return [];
  }
}

/**
 * Create a new scheduled MTTR/MTBF report config
 */
export async function createScheduledMttrMtbfConfig(config: ScheduledMttrMtbfConfig): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.execute(sql`
      INSERT INTO scheduled_mttr_mtbf_reports 
      (name, target_type, target_id, target_name, frequency, day_of_week, day_of_month, 
       time_of_day, recipients, format, notification_channel, telegram_config_id, is_active, created_by)
      VALUES (
        ${config.name},
        ${config.targetType},
        ${config.targetId},
        ${config.targetName},
        ${config.frequency},
        ${config.dayOfWeek || null},
        ${config.dayOfMonth || null},
        ${config.timeOfDay},
        ${JSON.stringify(config.recipients)},
        ${config.format},
        ${config.notificationChannel || 'email'},
        ${config.telegramConfigId || null},
        ${config.isActive ? 1 : 0},
        ${config.createdBy || null}
      )
    `);

    // Result is [ResultSetHeader, ...] for mysql2 INSERT
    const resultHeader = Array.isArray(result) ? result[0] : result;
    return Number((resultHeader as any).insertId);
  } catch (error) {
    console.error('[ScheduledMttrMtbf] Error creating config:', error);
    return null;
  }
}

/**
 * Update a scheduled MTTR/MTBF report config
 */
export async function updateScheduledMttrMtbfConfig(id: number, config: Partial<ScheduledMttrMtbfConfig>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const updates: string[] = [];
    const args: any[] = [];

    if (config.name !== undefined) {
      updates.push('name = ?');
      args.push(config.name);
    }
    if (config.targetType !== undefined) {
      updates.push('target_type = ?');
      args.push(config.targetType);
    }
    if (config.targetId !== undefined) {
      updates.push('target_id = ?');
      args.push(config.targetId);
    }
    if (config.targetName !== undefined) {
      updates.push('target_name = ?');
      args.push(config.targetName);
    }
    if (config.frequency !== undefined) {
      updates.push('frequency = ?');
      args.push(config.frequency);
    }
    if (config.dayOfWeek !== undefined) {
      updates.push('day_of_week = ?');
      args.push(config.dayOfWeek);
    }
    if (config.dayOfMonth !== undefined) {
      updates.push('day_of_month = ?');
      args.push(config.dayOfMonth);
    }
    if (config.timeOfDay !== undefined) {
      updates.push('time_of_day = ?');
      args.push(config.timeOfDay);
    }
    if (config.recipients !== undefined) {
      updates.push('recipients = ?');
      args.push(JSON.stringify(config.recipients));
    }
    if (config.format !== undefined) {
      updates.push('format = ?');
      args.push(config.format);
    }
    if (config.notificationChannel !== undefined) {
      updates.push('notification_channel = ?');
      args.push(config.notificationChannel);
    }
    if (config.telegramConfigId !== undefined) {
      updates.push('telegram_config_id = ?');
      args.push(config.telegramConfigId);
    }
    if (config.isActive !== undefined) {
      updates.push('is_active = ?');
      args.push(config.isActive ? 1 : 0);
    }
    if (config.lastSentAt !== undefined) {
      updates.push('last_sent_at = ?');
      args.push(config.lastSentAt);
    }
    if (config.lastSentStatus !== undefined) {
      updates.push('last_sent_status = ?');
      args.push(config.lastSentStatus);
    }
    if (config.lastSentError !== undefined) {
      updates.push('last_sent_error = ?');
      args.push(config.lastSentError);
    }

    if (updates.length === 0) return true;

    // Use sql.raw for dynamic UPDATE query
    const setClause = updates.map((u, i) => u.replace('?', `$${i + 1}`)).join(', ');
    await db.execute(sql.raw(`UPDATE scheduled_mttr_mtbf_reports SET ${updates.join(', ')} WHERE id = ?`, [...args, id]));

    return true;
  } catch (error) {
    console.error('[ScheduledMttrMtbf] Error updating config:', error);
    return false;
  }
}

/**
 * Delete a scheduled MTTR/MTBF report config
 */
export async function deleteScheduledMttrMtbfConfig(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.execute(sql`DELETE FROM scheduled_mttr_mtbf_reports WHERE id = ${id}`);
    return true;
  } catch (error) {
    console.error('[ScheduledMttrMtbf] Error deleting config:', error);
    return false;
  }
}

/**
 * Calculate date range based on frequency
 */
function getDateRange(frequency: 'daily' | 'weekly' | 'monthly'): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (frequency) {
    case 'daily':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case 'weekly':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'monthly':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
  }

  return { startDate, endDate };
}

/**
 * Format MTTR/MTBF report for Telegram
 */
function formatMttrMtbfReportForTelegram(
  config: ScheduledMttrMtbfConfig,
  startDate: Date,
  endDate: Date,
  reportData?: any
): string {
  const frequencyText = {
    daily: 'hàng ngày',
    weekly: 'hàng tuần',
    monthly: 'hàng tháng',
  }[config.frequency];

  const targetTypeText = {
    device: 'Thiết bị',
    machine: 'Máy móc',
    production_line: 'Dây chuyền',
  }[config.targetType];

  // Get summary data if available
  const summary = reportData?.summary || {};
  const mttr = summary.mttr ? `${summary.mttr.toFixed(1)} phút` : 'N/A';
  const mtbf = summary.mtbf ? `${(summary.mtbf / 60).toFixed(1)} giờ` : 'N/A';
  const availability = summary.availability ? `${(summary.availability * 100).toFixed(1)}%` : 'N/A';
  const totalFailures = summary.totalFailures || 0;

  return `
📊 *Báo cáo MTTR/MTBF ${frequencyText}*

📍 *${targetTypeText}:* ${config.targetName}
📅 *Khoảng thời gian:* ${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}

📈 *Chỉ số KPI:*
• MTTR: ${mttr}
• MTBF: ${mtbf}
• Availability: ${availability}
• Tổng số lỗi: ${totalFailures}

⏰ *Thời gian gửi:* ${new Date().toLocaleString('vi-VN')}

_Báo cáo tự động từ hệ thống CPK/SPC Calculator_
`;
}

/**
 * Send scheduled MTTR/MTBF report
 * Supports Email, Telegram, or both channels
 */
export async function sendScheduledMttrMtbfReport(config: ScheduledMttrMtbfConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const errors: string[] = [];
    let emailSuccess = true;
    let telegramSuccess = true;

    // Calculate date range
    const { startDate, endDate } = getDateRange(config.frequency);

    // Get report data for Telegram message
    let reportData: any = null;
    try {
      reportData = await mttrMtbfExportService.getReportData(
        config.targetType,
        config.targetId,
        startDate,
        endDate,
        config.targetName
      );
    } catch (e) {
      console.warn('[ScheduledMttrMtbf] Could not get report data for Telegram:', e);
    }

    // Send via Email if configured
    if (config.notificationChannel === 'email' || config.notificationChannel === 'both') {
      const smtpConfig = await getSmtpConfig();
      if (!smtpConfig) {
        errors.push('SMTP chưa được cấu hình');
        emailSuccess = false;
      } else {
        // Generate reports
        const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];

        if (config.format === 'excel' || config.format === 'both') {
          const excelBuffer = await mttrMtbfExportService.exportToExcel(
            config.targetType,
            config.targetId,
            startDate,
            endDate,
            config.targetName
          );
          attachments.push({
            filename: `mttr-mtbf-${config.targetType}-${config.targetId}-${Date.now()}.xlsx`,
            content: excelBuffer,
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        }

        if (config.format === 'pdf' || config.format === 'both') {
          const pdfBuffer = await mttrMtbfExportService.exportToPdf(
            config.targetType,
            config.targetId,
            startDate,
            endDate,
            config.targetName
          );
          attachments.push({
            filename: `mttr-mtbf-${config.targetType}-${config.targetId}-${Date.now()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          });
        }

        // Prepare email content
        const frequencyText = {
          daily: 'hàng ngày',
          weekly: 'hàng tuần',
          monthly: 'hàng tháng',
        }[config.frequency];

        const targetTypeText = {
          device: 'Thiết bị',
          machine: 'Máy móc',
          production_line: 'Dây chuyền',
        }[config.targetType];

        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">📊 Báo cáo MTTR/MTBF ${frequencyText}</h2>
            
            <p>Xin chào,</p>
            <p>Đây là báo cáo MTTR/MTBF ${frequencyText} cho <strong>${targetTypeText}: ${config.targetName}</strong>.</p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Khoảng thời gian:</strong> ${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}</p>
              <p style="margin: 5px 0 0;"><strong>Định dạng:</strong> ${config.format === 'both' ? 'Excel & PDF' : config.format.toUpperCase()}</p>
            </div>
            
            <p>Vui lòng xem file đính kèm để biết chi tiết.</p>
            
            <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="color: #6b7280; font-size: 12px;">
              Báo cáo tự động từ hệ thống CPK/SPC Calculator<br/>
              Thời gian gửi: ${new Date().toLocaleString('vi-VN')}
            </p>
          </div>
        `;

        // Send email with attachments
        const emailResult = await sendEmail(
          config.recipients.join(','),
          `[MTTR/MTBF] Báo cáo ${frequencyText} - ${config.targetName}`,
          html
        );

        if (!emailResult.success) {
          errors.push(`Email: ${emailResult.error}`);
          emailSuccess = false;
        }
      }
    }

    // Send via Telegram if configured
    if (config.notificationChannel === 'telegram' || config.notificationChannel === 'both') {
      if (!config.telegramConfigId) {
        errors.push('Telegram config chưa được chọn');
        telegramSuccess = false;
      } else {
        const telegramConfig = await telegramService.getTelegramConfigById(config.telegramConfigId);
        if (!telegramConfig) {
          errors.push('Không tìm thấy cấu hình Telegram');
          telegramSuccess = false;
        } else if (!telegramConfig.isActive) {
          errors.push('Cấu hình Telegram đã bị vô hiệu hóa');
          telegramSuccess = false;
        } else {
          // Format message for Telegram
          const telegramMessage = formatMttrMtbfReportForTelegram(config, startDate, endDate, reportData);
          
          // Send via Telegram API
          const telegramResult = await sendTelegramMessage(
            telegramConfig.botToken,
            telegramConfig.chatId,
            telegramMessage
          );

          if (!telegramResult.success) {
            errors.push(`Telegram: ${telegramResult.error}`);
            telegramSuccess = false;
          }
        }
      }
    }

    // Determine overall success
    const overallSuccess = (config.notificationChannel === 'email' && emailSuccess) ||
                          (config.notificationChannel === 'telegram' && telegramSuccess) ||
                          (config.notificationChannel === 'both' && (emailSuccess || telegramSuccess));

    return {
      success: overallSuccess,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error) {
    console.error('[ScheduledMttrMtbf] Error sending report:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Lỗi không xác định' };
  }
}

/**
 * Send Telegram message directly
 */
async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.error('[ScheduledMttrMtbf] Error sending Telegram message:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Check and send due scheduled reports
 * Called by scheduled job
 */
export async function checkAndSendDueReports(): Promise<{ sent: number; failed: number; errors: string[] }> {
  const result = { sent: 0, failed: 0, errors: [] as string[] };

  try {
    const configs = await getScheduledMttrMtbfConfigs();
    const activeConfigs = configs.filter(c => c.isActive);

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0-6
    const currentDate = now.getDate(); // 1-31

    for (const config of activeConfigs) {
      // Check if it's time to send
      const [targetHour, targetMinute] = config.timeOfDay.split(':').map(Number);
      
      // Check time (within 5 minute window)
      const timeDiff = Math.abs((currentHour * 60 + currentMinute) - (targetHour * 60 + targetMinute));
      if (timeDiff > 5) continue;

      // Check frequency conditions
      let shouldSend = false;
      
      if (config.frequency === 'daily') {
        shouldSend = true;
      } else if (config.frequency === 'weekly' && config.dayOfWeek !== undefined) {
        shouldSend = currentDay === config.dayOfWeek;
      } else if (config.frequency === 'monthly' && config.dayOfMonth !== undefined) {
        shouldSend = currentDate === config.dayOfMonth;
      }

      if (!shouldSend) continue;

      // Check if already sent today
      if (config.lastSentAt) {
        const lastSent = new Date(config.lastSentAt);
        if (lastSent.toDateString() === now.toDateString()) {
          continue; // Already sent today
        }
      }

      // Send report
      console.log(`[ScheduledMttrMtbf] Sending report: ${config.name}`);
      const sendResult = await sendScheduledMttrMtbfReport(config);

      // Update status
      await updateScheduledMttrMtbfConfig(config.id!, {
        lastSentAt: now.toISOString(),
        lastSentStatus: sendResult.success ? 'success' : 'failed',
        lastSentError: sendResult.error || undefined,
      });

      if (sendResult.success) {
        result.sent++;
      } else {
        result.failed++;
        result.errors.push(`${config.name}: ${sendResult.error}`);
      }
    }
  } catch (error) {
    console.error('[ScheduledMttrMtbf] Error checking due reports:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return result;
}

export default {
  getScheduledMttrMtbfConfigs,
  createScheduledMttrMtbfConfig,
  updateScheduledMttrMtbfConfig,
  deleteScheduledMttrMtbfConfig,
  sendScheduledMttrMtbfReport,
  checkAndSendDueReports,
};
