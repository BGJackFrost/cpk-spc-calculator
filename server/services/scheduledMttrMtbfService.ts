/**
 * Scheduled MTTR/MTBF Report Service
 * Handles scheduled export of MTTR/MTBF reports (daily/weekly/monthly)
 */

import { getDb } from '../db';
import { sendEmail, getSmtpConfig } from '../emailService';
import { mttrMtbfExportService } from '../mttrMtbfExportService';

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
    const result = await db.execute({
      sql: `SELECT * FROM scheduled_mttr_mtbf_reports ${userId ? 'WHERE created_by = ?' : ''} ORDER BY created_at DESC`,
      args: userId ? [userId] : [],
    } as any);

    return ((result as any).rows || []).map((row: any) => ({
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
    const result = await db.execute({
      sql: `INSERT INTO scheduled_mttr_mtbf_reports 
            (name, target_type, target_id, target_name, frequency, day_of_week, day_of_month, 
             time_of_day, recipients, format, is_active, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        config.name,
        config.targetType,
        config.targetId,
        config.targetName,
        config.frequency,
        config.dayOfWeek || null,
        config.dayOfMonth || null,
        config.timeOfDay,
        JSON.stringify(config.recipients),
        config.format,
        config.isActive ? 1 : 0,
        config.createdBy || null,
      ],
    } as any);

    return Number((result as any).insertId);
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

    args.push(id);
    await db.execute({
      sql: `UPDATE scheduled_mttr_mtbf_reports SET ${updates.join(', ')} WHERE id = ?`,
      args,
    } as any);

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
    await db.execute({
      sql: 'DELETE FROM scheduled_mttr_mtbf_reports WHERE id = ?',
      args: [id],
    } as any);
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
 * Send scheduled MTTR/MTBF report
 */
export async function sendScheduledMttrMtbfReport(config: ScheduledMttrMtbfConfig): Promise<{ success: boolean; error?: string }> {
  try {
    // Check SMTP config
    const smtpConfig = await getSmtpConfig();
    if (!smtpConfig) {
      return { success: false, error: 'SMTP chưa được cấu hình' };
    }

    // Calculate date range
    const { startDate, endDate } = getDateRange(config.frequency);

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
    const result = await sendEmail(
      config.recipients.join(','),
      `[MTTR/MTBF] Báo cáo ${frequencyText} - ${config.targetName}`,
      html
    );

    return { success: result.success, error: result.error };
  } catch (error) {
    console.error('[ScheduledMttrMtbf] Error sending report:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Lỗi không xác định' };
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
