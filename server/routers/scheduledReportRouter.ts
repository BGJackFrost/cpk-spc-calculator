import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { scheduledReports, scheduledReportLogs } from "../../drizzle/schema";
import { eq, and, desc, lte, gte } from "drizzle-orm";
import { sendEmail } from "../services/emailService";

// Helper to calculate next run time
function calculateNextRunAt(
  scheduleType: 'daily' | 'weekly' | 'monthly',
  scheduleTime: string,
  scheduleDayOfWeek?: number | null,
  scheduleDayOfMonth?: number | null
): Date {
  const [hours, minutes] = scheduleTime.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  
  next.setHours(hours, minutes, 0, 0);
  
  if (scheduleType === 'daily') {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (scheduleType === 'weekly' && scheduleDayOfWeek !== null && scheduleDayOfWeek !== undefined) {
    const currentDay = now.getDay();
    let daysUntil = scheduleDayOfWeek - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= now)) {
      daysUntil += 7;
    }
    next.setDate(next.getDate() + daysUntil);
  } else if (scheduleType === 'monthly' && scheduleDayOfMonth !== null && scheduleDayOfMonth !== undefined) {
    next.setDate(scheduleDayOfMonth);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  }
  
  return next;
}

export const scheduledReportRouter = router({
  // Get all scheduled reports for current user
  list: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const conditions = [eq(scheduledReports.userId, ctx.user.id)];
      if (!input?.includeInactive) {
        conditions.push(eq(scheduledReports.isActive, 1));
      }
      
      const reports = await db
        .select()
        .from(scheduledReports)
        .where(and(...conditions))
        .orderBy(desc(scheduledReports.createdAt));
      
      return reports;
    }),

  // Get all scheduled reports (admin only)
  listAll: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Chỉ admin mới có quyền xem tất cả báo cáo' });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const reports = await db
        .select()
        .from(scheduledReports)
        .orderBy(desc(scheduledReports.createdAt));
      
      return reports;
    }),

  // Get a single scheduled report
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [report] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.id));
      
      if (!report) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy báo cáo' });
      }
      
      // Check permission
      if (report.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền truy cập' });
      }
      
      return report;
    }),

  // Create a new scheduled report
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Tên báo cáo không được để trống'),
      description: z.string().optional(),
      reportType: z.enum(['spc_summary', 'cpk_analysis', 'violation_report', 'production_line_status', 'ai_vision_dashboard', 'radar_chart_comparison']),
      scheduleType: z.enum(['daily', 'weekly', 'monthly']),
      scheduleTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Định dạng thời gian không hợp lệ'),
      scheduleDayOfWeek: z.number().min(0).max(6).optional().nullable(),
      scheduleDayOfMonth: z.number().min(1).max(31).optional().nullable(),
      productionLineIds: z.array(z.number()).optional(),
      productIds: z.array(z.number()).optional(),
      includeCharts: z.boolean().optional().default(true),
      includeRawData: z.boolean().optional().default(false),
      recipients: z.array(z.string().email('Email không hợp lệ')).min(1, 'Cần ít nhất 1 người nhận'),
      ccRecipients: z.array(z.string().email()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const nextRunAt = calculateNextRunAt(
        input.scheduleType,
        input.scheduleTime,
        input.scheduleDayOfWeek,
        input.scheduleDayOfMonth
      );
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [result] = await db.insert(scheduledReports).values({
        name: input.name,
        description: input.description || null,
        userId: ctx.user.id,
        reportType: input.reportType,
        scheduleType: input.scheduleType,
        scheduleTime: input.scheduleTime,
        scheduleDayOfWeek: input.scheduleDayOfWeek ?? null,
        scheduleDayOfMonth: input.scheduleDayOfMonth ?? null,
        productionLineIds: input.productionLineIds ? JSON.stringify(input.productionLineIds) : null,
        productIds: input.productIds ? JSON.stringify(input.productIds) : null,
        includeCharts: input.includeCharts ? 1 : 0,
        includeRawData: input.includeRawData ? 1 : 0,
        recipients: JSON.stringify(input.recipients),
        ccRecipients: input.ccRecipients ? JSON.stringify(input.ccRecipients) : null,
        isActive: 1,
        nextRunAt: nextRunAt.toISOString().slice(0, 19).replace('T', ' '),
      });
      
      return { 
        id: result.insertId, 
        name: input.name,
        reportType: input.reportType,
        scheduleType: input.scheduleType,
        scheduleTime: input.scheduleTime,
        scheduleDayOfWeek: input.scheduleDayOfWeek ?? null,
        scheduleDayOfMonth: input.scheduleDayOfMonth ?? null,
        isActive: true,
        nextRunAt,
      };
    }),

  // Update a scheduled report
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional().nullable(),
      reportType: z.enum(['spc_summary', 'cpk_analysis', 'violation_report', 'production_line_status', 'ai_vision_dashboard', 'radar_chart_comparison']).optional(),
      scheduleType: z.enum(['daily', 'weekly', 'monthly']).optional(),
      scheduleTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      scheduleDayOfWeek: z.number().min(0).max(6).optional().nullable(),
      scheduleDayOfMonth: z.number().min(1).max(31).optional().nullable(),
      productionLineIds: z.array(z.number()).optional(),
      productIds: z.array(z.number()).optional(),
      includeCharts: z.boolean().optional(),
      includeRawData: z.boolean().optional(),
      recipients: z.array(z.string().email()).optional(),
      ccRecipients: z.array(z.string().email()).optional().nullable(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      // Check ownership
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [existing] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, id));
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy báo cáo' });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền chỉnh sửa' });
      }
      
      // Build update object
      const updates: Record<string, any> = {};
      
      if (updateData.name !== undefined) updates.name = updateData.name;
      if (updateData.description !== undefined) updates.description = updateData.description;
      if (updateData.reportType !== undefined) updates.reportType = updateData.reportType;
      if (updateData.scheduleType !== undefined) updates.scheduleType = updateData.scheduleType;
      if (updateData.scheduleTime !== undefined) updates.scheduleTime = updateData.scheduleTime;
      if (updateData.scheduleDayOfWeek !== undefined) updates.scheduleDayOfWeek = updateData.scheduleDayOfWeek;
      if (updateData.scheduleDayOfMonth !== undefined) updates.scheduleDayOfMonth = updateData.scheduleDayOfMonth;
      if (updateData.productionLineIds !== undefined) updates.productionLineIds = JSON.stringify(updateData.productionLineIds);
      if (updateData.productIds !== undefined) updates.productIds = JSON.stringify(updateData.productIds);
      if (updateData.includeCharts !== undefined) updates.includeCharts = updateData.includeCharts ? 1 : 0;
      if (updateData.includeRawData !== undefined) updates.includeRawData = updateData.includeRawData ? 1 : 0;
      if (updateData.recipients !== undefined) updates.recipients = JSON.stringify(updateData.recipients);
      if (updateData.ccRecipients !== undefined) updates.ccRecipients = updateData.ccRecipients ? JSON.stringify(updateData.ccRecipients) : null;
      if (updateData.isActive !== undefined) updates.isActive = updateData.isActive ? 1 : 0;
      
      // Recalculate next run if schedule changed
      const scheduleType = updateData.scheduleType || existing.scheduleType;
      const scheduleTime = updateData.scheduleTime || existing.scheduleTime;
      const scheduleDayOfWeek = updateData.scheduleDayOfWeek !== undefined ? updateData.scheduleDayOfWeek : existing.scheduleDayOfWeek;
      const scheduleDayOfMonth = updateData.scheduleDayOfMonth !== undefined ? updateData.scheduleDayOfMonth : existing.scheduleDayOfMonth;
      
      if (updateData.scheduleType || updateData.scheduleTime || updateData.scheduleDayOfWeek !== undefined || updateData.scheduleDayOfMonth !== undefined) {
        const nextRunAt = calculateNextRunAt(
          scheduleType as 'daily' | 'weekly' | 'monthly',
          scheduleTime,
          scheduleDayOfWeek,
          scheduleDayOfMonth
        );
        updates.nextRunAt = nextRunAt.toISOString().slice(0, 19).replace('T', ' ');
      }
      
      await db.update(scheduledReports)
        .set(updates)
        .where(eq(scheduledReports.id, id));
      
      return { success: true };
    }),

  // Delete a scheduled report
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [existing] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy báo cáo' });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền xóa' });
      }
      
      // Delete logs first
      await db.delete(scheduledReportLogs)
        .where(eq(scheduledReportLogs.reportId, input.id));
      
      // Delete report
      await db.delete(scheduledReports)
        .where(eq(scheduledReports.id, input.id));
      
      return { success: true };
    }),

  // Get logs for a scheduled report
  getLogs: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Check ownership
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [report] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.reportId));
      
      if (!report) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy báo cáo' });
      }
      
      if (report.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền truy cập' });
      }
      
      const logs = await db
        .select()
        .from(scheduledReportLogs)
        .where(eq(scheduledReportLogs.reportId, input.reportId))
        .orderBy(desc(scheduledReportLogs.startedAt))
        .limit(input.limit);
      
      return logs;
    }),

  // Manually trigger a report
  sendNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [report] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.id));
      
      if (!report) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy báo cáo' });
      }
      
      if (report.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền thực hiện' });
      }
      
      // Create log entry
      const [logResult] = await db.insert(scheduledReportLogs).values({
        reportId: input.id,
        status: 'running',
        recipientCount: JSON.parse(report.recipients as string || '[]').length,
      });
      const logId = logResult.insertId;
      
      try {
        // Generate and send report
        const { generateAndSendReport } = await import('../services/scheduledReportService');
        const result = await generateAndSendReport(report);
        
        // Update log
        await db.update(scheduledReportLogs)
          .set({
            status: result.success ? 'success' : 'failed',
            completedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            emailsSent: result.emailsSent || 0,
            errorMessage: result.error || null,
            reportFileUrl: result.reportUrl || null,
          })
          .where(eq(scheduledReportLogs.id, logId));
        
        // Update report status
        await db.update(scheduledReports)
          .set({
            lastRunAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            lastRunStatus: result.success ? 'success' : 'failed',
            lastRunError: result.error || null,
          })
          .where(eq(scheduledReports.id, input.id));
        
        if (!result.success) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: result.error || 'Lỗi gửi báo cáo' });
        }
        
        return { success: true, emailsSent: result.emailsSent };
      } catch (error: any) {
        // Update log on error
        await db.update(scheduledReportLogs)
          .set({
            status: 'failed',
            completedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            errorMessage: error.message,
          })
          .where(eq(scheduledReportLogs.id, logId));
        
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      }
    }),

  // Toggle active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [existing] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy báo cáo' });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền chỉnh sửa' });
      }
      
      const newStatus = existing.isActive === 1 ? 0 : 1;
      
      // Recalculate next run if activating
      let nextRunAt = existing.nextRunAt;
      if (newStatus === 1) {
        const next = calculateNextRunAt(
          existing.scheduleType as 'daily' | 'weekly' | 'monthly',
          existing.scheduleTime,
          existing.scheduleDayOfWeek,
          existing.scheduleDayOfMonth
        );
        nextRunAt = next.toISOString().slice(0, 19).replace('T', ' ');
      }
      
      await db.update(scheduledReports)
        .set({ 
          isActive: newStatus,
          nextRunAt,
        })
        .where(eq(scheduledReports.id, input.id));
      
      return { success: true, isActive: newStatus === 1 };
    }),
});
