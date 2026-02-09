/**
 * FCM Push Service - Enhanced for Mobile App
 * Integrates with alert system to send push notifications
 */

import { getDb } from '../db';
import { eq, and, inArray, gte, sql } from 'drizzle-orm';
import {
  sendToDevice,
  sendToMultipleDevices,
  sendToTopic,
  isFirebaseInitialized,
  PushNotificationPayload,
} from './firebaseAdminService';

// Types
export interface AlertNotification {
  type: 'cpk' | 'spc' | 'oee' | 'iot' | 'escalation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  errors?: string[];
}

// ============ Core Functions ============

/**
 * Get active device tokens for a user
 */
export async function getUserDeviceTokens(userId: string): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // Return empty array - actual implementation would query database
    return [];
  } catch (error) {
    console.error('[FCM] Error getting user tokens:', error);
    return [];
  }
}

/**
 * Send notification to specific users
 */
export async function sendNotificationToUsers(
  userIds: string[],
  notification: AlertNotification
): Promise<NotificationResult> {
  if (!isFirebaseInitialized()) {
    return { success: false, sent: 0, failed: userIds.length, errors: ['Firebase not initialized'] };
  }

  try {
    // Get tokens for users
    const allTokens: string[] = [];
    for (const userId of userIds) {
      const tokens = await getUserDeviceTokens(userId);
      allTokens.push(...tokens);
    }

    if (allTokens.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    const payload: PushNotificationPayload = {
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: notification.severity === 'critical' ? 'high' : 'normal',
      channelId: getChannelId(notification.type, notification.severity),
      sound: notification.severity === 'critical' ? 'alarm.wav' : 'default',
    };

    const result = await sendToMultipleDevices(allTokens, payload);

    return {
      success: result.success,
      sent: result.successCount,
      failed: result.failureCount,
    };
  } catch (error: any) {
    console.error('[FCM] Error sending notification:', error);
    return { success: false, sent: 0, failed: userIds.length, errors: [error.message] };
  }
}

/**
 * Send notification to a topic
 */
export async function sendNotificationToTopic(
  topic: string,
  notification: AlertNotification
): Promise<NotificationResult> {
  if (!isFirebaseInitialized()) {
    return { success: false, sent: 0, failed: 1, errors: ['Firebase not initialized'] };
  }

  try {
    const payload: PushNotificationPayload = {
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: notification.severity === 'critical' ? 'high' : 'normal',
      channelId: getChannelId(notification.type, notification.severity),
      sound: notification.severity === 'critical' ? 'alarm.wav' : 'default',
    };

    const result = await sendToTopic(topic, payload);

    return {
      success: result.success,
      sent: result.successCount,
      failed: result.failureCount,
    };
  } catch (error: any) {
    console.error('[FCM] Error sending to topic:', error);
    return { success: false, sent: 0, failed: 1, errors: [error.message] };
  }
}

// ============ Alert-Specific Functions ============

/**
 * Send CPK alert notification
 */
export async function sendCPKAlert(
  userIds: string[],
  alert: {
    planName: string;
    productName: string;
    lineName: string;
    cpkValue: number;
    threshold: number;
  }
): Promise<NotificationResult> {
  const severity = alert.cpkValue < 1.0 ? 'critical' : 'warning';
  const emoji = severity === 'critical' ? '🚨' : '⚠️';

  return sendNotificationToUsers(userIds, {
    type: 'cpk',
    severity,
    title: `${emoji} CPK Alert: ${alert.lineName}`,
    body: `${alert.productName}: CPK = ${alert.cpkValue.toFixed(2)} (threshold: ${alert.threshold})`,
    data: {
      type: 'cpk_alert',
      planName: alert.planName,
      productName: alert.productName,
      lineName: alert.lineName,
      cpkValue: String(alert.cpkValue),
      threshold: String(alert.threshold),
      severity,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send SPC rule violation alert
 */
export async function sendSPCRuleAlert(
  userIds: string[],
  alert: {
    planName: string;
    ruleName: string;
    ruleCode: string;
    description: string;
    value?: number;
  }
): Promise<NotificationResult> {
  const severity = alert.ruleCode.startsWith('R1') ? 'critical' : 'warning';
  const emoji = severity === 'critical' ? '🚨' : '⚠️';

  return sendNotificationToUsers(userIds, {
    type: 'spc',
    severity,
    title: `${emoji} SPC Rule Violation: ${alert.ruleCode}`,
    body: `${alert.planName}: ${alert.ruleName}`,
    data: {
      type: 'spc_alert',
      planName: alert.planName,
      ruleName: alert.ruleName,
      ruleCode: alert.ruleCode,
      description: alert.description,
      value: alert.value ? String(alert.value) : '',
      severity,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send OEE alert notification
 */
export async function sendOEEAlert(
  userIds: string[],
  alert: {
    lineName: string;
    oeeValue: number;
    threshold: number;
    component?: 'availability' | 'performance' | 'quality';
  }
): Promise<NotificationResult> {
  const severity = alert.oeeValue < 0.5 ? 'critical' : 'warning';
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  const componentText = alert.component ? ` (${alert.component})` : '';

  return sendNotificationToUsers(userIds, {
    type: 'oee',
    severity,
    title: `${emoji} OEE Alert: ${alert.lineName}`,
    body: `OEE${componentText} = ${(alert.oeeValue * 100).toFixed(1)}% (threshold: ${(alert.threshold * 100).toFixed(1)}%)`,
    data: {
      type: 'oee_alert',
      lineName: alert.lineName,
      oeeValue: String(alert.oeeValue),
      threshold: String(alert.threshold),
      component: alert.component || '',
      severity,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send IoT sensor alert notification
 */
export async function sendIoTSensorAlert(
  userIds: string[],
  alert: {
    deviceName: string;
    sensorType: string;
    value: number;
    threshold: number;
    unit?: string;
  }
): Promise<NotificationResult> {
  const severity = Math.abs(alert.value - alert.threshold) / alert.threshold > 0.2 
    ? 'critical' 
    : 'warning';
  const emoji = severity === 'critical' ? '🚨' : '⚠️';
  const unit = alert.unit || '';

  return sendNotificationToUsers(userIds, {
    type: 'iot',
    severity,
    title: `${emoji} IoT Alert: ${alert.deviceName}`,
    body: `${alert.sensorType}: ${alert.value}${unit} exceeded ${alert.threshold}${unit}`,
    data: {
      type: 'iot_alert',
      deviceName: alert.deviceName,
      sensorType: alert.sensorType,
      value: String(alert.value),
      threshold: String(alert.threshold),
      unit: unit,
      severity,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send escalation alert notification
 */
export async function sendEscalationAlert(
  userIds: string[],
  alert: {
    alertId: number;
    alertType: string;
    level: number;
    message: string;
    escalatedFrom?: string;
  }
): Promise<NotificationResult> {
  const severity = alert.level >= 3 ? 'critical' : 'warning';
  const emoji = '🔔';

  return sendNotificationToUsers(userIds, {
    type: 'escalation',
    severity,
    title: `${emoji} Escalation Level ${alert.level}`,
    body: alert.message,
    data: {
      type: 'escalation_alert',
      alertId: String(alert.alertId),
      alertType: alert.alertType,
      level: String(alert.level),
      escalatedFrom: alert.escalatedFrom || '',
      severity,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Send daily report notification
 */
export async function sendDailyReportNotification(
  userIds: string[],
  report: {
    date: string;
    cpkAvg: number;
    oeeAvg: number;
    alertCount: number;
    criticalCount: number;
  }
): Promise<NotificationResult> {
  const emoji = report.criticalCount > 0 ? '📊⚠️' : '📊';

  return sendNotificationToUsers(userIds, {
    type: 'cpk',
    severity: 'info',
    title: `${emoji} Daily Report: ${report.date}`,
    body: `CPK: ${report.cpkAvg.toFixed(2)} | OEE: ${(report.oeeAvg * 100).toFixed(1)}% | Alerts: ${report.alertCount}`,
    data: {
      type: 'daily_report',
      date: report.date,
      cpkAvg: String(report.cpkAvg),
      oeeAvg: String(report.oeeAvg),
      alertCount: String(report.alertCount),
      criticalCount: String(report.criticalCount),
      timestamp: new Date().toISOString(),
    },
  });
}

// ============ Statistics ============

/**
 * Get push notification statistics
 */
export async function getPushStatistics(
  startDate: Date,
  endDate: Date
): Promise<{
  total: number;
  success: number;
  failed: number;
  byType: Record<string, { total: number; success: number; failed: number }>;
}> {
  // Return default stats - actual implementation would query database
  return {
    total: 0,
    success: 0,
    failed: 0,
    byType: {},
  };
}

// ============ Helper Functions ============

function getChannelId(type: string, severity: string): string {
  if (severity === 'critical') {
    return 'critical_alerts';
  }
  
  switch (type) {
    case 'cpk': return 'cpk_alerts';
    case 'spc': return 'spc_alerts';
    case 'oee': return 'oee_alerts';
    case 'iot': return 'iot_alerts';
    case 'escalation': return 'escalation_alerts';
    default: return 'default';
  }
}

export default {
  getUserDeviceTokens,
  sendNotificationToUsers,
  sendNotificationToTopic,
  sendCPKAlert,
  sendSPCRuleAlert,
  sendOEEAlert,
  sendIoTSensorAlert,
  sendEscalationAlert,
  sendDailyReportNotification,
  getPushStatistics,
};
