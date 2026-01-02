import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import {
  predictCpkTrend,
  predictOeeTrend,
  getAiPredictionSummary,
  getHistoricalCpkData,
  getHistoricalOeeData,
} from "../../services/aiPredictiveService";
import {
  checkCpkPredictionAlert,
  checkOeePredictionAlert,
  getRecentPredictionAlerts,
  getPredictionAlertStats,
  checkCpkPredictionAlertWithEmail,
  checkOeePredictionAlertWithEmail,
  logPredictionAlert,
} from "../../services/predictionAlertNotificationService";
import {
  compareModelVersions,
  compareMultipleModels,
  getAllModelsAccuracySummary,
  getVersionAccuracyTrend,
} from "../../services/modelVersionComparisonService";
import { getDb } from "../../db";
import { spcAnalysisHistory, productionLines, oeeRecords } from "../../../drizzle/schema";
import { desc, eq, sql } from "drizzle-orm";

/**
 * AI Predictive Router - Real-time predictions for CPK/OEE trends
 */
export const aiPredictiveRouter = router({
  // Predict CPK trend for a product/station
  predictCpk: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      forecastDays: z.number().min(1).max(30).default(7),
    }))
    .query(async ({ input }) => {
      const prediction = await predictCpkTrend(
        input.productCode,
        input.stationName,
        input.forecastDays
      );
      return prediction;
    }),

  // Predict OEE trend for a production line
  predictOee: protectedProcedure
    .input(z.object({
      productionLineId: z.string(),
      forecastDays: z.number().min(1).max(30).default(7),
    }))
    .query(async ({ input }) => {
      const prediction = await predictOeeTrend(
        input.productionLineId,
        input.forecastDays
      );
      return prediction;
    }),

  // Get AI prediction summary for dashboard
  getSummary: protectedProcedure
    .query(async () => {
      return await getAiPredictionSummary();
    }),

  // Get historical CPK data for charts
  getHistoricalCpk: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      const data = await getHistoricalCpkData(
        input.productCode,
        input.stationName,
        input.days
      );
      return data;
    }),

  // Get historical OEE data for charts
  getHistoricalOee: protectedProcedure
    .input(z.object({
      productionLineId: z.string(),
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      const data = await getHistoricalOeeData(
        input.productionLineId,
        input.days
      );
      return data;
    }),

  // Get available products for prediction
  getAvailableProducts: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .selectDistinct({
          productCode: spcAnalysisHistory.productCode,
          stationName: spcAnalysisHistory.stationName,
        })
        .from(spcAnalysisHistory)
        .orderBy(spcAnalysisHistory.productCode);

      return results;
    }),

  // Get available production lines for OEE prediction
  getAvailableProductionLines: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const results = await db
        .select({
          id: productionLines.id,
          name: productionLines.name,
        })
        .from(productionLines)
        .where(eq(productionLines.status, "active"))
        .orderBy(productionLines.name);

      return results;
    }),

  // Get prediction accuracy metrics
  getAccuracyMetrics: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        return {
          cpkAccuracy: 0,
          oeeAccuracy: 0,
          totalPredictions: 0,
          correctPredictions: 0,
        };
      }

      // Get recent CPK data for accuracy calculation
      const recentCpk = await db
        .select({
          cpk: spcAnalysisHistory.cpk,
        })
        .from(spcAnalysisHistory)
        .orderBy(desc(spcAnalysisHistory.createdAt))
        .limit(100);

      // Calculate prediction accuracy based on trend consistency
      const cpkValues = recentCpk.map(r => r.cpk || 0);
      let correctTrends = 0;
      for (let i = 1; i < cpkValues.length - 1; i++) {
        const prevTrend = cpkValues[i] - cpkValues[i - 1];
        const nextTrend = cpkValues[i + 1] - cpkValues[i];
        if ((prevTrend > 0 && nextTrend > 0) || (prevTrend < 0 && nextTrend < 0) || (Math.abs(prevTrend) < 0.05 && Math.abs(nextTrend) < 0.05)) {
          correctTrends++;
        }
      }

      const cpkAccuracy = cpkValues.length > 2 ? (correctTrends / (cpkValues.length - 2)) * 100 : 0;

      // Get recent OEE data
      const recentOee = await db
        .select({
          oee: oeeRecords.oee,
        })
        .from(oeeRecords)
        .orderBy(desc(oeeRecords.recordDate))
        .limit(100);

      const oeeValues = recentOee.map(r => r.oee || 0);
      let oeeCorrectTrends = 0;
      for (let i = 1; i < oeeValues.length - 1; i++) {
        const prevTrend = oeeValues[i] - oeeValues[i - 1];
        const nextTrend = oeeValues[i + 1] - oeeValues[i];
        if ((prevTrend > 0 && nextTrend > 0) || (prevTrend < 0 && nextTrend < 0) || (Math.abs(prevTrend) < 1 && Math.abs(nextTrend) < 1)) {
          oeeCorrectTrends++;
        }
      }

      const oeeAccuracy = oeeValues.length > 2 ? (oeeCorrectTrends / (oeeValues.length - 2)) * 100 : 0;

      return {
        cpkAccuracy: Math.round(cpkAccuracy * 10) / 10,
        oeeAccuracy: Math.round(oeeAccuracy * 10) / 10,
        totalPredictions: cpkValues.length + oeeValues.length,
        correctPredictions: correctTrends + oeeCorrectTrends,
      };
    }),

  // Get trend alerts
  getTrendAlerts: protectedProcedure
    .query(async () => {
      const summary = await getAiPredictionSummary();
      return summary.alerts;
    }),

  // Batch predict CPK for multiple products
  batchPredictCpk: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        productCode: z.string(),
        stationName: z.string(),
      })),
      forecastDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      const results = await Promise.all(
        input.items.map(async (item) => {
          try {
            const prediction = await predictCpkTrend(
              item.productCode,
              item.stationName,
              input.forecastDays
            );
            return {
              productCode: item.productCode,
              stationName: item.stationName,
              success: true,
              prediction,
            };
          } catch (error) {
            return {
              productCode: item.productCode,
              stationName: item.stationName,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        })
      );
      return results;
    }),

  // Get dashboard widgets data
  getDashboardWidgets: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        return {
          cpkWidget: { current: 0, trend: "stable" as const, change: 0 },
          oeeWidget: { current: 0, trend: "stable" as const, change: 0 },
          alertsWidget: { total: 0, high: 0, medium: 0, low: 0 },
          predictionsWidget: { total: 0, accuracy: 0 },
        };
      }

      // Get latest CPK
      const latestCpk = await db
        .select({
          cpk: spcAnalysisHistory.cpk,
        })
        .from(spcAnalysisHistory)
        .orderBy(desc(spcAnalysisHistory.createdAt))
        .limit(10);

      const cpkValues = latestCpk.map(r => r.cpk || 0);
      const currentCpk = cpkValues[0] || 0;
      const prevCpk = cpkValues[cpkValues.length - 1] || currentCpk;
      const cpkChange = currentCpk - prevCpk;
      const cpkTrend = cpkChange > 0.05 ? "up" : cpkChange < -0.05 ? "down" : "stable";

      // Get latest OEE
      const latestOee = await db
        .select({
          oee: oeeRecords.oee,
        })
        .from(oeeRecords)
        .orderBy(desc(oeeRecords.recordDate))
        .limit(10);

      const oeeValues = latestOee.map(r => r.oee || 0);
      const currentOee = oeeValues[0] || 0;
      const prevOee = oeeValues[oeeValues.length - 1] || currentOee;
      const oeeChange = currentOee - prevOee;
      const oeeTrend = oeeChange > 1 ? "up" : oeeChange < -1 ? "down" : "stable";

      // Get alerts summary
      const summary = await getAiPredictionSummary();
      const highAlerts = summary.alerts.filter(a => a.severity === "high").length;
      const mediumAlerts = summary.alerts.filter(a => a.severity === "medium").length;
      const lowAlerts = summary.alerts.filter(a => a.severity === "low").length;

      return {
        cpkWidget: {
          current: Math.round(currentCpk * 1000) / 1000,
          trend: cpkTrend as "up" | "down" | "stable",
          change: Math.round(cpkChange * 1000) / 1000,
        },
        oeeWidget: {
          current: Math.round(currentOee * 10) / 10,
          trend: oeeTrend as "up" | "down" | "stable",
          change: Math.round(oeeChange * 10) / 10,
        },
        alertsWidget: {
          total: summary.alerts.length,
          high: highAlerts,
          medium: mediumAlerts,
          low: lowAlerts,
        },
        predictionsWidget: {
          total: summary.totalPredictions,
          accuracy: Math.round(summary.avgConfidence * 100),
        },
      };
    }),
  // Get sparkline data for dashboard widgets
  getSparklineData: protectedProcedure
    .input(z.object({
      type: z.enum(["cpk", "oee", "predictions"]),
      points: z.number().min(5).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return { data: [], type: input.type };
      }

      if (input.type === "cpk") {
        const results = await db
          .select({
            cpk: spcAnalysisHistory.cpk,
          })
          .from(spcAnalysisHistory)
          .orderBy(desc(spcAnalysisHistory.createdAt))
          .limit(input.points);

        return {
          data: results.map(r => r.cpk || 0).reverse(),
          type: "cpk",
        };
      }

      if (input.type === "oee") {
        const results = await db
          .select({
            oee: oeeRecords.oee,
          })
          .from(oeeRecords)
          .orderBy(desc(oeeRecords.recordDate))
          .limit(input.points);

        return {
          data: results.map(r => r.oee || 0).reverse(),
          type: "oee",
        };
      }

      // For predictions, return accuracy trend
      const cpkResults = await db
        .select({
          cpk: spcAnalysisHistory.cpk,
        })
        .from(spcAnalysisHistory)
        .orderBy(desc(spcAnalysisHistory.createdAt))
        .limit(input.points);

      // Calculate rolling accuracy (simulated)
      const cpkValues = cpkResults.map(r => r.cpk || 0).reverse();
      const accuracyData = cpkValues.map((val, i) => {
        if (i < 2) return 75;
        const prevVal = cpkValues[i - 1];
        const diff = Math.abs(val - prevVal);
        return Math.max(60, Math.min(95, 85 - diff * 10));
      });

      return {
        data: accuracyData,
        type: "predictions",
      };
    }),

  // Predict CPK with alert notification (includes email)
  predictCpkWithAlert: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      forecastDays: z.number().min(1).max(30).default(7),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      sendEmail: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const prediction = await predictCpkTrend(
        input.productCode,
        input.stationName,
        input.forecastDays
      );

      // Check for alerts if we have predictions
      let alert = null;
      if (prediction.predictions.length > 0) {
        const avgPredictedCpk = prediction.predictions.reduce((sum, p) => sum + p.predictedValue, 0) / prediction.predictions.length;
        
        // Use email-enabled version if sendEmail is true
        if (input.sendEmail) {
          alert = await checkCpkPredictionAlertWithEmail(
            avgPredictedCpk,
            prediction.currentCpk,
            input.productCode,
            input.stationName,
            input.productId,
            input.productionLineId,
            input.workstationId
          );
        } else {
          alert = await checkCpkPredictionAlert(
            avgPredictedCpk,
            prediction.currentCpk,
            input.productCode,
            input.stationName,
            input.productId,
            input.productionLineId,
            input.workstationId
          );
        }
        
        // Log prediction to history if alert was triggered
        if (alert) {
          await logPredictionAlert(
            "cpk",
            avgPredictedCpk,
            alert.alertType as "warning" | "critical",
            {
              productCode: input.productCode,
              productId: input.productId,
              productionLineId: input.productionLineId,
              workstationId: input.workstationId,
              confidenceLevel: prediction.confidence,
            }
          );
        }
      }

      return {
        prediction,
        alert,
      };
    }),

  // Predict OEE with alert notification (includes email)
  predictOeeWithAlert: protectedProcedure
    .input(z.object({
      productionLineId: z.string(),
      forecastDays: z.number().min(1).max(30).default(7),
      sendEmail: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const prediction = await predictOeeTrend(
        input.productionLineId,
        input.forecastDays
      );

      // Check for alerts if we have predictions
      let alert = null;
      if (prediction.predictions.length > 0) {
        const avgPredictedOee = prediction.predictions.reduce((sum, p) => sum + p.predictedValue, 0) / prediction.predictions.length;
        
        // Use email-enabled version if sendEmail is true
        if (input.sendEmail) {
          alert = await checkOeePredictionAlertWithEmail(
            avgPredictedOee,
            prediction.currentOee,
            parseInt(input.productionLineId),
            prediction.productionLineName
          );
        } else {
          alert = await checkOeePredictionAlert(
            avgPredictedOee,
            prediction.currentOee,
            parseInt(input.productionLineId),
            prediction.productionLineName
          );
        }
        
        // Log prediction to history if alert was triggered
        if (alert) {
          await logPredictionAlert(
            "oee",
            avgPredictedOee,
            alert.alertType as "warning" | "critical",
            {
              productionLineId: parseInt(input.productionLineId),
              confidenceLevel: prediction.confidence,
            }
          );
        }
      }

      return {
        prediction,
        alert,
      };
    }),

  // Get recent prediction alerts
  getRecentAlerts: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      hours: z.number().min(1).max(168).default(24),
    }).optional())
    .query(async ({ input }) => {
      return await getRecentPredictionAlerts(
        input?.limit || 50,
        input?.hours || 24
      );
    }),

  // Get prediction alert statistics
  getAlertStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(7),
    }).optional())
    .query(async ({ input }) => {
      return await getPredictionAlertStats(input?.days || 7);
    }),

  // Compare model versions accuracy
  compareModelVersions: protectedProcedure
    .input(z.object({
      modelId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      return await compareModelVersions(input.modelId, startDate, endDate);
    }),

  // Compare multiple models
  compareMultipleModels: protectedProcedure
    .input(z.object({
      modelIds: z.array(z.number()).min(1).max(10),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;
      return await compareMultipleModels(input.modelIds, startDate, endDate);
    }),

  // Get all models accuracy summary
  getAllModelsAccuracy: protectedProcedure
    .query(async () => {
      return await getAllModelsAccuracySummary();
    }),

  // Get version accuracy trend for a model
  getVersionAccuracyTrend: protectedProcedure
    .input(z.object({
      modelId: z.number(),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      return await getVersionAccuracyTrend(input.modelId, input.limit);
    }),
});
