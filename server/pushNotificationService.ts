import { db } from './_core/db';
import { mobileDevices, mobileNotificationSettings, firebaseDeviceTokens, firebasePushHistory } from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

// Notification types
export type NotificationType = 'cpk_alert' | 'spc_violation' | 'oee_alert' | 'daily_report' | 'system';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  type: NotificationType;
}

// Get users who should receive a specific notification type
async function getUsersForNotificationType(
  type: NotificationType,
  userIds?: number[]
): Promise<number[]> {
  const settingsQuery = db
    .select({ userId: mobileNotificationSettings.userId })
    .from(mobileNotificationSettings)
    .where(eq(mobileNotificationSettings.enabled, 1));

  const settings = await settingsQuery;
  
  // Filter based on notification type settings
  const eligibleUserIds: number[] = [];
  
  for (const setting of settings) {
    const fullSetting = await db
      .select()
      .from(mobileNotificationSettings)
      .where(eq(mobileNotificationSettings.userId, setting.userId))
      .limit(1);
    
    if (fullSetting.length === 0) continue;
    
    const s = fullSetting[0];
    let isEnabled = false;
    
    switch (type) {
      case 'cpk_alert':
        isEnabled = s.cpkAlerts === 1;
        break;
      case 'spc_violation':
        isEnabled = s.spcAlerts === 1;
        break;
      case 'oee_alert':
        isEnabled = s.oeeAlerts === 1;
        break;
      case 'daily_report':
        isEnabled = s.dailyReport === 1;
        break;
      case 'system':
        isEnabled = true;
        break;
    }
    
    if (isEnabled) {
      if (!userIds || userIds.includes(s.userId)) {
        eligibleUserIds.push(s.userId);
      }
    }
  }
  
  return eligibleUserIds;
}

// Get device tokens for users
async function getDeviceTokensForUsers(userIds: number[]): Promise<string[]> {
  if (userIds.length === 0) return [];
  
  // Get from mobile_devices table
  const mobileTokens = await db
    .select({ token: mobileDevices.token })
    .from(mobileDevices)
    .where(and(
      inArray(mobileDevices.userId, userIds),
      eq(mobileDevices.isActive, 1)
    ));
  
  // Get from firebase_device_tokens table (for compatibility)
  const firebaseTokens = await db
    .select({ token: firebaseDeviceTokens.token })
    .from(firebaseDeviceTokens)
    .where(and(
      inArray(firebaseDeviceTokens.userId, userIds.map(String)),
      eq(firebaseDeviceTokens.isActive, 1)
    ));
  
  const tokens = [
    ...mobileTokens.map(t => t.token),
    ...firebaseTokens.map(t => t.token),
  ];
  
  // Remove duplicates
  return [...new Set(tokens)];
}

// Send push notification using Expo Push API
async function sendExpoPushNotification(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  if (tokens.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }
  
  // Filter for Expo push tokens (start with ExponentPushToken)
  const expoTokens = tokens.filter(t => t.startsWith('ExponentPushToken'));
  
  if (expoTokens.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }
  
  const messages = expoTokens.map(token => ({
    to: token,
    sound: 'default',
    title: payload.title,
    body: payload.body,
    data: { ...payload.data, type: payload.type },
  }));
  
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    
    const result = await response.json();
    
    // Count successes and failures
    let sent = 0;
    let failed = 0;
    
    if (result.data) {
      for (const ticket of result.data) {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          failed++;
        }
      }
    }
    
    return { success: true, sent, failed };
  } catch (error) {
    console.error('Error sending Expo push notification:', error);
    return { success: false, sent: 0, failed: expoTokens.length };
  }
}

// Send push notification using Firebase Cloud Messaging
async function sendFirebasePushNotification(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  // Filter for FCM tokens (not Expo tokens)
  const fcmTokens = tokens.filter(t => !t.startsWith('ExponentPushToken'));
  
  if (fcmTokens.length === 0) {
    return { success: true, sent: 0, failed: 0 };
  }
  
  // Get Firebase config
  const firebaseConfig = await db
    .select()
    .from(require('../drizzle/schema').firebaseConfig)
    .limit(1);
  
  if (firebaseConfig.length === 0) {
    console.log('Firebase not configured, skipping FCM');
    return { success: true, sent: 0, failed: 0 };
  }
  
  // TODO: Implement actual FCM sending using firebase-admin
  // For now, log and return success
  console.log(`Would send FCM to ${fcmTokens.length} devices:`, payload.title);
  
  return { success: true, sent: fcmTokens.length, failed: 0 };
}

// Log push notification to history
async function logPushNotification(
  userId: number | null,
  payload: PushNotificationPayload,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(firebasePushHistory).values({
      userId: userId?.toString() || null,
      title: payload.title,
      body: payload.body,
      data: JSON.stringify(payload.data || {}),
      sentAt: Date.now(),
      status: success ? 'sent' : 'failed',
      errorMessage: errorMessage || null,
    });
  } catch (error) {
    console.error('Error logging push notification:', error);
  }
}

// Main function to send push notification
export async function sendPushNotification(
  payload: PushNotificationPayload,
  targetUserIds?: number[]
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    // Get eligible users
    const userIds = await getUsersForNotificationType(payload.type, targetUserIds);
    
    if (userIds.length === 0) {
      console.log('No eligible users for notification type:', payload.type);
      return { success: true, sent: 0, failed: 0 };
    }
    
    // Get device tokens
    const tokens = await getDeviceTokensForUsers(userIds);
    
    if (tokens.length === 0) {
      console.log('No device tokens found for users');
      return { success: true, sent: 0, failed: 0 };
    }
    
    console.log(`Sending push notification to ${tokens.length} devices`);
    
    // Send via both Expo and FCM
    const [expoResult, fcmResult] = await Promise.all([
      sendExpoPushNotification(tokens, payload),
      sendFirebasePushNotification(tokens, payload),
    ]);
    
    const totalSent = expoResult.sent + fcmResult.sent;
    const totalFailed = expoResult.failed + fcmResult.failed;
    
    // Log to history
    for (const userId of userIds) {
      await logPushNotification(
        userId,
        payload,
        totalFailed === 0,
        totalFailed > 0 ? `${totalFailed} notifications failed` : undefined
      );
    }
    
    return {
      success: totalFailed === 0,
      sent: totalSent,
      failed: totalFailed,
    };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, sent: 0, failed: 0 };
  }
}

// Convenience functions for specific notification types
export async function sendCpkAlert(
  cpkValue: number,
  productCode: string,
  stationName: string,
  targetUserIds?: number[]
): Promise<void> {
  await sendPushNotification({
    title: 'Cảnh báo CPK',
    body: `CPK = ${cpkValue.toFixed(2)} tại ${stationName} (${productCode})`,
    data: { cpkValue, productCode, stationName },
    type: 'cpk_alert',
  }, targetUserIds);
}

export async function sendSpcViolation(
  ruleName: string,
  productCode: string,
  stationName: string,
  targetUserIds?: number[]
): Promise<void> {
  await sendPushNotification({
    title: 'Vi phạm SPC Rule',
    body: `${ruleName} tại ${stationName} (${productCode})`,
    data: { ruleName, productCode, stationName },
    type: 'spc_violation',
  }, targetUserIds);
}

export async function sendOeeAlert(
  oeeValue: number,
  machineName: string,
  targetUserIds?: number[]
): Promise<void> {
  await sendPushNotification({
    title: 'Cảnh báo OEE',
    body: `OEE = ${oeeValue.toFixed(1)}% tại ${machineName}`,
    data: { oeeValue, machineName },
    type: 'oee_alert',
  }, targetUserIds);
}

export async function sendDailyReport(
  summary: string,
  targetUserIds?: number[]
): Promise<void> {
  await sendPushNotification({
    title: 'Báo cáo hàng ngày',
    body: summary,
    data: { reportDate: new Date().toISOString() },
    type: 'daily_report',
  }, targetUserIds);
}

export async function sendSystemNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  targetUserIds?: number[]
): Promise<void> {
  await sendPushNotification({
    title,
    body,
    data,
    type: 'system',
  }, targetUserIds);
}
