import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from './db';
import { mobileDevices, mobileNotificationSettings } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

// Mobile device registration and notification management
export const mobileRouter = router({
  // Register device for push notifications
  registerDevice: protectedProcedure
    .input(z.object({
      token: z.string(),
      platform: z.enum(['ios', 'android']),
      deviceName: z.string().optional(),
      deviceModel: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const userId = ctx.user.id;
      
      // Check if device already exists
      const existing = await db
        .select()
        .from(mobileDevices)
        .where(and(
          eq(mobileDevices.userId, userId),
          eq(mobileDevices.token, input.token)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing device
        await db
          .update(mobileDevices)
          .set({
            platform: input.platform,
            deviceName: input.deviceName || null,
            deviceModel: input.deviceModel || null,
            lastActiveAt: new Date().toISOString(),
          })
          .where(eq(mobileDevices.id, existing[0].id));
        
        return { success: true, message: 'Device updated' };
      }

      // Insert new device
      await db.insert(mobileDevices).values({
        userId,
        token: input.token,
        platform: input.platform,
        deviceName: input.deviceName || null,
        deviceModel: input.deviceModel || null,
        isActive: 1,
        lastActiveAt: new Date().toISOString(),
      });

      return { success: true, message: 'Device registered' };
    }),

  // Unregister device
  unregisterDevice: protectedProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const userId = ctx.user.id;
      
      await db
        .update(mobileDevices)
        .set({ isActive: 0 })
        .where(and(
          eq(mobileDevices.userId, userId),
          eq(mobileDevices.token, input.token)
        ));

      return { success: true, message: 'Device unregistered' };
    }),

  // Get user's registered devices
  getDevices: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const userId = ctx.user.id;
      
      const devices = await db
        .select()
        .from(mobileDevices)
        .where(and(
          eq(mobileDevices.userId, userId),
          eq(mobileDevices.isActive, 1)
        ));

      return devices;
    }),

  // Update notification settings
  updateNotificationSettings: protectedProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      cpkAlerts: z.boolean().optional(),
      spcAlerts: z.boolean().optional(),
      oeeAlerts: z.boolean().optional(),
      dailyReport: z.boolean().optional(),
      soundEnabled: z.boolean().optional(),
      vibrationEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const userId = ctx.user.id;
      
      // Check if settings exist
      const existing = await db
        .select()
        .from(mobileNotificationSettings)
        .where(eq(mobileNotificationSettings.userId, userId))
        .limit(1);

      const updateData: Record<string, any> = {};
      if (input.enabled !== undefined) updateData.enabled = input.enabled ? 1 : 0;
      if (input.cpkAlerts !== undefined) updateData.cpkAlerts = input.cpkAlerts ? 1 : 0;
      if (input.spcAlerts !== undefined) updateData.spcAlerts = input.spcAlerts ? 1 : 0;
      if (input.oeeAlerts !== undefined) updateData.oeeAlerts = input.oeeAlerts ? 1 : 0;
      if (input.dailyReport !== undefined) updateData.dailyReport = input.dailyReport ? 1 : 0;
      if (input.soundEnabled !== undefined) updateData.soundEnabled = input.soundEnabled ? 1 : 0;
      if (input.vibrationEnabled !== undefined) updateData.vibrationEnabled = input.vibrationEnabled ? 1 : 0;

      if (existing.length > 0) {
        // Update existing settings
        await db
          .update(mobileNotificationSettings)
          .set(updateData)
          .where(eq(mobileNotificationSettings.userId, userId));
      } else {
        // Insert new settings
        await db.insert(mobileNotificationSettings).values({
          userId,
          enabled: input.enabled !== undefined ? (input.enabled ? 1 : 0) : 1,
          cpkAlerts: input.cpkAlerts !== undefined ? (input.cpkAlerts ? 1 : 0) : 1,
          spcAlerts: input.spcAlerts !== undefined ? (input.spcAlerts ? 1 : 0) : 1,
          oeeAlerts: input.oeeAlerts !== undefined ? (input.oeeAlerts ? 1 : 0) : 1,
          dailyReport: input.dailyReport !== undefined ? (input.dailyReport ? 1 : 0) : 0,
          soundEnabled: input.soundEnabled !== undefined ? (input.soundEnabled ? 1 : 0) : 1,
          vibrationEnabled: input.vibrationEnabled !== undefined ? (input.vibrationEnabled ? 1 : 0) : 1,
        });
      }

      return { success: true, message: 'Settings updated' };
    }),

  // Get notification settings
  getNotificationSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const userId = ctx.user.id;
      
      const settings = await db
        .select()
        .from(mobileNotificationSettings)
        .where(eq(mobileNotificationSettings.userId, userId))
        .limit(1);

      if (settings.length === 0) {
        // Return default settings
        return {
          enabled: true,
          cpkAlerts: true,
          spcAlerts: true,
          oeeAlerts: true,
          dailyReport: false,
          soundEnabled: true,
          vibrationEnabled: true,
        };
      }

      const s = settings[0];
      return {
        enabled: s.enabled === 1,
        cpkAlerts: s.cpkAlerts === 1,
        spcAlerts: s.spcAlerts === 1,
        oeeAlerts: s.oeeAlerts === 1,
        dailyReport: s.dailyReport === 1,
        soundEnabled: s.soundEnabled === 1,
        vibrationEnabled: s.vibrationEnabled === 1,
      };
    }),
});

export type MobileRouter = typeof mobileRouter;
