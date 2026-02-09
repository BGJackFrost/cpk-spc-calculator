/**
 * SPC Alert Service
 * Tự động kiểm tra CPK và trigger alert khi vượt ngưỡng
 */

import { getDb } from '../db';
import { 
  spcSamplingPlans, 
  iotAlertHistory,
  type SpcSamplingPlan 
} from '../../drizzle/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';
import { sendEmail } from '../emailService';
import { sendAlertToWebhooks } from './alertWebhookService';

export interface CpkCheckResult {
  planId: number;
  planName: string;
  cpkValue: number;
  cpkLowerLimit: number | null;
  cpkUpperLimit: number | null;
  status: 'ok' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
}

export interface SpcAlertEvent {
  planId: number;
  planName: string;
  alertType: 'cpk_low' | 'cpk_high' | 'cpk_warning';
  cpkValue: number;
  threshold: number;
  message: string;
}

/**
 * Kiểm tra CPK của một SPC Plan và trigger alert nếu cần
 */
export async function checkPlanCpk(
  planId: number, 
  cpkValue: number
): Promise<CpkCheckResult | null> {
  const db = await getDb();
  if (!db) return null;

  // Get plan with alert settings
  const [plan] = await db
    .select()
    .from(spcSamplingPlans)
    .where(
      and(
        eq(spcSamplingPlans.id, planId),
        eq(spcSamplingPlans.cpkAlertEnabled, 1)
      )
    )
    .limit(1);

  if (!plan) return null;

  const cpkLower = plan.cpkLowerLimit ? parseFloat(plan.cpkLowerLimit) : null;
  const cpkUpper = plan.cpkUpperLimit ? parseFloat(plan.cpkUpperLimit) : null;

  let status: 'ok' | 'warning' | 'critical' = 'ok';
  let message = '';

  // Check thresholds
  if (cpkLower !== null && cpkValue < cpkLower) {
    status = 'critical';
    message = `CPK ${cpkValue.toFixed(2)} dưới ngưỡng tối thiểu ${cpkLower.toFixed(2)}`;
    
    // Trigger alert
    await triggerCpkAlert(plan, 'cpk_low', cpkValue, cpkLower);
  } else if (cpkUpper !== null && cpkValue > cpkUpper) {
    status = 'warning';
    message = `CPK ${cpkValue.toFixed(2)} vượt ngưỡng trên ${cpkUpper.toFixed(2)}`;
    
    // Trigger alert
    await triggerCpkAlert(plan, 'cpk_high', cpkValue, cpkUpper);
  } else if (cpkLower !== null && cpkValue < cpkLower * 1.1) {
    // Warning when CPK is within 10% of lower limit
    status = 'warning';
    message = `CPK ${cpkValue.toFixed(2)} gần ngưỡng tối thiểu (${cpkLower.toFixed(2)})`;
    
    await triggerCpkAlert(plan, 'cpk_warning', cpkValue, cpkLower);
  } else {
    message = `CPK ${cpkValue.toFixed(2)} trong phạm vi cho phép`;
  }

  return {
    planId: plan.id,
    planName: plan.name,
    cpkValue,
    cpkLowerLimit: cpkLower,
    cpkUpperLimit: cpkUpper,
    status,
    message,
    timestamp: new Date(),
  };
}

/**
 * Trigger CPK alert
 */
async function triggerCpkAlert(
  plan: SpcSamplingPlan,
  alertType: 'cpk_low' | 'cpk_high' | 'cpk_warning',
  cpkValue: number,
  threshold: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const alertMessages: Record<string, string> = {
    'cpk_low': `[CẢNH BÁO CPK THẤP] ${plan.name}: CPK = ${cpkValue.toFixed(2)} < ${threshold.toFixed(2)}`,
    'cpk_high': `[CPK CAO] ${plan.name}: CPK = ${cpkValue.toFixed(2)} > ${threshold.toFixed(2)}`,
    'cpk_warning': `[Cảnh báo] ${plan.name}: CPK = ${cpkValue.toFixed(2)} gần ngưỡng ${threshold.toFixed(2)}`,
  };

  const message = alertMessages[alertType];

  // Save to alert history
  try {
    await db.insert(iotAlertHistory).values({
      thresholdId: plan.alertThresholdId || 0,
      deviceId: plan.id, // Use planId as deviceId for SPC alerts
      metric: 'cpk',
      alertType: alertType === 'cpk_low' ? 'lower_limit' : 
                 alertType === 'cpk_high' ? 'upper_limit' : 'lower_warning',
      value: String(cpkValue),
      threshold: String(threshold),
      message,
      notificationSent: 1,
      notificationChannels: JSON.stringify(['push']),
    });
  } catch (error) {
    console.error('[SPC Alert] Failed to save alert history:', error);
  }

  // Send notification
  if (plan.notifyOnViolation) {
    try {
      const severity = alertType === 'cpk_low' ? '🚨' : alertType === 'cpk_high' ? '⚠️' : '📊';
      await notifyOwner({
        title: `${severity} SPC Alert: ${plan.name}`,
        content: message,
      });
    } catch (error) {
      console.error('[SPC Alert] Failed to send notification:', error);
    }
  }

  // Send email if configured
  if (plan.notifyEmail) {
    try {
      const emailHtml = `<h3>SPC Alert: ${plan.name}</h3><p>${message}</p><p>CPK: ${cpkValue.toFixed(2)} | Threshold: ${threshold.toFixed(2)}</p><p>Time: ${new Date().toISOString()}</p>`;
      await sendEmail(
        plan.notifyEmail,
        `[SPC Alert] ${plan.name}: ${alertType}`,
        emailHtml
      );
    } catch (err) {
      console.error('[SPC Alert] Email failed:', err);
    }
  }

  // Send to configured webhooks (Slack/Teams/Discord)
  try {
    await sendAlertToWebhooks({
      title: `SPC Alert: ${plan.name}`,
      message,
      severity: alertType === 'cpk_low' ? 'critical' : 'warning',
      type: 'spc_violation',
      data: { planId: plan.id, planName: plan.name, alertType, cpkValue, threshold },
    });
  } catch (err) {
    console.error('[SPC Alert] Webhook failed:', err);
  }
}

/**
 * Lấy tất cả SPC Plans có bật CPK alert
 */
export async function getPlansWithCpkAlert(): Promise<SpcSamplingPlan[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(spcSamplingPlans)
    .where(
      and(
        eq(spcSamplingPlans.cpkAlertEnabled, 1),
        eq(spcSamplingPlans.isActive, 1)
      )
    );
}

/**
 * Cập nhật cấu hình CPK alert cho SPC Plan
 */
export async function updatePlanCpkAlert(
  planId: number,
  config: {
    cpkAlertEnabled?: boolean;
    cpkLowerLimit?: number | null;
    cpkUpperLimit?: number | null;
    alertThresholdId?: number | null;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const updateData: Record<string, any> = {};
    
    if (config.cpkAlertEnabled !== undefined) {
      updateData.cpkAlertEnabled = config.cpkAlertEnabled ? 1 : 0;
    }
    if (config.cpkLowerLimit !== undefined) {
      updateData.cpkLowerLimit = config.cpkLowerLimit?.toString() || null;
    }
    if (config.cpkUpperLimit !== undefined) {
      updateData.cpkUpperLimit = config.cpkUpperLimit?.toString() || null;
    }
    if (config.alertThresholdId !== undefined) {
      updateData.alertThresholdId = config.alertThresholdId;
    }

    await db
      .update(spcSamplingPlans)
      .set(updateData)
      .where(eq(spcSamplingPlans.id, planId));

    return true;
  } catch (error) {
    console.error('[SPC Alert] Failed to update plan config:', error);
    return false;
  }
}

/**
 * Lấy lịch sử CPK alerts của một plan
 */
export async function getPlanCpkAlertHistory(
  planId: number,
  limit = 50
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(iotAlertHistory)
    .where(
      and(
        eq(iotAlertHistory.deviceId, planId),
        eq(iotAlertHistory.metric, 'cpk')
      )
    )
    .orderBy(iotAlertHistory.createdAt)
    .limit(limit);
}
