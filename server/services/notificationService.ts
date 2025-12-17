import { getDb } from "../db";
import { sql } from "drizzle-orm";

export type ChannelType = 'email' | 'sms' | 'push' | 'webhook';

export interface NotificationChannel {
  id: number;
  userId: number;
  channelType: ChannelType;
  channelConfig: {
    // Email
    email?: string;
    // SMS
    phoneNumber?: string;
    provider?: 'twilio' | 'vonage';
    // Push
    fcmToken?: string;
    // Webhook
    webhookUrl?: string;
    headers?: Record<string, string>;
  };
  enabled: boolean;
}

export interface SendNotificationOptions {
  userId?: number;
  channelType: ChannelType;
  recipient: string;
  subject?: string;
  message: string;
  config?: Record<string, any>;
}

// Get user's notification channels
export async function getUserChannels(userId: number): Promise<NotificationChannel[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM notification_channels WHERE userId = ${userId} AND enabled = 1
  `);
  
  return ((result as unknown as any[])[0] as any[]).map(row => ({
    id: row.id,
    userId: row.userId,
    channelType: row.channelType,
    channelConfig: row.channelConfig ? JSON.parse(row.channelConfig) : {},
    enabled: row.enabled === 1,
  }));
}

// Create or update notification channel
export async function upsertChannel(
  userId: number, 
  channelType: ChannelType, 
  config: Record<string, any>,
  enabled: boolean = true
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const configJson = JSON.stringify(config);
  
  // Check if exists
  const existing = await db.execute(sql`
    SELECT id FROM notification_channels WHERE userId = ${userId} AND channelType = ${channelType}
  `);
  
  if (((existing as unknown as any[])[0] as any[]).length > 0) {
    const id = ((existing as unknown as any[])[0] as any[])[0].id;
    await db.execute(sql.raw(`
      UPDATE notification_channels SET channelConfig = '${configJson}', enabled = ${enabled ? 1 : 0} WHERE id = ${id}
    `));
    return id;
  }
  
  const result = await db.execute(sql.raw(`
    INSERT INTO notification_channels (userId, channelType, channelConfig, enabled) 
    VALUES (${userId}, '${channelType}', '${configJson}', ${enabled ? 1 : 0})
  `));
  
  return (result as any)[0].insertId;
}

// Delete notification channel
export async function deleteChannel(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.execute(sql`DELETE FROM notification_channels WHERE id = ${id}`);
}

// Log notification
async function logNotification(
  userId: number | null,
  channelType: ChannelType,
  recipient: string,
  subject: string | null,
  message: string,
  status: 'pending' | 'sent' | 'failed',
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.execute(sql.raw(`
    INSERT INTO notification_logs (userId, channelType, recipient, subject, message, status, errorMessage, sentAt)
    VALUES (${userId || 'NULL'}, '${channelType}', '${recipient}', ${subject ? `'${subject}'` : 'NULL'}, '${message.replace(/'/g, "''")}', '${status}', ${errorMessage ? `'${errorMessage.replace(/'/g, "''")}'` : 'NULL'}, ${status === 'sent' ? 'NOW()' : 'NULL'})
  `));
}

// Send SMS via Twilio (placeholder - requires API key)
async function sendSms(phoneNumber: string, message: string, config?: Record<string, any>): Promise<boolean> {
  // Check for Twilio credentials
  const accountSid = process.env.TWILIO_ACCOUNT_SID || config?.accountSid;
  const authToken = process.env.TWILIO_AUTH_TOKEN || config?.authToken;
  const fromNumber = process.env.TWILIO_FROM_NUMBER || config?.fromNumber;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.log("[SMS] Twilio credentials not configured, skipping SMS");
    return false;
  }
  
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: fromNumber,
          Body: message,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      console.error("[SMS] Twilio error:", error);
      return false;
    }
    
    console.log(`[SMS] Sent to ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error("[SMS] Error:", error);
    return false;
  }
}

// Send Push notification via Firebase (placeholder - requires API key)
async function sendPush(fcmToken: string, title: string, body: string, config?: Record<string, any>): Promise<boolean> {
  const serverKey = process.env.FCM_SERVER_KEY || config?.serverKey;
  
  if (!serverKey) {
    console.log("[Push] FCM server key not configured, skipping push notification");
    return false;
  }
  
  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: fcmToken,
        notification: {
          title,
          body,
        },
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error("[Push] FCM error:", error);
      return false;
    }
    
    console.log(`[Push] Sent to token ${fcmToken.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error("[Push] Error:", error);
    return false;
  }
}

// Send Webhook notification
async function sendWebhook(url: string, payload: Record<string, any>, headers?: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      console.error("[Webhook] Error:", response.status, await response.text());
      return false;
    }
    
    console.log(`[Webhook] Sent to ${url}`);
    return true;
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return false;
  }
}

// Main send notification function
export async function sendNotification(options: SendNotificationOptions): Promise<boolean> {
  const { userId, channelType, recipient, subject, message, config } = options;
  
  try {
    let success = false;
    
    switch (channelType) {
      case 'email':
        // Use existing email service
        const { sendAlertEmail } = await import("./emailService");
        success = await sendAlertEmail(recipient, subject || 'Thông báo', message);
        break;
        
      case 'sms':
        success = await sendSms(recipient, message, config);
        break;
        
      case 'push':
        success = await sendPush(recipient, subject || 'Thông báo', message, config);
        break;
        
      case 'webhook':
        success = await sendWebhook(recipient, { subject, message, timestamp: new Date().toISOString() }, config?.headers);
        break;
    }
    
    await logNotification(userId || null, channelType, recipient, subject || null, message, success ? 'sent' : 'failed');
    
    return success;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logNotification(userId || null, channelType, recipient, subject || null, message, 'failed', errorMessage);
    return false;
  }
}

// Send NTF critical alert to all configured channels
export async function sendNtfCriticalAlert(
  ntfRate: number,
  totalDefects: number,
  ntfCount: number,
  realNgCount: number
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };
  
  const subject = `[CRITICAL] NTF Rate vượt ngưỡng: ${ntfRate.toFixed(1)}%`;
  const message = `
Cảnh báo NTF Rate nghiêm trọng!

NTF Rate: ${ntfRate.toFixed(1)}%
Tổng lỗi: ${totalDefects}
NTF: ${ntfCount}
Real NG: ${realNgCount}

Vui lòng kiểm tra và xử lý ngay.
Thời gian: ${new Date().toLocaleString('vi-VN')}
  `.trim();
  
  // Get all enabled channels for admin users
  const channelsResult = await db.execute(sql`
    SELECT nc.*, u.role FROM notification_channels nc
    JOIN users u ON nc.userId = u.id
    WHERE nc.enabled = 1 AND u.role = 'admin'
  `);
  
  const channels = (channelsResult as unknown as any[])[0] as any[];
  let sent = 0;
  let failed = 0;
  
  for (const channel of channels) {
    const config = channel.channelConfig ? JSON.parse(channel.channelConfig) : {};
    let recipient = '';
    
    switch (channel.channelType) {
      case 'email':
        recipient = config.email;
        break;
      case 'sms':
        recipient = config.phoneNumber;
        break;
      case 'push':
        recipient = config.fcmToken;
        break;
      case 'webhook':
        recipient = config.webhookUrl;
        break;
    }
    
    if (recipient) {
      const success = await sendNotification({
        userId: channel.userId,
        channelType: channel.channelType,
        recipient,
        subject,
        message,
        config,
      });
      
      if (success) sent++;
      else failed++;
    }
  }
  
  return { sent, failed };
}

// Get notification logs
export async function getNotificationLogs(limit: number = 50): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM notification_logs ORDER BY createdAt DESC LIMIT ${limit}
  `);
  
  return (result as unknown as any[])[0] as any[];
}
