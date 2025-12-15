import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { mmsDashboardWidgets, scheduledReports, scheduledReportLogs } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

// MMS Dashboard Config Router - cho Plant KPI Dashboard
export const mmsDashboardConfigRouter = router({
  // Get user's dashboard widget configuration
  getWidgets: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    const widgets = await db
      .select()
      .from(mmsDashboardWidgets)
      .where(eq(mmsDashboardWidgets.userId, ctx.user.id))
      .orderBy(mmsDashboardWidgets.position);
    
    return widgets;
  }),

  // Save user's dashboard widget configuration
  saveWidgets: protectedProcedure
    .input(z.array(z.object({
      widgetType: z.string(),
      title: z.string().optional(),
      config: z.any().optional(),
      position: z.number(),
      width: z.number().min(1).max(4),
      height: z.number().min(1).max(3),
      isVisible: z.boolean(),
    })))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Delete existing widgets for this user
      await db.delete(mmsDashboardWidgets).where(eq(mmsDashboardWidgets.userId, ctx.user.id));
      
      // Insert new widgets
      if (input.length > 0) {
        await db.insert(mmsDashboardWidgets).values(
          input.map((widget, index) => ({
            userId: ctx.user.id,
            widgetType: widget.widgetType,
            title: widget.title || null,
            config: widget.config || null,
            position: widget.position ?? index,
            width: widget.width,
            height: widget.height,
            isVisible: widget.isVisible ? 1 : 0,
          }))
        );
      }
      
      return { success: true };
    }),

  // Update single widget
  updateWidget: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      config: z.any().optional(),
      position: z.number().optional(),
      width: z.number().min(1).max(4).optional(),
      height: z.number().min(1).max(3).optional(),
      isVisible: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.config !== undefined) updateData.config = updates.config;
      if (updates.position !== undefined) updateData.position = updates.position;
      if (updates.width !== undefined) updateData.width = updates.width;
      if (updates.height !== undefined) updateData.height = updates.height;
      if (updates.isVisible !== undefined) updateData.isVisible = updates.isVisible ? 1 : 0;
      
      await db.update(mmsDashboardWidgets)
        .set(updateData)
        .where(and(eq(mmsDashboardWidgets.id, id), eq(mmsDashboardWidgets.userId, ctx.user.id)));
      
      return { success: true };
    }),

  // Reset widgets to default
  resetWidgets: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    await db.delete(mmsDashboardWidgets).where(eq(mmsDashboardWidgets.userId, ctx.user.id));
    
    return { success: true };
  }),

  // ============ Scheduled Reports ============

  // List scheduled reports for current user
  listScheduledReports: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    const reports = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.userId, ctx.user.id))
      .orderBy(desc(scheduledReports.createdAt));
    
    return reports;
  }),

  // Create scheduled report
  createScheduledReport: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      reportType: z.enum(["oee_daily", "oee_weekly", "oee_monthly", "maintenance_daily", "maintenance_weekly", "maintenance_monthly", "combined_weekly", "combined_monthly"]),
      schedule: z.enum(["daily", "weekly", "monthly"]),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23),
      recipients: z.string().min(1),
      includeCharts: z.boolean().default(true),
      includeTables: z.boolean().default(true),
      includeRecommendations: z.boolean().default(true),
      machineIds: z.array(z.number()).optional(),
      productionLineIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Calculate next scheduled time
      const nextScheduledAt = calculateNextScheduledTime(input.schedule, input.dayOfWeek, input.dayOfMonth, input.hour);
      
      const result = await db.insert(scheduledReports).values({
        userId: ctx.user.id,
        name: input.name,
        reportType: input.reportType,
        schedule: input.schedule,
        dayOfWeek: input.dayOfWeek ?? 1,
        dayOfMonth: input.dayOfMonth ?? 1,
        hour: input.hour,
        recipients: input.recipients,
        includeCharts: input.includeCharts ? 1 : 0,
        includeTables: input.includeTables ? 1 : 0,
        includeRecommendations: input.includeRecommendations ? 1 : 0,
        machineIds: input.machineIds || null,
        productionLineIds: input.productionLineIds || null,
        nextScheduledAt,
      });
      
      return { id: result[0].insertId };
    }),

  // Update scheduled report
  updateScheduledReport: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      schedule: z.enum(["daily", "weekly", "monthly"]).optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23).optional(),
      recipients: z.string().optional(),
      includeCharts: z.boolean().optional(),
      includeTables: z.boolean().optional(),
      includeRecommendations: z.boolean().optional(),
      machineIds: z.array(z.number()).optional(),
      productionLineIds: z.array(z.number()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const { id, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.schedule !== undefined) updateData.schedule = updates.schedule;
      if (updates.dayOfWeek !== undefined) updateData.dayOfWeek = updates.dayOfWeek;
      if (updates.dayOfMonth !== undefined) updateData.dayOfMonth = updates.dayOfMonth;
      if (updates.hour !== undefined) updateData.hour = updates.hour;
      if (updates.recipients !== undefined) updateData.recipients = updates.recipients;
      if (updates.includeCharts !== undefined) updateData.includeCharts = updates.includeCharts ? 1 : 0;
      if (updates.includeTables !== undefined) updateData.includeTables = updates.includeTables ? 1 : 0;
      if (updates.includeRecommendations !== undefined) updateData.includeRecommendations = updates.includeRecommendations ? 1 : 0;
      if (updates.machineIds !== undefined) updateData.machineIds = updates.machineIds;
      if (updates.productionLineIds !== undefined) updateData.productionLineIds = updates.productionLineIds;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive ? 1 : 0;
      
      // Recalculate next scheduled time if schedule changed
      if (updates.schedule || updates.dayOfWeek !== undefined || updates.dayOfMonth !== undefined || updates.hour !== undefined) {
        const report = await db.select().from(scheduledReports).where(eq(scheduledReports.id, id)).limit(1);
        if (report.length > 0) {
          const schedule = updates.schedule || report[0].schedule;
          const dayOfWeek = updates.dayOfWeek ?? report[0].dayOfWeek;
          const dayOfMonth = updates.dayOfMonth ?? report[0].dayOfMonth;
          const hour = updates.hour ?? report[0].hour;
          updateData.nextScheduledAt = calculateNextScheduledTime(schedule, dayOfWeek ?? 1, dayOfMonth ?? 1, hour);
        }
      }
      
      await db.update(scheduledReports)
        .set(updateData)
        .where(and(eq(scheduledReports.id, id), eq(scheduledReports.userId, ctx.user.id)));
      
      return { success: true };
    }),

  // Delete scheduled report
  deleteScheduledReport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(scheduledReports)
        .where(and(eq(scheduledReports.id, input.id), eq(scheduledReports.userId, ctx.user.id)));
      
      return { success: true };
    }),

  // Get report logs
  getReportLogs: protectedProcedure
    .input(z.object({ reportId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      
      // Verify ownership
      const report = await db.select().from(scheduledReports)
        .where(and(eq(scheduledReports.id, input.reportId), eq(scheduledReports.userId, ctx.user.id)))
        .limit(1);
      
      if (report.length === 0) return [];
      
      const logs = await db
        .select()
        .from(scheduledReportLogs)
        .where(eq(scheduledReportLogs.reportId, input.reportId))
        .orderBy(desc(scheduledReportLogs.sentAt))
        .limit(50);
      
      return logs;
    }),
});

// Helper function to calculate next scheduled time
function calculateNextScheduledTime(
  schedule: "daily" | "weekly" | "monthly",
  dayOfWeek: number | null | undefined,
  dayOfMonth: number | null | undefined,
  hour: number
): Date {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, 0, 0, 0);
  
  switch (schedule) {
    case "daily":
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;
    case "weekly":
      const targetDay = dayOfWeek ?? 1;
      const currentDay = next.getDay();
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
        daysUntilTarget += 7;
      }
      next.setDate(next.getDate() + daysUntilTarget);
      break;
    case "monthly":
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
  }
  
  return next;
}
