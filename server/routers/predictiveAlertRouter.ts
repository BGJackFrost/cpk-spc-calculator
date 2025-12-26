/**
 * Predictive Alert Router
 * API endpoints cho cấu hình ngưỡng cảnh báo tự động
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import {
  getActiveThresholds,
  getThresholdById,
  createThreshold,
  updateThreshold,
  deleteThreshold,
  checkThresholdAlerts,
  getAlertHistory,
  acknowledgeAlert,
  resolveAlert,
  autoAdjustThresholds,
  getAdjustmentLogs,
  runAlertCheck,
  ThresholdConfig,
} from '../services/predictiveAlertService';
import { getProductionLines } from '../db';

export const predictiveAlertRouter = router({
  // Get all thresholds
  getThresholds: protectedProcedure
    .input(z.object({
      includeInactive: z.boolean().optional().default(false),
    }).optional())
    .query(async ({ input }) => {
      const thresholds = await getActiveThresholds();
      const lines = await getProductionLines();
      
      return thresholds.map(t => ({
        ...t,
        productionLineName: t.productionLineId
          ? lines.find(l => l.id === t.productionLineId)?.name || 'Unknown'
          : 'Tất cả dây chuyền',
      }));
    }),

  // Get threshold by ID
  getThreshold: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const threshold = await getThresholdById(input.id);
      if (!threshold) {
        throw new Error('Không tìm thấy cấu hình ngưỡng');
      }
      
      const lines = await getProductionLines();
      return {
        ...threshold,
        productionLineName: threshold.productionLineId
          ? lines.find(l => l.id === threshold.productionLineId)?.name || 'Unknown'
          : 'Tất cả dây chuyền',
      };
    }),

  // Create new threshold
  createThreshold: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      productionLineId: z.number().nullable().optional(),
      predictionType: z.enum(['oee', 'defect_rate', 'both']).optional().default('both'),
      oeeWarningThreshold: z.number().min(0).max(100).optional().default(75),
      oeeCriticalThreshold: z.number().min(0).max(100).optional().default(65),
      oeeDeclineThreshold: z.number().min(0).max(100).optional().default(5),
      defectWarningThreshold: z.number().min(0).max(100).optional().default(3),
      defectCriticalThreshold: z.number().min(0).max(100).optional().default(5),
      defectIncreaseThreshold: z.number().min(0).max(100).optional().default(20),
      autoAdjustEnabled: z.boolean().optional().default(false),
      autoAdjustSensitivity: z.enum(['low', 'medium', 'high']).optional().default('medium'),
      autoAdjustPeriodDays: z.number().min(7).max(365).optional().default(30),
      emailAlertEnabled: z.boolean().optional().default(true),
      alertEmails: z.array(z.string().email()).optional(),
      alertFrequency: z.enum(['immediate', 'hourly', 'daily']).optional().default('immediate'),
    }))
    .mutation(async ({ input }) => {
      const id = await createThreshold(input);
      return { id, success: true };
    }),

  // Update threshold
  updateThreshold: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      productionLineId: z.number().nullable().optional(),
      predictionType: z.enum(['oee', 'defect_rate', 'both']).optional(),
      oeeWarningThreshold: z.number().min(0).max(100).optional(),
      oeeCriticalThreshold: z.number().min(0).max(100).optional(),
      oeeDeclineThreshold: z.number().min(0).max(100).optional(),
      defectWarningThreshold: z.number().min(0).max(100).optional(),
      defectCriticalThreshold: z.number().min(0).max(100).optional(),
      defectIncreaseThreshold: z.number().min(0).max(100).optional(),
      autoAdjustEnabled: z.boolean().optional(),
      autoAdjustSensitivity: z.enum(['low', 'medium', 'high']).optional(),
      autoAdjustPeriodDays: z.number().min(7).max(365).optional(),
      emailAlertEnabled: z.boolean().optional(),
      alertEmails: z.array(z.string().email()).optional(),
      alertFrequency: z.enum(['immediate', 'hourly', 'daily']).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const success = await updateThreshold(id, data);
      return { success };
    }),

  // Delete threshold
  deleteThreshold: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const success = await deleteThreshold(input.id);
      return { success };
    }),

  // Check alerts for a threshold
  checkAlerts: protectedProcedure
    .input(z.object({
      thresholdId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const threshold = await getThresholdById(input.thresholdId);
      if (!threshold) {
        throw new Error('Không tìm thấy cấu hình ngưỡng');
      }
      return await checkThresholdAlerts(threshold);
    }),

  // Run alert check for all thresholds
  runAlertCheck: protectedProcedure
    .mutation(async () => {
      return await runAlertCheck();
    }),

  // Get alert history
  getAlertHistory: protectedProcedure
    .input(z.object({
      thresholdId: z.number().optional(),
      productionLineId: z.number().optional(),
      status: z.enum(['pending', 'sent', 'acknowledged', 'resolved']).optional(),
      severity: z.enum(['warning', 'critical', 'info']).optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }).optional())
    .query(async ({ input }) => {
      return await getAlertHistory(input || {});
    }),

  // Acknowledge alert
  acknowledgeAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const success = await acknowledgeAlert(input.alertId, ctx.user?.id || 0);
      return { success };
    }),

  // Resolve alert
  resolveAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
      notes: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const success = await resolveAlert(input.alertId, ctx.user?.id || 0, input.notes);
      return { success };
    }),

  // Trigger auto-adjust for a threshold
  triggerAutoAdjust: protectedProcedure
    .input(z.object({
      thresholdId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const threshold = await getThresholdById(input.thresholdId);
      if (!threshold) {
        throw new Error('Không tìm thấy cấu hình ngưỡng');
      }
      // Temporarily enable auto-adjust for this run
      const tempThreshold = { ...threshold, autoAdjustEnabled: true };
      return await autoAdjustThresholds(tempThreshold);
    }),

  // Get adjustment logs
  getAdjustmentLogs: protectedProcedure
    .input(z.object({
      thresholdId: z.number(),
      limit: z.number().min(1).max(100).optional().default(20),
    }))
    .query(async ({ input }) => {
      return await getAdjustmentLogs(input.thresholdId, input.limit);
    }),

  // List all thresholds (alias for getThresholds)
  listThresholds: protectedProcedure
    .query(async () => {
      const thresholds = await getActiveThresholds();
      return thresholds;
    }),

  // Get forecast history for accuracy comparison
  getForecastHistory: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(365).optional().default(30),
      metricType: z.enum(['cpk', 'oee', 'defect_rate']).optional(),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { getForecastHistoryData } = await import('../services/predictiveAlertService');
      return await getForecastHistoryData(input);
    }),

  // Get summary statistics
  getSummary: protectedProcedure
    .query(async () => {
      const thresholds = await getActiveThresholds();
      const history = await getAlertHistory({ limit: 100 });
      
      const pendingAlerts = history.filter(h => h.status === 'pending').length;
      const criticalAlerts = history.filter(h => h.severity === 'critical' && h.status !== 'resolved').length;
      const warningAlerts = history.filter(h => h.severity === 'warning' && h.status !== 'resolved').length;
      
      const recentAlerts = history.slice(0, 10).map(h => ({
        id: h.id,
        title: h.title,
        severity: h.severity,
        status: h.status,
        createdAt: h.createdAt,
      }));

      return {
        totalThresholds: thresholds.length,
        activeThresholds: thresholds.filter(t => t.isActive).length,
        autoAdjustEnabled: thresholds.filter(t => t.autoAdjustEnabled).length,
        pendingAlerts,
        criticalAlerts,
        warningAlerts,
        recentAlerts,
      };
    }),
});

export type PredictiveAlertRouter = typeof predictiveAlertRouter;
