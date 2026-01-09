import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { autoCaptureSchedules, autoCaptureHistory } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Auto-capture schedule input schema
const autoCaptureScheduleInput = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  description: z.string().optional(),
  productionLineId: z.number().optional(),
  workstationId: z.number().optional(),
  productCode: z.string().optional(),
  cameraId: z.string().optional(),
  cameraUrl: z.string().optional(),
  cameraType: z.enum(["ip_camera", "usb_camera", "rtsp", "http_snapshot"]).default("ip_camera"),
  intervalSeconds: z.number().min(10).max(86400).default(60),
  scheduleType: z.enum(["continuous", "time_range", "cron"]).default("continuous"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().default("Asia/Ho_Chi_Minh"),
  enableAiAnalysis: z.boolean().default(true),
  analysisType: z.enum(["quality_check", "defect_detection", "measurement", "all"]).default("quality_check"),
  qualityThreshold: z.number().min(0).max(100).default(80),
  alertOnDefect: z.boolean().default(true),
  alertSeverityThreshold: z.enum(["minor", "major", "critical"]).default("major"),
  webhookConfigIds: z.array(z.number()).optional(),
  emailRecipients: z.array(z.string().email()).optional(),
});

export const autoCaptureRouter = router({
  // Get all auto-capture schedules for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const schedules = await db
      .select()
      .from(autoCaptureSchedules)
      .where(eq(autoCaptureSchedules.userId, ctx.user.id))
      .orderBy(desc(autoCaptureSchedules.createdAt));
    return schedules;
  }),

  // Get all schedules (admin only)
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ admin mới có quyền xem tất cả lịch" });
    }
    const db = await getDb();
    const schedules = await db
      .select()
      .from(autoCaptureSchedules)
      .orderBy(desc(autoCaptureSchedules.createdAt));
    return schedules;
  }),

  // Get schedule by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const [schedule] = await db
        .select()
        .from(autoCaptureSchedules)
        .where(eq(autoCaptureSchedules.id, input.id));
      
      if (!schedule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }
      
      // Check permission
      if (schedule.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
      }
      
      return schedule;
    }),

  // Create new auto-capture schedule
  create: protectedProcedure
    .input(autoCaptureScheduleInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [result] = await db.insert(autoCaptureSchedules).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
        productionLineId: input.productionLineId || null,
        workstationId: input.workstationId || null,
        productCode: input.productCode || null,
        cameraId: input.cameraId || null,
        cameraUrl: input.cameraUrl || null,
        cameraType: input.cameraType,
        intervalSeconds: input.intervalSeconds,
        scheduleType: input.scheduleType,
        startTime: input.startTime || null,
        endTime: input.endTime || null,
        daysOfWeek: input.daysOfWeek ? JSON.stringify(input.daysOfWeek) : null,
        cronExpression: input.cronExpression || null,
        timezone: input.timezone,
        enableAiAnalysis: input.enableAiAnalysis ? 1 : 0,
        analysisType: input.analysisType,
        qualityThreshold: String(input.qualityThreshold),
        alertOnDefect: input.alertOnDefect ? 1 : 0,
        alertSeverityThreshold: input.alertSeverityThreshold,
        webhookConfigIds: input.webhookConfigIds ? JSON.stringify(input.webhookConfigIds) : null,
        emailRecipients: input.emailRecipients ? JSON.stringify(input.emailRecipients) : null,
        status: "paused",
      });
      
      return { success: true, id: result.insertId };
    }),

  // Update auto-capture schedule
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: autoCaptureScheduleInput.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Check ownership
      const [existing] = await db
        .select()
        .from(autoCaptureSchedules)
        .where(eq(autoCaptureSchedules.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền chỉnh sửa" });
      }
      
      const updateData: Record<string, unknown> = {};
      
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.description !== undefined) updateData.description = input.data.description;
      if (input.data.productionLineId !== undefined) updateData.productionLineId = input.data.productionLineId;
      if (input.data.workstationId !== undefined) updateData.workstationId = input.data.workstationId;
      if (input.data.productCode !== undefined) updateData.productCode = input.data.productCode;
      if (input.data.cameraId !== undefined) updateData.cameraId = input.data.cameraId;
      if (input.data.cameraUrl !== undefined) updateData.cameraUrl = input.data.cameraUrl;
      if (input.data.cameraType !== undefined) updateData.cameraType = input.data.cameraType;
      if (input.data.intervalSeconds !== undefined) updateData.intervalSeconds = input.data.intervalSeconds;
      if (input.data.scheduleType !== undefined) updateData.scheduleType = input.data.scheduleType;
      if (input.data.startTime !== undefined) updateData.startTime = input.data.startTime;
      if (input.data.endTime !== undefined) updateData.endTime = input.data.endTime;
      if (input.data.daysOfWeek !== undefined) updateData.daysOfWeek = JSON.stringify(input.data.daysOfWeek);
      if (input.data.cronExpression !== undefined) updateData.cronExpression = input.data.cronExpression;
      if (input.data.timezone !== undefined) updateData.timezone = input.data.timezone;
      if (input.data.enableAiAnalysis !== undefined) updateData.enableAiAnalysis = input.data.enableAiAnalysis ? 1 : 0;
      if (input.data.analysisType !== undefined) updateData.analysisType = input.data.analysisType;
      if (input.data.qualityThreshold !== undefined) updateData.qualityThreshold = String(input.data.qualityThreshold);
      if (input.data.alertOnDefect !== undefined) updateData.alertOnDefect = input.data.alertOnDefect ? 1 : 0;
      if (input.data.alertSeverityThreshold !== undefined) updateData.alertSeverityThreshold = input.data.alertSeverityThreshold;
      if (input.data.webhookConfigIds !== undefined) updateData.webhookConfigIds = JSON.stringify(input.data.webhookConfigIds);
      if (input.data.emailRecipients !== undefined) updateData.emailRecipients = JSON.stringify(input.data.emailRecipients);
      
      await db
        .update(autoCaptureSchedules)
        .set(updateData)
        .where(eq(autoCaptureSchedules.id, input.id));
      
      return { success: true };
    }),

  // Delete auto-capture schedule
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Check ownership
      const [existing] = await db
        .select()
        .from(autoCaptureSchedules)
        .where(eq(autoCaptureSchedules.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền xóa" });
      }
      
      // Delete history first
      await db.delete(autoCaptureHistory).where(eq(autoCaptureHistory.scheduleId, input.id));
      
      // Delete schedule
      await db.delete(autoCaptureSchedules).where(eq(autoCaptureSchedules.id, input.id));
      
      return { success: true };
    }),

  // Start/Stop/Pause schedule
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["active", "paused", "stopped"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Check ownership
      const [existing] = await db
        .select()
        .from(autoCaptureSchedules)
        .where(eq(autoCaptureSchedules.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền thay đổi trạng thái" });
      }
      
      await db
        .update(autoCaptureSchedules)
        .set({ status: input.status })
        .where(eq(autoCaptureSchedules.id, input.id));
      
      return { success: true, status: input.status };
    }),

  // Get capture history for a schedule
  getHistory: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Check ownership of schedule
      const [schedule] = await db
        .select()
        .from(autoCaptureSchedules)
        .where(eq(autoCaptureSchedules.id, input.scheduleId));
      
      if (!schedule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }
      
      if (schedule.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
      }
      
      const history = await db
        .select()
        .from(autoCaptureHistory)
        .where(eq(autoCaptureHistory.scheduleId, input.scheduleId))
        .orderBy(desc(autoCaptureHistory.capturedAt))
        .limit(input.limit)
        .offset(input.offset);
      
      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(autoCaptureHistory)
        .where(eq(autoCaptureHistory.scheduleId, input.scheduleId));
      
      return {
        items: history,
        total: countResult?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // Get statistics for a schedule
  getStats: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Check ownership
      const [schedule] = await db
        .select()
        .from(autoCaptureSchedules)
        .where(eq(autoCaptureSchedules.id, input.scheduleId));
      
      if (!schedule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }
      
      if (schedule.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
      }
      
      // Get statistics
      const [stats] = await db
        .select({
          totalCaptures: sql<number>`count(*)`,
          completedCaptures: sql<number>`sum(case when analysis_status = 'completed' then 1 else 0 end)`,
          failedCaptures: sql<number>`sum(case when analysis_status = 'failed' then 1 else 0 end)`,
          totalDefects: sql<number>`sum(defects_found)`,
          avgQualityScore: sql<number>`avg(quality_score)`,
          alertsSent: sql<number>`sum(alert_sent)`,
        })
        .from(autoCaptureHistory)
        .where(eq(autoCaptureHistory.scheduleId, input.scheduleId));
      
      // Get severity distribution
      const severityDist = await db
        .select({
          severity: autoCaptureHistory.severity,
          count: sql<number>`count(*)`,
        })
        .from(autoCaptureHistory)
        .where(eq(autoCaptureHistory.scheduleId, input.scheduleId))
        .groupBy(autoCaptureHistory.severity);
      
      return {
        schedule,
        stats: {
          totalCaptures: stats?.totalCaptures || 0,
          completedCaptures: stats?.completedCaptures || 0,
          failedCaptures: stats?.failedCaptures || 0,
          totalDefects: stats?.totalDefects || 0,
          avgQualityScore: stats?.avgQualityScore || 0,
          alertsSent: stats?.alertsSent || 0,
        },
        severityDistribution: severityDist,
      };
    }),

  // Manual trigger capture (for testing)
  triggerCapture: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Check ownership
      const [schedule] = await db
        .select()
        .from(autoCaptureSchedules)
        .where(eq(autoCaptureSchedules.id, input.scheduleId));
      
      if (!schedule) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy lịch chụp" });
      }
      
      if (schedule.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền thực hiện" });
      }
      
      // Create a pending capture history entry
      const [result] = await db.insert(autoCaptureHistory).values({
        scheduleId: input.scheduleId,
        analysisStatus: "pending",
      });
      
      // Update last capture time
      await db
        .update(autoCaptureSchedules)
        .set({ 
          lastCaptureAt: sql`NOW()`,
          totalCaptures: sql`total_captures + 1`,
        })
        .where(eq(autoCaptureSchedules.id, input.scheduleId));
      
      return { 
        success: true, 
        historyId: result.insertId,
        message: "Đã kích hoạt chụp ảnh. Kết quả sẽ được cập nhật sau khi phân tích hoàn tất.",
      };
    }),
});
