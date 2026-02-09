import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  oeeRecords, oeeTargets, oeeLossCategories, oeeLossRecords,
  machines, userPredictionConfigs, oeeAlertThresholds, scheduledReports, scheduledReportLogs,
  productionLines
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, asc } from "drizzle-orm";
import ExcelJS from "exceljs";
import { storagePut } from "../storage";
import { sendEmail, getSmtpConfig } from "../emailService";

export const oeeRouter = router({
  // OEE Records
  listRecords: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.machineId) {
        conditions.push(eq(oeeRecords.machineId, input.machineId));
      }
      if (input.startDate) {
        conditions.push(gte(oeeRecords.recordDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(oeeRecords.recordDate, new Date(input.endDate)));
      }

      const records = await db
        .select({
          id: oeeRecords.id,
          machineId: oeeRecords.machineId,
          machineName: machines.name,
          recordDate: oeeRecords.recordDate,
          shiftId: oeeRecords.shiftId,
          plannedProductionTime: oeeRecords.plannedProductionTime,
          actualRunTime: oeeRecords.actualRunTime,
          idealCycleTime: oeeRecords.idealCycleTime,
          totalCount: oeeRecords.totalCount,
          goodCount: oeeRecords.goodCount,
          availability: oeeRecords.availability,
          performance: oeeRecords.performance,
          quality: oeeRecords.quality,
          oee: oeeRecords.oee,
          notes: oeeRecords.notes,
          createdAt: oeeRecords.createdAt,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(oeeRecords.recordDate))
        .limit(input.limit);

      return records;
    }),

  getRecord: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [record] = await db
        .select()
        .from(oeeRecords)
        .where(eq(oeeRecords.id, input.id));
      return record || null;
    }),

  createRecord: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      recordDate: z.string(),
      shiftId: z.number().optional(),
      plannedProductionTime: z.number(),
      actualRunTime: z.number(),
      idealCycleTime: z.number(),
      totalCount: z.number(),
      goodCount: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calculate OEE components
      const availability = input.actualRunTime / input.plannedProductionTime * 100;
      const performance = (input.totalCount * input.idealCycleTime) / input.actualRunTime * 100;
      const quality = input.goodCount / input.totalCount * 100;
      const oee = (availability * performance * quality) / 10000;

      const [record] = await db
        .insert(oeeRecords)
        .values({
          machineId: input.machineId,
          recordDate: new Date(input.recordDate),
          shiftId: input.shiftId,
          plannedProductionTime: input.plannedProductionTime,
          actualRunTime: input.actualRunTime,
          idealCycleTime: String(input.idealCycleTime),
          totalCount: input.totalCount,
          goodCount: input.goodCount,
          availability: String(availability.toFixed(2)),
          performance: String(performance.toFixed(2)),
          quality: String(quality.toFixed(2)),
          oee: String(oee.toFixed(2)),
          notes: input.notes,
        })
        .$returningId();

      return { id: record.id, oee, availability, performance, quality };
    }),

  updateRecord: protectedProcedure
    .input(z.object({
      id: z.number(),
      plannedProductionTime: z.number().optional(),
      actualRunTime: z.number().optional(),
      idealCycleTime: z.number().optional(),
      totalCount: z.number().optional(),
      goodCount: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...data } = input;
      
      // Get current record to recalculate OEE
      const [current] = await db.select().from(oeeRecords).where(eq(oeeRecords.id, id));
      if (!current) throw new Error("Record not found");

      const plannedTime = data.plannedProductionTime ?? current.plannedProductionTime;
      const actualTime = data.actualRunTime ?? current.actualRunTime;
      const cycleTime = data.idealCycleTime ?? Number(current.idealCycleTime);
      const total = data.totalCount ?? (current.totalCount || 0);
      const good = data.goodCount ?? (current.goodCount || 0);

      const availability = actualTime / plannedTime * 100;
      const performance = (total * cycleTime) / actualTime * 100;
      const quality = good / total * 100;
      const oee = (availability * performance * quality) / 10000;

      await db
        .update(oeeRecords)
        .set({
          plannedProductionTime: data.plannedProductionTime,
          actualRunTime: data.actualRunTime,
          idealCycleTime: data.idealCycleTime ? String(data.idealCycleTime) : undefined,
          totalCount: data.totalCount,
          goodCount: data.goodCount,
          notes: data.notes,
          availability: String(availability.toFixed(2)),
          performance: String(performance.toFixed(2)),
          quality: String(quality.toFixed(2)),
          oee: String(oee.toFixed(2)),
          updatedAt: new Date(),
        })
        .where(eq(oeeRecords.id, id));

      return { success: true };
    }),

  deleteRecord: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(oeeRecords).where(eq(oeeRecords.id, input.id));
      return { success: true };
    }),

  // OEE Targets
  listTargets: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db
      .select({
        id: oeeTargets.id,
        machineId: oeeTargets.machineId,
        machineName: machines.name,
        targetOee: oeeTargets.targetOee,
        targetAvailability: oeeTargets.targetAvailability,
        targetPerformance: oeeTargets.targetPerformance,
        targetQuality: oeeTargets.targetQuality,
        effectiveFrom: oeeTargets.effectiveFrom,
        effectiveTo: oeeTargets.effectiveTo,
      })
      .from(oeeTargets)
      .leftJoin(machines, eq(oeeTargets.machineId, machines.id))
      .orderBy(desc(oeeTargets.effectiveFrom));
  }),

  createTarget: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      targetOee: z.number(),
      targetAvailability: z.number(),
      targetPerformance: z.number(),
      targetQuality: z.number(),
      effectiveFrom: z.string(),
      effectiveTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [target] = await db
        .insert(oeeTargets)
        .values({
          machineId: input.machineId,
          targetOee: String(input.targetOee),
          targetAvailability: String(input.targetAvailability),
          targetPerformance: String(input.targetPerformance),
          targetQuality: String(input.targetQuality),
          effectiveFrom: new Date(input.effectiveFrom),
          effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
        })
        .$returningId();

      return { id: target.id };
    }),

  // Loss Categories
  listLossCategories: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    return db.select().from(oeeLossCategories).orderBy(oeeLossCategories.name);
  }),

  createLossCategory: protectedProcedure
    .input(z.object({
      name: z.string(),
      code: z.string(),
      type: z.enum(["availability", "performance", "quality"]),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [category] = await db
        .insert(oeeLossCategories)
        .values(input)
        .$returningId();
      return { id: category.id };
    }),

  // Loss Records
  listLossRecords: publicProcedure
    .input(z.object({
      oeeRecordId: z.number().optional(),
      categoryId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];
      if (input.oeeRecordId) {
        conditions.push(eq(oeeLossRecords.oeeRecordId, input.oeeRecordId));
      }
      if (input.categoryId) {
        conditions.push(eq(oeeLossRecords.lossCategoryId, input.categoryId));
      }

      return db
        .select({
          id: oeeLossRecords.id,
          oeeRecordId: oeeLossRecords.oeeRecordId,
          categoryId: oeeLossRecords.lossCategoryId,
          categoryName: oeeLossCategories.name,
          categoryType: oeeLossCategories.type,
          duration: oeeLossRecords.durationMinutes,
          notes: oeeLossRecords.description,
        })
        .from(oeeLossRecords)
        .leftJoin(oeeLossCategories, eq(oeeLossRecords.lossCategoryId, oeeLossCategories.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    }),

  createLossRecord: protectedProcedure
    .input(z.object({
      oeeRecordId: z.number(),
      categoryId: z.number(),
      duration: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [record] = await db
        .insert(oeeLossRecords)
        .values({
          oeeRecordId: input.oeeRecordId,
          lossCategoryId: input.categoryId,
          durationMinutes: input.duration,
          description: input.notes,
        })
        .$returningId();
      return { id: record.id };
    }),

  // Statistics
  getStats: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const conditions = [gte(oeeRecords.recordDate, startDate)];
      if (input.machineId) {
        conditions.push(eq(oeeRecords.machineId, input.machineId));
      }

      const records = await db
        .select({
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
          avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
          avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
          avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
          minOee: sql<number>`MIN(${oeeRecords.oee})`,
          maxOee: sql<number>`MAX(${oeeRecords.oee})`,
          totalRecords: sql<number>`COUNT(*)`,
        })
        .from(oeeRecords)
        .where(and(...conditions));

      return records[0];
    }),

  getTrend: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const conditions = [gte(oeeRecords.recordDate, startDate)];
      if (input.machineId) {
        conditions.push(eq(oeeRecords.machineId, input.machineId));
      }

      return db
        .select({
          date: sql<string>`DATE(${oeeRecords.recordDate})`,
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
          avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
          avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
          avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
        })
        .from(oeeRecords)
        .where(and(...conditions))
        .groupBy(sql`DATE(${oeeRecords.recordDate})`)
        .orderBy(sql`DATE(${oeeRecords.recordDate})`);
    }),

  getMachineComparison: publicProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      return db
        .select({
          machineId: oeeRecords.machineId,
          machineName: machines.name,
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
          avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
          avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
          avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(gte(oeeRecords.recordDate, startDate))
        .groupBy(oeeRecords.machineId, machines.name)
        .orderBy(sql`AVG(${oeeRecords.oee}) DESC`);
    }),

  getLossAnalysis: publicProcedure
    .input(z.object({
      machineId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get OEE record IDs in date range
      const oeeRecordIds = await db
        .select({ id: oeeRecords.id })
        .from(oeeRecords)
        .where(and(
          gte(oeeRecords.recordDate, startDate),
          input.machineId ? eq(oeeRecords.machineId, input.machineId) : undefined
        ));

      if (oeeRecordIds.length === 0) return [];

      const ids = oeeRecordIds.map((r: { id: number }) => r.id);

      return db
        .select({
          categoryId: oeeLossRecords.lossCategoryId,
          categoryName: oeeLossCategories.name,
          categoryType: oeeLossCategories.type,
          totalDuration: sql<number>`SUM(${oeeLossRecords.durationMinutes})`,
          occurrences: sql<number>`COUNT(*)`,
        })
        .from(oeeLossRecords)
        .leftJoin(oeeLossCategories, eq(oeeLossRecords.lossCategoryId, oeeLossCategories.id))
        .where(sql`${oeeLossRecords.oeeRecordId} IN (${sql.join(ids.map((id: number) => sql`${id}`), sql`, `)})`)
        .groupBy(oeeLossRecords.lossCategoryId, oeeLossCategories.name, oeeLossCategories.type)
        .orderBy(sql`SUM(${oeeLossRecords.durationMinutes}) DESC`);
    }),

  // OEE Comparison API
  getComparison: publicProcedure
    .input(z.object({
      type: z.enum(["machines", "lines"]),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], summary: {}, trendData: [] };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get comparison data by machine
      const comparisonData = await db
        .select({
          id: oeeRecords.machineId,
          name: machines.name,
          oee: sql<number>`AVG(${oeeRecords.oee})`,
          availability: sql<number>`AVG(${oeeRecords.availability})`,
          performance: sql<number>`AVG(${oeeRecords.performance})`,
          quality: sql<number>`AVG(${oeeRecords.quality})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(gte(oeeRecords.recordDate, startDate))
        .groupBy(oeeRecords.machineId, machines.name)
        .orderBy(sql`AVG(${oeeRecords.oee}) DESC`);

      // Calculate trend for each machine (compare last 7 days vs previous 7 days)
      const trendStartDate = new Date();
      trendStartDate.setDate(trendStartDate.getDate() - 14);
      const midDate = new Date();
      midDate.setDate(midDate.getDate() - 7);

      const items = await Promise.all(comparisonData.map(async (item) => {
        // Get previous period OEE
        const [prevPeriod] = await db
          .select({ avgOee: sql<number>`AVG(${oeeRecords.oee})` })
          .from(oeeRecords)
          .where(and(
            eq(oeeRecords.machineId, item.id!),
            gte(oeeRecords.recordDate, trendStartDate),
            lte(oeeRecords.recordDate, midDate)
          ));

        const [currPeriod] = await db
          .select({ avgOee: sql<number>`AVG(${oeeRecords.oee})` })
          .from(oeeRecords)
          .where(and(
            eq(oeeRecords.machineId, item.id!),
            gte(oeeRecords.recordDate, midDate)
          ));

        const trend = (currPeriod?.avgOee || 0) - (prevPeriod?.avgOee || 0);

        return {
          ...item,
          oee: Number(item.oee) || 0,
          availability: Number(item.availability) || 0,
          performance: Number(item.performance) || 0,
          quality: Number(item.quality) || 0,
          trend,
        };
      }));

      // Get trend data for chart
      const trendData = await db
        .select({
          date: sql<string>`DATE(${oeeRecords.recordDate})`,
          machineId: oeeRecords.machineId,
          machineName: machines.name,
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(gte(oeeRecords.recordDate, startDate))
        .groupBy(sql`DATE(${oeeRecords.recordDate})`, oeeRecords.machineId, machines.name)
        .orderBy(sql`DATE(${oeeRecords.recordDate})`);

      // Transform trend data for chart
      const trendByDate: Record<string, any> = {};
      trendData.forEach((d) => {
        if (!trendByDate[d.date]) {
          trendByDate[d.date] = { date: d.date };
        }
        if (d.machineName) {
          trendByDate[d.date][d.machineName] = Number(d.avgOee) || 0;
        }
      });

      // Calculate summary
      const oeeValues = items.map(i => i.oee);
      const summary = {
        avgOee: oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length || 0,
        maxOee: Math.max(...oeeValues) || 0,
        minOee: Math.min(...oeeValues) || 0,
        topPerformer: items[0]?.name || "N/A",
        bottomPerformer: items[items.length - 1]?.name || "N/A",
        achievedTarget: items.filter(i => i.oee >= 85).length,
        totalItems: items.length,
      };

      return {
        items,
        summary,
        trendData: Object.values(trendByDate),
      };
    }),

  // OEE Prediction API with Multiple Algorithms
  getPrediction: publicProcedure
    .input(z.object({
      days: z.number().default(30),
      predictionDays: z.number().default(14),
      algorithm: z.enum(["linear", "moving_avg", "exp_smoothing"]).default("linear"),
      confidenceLevel: z.number().default(95),
      alertThreshold: z.number().default(65),
      movingAvgWindow: z.number().optional(),
      smoothingFactor: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { chartData: [], predictions: [], alerts: [], settings: input };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get historical OEE data by machine
      const historicalData = await db
        .select({
          machineId: oeeRecords.machineId,
          machineName: machines.name,
          date: sql<string>`DATE(${oeeRecords.recordDate})`,
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(gte(oeeRecords.recordDate, startDate))
        .groupBy(oeeRecords.machineId, machines.name, sql`DATE(${oeeRecords.recordDate})`)
        .orderBy(sql`DATE(${oeeRecords.recordDate})`);

      // Group by machine
      const machineData: Record<number, { name: string; data: { date: string; oee: number }[] }> = {};
      historicalData.forEach((d) => {
        if (!d.machineId) return;
        if (!machineData[d.machineId]) {
          machineData[d.machineId] = { name: d.machineName || `Machine ${d.machineId}`, data: [] };
        }
        machineData[d.machineId].data.push({ date: d.date, oee: Number(d.avgOee) || 0 });
      });

      // Linear regression function
      const linearRegression = (data: { x: number; y: number }[]) => {
        const n = data.length;
        if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

        const sumX = data.reduce((a, b) => a + b.x, 0);
        const sumY = data.reduce((a, b) => a + b.y, 0);
        const sumXY = data.reduce((a, b) => a + b.x * b.y, 0);
        const sumX2 = data.reduce((a, b) => a + b.x * b.x, 0);
        const sumY2 = data.reduce((a, b) => a + b.y * b.y, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // R-squared
        const yMean = sumY / n;
        const ssTotal = data.reduce((a, b) => a + Math.pow(b.y - yMean, 2), 0);
        const ssRes = data.reduce((a, b) => a + Math.pow(b.y - (slope * b.x + intercept), 2), 0);
        const r2 = 1 - ssRes / ssTotal;

        return { slope, intercept, r2: Math.max(0, r2) };
      };

      // Moving Average function
      const movingAverage = (data: number[], window: number) => {
        if (data.length < window) return data[data.length - 1] || 0;
        const lastWindow = data.slice(-window);
        return lastWindow.reduce((a, b) => a + b, 0) / window;
      };

      // Exponential Smoothing function
      const exponentialSmoothing = (data: number[], alpha: number, periods: number) => {
        if (data.length === 0) return 0;
        let forecast = data[0];
        for (let i = 1; i < data.length; i++) {
          forecast = alpha * data[i] + (1 - alpha) * forecast;
        }
        // Predict future
        return forecast;
      };

      // Confidence interval multiplier based on confidence level
      const getZScore = (confidenceLevel: number) => {
        if (confidenceLevel >= 99) return 2.576;
        if (confidenceLevel >= 95) return 1.96;
        if (confidenceLevel >= 90) return 1.645;
        return 1.28;
      };
      const zScore = getZScore(input.confidenceLevel);

      // Generate predictions for each machine
      const predictions: any[] = [];
      const alerts: any[] = [];

      Object.entries(machineData).forEach(([machineId, { name, data }]) => {
        if (data.length < 7) return; // Need at least 7 days of data

        const oeeValues = data.map(d => d.oee);
        const currentOee = oeeValues[oeeValues.length - 1];
        let predictedOee: number;
        let confidence: number;

        if (input.algorithm === "linear") {
          // Linear Regression
          const regressionData = data.map((d, i) => ({ x: i, y: d.oee }));
          const { slope, intercept, r2 } = linearRegression(regressionData);
          predictedOee = slope * (data.length + input.predictionDays) + intercept;
          confidence = r2 * 100;
        } else if (input.algorithm === "moving_avg") {
          // Moving Average
          const window = input.movingAvgWindow || 7;
          predictedOee = movingAverage(oeeValues, window);
          // Confidence based on variance
          const mean = oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length;
          const variance = oeeValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / oeeValues.length;
          confidence = Math.max(0, 100 - variance);
        } else {
          // Exponential Smoothing
          const alpha = input.smoothingFactor || 0.3;
          predictedOee = exponentialSmoothing(oeeValues, alpha, input.predictionDays);
          // Confidence based on smoothing factor
          confidence = 70 + alpha * 30;
        }

        const change = predictedOee - currentOee;

        // Recommendation
        let recommendation = "Duy trì hiệu suất hiện tại";
        if (change < -5) {
          recommendation = "Cần kiểm tra và bảo trì thiết bị";
        } else if (change < -2) {
          recommendation = "Theo dõi chặt chẽ xu hướng giảm";
        } else if (change > 5) {
          recommendation = "Xu hướng tích cực, tiếp tục phát huy";
        }

        predictions.push({
          id: Number(machineId),
          name,
          currentOee,
          predictedOee: Math.max(0, Math.min(100, predictedOee)),
          change,
          confidence,
          recommendation,
        });

        // Generate alerts using custom threshold
        if (predictedOee < input.alertThreshold || change < -10) {
          alerts.push({
            name,
            severity: predictedOee < (input.alertThreshold - 15) || change < -15 ? "high" : change < -10 ? "medium" : "low",
            message: `Dự báo OEE giảm ${Math.abs(change).toFixed(1)}% trong ${input.predictionDays} ngày tới`,
            currentOee,
            predictedOee: Math.max(0, Math.min(100, predictedOee)),
          });
        }
      });

      // Generate chart data (aggregate)
      const chartData: any[] = [];
      const allDates = Array.from(new Set(historicalData.map(d => d.date))).sort();
      
      // Add historical data
      allDates.forEach((date) => {
        const dayData = historicalData.filter(d => d.date === date);
        const avgOee = dayData.reduce((a, b) => a + (Number(b.avgOee) || 0), 0) / dayData.length;
        chartData.push({
          date,
          actual: avgOee,
          predicted: null,
          upperBound: null,
          lowerBound: null,
        });
      });

      // Add predictions based on selected algorithm
      const allData = historicalData.map((d, i) => ({ x: i, y: Number(d.avgOee) || 0 }));
      const allOeeValues = allData.map(d => d.y);
      
      let chartPredictions: number[] = [];
      let stdDev: number;

      if (input.algorithm === "linear") {
        const { slope, intercept } = linearRegression(allData);
        stdDev = Math.sqrt(allData.reduce((a, b) => a + Math.pow(b.y - (slope * b.x + intercept), 2), 0) / allData.length);
        for (let i = 1; i <= input.predictionDays; i++) {
          chartPredictions.push(slope * (allData.length + i) + intercept);
        }
      } else if (input.algorithm === "moving_avg") {
        const window = input.movingAvgWindow || 7;
        const baseValue = movingAverage(allOeeValues, window);
        stdDev = Math.sqrt(allOeeValues.slice(-window).reduce((a, b) => a + Math.pow(b - baseValue, 2), 0) / window);
        for (let i = 1; i <= input.predictionDays; i++) {
          chartPredictions.push(baseValue);
        }
      } else {
        const alpha = input.smoothingFactor || 0.3;
        const baseValue = exponentialSmoothing(allOeeValues, alpha, 1);
        const mean = allOeeValues.reduce((a, b) => a + b, 0) / allOeeValues.length;
        stdDev = Math.sqrt(allOeeValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allOeeValues.length) * (1 - alpha);
        for (let i = 1; i <= input.predictionDays; i++) {
          chartPredictions.push(baseValue);
        }
      }

      for (let i = 0; i < input.predictionDays; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i + 1);
        const dateStr = futureDate.toISOString().split('T')[0];
        const predicted = chartPredictions[i];
        
        chartData.push({
          date: dateStr,
          actual: null,
          predicted: Math.max(0, Math.min(100, predicted)),
          upperBound: Math.min(100, predicted + zScore * stdDev),
          lowerBound: Math.max(0, predicted - zScore * stdDev),
        });
      }

      return {
        chartData,
        predictions: predictions.sort((a, b) => a.predictedOee - b.predictedOee),
        alerts: alerts.sort((a, b) => (a.severity === "high" ? -1 : b.severity === "high" ? 1 : 0)),
        settings: {
          algorithm: input.algorithm,
          predictionDays: input.predictionDays,
          confidenceLevel: input.confidenceLevel,
          alertThreshold: input.alertThreshold,
          movingAvgWindow: input.movingAvgWindow,
          smoothingFactor: input.smoothingFactor,
        },
      };
    }),

  // Export OEE Comparison to Excel
  exportComparisonExcel: protectedProcedure
    .input(z.object({
      type: z.enum(["machines", "lines"]).default("machines"),
      days: z.number().default(30),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get OEE data
      const records = await db
        .select({
          machineId: oeeRecords.machineId,
          machineName: machines.name,
          recordDate: oeeRecords.recordDate,
          availability: oeeRecords.availability,
          performance: oeeRecords.performance,
          quality: oeeRecords.quality,
          oee: oeeRecords.oee,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(gte(oeeRecords.recordDate, startDate))
        .orderBy(desc(oeeRecords.recordDate));

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SPC/CPK System';
      workbook.created = new Date();

      // Sheet 1: Ranking
      const rankingSheet = workbook.addWorksheet('Bảng xếp hạng OEE');
      rankingSheet.columns = [
        { header: 'Hạng', key: 'rank', width: 8 },
        { header: 'Tên', key: 'name', width: 25 },
        { header: 'OEE (%)', key: 'oee', width: 12 },
        { header: 'Availability (%)', key: 'availability', width: 15 },
        { header: 'Performance (%)', key: 'performance', width: 15 },
        { header: 'Quality (%)', key: 'quality', width: 12 },
        { header: 'Trạng thái', key: 'status', width: 15 },
      ];

      // Group by machine and calculate averages
      const machineStats: Record<number, { name: string; oeeSum: number; availSum: number; perfSum: number; qualSum: number; count: number }> = {};
      records.forEach(r => {
        if (!r.machineId) return;
        if (!machineStats[r.machineId]) {
          machineStats[r.machineId] = { name: r.machineName || `Machine ${r.machineId}`, oeeSum: 0, availSum: 0, perfSum: 0, qualSum: 0, count: 0 };
        }
        machineStats[r.machineId].oeeSum += Number(r.oee) || 0;
        machineStats[r.machineId].availSum += Number(r.availability) || 0;
        machineStats[r.machineId].perfSum += Number(r.performance) || 0;
        machineStats[r.machineId].qualSum += Number(r.quality) || 0;
        machineStats[r.machineId].count++;
      });

      const ranking = Object.entries(machineStats)
        .map(([id, stats]) => ({
          id: Number(id),
          name: stats.name,
          oee: stats.oeeSum / stats.count,
          availability: stats.availSum / stats.count,
          performance: stats.perfSum / stats.count,
          quality: stats.qualSum / stats.count,
        }))
        .sort((a, b) => b.oee - a.oee);

      ranking.forEach((item, index) => {
        const status = item.oee >= 85 ? 'Xuất sắc' : item.oee >= 75 ? 'Tốt' : item.oee >= 65 ? 'Trung bình' : 'Cần cải thiện';
        rankingSheet.addRow({
          rank: index + 1,
          name: item.name,
          oee: item.oee.toFixed(2),
          availability: item.availability.toFixed(2),
          performance: item.performance.toFixed(2),
          quality: item.quality.toFixed(2),
          status,
        });
      });

      // Style header
      rankingSheet.getRow(1).font = { bold: true };
      rankingSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      rankingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Sheet 2: Daily Data
      const dailySheet = workbook.addWorksheet('Dữ liệu theo ngày');
      dailySheet.columns = [
        { header: 'Ngày', key: 'date', width: 15 },
        { header: 'Máy', key: 'machine', width: 25 },
        { header: 'OEE (%)', key: 'oee', width: 12 },
        { header: 'Availability (%)', key: 'availability', width: 15 },
        { header: 'Performance (%)', key: 'performance', width: 15 },
        { header: 'Quality (%)', key: 'quality', width: 12 },
      ];

      records.forEach(r => {
        dailySheet.addRow({
          date: r.recordDate ? new Date(r.recordDate).toLocaleDateString('vi-VN') : '',
          machine: r.machineName || `Machine ${r.machineId}`,
          oee: Number(r.oee)?.toFixed(2) || '0',
          availability: Number(r.availability)?.toFixed(2) || '0',
          performance: Number(r.performance)?.toFixed(2) || '0',
          quality: Number(r.quality)?.toFixed(2) || '0',
        });
      });

      dailySheet.getRow(1).font = { bold: true };
      dailySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      dailySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      // Sheet 3: Summary
      const summarySheet = workbook.addWorksheet('Tổng hợp');
      summarySheet.columns = [
        { header: 'Chỉ số', key: 'metric', width: 25 },
        { header: 'Giá trị', key: 'value', width: 20 },
      ];

      const avgOee = ranking.reduce((a, b) => a + b.oee, 0) / ranking.length || 0;
      const maxOee = Math.max(...ranking.map(r => r.oee)) || 0;
      const minOee = Math.min(...ranking.map(r => r.oee)) || 0;
      const achievedTarget = ranking.filter(r => r.oee >= 85).length;

      summarySheet.addRow({ metric: 'Khoảng thời gian', value: `${input.days} ngày` });
      summarySheet.addRow({ metric: 'Số lượng máy', value: ranking.length });
      summarySheet.addRow({ metric: 'OEE Trung bình', value: `${avgOee.toFixed(2)}%` });
      summarySheet.addRow({ metric: 'OEE Cao nhất', value: `${maxOee.toFixed(2)}%` });
      summarySheet.addRow({ metric: 'OEE Thấp nhất', value: `${minOee.toFixed(2)}%` });
      summarySheet.addRow({ metric: 'Đạt mục tiêu (>=85%)', value: `${achievedTarget}/${ranking.length}` });
      summarySheet.addRow({ metric: 'Ngày xuất báo cáo', value: new Date().toLocaleDateString('vi-VN') });

      summarySheet.getRow(1).font = { bold: true };

      // Generate buffer and upload to S3
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `oee-comparison-${Date.now()}.xlsx`;
      const { url } = await storagePut(fileName, Buffer.from(buffer), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      return { url, fileName };
    }),

  // Export OEE Comparison to PDF (HTML format for download)
  exportComparisonPdf: protectedProcedure
    .input(z.object({
      type: z.enum(["machines", "lines"]).default("machines"),
      days: z.number().default(30),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get OEE data
      const records = await db
        .select({
          machineId: oeeRecords.machineId,
          machineName: machines.name,
          availability: oeeRecords.availability,
          performance: oeeRecords.performance,
          quality: oeeRecords.quality,
          oee: oeeRecords.oee,
        })
        .from(oeeRecords)
        .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
        .where(gte(oeeRecords.recordDate, startDate));

      // Group by machine
      const machineStats: Record<number, { name: string; oeeSum: number; availSum: number; perfSum: number; qualSum: number; count: number }> = {};
      records.forEach(r => {
        if (!r.machineId) return;
        if (!machineStats[r.machineId]) {
          machineStats[r.machineId] = { name: r.machineName || `Machine ${r.machineId}`, oeeSum: 0, availSum: 0, perfSum: 0, qualSum: 0, count: 0 };
        }
        machineStats[r.machineId].oeeSum += Number(r.oee) || 0;
        machineStats[r.machineId].availSum += Number(r.availability) || 0;
        machineStats[r.machineId].perfSum += Number(r.performance) || 0;
        machineStats[r.machineId].qualSum += Number(r.quality) || 0;
        machineStats[r.machineId].count++;
      });

      const ranking = Object.entries(machineStats)
        .map(([id, stats]) => ({
          id: Number(id),
          name: stats.name,
          oee: stats.oeeSum / stats.count,
          availability: stats.availSum / stats.count,
          performance: stats.perfSum / stats.count,
          quality: stats.qualSum / stats.count,
        }))
        .sort((a, b) => b.oee - a.oee);

      const avgOee = ranking.reduce((a, b) => a + b.oee, 0) / ranking.length || 0;

      // Generate HTML report
      const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo So sánh OEE</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .summary-card { background: #f3f4f6; padding: 15px; border-radius: 8px; flex: 1; }
    .summary-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #6b7280; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #1f2937; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
    th { background: #3b82f6; color: white; }
    tr:nth-child(even) { background: #f9fafb; }
    .status-excellent { color: #22c55e; font-weight: bold; }
    .status-good { color: #3b82f6; font-weight: bold; }
    .status-average { color: #f59e0b; font-weight: bold; }
    .status-poor { color: #ef4444; font-weight: bold; }
    .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Báo cáo So sánh OEE</h1>
  <p>Khoảng thời gian: ${input.days} ngày | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</p>
  
  <div class="summary">
    <div class="summary-card">
      <h3>OEE Trung bình</h3>
      <div class="value">${avgOee.toFixed(1)}%</div>
    </div>
    <div class="summary-card">
      <h3>Số lượng máy</h3>
      <div class="value">${ranking.length}</div>
    </div>
    <div class="summary-card">
      <h3>Đạt mục tiêu</h3>
      <div class="value">${ranking.filter(r => r.oee >= 85).length}/${ranking.length}</div>
    </div>
  </div>

  <h2>Bảng xếp hạng OEE</h2>
  <table>
    <thead>
      <tr>
        <th>Hạng</th>
        <th>Tên máy</th>
        <th>OEE (%)</th>
        <th>Availability (%)</th>
        <th>Performance (%)</th>
        <th>Quality (%)</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      ${ranking.map((item, index) => {
        const statusClass = item.oee >= 85 ? 'status-excellent' : item.oee >= 75 ? 'status-good' : item.oee >= 65 ? 'status-average' : 'status-poor';
        const statusText = item.oee >= 85 ? 'Xuất sắc' : item.oee >= 75 ? 'Tốt' : item.oee >= 65 ? 'Trung bình' : 'Cần cải thiện';
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${item.name}</td>
            <td>${item.oee.toFixed(2)}</td>
            <td>${item.availability.toFixed(2)}</td>
            <td>${item.performance.toFixed(2)}</td>
            <td>${item.quality.toFixed(2)}</td>
            <td class="${statusClass}">${statusText}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK</p>
  </div>
</body>
</html>
      `;

      const fileName = `oee-comparison-${Date.now()}.html`;
      const { url } = await storagePut(fileName, Buffer.from(html), 'text/html');

      return { url, fileName };
    }),

  // Send OEE Alert Email
  sendOeeAlert: protectedProcedure
    .input(z.object({
      machineName: z.string(),
      currentOee: z.number(),
      predictedOee: z.number(),
      change: z.number(),
      severity: z.enum(["high", "medium", "low"]),
      recipients: z.array(z.string().email()),
    }))
    .mutation(async ({ input }) => {
      const smtpConfig = await getSmtpConfig();
      if (!smtpConfig) {
        throw new Error("SMTP chưa được cấu hình");
      }

      const severityText = input.severity === 'high' ? 'CAO' : input.severity === 'medium' ? 'TRUNG BÌNH' : 'THẤP';
      const severityColor = input.severity === 'high' ? '#ef4444' : input.severity === 'medium' ? '#f59e0b' : '#3b82f6';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .alert-box { border: 2px solid ${severityColor}; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .alert-header { color: ${severityColor}; font-size: 18px; font-weight: bold; margin-bottom: 15px; }
    .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .metric:last-child { border-bottom: none; }
    .metric-label { color: #6b7280; }
    .metric-value { font-weight: bold; }
    .change-negative { color: #ef4444; }
    .change-positive { color: #22c55e; }
  </style>
</head>
<body>
  <h1>Cảnh báo OEE - Mức độ: ${severityText}</h1>
  <div class="alert-box">
    <div class="alert-header">⚠️ ${input.machineName}</div>
    <div class="metric">
      <span class="metric-label">OEE hiện tại:</span>
      <span class="metric-value">${input.currentOee.toFixed(1)}%</span>
    </div>
    <div class="metric">
      <span class="metric-label">OEE dự báo:</span>
      <span class="metric-value">${input.predictedOee.toFixed(1)}%</span>
    </div>
    <div class="metric">
      <span class="metric-label">Thay đổi:</span>
      <span class="metric-value ${input.change < 0 ? 'change-negative' : 'change-positive'}">
        ${input.change > 0 ? '+' : ''}${input.change.toFixed(1)}%
      </span>
    </div>
  </div>
  <p>Vui lòng kiểm tra và có biện pháp khắc phục kịp thời.</p>
  <p style="color: #6b7280; font-size: 12px;">Email được gửi tự động bởi Hệ thống SPC/CPK</p>
</body>
</html>
      `;

      for (const recipient of input.recipients) {
        await sendEmail(
          recipient,
          `[CẢNH BÁO OEE - ${severityText}] ${input.machineName}`,
          html
        );
      }

      return { success: true, sentTo: input.recipients.length };
    }),

  // Compare Algorithms - Run prediction with all algorithms
  compareAlgorithms: publicProcedure
    .input(z.object({
      days: z.number().default(30),
      predictionDays: z.number().default(14),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { algorithms: [], chartData: [], recommendation: null };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get historical OEE data
      const historicalData = await db
        .select({
          date: sql<string>`DATE(${oeeRecords.recordDate})`,
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
        })
        .from(oeeRecords)
        .where(gte(oeeRecords.recordDate, startDate))
        .groupBy(sql`DATE(${oeeRecords.recordDate})`)
        .orderBy(sql`DATE(${oeeRecords.recordDate})`);

      if (historicalData.length < 7) {
        return { algorithms: [], chartData: [], recommendation: null };
      }

      const oeeValues = historicalData.map(d => Number(d.avgOee) || 0);

      // Linear Regression
      const linearRegression = (data: number[]) => {
        const n = data.length;
        const sumX = data.reduce((a, _, i) => a + i, 0);
        const sumY = data.reduce((a, b) => a + b, 0);
        const sumXY = data.reduce((a, b, i) => a + i * b, 0);
        const sumX2 = data.reduce((a, _, i) => a + i * i, 0);
        const sumY2 = data.reduce((a, b) => a + b * b, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const yMean = sumY / n;
        const ssTotal = data.reduce((a, b) => a + Math.pow(b - yMean, 2), 0);
        const ssRes = data.reduce((a, b, i) => a + Math.pow(b - (slope * i + intercept), 2), 0);
        const r2 = 1 - ssRes / ssTotal;

        const predictions: number[] = [];
        for (let i = 0; i < input.predictionDays; i++) {
          predictions.push(slope * (n + i) + intercept);
        }

        // Calculate RMSE
        const rmse = Math.sqrt(data.reduce((a, b, i) => a + Math.pow(b - (slope * i + intercept), 2), 0) / n);

        return { predictions, r2: Math.max(0, r2), rmse };
      };

      // Moving Average
      const movingAverage = (data: number[], window: number = 7) => {
        const lastWindow = data.slice(-window);
        const avg = lastWindow.reduce((a, b) => a + b, 0) / window;
        const predictions = Array(input.predictionDays).fill(avg);

        // Calculate variance for confidence
        const variance = lastWindow.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / window;
        const rmse = Math.sqrt(variance);

        return { predictions, r2: 1 - variance / (data.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / data.length), rmse };
      };

      // Exponential Smoothing
      const exponentialSmoothing = (data: number[], alpha: number = 0.3) => {
        let forecast = data[0];
        for (let i = 1; i < data.length; i++) {
          forecast = alpha * data[i] + (1 - alpha) * forecast;
        }
        const predictions = Array(input.predictionDays).fill(forecast);

        // Calculate RMSE
        let tempForecast = data[0];
        let sumSquaredError = 0;
        for (let i = 1; i < data.length; i++) {
          sumSquaredError += Math.pow(data[i] - tempForecast, 2);
          tempForecast = alpha * data[i] + (1 - alpha) * tempForecast;
        }
        const rmse = Math.sqrt(sumSquaredError / (data.length - 1));
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const ssTotal = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const r2 = 1 - sumSquaredError / ssTotal;

        return { predictions, r2: Math.max(0, r2), rmse };
      };

      const linearResult = linearRegression(oeeValues);
      const maResult = movingAverage(oeeValues);
      const esResult = exponentialSmoothing(oeeValues);

      const algorithms = [
        {
          name: 'Linear Regression',
          code: 'linear',
          predictions: linearResult.predictions.map(p => Math.max(0, Math.min(100, p))),
          r2: linearResult.r2,
          rmse: linearResult.rmse,
          description: 'Phù hợp khi dữ liệu có xu hướng tuyến tính rõ ràng',
        },
        {
          name: 'Moving Average',
          code: 'moving_avg',
          predictions: maResult.predictions.map(p => Math.max(0, Math.min(100, p))),
          r2: maResult.r2,
          rmse: maResult.rmse,
          description: 'Phù hợp khi dữ liệu có nhiều biến động ngắn hạn',
        },
        {
          name: 'Exponential Smoothing',
          code: 'exp_smoothing',
          predictions: esResult.predictions.map(p => Math.max(0, Math.min(100, p))),
          r2: esResult.r2,
          rmse: esResult.rmse,
          description: 'Phù hợp khi dữ liệu gần đây quan trọng hơn',
        },
      ];

      // Generate chart data
      const chartData: any[] = [];

      // Historical data
      historicalData.forEach((d, i) => {
        chartData.push({
          date: d.date,
          actual: Number(d.avgOee) || 0,
          linear: null,
          movingAvg: null,
          expSmoothing: null,
        });
      });

      // Predictions
      for (let i = 0; i < input.predictionDays; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i + 1);
        chartData.push({
          date: futureDate.toISOString().split('T')[0],
          actual: null,
          linear: linearResult.predictions[i],
          movingAvg: maResult.predictions[i],
          expSmoothing: esResult.predictions[i],
        });
      }

      // Recommendation based on R² and RMSE
      const bestAlgorithm = algorithms.reduce((best, current) => {
        const bestScore = best.r2 * 0.6 + (1 / (1 + best.rmse)) * 0.4;
        const currentScore = current.r2 * 0.6 + (1 / (1 + current.rmse)) * 0.4;
        return currentScore > bestScore ? current : best;
      });

      return {
        algorithms,
        chartData,
        recommendation: {
          algorithm: bestAlgorithm.name,
          code: bestAlgorithm.code,
          reason: `${bestAlgorithm.name} có R² = ${(bestAlgorithm.r2 * 100).toFixed(1)}% và RMSE = ${bestAlgorithm.rmse.toFixed(2)}, phù hợp nhất với dữ liệu hiện tại.`,
        },
      };
    }),

  // Save Prediction Config
  savePredictionConfig: protectedProcedure
    .input(z.object({
      configName: z.string().min(1),
      configType: z.enum(["oee", "cpk", "spc"]).default("oee"),
      algorithm: z.enum(["linear", "moving_avg", "exp_smoothing"]).default("linear"),
      predictionDays: z.number().default(14),
      confidenceLevel: z.number().default(95),
      alertThreshold: z.number().default(5),
      movingAvgWindow: z.number().optional(),
      smoothingFactor: z.number().optional(),
      historicalDays: z.number().default(30),
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db.update(userPredictionConfigs)
          .set({ isDefault: 0 })
          .where(and(
            eq(userPredictionConfigs.userId, ctx.user.id),
            eq(userPredictionConfigs.configType, input.configType)
          ));
      }

      const [result] = await db.insert(userPredictionConfigs).values({
        userId: ctx.user.id,
        configName: input.configName,
        configType: input.configType,
        algorithm: input.algorithm,
        predictionDays: input.predictionDays,
        confidenceLevel: String(input.confidenceLevel),
        alertThreshold: String(input.alertThreshold),
        movingAvgWindow: input.movingAvgWindow,
        smoothingFactor: input.smoothingFactor ? String(input.smoothingFactor) : undefined,
        historicalDays: input.historicalDays,
        isDefault: input.isDefault ? 1 : 0,
      });

      return { success: true, id: result.insertId };
    }),

  // List User Prediction Configs
  listPredictionConfigs: protectedProcedure
    .input(z.object({
      configType: z.enum(["oee", "cpk", "spc"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [
        eq(userPredictionConfigs.userId, ctx.user.id),
        eq(userPredictionConfigs.isActive, 1),
      ];

      if (input.configType) {
        conditions.push(eq(userPredictionConfigs.configType, input.configType));
      }

      return db.select()
        .from(userPredictionConfigs)
        .where(and(...conditions))
        .orderBy(desc(userPredictionConfigs.isDefault), desc(userPredictionConfigs.createdAt));
    }),

  // Get Default Prediction Config
  getDefaultConfig: protectedProcedure
    .input(z.object({
      configType: z.enum(["oee", "cpk", "spc"]),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const [config] = await db.select()
        .from(userPredictionConfigs)
        .where(and(
          eq(userPredictionConfigs.userId, ctx.user.id),
          eq(userPredictionConfigs.configType, input.configType),
          eq(userPredictionConfigs.isDefault, 1),
          eq(userPredictionConfigs.isActive, 1)
        ))
        .limit(1);

      return config || null;
    }),

  // Update Prediction Config
  updatePredictionConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      configName: z.string().optional(),
      algorithm: z.enum(["linear", "moving_avg", "exp_smoothing"]).optional(),
      predictionDays: z.number().optional(),
      confidenceLevel: z.number().optional(),
      alertThreshold: z.number().optional(),
      movingAvgWindow: z.number().optional(),
      smoothingFactor: z.number().optional(),
      historicalDays: z.number().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;

      // Verify ownership
      const [existing] = await db.select()
        .from(userPredictionConfigs)
        .where(and(
          eq(userPredictionConfigs.id, id),
          eq(userPredictionConfigs.userId, ctx.user.id)
        ));

      if (!existing) throw new Error("Config not found");

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await db.update(userPredictionConfigs)
          .set({ isDefault: 0 })
          .where(and(
            eq(userPredictionConfigs.userId, ctx.user.id),
            eq(userPredictionConfigs.configType, existing.configType)
          ));
      }

      const updateData: any = {};
      if (updates.configName) updateData.configName = updates.configName;
      if (updates.algorithm) updateData.algorithm = updates.algorithm;
      if (updates.predictionDays) updateData.predictionDays = updates.predictionDays;
      if (updates.confidenceLevel) updateData.confidenceLevel = String(updates.confidenceLevel);
      if (updates.alertThreshold) updateData.alertThreshold = String(updates.alertThreshold);
      if (updates.movingAvgWindow !== undefined) updateData.movingAvgWindow = updates.movingAvgWindow;
      if (updates.smoothingFactor !== undefined) updateData.smoothingFactor = String(updates.smoothingFactor);
      if (updates.historicalDays) updateData.historicalDays = updates.historicalDays;
      if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault ? 1 : 0;

      await db.update(userPredictionConfigs)
        .set(updateData)
        .where(eq(userPredictionConfigs.id, id));

      return { success: true };
    }),

  // Delete Prediction Config
  deletePredictionConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(userPredictionConfigs)
        .set({ isActive: 0 })
        .where(and(
          eq(userPredictionConfigs.id, input.id),
          eq(userPredictionConfigs.userId, ctx.user.id)
        ));

      return { success: true };
    }),

  // ============ OEE Alert Thresholds ============
  
  // List Alert Thresholds
  listAlertThresholds: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      productionLineId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(oeeAlertThresholds.isActive, 1)];
      if (input?.machineId) {
        conditions.push(eq(oeeAlertThresholds.machineId, input.machineId));
      }
      if (input?.productionLineId) {
        conditions.push(eq(oeeAlertThresholds.productionLineId, input.productionLineId));
      }

      const thresholds = await db.select({
        id: oeeAlertThresholds.id,
        machineId: oeeAlertThresholds.machineId,
        productionLineId: oeeAlertThresholds.productionLineId,
        targetOee: oeeAlertThresholds.targetOee,
        warningThreshold: oeeAlertThresholds.warningThreshold,
        criticalThreshold: oeeAlertThresholds.criticalThreshold,
        dropAlertThreshold: oeeAlertThresholds.dropAlertThreshold,
        relativeDropThreshold: oeeAlertThresholds.relativeDropThreshold,
        availabilityTarget: oeeAlertThresholds.availabilityTarget,
        performanceTarget: oeeAlertThresholds.performanceTarget,
        qualityTarget: oeeAlertThresholds.qualityTarget,
        machineName: machines.name,
        lineName: productionLines.name,
        createdAt: oeeAlertThresholds.createdAt,
      })
      .from(oeeAlertThresholds)
      .leftJoin(machines, eq(oeeAlertThresholds.machineId, machines.id))
      .leftJoin(productionLines, eq(oeeAlertThresholds.productionLineId, productionLines.id))
      .where(and(...conditions))
      .orderBy(desc(oeeAlertThresholds.createdAt));

      return thresholds;
    }),

  // Create Alert Threshold
  createAlertThreshold: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      productionLineId: z.number().optional(),
      targetOee: z.number().min(0).max(100).default(85),
      warningThreshold: z.number().min(0).max(100).default(80),
      criticalThreshold: z.number().min(0).max(100).default(70),
      dropAlertThreshold: z.number().min(0).max(100).default(5),
      relativeDropThreshold: z.number().min(0).max(100).default(10),
      availabilityTarget: z.number().min(0).max(100).optional(),
      performanceTarget: z.number().min(0).max(100).optional(),
      qualityTarget: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(oeeAlertThresholds).values({
        machineId: input.machineId || null,
        productionLineId: input.productionLineId || null,
        targetOee: String(input.targetOee),
        warningThreshold: String(input.warningThreshold),
        criticalThreshold: String(input.criticalThreshold),
        dropAlertThreshold: String(input.dropAlertThreshold),
        relativeDropThreshold: String(input.relativeDropThreshold),
        availabilityTarget: input.availabilityTarget ? String(input.availabilityTarget) : null,
        performanceTarget: input.performanceTarget ? String(input.performanceTarget) : null,
        qualityTarget: input.qualityTarget ? String(input.qualityTarget) : null,
        createdBy: ctx.user.id,
      });

      return { success: true, id: result.insertId };
    }),

  // Update Alert Threshold
  updateAlertThreshold: protectedProcedure
    .input(z.object({
      id: z.number(),
      targetOee: z.number().min(0).max(100).optional(),
      warningThreshold: z.number().min(0).max(100).optional(),
      criticalThreshold: z.number().min(0).max(100).optional(),
      dropAlertThreshold: z.number().min(0).max(100).optional(),
      relativeDropThreshold: z.number().min(0).max(100).optional(),
      availabilityTarget: z.number().min(0).max(100).optional(),
      performanceTarget: z.number().min(0).max(100).optional(),
      qualityTarget: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const updateData: Record<string, any> = {};
      
      if (updates.targetOee !== undefined) updateData.targetOee = String(updates.targetOee);
      if (updates.warningThreshold !== undefined) updateData.warningThreshold = String(updates.warningThreshold);
      if (updates.criticalThreshold !== undefined) updateData.criticalThreshold = String(updates.criticalThreshold);
      if (updates.dropAlertThreshold !== undefined) updateData.dropAlertThreshold = String(updates.dropAlertThreshold);
      if (updates.relativeDropThreshold !== undefined) updateData.relativeDropThreshold = String(updates.relativeDropThreshold);
      if (updates.availabilityTarget !== undefined) updateData.availabilityTarget = String(updates.availabilityTarget);
      if (updates.performanceTarget !== undefined) updateData.performanceTarget = String(updates.performanceTarget);
      if (updates.qualityTarget !== undefined) updateData.qualityTarget = String(updates.qualityTarget);

      await db.update(oeeAlertThresholds)
        .set(updateData)
        .where(eq(oeeAlertThresholds.id, id));

      return { success: true };
    }),

  // Delete Alert Threshold
  deleteAlertThreshold: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(oeeAlertThresholds)
        .set({ isActive: 0 })
        .where(eq(oeeAlertThresholds.id, input.id));

      return { success: true };
    }),

  // Get Effective Threshold for Machine
  getEffectiveThreshold: protectedProcedure
    .input(z.object({ machineId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      // Get machine's production line
      const [machine] = await db.select()
        .from(machines)
        .where(eq(machines.id, input.machineId))
        .limit(1);

      // Priority: Machine-specific > Line-specific > Global default
      const conditions = [eq(oeeAlertThresholds.isActive, 1)];
      
      // Try machine-specific first
      const [machineThreshold] = await db.select()
        .from(oeeAlertThresholds)
        .where(and(
          eq(oeeAlertThresholds.machineId, input.machineId),
          eq(oeeAlertThresholds.isActive, 1)
        ))
        .limit(1);

      if (machineThreshold) return machineThreshold;

      // Try line-specific
      if (machine?.workstationId) {
        const [lineThreshold] = await db.select()
          .from(oeeAlertThresholds)
          .where(and(
            sql`${oeeAlertThresholds.machineId} IS NULL`,
            eq(oeeAlertThresholds.productionLineId, machine.workstationId),
            eq(oeeAlertThresholds.isActive, 1)
          ))
          .limit(1);

        if (lineThreshold) return lineThreshold;
      }

      // Try global default
      const [globalThreshold] = await db.select()
        .from(oeeAlertThresholds)
        .where(and(
          sql`${oeeAlertThresholds.machineId} IS NULL`,
          sql`${oeeAlertThresholds.productionLineId} IS NULL`,
          eq(oeeAlertThresholds.isActive, 1)
        ))
        .limit(1);

      return globalThreshold || {
        targetOee: '85.00',
        warningThreshold: '80.00',
        criticalThreshold: '70.00',
        dropAlertThreshold: '5.00',
        relativeDropThreshold: '10.00',
      };
    }),

  // ============ Scheduled Reports ============
  
  // List Scheduled Reports
  listScheduledReports: protectedProcedure
    .input(z.object({
      reportType: z.enum(["oee", "cpk", "oee_cpk_combined", "production_summary"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(scheduledReports.isActive, 1)];
      if (input?.reportType) {
        conditions.push(eq(scheduledReports.reportType, input.reportType));
      }

      const reports = await db.select()
        .from(scheduledReports)
        .where(and(...conditions))
        .orderBy(desc(scheduledReports.createdAt));

      return reports.map(r => ({
        ...r,
        recipients: typeof r.recipients === 'string' ? JSON.parse(r.recipients || '[]') : r.recipients,
        machineIds: typeof r.machineIds === 'string' ? JSON.parse(r.machineIds) : r.machineIds,
        productionLineIds: typeof r.productionLineIds === 'string' ? JSON.parse(r.productionLineIds) : r.productionLineIds,
      }));
    }),

  // Create Scheduled Report
  createScheduledReport: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      reportType: z.enum(["oee", "cpk", "oee_cpk_combined", "production_summary"]),
      frequency: z.enum(["daily", "weekly", "monthly"]),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
      recipients: z.array(z.string().email()),
      machineIds: z.array(z.number()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      includeCharts: z.boolean().default(true),
      includeTrends: z.boolean().default(true),
      includeAlerts: z.boolean().default(true),
      format: z.enum(["html", "excel", "pdf"]).default("html"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(scheduledReports).values({
        name: input.name,
        reportType: input.reportType,
        frequency: input.frequency,
        dayOfWeek: input.dayOfWeek || null,
        dayOfMonth: input.dayOfMonth || null,
        timeOfDay: input.timeOfDay,
        recipients: JSON.stringify(input.recipients),
        machineIds: input.machineIds ? JSON.stringify(input.machineIds) : null,
        productionLineIds: input.productionLineIds ? JSON.stringify(input.productionLineIds) : null,
        includeCharts: input.includeCharts ? 1 : 0,
        includeTrends: input.includeTrends ? 1 : 0,
        includeAlerts: input.includeAlerts ? 1 : 0,
        format: input.format,
        createdBy: ctx.user.id,
      });

      return { success: true, id: result.insertId };
    }),

  // Update Scheduled Report
  updateScheduledReport: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      recipients: z.array(z.string().email()).optional(),
      machineIds: z.array(z.number()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      includeCharts: z.boolean().optional(),
      includeTrends: z.boolean().optional(),
      includeAlerts: z.boolean().optional(),
      format: z.enum(["html", "excel", "pdf"]).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { id, ...updates } = input;
      const updateData: Record<string, any> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.dayOfWeek !== undefined) updateData.dayOfWeek = updates.dayOfWeek;
      if (updates.dayOfMonth !== undefined) updateData.dayOfMonth = updates.dayOfMonth;
      if (updates.timeOfDay !== undefined) updateData.timeOfDay = updates.timeOfDay;
      if (updates.recipients !== undefined) updateData.recipients = JSON.stringify(updates.recipients);
      if (updates.machineIds !== undefined) updateData.machineIds = JSON.stringify(updates.machineIds);
      if (updates.productionLineIds !== undefined) updateData.productionLineIds = JSON.stringify(updates.productionLineIds);
      if (updates.includeCharts !== undefined) updateData.includeCharts = updates.includeCharts ? 1 : 0;
      if (updates.includeTrends !== undefined) updateData.includeTrends = updates.includeTrends ? 1 : 0;
      if (updates.includeAlerts !== undefined) updateData.includeAlerts = updates.includeAlerts ? 1 : 0;
      if (updates.format !== undefined) updateData.format = updates.format;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive ? 1 : 0;

      await db.update(scheduledReports)
        .set(updateData)
        .where(eq(scheduledReports.id, id));

      return { success: true };
    }),

  // Delete Scheduled Report
  deleteScheduledReport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(scheduledReports)
        .set({ isActive: 0 })
        .where(eq(scheduledReports.id, input.id));

      return { success: true };
    }),

  // Get Report Logs
  getReportLogs: protectedProcedure
    .input(z.object({
      reportId: z.number(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const logs = await db.select()
        .from(scheduledReportLogs)
        .where(eq(scheduledReportLogs.reportId, input.reportId))
        .orderBy(desc(scheduledReportLogs.sentAt))
        .limit(input.limit);

      return logs;
    }),

  // Manually Trigger Report
  triggerReport: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [report] = await db.select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.reportId))
        .limit(1);

      if (!report) throw new Error("Report not found");

      // Import and call the scheduled job function
      const { generateAndSendScheduledReport } = await import('../scheduledJobs');
      const result = await generateAndSendScheduledReport(report);

      return result;
    }),

  // Send test email to verify SMTP configuration
  sendTestEmail: protectedProcedure
    .input(z.object({
      recipients: z.string().min(1, "Email là bắt buộc"),
    }))
    .mutation(async ({ input }) => {
      const emails = input.recipients.split(",").map(e => e.trim()).filter(e => e);
      
      if (emails.length === 0) {
        throw new Error("Vui lòng nhập ít nhất một email");
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of emails) {
        if (!emailRegex.test(email)) {
          throw new Error(`Email không hợp lệ: ${email}`);
        }
      }

      const smtpConfig = await getSmtpConfig();
      if (!smtpConfig) {
        throw new Error("Chưa cấu hình SMTP. Vui lòng cấu hình trong Settings.");
      }

      const testSubject = "[Test] Kiểm tra cấu hình SMTP - Hệ thống CPK/SPC";
      const testContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">✅ Test Email Thành Công!</h2>
          <p>Email này xác nhận rằng cấu hình SMTP của bạn đang hoạt động bình thường.</p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Thời gian:</strong> ${new Date().toLocaleString("vi-VN")}</p>
            <p style="margin: 8px 0 0;"><strong>SMTP Server:</strong> ${smtpConfig.host}:${smtpConfig.port}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Bạn có thể sử dụng cấu hình này cho báo cáo định kỳ.</p>
        </div>
      `;

      let sent = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const email of emails) {
        try {
          await sendEmail(
            email,
            testSubject,
            testContent
          );
          sent++;
        } catch (error) {
          failed++;
          errors.push(`${email}: ${String(error)}`);
        }
      }

      return {
        success: failed === 0,
        sent,
        failed,
        message: failed === 0 
          ? `Đã gửi thành công ${sent} email test`
          : `Gửi ${sent} thành công, ${failed} thất bại`,
        errors: errors.length > 0 ? errors : undefined,
      };
    }),

  // Export alert thresholds to Excel
  exportAlertThresholds: protectedProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not connected");

      const thresholds = await db.select({
        id: oeeAlertThresholds.id,
        machineId: oeeAlertThresholds.machineId,
        machineName: machines.name,
        productionLineId: oeeAlertThresholds.productionLineId,
        lineName: productionLines.name,
        targetOee: oeeAlertThresholds.targetOee,
        warningThreshold: oeeAlertThresholds.warningThreshold,
        criticalThreshold: oeeAlertThresholds.criticalThreshold,
        dropAlertThreshold: oeeAlertThresholds.dropAlertThreshold,
        relativeDropThreshold: oeeAlertThresholds.relativeDropThreshold,
        availabilityTarget: oeeAlertThresholds.availabilityTarget,
        performanceTarget: oeeAlertThresholds.performanceTarget,
        qualityTarget: oeeAlertThresholds.qualityTarget,
        isActive: oeeAlertThresholds.isActive,
        createdAt: oeeAlertThresholds.createdAt,
        updatedAt: oeeAlertThresholds.updatedAt,
      })
      .from(oeeAlertThresholds)
      .leftJoin(machines, eq(oeeAlertThresholds.machineId, machines.id))
      .leftJoin(productionLines, eq(oeeAlertThresholds.productionLineId, productionLines.id))
      .orderBy(asc(oeeAlertThresholds.id));

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Ngưỡng Cảnh báo OEE");

      // Header row
      sheet.columns = [
        { header: "ID", key: "id", width: 8 },
        { header: "Máy", key: "machineName", width: 20 },
        { header: "Dây chuyền", key: "lineName", width: 20 },
        { header: "Mục tiêu OEE (%)", key: "targetOee", width: 15 },
        { header: "Ngưỡng cảnh báo (%)", key: "warningThreshold", width: 18 },
        { header: "Ngưỡng nghiêm trọng (%)", key: "criticalThreshold", width: 20 },
        { header: "Ngưỡng giảm (%)", key: "dropAlertThreshold", width: 15 },
        { header: "Giảm tương đối (%)", key: "relativeDropThreshold", width: 18 },
        { header: "Availability (%)", key: "availabilityTarget", width: 15 },
        { header: "Performance (%)", key: "performanceTarget", width: 15 },
        { header: "Quality (%)", key: "qualityTarget", width: 12 },
        { header: "Trạng thái", key: "isActive", width: 12 },
        { header: "Ngày tạo", key: "createdAt", width: 18 },
        { header: "Ngày cập nhật", key: "updatedAt", width: 18 },
      ];

      // Style header
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2563EB" },
      };
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

      // Add data rows
      thresholds.forEach(t => {
        sheet.addRow({
          id: t.id,
          machineName: t.machineName || "Tất cả",
          lineName: t.lineName || "Tất cả",
          targetOee: Number(t.targetOee),
          warningThreshold: Number(t.warningThreshold),
          criticalThreshold: Number(t.criticalThreshold),
          dropAlertThreshold: Number(t.dropAlertThreshold),
          relativeDropThreshold: Number(t.relativeDropThreshold),
          availabilityTarget: t.availabilityTarget ? Number(t.availabilityTarget) : null,
          performanceTarget: t.performanceTarget ? Number(t.performanceTarget) : null,
          qualityTarget: t.qualityTarget ? Number(t.qualityTarget) : null,
          isActive: t.isActive === 1 ? "Hoạt động" : "Tạm dừng",
          createdAt: t.createdAt ? new Date(t.createdAt).toLocaleString("vi-VN") : "",
          updatedAt: t.updatedAt ? new Date(t.updatedAt).toLocaleString("vi-VN") : "",
        });
      });

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `oee-alert-thresholds-${timestamp}.xlsx`;

      // Upload to S3
      const { url } = await storagePut(
        `exports/${filename}`,
        Buffer.from(buffer),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return {
        success: true,
        url,
        filename,
        count: thresholds.length,
      };
    }),

  // Get realtime OEE by production lines for comparison
  getRealtimeOeeByLines: publicProcedure
    .input(z.object({
      lineIds: z.array(z.number()),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db || input.lineIds.length === 0) return [];

      const results = [];

      for (const lineId of input.lineIds) {
        // Get production line info
        const [line] = await db
          .select()
          .from(productionLines)
          .where(eq(productionLines.id, lineId));

        if (!line) continue;

        // Get latest OEE record for this line (within last 24 hours)
        const [latestOee] = await db
          .select({
            oee: oeeRecords.oee,
            availability: oeeRecords.availability,
            performance: oeeRecords.performance,
            quality: oeeRecords.quality,
            recordDate: oeeRecords.recordDate,
          })
          .from(oeeRecords)
          .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
          .where(
            and(
              eq(machines.productionLineId, lineId),
              gte(oeeRecords.recordDate, new Date(Date.now() - 24 * 60 * 60 * 1000))
            )
          )
          .orderBy(desc(oeeRecords.recordDate))
          .limit(1);

        // Get previous OEE record for trend calculation
        const [prevOee] = await db
          .select({
            oee: oeeRecords.oee,
          })
          .from(oeeRecords)
          .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
          .where(
            and(
              eq(machines.productionLineId, lineId),
              gte(oeeRecords.recordDate, new Date(Date.now() - 48 * 60 * 60 * 1000)),
              lte(oeeRecords.recordDate, new Date(Date.now() - 24 * 60 * 60 * 1000))
            )
          )
          .orderBy(desc(oeeRecords.recordDate))
          .limit(1);

        // Get target OEE for this line
        const [target] = await db
          .select()
          .from(oeeTargets)
          .where(eq(oeeTargets.productionLineId, lineId))
          .limit(1);

        const currentOee = latestOee ? Number(latestOee.oee) : 0;
        const prevOeeValue = prevOee ? Number(prevOee.oee) : currentOee;
        const changePercent = prevOeeValue > 0 ? ((currentOee - prevOeeValue) / prevOeeValue) * 100 : 0;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (changePercent > 2) trend = 'up';
        else if (changePercent < -2) trend = 'down';

        results.push({
          lineId: line.id,
          lineName: line.name,
          lineCode: line.code,
          currentOee,
          targetOee: target ? Number(target.targetOee) : 85,
          availability: latestOee ? Number(latestOee.availability) : 0,
          performance: latestOee ? Number(latestOee.performance) : 0,
          quality: latestOee ? Number(latestOee.quality) : 0,
          trend,
          changePercent: Math.abs(changePercent),
          lastUpdated: latestOee?.recordDate?.toISOString() || new Date().toISOString(),
        });
      }

      return results;
    }),

  // Export OEE Line comparison to Excel (realtime)
  exportLineComparisonExcel: protectedProcedure
    .input(z.object({
      lineIds: z.array(z.number()),
      timeRange: z.string().default('4h'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db || input.lineIds.length === 0) {
        throw new Error('No lines selected');
      }

      const results = [];
      for (const lineId of input.lineIds) {
        const [line] = await db
          .select()
          .from(productionLines)
          .where(eq(productionLines.id, lineId));

        if (!line) continue;

        const [latestOee] = await db
          .select({
            oee: oeeRecords.oee,
            availability: oeeRecords.availability,
            performance: oeeRecords.performance,
            quality: oeeRecords.quality,
            recordDate: oeeRecords.recordDate,
          })
          .from(oeeRecords)
          .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
          .where(
            and(
              eq(machines.productionLineId, lineId),
              gte(oeeRecords.recordDate, new Date(Date.now() - 24 * 60 * 60 * 1000))
            )
          )
          .orderBy(desc(oeeRecords.recordDate))
          .limit(1);

        const [target] = await db
          .select()
          .from(oeeTargets)
          .where(eq(oeeTargets.productionLineId, lineId))
          .limit(1);

        results.push({
          lineCode: line.code,
          lineName: line.name,
          oee: latestOee ? Number(latestOee.oee) : 0,
          availability: latestOee ? Number(latestOee.availability) : 0,
          performance: latestOee ? Number(latestOee.performance) : 0,
          quality: latestOee ? Number(latestOee.quality) : 0,
          targetOee: target ? Number(target.targetOee) : 85,
          recordDate: latestOee?.recordDate?.toISOString() || new Date().toISOString(),
        });
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('OEE Comparison');

      sheet.columns = [
        { header: 'Mã dây chuyền', key: 'lineCode', width: 15 },
        { header: 'Tên dây chuyền', key: 'lineName', width: 30 },
        { header: 'OEE (%)', key: 'oee', width: 12 },
        { header: 'Availability (%)', key: 'availability', width: 15 },
        { header: 'Performance (%)', key: 'performance', width: 15 },
        { header: 'Quality (%)', key: 'quality', width: 12 },
        { header: 'Target OEE (%)', key: 'targetOee', width: 15 },
        { header: 'Thời gian cập nhật', key: 'recordDate', width: 20 },
      ];

      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      results.forEach(row => {
        const excelRow = sheet.addRow({
          ...row,
          recordDate: new Date(row.recordDate).toLocaleString('vi-VN'),
        });

        const oeeCell = excelRow.getCell('oee');
        if (row.oee >= row.targetOee) {
          oeeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
        } else if (row.oee >= row.targetOee * 0.9) {
          oeeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
        } else {
          oeeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `oee-line-comparison-${Date.now()}.xlsx`;
      
      const { url } = await storagePut(
        `reports/${fileName}`,
        Buffer.from(buffer),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

      return { url, fileName };
    }),

  // Export OEE Line comparison to PDF (realtime)
  exportLineComparisonPdf: protectedProcedure
    .input(z.object({
      lineIds: z.array(z.number()),
      timeRange: z.string().default('4h'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db || input.lineIds.length === 0) {
        throw new Error('No lines selected');
      }

      const results = [];
      for (const lineId of input.lineIds) {
        const [line] = await db
          .select()
          .from(productionLines)
          .where(eq(productionLines.id, lineId));

        if (!line) continue;

        const [latestOee] = await db
          .select({
            oee: oeeRecords.oee,
            availability: oeeRecords.availability,
            performance: oeeRecords.performance,
            quality: oeeRecords.quality,
          })
          .from(oeeRecords)
          .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
          .where(
            and(
              eq(machines.productionLineId, lineId),
              gte(oeeRecords.recordDate, new Date(Date.now() - 24 * 60 * 60 * 1000))
            )
          )
          .orderBy(desc(oeeRecords.recordDate))
          .limit(1);

        const [target] = await db
          .select()
          .from(oeeTargets)
          .where(eq(oeeTargets.productionLineId, lineId))
          .limit(1);

        results.push({
          lineCode: line.code,
          lineName: line.name,
          oee: latestOee ? Number(latestOee.oee) : 0,
          availability: latestOee ? Number(latestOee.availability) : 0,
          performance: latestOee ? Number(latestOee.performance) : 0,
          quality: latestOee ? Number(latestOee.quality) : 0,
          targetOee: target ? Number(target.targetOee) : 85,
        });
      }

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; text-align: center; }
    .meta { text-align: center; color: #666; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
    th { background-color: #4F81BD; color: white; }
    .good { background-color: #92D050; }
    .warning { background-color: #FFC000; }
    .bad { background-color: #FF6B6B; color: white; }
    .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Báo cáo So sánh OEE Dây chuyền</h1>
  <p class="meta">Khoảng thời gian: ${input.timeRange} | Tạo lúc: ${new Date().toLocaleString('vi-VN')}</p>
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Mã dây chuyền</th>
        <th>Tên dây chuyền</th>
        <th>OEE (%)</th>
        <th>Availability (%)</th>
        <th>Performance (%)</th>
        <th>Quality (%)</th>
        <th>Target (%)</th>
      </tr>
    </thead>
    <tbody>
      ${results.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.lineCode}</td>
          <td>${r.lineName}</td>
          <td class="${r.oee >= r.targetOee ? 'good' : r.oee >= r.targetOee * 0.9 ? 'warning' : 'bad'}">${r.oee.toFixed(1)}</td>
          <td>${r.availability.toFixed(1)}</td>
          <td>${r.performance.toFixed(1)}</td>
          <td>${r.quality.toFixed(1)}</td>
          <td>${r.targetOee}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <p class="footer">Hệ thống CPK/SPC - Báo cáo tự động</p>
</body>
</html>
      `;

      const fileName = `oee-line-comparison-${Date.now()}.html`;
      const { url } = await storagePut(
        `reports/${fileName}`,
        Buffer.from(html),
        'text/html'
      );

      return { url, fileName, format: 'html' };
    }),

  // Export OEE Report to Excel (server-side)
  exportOeeExcel: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      machineIds: z.array(z.number()).optional(),
      productionLineId: z.number().optional(),
      language: z.enum(['vi', 'en']).default('vi'),
    }))
    .mutation(async ({ input }) => {
      const { exportOEEToExcel } = await import('../services/oeeExportService');
      const buffer = await exportOEEToExcel(input);
      return {
        data: buffer.toString('base64'),
        filename: `oee-report-${new Date().toISOString().split('T')[0]}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }),

  // Export OEE Report to PDF (HTML format)
  exportOeePdf: protectedProcedure
    .input(z.object({
      startDate: z.date(),
      endDate: z.date(),
      machineIds: z.array(z.number()).optional(),
      productionLineId: z.number().optional(),
      language: z.enum(['vi', 'en']).default('vi'),
    }))
    .mutation(async ({ input, ctx }) => {
      const { exportOEEReportToS3 } = await import('../services/oeeExportService');
      return await exportOEEReportToS3(input, 'pdf', ctx.user?.id);
    }),

  // OEE Period Summary Report (by shift/day/week/month)
  getPeriodSummary: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      machineId: z.number().optional(),
      period: z.enum(['shift', 'day', 'week', 'month']),
      startDate: z.date(),
      endDate: z.date(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let groupExpr: any;
      switch (input.period) {
        case 'shift':
          groupExpr = oeeRecords.shiftId;
          break;
        case 'day':
          groupExpr = sql`DATE(${oeeRecords.recordDate})`;
          break;
        case 'week':
          groupExpr = sql`YEARWEEK(${oeeRecords.recordDate}, 1)`;
          break;
        case 'month':
          groupExpr = sql`DATE_FORMAT(${oeeRecords.recordDate}, '%Y-%m')`;
          break;
      }

      const conditions = [
        gte(oeeRecords.recordDate, input.startDate),
        lte(oeeRecords.recordDate, input.endDate),
      ];
      if (input.productionLineId) {
        conditions.push(eq(oeeRecords.productionLineId, input.productionLineId));
      }
      if (input.machineId) {
        conditions.push(eq(oeeRecords.machineId, input.machineId));
      }

      const results = await db.select({
        groupKey: groupExpr,
        avgOee: sql<number>`AVG(CAST(${oeeRecords.oee} AS DECIMAL(5,2)))`,
        avgAvailability: sql<number>`AVG(CAST(${oeeRecords.availability} AS DECIMAL(5,2)))`,
        avgPerformance: sql<number>`AVG(CAST(${oeeRecords.performance} AS DECIMAL(5,2)))`,
        avgQuality: sql<number>`AVG(CAST(${oeeRecords.quality} AS DECIMAL(5,2)))`,
        totalGoodCount: sql<number>`SUM(COALESCE(${oeeRecords.goodCount}, 0))`,
        totalDefectCount: sql<number>`SUM(COALESCE(${oeeRecords.defectCount}, 0))`,
        totalCount: sql<number>`SUM(COALESCE(${oeeRecords.totalCount}, 0))`,
        recordCount: sql<number>`COUNT(*)`,
      })
        .from(oeeRecords)
        .where(and(...conditions))
        .groupBy(groupExpr)
        .orderBy(groupExpr)
        .limit(100);

      return results.map(row => {
        const key = String(row.groupKey ?? '');
        let label = key;
        if (input.period === 'shift') label = `Ca ${key || 'N/A'}`;
        else if (input.period === 'week') label = `Tu\u1EA7n ${key}`;
        return {
          label,
          groupKey: key,
          avgOee: Number(row.avgOee) || 0,
          avgAvailability: Number(row.avgAvailability) || 0,
          avgPerformance: Number(row.avgPerformance) || 0,
          avgQuality: Number(row.avgQuality) || 0,
          totalGoodCount: Number(row.totalGoodCount) || 0,
          totalDefectCount: Number(row.totalDefectCount) || 0,
          totalCount: Number(row.totalCount) || 0,
          recordCount: Number(row.recordCount) || 0,
        };
      });
    }),

  exportPeriodExcel: protectedProcedure
    .input(z.object({
      period: z.enum(['shift', 'day', 'week', 'month']),
      startDate: z.date(),
      endDate: z.date(),
      productionLineId: z.number().optional(),
      data: z.array(z.object({
        label: z.string(),
        avgOee: z.number(),
        avgAvailability: z.number(),
        avgPerformance: z.number(),
        avgQuality: z.number(),
        totalGoodCount: z.number(),
        totalDefectCount: z.number(),
        recordCount: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CPK/SPC Calculator';
      const ws = workbook.addWorksheet('OEE Period Report');

      const periodLabels: Record<string, string> = {
        shift: 'Ca', day: 'Ngày', week: 'Tuần', month: 'Tháng',
      };

      // Title
      ws.mergeCells('A1:H1');
      const titleCell = ws.getCell('A1');
      titleCell.value = `Báo cáo OEE theo ${periodLabels[input.period] || input.period}`;
      titleCell.font = { size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center' };

      ws.mergeCells('A2:H2');
      const dateCell = ws.getCell('A2');
      dateCell.value = `Từ ${input.startDate.toISOString().split('T')[0]} đến ${input.endDate.toISOString().split('T')[0]}`;
      dateCell.alignment = { horizontal: 'center' };
      dateCell.font = { italic: true, color: { argb: '666666' } };

      // Headers
      const headers = ['Kỳ', 'OEE (%)', 'Availability (%)', 'Performance (%)', 'Quality (%)', 'SP Tốt', 'SP Lỗi', 'Bản ghi'];
      const headerRow = ws.addRow(headers);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
        cell.alignment = { horizontal: 'center' };
        cell.border = { bottom: { style: 'thin' } };
      });

      // Data rows
      for (const row of input.data) {
        const dataRow = ws.addRow([
          row.label,
          Number(row.avgOee.toFixed(1)),
          Number(row.avgAvailability.toFixed(1)),
          Number(row.avgPerformance.toFixed(1)),
          Number(row.avgQuality.toFixed(1)),
          row.totalGoodCount,
          row.totalDefectCount,
          row.recordCount,
        ]);
        // Color OEE cell
        const oeeCell = dataRow.getCell(2);
        if (row.avgOee >= 85) oeeCell.font = { color: { argb: '16A34A' }, bold: true };
        else if (row.avgOee >= 65) oeeCell.font = { color: { argb: 'CA8A04' }, bold: true };
        else oeeCell.font = { color: { argb: 'DC2626' }, bold: true };
      }

      // Column widths
      ws.columns = [
        { width: 20 }, { width: 12 }, { width: 16 }, { width: 16 },
        { width: 14 }, { width: 12 }, { width: 12 }, { width: 10 },
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `oee-period-${input.period}-${Date.now()}.xlsx`;
      const { url } = await storagePut(
        `exports/${filename}`,
        Buffer.from(buffer as ArrayBuffer),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return { url, filename };
    }),

  exportPeriodPdf: protectedProcedure
    .input(z.object({
      period: z.enum(['shift', 'day', 'week', 'month']),
      startDate: z.date(),
      endDate: z.date(),
      productionLineId: z.number().optional(),
      data: z.array(z.object({
        label: z.string(),
        avgOee: z.number(),
        avgAvailability: z.number(),
        avgPerformance: z.number(),
        avgQuality: z.number(),
        totalGoodCount: z.number(),
        totalDefectCount: z.number(),
        recordCount: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      const periodLabels: Record<string, string> = {
        shift: 'Ca', day: 'Ngày', week: 'Tuần', month: 'Tháng',
      };
      const periodLabel = periodLabels[input.period] || input.period;
      const startStr = input.startDate.toISOString().split('T')[0];
      const endStr = input.endDate.toISOString().split('T')[0];

      // Calculate summary stats
      const totalRecords = input.data.reduce((s, r) => s + r.recordCount, 0);
      const avgOee = input.data.length > 0 ? input.data.reduce((s, r) => s + r.avgOee, 0) / input.data.length : 0;
      const totalGood = input.data.reduce((s, r) => s + r.totalGoodCount, 0);
      const totalDefect = input.data.reduce((s, r) => s + r.totalDefectCount, 0);

      const getOeeColor = (v: number) => v >= 85 ? '#16a34a' : v >= 65 ? '#ca8a04' : '#dc2626';

      const tableRows = input.data.map((row, idx) => `
        <tr style="background:${idx % 2 === 0 ? '#fff' : '#f8fafc'}">
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${row.label}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center;font-weight:bold;color:${getOeeColor(row.avgOee)}">${row.avgOee.toFixed(1)}%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${row.avgAvailability.toFixed(1)}%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${row.avgPerformance.toFixed(1)}%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${row.avgQuality.toFixed(1)}%</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${row.totalGoodCount.toLocaleString()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">${row.totalDefectCount.toLocaleString()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">${row.recordCount}</td>
        </tr>
      `).join('');

      const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>OEE Period Report</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1e293b; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 20px; }
        .header h1 { font-size: 24px; color: #2563eb; margin: 0 0 8px 0; }
        .header p { color: #64748b; margin: 4px 0; font-size: 14px; }
        .summary { display: flex; gap: 16px; margin-bottom: 30px; }
        .summary-card { flex: 1; background: #f8fafc; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e2e8f0; }
        .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
        .summary-card .value { font-size: 28px; font-weight: bold; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        th { background: #2563eb; color: white; padding: 10px 12px; text-align: center; font-size: 13px; }
        th:first-child { text-align: left; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
      </style></head><body>
        <div class="header">
          <h1>Báo cáo OEE theo ${periodLabel}</h1>
          <p>Khoảng thời gian: ${startStr} đến ${endStr}</p>
          <p>Tổng số kỳ: ${input.data.length} | Tổng bản ghi: ${totalRecords}</p>
        </div>
        <div class="summary">
          <div class="summary-card">
            <div class="label">OEE Trung bình</div>
            <div class="value" style="color:${getOeeColor(avgOee)}">${avgOee.toFixed(1)}%</div>
          </div>
          <div class="summary-card">
            <div class="label">Sản phẩm tốt</div>
            <div class="value" style="color:#16a34a">${totalGood.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="label">Sản phẩm lỗi</div>
            <div class="value" style="color:#dc2626">${totalDefect.toLocaleString()}</div>
          </div>
          <div class="summary-card">
            <div class="label">Tỷ lệ lỗi</div>
            <div class="value">${totalGood + totalDefect > 0 ? ((totalDefect / (totalGood + totalDefect)) * 100).toFixed(2) : '0.00'}%</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left">Kỳ</th>
              <th>OEE (%)</th>
              <th>Availability (%)</th>
              <th>Performance (%)</th>
              <th>Quality (%)</th>
              <th style="text-align:right">SP Tốt</th>
              <th style="text-align:right">SP Lỗi</th>
              <th>Bản ghi</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="footer">
          <p>Báo cáo được tạo bởi CPK/SPC Calculator - MSoftware AI</p>
          <p>Ngày tạo: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}</p>
        </div>
      </body></html>`;

      const filename = `oee-period-${input.period}-${Date.now()}.html`;
      const { url } = await storagePut(
        `exports/${filename}`,
        Buffer.from(html, 'utf-8'),
        'text/html'
      );
      return { url, filename };
    }),
});
