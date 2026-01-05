/**
 * Notification Preferences Router
 * tRPC router for managing user notification preferences
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import * as notificationPreferencesService from '../services/notificationPreferencesService';

export const notificationPreferencesRouter = router({
  // Get current user's notification preferences
  getMyPreferences: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.user.id;
      const prefs = await notificationPreferencesService.getOrCreatePreferences(userId);
      return prefs;
    }),

  // Update notification preferences
  updatePreferences: protectedProcedure
    .input(z.object({
      emailEnabled: z.boolean().optional(),
      emailAddress: z.string().email().optional().nullable(),
      telegramEnabled: z.boolean().optional(),
      telegramChatId: z.string().optional().nullable(),
      pushEnabled: z.boolean().optional(),
      severityFilter: z.enum(['all', 'warning_up', 'critical_only']).optional(),
      quietHoursEnabled: z.boolean().optional(),
      quietHoursStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      quietHoursEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      
      // Ensure preferences exist
      await notificationPreferencesService.getOrCreatePreferences(userId);
      
      // Update preferences
      const updated = await notificationPreferencesService.updatePreferences(userId, {
        emailEnabled: input.emailEnabled,
        emailAddress: input.emailAddress ?? undefined,
        telegramEnabled: input.telegramEnabled,
        telegramChatId: input.telegramChatId ?? undefined,
        pushEnabled: input.pushEnabled,
        severityFilter: input.severityFilter,
        quietHoursEnabled: input.quietHoursEnabled,
        quietHoursStart: input.quietHoursStart,
        quietHoursEnd: input.quietHoursEnd,
      });

      return updated;
    }),

  // Reset to default preferences
  resetToDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      
      const updated = await notificationPreferencesService.updatePreferences(userId, {
        emailEnabled: true,
        telegramEnabled: false,
        pushEnabled: true,
        severityFilter: 'warning_up',
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      });

      return updated;
    }),
});
