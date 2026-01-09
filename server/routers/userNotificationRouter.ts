/**
 * User Notification Router
 * API endpoints cho quản lý thông báo realtime của người dùng
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { userNotifications } from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { sendSseEvent } from '../sse';

export const userNotificationRouter = router({
  // Lấy danh sách thông báo của user hiện tại
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(50),
      unreadOnly: z.boolean().optional().default(false),
      type: z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected']).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions = [eq(userNotifications.userId, ctx.user.id)];
      
      if (input?.unreadOnly) {
        conditions.push(eq(userNotifications.isRead, 0));
      }
      
      if (input?.type) {
        conditions.push(eq(userNotifications.type, input.type));
      }

      const notifications = await db
        .select()
        .from(userNotifications)
        .where(and(...conditions))
        .orderBy(desc(userNotifications.createdAt))
        .limit(input?.limit || 50);

      return notifications;
    }),

  // Đếm số thông báo chưa đọc
  getUnreadCount: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userNotifications)
        .where(and(
          eq(userNotifications.userId, ctx.user.id),
          eq(userNotifications.isRead, 0)
        ));

      return { count: result[0]?.count || 0 };
    }),

  // Đánh dấu thông báo đã đọc
  markAsRead: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Kiểm tra quyền sở hữu
      const [notification] = await db
        .select()
        .from(userNotifications)
        .where(eq(userNotifications.id, input.notificationId));

      if (!notification) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy thông báo' });
      }

      if (notification.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền truy cập' });
      }

      await db
        .update(userNotifications)
        .set({
          isRead: 1,
          readAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(userNotifications.id, input.notificationId));

      return { success: true };
    }),

  // Đánh dấu tất cả thông báo đã đọc
  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db
        .update(userNotifications)
        .set({
          isRead: 1,
          readAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(and(
          eq(userNotifications.userId, ctx.user.id),
          eq(userNotifications.isRead, 0)
        ));

      return { success: true };
    }),

  // Xóa thông báo
  delete: protectedProcedure
    .input(z.object({
      notificationId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Kiểm tra quyền sở hữu
      const [notification] = await db
        .select()
        .from(userNotifications)
        .where(eq(userNotifications.id, input.notificationId));

      if (!notification) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy thông báo' });
      }

      if (notification.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền xóa' });
      }

      await db
        .delete(userNotifications)
        .where(eq(userNotifications.id, input.notificationId));

      return { success: true };
    }),

  // Xóa tất cả thông báo đã đọc
  deleteAllRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db
        .delete(userNotifications)
        .where(and(
          eq(userNotifications.userId, ctx.user.id),
          eq(userNotifications.isRead, 1)
        ));

      return { success: true };
    }),
});

// Helper function để tạo thông báo mới và gửi SSE
export async function createUserNotification(
  userId: number,
  type: 'report_sent' | 'spc_violation' | 'cpk_alert' | 'system' | 'anomaly_detected',
  severity: 'info' | 'warning' | 'critical',
  title: string,
  message: string,
  referenceType?: string,
  referenceId?: number,
  metadata?: Record<string, any>
): Promise<{ success: boolean; notificationId?: number; error?: string }> {
  try {
    const db = await getDb();
    if (!db) return { success: false, error: 'Database not available' };

    const [result] = await db.insert(userNotifications).values({
      userId,
      type,
      severity,
      title,
      message,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      isRead: 0,
    });

    // Gửi SSE event để cập nhật realtime
    sendSseEvent('user_notification', {
      userId,
      notificationId: result.insertId,
      type,
      severity,
      title,
      message,
      referenceType,
      referenceId,
      metadata,
      createdAt: new Date().toISOString(),
    });

    return { success: true, notificationId: result.insertId };
  } catch (error) {
    console.error('[UserNotification] Error creating notification:', error);
    return { success: false, error: String(error) };
  }
}

// Helper để gửi thông báo khi có báo cáo mới
export async function notifyReportSent(
  userId: number,
  reportName: string,
  reportId: number,
  pdfUrl?: string
): Promise<void> {
  await createUserNotification(
    userId,
    'report_sent',
    'info',
    '📋 Báo cáo mới đã được gửi',
    `Báo cáo "${reportName}" đã được tạo và gửi thành công.`,
    'scheduled_report',
    reportId,
    { pdfUrl }
  );
}

// Helper để gửi thông báo khi phát hiện vi phạm SPC
export async function notifySpcViolation(
  userId: number,
  planName: string,
  ruleName: string,
  ruleCode: string,
  value: number,
  planId?: number
): Promise<void> {
  const severity = ruleCode.startsWith('R1') || ruleCode.startsWith('R2') ? 'critical' : 'warning';
  
  await createUserNotification(
    userId,
    'spc_violation',
    severity,
    `⚠️ Vi phạm SPC Rule: ${ruleCode}`,
    `Kế hoạch "${planName}" phát hiện vi phạm ${ruleName}. Giá trị: ${value.toFixed(4)}`,
    'spc_plan',
    planId,
    { ruleName, ruleCode, value }
  );
}

// Helper để gửi thông báo khi CPK dưới ngưỡng
export async function notifyCpkAlert(
  userId: number,
  planName: string,
  cpkValue: number,
  threshold: number,
  planId?: number
): Promise<void> {
  const severity = cpkValue < 1.0 ? 'critical' : 'warning';
  
  await createUserNotification(
    userId,
    'cpk_alert',
    severity,
    `📉 Cảnh báo CPK thấp`,
    `Kế hoạch "${planName}" có CPK = ${cpkValue.toFixed(3)} (ngưỡng: ${threshold.toFixed(2)})`,
    'spc_plan',
    planId,
    { cpkValue, threshold }
  );
}

// Helper để gửi thông báo khi phát hiện bất thường
export async function notifyAnomalyDetected(
  userId: number,
  source: string,
  description: string,
  sourceId?: number,
  metadata?: Record<string, any>
): Promise<void> {
  await createUserNotification(
    userId,
    'anomaly_detected',
    'warning',
    `🔍 Phát hiện bất thường`,
    description,
    source,
    sourceId,
    metadata
  );
}

export default userNotificationRouter;
