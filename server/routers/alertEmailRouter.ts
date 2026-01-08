/**
 * Alert Email Router
 * API endpoints cho cấu hình và gửi email cảnh báo tự động khi AI phát hiện lỗi
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { notifyOwner } from '../_core/notification';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { alertEmailConfigs, alertEmailHistory } from '../../drizzle/schema';

export const alertEmailRouter = router({
  // Create alert config
  createConfig: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      isActive: z.boolean().default(true),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      productCode: z.string().optional(),
      alertTypes: z.array(z.string()).default(['defect_critical', 'defect_major']),
      severityThreshold: z.enum(['minor', 'major', 'critical']).default('major'),
      emailRecipients: z.array(z.string().email()),
      emailSubjectTemplate: z.string().optional(),
      emailBodyTemplate: z.string().optional(),
      includeImage: z.boolean().default(true),
      includeAiAnalysis: z.boolean().default(true),
      cooldownMinutes: z.number().min(1).max(1440).default(30),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [result] = await db.insert(alertEmailConfigs).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        isActive: input.isActive ? 1 : 0,
        productionLineId: input.productionLineId,
        workstationId: input.workstationId,
        productCode: input.productCode,
        alertTypes: input.alertTypes,
        severityThreshold: input.severityThreshold,
        emailRecipients: input.emailRecipients,
        emailSubjectTemplate: input.emailSubjectTemplate,
        emailBodyTemplate: input.emailBodyTemplate,
        includeImage: input.includeImage ? 1 : 0,
        includeAiAnalysis: input.includeAiAnalysis ? 1 : 0,
        cooldownMinutes: input.cooldownMinutes,
      });

      return { id: result.insertId, success: true };
    }),

  // Update alert config
  updateConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      productCode: z.string().optional(),
      alertTypes: z.array(z.string()).optional(),
      severityThreshold: z.enum(['minor', 'major', 'critical']).optional(),
      emailRecipients: z.array(z.string().email()).optional(),
      emailSubjectTemplate: z.string().optional(),
      emailBodyTemplate: z.string().optional(),
      includeImage: z.boolean().optional(),
      includeAiAnalysis: z.boolean().optional(),
      cooldownMinutes: z.number().min(1).max(1440).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
      if (input.productionLineId !== undefined) updateData.productionLineId = input.productionLineId;
      if (input.workstationId !== undefined) updateData.workstationId = input.workstationId;
      if (input.productCode !== undefined) updateData.productCode = input.productCode;
      if (input.alertTypes !== undefined) updateData.alertTypes = input.alertTypes;
      if (input.severityThreshold !== undefined) updateData.severityThreshold = input.severityThreshold;
      if (input.emailRecipients !== undefined) updateData.emailRecipients = input.emailRecipients;
      if (input.emailSubjectTemplate !== undefined) updateData.emailSubjectTemplate = input.emailSubjectTemplate;
      if (input.emailBodyTemplate !== undefined) updateData.emailBodyTemplate = input.emailBodyTemplate;
      if (input.includeImage !== undefined) updateData.includeImage = input.includeImage ? 1 : 0;
      if (input.includeAiAnalysis !== undefined) updateData.includeAiAnalysis = input.includeAiAnalysis ? 1 : 0;
      if (input.cooldownMinutes !== undefined) updateData.cooldownMinutes = input.cooldownMinutes;

      await db.update(alertEmailConfigs)
        .set(updateData)
        .where(and(
          eq(alertEmailConfigs.id, input.id),
          eq(alertEmailConfigs.userId, ctx.user.id)
        ));

      return { success: true };
    }),

  // Delete config
  deleteConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      await db.delete(alertEmailConfigs)
        .where(and(
          eq(alertEmailConfigs.id, input.id),
          eq(alertEmailConfigs.userId, ctx.user.id)
        ));

      return { success: true };
    }),

  // Get configs
  getConfigs: protectedProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { configs: [], total: 0 };

      const conditions = [eq(alertEmailConfigs.userId, ctx.user.id)];
      if (input.isActive !== undefined) {
        conditions.push(eq(alertEmailConfigs.isActive, input.isActive ? 1 : 0));
      }

      const configs = await db.select()
        .from(alertEmailConfigs)
        .where(and(...conditions))
        .orderBy(desc(alertEmailConfigs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db.select({ count: sql<number>`COUNT(*)` })
        .from(alertEmailConfigs)
        .where(and(...conditions));

      return {
        configs,
        total: countResult?.count || 0,
      };
    }),

  // Toggle active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [config] = await db.select()
        .from(alertEmailConfigs)
        .where(and(
          eq(alertEmailConfigs.id, input.id),
          eq(alertEmailConfigs.userId, ctx.user.id)
        ))
        .limit(1);

      if (!config) throw new Error('Config not found');

      const newStatus = config.isActive ? 0 : 1;
      await db.update(alertEmailConfigs)
        .set({ isActive: newStatus })
        .where(eq(alertEmailConfigs.id, input.id));

      return { isActive: newStatus === 1 };
    }),

  // Get alert history
  getHistory: protectedProcedure
    .input(z.object({
      configId: z.number().optional(),
      status: z.enum(['pending', 'sent', 'failed']).optional(),
      severity: z.enum(['minor', 'major', 'critical']).optional(),
      startDate: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { history: [], total: 0 };

      // Get user's config IDs first
      const userConfigs = await db.select({ id: alertEmailConfigs.id })
        .from(alertEmailConfigs)
        .where(eq(alertEmailConfigs.userId, ctx.user.id));

      const configIds = userConfigs.map(c => c.id);
      if (configIds.length === 0) return { history: [], total: 0 };

      const history = await db.select()
        .from(alertEmailHistory)
        .where(sql`config_id IN (${sql.join(configIds.map(id => sql`${id}`), sql`, `)})`)
        .orderBy(desc(alertEmailHistory.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        history,
        total: history.length,
      };
    }),

  // Get stats
  getStats: protectedProcedure
    .input(z.object({
      days: z.number().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { totalAlerts: 0, bySeverity: {}, byStatus: {} };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get user's config IDs
      const userConfigs = await db.select({ id: alertEmailConfigs.id })
        .from(alertEmailConfigs)
        .where(eq(alertEmailConfigs.userId, ctx.user.id));

      const configIds = userConfigs.map(c => c.id);
      if (configIds.length === 0) {
        return { totalAlerts: 0, bySeverity: {}, byStatus: {} };
      }

      const history = await db.select()
        .from(alertEmailHistory)
        .where(and(
          sql`config_id IN (${sql.join(configIds.map(id => sql`${id}`), sql`, `)})`,
          gte(alertEmailHistory.createdAt, startDate.toISOString())
        ));

      const bySeverity = history.reduce((acc, h) => {
        acc[h.severity] = (acc[h.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const byStatus = history.reduce((acc, h) => {
        acc[h.status] = (acc[h.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalAlerts: history.length,
        bySeverity,
        byStatus,
      };
    }),

  // Test config (send test notification)
  testConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [config] = await db.select()
        .from(alertEmailConfigs)
        .where(and(
          eq(alertEmailConfigs.id, input.id),
          eq(alertEmailConfigs.userId, ctx.user.id)
        ))
        .limit(1);

      if (!config) throw new Error('Config not found');

      try {
        const success = await notifyOwner({
          title: `[TEST] ${config.name}`,
          content: `Đây là email test cho cấu hình "${config.name}".\n\nNếu bạn nhận được email này, cấu hình đã hoạt động đúng.`,
        });

        return { success, message: success ? 'Test email sent' : 'Failed to send test email' };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }),

  // Resend failed alert
  resendAlert: protectedProcedure
    .input(z.object({ historyId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [historyItem] = await db.select()
        .from(alertEmailHistory)
        .where(eq(alertEmailHistory.id, input.historyId))
        .limit(1);

      if (!historyItem) throw new Error('Alert history not found');

      try {
        const success = await notifyOwner({
          title: historyItem.subject,
          content: historyItem.body,
        });

        if (success) {
          await db.update(alertEmailHistory)
            .set({ 
              status: 'sent', 
              sentAt: sql`NOW()`,
              retryCount: sql`retry_count + 1`
            })
            .where(eq(alertEmailHistory.id, input.historyId));
        }

        return { success };
      } catch (error) {
        await db.update(alertEmailHistory)
          .set({ 
            retryCount: sql`retry_count + 1`,
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          })
          .where(eq(alertEmailHistory.id, input.historyId));

        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }),
});
