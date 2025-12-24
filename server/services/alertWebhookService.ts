/**
 * Alert Webhook Service
 * Gửi alerts đến Slack và Microsoft Teams
 */

import { getDb } from "../db";
import { webhookConfig } from "../../drizzle/schema";

interface AlertPayload {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  source?: string;
  timestamp?: Date;
  details?: Record<string, any>;
  actionUrl?: string;
}

// Slack message colors
const SLACK_COLORS = {
  info: '#3b82f6',
  warning: '#f97316',
  critical: '#ef4444',
};

// Teams theme colors
const TEAMS_COLORS = {
  info: '0076D7',
  warning: 'FFA500',
  critical: 'FF0000',
};

/**
 * Send alert to Slack webhook
 */
async function sendToSlack(webhookUrl: string, channel: string | null, alert: AlertPayload): Promise<boolean> {
  try {
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
          ...(alert.details ? Object.entries(alert.details).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })) : []),
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

    if (!response.ok) {
      console.error('[AlertWebhook] Slack error:', await response.text());
      return false;
    }

    console.log('[AlertWebhook] Sent to Slack successfully');
    return true;
  } catch (error) {
    console.error('[AlertWebhook] Slack error:', error);
    return false;
  }
}

/**
 * Send alert to Microsoft Teams webhook
 */
async function sendToTeams(webhookUrl: string, alert: AlertPayload): Promise<boolean> {
  try {
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
          ...(alert.details ? Object.entries(alert.details).map(([key, value]) => ({
            name: key,
            value: String(value),
          })) : []),
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

    if (!response.ok) {
      console.error('[AlertWebhook] Teams error:', await response.text());
      return false;
    }

    console.log('[AlertWebhook] Sent to Teams successfully');
    return true;
  } catch (error) {
    console.error('[AlertWebhook] Teams error:', error);
    return false;
  }
}

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
 * Send alert to all configured webhooks
 */
export async function sendAlertToWebhooks(alert: AlertPayload): Promise<{
  slack: boolean;
  teams: boolean;
}> {
  const result = { slack: false, teams: false };

  try {
    const db = await getDb();
    if (!db) {
      console.error('[AlertWebhook] Database connection failed');
      return result;
    }

    const [config] = await db.select().from(webhookConfig).limit(1);
    if (!config) {
      console.log('[AlertWebhook] No webhook config found');
      return result;
    }

    // Send to Slack if enabled
    if (config.slackEnabled && config.slackWebhookUrl) {
      result.slack = await sendToSlack(config.slackWebhookUrl, config.slackChannel, alert);
    }

    // Send to Teams if enabled
    if (config.teamsEnabled && config.teamsWebhookUrl) {
      result.teams = await sendToTeams(config.teamsWebhookUrl, alert);
    }

    return result;
  } catch (error) {
    console.error('[AlertWebhook] Error:', error);
    return result;
  }
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

  const severity = cpk < 1.0 ? 'critical' : cpk < 1.33 ? 'warning' : 'info';

  await sendAlertToWebhooks({
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

  const severity = oee < threshold * 0.8 ? 'critical' : oee < threshold ? 'warning' : 'info';

  await sendAlertToWebhooks({
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
  const severity = daysUntilDue <= 0 ? 'critical' : daysUntilDue <= 3 ? 'warning' : 'info';

  await sendAlertToWebhooks({
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

export default {
  sendAlertToWebhooks,
  sendSpcViolationAlert,
  sendOeeAlert,
  sendMaintenanceAlert,
};
