/**
 * Audit Log Service - Ghi lại các thao tác quan trọng trong hệ thống
 */

import { getDb } from "./db";
import { auditLogs, InsertAuditLog } from "../drizzle/schema";
import { sendSseEvent } from "./sse";

export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "export" | "analyze";

export interface AuditLogParams {
  userId: number;
  userName?: string;
  action: AuditAction;
  module: string;
  tableName?: string;
  recordId?: number;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Ghi audit log vào database
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("[AuditService] Database not available, skipping audit log");
      return;
    }

    const logEntry: InsertAuditLog = {
      userId: params.userId,
      userName: params.userName || null,
      action: params.action,
      module: params.module,
      tableName: params.tableName || null,
      recordId: params.recordId || null,
      oldValue: params.oldValue ? JSON.stringify(params.oldValue) : null,
      newValue: params.newValue ? JSON.stringify(params.newValue) : null,
      description: params.description || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    };

    await db.insert(auditLogs).values(logEntry);
    console.log(`[AuditService] Logged: ${params.action} on ${params.module}${params.tableName ? `/${params.tableName}` : ""}`);

    // Broadcast real-time SSE event
    try {
      sendSseEvent('audit_log_new', {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        module: params.module,
        tableName: params.tableName,
        recordId: params.recordId,
        description: params.description,
        timestamp: new Date().toISOString(),
      });
    } catch (sseErr) {
      // SSE broadcast failure should not affect audit logging
    }
  } catch (error) {
    console.error("[AuditService] Failed to log audit:", error);
    // Không throw error để không ảnh hưởng đến flow chính
  }
}

/**
 * Ghi audit log cho thao tác tạo mới
 */
export async function logCreate(
  userId: number,
  userName: string | undefined,
  module: string,
  tableName: string,
  recordId: number,
  newValue: Record<string, unknown>,
  description?: string
): Promise<void> {
  await logAudit({
    userId,
    userName,
    action: "create",
    module,
    tableName,
    recordId,
    newValue,
    description: description || `Tạo mới ${tableName} #${recordId}`,
  });
}

/**
 * Ghi audit log cho thao tác cập nhật
 */
export async function logUpdate(
  userId: number,
  userName: string | undefined,
  module: string,
  tableName: string,
  recordId: number,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
  description?: string
): Promise<void> {
  await logAudit({
    userId,
    userName,
    action: "update",
    module,
    tableName,
    recordId,
    oldValue,
    newValue,
    description: description || `Cập nhật ${tableName} #${recordId}`,
  });
}

/**
 * Ghi audit log cho thao tác xóa
 */
export async function logDelete(
  userId: number,
  userName: string | undefined,
  module: string,
  tableName: string,
  recordId: number,
  oldValue: Record<string, unknown>,
  description?: string
): Promise<void> {
  await logAudit({
    userId,
    userName,
    action: "delete",
    module,
    tableName,
    recordId,
    oldValue,
    description: description || `Xóa ${tableName} #${recordId}`,
  });
}

/**
 * Ghi audit log cho thao tác phân tích SPC
 */
export async function logAnalyze(
  userId: number,
  userName: string | undefined,
  module: string,
  description: string,
  params?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    userName,
    action: "analyze",
    module,
    newValue: params,
    description,
  });
}

/**
 * Ghi audit log cho thao tác xuất báo cáo
 */
export async function logExport(
  userId: number,
  userName: string | undefined,
  module: string,
  description: string,
  params?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    userId,
    userName,
    action: "export",
    module,
    newValue: params,
    description,
  });
}
