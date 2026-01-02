import { z } from 'zod';
import { publicProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import { aiTrainedModels, aiTrainingJobs } from '../../../drizzle/schema';
import { eq, desc, and, gte } from 'drizzle-orm';

/**
 * Health Monitoring Router - AI/ML System Health
 * 
 * Procedures:
 * - getSystemHealth: Get overall AI system health metrics
 * - getModelHealth: Get health metrics for specific model
 * - getDriftMetrics: Get data drift metrics over time
 */

export const healthMonitoringRouter = router({
  /**
   * Get overall system health
   */
  getSystemHealth: publicProcedure.query(async () => {
    const db = await getDb();
    
    // Get active models count
    const activeModels = await db
      .select()
      .from(aiTrainedModels)
      .where(eq(aiTrainedModels.status, 'active'));
    
    // Get running jobs count
    const runningJobs = await db
      .select()
      .from(aiTrainingJobs)
      .where(eq(aiTrainingJobs.status, 'running'));
    
    // Get recent completed jobs (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCompletedJobs = await db
      .select()
      .from(aiTrainingJobs)
      .where(
        and(
          eq(aiTrainingJobs.status, 'completed'),
          gte(aiTrainingJobs.completedAt, sevenDaysAgo)
        )
      );
    
    // Get recent failed jobs (last 7 days)
    const recentFailedJobs = await db
      .select()
      .from(aiTrainingJobs)
      .where(
        and(
          eq(aiTrainingJobs.status, 'failed'),
          gte(aiTrainingJobs.completedAt, sevenDaysAgo)
        )
      );
    
    // Calculate average accuracy of active models
    const avgAccuracy = activeModels.length > 0
      ? activeModels.reduce((sum, m) => sum + (m.accuracy || 0), 0) / activeModels.length
      : 0;
    
    // Calculate system health score (0-100)
    const healthScore = Math.min(100, Math.max(0, Math.round(
      (activeModels.length > 0 ? 30 : 0) + // Has active models
      ((avgAccuracy || 0) * 40) + // Average model accuracy (handle null/undefined)
      (runningJobs.length > 0 ? 15 : 0) + // Has running jobs
      (recentFailedJobs.length === 0 ? 15 : Math.max(0, 15 - recentFailedJobs.length * 3)) // Low failure rate
    )));
    
    return {
      healthScore,
      status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
      metrics: {
        activeModels: activeModels.length,
        runningJobs: runningJobs.length,
        completedJobsLast7Days: recentCompletedJobs.length,
        failedJobsLast7Days: recentFailedJobs.length,
        avgModelAccuracy: avgAccuracy,
      },
      timestamp: new Date(),
    };
  }),

  /**
   * Get model health metrics
   */
  getModelHealth: publicProcedure
    .input(z.object({
      modelId: z.number().optional(),
      modelType: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      let models;
      if (input.modelId) {
        models = await db
          .select()
          .from(aiTrainedModels)
          .where(eq(aiTrainedModels.id, input.modelId));
      } else if (input.modelType) {
        models = await db
          .select()
          .from(aiTrainedModels)
          .where(eq(aiTrainedModels.modelType, input.modelType))
          .orderBy(desc(aiTrainedModels.createdAt))
          .limit(10);
      } else {
        models = await db
          .select()
          .from(aiTrainedModels)
          .where(eq(aiTrainedModels.status, 'active'))
          .orderBy(desc(aiTrainedModels.createdAt))
          .limit(10);
      }
      
      return models.map(model => {
        const metrics = model.metrics ? JSON.parse(model.metrics) : {};
        const healthScore = Math.round((model.accuracy || 0) * 100);
        
      return {
        id: model.id,
        name: model.modelName || `Model ${model.id}`,
        type: model.modelType || 'unknown',
        status: model.status || 'unknown',
        accuracy: model.accuracy || 0,
        loss: model.loss || 0,
        valAccuracy: model.valAccuracy || 0,
        valLoss: model.valLoss || 0,
        metrics,
        healthScore,
        healthStatus: healthScore >= 85 ? 'healthy' : healthScore >= 70 ? 'warning' : 'critical',
        lastUpdated: model.updatedAt || model.createdAt,
      };
      });
    }),

  /**
   * Get data drift metrics
   */
  getDriftMetrics: publicProcedure
    .input(z.object({
      modelType: z.string().optional(),
      days: z.number().min(1).max(90).default(30),
    }))
    .query(async ({ input }) => {
      // Mock drift data (in production, this would come from a drift detection service)
      const daysAgo = input.days;
      const driftData = [];
      
      for (let i = daysAgo; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const drift = Math.random() * 0.15; // Random drift 0-15%
        const threshold = 0.1; // 10% threshold
        
        driftData.push({
          date: date.toISOString().split('T')[0],
          drift,
          threshold,
          status: drift > threshold ? 'warning' : 'normal',
        });
      }
      
      return {
        modelType: input.modelType || 'all',
        days: daysAgo,
        data: driftData,
        summary: {
          avgDrift: driftData.reduce((sum, d) => sum + d.drift, 0) / driftData.length,
          maxDrift: Math.max(...driftData.map(d => d.drift)),
          driftEventsCount: driftData.filter(d => d.status === 'warning').length,
        },
      };
    }),

  /**
   * Get prediction latency metrics
   */
  getLatencyMetrics: publicProcedure
    .input(z.object({
      modelId: z.number().optional(),
      hours: z.number().min(1).max(168).default(24),
    }))
    .query(async ({ input }) => {
      // Mock latency data (in production, this would come from prediction logs)
      const hoursAgo = input.hours;
      const latencyData = [];
      
      for (let i = hoursAgo; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
        const avgLatency = 50 + Math.random() * 100; // 50-150ms
        const p95Latency = avgLatency * 1.5;
        const p99Latency = avgLatency * 2;
        
        latencyData.push({
          timestamp: timestamp.toISOString(),
          avgLatency,
          p95Latency,
          p99Latency,
          requestCount: Math.floor(Math.random() * 1000) + 100,
        });
      }
      
      return {
        modelId: input.modelId,
        hours: hoursAgo,
        data: latencyData,
        summary: {
          avgLatency: latencyData.reduce((sum, d) => sum + d.avgLatency, 0) / latencyData.length,
          p95Latency: latencyData.reduce((sum, d) => sum + d.p95Latency, 0) / latencyData.length,
          p99Latency: latencyData.reduce((sum, d) => sum + d.p99Latency, 0) / latencyData.length,
          totalRequests: latencyData.reduce((sum, d) => sum + d.requestCount, 0),
        },
      };
    }),

  /**
   * Get resource utilization metrics
   */
  getResourceMetrics: publicProcedure.query(async () => {
    // Mock resource data (in production, this would come from system monitoring)
    return {
      cpu: {
        usage: 45 + Math.random() * 20, // 45-65%
        cores: 8,
        available: 8,
      },
      memory: {
        usage: 60 + Math.random() * 15, // 60-75%
        total: 32, // GB
        used: 20 + Math.random() * 5,
        available: 12 - Math.random() * 5,
      },
      gpu: {
        usage: 30 + Math.random() * 40, // 30-70%
        count: 2,
        memory: {
          total: 16, // GB
          used: 8 + Math.random() * 4,
          available: 8 - Math.random() * 4,
        },
      },
      disk: {
        usage: 55 + Math.random() * 10, // 55-65%
        total: 500, // GB
        used: 275 + Math.random() * 50,
        available: 225 - Math.random() * 50,
      },
      timestamp: new Date(),
    };
  }),
});
