import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { 
  aiTrainedModels,
  aiTrainingJobs,
  aiPredictions,
} from "../../../drizzle/schema";
import { eq, desc, and, gte, count } from "drizzle-orm";

/**
 * AI Analytics Router
 * Handles dashboard statistics, insights, and trends
 */
export const analyticsRouter = router({
  /**
   * Get dashboard overview statistics
   */
  getDashboardStats: protectedProcedure.query(async () => {
    const db = await getDb();
    
    // Get all models
    const allModels = await db.select().from(aiTrainedModels);
    const activeModels = allModels.filter(m => m.status === "active");
    const inactiveModels = allModels.filter(m => m.status === "inactive");
    
    // Get training jobs
    const allJobs = await db.select().from(aiTrainingJobs);
    const runningJobs = allJobs.filter(j => j.status === "running");
    const completedJobs = allJobs.filter(j => j.status === "completed");
    const failedJobs = allJobs.filter(j => j.status === "failed");
    
    // Get predictions
    const allPredictions = await db.select().from(aiPredictions);
    const recentPredictions = allPredictions.filter(
      p => new Date(p.createdAt!).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
    );
    
    // Calculate average accuracy (convert string to number)
    const avgAccuracy = activeModels.length > 0
      ? activeModels.reduce((sum, m) => sum + (parseFloat(m.accuracy as any) || 0), 0) / activeModels.length
      : 0;
    
    return {
      // Flat structure to match frontend expectations
      totalModels: allModels.length,
      activeModels: activeModels.length,
      inactiveModels: inactiveModels.length,
      avgAccuracy: parseFloat(avgAccuracy.toFixed(4)),
      totalPredictions: allPredictions.length,
      recentPredictions: recentPredictions.length,
      trainingModels: runningJobs.length,
      totalJobs: allJobs.length,
      runningJobs: runningJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
    };
  }),

  /**
   * Get model usage distribution
   */
  getModelUsageDistribution: protectedProcedure.query(async () => {
    const db = await getDb();
    
    const models = await db.select().from(aiTrainedModels);
    
    // Group by model type
    const distribution = models.reduce((acc, model) => {
      const type = model.modelType || "unknown";
      if (!acc[type]) {
        acc[type] = { type, count: 0, predictions: 0 };
      }
      acc[type].count++;
      acc[type].predictions += model.predictionCount || 0;
      return acc;
    }, {} as Record<string, { type: string; count: number; predictions: number }>);
    
    return Object.values(distribution);
  }),

  /**
   * Get training progress over time
   */
  getTrainingProgress: protectedProcedure
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      const cutoffDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      
      const jobs = await db
        .select()
        .from(aiTrainingJobs)
        .where(gte(aiTrainingJobs.createdAt, cutoffDate.toISOString()))
        .orderBy(aiTrainingJobs.createdAt);
      
      // Group by date
      const progressByDate = jobs.reduce((acc, job) => {
        const date = job.createdAt?.split("T")[0] || "";
        if (!acc[date]) {
          acc[date] = { date, completed: 0, failed: 0, running: 0 };
        }
        if (job.status === "completed") acc[date].completed++;
        if (job.status === "failed") acc[date].failed++;
        if (job.status === "running") acc[date].running++;
        return acc;
      }, {} as Record<string, { date: string; completed: number; failed: number; running: number }>);
      
      return Object.values(progressByDate);
    }),

  /**
   * Get model performance trends
   */
  getPerformanceTrends: protectedProcedure
    .input(
      z.object({
        modelId: z.number().optional(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      const cutoffDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      
      let query = db
        .select()
        .from(aiPredictions)
        .where(gte(aiPredictions.createdAt, cutoffDate.toISOString()));
      
      if (input.modelId) {
        query = query.where(
          and(
            gte(aiPredictions.createdAt, cutoffDate.toISOString()),
            eq(aiPredictions.modelId, input.modelId)
          )
        ) as any;
      }
      
      const predictions = await query.orderBy(aiPredictions.createdAt);
      
      // Group by date and calculate metrics
      const trendsByDate = predictions.reduce((acc, pred) => {
        const date = pred.createdAt?.split("T")[0] || "";
        if (!acc[date]) {
          acc[date] = { 
            date, 
            totalPredictions: 0, 
            avgConfidence: 0, 
            confidenceSum: 0 
          };
        }
        acc[date].totalPredictions++;
        const confidence = pred.confidence || 0;
        acc[date].confidenceSum += confidence;
        acc[date].avgConfidence = acc[date].confidenceSum / acc[date].totalPredictions;
        return acc;
      }, {} as Record<string, { date: string; totalPredictions: number; avgConfidence: number; confidenceSum: number }>);
      
      return Object.values(trendsByDate).map(({ confidenceSum, ...rest }) => rest);
    }),

  /**
   * Get AI alerts
   * TODO: Implement after creating aiAlerts table
   */
  /*
  getAlerts: protectedProcedure
    .input(
      z.object({
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        limit: z.number().default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      let query = db.select().from(aiAlerts);
      
      if (input?.severity) {
        query = query.where(eq(aiAlerts.severity, input.severity)) as any;
      }
      
      const alerts = await query
        .orderBy(desc(aiAlerts.createdAt))
        .limit(input?.limit || 20);
      
      return {
        alerts,
        total: alerts.length,
      };
    }),
  */

  /**
   * Get quick insights
   */
  getQuickInsights: protectedProcedure.query(async () => {
    const db = await getDb();
    
    const models = await db.select().from(aiTrainedModels);
    const jobs = await db.select().from(aiTrainingJobs);
    const predictions = await db.select().from(aiPredictions);
    
    const insights = [];
    
    // Insight 1: Model performance
    const activeModels = models.filter(m => m.status === "active");
    if (activeModels.length > 0) {
      const avgAccuracy = activeModels.reduce((sum, m) => sum + (m.accuracy || 0), 0) / activeModels.length;
      insights.push({
        type: "performance",
        title: "Model Performance",
        message: `Average accuracy across ${activeModels.length} active models: ${(avgAccuracy * 100).toFixed(2)}%`,
        severity: avgAccuracy > 0.9 ? "success" : avgAccuracy > 0.7 ? "warning" : "error",
      });
    }
    
    // Insight 2: Training status
    const runningJobs = jobs.filter(j => j.status === "running");
    if (runningJobs.length > 0) {
      insights.push({
        type: "training",
        title: "Active Training",
        message: `${runningJobs.length} training job(s) currently in progress`,
        severity: "info",
      });
    }
    
    // Insight 3: Recent predictions
    const recentPredictions = predictions.filter(
      p => new Date(p.createdAt!).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    if (recentPredictions.length > 0) {
      insights.push({
        type: "predictions",
        title: "Recent Activity",
        message: `${recentPredictions.length} predictions made in the last 24 hours`,
        severity: "info",
      });
    }
    
    // Insight 4: Failed jobs
    const failedJobs = jobs.filter(j => j.status === "failed");
    if (failedJobs.length > 0) {
      insights.push({
        type: "error",
        title: "Failed Training Jobs",
        message: `${failedJobs.length} training job(s) have failed. Review and retry.`,
        severity: "error",
      });
    }
    
    return insights;
  }),

  /**
   * Get model comparison data
   */
  compareModels: protectedProcedure
    .input(
      z.object({
        modelIds: z.array(z.number()).min(2).max(5),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      const models = await db
        .select()
        .from(aiTrainedModels)
        .where(
          input.modelIds.length > 0
            ? eq(aiTrainedModels.id, input.modelIds[0])
            : undefined as any
        );
      
      return models.map(model => ({
        id: model.id,
        name: model.name,
        version: model.version,
        accuracy: model.accuracy,
        precisionScore: model.precisionScore,
        recallScore: model.recallScore,
        f1Score: model.f1Score,
        mse: model.mse,
        mae: model.mae,
        r2Score: model.r2Score,
        predictionCount: model.predictionCount,
        lastUsedAt: model.lastUsedAt,
      }));
    }),
});
