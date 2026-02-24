/**
 * Push Notification Service - Gửi thông báo realtime cho cảnh báo sensor critical
 */

import { notifyOwner } from '../_core/notification';
import { sendSseEvent } from '../sse';
import { getDb } from '../db';
import { users, emailNotificationSettings } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Types
export interface NotificationPayload {
  type: 'iot_alert' | 'spc_alert' | 'cpk_alert' | 'system';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  data?: Record<string, any>;
  timestamp?: Date;
}

export interface NotificationResult {
  success: boolean;
  channels: {
    sse: boolean;
    owner: boolean;
    email?: boolean;
  };
  error?: string;
}

// Send notification through all channels
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const timestamp = payload.timestamp || new Date();
  const result: NotificationResult = {
    success: false,
    channels: {
      sse: false,
      owner: false,
    },
  };

  try {
    // 1. Send SSE event to all connected clients
    sendSseEvent('notification', {
      ...payload,
      timestamp,
    });
    result.channels.sse = true;

    // 2. Send owner notification for critical alerts
    if (payload.severity === 'critical') {
      const ownerResult = await notifyOwner({
        title: payload.title,
        content: payload.message,
      });
      result.channels.owner = ownerResult;
    }

    result.success = result.channels.sse || result.channels.owner;
    return result;
  } catch (error) {
    console.error('Error sending notification:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error';
    return result;
  }
}

// Send IoT sensor alert notification
export async function sendIoTAlert(
  deviceId: number,
  deviceName: string,
  sensorType: string,
  value: number,
  threshold: number,
  severity: 'warning' | 'critical'
): Promise<NotificationResult> {
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  const title = `${emoji} Cảnh báo IoT ${severity === 'critical' ? 'Critical' : 'Warning'}`;
  const message = `Sensor "${deviceName}" (${sensorType}): Giá trị ${value} vượt ngưỡng ${threshold}`;

  return sendNotification({
    type: 'iot_alert',
    severity,
    title,
    message,
    data: {
      deviceId,
      deviceName,
      sensorType,
      value,
      threshold,
    },
  });
}

// Send SPC rule violation notification
export async function sendSPCAlert(
  planName: string,
  ruleName: string,
  ruleCode: string,
  value: number,
  severity: 'warning' | 'critical'
): Promise<NotificationResult> {
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  const title = `${emoji} Vi phạm SPC Rule: ${ruleCode}`;
  const message = `Kế hoạch "${planName}" vi phạm rule ${ruleName}. Giá trị: ${value}`;

  return sendNotification({
    type: 'spc_alert',
    severity,
    title,
    message,
    data: {
      planName,
      ruleName,
      ruleCode,
      value,
    },
  });
}

// Send CPK threshold alert notification
export async function sendCPKAlert(
  planName: string,
  cpkValue: number,
  threshold: number,
  severity: 'warning' | 'critical'
): Promise<NotificationResult> {
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  const title = `${emoji} CPK dưới ngưỡng ${severity === 'critical' ? 'Critical' : 'Warning'}`;
  const message = `Kế hoạch "${planName}": CPK = ${cpkValue.toFixed(2)} < ${threshold}`;

  return sendNotification({
    type: 'cpk_alert',
    severity,
    title,
    message,
    data: {
      planName,
      cpkValue,
      threshold,
    },
  });
}

// Send system notification
export async function sendSystemNotification(
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'critical' = 'info'
): Promise<NotificationResult> {
  return sendNotification({
    type: 'system',
    severity,
    title,
    message,
  });
}

// Get notification history (from SSE events log if available)
export async function getNotificationHistory(
  limit: number = 50,
  filters?: {
    type?: NotificationPayload['type'];
    severity?: NotificationPayload['severity'];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<NotificationPayload[]> {
  // In a real implementation, this would query from a notifications table
  // For now, return empty array as notifications are transient
  return [];
}

// Check if user has enabled notifications
export async function isNotificationEnabled(
  userId: string,
  notificationType: NotificationPayload['type']
): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // Default to enabled if no DB

  try {
      const settings = await db
        .select()
        .from(emailNotificationSettings)
        .where(eq(emailNotificationSettings.userId, userId))
        .limit(1);

    if (settings.length === 0) return true; // Default to enabled

    const setting = settings[0];
    switch (notificationType) {
      case 'iot_alert':
        return setting.iotAlerts ?? true;
      case 'spc_alert':
        return setting.spcAlerts ?? true;
      case 'cpk_alert':
        return setting.cpkAlerts ?? true;
      case 'system':
        return setting.systemAlerts ?? true;
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return true;
  }
}

// Update user notification settings
export async function updateNotificationSettings(
  userId: string,
  settings: {
    iotAlerts?: boolean;
    spcAlerts?: boolean;
    cpkAlerts?: boolean;
    systemAlerts?: boolean;
    emailNotifications?: boolean;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Check if settings exist
    const existing = await db
      .select()
      .from(emailNotificationSettings)
      .where(eq(emailNotificationSettings.userId, userId))
      .limit(1);

    if (existing.length === 0) {
      // Insert new settings
      await db.insert(emailNotificationSettings).values({
        userId,
        ...settings,
      } as any);
    } else {
      // Update existing settings
      await db
        .update(emailNotificationSettings)
        .set(settings as any)
        .where(eq(emailNotificationSettings.userId, userId));
    }

    return true;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return false;
  }
}

export default {
  sendNotification,
  sendIoTAlert,
  sendSPCAlert,
  sendCPKAlert,
  sendSystemNotification,
  getNotificationHistory,
  isNotificationEnabled,
  updateNotificationSettings,
};
