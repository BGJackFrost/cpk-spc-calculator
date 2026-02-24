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
import {
  generateOeeForecastHtml,
  generateOeeForecastExcel,
  generateDefectPredictionHtml,
  generateDefectPredictionExcel,
  OeeForecastData,
  DefectPredictionData,
  ReportOptions,
} from '../services/predictiveForecastReportService';
import { getProductionLines } from '../db';

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

  // Export OEE Forecast Report
  exportOeeForecastReport: protectedProcedure
    .input(z.object({
      productionLineIds: z.array(z.number()).optional(),
      format: z.enum(['html', 'excel']).default('html'),
      algorithm: z.enum(['sma', 'ema', 'linear', 'holt_winters']).optional().default('holt_winters'),
      forecastDays: z.number().min(1).max(30).optional().default(7),
      includeRecommendations: z.boolean().optional().default(true),
      companyName: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get production lines
      const allLines = await getProductionLines();
      const targetLines = input.productionLineIds?.length 
        ? allLines.filter(l => input.productionLineIds!.includes(l.id))
        : allLines;

      if (targetLines.length === 0) {
        throw new Error('Không tìm thấy dây chuyền sản xuất');
      }

      // Generate forecast data for each line
      const forecastDataPromises = targetLines.map(async (line) => {
        const forecast = await forecastOEE(line.id, null, {
          algorithm: input.algorithm,
          forecastDays: input.forecastDays,
          confidenceLevel: 95,
          seasonalPeriod: 7,
        });

        // Calculate current OEE from historical data
        const currentOee = forecast.historicalData.length > 0
          ? forecast.historicalData[forecast.historicalData.length - 1].oee
          : 85;

        // Calculate predicted OEE (average of forecast)
        const predictedOee = forecast.forecastData.length > 0
          ? forecast.forecastData.reduce((sum, d) => sum + d.predictedOEE, 0) / forecast.forecastData.length
          : currentOee;

        // Get component metrics
        const lastHistorical = forecast.historicalData[forecast.historicalData.length - 1];
        const firstForecast = forecast.forecastData[0];

        const data: OeeForecastData = {
          productionLineId: line.id,
          productionLineName: line.name,
          forecastDate: new Date().toISOString().split('T')[0],
          currentOee,
          predictedOee,
          availability: {
            current: lastHistorical?.availability || 90,
            predicted: firstForecast?.availability || 90,
          },
          performance: {
            current: lastHistorical?.performance || 92,
            predicted: firstForecast?.performance || 92,
          },
          quality: {
            current: lastHistorical?.quality || 98,
            predicted: firstForecast?.quality || 98,
          },
          trend: forecast.trend as 'improving' | 'stable' | 'declining',
          confidence: forecast.confidence,
          recommendations: forecast.alerts.map(a => a.message),
          historicalData: forecast.historicalData.map(h => ({
            date: h.date,
            oee: h.oee,
            availability: h.availability,
            performance: h.performance,
            quality: h.quality,
          })),
        };

        return data;
      });

      const forecastData = await Promise.all(forecastDataPromises);

      const reportOptions: ReportOptions = {
        title: input.title || 'Báo cáo Dự báo OEE',
        subtitle: 'Overall Equipment Effectiveness Forecast Report',
        companyName: input.companyName || 'Hệ thống SPC/CPK',
        generatedBy: ctx.user?.name || 'System',
        includeRecommendations: input.includeRecommendations,
      };

      if (input.format === 'excel') {
        const buffer = await generateOeeForecastExcel(forecastData, reportOptions);
        return {
          format: 'excel',
          filename: `oee-forecast-report-${Date.now()}.xlsx`,
          data: buffer.toString('base64'),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } else {
        const html = generateOeeForecastHtml(forecastData, reportOptions);
        return {
          format: 'html',
          filename: `oee-forecast-report-${Date.now()}.html`,
          data: html,
          mimeType: 'text/html',
        };
      }
    }),

  // Export Defect Prediction Report
  exportDefectPredictionReport: protectedProcedure
    .input(z.object({
      productionLineIds: z.array(z.number()).optional(),
      format: z.enum(['html', 'excel']).default('html'),
      algorithm: z.enum(['poisson', 'logistic', 'arima', 'ensemble']).optional().default('ensemble'),
      forecastDays: z.number().min(1).max(30).optional().default(7),
      includeRecommendations: z.boolean().optional().default(true),
      companyName: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get production lines
      const allLines = await getProductionLines();
      const targetLines = input.productionLineIds?.length 
        ? allLines.filter(l => input.productionLineIds!.includes(l.id))
        : allLines;

      if (targetLines.length === 0) {
        throw new Error('Không tìm thấy dây chuyền sản xuất');
      }

      // Generate prediction data for each line
      const predictionDataPromises = targetLines.map(async (line) => {
        const prediction = await predictDefectRate(null, null, {
          algorithm: input.algorithm,
          forecastDays: input.forecastDays,
          confidenceLevel: 95,
          threshold: 0.05,
        });

        // Calculate current and predicted defect rates
        const currentDefectRate = prediction.historicalData.length > 0
          ? prediction.historicalData[prediction.historicalData.length - 1].defectRate
          : 2.5;

        const predictedDefectRate = prediction.forecastData.length > 0
          ? prediction.forecastData.reduce((sum, d) => sum + d.predictedDefectRate, 0) / prediction.forecastData.length
          : currentDefectRate;

        // Determine risk level
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (predictedDefectRate > 5) riskLevel = 'critical';
        else if (predictedDefectRate > 3) riskLevel = 'high';
        else if (predictedDefectRate > 2) riskLevel = 'medium';

        const data: DefectPredictionData = {
          productionLineId: line.id,
          productionLineName: line.name,
          predictionDate: new Date().toISOString().split('T')[0],
          currentDefectRate,
          predictedDefectRate,
          defectsByType: prediction.defectsByCategory.slice(0, 5).map(cat => ({
            type: cat.category,
            currentCount: cat.count,
            predictedCount: Math.round(cat.count * (predictedDefectRate / currentDefectRate)),
            trend: cat.trend as 'increasing' | 'stable' | 'decreasing',
          })),
          riskLevel,
          confidence: prediction.confidence,
          rootCauses: prediction.rootCauses.slice(0, 5).map(rc => ({
            cause: rc.cause,
            probability: rc.probability,
            impact: rc.impact as 'low' | 'medium' | 'high',
          })),
          preventiveActions: prediction.alerts.map(a => a.message),
          historicalData: prediction.historicalData.map(h => ({
            date: h.date,
            defectRate: h.defectRate,
            defectCount: h.defectCount,
          })),
        };

        return data;
      });

      const predictionData = await Promise.all(predictionDataPromises);

      const reportOptions: ReportOptions = {
        title: input.title || 'Báo cáo Dự báo Lỗi',
        subtitle: 'Defect Prediction Report',
        companyName: input.companyName || 'Hệ thống SPC/CPK',
        generatedBy: ctx.user?.name || 'System',
        includeRecommendations: input.includeRecommendations,
      };

      if (input.format === 'excel') {
        const buffer = await generateDefectPredictionExcel(predictionData, reportOptions);
        return {
          format: 'excel',
          filename: `defect-prediction-report-${Date.now()}.xlsx`,
          data: buffer.toString('base64'),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
      } else {
        const html = generateDefectPredictionHtml(predictionData, reportOptions);
        return {
          format: 'html',
          filename: `defect-prediction-report-${Date.now()}.html`,
          data: html,
          mimeType: 'text/html',
        };
      }
    }),
});

export type PredictiveAnalyticsRouter = typeof predictiveAnalyticsRouter;
