/**
 * Cache Monitoring Router
 * Provides API endpoints for cache monitoring, alerts, reports, and warming
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { cache, getCacheStats, cleanupCache, resetCacheMetrics, invalidateCache } from "../cache";
import { cacheAlertService } from "../services/cacheAlertService";
import { cacheReportService } from "../services/cacheReportService";
import { cacheWarmingService } from "../services/cacheWarmingService";
import { cacheMonitoringService } from "../services/cacheMonitoringService";

// Store cache history for trend analysis
interface CacheHistoryEntry {
  timestamp: number;
  hitRate: number;
  size: number;
  hits: number;
  misses: number;
}

const cacheHistory: CacheHistoryEntry[] = [];
const MAX_HISTORY_ENTRIES = 360;

function recordCacheHistory() {
  const stats = getCacheStats();
  cacheHistory.push({
    timestamp: Date.now(),
    hitRate: stats.hitRate,
    size: stats.size,
    hits: stats.metrics.hits,
    misses: stats.metrics.misses,
  });
  while (cacheHistory.length > MAX_HISTORY_ENTRIES) {
    cacheHistory.shift();
  }
}

setInterval(recordCacheHistory, 5000);
recordCacheHistory();

export const cacheMonitoringRouter = router({
  // Basic monitoring
  getStats: protectedProcedure.query(async () => {
    const stats = getCacheStats();
    return {
      size: stats.size,
      maxSize: stats.maxSize,
      keys: stats.keys,
      metrics: stats.metrics,
      hitRate: stats.hitRate,
    };
  }),

  getHistory: protectedProcedure
    .input(z.object({ minutes: z.number().min(1).max(60).default(30) }))
    .query(async ({ input }) => {
      const cutoff = Date.now() - (input.minutes * 60 * 1000);
      return cacheHistory.filter(entry => entry.timestamp >= cutoff);
    }),

  getHealthStatus: protectedProcedure.query(async () => {
    return cacheMonitoringService.getHealthStatus();
  }),

  getSummary: protectedProcedure.query(async () => {
    return cacheMonitoringService.getSummary();
  }),

  clearCache: protectedProcedure
    .input(z.object({ triggerWarming: z.boolean().default(false) }).optional())
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return cacheMonitoringService.clearAllCache(input?.triggerWarming ?? false);
    }),

  clearPattern: protectedProcedure
    .input(z.object({ pattern: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
      }
      const statsBefore = getCacheStats();
      invalidateCache([input.pattern]);
      const statsAfter = getCacheStats();
      return { success: true, cleared: statsBefore.size - statsAfter.size };
    }),

  resetMetrics: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    resetCacheMetrics();
    return { success: true };
  }),

  cleanup: protectedProcedure.mutation(async () => {
    return { success: true, cleaned: cleanupCache() };
  }),

  getEntryDetails: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const value = cache.get(input.key);
      return { key: input.key, exists: value !== null, hasData: value !== null && value !== undefined };
    }),

  getCategorySummary: protectedProcedure.query(async () => {
    const stats = getCacheStats();
    const categories: Record<string, { count: number; keys: string[] }> = {};
    stats.keys.forEach((key: string) => {
      const category = key.split(':')[0];
      if (!categories[category]) categories[category] = { count: 0, keys: [] };
      categories[category].count++;
      if (categories[category].keys.length < 10) categories[category].keys.push(key);
    });
    return Object.entries(categories).map(([name, data]) => ({ name, count: data.count, sampleKeys: data.keys }));
  }),

  setMaxSize: protectedProcedure
    .input(z.object({ maxSize: z.number().min(100).max(100000) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      cache.setMaxSize(input.maxSize);
      return { success: true, newMaxSize: input.maxSize };
    }),

  // Alert Management
  getAlertConfigs: protectedProcedure.query(async () => cacheAlertService.getAlertConfigs()),
  
  getAlertConfigById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => cacheAlertService.getAlertConfigById(input.id)),

  createAlertConfig: protectedProcedure
    .input(z.object({
      name: z.string(),
      hitRateThreshold: z.number().min(0).max(100),
      checkIntervalMinutes: z.number().min(1).max(60),
      alertChannels: z.array(z.string()),
      emailRecipients: z.array(z.string()),
      enabled: z.boolean(),
      cooldownMinutes: z.number().min(1).max(1440),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheAlertService.createAlertConfig(input);
    }),

  updateAlertConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      hitRateThreshold: z.number().min(0).max(100).optional(),
      checkIntervalMinutes: z.number().min(1).max(60).optional(),
      alertChannels: z.array(z.string()).optional(),
      emailRecipients: z.array(z.string()).optional(),
      enabled: z.boolean().optional(),
      cooldownMinutes: z.number().min(1).max(1440).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...updates } = input;
      return cacheAlertService.updateAlertConfig(id, updates);
    }),

  deleteAlertConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheAlertService.deleteAlertConfig(input.id);
    }),

  getAlertHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(100) }))
    .query(async ({ input }) => cacheAlertService.getAlertHistory(input.limit)),

  checkAlerts: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return cacheAlertService.checkAndAlert();
  }),

  clearAlertHistory: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    cacheAlertService.clearAlertHistory();
    return { success: true };
  }),

  resetAlertCooldowns: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    cacheAlertService.resetCooldowns();
    return { success: true };
  }),

  // Report Management
  getReportConfigs: protectedProcedure.query(async () => cacheReportService.getReportConfigs()),

  getReportConfigById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => cacheReportService.getReportConfigById(input.id)),

  createReportConfig: protectedProcedure
    .input(z.object({
      name: z.string(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23),
      minute: z.number().min(0).max(59),
      format: z.enum(['excel', 'pdf', 'html']),
      recipients: z.array(z.string()),
      includeCharts: z.boolean(),
      includeAlertHistory: z.boolean(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheReportService.createReportConfig(input);
    }),

  updateReportConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23).optional(),
      minute: z.number().min(0).max(59).optional(),
      format: z.enum(['excel', 'pdf', 'html']).optional(),
      recipients: z.array(z.string()).optional(),
      includeCharts: z.boolean().optional(),
      includeAlertHistory: z.boolean().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...updates } = input;
      return cacheReportService.updateReportConfig(id, updates);
    }),

  deleteReportConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheReportService.deleteReportConfig(input.id);
    }),

  getReportPreview: protectedProcedure
    .input(z.object({ periodDays: z.number().min(1).max(90).default(1) }))
    .query(async ({ input }) => cacheReportService.collectReportData(input.periodDays)),

  generateExcelReport: protectedProcedure
    .input(z.object({ periodDays: z.number().min(1).max(90).default(1) }))
    .mutation(async ({ input }) => {
      const data = cacheReportService.collectReportData(input.periodDays);
      const buffer = await cacheReportService.generateExcelReport(data);
      return {
        success: true,
        data: buffer.toString('base64'),
        filename: `cache-report-${new Date().toISOString().split('T')[0]}.xlsx`,
      };
    }),

  generateHtmlReport: protectedProcedure
    .input(z.object({ periodDays: z.number().min(1).max(90).default(1) }))
    .query(async ({ input }) => {
      const data = cacheReportService.collectReportData(input.periodDays);
      return cacheReportService.generateHtmlReport(data);
    }),

  sendReport: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheReportService.sendReport(input.configId);
    }),

  // Warming Management
  getWarmingConfigs: protectedProcedure.query(async () => cacheWarmingService.getWarmingConfigs()),

  getWarmingConfigById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => cacheWarmingService.getWarmingConfigById(input.id)),

  createWarmingConfig: protectedProcedure
    .input(z.object({
      name: z.string(),
      cacheKey: z.string(),
      category: z.string(),
      priority: z.enum(['high', 'medium', 'low']),
      warmOnStartup: z.boolean(),
      warmAfterClear: z.boolean(),
      warmIntervalMinutes: z.number().min(1).max(1440).optional(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheWarmingService.createWarmingConfig(input);
    }),

  updateWarmingConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      cacheKey: z.string().optional(),
      category: z.string().optional(),
      priority: z.enum(['high', 'medium', 'low']).optional(),
      warmOnStartup: z.boolean().optional(),
      warmAfterClear: z.boolean().optional(),
      warmIntervalMinutes: z.number().min(1).max(1440).optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const { id, ...updates } = input;
      return cacheWarmingService.updateWarmingConfig(id, updates);
    }),

  deleteWarmingConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheWarmingService.deleteWarmingConfig(input.id);
    }),

  getWarmingStatus: protectedProcedure.query(async () => cacheWarmingService.getWarmingStatus()),

  warmAllCaches: protectedProcedure
    .input(z.object({
      onlyHighPriority: z.boolean().optional(),
      category: z.string().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheWarmingService.warmAllCaches(input);
    }),

  warmById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheWarmingService.warmById(input.id);
    }),

  warmByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return cacheWarmingService.warmByCategory(input.category);
    }),

  getWarmingHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ input }) => cacheMonitoringService.getWarmingHistory(input.limit)),

  resetWarmingDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    cacheWarmingService.resetToDefaults();
    return { success: true };
  }),
});
