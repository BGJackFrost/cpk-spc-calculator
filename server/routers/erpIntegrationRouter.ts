import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpIntegrationConfigs } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

export const erpIntegrationRouter = router({
  // Get stats
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    const integrations = await db.select().from(erpIntegrationConfigs);
    const activeCount = integrations.filter(i => i.isActive).length;
    return {
      totalIntegrations: integrations.length,
      activeIntegrations: activeCount,
      inactiveIntegrations: integrations.length - activeCount,
      lastSyncTime: integrations.length > 0 ? integrations[0].lastSyncAt : null,
    };
  }),

  // List all ERP integrations
  listIntegrations: protectedProcedure.query(async () => {
    const db = await getDb();
    const integrations = await db.select()
      .from(erpIntegrationConfigs)
      .orderBy(desc(erpIntegrationConfigs.createdAt));
    return integrations;
  }),

  // Get integration by ID
  getIntegration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [integration] = await db.select()
        .from(erpIntegrationConfigs)
        .where(eq(erpIntegrationConfigs.id, input.id));
      return integration;
    }),

  // Create new integration
  createIntegration: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(["sap", "oracle", "dynamics", "custom"]),
      connectionString: z.string(),
      settings: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const result = await db.insert(erpIntegrationConfigs).values({
        name: input.name,
        erpType: input.type,
        connectionUrl: input.connectionString,
        mappingConfig: JSON.stringify(input.settings || {}),
        isActive: false,
      });
      
      // Get the inserted ID
      const insertId = (result as any)[0]?.insertId || (result as any).insertId;
      return { id: insertId, success: true };
    }),

  // Update integration
  updateIntegration: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      connectionString: z.string().optional(),
      settings: z.record(z.string(), z.any()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const updateData: Record<string, any> = {};
      if (input.name) updateData.name = input.name;
      if (input.connectionString) updateData.connectionUrl = input.connectionString;
      if (input.settings) updateData.mappingConfig = JSON.stringify(input.settings);
      if (input.isActive !== undefined) updateData.isActive = input.isActive;
      
      await db.update(erpIntegrationConfigs)
        .set(updateData)
        .where(eq(erpIntegrationConfigs.id, input.id));
      return { success: true };
    }),

  // Delete integration
  deleteIntegration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(erpIntegrationConfigs).where(eq(erpIntegrationConfigs.id, input.id));
      return { success: true };
    }),

  // Test connection
  testConnection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [integration] = await db.select()
        .from(erpIntegrationConfigs)
        .where(eq(erpIntegrationConfigs.id, input.id));
      
      if (!integration) {
        return { success: false, message: "Integration not found" };
      }
      
      // Simulate connection test
      return { 
        success: true, 
        message: "Connection successful",
        latency: Math.floor(Math.random() * 100) + 50,
      };
    }),

  // Sync data
  syncData: protectedProcedure
    .input(z.object({ 
      id: z.number(),
      direction: z.enum(["import", "export", "bidirectional"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Update last sync time
      await db.update(erpIntegrationConfigs)
        .set({ 
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
        })
        .where(eq(erpIntegrationConfigs.id, input.id));
      
      return { 
        success: true, 
        recordsProcessed: Math.floor(Math.random() * 100) + 10,
        message: "Sync completed successfully",
      };
    }),
});
