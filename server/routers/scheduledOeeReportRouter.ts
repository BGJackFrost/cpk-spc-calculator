/**
 * Scheduled OEE Report Router
 * API endpoints cho quản lý báo cáo OEE định kỳ
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import {
  getScheduledOeeReports,
  getScheduledOeeReportById,
  createScheduledOeeReport,
  updateScheduledOeeReport,
  deleteScheduledOeeReport,
  sendOeeReport,
  getScheduledOeeReportHistory,
} from '../services/scheduledOeeReportService';

export const scheduledOeeReportRouter = router({
  // Lấy danh sách báo cáo định kỳ
  list: protectedProcedure.query(async () => {
    return await getScheduledOeeReports();
  }),

  // Lấy chi tiết một báo cáo
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getScheduledOeeReportById(input.id);
    }),

  // Tạo báo cáo mới
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      productionLineIds: z.array(z.number()).min(1),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23).default(8),
      minute: z.number().min(0).max(59).default(0),
      timezone: z.string().default('Asia/Ho_Chi_Minh'),
      notificationChannel: z.enum(['telegram', 'slack', 'both']),
      telegramConfigId: z.number().optional(),
      slackWebhookUrl: z.string().optional(),
      includeAvailability: z.boolean().default(true),
      includePerformance: z.boolean().default(true),
      includeQuality: z.boolean().default(true),
      includeComparison: z.boolean().default(true),
      includeTrend: z.boolean().default(true),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const id = await createScheduledOeeReport({
        ...input,
        createdBy: ctx.user?.id,
      });
      if (!id) {
        throw new Error('Failed to create scheduled OEE report');
      }
      return { success: true, id };
    }),

  // Cập nhật báo cáo
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      productionLineIds: z.array(z.number()).min(1).optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23).optional(),
      minute: z.number().min(0).max(59).optional(),
      timezone: z.string().optional(),
      notificationChannel: z.enum(['telegram', 'slack', 'both']).optional(),
      telegramConfigId: z.number().optional(),
      slackWebhookUrl: z.string().optional(),
      includeAvailability: z.boolean().optional(),
      includePerformance: z.boolean().optional(),
      includeQuality: z.boolean().optional(),
      includeComparison: z.boolean().optional(),
      includeTrend: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const success = await updateScheduledOeeReport(id, data);
      if (!success) {
        throw new Error('Failed to update scheduled OEE report');
      }
      return { success: true };
    }),

  // Xóa báo cáo
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await deleteScheduledOeeReport(input.id);
      if (!success) {
        throw new Error('Failed to delete scheduled OEE report');
      }
      return { success: true };
    }),

  // Gửi báo cáo ngay
  sendNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const result = await sendOeeReport(input.id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to send OEE report');
      }
      return { success: true };
    }),

  // Toggle trạng thái active
  toggleActive: protectedProcedure
    .input(z.object({
      id: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const success = await updateScheduledOeeReport(input.id, { isActive: input.isActive });
      if (!success) {
        throw new Error('Failed to toggle scheduled OEE report status');
      }
      return { success: true };
    }),

  // Lấy lịch sử gửi báo cáo
  history: protectedProcedure
    .input(z.object({
      reportId: z.number().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      return await getScheduledOeeReportHistory(input.reportId, input.limit);
    }),
});

export default scheduledOeeReportRouter;
