/**
 * Anomaly Alert Service
 * Kết nối anomaly detection với hệ thống cảnh báo
 * Gửi notification qua Email, Telegram, Slack khi phát hiện bất thường
 */

import { getDb } from "../db";
import { sendEmail, getSmtpConfig } from "../emailService";
import * as telegramService from "./telegramService";
import * as anomalyDetectionService from "./anomalyDetectionService";

// Types
export interface AnomalyAlertConfig {
  id: number;
  name: string;
  description?: string | null;
  modelId?: number | null;
  deviceId?: number | null;
  productionLineId?: number | null;
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  anomalyScoreThreshold: number;
  consecutiveAnomalies: number;
  cooldownMinutes: number;
  emailEnabled: boolean;
  emailRecipients: string[];
  telegramEnabled: boolean;
  telegramChatIds: string[];
  slackEnabled: boolean;
  slackWebhookUrl?: string | null;
  slackChannel?: string | null;
  isActive: boolean;
  lastTriggeredAt?: number | null;
  createdBy?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface AnomalyAlertHistory {
  id: number;
  configId: number;
  anomalyDetectionId?: number | null;
  modelId?: number | null;
  deviceId?: number | null;
  alertType: 'anomaly_detected' | 'threshold_exceeded' | 'consecutive_anomalies' | 'critical_severity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message?: string | null;
  anomalyValue?: number | null;
  anomalyScore?: number | null;
  expectedMin?: number | null;
  expectedMax?: number | null;
  emailSent: boolean;
  emailSentAt?: number | null;
  telegramSent: boolean;
  telegramSentAt?: number | null;
  slackSent: boolean;
  slackSentAt?: number | null;
  acknowledged: boolean;
  acknowledgedBy?: number | null;
  acknowledgedAt?: number | null;
  resolution?: string | null;
  triggeredAt: number;
  createdAt: string;
}

export interface CreateAlertConfigInput {
  name: string;
  description?: string;
  modelId?: number;
  deviceId?: number;
  productionLineId?: number;
  severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
  anomalyScoreThreshold?: number;
  consecutiveAnomalies?: number;
  cooldownMinutes?: number;
  emailEnabled?: boolean;
  emailRecipients?: string[];
  telegramEnabled?: boolean;
  telegramChatIds?: string[];
  slackEnabled?: boolean;
  slackWebhookUrl?: string;
  slackChannel?: string;
  createdBy?: number;
}

// Consecutive anomaly tracking
const consecutiveAnomalyCount = new Map<string, number>();

// Severity level mapping
const severityLevels: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

// Get all alert configs
export async function getAllAlertConfigs(): Promise<AnomalyAlertConfig[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const results = await db.execute(`SELECT * FROM anomaly_alert_configs ORDER BY created_at DESC`);
    return ((results as any[]) || []).map(mapConfigFromDb);
  } catch (error) {
    console.error('[AnomalyAlert] Error fetching configs:', error);
    return [];
  }
}

// Get alert config by ID
export async function getAlertConfigById(id: number): Promise<AnomalyAlertConfig | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const results = await db.execute(`SELECT * FROM anomaly_alert_configs WHERE id = ?`, [id]);
    if (!results || (results as any[]).length === 0) return null;
    return mapConfigFromDb((results as any[])[0]);
  } catch (error) {
    console.error('[AnomalyAlert] Error fetching config:', error);
    return null;
  }
}

// Create alert config
export async function createAlertConfig(input: CreateAlertConfigInput): Promise<AnomalyAlertConfig | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db.execute(
      `INSERT INTO anomaly_alert_configs (name, description, model_id, device_id, production_line_id, severity_threshold, anomaly_score_threshold, consecutive_anomalies, cooldown_minutes, email_enabled, email_recipients, telegram_enabled, telegram_chat_ids, slack_enabled, slack_webhook_url, slack_channel, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name,
        input.description || null,
        input.modelId || null,
        input.deviceId || null,
        input.productionLineId || null,
        input.severityThreshold || 'medium',
        input.anomalyScoreThreshold ?? 0.7,
        input.consecutiveAnomalies ?? 3,
        input.cooldownMinutes ?? 15,
        input.emailEnabled ? 1 : 0,
        JSON.stringify(input.emailRecipients || []),
        input.telegramEnabled ? 1 : 0,
        JSON.stringify(input.telegramChatIds || []),
        input.slackEnabled ? 1 : 0,
        input.slackWebhookUrl || null,
        input.slackChannel || null,
        input.createdBy || null,
      ]
    );

    // Get the created config
    const results = await db.execute(`SELECT * FROM anomaly_alert_configs ORDER BY id DESC LIMIT 1`);
    if (!results || (results as any[]).length === 0) return null;
    return mapConfigFromDb((results as any[])[0]);
  } catch (error) {
    console.error('[AnomalyAlert] Error creating config:', error);
    return null;
  }
}

// Update alert config
export async function updateAlertConfig(id: number, updates: Partial<CreateAlertConfigInput>): Promise<AnomalyAlertConfig | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      params.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push('description = ?');
      params.push(updates.description);
    }
    if (updates.modelId !== undefined) {
      setClauses.push('model_id = ?');
      params.push(updates.modelId);
    }
    if (updates.deviceId !== undefined) {
      setClauses.push('device_id = ?');
      params.push(updates.deviceId);
    }
    if (updates.productionLineId !== undefined) {
      setClauses.push('production_line_id = ?');
      params.push(updates.productionLineId);
    }
    if (updates.severityThreshold !== undefined) {
      setClauses.push('severity_threshold = ?');
      params.push(updates.severityThreshold);
    }
    if (updates.anomalyScoreThreshold !== undefined) {
      setClauses.push('anomaly_score_threshold = ?');
      params.push(updates.anomalyScoreThreshold);
    }
    if (updates.consecutiveAnomalies !== undefined) {
      setClauses.push('consecutive_anomalies = ?');
      params.push(updates.consecutiveAnomalies);
    }
    if (updates.cooldownMinutes !== undefined) {
      setClauses.push('cooldown_minutes = ?');
      params.push(updates.cooldownMinutes);
    }
    if (updates.emailEnabled !== undefined) {
      setClauses.push('email_enabled = ?');
      params.push(updates.emailEnabled ? 1 : 0);
    }
    if (updates.emailRecipients !== undefined) {
      setClauses.push('email_recipients = ?');
      params.push(JSON.stringify(updates.emailRecipients));
    }
    if (updates.telegramEnabled !== undefined) {
      setClauses.push('telegram_enabled = ?');
      params.push(updates.telegramEnabled ? 1 : 0);
    }
    if (updates.telegramChatIds !== undefined) {
      setClauses.push('telegram_chat_ids = ?');
      params.push(JSON.stringify(updates.telegramChatIds));
    }
    if (updates.slackEnabled !== undefined) {
      setClauses.push('slack_enabled = ?');
      params.push(updates.slackEnabled ? 1 : 0);
    }
    if (updates.slackWebhookUrl !== undefined) {
      setClauses.push('slack_webhook_url = ?');
      params.push(updates.slackWebhookUrl);
    }
    if (updates.slackChannel !== undefined) {
      setClauses.push('slack_channel = ?');
      params.push(updates.slackChannel);
    }

    if (setClauses.length === 0) return getAlertConfigById(id);

    params.push(id);
    await db.execute(`UPDATE anomaly_alert_configs SET ${setClauses.join(', ')} WHERE id = ?`, params);
    return getAlertConfigById(id);
  } catch (error) {
    console.error('[AnomalyAlert] Error updating config:', error);
    return null;
  }
}

// Delete alert config
export async function deleteAlertConfig(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.execute(`DELETE FROM anomaly_alert_configs WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error('[AnomalyAlert] Error deleting config:', error);
    return false;
  }
}

// Toggle alert config active status
export async function toggleAlertConfig(id: number, isActive: boolean): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.execute(`UPDATE anomaly_alert_configs SET is_active = ? WHERE id = ?`, [isActive ? 1 : 0, id]);
    return true;
  } catch (error) {
    console.error('[AnomalyAlert] Error toggling config:', error);
    return false;
  }
}

// Process anomaly detection result and trigger alerts if needed
export async function processAnomalyForAlerts(
  anomalyResult: anomalyDetectionService.AnomalyDetectionResult,
  modelId: number,
  deviceId?: number
): Promise<{ alertTriggered: boolean; alertId?: number }> {
  const db = await getDb();
  if (!db) return { alertTriggered: false };

  try {
    // Get active alert configs for this model/device
    let query = `SELECT * FROM anomaly_alert_configs WHERE is_active = 1`;
    const params: any[] = [];

    if (modelId) {
      query += ` AND (model_id = ? OR model_id IS NULL)`;
      params.push(modelId);
    }
    if (deviceId) {
      query += ` AND (device_id = ? OR device_id IS NULL)`;
      params.push(deviceId);
    }

    const configs = await db.execute(query, params);
    if (!configs || (configs as any[]).length === 0) return { alertTriggered: false };

    for (const configRow of configs as any[]) {
      const config = mapConfigFromDb(configRow);
      
      // Check if alert should be triggered
      const shouldTrigger = await shouldTriggerAlert(config, anomalyResult, modelId, deviceId);
      
      if (shouldTrigger) {
        // Create alert and send notifications
        const alertId = await createAndSendAlert(config, anomalyResult, modelId, deviceId);
        if (alertId) {
          return { alertTriggered: true, alertId };
        }
      }
    }

    return { alertTriggered: false };
  } catch (error) {
    console.error('[AnomalyAlert] Error processing anomaly:', error);
    return { alertTriggered: false };
  }
}

// Check if alert should be triggered based on config
async function shouldTriggerAlert(
  config: AnomalyAlertConfig,
  anomalyResult: anomalyDetectionService.AnomalyDetectionResult,
  modelId: number,
  deviceId?: number
): Promise<boolean> {
  // Check if anomaly is detected
  if (!anomalyResult.isAnomaly) {
    // Reset consecutive count
    const key = `${config.id}-${modelId}-${deviceId || 'all'}`;
    consecutiveAnomalyCount.set(key, 0);
    return false;
  }

  // Check severity threshold
  const anomalySeverityLevel = severityLevels[anomalyResult.severity] || 0;
  const thresholdLevel = severityLevels[config.severityThreshold] || 0;
  if (anomalySeverityLevel < thresholdLevel) return false;

  // Check anomaly score threshold
  if (anomalyResult.anomalyScore < config.anomalyScoreThreshold) return false;

  // Check consecutive anomalies
  const key = `${config.id}-${modelId}-${deviceId || 'all'}`;
  const currentCount = (consecutiveAnomalyCount.get(key) || 0) + 1;
  consecutiveAnomalyCount.set(key, currentCount);

  if (currentCount < config.consecutiveAnomalies) return false;

  // Check cooldown
  if (config.lastTriggeredAt) {
    const cooldownMs = config.cooldownMinutes * 60 * 1000;
    if (Date.now() - config.lastTriggeredAt < cooldownMs) return false;
  }

  return true;
}

// Create alert and send notifications
async function createAndSendAlert(
  config: AnomalyAlertConfig,
  anomalyResult: anomalyDetectionService.AnomalyDetectionResult,
  modelId: number,
  deviceId?: number
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const now = Date.now();
    const title = generateAlertTitle(anomalyResult, modelId, deviceId);
    const message = generateAlertMessage(anomalyResult, modelId, deviceId);

    // Determine alert type
    let alertType: 'anomaly_detected' | 'threshold_exceeded' | 'consecutive_anomalies' | 'critical_severity' = 'anomaly_detected';
    if (anomalyResult.severity === 'critical') {
      alertType = 'critical_severity';
    } else if (anomalyResult.anomalyScore >= 0.9) {
      alertType = 'threshold_exceeded';
    } else {
      alertType = 'consecutive_anomalies';
    }

    // Insert alert history
    await db.execute(
      `INSERT INTO anomaly_alert_history (config_id, model_id, device_id, alert_type, severity, title, message, anomaly_value, anomaly_score, expected_min, expected_max, triggered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        config.id,
        modelId,
        deviceId || null,
        alertType,
        anomalyResult.severity,
        title,
        message,
        anomalyResult.value,
        anomalyResult.anomalyScore,
        anomalyResult.expectedRange.min,
        anomalyResult.expectedRange.max,
        now,
      ]
    );

    // Get the created alert ID
    const alertResults = await db.execute(`SELECT id FROM anomaly_alert_history ORDER BY id DESC LIMIT 1`);
    const alertId = (alertResults as any[])?.[0]?.id;

    // Update last triggered time
    await db.execute(`UPDATE anomaly_alert_configs SET last_triggered_at = ? WHERE id = ?`, [now, config.id]);

    // Reset consecutive count
    const key = `${config.id}-${modelId}-${deviceId || 'all'}`;
    consecutiveAnomalyCount.set(key, 0);

    // Send notifications
    await sendNotifications(config, alertId, title, message, anomalyResult);

    return alertId;
  } catch (error) {
    console.error('[AnomalyAlert] Error creating alert:', error);
    return null;
  }
}

// Generate alert title
function generateAlertTitle(
  anomalyResult: anomalyDetectionService.AnomalyDetectionResult,
  modelId: number,
  deviceId?: number
): string {
  const severityEmoji = {
    low: '⚠️',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  };

  const emoji = severityEmoji[anomalyResult.severity] || '⚠️';
  const deviceInfo = deviceId ? `Device #${deviceId}` : `Model #${modelId}`;
  const typeInfo = anomalyResult.anomalyType ? ` - ${anomalyResult.anomalyType.toUpperCase()}` : '';

  return `${emoji} Anomaly Detected: ${deviceInfo}${typeInfo}`;
}

// Generate alert message
function generateAlertMessage(
  anomalyResult: anomalyDetectionService.AnomalyDetectionResult,
  modelId: number,
  deviceId?: number
): string {
  const lines = [
    `🔍 **Anomaly Detection Alert**`,
    ``,
    `📊 **Details:**`,
    `- Value: ${anomalyResult.value.toFixed(4)}`,
    `- Anomaly Score: ${(anomalyResult.anomalyScore * 100).toFixed(2)}%`,
    `- Severity: ${anomalyResult.severity.toUpperCase()}`,
    `- Type: ${anomalyResult.anomalyType || 'Unknown'}`,
    `- Confidence: ${(anomalyResult.confidence * 100).toFixed(2)}%`,
    ``,
    `📏 **Expected Range:**`,
    `- Min: ${anomalyResult.expectedRange.min.toFixed(4)}`,
    `- Max: ${anomalyResult.expectedRange.max.toFixed(4)}`,
    `- Deviation: ${anomalyResult.deviation.toFixed(2)}%`,
    ``,
    `⏰ **Time:** ${new Date(anomalyResult.timestamp).toLocaleString('vi-VN')}`,
  ];

  if (deviceId) {
    lines.push(`🔧 **Device ID:** ${deviceId}`);
  }
  lines.push(`🤖 **Model ID:** ${modelId}`);

  return lines.join('\n');
}

// Send notifications via all enabled channels
async function sendNotifications(
  config: AnomalyAlertConfig,
  alertId: number,
  title: string,
  message: string,
  anomalyResult: anomalyDetectionService.AnomalyDetectionResult
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Send Email
  if (config.emailEnabled && config.emailRecipients.length > 0) {
    try {
      const smtpConfig = await getSmtpConfig();
      if (smtpConfig) {
        const htmlMessage = generateEmailHtml(title, message, anomalyResult);
        for (const email of config.emailRecipients) {
          await sendEmail(email, title, htmlMessage);
        }
        await db.execute(
          `UPDATE anomaly_alert_history SET email_sent = 1, email_sent_at = ? WHERE id = ?`,
          [Date.now(), alertId]
        );
      }
    } catch (error) {
      console.error('[AnomalyAlert] Error sending email:', error);
    }
  }

  // Send Telegram
  if (config.telegramEnabled && config.telegramChatIds.length > 0) {
    try {
      const telegramConfigs = await telegramService.getTelegramConfigs();
      const activeBot = telegramConfigs.find(c => c.isActive);
      
      if (activeBot) {
        for (const chatId of config.telegramChatIds) {
          await fetch(`https://api.telegram.org/bot${activeBot.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: 'Markdown',
            }),
          });
        }
        await db.execute(
          `UPDATE anomaly_alert_history SET telegram_sent = 1, telegram_sent_at = ? WHERE id = ?`,
          [Date.now(), alertId]
        );
      }
    } catch (error) {
      console.error('[AnomalyAlert] Error sending Telegram:', error);
    }
  }

  // Send Slack
  if (config.slackEnabled && config.slackWebhookUrl) {
    try {
      await fetch(config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: config.slackChannel || undefined,
          text: title,
          attachments: [
            {
              color: getSeverityColor(anomalyResult.severity),
              text: message,
              fields: [
                { title: 'Value', value: anomalyResult.value.toFixed(4), short: true },
                { title: 'Score', value: `${(anomalyResult.anomalyScore * 100).toFixed(2)}%`, short: true },
                { title: 'Severity', value: anomalyResult.severity.toUpperCase(), short: true },
                { title: 'Type', value: anomalyResult.anomalyType || 'Unknown', short: true },
              ],
            },
          ],
        }),
      });
      await db.execute(
        `UPDATE anomaly_alert_history SET slack_sent = 1, slack_sent_at = ? WHERE id = ?`,
        [Date.now(), alertId]
      );
    } catch (error) {
      console.error('[AnomalyAlert] Error sending Slack:', error);
    }
  }
}

// Generate HTML email content
function generateEmailHtml(
  title: string,
  message: string,
  anomalyResult: anomalyDetectionService.AnomalyDetectionResult
): string {
  const severityColors = {
    low: '#fbbf24',
    medium: '#f97316',
    high: '#ef4444',
    critical: '#dc2626',
  };

  const color = severityColors[anomalyResult.severity] || '#6b7280';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${color}; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${title}</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Value:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${anomalyResult.value.toFixed(4)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Anomaly Score:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${(anomalyResult.anomalyScore * 100).toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Severity:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
              <span style="background: ${color}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
                ${anomalyResult.severity.toUpperCase()}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${anomalyResult.anomalyType || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Expected Range:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${anomalyResult.expectedRange.min.toFixed(4)} - ${anomalyResult.expectedRange.max.toFixed(4)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Deviation:</strong></td>
            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${anomalyResult.deviation.toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>Time:</strong></td>
            <td style="padding: 8px 0;">${new Date(anomalyResult.timestamp).toLocaleString('vi-VN')}</td>
          </tr>
        </table>
        <hr style="border: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          This is an automated alert from CPK/SPC Calculator - IoT Anomaly Detection System
        </p>
      </div>
    </div>
  `;
}

// Get severity color for Slack
function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: '#fbbf24',
    medium: '#f97316',
    high: '#ef4444',
    critical: '#dc2626',
  };
  return colors[severity] || '#6b7280';
}

// Get alert history
export async function getAlertHistory(options: {
  configId?: number;
  modelId?: number;
  deviceId?: number;
  severity?: string;
  acknowledged?: boolean;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}): Promise<{ alerts: AnomalyAlertHistory[]; total: number }> {
  const db = await getDb();
  if (!db) return { alerts: [], total: 0 };

  try {
    let whereClause = '1=1';
    const params: any[] = [];

    if (options.configId) {
      whereClause += ' AND config_id = ?';
      params.push(options.configId);
    }
    if (options.modelId) {
      whereClause += ' AND model_id = ?';
      params.push(options.modelId);
    }
    if (options.deviceId) {
      whereClause += ' AND device_id = ?';
      params.push(options.deviceId);
    }
    if (options.severity) {
      whereClause += ' AND severity = ?';
      params.push(options.severity);
    }
    if (options.acknowledged !== undefined) {
      whereClause += ' AND acknowledged = ?';
      params.push(options.acknowledged ? 1 : 0);
    }
    if (options.startTime) {
      whereClause += ' AND triggered_at >= ?';
      params.push(options.startTime);
    }
    if (options.endTime) {
      whereClause += ' AND triggered_at <= ?';
      params.push(options.endTime);
    }

    // Get total count
    const countResult = await db.execute(`SELECT COUNT(*) as total FROM anomaly_alert_history WHERE ${whereClause}`, params);
    const total = (countResult as any[])?.[0]?.total || 0;

    // Get alerts
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    params.push(limit, offset);

    const results = await db.execute(
      `SELECT * FROM anomaly_alert_history WHERE ${whereClause} ORDER BY triggered_at DESC LIMIT ? OFFSET ?`,
      params
    );

    const alerts = ((results as any[]) || []).map(mapHistoryFromDb);
    return { alerts, total };
  } catch (error) {
    console.error('[AnomalyAlert] Error fetching history:', error);
    return { alerts: [], total: 0 };
  }
}

// Acknowledge alert
export async function acknowledgeAlert(alertId: number, userId: number, resolution?: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.execute(
      `UPDATE anomaly_alert_history SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = ?, resolution = ? WHERE id = ?`,
      [userId, Date.now(), resolution || null, alertId]
    );
    return true;
  } catch (error) {
    console.error('[AnomalyAlert] Error acknowledging alert:', error);
    return false;
  }
}

// Get alert statistics
export async function getAlertStats(options: {
  startTime?: number;
  endTime?: number;
}): Promise<{
  totalAlerts: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  acknowledgedCount: number;
  unacknowledgedCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalAlerts: 0,
      bySeverity: {},
      byType: {},
      acknowledgedCount: 0,
      unacknowledgedCount: 0,
    };
  }

  try {
    let whereClause = '1=1';
    const params: any[] = [];

    if (options.startTime) {
      whereClause += ' AND triggered_at >= ?';
      params.push(options.startTime);
    }
    if (options.endTime) {
      whereClause += ' AND triggered_at <= ?';
      params.push(options.endTime);
    }

    // Get total and acknowledged counts
    const countResult = await db.execute(
      `SELECT COUNT(*) as total, SUM(acknowledged) as acknowledged FROM anomaly_alert_history WHERE ${whereClause}`,
      params
    );
    const totalAlerts = (countResult as any[])?.[0]?.total || 0;
    const acknowledgedCount = (countResult as any[])?.[0]?.acknowledged || 0;

    // Get by severity
    const severityResult = await db.execute(
      `SELECT severity, COUNT(*) as count FROM anomaly_alert_history WHERE ${whereClause} GROUP BY severity`,
      params
    );
    const bySeverity: Record<string, number> = {};
    for (const row of (severityResult as any[]) || []) {
      bySeverity[row.severity] = row.count;
    }

    // Get by type
    const typeResult = await db.execute(
      `SELECT alert_type, COUNT(*) as count FROM anomaly_alert_history WHERE ${whereClause} GROUP BY alert_type`,
      params
    );
    const byType: Record<string, number> = {};
    for (const row of (typeResult as any[]) || []) {
      byType[row.alert_type] = row.count;
    }

    return {
      totalAlerts,
      bySeverity,
      byType,
      acknowledgedCount,
      unacknowledgedCount: totalAlerts - acknowledgedCount,
    };
  } catch (error) {
    console.error('[AnomalyAlert] Error fetching stats:', error);
    return {
      totalAlerts: 0,
      bySeverity: {},
      byType: {},
      acknowledgedCount: 0,
      unacknowledgedCount: 0,
    };
  }
}

// Helper: Map config from database row
function mapConfigFromDb(row: any): AnomalyAlertConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    modelId: row.model_id,
    deviceId: row.device_id,
    productionLineId: row.production_line_id,
    severityThreshold: row.severity_threshold || 'medium',
    anomalyScoreThreshold: row.anomaly_score_threshold ? parseFloat(row.anomaly_score_threshold) : 0.7,
    consecutiveAnomalies: row.consecutive_anomalies || 3,
    cooldownMinutes: row.cooldown_minutes || 15,
    emailEnabled: row.email_enabled === 1,
    emailRecipients: row.email_recipients ? JSON.parse(row.email_recipients) : [],
    telegramEnabled: row.telegram_enabled === 1,
    telegramChatIds: row.telegram_chat_ids ? JSON.parse(row.telegram_chat_ids) : [],
    slackEnabled: row.slack_enabled === 1,
    slackWebhookUrl: row.slack_webhook_url,
    slackChannel: row.slack_channel,
    isActive: row.is_active === 1,
    lastTriggeredAt: row.last_triggered_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper: Map history from database row
function mapHistoryFromDb(row: any): AnomalyAlertHistory {
  return {
    id: row.id,
    configId: row.config_id,
    anomalyDetectionId: row.anomaly_detection_id,
    modelId: row.model_id,
    deviceId: row.device_id,
    alertType: row.alert_type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    anomalyValue: row.anomaly_value ? parseFloat(row.anomaly_value) : null,
    anomalyScore: row.anomaly_score ? parseFloat(row.anomaly_score) : null,
    expectedMin: row.expected_min ? parseFloat(row.expected_min) : null,
    expectedMax: row.expected_max ? parseFloat(row.expected_max) : null,
    emailSent: row.email_sent === 1,
    emailSentAt: row.email_sent_at,
    telegramSent: row.telegram_sent === 1,
    telegramSentAt: row.telegram_sent_at,
    slackSent: row.slack_sent === 1,
    slackSentAt: row.slack_sent_at,
    acknowledged: row.acknowledged === 1,
    acknowledgedBy: row.acknowledged_by,
    acknowledgedAt: row.acknowledged_at,
    resolution: row.resolution,
    triggeredAt: row.triggered_at,
    createdAt: row.created_at,
  };
}
