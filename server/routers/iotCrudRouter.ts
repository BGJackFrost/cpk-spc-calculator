/**
 * IoT CRUD Router
 * Router cho các thao tác CRUD với IoT devices, alarms, thresholds
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as iotDbService from "../services/iotDbService";
import { getMttrMtbfStats, calculateMttrMtbf } from "../db";
import { seedAllIotWorkOrderData, seedIotTechnicians, seedIotMaintenanceSchedules, seedIotWorkOrders, seedIotFailureEvents } from "../services/iotSeedService";

export const iotCrudRouter = router({
  // ==================== DEVICE ENDPOINTS ====================
  
  createDevice: protectedProcedure
    .input(z.object({
      deviceCode: z.string().min(1),
      deviceName: z.string().min(1),
      deviceType: z.string().min(1),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      firmwareVersion: z.string().optional(),
      productionLineId: z.number().optional(),
      machineId: z.number().optional(),
      location: z.string().optional(),
      ipAddress: z.string().optional(),
      macAddress: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return iotDbService.createDevice(input);
    }),

  getDevice: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return iotDbService.getDeviceById(input.id);
    }),

  getDevices: publicProcedure
    .input(z.object({
      status: z.string().optional(),
      deviceType: z.string().optional(),
      productionLineId: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return iotDbService.getDevices(input);
    }),

  updateDevice: protectedProcedure
    .input(z.object({
      id: z.number(),
      deviceCode: z.string().optional(),
      deviceName: z.string().optional(),
      deviceType: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      serialNumber: z.string().optional(),
      firmwareVersion: z.string().optional(),
      productionLineId: z.number().optional(),
      machineId: z.number().optional(),
      location: z.string().optional(),
      ipAddress: z.string().optional(),
      macAddress: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return iotDbService.updateDevice(input);
    }),

  deleteDevice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return iotDbService.deleteDevice(input.id);
    }),

  getDeviceStats: publicProcedure
    .query(async () => {
      return iotDbService.getDeviceStats();
    }),

  // ==================== ALARM ENDPOINTS ====================

  createAlarm: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      alarmType: z.string(),
      alarmCode: z.string(),
      message: z.string(),
      severity: z.string().optional(),
      value: z.number().optional(),
      thresholdValue: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return iotDbService.createAlarm(input);
    }),

  getAlarm: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return iotDbService.getAlarmById(input.id);
    }),

  getAlarms: publicProcedure
    .input(z.object({
      deviceId: z.number().optional(),
      alarmType: z.string().optional(),
      acknowledged: z.boolean().optional(),
      resolved: z.boolean().optional(),
      startTime: z.date().optional(),
      endTime: z.date().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return iotDbService.getAlarms(input);
    }),

  acknowledgeAlarm: protectedProcedure
    .input(z.object({
      id: z.number(),
      acknowledgedBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return iotDbService.acknowledgeAlarm(input.id, input.acknowledgedBy);
    }),

  resolveAlarm: protectedProcedure
    .input(z.object({
      id: z.number(),
      resolvedBy: z.string().optional(),
      resolution: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return iotDbService.resolveAlarm(input.id, input.resolvedBy, input.resolution);
    }),

  batchAcknowledgeAlarms: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
      acknowledgedBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return iotDbService.batchAcknowledgeAlarms(input.ids, input.acknowledgedBy);
    }),

  getAlarmStats: publicProcedure
    .query(async () => {
      return iotDbService.getAlarmStats();
    }),

  // ==================== THRESHOLD ENDPOINTS ====================

  createThreshold: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      metric: z.string(),
      warningLowerLimit: z.number().optional(),
      warningUpperLimit: z.number().optional(),
      lowerLimit: z.number().optional(),
      upperLimit: z.number().optional(),
      criticalLowerLimit: z.number().optional(),
      criticalUpperLimit: z.number().optional(),
      isEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return iotDbService.createThreshold(input);
    }),

  getThreshold: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return iotDbService.getThresholdById(input.id);
    }),

  getThresholds: publicProcedure
    .input(z.object({
      deviceId: z.number().optional(),
      metric: z.string().optional(),
      isEnabled: z.boolean().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      return iotDbService.getThresholds(input);
    }),

  updateThreshold: protectedProcedure
    .input(z.object({
      id: z.number(),
      deviceId: z.number().optional(),
      metric: z.string().optional(),
      warningLowerLimit: z.number().optional(),
      warningUpperLimit: z.number().optional(),
      lowerLimit: z.number().optional(),
      upperLimit: z.number().optional(),
      criticalLowerLimit: z.number().optional(),
      criticalUpperLimit: z.number().optional(),
      isEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      return iotDbService.updateThreshold(input);
    }),

  deleteThreshold: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return iotDbService.deleteThreshold(input.id);
    }),

  // ==================== SEED DATA ENDPOINTS ====================

  seedDevices: protectedProcedure
    .mutation(async () => {
      return iotDbService.seedIotDevices();
    }),

  seedAlarms: protectedProcedure
    .mutation(async () => {
      return iotDbService.seedIotAlarms();
    }),

  seedThresholds: protectedProcedure
    .mutation(async () => {
      return iotDbService.seedIotThresholds();
    }),

  // ==================== MTTR/MTBF ENDPOINTS ====================

  getMttrMtbfTrend: publicProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']).default('device'),
      targetId: z.number().optional(),
      periodType: z.enum(['daily', 'weekly', 'monthly']).default('daily'),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // If targetId is provided, get stats for that specific target
      if (input.targetId) {
        const stats = await getMttrMtbfStats({
          targetType: input.targetType,
          targetId: input.targetId,
          periodType: input.periodType,
          startDate,
          endDate,
        });
        return stats;
      }

      // Otherwise, return aggregated mock data for dashboard
      // In production, this would aggregate across all devices
      const trendData = [];
      for (let i = input.days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        trendData.push({
          date: date.toISOString().split('T')[0],
          mttr: Math.round(30 + Math.random() * 60), // 30-90 minutes
          mtbf: Math.round(100 + Math.random() * 200), // 100-300 hours
          availability: 0.95 + Math.random() * 0.04, // 95-99%
          failures: Math.floor(Math.random() * 5),
        });
      }
      return trendData;
    }),

  getMttrMtbfSummary: publicProcedure
    .input(z.object({
      targetType: z.enum(['device', 'machine', 'production_line']).default('device'),
      targetId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Calculate summary statistics
      // In production, this would aggregate real data
      const mttr = Math.round(45 + Math.random() * 30); // Average MTTR in minutes
      const mtbf = Math.round(150 + Math.random() * 100); // Average MTBF in hours
      const availability = mtbf / (mtbf + mttr / 60); // Availability ratio

      return {
        mttr: {
          current: mttr,
          previous: mttr + Math.round((Math.random() - 0.5) * 20),
          unit: 'minutes',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          changePercent: Math.round(Math.random() * 15),
        },
        mtbf: {
          current: mtbf,
          previous: mtbf + Math.round((Math.random() - 0.5) * 50),
          unit: 'hours',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          changePercent: Math.round(Math.random() * 10),
        },
        availability: {
          current: Math.round(availability * 10000) / 100,
          previous: Math.round((availability + (Math.random() - 0.5) * 0.05) * 10000) / 100,
          unit: '%',
          trend: Math.random() > 0.5 ? 'up' : 'down',
          changePercent: Math.round(Math.random() * 3),
        },
        totalFailures: Math.floor(Math.random() * 20) + 5,
        totalRepairs: Math.floor(Math.random() * 18) + 5,
        totalDowntimeMinutes: Math.floor(Math.random() * 500) + 100,
      };
    }),

  // ==================== SEED DATA ENDPOINTS ====================

  seedWorkOrderData: protectedProcedure
    .mutation(async () => {
      return await seedAllIotWorkOrderData();
    }),

  seedTechnicians: protectedProcedure
    .mutation(async () => {
      return await seedIotTechnicians();
    }),

  seedMaintenanceSchedules: protectedProcedure
    .mutation(async () => {
      return await seedIotMaintenanceSchedules();
    }),

  seedWorkOrders: protectedProcedure
    .mutation(async () => {
      return await seedIotWorkOrders();
    }),

  seedFailureEvents: protectedProcedure
    .mutation(async () => {
      return await seedIotFailureEvents();
    }),
});

export type IotCrudRouter = typeof iotCrudRouter;
