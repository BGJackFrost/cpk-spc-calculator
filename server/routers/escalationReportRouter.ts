import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createEscalationReportConfig,
  getEscalationReportConfigs,
  getEscalationReportConfigById,
  updateEscalationReportConfig,
  deleteEscalationReportConfig,
  getEscalationReportHistory,
  sendEscalationReport,
  generateReportData,
} from "../services/escalationReportService";

export const escalationReportRouter = router({
  list: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return await getEscalationReportConfigs(input?.activeOnly);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getEscalationReportConfigById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
      timezone: z.string().default('Asia/Ho_Chi_Minh'),
      emailRecipients: z.array(z.string().email()).optional(),
      webhookConfigIds: z.array(z.number()).optional(),
      includeStats: z.boolean().default(true),
      includeTopAlerts: z.boolean().default(true),
      includeResolvedAlerts: z.boolean().default(true),
      includeTrends: z.boolean().default(true),
      alertTypes: z.array(z.string()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createEscalationReportConfig({ ...input, createdBy: ctx.user.id });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      timezone: z.string().optional(),
      emailRecipients: z.array(z.string().email()).optional(),
      webhookConfigIds: z.array(z.number()).optional(),
      includeStats: z.boolean().optional(),
      includeTopAlerts: z.boolean().optional(),
      includeResolvedAlerts: z.boolean().optional(),
      includeTrends: z.boolean().optional(),
      alertTypes: z.array(z.string()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateEscalationReportConfig(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteEscalationReportConfig(input.id);
      return { success: true };
    }),

  getHistory: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await getEscalationReportHistory(input);
    }),

  sendNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await sendEscalationReport(input.id);
    }),

  preview: protectedProcedure
    .input(z.object({
      id: z.number(),
      periodStart: z.number().optional(),
      periodEnd: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const config = await getEscalationReportConfigById(input.id);
      if (!config) throw new Error('Config not found');
      const periodStart = input.periodStart || Date.now() - 7 * 24 * 60 * 60 * 1000;
      const periodEnd = input.periodEnd || Date.now();
      return await generateReportData(config, periodStart, periodEnd);
    }),
});
