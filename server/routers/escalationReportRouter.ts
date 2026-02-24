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
import {
  getEscalationExportData,
  exportEscalationToExcel,
  generateEscalationPdfHtml,
  getScheduledReportHistory,
} from "../services/escalationExportService";
import { storagePut } from "../storage";

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

  // ============ Export Endpoints ============

  // Export to Excel
  exportExcel: protectedProcedure
    .input(z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
      filters: z.object({
        alertTypes: z.array(z.string()).optional(),
        severities: z.array(z.string()).optional(),
        statuses: z.array(z.string()).optional(),
        productionLineIds: z.array(z.number()).optional(),
      }).optional(),
      options: z.object({
        includeStats: z.boolean().optional(),
        includeTrends: z.boolean().optional(),
        includeAlerts: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const data = await getEscalationExportData(input.periodStart, input.periodEnd, input.filters);
      const buffer = await exportEscalationToExcel(data, input.options);
      
      // Upload to S3
      const filename = `escalation-report-${new Date().toISOString().split('T')[0]}-${Date.now()}.xlsx`;
      const { url } = await storagePut(
        `reports/escalation/${filename}`,
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      return {
        success: true,
        url,
        filename,
        alertCount: data.alerts.length,
        stats: data.stats,
      };
    }),

  // Export to PDF (returns HTML for client-side PDF generation or server-side conversion)
  exportPdf: protectedProcedure
    .input(z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
      filters: z.object({
        alertTypes: z.array(z.string()).optional(),
        severities: z.array(z.string()).optional(),
        statuses: z.array(z.string()).optional(),
        productionLineIds: z.array(z.number()).optional(),
      }).optional(),
      options: z.object({
        includeStats: z.boolean().optional(),
        includeTrends: z.boolean().optional(),
        includeAlerts: z.boolean().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const data = await getEscalationExportData(input.periodStart, input.periodEnd, input.filters);
      const html = await generateEscalationPdfHtml(data, input.options);
      
      // Upload HTML to S3 (client can convert to PDF)
      const filename = `escalation-report-${new Date().toISOString().split('T')[0]}-${Date.now()}.html`;
      const { url } = await storagePut(
        `reports/escalation/${filename}`,
        Buffer.from(html, 'utf-8'),
        'text/html'
      );

      return {
        success: true,
        url,
        html, // Also return HTML directly for client-side PDF generation
        filename,
        alertCount: data.alerts.length,
        stats: data.stats,
      };
    }),

  // Get export data (for custom export or preview)
  getExportData: protectedProcedure
    .input(z.object({
      periodStart: z.number(),
      periodEnd: z.number(),
      filters: z.object({
        alertTypes: z.array(z.string()).optional(),
        severities: z.array(z.string()).optional(),
        statuses: z.array(z.string()).optional(),
        productionLineIds: z.array(z.number()).optional(),
      }).optional(),
    }))
    .query(async ({ input }) => {
      return await getEscalationExportData(input.periodStart, input.periodEnd, input.filters);
    }),

  // Get scheduled report run history
  getScheduledHistory: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return await getScheduledReportHistory(input.configId, input.limit);
    }),

  // Quick export presets
  exportPreset: protectedProcedure
    .input(z.object({
      preset: z.enum(['today', 'yesterday', 'last7days', 'last30days', 'thisWeek', 'thisMonth']),
      format: z.enum(['excel', 'pdf']),
      filters: z.object({
        alertTypes: z.array(z.string()).optional(),
        severities: z.array(z.string()).optional(),
        statuses: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      
      let periodStart: number;
      let periodEnd: number = now;

      switch (input.preset) {
        case 'today':
          periodStart = new Date().setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          periodStart = new Date().setHours(0, 0, 0, 0) - dayMs;
          periodEnd = new Date().setHours(0, 0, 0, 0);
          break;
        case 'last7days':
          periodStart = now - 7 * dayMs;
          break;
        case 'last30days':
          periodStart = now - 30 * dayMs;
          break;
        case 'thisWeek':
          const today = new Date();
          const dayOfWeek = today.getDay();
          periodStart = new Date(today.setDate(today.getDate() - dayOfWeek)).setHours(0, 0, 0, 0);
          break;
        case 'thisMonth':
          periodStart = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0);
          break;
        default:
          periodStart = now - 7 * dayMs;
      }

      const data = await getEscalationExportData(periodStart, periodEnd, input.filters);

      if (input.format === 'excel') {
        const buffer = await exportEscalationToExcel(data);
        const filename = `escalation-${input.preset}-${Date.now()}.xlsx`;
        const { url } = await storagePut(
          `reports/escalation/${filename}`,
          buffer,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        return { success: true, url, filename, format: 'excel', alertCount: data.alerts.length };
      } else {
        const html = await generateEscalationPdfHtml(data);
        const filename = `escalation-${input.preset}-${Date.now()}.html`;
        const { url } = await storagePut(
          `reports/escalation/${filename}`,
          Buffer.from(html, 'utf-8'),
          'text/html'
        );
        return { success: true, url, html, filename, format: 'pdf', alertCount: data.alerts.length };
      }
    }),
});
