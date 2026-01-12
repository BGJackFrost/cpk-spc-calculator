import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { customWidgets } from "../../drizzle/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";

export const customWidgetRouter = router({
  // List widgets for current user (including public ones)
  list: protectedProcedure
    .input(z.object({
      includePublic: z.boolean().optional().default(true),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const conditions = input.includePublic
        ? or(eq(customWidgets.userId, ctx.user.id), eq(customWidgets.isPublic, 1))
        : eq(customWidgets.userId, ctx.user.id);
      
      return db.select()
        .from(customWidgets)
        .where(conditions)
        .orderBy(desc(customWidgets.createdAt));
    }),

  // Get single widget
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const [widget] = await db.select()
        .from(customWidgets)
        .where(and(
          eq(customWidgets.id, input.id),
          or(eq(customWidgets.userId, ctx.user.id), eq(customWidgets.isPublic, 1))
        ));
      return widget;
    }),

  // Create widget
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      widgetType: z.enum(['sql_query', 'api_endpoint', 'chart', 'table', 'kpi_card', 'gauge', 'custom']),
      sqlQuery: z.string().optional(),
      apiEndpoint: z.string().optional(),
      apiMethod: z.enum(['GET', 'POST']).optional(),
      apiHeaders: z.record(z.string()).optional(),
      apiBody: z.any().optional(),
      width: z.number().min(1).max(4).optional().default(1),
      height: z.number().min(1).max(4).optional().default(1),
      refreshInterval: z.number().min(10).max(3600).optional().default(60),
      chartType: z.enum(['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'radar']).optional(),
      chartConfig: z.any().optional(),
      isPublic: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db.insert(customWidgets).values({
        name: input.name,
        description: input.description,
        widgetType: input.widgetType,
        sqlQuery: input.sqlQuery,
        apiEndpoint: input.apiEndpoint,
        apiMethod: input.apiMethod,
        apiHeaders: input.apiHeaders,
        apiBody: input.apiBody,
        width: input.width,
        height: input.height,
        refreshInterval: input.refreshInterval,
        chartType: input.chartType,
        chartConfig: input.chartConfig,
        userId: ctx.user.id,
        isPublic: input.isPublic ? 1 : 0,
      });
      return { id: result.insertId };
    }),

  // Update widget
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      widgetType: z.enum(['sql_query', 'api_endpoint', 'chart', 'table', 'kpi_card', 'gauge', 'custom']).optional(),
      sqlQuery: z.string().optional(),
      apiEndpoint: z.string().optional(),
      apiMethod: z.enum(['GET', 'POST']).optional(),
      apiHeaders: z.record(z.string()).optional(),
      apiBody: z.any().optional(),
      width: z.number().min(1).max(4).optional(),
      height: z.number().min(1).max(4).optional(),
      refreshInterval: z.number().min(10).max(3600).optional(),
      chartType: z.enum(['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'radar']).optional(),
      chartConfig: z.any().optional(),
      isPublic: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.widgetType !== undefined) updateData.widgetType = data.widgetType;
      if (data.sqlQuery !== undefined) updateData.sqlQuery = data.sqlQuery;
      if (data.apiEndpoint !== undefined) updateData.apiEndpoint = data.apiEndpoint;
      if (data.apiMethod !== undefined) updateData.apiMethod = data.apiMethod;
      if (data.apiHeaders !== undefined) updateData.apiHeaders = data.apiHeaders;
      if (data.apiBody !== undefined) updateData.apiBody = data.apiBody;
      if (data.width !== undefined) updateData.width = data.width;
      if (data.height !== undefined) updateData.height = data.height;
      if (data.refreshInterval !== undefined) updateData.refreshInterval = data.refreshInterval;
      if (data.chartType !== undefined) updateData.chartType = data.chartType;
      if (data.chartConfig !== undefined) updateData.chartConfig = data.chartConfig;
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic ? 1 : 0;

      await db.update(customWidgets)
        .set(updateData)
        .where(and(eq(customWidgets.id, id), eq(customWidgets.userId, ctx.user.id)));
      
      return { success: true };
    }),

  // Delete widget
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      await db.delete(customWidgets)
        .where(and(eq(customWidgets.id, input.id), eq(customWidgets.userId, ctx.user.id)));
      return { success: true };
    }),

  // Test SQL query
  testQuery: protectedProcedure
    .input(z.object({
      query: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Only allow SELECT queries
      const trimmedQuery = input.query.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        return { success: false, error: 'Chỉ hỗ trợ câu lệnh SELECT' };
      }

      // Block dangerous keywords
      const dangerousKeywords = ['drop', 'delete', 'truncate', 'update', 'insert', 'alter', 'create', 'grant', 'revoke'];
      for (const keyword of dangerousKeywords) {
        if (trimmedQuery.includes(keyword)) {
          return { success: false, error: `Không được phép sử dụng từ khóa: ${keyword.toUpperCase()}` };
        }
      }

      try {
        const result = await db.execute(sql.raw(input.query));
        return {
          success: true,
          data: Array.isArray(result) ? result[0] : result,
          rowCount: Array.isArray(result) && result[0] ? (result[0] as any[]).length : 0,
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  // Test API endpoint
  testApi: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
      method: z.enum(['GET', 'POST']).optional().default('GET'),
      headers: z.record(z.string()).optional(),
      body: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const options: RequestInit = {
          method: input.method,
          headers: {
            'Content-Type': 'application/json',
            ...input.headers,
          },
        };

        if (input.method === 'POST' && input.body) {
          options.body = JSON.stringify(input.body);
        }

        const response = await fetch(input.endpoint, options);
        const data = await response.json();

        return {
          success: response.ok,
          status: response.status,
          data,
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    }),

  // Execute widget query/API
  execute: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const [widget] = await db.select()
        .from(customWidgets)
        .where(and(
          eq(customWidgets.id, input.id),
          or(eq(customWidgets.userId, ctx.user.id), eq(customWidgets.isPublic, 1))
        ));

      if (!widget) {
        return { success: false, error: 'Widget không tồn tại' };
      }

      if (widget.widgetType === 'sql_query' || widget.widgetType === 'chart' || widget.widgetType === 'table' || widget.widgetType === 'kpi_card' || widget.widgetType === 'gauge') {
        if (!widget.sqlQuery) {
          return { success: false, error: 'Widget chưa có SQL query' };
        }
        
        try {
          const result = await db.execute(sql.raw(widget.sqlQuery));
          return {
            success: true,
            data: Array.isArray(result) ? result[0] : result,
            widget,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }

      if (widget.widgetType === 'api_endpoint') {
        if (!widget.apiEndpoint) {
          return { success: false, error: 'Widget chưa có API endpoint' };
        }

        try {
          const options: RequestInit = {
            method: widget.apiMethod || 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...(widget.apiHeaders as Record<string, string> || {}),
            },
          };

          if (widget.apiMethod === 'POST' && widget.apiBody) {
            options.body = JSON.stringify(widget.apiBody);
          }

          const response = await fetch(widget.apiEndpoint, options);
          const data = await response.json();

          return {
            success: response.ok,
            data,
            widget,
          };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      }

      return { success: false, error: 'Loại widget không được hỗ trợ' };
    }),
});
