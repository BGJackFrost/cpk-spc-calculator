import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  oeeRecords, oeeTargets, oeeLossCategories, oeeLossRecords,
  machines
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, asc } from "drizzle-orm";

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

  // OEE Prediction API with Linear Regression
  getPrediction: publicProcedure
    .input(z.object({
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { chartData: [], predictions: [], alerts: [] };

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

      // Generate predictions for each machine
      const predictions: any[] = [];
      const alerts: any[] = [];

      Object.entries(machineData).forEach(([machineId, { name, data }]) => {
        if (data.length < 7) return; // Need at least 7 days of data

        // Prepare data for regression
        const regressionData = data.map((d, i) => ({ x: i, y: d.oee }));
        const { slope, intercept, r2 } = linearRegression(regressionData);

        // Current OEE (last data point)
        const currentOee = data[data.length - 1].oee;

        // Predict 7 days ahead
        const predictedOee = slope * (data.length + 7) + intercept;
        const change = predictedOee - currentOee;

        // Confidence based on R2
        const confidence = r2 * 100;

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

        // Generate alerts
        if (predictedOee < 65 || change < -10) {
          alerts.push({
            name,
            severity: predictedOee < 50 || change < -15 ? "high" : change < -10 ? "medium" : "low",
            message: `Dự báo OEE giảm ${Math.abs(change).toFixed(1)}% trong 7 ngày tới`,
            currentOee,
            predictedOee: Math.max(0, Math.min(100, predictedOee)),
          });
        }
      });

      // Generate chart data (aggregate)
      const chartData: any[] = [];
      const allDates = [...new Set(historicalData.map(d => d.date))].sort();
      
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

      // Add predictions for next 14 days
      const allData = historicalData.map((d, i) => ({ x: i, y: Number(d.avgOee) || 0 }));
      const { slope, intercept } = linearRegression(allData);
      const stdDev = Math.sqrt(allData.reduce((a, b) => a + Math.pow(b.y - (slope * b.x + intercept), 2), 0) / allData.length);

      for (let i = 1; i <= 14; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);
        const dateStr = futureDate.toISOString().split('T')[0];
        const predicted = slope * (allData.length + i) + intercept;
        
        chartData.push({
          date: dateStr,
          actual: null,
          predicted: Math.max(0, Math.min(100, predicted)),
          upperBound: Math.min(100, predicted + 1.96 * stdDev),
          lowerBound: Math.max(0, predicted - 1.96 * stdDev),
        });
      }

      return {
        chartData,
        predictions: predictions.sort((a, b) => a.predictedOee - b.predictedOee),
        alerts: alerts.sort((a, b) => (a.severity === "high" ? -1 : b.severity === "high" ? 1 : 0)),
      };
    }),
});
