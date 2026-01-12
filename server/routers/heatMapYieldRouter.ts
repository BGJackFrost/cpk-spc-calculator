/**
 * Heat Map Yield Router - API endpoints cho bản đồ nhiệt yield rate
 * Hiển thị yield rate theo vùng nhà xưởng trên Floor Plan
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { 
  productionLines,
  workstations,
  spcAnalysisHistory,
} from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { 
  generateHeatMapPdfHtml, 
  generateHeatMapExcelBuffer,
  type HeatMapExportData 
} from '../services/widgetExportService';

// Yield rate color thresholds
const YIELD_COLORS = {
  excellent: { min: 98, color: '#22c55e', label: 'Xuất sắc' },
  good: { min: 95, color: '#84cc16', label: 'Tốt' },
  warning: { min: 90, color: '#eab308', label: 'Cảnh báo' },
  concern: { min: 85, color: '#f97316', label: 'Quan ngại' },
  critical: { min: 0, color: '#ef4444', label: 'Nghiêm trọng' },
};

// Helper functions
function getYieldColor(yieldRate: number): string {
  if (yieldRate >= 98) return YIELD_COLORS.excellent.color;
  if (yieldRate >= 95) return YIELD_COLORS.good.color;
  if (yieldRate >= 90) return YIELD_COLORS.warning.color;
  if (yieldRate >= 85) return YIELD_COLORS.concern.color;
  return YIELD_COLORS.critical.color;
}

function getYieldStatus(yieldRate: number): string {
  if (yieldRate >= 98) return YIELD_COLORS.excellent.label;
  if (yieldRate >= 95) return YIELD_COLORS.good.label;
  if (yieldRate >= 90) return YIELD_COLORS.warning.label;
  if (yieldRate >= 85) return YIELD_COLORS.concern.label;
  return YIELD_COLORS.critical.label;
}

// Helper function to get heat map data
async function getHeatMapData(input: { days: number; productionLineId?: number }) {
  const db = await getDb();
  if (!db) return { zones: [], summary: null, productionLineName: undefined };

  try {
    const endDate = new Date();
    const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    // Get production lines
    let linesQuery = db.select({
      id: productionLines.id,
      name: productionLines.name,
      location: productionLines.location,
      status: productionLines.status,
    }).from(productionLines);

    let productionLineName: string | undefined;
    if (input.productionLineId) {
      linesQuery = linesQuery.where(eq(productionLines.id, input.productionLineId)) as any;
    }

    const lines = await linesQuery;
    
    if (input.productionLineId && lines.length > 0) {
      productionLineName = lines[0].name;
    }

    // Get yield data for each line
    const zonesData = await Promise.all(lines.map(async (line) => {
      // Get workstations for this line
      const lineWorkstations = await db.select()
        .from(workstations)
        .where(eq(workstations.productionLineId, line.id));

      // Get SPC analysis data for yield calculation
      const analysisData = await db.select({
        totalSamples: sql<number>`COUNT(*)`,
        avgCpk: sql<number>`AVG(${spcAnalysisHistory.cpk})`,
        passCount: sql<number>`SUM(CASE WHEN ${spcAnalysisHistory.cpk} >= 1.33 THEN 1 ELSE 0 END)`,
      })
      .from(spcAnalysisHistory)
      .where(
        and(
          eq(spcAnalysisHistory.productionLineId, line.id),
          gte(spcAnalysisHistory.createdAt, startDate.toISOString()),
          lte(spcAnalysisHistory.createdAt, endDate.toISOString()),
        )
      );

      const stats = analysisData[0];
      const totalSamples = Number(stats?.totalSamples) || 0;
      const passCount = Number(stats?.passCount) || 0;
      const yieldRate = totalSamples > 0 ? (passCount / totalSamples) * 100 : 0;
      const avgCpk = Number(stats?.avgCpk) || 0;

      return {
        id: line.id,
        name: line.name,
        location: line.location || `Zone ${line.id}`,
        status: line.status,
        workstationCount: lineWorkstations.length,
        yieldRate: Math.round(yieldRate * 100) / 100,
        avgCpk: Math.round(avgCpk * 1000) / 1000,
        totalSamples,
        passCount,
        color: getYieldColor(yieldRate),
        statusLabel: getYieldStatus(yieldRate),
        position: {
          x: (line.id % 4) * 25 + 5,
          y: Math.floor(line.id / 4) * 30 + 10,
          width: 20,
          height: 25,
        },
      };
    }));

    // Calculate summary
    const totalYield = zonesData.length > 0 
      ? zonesData.reduce((sum, z) => sum + z.yieldRate, 0) / zonesData.length 
      : 0;
    const problemZones = zonesData.filter(z => z.yieldRate < 90);
    const excellentZones = zonesData.filter(z => z.yieldRate >= 98);

    return {
      zones: zonesData,
      summary: {
        totalZones: zonesData.length,
        averageYield: Math.round(totalYield * 100) / 100,
        problemZones: problemZones.length,
        excellentZones: excellentZones.length,
        periodDays: input.days,
        lastUpdated: new Date().toISOString(),
      },
      productionLineName,
    };
  } catch (error) {
    console.error('Error fetching floor plan yield data:', error);
    return { zones: [], summary: null, productionLineName: undefined };
  }
}

export const heatMapYieldRouter = router({
  // Get yield data for floor plan heat map
  getFloorPlanYield: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const result = await getHeatMapData(input);
      return {
        zones: result.zones,
        summary: result.summary,
      };
    }),

  // Get top problem zones
  getTopProblemZones: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
      limit: z.number().default(5),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const endDate = new Date();
        const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

        const problemZones = await db.select({
          productionLineId: spcAnalysisHistory.productionLineId,
          lineName: productionLines.name,
          totalSamples: sql<number>`COUNT(*)`,
          failCount: sql<number>`SUM(CASE WHEN ${spcAnalysisHistory.cpk} < 1.33 THEN 1 ELSE 0 END)`,
          avgCpk: sql<number>`AVG(${spcAnalysisHistory.cpk})`,
        })
        .from(spcAnalysisHistory)
        .leftJoin(productionLines, eq(spcAnalysisHistory.productionLineId, productionLines.id))
        .where(
          and(
            gte(spcAnalysisHistory.createdAt, startDate.toISOString()),
            lte(spcAnalysisHistory.createdAt, endDate.toISOString()),
          )
        )
        .groupBy(spcAnalysisHistory.productionLineId, productionLines.name)
        .orderBy(desc(sql`SUM(CASE WHEN ${spcAnalysisHistory.cpk} < 1.33 THEN 1 ELSE 0 END)`))
        .limit(input.limit);

        return problemZones.map(zone => ({
          productionLineId: zone.productionLineId,
          lineName: zone.lineName || 'Unknown',
          totalSamples: Number(zone.totalSamples) || 0,
          failCount: Number(zone.failCount) || 0,
          avgCpk: Math.round((Number(zone.avgCpk) || 0) * 1000) / 1000,
          failRate: zone.totalSamples ? Math.round((Number(zone.failCount) / Number(zone.totalSamples)) * 10000) / 100 : 0,
        }));
      } catch (error) {
        console.error('Error fetching problem zones:', error);
        return [];
      }
    }),

  // Get yield trend over time
  getYieldTrend: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const endDate = new Date();
        const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

        const conditions: any[] = [
          gte(spcAnalysisHistory.createdAt, startDate.toISOString()),
          lte(spcAnalysisHistory.createdAt, endDate.toISOString()),
        ];

        if (input.productionLineId) {
          conditions.push(eq(spcAnalysisHistory.productionLineId, input.productionLineId));
        }

        const trendData = await db.select({
          date: sql<string>`DATE(${spcAnalysisHistory.createdAt})`,
          totalSamples: sql<number>`COUNT(*)`,
          passCount: sql<number>`SUM(CASE WHEN ${spcAnalysisHistory.cpk} >= 1.33 THEN 1 ELSE 0 END)`,
          avgCpk: sql<number>`AVG(${spcAnalysisHistory.cpk})`,
        })
        .from(spcAnalysisHistory)
        .where(and(...conditions))
        .groupBy(sql`DATE(${spcAnalysisHistory.createdAt})`)
        .orderBy(sql`DATE(${spcAnalysisHistory.createdAt})`);

        return trendData.map(d => ({
          date: d.date,
          yieldRate: d.totalSamples ? Math.round((Number(d.passCount) / Number(d.totalSamples)) * 10000) / 100 : 0,
          avgCpk: Math.round((Number(d.avgCpk) || 0) * 1000) / 1000,
          totalSamples: Number(d.totalSamples) || 0,
        }));
      } catch (error) {
        console.error('Error fetching yield trend:', error);
        return [];
      }
    }),

  // Export Heat Map to PDF (returns HTML for client-side PDF generation)
  exportPdf: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
      productionLineId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await getHeatMapData(input);
      
      const exportData: HeatMapExportData = {
        zones: result.zones,
        summary: result.summary,
        filters: {
          productionLineId: input.productionLineId,
          productionLineName: result.productionLineName,
        },
      };

      const html = generateHeatMapPdfHtml(exportData);
      return { html, filename: `heat-map-yield-${new Date().toISOString().split('T')[0]}.pdf` };
    }),

  // Export Heat Map to Excel
  exportExcel: protectedProcedure
    .input(z.object({
      days: z.number().default(7),
      productionLineId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await getHeatMapData(input);
      
      const exportData: HeatMapExportData = {
        zones: result.zones,
        summary: result.summary,
        filters: {
          productionLineId: input.productionLineId,
          productionLineName: result.productionLineName,
        },
      };

      const buffer = await generateHeatMapExcelBuffer(exportData);
      const base64 = buffer.toString('base64');
      return { 
        base64, 
        filename: `heat-map-yield-${new Date().toISOString().split('T')[0]}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }),
});
