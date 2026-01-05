/**
 * IoT CRUD Router
 * Router cho các thao tác CRUD với IoT devices, alarms, thresholds
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import * as iotDbService from "../services/iotDbService";

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
});

export type IotCrudRouter = typeof iotCrudRouter;
