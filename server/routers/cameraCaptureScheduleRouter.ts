import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cameraCaptureSchedules, cameraCaptureLog, cameraConfigurations } from "../../drizzle/schema";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const scheduleInputSchema = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  description: z.string().optional(),
  cameraId: z.number(),
  isEnabled: z.boolean().default(true),
  captureIntervalSeconds: z.number().min(1).default(60),
  captureIntervalUnit: z.enum(["seconds", "minutes", "hours"]).default("minutes"),
  startTime: z.string().optional(), // HH:mm format
  endTime: z.string().optional(), // HH:mm format
  activeDays: z.array(z.number().min(0).max(6)).optional(), // 0-6, 0=Sunday
  productionLineId: z.number().optional(),
  workstationId: z.number().optional(),
  productId: z.number().optional(),
  autoAnalyze: z.boolean().default(true),
  analysisType: z.enum(["defect_detection", "quality_inspection", "measurement", "ocr", "custom"]).default("quality_inspection"),
  notifyOnNg: z.boolean().default(true),
  notifyOnWarning: z.boolean().default(false),
  notificationEmails: z.array(z.string().email()).optional(),
  webhookUrl: z.string().url().optional(),
});

export const cameraCaptureScheduleRouter = router({
  // List all schedules
  list: protectedProcedure
    .input(z.object({
      cameraId: z.number().optional(),
      productionLineId: z.number().optional(),
      isEnabled: z.boolean().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];

      if (input?.cameraId) {
        conditions.push(eq(cameraCaptureSchedules.cameraId, input.cameraId));
      }
      if (input?.productionLineId) {
        conditions.push(eq(cameraCaptureSchedules.productionLineId, input.productionLineId));
      }
      if (input?.isEnabled !== undefined) {
        conditions.push(eq(cameraCaptureSchedules.isEnabled, input.isEnabled));
      }

      let query = db.select().from(cameraCaptureSchedules);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const items = await query
        .orderBy(desc(cameraCaptureSchedules.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      // Get total count
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(cameraCaptureSchedules)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get schedule by ID
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [schedule] = await db.select()
        .from(cameraCaptureSchedules)
        .where(eq(cameraCaptureSchedules.id, input.id));
      
      if (!schedule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }

      // Get camera info
      const [camera] = await db.select()
        .from(cameraConfigurations)
        .where(eq(cameraConfigurations.id, schedule.cameraId));

      return { ...schedule, camera };
    }),

  // Create schedule
  create: protectedProcedure
    .input(scheduleInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();

      // Verify camera exists
      const [camera] = await db.select()
        .from(cameraConfigurations)
        .where(eq(cameraConfigurations.id, input.cameraId));

      if (!camera) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy camera" });
      }

      const [result] = await db.insert(cameraCaptureSchedules).values({
        name: input.name,
        description: input.description || null,
        cameraId: input.cameraId,
        isEnabled: input.isEnabled,
        captureIntervalSeconds: input.captureIntervalSeconds,
        captureIntervalUnit: input.captureIntervalUnit,
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        activeDays: input.activeDays || null,
        productionLineId: input.productionLineId || null,
        workstationId: input.workstationId || null,
        productId: input.productId || null,
        autoAnalyze: input.autoAnalyze,
        analysisType: input.analysisType,
        notifyOnNg: input.notifyOnNg,
        notifyOnWarning: input.notifyOnWarning,
        notificationEmails: input.notificationEmails || null,
        webhookUrl: input.webhookUrl || null,
        createdBy: ctx.user.id,
      });

      return { success: true, id: result.insertId };
    }),

  // Update schedule
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: scheduleInputSchema.partial(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      const [existing] = await db.select()
        .from(cameraCaptureSchedules)
        .where(eq(cameraCaptureSchedules.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }

      const updateData: Record<string, unknown> = {};

      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.description !== undefined) updateData.description = input.data.description;
      if (input.data.cameraId !== undefined) updateData.cameraId = input.data.cameraId;
      if (input.data.isEnabled !== undefined) updateData.isEnabled = input.data.isEnabled;
      if (input.data.captureIntervalSeconds !== undefined) updateData.captureIntervalSeconds = input.data.captureIntervalSeconds;
      if (input.data.captureIntervalUnit !== undefined) updateData.captureIntervalUnit = input.data.captureIntervalUnit;
      if (input.data.startTime !== undefined) updateData.startTime = input.data.startTime;
      if (input.data.endTime !== undefined) updateData.endTime = input.data.endTime;
      if (input.data.activeDays !== undefined) updateData.activeDays = input.data.activeDays;
      if (input.data.productionLineId !== undefined) updateData.productionLineId = input.data.productionLineId;
      if (input.data.workstationId !== undefined) updateData.workstationId = input.data.workstationId;
      if (input.data.productId !== undefined) updateData.productId = input.data.productId;
      if (input.data.autoAnalyze !== undefined) updateData.autoAnalyze = input.data.autoAnalyze;
      if (input.data.analysisType !== undefined) updateData.analysisType = input.data.analysisType;
      if (input.data.notifyOnNg !== undefined) updateData.notifyOnNg = input.data.notifyOnNg;
      if (input.data.notifyOnWarning !== undefined) updateData.notifyOnWarning = input.data.notifyOnWarning;
      if (input.data.notificationEmails !== undefined) updateData.notificationEmails = input.data.notificationEmails;
      if (input.data.webhookUrl !== undefined) updateData.webhookUrl = input.data.webhookUrl;

      await db.update(cameraCaptureSchedules)
        .set(updateData)
        .where(eq(cameraCaptureSchedules.id, input.id));

      return { success: true };
    }),

  // Delete schedule
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      await db.delete(cameraCaptureSchedules)
        .where(eq(cameraCaptureSchedules.id, input.id));

      return { success: true };
    }),

  // Toggle enable/disable
  toggle: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      const [existing] = await db.select()
        .from(cameraCaptureSchedules)
        .where(eq(cameraCaptureSchedules.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }

      await db.update(cameraCaptureSchedules)
        .set({ isEnabled: !existing.isEnabled })
        .where(eq(cameraCaptureSchedules.id, input.id));

      return { success: true, isEnabled: !existing.isEnabled };
    }),

  // Get capture logs
  getLogs: protectedProcedure
    .input(z.object({
      scheduleId: z.number().optional(),
      cameraId: z.number().optional(),
      status: z.enum(["success", "failed", "timeout", "error"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];

      if (input?.scheduleId) {
        conditions.push(eq(cameraCaptureLog.scheduleId, input.scheduleId));
      }
      if (input?.cameraId) {
        conditions.push(eq(cameraCaptureLog.cameraId, input.cameraId));
      }
      if (input?.status) {
        conditions.push(eq(cameraCaptureLog.status, input.status));
      }
      if (input?.startDate) {
        conditions.push(gte(cameraCaptureLog.createdAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(cameraCaptureLog.createdAt, input.endDate));
      }

      let query = db.select().from(cameraCaptureLog);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const items = await query
        .orderBy(desc(cameraCaptureLog.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      // Get total count
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(cameraCaptureLog)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get statistics
  getStats: protectedProcedure
    .input(z.object({
      scheduleId: z.number().optional(),
      cameraId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];

      if (input?.scheduleId) {
        conditions.push(eq(cameraCaptureLog.scheduleId, input.scheduleId));
      }
      if (input?.cameraId) {
        conditions.push(eq(cameraCaptureLog.cameraId, input.cameraId));
      }
      if (input?.startDate) {
        conditions.push(gte(cameraCaptureLog.createdAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(cameraCaptureLog.createdAt, input.endDate));
      }

      let query = db.select().from(cameraCaptureLog);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const logs = await query;

      return {
        total: logs.length,
        success: logs.filter(l => l.status === "success").length,
        failed: logs.filter(l => l.status === "failed").length,
        timeout: logs.filter(l => l.status === "timeout").length,
        error: logs.filter(l => l.status === "error").length,
        okCount: logs.filter(l => l.analysisResult === "ok").length,
        ngCount: logs.filter(l => l.analysisResult === "ng").length,
        warningCount: logs.filter(l => l.analysisResult === "warning").length,
        avgQualityScore: logs.length > 0
          ? logs.reduce((sum, l) => sum + (parseFloat(l.qualityScore || "0")), 0) / logs.length
          : 0,
      };
    }),

  // Get enabled schedules for background job
  getEnabledSchedules: protectedProcedure
    .query(async () => {
      const db = await getDb();
      
      const schedules = await db.select()
        .from(cameraCaptureSchedules)
        .where(eq(cameraCaptureSchedules.isEnabled, true));

      // Get camera info for each schedule
      const schedulesWithCameras = await Promise.all(
        schedules.map(async (schedule) => {
          const [camera] = await db.select()
            .from(cameraConfigurations)
            .where(eq(cameraConfigurations.id, schedule.cameraId));
          return { ...schedule, camera };
        })
      );

      return schedulesWithCameras;
    }),
});
