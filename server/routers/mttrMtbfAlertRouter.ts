/**
 * MTTR/MTBF Alert Router
 * API endpoints cho quản lý ngưỡng cảnh báo MTTR/MTBF
 */
import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import {
  getThresholds,
  getThresholdById,
  createThreshold,
  updateThreshold,
  deleteThreshold,
  getAlertHistory,
  acknowledgeAlert,
  checkAndTriggerAlerts,
} from '../services/mttrMtbfAlertService';

export const mttrMtbfAlertRouter = router({
  // List all thresholds
  listThresholds: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line', 'all']).optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getThresholds(input?.targetType);
    }),

  // Get threshold by ID
  getThreshold: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getThresholdById(input.id);
    }),

  // Create threshold
  createThreshold: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line', 'all']),
      targetId: z.number().nullable().optional(),
      mttrWarningThreshold: z.number().nullable().optional(),
      mttrCriticalThreshold: z.number().nullable().optional(),
      mtbfWarningThreshold: z.number().nullable().optional(),
      mtbfCriticalThreshold: z.number().nullable().optional(),
      availabilityWarningThreshold: z.number().nullable().optional(),
      availabilityCriticalThreshold: z.number().nullable().optional(),
      alertEmails: z.string().nullable().optional(),
      alertTelegram: z.number().optional(),
      cooldownMinutes: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await createThreshold({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),

  // Update threshold
  updateThreshold: protectedProcedure
    .input(z.object({
      id: z.number(),
      targetType: z.enum(['device', 'machine', 'production_line', 'all']).optional(),
      targetId: z.number().nullable().optional(),
      mttrWarningThreshold: z.number().nullable().optional(),
      mttrCriticalThreshold: z.number().nullable().optional(),
      mtbfWarningThreshold: z.number().nullable().optional(),
      mtbfCriticalThreshold: z.number().nullable().optional(),
      availabilityWarningThreshold: z.number().nullable().optional(),
      availabilityCriticalThreshold: z.number().nullable().optional(),
      enabled: z.number().optional(),
      alertEmails: z.string().nullable().optional(),
      alertTelegram: z.number().optional(),
      cooldownMinutes: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateThreshold(id, data);
      return { success: true };
    }),

  // Delete threshold
  deleteThreshold: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteThreshold(input.id);
      return { success: true };
    }),

  // Get alert history
  getAlertHistory: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']).optional(),
      targetId: z.number().optional(),
      alertType: z.string().optional(),
      days: z.number().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await getAlertHistory(input);
    }),

  // Acknowledge alert
  acknowledgeAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await acknowledgeAlert(input.alertId, ctx.user?.id || 0);
      return { success: true };
    }),

  // Test alert (manual trigger)
  testAlert: protectedProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']),
      targetId: z.number(),
      mttr: z.number().nullable().optional(),
      mtbf: z.number().nullable().optional(),
      availability: z.number().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await checkAndTriggerAlerts(
        input.targetType,
        input.targetId,
        {
          mttr: input.mttr ?? null,
          mtbf: input.mtbf ?? null,
          availability: input.availability ?? null,
        }
      );
      return { triggered: !!result, alert: result };
    }),
});

export default mttrMtbfAlertRouter;
