/**
 * IoT Device Management Router
 * 
 * API endpoints for enhanced device management features:
 * - Device Groups
 * - Device Templates
 * - Health Score
 * - Maintenance Scheduling
 * - Firmware Management
 * - Commissioning Workflow
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import * as deviceManagement from '../services/iotDeviceManagementService';

export const iotDeviceManagementRouter = router({
  // ============ Device Groups ============
  
  getGroups: publicProcedure.query(async () => {
    return deviceManagement.getDeviceGroups();
  }),
  
  createGroup: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      parentGroupId: z.number().optional(),
      location: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return deviceManagement.createDeviceGroup({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),
  
  updateGroup: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      parentGroupId: z.number().optional(),
      location: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return deviceManagement.updateDeviceGroup(id, data);
    }),
  
  deleteGroup: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return deviceManagement.deleteDeviceGroup(input.id);
    }),
  
  // ============ Device Templates ============
  
  getTemplates: publicProcedure.query(async () => {
    return deviceManagement.getDeviceTemplates();
  }),
  
  createTemplate: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      deviceType: z.string(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      protocol: z.string(),
      defaultConfig: z.record(z.any()).optional(),
      metricsConfig: z.record(z.any()).optional(),
      alertThresholds: z.record(z.any()).optional(),
      tags: z.array(z.string()).optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return deviceManagement.createDeviceTemplate({
        ...input,
        createdBy: ctx.user?.id,
      });
    }),
  
  updateTemplate: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      deviceType: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      protocol: z.string().optional(),
      defaultConfig: z.record(z.any()).optional(),
      metricsConfig: z.record(z.any()).optional(),
      alertThresholds: z.record(z.any()).optional(),
      tags: z.array(z.string()).optional(),
      icon: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return deviceManagement.updateDeviceTemplate(id, data);
    }),
  
  // ============ Health Score ============
  
  calculateHealthScore: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      return deviceManagement.calculateDeviceHealthScore(input.deviceId);
    }),
  
  getHealthHistory: publicProcedure
    .input(z.object({
      deviceId: z.number(),
      days: z.number().default(30),
    }))
    .query(async ({ input }) => {
      return deviceManagement.getDeviceHealthHistory(input.deviceId, input.days);
    }),
  
  // ============ Maintenance Scheduling ============
  
  getMaintenanceSchedules: publicProcedure
    .input(z.object({
      deviceId: z.number().optional(),
      status: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return deviceManagement.getMaintenanceSchedules({
        deviceId: input?.deviceId,
        status: input?.status,
        startDate: input?.startDate ? new Date(input.startDate) : undefined,
        endDate: input?.endDate ? new Date(input.endDate) : undefined,
      });
    }),
  
  createMaintenanceSchedule: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      maintenanceType: z.enum(['preventive', 'corrective', 'predictive', 'calibration', 'inspection']),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
      scheduledDate: z.string(),
      estimatedDuration: z.number().optional(),
      assignedTo: z.number().optional(),
      recurrenceRule: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return deviceManagement.createMaintenanceSchedule({
        ...input,
        scheduledDate: new Date(input.scheduledDate),
        createdBy: ctx.user?.id,
      });
    }),
  
  updateMaintenanceSchedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      maintenanceType: z.string().optional(),
      priority: z.string().optional(),
      scheduledDate: z.string().optional(),
      estimatedDuration: z.number().optional(),
      assignedTo: z.number().optional(),
      status: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, scheduledDate, ...data } = input;
      return deviceManagement.updateMaintenanceSchedule(id, {
        ...data,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
      });
    }),
  
  completeMaintenanceSchedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
      partsUsed: z.array(z.any()).optional(),
      cost: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return deviceManagement.completeMaintenanceSchedule(input.id, {
        completedBy: ctx.user?.id || 0,
        notes: input.notes,
        partsUsed: input.partsUsed,
        cost: input.cost,
      });
    }),
  
  // ============ Firmware Management ============
  
  getFirmwareHistory: publicProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      return deviceManagement.getDeviceFirmwareHistory(input.deviceId);
    }),
  
  addFirmwareVersion: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      version: z.string().min(1),
      releaseDate: z.string().optional(),
      changelog: z.string().optional(),
      fileUrl: z.string().optional(),
      fileSize: z.number().optional(),
      checksum: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return deviceManagement.addFirmwareVersion({
        ...input,
        releaseDate: input.releaseDate ? new Date(input.releaseDate) : undefined,
      });
    }),
  
  installFirmware: protectedProcedure
    .input(z.object({ firmwareId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return deviceManagement.installFirmware(input.firmwareId, ctx.user?.id || 0);
    }),
  
  // ============ Commissioning Workflow ============
  
  initializeCommissioning: protectedProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ input }) => {
      return deviceManagement.initializeCommissioning(input.deviceId);
    }),
  
  updateCommissioningStep: protectedProcedure
    .input(z.object({
      stepId: z.number(),
      status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
      verificationData: z.any().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return deviceManagement.updateCommissioningStep(input.stepId, {
        status: input.status,
        completedBy: ctx.user?.id,
        verificationData: input.verificationData,
        notes: input.notes,
      });
    }),
  
  getCommissioningProgress: publicProcedure
    .input(z.object({ deviceId: z.number() }))
    .query(async ({ input }) => {
      return deviceManagement.getCommissioningProgress(input.deviceId);
    }),
  
  // ============ Dashboard Stats ============
  
  getManagementStats: publicProcedure.query(async () => {
    return deviceManagement.getDeviceManagementStats();
  }),
});

export default iotDeviceManagementRouter;
