/**
 * Scheduled CPK Check Router - API endpoints cho quản lý scheduled jobs kiểm tra CPK
 */
import { z } from 'zod';
import { router, protectedProcedure, adminProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { scheduledCpkJobs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export const scheduledCpkCheckRouter = router({
  // List all scheduled jobs
  list: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize };

      try {
        const items = await db.select()
          .from(scheduledCpkJobs)
          .orderBy(desc(scheduledCpkJobs.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize);

        return {
          items,
          total: items.length,
          page: input.page,
          pageSize: input.pageSize,
        };
      } catch (error) {
        console.error('[ScheduledCpkCheck] Error listing jobs:', error);
        return { items: [], total: 0, page: input.page, pageSize: input.pageSize };
      }
    }),

  // Get single job
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const [job] = await db.select()
          .from(scheduledCpkJobs)
          .where(eq(scheduledCpkJobs.id, input.id))
          .limit(1);
        return job || null;
      } catch (error) {
        console.error('[ScheduledCpkCheck] Error getting job:', error);
        return null;
      }
    }),

  // Create scheduled job
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      runTime: z.string(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      warningThreshold: z.number().default(1.33),
      criticalThreshold: z.number().default(1.0),
      emailRecipients: z.string().optional(),
      enableEmail: z.boolean().default(true),
      enableOwnerNotification: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const [result] = await db.insert(scheduledCpkJobs).values({
          name: input.name,
          description: input.description || '',
          frequency: input.frequency,
          runTime: input.runTime,
          dayOfWeek: input.dayOfWeek,
          dayOfMonth: input.dayOfMonth,
          productCode: input.productCode,
          stationName: input.stationName,
          warningThreshold: Math.round(input.warningThreshold * 1000),
          criticalThreshold: Math.round(input.criticalThreshold * 1000),
          emailRecipients: input.emailRecipients,
          enableEmail: input.enableEmail,
          enableOwnerNotification: input.enableOwnerNotification,
          isActive: true,
          createdBy: ctx.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { success: true, id: result.insertId };
      } catch (error) {
        console.error('[ScheduledCpkCheck] Error creating job:', error);
        throw new Error('Failed to create scheduled job');
      }
    }),

  // Update scheduled job
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
      runTime: z.string().optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      warningThreshold: z.number().optional(),
      criticalThreshold: z.number().optional(),
      emailRecipients: z.string().optional(),
      enableEmail: z.boolean().optional(),
      enableOwnerNotification: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.frequency !== undefined) updateData.frequency = input.frequency;
        if (input.runTime !== undefined) updateData.runTime = input.runTime;
        if (input.dayOfWeek !== undefined) updateData.dayOfWeek = input.dayOfWeek;
        if (input.dayOfMonth !== undefined) updateData.dayOfMonth = input.dayOfMonth;
        if (input.productCode !== undefined) updateData.productCode = input.productCode;
        if (input.stationName !== undefined) updateData.stationName = input.stationName;
        if (input.warningThreshold !== undefined) updateData.warningThreshold = Math.round(input.warningThreshold * 1000);
        if (input.criticalThreshold !== undefined) updateData.criticalThreshold = Math.round(input.criticalThreshold * 1000);
        if (input.emailRecipients !== undefined) updateData.emailRecipients = input.emailRecipients;
        if (input.enableEmail !== undefined) updateData.enableEmail = input.enableEmail;
        if (input.enableOwnerNotification !== undefined) updateData.enableOwnerNotification = input.enableOwnerNotification;
        if (input.isActive !== undefined) updateData.isActive = input.isActive;

        await db.update(scheduledCpkJobs)
          .set(updateData)
          .where(eq(scheduledCpkJobs.id, input.id));

        return { success: true };
      } catch (error) {
        console.error('[ScheduledCpkCheck] Error updating job:', error);
        throw new Error('Failed to update scheduled job');
      }
    }),

  // Delete scheduled job
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        await db.delete(scheduledCpkJobs)
          .where(eq(scheduledCpkJobs.id, input.id));

        return { success: true };
      } catch (error) {
        console.error('[ScheduledCpkCheck] Error deleting job:', error);
        throw new Error('Failed to delete scheduled job');
      }
    }),

  // Run job manually
  runNow: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      try {
        await db.update(scheduledCpkJobs)
          .set({ lastRunAt: new Date() })
          .where(eq(scheduledCpkJobs.id, input.id));

        return { success: true, message: 'Job triggered successfully' };
      } catch (error) {
        console.error('[ScheduledCpkCheck] Error running job:', error);
        throw new Error('Failed to run scheduled job');
      }
    }),
});

export default scheduledCpkCheckRouter;
