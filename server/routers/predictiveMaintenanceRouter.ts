/**
 * Predictive Maintenance Router
 * API endpoints cho dự đoán bảo trì thiết bị với AI
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createPredictionModel,
  getPredictionModels,
  getPredictionModelById,
  updatePredictionModel,
  deletePredictionModel,
  getMaintenancePredictions,
  getMaintenancePredictionById,
  acknowledgePrediction,
  resolvePrediction,
  recordDeviceHealthHistory,
  getDeviceHealthHistory,
  analyzeDeviceHealth,
  generatePredictionWithLLM,
  runPredictiveAnalysis,
  getPredictiveMaintenanceStats,
} from "../services/predictiveMaintenanceService";

// Admin procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const predictiveMaintenanceRouter = router({
  // ============================================
  // Prediction Model APIs
  // ============================================

  // List prediction models
  listModels: protectedProcedure
    .input(
      z.object({
        modelType: z.string().optional(),
        isActive: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getPredictionModels(input);
    }),

  // Get prediction model by ID
  getModel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const model = await getPredictionModelById(input.id);
      if (!model) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prediction model not found" });
      }
      return model;
    }),

  // Create prediction model
  createModel: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        modelType: z.enum([
          "health_decay",
          "failure_prediction",
          "anomaly_detection",
          "remaining_life",
          "maintenance_scheduling",
        ]),
        targetDeviceTypes: z.array(z.string()).optional(),
        targetDeviceIds: z.array(z.number()).optional(),
        targetGroupIds: z.array(z.number()).optional(),
        inputFeatures: z.array(z.string()),
        outputMetric: z.string(),
        algorithm: z
          .enum([
            "linear_regression",
            "random_forest",
            "gradient_boosting",
            "neural_network",
            "lstm",
            "arima",
            "prophet",
          ])
          .optional(),
        hyperparameters: z.any().optional(),
        trainingConfig: z.any().optional(),
        predictionHorizonDays: z.number().optional(),
        confidenceThreshold: z.number().optional(),
        alertThreshold: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await createPredictionModel({
        ...input,
        inputFeatures: input.inputFeatures,
        targetDeviceTypes: input.targetDeviceTypes || null,
        targetDeviceIds: input.targetDeviceIds || null,
        targetGroupIds: input.targetGroupIds || null,
        hyperparameters: input.hyperparameters || null,
        trainingConfig: input.trainingConfig || null,
        confidenceThreshold: input.confidenceThreshold?.toString(),
        alertThreshold: input.alertThreshold?.toString(),
        isActive: 1,
        createdBy: ctx.user.id,
      });
      return { id };
    }),

  // Update prediction model
  updateModel: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        targetDeviceTypes: z.array(z.string()).optional(),
        targetDeviceIds: z.array(z.number()).optional(),
        targetGroupIds: z.array(z.number()).optional(),
        inputFeatures: z.array(z.string()).optional(),
        outputMetric: z.string().optional(),
        algorithm: z
          .enum([
            "linear_regression",
            "random_forest",
            "gradient_boosting",
            "neural_network",
            "lstm",
            "arima",
            "prophet",
          ])
          .optional(),
        hyperparameters: z.any().optional(),
        trainingConfig: z.any().optional(),
        predictionHorizonDays: z.number().optional(),
        confidenceThreshold: z.number().optional(),
        alertThreshold: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, isActive, confidenceThreshold, alertThreshold, ...data } = input;
      await updatePredictionModel(id, {
        ...data,
        ...(confidenceThreshold !== undefined && {
          confidenceThreshold: confidenceThreshold.toString(),
        }),
        ...(alertThreshold !== undefined && { alertThreshold: alertThreshold.toString() }),
        ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
      });
      return { success: true };
    }),

  // Delete prediction model
  deleteModel: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePredictionModel(input.id);
      return { success: true };
    }),

  // Run predictive analysis for a model
  runAnalysis: adminProcedure
    .input(z.object({ modelId: z.number() }))
    .mutation(async ({ input }) => {
      const result = await runPredictiveAnalysis(input.modelId);
      return result;
    }),

  // ============================================
  // Maintenance Prediction APIs
  // ============================================

  // List predictions
  listPredictions: protectedProcedure
    .input(
      z.object({
        deviceId: z.number().optional(),
        modelId: z.number().optional(),
        status: z.string().optional(),
        severity: z.string().optional(),
        limit: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return await getMaintenancePredictions(input);
    }),

  // Get prediction by ID
  getPrediction: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const prediction = await getMaintenancePredictionById(input.id);
      if (!prediction) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Prediction not found" });
      }
      return prediction;
    }),

  // Acknowledge prediction
  acknowledgePrediction: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await acknowledgePrediction(input.id, ctx.user.id);
      return { success: true };
    }),

  // Resolve prediction
  resolvePrediction: adminProcedure
    .input(
      z.object({
        id: z.number(),
        outcome: z.string(),
        wasAccurate: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await resolvePrediction(input.id, input.outcome, input.wasAccurate);
      return { success: true };
    }),

  // ============================================
  // Device Health History APIs
  // ============================================

  // Record health history
  recordHealthHistory: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        healthScore: z.number(),
        availabilityScore: z.number().optional(),
        performanceScore: z.number().optional(),
        qualityScore: z.number().optional(),
        uptimeHours: z.number().optional(),
        downtimeHours: z.number().optional(),
        errorCount: z.number().optional(),
        warningCount: z.number().optional(),
        temperature: z.number().optional(),
        vibration: z.number().optional(),
        powerConsumption: z.number().optional(),
        cycleCount: z.number().optional(),
        operatingHours: z.number().optional(),
        additionalMetrics: z.any().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await recordDeviceHealthHistory({
        ...input,
        healthScore: input.healthScore.toString(),
        availabilityScore: input.availabilityScore?.toString(),
        performanceScore: input.performanceScore?.toString(),
        qualityScore: input.qualityScore?.toString(),
        uptimeHours: input.uptimeHours?.toString(),
        downtimeHours: input.downtimeHours?.toString(),
        temperature: input.temperature?.toString(),
        vibration: input.vibration?.toString(),
        powerConsumption: input.powerConsumption?.toString(),
        operatingHours: input.operatingHours?.toString(),
        recordedAt: new Date().toISOString(),
      });
      return { id };
    }),

  // Get health history for a device
  getHealthHistory: protectedProcedure
    .input(
      z.object({
        deviceId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getDeviceHealthHistory(input.deviceId, {
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
      });
    }),

  // ============================================
  // Analysis APIs
  // ============================================

  // Analyze device health
  analyzeDevice: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      return await analyzeDeviceHealth(input.deviceId);
    }),

  // Generate AI analysis for a device
  generateAIAnalysis: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      const analysis = await analyzeDeviceHealth(input.deviceId);
      const llmAnalysis = await generatePredictionWithLLM(input.deviceId, analysis);
      return {
        analysis,
        llmAnalysis,
      };
    }),

  // ============================================
  // Dashboard APIs
  // ============================================

  // Get statistics
  getStats: protectedProcedure.query(async () => {
    return await getPredictiveMaintenanceStats();
  }),

  // Get predictions summary by severity
  getPredictionsSummary: protectedProcedure.query(async () => {
    const predictions = await getMaintenancePredictions({ status: "active" });

    const summary = {
      critical: predictions.filter((p) => p.severity === "critical"),
      high: predictions.filter((p) => p.severity === "high"),
      medium: predictions.filter((p) => p.severity === "medium"),
      low: predictions.filter((p) => p.severity === "low"),
    };

    return summary;
  }),

  // Get devices requiring immediate attention
  getUrgentDevices: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const predictions = await getMaintenancePredictions({
        status: "active",
        limit: input.limit,
      });

      // Sort by severity and days until maintenance
      const sorted = predictions.sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
        const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] ?? 4;

        if (aSeverity !== bSeverity) return aSeverity - bSeverity;

        const aDays = a.daysUntilMaintenance ?? 999;
        const bDays = b.daysUntilMaintenance ?? 999;
        return aDays - bDays;
      });

      return sorted.slice(0, input.limit);
    }),
});
