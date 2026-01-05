/**
 * MTTR/MTBF Alert Service
 * Kiểm tra ngưỡng và gửi cảnh báo tự động khi MTTR/MTBF vượt ngưỡng
 */
import { getDb } from '../db';
import {
  mttrMtbfThresholds,
  mttrMtbfAlertHistory,
  iotMttrMtbfStats,
  iotDevices,
  machines,
  productionLines,
} from '../../drizzle/schema';
import { eq, and, gte, lte, desc, isNull, or, sql } from 'drizzle-orm';
import { sendEmail } from '../emailService';
import { sendTelegramAlert } from './telegramService';

// Types
export interface ThresholdConfig {
  id: number;
  targetType: 'device' | 'machine' | 'production_line' | 'all';
  targetId: number | null;
  mttrWarningThreshold: number | null;
  mttrCriticalThreshold: number | null;
  mtbfWarningThreshold: number | null;
  mtbfCriticalThreshold: number | null;
  availabilityWarningThreshold: number | null;
  availabilityCriticalThreshold: number | null;
  enabled: number;
  alertEmails: string | null;
  alertTelegram: number;
  cooldownMinutes: number;
  lastAlertAt: string | null;
}

export interface MttrMtbfValues {
  mttr: number | null;
  mtbf: number | null;
  availability: number | null;
}

export interface AlertResult {
  triggered: boolean;
  alertType?: string;
  currentValue?: number;
  thresholdValue?: number;
  message?: string;
}

// Get target name
async function getTargetName(
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number
): Promise<string> {
  const db = await getDb();
  if (!db) return `${targetType} #${targetId}`;

  try {
    if (targetType === 'device') {
      const [device] = await db.select({ name: iotDevices.name })
        .from(iotDevices)
        .where(eq(iotDevices.id, targetId))
        .limit(1);
      return device?.name || `Device #${targetId}`;
    } else if (targetType === 'machine') {
      const [machine] = await db.select({ name: machines.name })
        .from(machines)
        .where(eq(machines.id, targetId))
        .limit(1);
      return machine?.name || `Machine #${targetId}`;
    } else {
      const [line] = await db.select({ name: productionLines.name })
        .from(productionLines)
        .where(eq(productionLines.id, targetId))
        .limit(1);
      return line?.name || `Line #${targetId}`;
    }
  } catch {
    return `${targetType} #${targetId}`;
  }
}

// Check if within cooldown period
function isWithinCooldown(lastAlertAt: string | null, cooldownMinutes: number): boolean {
  if (!lastAlertAt) return false;
  const lastAlert = new Date(lastAlertAt);
  const now = new Date();
  const diffMinutes = (now.getTime() - lastAlert.getTime()) / (1000 * 60);
  return diffMinutes < cooldownMinutes;
}

// Check thresholds and return alert if any
export function checkThresholds(
  values: MttrMtbfValues,
  config: ThresholdConfig
): AlertResult {
  // Check MTTR (higher is worse)
  if (values.mttr !== null) {
    if (config.mttrCriticalThreshold && values.mttr >= config.mttrCriticalThreshold) {
      return {
        triggered: true,
        alertType: 'mttr_critical',
        currentValue: values.mttr,
        thresholdValue: config.mttrCriticalThreshold,
        message: `MTTR đạt mức CRITICAL: ${values.mttr.toFixed(1)} phút (ngưỡng: ${config.mttrCriticalThreshold} phút)`,
      };
    }
    if (config.mttrWarningThreshold && values.mttr >= config.mttrWarningThreshold) {
      return {
        triggered: true,
        alertType: 'mttr_warning',
        currentValue: values.mttr,
        thresholdValue: config.mttrWarningThreshold,
        message: `MTTR đạt mức WARNING: ${values.mttr.toFixed(1)} phút (ngưỡng: ${config.mttrWarningThreshold} phút)`,
      };
    }
  }

  // Check MTBF (lower is worse)
  if (values.mtbf !== null) {
    if (config.mtbfCriticalThreshold && values.mtbf <= config.mtbfCriticalThreshold) {
      return {
        triggered: true,
        alertType: 'mtbf_critical',
        currentValue: values.mtbf,
        thresholdValue: config.mtbfCriticalThreshold,
        message: `MTBF đạt mức CRITICAL: ${values.mtbf.toFixed(1)} phút (ngưỡng: ${config.mtbfCriticalThreshold} phút)`,
      };
    }
    if (config.mtbfWarningThreshold && values.mtbf <= config.mtbfWarningThreshold) {
      return {
        triggered: true,
        alertType: 'mtbf_warning',
        currentValue: values.mtbf,
        thresholdValue: config.mtbfWarningThreshold,
        message: `MTBF đạt mức WARNING: ${values.mtbf.toFixed(1)} phút (ngưỡng: ${config.mtbfWarningThreshold} phút)`,
      };
    }
  }

  // Check Availability (lower is worse)
  if (values.availability !== null) {
    if (config.availabilityCriticalThreshold && values.availability <= config.availabilityCriticalThreshold) {
      return {
        triggered: true,
        alertType: 'availability_critical',
        currentValue: values.availability,
        thresholdValue: config.availabilityCriticalThreshold,
        message: `Availability đạt mức CRITICAL: ${(values.availability * 100).toFixed(1)}% (ngưỡng: ${(config.availabilityCriticalThreshold * 100).toFixed(1)}%)`,
      };
    }
    if (config.availabilityWarningThreshold && values.availability <= config.availabilityWarningThreshold) {
      return {
        triggered: true,
        alertType: 'availability_warning',
        currentValue: values.availability,
        thresholdValue: config.availabilityWarningThreshold,
        message: `Availability đạt mức WARNING: ${(values.availability * 100).toFixed(1)}% (ngưỡng: ${(config.availabilityWarningThreshold * 100).toFixed(1)}%)`,
      };
    }
  }

  return { triggered: false };
}

// Send alert notifications
async function sendAlertNotifications(
  config: ThresholdConfig,
  alert: AlertResult,
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number,
  targetName: string
): Promise<{ emailSent: boolean; telegramSent: boolean }> {
  let emailSent = false;
  let telegramSent = false;

  const targetTypeLabel = {
    device: 'Thiết bị IoT',
    machine: 'Máy móc',
    production_line: 'Dây chuyền',
  }[targetType];

  const subject = `[${alert.alertType?.includes('critical') ? 'CRITICAL' : 'WARNING'}] Cảnh báo MTTR/MTBF - ${targetName}`;
  const body = `
Cảnh báo MTTR/MTBF

${targetTypeLabel}: ${targetName}
Loại cảnh báo: ${alert.alertType}
Giá trị hiện tại: ${alert.currentValue}
Ngưỡng: ${alert.thresholdValue}

${alert.message}

Thời gian: ${new Date().toLocaleString('vi-VN')}

---
Hệ thống CPK/SPC Calculator
  `.trim();

  // Send email
  if (config.alertEmails) {
    const emails = config.alertEmails.split(',').map(e => e.trim()).filter(Boolean);
    for (const email of emails) {
      try {
        await sendEmail({
          to: email,
          subject,
          text: body,
        });
        emailSent = true;
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
      }
    }
  }

  // Send Telegram
  if (config.alertTelegram) {
    try {
      const result = await sendTelegramAlert('maintenance', {
        lineName: targetName,
        machineName: targetName,
        alertType: alert.alertType,
        currentValue: alert.currentValue,
        thresholdValue: alert.thresholdValue,
        description: alert.message,
      });
      telegramSent = result.sent > 0;
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  return { emailSent, telegramSent };
}

// Record alert to history
async function recordAlert(
  thresholdId: number,
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number,
  targetName: string,
  alert: AlertResult,
  emailSent: boolean,
  telegramSent: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(mttrMtbfAlertHistory).values({
    thresholdId,
    targetType,
    targetId,
    targetName,
    alertType: alert.alertType as any,
    currentValue: alert.currentValue?.toString(),
    thresholdValue: alert.thresholdValue?.toString(),
    message: alert.message,
    emailSent: emailSent ? 1 : 0,
    telegramSent: telegramSent ? 1 : 0,
  });

  // Update last alert time
  await db.update(mttrMtbfThresholds)
    .set({
      lastAlertAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      lastAlertType: alert.alertType,
    })
    .where(eq(mttrMtbfThresholds.id, thresholdId));
}

// Main function to check and trigger alerts
export async function checkAndTriggerAlerts(
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number,
  values: MttrMtbfValues
): Promise<AlertResult | null> {
  const db = await getDb();
  if (!db) return null;

  // Get applicable threshold configs
  const configs = await db.select()
    .from(mttrMtbfThresholds)
    .where(and(
      eq(mttrMtbfThresholds.enabled, 1),
      or(
        // Specific target
        and(
          eq(mttrMtbfThresholds.targetType, targetType),
          eq(mttrMtbfThresholds.targetId, targetId)
        ),
        // All targets of this type
        and(
          eq(mttrMtbfThresholds.targetType, targetType),
          isNull(mttrMtbfThresholds.targetId)
        ),
        // Global (all types)
        eq(mttrMtbfThresholds.targetType, 'all')
      )
    ))
    .orderBy(desc(mttrMtbfThresholds.targetId)); // Specific configs first

  if (configs.length === 0) return null;

  // Use the most specific config (first one due to ordering)
  const config = configs[0];

  // Check cooldown
  if (isWithinCooldown(config.lastAlertAt, config.cooldownMinutes || 60)) {
    return null;
  }

  // Check thresholds
  const alert = checkThresholds(values, {
    ...config,
    mttrWarningThreshold: config.mttrWarningThreshold ? Number(config.mttrWarningThreshold) : null,
    mttrCriticalThreshold: config.mttrCriticalThreshold ? Number(config.mttrCriticalThreshold) : null,
    mtbfWarningThreshold: config.mtbfWarningThreshold ? Number(config.mtbfWarningThreshold) : null,
    mtbfCriticalThreshold: config.mtbfCriticalThreshold ? Number(config.mtbfCriticalThreshold) : null,
    availabilityWarningThreshold: config.availabilityWarningThreshold ? Number(config.availabilityWarningThreshold) : null,
    availabilityCriticalThreshold: config.availabilityCriticalThreshold ? Number(config.availabilityCriticalThreshold) : null,
  });

  if (!alert.triggered) return null;

  // Get target name
  const targetName = await getTargetName(targetType, targetId);

  // Send notifications
  const { emailSent, telegramSent } = await sendAlertNotifications(
    config as any,
    alert,
    targetType,
    targetId,
    targetName
  );

  // Record alert
  await recordAlert(
    config.id,
    targetType,
    targetId,
    targetName,
    alert,
    emailSent,
    telegramSent
  );

  return alert;
}

// CRUD operations for thresholds
export async function getThresholds(
  targetType?: 'device' | 'machine' | 'production_line' | 'all'
) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(mttrMtbfThresholds);
  if (targetType) {
    query = query.where(eq(mttrMtbfThresholds.targetType, targetType)) as typeof query;
  }
  return await query.orderBy(desc(mttrMtbfThresholds.createdAt));
}

export async function getThresholdById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [threshold] = await db.select()
    .from(mttrMtbfThresholds)
    .where(eq(mttrMtbfThresholds.id, id))
    .limit(1);
  return threshold || null;
}

export async function createThreshold(data: {
  targetType: 'device' | 'machine' | 'production_line' | 'all';
  targetId?: number | null;
  mttrWarningThreshold?: number | null;
  mttrCriticalThreshold?: number | null;
  mtbfWarningThreshold?: number | null;
  mtbfCriticalThreshold?: number | null;
  availabilityWarningThreshold?: number | null;
  availabilityCriticalThreshold?: number | null;
  alertEmails?: string | null;
  alertTelegram?: number;
  cooldownMinutes?: number;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [result] = await db.insert(mttrMtbfThresholds).values({
    targetType: data.targetType,
    targetId: data.targetId,
    mttrWarningThreshold: data.mttrWarningThreshold?.toString(),
    mttrCriticalThreshold: data.mttrCriticalThreshold?.toString(),
    mtbfWarningThreshold: data.mtbfWarningThreshold?.toString(),
    mtbfCriticalThreshold: data.mtbfCriticalThreshold?.toString(),
    availabilityWarningThreshold: data.availabilityWarningThreshold?.toString(),
    availabilityCriticalThreshold: data.availabilityCriticalThreshold?.toString(),
    alertEmails: data.alertEmails,
    alertTelegram: data.alertTelegram || 0,
    cooldownMinutes: data.cooldownMinutes || 60,
    createdBy: data.createdBy,
  });

  return result;
}

export async function updateThreshold(id: number, data: Partial<{
  targetType: 'device' | 'machine' | 'production_line' | 'all';
  targetId: number | null;
  mttrWarningThreshold: number | null;
  mttrCriticalThreshold: number | null;
  mtbfWarningThreshold: number | null;
  mtbfCriticalThreshold: number | null;
  availabilityWarningThreshold: number | null;
  availabilityCriticalThreshold: number | null;
  enabled: number;
  alertEmails: string | null;
  alertTelegram: number;
  cooldownMinutes: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const updateData: Record<string, any> = {};
  if (data.targetType !== undefined) updateData.targetType = data.targetType;
  if (data.targetId !== undefined) updateData.targetId = data.targetId;
  if (data.mttrWarningThreshold !== undefined) updateData.mttrWarningThreshold = data.mttrWarningThreshold?.toString();
  if (data.mttrCriticalThreshold !== undefined) updateData.mttrCriticalThreshold = data.mttrCriticalThreshold?.toString();
  if (data.mtbfWarningThreshold !== undefined) updateData.mtbfWarningThreshold = data.mtbfWarningThreshold?.toString();
  if (data.mtbfCriticalThreshold !== undefined) updateData.mtbfCriticalThreshold = data.mtbfCriticalThreshold?.toString();
  if (data.availabilityWarningThreshold !== undefined) updateData.availabilityWarningThreshold = data.availabilityWarningThreshold?.toString();
  if (data.availabilityCriticalThreshold !== undefined) updateData.availabilityCriticalThreshold = data.availabilityCriticalThreshold?.toString();
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.alertEmails !== undefined) updateData.alertEmails = data.alertEmails;
  if (data.alertTelegram !== undefined) updateData.alertTelegram = data.alertTelegram;
  if (data.cooldownMinutes !== undefined) updateData.cooldownMinutes = data.cooldownMinutes;

  await db.update(mttrMtbfThresholds)
    .set(updateData)
    .where(eq(mttrMtbfThresholds.id, id));
}

export async function deleteThreshold(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.delete(mttrMtbfThresholds)
    .where(eq(mttrMtbfThresholds.id, id));
}

// Get alert history
export async function getAlertHistory(options?: {
  targetType?: 'device' | 'machine' | 'production_line';
  targetId?: number;
  alertType?: string;
  days?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (options?.targetType) {
    conditions.push(eq(mttrMtbfAlertHistory.targetType, options.targetType));
  }
  if (options?.targetId) {
    conditions.push(eq(mttrMtbfAlertHistory.targetId, options.targetId));
  }
  if (options?.alertType) {
    conditions.push(eq(mttrMtbfAlertHistory.alertType, options.alertType as any));
  }
  if (options?.days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - options.days);
    conditions.push(gte(mttrMtbfAlertHistory.createdAt, startDate.toISOString().slice(0, 19).replace('T', ' ')));
  }

  let query = db.select().from(mttrMtbfAlertHistory);
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }
  
  return await query
    .orderBy(desc(mttrMtbfAlertHistory.createdAt))
    .limit(options?.limit || 100);
}

// Acknowledge alert
export async function acknowledgeAlert(alertId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  await db.update(mttrMtbfAlertHistory)
    .set({
      acknowledgedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      acknowledgedBy: userId,
    })
    .where(eq(mttrMtbfAlertHistory.id, alertId));
}

export const mttrMtbfAlertService = {
  checkThresholds,
  checkAndTriggerAlerts,
  getThresholds,
  getThresholdById,
  createThreshold,
  updateThreshold,
  deleteThreshold,
  getAlertHistory,
  acknowledgeAlert,
};

export default mttrMtbfAlertService;
