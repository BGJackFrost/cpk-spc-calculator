import { getDb } from "../db";
import { escalationWebhookConfigs, escalationWebhookLogs } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export interface EscalationWebhookConfig {
  id: number;
  name: string;
  description?: string | null;
  channelType: 'slack' | 'teams' | 'discord' | 'custom';
  webhookUrl: string;
  slackChannel?: string | null;
  slackMentions?: string[] | null;
  teamsTitle?: string | null;
  customHeaders?: Record<string, string> | null;
  customBodyTemplate?: string | null;
  includeDetails: boolean;
  includeChart: boolean;
  isActive: boolean;
  createdBy?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface EscalationAlert {
  id?: number;
  alertType: string;
  alertTitle: string;
  alertMessage?: string;
  severity?: string;
  escalationLevel: number;
  productionLineName?: string;
  machineName?: string;
  metricValue?: number;
  threshold?: number;
  timestamp?: number;
}

function formatSlackMessage(alert: EscalationAlert, config: EscalationWebhookConfig): object {
  const severityEmoji: Record<string, string> = { critical: '🔴', warning: '🟡', info: '🔵' };
  const emoji = severityEmoji[alert.severity || ''] || '⚠️';
  
  const blocks: any[] = [
    { type: 'header', text: { type: 'plain_text', text: `${emoji} Escalation Level ${alert.escalationLevel}: ${alert.alertTitle}`, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: alert.alertMessage || 'No message provided' } },
  ];

  if (config.includeDetails) {
    const fields: any[] = [];
    if (alert.alertType) fields.push({ type: 'mrkdwn', text: `*Alert Type:*\n${alert.alertType}` });
    if (alert.severity) fields.push({ type: 'mrkdwn', text: `*Severity:*\n${alert.severity}` });
    if (alert.productionLineName) fields.push({ type: 'mrkdwn', text: `*Production Line:*\n${alert.productionLineName}` });
    if (alert.machineName) fields.push({ type: 'mrkdwn', text: `*Machine:*\n${alert.machineName}` });
    if (alert.metricValue !== undefined) fields.push({ type: 'mrkdwn', text: `*Metric Value:*\n${alert.metricValue}` });
    if (alert.threshold !== undefined) fields.push({ type: 'mrkdwn', text: `*Threshold:*\n${alert.threshold}` });
    if (fields.length > 0) blocks.push({ type: 'section', fields: fields.slice(0, 10) });
  }

  let text = '';
  if (config.slackMentions && config.slackMentions.length > 0) {
    text = config.slackMentions.map(m => `<@${m}>`).join(' ') + ' ';
  }

  return { channel: config.slackChannel || undefined, text: text + `Escalation Alert: ${alert.alertTitle}`, blocks };
}

function formatTeamsMessage(alert: EscalationAlert, config: EscalationWebhookConfig): object {
  const themeColor = alert.severity === 'critical' ? 'FF0000' : alert.severity === 'warning' ? 'FFA500' : '0078D7';
  const facts: any[] = [];
  if (alert.alertType) facts.push({ name: 'Alert Type', value: alert.alertType });
  if (alert.severity) facts.push({ name: 'Severity', value: alert.severity });
  if (alert.productionLineName) facts.push({ name: 'Production Line', value: alert.productionLineName });
  if (alert.machineName) facts.push({ name: 'Machine', value: alert.machineName });
  if (alert.metricValue !== undefined) facts.push({ name: 'Metric Value', value: String(alert.metricValue) });
  if (alert.threshold !== undefined) facts.push({ name: 'Threshold', value: String(alert.threshold) });

  return {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor,
    summary: `Escalation Level ${alert.escalationLevel}: ${alert.alertTitle}`,
    title: config.teamsTitle || `🚨 Escalation Level ${alert.escalationLevel}`,
    sections: [{ activityTitle: alert.alertTitle, activitySubtitle: new Date(alert.timestamp || Date.now()).toLocaleString('vi-VN'), text: alert.alertMessage || '', facts: config.includeDetails ? facts : [] }],
  };
}

function formatDiscordMessage(alert: EscalationAlert, config: EscalationWebhookConfig): object {
  const color = alert.severity === 'critical' ? 16711680 : alert.severity === 'warning' ? 16753920 : 3447003;
  const fields: any[] = [];
  if (config.includeDetails) {
    if (alert.alertType) fields.push({ name: 'Alert Type', value: alert.alertType, inline: true });
    if (alert.severity) fields.push({ name: 'Severity', value: alert.severity, inline: true });
    if (alert.productionLineName) fields.push({ name: 'Production Line', value: alert.productionLineName, inline: true });
    if (alert.machineName) fields.push({ name: 'Machine', value: alert.machineName, inline: true });
    if (alert.metricValue !== undefined) fields.push({ name: 'Metric Value', value: String(alert.metricValue), inline: true });
    if (alert.threshold !== undefined) fields.push({ name: 'Threshold', value: String(alert.threshold), inline: true });
  }
  return { embeds: [{ title: `🚨 Escalation Level ${alert.escalationLevel}: ${alert.alertTitle}`, description: alert.alertMessage || '', color, fields, timestamp: new Date(alert.timestamp || Date.now()).toISOString(), footer: { text: 'SPC/CPK Alert System' } }] };
}

function formatCustomMessage(alert: EscalationAlert, config: EscalationWebhookConfig): object {
  if (config.customBodyTemplate) {
    try {
      let body = config.customBodyTemplate;
      body = body.replace(/\{\{alertType\}\}/g, alert.alertType || '');
      body = body.replace(/\{\{alertTitle\}\}/g, alert.alertTitle || '');
      body = body.replace(/\{\{alertMessage\}\}/g, alert.alertMessage || '');
      body = body.replace(/\{\{severity\}\}/g, alert.severity || '');
      body = body.replace(/\{\{escalationLevel\}\}/g, String(alert.escalationLevel));
      body = body.replace(/\{\{productionLineName\}\}/g, alert.productionLineName || '');
      body = body.replace(/\{\{machineName\}\}/g, alert.machineName || '');
      body = body.replace(/\{\{metricValue\}\}/g, String(alert.metricValue || ''));
      body = body.replace(/\{\{threshold\}\}/g, String(alert.threshold || ''));
      body = body.replace(/\{\{timestamp\}\}/g, new Date(alert.timestamp || Date.now()).toISOString());
      return JSON.parse(body);
    } catch (e) { console.error('Failed to parse custom body template:', e); }
  }
  return { escalationLevel: alert.escalationLevel, alertType: alert.alertType, alertTitle: alert.alertTitle, alertMessage: alert.alertMessage, severity: alert.severity, productionLineName: alert.productionLineName, machineName: alert.machineName, metricValue: alert.metricValue, threshold: alert.threshold, timestamp: new Date(alert.timestamp || Date.now()).toISOString() };
}

export async function sendEscalationWebhook(configId: number, alert: EscalationAlert, escalationHistoryId?: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };
  
  try {
    const configs = await db.select().from(escalationWebhookConfigs).where(and(eq(escalationWebhookConfigs.id, configId), eq(escalationWebhookConfigs.isActive, true)));
    if (configs.length === 0) return { success: false, error: 'Webhook config not found or inactive' };
    
    const config = configs[0] as unknown as EscalationWebhookConfig;
    let payload: object;
    switch (config.channelType) {
      case 'slack': payload = formatSlackMessage(alert, config); break;
      case 'teams': payload = formatTeamsMessage(alert, config); break;
      case 'discord': payload = formatDiscordMessage(alert, config); break;
      default: payload = formatCustomMessage(alert, config); break;
    }
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.customHeaders) Object.assign(headers, config.customHeaders);
    
    const response = await fetch(config.webhookUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
    const responseBody = await response.text();
    const success = response.ok;
    
    await db.insert(escalationWebhookLogs).values({
      webhookConfigId: configId, escalationHistoryId: escalationHistoryId || null, escalationLevel: alert.escalationLevel,
      alertType: alert.alertType, alertTitle: alert.alertTitle, alertMessage: alert.alertMessage || null,
      channelType: config.channelType, requestPayload: JSON.stringify(payload), responseStatus: response.status,
      responseBody: responseBody.substring(0, 5000), success, errorMessage: success ? null : responseBody, sentAt: Date.now(),
    } as any);
    
    return { success, error: success ? undefined : responseBody };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    try {
      await db.insert(escalationWebhookLogs).values({
        webhookConfigId: configId, escalationHistoryId: escalationHistoryId || null, escalationLevel: alert.escalationLevel,
        alertType: alert.alertType, alertTitle: alert.alertTitle, alertMessage: alert.alertMessage || null,
        channelType: 'unknown', requestPayload: null, responseStatus: null, responseBody: null,
        success: false, errorMessage, sentAt: Date.now(),
      } as any);
    } catch (logError) { console.error('Failed to log webhook error:', logError); }
    return { success: false, error: errorMessage };
  }
}

export async function sendEscalationToWebhooks(webhookIds: number[], alert: EscalationAlert, escalationHistoryId?: number): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = await Promise.all(webhookIds.map(id => sendEscalationWebhook(id, alert, escalationHistoryId)));
  return { sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, errors: results.filter(r => r.error).map(r => r.error!) };
}

export async function createEscalationWebhookConfig(data: Omit<EscalationWebhookConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = Date.now();
  const result = await db.insert(escalationWebhookConfigs).values({
    ...data, slackMentions: data.slackMentions ? JSON.stringify(data.slackMentions) : null,
    customHeaders: data.customHeaders ? JSON.stringify(data.customHeaders) : null, createdAt: now, updatedAt: now,
  } as any);
  return (result as any)[0].insertId;
}

export async function getEscalationWebhookConfigs(activeOnly = false): Promise<EscalationWebhookConfig[]> {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(escalationWebhookConfigs);
  if (activeOnly) query = query.where(eq(escalationWebhookConfigs.isActive, true)) as any;
  const results = await query.orderBy(desc(escalationWebhookConfigs.createdAt));
  return results.map(r => ({
    ...r, slackMentions: r.slackMentions ? (typeof r.slackMentions === 'string' ? JSON.parse(r.slackMentions) : r.slackMentions) : null,
    customHeaders: r.customHeaders ? (typeof r.customHeaders === 'string' ? JSON.parse(r.customHeaders) : r.customHeaders) : null,
  })) as unknown as EscalationWebhookConfig[];
}

export async function getEscalationWebhookConfigById(id: number): Promise<EscalationWebhookConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(escalationWebhookConfigs).where(eq(escalationWebhookConfigs.id, id));
  if (results.length === 0) return null;
  const r = results[0];
  return { ...r, slackMentions: r.slackMentions ? (typeof r.slackMentions === 'string' ? JSON.parse(r.slackMentions) : r.slackMentions) : null,
    customHeaders: r.customHeaders ? (typeof r.customHeaders === 'string' ? JSON.parse(r.customHeaders) : r.customHeaders) : null } as unknown as EscalationWebhookConfig;
}

export async function updateEscalationWebhookConfig(id: number, data: Partial<EscalationWebhookConfig>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { ...data, updatedAt: Date.now() };
  if (data.slackMentions) updateData.slackMentions = JSON.stringify(data.slackMentions);
  if (data.customHeaders) updateData.customHeaders = JSON.stringify(data.customHeaders);
  await db.update(escalationWebhookConfigs).set(updateData).where(eq(escalationWebhookConfigs.id, id));
}

export async function deleteEscalationWebhookConfig(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(escalationWebhookConfigs).where(eq(escalationWebhookConfigs.id, id));
}

export async function getEscalationWebhookLogs(options: { webhookConfigId?: number; escalationHistoryId?: number; limit?: number; offset?: number }): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(escalationWebhookLogs);
  const conditions = [];
  if (options.webhookConfigId) conditions.push(eq(escalationWebhookLogs.webhookConfigId, options.webhookConfigId));
  if (options.escalationHistoryId) conditions.push(eq(escalationWebhookLogs.escalationHistoryId, options.escalationHistoryId));
  if (conditions.length > 0) query = query.where(and(...conditions)) as any;
  return await query.orderBy(desc(escalationWebhookLogs.sentAt)).limit(options.limit || 100).offset(options.offset || 0);
}

export async function testEscalationWebhook(configId: number): Promise<{ success: boolean; error?: string }> {
  const testAlert: EscalationAlert = {
    alertType: 'test', alertTitle: 'Test Escalation Webhook',
    alertMessage: 'This is a test message from the SPC/CPK Alert System. If you receive this, the webhook is configured correctly.',
    severity: 'info', escalationLevel: 1, productionLineName: 'Test Line', machineName: 'Test Machine',
    metricValue: 1.33, threshold: 1.0, timestamp: Date.now(),
  };
  return await sendEscalationWebhook(configId, testAlert);
}
