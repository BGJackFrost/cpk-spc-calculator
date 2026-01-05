/**
 * Notification Router - API endpoints cho push notifications
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import pushNotificationService from '../services/pushNotificationService';
import { sendSseEvent } from '../sse';
import { getDb } from '../db';
import { emailNotificationSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

export const notificationRouter = router({
  // Get user notification settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return {
        iotAlerts: true,
        spcAlerts: true,
        cpkAlerts: true,
        systemAlerts: true,
        emailNotifications: false,
      };
    }

    try {
      const settings = await db
        .select()
        .from(emailNotificationSettings)
        .where(eq(emailNotificationSettings.userId, ctx.user.id))
        .limit(1);

      if (settings.length === 0) {
        return {
          iotAlerts: true,
          spcAlerts: true,
          cpkAlerts: true,
          systemAlerts: true,
          emailNotifications: false,
        };
      }

      return {
        iotAlerts: settings[0].iotAlerts ?? true,
        spcAlerts: settings[0].spcAlerts ?? true,
        cpkAlerts: settings[0].cpkAlerts ?? true,
        systemAlerts: settings[0].systemAlerts ?? true,
        emailNotifications: settings[0].emailNotifications ?? false,
      };
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      return {
        iotAlerts: true,
        spcAlerts: true,
        cpkAlerts: true,
        systemAlerts: true,
        emailNotifications: false,
      };
    }
  }),

  // Update user notification settings
  updateSettings: protectedProcedure
    .input(z.object({
      iotAlerts: z.boolean().optional(),
      spcAlerts: z.boolean().optional(),
      cpkAlerts: z.boolean().optional(),
      systemAlerts: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const success = await pushNotificationService.updateNotificationSettings(
        ctx.user.id,
        input
      );
      return { success };
    }),

  // Send test notification
  sendTest: protectedProcedure
    .input(z.object({
      type: z.enum(['iot_alert', 'spc_alert', 'cpk_alert', 'system']).default('system'),
      severity: z.enum(['info', 'warning', 'critical']).default('info'),
    }))
    .mutation(async ({ input }) => {
      const result = await pushNotificationService.sendNotification({
        type: input.type,
        severity: input.severity,
        title: `Test Notification (${input.severity})`,
        message: `Đây là thông báo test với mức độ ${input.severity}. Thời gian: ${new Date().toLocaleString('vi-VN')}`,
      });
      return result;
    }),

  // Send IoT alert notification
  sendIoTAlert: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      deviceName: z.string(),
      sensorType: z.string(),
      value: z.number(),
      threshold: z.number(),
      severity: z.enum(['warning', 'critical']),
    }))
    .mutation(async ({ input }) => {
      return pushNotificationService.sendIoTAlert(
        input.deviceId,
        input.deviceName,
        input.sensorType,
        input.value,
        input.threshold,
        input.severity
      );
    }),

  // Send SPC alert notification
  sendSPCAlert: protectedProcedure
    .input(z.object({
      planName: z.string(),
      ruleName: z.string(),
      ruleCode: z.string(),
      value: z.number(),
      severity: z.enum(['warning', 'critical']),
    }))
    .mutation(async ({ input }) => {
      return pushNotificationService.sendSPCAlert(
        input.planName,
        input.ruleName,
        input.ruleCode,
        input.value,
        input.severity
      );
    }),

  // Send CPK alert notification
  sendCPKAlert: protectedProcedure
    .input(z.object({
      planName: z.string(),
      cpkValue: z.number(),
      threshold: z.number(),
      severity: z.enum(['warning', 'critical']),
    }))
    .mutation(async ({ input }) => {
      return pushNotificationService.sendCPKAlert(
        input.planName,
        input.cpkValue,
        input.threshold,
        input.severity
      );
    }),

  // Send system notification
  sendSystem: protectedProcedure
    .input(z.object({
      title: z.string(),
      message: z.string(),
      severity: z.enum(['info', 'warning', 'critical']).default('info'),
    }))
    .mutation(async ({ input }) => {
      return pushNotificationService.sendSystemNotification(
        input.title,
        input.message,
        input.severity
      );
    }),

  // Broadcast notification to all users
  broadcast: protectedProcedure
    .input(z.object({
      title: z.string(),
      message: z.string(),
      severity: z.enum(['info', 'warning', 'critical']).default('info'),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only admin can broadcast
      if (ctx.user.role !== 'admin') {
        return { success: false, error: 'Admin access required' };
      }

      sendSseEvent('broadcast', {
        title: input.title,
        message: input.message,
        severity: input.severity,
        timestamp: new Date(),
        sender: ctx.user.name || ctx.user.id,
      });

      return { success: true };
    }),

  // Get notification history (placeholder - would need database table)
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      type: z.enum(['iot_alert', 'spc_alert', 'cpk_alert', 'system']).optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
    }).optional())
    .query(async ({ input }) => {
      // In a real implementation, this would query from a notifications table
      return pushNotificationService.getNotificationHistory(
        input?.limit || 50,
        {
          type: input?.type,
          severity: input?.severity,
        }
      );
    }),
});

export default notificationRouter;
