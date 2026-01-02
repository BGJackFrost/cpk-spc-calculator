import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { 
  aiTrainingDatasets, 
  aiTrainingJobs, 
  aiTrainingHistory,
  aiTrainedModels 
} from "../../../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";

/**
 * AI Training Router
 * Handles datasets, training jobs, and training history
 */
export const trainingRouter = router({
  /**
   * List all datasets
   */
  listDatasets: protectedProcedure
    .input(
      z.object({
        datasetType: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      const datasets = await db
        .select()
        .from(aiTrainingDatasets)
        .orderBy(desc(aiTrainingDatasets.createdAt))
        .limit(input?.limit || 50);
      
      return {
        datasets,
        total: datasets.length,
      };
    }),

  /**
   * Get dataset by ID
   */
  getDataset: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const dataset = await db
        .select()
        .from(aiTrainingDatasets)
        .where(eq(aiTrainingDatasets.id, input.id))
        .limit(1);
      
      if (!dataset || dataset.length === 0) {
        throw new Error("Dataset not found");
      }
      
      return dataset[0];
    }),

  /**
   * Upload/Create new dataset
   */
  createDataset: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        filePath: z.string(),
        fileUrl: z.string().optional(),
        fileSize: z.number(),
        datasetType: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const result = await db.insert(aiTrainingDatasets).values({
        name: input.name,
        description: input.description,
        filePath: input.filePath,
        fileUrl: input.fileUrl,
        fileSize: input.fileSize,
        datasetType: input.datasetType,
        createdBy: ctx.user.id,
      });
      
      return {
        success: true,
        datasetId: result[0].insertId,
        message: "Dataset created successfully",
      };
    }),

  /**
   * List all training jobs
   */
  listJobs: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).optional(),
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      
      let query = db.select().from(aiTrainingJobs);
      
      if (input?.status) {
        query = query.where(eq(aiTrainingJobs.status, input.status)) as any;
      }
      
      const jobs = await query
        .orderBy(desc(aiTrainingJobs.createdAt))
        .limit(input?.limit || 50);
      
      return {
        jobs,
        total: jobs.length,
      };
    }),

  /**
   * Get training job by ID
   */
  getJob: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const job = await db
        .select()
        .from(aiTrainingJobs)
        .where(eq(aiTrainingJobs.id, input.id))
        .limit(1);
      
      if (!job || job.length === 0) {
        throw new Error("Training job not found");
      }
      
      return job[0];
    }),

  /**
   * Start a new training job
   */
  startJob: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        datasetId: z.number().optional(),
        modelType: z.enum(["cpk_forecast", "anomaly_detection", "root_cause", "quality_prediction", "custom"]),
        algorithm: z.string(),
        hyperparameters: z.record(z.string(), z.any()).optional(),
        totalEpochs: z.number().default(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await db.insert(aiTrainingJobs).values({
        jobId,
        name: input.name,
        description: input.description,
        modelType: input.modelType,
        algorithm: input.algorithm,
        hyperparameters: JSON.stringify(input.hyperparameters || {}),
        status: "pending",
        progress: 0,
        currentEpoch: 0,
        totalEpochs: input.totalEpochs,
        createdBy: ctx.user.id,
      });
      
      // Simulate starting the job
      setTimeout(async () => {
        await db
          .update(aiTrainingJobs)
          .set({ 
            status: "running",
            startedAt: new Date().toISOString(),
          })
          .where(eq(aiTrainingJobs.id, result[0].insertId));
      }, 1000);
      
      return {
        success: true,
        jobId: result[0].insertId,
        message: "Training job started",
      };
    }),

  /**
   * Get training job status and progress
   */
  getJobStatus: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const job = await db
        .select()
        .from(aiTrainingJobs)
        .where(eq(aiTrainingJobs.id, input.jobId))
        .limit(1);
      
      if (!job || job.length === 0) {
        throw new Error("Job not found");
      }
      
      return {
        jobId: input.jobId,
        status: job[0].status,
        progress: job[0].progress,
        currentEpoch: job[0].currentEpoch,
        totalEpochs: job[0].totalEpochs,
        startedAt: job[0].startedAt,
        completedAt: job[0].completedAt,
        errorMessage: job[0].errorMessage,
      };
    }),

  /**
   * Get training history for a job
   */
  getJobHistory: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const history = await db
        .select()
        .from(aiTrainingHistory)
        .where(eq(aiTrainingHistory.trainingJobId, input.jobId))
        .orderBy(aiTrainingHistory.epoch);
      
      return {
        history,
        total: history.length,
      };
    }),

  /**
   * Stop/Cancel a running training job
   */
  stopJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      await db
        .update(aiTrainingJobs)
        .set({ 
          status: "cancelled",
          completedAt: new Date().toISOString(),
        })
        .where(eq(aiTrainingJobs.id, input.jobId));
      
      return {
        success: true,
        message: "Training job cancelled",
      };
    }),

  /**
   * Get training statistics
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    
    const allJobs = await db.select().from(aiTrainingJobs);
    const completedJobs = allJobs.filter(j => j.status === "completed");
    const runningJobs = allJobs.filter(j => j.status === "running");
    const failedJobs = allJobs.filter(j => j.status === "failed");
    
    const allModels = await db.select().from(aiTrainedModels);
    const activeModels = allModels.filter(m => m.status === "active");
    
    return {
      totalJobs: allJobs.length,
      completedJobs: completedJobs.length,
      runningJobs: runningJobs.length,
      failedJobs: failedJobs.length,
      totalModels: allModels.length,
      activeModels: activeModels.length,
      avgAccuracy: activeModels.length > 0
        ? activeModels.reduce((sum, m) => sum + (m.accuracy || 0), 0) / activeModels.length
        : 0,
    };
  }),

  /**
   * Get recent training jobs
   */
  getRecentJobs: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const jobs = await db
        .select()
        .from(aiTrainingJobs)
        .orderBy(desc(aiTrainingJobs.createdAt))
        .limit(input.limit);
      
      return {
        jobs,
        total: jobs.length,
      };
    }),
});
