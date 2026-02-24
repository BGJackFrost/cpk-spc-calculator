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

  // Export report to PDF
  exportPdf: protectedProcedure
    .input(z.object({
      configId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Get config
      const [config] = await db
        .select()
        .from(qualityTrendReportConfigs)
        .where(eq(qualityTrendReportConfigs.id, input.configId));
      
      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình báo cáo" });
      }
      
      if (config.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
      }
      
      const periodType = config.periodType || "weekly";
      const comparisonPeriods = config.comparisonPeriods || 4;
      
      // Collect period data
      const periodData: Array<{
        period: string;
        avgCpk: number;
        avgPpk: number;
        totalSamples: number;
        totalViolations: number;
        defectRate: number;
      }> = [];
      
      for (let i = comparisonPeriods - 1; i >= 0; i--) {
        const { start, end } = getPeriodDates(periodType, i);
        
        const [stats] = await db
          .select({
            avgCpk: sql<number>`AVG(${spcAnalysisHistory.cpk})`,
            avgPpk: sql<number>`AVG(${spcAnalysisHistory.ppk})`,
            totalSamples: sql<number>`SUM(${spcAnalysisHistory.sampleSize})`,
            totalViolations: sql<number>`SUM(${spcAnalysisHistory.violationCount})`,
          })
          .from(spcAnalysisHistory)
          .where(and(
            gte(spcAnalysisHistory.analyzedAt, start),
            lte(spcAnalysisHistory.analyzedAt, end)
          ));
        
        periodData.push({
          period: formatPeriodLabel(periodType, end),
          avgCpk: Number(stats?.avgCpk || 0),
          avgPpk: Number(stats?.avgPpk || 0),
          totalSamples: Number(stats?.totalSamples || 0),
          totalViolations: Number(stats?.totalViolations || 0),
          defectRate: stats?.totalSamples ? (Number(stats.totalViolations) / Number(stats.totalSamples)) * 100 : 0,
        });
      }
      
      // Generate HTML content for PDF
      const htmlContent = generateQualityTrendPdfContent({
        config,
        periodType,
        comparisonPeriods,
        periodData,
        generatedAt: new Date().toISOString(),
        generatedBy: ctx.user.name || ctx.user.email || "Unknown",
      });
      
      return {
        success: true,
        htmlContent,
        filename: `quality-trend-report-${config.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`,
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

// Generate HTML content for PDF export
function generateQualityTrendPdfContent(data: {
  config: any;
  periodType: string;
  comparisonPeriods: number;
  periodData: Array<{
    period: string;
    avgCpk: number;
    avgPpk: number;
    totalSamples: number;
    totalViolations: number;
    defectRate: number;
  }>;
  generatedAt: string;
  generatedBy: string;
}): string {
  const { config, periodType, comparisonPeriods, periodData, generatedAt, generatedBy } = data;
  
  const periodTypeLabels: Record<string, string> = {
    daily: "Ngày",
    weekly: "Tuần",
    monthly: "Tháng",
    quarterly: "Quý",
    yearly: "Năm",
  };
  
  // Calculate trends
  const latestPeriod = periodData[periodData.length - 1];
  const previousPeriod = periodData[periodData.length - 2];
  const cpkChange = previousPeriod && latestPeriod 
    ? ((latestPeriod.avgCpk - previousPeriod.avgCpk) / (previousPeriod.avgCpk || 1)) * 100 
    : 0;
  const defectRateChange = previousPeriod && latestPeriod
    ? latestPeriod.defectRate - previousPeriod.defectRate
    : 0;
  
  const getCpkStatus = (cpk: number) => {
    if (cpk >= 1.67) return { text: "Xuất sắc", color: "#22c55e" };
    if (cpk >= 1.33) return { text: "Tốt", color: "#3b82f6" };
    if (cpk >= 1.0) return { text: "Đạt", color: "#f59e0b" };
    return { text: "Cần cải thiện", color: "#ef4444" };
  };
  
  const cpkStatus = getCpkStatus(latestPeriod?.avgCpk || 0);
  
  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo Xu hướng Chất lượng - ${config.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #1f2937;
      background: #f9fafb;
      padding: 20px;
    }
    .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 24px; color: #111827; margin-bottom: 8px; }
    .header .subtitle { color: #6b7280; font-size: 14px; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 30px; padding: 15px; background: #f3f4f6; border-radius: 6px; }
    .meta-item { text-align: center; }
    .meta-item .label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .meta-item .value { font-size: 16px; font-weight: 600; color: #111827; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
    .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card .value { font-size: 28px; font-weight: 700; }
    .summary-card .label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .summary-card .change { font-size: 12px; margin-top: 5px; }
    .summary-card.cpk { background: linear-gradient(135deg, #dbeafe, #bfdbfe); }
    .summary-card.ppk { background: linear-gradient(135deg, #dcfce7, #bbf7d0); }
    .summary-card.samples { background: linear-gradient(135deg, #fef3c7, #fde68a); }
    .summary-card.defect { background: linear-gradient(135deg, #fee2e2, #fecaca); }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 18px; color: #111827; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; font-size: 13px; }
    td { font-size: 14px; }
    .trend-up { color: #22c55e; }
    .trend-down { color: #ef4444; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Báo cáo Xu hướng Chất lượng</h1>
      <div class="subtitle">${config.name}${config.description ? ` - ${config.description}` : ''}</div>
    </div>
    
    <div class="meta">
      <div class="meta-item">
        <div class="label">Chu kỳ</div>
        <div class="value">${periodTypeLabels[periodType] || periodType}</div>
      </div>
      <div class="meta-item">
        <div class="label">Số kỳ so sánh</div>
        <div class="value">${comparisonPeriods}</div>
      </div>
      <div class="meta-item">
        <div class="label">Ngày tạo</div>
        <div class="value">${new Date(generatedAt).toLocaleDateString('vi-VN')}</div>
      </div>
      <div class="meta-item">
        <div class="label">Người tạo</div>
        <div class="value">${generatedBy}</div>
      </div>
    </div>
    
    <div class="summary">
      <div class="summary-card cpk">
        <div class="value" style="color: ${cpkStatus.color}">${(latestPeriod?.avgCpk || 0).toFixed(2)}</div>
        <div class="label">CPK Trung bình</div>
        <div class="change ${cpkChange >= 0 ? 'trend-up' : 'trend-down'}">
          ${cpkChange >= 0 ? '↑' : '↓'} ${Math.abs(cpkChange).toFixed(1)}%
        </div>
      </div>
      <div class="summary-card ppk">
        <div class="value">${(latestPeriod?.avgPpk || 0).toFixed(2)}</div>
        <div class="label">PPK Trung bình</div>
      </div>
      <div class="summary-card samples">
        <div class="value">${(latestPeriod?.totalSamples || 0).toLocaleString('vi-VN')}</div>
        <div class="label">Tổng mẫu</div>
      </div>
      <div class="summary-card defect">
        <div class="value">${(latestPeriod?.defectRate || 0).toFixed(2)}%</div>
        <div class="label">Tỷ lệ lỗi</div>
        <div class="change ${defectRateChange <= 0 ? 'trend-up' : 'trend-down'}">
          ${defectRateChange <= 0 ? '↓' : '↑'} ${Math.abs(defectRateChange).toFixed(2)}%
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>📈 Dữ liệu theo ${periodTypeLabels[periodType] || 'Kỳ'}</h2>
      <table>
        <thead>
          <tr>
            <th>Kỳ</th>
            <th>CPK TB</th>
            <th>PPK TB</th>
            <th>Số mẫu</th>
            <th>Vi phạm</th>
            <th>Tỷ lệ lỗi</th>
          </tr>
        </thead>
        <tbody>
          ${periodData.map(p => `
            <tr>
              <td><strong>${p.period}</strong></td>
              <td style="color: ${getCpkStatus(p.avgCpk).color}">${p.avgCpk.toFixed(2)}</td>
              <td>${p.avgPpk.toFixed(2)}</td>
              <td>${p.totalSamples.toLocaleString('vi-VN')}</td>
              <td>${p.totalViolations.toLocaleString('vi-VN')}</td>
              <td>${p.defectRate.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2>📋 Đánh giá</h2>
      <p style="padding: 15px; background: #f3f4f6; border-radius: 6px; border-left: 4px solid ${cpkStatus.color};">
        <strong>Trạng thái hiện tại:</strong> 
        <span class="status-badge" style="background: ${cpkStatus.color}; color: white;">${cpkStatus.text}</span>
        <br><br>
        CPK trung bình kỳ hiện tại là <strong>${(latestPeriod?.avgCpk || 0).toFixed(2)}</strong>, 
        ${cpkChange >= 0 ? 'tăng' : 'giảm'} <strong>${Math.abs(cpkChange).toFixed(1)}%</strong> so với kỳ trước.
        ${latestPeriod?.avgCpk >= 1.33 
          ? 'Quy trình đang hoạt động ổn định và đáp ứng yêu cầu chất lượng.' 
          : 'Cần xem xét và cải thiện quy trình để nâng cao chỉ số CPK.'}
      </p>
    </div>
    
    <div class="footer">
      <p>Báo cáo được tạo tự động bởi Hệ thống CPK/SPC Calculator</p>
      <p>© ${new Date().getFullYear()} - Tất cả quyền được bảo lưu</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
