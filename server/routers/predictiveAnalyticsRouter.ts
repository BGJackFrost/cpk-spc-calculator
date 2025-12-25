/**
 * Predictive Analytics Router
 * API endpoints cho OEE Forecasting và Defect Rate Prediction
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import {
  forecastOEE,
  getOEEHistoricalData,
  compareProductionLines,
  OEEForecastConfig,
} from '../services/oeeForecastingService';
import {
  predictDefectRate,
  getDefectStatsByCategory,
  compareAlgorithms,
  DefectPredictionConfig,
} from '../services/defectPredictionService';

export const predictiveAnalyticsRouter = router({
  // OEE Forecasting
  forecastOEE: protectedProcedure
    .input(z.object({
      productionLineId: z.number().nullable().optional(),
      machineId: z.number().nullable().optional(),
      algorithm: z.enum(['sma', 'ema', 'linear', 'holt_winters']).optional().default('holt_winters'),
      forecastDays: z.number().min(1).max(90).optional().default(14),
      confidenceLevel: z.number().min(80).max(99).optional().default(95),
      seasonalPeriod: z.number().min(1).max(365).optional().default(7),
    }))
    .query(async ({ input }) => {
      const config: OEEForecastConfig = {
        algorithm: input.algorithm,
        forecastDays: input.forecastDays,
        confidenceLevel: input.confidenceLevel,
        seasonalPeriod: input.seasonalPeriod,
      };
      return await forecastOEE(
        input.productionLineId || null,
        input.machineId || null,
        config
      );
    }),

  // Get OEE historical data
  getOEEHistory: protectedProcedure
    .input(z.object({
      productionLineId: z.number().nullable().optional(),
      machineId: z.number().nullable().optional(),
      days: z.number().min(1).max(365).optional().default(30),
    }))
    .query(async ({ input }) => {
      return await getOEEHistoricalData(
        input.productionLineId || null,
        input.machineId || null,
        input.days
      );
    }),

  // Compare OEE across production lines
  compareProductionLines: protectedProcedure
    .input(z.object({
      productionLineIds: z.array(z.number()).min(1).max(10),
      algorithm: z.enum(['sma', 'ema', 'linear', 'holt_winters']).optional().default('holt_winters'),
      forecastDays: z.number().min(1).max(30).optional().default(7),
    }))
    .query(async ({ input }) => {
      const config: OEEForecastConfig = {
        algorithm: input.algorithm,
        forecastDays: input.forecastDays,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      };
      return await compareProductionLines(input.productionLineIds, config);
    }),

  // Defect Rate Prediction
  predictDefectRate: protectedProcedure
    .input(z.object({
      productId: z.number().nullable().optional(),
      workstationId: z.number().nullable().optional(),
      algorithm: z.enum(['poisson', 'logistic', 'arima', 'ensemble']).optional().default('ensemble'),
      forecastDays: z.number().min(1).max(30).optional().default(7),
      confidenceLevel: z.number().min(80).max(99).optional().default(95),
      threshold: z.number().min(0).max(1).optional().default(0.05),
    }))
    .query(async ({ input }) => {
      const config: DefectPredictionConfig = {
        algorithm: input.algorithm,
        forecastDays: input.forecastDays,
        confidenceLevel: input.confidenceLevel,
        threshold: input.threshold,
      };
      return await predictDefectRate(
        input.productId || null,
        input.workstationId || null,
        config
      );
    }),

  // Get defect statistics by category
  getDefectStats: protectedProcedure
    .input(z.object({
      productId: z.number().nullable().optional(),
      workstationId: z.number().nullable().optional(),
      days: z.number().min(1).max(365).optional().default(30),
    }))
    .query(async ({ input }) => {
      return await getDefectStatsByCategory(
        input.productId || null,
        input.workstationId || null,
        input.days
      );
    }),

  // Compare defect prediction algorithms
  compareDefectAlgorithms: protectedProcedure
    .input(z.object({
      productId: z.number().nullable().optional(),
      workstationId: z.number().nullable().optional(),
    }))
    .query(async ({ input }) => {
      return await compareAlgorithms(
        input.productId || null,
        input.workstationId || null
      );
    }),

  // Get combined analytics summary
  getSummary: protectedProcedure
    .input(z.object({
      productionLineId: z.number().nullable().optional(),
      productId: z.number().nullable().optional(),
    }))
    .query(async ({ input }) => {
      const [oeeForecast, defectPrediction] = await Promise.all([
        forecastOEE(input.productionLineId || null, null, {
          algorithm: 'holt_winters',
          forecastDays: 7,
          confidenceLevel: 95,
          seasonalPeriod: 7,
        }),
        predictDefectRate(input.productId || null, null, {
          algorithm: 'ensemble',
          forecastDays: 7,
          confidenceLevel: 95,
          threshold: 0.05,
        }),
      ]);

      return {
        oee: {
          trend: oeeForecast.trend,
          nextDayForecast: oeeForecast.forecastData[0],
          weeklyAverage: oeeForecast.forecastData.length > 0
            ? oeeForecast.forecastData.reduce((sum, d) => sum + d.predictedOEE, 0) / oeeForecast.forecastData.length
            : 0,
          alertCount: oeeForecast.alerts.length,
        },
        defect: {
          trend: defectPrediction.trend,
          nextDayForecast: defectPrediction.forecastData[0],
          weeklyAverage: defectPrediction.forecastData.length > 0
            ? defectPrediction.forecastData.reduce((sum, d) => sum + d.predictedDefectRate, 0) / defectPrediction.forecastData.length
            : 0,
          alertCount: defectPrediction.alerts.length,
          topRootCauses: defectPrediction.rootCauses.slice(0, 3),
        },
      };
    }),
});

export type PredictiveAnalyticsRouter = typeof predictiveAnalyticsRouter;
