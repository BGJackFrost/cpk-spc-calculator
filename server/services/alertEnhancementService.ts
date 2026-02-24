/**
 * Alert Enhancement Service
 * Task: ALT-01, ALT-02, ALT-03, ALT-04, ALT-05
 * Cung cấp các hàm nâng cao cho hệ thống cảnh báo
 */

import { getDb } from "../db";
import { 
  realtimeAlerts, machines, productionLines, users, 
  emailNotificationSettings, oeeAlertThresholds
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, asc, lt, isNull } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { sendEmail } from "../emailService";

// Types
export interface AlertConfig {
  id: number;
  alertType: string;
  entityType: "machine" | "line" | "global";
  entityId?: number;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
  emailRecipients: string[];
  smsRecipients?: string[];
  escalationEnabled: boolean;
  escalationDelayMinutes: number;
  escalationRecipients: string[];
}

export interface Alert {
  id: number;
  alertType: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  entityType: "machine" | "line" | "global";
  entityId?: number;
  entityName?: string;
  value?: number;
  threshold?: number;
  status: "active" | "acknowledged" | "resolved" | "escalated";
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalatedAt?: Date;
  acknowledgedBy?: number;
  resolvedBy?: number;
}

export interface EscalationRule {
  id: number;
  alertType: string;
  delayMinutes: number;
  level: number;
  recipients: string[];
  notificationMethod: "email" | "sms" | "both";
}

// ALT-01: Cải tiến hệ thống thông báo realtime
export async function createRealtimeAlert(
  alertType: string,
  severity: "info" | "warning" | "critical",
  title: string,
  message: string,
  entityType: "machine" | "line" | "global",
  entityId?: number,
  value?: number,
  threshold?: number
): Promise<Alert | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Lấy tên entity
    let entityName = "";
    if (entityType === "machine" && entityId) {
      const [machine] = await db.select().from(machines).where(eq(machines.id, entityId));
      entityName = machine?.name || `Machine ${entityId}`;
    } else if (entityType === "line" && entityId) {
      const [line] = await db.select().from(productionLines).where(eq(productionLines.id, entityId));
      entityName = line?.name || `Line ${entityId}`;
    }

    // Tạo alert
    const [result] = await db
      .insert(realtimeAlerts)
      .values({
        alertType,
        severity,
        title,
        message,
        machineId: entityType === "machine" ? entityId : null,
        productionLineId: entityType === "line" ? entityId : null,
        value: value ? String(value) : null,
        threshold: threshold ? String(threshold) : null,
        status: "active",
        createdAt: new Date(),
      })
      .$returningId();

    const alert: Alert = {
      id: result.id,
      alertType,
      severity,
      title,
      message,
      entityType,
      entityId,
      entityName,
      value,
      threshold,
      status: "active",
      createdAt: new Date(),
    };

    // Gửi thông báo owner nếu là critical
    if (severity === "critical") {
      await notifyOwner({
        title: `🚨 ${title}`,
        content: `${message}\n\n${entityName ? `Đối tượng: ${entityName}` : ""}\n${value !== undefined ? `Giá trị: ${value}` : ""}\n${threshold !== undefined ? `Ngưỡng: ${threshold}` : ""}`,
      });
    }

    return alert;
  } catch (error) {
    console.error("[Alert] Error creating realtime alert:", error);
    return null;
  }
}

// ALT-02: Cảnh báo email/SMS OEE thấp
export async function sendOEELowAlert(
  machineId: number,
  machineName: string,
  currentOEE: number,
  targetOEE: number,
  availability: number,
  performance: number,
  quality: number
): Promise<{ emailSent: number; smsSent: number }> {
  const db = await getDb();
  if (!db) return { emailSent: 0, smsSent: 0 };

  let emailSent = 0;
  let smsSent = 0;

  try {
    // Lấy danh sách email recipients
    const emailSettings = await db
      .select()
      .from(emailNotificationSettings)
      .where(eq(emailNotificationSettings.notificationType, "oee_alert"));

    const recipients = emailSettings
      .filter(s => s.enabled)
      .map(s => s.email)
      .filter(Boolean) as string[];

    if (recipients.length === 0) {
      // Fallback to owner notification
      await notifyOwner({
        title: `⚠️ Cảnh báo OEE thấp: ${machineName}`,
        content: `OEE hiện tại: ${currentOEE.toFixed(1)}% (Mục tiêu: ${targetOEE}%)\n\nAvailability: ${availability.toFixed(1)}%\nPerformance: ${performance.toFixed(1)}%\nQuality: ${quality.toFixed(1)}%`,
      });
      return { emailSent: 0, smsSent: 0 };
    }

    // Tạo email HTML
    const oeeColor = currentOEE < 60 ? "#dc2626" : currentOEE < 75 ? "#f59e0b" : "#22c55e";
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0;">⚠️ Cảnh báo OEE Thấp</h1>
        </div>
        <div style="padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="margin-top: 0;">${machineName}</h2>
          
          <div style="text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 15px 0;">
            <div style="font-size: 48px; font-weight: bold; color: ${oeeColor};">${currentOEE.toFixed(1)}%</div>
            <div style="color: #6b7280;">OEE hiện tại (Mục tiêu: ${targetOEE}%)</div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Availability</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${availability.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;"><strong>Performance</strong></td>
              <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${performance.toFixed(1)}%</td>
            </tr>
            <tr>
              <td style="padding: 10px;"><strong>Quality</strong></td>
              <td style="padding: 10px; text-align: right;">${quality.toFixed(1)}%</td>
            </tr>
          </table>
          
          <p style="color: #6b7280; font-size: 14px;">Thời gian: ${new Date().toLocaleString("vi-VN")}</p>
        </div>
      </div>
    `;

    // Gửi email
    for (const email of recipients) {
      try {
        const result = await sendEmail(
          email,
          `⚠️ Cảnh báo OEE: ${machineName} - ${currentOEE.toFixed(1)}%`,
          emailHtml
        );
        if (result.success) emailSent++;
      } catch (err) {
        console.error(`[Alert] Failed to send OEE alert to ${email}:`, err);
      }
    }

    // Tạo alert record
    await createRealtimeAlert(
      "oee_low",
      currentOEE < 60 ? "critical" : "warning",
      `OEE thấp: ${machineName}`,
      `OEE ${currentOEE.toFixed(1)}% dưới mục tiêu ${targetOEE}%`,
      "machine",
      machineId,
      currentOEE,
      targetOEE
    );

    return { emailSent, smsSent };
  } catch (error) {
    console.error("[Alert] Error sending OEE low alert:", error);
    return { emailSent: 0, smsSent: 0 };
  }
}

// ALT-03: Escalation tự động
export async function processEscalations(): Promise<{ escalated: number; failed: number }> {
  const db = await getDb();
  if (!db) return { escalated: 0, failed: 0 };

  let escalated = 0;
  let failed = 0;

  try {
    // Lấy các alert active chưa được xử lý quá thời gian escalation (mặc định 30 phút)
    const escalationDelay = 30; // minutes
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - escalationDelay);

    const pendingAlerts = await db
      .select()
      .from(realtimeAlerts)
      .where(and(
        eq(realtimeAlerts.status, "active"),
        lt(realtimeAlerts.createdAt, cutoffTime),
        isNull(realtimeAlerts.escalatedAt)
      ))
      .limit(50);

    for (const alert of pendingAlerts) {
      try {
        // Cập nhật trạng thái escalated
        await db
          .update(realtimeAlerts)
          .set({
            status: "escalated",
            escalatedAt: new Date(),
          })
          .where(eq(realtimeAlerts.id, alert.id));

        // Gửi thông báo escalation
        await notifyOwner({
          title: `🔔 Alert Escalation: ${alert.title}`,
          content: `Alert chưa được xử lý sau ${escalationDelay} phút:\n\n${alert.message}\n\nMức độ: ${alert.severity}\nThời gian tạo: ${alert.createdAt?.toLocaleString("vi-VN")}`,
        });

        escalated++;
      } catch (err) {
        console.error(`[Alert] Failed to escalate alert ${alert.id}:`, err);
        failed++;
      }
    }

    return { escalated, failed };
  } catch (error) {
    console.error("[Alert] Error processing escalations:", error);
    return { escalated: 0, failed: 0 };
  }
}

// ALT-04: Lấy cấu hình ngưỡng cảnh báo
export async function getAlertThresholds(
  entityType?: "machine" | "line" | "global",
  entityId?: number
): Promise<AlertConfig[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [];
    if (entityType === "machine" && entityId) {
      conditions.push(eq(oeeAlertThresholds.machineId, entityId));
    } else if (entityType === "line" && entityId) {
      conditions.push(eq(oeeAlertThresholds.productionLineId, entityId));
    }

    const thresholds = await db
      .select()
      .from(oeeAlertThresholds)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return thresholds.map(t => ({
      id: t.id,
      alertType: "oee",
      entityType: t.machineId ? "machine" : t.productionLineId ? "line" : "global",
      entityId: t.machineId || t.productionLineId || undefined,
      warningThreshold: Number(t.warningThreshold) || 75,
      criticalThreshold: Number(t.criticalThreshold) || 60,
      enabled: t.isActive === 1,
      emailRecipients: t.alertEmails ? JSON.parse(t.alertEmails) : [],
      escalationEnabled: true,
      escalationDelayMinutes: 30,
      escalationRecipients: [],
    }));
  } catch (error) {
    console.error("[Alert] Error getting alert thresholds:", error);
    return [];
  }
}

// ALT-04: Cập nhật cấu hình ngưỡng cảnh báo
export async function updateAlertThreshold(
  id: number,
  config: Partial<AlertConfig>
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(oeeAlertThresholds)
      .set({
        warningThreshold: config.warningThreshold ? String(config.warningThreshold) : undefined,
        criticalThreshold: config.criticalThreshold ? String(config.criticalThreshold) : undefined,
        isActive: config.enabled !== undefined ? (config.enabled ? 1 : 0) : undefined,
        alertEmails: config.emailRecipients ? JSON.stringify(config.emailRecipients) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(oeeAlertThresholds.id, id));

    return true;
  } catch (error) {
    console.error("[Alert] Error updating alert threshold:", error);
    return false;
  }
}

// ALT-05: Push Notification (placeholder - cần tích hợp với service push notification)
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string }>;
}

export async function sendPushNotification(
  userId: number,
  payload: PushNotificationPayload
): Promise<boolean> {
  // Placeholder - cần tích hợp với web push hoặc FCM
  console.log(`[Push] Would send push notification to user ${userId}:`, payload);
  
  // Fallback to owner notification
  await notifyOwner({
    title: payload.title,
    content: payload.body,
  });
  
  return true;
}

// Gửi push notification cho nhiều users
export async function broadcastPushNotification(
  userIds: number[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    const success = await sendPushNotification(userId, payload);
    if (success) sent++;
    else failed++;
  }

  return { sent, failed };
}

// Lấy danh sách alerts theo trạng thái
export async function getAlertsByStatus(
  status: "active" | "acknowledged" | "resolved" | "escalated",
  limit: number = 50
): Promise<Alert[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const alerts = await db
      .select({
        id: realtimeAlerts.id,
        alertType: realtimeAlerts.alertType,
        severity: realtimeAlerts.severity,
        title: realtimeAlerts.title,
        message: realtimeAlerts.message,
        machineId: realtimeAlerts.machineId,
        machineName: machines.name,
        productionLineId: realtimeAlerts.productionLineId,
        lineName: productionLines.name,
        value: realtimeAlerts.value,
        threshold: realtimeAlerts.threshold,
        status: realtimeAlerts.status,
        createdAt: realtimeAlerts.createdAt,
        acknowledgedAt: realtimeAlerts.acknowledgedAt,
        resolvedAt: realtimeAlerts.resolvedAt,
        escalatedAt: realtimeAlerts.escalatedAt,
      })
      .from(realtimeAlerts)
      .leftJoin(machines, eq(realtimeAlerts.machineId, machines.id))
      .leftJoin(productionLines, eq(realtimeAlerts.productionLineId, productionLines.id))
      .where(eq(realtimeAlerts.status, status))
      .orderBy(desc(realtimeAlerts.createdAt))
      .limit(limit);

    return alerts.map(a => ({
      id: a.id,
      alertType: a.alertType || "unknown",
      severity: (a.severity as "info" | "warning" | "critical") || "info",
      title: a.title || "",
      message: a.message || "",
      entityType: a.machineId ? "machine" : a.productionLineId ? "line" : "global",
      entityId: a.machineId || a.productionLineId || undefined,
      entityName: a.machineName || a.lineName || undefined,
      value: a.value ? Number(a.value) : undefined,
      threshold: a.threshold ? Number(a.threshold) : undefined,
      status: a.status as "active" | "acknowledged" | "resolved" | "escalated",
      createdAt: a.createdAt || new Date(),
      acknowledgedAt: a.acknowledgedAt || undefined,
      resolvedAt: a.resolvedAt || undefined,
      escalatedAt: a.escalatedAt || undefined,
    }));
  } catch (error) {
    console.error("[Alert] Error getting alerts by status:", error);
    return [];
  }
}

// Acknowledge alert
export async function acknowledgeAlert(
  alertId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(realtimeAlerts)
      .set({
        status: "acknowledged",
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      })
      .where(eq(realtimeAlerts.id, alertId));

    return true;
  } catch (error) {
    console.error("[Alert] Error acknowledging alert:", error);
    return false;
  }
}

// Resolve alert
export async function resolveAlert(
  alertId: number,
  userId: number,
  resolution?: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(realtimeAlerts)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        resolvedBy: userId,
        resolution,
      })
      .where(eq(realtimeAlerts.id, alertId));

    return true;
  } catch (error) {
    console.error("[Alert] Error resolving alert:", error);
    return false;
  }
}

// Thống kê alerts
export async function getAlertStatistics(
  startDate: Date,
  endDate: Date
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  avgResolutionTime: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      total: 0,
      byStatus: {},
      bySeverity: {},
      byType: {},
      avgResolutionTime: 0,
    };
  }

  try {
    const alerts = await db
      .select()
      .from(realtimeAlerts)
      .where(and(
        gte(realtimeAlerts.createdAt, startDate),
        lte(realtimeAlerts.createdAt, endDate)
      ));

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    alerts.forEach(a => {
      // By status
      const status = a.status || "unknown";
      byStatus[status] = (byStatus[status] || 0) + 1;

      // By severity
      const severity = a.severity || "unknown";
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;

      // By type
      const type = a.alertType || "unknown";
      byType[type] = (byType[type] || 0) + 1;

      // Resolution time
      if (a.status === "resolved" && a.createdAt && a.resolvedAt) {
        totalResolutionTime += (new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()) / (1000 * 60);
        resolvedCount++;
      }
    });

    return {
      total: alerts.length,
      byStatus,
      bySeverity,
      byType,
      avgResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
    };
  } catch (error) {
    console.error("[Alert] Error getting alert statistics:", error);
    return {
      total: 0,
      byStatus: {},
      bySeverity: {},
      byType: {},
      avgResolutionTime: 0,
    };
  }
}
