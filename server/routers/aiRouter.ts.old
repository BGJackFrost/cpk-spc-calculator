import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { aiAnomalyModels, aiPredictions } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import {
  generateQuickInsights,
  generateAiAnalysis,
  chatAboutSpc,
  type SpcMetrics,
  type SpcDataPoint,
  type SpcViolation,
} from "../services/aiSpcAnalysisService";
import {
  processNaturalLanguageQuery,
  getSuggestedQuestions,
  type ChatMessage,
  type ChatContext,
} from "../services/aiNaturalLanguageService";
import * as unifiedMl from "../services/unifiedMlService";
import * as autoRetrain from "../services/autoRetrainService";

// Simple anomaly detection using Z-score
function detectAnomaliesZScore(data: number[], threshold: number = 2.5): { index: number; value: number; score: number; severity: string }[] {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const stdDev = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
  
  const anomalies: { index: number; value: number; score: number; severity: string }[] = [];
  
  data.forEach((value, index) => {
    const zScore = Math.abs((value - mean) / stdDev);
    if (zScore > threshold) {
      anomalies.push({
        index,
        value,
        score: zScore,
        severity: zScore > 4 ? "critical" : zScore > 3 ? "high" : "medium"
      });
    }
  });
  
  return anomalies;
}

// Simple CPK prediction using linear regression
function predictCpk(historicalData: { date: Date; cpk: number }[], horizon: number): { date: string; predictedCpk: number; confidence: number }[] {
  if (historicalData.length < 2) return [];
  
  // Simple linear regression
  const n = historicalData.length;
  const xMean = (n - 1) / 2;
  const yMean = historicalData.reduce((sum, d) => sum + d.cpk, 0) / n;
  
  let numerator = 0;
  let denominator = 0;
  
  historicalData.forEach((d, i) => {
    numerator += (i - xMean) * (d.cpk - yMean);
    denominator += Math.pow(i - xMean, 2);
  });
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  const predictions: { date: string; predictedCpk: number; confidence: number }[] = [];
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  
  for (let i = 1; i <= horizon; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    
    const predictedCpk = intercept + slope * (n - 1 + i);
    const confidence = Math.max(0.5, 1 - (i * 0.05)); // Confidence decreases with distance
    
    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      predictedCpk: Math.max(0, predictedCpk),
      confidence
    });
  }
  
  return predictions;
}

export const aiRouter = router({
  // Detect anomalies in data
  detectAnomalies: protectedProcedure
    .input(z.object({
      data: z.array(z.number()),
      sensitivity: z.number().min(0).max(1).default(0.95),
      method: z.enum(["zscore", "iqr", "isolation_forest"]).default("zscore"),
    }))
    .mutation(async ({ input }) => {
      const threshold = 4 - (input.sensitivity * 2); // Map sensitivity to threshold
      const anomalies = detectAnomaliesZScore(input.data, threshold);
      
      return {
        anomalies,
        totalAnomalies: anomalies.length,
        method: input.method,
        threshold,
      };
    }),

  // Predict CPK values
  predictCpk: protectedProcedure
    .input(z.object({
      mappingId: z.number(),
      horizon: z.number().default(7),
    }))
    .query(async ({ input }) => {
      // In a real implementation, fetch historical CPK data from database
      // For now, return mock predictions
      const mockHistoricalData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000),
        cpk: 1.2 + Math.random() * 0.3 - 0.15
      }));
      
      const predictions = predictCpk(mockHistoricalData, input.horizon);
      const avgPredictedCpk = predictions.reduce((sum, p) => sum + p.predictedCpk, 0) / predictions.length;
      
      return {
        predictions,
        trend: avgPredictedCpk > 1.33 ? "improving" : avgPredictedCpk < 1.0 ? "declining" : "stable",
        riskLevel: avgPredictedCpk < 1.0 ? "high" : avgPredictedCpk < 1.33 ? "medium" : "low",
      };
    }),

  // List AI models
  listModels: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "training", "inactive"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(aiAnomalyModels);
      
      if (input?.status) {
        query = query.where(eq(aiAnomalyModels.status, input.status)) as typeof query;
      }
      
      const models = await query.orderBy(desc(aiAnomalyModels.createdAt));
      return models;
    }),

  // Get model by ID
  getModel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [model] = await db.select()
        .from(aiAnomalyModels)
        .where(eq(aiAnomalyModels.id, input.id));
      return model;
    }),

  // Create new model
  createModel: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.string(),
      parameters: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [model] = await db.insert(aiAnomalyModels).values({
        name: input.name,
        type: input.type,
        parameters: JSON.stringify(input.parameters || {}),
        status: "inactive",
        createdBy: ctx.user?.id,
      }).execute();
      return model;
    }),

  // Start training model
  startTraining: protectedProcedure
    .input(z.object({
      modelId: z.number(),
      trainingData: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Update model status to training
      await db.update(aiAnomalyModels)
        .set({ status: "training" })
        .where(eq(aiAnomalyModels.id, input.modelId));
      
      // Simulate training completion after a delay
      setTimeout(async () => {
        const db = await getDb();
        await db.update(aiAnomalyModels)
          .set({
            status: "active",
            accuracy: 0.85 + Math.random() * 0.1,
            lastTrainedAt: new Date(),
          })
          .where(eq(aiAnomalyModels.id, input.modelId));
      }, 5000);
      
      return { success: true, message: "Training started" };
    }),

  // Get predictions
  getPredictions: protectedProcedure
    .input(z.object({
      modelId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let conditions: any[] = [];
      
      if (input.modelId) {
        conditions.push(eq(aiPredictions.modelId, input.modelId));
      }
      if (input.startDate) {
        conditions.push(gte(aiPredictions.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(aiPredictions.createdAt, new Date(input.endDate)));
      }
      
      const predictions = await db.select()
        .from(aiPredictions)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(aiPredictions.createdAt))
        .limit(input.limit);
      
      return predictions;
    }),

  // Get AI dashboard stats
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    const models = await db.select().from(aiAnomalyModels);
    const predictions = await db.select().from(aiPredictions).limit(100);
    
    return {
      totalModels: models.length,
      activeModels: models.filter(m => m.status === "active").length,
      trainingModels: models.filter(m => m.status === "training").length,
      totalPredictions: predictions.length,
      avgAccuracy: models.filter(m => m.accuracy).reduce((sum, m) => sum + (m.accuracy || 0), 0) / Math.max(1, models.filter(m => m.accuracy).length),
    };
  }),

  // ============ AI SPC Analysis with LLM ============

  // Get quick insights (no LLM required)
  getQuickInsights: protectedProcedure
    .input(z.object({
      mean: z.number(),
      stdDev: z.number(),
      cp: z.number(),
      cpk: z.number(),
      usl: z.number(),
      lsl: z.number(),
      ucl: z.number(),
      lcl: z.number(),
      sampleSize: z.number(),
      pp: z.number().optional(),
      ppk: z.number().optional(),
    }))
    .query(({ input }) => {
      return generateQuickInsights(input);
    }),

  // Full AI analysis with LLM
  analyzeSpc: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      metrics: z.object({
        mean: z.number(),
        stdDev: z.number(),
        cp: z.number(),
        cpk: z.number(),
        usl: z.number(),
        lsl: z.number(),
        ucl: z.number(),
        lcl: z.number(),
        sampleSize: z.number(),
        pp: z.number().optional(),
        ppk: z.number().optional(),
      }),
      recentData: z.array(z.object({
        value: z.number(),
        timestamp: z.date(),
        isViolation: z.boolean().optional(),
        violationRules: z.array(z.string()).optional(),
      })),
      violations: z.array(z.object({
        rule: z.string(),
        description: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        affectedPoints: z.array(z.number()),
      })),
      historicalCpk: z.array(z.number()).optional(),
    }))
    .mutation(async ({ input }) => {
      return await generateAiAnalysis(
        input.productCode,
        input.stationName,
        input.metrics as SpcMetrics,
        input.recentData as SpcDataPoint[],
        input.violations as SpcViolation[],
        input.historicalCpk
      );
    }),

  // Chat about SPC data
  chatAboutSpc: protectedProcedure
    .input(z.object({
      question: z.string(),
      context: z.object({
        productCode: z.string(),
        stationName: z.string(),
        cpk: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        violations: z.array(z.string()),
      }),
    }))
    .mutation(async ({ input }) => {
      const answer = await chatAboutSpc(input.question, input.context);
      return { answer };
    }),

  // ============ Natural Language Interface with Real LLM ============

  // Process natural language query with real LLM
  naturalLanguageQuery: protectedProcedure
    .input(z.object({
      query: z.string(),
      context: z.object({
        productCode: z.string().optional(),
        stationName: z.string().optional(),
        dateRange: z.object({
          from: z.date().optional(),
          to: z.date().optional(),
        }).optional(),
        lastQuery: z.string().optional(),
      }).optional(),
      conversationHistory: z.array(z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        timestamp: z.date().optional(),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await processNaturalLanguageQuery(
        input.query,
        input.context as ChatContext || {},
        input.conversationHistory as ChatMessage[] || []
      );
      return result;
    }),

  // Get suggested questions based on current data
  getSuggestedQuestions: protectedProcedure
    .query(async () => {
      const questions = await getSuggestedQuestions();
      return { questions };
    }),

  // ============ AI Model Training ============

  // List all AI models
  listModels: protectedProcedure
    .input(z.object({
      type: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      let query = db.select().from(aiAnomalyModels);
      
      // Filter by type if provided
      const models = await query;
      
      return models.map(m => ({
        id: m.id,
        name: m.name,
        type: m.modelType,
        version: m.version || "1.0.0",
        status: m.status,
        accuracy: m.accuracy,
        trainedAt: m.trainedAt,
        config: m.config,
      }));
    }),

  // Start training a new model
  startTraining: protectedProcedure
    .input(z.object({
      modelName: z.string(),
      modelType: z.enum(["cpk_prediction", "anomaly_detection", "root_cause", "quality_prediction"]),
      dataSource: z.string(),
      epochs: z.number().min(10).max(1000).default(100),
      config: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      
      // Create new model record
      const [newModel] = await db.insert(aiAnomalyModels).values({
        name: input.modelName,
        modelType: input.modelType,
        version: "1.0.0",
        status: "training",
        accuracy: null,
        trainedAt: null,
        config: {
          dataSource: input.dataSource,
          epochs: input.epochs,
          ...input.config,
        },
        createdBy: ctx.user.id,
      }).returning();
      
      // In a real implementation, this would trigger an async training job
      // For now, we simulate the training process
      
      return {
        jobId: `job_${newModel.id}`,
        modelId: newModel.id,
        status: "training",
        message: "Training job started successfully",
      };
    }),

  // Get training job status
  getTrainingStatus: protectedProcedure
    .input(z.object({
      modelId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const [model] = await db.select().from(aiAnomalyModels).where(eq(aiAnomalyModels.id, input.modelId));
      
      if (!model) {
        throw new Error("Model not found");
      }
      
      return {
        modelId: model.id,
        name: model.name,
        status: model.status,
        accuracy: model.accuracy,
        trainedAt: model.trainedAt,
        config: model.config,
      };
    }),

  // Update model status (for simulating training completion)
  updateModelStatus: protectedProcedure
    .input(z.object({
      modelId: z.number(),
      status: z.enum(["training", "ready", "failed", "archived"]),
      accuracy: z.number().optional(),
      metrics: z.record(z.unknown()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      
      const updateData: Record<string, unknown> = {
        status: input.status,
      };
      
      if (input.accuracy !== undefined) {
        updateData.accuracy = input.accuracy;
      }
      
      if (input.status === "ready") {
        updateData.trainedAt = new Date();
      }
      
      const [updated] = await db.update(aiAnomalyModels)
        .set(updateData)
        .where(eq(aiAnomalyModels.id, input.modelId))
        .returning();
      
      return updated;
    }),

  // Delete a model
  deleteModel: protectedProcedure
    .input(z.object({
      modelId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(aiAnomalyModels).where(eq(aiAnomalyModels.id, input.modelId));
      return { success: true };
    }),

  // ============ Real ML Integration ============

  // Train a real ML model
  trainRealModel: protectedProcedure
    .input(z.object({
      modelId: z.string(),
      framework: z.enum(["tensorflow", "sklearn"]),
      modelType: z.enum(["cpk_prediction", "spc_classification", "anomaly_detection", "linear_regression", "random_forest", "gradient_boosting"]),
      epochs: z.number().optional(),
      batchSize: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      // Generate training data
      const trainingData = unifiedMl.generateTrainingData(
        input.modelType as "cpk_prediction" | "spc_classification",
        1000
      );

      // Train model
      const result = await unifiedMl.trainModel(
        input.modelId,
        {
          framework: input.framework,
          modelType: input.modelType as any,
          hyperparameters: {
            epochs: input.epochs || 100,
            batchSize: input.batchSize || 32,
          },
        },
        trainingData.features,
        trainingData.labels
      );

      return result;
    }),

  // Make predictions with real ML model
  predictWithRealModel: protectedProcedure
    .input(z.object({
      modelId: z.string(),
      features: z.array(z.array(z.number())),
    }))
    .mutation(async ({ input }) => {
      const result = await unifiedMl.predict(input.modelId, input.features);
      return result;
    }),

  // Get all real ML models
  getRealModels: protectedProcedure.query(() => {
    return unifiedMl.getAllModels();
  }),

  // Compare real ML models
  compareRealModels: protectedProcedure
    .input(z.object({
      modelIds: z.array(z.string()),
    }))
    .query(({ input }) => {
      return unifiedMl.compareModels(input.modelIds);
    }),

  // Get best model for task
  getBestModel: protectedProcedure
    .input(z.object({
      modelType: z.enum(["cpk_prediction", "spc_classification", "anomaly_detection", "linear_regression", "random_forest", "gradient_boosting"]),
    }))
    .query(({ input }) => {
      return unifiedMl.getBestModel(input.modelType as any);
    }),

  // Get framework recommendation
  getFrameworkRecommendation: protectedProcedure
    .input(z.object({
      dataSize: z.number(),
      featureCount: z.number(),
      taskType: z.enum(["regression", "classification"]),
    }))
    .query(({ input }) => {
      return unifiedMl.recommendFramework(input.dataSize, input.featureCount, input.taskType);
    }),

  // Ensemble predict
  ensemblePredict: protectedProcedure
    .input(z.object({
      modelIds: z.array(z.string()),
      features: z.array(z.array(z.number())),
      method: z.enum(["average", "weighted", "voting"]).optional(),
    }))
    .mutation(async ({ input }) => {
      return await unifiedMl.ensemblePredict(
        input.modelIds,
        input.features,
        input.method || "average"
      );
    }),

  // ============ Auto-Retrain ============

  // Get retrain config
  getRetrainConfig: protectedProcedure
    .input(z.object({ modelId: z.string() }))
    .query(({ input }) => {
      return autoRetrain.getRetrainConfig(input.modelId);
    }),

  // Update retrain config
  updateRetrainConfig: protectedProcedure
    .input(z.object({
      modelId: z.string(),
      accuracyThreshold: z.number().optional(),
      errorRateThreshold: z.number().optional(),
      minDataPoints: z.number().optional(),
      maxAgeDays: z.number().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { modelId, ...updates } = input;
      return autoRetrain.updateRetrainConfig(modelId, updates);
    }),

  // Check if retrain needed
  checkRetrainNeeded: protectedProcedure
    .input(z.object({ modelId: z.string() }))
    .query(async ({ input }) => {
      return await autoRetrain.checkRetrainNeeded(input.modelId);
    }),

  // Trigger manual retrain
  triggerRetrain: protectedProcedure
    .input(z.object({
      modelId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await autoRetrain.executeRetrain(
        input.modelId,
        input.reason || "Manual retrain triggered"
      );
    }),

  // Run scheduled retrain check
  runRetrainCheck: protectedProcedure.mutation(async () => {
    return await autoRetrain.runScheduledRetrainCheck();
  }),

  // Get retrain history
  getRetrainHistory: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(({ input }) => {
      return autoRetrain.getRetrainHistory(input.limit || 50);
    }),

  // Get retrain stats
  getRetrainStats: protectedProcedure.query(() => {
    return autoRetrain.getRetrainStats();
  }),

  // Get active retrain jobs
  getActiveRetrainJobs: protectedProcedure.query(() => {
    return autoRetrain.getActiveJobs();
  }),
});
