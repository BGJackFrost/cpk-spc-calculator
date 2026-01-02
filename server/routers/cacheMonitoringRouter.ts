/**
 * Cache Monitoring Router
 * Provides API endpoints for cache monitoring and management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { cache, getCacheStats, cleanupCache, resetCacheMetrics, invalidateCache } from "../cache";

// Store cache history for trend analysis
interface CacheHistoryEntry {
  timestamp: number;
  hitRate: number;
  size: number;
  hits: number;
  misses: number;
}

const cacheHistory: CacheHistoryEntry[] = [];
const MAX_HISTORY_ENTRIES = 360; // 30 minutes at 5-second intervals

// Record cache stats periodically
function recordCacheHistory() {
  const stats = getCacheStats();
  const entry: CacheHistoryEntry = {
    timestamp: Date.now(),
    hitRate: stats.hitRate,
    size: stats.size,
    hits: stats.metrics.hits,
    misses: stats.metrics.misses,
  };
  
  cacheHistory.push(entry);
  
  // Keep only last MAX_HISTORY_ENTRIES
  while (cacheHistory.length > MAX_HISTORY_ENTRIES) {
    cacheHistory.shift();
  }
}

// Start recording history every 5 seconds
setInterval(recordCacheHistory, 5000);

// Record initial entry
recordCacheHistory();

export const cacheMonitoringRouter = router({
  // Get current cache statistics
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

  // Get cache history for trend analysis
  getHistory: protectedProcedure
    .input(z.object({
      minutes: z.number().min(1).max(60).default(30),
    }))
    .query(async ({ input }) => {
      const cutoff = Date.now() - (input.minutes * 60 * 1000);
      return cacheHistory.filter(entry => entry.timestamp >= cutoff);
    }),

  // Clear all cache
  clearCache: protectedProcedure.mutation(async ({ ctx }) => {
    // Only admin can clear all cache
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    
    cache.clear();
    return { success: true, message: "All cache cleared" };
  }),

  // Clear cache by pattern
  clearPattern: protectedProcedure
    .input(z.object({
      pattern: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only admin can clear cache
      if (ctx.user.role !== "admin" && ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Manager access required" });
      }
      
      const statsBefore = getCacheStats();
      invalidateCache([input.pattern]);
      const statsAfter = getCacheStats();
      
      const cleared = statsBefore.size - statsAfter.size;
      return { success: true, cleared };
    }),

  // Reset cache metrics
  resetMetrics: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    
    resetCacheMetrics();
    return { success: true };
  }),

  // Cleanup expired entries
  cleanup: protectedProcedure.mutation(async () => {
    const cleaned = cleanupCache();
    return { success: true, cleaned };
  }),

  // Get cache entry details (for debugging)
  getEntryDetails: protectedProcedure
    .input(z.object({
      key: z.string(),
    }))
    .query(async ({ input }) => {
      const value = cache.get(input.key);
      return {
        key: input.key,
        exists: value !== null,
        // Don't return actual data for security
        hasData: value !== null && value !== undefined,
      };
    }),

  // Get category summary
  getCategorySummary: protectedProcedure.query(async () => {
    const stats = getCacheStats();
    const categories: Record<string, { count: number; keys: string[] }> = {};
    
    stats.keys.forEach((key: string) => {
      const category = key.split(':')[0];
      if (!categories[category]) {
        categories[category] = { count: 0, keys: [] };
      }
      categories[category].count++;
      if (categories[category].keys.length < 10) {
        categories[category].keys.push(key);
      }
    });
    
    return Object.entries(categories).map(([name, data]) => ({
      name,
      count: data.count,
      sampleKeys: data.keys,
    }));
  }),

  // Set max cache size
  setMaxSize: protectedProcedure
    .input(z.object({
      maxSize: z.number().min(100).max(100000),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      
      cache.setMaxSize(input.maxSize);
      return { success: true, newMaxSize: input.maxSize };
    }),
});
