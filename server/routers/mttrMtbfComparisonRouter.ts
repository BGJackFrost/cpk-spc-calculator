/**
 * MTTR/MTBF Comparison Router
 * API endpoints cho so sánh và xuất báo cáo MTTR/MTBF
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import {
  getComparisonData,
  exportComparisonToExcel,
  exportComparisonToPdf,
} from '../services/mttrMtbfComparisonExportService';
import { storagePut } from '../storage';

export const mttrMtbfComparisonRouter = router({
  // Get comparison data
  getComparison: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']),
      targetIds: z.array(z.number()).min(1).max(20),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      const data = await getComparisonData(
        input.targetType,
        input.targetIds,
        new Date(input.startDate),
        new Date(input.endDate)
      );
      return data;
    }),

  // Export to Excel
  exportExcel: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']),
      targetIds: z.array(z.number()).min(1).max(20),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = await exportComparisonToExcel(
        input.targetType,
        input.targetIds,
        new Date(input.startDate),
        new Date(input.endDate)
      );

      // Upload to S3
      const filename = `mttr-mtbf-comparison-${Date.now()}.xlsx`;
      const { url } = await storagePut(
        `reports/mttr-mtbf/${filename}`,
        buffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      return { url, filename };
    }),

  // Export to PDF
  exportPdf: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']),
      targetIds: z.array(z.number()).min(1).max(20),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input }) => {
      const buffer = await exportComparisonToPdf(
        input.targetType,
        input.targetIds,
        new Date(input.startDate),
        new Date(input.endDate)
      );

      // Upload to S3
      const filename = `mttr-mtbf-comparison-${Date.now()}.pdf`;
      const { url } = await storagePut(
        `reports/mttr-mtbf/${filename}`,
        buffer,
        'application/pdf'
      );

      return { url, filename };
    }),
});

export default mttrMtbfComparisonRouter;
