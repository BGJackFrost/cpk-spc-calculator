/**
 * Anomaly Detection Router
 * API endpoints cho Isolation Forest anomaly detection
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as anomalyDetectionService from "../services/anomalyDetectionService";

export const anomalyDetectionRouter = router({
  // Get all models
  listModels: publicProcedure.query(async () => {
    return anomalyDetectionService.getAllModels();
  }),

  // Get model by ID
  getModel: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return anomalyDetectionService.getModelById(input.id);
    }),

  // Create model
  createModel: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      targetType: z.enum(['device', 'device_group', 'production_line', 'global']),
      targetId: z.number().optional(),
      sensorType: z.string().optional(),
      numTrees: z.number().optional(),
      sampleSize: z.number().optional(),
      contamination: z.number().optional(),
      maxDepth: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return anomalyDetectionService.createModel(input);
    }),

  // Train model
  trainModel: protectedProcedure
    .input(z.object({
      modelId: z.number(),
      values: z.array(z.number()).optional(),
      startTime: z.number().optional(),
      endTime: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { modelId, ...trainingData } = input;
      return anomalyDetectionService.trainModel(modelId, trainingData);
    }),

  // Detect anomalies
  detect: publicProcedure
    .input(z.object({
      modelId: z.number(),
      dataPoints: z.array(z.object({
        timestamp: z.number(),
        value: z.number(),
        deviceId: z.number().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      return anomalyDetectionService.detectAnomalies(input.modelId, input.dataPoints);
    }),

  // Get recent anomalies
  recentAnomalies: publicProcedure
    .input(z.object({
      modelId: z.number().optional(),
      deviceId: z.number().optional(),
      severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return anomalyDetectionService.getRecentAnomalies(input);
    }),

  // Get anomaly statistics
  stats: publicProcedure
    .input(z.object({
      modelId: z.number().optional(),
      deviceId: z.number().optional(),
      startTime: z.number().optional(),
      endTime: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return anomalyDetectionService.getAnomalyStats(input);
    }),
});
