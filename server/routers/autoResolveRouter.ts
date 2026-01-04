import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { autoResolveConfigs, autoResolveLogs } from "../../drizzle/schema";
import { eq, desc, sql, gte } from "drizzle-orm";

export const autoResolveRouter = router({
  // Get list of auto-resolve configs
  getList: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    const configs = await db.select()
      .from(autoResolveConfigs)
      .orderBy(desc(autoResolveConfigs.createdAt));
    return configs;
  }),

  // Get single config by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const configs = await db.select()
        .from(autoResolveConfigs)
        .where(eq(autoResolveConfigs.id, input.id))
        .limit(1);
      return configs[0] || null;
    }),

  // Create new auto-resolve config
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      alertType: z.string(),
      isActive: z.boolean().default(true),
      metricThreshold: z.number().optional(),
      metricOperator: z.enum(["gt", "gte", "lt", "lte", "eq"]).optional(),
      consecutiveOkCount: z.number().min(1).default(3),
      autoResolveAfterMinutes: z.number().min(1).default(30),
      notifyOnAutoResolve: z.boolean().default(true),
      notificationChannels: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [result] = await db.insert(autoResolveConfigs).values({
        name: input.name,
        description: input.description || null,
        alertType: input.alertType,
        isActive: input.isActive,
        metricThreshold: input.metricThreshold || null,
        metricOperator: input.metricOperator || null,
        consecutiveOkCount: input.consecutiveOkCount,
        autoResolveAfterMinutes: input.autoResolveAfterMinutes,
        notifyOnAutoResolve: input.notifyOnAutoResolve,
        notificationChannels: input.notificationChannels || null,
        createdBy: ctx.user?.id || null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      
      const insertId = (result as any).insertId;
      const configs = await db.select()
        .from(autoResolveConfigs)
        .where(eq(autoResolveConfigs.id, insertId))
        .limit(1);
      
      return configs[0];
    }),

  // Update auto-resolve config
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      alertType: z.string().optional(),
      isActive: z.boolean().optional(),
      metricThreshold: z.number().optional(),
      metricOperator: z.enum(["gt", "gte", "lt", "lte", "eq"]).optional(),
      consecutiveOkCount: z.number().min(1).optional(),
      autoResolveAfterMinutes: z.number().min(1).optional(),
      notifyOnAutoResolve: z.boolean().optional(),
      notificationChannels: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const { id, ...updateData } = input;
      
      const data: Record<string, any> = { updatedAt: Date.now() };
      if (updateData.name !== undefined) data.name = updateData.name;
      if (updateData.description !== undefined) data.description = updateData.description;
      if (updateData.alertType !== undefined) data.alertType = updateData.alertType;
      if (updateData.isActive !== undefined) data.isActive = updateData.isActive;
      if (updateData.metricThreshold !== undefined) data.metricThreshold = updateData.metricThreshold;
      if (updateData.metricOperator !== undefined) data.metricOperator = updateData.metricOperator;
      if (updateData.consecutiveOkCount !== undefined) data.consecutiveOkCount = updateData.consecutiveOkCount;
      if (updateData.autoResolveAfterMinutes !== undefined) data.autoResolveAfterMinutes = updateData.autoResolveAfterMinutes;
      if (updateData.notifyOnAutoResolve !== undefined) data.notifyOnAutoResolve = updateData.notifyOnAutoResolve;
      if (updateData.notificationChannels !== undefined) data.notificationChannels = updateData.notificationChannels;
      
      await db.update(autoResolveConfigs)
        .set(data)
        .where(eq(autoResolveConfigs.id, id));
      
      const configs = await db.select()
        .from(autoResolveConfigs)
        .where(eq(autoResolveConfigs.id, id))
        .limit(1);
      
      return configs[0];
    }),

  // Delete auto-resolve config
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      await db.delete(autoResolveConfigs)
        .where(eq(autoResolveConfigs.id, input.id));
      return { success: true };
    }),

  // Toggle active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { isActive: false };
      
      const configs = await db.select()
        .from(autoResolveConfigs)
        .where(eq(autoResolveConfigs.id, input.id))
        .limit(1);
      
      if (configs.length === 0) {
        throw new Error("Config not found");
      }
      
      const newIsActive = !configs[0].isActive;
      
      await db.update(autoResolveConfigs)
        .set({ isActive: newIsActive, updatedAt: Date.now() })
        .where(eq(autoResolveConfigs.id, input.id));
      
      return { isActive: newIsActive };
    }),

  // Get auto-resolve statistics
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { totalConfigs: 0, activeConfigs: 0, totalAutoResolved: 0, todayAutoResolved: 0 };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const [totalConfigs, activeConfigs, totalAutoResolved, todayAutoResolved] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(autoResolveConfigs),
      db.select({ count: sql<number>`count(*)` }).from(autoResolveConfigs).where(eq(autoResolveConfigs.isActive, true)),
      db.select({ count: sql<number>`count(*)` }).from(autoResolveLogs),
      db.select({ count: sql<number>`count(*)` }).from(autoResolveLogs).where(gte(autoResolveLogs.createdAt, todayTimestamp)),
    ]);
    
    return {
      totalConfigs: Number(totalConfigs[0]?.count || 0),
      activeConfigs: Number(activeConfigs[0]?.count || 0),
      totalAutoResolved: Number(totalAutoResolved[0]?.count || 0),
      todayAutoResolved: Number(todayAutoResolved[0]?.count || 0),
    };
  }),

  // Get auto-resolve logs
  getLogs: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      configId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { logs: [], total: 0, page: input.page, pageSize: input.pageSize };
      
      const { page, pageSize, configId } = input;
      const offset = (page - 1) * pageSize;
      
      const whereClause = configId ? eq(autoResolveLogs.configId, configId) : undefined;
      
      const [logs, totalResult] = await Promise.all([
        db.select()
          .from(autoResolveLogs)
          .where(whereClause)
          .orderBy(desc(autoResolveLogs.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(autoResolveLogs)
          .where(whereClause),
      ]);
      
      return {
        logs,
        total: Number(totalResult[0]?.count || 0),
        page,
        pageSize,
      };
    }),

  // Get available alert types
  getAlertTypes: protectedProcedure.query(async () => {
    return [
      { value: "cpk_warning", label: "CPK Warning" },
      { value: "cpk_critical", label: "CPK Critical" },
      { value: "oee_warning", label: "OEE Warning" },
      { value: "oee_critical", label: "OEE Critical" },
      { value: "sensor_warning", label: "Sensor Warning" },
      { value: "sensor_critical", label: "Sensor Critical" },
      { value: "machine_warning", label: "Machine Warning" },
      { value: "machine_critical", label: "Machine Critical" },
      { value: "quality_warning", label: "Quality Warning" },
      { value: "quality_critical", label: "Quality Critical" },
    ];
  }),
});
