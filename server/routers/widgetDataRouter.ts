/**
 * Widget Data Router - Widget Preview Live API
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';

// Types
interface WidgetConfig {
  id: string;
  type: 'cpk_summary' | 'oee_realtime' | 'alerts' | 'quick_stats';
  title: string;
  refreshInterval: number;
  thresholds: { cpkWarning: number; cpkCritical: number; oeeWarning: number; oeeCritical: number };
  createdAt: number;
  updatedAt: number;
}

// In-Memory Storage
const widgetConfigs = new Map<string, WidgetConfig>();

// Initialize defaults
[
  { id: 'cpk-summary-default', type: 'cpk_summary' as const, title: 'CPK Summary', refreshInterval: 60 },
  { id: 'oee-realtime-default', type: 'oee_realtime' as const, title: 'OEE Realtime', refreshInterval: 30 },
  { id: 'alerts-default', type: 'alerts' as const, title: 'Active Alerts', refreshInterval: 30 },
  { id: 'quick-stats-default', type: 'quick_stats' as const, title: 'Quick Stats', refreshInterval: 60 },
].forEach(w => {
  widgetConfigs.set(w.id, {
    ...w,
    thresholds: { cpkWarning: 1.33, cpkCritical: 1.0, oeeWarning: 70, oeeCritical: 50 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
});

// Helpers
function getCpkStatus(cpk: number, thresholds: { cpkWarning: number; cpkCritical: number }): 'excellent' | 'good' | 'warning' | 'critical' {
  if (cpk >= 1.67) return 'excellent';
  if (cpk >= thresholds.cpkWarning) return 'good';
  if (cpk >= thresholds.cpkCritical) return 'warning';
  return 'critical';
}

function getOeeStatus(oee: number, thresholds: { oeeWarning: number; oeeCritical: number }): 'excellent' | 'good' | 'warning' | 'critical' {
  if (oee >= 85) return 'excellent';
  if (oee >= thresholds.oeeWarning) return 'good';
  if (oee >= thresholds.oeeCritical) return 'warning';
  return 'critical';
}

function generateMockCpkData() {
  const baseValue = 1.2 + Math.random() * 0.6;
  return {
    avgCpk: Math.round(baseValue * 100) / 100,
    minCpk: Math.round((baseValue - 0.3) * 100) / 100,
    maxCpk: Math.round((baseValue + 0.3) * 100) / 100,
    count: Math.floor(Math.random() * 50) + 10,
    lastUpdated: Date.now(),
  };
}

function generateMockOeeData() {
  const availability = 85 + Math.random() * 10;
  const performance = 80 + Math.random() * 15;
  const quality = 95 + Math.random() * 4;
  const oee = (availability * performance * quality) / 10000;
  return {
    oee: Math.round(oee * 10) / 10,
    availability: Math.round(availability * 10) / 10,
    performance: Math.round(performance * 10) / 10,
    quality: Math.round(quality * 10) / 10,
    lastUpdated: Date.now(),
  };
}

export const widgetDataRouter = router({
  // Get all configs
  getConfigs: protectedProcedure.query(async () => {
    return Array.from(widgetConfigs.values());
  }),

  // Get single config
  getConfig: protectedProcedure
    .input(z.object({ widgetId: z.string() }))
    .query(async ({ input }) => {
      const config = widgetConfigs.get(input.widgetId);
      if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: 'Widget config not found' });
      return config;
    }),

  // Save config
  saveConfig: protectedProcedure
    .input(z.object({
      id: z.string().optional(),
      type: z.enum(['cpk_summary', 'oee_realtime', 'alerts', 'quick_stats']),
      title: z.string().min(1),
      refreshInterval: z.number().int().min(30).max(3600).default(60),
      thresholds: z.object({
        cpkWarning: z.number().default(1.33),
        cpkCritical: z.number().default(1.0),
        oeeWarning: z.number().default(70),
        oeeCritical: z.number().default(50),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const id = input.id || `widget-${Date.now()}`;
      const config: WidgetConfig = {
        id,
        type: input.type,
        title: input.title,
        refreshInterval: input.refreshInterval,
        thresholds: input.thresholds || { cpkWarning: 1.33, cpkCritical: 1.0, oeeWarning: 70, oeeCritical: 50 },
        createdAt: widgetConfigs.get(id)?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      widgetConfigs.set(id, config);
      return { success: true, config };
    }),

  // Delete config
  deleteConfig: protectedProcedure
    .input(z.object({ widgetId: z.string() }))
    .mutation(async ({ input }) => {
      if (!widgetConfigs.has(input.widgetId)) throw new TRPCError({ code: 'NOT_FOUND', message: 'Widget config not found' });
      widgetConfigs.delete(input.widgetId);
      return { success: true };
    }),

  // Get CPK summary
  getCpkSummary: publicProcedure
    .input(z.object({ widgetId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const config = input?.widgetId ? widgetConfigs.get(input.widgetId) : null;
      const thresholds = config?.thresholds || { cpkWarning: 1.33, cpkCritical: 1.0, oeeWarning: 70, oeeCritical: 50 };
      const currentData = generateMockCpkData();
      const previousData = generateMockCpkData();
      const trend = currentData.avgCpk > previousData.avgCpk ? 'up' : currentData.avgCpk < previousData.avgCpk ? 'down' : 'stable';

      return {
        avgCpk: currentData.avgCpk,
        minCpk: currentData.minCpk,
        maxCpk: currentData.maxCpk,
        status: getCpkStatus(currentData.avgCpk, thresholds),
        trend,
        sampleCount: currentData.count,
        lastUpdated: currentData.lastUpdated,
        thresholds: { warning: thresholds.cpkWarning, critical: thresholds.cpkCritical },
      };
    }),

  // Get OEE realtime
  getOeeRealtime: publicProcedure
    .input(z.object({ widgetId: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const config = input?.widgetId ? widgetConfigs.get(input.widgetId) : null;
      const thresholds = config?.thresholds || { cpkWarning: 1.33, cpkCritical: 1.0, oeeWarning: 70, oeeCritical: 50 };
      const oeeData = generateMockOeeData();

      return {
        oee: oeeData.oee,
        availability: oeeData.availability,
        performance: oeeData.performance,
        quality: oeeData.quality,
        status: getOeeStatus(oeeData.oee, thresholds),
        lastUpdated: oeeData.lastUpdated,
        thresholds: { warning: thresholds.oeeWarning, critical: thresholds.oeeCritical },
      };
    }),

  // Get active alerts
  getActiveAlerts: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit || 10;
      const alertTypes = ['cpk', 'spc_rule', 'oee', 'iot'] as const;
      const severities = ['warning', 'critical'] as const;

      const alerts = Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, i) => ({
        id: i + 1,
        type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
        severity: severities[Math.floor(Math.random() * severities.length)],
        title: `Alert ${i + 1}`,
        message: `Alert message ${i + 1}`,
        source: `Machine ${Math.floor(Math.random() * 10) + 1}`,
        createdAt: Date.now() - Math.floor(Math.random() * 3600000),
        isRead: Math.random() > 0.5,
      }));

      return { alerts: alerts.slice(0, limit), total: alerts.length, unreadCount: alerts.filter(a => !a.isRead).length, lastUpdated: Date.now() };
    }),

  // Get quick stats
  getQuickStats: publicProcedure.query(async () => {
    const cpkData = generateMockCpkData();
    const oeeData = generateMockOeeData();
    const thresholds = { cpkWarning: 1.33, cpkCritical: 1.0, oeeWarning: 70, oeeCritical: 50 };

    return {
      cpk: { value: cpkData.avgCpk, status: getCpkStatus(cpkData.avgCpk, thresholds) },
      oee: { value: oeeData.oee, status: getOeeStatus(oeeData.oee, thresholds) },
      activeMachines: Math.floor(Math.random() * 20) + 10,
      activeAlerts: Math.floor(Math.random() * 10),
      samplesProcessed: Math.floor(Math.random() * 1000) + 500,
      lastUpdated: Date.now(),
    };
  }),

  // Get widget data
  getWidgetData: publicProcedure
    .input(z.object({ widgetId: z.string() }))
    .query(async ({ input }) => {
      const config = widgetConfigs.get(input.widgetId);
      if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: 'Widget config not found' });
      const thresholds = config.thresholds;

      if (config.type === 'cpk_summary') {
        const cpkData = generateMockCpkData();
        return { type: 'cpk_summary', data: { avgCpk: cpkData.avgCpk, status: getCpkStatus(cpkData.avgCpk, thresholds) }, config, lastUpdated: Date.now() };
      }
      if (config.type === 'oee_realtime') {
        const oeeData = generateMockOeeData();
        return { type: 'oee_realtime', data: { oee: oeeData.oee, status: getOeeStatus(oeeData.oee, thresholds) }, config, lastUpdated: Date.now() };
      }
      if (config.type === 'alerts') {
        return { type: 'alerts', data: { total: Math.floor(Math.random() * 10), unreadCount: Math.floor(Math.random() * 5) }, config, lastUpdated: Date.now() };
      }
      const cpkData = generateMockCpkData();
      const oeeData = generateMockOeeData();
      return { type: 'quick_stats', data: { cpk: cpkData.avgCpk, oee: oeeData.oee }, config, lastUpdated: Date.now() };
    }),

  // Get embed URL
  getEmbedUrl: protectedProcedure
    .input(z.object({ widgetId: z.string() }))
    .query(async ({ input }) => {
      const config = widgetConfigs.get(input.widgetId);
      if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: 'Widget config not found' });
      const token = Buffer.from(JSON.stringify({ widgetId: input.widgetId, exp: Date.now() + 86400000 })).toString('base64');
      return {
        embedUrl: `/embed/widget/${input.widgetId}?token=${token}`,
        iframeCode: `<iframe src="/embed/widget/${input.widgetId}?token=${token}" width="400" height="300"></iframe>`,
        token,
        expiresAt: Date.now() + 86400000,
      };
    }),
});

export default widgetDataRouter;
