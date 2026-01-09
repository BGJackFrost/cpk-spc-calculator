import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { unifiedWebhookConfigs, unifiedWebhookLogs } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Webhook config input schema
const webhookConfigInput = z.object({
  name: z.string().min(1, "Tên không được để trống"),
  description: z.string().optional(),
  channelType: z.enum(["slack", "teams", "discord", "custom"]),
  webhookUrl: z.string().url("URL không hợp lệ"),
  slackChannel: z.string().optional(),
  slackUsername: z.string().optional(),
  slackIconEmoji: z.string().optional(),
  teamsTitle: z.string().optional(),
  teamsThemeColor: z.string().optional(),
  customHeaders: z.record(z.string()).optional(),
  customBodyTemplate: z.string().optional(),
  events: z.array(z.string()).optional(),
  productionLineIds: z.array(z.number()).optional(),
  workstationIds: z.array(z.number()).optional(),
  productCodes: z.array(z.string()).optional(),
  minSeverity: z.enum(["info", "minor", "major", "critical"]).default("major"),
  rateLimitMinutes: z.number().min(0).max(1440).default(5),
  isActive: z.boolean().default(true),
});

// Build Slack message payload
function buildSlackPayload(config: typeof unifiedWebhookConfigs.$inferSelect, event: {
  type: string;
  title: string;
  message: string;
  severity: string;
  data?: Record<string, unknown>;
}) {
  const severityColors: Record<string, string> = {
    info: "#36a64f",
    minor: "#ffcc00",
    major: "#ff9900",
    critical: "#ff0000",
  };
  
  return {
    channel: config.slackChannel || undefined,
    username: config.slackUsername || "SPC Alert Bot",
    icon_emoji: config.slackIconEmoji || ":warning:",
    attachments: [
      {
        color: severityColors[event.severity] || "#808080",
        title: event.title,
        text: event.message,
        fields: [
          { title: "Loại sự kiện", value: event.type, short: true },
          { title: "Mức độ", value: event.severity.toUpperCase(), short: true },
        ],
        footer: "CPK/SPC Calculator",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

// Build Teams message payload
function buildTeamsPayload(config: typeof unifiedWebhookConfigs.$inferSelect, event: {
  type: string;
  title: string;
  message: string;
  severity: string;
  data?: Record<string, unknown>;
}) {
  const severityColors: Record<string, string> = {
    info: "00FF00",
    minor: "FFFF00",
    major: "FFA500",
    critical: "FF0000",
  };
  
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor: config.teamsThemeColor || severityColors[event.severity] || "808080",
    summary: event.title,
    sections: [
      {
        activityTitle: config.teamsTitle || event.title,
        facts: [
          { name: "Loại sự kiện", value: event.type },
          { name: "Mức độ", value: event.severity.toUpperCase() },
          { name: "Thời gian", value: new Date().toLocaleString("vi-VN") },
        ],
        text: event.message,
        markdown: true,
      },
    ],
  };
}

// Send webhook notification
async function sendWebhookNotification(
  config: typeof unifiedWebhookConfigs.$inferSelect,
  event: {
    type: string;
    title: string;
    message: string;
    severity: string;
    data?: Record<string, unknown>;
    sourceType?: string;
    sourceId?: number;
  }
): Promise<{ success: boolean; responseStatus?: number; error?: string }> {
  const db = await getDb();
  const startTime = Date.now();
  
  let payload: unknown;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Build payload based on channel type
  switch (config.channelType) {
    case "slack":
      payload = buildSlackPayload(config, event);
      break;
    case "teams":
      payload = buildTeamsPayload(config, event);
      break;
    case "discord":
      payload = {
        content: `**${event.title}**\n${event.message}`,
        embeds: [
          {
            title: event.type,
            description: event.message,
            color: event.severity === "critical" ? 0xff0000 : event.severity === "major" ? 0xffa500 : 0xffff00,
            timestamp: new Date().toISOString(),
          },
        ],
      };
      break;
    case "custom":
      if (config.customBodyTemplate) {
        try {
          // Simple template replacement
          let template = config.customBodyTemplate;
          template = template.replace(/\{\{title\}\}/g, event.title);
          template = template.replace(/\{\{message\}\}/g, event.message);
          template = template.replace(/\{\{severity\}\}/g, event.severity);
          template = template.replace(/\{\{type\}\}/g, event.type);
          template = template.replace(/\{\{timestamp\}\}/g, new Date().toISOString());
          payload = JSON.parse(template);
        } catch {
          payload = { title: event.title, message: event.message, severity: event.severity, type: event.type };
        }
      } else {
        payload = { title: event.title, message: event.message, severity: event.severity, type: event.type };
      }
      
      // Add custom headers
      if (config.customHeaders) {
        const customHeaders = typeof config.customHeaders === "string" 
          ? JSON.parse(config.customHeaders) 
          : config.customHeaders;
        Object.assign(headers, customHeaders);
      }
      break;
  }
  
  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    
    const processingTime = Date.now() - startTime;
    const responseBody = await response.text();
    
    // Log the webhook call
    await db.insert(unifiedWebhookLogs).values({
      webhookConfigId: config.id,
      eventType: event.type,
      eventTitle: event.title,
      eventMessage: event.message,
      eventData: event.data ? JSON.stringify(event.data) : null,
      severity: event.severity as "info" | "minor" | "major" | "critical",
      sourceType: event.sourceType || null,
      sourceId: event.sourceId || null,
      requestPayload: JSON.stringify(payload),
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000),
      status: response.ok ? "sent" : "failed",
      sentAt: sql`NOW()`,
      errorMessage: response.ok ? null : `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
      processingTimeMs: processingTime,
    });
    
    // Update config stats
    if (response.ok) {
      await db
        .update(unifiedWebhookConfigs)
        .set({
          totalNotificationsSent: sql`total_notifications_sent + 1`,
          lastNotifiedAt: sql`NOW()`,
          lastSuccessAt: sql`NOW()`,
        })
        .where(eq(unifiedWebhookConfigs.id, config.id));
    } else {
      await db
        .update(unifiedWebhookConfigs)
        .set({
          lastErrorAt: sql`NOW()`,
          lastErrorMessage: `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
        })
        .where(eq(unifiedWebhookConfigs.id, config.id));
    }
    
    return {
      success: response.ok,
      responseStatus: response.status,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Log the failed webhook call
    await db.insert(unifiedWebhookLogs).values({
      webhookConfigId: config.id,
      eventType: event.type,
      eventTitle: event.title,
      eventMessage: event.message,
      eventData: event.data ? JSON.stringify(event.data) : null,
      severity: event.severity as "info" | "minor" | "major" | "critical",
      sourceType: event.sourceType || null,
      sourceId: event.sourceId || null,
      requestPayload: JSON.stringify(payload),
      status: "failed",
      errorMessage,
      processingTimeMs: processingTime,
    });
    
    // Update config error stats
    await db
      .update(unifiedWebhookConfigs)
      .set({
        lastErrorAt: sql`NOW()`,
        lastErrorMessage: errorMessage,
      })
      .where(eq(unifiedWebhookConfigs.id, config.id));
    
    return { success: false, error: errorMessage };
  }
}

export const unifiedWebhookRouter = router({
  // Get all webhook configs for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const configs = await db
      .select()
      .from(unifiedWebhookConfigs)
      .where(eq(unifiedWebhookConfigs.userId, ctx.user.id))
      .orderBy(desc(unifiedWebhookConfigs.createdAt));
    return configs;
  }),

  // Get all configs (admin only)
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Chỉ admin mới có quyền xem tất cả" });
    }
    const db = await getDb();
    const configs = await db
      .select()
      .from(unifiedWebhookConfigs)
      .orderBy(desc(unifiedWebhookConfigs.createdAt));
    return configs;
  }),

  // Get config by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const [config] = await db
        .select()
        .from(unifiedWebhookConfigs)
        .where(eq(unifiedWebhookConfigs.id, input.id));
      
      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình webhook" });
      }
      
      if (config.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
      }
      
      return config;
    }),

  // Create new webhook config
  create: protectedProcedure
    .input(webhookConfigInput)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [result] = await db.insert(unifiedWebhookConfigs).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
        channelType: input.channelType,
        webhookUrl: input.webhookUrl,
        slackChannel: input.slackChannel || null,
        slackUsername: input.slackUsername || null,
        slackIconEmoji: input.slackIconEmoji || null,
        teamsTitle: input.teamsTitle || null,
        teamsThemeColor: input.teamsThemeColor || null,
        customHeaders: input.customHeaders ? JSON.stringify(input.customHeaders) : null,
        customBodyTemplate: input.customBodyTemplate || null,
        events: input.events ? JSON.stringify(input.events) : null,
        productionLineIds: input.productionLineIds ? JSON.stringify(input.productionLineIds) : null,
        workstationIds: input.workstationIds ? JSON.stringify(input.workstationIds) : null,
        productCodes: input.productCodes ? JSON.stringify(input.productCodes) : null,
        minSeverity: input.minSeverity,
        rateLimitMinutes: input.rateLimitMinutes,
        isActive: input.isActive ? 1 : 0,
      });
      
      return { success: true, id: result.insertId };
    }),

  // Update webhook config
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: webhookConfigInput.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [existing] = await db
        .select()
        .from(unifiedWebhookConfigs)
        .where(eq(unifiedWebhookConfigs.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình webhook" });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền chỉnh sửa" });
      }
      
      const updateData: Record<string, unknown> = {};
      
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.description !== undefined) updateData.description = input.data.description;
      if (input.data.channelType !== undefined) updateData.channelType = input.data.channelType;
      if (input.data.webhookUrl !== undefined) updateData.webhookUrl = input.data.webhookUrl;
      if (input.data.slackChannel !== undefined) updateData.slackChannel = input.data.slackChannel;
      if (input.data.slackUsername !== undefined) updateData.slackUsername = input.data.slackUsername;
      if (input.data.slackIconEmoji !== undefined) updateData.slackIconEmoji = input.data.slackIconEmoji;
      if (input.data.teamsTitle !== undefined) updateData.teamsTitle = input.data.teamsTitle;
      if (input.data.teamsThemeColor !== undefined) updateData.teamsThemeColor = input.data.teamsThemeColor;
      if (input.data.customHeaders !== undefined) updateData.customHeaders = JSON.stringify(input.data.customHeaders);
      if (input.data.customBodyTemplate !== undefined) updateData.customBodyTemplate = input.data.customBodyTemplate;
      if (input.data.events !== undefined) updateData.events = JSON.stringify(input.data.events);
      if (input.data.productionLineIds !== undefined) updateData.productionLineIds = JSON.stringify(input.data.productionLineIds);
      if (input.data.workstationIds !== undefined) updateData.workstationIds = JSON.stringify(input.data.workstationIds);
      if (input.data.productCodes !== undefined) updateData.productCodes = JSON.stringify(input.data.productCodes);
      if (input.data.minSeverity !== undefined) updateData.minSeverity = input.data.minSeverity;
      if (input.data.rateLimitMinutes !== undefined) updateData.rateLimitMinutes = input.data.rateLimitMinutes;
      if (input.data.isActive !== undefined) updateData.isActive = input.data.isActive ? 1 : 0;
      
      await db
        .update(unifiedWebhookConfigs)
        .set(updateData)
        .where(eq(unifiedWebhookConfigs.id, input.id));
      
      return { success: true };
    }),

  // Delete webhook config
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [existing] = await db
        .select()
        .from(unifiedWebhookConfigs)
        .where(eq(unifiedWebhookConfigs.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình webhook" });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền xóa" });
      }
      
      // Delete logs first
      await db.delete(unifiedWebhookLogs).where(eq(unifiedWebhookLogs.webhookConfigId, input.id));
      
      // Delete config
      await db.delete(unifiedWebhookConfigs).where(eq(unifiedWebhookConfigs.id, input.id));
      
      return { success: true };
    }),

  // Toggle active status
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [existing] = await db
        .select()
        .from(unifiedWebhookConfigs)
        .where(eq(unifiedWebhookConfigs.id, input.id));
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình webhook" });
      }
      
      if (existing.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền thay đổi" });
      }
      
      const newStatus = existing.isActive ? 0 : 1;
      
      await db
        .update(unifiedWebhookConfigs)
        .set({ isActive: newStatus })
        .where(eq(unifiedWebhookConfigs.id, input.id));
      
      return { success: true, isActive: newStatus === 1 };
    }),

  // Test webhook
  test: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      const [config] = await db
        .select()
        .from(unifiedWebhookConfigs)
        .where(eq(unifiedWebhookConfigs.id, input.id));
      
      if (!config) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Không tìm thấy cấu hình webhook" });
      }
      
      if (config.userId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền test" });
      }
      
      const result = await sendWebhookNotification(config, {
        type: "test",
        title: "🧪 Test Webhook",
        message: "Đây là tin nhắn test từ hệ thống CPK/SPC Calculator. Nếu bạn nhận được tin nhắn này, webhook đã được cấu hình đúng!",
        severity: "info",
        data: { test: true, timestamp: new Date().toISOString() },
      });
      
      return result;
    }),

  // Get webhook logs
  getLogs: protectedProcedure
    .input(z.object({
      webhookConfigId: z.number().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      status: z.enum(["pending", "sent", "failed"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      let query = db.select().from(unifiedWebhookLogs);
      
      const conditions = [];
      
      if (input.webhookConfigId) {
        // Check ownership
        const [config] = await db
          .select()
          .from(unifiedWebhookConfigs)
          .where(eq(unifiedWebhookConfigs.id, input.webhookConfigId));
        
        if (config && config.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
        }
        
        conditions.push(eq(unifiedWebhookLogs.webhookConfigId, input.webhookConfigId));
      }
      
      if (input.status) {
        conditions.push(eq(unifiedWebhookLogs.status, input.status));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }
      
      const logs = await query
        .orderBy(desc(unifiedWebhookLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return logs;
    }),

  // Get webhook stats
  getStats: protectedProcedure
    .input(z.object({ webhookConfigId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      let conditions = [];
      
      if (input.webhookConfigId) {
        const [config] = await db
          .select()
          .from(unifiedWebhookConfigs)
          .where(eq(unifiedWebhookConfigs.id, input.webhookConfigId));
        
        if (config && config.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Không có quyền truy cập" });
        }
        
        conditions.push(eq(unifiedWebhookLogs.webhookConfigId, input.webhookConfigId));
      }
      
      const [stats] = await db
        .select({
          total: sql<number>`count(*)`,
          sent: sql<number>`sum(case when status = 'sent' then 1 else 0 end)`,
          failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
          pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
          avgProcessingTime: sql<number>`avg(processing_time_ms)`,
        })
        .from(unifiedWebhookLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      
      return {
        total: stats?.total || 0,
        sent: stats?.sent || 0,
        failed: stats?.failed || 0,
        pending: stats?.pending || 0,
        avgProcessingTime: Math.round(stats?.avgProcessingTime || 0),
        successRate: stats?.total ? Math.round((stats.sent / stats.total) * 100) : 0,
      };
    }),

  // Send CPK alert webhook
  sendCpkAlert: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      productionLineName: z.string(),
      currentCpk: z.number(),
      cpkThreshold: z.number().default(1.33),
      actionUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { sendCpkAlert } = await import("../cpkWebhookNotificationService");
      return sendCpkAlert(
        input.productCode,
        input.productionLineName,
        input.currentCpk,
        input.cpkThreshold,
        input.actionUrl
      );
    }),

  // Send Radar Chart comparison notification
  sendRadarChartComparison: protectedProcedure
    .input(z.object({
      productCode: z.string(),
      productionLineName: z.string(),
      radarChartData: z.array(z.object({
        metric: z.string(),
        current: z.number(),
        previous: z.number(),
      })),
      reportPeriod: z.string(),
      actionUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { sendRadarChartComparisonNotification } = await import("../cpkWebhookNotificationService");
      return sendRadarChartComparisonNotification(
        input.productCode,
        input.productionLineName,
        input.radarChartData,
        input.reportPeriod,
        input.actionUrl
      );
    }),

  // Test CPK webhook
  testCpkWebhook: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input }) => {
      const { testCpkWebhook } = await import("../cpkWebhookNotificationService");
      return testCpkWebhook(input.configId);
    }),
});

// Export helper function for use in other services
export { sendWebhookNotification };