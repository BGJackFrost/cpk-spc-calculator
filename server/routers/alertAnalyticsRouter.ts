import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { alertAnalytics, kpiAlertStats, realtimeAlerts } from "../../drizzle/schema";
import { eq, sql, desc, and, gte, lte, count } from "drizzle-orm";
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval, eachWeekOfInterval, startOfWeek, eachMonthOfInterval, startOfMonth } from "date-fns";
import * as twilioService from "../services/twilioService";
import * as webhookHistoryService from "../services/webhookHistoryService";

export const alertAnalyticsRouter = router({
  // Get alert analytics with trend data
  getAnalytics: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).default(30),
      groupBy: z.enum(['day', 'week', 'month']).default('day'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const endDate = new Date();
      const startDate = subDays(endDate, input.days);

      // Get alert stats from kpi_alert_stats
      const alertStats = await db
        .select()
        .from(kpiAlertStats)
        .where(and(
          gte(kpiAlertStats.date, startDate),
          lte(kpiAlertStats.date, endDate)
        ))
        .orderBy(desc(kpiAlertStats.date));

      // Calculate totals
      const totalAlerts = alertStats.reduce((sum, s) => sum + (s.totalAlerts || 0), 0);
      const resolvedCount = alertStats.reduce((sum, s) => sum + (s.resolvedAlerts || 0), 0);
      const pendingCount = alertStats.reduce((sum, s) => sum + (s.pendingAlerts || 0), 0);

      // Group by severity
      const bySeverity = {
        critical: alertStats.reduce((sum, s) => sum + (s.criticalAlerts || 0), 0),
        warning: alertStats.reduce((sum, s) => sum + (s.warningAlerts || 0), 0),
        info: alertStats.reduce((sum, s) => sum + (s.infoAlerts || 0), 0),
      };

      // Group by type
      const byType: Record<string, number> = {};
      alertStats.forEach(s => {
        if (s.alertsByType) {
          const types = typeof s.alertsByType === 'string' 
            ? JSON.parse(s.alertsByType) 
            : s.alertsByType;
          Object.entries(types).forEach(([type, count]) => {
            byType[type] = (byType[type] || 0) + (count as number);
          });
        }
      });

      // Generate trend data based on groupBy
      let intervals: Date[];
      if (input.groupBy === 'month') {
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      } else if (input.groupBy === 'week') {
        intervals = eachWeekOfInterval({ start: startDate, end: endDate });
      } else {
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
      }

      const trendData = intervals.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const matchingStats = alertStats.filter(s => {
          const statDate = new Date(s.date);
          if (input.groupBy === 'month') {
            return statDate.getMonth() === date.getMonth() && statDate.getFullYear() === date.getFullYear();
          } else if (input.groupBy === 'week') {
            const weekStart = startOfWeek(statDate);
            return weekStart.getTime() === startOfWeek(date).getTime();
          }
          return format(statDate, 'yyyy-MM-dd') === dateStr;
        });

        return {
          date: dateStr,
          critical: matchingStats.reduce((sum, s) => sum + (s.criticalAlerts || 0), 0),
          warning: matchingStats.reduce((sum, s) => sum + (s.warningAlerts || 0), 0),
          info: matchingStats.reduce((sum, s) => sum + (s.infoAlerts || 0), 0),
          total: matchingStats.reduce((sum, s) => sum + (s.totalAlerts || 0), 0),
        };
      });

      // Get resolved alerts for MTTR calculation
      const resolvedAlerts = alertStats
        .filter(s => s.avgResolutionTimeMs && s.avgResolutionTimeMs > 0)
        .map(s => ({
          createdAt: s.date,
          resolvedAt: new Date(s.date.getTime() + (s.avgResolutionTimeMs || 0)),
        }));

      // Resolution time distribution
      const resolutionTimeDistribution = [
        { range: '< 15m', count: 0 },
        { range: '15m-1h', count: 0 },
        { range: '1h-4h', count: 0 },
        { range: '4h-24h', count: 0 },
        { range: '> 24h', count: 0 },
      ];

      alertStats.forEach(s => {
        const avgTime = s.avgResolutionTimeMs || 0;
        if (avgTime < 15 * 60 * 1000) resolutionTimeDistribution[0].count += s.resolvedAlerts || 0;
        else if (avgTime < 60 * 60 * 1000) resolutionTimeDistribution[1].count += s.resolvedAlerts || 0;
        else if (avgTime < 4 * 60 * 60 * 1000) resolutionTimeDistribution[2].count += s.resolvedAlerts || 0;
        else if (avgTime < 24 * 60 * 60 * 1000) resolutionTimeDistribution[3].count += s.resolvedAlerts || 0;
        else resolutionTimeDistribution[4].count += s.resolvedAlerts || 0;
      });

      // Group by source (production line)
      const bySource: Array<{
        name: string;
        total: number;
        critical: number;
        warning: number;
        info: number;
        resolved: number;
        mttr: string | null;
      }> = [];

      const sourceMap = new Map<string, typeof bySource[0]>();
      alertStats.forEach(s => {
        if (s.alertsBySource) {
          const sources = typeof s.alertsBySource === 'string'
            ? JSON.parse(s.alertsBySource)
            : s.alertsBySource;
          Object.entries(sources).forEach(([source, data]: [string, any]) => {
            const existing = sourceMap.get(source) || {
              name: source,
              total: 0,
              critical: 0,
              warning: 0,
              info: 0,
              resolved: 0,
              mttr: null,
            };
            existing.total += data.total || 0;
            existing.critical += data.critical || 0;
            existing.warning += data.warning || 0;
            existing.info += data.info || 0;
            existing.resolved += data.resolved || 0;
            sourceMap.set(source, existing);
          });
        }
      });
      bySource.push(...sourceMap.values());

      return {
        totalAlerts,
        resolvedCount,
        pendingCount,
        bySeverity,
        byType,
        trendData,
        resolvedAlerts,
        resolutionTimeDistribution,
        bySource,
      };
    }),

  // Record alert for analytics
  recordAlert: protectedProcedure
    .input(z.object({
      alertType: z.string(),
      severity: z.enum(['info', 'warning', 'critical']),
      source: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const today = startOfDay(new Date());
      
      // Check if record exists for today
      const [existing] = await db
        .select()
        .from(alertAnalytics)
        .where(and(
          eq(alertAnalytics.alertType, input.alertType),
          eq(alertAnalytics.severity, input.severity),
          gte(alertAnalytics.date, today),
          lte(alertAnalytics.date, endOfDay(today))
        ))
        .limit(1);

      if (existing) {
        await db.update(alertAnalytics)
          .set({ count: sql`${alertAnalytics.count} + 1` })
          .where(eq(alertAnalytics.id, existing.id));
      } else {
        await db.insert(alertAnalytics).values({
          date: today,
          alertType: input.alertType,
          severity: input.severity,
          source: input.source || null,
          count: 1,
        });
      }

      return { success: true };
    }),

  // Mark alert as resolved
  resolveAlert: protectedProcedure
    .input(z.object({
      alertType: z.string(),
      severity: z.enum(['info', 'warning', 'critical']),
      resolutionTimeMs: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const today = startOfDay(new Date());
      
      const [existing] = await db
        .select()
        .from(alertAnalytics)
        .where(and(
          eq(alertAnalytics.alertType, input.alertType),
          eq(alertAnalytics.severity, input.severity),
          gte(alertAnalytics.date, today),
          lte(alertAnalytics.date, endOfDay(today))
        ))
        .limit(1);

      if (existing) {
        await db.update(alertAnalytics)
          .set({
            resolvedCount: sql`${alertAnalytics.resolvedCount} + 1`,
            totalResolutionTimeMs: sql`${alertAnalytics.totalResolutionTimeMs} + ${input.resolutionTimeMs}`,
          })
          .where(eq(alertAnalytics.id, existing.id));
      }

      return { success: true };
    }),

  // ==================== TWILIO SMS ====================
  
  // Get Twilio configuration
  getTwilioConfig: adminProcedure.query(async () => {
    const config = await twilioService.getTwilioConfig();
    return config || {
      accountSid: '',
      authToken: '',
      fromNumber: '',
      enabled: false,
    };
  }),

  // Save Twilio configuration
  saveTwilioConfig: adminProcedure
    .input(z.object({
      accountSid: z.string(),
      authToken: z.string(),
      fromNumber: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const success = await twilioService.saveTwilioConfig(input);
      return { success };
    }),

  // Verify Twilio credentials
  verifyTwilioCredentials: adminProcedure
    .input(z.object({
      accountSid: z.string(),
      authToken: z.string(),
    }))
    .mutation(async ({ input }) => {
      return twilioService.verifyTwilioCredentials(input.accountSid, input.authToken);
    }),

  // Send test SMS
  sendTestSms: adminProcedure
    .input(z.object({
      to: z.string(),
    }))
    .mutation(async ({ input }) => {
      return twilioService.sendTestSms(input.to);
    }),

  // Send alert SMS
  sendAlertSms: protectedProcedure
    .input(z.object({
      to: z.string(),
      alertType: z.string(),
      alertMessage: z.string(),
      alertId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return twilioService.sendAlertSms(input.to, input.alertType, input.alertMessage, input.alertId);
    }),

  // Get SMS history
  getSmsHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(({ input }) => {
      return twilioService.getSmsHistory(input.limit);
    }),

  // Get SMS statistics
  getSmsStatistics: protectedProcedure.query(() => {
    return twilioService.getSmsStatistics();
  }),

  // ==================== WEBHOOK HISTORY ====================

  // Get webhook delivery history
  getWebhookHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(500).default(100),
      webhookId: z.number().optional(),
      status: z.enum(['pending', 'success', 'failed', 'retrying']).optional(),
      alertId: z.number().optional(),
    }))
    .query(({ input }) => {
      return webhookHistoryService.getDeliveryHistory(input);
    }),

  // Get webhook statistics
  getWebhookStatistics: protectedProcedure.query(() => {
    return webhookHistoryService.getWebhookStatistics();
  }),

  // Get retry statistics
  getRetryStatistics: protectedProcedure.query(() => {
    return webhookHistoryService.getRetryStatistics();
  }),

  // Retry a specific delivery
  retryWebhookDelivery: protectedProcedure
    .input(z.object({
      deliveryId: z.string(),
    }))
    .mutation(async ({ input }) => {
      return webhookHistoryService.retryDelivery(input.deliveryId);
    }),

  // Process all pending retries
  processWebhookRetries: adminProcedure.mutation(async () => {
    return webhookHistoryService.processRetries();
  }),

  // Clear webhook history
  clearWebhookHistory: adminProcedure
    .input(z.object({
      olderThanDays: z.number().optional(),
    }))
    .mutation(({ input }) => {
      const count = webhookHistoryService.clearDeliveryHistory(input.olderThanDays);
      return { cleared: count };
    }),

  // Get delivery by ID
  getWebhookDeliveryById: protectedProcedure
    .input(z.object({
      deliveryId: z.string(),
    }))
    .query(({ input }) => {
      return webhookHistoryService.getDeliveryById(input.deliveryId);
    }),
});
