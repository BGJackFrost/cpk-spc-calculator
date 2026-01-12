/**
 * Pareto Chart Router - API endpoints cho biểu đồ Pareto
 * Hiển thị top defects theo tần suất, hỗ trợ phân tích 80/20
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { 
  spcDefectRecords,
  spcDefectCategories,
  productionLines,
} from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { 
  generateParetoPdfHtml, 
  generateParetoExcelBuffer,
  type ParetoExportData 
} from '../services/widgetExportService';

const PARETO_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6',
];

// Helper function to get Pareto data
async function getParetoData(input: { days: number; productionLineId?: number; limit: number }) {
  const db = await getDb();
  if (!db) return { data: [], summary: null, productionLineName: undefined };

  try {
    const endDate = new Date();
    const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const conditions: any[] = [
      gte(spcDefectRecords.occurredAt, startDate.toISOString()),
      lte(spcDefectRecords.occurredAt, endDate.toISOString()),
    ];

    let productionLineName: string | undefined;
    if (input.productionLineId) {
      conditions.push(eq(spcDefectRecords.productionLineId, input.productionLineId));
      // Get production line name
      const line = await db.select({ name: productionLines.name })
        .from(productionLines)
        .where(eq(productionLines.id, input.productionLineId))
        .limit(1);
      productionLineName = line[0]?.name;
    }

    // Get defect counts by category
    const defectData = await db.select({
      categoryId: spcDefectRecords.defectCategoryId,
      categoryName: spcDefectCategories.name,
      count: sql<number>`COUNT(*)`,
      totalQuantity: sql<number>`SUM(${spcDefectRecords.quantity})`,
    })
    .from(spcDefectRecords)
    .leftJoin(spcDefectCategories, eq(spcDefectRecords.defectCategoryId, spcDefectCategories.id))
    .where(and(...conditions))
    .groupBy(spcDefectRecords.defectCategoryId, spcDefectCategories.name)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(input.limit);

    // Calculate totals and percentages
    const totalDefects = defectData.reduce((sum, d) => sum + Number(d.count), 0);
    let cumulativeCount = 0;

    const paretoData = defectData.map((d, index) => {
      const count = Number(d.count) || 0;
      const percentage = totalDefects > 0 ? (count / totalDefects) * 100 : 0;
      cumulativeCount += count;
      const cumulativePercentage = totalDefects > 0 ? (cumulativeCount / totalDefects) * 100 : 0;

      return {
        categoryId: d.categoryId,
        categoryName: d.categoryName || `Category ${d.categoryId}`,
        count,
        totalQuantity: Number(d.totalQuantity) || 0,
        percentage: Math.round(percentage * 100) / 100,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        color: PARETO_COLORS[index % PARETO_COLORS.length],
        isIn80Percent: cumulativePercentage <= 80,
      };
    });

    // Find 80% cutoff point
    const cutoffIndex = paretoData.findIndex(d => d.cumulativePercentage > 80);
    const itemsIn80Percent = cutoffIndex === -1 ? paretoData.length : cutoffIndex + 1;

    return {
      data: paretoData,
      summary: {
        totalDefects,
        totalCategories: paretoData.length,
        itemsIn80Percent,
        percentageOfCategories: paretoData.length > 0 
          ? Math.round((itemsIn80Percent / paretoData.length) * 10000) / 100 
          : 0,
        periodDays: input.days,
        lastUpdated: new Date().toISOString(),
      },
      productionLineName,
    };
  } catch (error) {
    console.error('Error fetching Pareto data:', error);
    return { data: [], summary: null, productionLineName: undefined };
  }
}

export const paretoChartRouter = router({
  // Get defect data for Pareto chart
  getDefectPareto: protectedProcedure
    .input(z.object({
      days: z.number().default(30),
      productionLineId: z.number().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const result = await getParetoData(input);
      return {
        data: result.data,
        summary: result.summary,
      };
    }),

  // Get dashboard summary for Pareto widget
  getDashboardSummary: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const endDate = new Date();
        const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

        const currentData = await db.select({
          count: sql<number>`COUNT(*)`,
          totalQuantity: sql<number>`SUM(${spcDefectRecords.quantity})`,
        })
        .from(spcDefectRecords)
        .where(
          and(
            gte(spcDefectRecords.occurredAt, startDate.toISOString()),
            lte(spcDefectRecords.occurredAt, endDate.toISOString()),
          )
        );

        const topCategory = await db.select({
          categoryName: spcDefectCategories.name,
          count: sql<number>`COUNT(*)`,
        })
        .from(spcDefectRecords)
        .leftJoin(spcDefectCategories, eq(spcDefectRecords.defectCategoryId, spcDefectCategories.id))
        .where(
          and(
            gte(spcDefectRecords.occurredAt, startDate.toISOString()),
            lte(spcDefectRecords.occurredAt, endDate.toISOString()),
          )
        )
        .groupBy(spcDefectCategories.name)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(1);

        return {
          currentCount: Number(currentData[0]?.count) || 0,
          topCategory: topCategory[0]?.categoryName || 'N/A',
          topCategoryCount: Number(topCategory[0]?.count) || 0,
          periodDays: input.days,
        };
      } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        return null;
      }
    }),

  // Export Pareto to PDF (returns HTML for client-side PDF generation)
  exportPdf: protectedProcedure
    .input(z.object({
      days: z.number().default(30),
      productionLineId: z.number().optional(),
      limit: z.number().default(10),
    }))
    .mutation(async ({ input }) => {
      const result = await getParetoData(input);
      
      const exportData: ParetoExportData = {
        data: result.data,
        summary: result.summary,
        filters: {
          productionLineId: input.productionLineId,
          productionLineName: result.productionLineName,
        },
      };

      const html = generateParetoPdfHtml(exportData);
      return { html, filename: `pareto-chart-${new Date().toISOString().split('T')[0]}.pdf` };
    }),

  // Export Pareto to Excel
  exportExcel: protectedProcedure
    .input(z.object({
      days: z.number().default(30),
      productionLineId: z.number().optional(),
      limit: z.number().default(10),
    }))
    .mutation(async ({ input }) => {
      const result = await getParetoData(input);
      
      const exportData: ParetoExportData = {
        data: result.data,
        summary: result.summary,
        filters: {
          productionLineId: input.productionLineId,
          productionLineName: result.productionLineName,
        },
      };

      const buffer = await generateParetoExcelBuffer(exportData);
      const base64 = buffer.toString('base64');
      return { 
        base64, 
        filename: `pareto-chart-${new Date().toISOString().split('T')[0]}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }),
});
