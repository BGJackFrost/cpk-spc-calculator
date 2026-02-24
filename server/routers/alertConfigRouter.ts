/**
 * Alert Config Router - API endpoints cho cấu hình cảnh báo Yield/Defect
 */
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { DEFAULT_THRESHOLDS, type AlertThreshold } from "../services/yieldDefectAlertService";

// In-memory storage for alert thresholds (can be migrated to database later)
const alertThresholdsCache: Map<string, AlertThreshold> = new Map();

export const alertConfigRouter = router({
  // Get yield/defect thresholds
  getYieldDefectThresholds: publicProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const key = input?.productionLineId ? `line_${input.productionLineId}` : 'global';
      const cached = alertThresholdsCache.get(key);
      
      if (cached) {
        return {
          ...cached,
          emailRecipients: cached.emailRecipients || [],
        };
      }
      
      // Return default thresholds if not configured
      return {
        ...DEFAULT_THRESHOLDS,
        emailRecipients: DEFAULT_THRESHOLDS.emailRecipients || [],
      };
    }),

  // Save yield/defect thresholds
  saveYieldDefectThresholds: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      yieldWarningThreshold: z.number().min(0).max(100),
      yieldCriticalThreshold: z.number().min(0).max(100),
      defectWarningThreshold: z.number().min(0).max(100),
      defectCriticalThreshold: z.number().min(0).max(100),
      yieldDropThreshold: z.number().min(0).max(100),
      defectSpikeThreshold: z.number().min(0).max(200),
      cooldownMinutes: z.number().min(1).max(1440),
      enabled: z.boolean(),
      notifyEmail: z.boolean(),
      notifyWebSocket: z.boolean(),
      notifyPush: z.boolean(),
      emailRecipients: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const key = input.productionLineId ? `line_${input.productionLineId}` : 'global';
      
      const threshold: AlertThreshold = {
        productionLineId: input.productionLineId,
        yieldWarningThreshold: input.yieldWarningThreshold,
        yieldCriticalThreshold: input.yieldCriticalThreshold,
        defectWarningThreshold: input.defectWarningThreshold,
        defectCriticalThreshold: input.defectCriticalThreshold,
        yieldDropThreshold: input.yieldDropThreshold,
        defectSpikeThreshold: input.defectSpikeThreshold,
        cooldownMinutes: input.cooldownMinutes,
        enabled: input.enabled,
        notifyEmail: input.notifyEmail,
        notifyWebSocket: input.notifyWebSocket,
        notifyPush: input.notifyPush,
        emailRecipients: input.emailRecipients || [],
      };
      
      alertThresholdsCache.set(key, threshold);
      
      return { success: true };
    }),

  // Delete yield/defect thresholds
  deleteYieldDefectThresholds: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const key = input.productionLineId ? `line_${input.productionLineId}` : 'global';
      alertThresholdsCache.delete(key);
      
      return { success: true };
    }),

  // Get all configured thresholds
  listYieldDefectThresholds: protectedProcedure
    .query(async () => {
      const thresholds: Array<AlertThreshold & { key: string }> = [];
      
      alertThresholdsCache.forEach((value, key) => {
        thresholds.push({ ...value, key });
      });
      
      return thresholds;
    }),

  // Test alert configuration
  testAlert: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      alertType: z.enum(['yield_low', 'yield_critical', 'defect_high', 'defect_critical']),
    }))
    .mutation(async ({ input }) => {
      // Simulate sending a test alert
      console.log(`[AlertConfig] Test alert triggered: ${input.alertType} for line ${input.productionLineId || 'global'}`);
      
      return {
        success: true,
        message: `Test alert "${input.alertType}" đã được gửi thành công`,
      };
    }),
});

export default alertConfigRouter;
