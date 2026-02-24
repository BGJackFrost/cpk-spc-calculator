/**
 * Anomaly Alert Router
 * API endpoints cho Alert System
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import * as anomalyAlertService from "../services/anomalyAlertService";

export const anomalyAlertRouter = router({
  // Get all alert configs
  getConfigs: protectedProcedure.query(async () => {
    return anomalyAlertService.getAllAlertConfigs();
  }),

  // Get alert config by ID
  getConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return anomalyAlertService.getAlertConfigById(input.id);
    }),

  // Create alert config
  createConfig: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      modelId: z.number().optional(),
      deviceId: z.number().optional(),
      productionLineId: z.number().optional(),
      severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      anomalyScoreThreshold: z.number().min(0).max(1).optional(),
      consecutiveAnomalies: z.number().min(1).optional(),
      cooldownMinutes: z.number().min(1).optional(),
      emailEnabled: z.boolean().optional(),
      emailRecipients: z.array(z.string().email()).optional(),
      telegramEnabled: z.boolean().optional(),
      telegramChatIds: z.array(z.string()).optional(),
      slackEnabled: z.boolean().optional(),
      slackWebhookUrl: z.string().url().optional(),
      slackChannel: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return anomalyAlertService.createAlertConfig({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),

  // Update alert config
  updateConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      modelId: z.number().optional(),
      deviceId: z.number().optional(),
      productionLineId: z.number().optional(),
      severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      anomalyScoreThreshold: z.number().min(0).max(1).optional(),
      consecutiveAnomalies: z.number().min(1).optional(),
      cooldownMinutes: z.number().min(1).optional(),
      emailEnabled: z.boolean().optional(),
      emailRecipients: z.array(z.string().email()).optional(),
      telegramEnabled: z.boolean().optional(),
      telegramChatIds: z.array(z.string()).optional(),
      slackEnabled: z.boolean().optional(),
      slackWebhookUrl: z.string().url().optional(),
      slackChannel: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return anomalyAlertService.updateAlertConfig(id, updates);
    }),

  // Delete alert config
  deleteConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return anomalyAlertService.deleteAlertConfig(input.id);
    }),

  // Toggle alert config
  toggleConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      return anomalyAlertService.toggleAlertConfig(input.id, input.isActive);
    }),

  // Get alert history
  getHistory: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      modelId: z.number().optional(),
      deviceId: z.number().optional(),
      severity: z.string().optional(),
      acknowledged: z.boolean().optional(),
      startTime: z.number().optional(),
      endTime: z.number().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return anomalyAlertService.getAlertHistory(input);
    }),

  // Acknowledge alert
  acknowledgeAlert: protectedProcedure
    .input(z.object({
      alertId: z.number(),
      resolution: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return anomalyAlertService.acknowledgeAlert(input.alertId, ctx.user?.id || 0, input.resolution);
    }),

  // Get alert stats
  getStats: protectedProcedure
    .input(z.object({
      startTime: z.number().optional(),
      endTime: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return anomalyAlertService.getAlertStats(input);
    }),
});
