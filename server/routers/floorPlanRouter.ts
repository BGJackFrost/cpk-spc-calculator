/**
 * FloorPlan Router - API endpoints cho Floor Plan Management
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { floorPlanConfigs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

// Machine position schema
const machinePositionSchema = z.object({
  id: z.string(),
  machineId: z.number(),
  machineName: z.string(),
  machineType: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  color: z.string(),
});

// Floor plan config schema
const floorPlanConfigSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  productionLineId: z.number().optional(),
  width: z.number().default(800),
  height: z.number().default(600),
  gridSize: z.number().default(20),
  backgroundColor: z.string().default('#f8fafc'),
  backgroundImage: z.string().optional(),
  machinePositions: z.array(machinePositionSchema).default([]),
  isActive: z.boolean().default(true),
});

export const floorPlanRouter = router({
  // Get all floor plans
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    try {
      const plans = await db.select().from(floorPlanConfigs).orderBy(desc(floorPlanConfigs.createdAt));
      return plans.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        productionLineId: p.productionLineId,
        width: p.width,
        height: p.height,
        gridSize: p.gridSize,
        backgroundColor: p.backgroundColor,
        backgroundImage: p.backgroundImage,
        machinePositions: (p.machinePositions as any[]) || [],
        isActive: p.isActive === 1,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
    } catch (error) {
      console.error('Error fetching floor plans:', error);
      return [];
    }
  }),

  // Get floor plan by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const plans = await db.select().from(floorPlanConfigs).where(eq(floorPlanConfigs.id, input.id)).limit(1);
        if (plans.length === 0) return null;

        const p = plans[0];
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          productionLineId: p.productionLineId,
          width: p.width,
          height: p.height,
          gridSize: p.gridSize,
          backgroundColor: p.backgroundColor,
          backgroundImage: p.backgroundImage,
          machinePositions: (p.machinePositions as any[]) || [],
          isActive: p.isActive === 1,
          createdBy: p.createdBy,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      } catch (error) {
        console.error('Error fetching floor plan:', error);
        return null;
      }
    }),

  // Get floor plan by production line
  getByProductionLine: publicProcedure
    .input(z.object({ productionLineId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const plans = await db.select()
          .from(floorPlanConfigs)
          .where(eq(floorPlanConfigs.productionLineId, input.productionLineId))
          .limit(1);
        
        if (plans.length === 0) return null;

        const p = plans[0];
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          productionLineId: p.productionLineId,
          width: p.width,
          height: p.height,
          gridSize: p.gridSize,
          backgroundColor: p.backgroundColor,
          backgroundImage: p.backgroundImage,
          machinePositions: (p.machinePositions as any[]) || [],
          isActive: p.isActive === 1,
        };
      } catch (error) {
        console.error('Error fetching floor plan:', error);
        return null;
      }
    }),

  // Create floor plan
  create: protectedProcedure
    .input(floorPlanConfigSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const result = await db.insert(floorPlanConfigs).values({
          name: input.name,
          description: input.description,
          productionLineId: input.productionLineId,
          width: input.width,
          height: input.height,
          gridSize: input.gridSize,
          backgroundColor: input.backgroundColor,
          backgroundImage: input.backgroundImage,
          machinePositions: input.machinePositions,
          isActive: input.isActive ? 1 : 0,
          createdBy: ctx.user?.id,
        });

        const insertId = Number(result[0].insertId);
        return { id: insertId, success: true };
      } catch (error) {
        console.error('Error creating floor plan:', error);
        return { success: false, error: 'Failed to create floor plan' };
      }
    }),

  // Update floor plan
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      ...floorPlanConfigSchema.shape,
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        const { id, ...data } = input;
        await db.update(floorPlanConfigs)
          .set({
            name: data.name,
            description: data.description,
            productionLineId: data.productionLineId,
            width: data.width,
            height: data.height,
            gridSize: data.gridSize,
            backgroundColor: data.backgroundColor,
            backgroundImage: data.backgroundImage,
            machinePositions: data.machinePositions,
            isActive: data.isActive ? 1 : 0,
          })
          .where(eq(floorPlanConfigs.id, id));

        return { success: true };
      } catch (error) {
        console.error('Error updating floor plan:', error);
        return { success: false, error: 'Failed to update floor plan' };
      }
    }),

  // Delete floor plan
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        await db.delete(floorPlanConfigs).where(eq(floorPlanConfigs.id, input.id));
        return { success: true };
      } catch (error) {
        console.error('Error deleting floor plan:', error);
        return { success: false, error: 'Failed to delete floor plan' };
      }
    }),

  // Update machine positions only
  updateMachinePositions: protectedProcedure
    .input(z.object({
      id: z.number(),
      machinePositions: z.array(machinePositionSchema),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        await db.update(floorPlanConfigs)
          .set({ machinePositions: input.machinePositions })
          .where(eq(floorPlanConfigs.id, input.id));

        return { success: true };
      } catch (error) {
        console.error('Error updating machine positions:', error);
        return { success: false, error: 'Failed to update machine positions' };
      }
    }),
});

export default floorPlanRouter;
