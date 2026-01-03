/**
 * Alert Escalation Service
 * Tự động escalate alerts khi không được xử lý trong thời gian quy định
 */

import { getDb } from '../db';
import { sendEmail } from '../emailService';
import { systemSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { sendSms, getAlertRecipients } from './criticalAlertNotificationService';

// Escalation level interface
export interface EscalationLevel {
  level: number;
  name: string;
  timeoutMinutes: number;
  notifyEmails: string[];
  notifyPhones: string[];
  notifyOwner: boolean;
}

// Escalation config interface
export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
}

// Alert with escalation info
export interface AlertWithEscalation {
  id: number;
  alertType: string;
  severity: string;
  alertMessage: string;
  currentValue: number;
  thresholdValue: number;
  productionLineId?: number;
  productionLineName?: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalationLevel: number;
  lastEscalatedAt?: Date;
}

/**
 * Get system setting from database
 */
async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting?.value || null;
  } catch (error) {
    console.error(`[AlertEscalation] Error getting setting ${key}:`, error);
    return null;
  }
}

/**
 * Get escalation configuration from system settings
 */
export async function getEscalationConfig(): Promise<EscalationConfig & { failureThreshold: number }> {
  try {
    const enabled = await getSystemSetting('escalation_enabled');
    const configStr = await getSystemSetting('escalation_config');
    const failureThresholdStr = await getSystemSetting('escalation_failure_threshold');
    const failureThreshold = failureThresholdStr ? parseInt(failureThresholdStr, 10) : 3;

    if (!configStr) {
      // Default escalation config
      return {
        enabled: enabled === 'true',
        failureThreshold,
        levels: [
          {
            level: 1,
            name: 'Supervisor',
            timeoutMinutes: 15,
            notifyEmails: [],
            notifyPhones: [],
            notifyOwner: false,
          },
          {
            level: 2,
            name: 'Manager',
            timeoutMinutes: 30,
            notifyEmails: [],
            notifyPhones: [],
            notifyOwner: true,
          },
          {
            level: 3,
            name: 'Director',
            timeoutMinutes: 60,
            notifyEmails: [],
            notifyPhones: [],
            notifyOwner: true,
          },
        ],
      };
    }

    return {
      enabled: enabled === 'true',
      failureThreshold,
      levels: JSON.parse(configStr),
    };
  } catch (error) {
    console.error('[AlertEscalation] Error getting config:', error);
    return { enabled: false, failureThreshold: 3, levels: [] };
  }
}

/**
 * Save escalation configuration
 */
export async function saveEscalationConfig(config: EscalationConfig & { failureThreshold?: number }): Promise<void> {
  try {
    const db = await getDb();
    if (db) {
      // Save enabled status
      await db.delete(systemSettings).where(eq(systemSettings.key, 'escalation_enabled'));
      await db.insert(systemSettings).values({
        key: 'escalation_enabled',
        value: config.enabled ? 'true' : 'false',
      });

      // Save failure threshold
      await db.delete(systemSettings).where(eq(systemSettings.key, 'escalation_failure_threshold'));
      await db.insert(systemSettings).values({
        key: 'escalation_failure_threshold',
        value: String(config.failureThreshold || 3),
      });

      // Save levels config
      await db.delete(systemSettings).where(eq(systemSettings.key, 'escalation_config'));
      await db.insert(systemSettings).values({
        key: 'escalation_config',
        value: JSON.stringify(config.levels),
      });
    }
  } catch (error) {
    console.error('[AlertEscalation] Error saving config:', error);
    throw error;
  }
}

/**
 * Get pending alerts that need escalation
 */
export async function getPendingAlertsForEscalation(): Promise<AlertWithEscalation[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const result = await db.execute({
      sql: `SELECT 
              kas.id, kas.alertType, kas.severity, kas.alertMessage,
              kas.currentValue, kas.thresholdValue, kas.productionLineId,
              pl.name as productionLineName,
              kas.createdAt, kas.acknowledgedAt, kas.resolvedAt,
              COALESCE(kas.escalationLevel, 0) as escalationLevel,
              kas.lastEscalatedAt
            FROM kpi_alert_stats kas
            LEFT JOIN production_lines pl ON kas.productionLineId = pl.id
            WHERE kas.resolvedAt IS NULL
            ORDER BY kas.createdAt ASC`,
    } as any);

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      alertType: row.alertType,
      severity: row.severity,
      alertMessage: row.alertMessage,
      currentValue: Number(row.currentValue),
      thresholdValue: Number(row.thresholdValue),
      productionLineId: row.productionLineId,
      productionLineName: row.productionLineName,
      createdAt: new Date(row.createdAt),
      acknowledgedAt: row.acknowledgedAt ? new Date(row.acknowledgedAt) : undefined,
      resolvedAt: row.resolvedAt ? new Date(row.resolvedAt) : undefined,
      escalationLevel: Number(row.escalationLevel) || 0,
      lastEscalatedAt: row.lastEscalatedAt ? new Date(row.lastEscalatedAt) : undefined,
    }));
  } catch (error) {
    console.error('[AlertEscalation] Error getting pending alerts:', error);
    return [];
  }
}

/**
 * Generate escalation email HTML
 */
function generateEscalationEmailHtml(
  alert: AlertWithEscalation,
  level: EscalationLevel
): string {
  const levelColors: Record<number, string> = {
    1: '#f59e0b', // Yellow
    2: '#f97316', // Orange
    3: '#dc2626', // Red
  };
  const color = levelColors[level.level] || '#dc2626';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .alert-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${color}; }
    .label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 18px; font-weight: bold; color: #111827; }
    .escalation-badge { display: inline-block; background: ${color}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
    .btn { display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🔺 ESCALATION - Level ${level.level}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${level.name}</p>
    </div>
    <div class="content">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="escalation-badge">Cảnh báo chưa được xử lý</span>
      </div>
      
      <div class="alert-box">
        <div class="label">Loại cảnh báo</div>
        <div class="value">${alert.alertType}</div>
      </div>
      
      <div class="alert-box">
        <div class="label">Nội dung</div>
        <div class="value">${alert.alertMessage}</div>
      </div>
      
      <div style="display: flex; gap: 15px;">
        <div class="alert-box" style="flex: 1;">
          <div class="label">Giá trị hiện tại</div>
          <div class="value" style="color: ${color};">${alert.currentValue.toFixed(3)}</div>
        </div>
        <div class="alert-box" style="flex: 1;">
          <div class="label">Ngưỡng</div>
          <div class="value">${alert.thresholdValue.toFixed(3)}</div>
        </div>
      </div>
      
      ${alert.productionLineName ? `
      <div class="alert-box">
        <div class="label">Dây chuyền</div>
        <div class="value">${alert.productionLineName}</div>
      </div>
      ` : ''}
      
      <div class="alert-box">
        <div class="label">Thời gian tạo cảnh báo</div>
        <div class="value">${new Date(alert.createdAt).toLocaleString('vi-VN')}</div>
      </div>
      
      <div class="alert-box">
        <div class="label">Thời gian chờ xử lý</div>
        <div class="value">${Math.round((Date.now() - alert.createdAt.getTime()) / 60000)} phút</div>
      </div>
      
      <div style="text-align: center;">
        <a href="#" class="btn">Xử lý ngay</a>
      </div>
    </div>
    <div class="footer">
      <p>Cảnh báo này đã được escalate lên ${level.name} do chưa được xử lý sau ${level.timeoutMinutes} phút.</p>
      <p>Vui lòng xử lý ngay để tránh ảnh hưởng đến sản xuất.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate escalation SMS message
 */
function generateEscalationSmsMessage(
  alert: AlertWithEscalation,
  level: EscalationLevel
): string {
  const waitTime = Math.round((Date.now() - alert.createdAt.getTime()) / 60000);
  
  return `🔺 ESCALATION L${level.level} (${level.name})
${alert.alertType}: ${alert.alertMessage}
Giá trị: ${alert.currentValue.toFixed(3)}
Chờ xử lý: ${waitTime} phút
Vui lòng xử lý ngay!`;
}

/**
 * Escalate a single alert to the next level
 */
export async function escalateAlert(
  alert: AlertWithEscalation,
  level: EscalationLevel
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[AlertEscalation] Escalating alert ${alert.id} to level ${level.level} (${level.name})`);

    // Send email notifications
    if (level.notifyEmails.length > 0) {
      const html = generateEscalationEmailHtml(alert, level);
      const subject = `[ESCALATION L${level.level}] ${alert.alertType} - Cần xử lý ngay`;

      for (const email of level.notifyEmails) {
        try {
          await sendEmail(email, subject, html);
        } catch (error) {
          console.error(`[AlertEscalation] Failed to send email to ${email}:`, error);
        }
      }
    }

    // Send SMS notifications
    if (level.notifyPhones.length > 0) {
      const smsMessage = generateEscalationSmsMessage(alert, level);

      for (const phone of level.notifyPhones) {
        try {
          await sendSms(phone, smsMessage);
        } catch (error) {
          console.error(`[AlertEscalation] Failed to send SMS to ${phone}:`, error);
        }
      }
    }

    // Update alert escalation level in database
    const db = await getDb();
    if (db) {
      await db.execute({
        sql: `UPDATE kpi_alert_stats 
              SET escalationLevel = ?, lastEscalatedAt = NOW()
              WHERE id = ?`,
        args: [level.level, alert.id],
      } as any);

      // Log escalation
      await db.execute({
        sql: `INSERT INTO alert_escalation_logs (alertId, escalationLevel, levelName, notifiedEmails, notifiedPhones, createdAt)
              VALUES (?, ?, ?, ?, ?, NOW())`,
        args: [
          alert.id,
          level.level,
          level.name,
          level.notifyEmails.join(','),
          level.notifyPhones.join(','),
        ],
      } as any);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[AlertEscalation] Error escalating alert:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Process all pending alerts for escalation
 */
export async function processEscalations(): Promise<{
  processed: number;
  escalated: number;
  errors: number;
}> {
  const result = { processed: 0, escalated: 0, errors: 0 };

  const config = await getEscalationConfig();
  if (!config.enabled || config.levels.length === 0) {
    console.log('[AlertEscalation] Escalation is disabled or no levels configured');
    return result;
  }

  const pendingAlerts = await getPendingAlertsForEscalation();
  console.log(`[AlertEscalation] Processing ${pendingAlerts.length} pending alerts`);

  for (const alert of pendingAlerts) {
    result.processed++;

    // Calculate time since alert was created (or last escalated)
    const referenceTime = alert.lastEscalatedAt || alert.createdAt;
    const minutesSinceReference = (Date.now() - referenceTime.getTime()) / 60000;

    // Find the next escalation level
    const currentLevel = alert.escalationLevel || 0;
    const nextLevel = config.levels.find(l => l.level === currentLevel + 1);

    if (!nextLevel) {
      // Already at max escalation level
      continue;
    }

    // Check if enough time has passed for escalation
    if (minutesSinceReference >= nextLevel.timeoutMinutes) {
      const escalateResult = await escalateAlert(alert, nextLevel);
      if (escalateResult.success) {
        result.escalated++;
      } else {
        result.errors++;
      }
    }
  }

  console.log(`[AlertEscalation] Processed: ${result.processed}, Escalated: ${result.escalated}, Errors: ${result.errors}`);
  return result;
}

/**
 * Get escalation history for an alert
 */
export async function getEscalationHistory(alertId: number): Promise<any[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const result = await db.execute({
      sql: `SELECT * FROM alert_escalation_logs WHERE alertId = ? ORDER BY createdAt DESC`,
      args: [alertId],
    } as any);

    return result.rows || [];
  } catch (error) {
    console.error('[AlertEscalation] Error getting history:', error);
    return [];
  }
}

/**
 * Get escalation statistics
 */
export async function getEscalationStats(days: number = 30): Promise<{
  totalEscalations: number;
  byLevel: { level: number; count: number }[];
  avgTimeToResolve: number;
  escalationRate: number;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return { totalEscalations: 0, byLevel: [], avgTimeToResolve: 0, escalationRate: 0 };
    }

    // Total escalations
    const totalResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM alert_escalation_logs 
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      args: [days],
    } as any);
    const totalEscalations = Number((totalResult.rows?.[0] as any)?.count) || 0;

    // By level
    const byLevelResult = await db.execute({
      sql: `SELECT escalationLevel as level, COUNT(*) as count 
            FROM alert_escalation_logs 
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY escalationLevel
            ORDER BY escalationLevel`,
      args: [days],
    } as any);
    const byLevel = (byLevelResult.rows || []).map((row: any) => ({
      level: Number(row.level),
      count: Number(row.count),
    }));

    // Total alerts in period
    const totalAlertsResult = await db.execute({
      sql: `SELECT COUNT(*) as count FROM kpi_alert_stats 
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      args: [days],
    } as any);
    const totalAlerts = Number((totalAlertsResult.rows?.[0] as any)?.count) || 1;

    // Escalation rate
    const escalationRate = (totalEscalations / totalAlerts) * 100;

    // Avg time to resolve (for resolved alerts)
    const avgTimeResult = await db.execute({
      sql: `SELECT AVG(TIMESTAMPDIFF(MINUTE, createdAt, resolvedAt)) as avgMinutes
            FROM kpi_alert_stats 
            WHERE resolvedAt IS NOT NULL 
            AND createdAt >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      args: [days],
    } as any);
    const avgTimeToResolve = Number((avgTimeResult.rows?.[0] as any)?.avgMinutes) || 0;

    return {
      totalEscalations,
      byLevel,
      avgTimeToResolve,
      escalationRate,
    };
  } catch (error) {
    console.error('[AlertEscalation] Error getting stats:', error);
    return { totalEscalations: 0, byLevel: [], avgTimeToResolve: 0, escalationRate: 0 };
  }
}


/**
 * Test escalation for a specific level
 */
export async function testEscalation(level: number, triggeredBy: string): Promise<void> {
  const config = await getEscalationConfig();
  const levelConfig = config.levels.find(l => l.level === level);
  
  if (!levelConfig) {
    throw new Error(`Level ${level} not found in escalation config`);
  }

  console.log(`[AlertEscalation] Testing level ${level} (${levelConfig.name}) triggered by ${triggeredBy}`);

  // Send email notifications
  if (levelConfig.notifyEmails.length > 0) {
    const html = generateTestEscalationEmailHtml(levelConfig, triggeredBy);
    const subject = `[TEST] Escalation Level ${level} - ${levelConfig.name}`;

    for (const email of levelConfig.notifyEmails) {
      try {
        await sendEmail(email, subject, html);
        console.log(`[AlertEscalation] Test email sent to ${email}`);
      } catch (error) {
        console.error(`[AlertEscalation] Failed to send test email to ${email}:`, error);
      }
    }
  }

  // Notify owner if configured
  if (levelConfig.notifyOwner) {
    try {
      const { notifyOwner } = await import('../_core/notification');
      await notifyOwner({
        title: `[TEST] Escalation Level ${level} - ${levelConfig.name}`,
        content: `Test escalation triggered by ${triggeredBy}. This is a test notification.`,
      });
      console.log('[AlertEscalation] Test owner notification sent');
    } catch (error) {
      console.error('[AlertEscalation] Failed to send test owner notification:', error);
    }
  }
}

/**
 * Generate test escalation email HTML
 */
function generateTestEscalationEmailHtml(level: EscalationLevel, triggeredBy: string): string {
  const levelColors: Record<number, string> = {
    1: '#f59e0b',
    2: '#f97316',
    3: '#dc2626',
  };
  const color = levelColors[level.level] || '#3b82f6';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .test-badge { display: inline-block; background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-bottom: 15px; }
    .info-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid ${color}; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🧪 TEST - Escalation Level ${level.level}</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">${level.name}</p>
    </div>
    <div class="content">
      <div style="text-align: center;">
        <span class="test-badge">Đây là email test</span>
      </div>
      
      <div class="info-box">
        <p><strong>Cấp độ:</strong> Level ${level.level} - ${level.name}</p>
        <p><strong>Thời gian chờ:</strong> ${level.timeoutMinutes} phút</p>
        <p><strong>Triggered by:</strong> ${triggeredBy}</p>
        <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
      </div>
      
      <div class="info-box">
        <p><strong>Cấu hình thông báo:</strong></p>
        <ul>
          <li>Emails: ${level.notifyEmails.length > 0 ? level.notifyEmails.join(', ') : 'Không có'}</li>
          <li>SMS: ${level.notifyPhones.length > 0 ? level.notifyPhones.join(', ') : 'Không có'}</li>
          <li>Notify Owner: ${level.notifyOwner ? 'Có' : 'Không'}</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>Đây là email test để kiểm tra cấu hình escalation.</p>
      <p>Nếu bạn nhận được email này, cấu hình đã hoạt động đúng.</p>
    </div>
  </div>
</body>
</html>
  `;
}
