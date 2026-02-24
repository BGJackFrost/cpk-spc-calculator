/**
 * AI Training Router
 * API endpoints cho upload datasets và quản lý training jobs
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { aiTrainingDatasets, aiTrainingJobs, aiTrainingHistory } from '../../drizzle/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { storagePut } from '../storage';
import { randomBytes } from 'crypto';

export const aiTrainingRouter = router({
  // ============ Datasets Management ============

  // List all datasets
  listDatasets: protectedProcedure
    .input(z.object({
      datasetType: z.enum(['cpk_forecast', 'anomaly_detection', 'quality_prediction', 'custom']).optional(),
      status: z.enum(['uploaded', 'processing', 'ready', 'failed']).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(aiTrainingDatasets);

      if (input?.datasetType) {
        query = query.where(eq(aiTrainingDatasets.datasetType, input.datasetType)) as typeof query;
      }
      if (input?.status) {
        query = query.where(eq(aiTrainingDatasets.status, input.status)) as typeof query;
      }

      const datasets = await query
        .orderBy(desc(aiTrainingDatasets.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return datasets;
    }),

  // Get dataset by ID
  getDataset: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [dataset] = await db.select()
        .from(aiTrainingDatasets)
        .where(eq(aiTrainingDatasets.id, input.id));
      
      if (!dataset) {
        throw new Error('Dataset not found');
      }
      
      return dataset;
    }),

  // Upload dataset (step 1: create record)
  createDataset: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      datasetType: z.enum(['cpk_forecast', 'anomaly_detection', 'quality_prediction', 'custom']),
      productCode: z.string().optional(),
      workstationId: z.number().optional(),
      machineId: z.number().optional(),
      fixtureId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      // Create dataset record
      const [result] = await db.insert(aiTrainingDatasets).values({
        name: input.name,
        description: input.description,
        datasetType: input.datasetType,
        productCode: input.productCode,
        workstationId: input.workstationId,
        machineId: input.machineId,
        fixtureId: input.fixtureId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        filePath: '', // Will be updated after upload
        status: 'uploaded',
        createdBy: ctx.user?.id,
      });

      return { id: result.insertId, success: true };
    }),

  // Upload dataset file (step 2: upload to S3)
  uploadDatasetFile: protectedProcedure
    .input(z.object({
      datasetId: z.number(),
      fileContent: z.string(), // Base64 encoded file content
      fileName: z.string(),
      fileType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Decode base64 content
      const buffer = Buffer.from(input.fileContent, 'base64');
      
      // Generate unique file path
      const randomSuffix = randomBytes(8).toString('hex');
      const fileKey = `ai-training-datasets/${input.datasetId}/${input.fileName}-${randomSuffix}`;

      // Upload to S3
      const { url } = await storagePut(fileKey, buffer, input.fileType);

      // Parse CSV to get metadata
      const content = buffer.toString('utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      const headers = lines[0]?.split(',') || [];
      
      // Update dataset record
      await db.update(aiTrainingDatasets)
        .set({
          filePath: fileKey,
          fileUrl: url,
          fileSize: buffer.length,
          fileType: input.fileType,
          rowCount: lines.length - 1, // Exclude header
          columnCount: headers.length,
          columnNames: JSON.stringify(headers),
          status: 'ready',
          validationStatus: 'valid',
        })
        .where(eq(aiTrainingDatasets.id, input.datasetId));

      return { success: true, url };
    }),

  // Delete dataset
  deleteDataset: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(aiTrainingDatasets)
        .where(eq(aiTrainingDatasets.id, input.id));
      return { success: true };
    }),

  // ============ Training Jobs Management ============

  // List all training jobs
  listJobs: protectedProcedure
    .input(z.object({
      status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
      modelType: z.enum(['cpk_forecast', 'anomaly_detection', 'root_cause', 'quality_prediction', 'custom']).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(aiTrainingJobs);

      if (input?.status) {
        query = query.where(eq(aiTrainingJobs.status, input.status)) as typeof query;
      }
      if (input?.modelType) {
        query = query.where(eq(aiTrainingJobs.modelType, input.modelType)) as typeof query;
      }

      const jobs = await query
        .orderBy(desc(aiTrainingJobs.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return jobs;
    }),

  // Get job by ID
  getJob: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [job] = await db.select()
        .from(aiTrainingJobs)
        .where(eq(aiTrainingJobs.id, input.id));
      
      if (!job) {
        throw new Error('Training job not found');
      }
      
      return job;
    }),

  // Get training history for a job
  getJobHistory: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const history = await db.select()
        .from(aiTrainingHistory)
        .where(eq(aiTrainingHistory.trainingJobId, input.jobId))
        .orderBy(aiTrainingHistory.epoch);
      
      return history;
    }),

  // Create training job
  createJob: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      modelType: z.enum(['cpk_forecast', 'anomaly_detection', 'root_cause', 'quality_prediction', 'custom']),
      algorithm: z.string(),
      datasetId: z.number(),
      productCode: z.string().optional(),
      workstationId: z.number().optional(),
      machineId: z.number().optional(),
      fixtureId: z.number().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      hyperparameters: z.record(z.string(), z.any()).optional(),
      totalEpochs: z.number().min(1).max(1000).default(100),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Generate unique job ID
      const jobId = `job-${Date.now()}-${randomBytes(4).toString('hex')}`;

      // Create training job
      const [result] = await db.insert(aiTrainingJobs).values({
        jobId,
        name: input.name,
        description: input.description,
        modelType: input.modelType,
        algorithm: input.algorithm,
        dataSource: `dataset-${input.datasetId}`,
        productCode: input.productCode,
        workstationId: input.workstationId,
        machineId: input.machineId,
        fixtureId: input.fixtureId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        hyperparameters: JSON.stringify(input.hyperparameters || {}),
        totalEpochs: input.totalEpochs,
        status: 'pending',
        progress: 0,
        createdBy: ctx.user?.id,
      });

      return { id: result.insertId, jobId, success: true };
    }),

  // Start training job
  startJob: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Update job status to running
      await db.update(aiTrainingJobs)
        .set({
          status: 'running',
          startedAt: new Date().toISOString(),
          progress: 0,
        })
        .where(eq(aiTrainingJobs.id, input.id));

      // Simulate training progress (in real implementation, this would be handled by a background worker)
      simulateTrainingProgress(input.id);

      return { success: true, message: 'Training started' };
    }),

  // Cancel training job
  cancelJob: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      await db.update(aiTrainingJobs)
        .set({
          status: 'cancelled',
          completedAt: new Date().toISOString(),
        })
        .where(eq(aiTrainingJobs.id, input.id));

      return { success: true };
    }),

  // Get training statistics
  getStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      
      const jobs = await db.select().from(aiTrainingJobs);
      const datasets = await db.select().from(aiTrainingDatasets);

      return {
        totalJobs: jobs.length,
        runningJobs: jobs.filter(j => j.status === 'running').length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        totalDatasets: datasets.length,
        readyDatasets: datasets.filter(d => d.status === 'ready').length,
      };
    }),
});

// Simulate training progress (mock implementation)
async function simulateTrainingProgress(jobId: number) {
  const db = await getDb();
  const [job] = await db.select().from(aiTrainingJobs).where(eq(aiTrainingJobs.id, jobId));
  
  if (!job) return;

  const totalEpochs = job.totalEpochs || 100;
  let currentEpoch = 0;

  const interval = setInterval(async () => {
    currentEpoch += 1;
    const progress = Math.round((currentEpoch / totalEpochs) * 100);

    // Generate mock metrics
    const trainingLoss = (1.0 - currentEpoch / totalEpochs) * 0.5 + Math.random() * 0.1;
    const validationLoss = trainingLoss * 1.1 + Math.random() * 0.05;
    const accuracy = 0.5 + (currentEpoch / totalEpochs) * 0.4 + Math.random() * 0.05;

    // Update job progress
    await db.update(aiTrainingJobs)
      .set({
        progress,
        currentEpoch,
        trainingLoss: trainingLoss.toFixed(6),
        validationLoss: validationLoss.toFixed(6),
        accuracy: accuracy.toFixed(4),
      })
      .where(eq(aiTrainingJobs.id, jobId));

    // Save training history
    await db.insert(aiTrainingHistory).values({
      trainingJobId: jobId,
      epoch: currentEpoch,
      trainingLoss: trainingLoss.toFixed(6),
      validationLoss: validationLoss.toFixed(6),
      accuracy: accuracy.toFixed(4),
      learningRate: '0.001',
    });

    // Complete training
    if (currentEpoch >= totalEpochs) {
      clearInterval(interval);
      
      await db.update(aiTrainingJobs)
        .set({
          status: 'completed',
          progress: 100,
          completedAt: new Date().toISOString(),
        })
        .where(eq(aiTrainingJobs.id, jobId));
    }
  }, 2000); // Update every 2 seconds
}

export type AiTrainingRouter = typeof aiTrainingRouter;
