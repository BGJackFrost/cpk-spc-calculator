import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  qualityStatisticsReports, 
  snImages, 
  productionLines, 
  products,
  spcAnalysisHistory 
} from "../../drizzle/schema";
import { eq, desc, and, sql, gte, lte, between } from "drizzle-orm";

// Helper to calculate standard deviation
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// Helper to get date range for period
function getPeriodDateRange(periodType: string, date: Date): { start: Date; end: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (periodType) {
    case "daily":
      return {
        start: new Date(year, month, day, 0, 0, 0),
        end: new Date(year, month, day, 23, 59, 59),
      };
    case "weekly":
      const dayOfWeek = date.getDay();
      const startOfWeek = new Date(year, month, day - dayOfWeek);
      const endOfWeek = new Date(year, month, day + (6 - dayOfWeek), 23, 59, 59);
      return { start: startOfWeek, end: endOfWeek };
    case "monthly":
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0, 23, 59, 59),
      };
    case "quarterly":
      const quarter = Math.floor(month / 3);
      return {
        start: new Date(year, quarter * 3, 1),
        end: new Date(year, (quarter + 1) * 3, 0, 23, 59, 59),
      };
    case "yearly":
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59),
      };
    default:
      return {
        start: new Date(year, month, day, 0, 0, 0),
        end: new Date(year, month, day, 23, 59, 59),
      };
  }
}

export const qualityStatisticsRouter = router({
  // Get quality statistics for a period
  getStatistics: protectedProcedure
    .input(z.object({
      periodType: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).default("daily"),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      productId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];

      // Date range
      if (input.startDate) {
        conditions.push(gte(snImages.capturedAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(snImages.capturedAt, input.endDate));
      }
      if (input.productionLineId) {
        conditions.push(eq(snImages.productionLineId, input.productionLineId));
      }
      if (input.workstationId) {
        conditions.push(eq(snImages.workstationId, input.workstationId));
      }
      if (input.productId) {
        conditions.push(eq(snImages.productId, input.productId));
      }

      let query = db.select().from(snImages);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const images = await query;

      // Calculate statistics
      const totalSamples = images.length;
      const okCount = images.filter(i => i.analysisResult === "ok").length;
      const ngCount = images.filter(i => i.analysisResult === "ng").length;
      const warningCount = images.filter(i => i.analysisResult === "warning").length;

      const qualityScores = images
        .filter(i => i.qualityScore)
        .map(i => parseFloat(i.qualityScore!));

      const avgQualityScore = qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0;
      const minQualityScore = qualityScores.length > 0 ? Math.min(...qualityScores) : 0;
      const maxQualityScore = qualityScores.length > 0 ? Math.max(...qualityScores) : 0;
      const stdDevQualityScore = calculateStdDev(qualityScores);

      // Calculate defects by type
      const defectsByType: Record<string, number> = {};
      images.forEach(img => {
        if (img.defectLocations && Array.isArray(img.defectLocations)) {
          (img.defectLocations as any[]).forEach(defect => {
            const type = defect.type || "unknown";
            defectsByType[type] = (defectsByType[type] || 0) + 1;
          });
        }
      });

      // Get top defect types
      const topDefectTypes = Object.entries(defectsByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      return {
        totalSamples,
        okCount,
        ngCount,
        warningCount,
        okRate: totalSamples > 0 ? (okCount / totalSamples) * 100 : 0,
        ngRate: totalSamples > 0 ? (ngCount / totalSamples) * 100 : 0,
        avgQualityScore,
        minQualityScore,
        maxQualityScore,
        stdDevQualityScore,
        totalDefects: images.reduce((sum, i) => sum + (i.defectsFound || 0), 0),
        defectsByType,
        topDefectTypes,
      };
    }),

  // Get trend data for charts
  getTrendData: protectedProcedure
    .input(z.object({
      periodType: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      periods: z.number().min(1).max(365).default(30),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      productId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const now = new Date();
      const trendData: Array<{
        date: string;
        totalSamples: number;
        okCount: number;
        ngCount: number;
        okRate: number;
        avgQualityScore: number;
      }> = [];

      // Calculate data for each period
      for (let i = input.periods - 1; i >= 0; i--) {
        let periodDate: Date;
        let dateLabel: string;

        switch (input.periodType) {
          case "daily":
            periodDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dateLabel = periodDate.toLocaleDateString("vi-VN");
            break;
          case "weekly":
            periodDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            dateLabel = `Tuần ${Math.ceil(periodDate.getDate() / 7)}/${periodDate.getMonth() + 1}`;
            break;
          case "monthly":
            periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            dateLabel = `${periodDate.getMonth() + 1}/${periodDate.getFullYear()}`;
            break;
          default:
            periodDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dateLabel = periodDate.toLocaleDateString("vi-VN");
        }

        const { start, end } = getPeriodDateRange(input.periodType, periodDate);
        const conditions = [
          gte(snImages.capturedAt, start.toISOString()),
          lte(snImages.capturedAt, end.toISOString()),
        ];

        if (input.productionLineId) {
          conditions.push(eq(snImages.productionLineId, input.productionLineId));
        }
        if (input.workstationId) {
          conditions.push(eq(snImages.workstationId, input.workstationId));
        }
        if (input.productId) {
          conditions.push(eq(snImages.productId, input.productId));
        }

        const images = await db.select()
          .from(snImages)
          .where(and(...conditions));

        const totalSamples = images.length;
        const okCount = images.filter(i => i.analysisResult === "ok").length;
        const ngCount = images.filter(i => i.analysisResult === "ng").length;
        const qualityScores = images
          .filter(i => i.qualityScore)
          .map(i => parseFloat(i.qualityScore!));

        trendData.push({
          date: dateLabel,
          totalSamples,
          okCount,
          ngCount,
          okRate: totalSamples > 0 ? (okCount / totalSamples) * 100 : 0,
          avgQualityScore: qualityScores.length > 0
            ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
            : 0,
        });
      }

      return trendData;
    }),

  // Get comparison data between production lines
  getLineComparison: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      productId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Get all production lines
      const lines = await db.select().from(productionLines);
      
      const comparisonData = await Promise.all(
        lines.map(async (line) => {
          const conditions = [eq(snImages.productionLineId, line.id)];
          
          if (input?.startDate) {
            conditions.push(gte(snImages.capturedAt, input.startDate));
          }
          if (input?.endDate) {
            conditions.push(lte(snImages.capturedAt, input.endDate));
          }
          if (input?.productId) {
            conditions.push(eq(snImages.productId, input.productId));
          }

          const images = await db.select()
            .from(snImages)
            .where(and(...conditions));

          const totalSamples = images.length;
          const okCount = images.filter(i => i.analysisResult === "ok").length;
          const ngCount = images.filter(i => i.analysisResult === "ng").length;
          const qualityScores = images
            .filter(i => i.qualityScore)
            .map(i => parseFloat(i.qualityScore!));

          return {
            lineId: line.id,
            lineName: line.name,
            totalSamples,
            okCount,
            ngCount,
            okRate: totalSamples > 0 ? (okCount / totalSamples) * 100 : 0,
            avgQualityScore: qualityScores.length > 0
              ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
              : 0,
          };
        })
      );

      return comparisonData.filter(d => d.totalSamples > 0);
    }),

  // Get comparison data between products
  getProductComparison: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Get all products
      const productList = await db.select().from(products);
      
      const comparisonData = await Promise.all(
        productList.map(async (product) => {
          const conditions = [eq(snImages.productId, product.id)];
          
          if (input?.startDate) {
            conditions.push(gte(snImages.capturedAt, input.startDate));
          }
          if (input?.endDate) {
            conditions.push(lte(snImages.capturedAt, input.endDate));
          }
          if (input?.productionLineId) {
            conditions.push(eq(snImages.productionLineId, input.productionLineId));
          }

          const images = await db.select()
            .from(snImages)
            .where(and(...conditions));

          const totalSamples = images.length;
          const okCount = images.filter(i => i.analysisResult === "ok").length;
          const ngCount = images.filter(i => i.analysisResult === "ng").length;
          const qualityScores = images
            .filter(i => i.qualityScore)
            .map(i => parseFloat(i.qualityScore!));

          return {
            productId: product.id,
            productName: product.name,
            productCode: product.code,
            totalSamples,
            okCount,
            ngCount,
            okRate: totalSamples > 0 ? (okCount / totalSamples) * 100 : 0,
            avgQualityScore: qualityScores.length > 0
              ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
              : 0,
          };
        })
      );

      return comparisonData.filter(d => d.totalSamples > 0);
    }),

  // Get defect distribution
  getDefectDistribution: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      productionLineId: z.number().optional(),
      productId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];

      if (input?.startDate) {
        conditions.push(gte(snImages.capturedAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(snImages.capturedAt, input.endDate));
      }
      if (input?.productionLineId) {
        conditions.push(eq(snImages.productionLineId, input.productionLineId));
      }
      if (input?.productId) {
        conditions.push(eq(snImages.productId, input.productId));
      }

      let query = db.select().from(snImages);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const images = await query;

      // Calculate defects by type
      const defectsByType: Record<string, number> = {};
      images.forEach(img => {
        if (img.defectLocations && Array.isArray(img.defectLocations)) {
          (img.defectLocations as any[]).forEach(defect => {
            const type = defect.type || "unknown";
            defectsByType[type] = (defectsByType[type] || 0) + 1;
          });
        }
      });

      // Convert to array for pie chart
      const distribution = Object.entries(defectsByType)
        .map(([type, count]) => ({
          type,
          count,
          percentage: 0,
        }));

      const total = distribution.reduce((sum, d) => sum + d.count, 0);
      distribution.forEach(d => {
        d.percentage = total > 0 ? (d.count / total) * 100 : 0;
      });

      return distribution.sort((a, b) => b.count - a.count);
    }),

  // Get CPK trend from SPC analysis history
  getCpkTrend: protectedProcedure
    .input(z.object({
      periodType: z.enum(["daily", "weekly", "monthly"]).default("daily"),
      periods: z.number().min(1).max(365).default(30),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const now = new Date();
      const trendData: Array<{
        date: string;
        avgCpk: number;
        minCpk: number;
        maxCpk: number;
        sampleCount: number;
      }> = [];

      for (let i = input.periods - 1; i >= 0; i--) {
        let periodDate: Date;
        let dateLabel: string;

        switch (input.periodType) {
          case "daily":
            periodDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dateLabel = periodDate.toLocaleDateString("vi-VN");
            break;
          case "weekly":
            periodDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            dateLabel = `Tuần ${Math.ceil(periodDate.getDate() / 7)}/${periodDate.getMonth() + 1}`;
            break;
          case "monthly":
            periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            dateLabel = `${periodDate.getMonth() + 1}/${periodDate.getFullYear()}`;
            break;
          default:
            periodDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            dateLabel = periodDate.toLocaleDateString("vi-VN");
        }

        const { start, end } = getPeriodDateRange(input.periodType, periodDate);
        const conditions = [
          gte(spcAnalysisHistory.createdAt, start.toISOString()),
          lte(spcAnalysisHistory.createdAt, end.toISOString()),
        ];

        // Note: spcAnalysisHistory doesn't have productionLineId/workstationId columns
        // Filter by mappingId if needed in future

        const analyses = await db.select()
          .from(spcAnalysisHistory)
          .where(and(...conditions));

        const cpkValues = analyses
          .filter(a => a.cpk)
          .map(a => parseFloat(a.cpk!));

        trendData.push({
          date: dateLabel,
          avgCpk: cpkValues.length > 0
            ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length
            : 0,
          minCpk: cpkValues.length > 0 ? Math.min(...cpkValues) : 0,
          maxCpk: cpkValues.length > 0 ? Math.max(...cpkValues) : 0,
          sampleCount: analyses.length,
        });
      }

      return trendData;
    }),
});
