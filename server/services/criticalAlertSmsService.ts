/**
 * Critical Alert SMS Service
 * Tự động gửi SMS khi có alert Critical chưa xử lý quá 30 phút
 */
import { getDb } from '../db';
import { kpiAlertStats, productionLines } from '../../drizzle/schema';
import { eq, and, isNull, lt, desc, sql } from 'drizzle-orm';

// SMS Configuration interface
export interface SmsConfig {
  enabled: boolean;
  provider: 'twilio' | 'nexmo' | 'custom';
  apiKey?: string;
  apiSecret?: string;
  fromNumber?: string;
  customEndpoint?: string;
  timeoutMinutes: number;
  recipients: string[];
  escalationEnabled: boolean;
  escalationIntervalMinutes: number;
  maxEscalations: number;
}

// Default configuration
const DEFAULT_CONFIG: SmsConfig = {
  enabled: false,
  provider: 'custom',
  timeoutMinutes: 30,
  recipients: [],
  escalationEnabled: true,
  escalationIntervalMinutes: 15,
  maxEscalations: 3,
};

let smsConfig: SmsConfig = { ...DEFAULT_CONFIG };
const sentSmsTracker = new Map<number, { count: number; lastSentAt: Date }>();

export async function getSmsConfig(): Promise<SmsConfig> {
  const db = await getDb();
  if (!db) return smsConfig;

  try {
    const result = await db.execute(sql.raw(`
      SELECT configValue FROM ntf_alert_config 
      WHERE configKey = 'critical_alert_sms_config'
    `));
    
    const rows = (result as unknown as any[])[0] as any[];
    if (rows && rows.length > 0) {
      const savedConfig = JSON.parse(rows[0].configValue);
      smsConfig = { ...DEFAULT_CONFIG, ...savedConfig };
    }
  } catch (error) {
    console.error('Error loading SMS config:', error);
  }

  return smsConfig;
}

export async function saveSmsConfig(config: Partial<SmsConfig>): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    smsConfig = { ...smsConfig, ...config };
    const configJson = JSON.stringify(smsConfig);
    
    await db.execute(sql.raw(`
      INSERT INTO ntf_alert_config (configKey, configValue, createdAt, updatedAt)
      VALUES ('critical_alert_sms_config', '${configJson.replace(/'/g, "''")}', NOW(), NOW())
      ON DUPLICATE KEY UPDATE configValue = '${configJson.replace(/'/g, "''")}', updatedAt = NOW()
    `));
    
    return true;
  } catch (error) {
    console.error('Error saving SMS config:', error);
    return false;
  }
}

async function sendSms(phoneNumber: string, message: string): Promise<boolean> {
  if (!smsConfig.enabled) {
    console.log('[SMS] SMS notifications are disabled');
    return false;
  }

  try {
    switch (smsConfig.provider) {
      case 'twilio':
        return await sendViaTwilio(phoneNumber, message);
      case 'nexmo':
        return await sendViaNexmo(phoneNumber, message);
      case 'custom':
        return await sendViaCustomEndpoint(phoneNumber, message);
      default:
        return false;
    }
  } catch (error) {
    console.error('[SMS] Error sending SMS:', error);
    return false;
  }
}

async function sendViaTwilio(phoneNumber: string, message: string): Promise<boolean> {
  if (!smsConfig.apiKey || !smsConfig.apiSecret || !smsConfig.fromNumber) {
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${smsConfig.apiKey}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${smsConfig.apiKey}:${smsConfig.apiSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: smsConfig.fromNumber,
          Body: message,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('[SMS] Twilio error:', error);
    return false;
  }
}

async function sendViaNexmo(phoneNumber: string, message: string): Promise<boolean> {
  if (!smsConfig.apiKey || !smsConfig.apiSecret || !smsConfig.fromNumber) {
    return false;
  }

  try {
    const response = await fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: smsConfig.apiKey,
        api_secret: smsConfig.apiSecret,
        to: phoneNumber,
        from: smsConfig.fromNumber,
        text: message,
      }),
    });

    const data = await response.json();
    return data.messages?.[0]?.status === '0';
  } catch (error) {
    console.error('[SMS] Nexmo error:', error);
    return false;
  }
}

async function sendViaCustomEndpoint(phoneNumber: string, message: string): Promise<boolean> {
  if (!smsConfig.customEndpoint) {
    return false;
  }

  try {
    const response = await fetch(smsConfig.customEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(smsConfig.apiKey ? { 'Authorization': `Bearer ${smsConfig.apiKey}` } : {}),
      },
      body: JSON.stringify({
        to: phoneNumber,
        message: message,
        from: smsConfig.fromNumber,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[SMS] Custom endpoint error:', error);
    return false;
  }
}

export async function getUnresolvedCriticalAlerts(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const timeoutMinutes = smsConfig.timeoutMinutes || 30;
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  try {
    const alerts = await db.select({
      id: kpiAlertStats.id,
      alertType: kpiAlertStats.alertType,
      severity: kpiAlertStats.severity,
      alertMessage: kpiAlertStats.alertMessage,
      currentValue: kpiAlertStats.currentValue,
      thresholdValue: kpiAlertStats.thresholdValue,
      productionLineId: kpiAlertStats.productionLineId,
      createdAt: kpiAlertStats.createdAt,
      acknowledgedAt: kpiAlertStats.acknowledgedAt,
    })
      .from(kpiAlertStats)
      .where(
        and(
          eq(kpiAlertStats.severity, 'critical'),
          isNull(kpiAlertStats.resolvedAt),
          lt(kpiAlertStats.createdAt, cutoffTime)
        )
      )
      .orderBy(desc(kpiAlertStats.createdAt))
      .limit(50);

    const lineIds = [...new Set(alerts.filter(a => a.productionLineId).map(a => a.productionLineId!))];
    let lineMap = new Map<number, string>();
    
    if (lineIds.length > 0) {
      const lines = await db.select({ id: productionLines.id, name: productionLines.name })
        .from(productionLines);
      lineMap = new Map(lines.map(l => [l.id, l.name]));
    }

    return alerts.map(a => ({
      ...a,
      productionLineName: a.productionLineId ? lineMap.get(a.productionLineId) : undefined,
      minutesSinceCreated: Math.floor((Date.now() - new Date(a.createdAt).getTime()) / 60000),
    }));
  } catch (error) {
    console.error('[SMS] Error fetching unresolved alerts:', error);
    return [];
  }
}

function formatSmsMessage(alert: any): string {
  const lineName = alert.productionLineName || `Line #${alert.productionLineId}` || 'N/A';
  const alertType = alert.alertType?.replace(/_/g, ' ').toUpperCase() || 'ALERT';
  const value = Number(alert.currentValue).toFixed(2);
  const threshold = Number(alert.thresholdValue).toFixed(2);
  const minutes = alert.minutesSinceCreated;

  return `[CRITICAL] ${alertType}
Line: ${lineName}
Value: ${value} (Threshold: ${threshold})
Unresolved: ${minutes} min
ID: ${alert.id}`;
}

export async function checkAndSendCriticalAlertSms(): Promise<{
  checked: number;
  smsSent: number;
  errors: number;
}> {
  await getSmsConfig();

  if (!smsConfig.enabled || smsConfig.recipients.length === 0) {
    return { checked: 0, smsSent: 0, errors: 0 };
  }

  const alerts = await getUnresolvedCriticalAlerts();
  let smsSent = 0;
  let errors = 0;

  for (const alert of alerts) {
    const tracker = sentSmsTracker.get(alert.id);
    const now = new Date();

    let shouldSend = false;
    
    if (!tracker) {
      shouldSend = true;
    } else if (smsConfig.escalationEnabled) {
      const minutesSinceLastSms = (now.getTime() - tracker.lastSentAt.getTime()) / 60000;
      if (
        minutesSinceLastSms >= smsConfig.escalationIntervalMinutes &&
        tracker.count < smsConfig.maxEscalations
      ) {
        shouldSend = true;
      }
    }

    if (shouldSend) {
      const message = formatSmsMessage(alert);
      let sentCount = 0;

      for (const phone of smsConfig.recipients) {
        const success = await sendSms(phone, message);
        if (success) {
          sentCount++;
        } else {
          errors++;
        }
      }

      if (sentCount > 0) {
        smsSent++;
        sentSmsTracker.set(alert.id, {
          count: (tracker?.count || 0) + 1,
          lastSentAt: now,
        });
        await logSmsSent(alert.id, sentCount);
      }
    }
  }

  // Cleanup old tracker entries
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [alertId, data] of sentSmsTracker.entries()) {
    if (data.lastSentAt < oneHourAgo) {
      sentSmsTracker.delete(alertId);
    }
  }

  return { checked: alerts.length, smsSent, errors };
}

async function logSmsSent(alertId: number, recipientCount: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.execute(sql.raw(`
      INSERT INTO ntf_sms_log (alertId, recipientCount, sentAt, status)
      VALUES (${alertId}, ${recipientCount}, NOW(), 'sent')
    `));
  } catch (error) {
    console.log('[SMS] Could not log SMS:', error);
  }
}

export async function getSmsStats(days: number = 7): Promise<{
  totalSent: number;
  alertsCovered: number;
  byDay: { date: string; count: number }[];
}> {
  const db = await getDb();
  if (!db) {
    return { totalSent: 0, alertsCovered: 0, byDay: [] };
  }

  try {
    const result = await db.execute(sql.raw(`
      SELECT 
        COUNT(*) as totalSent,
        COUNT(DISTINCT alertId) as alertsCovered
      FROM ntf_sms_log
      WHERE sentAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    `));

    const byDayResult = await db.execute(sql.raw(`
      SELECT 
        DATE(sentAt) as date,
        COUNT(*) as count
      FROM ntf_sms_log
      WHERE sentAt >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY DATE(sentAt)
      ORDER BY date DESC
    `));

    const stats = ((result as unknown as any[])[0] as any[])[0] || { totalSent: 0, alertsCovered: 0 };
    const byDay = ((byDayResult as unknown as any[])[0] as any[]).map((row: any) => ({
      date: row.date,
      count: Number(row.count),
    }));

    return {
      totalSent: Number(stats.totalSent),
      alertsCovered: Number(stats.alertsCovered),
      byDay,
    };
  } catch (error) {
    return { totalSent: 0, alertsCovered: 0, byDay: [] };
  }
}

export async function testSmsConfig(phoneNumber: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!smsConfig.enabled) {
    return { success: false, message: 'SMS notifications are disabled' };
  }

  const testMessage = `[TEST] CPK/SPC Alert System
This is a test message to verify SMS configuration.
Time: ${new Date().toLocaleString('vi-VN')}`;

  const success = await sendSms(phoneNumber, testMessage);
  
  return {
    success,
    message: success ? 'Test SMS sent successfully' : 'Failed to send test SMS',
  };
}

export async function sendSmsForAlert(alertId: number): Promise<{
  success: boolean;
  sentTo: number;
  errors: number;
}> {
  await getSmsConfig();

  if (!smsConfig.enabled || smsConfig.recipients.length === 0) {
    return { success: false, sentTo: 0, errors: 0 };
  }

  const db = await getDb();
  if (!db) return { success: false, sentTo: 0, errors: 0 };

  const [alert] = await db.select()
    .from(kpiAlertStats)
    .where(eq(kpiAlertStats.id, alertId));

  if (!alert) {
    return { success: false, sentTo: 0, errors: 0 };
  }

  let productionLineName: string | undefined;
  if (alert.productionLineId) {
    const [line] = await db.select()
      .from(productionLines)
      .where(eq(productionLines.id, alert.productionLineId));
    productionLineName = line?.name;
  }

  const alertWithDetails = {
    ...alert,
    productionLineName,
    minutesSinceCreated: Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 60000),
  };

  const message = formatSmsMessage(alertWithDetails);
  let sentTo = 0;
  let errors = 0;

  for (const phone of smsConfig.recipients) {
    const success = await sendSms(phone, message);
    if (success) {
      sentTo++;
    } else {
      errors++;
    }
  }

  if (sentTo > 0) {
    await logSmsSent(alertId, sentTo);
  }

  return { success: sentTo > 0, sentTo, errors };
}

let checkInterval: NodeJS.Timeout | null = null;

export function startCriticalAlertSmsChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
  }

  checkAndSendCriticalAlertSms().catch(console.error);

  checkInterval = setInterval(() => {
    checkAndSendCriticalAlertSms().catch(console.error);
  }, 5 * 60 * 1000);

  console.log('[SMS] Critical alert SMS checker started');
}

export function stopCriticalAlertSmsChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    console.log('[SMS] Critical alert SMS checker stopped');
  }
}
