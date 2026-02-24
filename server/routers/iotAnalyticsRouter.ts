/**
 * IoT Analytics Router
 * 
 * API endpoints for analytics and reporting:
 * - Custom Reports CRUD
 * - Dashboard Widgets CRUD
 * - Data Aggregation
 * - Trend Analysis
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import * as analyticsService from '../services/iotAnalyticsService';

export const iotAnalyticsRouter = router({
  // ============ Analytics Reports ============
  
  getReports: protectedProcedure
    .input(z.object({ userId: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      return analyticsService.getAnalyticsReports(input?.userId || ctx.user?.id);
    }),
  
  createReport: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      reportType: z.enum(['device_health', 'energy_consumption', 'utilization', 'maintenance', 'alerts', 'custom']),
      deviceIds: z.array(z.number()).optional(),
      groupIds: z.array(z.number()).optional(),
      metrics: z.array(z.string()),
      timeRange: z.string().optional(),
      aggregation: z.enum(['minute', 'hour', 'day', 'week', 'month']).optional(),
      filters: z.any().optional(),
      chartConfig: z.any().optional(),
      scheduleEnabled: z.boolean().optional(),
      scheduleFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      scheduleTime: z.string().optional(),
      recipients: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return analyticsService.createAnalyticsReport({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),
  
  updateReport: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      reportType: z.string().optional(),
      deviceIds: z.array(z.number()).optional(),
      groupIds: z.array(z.number()).optional(),
      metrics: z.array(z.string()).optional(),
      timeRange: z.string().optional(),
      aggregation: z.string().optional(),
      filters: z.any().optional(),
      chartConfig: z.any().optional(),
      scheduleEnabled: z.boolean().optional(),
      scheduleFrequency: z.string().optional(),
      scheduleTime: z.string().optional(),
      recipients: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return analyticsService.updateAnalyticsReport(id, data);
    }),
  
  deleteReport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return analyticsService.deleteAnalyticsReport(input.id);
    }),
  
  generateReport: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input }) => {
      return analyticsService.generateReport(input.reportId);
    }),
  
  // ============ Dashboard Widgets ============
  
  getWidgets: protectedProcedure.query(async ({ ctx }) => {
    return analyticsService.getDashboardWidgets(ctx.user?.id || 0);
  }),
  
  createWidget: protectedProcedure
    .input(z.object({
      widgetType: z.enum(['device_status', 'health_score', 'alerts', 'chart', 'map', 'kpi', 'custom']),
      title: z.string().min(1),
      config: z.any(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      size: z.object({ w: z.number(), h: z.number() }).optional(),
      refreshInterval: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return analyticsService.createDashboardWidget({
        ...input,
        userId: ctx.user?.id || 0,
      });
    }),
  
  updateWidget: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      config: z.any().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      size: z.object({ w: z.number(), h: z.number() }).optional(),
      refreshInterval: z.number().optional(),
      isVisible: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return analyticsService.updateDashboardWidget(id, data);
    }),
  
  deleteWidget: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return analyticsService.deleteDashboardWidget(input.id);
    }),
  
  saveLayout: protectedProcedure
    .input(z.object({
      widgets: z.array(z.object({
        id: z.number(),
        position: z.object({ x: z.number(), y: z.number() }),
        size: z.object({ w: z.number(), h: z.number() }),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      return analyticsService.saveDashboardLayout(ctx.user?.id || 0, input.widgets);
    }),
  
  // ============ Data Aggregation ============
  
  getAggregatedData: publicProcedure
    .input(z.object({
      deviceIds: z.array(z.number()).optional(),
      metrics: z.array(z.string()),
      startDate: z.string(),
      endDate: z.string(),
      aggregation: z.enum(['minute', 'hour', 'day', 'week', 'month']),
    }))
    .query(async ({ input }) => {
      return analyticsService.getAggregatedData({
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      });
    }),
  
  // ============ Trend Analysis ============
  
  analyzeTrends: publicProcedure
    .input(z.object({
      deviceId: z.number(),
      metric: z.string(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      return analyticsService.analyzeTrends(input.deviceId, input.metric, input.days);
    }),
  
  // ============ Statistics ============
  
  getStats: publicProcedure.query(async () => {
    return analyticsService.getAnalyticsStats();
  }),
});

export default iotAnalyticsRouter;
