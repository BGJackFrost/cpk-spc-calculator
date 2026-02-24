import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { alertWebhookConfigs, alertWebhookLogs } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { testWebhookConfig, getWebhookLogs } from '../services/alertWebhookService';
import { TRPCError } from '@trpc/server';

export const alertWebhookRouter = router({
  // List all webhook configs
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    return db.select().from(alertWebhookConfigs).orderBy(desc(alertWebhookConfigs.createdAt));
  }),

  // Get single webhook config
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const [config] = await db
        .select()
        .from(alertWebhookConfigs)
        .where(eq(alertWebhookConfigs.id, input.id));
      
      return config || null;
    }),

  // Create new webhook config
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      channelType: z.enum(['slack', 'teams', 'email', 'discord', 'custom']),
      webhookUrl: z.string().optional(),
      emailRecipients: z.array(z.string()).optional(),
      emailSubjectTemplate: z.string().optional(),
      slackChannel: z.string().optional(),
      slackBotToken: z.string().optional(),
      teamsWebhookUrl: z.string().optional(),
      alertTypes: z.array(z.string()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      machineIds: z.array(z.number()).optional(),
      minSeverity: z.enum(['info', 'warning', 'critical']).default('warning'),
      rateLimitMinutes: z.number().min(0).default(5),
      isActive: z.boolean().default(true),
      testMode: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const [result] = await db.insert(alertWebhookConfigs).values({
        name: input.name,
        description: input.description || null,
        channelType: input.channelType,
        webhookUrl: input.webhookUrl || null,
        emailRecipients: input.emailRecipients || null,
        emailSubjectTemplate: input.emailSubjectTemplate || null,
        slackChannel: input.slackChannel || null,
        slackBotToken: input.slackBotToken || null,
        teamsWebhookUrl: input.teamsWebhookUrl || null,
        alertTypes: input.alertTypes || null,
        productionLineIds: input.productionLineIds || null,
        machineIds: input.machineIds || null,
        minSeverity: input.minSeverity,
        rateLimitMinutes: input.rateLimitMinutes,
        isActive: input.isActive ? 1 : 0,
        testMode: input.testMode ? 1 : 0,
        createdBy: ctx.user?.id || null,
      });

      return { success: true, id: (result as any).insertId };
    }),

  // Update webhook config
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      channelType: z.enum(['slack', 'teams', 'email', 'discord', 'custom']).optional(),
      webhookUrl: z.string().optional(),
      emailRecipients: z.array(z.string()).optional(),
      emailSubjectTemplate: z.string().optional(),
      slackChannel: z.string().optional(),
      slackBotToken: z.string().optional(),
      teamsWebhookUrl: z.string().optional(),
      alertTypes: z.array(z.string()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      machineIds: z.array(z.number()).optional(),
      minSeverity: z.enum(['info', 'warning', 'critical']).optional(),
      rateLimitMinutes: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
      testMode: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const { id, ...updates } = input;
      const updateData: any = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.channelType !== undefined) updateData.channelType = updates.channelType;
      if (updates.webhookUrl !== undefined) updateData.webhookUrl = updates.webhookUrl;
      if (updates.emailRecipients !== undefined) updateData.emailRecipients = updates.emailRecipients;
      if (updates.emailSubjectTemplate !== undefined) updateData.emailSubjectTemplate = updates.emailSubjectTemplate;
      if (updates.slackChannel !== undefined) updateData.slackChannel = updates.slackChannel;
      if (updates.slackBotToken !== undefined) updateData.slackBotToken = updates.slackBotToken;
      if (updates.teamsWebhookUrl !== undefined) updateData.teamsWebhookUrl = updates.teamsWebhookUrl;
      if (updates.alertTypes !== undefined) updateData.alertTypes = updates.alertTypes;
      if (updates.productionLineIds !== undefined) updateData.productionLineIds = updates.productionLineIds;
      if (updates.machineIds !== undefined) updateData.machineIds = updates.machineIds;
      if (updates.minSeverity !== undefined) updateData.minSeverity = updates.minSeverity;
      if (updates.rateLimitMinutes !== undefined) updateData.rateLimitMinutes = updates.rateLimitMinutes;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive ? 1 : 0;
      if (updates.testMode !== undefined) updateData.testMode = updates.testMode ? 1 : 0;

      await db
        .update(alertWebhookConfigs)
        .set(updateData)
        .where(eq(alertWebhookConfigs.id, id));

      return { success: true };
    }),

  // Delete webhook config
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      await db.delete(alertWebhookConfigs).where(eq(alertWebhookConfigs.id, input.id));

      return { success: true };
    }),

  // Test webhook config
  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return testWebhookConfig(input.id);
    }),

  // Get webhook logs
  getLogs: protectedProcedure
    .input(z.object({
      webhookConfigId: z.number().optional(),
      limit: z.number().min(1).max(500).default(100),
    }))
    .query(async ({ input }) => {
      return getWebhookLogs(input.webhookConfigId, input.limit);
    }),
});
