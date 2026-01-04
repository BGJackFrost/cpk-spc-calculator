import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  createEscalationTemplate,
  getEscalationTemplates,
  getEscalationTemplateById,
  getDefaultEscalationTemplate,
  updateEscalationTemplate,
  deleteEscalationTemplate,
  findMatchingTemplate,
} from "../services/escalationTemplateService";

export const escalationTemplateRouter = router({
  list: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      return await getEscalationTemplates(input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getEscalationTemplateById(input.id);
    }),

  getDefault: protectedProcedure.query(async () => {
    return await getDefaultEscalationTemplate();
  }),

  findMatching: protectedProcedure
    .input(z.object({
      alertType: z.string(),
      productionLineId: z.number().optional(),
      machineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await findMatchingTemplate(input.alertType, input.productionLineId, input.machineId);
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      level1TimeoutMinutes: z.number().min(1).default(15),
      level1Emails: z.array(z.string().email()).optional(),
      level1Webhooks: z.array(z.number()).optional(),
      level1SmsEnabled: z.boolean().default(false),
      level1SmsPhones: z.array(z.string()).optional(),
      level2TimeoutMinutes: z.number().min(1).default(30),
      level2Emails: z.array(z.string().email()).optional(),
      level2Webhooks: z.array(z.number()).optional(),
      level2SmsEnabled: z.boolean().default(false),
      level2SmsPhones: z.array(z.string()).optional(),
      level3TimeoutMinutes: z.number().min(1).default(60),
      level3Emails: z.array(z.string().email()).optional(),
      level3Webhooks: z.array(z.number()).optional(),
      level3SmsEnabled: z.boolean().default(false),
      level3SmsPhones: z.array(z.string()).optional(),
      alertTypes: z.array(z.string()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      machineIds: z.array(z.number()).optional(),
      isDefault: z.boolean().default(false),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createEscalationTemplate({ ...input, createdBy: ctx.user.id });
      return { id };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      level1TimeoutMinutes: z.number().min(1).optional(),
      level1Emails: z.array(z.string().email()).optional(),
      level1Webhooks: z.array(z.number()).optional(),
      level1SmsEnabled: z.boolean().optional(),
      level1SmsPhones: z.array(z.string()).optional(),
      level2TimeoutMinutes: z.number().min(1).optional(),
      level2Emails: z.array(z.string().email()).optional(),
      level2Webhooks: z.array(z.number()).optional(),
      level2SmsEnabled: z.boolean().optional(),
      level2SmsPhones: z.array(z.string()).optional(),
      level3TimeoutMinutes: z.number().min(1).optional(),
      level3Emails: z.array(z.string().email()).optional(),
      level3Webhooks: z.array(z.number()).optional(),
      level3SmsEnabled: z.boolean().optional(),
      level3SmsPhones: z.array(z.string()).optional(),
      alertTypes: z.array(z.string()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      machineIds: z.array(z.number()).optional(),
      isDefault: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateEscalationTemplate(id, data as any);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteEscalationTemplate(input.id);
      return { success: true };
    }),
});
