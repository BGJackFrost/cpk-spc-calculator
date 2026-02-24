import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { alertSettings, realtimeAlerts, oeeRecords, machines } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const alertRouter = router({
  // List alert configurations
  listConfigs: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    const configs = await db
      .select()
      .from(alertSettings)
      .orderBy(desc(alertSettings.id));
    
    return configs;
  }),

  // Create alert configuration
  createConfig: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(["oee_low", "maintenance_overdue", "predictive_alert", "spare_parts_low", "custom"]),
      condition: z.string(),
      threshold: z.number().optional(),
      machineId: z.number().optional(),
      notifyEmail: z.boolean().default(true),
      notifySms: z.boolean().default(false),
      notifyInApp: z.boolean().default(true),
      recipients: z.string().optional(),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(alertSettings).values({
        cpkWarningThreshold: input.threshold ? Math.round(input.threshold * 100) : 133,
        cpkCriticalThreshold: 100,
        notifyOwner: input.notifyEmail ? 1 : 0,
      });
      
      return { id: result[0].insertId };
    }),

  // Update alert configuration
  updateConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      condition: z.string().optional(),
      threshold: z.number().optional(),
      notifyEmail: z.boolean().optional(),
      notifySms: z.boolean().optional(),
      notifyInApp: z.boolean().optional(),
      recipients: z.string().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.condition !== undefined) updateData.condition = updates.condition;
      if (updates.threshold !== undefined) updateData.threshold = String(updates.threshold);
      if (updates.notifyEmail !== undefined) updateData.notifyEmail = updates.notifyEmail;
      if (updates.notifySms !== undefined) updateData.notifySms = updates.notifySms;
      if (updates.notifyInApp !== undefined) updateData.notifyInApp = updates.notifyInApp;
      if (updates.recipients !== undefined) updateData.recipients = updates.recipients;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      
      await db.update(alertSettings).set(updateData).where(eq(alertSettings.id, id));
      
      return { success: true };
    }),

  // Delete alert configuration
  deleteConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(alertSettings).where(eq(alertSettings.id, input.id));
      
      return { success: true };
    }),

  // List alert logs
  listLogs: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const conditions = [];
      if (input.startDate) conditions.push(gte(realtimeAlerts.createdAt, new Date(input.startDate)));
      if (input.endDate) conditions.push(lte(realtimeAlerts.createdAt, new Date(input.endDate)));
      
      const logs = await db
        .select({
          id: realtimeAlerts.id,
          alertType: realtimeAlerts.alertType,
          message: realtimeAlerts.message,
          severity: realtimeAlerts.severity,
          machineId: realtimeAlerts.machineId,
          machineName: machines.name,
          acknowledgedAt: realtimeAlerts.acknowledgedAt,
          createdAt: realtimeAlerts.createdAt,
        })
        .from(realtimeAlerts)
        .leftJoin(machines, eq(realtimeAlerts.machineId, machines.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(realtimeAlerts.createdAt))
        .limit(input.limit);
      
      return logs;
    }),

  // Acknowledge alert
  acknowledgeAlert: protectedProcedure
    .input(z.object({
      id: z.number(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.update(realtimeAlerts).set({
        acknowledgedAt: new Date(),
        acknowledgedBy: input.userId,
      }).where(eq(realtimeAlerts.id, input.id));
      
      return { success: true };
    }),

  // Trigger alert check (can be called manually or by scheduled job)
  checkAlerts: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const alertsTriggered: { configId: number; message: string; value: number }[] = [];
    
    // Get all enabled alert configs
    const configs = await db
      .select()
      .from(alertSettings);
    
    for (const config of configs) {
      // Check OEE low alerts
      // Use cpkWarningThreshold as OEE threshold (convert from 133 = 1.33 Cpk to percentage)
      if (config.cpkWarningThreshold) {
        const threshold = config.cpkWarningThreshold / 100 * 75; // Convert to OEE percentage
        const recentOEE = await db
          .select({
            machineId: oeeRecords.machineId,
            machineName: machines.name,
            avgOEE: sql<number>`AVG(${oeeRecords.oee})`,
          })
          .from(oeeRecords)
          .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
          .where(
            and(
              gte(oeeRecords.recordDate, new Date(Date.now() - 24 * 60 * 60 * 1000)),
              config.mappingId ? eq(oeeRecords.machineId, config.mappingId) : undefined
            )
          )
          .groupBy(oeeRecords.machineId, machines.name);
        
        for (const record of recentOEE) {
          if (Number(record.avgOEE) < threshold) {
            const message = `OEE thấp: ${record.machineName || `Máy ${record.machineId}`} - OEE: ${Number(record.avgOEE).toFixed(1)}% (ngưỡng: ${threshold}%)`;
            
            // Log alert
            await db.insert(realtimeAlerts).values({
              connectionId: 1,
              machineId: record.machineId || 1,
              alertType: "out_of_spec",
              message,
              severity: "warning",
            });
            
            // Send notification
            if (config.notifyOwner) {
              await notifyOwner({
                title: `⚠️ Cảnh báo OEE thấp`,
                content: message,
              });
            }
            
            alertsTriggered.push({
              configId: config.id,
              message,
              value: Number(record.avgOEE),
            });
          }
        }
      }
    }
    
    return {
      checked: configs.length,
      triggered: alertsTriggered.length,
      alerts: alertsTriggered,
    };
  }),

  // Get alert statistics
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { total: 0, unacknowledged: 0, today: 0, thisWeek: 0 };
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const stats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        unacknowledged: sql<number>`SUM(CASE WHEN ${realtimeAlerts.acknowledgedAt} IS NULL THEN 1 ELSE 0 END)`,
        today: sql<number>`SUM(CASE WHEN ${realtimeAlerts.createdAt} >= ${startOfDay} THEN 1 ELSE 0 END)`,
        thisWeek: sql<number>`SUM(CASE WHEN ${realtimeAlerts.createdAt} >= ${startOfWeek} THEN 1 ELSE 0 END)`,
      })
      .from(realtimeAlerts);
    
    return {
      total: Number(stats[0]?.total || 0),
      unacknowledged: Number(stats[0]?.unacknowledged || 0),
      today: Number(stats[0]?.today || 0),
      thisWeek: Number(stats[0]?.thisWeek || 0),
    };
  }),
});
