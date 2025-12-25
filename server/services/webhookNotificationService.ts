/**
 * Webhook Notification Service
 * Gửi thông báo qua Slack/Teams webhook khi có drift alerts
 */

import { getDb } from "../db";
import { webhookConfig, type WebhookConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export interface WebhookMessage {
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  fields?: { name: string; value: string }[];
  timestamp?: Date;
}

export interface SlackMessage {
  text: string;
  attachments?: {
    color: string;
    title: string;
    text: string;
    fields?: { title: string; value: string; short?: boolean }[];
    footer?: string;
    ts?: number;
  }[];
  channel?: string;
}

export interface TeamsMessage {
  "@type": "MessageCard";
  "@context": "http://schema.org/extensions";
  themeColor: string;
  summary: string;
  sections: {
    activityTitle: string;
    activitySubtitle?: string;
    facts?: { name: string; value: string }[];
    markdown?: boolean;
  }[];
}

class WebhookNotificationService {
  private async db() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db;
  }

  // Get webhook configuration
  async getConfig(): Promise<WebhookConfig | null> {
    const db = await this.db();
    const [config] = await db.select().from(webhookConfig).limit(1);
    return config || null;
  }

  // Update webhook configuration
  async updateConfig(updates: {
    slackWebhookUrl?: string;
    slackChannel?: string;
    slackEnabled?: boolean;
    teamsWebhookUrl?: string;
    teamsEnabled?: boolean;
  }): Promise<WebhookConfig> {
    const db = await this.db();
    
    // Check if config exists
    const existing = await this.getConfig();
    
    if (existing) {
      await db.update(webhookConfig)
        .set({
          slackWebhookUrl: updates.slackWebhookUrl ?? existing.slackWebhookUrl,
          slackChannel: updates.slackChannel ?? existing.slackChannel,
          slackEnabled: updates.slackEnabled !== undefined ? (updates.slackEnabled ? 1 : 0) : existing.slackEnabled,
          teamsWebhookUrl: updates.teamsWebhookUrl ?? existing.teamsWebhookUrl,
          teamsEnabled: updates.teamsEnabled !== undefined ? (updates.teamsEnabled ? 1 : 0) : existing.teamsEnabled,
        })
        .where(eq(webhookConfig.id, existing.id));
      
      const [updated] = await db.select().from(webhookConfig).where(eq(webhookConfig.id, existing.id));
      return updated;
    } else {
      const [result] = await db.insert(webhookConfig).values({
        slackWebhookUrl: updates.slackWebhookUrl,
        slackChannel: updates.slackChannel,
        slackEnabled: updates.slackEnabled ? 1 : 0,
        teamsWebhookUrl: updates.teamsWebhookUrl,
        teamsEnabled: updates.teamsEnabled ? 1 : 0,
      });
      
      const insertId = (result as any).insertId;
      const [created] = await db.select().from(webhookConfig).where(eq(webhookConfig.id, insertId));
      return created;
    }
  }

  // Build Slack message
  private buildSlackMessage(msg: WebhookMessage): SlackMessage {
    const colorMap = {
      info: '#36a64f',
      warning: '#ff9800',
      critical: '#f44336',
    };

    return {
      text: msg.title,
      attachments: [{
        color: colorMap[msg.severity || 'info'],
        title: msg.title,
        text: msg.message,
        fields: msg.fields?.map(f => ({
          title: f.name,
          value: f.value,
          short: true,
        })),
        footer: 'SPC/CPK Calculator - AI Monitoring',
        ts: Math.floor((msg.timestamp || new Date()).getTime() / 1000),
      }],
    };
  }

  // Build Teams message
  private buildTeamsMessage(msg: WebhookMessage): TeamsMessage {
    const colorMap = {
      info: '36a64f',
      warning: 'ff9800',
      critical: 'f44336',
    };

    return {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: colorMap[msg.severity || 'info'],
      summary: msg.title,
      sections: [{
        activityTitle: msg.title,
        activitySubtitle: new Date().toLocaleString('vi-VN'),
        facts: [
          { name: 'Message', value: msg.message },
          ...(msg.fields || []).map(f => ({ name: f.name, value: f.value })),
        ],
        markdown: true,
      }],
    };
  }

  // Send to Slack
  async sendToSlack(msg: WebhookMessage): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig();
    
    if (!config?.slackEnabled || !config?.slackWebhookUrl) {
      return { success: false, error: 'Slack webhook not configured or disabled' };
    }

    try {
      const slackMsg = this.buildSlackMessage(msg);
      if (config.slackChannel) {
        slackMsg.channel = config.slackChannel;
      }

      const response = await fetch(config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMsg),
      });

      if (!response.ok) {
        return { success: false, error: `Slack API error: ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Send to Teams
  async sendToTeams(msg: WebhookMessage): Promise<{ success: boolean; error?: string }> {
    const config = await this.getConfig();
    
    if (!config?.teamsEnabled || !config?.teamsWebhookUrl) {
      return { success: false, error: 'Teams webhook not configured or disabled' };
    }

    try {
      const teamsMsg = this.buildTeamsMessage(msg);

      const response = await fetch(config.teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamsMsg),
      });

      if (!response.ok) {
        return { success: false, error: `Teams API error: ${response.status}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Send to all enabled webhooks
  async sendNotification(msg: WebhookMessage): Promise<{
    slack: { success: boolean; error?: string };
    teams: { success: boolean; error?: string };
  }> {
    const [slackResult, teamsResult] = await Promise.all([
      this.sendToSlack(msg),
      this.sendToTeams(msg),
    ]);

    return {
      slack: slackResult,
      teams: teamsResult,
    };
  }

  // Send drift alert notification
  async sendDriftAlert(alert: {
    modelId: number;
    modelName?: string;
    driftType: string;
    severity: string;
    driftScore: number;
    recommendation?: string;
  }): Promise<{ slack: { success: boolean; error?: string }; teams: { success: boolean; error?: string } }> {
    const severityEmoji = {
      low: '🔵',
      medium: '🟡',
      high: '🟠',
      critical: '🔴',
    };

    const driftTypeLabels: Record<string, string> = {
      accuracy_drop: 'Accuracy Drop',
      feature_drift: 'Feature Drift',
      prediction_drift: 'Prediction Drift',
      data_quality: 'Data Quality Issue',
    };

    const msg: WebhookMessage = {
      title: `${severityEmoji[alert.severity as keyof typeof severityEmoji] || '⚠️'} Data Drift Alert - ${alert.severity.toUpperCase()}`,
      message: `Phát hiện ${driftTypeLabels[alert.driftType] || alert.driftType} cho Model #${alert.modelId}${alert.modelName ? ` (${alert.modelName})` : ''}`,
      severity: alert.severity === 'critical' || alert.severity === 'high' ? 'critical' : 
                alert.severity === 'medium' ? 'warning' : 'info',
      fields: [
        { name: 'Model ID', value: String(alert.modelId) },
        { name: 'Drift Type', value: driftTypeLabels[alert.driftType] || alert.driftType },
        { name: 'Severity', value: alert.severity.toUpperCase() },
        { name: 'Drift Score', value: (alert.driftScore * 100).toFixed(2) + '%' },
        ...(alert.recommendation ? [{ name: 'Recommendation', value: alert.recommendation }] : []),
      ],
      timestamp: new Date(),
    };

    return await this.sendNotification(msg);
  }

  // Send A/B test completion notification
  async sendABTestCompletion(test: {
    testId: number;
    testName: string;
    winner: 'A' | 'B' | 'tie' | null;
    modelAAccuracy: number;
    modelBAccuracy: number;
    isSignificant: boolean;
    recommendation?: string;
  }): Promise<{ slack: { success: boolean; error?: string }; teams: { success: boolean; error?: string } }> {
    const winnerText = test.winner === 'A' ? 'Model A (Control)' :
                       test.winner === 'B' ? 'Model B (Variant)' :
                       test.winner === 'tie' ? 'Tie (No significant difference)' : 'Undetermined';

    const msg: WebhookMessage = {
      title: `🧪 A/B Test Completed: ${test.testName}`,
      message: `Test #${test.testId} đã hoàn thành. Winner: ${winnerText}`,
      severity: test.isSignificant ? 'info' : 'warning',
      fields: [
        { name: 'Test ID', value: String(test.testId) },
        { name: 'Winner', value: winnerText },
        { name: 'Model A Accuracy', value: (test.modelAAccuracy * 100).toFixed(2) + '%' },
        { name: 'Model B Accuracy', value: (test.modelBAccuracy * 100).toFixed(2) + '%' },
        { name: 'Statistically Significant', value: test.isSignificant ? 'Yes' : 'No' },
        ...(test.recommendation ? [{ name: 'Recommendation', value: test.recommendation }] : []),
      ],
      timestamp: new Date(),
    };

    return await this.sendNotification(msg);
  }

  // Send scheduled drift check summary
  async sendDriftCheckSummary(summary: {
    modelsChecked: number;
    alertsCreated: number;
    criticalAlerts: number;
    highAlerts: number;
    checkDuration: number;
  }): Promise<{ slack: { success: boolean; error?: string }; teams: { success: boolean; error?: string } }> {
    const hasCritical = summary.criticalAlerts > 0;
    const hasHigh = summary.highAlerts > 0;

    const msg: WebhookMessage = {
      title: `📊 Scheduled Drift Check Summary`,
      message: `Đã kiểm tra ${summary.modelsChecked} models, tạo ${summary.alertsCreated} alerts mới`,
      severity: hasCritical ? 'critical' : hasHigh ? 'warning' : 'info',
      fields: [
        { name: 'Models Checked', value: String(summary.modelsChecked) },
        { name: 'New Alerts', value: String(summary.alertsCreated) },
        { name: 'Critical Alerts', value: String(summary.criticalAlerts) },
        { name: 'High Alerts', value: String(summary.highAlerts) },
        { name: 'Check Duration', value: `${summary.checkDuration}ms` },
      ],
      timestamp: new Date(),
    };

    return await this.sendNotification(msg);
  }

  // Test webhook connection
  async testWebhook(type: 'slack' | 'teams'): Promise<{ success: boolean; error?: string }> {
    const testMsg: WebhookMessage = {
      title: '🔔 Webhook Test',
      message: 'This is a test message from SPC/CPK Calculator AI Monitoring',
      severity: 'info',
      fields: [
        { name: 'Status', value: 'Connection successful' },
        { name: 'Time', value: new Date().toLocaleString('vi-VN') },
      ],
      timestamp: new Date(),
    };

    if (type === 'slack') {
      return await this.sendToSlack(testMsg);
    } else {
      return await this.sendToTeams(testMsg);
    }
  }
}

export const webhookNotificationService = new WebhookNotificationService();
