import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  aiVisionDashboardConfigs, 
  lineComparisonSessions,
  productionLines,
  spcAnalysisHistory,
  spcSamplingPlans,
  products
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// AI Vision Dashboard Router
export const aiVisionDashboardRouter = router({
  // Get or create dashboard config for current user
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [config] = await db
        .select()
        .from(aiVisionDashboardConfigs)
        .where(eq(aiVisionDashboardConfigs.userId, ctx.user.id));
      
      if (!config) {
        // Create default config
        const [result] = await db.insert(aiVisionDashboardConfigs).values({
          userId: ctx.user.id,
          layoutConfig: JSON.stringify({ columns: 3 }),
          widgets: JSON.stringify([
            { id: 'cpk_overview', type: 'cpk_overview', position: { x: 0, y: 0, w: 1, h: 1 } },
            { id: 'ng_rate', type: 'ng_rate', position: { x: 1, y: 0, w: 1, h: 1 } },
            { id: 'violation_count', type: 'violation_count', position: { x: 2, y: 0, w: 1, h: 1 } },
            { id: 'trend_chart', type: 'trend_chart', position: { x: 0, y: 1, w: 2, h: 1 } },
            { id: 'line_status', type: 'line_status', position: { x: 2, y: 1, w: 1, h: 1 } },
          ]),
          defaultTimeRange: '24h',
          autoRefresh: 1,
          refreshInterval: 60,
        });
        
        const [newConfig] = await db
          .select()
          .from(aiVisionDashboardConfigs)
          .where(eq(aiVisionDashboardConfigs.id, result.insertId));
        
        return newConfig;
      }
      
      return config;
    }),

  // Update dashboard config
  updateConfig: protectedProcedure
    .input(z.object({
      layoutConfig: z.any().optional(),
      widgets: z.any().optional(),
      defaultProductionLineIds: z.array(z.number()).optional(),
      defaultProductIds: z.array(z.number()).optional(),
      defaultTimeRange: z.string().optional(),
      autoRefresh: z.boolean().optional(),
      refreshInterval: z.number().min(10).max(3600).optional(),
      cpkWarningThreshold: z.number().optional(),
      cpkCriticalThreshold: z.number().optional(),
      ngRateWarningThreshold: z.number().optional(),
      ngRateCriticalThreshold: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const [existing] = await db
        .select()
        .from(aiVisionDashboardConfigs)
        .where(eq(aiVisionDashboardConfigs.userId, ctx.user.id));
      
      const updates: Record<string, any> = {};
      
      if (input.layoutConfig !== undefined) updates.layoutConfig = JSON.stringify(input.layoutConfig);
      if (input.widgets !== undefined) updates.widgets = JSON.stringify(input.widgets);
      if (input.defaultProductionLineIds !== undefined) updates.defaultProductionLineIds = JSON.stringify(input.defaultProductionLineIds);
      if (input.defaultProductIds !== undefined) updates.defaultProductIds = JSON.stringify(input.defaultProductIds);
      if (input.defaultTimeRange !== undefined) updates.defaultTimeRange = input.defaultTimeRange;
      if (input.autoRefresh !== undefined) updates.autoRefresh = input.autoRefresh ? 1 : 0;
      if (input.refreshInterval !== undefined) updates.refreshInterval = input.refreshInterval;
      if (input.cpkWarningThreshold !== undefined) updates.cpkWarningThreshold = input.cpkWarningThreshold.toString();
      if (input.cpkCriticalThreshold !== undefined) updates.cpkCriticalThreshold = input.cpkCriticalThreshold.toString();
      if (input.ngRateWarningThreshold !== undefined) updates.ngRateWarningThreshold = input.ngRateWarningThreshold.toString();
      if (input.ngRateCriticalThreshold !== undefined) updates.ngRateCriticalThreshold = input.ngRateCriticalThreshold.toString();
      
      if (existing) {
        await db.update(aiVisionDashboardConfigs)
          .set(updates)
          .where(eq(aiVisionDashboardConfigs.userId, ctx.user.id));
      } else {
        await db.insert(aiVisionDashboardConfigs).values({
          userId: ctx.user.id,
          ...updates,
        });
      }
      
      return { success: true };
    }),

  // Get dashboard data
  getData: protectedProcedure
    .input(z.object({
      timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
      productionLineIds: z.array(z.number()).optional(),
      productIds: z.array(z.number()).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { summary: { totalAnalyses: 0, avgCpk: 0, minCpk: 0, maxCpk: 0, violationCount: 0, ngRate: 0, cpkDistribution: { excellent: 0, good: 0, acceptable: 0, poor: 0 } }, trendData: [], lineStatus: [], recentAlerts: [], timeRange: input.timeRange, lastUpdated: new Date().toISOString() };
      // Calculate date range
      const now = new Date();
      let dateFrom: Date;
      
      switch (input.timeRange) {
        case '1h': dateFrom = new Date(now.getTime() - 1 * 60 * 60 * 1000); break;
        case '6h': dateFrom = new Date(now.getTime() - 6 * 60 * 60 * 1000); break;
        case '24h': dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case '7d': dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        default: dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      
      const dateFromStr = dateFrom.toISOString().slice(0, 19).replace('T', ' ');
      
      // Get all production lines
      const allLines = await db.select().from(productionLines);
      
      // Get SPC analysis data
      const analyses = await db
        .select()
        .from(spcAnalysisHistory)
        .where(gte(spcAnalysisHistory.analyzedAt, dateFromStr))
        .orderBy(desc(spcAnalysisHistory.analyzedAt))
        .limit(500);
      
      // Calculate statistics
      const totalAnalyses = analyses.length;
      const cpkValues = analyses.map(a => parseFloat(a.cpk as string) || 0);
      const avgCpk = cpkValues.length > 0 ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : 0;
      const minCpk = cpkValues.length > 0 ? Math.min(...cpkValues) : 0;
      const maxCpk = cpkValues.length > 0 ? Math.max(...cpkValues) : 0;
      
      const violationCount = analyses.filter(a => {
        const violations = a.violations ? JSON.parse(a.violations as string) : [];
        return violations.length > 0;
      }).length;
      
      const ngRate = totalAnalyses > 0 ? (violationCount / totalAnalyses * 100) : 0;
      
      // CPK distribution
      const cpkDistribution = {
        excellent: cpkValues.filter(v => v >= 1.67).length,
        good: cpkValues.filter(v => v >= 1.33 && v < 1.67).length,
        acceptable: cpkValues.filter(v => v >= 1.0 && v < 1.33).length,
        poor: cpkValues.filter(v => v < 1.0).length,
      };
      
      // Trend data (hourly for 24h, daily for 7d/30d)
      const trendData: { time: string; cpk: number; ngRate: number }[] = [];
      const groupByHour = input.timeRange === '1h' || input.timeRange === '6h' || input.timeRange === '24h';
      
      if (groupByHour) {
        const hours = input.timeRange === '1h' ? 1 : input.timeRange === '6h' ? 6 : 24;
        for (let i = hours - 1; i >= 0; i--) {
          const hourStart = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
          const hourEnd = new Date(now.getTime() - i * 60 * 60 * 1000);
          
          const hourAnalyses = analyses.filter(a => {
            const time = new Date(a.analyzedAt);
            return time >= hourStart && time < hourEnd;
          });
          
          const hourCpks = hourAnalyses.map(a => parseFloat(a.cpk as string) || 0);
          const hourAvgCpk = hourCpks.length > 0 ? hourCpks.reduce((a, b) => a + b, 0) / hourCpks.length : 0;
          const hourViolations = hourAnalyses.filter(a => {
            const violations = a.violations ? JSON.parse(a.violations as string) : [];
            return violations.length > 0;
          }).length;
          const hourNgRate = hourAnalyses.length > 0 ? (hourViolations / hourAnalyses.length * 100) : 0;
          
          trendData.push({
            time: hourEnd.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            cpk: hourAvgCpk,
            ngRate: hourNgRate,
          });
        }
      } else {
        const days = input.timeRange === '7d' ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
          const dayStart = new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000);
          const dayEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          
          const dayAnalyses = analyses.filter(a => {
            const time = new Date(a.analyzedAt);
            return time >= dayStart && time < dayEnd;
          });
          
          const dayCpks = dayAnalyses.map(a => parseFloat(a.cpk as string) || 0);
          const dayAvgCpk = dayCpks.length > 0 ? dayCpks.reduce((a, b) => a + b, 0) / dayCpks.length : 0;
          const dayViolations = dayAnalyses.filter(a => {
            const violations = a.violations ? JSON.parse(a.violations as string) : [];
            return violations.length > 0;
          }).length;
          const dayNgRate = dayAnalyses.length > 0 ? (dayViolations / dayAnalyses.length * 100) : 0;
          
          trendData.push({
            time: dayEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            cpk: dayAvgCpk,
            ngRate: dayNgRate,
          });
        }
      }
      
      // Line status
      const lineStatus = allLines.map(line => {
        const lineAnalyses = analyses.filter(a => a.productionLineId === line.id);
        const lineCpks = lineAnalyses.map(a => parseFloat(a.cpk as string) || 0);
        const lineAvgCpk = lineCpks.length > 0 ? lineCpks.reduce((a, b) => a + b, 0) / lineCpks.length : 0;
        const lineViolations = lineAnalyses.filter(a => {
          const violations = a.violations ? JSON.parse(a.violations as string) : [];
          return violations.length > 0;
        }).length;
        
        return {
          id: line.id,
          name: line.name,
          cpk: lineAvgCpk,
          analysisCount: lineAnalyses.length,
          violationCount: lineViolations,
          status: lineAvgCpk >= 1.33 ? 'good' : lineAvgCpk >= 1.0 ? 'warning' : 'critical',
        };
      });
      
      // Recent alerts
      const recentAlerts = analyses
        .filter(a => {
          const violations = a.violations ? JSON.parse(a.violations as string) : [];
          return violations.length > 0 || parseFloat(a.cpk as string) < 1.0;
        })
        .slice(0, 10)
        .map(a => ({
          id: a.id,
          time: a.analyzedAt,
          cpk: parseFloat(a.cpk as string) || 0,
          violations: a.violations ? JSON.parse(a.violations as string) : [],
          productionLineId: a.productionLineId,
        }));
      
      return {
        summary: {
          totalAnalyses,
          avgCpk,
          minCpk,
          maxCpk,
          violationCount,
          ngRate,
          cpkDistribution,
        },
        trendData,
        lineStatus,
        recentAlerts,
        timeRange: input.timeRange,
        lastUpdated: now.toISOString(),
      };
    }),

  // Get AI insights
  getAiInsights: protectedProcedure
    .input(z.object({
      timeRange: z.enum(['1h', '6h', '24h', '7d', '30d']).optional().default('24h'),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { insights: 'Database not available', generatedAt: new Date().toISOString() };
      // Get dashboard data first
      const now = new Date();
      let dateFrom: Date;
      
      switch (input.timeRange) {
        case '1h': dateFrom = new Date(now.getTime() - 1 * 60 * 60 * 1000); break;
        case '6h': dateFrom = new Date(now.getTime() - 6 * 60 * 60 * 1000); break;
        case '24h': dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case '7d': dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '30d': dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        default: dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }
      
      const dateFromStr = dateFrom.toISOString().slice(0, 19).replace('T', ' ');
      
      const analyses = await db
        .select()
        .from(spcAnalysisHistory)
        .where(gte(spcAnalysisHistory.analyzedAt, dateFromStr))
        .orderBy(desc(spcAnalysisHistory.analyzedAt))
        .limit(100);
      
      const cpkValues = analyses.map(a => parseFloat(a.cpk as string) || 0);
      const avgCpk = cpkValues.length > 0 ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : 0;
      const violationCount = analyses.filter(a => {
        const violations = a.violations ? JSON.parse(a.violations as string) : [];
        return violations.length > 0;
      }).length;
      
      // Call LLM for insights
      const prompt = `Bạn là chuyên gia phân tích SPC/CPK. Dựa trên dữ liệu sau, hãy đưa ra phân tích và khuyến nghị:

Thời gian phân tích: ${input.timeRange}
Số lượng phân tích: ${analyses.length}
CPK trung bình: ${avgCpk.toFixed(3)}
CPK tối thiểu: ${cpkValues.length > 0 ? Math.min(...cpkValues).toFixed(3) : 'N/A'}
CPK tối đa: ${cpkValues.length > 0 ? Math.max(...cpkValues).toFixed(3) : 'N/A'}
Số vi phạm: ${violationCount}
Tỷ lệ NG: ${analyses.length > 0 ? (violationCount / analyses.length * 100).toFixed(1) : 0}%

Hãy phân tích:
1. Đánh giá tổng quan về tình trạng chất lượng
2. Các vấn đề cần chú ý
3. Khuyến nghị cải tiến
4. Dự báo xu hướng

Trả lời bằng tiếng Việt, ngắn gọn và chuyên nghiệp.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Bạn là chuyên gia phân tích SPC/CPK trong sản xuất công nghiệp." },
            { role: "user", content: prompt },
          ],
        });
        
        return {
          insights: response.choices[0]?.message?.content || 'Không thể tạo phân tích',
          generatedAt: now.toISOString(),
        };
      } catch (error: any) {
        return {
          insights: `Không thể tạo phân tích AI: ${error.message}`,
          generatedAt: now.toISOString(),
        };
      }
    }),
});

// Line Comparison Router
export const lineComparisonRouter = router({
  // Get all comparison sessions for current user
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const sessions = await db
        .select()
        .from(lineComparisonSessions)
        .where(eq(lineComparisonSessions.userId, ctx.user.id))
        .orderBy(desc(lineComparisonSessions.createdAt));
      
      return sessions;
    }),

  // Get a single comparison session
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const [session] = await db
        .select()
        .from(lineComparisonSessions)
        .where(eq(lineComparisonSessions.id, input.id));
      
      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy phiên so sánh' });
      }
      
      if (session.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền truy cập' });
      }
      
      return session;
    }),

  // Create a new comparison session
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Tên không được để trống'),
      description: z.string().optional(),
      productionLineIds: z.array(z.number()).min(2, 'Cần ít nhất 2 dây chuyền để so sánh'),
      productId: z.number().optional(),
      dateFrom: z.string(),
      dateTo: z.string(),
      compareMetrics: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [result] = await db.insert(lineComparisonSessions).values({
        name: input.name,
        description: input.description || null,
        userId: ctx.user.id,
        productionLineIds: JSON.stringify(input.productionLineIds),
        productId: input.productId || null,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        compareMetrics: input.compareMetrics ? JSON.stringify(input.compareMetrics) : JSON.stringify(['cpk', 'ng_rate', 'violation_count']),
      });
      
      return { id: result.insertId, name: input.name };
    }),

  // Delete a comparison session
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const [existing] = await db
        .select()
        .from(lineComparisonSessions)
        .where(eq(lineComparisonSessions.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Không tìm thấy phiên so sánh' });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Không có quyền xóa' });
      }
      
      await db.delete(lineComparisonSessions)
        .where(eq(lineComparisonSessions.id, input.id));
      
      return { success: true };
    }),

  // Compare production lines
  compare: protectedProcedure
    .input(z.object({
      productionLineIds: z.array(z.number()).min(2, 'Cần ít nhất 2 dây chuyền'),
      dateFrom: z.string(),
      dateTo: z.string(),
      productId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { lines: [], rankings: [] };
      // Get production line info
      const lines = await db
        .select()
        .from(productionLines)
        .where(inArray(productionLines.id, input.productionLineIds));
      
      // Get SPC analysis data for each line
      const results = await Promise.all(lines.map(async (line) => {
        const conditions = [
          eq(spcAnalysisHistory.productionLineId, line.id),
          gte(spcAnalysisHistory.analyzedAt, input.dateFrom),
          lte(spcAnalysisHistory.analyzedAt, input.dateTo),
        ];
        
        if (input.productId) {
          conditions.push(eq(spcAnalysisHistory.productId, input.productId));
        }
        
        const analyses = await db
          .select()
          .from(spcAnalysisHistory)
          .where(and(...conditions))
          .orderBy(desc(spcAnalysisHistory.analyzedAt));
        
        const cpkValues = analyses.map(a => parseFloat(a.cpk as string) || 0);
        const avgCpk = cpkValues.length > 0 ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : 0;
        const minCpk = cpkValues.length > 0 ? Math.min(...cpkValues) : 0;
        const maxCpk = cpkValues.length > 0 ? Math.max(...cpkValues) : 0;
        const stdCpk = cpkValues.length > 1 
          ? Math.sqrt(cpkValues.reduce((sum, v) => sum + Math.pow(v - avgCpk, 2), 0) / (cpkValues.length - 1))
          : 0;
        
        const violationCount = analyses.filter(a => {
          const violations = a.violations ? JSON.parse(a.violations as string) : [];
          return violations.length > 0;
        }).length;
        
        const ngRate = analyses.length > 0 ? (violationCount / analyses.length * 100) : 0;
        
        // Calculate Pp, Ppk if available
        const ppValues = analyses.map(a => parseFloat(a.pp as string) || 0).filter(v => v > 0);
        const ppkValues = analyses.map(a => parseFloat(a.ppk as string) || 0).filter(v => v > 0);
        const avgPp = ppValues.length > 0 ? ppValues.reduce((a, b) => a + b, 0) / ppValues.length : 0;
        const avgPpk = ppkValues.length > 0 ? ppkValues.reduce((a, b) => a + b, 0) / ppkValues.length : 0;
        
        return {
          lineId: line.id,
          lineName: line.name,
          lineCode: line.code || '',
          totalAnalyses: analyses.length,
          metrics: {
            cpk: {
              avg: avgCpk,
              min: minCpk,
              max: maxCpk,
              std: stdCpk,
            },
            pp: avgPp,
            ppk: avgPpk,
            ngRate,
            violationCount,
          },
          status: avgCpk >= 1.33 ? 'good' : avgCpk >= 1.0 ? 'warning' : 'critical',
        };
      }));
      
      // Calculate rankings
      const rankings = {
        byCpk: [...results].sort((a, b) => b.metrics.cpk.avg - a.metrics.cpk.avg),
        byNgRate: [...results].sort((a, b) => a.metrics.ngRate - b.metrics.ngRate),
        byViolations: [...results].sort((a, b) => a.metrics.violationCount - b.metrics.violationCount),
      };
      
      return {
        lines: results,
        rankings,
        dateRange: { from: input.dateFrom, to: input.dateTo },
        comparedAt: new Date().toISOString(),
      };
    }),

  // Get trend comparison
  getTrendComparison: protectedProcedure
    .input(z.object({
      productionLineIds: z.array(z.number()).min(2),
      dateFrom: z.string(),
      dateTo: z.string(),
      groupBy: z.enum(['hour', 'day', 'week']).optional().default('day'),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { lines: [], trendData: {} };
      const lines = await db
        .select()
        .from(productionLines)
        .where(inArray(productionLines.id, input.productionLineIds));
      
      const trendData: Record<string, { time: string; [key: string]: number | string }[]> = {};
      
      for (const line of lines) {
        const analyses = await db
          .select()
          .from(spcAnalysisHistory)
          .where(and(
            eq(spcAnalysisHistory.productionLineId, line.id),
            gte(spcAnalysisHistory.analyzedAt, input.dateFrom),
            lte(spcAnalysisHistory.analyzedAt, input.dateTo),
          ))
          .orderBy(spcAnalysisHistory.analyzedAt);
        
        // Group by time period
        const grouped: Record<string, number[]> = {};
        
        for (const a of analyses) {
          const date = new Date(a.analyzedAt);
          let key: string;
          
          if (input.groupBy === 'hour') {
            key = date.toISOString().slice(0, 13);
          } else if (input.groupBy === 'week') {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().slice(0, 10);
          } else {
            key = date.toISOString().slice(0, 10);
          }
          
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(parseFloat(a.cpk as string) || 0);
        }
        
        trendData[line.name] = Object.entries(grouped).map(([time, values]) => ({
          time,
          cpk: values.reduce((a, b) => a + b, 0) / values.length,
        }));
      }
      
      return {
        lines: lines.map(l => ({ id: l.id, name: l.name })),
        trendData,
        groupBy: input.groupBy,
      };
    }),
});
