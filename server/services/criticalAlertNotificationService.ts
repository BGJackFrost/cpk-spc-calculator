/**
 * Critical Alert Notification Service
 * Gửi email và SMS khi có alert critical
 */

import { getDb } from '../db';
import { sendEmail, getSmtpConfig } from '../emailService';
import { systemSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Twilio config interface
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  enabled: boolean;
}

// Alert interface
export interface CriticalAlert {
  id: number;
  alertType: string;
  severity: 'warning' | 'critical';
  alertMessage: string;
  currentValue: number;
  thresholdValue: number;
  productionLineId?: number;
  productionLineName?: string;
  machineId?: number;
  machineName?: string;
  createdAt: Date;
}

// Notification result
interface NotificationResult {
  email: { sent: boolean; error?: string };
  sms: { sent: boolean; error?: string };
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
    console.error(`[CriticalAlertNotification] Error getting setting ${key}:`, error);
    return null;
  }
}

/**
 * Get Twilio configuration from system settings
 */
export async function getTwilioConfig(): Promise<TwilioConfig | null> {
  try {
    const accountSid = await getSystemSetting('twilio_account_sid');
    const authToken = await getSystemSetting('twilio_auth_token');
    const fromNumber = await getSystemSetting('twilio_from_number');
    const enabled = await getSystemSetting('twilio_enabled');

    if (!accountSid || !authToken || !fromNumber) {
      return null;
    }

    return {
      accountSid,
      authToken,
      fromNumber,
      enabled: enabled === 'true',
    };
  } catch (error) {
    console.error('[CriticalAlertNotification] Error getting Twilio config:', error);
    return null;
  }
}

/**
 * Send SMS via Twilio
 */
export async function sendSms(
  toNumber: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getTwilioConfig();

  if (!config || !config.enabled) {
    return { success: false, error: 'Twilio not configured or disabled' };
  }

  try {
    // Use fetch to call Twilio API directly
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64'),
      },
      body: new URLSearchParams({
        To: toNumber,
        From: config.fromNumber,
        Body: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, error: errorData.message || 'Twilio API error' };
    }

    return { success: true };
  } catch (error) {
    console.error('[CriticalAlertNotification] Error sending SMS:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get alert recipients from system settings
 */
export async function getAlertRecipients(): Promise<{
  emails: string[];
  phoneNumbers: string[];
}> {
  const emailsStr = await getSystemSetting('critical_alert_emails');
  const phonesStr = await getSystemSetting('critical_alert_phones');

  return {
    emails: emailsStr ? emailsStr.split(',').map(e => e.trim()).filter(Boolean) : [],
    phoneNumbers: phonesStr ? phonesStr.split(',').map(p => p.trim()).filter(Boolean) : [],
  };
}

/**
 * Send notification for critical alert
 */
export async function sendCriticalAlertNotification(
  alert: CriticalAlert
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: { sent: false },
    sms: { sent: false },
  };

  // Only send notifications for critical alerts
  if (alert.severity !== 'critical') {
    return result;
  }

  const recipients = await getAlertRecipients();

  // Send email notifications
  if (recipients.emails.length > 0) {
    try {
      const smtpConfig = await getSmtpConfig();
      if (smtpConfig) {
        const subject = `🚨 Critical Alert: ${alert.alertType}`;
        const body = `
          <h2>Critical Alert Notification</h2>
          <p><strong>Alert Type:</strong> ${alert.alertType}</p>
          <p><strong>Message:</strong> ${alert.alertMessage}</p>
          <p><strong>Current Value:</strong> ${alert.currentValue}</p>
          <p><strong>Threshold:</strong> ${alert.thresholdValue}</p>
          ${alert.productionLineName ? `<p><strong>Production Line:</strong> ${alert.productionLineName}</p>` : ''}
          ${alert.machineName ? `<p><strong>Machine:</strong> ${alert.machineName}</p>` : ''}
          <p><strong>Time:</strong> ${alert.createdAt.toLocaleString()}</p>
          <hr>
          <p>Please take immediate action to resolve this issue.</p>
        `;

        for (const email of recipients.emails) {
          await sendEmail(email, subject, body);
        }
        result.email.sent = true;
      }
    } catch (error) {
      result.email.error = error instanceof Error ? error.message : 'Email send failed';
    }
  }

  // Send SMS notifications
  if (recipients.phoneNumbers.length > 0) {
    try {
      const smsMessage = `🚨 CRITICAL: ${alert.alertType} - ${alert.alertMessage}. Value: ${alert.currentValue}, Threshold: ${alert.thresholdValue}`;
      
      for (const phone of recipients.phoneNumbers) {
        const smsResult = await sendSms(phone, smsMessage);
        if (smsResult.success) {
          result.sms.sent = true;
        } else {
          result.sms.error = smsResult.error;
        }
      }
    } catch (error) {
      result.sms.error = error instanceof Error ? error.message : 'SMS send failed';
    }
  }

  // Log notification
  try {
    const db = await getDb();
    if (db) {
      await db.execute({
        sql: `INSERT INTO alert_notification_logs (alert_id, email_sent, email_error, sms_sent, sms_error) VALUES (?, ?, ?, ?, ?)`,
        args: [
          alert.id,
          result.email.sent ? 1 : 0,
          result.email.error || null,
          result.sms.sent ? 1 : 0,
          result.sms.error || null,
        ],
      } as any);
    }
  } catch (error) {
    console.error('[CriticalAlertNotification] Error logging notification:', error);
  }

  return result;
}
