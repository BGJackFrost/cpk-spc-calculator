/**
 * Webhook Escalation Cron Service
 * Tự động xử lý escalation khi webhook thất bại liên tục
 */

import { getDb } from '../db';
import { alertWebhookLogs, alertWebhookConfigs, systemConfig } from '../../drizzle/schema';
import { eq, and, gte, sql } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';
import { sendAlertEmail } from './emailService';

interface EscalationLevel {
  level: number;
  name: string;
  failureCount: number;
  notifyEmails: string[];
  notifyOwner: boolean;
}

interface EscalationConfig {
  enabled: boolean;
  checkWindowMinutes: number;
  levels: EscalationLevel[];
}

const DEFAULT_CONFIG: EscalationConfig = {
  enabled: true,
  checkWindowMinutes: 30,
  levels: [
    { level: 1, name: 'Warning', failureCount: 3, notifyEmails: [], notifyOwner: false },
    { level: 2, name: 'Critical', failureCount: 5, notifyEmails: [], notifyOwner: true },
    { level: 3, name: 'Emergency', failureCount: 10, notifyEmails: [], notifyOwner: true },
  ],
};

const escalationState = new Map<number, {
  currentLevel: number;
  lastNotifiedAt: Date | null;
  consecutiveFailures: number;
}>();

const escalationLogs: Array<{
  timestamp: Date;
  webhookId: number;
  webhookName: string;
  level: number;
  levelName: string;
  failureCount: number;
  action: string;
  notified: string[];
}> = [];

export async function getWebhookEscalationConfig(): Promise<EscalationConfig> {
  try {
    const db = await getDb();
    if (!db) return DEFAULT_CONFIG;
    const [config] = await db.select().from(systemConfig).where(eq(systemConfig.configKey, 'webhook_escalation_config')).limit(1);
    if (config?.configValue) return JSON.parse(config.configValue as string) as EscalationConfig;
  } catch (error) {
    console.error('[WebhookEscalation] Error loading config:', error);
  }
  return DEFAULT_CONFIG;
}

export async function saveWebhookEscalationConfig(config: EscalationConfig): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const existing = await db.select().from(systemConfig).where(eq(systemConfig.configKey, 'webhook_escalation_config')).limit(1);
    if (existing.length > 0) {
      await db.update(systemConfig).set({ configValue: JSON.stringify(config), updatedAt: new Date().toISOString() }).where(eq(systemConfig.configKey, 'webhook_escalation_config'));
    } else {
      await db.insert(systemConfig).values({ configKey: 'webhook_escalation_config', configValue: JSON.stringify(config), description: 'Webhook escalation configuration' });
    }
  } catch (error) {
    console.error('[WebhookEscalation] Error saving config:', error);
  }
}

export async function getEscalationStatus(): Promise<{ webhooks: Array<{ id: number; name: string; currentLevel: number; consecutiveFailures: number; lastNotifiedAt: Date | null; }>; config: EscalationConfig; }> {
  const config = await getWebhookEscalationConfig();
  const webhooks: Array<{ id: number; name: string; currentLevel: number; consecutiveFailures: number; lastNotifiedAt: Date | null; }> = [];
  try {
    const db = await getDb();
    if (db) {
      const configs = await db.select().from(alertWebhookConfigs);
      for (const webhook of configs) {
        const state = escalationState.get(webhook.id) || { currentLevel: 0, lastNotifiedAt: null, consecutiveFailures: 0 };
        webhooks.push({ id: webhook.id, name: webhook.name, currentLevel: state.currentLevel, consecutiveFailures: state.consecutiveFailures, lastNotifiedAt: state.lastNotifiedAt });
      }
    }
  } catch (error) {
    console.error('[WebhookEscalation] Error getting status:', error);
  }
  return { webhooks, config };
}

export async function getEscalationLogs(limit: number = 50): Promise<typeof escalationLogs> {
  return escalationLogs.slice(-limit);
}

export function resetEscalationState(webhookId: number): void {
  escalationState.delete(webhookId);
}

export async function runWebhookEscalationCheck(): Promise<{ checked: number; escalated: number; details: Array<{ webhookId: number; webhookName: string; failures: number; escalatedTo: number | null; }>; }> {
  const result = { checked: 0, escalated: 0, details: [] as Array<{ webhookId: number; webhookName: string; failures: number; escalatedTo: number | null; }> };
  try {
    const config = await getWebhookEscalationConfig();
    if (!config.enabled) return result;
    const db = await getDb();
    if (!db) return result;
    const webhooks = await db.select().from(alertWebhookConfigs).where(eq(alertWebhookConfigs.isActive, 1));
    const windowStart = new Date(Date.now() - config.checkWindowMinutes * 60 * 1000);
    for (const webhook of webhooks) {
      result.checked++;
      const [failureCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(alertWebhookLogs).where(and(eq(alertWebhookLogs.webhookConfigId, webhook.id), eq(alertWebhookLogs.success, 0), gte(alertWebhookLogs.sentAt, windowStart.toISOString())));
      const failures = Number(failureCount?.count || 0);
      let state = escalationState.get(webhook.id);
      if (!state) { state = { currentLevel: 0, lastNotifiedAt: null, consecutiveFailures: 0 }; escalationState.set(webhook.id, state); }
      state.consecutiveFailures = failures;
      let newLevel = 0;
      for (const level of config.levels) { if (failures >= level.failureCount) newLevel = level.level; }
      const detail = { webhookId: webhook.id, webhookName: webhook.name, failures, escalatedTo: null as number | null };
      if (newLevel > state.currentLevel) {
        const levelConfig = config.levels.find(l => l.level === newLevel);
        if (levelConfig) {
          const notified: string[] = [];
          if (levelConfig.notifyEmails.length > 0) {
            try { await sendAlertEmail({ to: levelConfig.notifyEmails, subject: `[${levelConfig.name}] Webhook Escalation: ${webhook.name}`, html: `<h2>Webhook Escalation</h2><p>Webhook: ${webhook.name}</p><p>Level: ${levelConfig.name}</p><p>Failures: ${failures}</p>` }); notified.push(...levelConfig.notifyEmails); } catch (e) { console.error('[WebhookEscalation] Email error:', e); }
          }
          if (levelConfig.notifyOwner) {
            try { await notifyOwner({ title: `[${levelConfig.name}] Webhook Escalation: ${webhook.name}`, content: `Webhook "${webhook.name}" has ${failures} failures. Escalated to level ${levelConfig.level}.` }); notified.push('Owner'); } catch (e) { console.error('[WebhookEscalation] Owner notify error:', e); }
          }
          escalationLogs.push({ timestamp: new Date(), webhookId: webhook.id, webhookName: webhook.name, level: levelConfig.level, levelName: levelConfig.name, failureCount: failures, action: 'Escalated', notified });
          if (escalationLogs.length > 100) escalationLogs.shift();
          state.currentLevel = newLevel; state.lastNotifiedAt = new Date(); detail.escalatedTo = newLevel; result.escalated++;
        }
      } else if (failures === 0 && state.currentLevel > 0) {
        state.currentLevel = 0; state.lastNotifiedAt = null;
        escalationLogs.push({ timestamp: new Date(), webhookId: webhook.id, webhookName: webhook.name, level: 0, levelName: 'Resolved', failureCount: 0, action: 'Reset', notified: [] });
      }
      result.details.push(detail);
    }
  } catch (error) { console.error('[WebhookEscalation] Check error:', error); }
  return result;
}

export default { getWebhookEscalationConfig, saveWebhookEscalationConfig, getEscalationStatus, getEscalationLogs, resetEscalationState, runWebhookEscalationCheck };
