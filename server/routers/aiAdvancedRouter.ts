/**
 * AI Advanced Router
 * API endpoints cho A/B Testing, Model Versioning và Data Drift Detection
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { abTestingService, type ABTestStatus } from "../services/abTestingService";
import { modelVersioningService, type RollbackType } from "../services/modelVersioningService";
import { dataDriftService, type AlertStatus, type DriftSeverity } from "../services/dataDriftService";

export const aiAdvancedRouter = router({
  // ========== A/B Testing ==========
  abTest: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        modelAId: z.number(),
        modelBId: z.number(),
        trafficSplitA: z.number().min(0).max(100).default(50),
        trafficSplitB: z.number().min(0).max(100).default(50),
        minSampleSize: z.number().default(1000),
        confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await abTestingService.createTest({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    start: protectedProcedure
      .input(z.object({ testId: z.number() }))
      .mutation(async ({ input }) => {
        return await abTestingService.startTest(input.testId);
      }),

    pause: protectedProcedure
      .input(z.object({ testId: z.number() }))
      .mutation(async ({ input }) => {
        return await abTestingService.pauseTest(input.testId);
      }),

    complete: protectedProcedure
      .input(z.object({ testId: z.number(), winnerId: z.number().optional() }))
      .mutation(async ({ input }) => {
        return await abTestingService.completeTest(input.testId, input.winnerId);
      }),

    cancel: protectedProcedure
      .input(z.object({ testId: z.number() }))
      .mutation(async ({ input }) => {
        return await abTestingService.cancelTest(input.testId);
      }),

    get: protectedProcedure
      .input(z.object({ testId: z.number() }))
      .query(async ({ input }) => {
        return await abTestingService.getTest(input.testId);
      }),

    list: protectedProcedure
      .input(z.object({
        status: z.enum(['draft', 'running', 'paused', 'completed', 'cancelled']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await abTestingService.listTests({
          status: input.status as ABTestStatus,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    getRunning: protectedProcedure
      .query(async () => {
        return await abTestingService.getRunningTests();
      }),

    getStats: protectedProcedure
      .input(z.object({ testId: z.number() }))
      .query(async ({ input }) => {
        return await abTestingService.getTestStats(input.testId);
      }),

    compare: protectedProcedure
      .input(z.object({ testId: z.number() }))
      .query(async ({ input }) => {
        return await abTestingService.compareModels(input.testId);
      }),

    recordResult: protectedProcedure
      .input(z.object({
        testId: z.number(),
        variant: z.enum(['A', 'B']),
        predictionId: z.number(),
        predictedValue: z.number(),
        actualValue: z.number().optional(),
        isCorrect: z.boolean().optional(),
        responseTimeMs: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await abTestingService.recordResult(input);
      }),

    selectModel: protectedProcedure
      .input(z.object({ testId: z.number() }))
      .query(async ({ input }) => {
        const test = await abTestingService.getTest(input.testId);
        if (!test) throw new Error("Test not found");
        return abTestingService.selectModelForPrediction(test);
      }),
  }),

  // ========== Model Versioning ==========
  modelVersion: router({
    create: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        accuracy: z.number().optional(),
        precision: z.number().optional(),
        recall: z.number().optional(),
        f1Score: z.number().optional(),
        meanAbsoluteError: z.number().optional(),
        rootMeanSquaredError: z.number().optional(),
        trainingDataSize: z.number().optional(),
        validationDataSize: z.number().optional(),
        hyperparameters: z.record(z.any()).optional(),
        featureImportance: z.record(z.number()).optional(),
        changeLog: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await modelVersioningService.createVersion({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    get: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .query(async ({ input }) => {
        return await modelVersioningService.getVersion(input.versionId);
      }),

    getActive: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        return await modelVersioningService.getActiveVersion(input.modelId);
      }),

    list: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        includeRetired: z.boolean().default(false),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await modelVersioningService.listVersions(input.modelId, {
          includeRetired: input.includeRetired,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    deploy: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await modelVersioningService.deployVersion(input.versionId, ctx.user.id);
      }),

    rollback: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        toVersionId: z.number(),
        reason: z.string(),
        rollbackType: z.enum(['manual', 'automatic']).default('manual'),
      }))
      .mutation(async ({ input, ctx }) => {
        return await modelVersioningService.rollback(
          input.modelId,
          input.toVersionId,
          input.reason,
          ctx.user.id,
          input.rollbackType as RollbackType
        );
      }),

    retire: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ input }) => {
        return await modelVersioningService.retireVersion(input.versionId);
      }),

    restore: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ input }) => {
        return await modelVersioningService.restoreVersion(input.versionId);
      }),

    compare: protectedProcedure
      .input(z.object({
        versionAId: z.number(),
        versionBId: z.number(),
      }))
      .query(async ({ input }) => {
        return await modelVersioningService.compareVersions(input.versionAId, input.versionBId);
      }),

    getRollbackHistory: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await modelVersioningService.getRollbackHistory(input.modelId, {
          limit: input.limit,
          offset: input.offset,
        });
      }),

    getPerformanceTrend: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        metric: z.string().default('accuracy'),
      }))
      .query(async ({ input }) => {
        return await modelVersioningService.getPerformanceTrend(input.modelId, input.metric);
      }),
  }),

  // ========== Data Drift Detection ==========
  drift: router({
    createConfig: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        accuracyDropThreshold: z.number().min(0).max(1).default(0.05),
        featureDriftThreshold: z.number().min(0).max(1).default(0.1),
        predictionDriftThreshold: z.number().min(0).max(1).default(0.1),
        monitoringWindowHours: z.number().default(24),
        alertCooldownMinutes: z.number().default(60),
        autoRollbackEnabled: z.boolean().default(false),
        autoRollbackThreshold: z.number().min(0).max(1).default(0.15),
        notifyOwner: z.boolean().default(true),
        notifyEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await dataDriftService.createConfig({
          ...input,
          createdBy: ctx.user.id,
        });
      }),

    getConfig: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        return await dataDriftService.getConfig(input.modelId);
      }),

    updateConfig: protectedProcedure
      .input(z.object({
        configId: z.number(),
        accuracyDropThreshold: z.number().min(0).max(1).optional(),
        featureDriftThreshold: z.number().min(0).max(1).optional(),
        predictionDriftThreshold: z.number().min(0).max(1).optional(),
        monitoringWindowHours: z.number().optional(),
        alertCooldownMinutes: z.number().optional(),
        autoRollbackEnabled: z.boolean().optional(),
        autoRollbackThreshold: z.number().min(0).max(1).optional(),
        notifyOwner: z.boolean().optional(),
        notifyEmail: z.string().email().optional(),
      }))
      .mutation(async ({ input }) => {
        const { configId, ...updates } = input;
        return await dataDriftService.updateConfig(configId, updates);
      }),

    detectDrift: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        accuracy: z.number(),
        features: z.record(z.array(z.number())).optional(),
      }))
      .mutation(async ({ input }) => {
        return await dataDriftService.detectDrift(input.modelId, {
          accuracy: input.accuracy,
          features: input.features,
        });
      }),

    runMonitoringCheck: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        accuracy: z.number(),
        features: z.record(z.array(z.number())).optional(),
      }))
      .mutation(async ({ input }) => {
        return await dataDriftService.runMonitoringCheck(input.modelId, {
          accuracy: input.accuracy,
          features: input.features,
        });
      }),

    // Alert Management
    getActiveAlerts: protectedProcedure
      .input(z.object({ modelId: z.number().optional() }))
      .query(async ({ input }) => {
        return await dataDriftService.getActiveAlerts(input.modelId);
      }),

    listAlerts: protectedProcedure
      .input(z.object({
        modelId: z.number().optional(),
        status: z.enum(['active', 'acknowledged', 'resolved', 'ignored']).optional(),
        severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await dataDriftService.listAlerts({
          modelId: input.modelId,
          status: input.status as AlertStatus,
          severity: input.severity as DriftSeverity,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    acknowledgeAlert: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        return await dataDriftService.acknowledgeAlert(input.alertId, ctx.user.id);
      }),

    resolveAlert: protectedProcedure
      .input(z.object({
        alertId: z.number(),
        resolution: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await dataDriftService.resolveAlert(input.alertId, input.resolution, ctx.user.id);
      }),

    ignoreAlert: protectedProcedure
      .input(z.object({
        alertId: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await dataDriftService.ignoreAlert(input.alertId, input.reason);
      }),

    // Metrics & Statistics
    recordMetrics: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        accuracy: z.number(),
        precision: z.number().optional(),
        recall: z.number().optional(),
        f1Score: z.number().optional(),
        predictionCount: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await dataDriftService.recordMetrics(input.modelId, input);
      }),

    getMetricsHistory: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        hours: z.number().default(24),
      }))
      .query(async ({ input }) => {
        return await dataDriftService.getMetricsHistory(input.modelId, input.hours);
      }),

    saveFeatureStatistics: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        featureName: z.string(),
        data: z.array(z.number()),
        isBaseline: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const stats = dataDriftService.calculateFeatureStats(input.data);
        return await dataDriftService.saveFeatureStatistics(
          input.modelId,
          input.featureName,
          stats,
          input.isBaseline
        );
      }),

    getBaselineStats: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        featureName: z.string(),
      }))
      .query(async ({ input }) => {
        return await dataDriftService.getBaselineStats(input.modelId, input.featureName);
      }),

    getDashboardStats: protectedProcedure
      .input(z.object({ modelId: z.number().optional() }))
      .query(async ({ input }) => {
        return await dataDriftService.getDashboardStats(input.modelId);
      }),
  }),
});
