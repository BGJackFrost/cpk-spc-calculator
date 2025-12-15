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
});
