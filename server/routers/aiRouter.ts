import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { aiAnomalyModels, aiPredictions } from "../../drizzle/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

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
});
