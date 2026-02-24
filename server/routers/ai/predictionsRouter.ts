import { z } from 'zod';
import { publicProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import { aiTrainedModels, aiModelPredictions } from '../../../drizzle/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

/**
 * Predictions Router - AI Predictions Management
 * 
 * Procedures:
 * - predict: Single prediction
 * - batchPredict: Batch predictions
 * - list: List predictions with filters
 * - get: Get prediction by ID
 * - getHistory: Get prediction history for a model
 * - getMetrics: Get prediction accuracy metrics
 * - export: Export predictions to CSV/JSON
 */

export const predictionsRouter = router({
  /**
   * Single prediction
   */
  predict: publicProcedure
    .input(z.object({
      modelId: z.string(),
      inputData: z.record(z.any()),
      metadata: z.record(z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Get model
      const model = await db.select().from(aiTrainedModels).where(eq(aiTrainedModels.id, input.modelId)).limit(1);
      if (!model || model.length === 0) {
        throw new Error('Model not found');
      }

      // Mock prediction (replace with real ML inference)
      const predictedValue = Math.random() * 2 + 0.5; // CPK between 0.5-2.5
      const confidence = Math.random() * 0.3 + 0.7; // 70-100%

      // Save prediction
      const [prediction] = await db.insert(aiModelPredictions).values({
        modelId: input.modelId,
        inputData: JSON.stringify(input.inputData),
        predictedValue: predictedValue.toString(),
        confidence: confidence.toString(),
        actualValue: null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        createdAt: new Date(),
      }).returning();

      return {
        success: true,
        prediction: {
          id: prediction.id,
          predictedValue,
          confidence,
          timestamp: prediction.createdAt,
        },
      };
    }),

  /**
   * Batch predictions
   */
  batchPredict: publicProcedure
    .input(z.object({
      modelId: z.string(),
      inputs: z.array(z.object({
        inputData: z.record(z.any()),
        metadata: z.record(z.any()).optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      // Get model
      const model = await db.select().from(aiTrainedModels).where(eq(aiTrainedModels.id, input.modelId)).limit(1);
      if (!model || model.length === 0) {
        throw new Error('Model not found');
      }

      // Batch predictions
      const predictions = [];
      for (const item of input.inputs) {
        const predictedValue = Math.random() * 2 + 0.5;
        const confidence = Math.random() * 0.3 + 0.7;

        const [prediction] = await db.insert(aiModelPredictions).values({
          modelId: input.modelId,
          inputData: JSON.stringify(item.inputData),
          predictedValue: predictedValue.toString(),
          confidence: confidence.toString(),
          actualValue: null,
          metadata: item.metadata ? JSON.stringify(item.metadata) : null,
          createdAt: new Date(),
        }).returning();

        predictions.push({
          id: prediction.id,
          predictedValue,
          confidence,
          timestamp: prediction.createdAt,
        });
      }

      return {
        success: true,
        count: predictions.length,
        predictions,
      };
    }),

  /**
   * List predictions with filters
   */
  list: publicProcedure
    .input(z.object({
      modelId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().min(1).max(1000).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(aiModelPredictions);

      // Filters
      const conditions = [];
      if (input.modelId) {
        conditions.push(eq(aiModelPredictions.modelId, input.modelId));
      }
      if (input.startDate) {
        conditions.push(gte(aiModelPredictions.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(aiModelPredictions.createdAt, input.endDate));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const predictions = await query
        .orderBy(desc(aiModelPredictions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Count total
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(aiModelPredictions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        predictions: predictions.map(p => ({
          ...p,
          inputData: p.inputData ? JSON.parse(p.inputData as string) : {},
          metadata: p.metadata ? JSON.parse(p.metadata as string) : {},
          predictedValue: parseFloat(p.predictedValue || '0'),
          confidence: parseFloat(p.confidence || '0'),
          actualValue: p.actualValue ? parseFloat(p.actualValue) : null,
        })),
        total: Number(count),
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * Get prediction by ID
   */
  get: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [prediction] = await db
        .select()
        .from(aiModelPredictions)
        .where(eq(aiModelPredictions.id, input.id))
        .limit(1);

      if (!prediction) {
        throw new Error('Prediction not found');
      }

      return {
        ...prediction,
        inputData: prediction.inputData ? JSON.parse(prediction.inputData as string) : {},
        metadata: prediction.metadata ? JSON.parse(prediction.metadata as string) : {},
        predictedValue: parseFloat(prediction.predictedValue || '0'),
        confidence: parseFloat(prediction.confidence || '0'),
        actualValue: prediction.actualValue ? parseFloat(prediction.actualValue) : null,
      };
    }),

  /**
   * Get prediction history for a model
   */
  getHistory: publicProcedure
    .input(z.object({
      modelId: z.string(),
      limit: z.number().min(1).max(1000).default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const predictions = await db
        .select()
        .from(aiModelPredictions)
        .where(eq(aiModelPredictions.modelId, input.modelId))
        .orderBy(desc(aiModelPredictions.createdAt))
        .limit(input.limit);

      return predictions.map(p => ({
        ...p,
        inputData: p.inputData ? JSON.parse(p.inputData as string) : {},
        metadata: p.metadata ? JSON.parse(p.metadata as string) : {},
        predictedValue: parseFloat(p.predictedValue || '0'),
        confidence: parseFloat(p.confidence || '0'),
        actualValue: p.actualValue ? parseFloat(p.actualValue) : null,
      }));
    }),

  /**
   * Get prediction accuracy metrics
   */
  getMetrics: publicProcedure
    .input(z.object({
      modelId: z.string(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      // Get predictions with actual values
      let query = db
        .select()
        .from(aiModelPredictions)
        .where(
          and(
            eq(aiModelPredictions.modelId, input.modelId),
            sql`${aiModelPredictions.actualValue} IS NOT NULL`
          )
        );

      if (input.startDate) {
        query = query.where(gte(aiModelPredictions.createdAt, input.startDate)) as any;
      }
      if (input.endDate) {
        query = query.where(lte(aiModelPredictions.createdAt, input.endDate)) as any;
      }

      const predictions = await query;

      if (predictions.length === 0) {
        return {
          totalPredictions: 0,
          accuracy: 0,
          mae: 0,
          rmse: 0,
          mape: 0,
        };
      }

      // Calculate metrics
      let sumAbsError = 0;
      let sumSquaredError = 0;
      let sumPercentError = 0;
      let accurateCount = 0;

      for (const p of predictions) {
        const predicted = parseFloat(p.predictedValue || '0');
        const actual = parseFloat(p.actualValue || '0');
        const error = Math.abs(predicted - actual);
        
        sumAbsError += error;
        sumSquaredError += error * error;
        if (actual !== 0) {
          sumPercentError += Math.abs(error / actual) * 100;
        }
        
        // Consider accurate if within 10% of actual
        if (actual !== 0 && error / Math.abs(actual) < 0.1) {
          accurateCount++;
        }
      }

      const mae = sumAbsError / predictions.length;
      const rmse = Math.sqrt(sumSquaredError / predictions.length);
      const mape = sumPercentError / predictions.length;
      const accuracy = (accurateCount / predictions.length) * 100;

      return {
        totalPredictions: predictions.length,
        accuracy: Math.round(accuracy * 100) / 100,
        mae: Math.round(mae * 1000) / 1000,
        rmse: Math.round(rmse * 1000) / 1000,
        mape: Math.round(mape * 100) / 100,
      };
    }),

  /**
   * Export predictions
   */
  export: publicProcedure
    .input(z.object({
      modelId: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      format: z.enum(['csv', 'json']).default('json'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(aiModelPredictions);

      // Filters
      const conditions = [];
      if (input.modelId) {
        conditions.push(eq(aiModelPredictions.modelId, input.modelId));
      }
      if (input.startDate) {
        conditions.push(gte(aiModelPredictions.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(aiModelPredictions.createdAt, input.endDate));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const predictions = await query.orderBy(desc(aiModelPredictions.createdAt));

      const data = predictions.map(p => ({
        id: p.id,
        modelId: p.modelId,
        predictedValue: parseFloat(p.predictedValue || '0'),
        confidence: parseFloat(p.confidence || '0'),
        actualValue: p.actualValue ? parseFloat(p.actualValue) : null,
        inputData: p.inputData ? JSON.parse(p.inputData as string) : {},
        metadata: p.metadata ? JSON.parse(p.metadata as string) : {},
        createdAt: p.createdAt,
      }));

      if (input.format === 'csv') {
        // Convert to CSV
        const headers = ['ID', 'Model ID', 'Predicted Value', 'Confidence', 'Actual Value', 'Created At'];
        const rows = data.map(d => [
          d.id,
          d.modelId,
          d.predictedValue,
          d.confidence,
          d.actualValue || '',
          d.createdAt?.toISOString() || '',
        ]);
        
        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        
        return {
          format: 'csv',
          data: csv,
          filename: `predictions_${Date.now()}.csv`,
        };
      }

      // JSON format
      return {
        format: 'json',
        data: JSON.stringify(data, null, 2),
        filename: `predictions_${Date.now()}.json`,
      };
    }),
});
