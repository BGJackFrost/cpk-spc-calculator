/**
 * Alert Webhook Service - Multi-channel notifications
 * Supports: Slack, Microsoft Teams, Email, Discord, Custom webhooks
 */

import { getDb } from "../db";
import { alertWebhookConfigs, alertWebhookLogs, webhookConfig } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { sendAlertEmail } from "./emailService";

// Alert types supported
export type AlertType = 
  | 'cpk_warning' 
  | 'cpk_critical' 
  | 'spc_violation' 
  | 'machine_down' 
  | 'iot_alarm'
  | 'sensor_critical'
  | 'latency_warning'
  | 'oee_alert'
  | 'maintenance_alert';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertPayload {
  type?: AlertType;
  title: string;
  message: string;
  severity: AlertSeverity;
  source?: string;
  data?: Record<string, any>;
  details?: Record<string, any>; // Alias for data
  productionLineId?: number;
  machineId?: number;
  timestamp?: Date;
  actionUrl?: string;
}

// Slack message colors
const SLACK_COLORS: Record<AlertSeverity, string> = {
  info: '#3b82f6',
  warning: '#f97316',
  critical: '#ef4444',
};

// Teams theme colors
const TEAMS_COLORS: Record<AlertSeverity, string> = {
  info: '0076D7',
  warning: 'FFA500',
  critical: 'FF0000',
};

// Alert type labels
const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  cpk_warning: 'Cảnh báo CPK',
  cpk_critical: 'CPK nghiêm trọng',
  spc_violation: 'Vi phạm SPC',
  machine_down: 'Máy dừng',
  iot_alarm: 'Cảnh báo IoT',
  sensor_critical: 'Sensor nghiêm trọng',
  latency_warning: 'Cảnh báo độ trễ',
  oee_alert: 'Cảnh báo OEE',
  maintenance_alert: 'Cảnh báo bảo trì',
};

/**
 * Get emoji for severity level
 */
function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical': return '🚨';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '📢';
  }
}

/**
 * Send alert to Slack webhook
 */
async function sendToSlack(
  webhookUrl: string, 
  channel: string | null, 
  alert: AlertPayload
): Promise<{ success: boolean; responseCode?: number; responseBody?: string; error?: string }> {
  try {
    const details = alert.data || alert.details || {};
    const payload = {
      channel: channel || undefined,
      text: `${getSeverityEmoji(alert.severity)} ${alert.title}`,
      attachments: [{
        color: SLACK_COLORS[alert.severity],
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true,
          },
          {
            title: 'Source',
            value: alert.source || 'System',
            short: true,
          },
          ...Object.entries(details).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })),
        ],
        footer: 'SPC Alert System',
        ts: Math.floor((alert.timestamp || new Date()).getTime() / 1000),
        ...(alert.actionUrl && {
          actions: [{
            type: 'button',
            text: 'View Details',
            url: alert.actionUrl,
          }],
        }),
      }],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error('[AlertWebhook] Slack error:', responseBody);
      return { success: false, responseCode: response.status, responseBody, error: responseBody };
    }

    console.log('[AlertWebhook] Sent to Slack successfully');
    return { success: true, responseCode: response.status, responseBody };
  } catch (error) {
    console.error('[AlertWebhook] Slack error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send alert to Microsoft Teams webhook
 */
async function sendToTeams(
  webhookUrl: string, 
  alert: AlertPayload
): Promise<{ success: boolean; responseCode?: number; responseBody?: string; error?: string }> {
  try {
    const details = alert.data || alert.details || {};
    // Teams Adaptive Card format
    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: TEAMS_COLORS[alert.severity],
      summary: alert.title,
      sections: [{
        activityTitle: `${getSeverityEmoji(alert.severity)} ${alert.title}`,
        activitySubtitle: (alert.timestamp || new Date()).toLocaleString('vi-VN'),
        facts: [
          { name: 'Severity', value: alert.severity.toUpperCase() },
          { name: 'Source', value: alert.source || 'System' },
          { name: 'Message', value: alert.message },
          ...Object.entries(details).map(([key, value]) => ({
            name: key,
            value: String(value),
          })),
        ],
        markdown: true,
      }],
      ...(alert.actionUrl && {
        potentialAction: [{
          '@type': 'OpenUri',
          name: 'View Details',
          targets: [{ os: 'default', uri: alert.actionUrl }],
        }],
      }),
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();

    if (!response.ok) {
      console.error('[AlertWebhook] Teams error:', responseBody);
      return { success: false, responseCode: response.status, responseBody, error: responseBody };
    }

    console.log('[AlertWebhook] Sent to Teams successfully');
    return { success: true, responseCode: response.status, responseBody };
  } catch (error) {
    console.error('[AlertWebhook] Teams error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send alert to Discord webhook
 */
async function sendToDiscord(
  webhookUrl: string,
  alert: AlertPayload
): Promise<{ success: boolean; responseCode?: number; responseBody?: string; error?: string }> {
  try {
    const details = alert.data || alert.details || {};
    const colorInt = parseInt(SLACK_COLORS[alert.severity].replace('#', ''), 16);
    
    const payload = {
      embeds: [
        {
          title: `${getSeverityEmoji(alert.severity)} ${alert.title}`,
          description: alert.message,
          color: colorInt,
          fields: Object.entries(details).map(([key, value]) => ({
            name: key,
            value: String(value),
            inline: true,
          })),
          footer: {
            text: 'CPK/SPC System',
          },
          timestamp: (alert.timestamp || new Date()).toISOString(),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    
    return {
      success: response.ok,
      responseCode: response.status,
      responseBody,
      error: response.ok ? undefined : responseBody,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send alert via Email
 */
async function sendToEmail(
  recipients: string[],
  alert: AlertPayload,
  subjectTemplate?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const typeLabel = alert.type ? ALERT_TYPE_LABELS[alert.type] : 'Alert';
    const subject = subjectTemplate
      ? subjectTemplate
          .replace('{type}', typeLabel)
          .replace('{title}', alert.title)
          .replace('{severity}', alert.severity)
      : `[${alert.severity.toUpperCase()}] ${typeLabel}: ${alert.title}`;

    const details = alert.data || alert.details || {};
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${SLACK_COLORS[alert.severity]}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
          .severity { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 12px; font-weight: bold; }
          .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .data-table th, .data-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          .data-table th { background: #f0f0f0; }
          .footer { font-size: 12px; color: #666; margin-top: 20px; }
          .action-btn { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">${getSeverityEmoji(alert.severity)} ${typeLabel}</h2>
          </div>
          <div class="content">
            <h3>${alert.title}</h3>
            <p>${alert.message}</p>
            ${Object.keys(details).length > 0 ? `
              <table class="data-table">
                <tr><th>Thông tin</th><th>Giá trị</th></tr>
                ${Object.entries(details)
                  .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
                  .join('')}
              </table>
            ` : ''}
            ${alert.actionUrl ? `<a href="${alert.actionUrl}" class="action-btn">Xem chi tiết</a>` : ''}
            <p class="footer">
              Thời gian: ${new Date(alert.timestamp || new Date()).toLocaleString('vi-VN')}<br>
              Hệ thống CPK/SPC - Tự động gửi
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to all recipients
    const results = await Promise.all(
      recipients.map((email) =>
        sendAlertEmail({
          to: email,
          subject,
          html: htmlContent,
        })
      )
    );

    const allSuccess = results.every((r) => r.success);
    
    return {
      success: allSuccess,
      error: allSuccess ? undefined : 'Some emails failed to send',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send alert to custom webhook
 */
async function sendToCustomWebhook(
  webhookUrl: string,
  alert: AlertPayload
): Promise<{ success: boolean; responseCode?: number; responseBody?: string; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        data: alert.data || alert.details,
        productionLineId: alert.productionLineId,
        machineId: alert.machineId,
        timestamp: (alert.timestamp || new Date()).toISOString(),
        source: 'cpk-spc-system',
      }),
    });

    const responseBody = await response.text();
    
    return {
      success: response.ok,
      responseCode: response.status,
      responseBody,
      error: response.ok ? undefined : responseBody,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if alert should be rate limited
 */
function shouldRateLimit(
  lastAlertSentAt: string | null,
  rateLimitMinutes: number | null
): boolean {
  if (!lastAlertSentAt || !rateLimitMinutes) return false;
  
  const lastSent = new Date(lastAlertSentAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastSent.getTime()) / (1000 * 60);
  
  return diffMinutes < rateLimitMinutes;
}

/**
 * Check if alert matches webhook config filters
 */
function matchesFilters(
  config: typeof alertWebhookConfigs.$inferSelect,
  alert: AlertPayload
): boolean {
  // Check alert type
  if (alert.type) {
    const alertTypes = config.alertTypes as string[] | null;
    if (alertTypes && alertTypes.length > 0 && !alertTypes.includes(alert.type)) {
      return false;
    }
  }

  // Check severity
  const severityOrder: AlertSeverity[] = ['info', 'warning', 'critical'];
  const minSeverityIndex = severityOrder.indexOf(config.minSeverity as AlertSeverity);
  const alertSeverityIndex = severityOrder.indexOf(alert.severity);
  if (alertSeverityIndex < minSeverityIndex) {
    return false;
  }

  // Check production line filter
  const productionLineIds = config.productionLineIds as number[] | null;
  if (productionLineIds && productionLineIds.length > 0 && alert.productionLineId) {
    if (!productionLineIds.includes(alert.productionLineId)) {
      return false;
    }
  }

  // Check machine filter
  const machineIds = config.machineIds as number[] | null;
  if (machineIds && machineIds.length > 0 && alert.machineId) {
    if (!machineIds.includes(alert.machineId)) {
      return false;
    }
  }

  return true;
}

/**
 * Log webhook alert to new table
 */
async function logWebhookAlert(
  webhookConfigId: number,
  alert: AlertPayload,
  channelType: string,
  recipientInfo: string,
  result: { success: boolean; responseCode?: number; responseBody?: string; error?: string },
  rateLimited: boolean = false
) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(alertWebhookLogs).values({
      webhookConfigId,
      alertType: alert.type || 'unknown',
      alertTitle: alert.title,
      alertMessage: alert.message,
      alertData: alert.data || alert.details,
      channelType,
      recipientInfo,
      status: rateLimited ? 'rate_limited' : result.success ? 'sent' : 'failed',
      responseCode: result.responseCode,
      responseBody: result.responseBody,
      errorMessage: result.error,
      sentAt: result.success ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error('[AlertWebhook] Failed to log alert:', error);
  }
}

/**
 * Send alert to all configured webhooks (both legacy and new multi-channel)
 */
export async function sendAlertToWebhooks(alert: AlertPayload): Promise<{
  slack: boolean;
  teams: boolean;
  sent?: number;
  failed?: number;
  rateLimited?: number;
}> {
  const result = { slack: false, teams: false, sent: 0, failed: 0, rateLimited: 0 };

  try {
    const dbConn = await getDb();
    if (!dbConn) {
      console.error('[AlertWebhook] Database connection failed');
      return result;
    }

    // Legacy webhook config (single Slack/Teams)
    try {
      const [legacyConfig] = await dbConn.select().from(webhookConfig).limit(1);
      if (legacyConfig) {
        // Send to Slack if enabled
        if (legacyConfig.slackEnabled && legacyConfig.slackWebhookUrl) {
          const slackResult = await sendToSlack(legacyConfig.slackWebhookUrl, legacyConfig.slackChannel, alert);
          result.slack = slackResult.success;
          if (slackResult.success) result.sent!++;
          else result.failed!++;
        }

        // Send to Teams if enabled
        if (legacyConfig.teamsEnabled && legacyConfig.teamsWebhookUrl) {
          const teamsResult = await sendToTeams(legacyConfig.teamsWebhookUrl, alert);
          result.teams = teamsResult.success;
          if (teamsResult.success) result.sent!++;
          else result.failed!++;
        }
      }
    } catch (e) {
      // Legacy config table might not exist
    }

    // New multi-channel webhook configs
    try {
      const configs = await dbConn
        .select()
        .from(alertWebhookConfigs)
        .where(eq(alertWebhookConfigs.isActive, 1));

      for (const config of configs) {
        // Check if matches filters
        if (!matchesFilters(config, alert)) {
          continue;
        }

        // Check rate limiting
        if (shouldRateLimit(config.lastAlertSentAt, config.rateLimitMinutes)) {
          result.rateLimited!++;
          await logWebhookAlert(
            config.id,
            alert,
            config.channelType,
            config.webhookUrl || '',
            { success: false, error: 'Rate limited' },
            true
          );
          continue;
        }

        let sendResult: { success: boolean; responseCode?: number; responseBody?: string; error?: string };
        let recipientInfo = '';

        switch (config.channelType) {
          case 'slack':
            recipientInfo = config.slackChannel || config.webhookUrl || '';
            sendResult = await sendToSlack(
              config.webhookUrl || '',
              config.slackChannel || null,
              alert
            );
            if (sendResult.success) result.slack = true;
            break;

          case 'teams':
            recipientInfo = config.teamsWebhookUrl || config.webhookUrl || '';
            sendResult = await sendToTeams(config.teamsWebhookUrl || config.webhookUrl || '', alert);
            if (sendResult.success) result.teams = true;
            break;

          case 'discord':
            recipientInfo = config.webhookUrl || '';
            sendResult = await sendToDiscord(config.webhookUrl || '', alert);
            break;

          case 'email':
            const recipients = config.emailRecipients as string[] | null;
            if (!recipients || recipients.length === 0) {
              sendResult = { success: false, error: 'No email recipients configured' };
            } else {
              recipientInfo = recipients.join(', ');
              sendResult = await sendToEmail(recipients, alert, config.emailSubjectTemplate || undefined);
            }
            break;

          case 'custom':
            recipientInfo = config.webhookUrl || '';
            sendResult = await sendToCustomWebhook(config.webhookUrl || '', alert);
            break;

          default:
            sendResult = { success: false, error: `Unknown channel type: ${config.channelType}` };
        }

        // Log the result
        await logWebhookAlert(config.id, alert, config.channelType, recipientInfo, sendResult);

        // Update last alert sent time
        if (sendResult.success) {
          await dbConn
            .update(alertWebhookConfigs)
            .set({ lastAlertSentAt: new Date().toISOString() })
            .where(eq(alertWebhookConfigs.id, config.id));
          result.sent!++;
        } else {
          result.failed!++;
        }
      }
    } catch (e) {
      // New config table might not exist yet
      console.log('[AlertWebhook] Multi-channel configs not available:', e);
    }

    return result;
  } catch (error) {
    console.error('[AlertWebhook] Error:', error);
    return result;
  }
}

/**
 * Test webhook configuration
 */
export async function testWebhookConfig(configId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const dbConn = await getDb();
    if (!dbConn) {
      return { success: false, error: 'Database connection failed' };
    }

    const [config] = await dbConn
      .select()
      .from(alertWebhookConfigs)
      .where(eq(alertWebhookConfigs.id, configId));

    if (!config) {
      return { success: false, error: 'Webhook config not found' };
    }

    const testAlert: AlertPayload = {
      type: 'cpk_warning',
      title: 'Test Alert',
      message: 'Đây là tin nhắn test từ hệ thống CPK/SPC. Nếu bạn nhận được tin nhắn này, webhook đã được cấu hình đúng.',
      severity: 'info',
      data: {
        'Loại': 'Test',
        'Thời gian': new Date().toLocaleString('vi-VN'),
        'Config ID': configId,
      },
      timestamp: new Date(),
    };

    let result: { success: boolean; error?: string };

    switch (config.channelType) {
      case 'slack':
        result = await sendToSlack(
          config.webhookUrl || '',
          config.slackChannel || null,
          testAlert
        );
        break;

      case 'teams':
        result = await sendToTeams(config.teamsWebhookUrl || config.webhookUrl || '', testAlert);
        break;

      case 'discord':
        result = await sendToDiscord(config.webhookUrl || '', testAlert);
        break;

      case 'email':
        const recipients = config.emailRecipients as string[] | null;
        if (!recipients || recipients.length === 0) {
          result = { success: false, error: 'No email recipients configured' };
        } else {
          result = await sendToEmail(recipients, testAlert, config.emailSubjectTemplate || undefined);
        }
        break;

      case 'custom':
        result = await sendToCustomWebhook(config.webhookUrl || '', testAlert);
        break;

      default:
        result = { success: false, error: `Unknown channel type: ${config.channelType}` };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get webhook logs
 */
export async function getWebhookLogs(
  webhookConfigId?: number,
  limit: number = 100
) {
  const dbConn = await getDb();
  if (!dbConn) return [];

  let query = dbConn.select().from(alertWebhookLogs);
  
  if (webhookConfigId) {
    query = query.where(eq(alertWebhookLogs.webhookConfigId, webhookConfigId)) as any;
  }
  
  return query.orderBy(desc(alertWebhookLogs.createdAt)).limit(limit);
}

/**
 * Send SPC violation alert
 */
export async function sendSpcViolationAlert(params: {
  productCode: string;
  stationName: string;
  cpk: number;
  violations: string[];
  actionUrl?: string;
}): Promise<void> {
  const { productCode, stationName, cpk, violations, actionUrl } = params;

  const severity: AlertSeverity = cpk < 1.0 ? 'critical' : cpk < 1.33 ? 'warning' : 'info';

  await sendAlertToWebhooks({
    type: 'spc_violation',
    title: `SPC Alert: ${productCode} - ${stationName}`,
    message: `CPK = ${cpk.toFixed(3)} - ${violations.length} vi phạm được phát hiện`,
    severity,
    source: `${productCode} / ${stationName}`,
    timestamp: new Date(),
    details: {
      'CPK': cpk.toFixed(3),
      'Violations': violations.join(', ') || 'None',
    },
    actionUrl,
  });
}

/**
 * Send OEE alert
 */
export async function sendOeeAlert(params: {
  machineName: string;
  oee: number;
  threshold: number;
  actionUrl?: string;
}): Promise<void> {
  const { machineName, oee, threshold, actionUrl } = params;

  const severity: AlertSeverity = oee < threshold * 0.8 ? 'critical' : oee < threshold ? 'warning' : 'info';

  await sendAlertToWebhooks({
    type: 'oee_alert',
    title: `OEE Alert: ${machineName}`,
    message: `OEE = ${(oee * 100).toFixed(1)}% (Ngưỡng: ${(threshold * 100).toFixed(1)}%)`,
    severity,
    source: machineName,
    timestamp: new Date(),
    details: {
      'OEE': `${(oee * 100).toFixed(1)}%`,
      'Threshold': `${(threshold * 100).toFixed(1)}%`,
    },
    actionUrl,
  });
}

/**
 * Send maintenance alert
 */
export async function sendMaintenanceAlert(params: {
  machineName: string;
  maintenanceType: string;
  dueDate: Date;
  actionUrl?: string;
}): Promise<void> {
  const { machineName, maintenanceType, dueDate, actionUrl } = params;

  const now = new Date();
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const severity: AlertSeverity = daysUntilDue <= 0 ? 'critical' : daysUntilDue <= 3 ? 'warning' : 'info';

  await sendAlertToWebhooks({
    type: 'maintenance_alert',
    title: `Maintenance Alert: ${machineName}`,
    message: `${maintenanceType} - Due: ${dueDate.toLocaleDateString('vi-VN')}`,
    severity,
    source: machineName,
    timestamp: new Date(),
    details: {
      'Type': maintenanceType,
      'Due Date': dueDate.toLocaleDateString('vi-VN'),
      'Days Until Due': daysUntilDue,
    },
    actionUrl,
  });
}

/**
 * Send IoT alarm alert
 */
export async function sendIotAlarmAlert(params: {
  deviceName: string;
  alarmType: string;
  value: number;
  threshold: number;
  machineId?: number;
  productionLineId?: number;
  actionUrl?: string;
}): Promise<void> {
  const { deviceName, alarmType, value, threshold, machineId, productionLineId, actionUrl } = params;

  const severity: AlertSeverity = Math.abs(value - threshold) > threshold * 0.5 ? 'critical' : 'warning';

  await sendAlertToWebhooks({
    type: 'iot_alarm',
    title: `IoT Alarm: ${deviceName}`,
    message: `${alarmType}: Giá trị ${value} vượt ngưỡng ${threshold}`,
    severity,
    source: deviceName,
    machineId,
    productionLineId,
    timestamp: new Date(),
    details: {
      'Device': deviceName,
      'Alarm Type': alarmType,
      'Current Value': value,
      'Threshold': threshold,
    },
    actionUrl,
  });
}

export default {
  sendAlertToWebhooks,
  sendSpcViolationAlert,
  sendOeeAlert,
  sendMaintenanceAlert,
  sendIotAlarmAlert,
  testWebhookConfig,
  getWebhookLogs,
};
