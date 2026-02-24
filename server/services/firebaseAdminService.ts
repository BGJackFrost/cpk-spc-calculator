/**
 * Firebase Admin SDK Service - Gửi Push Notification thực tế đến thiết bị mobile
 */

import admin from 'firebase-admin';
import { getDb } from '../db';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';

// Types
export interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  priority?: 'high' | 'normal';
  badge?: number;
  sound?: string;
  channelId?: string;
}

export interface PushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  responses?: Array<{
    token: string;
    success: boolean;
    error?: string;
    messageId?: string;
  }>;
}

export interface DeviceToken {
  id: number;
  userId: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  deviceName?: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

// Firebase Admin singleton
let firebaseApp: admin.app.App | null = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 */
export async function initializeFirebase(config: FirebaseConfig): Promise<boolean> {
  try {
    if (firebaseApp) {
      console.log('[Firebase] Already initialized');
      return true;
    }

    // Format private key (replace escaped newlines)
    const privateKey = config.privateKey.replace(/\\n/g, '\n');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.projectId,
        privateKey: privateKey,
        clientEmail: config.clientEmail,
      }),
    });

    isInitialized = true;
    console.log('[Firebase] Admin SDK initialized successfully');
    return true;
  } catch (error) {
    console.error('[Firebase] Failed to initialize:', error);
    isInitialized = false;
    return false;
  }
}

/**
 * Check if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return isInitialized && firebaseApp !== null;
}

/**
 * Get Firebase Messaging instance
 */
function getMessaging(): admin.messaging.Messaging | null {
  if (!firebaseApp) {
    console.error('[Firebase] Not initialized');
    return null;
  }
  return admin.messaging(firebaseApp);
}

/**
 * Send push notification to a single device
 */
export async function sendToDevice(
  token: string,
  payload: PushNotificationPayload
): Promise<PushResult> {
  const messaging = getMessaging();
  if (!messaging) {
    return {
      success: false,
      successCount: 0,
      failureCount: 1,
      responses: [{ token, success: false, error: 'Firebase not initialized' }],
    };
  }

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: payload.priority === 'high' ? 'high' : 'normal',
        notification: {
          channelId: payload.channelId || 'default',
          sound: payload.sound || 'default',
          priority: payload.priority === 'high' ? 'high' : 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: payload.badge,
            sound: payload.sound || 'default',
            contentAvailable: true,
          },
        },
      },
    };

    const response = await messaging.send(message);
    console.log('[Firebase] Message sent successfully:', response);

    return {
      success: true,
      successCount: 1,
      failureCount: 0,
      responses: [{ token, success: true, messageId: response }],
    };
  } catch (error: any) {
    console.error('[Firebase] Error sending message:', error);

    // Handle specific Firebase errors
    const errorCode = error.code || 'unknown';
    const isInvalidToken = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
    ].includes(errorCode);

    return {
      success: false,
      successCount: 0,
      failureCount: 1,
      responses: [
        {
          token,
          success: false,
          error: isInvalidToken ? 'Invalid or expired token' : error.message,
        },
      ],
    };
  }
}

/**
 * Send push notification to multiple devices
 */
export async function sendToMultipleDevices(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<PushResult> {
  const messaging = getMessaging();
  if (!messaging) {
    return {
      success: false,
      successCount: 0,
      failureCount: tokens.length,
      responses: tokens.map((token) => ({
        token,
        success: false,
        error: 'Firebase not initialized',
      })),
    };
  }

  if (tokens.length === 0) {
    return {
      success: true,
      successCount: 0,
      failureCount: 0,
      responses: [],
    };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: payload.priority === 'high' ? 'high' : 'normal',
        notification: {
          channelId: payload.channelId || 'default',
          sound: payload.sound || 'default',
          priority: payload.priority === 'high' ? 'high' : 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: payload.badge,
            sound: payload.sound || 'default',
            contentAvailable: true,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(
      `[Firebase] Multicast sent: ${response.successCount} success, ${response.failureCount} failed`
    );

    const responses = response.responses.map((res, idx) => ({
      token: tokens[idx],
      success: res.success,
      messageId: res.messageId,
      error: res.error?.message,
    }));

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses,
    };
  } catch (error: any) {
    console.error('[Firebase] Error sending multicast:', error);
    return {
      success: false,
      successCount: 0,
      failureCount: tokens.length,
      responses: tokens.map((token) => ({
        token,
        success: false,
        error: error.message,
      })),
    };
  }
}

/**
 * Send push notification to a topic
 */
export async function sendToTopic(
  topic: string,
  payload: PushNotificationPayload
): Promise<PushResult> {
  const messaging = getMessaging();
  if (!messaging) {
    return {
      success: false,
      successCount: 0,
      failureCount: 1,
    };
  }

  try {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: payload.priority === 'high' ? 'high' : 'normal',
        notification: {
          channelId: payload.channelId || 'default',
          sound: payload.sound || 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            badge: payload.badge,
            sound: payload.sound || 'default',
          },
        },
      },
    };

    const response = await messaging.send(message);
    console.log('[Firebase] Topic message sent:', response);

    return {
      success: true,
      successCount: 1,
      failureCount: 0,
    };
  } catch (error: any) {
    console.error('[Firebase] Error sending to topic:', error);
    return {
      success: false,
      successCount: 0,
      failureCount: 1,
    };
  }
}

/**
 * Subscribe tokens to a topic
 */
export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<{ success: boolean; successCount: number; failureCount: number }> {
  const messaging = getMessaging();
  if (!messaging) {
    return { success: false, successCount: 0, failureCount: tokens.length };
  }

  try {
    const response = await messaging.subscribeToTopic(tokens, topic);
    console.log(`[Firebase] Subscribed ${response.successCount} tokens to topic ${topic}`);
    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.error('[Firebase] Error subscribing to topic:', error);
    return { success: false, successCount: 0, failureCount: tokens.length };
  }
}

/**
 * Unsubscribe tokens from a topic
 */
export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<{ success: boolean; successCount: number; failureCount: number }> {
  const messaging = getMessaging();
  if (!messaging) {
    return { success: false, successCount: 0, failureCount: tokens.length };
  }

  try {
    const response = await messaging.unsubscribeFromTopic(tokens, topic);
    console.log(`[Firebase] Unsubscribed ${response.successCount} tokens from topic ${topic}`);
    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.error('[Firebase] Error unsubscribing from topic:', error);
    return { success: false, successCount: 0, failureCount: tokens.length };
  }
}

// ============ High-level Alert Functions ============

/**
 * Send IoT alert push notification
 */
export async function sendIoTAlertPush(
  tokens: string[],
  alert: {
    deviceName: string;
    sensorType: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }
): Promise<PushResult> {
  const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
  return sendToMultipleDevices(tokens, {
    title: `${emoji} IoT Alert: ${alert.deviceName}`,
    body: `${alert.sensorType}: ${alert.value} vượt ngưỡng ${alert.threshold}`,
    data: {
      type: 'iot_alert',
      severity: alert.severity,
      deviceName: alert.deviceName,
      sensorType: alert.sensorType,
      value: String(alert.value),
      threshold: String(alert.threshold),
    },
    priority: alert.severity === 'critical' ? 'high' : 'normal',
    channelId: alert.severity === 'critical' ? 'critical_alerts' : 'alerts',
    sound: alert.severity === 'critical' ? 'alarm.wav' : 'default',
  });
}

/**
 * Send SPC alert push notification
 */
export async function sendSPCAlertPush(
  tokens: string[],
  alert: {
    planName: string;
    ruleName: string;
    ruleCode: string;
    value: number;
    severity: 'warning' | 'critical';
  }
): Promise<PushResult> {
  const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
  return sendToMultipleDevices(tokens, {
    title: `${emoji} SPC Rule: ${alert.ruleCode}`,
    body: `${alert.planName}: Vi phạm ${alert.ruleName}`,
    data: {
      type: 'spc_alert',
      severity: alert.severity,
      planName: alert.planName,
      ruleName: alert.ruleName,
      ruleCode: alert.ruleCode,
      value: String(alert.value),
    },
    priority: alert.severity === 'critical' ? 'high' : 'normal',
    channelId: alert.severity === 'critical' ? 'critical_alerts' : 'alerts',
    sound: alert.severity === 'critical' ? 'alarm.wav' : 'default',
  });
}

/**
 * Send CPK alert push notification
 */
export async function sendCPKAlertPush(
  tokens: string[],
  alert: {
    planName: string;
    cpkValue: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }
): Promise<PushResult> {
  const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
  return sendToMultipleDevices(tokens, {
    title: `${emoji} CPK Alert`,
    body: `${alert.planName}: CPK = ${alert.cpkValue.toFixed(2)} < ${alert.threshold}`,
    data: {
      type: 'cpk_alert',
      severity: alert.severity,
      planName: alert.planName,
      cpkValue: String(alert.cpkValue),
      threshold: String(alert.threshold),
    },
    priority: alert.severity === 'critical' ? 'high' : 'normal',
    channelId: alert.severity === 'critical' ? 'critical_alerts' : 'alerts',
    sound: alert.severity === 'critical' ? 'alarm.wav' : 'default',
  });
}

/**
 * Send escalation alert push notification
 */
export async function sendEscalationAlertPush(
  tokens: string[],
  alert: {
    alertId: number;
    alertType: string;
    level: number;
    message: string;
    severity: 'warning' | 'critical';
  }
): Promise<PushResult> {
  const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';
  return sendToMultipleDevices(tokens, {
    title: `${emoji} Escalation Level ${alert.level}`,
    body: alert.message,
    data: {
      type: 'escalation_alert',
      severity: alert.severity,
      alertId: String(alert.alertId),
      alertType: alert.alertType,
      level: String(alert.level),
    },
    priority: 'high',
    channelId: 'escalation_alerts',
    sound: 'alarm.wav',
  });
}

/**
 * Send test push notification
 */
export async function sendTestPush(token: string): Promise<PushResult> {
  return sendToDevice(token, {
    title: '🔔 Test Notification',
    body: 'This is a test push notification from CPK/SPC Calculator',
    data: {
      type: 'test',
      timestamp: new Date().toISOString(),
    },
    priority: 'high',
  });
}

export default {
  initializeFirebase,
  isFirebaseInitialized,
  sendToDevice,
  sendToMultipleDevices,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendIoTAlertPush,
  sendSPCAlertPush,
  sendCPKAlertPush,
  sendEscalationAlertPush,
  sendTestPush,
};
