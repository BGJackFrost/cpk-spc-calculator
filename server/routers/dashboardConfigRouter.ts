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

  // List scheduled reports for current user (filter by createdBy)
  listScheduledReports: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    
    const reports = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.createdBy, ctx.user.id))
      .orderBy(desc(scheduledReports.createdAt));
    
    return reports;
  }),

  // Create scheduled report
  createScheduledReport: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      reportType: z.enum(["oee", "cpk", "oee_cpk_combined", "production_summary"]),
      frequency: z.enum(["daily", "weekly", "monthly"]),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      timeOfDay: z.string().default("08:00"),
      recipients: z.string().min(1),
      includeCharts: z.boolean().default(true),
      includeTrends: z.boolean().default(true),
      includeAlerts: z.boolean().default(true),
      format: z.enum(["html", "excel", "pdf"]).default("html"),
      machineIds: z.array(z.number()).optional(),
      productionLineIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const result = await db.insert(scheduledReports).values({
        name: input.name,
        reportType: input.reportType,
        frequency: input.frequency,
        dayOfWeek: input.dayOfWeek ?? 1,
        dayOfMonth: input.dayOfMonth ?? 1,
        timeOfDay: input.timeOfDay,
        recipients: JSON.stringify(input.recipients.split(',').map(e => e.trim())),
        includeCharts: input.includeCharts ? 1 : 0,
        includeTrends: input.includeTrends ? 1 : 0,
        includeAlerts: input.includeAlerts ? 1 : 0,
        format: input.format,
        machineIds: input.machineIds ? JSON.stringify(input.machineIds) : null,
        productionLineIds: input.productionLineIds ? JSON.stringify(input.productionLineIds) : null,
        createdBy: ctx.user.id,
      });
      
      return { id: result[0].insertId };
    }),

  // Update scheduled report
  updateScheduledReport: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      timeOfDay: z.string().optional(),
      recipients: z.string().optional(),
      includeCharts: z.boolean().optional(),
      includeTrends: z.boolean().optional(),
      includeAlerts: z.boolean().optional(),
      format: z.enum(["html", "excel", "pdf"]).optional(),
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
      if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
      if (updates.dayOfWeek !== undefined) updateData.dayOfWeek = updates.dayOfWeek;
      if (updates.dayOfMonth !== undefined) updateData.dayOfMonth = updates.dayOfMonth;
      if (updates.timeOfDay !== undefined) updateData.timeOfDay = updates.timeOfDay;
      if (updates.recipients !== undefined) updateData.recipients = JSON.stringify(updates.recipients.split(',').map(e => e.trim()));
      if (updates.includeCharts !== undefined) updateData.includeCharts = updates.includeCharts ? 1 : 0;
      if (updates.includeTrends !== undefined) updateData.includeTrends = updates.includeTrends ? 1 : 0;
      if (updates.includeAlerts !== undefined) updateData.includeAlerts = updates.includeAlerts ? 1 : 0;
      if (updates.format !== undefined) updateData.format = updates.format;
      if (updates.machineIds !== undefined) updateData.machineIds = JSON.stringify(updates.machineIds);
      if (updates.productionLineIds !== undefined) updateData.productionLineIds = JSON.stringify(updates.productionLineIds);
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive ? 1 : 0;
      
      await db.update(scheduledReports)
        .set(updateData)
        .where(and(eq(scheduledReports.id, id), eq(scheduledReports.createdBy, ctx.user.id)));
      
      return { success: true };
    }),

  // Delete scheduled report
  deleteScheduledReport: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db.delete(scheduledReports)
        .where(and(eq(scheduledReports.id, input.id), eq(scheduledReports.createdBy, ctx.user.id)));
      
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
        .where(and(eq(scheduledReports.id, input.reportId), eq(scheduledReports.createdBy, ctx.user.id)))
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
