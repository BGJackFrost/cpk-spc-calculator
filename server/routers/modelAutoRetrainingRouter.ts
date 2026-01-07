/**
 * Model Auto-Retraining Router
 * API endpoints cho Model Auto-Retraining
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as retrainingService from "../services/modelAutoRetrainingService";

export const modelAutoRetrainingRouter = router({
  // Get all retraining configs
  getConfigs: protectedProcedure.query(async () => {
    return retrainingService.getAllRetrainingConfigs();
  }),

  // Get retraining config by ID
  getConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return retrainingService.getRetrainingConfigById(input.id);
    }),

  // Create retraining config
  createConfig: protectedProcedure
    .input(z.object({
      modelId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      accuracyThreshold: z.number().min(0).max(1).optional(),
      f1ScoreThreshold: z.number().min(0).max(1).optional(),
      driftThreshold: z.number().min(0).max(1).optional(),
      minSamplesSinceLastTrain: z.number().min(1).optional(),
      maxDaysSinceLastTrain: z.number().min(1).optional(),
      checkIntervalHours: z.number().min(1).optional(),
      trainingWindowDays: z.number().min(1).optional(),
      minTrainingSamples: z.number().min(1).optional(),
      validationSplit: z.number().min(0.1).max(0.5).optional(),
      notifyOnRetrain: z.boolean().optional(),
      notifyOnFailure: z.boolean().optional(),
      notificationEmails: z.array(z.string().email()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return retrainingService.createRetrainingConfig({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),

  // Toggle retraining config
  toggleConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      isEnabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      return retrainingService.toggleRetrainingConfig(input.id, input.isEnabled);
    }),

  // Check if model needs retraining
  checkModel: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .query(async ({ input }) => {
      const config = await retrainingService.getRetrainingConfigById(input.configId);
      if (!config) return { needsRetraining: false, error: 'Config not found' };
      return retrainingService.checkModelNeedsRetraining(config);
    }),

  // Get retraining history
  getHistory: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      modelId: z.number().optional(),
      status: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return retrainingService.getRetrainingHistory(input);
    }),

  // Cancel retraining
  cancel: protectedProcedure
    .input(z.object({ historyId: z.number() }))
    .mutation(async ({ input }) => {
      return retrainingService.cancelRetraining(input.historyId);
    }),

  // Get retraining stats
  getStats: protectedProcedure.query(async () => {
    return retrainingService.getRetrainingStats();
  }),
});
