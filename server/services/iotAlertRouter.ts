/**
 * IoT Alert Router - API endpoints cho IoT Alert Service
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getIoTAlertService } from './iotAlertService';
import { getDb } from '../db';
import { 
  iotAlertThresholds, 
  iotAlertHistory,
  iotDevices 
} from '../../drizzle/schema';
import { eq, desc, and, isNull, gte, lte } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const iotAlertRouter = router({
  // === Threshold Management ===
  
  // Lấy danh sách thresholds
  getThresholds: protectedProcedure
    .input(z.object({
      deviceId: z.number().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db.select().from(iotAlertThresholds);
      
      if (input?.deviceId) {
        query = query.where(eq(iotAlertThresholds.deviceId, input.deviceId)) as typeof query;
      }
      if (input?.isActive !== undefined) {
        query = query.where(eq(iotAlertThresholds.isActive, input.isActive ? 1 : 0)) as typeof query;
      }

      return await query;
    }),

  // Lấy threshold theo ID
  getThreshold: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const [threshold] = await db
        .select()
        .from(iotAlertThresholds)
        .where(eq(iotAlertThresholds.id, input.id))
        .limit(1);

      return threshold || null;
    }),

  // Tạo threshold mới
  createThreshold: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      metric: z.string(),
      upperLimit: z.number().optional(),
      lowerLimit: z.number().optional(),
      upperWarning: z.number().optional(),
      lowerWarning: z.number().optional(),
      unit: z.string().optional(),
      notifyEmail: z.boolean().default(false),
      notifyPush: z.boolean().default(true),
      notifySms: z.boolean().default(false),
      cooldownMinutes: z.number().default(5),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const [result] = await db.insert(iotAlertThresholds).values({
        deviceId: input.deviceId,
        metric: input.metric,
        upperLimit: input.upperLimit?.toString(),
        lowerLimit: input.lowerLimit?.toString(),
        upperWarning: input.upperWarning?.toString(),
        lowerWarning: input.lowerWarning?.toString(),
        unit: input.unit,
        notifyEmail: input.notifyEmail ? 1 : 0,
        notifyPush: input.notifyPush ? 1 : 0,
        notifySms: input.notifySms ? 1 : 0,
        cooldownMinutes: input.cooldownMinutes,
        createdBy: ctx.user?.id,
        isActive: 1,
      });

      // Clear cache
      getIoTAlertService().clearCache();

      return { success: true, id: result.insertId };
    }),

  // Cập nhật threshold
  updateThreshold: protectedProcedure
    .input(z.object({
      id: z.number(),
      upperLimit: z.number().optional().nullable(),
      lowerLimit: z.number().optional().nullable(),
      upperWarning: z.number().optional().nullable(),
      lowerWarning: z.number().optional().nullable(),
      unit: z.string().optional(),
      notifyEmail: z.boolean().optional(),
      notifyPush: z.boolean().optional(),
      notifySms: z.boolean().optional(),
      cooldownMinutes: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const updateData: Record<string, any> = {};
      
      if (input.upperLimit !== undefined) updateData.upperLimit = input.upperLimit?.toString() || null;
      if (input.lowerLimit !== undefined) updateData.lowerLimit = input.lowerLimit?.toString() || null;
      if (input.upperWarning !== undefined) updateData.upperWarning = input.upperWarning?.toString() || null;
      if (input.lowerWarning !== undefined) updateData.lowerWarning = input.lowerWarning?.toString() || null;
      if (input.unit !== undefined) updateData.unit = input.unit;
      if (input.notifyEmail !== undefined) updateData.notifyEmail = input.notifyEmail ? 1 : 0;
      if (input.notifyPush !== undefined) updateData.notifyPush = input.notifyPush ? 1 : 0;
      if (input.notifySms !== undefined) updateData.notifySms = input.notifySms ? 1 : 0;
      if (input.cooldownMinutes !== undefined) updateData.cooldownMinutes = input.cooldownMinutes;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

      await db
        .update(iotAlertThresholds)
        .set(updateData)
        .where(eq(iotAlertThresholds.id, input.id));

      // Clear cache
      getIoTAlertService().clearCache();

      return { success: true };
    }),

  // Xóa threshold
  deleteThreshold: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db
        .delete(iotAlertThresholds)
        .where(eq(iotAlertThresholds.id, input.id));

      // Clear cache
      getIoTAlertService().clearCache();

      return { success: true };
    }),

  // === Alert History ===

  // Lấy lịch sử alerts
  getAlertHistory: protectedProcedure
    .input(z.object({
      deviceId: z.number().optional(),
      alertType: z.enum(['upper_limit', 'lower_limit', 'upper_warning', 'lower_warning']).optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      resolved: z.boolean().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { alerts: [], total: 0 };

      let query = db.select().from(iotAlertHistory);
      const conditions = [];

      if (input?.deviceId) {
        conditions.push(eq(iotAlertHistory.deviceId, input.deviceId));
      }
      if (input?.alertType) {
        conditions.push(eq(iotAlertHistory.alertType, input.alertType));
      }
      if (input?.startDate) {
        conditions.push(gte(iotAlertHistory.createdAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(iotAlertHistory.createdAt, input.endDate));
      }
      if (input?.resolved !== undefined) {
        if (input.resolved) {
          conditions.push(gte(iotAlertHistory.resolvedAt, new Date(0)));
        } else {
          conditions.push(isNull(iotAlertHistory.resolvedAt));
        }
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const alerts = await query
        .orderBy(desc(iotAlertHistory.createdAt))
        .limit(input?.limit || 100)
        .offset(input?.offset || 0);

      return { alerts, total: alerts.length };
    }),

  // Lấy active alerts (chưa resolved)
  getActiveAlerts: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }).optional())
    .query(async ({ input }) => {
      const service = getIoTAlertService();
      return await service.getActiveAlerts(input?.limit);
    }),

  // Acknowledge alert
  acknowledgeAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const service = getIoTAlertService();
      const success = await service.acknowledgeAlert(input.alertId, ctx.user?.id || 0);
      return { success };
    }),

  // Resolve alert
  resolveAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ input }) => {
      const service = getIoTAlertService();
      const success = await service.resolveAlert(input.alertId);
      return { success };
    }),

  // Bulk acknowledge
  bulkAcknowledge: protectedProcedure
    .input(z.object({ alertIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const service = getIoTAlertService();
      let successCount = 0;
      
      for (const alertId of input.alertIds) {
        const success = await service.acknowledgeAlert(alertId, ctx.user?.id || 0);
        if (success) successCount++;
      }
      
      return { success: true, acknowledged: successCount };
    }),

  // Bulk resolve
  bulkResolve: protectedProcedure
    .input(z.object({ alertIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      const service = getIoTAlertService();
      let successCount = 0;
      
      for (const alertId of input.alertIds) {
        const success = await service.resolveAlert(alertId);
        if (success) successCount++;
      }
      
      return { success: true, resolved: successCount };
    }),

  // === Service Status ===

  // Lấy trạng thái service
  getServiceStatus: publicProcedure
    .query(() => {
      const service = getIoTAlertService();
      return service.getStatus();
    }),

  // Start service
  startService: protectedProcedure
    .mutation(() => {
      const service = getIoTAlertService();
      service.start();
      return { success: true };
    }),

  // Stop service
  stopService: protectedProcedure
    .mutation(() => {
      const service = getIoTAlertService();
      service.stop();
      return { success: true };
    }),

  // Clear cache
  clearCache: protectedProcedure
    .mutation(() => {
      const service = getIoTAlertService();
      service.clearCache();
      return { success: true };
    }),

  // === Manual Check ===

  // Kiểm tra một reading thủ công
  checkReading: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      metric: z.string(),
      value: z.number(),
    }))
    .mutation(async ({ input }) => {
      const service = getIoTAlertService();
      const alert = await service.checkReading({
        deviceId: input.deviceId,
        metric: input.metric,
        value: input.value,
        timestamp: new Date(),
      });
      
      return { 
        triggered: !!alert, 
        alert: alert || null 
      };
    }),

  // === Statistics ===

  // Thống kê alerts
  getAlertStats: protectedProcedure
    .input(z.object({
      deviceId: z.number().optional(),
      days: z.number().default(7),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (input?.days || 7));

      const conditions = [gte(iotAlertHistory.createdAt, startDate)];
      if (input?.deviceId) {
        conditions.push(eq(iotAlertHistory.deviceId, input.deviceId));
      }

      const alerts = await db
        .select()
        .from(iotAlertHistory)
        .where(and(...conditions));

      // Calculate stats
      const stats = {
        total: alerts.length,
        byType: {
          upper_limit: 0,
          lower_limit: 0,
          upper_warning: 0,
          lower_warning: 0,
        },
        acknowledged: 0,
        resolved: 0,
        pending: 0,
      };

      for (const alert of alerts) {
        stats.byType[alert.alertType as keyof typeof stats.byType]++;
        if (alert.resolvedAt) stats.resolved++;
        else if (alert.acknowledgedAt) stats.acknowledged++;
        else stats.pending++;
      }

      return stats;
    }),
});

export type IoTAlertRouter = typeof iotAlertRouter;
