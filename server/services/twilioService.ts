/**
 * Twilio SMS Service - Real integration with Twilio SDK
 */
import Twilio from 'twilio';
import { getDb } from '../db';
import { systemSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Types
export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  enabled: boolean;
}

export interface SmsSendResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  to: string;
  body: string;
  timestamp: Date;
}

export interface SmsHistoryEntry {
  id: string;
  to: string;
  body: string;
  status: 'sent' | 'failed' | 'pending';
  messageSid?: string;
  error?: string;
  createdAt: Date;
  alertId?: number;
  alertType?: string;
}

// In-memory SMS history (in production, this should be stored in database)
const smsHistory: SmsHistoryEntry[] = [];

/**
 * Get Twilio configuration from database
 */
export async function getTwilioConfig(): Promise<TwilioConfig | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const settings = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.category, 'twilio'));
    
    if (settings.length === 0) {
      return null;
    }

    const config: TwilioConfig = {
      accountSid: '',
      authToken: '',
      fromNumber: '',
      enabled: false,
    };

    for (const setting of settings) {
      switch (setting.key) {
        case 'twilio_account_sid':
          config.accountSid = setting.value || '';
          break;
        case 'twilio_auth_token':
          config.authToken = setting.value || '';
          break;
        case 'twilio_from_number':
          config.fromNumber = setting.value || '';
          break;
        case 'twilio_enabled':
          config.enabled = setting.value === 'true';
          break;
      }
    }

    return config;
  } catch (error) {
    console.error('[TwilioService] Error getting config:', error);
    return null;
  }
}

/**
 * Save Twilio configuration to database
 */
export async function saveTwilioConfig(config: TwilioConfig): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    const settings = [
      { category: 'twilio', key: 'twilio_account_sid', value: config.accountSid },
      { category: 'twilio', key: 'twilio_auth_token', value: config.authToken },
      { category: 'twilio', key: 'twilio_from_number', value: config.fromNumber },
      { category: 'twilio', key: 'twilio_enabled', value: config.enabled.toString() },
    ];

    for (const setting of settings) {
      // Check if setting exists
      const existing = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, setting.key));

      if (existing.length > 0) {
        await db
          .update(systemSettings)
          .set({ value: setting.value, updatedAt: new Date() })
          .where(eq(systemSettings.key, setting.key));
      } else {
        await db.insert(systemSettings).values({
          category: setting.category,
          key: setting.key,
          value: setting.value,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return true;
  } catch (error) {
    console.error('[TwilioService] Error saving config:', error);
    return false;
  }
}

/**
 * Send SMS using Twilio SDK
 */
export async function sendSms(
  to: string,
  body: string,
  alertId?: number,
  alertType?: string
): Promise<SmsSendResult> {
  const historyEntry: SmsHistoryEntry = {
    id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    to,
    body,
    status: 'pending',
    createdAt: new Date(),
    alertId,
    alertType,
  };

  try {
    const config = await getTwilioConfig();
    
    if (!config) {
      historyEntry.status = 'failed';
      historyEntry.error = 'Twilio configuration not found';
      smsHistory.unshift(historyEntry);
      return {
        success: false,
        error: 'Twilio configuration not found',
        to,
        body,
        timestamp: new Date(),
      };
    }

    if (!config.enabled) {
      historyEntry.status = 'failed';
      historyEntry.error = 'Twilio SMS is disabled';
      smsHistory.unshift(historyEntry);
      return {
        success: false,
        error: 'Twilio SMS is disabled',
        to,
        body,
        timestamp: new Date(),
      };
    }

    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      historyEntry.status = 'failed';
      historyEntry.error = 'Incomplete Twilio configuration';
      smsHistory.unshift(historyEntry);
      return {
        success: false,
        error: 'Incomplete Twilio configuration',
        to,
        body,
        timestamp: new Date(),
      };
    }

    // Create Twilio client
    const client = Twilio(config.accountSid, config.authToken);

    // Send SMS
    const message = await client.messages.create({
      body,
      from: config.fromNumber,
      to,
    });

    historyEntry.status = 'sent';
    historyEntry.messageSid = message.sid;
    smsHistory.unshift(historyEntry);

    console.log(`[TwilioService] SMS sent successfully to ${to}, SID: ${message.sid}`);

    return {
      success: true,
      messageSid: message.sid,
      to,
      body,
      timestamp: new Date(),
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    historyEntry.status = 'failed';
    historyEntry.error = errorMessage;
    smsHistory.unshift(historyEntry);

    console.error(`[TwilioService] Failed to send SMS to ${to}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
      to,
      body,
      timestamp: new Date(),
    };
  }
}

/**
 * Send test SMS to verify configuration
 */
export async function sendTestSms(to: string): Promise<SmsSendResult> {
  const testMessage = `[SPC/CPK System] Test SMS from Twilio integration. Time: ${new Date().toLocaleString('vi-VN')}`;
  return sendSms(to, testMessage, undefined, 'test');
}

/**
 * Send alert SMS
 */
export async function sendAlertSms(
  to: string,
  alertType: string,
  alertMessage: string,
  alertId?: number
): Promise<SmsSendResult> {
  const body = `[ALERT] ${alertType}\n${alertMessage}\nTime: ${new Date().toLocaleString('vi-VN')}`;
  return sendSms(to, body, alertId, alertType);
}

/**
 * Send critical alert SMS to multiple recipients
 */
export async function sendCriticalAlertSms(
  recipients: string[],
  alertType: string,
  alertMessage: string,
  alertId?: number
): Promise<SmsSendResult[]> {
  const results: SmsSendResult[] = [];
  
  for (const to of recipients) {
    const result = await sendAlertSms(to, alertType, alertMessage, alertId);
    results.push(result);
    
    // Small delay between messages to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * Get SMS history
 */
export function getSmsHistory(limit: number = 100): SmsHistoryEntry[] {
  return smsHistory.slice(0, limit);
}

/**
 * Get SMS history by alert ID
 */
export function getSmsHistoryByAlertId(alertId: number): SmsHistoryEntry[] {
  return smsHistory.filter(entry => entry.alertId === alertId);
}

/**
 * Get SMS statistics
 */
export function getSmsStatistics(): {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  lastSent?: Date;
} {
  const sent = smsHistory.filter(e => e.status === 'sent').length;
  const failed = smsHistory.filter(e => e.status === 'failed').length;
  const pending = smsHistory.filter(e => e.status === 'pending').length;
  const lastSentEntry = smsHistory.find(e => e.status === 'sent');
  
  return {
    total: smsHistory.length,
    sent,
    failed,
    pending,
    lastSent: lastSentEntry?.createdAt,
  };
}

/**
 * Clear SMS history
 */
export function clearSmsHistory(): void {
  smsHistory.length = 0;
}

/**
 * Verify Twilio credentials
 */
export async function verifyTwilioCredentials(
  accountSid: string,
  authToken: string
): Promise<{ valid: boolean; error?: string; accountName?: string }> {
  try {
    const client = Twilio(accountSid, authToken);
    const account = await client.api.accounts(accountSid).fetch();
    
    return {
      valid: true,
      accountName: account.friendlyName,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || 'Invalid credentials',
    };
  }
}
