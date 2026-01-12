/**
 * User Notification Router
 * API endpoints cho quản lý thông báo realtime của người dùng
 * Bao gồm: lọc theo loại, thời gian, tìm kiếm theo nội dung
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { userNotifications } from '../../drizzle/schema';
import { eq, and, desc, sql, gte, lte, like, or } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { sendSseEvent } from '../sse';

export const userNotificationRouter = router({
  // Lấy danh sách thông báo với bộ lọc nâng cao
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
      unreadOnly: z.boolean().optional().default(false),
      // Lọc theo loại thông báo
      type: z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected']).optional(),
      types: z.array(z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected'])).optional(),
      // Lọc theo mức độ nghiêm trọng
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      severities: z.array(z.enum(['info', 'warning', 'critical'])).optional(),
      // Lọc theo thời gian
      timeRange: z.enum(['today', '7days', '30days', 'custom']).optional(),
      startDate: z.string().optional(), // ISO date string
      endDate: z.string().optional(), // ISO date string
      // Tìm kiếm theo nội dung
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions: any[] = [eq(userNotifications.userId, ctx.user.id)];
      
      // Lọc theo trạng thái đọc
      if (input?.unreadOnly) {
        conditions.push(eq(userNotifications.isRead, 0));
      }
      
      // Lọc theo loại thông báo (single)
      if (input?.type) {
        conditions.push(eq(userNotifications.type, input.type));
      }
      
      // Lọc theo nhiều loại thông báo
      if (input?.types && input.types.length > 0) {
        const typeConditions = input.types.map(t => eq(userNotifications.type, t));
        conditions.push(or(...typeConditions));
      }
      
      // Lọc theo mức độ nghiêm trọng (single)
      if (input?.severity) {
        conditions.push(eq(userNotifications.severity, input.severity));
      }
      
      // Lọc theo nhiều mức độ nghiêm trọng
      if (input?.severities && input.severities.length > 0) {
        const severityConditions = input.severities.map(s => eq(userNotifications.severity, s));
        conditions.push(or(...severityConditions));
      }
      
      // Lọc theo thời gian
      if (input?.timeRange) {
        const now = new Date();
        let startDate: Date | null = null;
        
        switch (input.timeRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'custom':
            if (input.startDate) {
              startDate = new Date(input.startDate);
            }
            break;
        }
        
        if (startDate) {
          conditions.push(gte(userNotifications.createdAt, startDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
        
        if (input.timeRange === 'custom' && input.endDate) {
          const endDate = new Date(input.endDate);
          endDate.setHours(23, 59, 59, 999);
          conditions.push(lte(userNotifications.createdAt, endDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
      }
      
      // Tìm kiếm theo nội dung
      if (input?.search && input.search.trim()) {
        const searchTerm = `%${input.search.trim()}%`;
        conditions.push(or(
          like(userNotifications.title, searchTerm),
          like(userNotifications.message, searchTerm)
        ));
      }

      const notifications = await db
        .select()
        .from(userNotifications)
        .where(and(...conditions))
        .orderBy(desc(userNotifications.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return notifications;
    }),

  // Đếm số thông báo theo bộ lọc
  getCount: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().optional().default(false),
      type: z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected']).optional(),
      types: z.array(z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected'])).optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      severities: z.array(z.enum(['info', 'warning', 'critical'])).optional(),
      timeRange: z.enum(['today', '7days', '30days', 'custom']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions: any[] = [eq(userNotifications.userId, ctx.user.id)];
      
      if (input?.unreadOnly) {
        conditions.push(eq(userNotifications.isRead, 0));
      }
      
      if (input?.type) {
        conditions.push(eq(userNotifications.type, input.type));
      }
      
      if (input?.types && input.types.length > 0) {
        const typeConditions = input.types.map(t => eq(userNotifications.type, t));
        conditions.push(or(...typeConditions));
      }
      
      if (input?.severity) {
        conditions.push(eq(userNotifications.severity, input.severity));
      }
      
      if (input?.severities && input.severities.length > 0) {
        const severityConditions = input.severities.map(s => eq(userNotifications.severity, s));
        conditions.push(or(...severityConditions));
      }
      
      if (input?.timeRange) {
        const now = new Date();
        let startDate: Date | null = null;
        
        switch (input.timeRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'custom':
            if (input.startDate) {
              startDate = new Date(input.startDate);
            }
            break;
        }
        
        if (startDate) {
          conditions.push(gte(userNotifications.createdAt, startDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
        
        if (input.timeRange === 'custom' && input.endDate) {
          const endDate = new Date(input.endDate);
          endDate.setHours(23, 59, 59, 999);
          conditions.push(lte(userNotifications.createdAt, endDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
      }
      
      if (input?.search && input.search.trim()) {
        const searchTerm = `%${input.search.trim()}%`;
        conditions.push(or(
          like(userNotifications.title, searchTerm),
          like(userNotifications.message, searchTerm)
        ));
      }

      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userNotifications)
        .where(and(...conditions));

      return { count: result[0]?.count || 0 };
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

  // Lấy thống kê thông báo theo loại và mức độ
  getStats: protectedProcedure
    .input(z.object({
      timeRange: z.enum(['today', '7days', '30days', 'all']).optional().default('all'),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions: any[] = [eq(userNotifications.userId, ctx.user.id)];
      
      if (input?.timeRange && input.timeRange !== 'all') {
        const now = new Date();
        let startDate: Date | null = null;
        
        switch (input.timeRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (startDate) {
          conditions.push(gte(userNotifications.createdAt, startDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
      }

      // Đếm theo loại
      const byType = await db
        .select({
          type: userNotifications.type,
          count: sql<number>`COUNT(*)`,
        })
        .from(userNotifications)
        .where(and(...conditions))
        .groupBy(userNotifications.type);

      // Đếm theo mức độ nghiêm trọng
      const bySeverity = await db
        .select({
          severity: userNotifications.severity,
          count: sql<number>`COUNT(*)`,
        })
        .from(userNotifications)
        .where(and(...conditions))
        .groupBy(userNotifications.severity);

      // Đếm chưa đọc
      const unreadResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userNotifications)
        .where(and(
          ...conditions,
          eq(userNotifications.isRead, 0)
        ));

      // Tổng số
      const totalResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userNotifications)
        .where(and(...conditions));

      return {
        total: totalResult[0]?.count || 0,
        unread: unreadResult[0]?.count || 0,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item.count;
          return acc;
        }, {} as Record<string, number>),
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item.severity] = item.count;
          return acc;
        }, {} as Record<string, number>),
      };
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

  // Đánh dấu nhiều thông báo đã đọc theo bộ lọc
  markFilteredAsRead: protectedProcedure
    .input(z.object({
      type: z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected']).optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      timeRange: z.enum(['today', '7days', '30days']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions: any[] = [
        eq(userNotifications.userId, ctx.user.id),
        eq(userNotifications.isRead, 0)
      ];
      
      if (input.type) {
        conditions.push(eq(userNotifications.type, input.type));
      }
      
      if (input.severity) {
        conditions.push(eq(userNotifications.severity, input.severity));
      }
      
      if (input.timeRange) {
        const now = new Date();
        let startDate: Date | null = null;
        
        switch (input.timeRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        
        if (startDate) {
          conditions.push(gte(userNotifications.createdAt, startDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
      }

      const result = await db
        .update(userNotifications)
        .set({
          isRead: 1,
          readAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(and(...conditions));

      return { success: true, count: result[0]?.affectedRows || 0 };
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

  // Export lịch sử thông báo ra CSV
  exportCsv: protectedProcedure
    .input(z.object({
      types: z.array(z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected'])).optional(),
      severities: z.array(z.enum(['info', 'warning', 'critical'])).optional(),
      timeRange: z.enum(['today', '7days', '30days', 'custom']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions: any[] = [eq(userNotifications.userId, ctx.user.id)];
      
      if (input?.types && input.types.length > 0) {
        const typeConditions = input.types.map(t => eq(userNotifications.type, t));
        conditions.push(or(...typeConditions));
      }
      
      if (input?.severities && input.severities.length > 0) {
        const severityConditions = input.severities.map(s => eq(userNotifications.severity, s));
        conditions.push(or(...severityConditions));
      }
      
      if (input?.timeRange) {
        const now = new Date();
        let startDate: Date | null = null;
        
        switch (input.timeRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'custom':
            if (input.startDate) {
              startDate = new Date(input.startDate);
            }
            break;
        }
        
        if (startDate) {
          conditions.push(gte(userNotifications.createdAt, startDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
        
        if (input.timeRange === 'custom' && input.endDate) {
          const endDate = new Date(input.endDate);
          endDate.setHours(23, 59, 59, 999);
          conditions.push(lte(userNotifications.createdAt, endDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
      }

      const notifications = await db
        .select()
        .from(userNotifications)
        .where(and(...conditions))
        .orderBy(desc(userNotifications.createdAt))
        .limit(1000);

      // Generate CSV content
      const typeLabels: Record<string, string> = {
        'report_sent': 'Báo cáo',
        'spc_violation': 'Vi phạm SPC',
        'cpk_alert': 'Cảnh báo CPK',
        'system': 'Hệ thống',
        'anomaly_detected': 'Bất thường',
      };
      
      const severityLabels: Record<string, string> = {
        'info': 'Thông tin',
        'warning': 'Cảnh báo',
        'critical': 'Nghiêm trọng',
      };

      const csvRows = [
        ['ID', 'Loại', 'Mức độ', 'Tiêu đề', 'Nội dung', 'Trạng thái', 'Thời gian tạo', 'Thời gian đọc'].join(','),
        ...notifications.map(n => [
          n.id,
          `"${typeLabels[n.type] || n.type}"`,
          `"${severityLabels[n.severity] || n.severity}"`,
          `"${(n.title || '').replace(/"/g, '""')}"`,
          `"${(n.message || '').replace(/"/g, '""')}"`,
          n.isRead ? 'Đã đọc' : 'Chưa đọc',
          n.createdAt || '',
          n.readAt || '',
        ].join(','))
      ];

      return {
        csv: csvRows.join('\n'),
        filename: `notifications_${new Date().toISOString().split('T')[0]}.csv`,
        count: notifications.length,
      };
    }),

  // Export lịch sử thông báo ra Excel (JSON format for client-side processing)
  exportExcel: protectedProcedure
    .input(z.object({
      types: z.array(z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected'])).optional(),
      severities: z.array(z.enum(['info', 'warning', 'critical'])).optional(),
      timeRange: z.enum(['today', '7days', '30days', 'custom']).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions: any[] = [eq(userNotifications.userId, ctx.user.id)];
      
      if (input?.types && input.types.length > 0) {
        const typeConditions = input.types.map(t => eq(userNotifications.type, t));
        conditions.push(or(...typeConditions));
      }
      
      if (input?.severities && input.severities.length > 0) {
        const severityConditions = input.severities.map(s => eq(userNotifications.severity, s));
        conditions.push(or(...severityConditions));
      }
      
      if (input?.timeRange) {
        const now = new Date();
        let startDate: Date | null = null;
        
        switch (input.timeRange) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'custom':
            if (input.startDate) {
              startDate = new Date(input.startDate);
            }
            break;
        }
        
        if (startDate) {
          conditions.push(gte(userNotifications.createdAt, startDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
        
        if (input.timeRange === 'custom' && input.endDate) {
          const endDate = new Date(input.endDate);
          endDate.setHours(23, 59, 59, 999);
          conditions.push(lte(userNotifications.createdAt, endDate.toISOString().slice(0, 19).replace('T', ' ')));
        }
      }

      const notifications = await db
        .select()
        .from(userNotifications)
        .where(and(...conditions))
        .orderBy(desc(userNotifications.createdAt))
        .limit(1000);

      const typeLabels: Record<string, string> = {
        'report_sent': 'Báo cáo',
        'spc_violation': 'Vi phạm SPC',
        'cpk_alert': 'Cảnh báo CPK',
        'system': 'Hệ thống',
        'anomaly_detected': 'Bất thường',
      };
      
      const severityLabels: Record<string, string> = {
        'info': 'Thông tin',
        'warning': 'Cảnh báo',
        'critical': 'Nghiêm trọng',
      };

      return {
        data: notifications.map(n => ({
          id: n.id,
          type: typeLabels[n.type] || n.type,
          severity: severityLabels[n.severity] || n.severity,
          title: n.title,
          message: n.message,
          status: n.isRead ? 'Đã đọc' : 'Chưa đọc',
          createdAt: n.createdAt,
          readAt: n.readAt,
        })),
        filename: `notifications_${new Date().toISOString().split('T')[0]}.xlsx`,
        count: notifications.length,
      };
    }),

  // Xóa thông báo theo bộ lọc
  deleteFiltered: protectedProcedure
    .input(z.object({
      type: z.enum(['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected']).optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      readOnly: z.boolean().optional().default(true), // Mặc định chỉ xóa đã đọc
      olderThan: z.number().optional(), // Số ngày
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions: any[] = [eq(userNotifications.userId, ctx.user.id)];
      
      if (input.readOnly) {
        conditions.push(eq(userNotifications.isRead, 1));
      }
      
      if (input.type) {
        conditions.push(eq(userNotifications.type, input.type));
      }
      
      if (input.severity) {
        conditions.push(eq(userNotifications.severity, input.severity));
      }
      
      if (input.olderThan) {
        const cutoffDate = new Date(Date.now() - input.olderThan * 24 * 60 * 60 * 1000);
        conditions.push(lte(userNotifications.createdAt, cutoffDate.toISOString().slice(0, 19).replace('T', ' ')));
      }

      const result = await db
        .delete(userNotifications)
        .where(and(...conditions));

      return { success: true, count: result[0]?.affectedRows || 0 };
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
