import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { 
  aiPredictionHistory, 
  aiPredictionAccuracyStats,
  spcAnalysisHistory,
  oeeRecords 
} from "../../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, between } from "drizzle-orm";

/**
 * AI Prediction History Router - Lịch sử predictions và so sánh độ chính xác
 */
export const aiPredictionHistoryRouter = router({
  // List prediction history
  list: protectedProcedure
    .input(z.object({
      predictionType: z.enum(["cpk", "oee", "defect_rate", "trend"]).optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      status: z.enum(["pending", "verified", "expired"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { history: [], total: 0 };

      const conditions = [];
      if (input?.predictionType) {
        conditions.push(eq(aiPredictionHistory.predictionType, input.predictionType));
      }
      if (input?.productId) {
        conditions.push(eq(aiPredictionHistory.productId, input.productId));
      }
      if (input?.productionLineId) {
        conditions.push(eq(aiPredictionHistory.productionLineId, input.productionLineId));
      }
      if (input?.status) {
        conditions.push(eq(aiPredictionHistory.status, input.status));
      }
      if (input?.startDate) {
        conditions.push(gte(aiPredictionHistory.predictedAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(aiPredictionHistory.predictedAt, input.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [history, countResult] = await Promise.all([
        db.select()
          .from(aiPredictionHistory)
          .where(whereClause)
          .orderBy(desc(aiPredictionHistory.predictedAt))
          .limit(input?.limit || 50)
          .offset(input?.offset || 0),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(aiPredictionHistory)
          .where(whereClause),
      ]);

      return {
        history,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get accuracy metrics
  getAccuracyMetrics: protectedProcedure
    .input(z.object({
      predictionType: z.enum(["cpk", "oee", "defect_rate", "trend"]).optional(),
      days: z.number().min(1).max(365).default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          totalPredictions: 0,
          verifiedPredictions: 0,
          mae: 0,
          rmse: 0,
          mape: 0,
          withinConfidenceRate: 0,
          trendAccuracy: 0,
        };
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const conditions = [
        gte(aiPredictionHistory.predictedAt, startDate.toISOString()),
        eq(aiPredictionHistory.status, "verified"),
      ];
      if (input.predictionType) {
        conditions.push(eq(aiPredictionHistory.predictionType, input.predictionType));
      }

      const results = await db.select()
        .from(aiPredictionHistory)
        .where(and(...conditions));

      if (results.length === 0) {
        return {
          totalPredictions: 0,
          verifiedPredictions: 0,
          mae: 0,
          rmse: 0,
          mape: 0,
          withinConfidenceRate: 0,
          trendAccuracy: 0,
        };
      }

      // Calculate metrics
      let sumAbsError = 0;
      let sumSquaredError = 0;
      let sumPercentError = 0;
      let withinConfidenceCount = 0;

      for (const record of results) {
        if (record.absoluteError) sumAbsError += parseFloat(record.absoluteError);
        if (record.squaredError) sumSquaredError += parseFloat(record.squaredError);
        if (record.percentError) sumPercentError += parseFloat(record.percentError);
        if (record.isWithinConfidence === 1) withinConfidenceCount++;
      }

      const n = results.length;
      const mae = sumAbsError / n;
      const rmse = Math.sqrt(sumSquaredError / n);
      const mape = sumPercentError / n;
      const withinConfidenceRate = (withinConfidenceCount / n) * 100;

      // Get total predictions count
      const totalConditions = [gte(aiPredictionHistory.predictedAt, startDate.toISOString())];
      if (input.predictionType) {
        totalConditions.push(eq(aiPredictionHistory.predictionType, input.predictionType));
      }
      
      const totalResult = await db.select({ count: sql<number>`COUNT(*)` })
        .from(aiPredictionHistory)
        .where(and(...totalConditions));

      return {
        totalPredictions: totalResult[0]?.count || 0,
        verifiedPredictions: n,
        mae: Math.round(mae * 10000) / 10000,
        rmse: Math.round(rmse * 10000) / 10000,
        mape: Math.round(mape * 100) / 100,
        withinConfidenceRate: Math.round(withinConfidenceRate * 10) / 10,
        trendAccuracy: Math.round((100 - mape) * 10) / 10,
      };
    }),

  // Get comparison data for charts
  getComparisonData: protectedProcedure
    .input(z.object({
      predictionType: z.enum(["cpk", "oee"]),
      days: z.number().min(1).max(365).default(30),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { data: [] };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const results = await db.select({
        predictedAt: aiPredictionHistory.predictedAt,
        predictedValue: aiPredictionHistory.predictedValue,
        actualValue: aiPredictionHistory.actualValue,
        confidenceLower: aiPredictionHistory.confidenceLower,
        confidenceUpper: aiPredictionHistory.confidenceUpper,
      })
      .from(aiPredictionHistory)
      .where(and(
        eq(aiPredictionHistory.predictionType, input.predictionType),
        gte(aiPredictionHistory.predictedAt, startDate.toISOString()),
        eq(aiPredictionHistory.status, "verified"),
      ))
      .orderBy(aiPredictionHistory.predictedAt)
      .limit(input.limit);

      return {
        data: results.map(r => ({
          date: r.predictedAt,
          predicted: parseFloat(r.predictedValue || "0"),
          actual: r.actualValue ? parseFloat(r.actualValue) : null,
          lower: r.confidenceLower ? parseFloat(r.confidenceLower) : null,
          upper: r.confidenceUpper ? parseFloat(r.confidenceUpper) : null,
        })),
      };
    }),

  // Record a new prediction
  recordPrediction: protectedProcedure
    .input(z.object({
      predictionType: z.enum(["cpk", "oee", "defect_rate", "trend"]),
      modelId: z.number().optional(),
      modelName: z.string().optional(),
      modelVersion: z.string().optional(),
      productId: z.number().optional(),
      productCode: z.string().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      predictedValue: z.number(),
      forecastHorizon: z.number().default(7),
      confidenceLevel: z.number().optional(),
      confidenceLower: z.number().optional(),
      confidenceUpper: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(aiPredictionHistory).values({
        predictionType: input.predictionType,
        modelId: input.modelId || null,
        modelName: input.modelName || null,
        modelVersion: input.modelVersion || null,
        productId: input.productId || null,
        productCode: input.productCode || null,
        productionLineId: input.productionLineId || null,
        workstationId: input.workstationId || null,
        predictedValue: input.predictedValue.toFixed(6),
        predictedAt: new Date().toISOString(),
        forecastHorizon: input.forecastHorizon,
        confidenceLevel: input.confidenceLevel?.toFixed(2) || null,
        confidenceLower: input.confidenceLower?.toFixed(6) || null,
        confidenceUpper: input.confidenceUpper?.toFixed(6) || null,
        status: "pending",
      });

      return { success: true, id: result[0].insertId };
    }),

  // Verify prediction with actual value
  verifyPrediction: protectedProcedure
    .input(z.object({
      id: z.number(),
      actualValue: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the prediction
      const prediction = await db.select()
        .from(aiPredictionHistory)
        .where(eq(aiPredictionHistory.id, input.id))
        .limit(1);

      if (!prediction[0]) throw new Error("Prediction not found");

      const predicted = parseFloat(prediction[0].predictedValue);
      const actual = input.actualValue;
      
      // Calculate errors
      const absoluteError = Math.abs(predicted - actual);
      const percentError = predicted !== 0 ? (absoluteError / Math.abs(predicted)) * 100 : 0;
      const squaredError = Math.pow(predicted - actual, 2);
      
      // Check if within confidence interval
      let isWithinConfidence = 0;
      if (prediction[0].confidenceLower && prediction[0].confidenceUpper) {
        const lower = parseFloat(prediction[0].confidenceLower);
        const upper = parseFloat(prediction[0].confidenceUpper);
        isWithinConfidence = actual >= lower && actual <= upper ? 1 : 0;
      }

      await db.update(aiPredictionHistory)
        .set({
          actualValue: actual.toFixed(6),
          actualRecordedAt: new Date().toISOString(),
          absoluteError: absoluteError.toFixed(6),
          percentError: percentError.toFixed(4),
          squaredError: squaredError.toFixed(8),
          isWithinConfidence,
          status: "verified",
        })
        .where(eq(aiPredictionHistory.id, input.id));

      return { success: true };
    }),

  // Auto-verify pending predictions with actual data
  autoVerify: protectedProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) return { verified: 0, message: "Database not available" };

      // Get pending predictions that are past their forecast date
      const pendingPredictions = await db.select()
        .from(aiPredictionHistory)
        .where(eq(aiPredictionHistory.status, "pending"));

      let verifiedCount = 0;

      for (const prediction of pendingPredictions) {
        const forecastDate = new Date(prediction.predictedAt);
        forecastDate.setDate(forecastDate.getDate() + (prediction.forecastHorizon || 7));
        
        if (forecastDate > new Date()) continue; // Not yet due

        let actualValue: number | null = null;

        // Get actual value based on prediction type
        if (prediction.predictionType === "cpk") {
          const cpkData = await db.select({ cpk: spcAnalysisHistory.cpk })
            .from(spcAnalysisHistory)
            .where(and(
              prediction.productCode ? eq(spcAnalysisHistory.productCode, prediction.productCode) : sql`1=1`,
              gte(spcAnalysisHistory.createdAt, forecastDate.toISOString()),
            ))
            .orderBy(spcAnalysisHistory.createdAt)
            .limit(1);
          
          if (cpkData[0]?.cpk) actualValue = cpkData[0].cpk;
        } else if (prediction.predictionType === "oee") {
          const oeeData = await db.select({ oee: oeeRecords.oee })
            .from(oeeRecords)
            .where(and(
              prediction.productionLineId ? eq(oeeRecords.productionLineId, prediction.productionLineId) : sql`1=1`,
              gte(oeeRecords.recordDate, forecastDate.toISOString()),
            ))
            .orderBy(oeeRecords.recordDate)
            .limit(1);
          
          if (oeeData[0]?.oee) actualValue = oeeData[0].oee;
        }

        if (actualValue !== null) {
          const predicted = parseFloat(prediction.predictedValue);
          const absoluteError = Math.abs(predicted - actualValue);
          const percentError = predicted !== 0 ? (absoluteError / Math.abs(predicted)) * 100 : 0;
          const squaredError = Math.pow(predicted - actualValue, 2);
          
          let isWithinConfidence = 0;
          if (prediction.confidenceLower && prediction.confidenceUpper) {
            const lower = parseFloat(prediction.confidenceLower);
            const upper = parseFloat(prediction.confidenceUpper);
            isWithinConfidence = actualValue >= lower && actualValue <= upper ? 1 : 0;
          }

          await db.update(aiPredictionHistory)
            .set({
              actualValue: actualValue.toFixed(6),
              actualRecordedAt: new Date().toISOString(),
              absoluteError: absoluteError.toFixed(6),
              percentError: percentError.toFixed(4),
              squaredError: squaredError.toFixed(8),
              isWithinConfidence,
              status: "verified",
            })
            .where(eq(aiPredictionHistory.id, prediction.id));

          verifiedCount++;
        } else {
          // Mark as expired if no actual data found after 2x forecast horizon
          const expireDate = new Date(prediction.predictedAt);
          expireDate.setDate(expireDate.getDate() + (prediction.forecastHorizon || 7) * 2);
          
          if (expireDate <= new Date()) {
            await db.update(aiPredictionHistory)
              .set({ status: "expired" })
              .where(eq(aiPredictionHistory.id, prediction.id));
          }
        }
      }

      return { 
        verified: verifiedCount, 
        message: `Đã xác nhận ${verifiedCount} predictions với dữ liệu thực tế` 
      };
    }),
});
