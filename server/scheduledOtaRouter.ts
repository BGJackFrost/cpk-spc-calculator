import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { scheduledOtaService } from "./scheduledOtaService";

export const scheduledOtaRouter = router({
  // Get all schedules
  getSchedules: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    }).optional())
    .query(async ({ input }) => {
      return scheduledOtaService.getSchedules(input || {});
    }),
  
  // Get schedule by ID
  getScheduleById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return scheduledOtaService.getScheduleById(input.id);
    }),
  
  // Create schedule
  createSchedule: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      firmwarePackageId: z.number(),
      targetDeviceIds: z.array(z.number()),
      targetGroupIds: z.array(z.number()).optional(),
      scheduleType: z.enum(['once', 'daily', 'weekly', 'monthly']),
      scheduledTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      scheduledDate: z.string().optional(),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      offPeakOnly: z.boolean().default(true),
      offPeakStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('22:00'),
      offPeakEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).default('06:00'),
      timezone: z.string().default('Asia/Ho_Chi_Minh'),
      maxConcurrentDevices: z.number().min(1).max(100).default(10),
      retryOnFailure: z.boolean().default(true),
      maxRetries: z.number().min(0).max(10).default(3),
      notifyBeforeMinutes: z.number().min(0).max(1440).default(30),
      notifyChannels: z.array(z.enum(['email', 'sms', 'webhook'])).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return scheduledOtaService.createSchedule({
        ...input,
        targetDeviceIds: input.targetDeviceIds,
        targetGroupIds: input.targetGroupIds || null,
        daysOfWeek: input.daysOfWeek || null,
        notifyChannels: input.notifyChannels || null,
        offPeakOnly: input.offPeakOnly ? 1 : 0,
        retryOnFailure: input.retryOnFailure ? 1 : 0,
        createdBy: ctx.user?.id,
      });
    }),
  
  // Update schedule
  updateSchedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      firmwarePackageId: z.number().optional(),
      targetDeviceIds: z.array(z.number()).optional(),
      targetGroupIds: z.array(z.number()).optional(),
      scheduleType: z.enum(['once', 'daily', 'weekly', 'monthly']).optional(),
      scheduledTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      scheduledDate: z.string().optional(),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      offPeakOnly: z.boolean().optional(),
      offPeakStartTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      offPeakEndTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
      maxConcurrentDevices: z.number().min(1).max(100).optional(),
      retryOnFailure: z.boolean().optional(),
      maxRetries: z.number().min(0).max(10).optional(),
      notifyBeforeMinutes: z.number().min(0).max(1440).optional(),
      notifyChannels: z.array(z.enum(['email', 'sms', 'webhook'])).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      
      if (data.offPeakOnly !== undefined) {
        updateData.offPeakOnly = data.offPeakOnly ? 1 : 0;
      }
      if (data.retryOnFailure !== undefined) {
        updateData.retryOnFailure = data.retryOnFailure ? 1 : 0;
      }
      
      return scheduledOtaService.updateSchedule(id, updateData);
    }),
  
  // Delete schedule
  deleteSchedule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return scheduledOtaService.deleteSchedule(input.id);
    }),
  
  // Pause schedule
  pauseSchedule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return scheduledOtaService.toggleScheduleStatus(input.id, 'paused');
    }),
  
  // Resume schedule
  resumeSchedule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return scheduledOtaService.toggleScheduleStatus(input.id, 'active');
    }),
  
  // Get schedule runs
  getScheduleRuns: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      return scheduledOtaService.getScheduleRuns(input.scheduleId, input.limit);
    }),
  
  // Execute schedule manually
  executeScheduleNow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return scheduledOtaService.executeSchedule(input.id);
    }),
  
  // Get recommended off-peak hours
  getRecommendedOffPeakHours: protectedProcedure
    .query(async () => {
      return scheduledOtaService.getRecommendedOffPeakHours();
    }),
  
  // Validate off-peak hours
  validateOffPeakHours: publicProcedure
    .input(z.object({
      startTime: z.string(),
      endTime: z.string(),
    }))
    .query(async ({ input }) => {
      return {
        valid: scheduledOtaService.validateOffPeakHours(input.startTime, input.endTime),
      };
    }),
});

export default scheduledOtaRouter;
