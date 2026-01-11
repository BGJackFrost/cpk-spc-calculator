import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getWidgetTemplates,
  getWidgetTemplateByKey,
  getUserDashboardWidgets,
  saveUserDashboardWidget,
  updateUserDashboardWidget,
  deleteUserDashboardWidget,
  initializeDefaultWidgets,
} from "../db";

export const dashboardCustomizationRouter = router({
  // Get all available widget templates
  getWidgetTemplates: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      const templates = await getWidgetTemplates(input);
      return templates.map(t => ({
        ...t,
        defaultConfig: t.default_config ? JSON.parse(t.default_config) : null,
      }));
    }),

  // Get widget template by key
  getWidgetTemplateByKey: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const template = await getWidgetTemplateByKey(input.key);
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Widget template not found" });
      }
      return {
        ...template,
        defaultConfig: template.default_config ? JSON.parse(template.default_config) : null,
      };
    }),

  // Get user's dashboard widgets
  getUserWidgets: protectedProcedure
    .input(z.object({
      dashboardId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      // Initialize default widgets if user has none
      await initializeDefaultWidgets(ctx.user.id);
      
      const widgets = await getUserDashboardWidgets(ctx.user.id, input?.dashboardId);
      return widgets.map(w => ({
        ...w,
        config: w.config ? (typeof w.config === 'string' ? JSON.parse(w.config) : w.config) : null,
        defaultConfig: w.default_config ? (typeof w.default_config === 'string' ? JSON.parse(w.default_config) : w.default_config) : null,
      }));
    }),

  // Add widget to dashboard
  addWidget: protectedProcedure
    .input(z.object({
      widgetTemplateId: z.number(),
      gridX: z.number().min(0).max(11),
      gridY: z.number().min(0),
      gridWidth: z.number().min(1).max(12),
      gridHeight: z.number().min(1).max(6),
      config: z.record(z.any()).optional(),
      dashboardId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      const widgetId = await saveUserDashboardWidget({
        userId: ctx.user.id,
        widgetTemplateId: input.widgetTemplateId,
        gridX: input.gridX,
        gridY: input.gridY,
        gridWidth: input.gridWidth,
        gridHeight: input.gridHeight,
        config: input.config,
        dashboardId: input.dashboardId,
      });
      
      return { success: true, widgetId };
    }),

  // Update widget position/size/config
  updateWidget: protectedProcedure
    .input(z.object({
      id: z.number(),
      gridX: z.number().min(0).max(11).optional(),
      gridY: z.number().min(0).optional(),
      gridWidth: z.number().min(1).max(12).optional(),
      gridHeight: z.number().min(1).max(6).optional(),
      config: z.record(z.any()).optional(),
      isVisible: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      const { id, ...data } = input;
      const success = await updateUserDashboardWidget(id, ctx.user.id, data);
      
      if (!success) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Widget not found or update failed" });
      }
      
      return { success: true };
    }),

  // Update multiple widgets at once (for drag-and-drop reordering)
  updateWidgetLayout: protectedProcedure
    .input(z.object({
      widgets: z.array(z.object({
        id: z.number(),
        gridX: z.number().min(0).max(11),
        gridY: z.number().min(0),
        gridWidth: z.number().min(1).max(12),
        gridHeight: z.number().min(1).max(6),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      const results = await Promise.all(
        input.widgets.map(w => 
          updateUserDashboardWidget(w.id, ctx.user!.id, {
            gridX: w.gridX,
            gridY: w.gridY,
            gridWidth: w.gridWidth,
            gridHeight: w.gridHeight,
          })
        )
      );
      
      return { success: true, updated: results.filter(Boolean).length };
    }),

  // Remove widget from dashboard
  removeWidget: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      const success = await deleteUserDashboardWidget(input.id, ctx.user.id);
      
      if (!success) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Widget not found or delete failed" });
      }
      
      return { success: true };
    }),

  // Reset dashboard to default widgets
  resetToDefault: protectedProcedure
    .input(z.object({
      dashboardId: z.number().optional(),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      
      // Delete all existing widgets for this dashboard
      const { getDbConnection } = await import("../db");
      const db = await getDbConnection();
      
      if (input?.dashboardId) {
        await db.execute(
          `DELETE FROM dashboard_widget_configs WHERE user_id = ? AND dashboard_id = ?`,
          [ctx.user.id, input.dashboardId]
        );
      } else {
        await db.execute(
          `DELETE FROM dashboard_widget_configs WHERE user_id = ? AND (dashboard_id IS NULL OR dashboard_id = 0)`,
          [ctx.user.id]
        );
      }
      
      // Initialize default widgets
      await initializeDefaultWidgets(ctx.user.id);
      
      return { success: true };
    }),
});
