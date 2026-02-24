import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createEscalationWebhookConfig,
  getEscalationWebhookConfigs,
  getEscalationWebhookConfigById,
  updateEscalationWebhookConfig,
  deleteEscalationWebhookConfig,
  getEscalationWebhookLogs,
  testEscalationWebhook,
} from "../services/escalationWebhookService";

export const escalationWebhookRouter = router({
  list: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return await getEscalationWebhookConfigs(input?.activeOnly);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getEscalationWebhookConfigById(input.id);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      channelType: z.enum(['slack', 'teams', 'discord', 'custom']),
      webhookUrl: z.string().url(),
      slackChannel: z.string().optional(),
      slackMentions: z.array(z.string()).optional(),
      teamsTitle: z.string().optional(),
      customHeaders: z.record(z.string()).optional(),
      customBodyTemplate: z.string().optional(),
      includeDetails: z.boolean().default(true),
      includeChart: z.boolean().default(false),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createEscalationWebhookConfig({ ...input, createdBy: ctx.user.id });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      channelType: z.enum(['slack', 'teams', 'discord', 'custom']).optional(),
      webhookUrl: z.string().url().optional(),
      slackChannel: z.string().optional(),
      slackMentions: z.array(z.string()).optional(),
      teamsTitle: z.string().optional(),
      customHeaders: z.record(z.string()).optional(),
      customBodyTemplate: z.string().optional(),
      includeDetails: z.boolean().optional(),
      includeChart: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateEscalationWebhookConfig(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteEscalationWebhookConfig(input.id);
      return { success: true };
    }),

  getLogs: protectedProcedure
    .input(z.object({
      webhookConfigId: z.number().optional(),
      escalationHistoryId: z.number().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await getEscalationWebhookLogs(input);
    }),

  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await testEscalationWebhook(input.id);
    }),
});
