import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { getDb } from '../db';
import { oeeAlertThresholds } from '../../drizzle/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';

export const oeeThresholdsRouter = router({
  // Get all OEE thresholds
  getAll: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const results = await db.select({
        id: oeeAlertThresholds.id,
        productionLineId: oeeAlertThresholds.productionLineId,
        machineId: oeeAlertThresholds.machineId,
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
      .orderBy(desc(oeeAlertThresholds.createdAt));
      
      return results.map(r => ({
        ...r,
        isActive: Boolean(r.isActive),
      }));
    }),

  // Get threshold for specific production line (or default)
  getByProductionLine: protectedProcedure
    .input(z.object({ productionLineId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // First try to find specific threshold for this production line
      if (input.productionLineId) {
        const specific = await db.select()
          .from(oeeAlertThresholds)
          .where(and(
            eq(oeeAlertThresholds.productionLineId, input.productionLineId),
            eq(oeeAlertThresholds.isActive, 1)
          ))
          .limit(1);
        
        if (specific.length > 0) {
          return { ...specific[0], isActive: Boolean(specific[0].isActive), isDefault: false };
        }
      }
      
      // Fall back to default (productionLineId is null)
      const defaultThreshold = await db.select()
        .from(oeeAlertThresholds)
        .where(and(
          isNull(oeeAlertThresholds.productionLineId),
          eq(oeeAlertThresholds.isActive, 1)
        ))
        .limit(1);
      
      if (defaultThreshold.length > 0) {
        return { ...defaultThreshold[0], isActive: Boolean(defaultThreshold[0].isActive), isDefault: true };
      }
      
      // Return system defaults if no config exists
      return {
        id: 0,
        productionLineId: null,
        machineId: null,
        targetOee: '85.00',
        warningThreshold: '80.00',
        criticalThreshold: '70.00',
        dropAlertThreshold: '5.00',
        relativeDropThreshold: '10.00',
        availabilityTarget: '90.00',
        performanceTarget: '95.00',
        qualityTarget: '99.00',
        isActive: true,
        isDefault: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }),

  // Create new threshold config
  create: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      machineId: z.number().optional(),
      targetOee: z.number().min(0).max(100).default(85),
      warningThreshold: z.number().min(0).max(100).default(80),
      criticalThreshold: z.number().min(0).max(100).default(70),
      dropAlertThreshold: z.number().min(0).max(100).default(5),
      relativeDropThreshold: z.number().min(0).max(100).default(10),
      availabilityTarget: z.number().min(0).max(100).optional(),
      performanceTarget: z.number().min(0).max(100).optional(),
      qualityTarget: z.number().min(0).max(100).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      // Check if config already exists for this production line
      if (input.productionLineId) {
        const existing = await db.select()
          .from(oeeAlertThresholds)
          .where(eq(oeeAlertThresholds.productionLineId, input.productionLineId))
          .limit(1);
        
        if (existing.length > 0) {
          throw new Error('Cấu hình cho dây chuyền này đã tồn tại');
        }
      } else {
        // Check for default config
        const existingDefault = await db.select()
          .from(oeeAlertThresholds)
          .where(isNull(oeeAlertThresholds.productionLineId))
          .limit(1);
        
        if (existingDefault.length > 0) {
          throw new Error('Cấu hình mặc định đã tồn tại');
        }
      }
      
      const result = await db.insert(oeeAlertThresholds).values({
        productionLineId: input.productionLineId || null,
        machineId: input.machineId || null,
        targetOee: input.targetOee.toFixed(2),
        warningThreshold: input.warningThreshold.toFixed(2),
        criticalThreshold: input.criticalThreshold.toFixed(2),
        dropAlertThreshold: input.dropAlertThreshold.toFixed(2),
        relativeDropThreshold: input.relativeDropThreshold.toFixed(2),
        availabilityTarget: input.availabilityTarget?.toFixed(2) || '90.00',
        performanceTarget: input.performanceTarget?.toFixed(2) || '95.00',
        qualityTarget: input.qualityTarget?.toFixed(2) || '99.00',
        isActive: 1,
        createdBy: ctx.user.id,
      });
      
      return { id: (result as any)[0]?.insertId || 0, success: true };
    }),

  // Update threshold config
  update: protectedProcedure
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
      if (!db) throw new Error('Database not available');
      
      const updateData: Record<string, any> = {};
      
      if (input.targetOee !== undefined) updateData.targetOee = input.targetOee.toFixed(2);
      if (input.warningThreshold !== undefined) updateData.warningThreshold = input.warningThreshold.toFixed(2);
      if (input.criticalThreshold !== undefined) updateData.criticalThreshold = input.criticalThreshold.toFixed(2);
      if (input.dropAlertThreshold !== undefined) updateData.dropAlertThreshold = input.dropAlertThreshold.toFixed(2);
      if (input.relativeDropThreshold !== undefined) updateData.relativeDropThreshold = input.relativeDropThreshold.toFixed(2);
      if (input.availabilityTarget !== undefined) updateData.availabilityTarget = input.availabilityTarget.toFixed(2);
      if (input.performanceTarget !== undefined) updateData.performanceTarget = input.performanceTarget.toFixed(2);
      if (input.qualityTarget !== undefined) updateData.qualityTarget = input.qualityTarget.toFixed(2);
      
      if (Object.keys(updateData).length > 0) {
        await db.update(oeeAlertThresholds)
          .set(updateData)
          .where(eq(oeeAlertThresholds.id, input.id));
      }
      
      return { success: true };
    }),

  // Toggle active status
  toggle: protectedProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.update(oeeAlertThresholds)
        .set({ isActive: input.isActive ? 1 : 0 })
        .where(eq(oeeAlertThresholds.id, input.id));
      
      return { success: true };
    }),

  // Delete threshold config
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      await db.delete(oeeAlertThresholds)
        .where(eq(oeeAlertThresholds.id, input.id));
      
      return { success: true };
    }),

  // Get thresholds summary for dashboard
  getSummary: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const results = await db.select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)`,
        withProductionLine: sql<number>`SUM(CASE WHEN production_line_id IS NOT NULL THEN 1 ELSE 0 END)`,
        avgCritical: sql<number>`AVG(critical_threshold)`,
        avgWarning: sql<number>`AVG(warning_threshold)`,
        avgTarget: sql<number>`AVG(target_oee)`,
      })
      .from(oeeAlertThresholds);
      
      return results[0] || {
        total: 0,
        active: 0,
        withProductionLine: 0,
        avgCritical: 70,
        avgWarning: 80,
        avgTarget: 85,
      };
    }),
});

export default oeeThresholdsRouter;
