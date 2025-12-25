/**
 * AI Advanced Router
 * API endpoints cho A/B Testing, Model Versioning và Data Drift Detection
 */

import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { abTestingService, type ABTestStatus } from "../services/abTestingService";
import { modelVersioningService, type RollbackType } from "../services/modelVersioningService";
import { dataDriftService, type AlertStatus, type DriftSeverity } from "../services/dataDriftService";
import { webhookNotificationService } from "../services/webhookNotificationService";
import { scheduledDriftCheckService, runScheduledDriftCheck } from "../services/scheduledDriftCheckService";
import {
  generateDriftReportHtml,
  generateDriftReportExcel,
  generateDriftRecommendations,
  type DriftReportData
} from "../services/driftReportExportService";
import {
  calculateAutoScalingThresholds,
  getDefaultThresholdConfig,
  validateThresholdConfig,
  analyzeThresholdEffectiveness,
  suggestOptimalAlgorithm,
  type ThresholdConfig,
  type HistoricalMetrics
} from "../services/autoScalingThresholdService";

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

    getFeatureStatistics: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) return [];
        const { aiFeatureStatistics } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        return await db.select().from(aiFeatureStatistics).where(eq(aiFeatureStatistics.modelId, input.modelId));
      }),

    // Run drift check manually
    runDriftCheck: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .mutation(async ({ input }) => {
        const result = await scheduledDriftCheckService.checkModel(input.modelId, `Model #${input.modelId}`);
        return { alertsCreated: result.alertCreated ? 1 : 0, ...result };
      }),
  }),

  // ========== Webhook Configuration ==========
  webhook: router({
    getConfig: protectedProcedure
      .query(async () => {
        return await webhookNotificationService.getConfig();
      }),

    updateConfig: protectedProcedure
      .input(z.object({
        slackWebhookUrl: z.string().optional(),
        slackChannel: z.string().optional(),
        slackEnabled: z.boolean().optional(),
        teamsWebhookUrl: z.string().optional(),
        teamsEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await webhookNotificationService.updateConfig(input);
      }),

    testSlack: protectedProcedure
      .mutation(async () => {
        return await webhookNotificationService.testWebhook('slack');
      }),

    testTeams: protectedProcedure
      .mutation(async () => {
        return await webhookNotificationService.testWebhook('teams');
      }),

    sendTestAlert: protectedProcedure
      .input(z.object({
        title: z.string(),
        message: z.string(),
        severity: z.enum(['info', 'warning', 'critical']).default('info'),
      }))
      .mutation(async ({ input }) => {
        return await webhookNotificationService.sendNotification({
          title: input.title,
          message: input.message,
          severity: input.severity,
          timestamp: new Date(),
        });
      }),
  }),

  // ========== Scheduled Drift Check ==========
  scheduledCheck: router({
    runNow: protectedProcedure
      .mutation(async () => {
        return await runScheduledDriftCheck();
      }),

    getLastSummary: protectedProcedure
      .query(async () => {
        return await scheduledDriftCheckService.getLastCheckSummary();
      }),

    getModelsWithConfig: protectedProcedure
      .query(async () => {
        return await scheduledDriftCheckService.getModelsWithDriftConfig();
      }),
  }),

  // ========== Drift Report Export ==========
  driftReport: router({
    exportPdf: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        // Get data from database
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { aiDriftMetricsHistory, aiDriftAlerts, aiModels } = await import("../../drizzle/schema");
        const { eq, and, gte, lte, desc } = await import("drizzle-orm");

        // Get model info
        const [model] = await db.select().from(aiModels).where(eq(aiModels.id, input.modelId)).limit(1);
        if (!model) throw new Error("Model not found");

        // Get metrics history
        const metrics = await db.select().from(aiDriftMetricsHistory)
          .where(and(
            eq(aiDriftMetricsHistory.modelId, input.modelId),
            gte(aiDriftMetricsHistory.timestamp, input.startDate),
            lte(aiDriftMetricsHistory.timestamp, input.endDate)
          ))
          .orderBy(desc(aiDriftMetricsHistory.timestamp));

        // Get alerts
        const alerts = await db.select().from(aiDriftAlerts)
          .where(and(
            eq(aiDriftAlerts.modelId, input.modelId),
            gte(aiDriftAlerts.createdAt, input.startDate),
            lte(aiDriftAlerts.createdAt, input.endDate)
          ))
          .orderBy(desc(aiDriftAlerts.createdAt));

        // Calculate summary
        const summary = {
          totalChecks: metrics.length,
          alertsTriggered: alerts.length,
          avgAccuracy: metrics.length > 0 ? metrics.reduce((a, m) => a + Number(m.accuracy || 0), 0) / metrics.length : 0,
          avgAccuracyDrop: metrics.length > 0 ? metrics.reduce((a, m) => a + Number(m.accuracyDrop || 0), 0) / metrics.length : 0,
          avgFeatureDrift: metrics.length > 0 ? metrics.reduce((a, m) => a + Number(m.featureDrift || 0), 0) / metrics.length : 0,
          avgPredictionDrift: metrics.length > 0 ? metrics.reduce((a, m) => a + Number(m.predictionDrift || 0), 0) / metrics.length : 0,
          maxSeverity: alerts.reduce((max, a) => {
            const order = { low: 1, medium: 2, high: 3, critical: 4 };
            return order[a.severity as keyof typeof order] > order[max as keyof typeof order] ? a.severity : max;
          }, 'low') as 'low' | 'medium' | 'high' | 'critical'
        };

        const reportData: DriftReportData = {
          modelId: String(input.modelId),
          modelName: model.name,
          reportPeriod: { startDate: input.startDate, endDate: input.endDate },
          summary,
          metricsHistory: metrics.map(m => ({
            timestamp: m.timestamp,
            accuracy: Number(m.accuracy || 0),
            accuracyDrop: Number(m.accuracyDrop || 0),
            featureDrift: Number(m.featureDrift || 0),
            predictionDrift: Number(m.predictionDrift || 0),
            severity: m.severity || 'low'
          })),
          alerts: alerts.map(a => ({
            id: String(a.id),
            timestamp: a.createdAt,
            alertType: a.alertType,
            severity: a.severity,
            message: a.message,
            acknowledged: a.acknowledged || false,
            resolvedAt: a.resolvedAt || undefined
          })),
          recommendations: []
        };

        reportData.recommendations = generateDriftRecommendations(reportData);
        const html = generateDriftReportHtml(reportData);

        return { html, filename: `drift-report-${model.name}-${Date.now()}.html` };
      }),

    exportExcel: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { aiDriftMetricsHistory, aiDriftAlerts, aiModels } = await import("../../drizzle/schema");
        const { eq, and, gte, lte, desc } = await import("drizzle-orm");

        const [model] = await db.select().from(aiModels).where(eq(aiModels.id, input.modelId)).limit(1);
        if (!model) throw new Error("Model not found");

        const metrics = await db.select().from(aiDriftMetricsHistory)
          .where(and(
            eq(aiDriftMetricsHistory.modelId, input.modelId),
            gte(aiDriftMetricsHistory.timestamp, input.startDate),
            lte(aiDriftMetricsHistory.timestamp, input.endDate)
          ))
          .orderBy(desc(aiDriftMetricsHistory.timestamp));

        const alerts = await db.select().from(aiDriftAlerts)
          .where(and(
            eq(aiDriftAlerts.modelId, input.modelId),
            gte(aiDriftAlerts.createdAt, input.startDate),
            lte(aiDriftAlerts.createdAt, input.endDate)
          ))
          .orderBy(desc(aiDriftAlerts.createdAt));

        const summary = {
          totalChecks: metrics.length,
          alertsTriggered: alerts.length,
          avgAccuracy: metrics.length > 0 ? metrics.reduce((a, m) => a + Number(m.accuracy || 0), 0) / metrics.length : 0,
          avgAccuracyDrop: metrics.length > 0 ? metrics.reduce((a, m) => a + Number(m.accuracyDrop || 0), 0) / metrics.length : 0,
          avgFeatureDrift: metrics.length > 0 ? metrics.reduce((a, m) => a + Number(m.featureDrift || 0), 0) / metrics.length : 0,
          avgPredictionDrift: metrics.length > 0 ? metrics.reduce((a, m) => a + Number(m.predictionDrift || 0), 0) / metrics.length : 0,
          maxSeverity: alerts.reduce((max, a) => {
            const order = { low: 1, medium: 2, high: 3, critical: 4 };
            return order[a.severity as keyof typeof order] > order[max as keyof typeof order] ? a.severity : max;
          }, 'low') as 'low' | 'medium' | 'high' | 'critical'
        };

        const reportData: DriftReportData = {
          modelId: String(input.modelId),
          modelName: model.name,
          reportPeriod: { startDate: input.startDate, endDate: input.endDate },
          summary,
          metricsHistory: metrics.map(m => ({
            timestamp: m.timestamp,
            accuracy: Number(m.accuracy || 0),
            accuracyDrop: Number(m.accuracyDrop || 0),
            featureDrift: Number(m.featureDrift || 0),
            predictionDrift: Number(m.predictionDrift || 0),
            severity: m.severity || 'low'
          })),
          alerts: alerts.map(a => ({
            id: String(a.id),
            timestamp: a.createdAt,
            alertType: a.alertType,
            severity: a.severity,
            message: a.message,
            acknowledged: a.acknowledged || false,
            resolvedAt: a.resolvedAt || undefined
          })),
          recommendations: []
        };

        reportData.recommendations = generateDriftRecommendations(reportData);
        const buffer = await generateDriftReportExcel(reportData);

        return {
          data: buffer.toString('base64'),
          filename: `drift-report-${model.name}-${Date.now()}.xlsx`
        };
      }),
  }),

  // ========== Auto-scaling Threshold ==========
  autoScaling: router({
    getConfig: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) return getDefaultThresholdConfig(String(input.modelId));

        const { aiAutoScalingConfigs } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const [config] = await db.select().from(aiAutoScalingConfigs)
          .where(eq(aiAutoScalingConfigs.modelId, input.modelId)).limit(1);

        if (!config) return getDefaultThresholdConfig(String(input.modelId));

        return {
          modelId: String(config.modelId),
          enabled: config.enabled,
          algorithm: config.algorithm as ThresholdConfig['algorithm'],
          windowSize: config.windowSize,
          sensitivityFactor: Number(config.sensitivityFactor),
          minThreshold: Number(config.minThreshold),
          maxThreshold: Number(config.maxThreshold),
          updateFrequency: config.updateFrequency as ThresholdConfig['updateFrequency'],
          lastUpdated: config.lastUpdated || undefined
        };
      }),

    updateConfig: protectedProcedure
      .input(z.object({
        modelId: z.number(),
        enabled: z.boolean().optional(),
        algorithm: z.enum(['moving_average', 'percentile', 'std_deviation', 'adaptive']).optional(),
        windowSize: z.number().min(10).max(1000).optional(),
        sensitivityFactor: z.number().min(0.1).max(5).optional(),
        minThreshold: z.number().min(0).max(1).optional(),
        maxThreshold: z.number().min(0).max(1).optional(),
        updateFrequency: z.enum(['hourly', 'daily', 'weekly']).optional(),
      }))
      .mutation(async ({ input }) => {
        const errors = validateThresholdConfig(input);
        if (errors.length > 0) throw new Error(errors.join(', '));

        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { aiAutoScalingConfigs } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const [existing] = await db.select().from(aiAutoScalingConfigs)
          .where(eq(aiAutoScalingConfigs.modelId, input.modelId)).limit(1);

        const updateData = {
          enabled: input.enabled,
          algorithm: input.algorithm,
          windowSize: input.windowSize,
          sensitivityFactor: input.sensitivityFactor?.toString(),
          minThreshold: input.minThreshold?.toString(),
          maxThreshold: input.maxThreshold?.toString(),
          updateFrequency: input.updateFrequency,
          updatedAt: new Date()
        };

        if (existing) {
          await db.update(aiAutoScalingConfigs)
            .set(updateData)
            .where(eq(aiAutoScalingConfigs.modelId, input.modelId));
        } else {
          await db.insert(aiAutoScalingConfigs).values({
            modelId: input.modelId,
            ...updateData,
            createdAt: new Date()
          });
        }

        return { success: true };
      }),

    calculateThresholds: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { aiAutoScalingConfigs, aiDriftMetricsHistory } = await import("../../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");

        // Get config
        const [config] = await db.select().from(aiAutoScalingConfigs)
          .where(eq(aiAutoScalingConfigs.modelId, input.modelId)).limit(1);

        const thresholdConfig: ThresholdConfig = config ? {
          modelId: String(config.modelId),
          enabled: config.enabled,
          algorithm: config.algorithm as ThresholdConfig['algorithm'],
          windowSize: config.windowSize,
          sensitivityFactor: Number(config.sensitivityFactor),
          minThreshold: Number(config.minThreshold),
          maxThreshold: Number(config.maxThreshold),
          updateFrequency: config.updateFrequency as ThresholdConfig['updateFrequency']
        } : getDefaultThresholdConfig(String(input.modelId));

        // Get historical metrics
        const metrics = await db.select().from(aiDriftMetricsHistory)
          .where(eq(aiDriftMetricsHistory.modelId, input.modelId))
          .orderBy(desc(aiDriftMetricsHistory.timestamp))
          .limit(thresholdConfig.windowSize);

        const historicalMetrics: HistoricalMetrics[] = metrics.map(m => ({
          timestamp: m.timestamp,
          accuracyDrop: Number(m.accuracyDrop || 0),
          featureDrift: Number(m.featureDrift || 0),
          predictionDrift: Number(m.predictionDrift || 0)
        }));

        const thresholds = calculateAutoScalingThresholds(historicalMetrics, thresholdConfig);

        // Update last calculated thresholds
        if (config) {
          await db.update(aiAutoScalingConfigs)
            .set({
              lastCalculatedThresholds: JSON.stringify(thresholds),
              lastUpdated: new Date()
            })
            .where(eq(aiAutoScalingConfigs.modelId, input.modelId));
        }

        return thresholds;
      }),

    suggestAlgorithm: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) return { algorithm: 'adaptive' as const, reason: 'Default recommendation' };

        const { aiDriftMetricsHistory } = await import("../../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");

        const metrics = await db.select().from(aiDriftMetricsHistory)
          .where(eq(aiDriftMetricsHistory.modelId, input.modelId))
          .orderBy(desc(aiDriftMetricsHistory.timestamp))
          .limit(100);

        const historicalMetrics: HistoricalMetrics[] = metrics.map(m => ({
          timestamp: m.timestamp,
          accuracyDrop: Number(m.accuracyDrop || 0),
          featureDrift: Number(m.featureDrift || 0),
          predictionDrift: Number(m.predictionDrift || 0)
        }));

        return suggestOptimalAlgorithm(historicalMetrics);
      }),

    analyzeEffectiveness: protectedProcedure
      .input(z.object({ modelId: z.number() }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { aiAutoScalingConfigs, aiDriftMetricsHistory, aiDriftAlerts } = await import("../../drizzle/schema");
        const { eq, desc, count } = await import("drizzle-orm");

        const [config] = await db.select().from(aiAutoScalingConfigs)
          .where(eq(aiAutoScalingConfigs.modelId, input.modelId)).limit(1);

        if (!config || !config.lastCalculatedThresholds) {
          return { falsePositiveRate: 0, falseNegativeRate: 0, recommendation: 'Chưa có dữ liệu threshold' };
        }

        const thresholds = JSON.parse(config.lastCalculatedThresholds);

        const metrics = await db.select().from(aiDriftMetricsHistory)
          .where(eq(aiDriftMetricsHistory.modelId, input.modelId))
          .orderBy(desc(aiDriftMetricsHistory.timestamp))
          .limit(100);

        const [alertCount] = await db.select({ count: count() }).from(aiDriftAlerts)
          .where(eq(aiDriftAlerts.modelId, input.modelId));

        const historicalMetrics: HistoricalMetrics[] = metrics.map(m => ({
          timestamp: m.timestamp,
          accuracyDrop: Number(m.accuracyDrop || 0),
          featureDrift: Number(m.featureDrift || 0),
          predictionDrift: Number(m.predictionDrift || 0)
        }));

        return analyzeThresholdEffectiveness(historicalMetrics, thresholds, alertCount?.count || 0);
      }),
  }),

  // ========== Health Dashboard ==========
  healthDashboard: router({
    getOverview: protectedProcedure
      .query(async () => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) return null;

        const { aiModels, aiDriftAlerts, aiDriftMetricsHistory, aiPredictionLogs } = await import("../../drizzle/schema");
        const { count, avg, eq, gte, desc } = await import("drizzle-orm");

        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Get all models
        const models = await db.select().from(aiModels);

        // Get alerts today
        const [alertsToday] = await db.select({ count: count() }).from(aiDriftAlerts)
          .where(gte(aiDriftAlerts.createdAt, dayAgo));

        // Get recent metrics for each model
        const modelStats = await Promise.all(models.map(async (model) => {
          const [latestMetrics] = await db.select().from(aiDriftMetricsHistory)
            .where(eq(aiDriftMetricsHistory.modelId, model.id))
            .orderBy(desc(aiDriftMetricsHistory.timestamp))
            .limit(1);

          const accuracy = latestMetrics ? Number(latestMetrics.accuracy || 0) : 0;
          const driftScore = latestMetrics ? Number(latestMetrics.featureDrift || 0) : 0;

          let status: 'healthy' | 'warning' | 'critical' = 'healthy';
          if (accuracy < 0.7 || driftScore > 0.3) status = 'critical';
          else if (accuracy < 0.85 || driftScore > 0.15) status = 'warning';

          return {
            id: String(model.id),
            name: model.name,
            status,
            accuracy,
            latency: 50 + Math.random() * 50, // Mock latency
            driftScore
          };
        }));

        // Calculate overall health
        const healthyCount = modelStats.filter(m => m.status === 'healthy').length;
        const overallHealth = models.length > 0 ? Math.round((healthyCount / models.length) * 100) : 100;

        // Calculate KPIs
        const avgAccuracy = modelStats.length > 0
          ? modelStats.reduce((a, m) => a + m.accuracy, 0) / modelStats.length
          : 0;
        const avgLatency = modelStats.length > 0
          ? modelStats.reduce((a, m) => a + m.latency, 0) / modelStats.length
          : 0;
        const avgDriftScore = modelStats.length > 0
          ? modelStats.reduce((a, m) => a + m.driftScore, 0) / modelStats.length
          : 0;

        return {
          overallHealth,
          models: modelStats,
          kpis: {
            avgAccuracy,
            avgLatency,
            avgDriftScore,
            totalPredictions: 0, // Would need prediction logs
            activeModels: models.length,
            alertsToday: alertsToday?.count || 0
          }
        };
      }),

    getAccuracyTrend: protectedProcedure
      .input(z.object({
        modelId: z.number().optional(),
        days: z.number().default(7)
      }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) return [];

        const { aiDriftMetricsHistory } = await import("../../drizzle/schema");
        const { gte, desc, eq, and } = await import("drizzle-orm");

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        let query = db.select().from(aiDriftMetricsHistory)
          .where(gte(aiDriftMetricsHistory.timestamp, startDate))
          .orderBy(desc(aiDriftMetricsHistory.timestamp));

        if (input.modelId) {
          query = db.select().from(aiDriftMetricsHistory)
            .where(and(
              eq(aiDriftMetricsHistory.modelId, input.modelId),
              gte(aiDriftMetricsHistory.timestamp, startDate)
            ))
            .orderBy(desc(aiDriftMetricsHistory.timestamp));
        }

        const metrics = await query;

        // Group by date
        const grouped = metrics.reduce((acc, m) => {
          const date = m.timestamp.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          if (!acc[date]) acc[date] = [];
          acc[date].push(Number(m.accuracy || 0));
          return acc;
        }, {} as Record<string, number[]>);

        return Object.entries(grouped).map(([date, values]) => ({
          date,
          accuracy: values.reduce((a, b) => a + b, 0) / values.length
        })).reverse();
      }),

    getDriftTrend: protectedProcedure
      .input(z.object({
        modelId: z.number().optional(),
        days: z.number().default(7)
      }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) return [];

        const { aiDriftMetricsHistory } = await import("../../drizzle/schema");
        const { gte, desc, eq, and } = await import("drizzle-orm");

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        let query = db.select().from(aiDriftMetricsHistory)
          .where(gte(aiDriftMetricsHistory.timestamp, startDate))
          .orderBy(desc(aiDriftMetricsHistory.timestamp));

        if (input.modelId) {
          query = db.select().from(aiDriftMetricsHistory)
            .where(and(
              eq(aiDriftMetricsHistory.modelId, input.modelId),
              gte(aiDriftMetricsHistory.timestamp, startDate)
            ))
            .orderBy(desc(aiDriftMetricsHistory.timestamp));
        }

        const metrics = await query;

        // Group by date
        const grouped = metrics.reduce((acc, m) => {
          const date = m.timestamp.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          if (!acc[date]) acc[date] = [];
          acc[date].push(Number(m.featureDrift || 0));
          return acc;
        }, {} as Record<string, number[]>);

        return Object.entries(grouped).map(([date, values]) => ({
          date,
          drift: values.reduce((a, b) => a + b, 0) / values.length
        })).reverse();
      }),

    getAlertsByType: protectedProcedure
      .input(z.object({ days: z.number().default(7) }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) return [];

        const { aiDriftAlerts } = await import("../../drizzle/schema");
        const { gte, count } = await import("drizzle-orm");

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - input.days);

        const alerts = await db.select().from(aiDriftAlerts)
          .where(gte(aiDriftAlerts.createdAt, startDate));

        // Group by type
        const grouped = alerts.reduce((acc, a) => {
          acc[a.alertType] = (acc[a.alertType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const colors: Record<string, string> = {
          'accuracy_drop': '#ef4444',
          'feature_drift': '#f97316',
          'prediction_drift': '#eab308',
          'latency_high': '#3b82f6'
        };

        return Object.entries(grouped).map(([type, count]) => ({
          type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          count,
          color: colors[type] || '#6b7280'
        }));
      }),

    getRecentAlerts: protectedProcedure
      .input(z.object({ limit: z.number().default(10) }))
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) return [];

        const { aiDriftAlerts, aiModels } = await import("../../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");

        const alerts = await db.select({
          id: aiDriftAlerts.id,
          modelId: aiDriftAlerts.modelId,
          alertType: aiDriftAlerts.alertType,
          severity: aiDriftAlerts.severity,
          message: aiDriftAlerts.message,
          createdAt: aiDriftAlerts.createdAt
        }).from(aiDriftAlerts)
          .orderBy(desc(aiDriftAlerts.createdAt))
          .limit(input.limit);

        // Get model names
        const modelIds = [...new Set(alerts.map(a => a.modelId))];
        const models = await Promise.all(modelIds.map(async (id) => {
          const [model] = await db.select().from(aiModels).where(eq(aiModels.id, id)).limit(1);
          return { id, name: model?.name || `Model #${id}` };
        }));
        const modelMap = Object.fromEntries(models.map(m => [m.id, m.name]));

        return alerts.map(a => {
          const now = new Date();
          const diff = now.getTime() - a.createdAt.getTime();
          const minutes = Math.floor(diff / 60000);
          const hours = Math.floor(diff / 3600000);
          const time = hours > 0 ? `${hours} giờ trước` : `${minutes} phút trước`;

          return {
            id: String(a.id),
            model: modelMap[a.modelId] || `Model #${a.modelId}`,
            type: a.alertType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
            severity: a.severity,
            time,
            message: a.message
          };
        });
      }),
  }),
});
