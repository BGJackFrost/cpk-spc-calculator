/**
 * IoT Notification Service
 * Gửi thông báo qua Email/Telegram khi có IoT alarm critical
 */

import { sendEmail } from '../emailService';
import { sendTelegramAlert } from './telegramService';
import { notifyOwner } from '../_core/notification';
import { getDb } from '../db';
import { iotAlarms, iotDevices, emailNotificationSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Notification channels
export type NotificationChannel = 'email' | 'telegram' | 'owner' | 'all';

// Alarm severity levels
export type AlarmSeverity = 'warning' | 'error' | 'critical';

// Notification result
export interface NotificationResult {
  channel: string;
  success: boolean;
  error?: string;
  timestamp: Date;
}

// IoT Alarm data for notification
export interface IotAlarmNotification {
  alarmId: number;
  deviceId: number;
  deviceCode?: string;
  deviceName?: string;
  alarmType: AlarmSeverity;
  alarmCode: string;
  message: string;
  value?: string | number;
  threshold?: string | number;
  location?: string;
  createdAt: Date;
}

/**
 * Get device info by ID
 */
async function getDeviceInfo(deviceId: number): Promise<{ deviceCode: string; deviceName: string; location?: string } | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const [device] = await db.select().from(iotDevices).where(eq(iotDevices.id, deviceId));
    if (!device) return null;

    return {
      deviceCode: device.deviceCode,
      deviceName: device.deviceName,
      location: device.location || undefined,
    };
  } catch (error) {
    console.error('Error getting device info:', error);
    return null;
  }
}

/**
 * Format alarm message for email
 */
function formatEmailContent(alarm: IotAlarmNotification): string {
  const severityColors: Record<AlarmSeverity, string> = {
    warning: '#f59e0b',
    error: '#ef4444',
    critical: '#dc2626',
  };

  const severityLabels: Record<AlarmSeverity, string> = {
    warning: '⚠️ Warning',
    error: '❌ Error',
    critical: '🔴 CRITICAL',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${severityColors[alarm.alarmType]}; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
        .info-row { display: flex; margin-bottom: 10px; }
        .label { font-weight: bold; width: 120px; color: #6b7280; }
        .value { flex: 1; }
        .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0;">${severityLabels[alarm.alarmType]} - IoT Alarm</h2>
        </div>
        <div class="content">
          <div class="info-row">
            <span class="label">Thiết bị:</span>
            <span class="value">${alarm.deviceName || 'N/A'} (${alarm.deviceCode || 'N/A'})</span>
          </div>
          <div class="info-row">
            <span class="label">Mã cảnh báo:</span>
            <span class="value">${alarm.alarmCode}</span>
          </div>
          <div class="info-row">
            <span class="label">Nội dung:</span>
            <span class="value">${alarm.message}</span>
          </div>
          ${alarm.value ? `
          <div class="info-row">
            <span class="label">Giá trị:</span>
            <span class="value">${alarm.value}${alarm.threshold ? ` / Ngưỡng: ${alarm.threshold}` : ''}</span>
          </div>
          ` : ''}
          ${alarm.location ? `
          <div class="info-row">
            <span class="label">Vị trí:</span>
            <span class="value">${alarm.location}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="label">Thời gian:</span>
            <span class="value">${alarm.createdAt.toLocaleString('vi-VN')}</span>
          </div>
        </div>
        <div class="footer">
          <p>Đây là email tự động từ hệ thống IoT Monitoring. Vui lòng không trả lời email này.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send email notification for IoT alarm
 */
async function sendEmailNotification(alarm: IotAlarmNotification, recipients: string[]): Promise<NotificationResult> {
  if (recipients.length === 0) {
    return {
      channel: 'email',
      success: false,
      error: 'No recipients configured',
      timestamp: new Date(),
    };
  }

  const severityLabels: Record<AlarmSeverity, string> = {
    warning: 'Warning',
    error: 'Error',
    critical: 'CRITICAL',
  };

  const subject = `[IoT Alert - ${severityLabels[alarm.alarmType]}] ${alarm.alarmCode} - ${alarm.deviceName || alarm.deviceCode}`;
  const html = formatEmailContent(alarm);

  try {
    const result = await sendEmail(recipients, subject, html);
    return {
      channel: 'email',
      success: result.success,
      error: result.error,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      channel: 'email',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Send Telegram notification for IoT alarm
 */
async function sendTelegramNotification(alarm: IotAlarmNotification): Promise<NotificationResult> {
  try {
    const result = await sendTelegramAlert('iot_critical', {
      deviceName: alarm.deviceName || alarm.deviceCode,
      sensorType: alarm.alarmCode,
      value: alarm.value,
      threshold: alarm.threshold,
      message: alarm.message,
      unit: '',
    });

    return {
      channel: 'telegram',
      success: result.sent > 0,
      error: result.errors.length > 0 ? result.errors.join(', ') : undefined,
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      channel: 'telegram',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Send owner notification for IoT alarm
 */
async function sendOwnerNotification(alarm: IotAlarmNotification): Promise<NotificationResult> {
  const severityEmoji: Record<AlarmSeverity, string> = {
    warning: '⚠️',
    error: '❌',
    critical: '🔴',
  };

  const title = `${severityEmoji[alarm.alarmType]} IoT Alarm: ${alarm.alarmCode}`;
  const content = `
Thiết bị: ${alarm.deviceName || 'N/A'} (${alarm.deviceCode || 'N/A'})
Mức độ: ${alarm.alarmType.toUpperCase()}
Nội dung: ${alarm.message}
${alarm.value ? `Giá trị: ${alarm.value}${alarm.threshold ? ` / Ngưỡng: ${alarm.threshold}` : ''}` : ''}
${alarm.location ? `Vị trí: ${alarm.location}` : ''}
Thời gian: ${alarm.createdAt.toLocaleString('vi-VN')}
  `.trim();

  try {
    const result = await notifyOwner({ title, content });
    return {
      channel: 'owner',
      success: result,
      error: result ? undefined : 'Failed to notify owner',
      timestamp: new Date(),
    };
  } catch (error) {
    return {
      channel: 'owner',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    };
  }
}

/**
 * Get notification preferences from database
 * Uses emailNotificationSettings table to get email recipients
 */
async function getNotificationPreferences(): Promise<{
  emailEnabled: boolean;
  telegramEnabled: boolean;
  ownerEnabled: boolean;
  emailRecipients: string[];
  criticalOnly: boolean;
}> {
  // Default preferences
  const defaults = {
    emailEnabled: true,
    telegramEnabled: true,
    ownerEnabled: true,
    emailRecipients: [],
    criticalOnly: false, // Send for all severity levels
  };

  const db = getDb();
  if (!db) return defaults;

  try {
    // Get active email notification settings
    const emailSettings = await db.select()
      .from(emailNotificationSettings)
      .where(eq(emailNotificationSettings.isActive, 1));
    
    const emailRecipients = emailSettings
      .filter(s => s.email)
      .map(s => s.email);

    return {
      emailEnabled: emailRecipients.length > 0,
      telegramEnabled: true, // Always try Telegram if configured
      ownerEnabled: true, // Always notify owner for critical alarms
      emailRecipients,
      criticalOnly: false, // Send for all severity levels
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return defaults;
  }
}

/**
 * Send IoT alarm notification to all configured channels
 */
export async function sendIotAlarmNotification(
  alarmId: number,
  channels: NotificationChannel = 'all'
): Promise<{
  success: boolean;
  results: NotificationResult[];
  alarm?: IotAlarmNotification;
}> {
  const db = getDb();
  if (!db) {
    return {
      success: false,
      results: [{
        channel: 'system',
        success: false,
        error: 'Database not available',
        timestamp: new Date(),
      }],
    };
  }

  // Get alarm details
  const [alarmData] = await db.select().from(iotAlarms).where(eq(iotAlarms.id, alarmId));
  if (!alarmData) {
    return {
      success: false,
      results: [{
        channel: 'system',
        success: false,
        error: 'Alarm not found',
        timestamp: new Date(),
      }],
    };
  }

  // Get device info
  const deviceInfo = await getDeviceInfo(alarmData.deviceId);

  // Build alarm notification object
  const alarm: IotAlarmNotification = {
    alarmId: alarmData.id,
    deviceId: alarmData.deviceId,
    deviceCode: deviceInfo?.deviceCode,
    deviceName: deviceInfo?.deviceName,
    alarmType: alarmData.alarmType as AlarmSeverity,
    alarmCode: alarmData.alarmCode,
    message: alarmData.message,
    value: alarmData.value || undefined,
    threshold: alarmData.threshold || undefined,
    location: deviceInfo?.location,
    createdAt: new Date(alarmData.createdAt!),
  };

  // Get notification preferences
  const prefs = await getNotificationPreferences();

  // Check if should send notification based on severity
  if (prefs.criticalOnly && alarm.alarmType !== 'critical') {
    return {
      success: true,
      results: [{
        channel: 'system',
        success: true,
        error: 'Skipped: Not a critical alarm',
        timestamp: new Date(),
      }],
      alarm,
    };
  }

  const results: NotificationResult[] = [];

  // Send to email
  if ((channels === 'all' || channels === 'email') && prefs.emailEnabled) {
    const emailResult = await sendEmailNotification(alarm, prefs.emailRecipients);
    results.push(emailResult);
  }

  // Send to Telegram
  if ((channels === 'all' || channels === 'telegram') && prefs.telegramEnabled) {
    const telegramResult = await sendTelegramNotification(alarm);
    results.push(telegramResult);
  }

  // Send to owner
  if ((channels === 'all' || channels === 'owner') && prefs.ownerEnabled) {
    const ownerResult = await sendOwnerNotification(alarm);
    results.push(ownerResult);
  }

  const successCount = results.filter(r => r.success).length;

  return {
    success: successCount > 0,
    results,
    alarm,
  };
}

/**
 * Send notification for critical alarm immediately after creation
 * This should be called from iotDbService.createAlarm when alarmType is 'critical'
 */
export async function notifyOnCriticalAlarm(
  alarmId: number,
  alarmType: string
): Promise<void> {
  // Only send notification for critical alarms
  if (alarmType !== 'critical') {
    return;
  }

  try {
    const result = await sendIotAlarmNotification(alarmId, 'all');
    
    if (!result.success) {
      console.warn('Failed to send critical alarm notification:', result.results);
    } else {
      console.log('Critical alarm notification sent:', result.results.map(r => `${r.channel}: ${r.success}`).join(', '));
    }
  } catch (error) {
    console.error('Error sending critical alarm notification:', error);
  }
}

/**
 * Test notification channels
 */
export async function testNotificationChannels(): Promise<{
  email: NotificationResult;
  telegram: NotificationResult;
  owner: NotificationResult;
}> {
  const testAlarm: IotAlarmNotification = {
    alarmId: 0,
    deviceId: 0,
    deviceCode: 'TEST-001',
    deviceName: 'Test Device',
    alarmType: 'warning',
    alarmCode: 'TEST_NOTIFICATION',
    message: 'This is a test notification from IoT Notification Service',
    value: '25.5',
    threshold: '30',
    location: 'Test Location',
    createdAt: new Date(),
  };

  const prefs = await getNotificationPreferences();

  const emailResult = await sendEmailNotification(testAlarm, prefs.emailRecipients);
  const telegramResult = await sendTelegramNotification(testAlarm);
  const ownerResult = await sendOwnerNotification(testAlarm);

  return {
    email: emailResult,
    telegram: telegramResult,
    owner: ownerResult,
  };
}

export default {
  sendIotAlarmNotification,
  notifyOnCriticalAlarm,
  testNotificationChannels,
};
