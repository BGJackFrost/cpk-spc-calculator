/**
 * AI Export Router - API endpoints cho xuất báo cáo AI Model Performance
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { 
  getAiReportData, 
  generateAiReportHtml, 
  generateAiReportExcel 
} from '../services/aiExportService';

export const aiExportRouter = router({
  // Get AI model performance data
  getData: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      modelIds: z.array(z.string()).optional(),
    }).optional())
    .query(async ({ input }) => {
      const data = await getAiReportData();
      return data;
    }),

  // Export to Excel
  exportExcel: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      modelIds: z.array(z.string()).optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const data = await getAiReportData();
      const buffer = await generateAiReportExcel(data);
      
      return {
        content: buffer.toString('base64'),
        filename: `ai-model-performance-${new Date().toISOString().split('T')[0]}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),

  // Export to PDF (HTML-based)
  exportPdf: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      modelIds: z.array(z.string()).optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const data = await getAiReportData();
      const html = await generateAiReportHtml(data);
      
      return {
        content: html,
        filename: `ai-model-performance-${new Date().toISOString().split('T')[0]}.html`,
        mimeType: 'text/html',
      };
    }),

  // Get summary statistics
  getSummary: protectedProcedure.query(async () => {
    const data = await getAiReportData();
    return data.statistics;
  }),

  // Get model list
  getModels: protectedProcedure.query(async () => {
    const data = await getAiReportData();
    return data.models;
  }),

  // Get training jobs
  getTrainingJobs: protectedProcedure.query(async () => {
    const data = await getAiReportData();
    return data.trainingJobs;
  }),
});

export default aiExportRouter;
