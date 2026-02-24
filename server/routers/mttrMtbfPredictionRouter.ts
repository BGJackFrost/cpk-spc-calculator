/**
 * MTTR/MTBF Prediction Router
 * API endpoints cho dự đoán xu hướng MTTR/MTBF
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import {
  predictMttrMtbf,
  generateAIRecommendations,
  getHistoricalData,
} from '../services/mttrMtbfPredictionService';

export const mttrMtbfPredictionRouter = router({
  // Get prediction for a target
  getPrediction: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']),
      targetId: z.number(),
      historicalDays: z.number().optional().default(30),
      predictionDays: z.number().optional().default(7),
    }))
    .query(async ({ input }) => {
      return await predictMttrMtbf(
        input.targetType,
        input.targetId,
        input.historicalDays,
        input.predictionDays
      );
    }),

  // Get AI recommendations
  getAIRecommendations: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']),
      targetId: z.number(),
      targetName: z.string(),
      historicalDays: z.number().optional().default(30),
      predictionDays: z.number().optional().default(7),
    }))
    .query(async ({ input }) => {
      const { historical, predictions, trendAnalysis } = await predictMttrMtbf(
        input.targetType,
        input.targetId,
        input.historicalDays,
        input.predictionDays
      );

      const recommendations = await generateAIRecommendations(
        input.targetType,
        input.targetName,
        historical,
        predictions,
        trendAnalysis
      );

      return {
        historical,
        predictions,
        trendAnalysis,
        recommendations,
      };
    }),

  // Get historical data only
  getHistoricalData: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']),
      targetId: z.number(),
      days: z.number().optional().default(30),
    }))
    .query(async ({ input }) => {
      return await getHistoricalData(input.targetType, input.targetId, input.days);
    }),
});

export default mttrMtbfPredictionRouter;
