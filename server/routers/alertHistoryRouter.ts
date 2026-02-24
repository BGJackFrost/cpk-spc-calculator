/**
 * Alert History Router - API endpoints cho lịch sử cảnh báo Yield/Defect
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { yieldDefectAlertHistory } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql, count, inArray } from "drizzle-orm";

export const alertHistoryRouter = router({
  // Lấy danh sách alerts với filter
  list: protectedProcedure
    .input(z.object({
      timeRange: z.enum(["7d", "14d", "30d", "90d", "all"]).default("30d"),
      severity: z.enum(["all", "info", "warning", "critical"]).default("all"),
      status: z.enum(["all", "active", "acknowledged", "resolved", "dismissed"]).default("all"),
      alertType: z.enum(["all", "yield_low", "defect_high", "spc_violation"]).default("all"),
      page: z.number().min(1).default(1),
      pageSize: z.number().min(10).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: any[] = [];

      if (input.timeRange !== "all") {
        const days = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 }[input.timeRange];
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        conditions.push(gte(yieldDefectAlertHistory.createdAt, cutoff));
      }

      if (input.severity !== "all") conditions.push(eq(yieldDefectAlertHistory.severity, input.severity));
      if (input.status !== "all") conditions.push(eq(yieldDefectAlertHistory.status, input.status));
      if (input.alertType !== "all") conditions.push(eq(yieldDefectAlertHistory.alertType, input.alertType));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [alerts, [totalResult]] = await Promise.all([
        db.select().from(yieldDefectAlertHistory)
          .where(where)
          .orderBy(desc(yieldDefectAlertHistory.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        db.select({ count: count() }).from(yieldDefectAlertHistory).where(where),
      ]);

      return {
        alerts,
        total: totalResult?.count || 0,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil((totalResult?.count || 0) / input.pageSize),
      };
    }),

  // Thống kê tổng quan
  stats: protectedProcedure
    .input(z.object({
      timeRange: z.enum(["7d", "14d", "30d", "90d", "all"]).default("30d"),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions: any[] = [];

      if (input.timeRange !== "all") {
        const days = { "7d": 7, "14d": 14, "30d": 30, "90d": 90 }[input.timeRange];
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        conditions.push(gte(yieldDefectAlertHistory.createdAt, cutoff));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [bySeverity, byStatus, byType, totalResult] = await Promise.all([
        db.select({
          severity: yieldDefectAlertHistory.severity,
          count: count(),
        }).from(yieldDefectAlertHistory).where(where).groupBy(yieldDefectAlertHistory.severity),
        db.select({
          status: yieldDefectAlertHistory.status,
          count: count(),
        }).from(yieldDefectAlertHistory).where(where).groupBy(yieldDefectAlertHistory.status),
        db.select({
          alertType: yieldDefectAlertHistory.alertType,
          count: count(),
        }).from(yieldDefectAlertHistory).where(where).groupBy(yieldDefectAlertHistory.alertType),
        db.select({ count: count() }).from(yieldDefectAlertHistory).where(where),
      ]);

      return {
        total: totalResult[0]?.count || 0,
        bySeverity: bySeverity.reduce((acc, r) => ({ ...acc, [r.severity]: r.count }), {} as Record<string, number>),
        byStatus: byStatus.reduce((acc, r) => ({ ...acc, [r.status]: r.count }), {} as Record<string, number>),
        byType: byType.reduce((acc, r) => ({ ...acc, [r.alertType]: r.count }), {} as Record<string, number>),
      };
    }),

  // Cập nhật trạng thái alert
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["acknowledged", "resolved", "dismissed"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const now = Date.now();
      const updateData: any = {
        status: input.status,
        updatedAt: now,
      };

      if (input.status === "acknowledged") {
        updateData.acknowledgedBy = ctx.user.name || ctx.user.openId;
        updateData.acknowledgedAt = now;
      } else if (input.status === "resolved") {
        updateData.resolvedBy = ctx.user.name || ctx.user.openId;
        updateData.resolvedAt = now;
        if (input.note) updateData.resolvedNote = input.note;
      }

      await db.update(yieldDefectAlertHistory)
        .set(updateData)
        .where(eq(yieldDefectAlertHistory.id, input.id));

      return { success: true };
    }),

  // Bulk update status
  bulkUpdateStatus: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1),
      status: z.enum(["acknowledged", "resolved", "dismissed"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const now = Date.now();
      const updateData: any = {
        status: input.status,
        updatedAt: now,
      };

      if (input.status === "acknowledged") {
        updateData.acknowledgedBy = ctx.user.name || ctx.user.openId;
        updateData.acknowledgedAt = now;
      } else if (input.status === "resolved") {
        updateData.resolvedBy = ctx.user.name || ctx.user.openId;
        updateData.resolvedAt = now;
        if (input.note) updateData.resolvedNote = input.note;
      }

      await db.update(yieldDefectAlertHistory)
        .set(updateData)
        .where(inArray(yieldDefectAlertHistory.id, input.ids));

      return { success: true, count: input.ids.length };
    }),

  // Lấy chi tiết một alert
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [alert] = await db.select().from(yieldDefectAlertHistory)
        .where(eq(yieldDefectAlertHistory.id, input.id));
      return alert || null;
    }),
});
