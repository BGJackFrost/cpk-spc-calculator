/**
 * IoT Alert Escalation Service
 * 
 * Provides alert escalation features:
 * - Escalation Rules management
 * - Alert Correlation
 * - Multi-channel Notifications
 * - Escalation History
 */

import { getDb } from '../db';
import {
  iotAlertEscalationRules,
  iotAlertCorrelations,
  iotAlertHistory,
} from '../../drizzle/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';
import { sendEmail } from '../emailService';
import { sendAlertToWebhooks } from './alertWebhookService';

// ============ Types ============

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  channels: ('email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams')[];
  recipients: string[];
  message?: string;
}

export interface EscalationRule {
  id: number;
  name: string;
  description?: string;
  alertType?: string;
  severityFilter?: string[];
  deviceFilter?: number[];
  groupFilter?: number[];
  escalationLevels: EscalationLevel[];
  cooldownMinutes: number;
  isActive: boolean;
}

export interface AlertCorrelation {
  id: number;
  name: string;
  description?: string;
  correlationWindowMinutes: number;
  sourceAlertPattern: any;
  relatedAlertPattern: any;
  actionType: 'suppress' | 'merge' | 'escalate' | 'notify';
  actionConfig?: any;
  isActive: boolean;
}

// ============ Escalation Rules ============

export async function getEscalationRules(): Promise<EscalationRule[]> {
  const db = await getDb();
  const rules = await db.select().from(iotAlertEscalationRules).where(eq(iotAlertEscalationRules.isActive, 1));
  
  return rules.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    alertType: r.alertType || undefined,
    severityFilter: r.severityFilter ? JSON.parse(String(r.severityFilter)) : undefined,
    deviceFilter: r.deviceFilter ? JSON.parse(String(r.deviceFilter)) : undefined,
    groupFilter: r.groupFilter ? JSON.parse(String(r.groupFilter)) : undefined,
    escalationLevels: r.escalationLevels ? JSON.parse(String(r.escalationLevels)) : [],
    cooldownMinutes: r.cooldownMinutes || 30,
    isActive: r.isActive === 1,
  }));
}

export async function createEscalationRule(data: {
  name: string;
  description?: string;
  alertType?: string;
  severityFilter?: string[];
  deviceFilter?: number[];
  groupFilter?: number[];
  escalationLevels: EscalationLevel[];
  cooldownMinutes?: number;
  createdBy?: number;
}): Promise<EscalationRule> {
  const db = await getDb();
  const [result] = await db.insert(iotAlertEscalationRules).values({
    name: data.name,
    description: data.description,
    alertType: data.alertType,
    severityFilter: data.severityFilter ? JSON.stringify(data.severityFilter) : null,
    deviceFilter: data.deviceFilter ? JSON.stringify(data.deviceFilter) : null,
    groupFilter: data.groupFilter ? JSON.stringify(data.groupFilter) : null,
    escalationLevels: JSON.stringify(data.escalationLevels),
    cooldownMinutes: data.cooldownMinutes || 30,
    createdBy: data.createdBy,
  });
  
  return {
    id: result.insertId,
    name: data.name,
    description: data.description,
    alertType: data.alertType,
    severityFilter: data.severityFilter,
    deviceFilter: data.deviceFilter,
    groupFilter: data.groupFilter,
    escalationLevels: data.escalationLevels,
    cooldownMinutes: data.cooldownMinutes || 30,
    isActive: true,
  };
}

export async function updateEscalationRule(id: number, data: Partial<{
  name: string;
  description: string;
  alertType: string;
  severityFilter: string[];
  deviceFilter: number[];
  groupFilter: number[];
  escalationLevels: EscalationLevel[];
  cooldownMinutes: number;
  isActive: boolean;
}>): Promise<boolean> {
  const db = await getDb();
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.alertType !== undefined) updateData.alertType = data.alertType;
  if (data.severityFilter !== undefined) updateData.severityFilter = JSON.stringify(data.severityFilter);
  if (data.deviceFilter !== undefined) updateData.deviceFilter = JSON.stringify(data.deviceFilter);
  if (data.groupFilter !== undefined) updateData.groupFilter = JSON.stringify(data.groupFilter);
  if (data.escalationLevels !== undefined) updateData.escalationLevels = JSON.stringify(data.escalationLevels);
  if (data.cooldownMinutes !== undefined) updateData.cooldownMinutes = data.cooldownMinutes;
  if (data.isActive !== undefined) updateData.isActive = data.isActive ? 1 : 0;
  
  await db.update(iotAlertEscalationRules).set(updateData).where(eq(iotAlertEscalationRules.id, id));
  return true;
}

export async function deleteEscalationRule(id: number): Promise<boolean> {
  const db = await getDb();
  await db.update(iotAlertEscalationRules).set({ isActive: 0 }).where(eq(iotAlertEscalationRules.id, id));
  return true;
}

// ============ Alert Correlations ============

export async function getAlertCorrelations(): Promise<AlertCorrelation[]> {
  const db = await getDb();
  const correlations = await db.select().from(iotAlertCorrelations).where(eq(iotAlertCorrelations.isActive, 1));
  
  return correlations.map(c => ({
    id: c.id,
    name: c.name,
    description: c.description || undefined,
    correlationWindowMinutes: c.correlationWindowMinutes || 5,
    sourceAlertPattern: c.sourceAlertPattern ? JSON.parse(String(c.sourceAlertPattern)) : {},
    relatedAlertPattern: c.relatedAlertPattern ? JSON.parse(String(c.relatedAlertPattern)) : {},
    actionType: c.actionType || 'merge',
    actionConfig: c.actionConfig ? JSON.parse(String(c.actionConfig)) : undefined,
    isActive: c.isActive === 1,
  }));
}

export async function createAlertCorrelation(data: {
  name: string;
  description?: string;
  correlationWindowMinutes?: number;
  sourceAlertPattern: any;
  relatedAlertPattern: any;
  actionType: 'suppress' | 'merge' | 'escalate' | 'notify';
  actionConfig?: any;
  createdBy?: number;
}): Promise<AlertCorrelation> {
  const db = await getDb();
  const [result] = await db.insert(iotAlertCorrelations).values({
    name: data.name,
    description: data.description,
    correlationWindowMinutes: data.correlationWindowMinutes || 5,
    sourceAlertPattern: JSON.stringify(data.sourceAlertPattern),
    relatedAlertPattern: JSON.stringify(data.relatedAlertPattern),
    actionType: data.actionType as any,
    actionConfig: data.actionConfig ? JSON.stringify(data.actionConfig) : null,
    createdBy: data.createdBy,
  });
  
  return {
    id: result.insertId,
    name: data.name,
    description: data.description,
    correlationWindowMinutes: data.correlationWindowMinutes || 5,
    sourceAlertPattern: data.sourceAlertPattern,
    relatedAlertPattern: data.relatedAlertPattern,
    actionType: data.actionType,
    actionConfig: data.actionConfig,
    isActive: true,
  };
}

export async function updateAlertCorrelation(id: number, data: Partial<AlertCorrelation>): Promise<boolean> {
  const db = await getDb();
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.correlationWindowMinutes !== undefined) updateData.correlationWindowMinutes = data.correlationWindowMinutes;
  if (data.sourceAlertPattern !== undefined) updateData.sourceAlertPattern = JSON.stringify(data.sourceAlertPattern);
  if (data.relatedAlertPattern !== undefined) updateData.relatedAlertPattern = JSON.stringify(data.relatedAlertPattern);
  if (data.actionType !== undefined) updateData.actionType = data.actionType;
  if (data.actionConfig !== undefined) updateData.actionConfig = JSON.stringify(data.actionConfig);
  if (data.isActive !== undefined) updateData.isActive = data.isActive ? 1 : 0;
  
  await db.update(iotAlertCorrelations).set(updateData).where(eq(iotAlertCorrelations.id, id));
  return true;
}

// ============ Escalation Processing ============

// Track escalation state in memory
const escalationState = new Map<string, {
  alertId: number;
  currentLevel: number;
  startedAt: Date;
  lastEscalatedAt: Date;
  ruleId: number;
}>();

export async function processAlertEscalation(alert: {
  id: number;
  deviceId: number;
  alertType: string;
  severity: string;
  message: string;
}): Promise<void> {
  const rules = await getEscalationRules();
  
  for (const rule of rules) {
    // Check if rule matches alert
    if (!matchesRule(alert, rule)) continue;
    
    const stateKey = `${alert.id}-${rule.id}`;
    let state = escalationState.get(stateKey);
    
    if (!state) {
      // Start new escalation
      state = {
        alertId: alert.id,
        currentLevel: 0,
        startedAt: new Date(),
        lastEscalatedAt: new Date(),
        ruleId: rule.id,
      };
      escalationState.set(stateKey, state);
      
      // Send first level notification
      await sendEscalationNotification(alert, rule.escalationLevels[0], rule);
    } else {
      // Check if should escalate to next level
      const currentLevel = rule.escalationLevels[state.currentLevel];
      const nextLevel = rule.escalationLevels[state.currentLevel + 1];
      
      if (nextLevel) {
        const timeSinceLastEscalation = Date.now() - state.lastEscalatedAt.getTime();
        const delayMs = currentLevel.delayMinutes * 60 * 1000;
        
        if (timeSinceLastEscalation >= delayMs) {
          state.currentLevel++;
          state.lastEscalatedAt = new Date();
          await sendEscalationNotification(alert, nextLevel, rule);
        }
      }
    }
  }
}

function matchesRule(alert: any, rule: EscalationRule): boolean {
  // Check alert type
  if (rule.alertType && alert.alertType !== rule.alertType) return false;
  
  // Check severity
  if (rule.severityFilter && rule.severityFilter.length > 0) {
    if (!rule.severityFilter.includes(alert.severity)) return false;
  }
  
  // Check device
  if (rule.deviceFilter && rule.deviceFilter.length > 0) {
    if (!rule.deviceFilter.includes(alert.deviceId)) return false;
  }
  
  return true;
}

async function sendEscalationNotification(
  alert: any,
  level: EscalationLevel,
  rule: EscalationRule
): Promise<void> {
  const message = level.message || `[Level ${level.level}] ${alert.message}`;
  
  for (const channel of level.channels) {
    switch (channel) {
      case 'push':
        await notifyOwner({
          title: `🚨 Alert Escalation (Level ${level.level})`,
          content: message,
        });
        break;
      
      case 'email':
        try {
          const emailHtml = `<h3>Alert Escalation - Level ${level.level}</h3><p>${message}</p><p>Rule: ${rule.name}</p><p>Time: ${new Date().toISOString()}</p>`;
          await sendEmail(
            level.recipients,
            `[SPC/CPK Escalation L${level.level}] ${alert.message || 'Alert'}`,
            emailHtml
          );
          console.log(`[Escalation] Email sent to ${level.recipients.join(', ')}`);
        } catch (err) {
          console.error(`[Escalation] Email failed:`, err);
        }
        break;
      
      case 'sms':
        // SMS requires Twilio config - log for now, will send via configured provider
        console.log(`[Escalation] SMS to ${level.recipients.join(', ')}: ${message}`);
        break;
      
      case 'webhook':
      case 'slack':
      case 'teams':
        try {
          await sendAlertToWebhooks({
            title: `Alert Escalation (Level ${level.level})`,
            message,
            severity: (alert.severity as 'info' | 'warning' | 'critical') || 'warning',
            source: `escalation-rule-${rule.id}`,
            data: { ruleId: rule.id, ruleName: rule.name, level: level.level },
          });
          console.log(`[Escalation] ${channel} notification sent`);
        } catch (err) {
          console.error(`[Escalation] ${channel} notification failed:`, err);
        }
        break;
    }
  }
}

// ============ Alert Correlation Processing ============

const recentAlerts: Array<{
  id: number;
  deviceId: number;
  alertType: string;
  severity: string;
  timestamp: Date;
}> = [];

export async function checkAlertCorrelation(alert: {
  id: number;
  deviceId: number;
  alertType: string;
  severity: string;
}): Promise<{ action: string; correlatedAlerts: number[] } | null> {
  const correlations = await getAlertCorrelations();
  
  // Add to recent alerts
  recentAlerts.push({
    ...alert,
    timestamp: new Date(),
  });
  
  // Clean old alerts
  const now = Date.now();
  const maxWindowMs = Math.max(...correlations.map(c => c.correlationWindowMinutes)) * 60 * 1000;
  while (recentAlerts.length > 0 && now - recentAlerts[0].timestamp.getTime() > maxWindowMs) {
    recentAlerts.shift();
  }
  
  for (const correlation of correlations) {
    const windowMs = correlation.correlationWindowMinutes * 60 * 1000;
    const windowStart = now - windowMs;
    
    // Find matching source alerts
    const sourceMatches = recentAlerts.filter(a => 
      a.timestamp.getTime() >= windowStart &&
      matchesPattern(a, correlation.sourceAlertPattern)
    );
    
    // Find matching related alerts
    const relatedMatches = recentAlerts.filter(a =>
      a.timestamp.getTime() >= windowStart &&
      matchesPattern(a, correlation.relatedAlertPattern)
    );
    
    if (sourceMatches.length > 0 && relatedMatches.length > 0) {
      return {
        action: correlation.actionType,
        correlatedAlerts: [...sourceMatches, ...relatedMatches].map(a => a.id),
      };
    }
  }
  
  return null;
}

function matchesPattern(alert: any, pattern: any): boolean {
  if (!pattern) return false;
  
  if (pattern.alertType && alert.alertType !== pattern.alertType) return false;
  if (pattern.severity && alert.severity !== pattern.severity) return false;
  if (pattern.deviceId && alert.deviceId !== pattern.deviceId) return false;
  
  return true;
}

// ============ Statistics ============

export async function getEscalationStats(): Promise<{
  totalRules: number;
  activeRules: number;
  totalCorrelations: number;
  activeCorrelations: number;
  escalationsToday: number;
  correlationsToday: number;
}> {
  const db = await getDb();
  
  const rules = await db.select().from(iotAlertEscalationRules);
  const correlations = await db.select().from(iotAlertCorrelations);
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  // Count escalations today (from escalation state)
  const escalationsToday = Array.from(escalationState.values())
    .filter(s => s.startedAt >= todayStart).length;
  
  return {
    totalRules: rules.length,
    activeRules: rules.filter(r => r.isActive === 1).length,
    totalCorrelations: correlations.length,
    activeCorrelations: correlations.filter(c => c.isActive === 1).length,
    escalationsToday,
    correlationsToday: 0, // Would need to track this
  };
}
