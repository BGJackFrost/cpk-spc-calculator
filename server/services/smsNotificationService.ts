/**
 * SMS Notification Service using Twilio
 * Handles sending SMS notifications for work orders and alerts
 */

import twilio from 'twilio';

// Types
export interface SmsNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

// Singleton Twilio client
let twilioClient: ReturnType<typeof twilio> | null = null;

/**
 * Get Twilio configuration from environment variables
 */
function getTwilioConfig(): SmsConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return null;
  }

  return { accountSid, authToken, fromNumber };
}

/**
 * Initialize Twilio client
 */
function initializeTwilioClient(): ReturnType<typeof twilio> | null {
  if (twilioClient) {
    return twilioClient;
  }

  const config = getTwilioConfig();
  if (!config) {
    console.log('[SMS] Twilio credentials not configured');
    return null;
  }

  try {
    twilioClient = twilio(config.accountSid, config.authToken);
    console.log('[SMS] Twilio client initialized successfully');
    return twilioClient;
  } catch (error) {
    console.error('[SMS] Failed to initialize Twilio client:', error);
    return null;
  }
}

/**
 * Check if SMS is configured
 */
export function isSmsConfigured(): boolean {
  const config = getTwilioConfig();
  return config !== null;
}

/**
 * Send SMS notification
 */
export async function sendSmsNotification(
  toNumber: string,
  message: string
): Promise<SmsNotificationResult> {
  const client = initializeTwilioClient();
  if (!client) {
    return {
      success: false,
      error: 'Twilio client not configured',
    };
  }

  const config = getTwilioConfig();
  if (!config) {
    return {
      success: false,
      error: 'Twilio configuration missing',
    };
  }

  try {
    // Format phone number if needed
    const formattedNumber = formatPhoneNumber(toNumber);

    const result = await client.messages.create({
      body: message,
      from: config.fromNumber,
      to: formattedNumber,
    });

    console.log(`[SMS] Message sent successfully: ${result.sid}`);

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    console.error('[SMS] Error sending message:', error);

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Send bulk SMS notifications
 */
export async function sendBulkSmsNotifications(
  recipients: Array<{ phone: string; message: string }>
): Promise<{ sent: number; failed: number; results: SmsNotificationResult[] }> {
  const results: SmsNotificationResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendSmsNotification(recipient.phone, recipient.message);
    results.push(result);

    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Add small delay between messages to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { sent, failed, results };
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let formatted = phone.replace(/[^\d+]/g, '');

  // If number doesn't start with +, assume Vietnam (+84)
  if (!formatted.startsWith('+')) {
    // Remove leading 0 if present
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }
    formatted = '+84' + formatted;
  }

  return formatted;
}

/**
 * Send work order notification SMS
 */
export async function sendWorkOrderSms(
  toNumber: string,
  workOrderNumber: string,
  title: string,
  type: 'new' | 'assigned' | 'due_soon' | 'overdue' | 'completed'
): Promise<SmsNotificationResult> {
  const messages: Record<string, string> = {
    new: `[CPK-SPC] Work Order mới: ${workOrderNumber} - ${title}. Vui lòng kiểm tra hệ thống.`,
    assigned: `[CPK-SPC] Bạn được gán Work Order: ${workOrderNumber} - ${title}. Vui lòng xử lý.`,
    due_soon: `[CPK-SPC] Work Order sắp đến hạn: ${workOrderNumber} - ${title}. Hoàn thành trước thời hạn.`,
    overdue: `[CPK-SPC] CẢNH BÁO: Work Order quá hạn: ${workOrderNumber} - ${title}. Xử lý ngay!`,
    completed: `[CPK-SPC] Work Order hoàn thành: ${workOrderNumber} - ${title}.`,
  };

  const message = messages[type] || `[CPK-SPC] Work Order: ${workOrderNumber} - ${title}`;

  return sendSmsNotification(toNumber, message);
}

/**
 * Send alert SMS
 */
export async function sendAlertSms(
  toNumber: string,
  alertType: string,
  severity: 'info' | 'warning' | 'critical',
  message: string
): Promise<SmsNotificationResult> {
  const severityEmoji: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
  };

  const smsMessage = `${severityEmoji[severity]} [CPK-SPC] ${alertType}: ${message}`;

  return sendSmsNotification(toNumber, smsMessage);
}

export default {
  isSmsConfigured,
  sendSmsNotification,
  sendBulkSmsNotifications,
  sendWorkOrderSms,
  sendAlertSms,
};
