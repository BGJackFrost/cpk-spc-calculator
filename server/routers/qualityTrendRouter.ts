import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  qualityTrendReportConfigs, 
  qualityTrendReportHistory,
  spcAnalysisHistory,
  productionLines,
  workstations,
} from "../../drizzle/schema";
import { eq, desc, and, sql, gte, lte, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Report config input schema
const trendReportConfigInput = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  description: z.string().optional(),
  productionLineIds: z.array(z.number()).optional(),
  workstationIds: z.array(z.number()).optional(),
  productCodes: z.array(z.string()).optional(),
  periodType: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).default("weekly"),
  comparisonPeriods: z.number().min(2).max(12).default(4),
  includeCpk: z.boolean().default(true),
  includePpk: z.boolean().default(true),
  includeDefectRate: z.boolean().default(true),
  includeViolationCount: z.boolean().default(true),
  includeQualityScore: z.boolean().default(true),
  enableLineChart: z.boolean().default(true),
  enableBarChart: z.boolean().default(true),
  enablePieChart: z.boolean().default(true),
  enableHeatmap: z.boolean().default(false),
  scheduleEnabled: z.boolean().default(false),
  scheduleFrequency: z.enum(["daily", "weekly", "monthly"]).optional(),
  scheduleTime: z.string().optional(),
  scheduleDayOfWeek: z.number().min(0).max(6).optional(),
  scheduleDayOfMonth: z.number().min(1).max(31).optional(),
  emailRecipients: z.array(z.string().email()).optional(),
  webhookConfigIds: z.array(z.number()).optional(),
});

// Calculate period dates based on period type
function getPeriodDates(periodType: string, periodsBack: number = 0): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date;
  
  switch (periodType) {
    case "daily":
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - periodsBack);
      start = new Date(end);
      start.setDate(start.getDate() - 1);
      break;
    case "weekly":
      const dayOfWeek = now.getDay();
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - (periodsBack * 7));
      start = new Date(end);
      start.setDate(start.getDate() - 7);
      break;
    case "monthly":
      end = new Date(now.getFullYear(), now.getMonth() - periodsBack, 1);
      start = new Date(now.getFullYear(), now.getMonth() - periodsBack - 1, 1);
      break;
    case "quarterly":
      const quarter = Math.floor(now.getMonth() / 3);
      end = new Date(now.getFullYear(), (quarter - periodsBack) * 3, 1);
      start = new Date(now.getFullYear(), (quarter - periodsBack - 1) * 3, 1);
      break;
    case "yearly":
      end = new Date(now.getFullYear() - periodsBack, 0, 1);
      start = new Date(now.getFullYear() - periodsBack - 1, 0, 1);
      break;
    default:
      end = now;
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  
  return { start, end };
}

// Calculate trend direction
function calculateTrend(values: number[]): { trend: "improving" | "stable" | "declining"; percent: number } {
  if (values.length < 2) return { trend: "stable", percent: 0 };
  
  const first = values[0];
  const last = values[values.length - 1];
  
  if (first === 0) return { trend: last > 0 ? "improving" : "stable", percent: 0 };
  
  const percent = ((last - first) / first) * 100;
  
  if (Math.abs(percent) < 5) return { trend: "stable", percent };
  return { trend: percent > 0 ? "improving" : "declining", percent };
}

export const qualityTrendRouter = router({
  // Get all report configs for current user
  listConfigs: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const configs = await db
      .select()
      .from(qualityTrendReportConfigs)
      .where(eq(qualityTrendReportConfigs.userId, ctx.user.id))
      .orderBy(desc(qualityTrendReportConfigs.createdAt));
    return configs;
  }),

  // Get config by ID
  getConfigById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const [config] = await db
        .select()
        .from(qualityTrendReportConfigs)
        .where(eq(qualityTrendReportConfigs.id, input.id));
      
      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình báo cáo" });
      }
      
      if (config.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
      }
      
      return config;
    }),

  // Create new report config
  createConfig: protectedProcedure
    .input(trendReportConfigInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [result] = await db.insert(qualityTrendReportConfigs).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
        productionLineIds: input.productionLineIds ? JSON.stringify(input.productionLineIds) : null,
        workstationIds: input.workstationIds ? JSON.stringify(input.workstationIds) : null,
        productCodes: input.productCodes ? JSON.stringify(input.productCodes) : null,
        periodType: input.periodType,
        comparisonPeriods: input.comparisonPeriods,
        includeCpk: input.includeCpk ? 1 : 0,
        includePpk: input.includePpk ? 1 : 0,
        includeDefectRate: input.includeDefectRate ? 1 : 0,
        includeViolationCount: input.includeViolationCount ? 1 : 0,
        includeQualityScore: input.includeQualityScore ? 1 : 0,
        enableLineChart: input.enableLineChart ? 1 : 0,
        enableBarChart: input.enableBarChart ? 1 : 0,
        enablePieChart: input.enablePieChart ? 1 : 0,
        enableHeatmap: input.enableHeatmap ? 1 : 0,
        scheduleEnabled: input.scheduleEnabled ? 1 : 0,
        scheduleFrequency: input.scheduleFrequency || null,
        scheduleTime: input.scheduleTime || null,
        scheduleDayOfWeek: input.scheduleDayOfWeek ?? null,
        scheduleDayOfMonth: input.scheduleDayOfMonth ?? null,
        emailRecipients: input.emailRecipients ? JSON.stringify(input.emailRecipients) : null,
        webhookConfigIds: input.webhookConfigIds ? JSON.stringify(input.webhookConfigIds) : null,
      });
      
      return { success: true, id: result.insertId };
    }),

  // Update report config
  updateConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: trendReportConfigInput.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [existing] = await db
        .select()
        .from(qualityTrendReportConfigs)
        .where(eq(qualityTrendReportConfigs.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình báo cáo" });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền chỉnh sửa" });
      }
      
      const updateData: Record<string, unknown> = {};
      
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.description !== undefined) updateData.description = input.data.description;
      if (input.data.productionLineIds !== undefined) updateData.productionLineIds = JSON.stringify(input.data.productionLineIds);
      if (input.data.workstationIds !== undefined) updateData.workstationIds = JSON.stringify(input.data.workstationIds);
      if (input.data.productCodes !== undefined) updateData.productCodes = JSON.stringify(input.data.productCodes);
      if (input.data.periodType !== undefined) updateData.periodType = input.data.periodType;
      if (input.data.comparisonPeriods !== undefined) updateData.comparisonPeriods = input.data.comparisonPeriods;
      if (input.data.includeCpk !== undefined) updateData.includeCpk = input.data.includeCpk ? 1 : 0;
      if (input.data.includePpk !== undefined) updateData.includePpk = input.data.includePpk ? 1 : 0;
      if (input.data.includeDefectRate !== undefined) updateData.includeDefectRate = input.data.includeDefectRate ? 1 : 0;
      if (input.data.includeViolationCount !== undefined) updateData.includeViolationCount = input.data.includeViolationCount ? 1 : 0;
      if (input.data.includeQualityScore !== undefined) updateData.includeQualityScore = input.data.includeQualityScore ? 1 : 0;
      if (input.data.enableLineChart !== undefined) updateData.enableLineChart = input.data.enableLineChart ? 1 : 0;
      if (input.data.enableBarChart !== undefined) updateData.enableBarChart = input.data.enableBarChart ? 1 : 0;
      if (input.data.enablePieChart !== undefined) updateData.enablePieChart = input.data.enablePieChart ? 1 : 0;
      if (input.data.enableHeatmap !== undefined) updateData.enableHeatmap = input.data.enableHeatmap ? 1 : 0;
      if (input.data.scheduleEnabled !== undefined) updateData.scheduleEnabled = input.data.scheduleEnabled ? 1 : 0;
      if (input.data.scheduleFrequency !== undefined) updateData.scheduleFrequency = input.data.scheduleFrequency;
      if (input.data.scheduleTime !== undefined) updateData.scheduleTime = input.data.scheduleTime;
      if (input.data.scheduleDayOfWeek !== undefined) updateData.scheduleDayOfWeek = input.data.scheduleDayOfWeek;
      if (input.data.scheduleDayOfMonth !== undefined) updateData.scheduleDayOfMonth = input.data.scheduleDayOfMonth;
      if (input.data.emailRecipients !== undefined) updateData.emailRecipients = JSON.stringify(input.data.emailRecipients);
      if (input.data.webhookConfigIds !== undefined) updateData.webhookConfigIds = JSON.stringify(input.data.webhookConfigIds);
      
      await db
        .update(qualityTrendReportConfigs)
        .set(updateData)
        .where(eq(qualityTrendReportConfigs.id, input.id));
      
      return { success: true };
    }),

  // Delete report config
  deleteConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [existing] = await db
        .select()
        .from(qualityTrendReportConfigs)
        .where(eq(qualityTrendReportConfigs.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình báo cáo" });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền xóa" });
      }
      
      // Delete history first
      await db.delete(qualityTrendReportHistory).where(eq(qualityTrendReportHistory.configId, input.id));
      
      // Delete config
      await db.delete(qualityTrendReportConfigs).where(eq(qualityTrendReportConfigs.id, input.id));
      
      return { success: true };
    }),

  // Generate trend report
  generateReport: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      // Or use inline params
      productionLineIds: z.array(z.number()).optional(),
      workstationIds: z.array(z.number()).optional(),
      productCodes: z.array(z.string()).optional(),
      periodType: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).default("weekly"),
      comparisonPeriods: z.number().min(2).max(12).default(4),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      let config: typeof qualityTrendReportConfigs.$inferSelect | null = null;
      let productionLineIds: number[] = [];
      let workstationIds: number[] = [];
      let productCodes: string[] = [];
      let periodType = input.periodType;
      let comparisonPeriods = input.comparisonPeriods;
      
      if (input.configId) {
        const [foundConfig] = await db
          .select()
          .from(qualityTrendReportConfigs)
          .where(eq(qualityTrendReportConfigs.id, input.configId));
        
        if (!foundConfig) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình báo cáo" });
        }
        
        if (foundConfig.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
        }
        
        config = foundConfig;
        productionLineIds = config.productionLineIds ? JSON.parse(config.productionLineIds as string) : [];
        workstationIds = config.workstationIds ? JSON.parse(config.workstationIds as string) : [];
        productCodes = config.productCodes ? JSON.parse(config.productCodes as string) : [];
        periodType = config.periodType || "weekly";
        comparisonPeriods = config.comparisonPeriods || 4;
      } else {
        productionLineIds = input.productionLineIds || [];
        workstationIds = input.workstationIds || [];
        productCodes = input.productCodes || [];
      }
      
      // Collect data for each period
      const periodData: Array<{
        period: string;
        periodStart: Date;
        periodEnd: Date;
        avgCpk: number;
        avgPpk: number;
        totalSamples: number;
        totalViolations: number;
        defectRate: number;
      }> = [];
      
      for (let i = comparisonPeriods - 1; i >= 0; i--) {
        const { start, end } = getPeriodDates(periodType, i);
        
        // Build query conditions
        const conditions = [
          gte(spcAnalysisHistory.analyzedAt, start.toISOString()),
          lte(spcAnalysisHistory.analyzedAt, end.toISOString()),
        ];
        
        if (productionLineIds.length > 0) {
          conditions.push(inArray(spcAnalysisHistory.productionLineId, productionLineIds));
        }
        
        // Get aggregated data
        const [stats] = await db
          .select({
            avgCpk: sql<number>`avg(cpk)`,
            avgPpk: sql<number>`avg(ppk)`,
            totalSamples: sql<number>`sum(sample_count)`,
            totalViolations: sql<number>`sum(violations_count)`,
          })
          .from(spcAnalysisHistory)
          .where(and(...conditions));
        
        const totalSamples = stats?.totalSamples || 0;
        const totalViolations = stats?.totalViolations || 0;
        
        periodData.push({
          period: formatPeriodLabel(periodType, start),
          periodStart: start,
          periodEnd: end,
          avgCpk: stats?.avgCpk || 0,
          avgPpk: stats?.avgPpk || 0,
          totalSamples,
          totalViolations,
          defectRate: totalSamples > 0 ? (totalViolations / totalSamples) * 100 : 0,
        });
      }
      
      // Calculate trends
      const cpkValues = periodData.map(p => p.avgCpk);
      const defectValues = periodData.map(p => p.defectRate);
      
      const cpkTrend = calculateTrend(cpkValues);
      const defectTrend = calculateTrend(defectValues.map(v => -v)); // Invert for defect (lower is better)
      
      // Get production line comparison data
      const lineComparison: Array<{ lineId: number; lineName: string; avgCpk: number; avgPpk: number; totalViolations: number }> = [];
      
      if (productionLineIds.length > 0) {
        const { start, end } = getPeriodDates(periodType, 0);
        
        for (const lineId of productionLineIds) {
          const [lineStats] = await db
            .select({
              avgCpk: sql<number>`avg(cpk)`,
              avgPpk: sql<number>`avg(ppk)`,
              totalViolations: sql<number>`sum(violations_count)`,
            })
            .from(spcAnalysisHistory)
            .where(and(
              eq(spcAnalysisHistory.productionLineId, lineId),
              gte(spcAnalysisHistory.analyzedAt, start.toISOString()),
              lte(spcAnalysisHistory.analyzedAt, end.toISOString()),
            ));
          
          const [line] = await db
            .select()
            .from(productionLines)
            .where(eq(productionLines.id, lineId));
          
          lineComparison.push({
            lineId,
            lineName: line?.name || `Line ${lineId}`,
            avgCpk: lineStats?.avgCpk || 0,
            avgPpk: lineStats?.avgPpk || 0,
            totalViolations: lineStats?.totalViolations || 0,
          });
        }
      }
      
      // Get violation type distribution
      const { start: currentStart, end: currentEnd } = getPeriodDates(periodType, 0);
      
      const violationDistribution = await db
        .select({
          violationType: spcAnalysisHistory.violationType,
          count: sql<number>`count(*)`,
        })
        .from(spcAnalysisHistory)
        .where(and(
          gte(spcAnalysisHistory.analyzedAt, currentStart.toISOString()),
          lte(spcAnalysisHistory.analyzedAt, currentEnd.toISOString()),
          productionLineIds.length > 0 ? inArray(spcAnalysisHistory.productionLineId, productionLineIds) : undefined,
        ))
        .groupBy(spcAnalysisHistory.violationType);
      
      // Calculate summary
      const latestPeriod = periodData[periodData.length - 1];
      const previousPeriod = periodData[periodData.length - 2];
      
      return {
        config,
        periodType,
        comparisonPeriods,
        generatedAt: new Date().toISOString(),
        
        // Time series data for charts
        periodData,
        
        // Trend analysis
        trends: {
          cpk: cpkTrend,
          defect: defectTrend,
        },
        
        // Line comparison for bar chart
        lineComparison,
        
        // Violation distribution for pie chart
        violationDistribution,
        
        // Summary
        summary: {
          currentPeriod: latestPeriod?.period || "N/A",
          avgCpk: latestPeriod?.avgCpk || 0,
          avgPpk: latestPeriod?.avgPpk || 0,
          totalSamples: latestPeriod?.totalSamples || 0,
          totalViolations: latestPeriod?.totalViolations || 0,
          defectRate: latestPeriod?.defectRate || 0,
          cpkChange: previousPeriod && latestPeriod 
            ? ((latestPeriod.avgCpk - previousPeriod.avgCpk) / (previousPeriod.avgCpk || 1)) * 100 
            : 0,
          defectRateChange: previousPeriod && latestPeriod
            ? ((latestPeriod.defectRate - previousPeriod.defectRate) / (previousPeriod.defectRate || 1)) * 100
            : 0,
        },
      };
    }),

  // Get report history
  getHistory: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      let conditions = [];
      
      if (input.configId) {
        const [config] = await db
          .select()
          .from(qualityTrendReportConfigs)
          .where(eq(qualityTrendReportConfigs.id, input.configId));
        
        if (config && config.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
        }
        
        conditions.push(eq(qualityTrendReportHistory.configId, input.configId));
      }
      
      const history = await db
        .select()
        .from(qualityTrendReportHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(qualityTrendReportHistory.generatedAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return history;
    }),
});

// Helper function to format period label
function formatPeriodLabel(periodType: string, date: Date): string {
  const options: Intl.DateTimeFormatOptions = { timeZone: "Asia/Ho_Chi_Minh" };
  
  switch (periodType) {
    case "daily":
      return date.toLocaleDateString("vi-VN", { ...options, day: "2-digit", month: "2-digit" });
    case "weekly":
      return `Tuần ${getWeekNumber(date)}`;
    case "monthly":
      return date.toLocaleDateString("vi-VN", { ...options, month: "short", year: "numeric" });
    case "quarterly":
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter}/${date.getFullYear()}`;
    case "yearly":
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString("vi-VN");
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
