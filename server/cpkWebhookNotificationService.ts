/**
 * CPK Webhook Notification Service
 * Service gửi thông báo CPK/SPC qua Slack và Microsoft Teams
 * Hỗ trợ gửi báo cáo với Radar Chart so sánh xu hướng cải tiến
 */

import { getDb } from "./db";
import { unifiedWebhookConfigs, unifiedWebhookLogs } from "../drizzle/schema";
import { eq, and, inArray, lte, isNull, or } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Retry configuration
const RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // 1min, 5min, 15min, 1hr, 2hr
const MAX_RETRIES = 5;
const WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds

export type CpkWebhookEventType = 
  | "cpk_alert"
  | "cpk_improvement"
  | "cpk_degradation"
  | "spc_violation"
  | "daily_report"
  | "weekly_report"
  | "monthly_report"
  | "radar_chart_comparison";

export interface CpkWebhookPayload {
  eventType: CpkWebhookEventType;
  timestamp: string;
  severity: "info" | "minor" | "major" | "critical";
  data: {
    // CPK Data
    currentCpk?: number;
    previousCpk?: number;
    cpkChange?: number;
    cpkChangePercent?: number;
    cpkThreshold?: number;
    
    // Product/Line Info
    productCode?: string;
    productName?: string;
    productionLineName?: string;
    workstationName?: string;
    
    // SPC Metrics
    cp?: number;
    pp?: number;
    ppk?: number;
    ca?: number;
    cr?: number;
    mean?: number;
    stdDev?: number;
    usl?: number;
    lsl?: number;
    
    // Violation Info
    violationRule?: string;
    violationDescription?: string;
    
    // Report Info
    reportPeriod?: string;
    reportStartDate?: string;
    reportEndDate?: string;
    totalSamples?: number;
    totalViolations?: number;
    
    // Radar Chart Data
    radarChartData?: Array<{
      metric: string;
      current: number;
      previous: number;
    }>;
    
    // Additional context
    message?: string;
    actionUrl?: string;
    [key: string]: unknown;
  };
}

/**
 * Format payload for Slack webhook
 */
function formatSlackPayload(payload: CpkWebhookPayload): object {
  const severity = payload.severity;
  const color = severity === "critical" ? "#dc2626" 
              : severity === "major" ? "#f59e0b" 
              : severity === "minor" ? "#3b82f6" 
              : "#22c55e";
  
  let title = "";
  let fields: Array<{ title: string; value: string; short: boolean }> = [];
  let text = "";
  
  switch (payload.eventType) {
    case "cpk_alert":
      title = "⚠️ Cảnh báo CPK";
      fields = [
        { title: "Sản phẩm", value: payload.data.productCode || "N/A", short: true },
        { title: "Dây chuyền", value: payload.data.productionLineName || "N/A", short: true },
        { title: "CPK hiện tại", value: payload.data.currentCpk?.toFixed(3) || "N/A", short: true },
        { title: "Ngưỡng", value: payload.data.cpkThreshold?.toFixed(2) || "1.33", short: true },
      ];
      break;
      
    case "cpk_improvement":
      title = "📈 CPK Cải thiện";
      fields = [
        { title: "Sản phẩm", value: payload.data.productCode || "N/A", short: true },
        { title: "Dây chuyền", value: payload.data.productionLineName || "N/A", short: true },
        { title: "CPK trước", value: payload.data.previousCpk?.toFixed(3) || "N/A", short: true },
        { title: "CPK sau", value: payload.data.currentCpk?.toFixed(3) || "N/A", short: true },
        { title: "Thay đổi", value: `+${payload.data.cpkChange?.toFixed(3)} (${payload.data.cpkChangePercent?.toFixed(1)}%)`, short: false },
      ];
      break;
      
    case "cpk_degradation":
      title = "📉 CPK Suy giảm";
      fields = [
        { title: "Sản phẩm", value: payload.data.productCode || "N/A", short: true },
        { title: "Dây chuyền", value: payload.data.productionLineName || "N/A", short: true },
        { title: "CPK trước", value: payload.data.previousCpk?.toFixed(3) || "N/A", short: true },
        { title: "CPK sau", value: payload.data.currentCpk?.toFixed(3) || "N/A", short: true },
        { title: "Thay đổi", value: `${payload.data.cpkChange?.toFixed(3)} (${payload.data.cpkChangePercent?.toFixed(1)}%)`, short: false },
      ];
      break;
      
    case "spc_violation":
      title = "🚨 Vi phạm SPC Rule";
      fields = [
        { title: "Sản phẩm", value: payload.data.productCode || "N/A", short: true },
        { title: "Công trạm", value: payload.data.workstationName || "N/A", short: true },
        { title: "Rule vi phạm", value: payload.data.violationRule || "N/A", short: false },
        { title: "Mô tả", value: payload.data.violationDescription || "N/A", short: false },
      ];
      break;
      
    case "daily_report":
    case "weekly_report":
    case "monthly_report":
      const reportType = payload.eventType === "daily_report" ? "Hàng ngày" 
                       : payload.eventType === "weekly_report" ? "Hàng tuần" 
                       : "Hàng tháng";
      title = `📊 Báo cáo CPK ${reportType}`;
      fields = [
        { title: "Kỳ báo cáo", value: payload.data.reportPeriod || "N/A", short: false },
        { title: "CPK trung bình", value: payload.data.currentCpk?.toFixed(3) || "N/A", short: true },
        { title: "Tổng mẫu", value: String(payload.data.totalSamples || 0), short: true },
        { title: "Số vi phạm", value: String(payload.data.totalViolations || 0), short: true },
      ];
      break;
      
    case "radar_chart_comparison":
      title = "📊 So sánh Radar Chart CPK";
      text = "So sánh các chỉ số SPC/CPK theo thời gian:\n";
      if (payload.data.radarChartData) {
        text += payload.data.radarChartData.map(d => 
          `• ${d.metric}: ${d.current.toFixed(3)} (trước: ${d.previous.toFixed(3)})`
        ).join("\n");
      }
      fields = [
        { title: "Kỳ so sánh", value: payload.data.reportPeriod || "N/A", short: false },
      ];
      break;
  }
  
  const attachment: any = {
    color,
    title,
    fields,
    footer: "SPC/CPK Calculator",
    ts: Math.floor(new Date(payload.timestamp).getTime() / 1000),
  };
  
  if (text) {
    attachment.text = text;
  }
  
  if (payload.data.actionUrl) {
    attachment.actions = [
      {
        type: "button",
        text: "Xem chi tiết",
        url: payload.data.actionUrl,
      }
    ];
  }
  
  return { attachments: [attachment] };
}

/**
 * Format payload for Microsoft Teams webhook (Adaptive Card)
 */
function formatTeamsPayload(payload: CpkWebhookPayload): object {
  const severity = payload.severity;
  const themeColor = severity === "critical" ? "dc2626" 
                   : severity === "major" ? "f59e0b" 
                   : severity === "minor" ? "3b82f6" 
                   : "22c55e";
  
  let title = "";
  let facts: Array<{ name: string; value: string }> = [];
  let text = "";
  
  switch (payload.eventType) {
    case "cpk_alert":
      title = "⚠️ Cảnh báo CPK";
      facts = [
        { name: "Sản phẩm", value: payload.data.productCode || "N/A" },
        { name: "Dây chuyền", value: payload.data.productionLineName || "N/A" },
        { name: "CPK hiện tại", value: payload.data.currentCpk?.toFixed(3) || "N/A" },
        { name: "Ngưỡng", value: payload.data.cpkThreshold?.toFixed(2) || "1.33" },
      ];
      break;
      
    case "cpk_improvement":
      title = "📈 CPK Cải thiện";
      facts = [
        { name: "Sản phẩm", value: payload.data.productCode || "N/A" },
        { name: "Dây chuyền", value: payload.data.productionLineName || "N/A" },
        { name: "CPK trước", value: payload.data.previousCpk?.toFixed(3) || "N/A" },
        { name: "CPK sau", value: payload.data.currentCpk?.toFixed(3) || "N/A" },
        { name: "Thay đổi", value: `+${payload.data.cpkChange?.toFixed(3)} (${payload.data.cpkChangePercent?.toFixed(1)}%)` },
      ];
      break;
      
    case "cpk_degradation":
      title = "📉 CPK Suy giảm";
      facts = [
        { name: "Sản phẩm", value: payload.data.productCode || "N/A" },
        { name: "Dây chuyền", value: payload.data.productionLineName || "N/A" },
        { name: "CPK trước", value: payload.data.previousCpk?.toFixed(3) || "N/A" },
        { name: "CPK sau", value: payload.data.currentCpk?.toFixed(3) || "N/A" },
        { name: "Thay đổi", value: `${payload.data.cpkChange?.toFixed(3)} (${payload.data.cpkChangePercent?.toFixed(1)}%)` },
      ];
      break;
      
    case "spc_violation":
      title = "🚨 Vi phạm SPC Rule";
      facts = [
        { name: "Sản phẩm", value: payload.data.productCode || "N/A" },
        { name: "Công trạm", value: payload.data.workstationName || "N/A" },
        { name: "Rule vi phạm", value: payload.data.violationRule || "N/A" },
        { name: "Mô tả", value: payload.data.violationDescription || "N/A" },
      ];
      break;
      
    case "daily_report":
    case "weekly_report":
    case "monthly_report":
      const reportType = payload.eventType === "daily_report" ? "Hàng ngày" 
                       : payload.eventType === "weekly_report" ? "Hàng tuần" 
                       : "Hàng tháng";
      title = `📊 Báo cáo CPK ${reportType}`;
      facts = [
        { name: "Kỳ báo cáo", value: payload.data.reportPeriod || "N/A" },
        { name: "CPK trung bình", value: payload.data.currentCpk?.toFixed(3) || "N/A" },
        { name: "Tổng mẫu", value: String(payload.data.totalSamples || 0) },
        { name: "Số vi phạm", value: String(payload.data.totalViolations || 0) },
      ];
      break;
      
    case "radar_chart_comparison":
      title = "📊 So sánh Radar Chart CPK";
      text = "So sánh các chỉ số SPC/CPK theo thời gian:\n\n";
      if (payload.data.radarChartData) {
        text += payload.data.radarChartData.map(d => 
          `• **${d.metric}**: ${d.current.toFixed(3)} (trước: ${d.previous.toFixed(3)})`
        ).join("\n\n");
      }
      facts = [
        { name: "Kỳ so sánh", value: payload.data.reportPeriod || "N/A" },
      ];
      break;
  }
  
  const sections: any[] = [
    {
      activityTitle: title,
      facts,
      markdown: true,
    }
  ];
  
  if (text) {
    sections.push({
      text,
      markdown: true,
    });
  }
  
  const card: any = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor,
    summary: title,
    sections,
  };
  
  if (payload.data.actionUrl) {
    card.potentialAction = [
      {
        "@type": "OpenUri",
        name: "Xem chi tiết",
        targets: [
          { os: "default", uri: payload.data.actionUrl }
        ]
      }
    ];
  }
  
  return card;
}

/**
 * Format payload for Discord webhook
 */
function formatDiscordPayload(payload: CpkWebhookPayload): object {
  const severity = payload.severity;
  const color = severity === "critical" ? 0xdc2626 
              : severity === "major" ? 0xf59e0b 
              : severity === "minor" ? 0x3b82f6 
              : 0x22c55e;
  
  let title = "";
  let fields: Array<{ name: string; value: string; inline: boolean }> = [];
  
  switch (payload.eventType) {
    case "cpk_alert":
      title = "⚠️ Cảnh báo CPK";
      fields = [
        { name: "Sản phẩm", value: payload.data.productCode || "N/A", inline: true },
        { name: "Dây chuyền", value: payload.data.productionLineName || "N/A", inline: true },
        { name: "CPK", value: payload.data.currentCpk?.toFixed(3) || "N/A", inline: true },
      ];
      break;
    // Add more cases as needed
    default:
      title = payload.eventType;
      fields = [
        { name: "Message", value: payload.data.message || "N/A", inline: false },
      ];
  }
  
  return {
    embeds: [
      {
        title,
        color,
        fields,
        timestamp: payload.timestamp,
        footer: { text: "SPC/CPK Calculator" },
      }
    ]
  };
}

/**
 * Send webhook notification to a specific config
 */
export async function sendCpkWebhook(
  config: typeof unifiedWebhookConfigs.$inferSelect,
  payload: CpkWebhookPayload
): Promise<{ success: boolean; error?: string; responseStatus?: number }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }
  
  try {
    let body: string;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    // Add custom headers if defined
    if (config.customHeaders) {
      try {
        const customHeaders = typeof config.customHeaders === 'string' 
          ? JSON.parse(config.customHeaders) 
          : config.customHeaders;
        Object.assign(headers, customHeaders);
      } catch {
        // Ignore invalid headers
      }
    }
    
    // Format payload based on channel type
    switch (config.channelType) {
      case "slack":
        body = JSON.stringify(formatSlackPayload(payload));
        break;
      case "teams":
        body = JSON.stringify(formatTeamsPayload(payload));
        break;
      case "discord":
        body = JSON.stringify(formatDiscordPayload(payload));
        break;
      case "custom":
        // Use custom body template if provided
        if (config.customBodyTemplate) {
          body = config.customBodyTemplate
            .replace(/\{\{eventType\}\}/g, payload.eventType)
            .replace(/\{\{timestamp\}\}/g, payload.timestamp)
            .replace(/\{\{severity\}\}/g, payload.severity)
            .replace(/\{\{data\}\}/g, JSON.stringify(payload.data));
        } else {
          body = JSON.stringify(payload);
        }
        break;
      default:
        body = JSON.stringify(payload);
    }
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
    
    let response: Response;
    try {
      response = await fetch(config.webhookUrl, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
    
    const responseBody = await response.text();
    
    // Log the webhook delivery
    await db.insert(unifiedWebhookLogs).values({
      webhookConfigId: config.id,
      eventType: payload.eventType,
      eventTitle: getEventTitle(payload.eventType),
      eventMessage: payload.data.message || null,
      eventData: payload.data,
      severity: payload.severity,
      sourceType: "cpk_notification",
      requestPayload: body,
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000),
      status: response.ok ? "sent" : "failed",
      errorMessage: response.ok ? null : `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
      retryCount: 0,
      createdAt: new Date(),
    });
    
    // Update last sent timestamp
    await db.update(unifiedWebhookConfigs)
      .set({ lastSentAt: new Date() })
      .where(eq(unifiedWebhookConfigs.id, config.id));
    
    return { 
      success: response.ok, 
      error: response.ok ? undefined : `HTTP ${response.status}`,
      responseStatus: response.status
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Log the failed delivery
    await db.insert(unifiedWebhookLogs).values({
      webhookConfigId: config.id,
      eventType: payload.eventType,
      eventTitle: getEventTitle(payload.eventType),
      eventMessage: payload.data.message || null,
      eventData: payload.data,
      severity: payload.severity,
      sourceType: "cpk_notification",
      requestPayload: JSON.stringify(payload),
      status: "failed",
      errorMessage,
      retryCount: 0,
      createdAt: new Date(),
    });
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Get event title for logging
 */
function getEventTitle(eventType: CpkWebhookEventType): string {
  const titles: Record<CpkWebhookEventType, string> = {
    cpk_alert: "Cảnh báo CPK",
    cpk_improvement: "CPK Cải thiện",
    cpk_degradation: "CPK Suy giảm",
    spc_violation: "Vi phạm SPC Rule",
    daily_report: "Báo cáo hàng ngày",
    weekly_report: "Báo cáo hàng tuần",
    monthly_report: "Báo cáo hàng tháng",
    radar_chart_comparison: "So sánh Radar Chart",
  };
  return titles[eventType] || eventType;
}

/**
 * Trigger webhooks for a specific event type
 */
export async function triggerCpkWebhooks(
  eventType: CpkWebhookEventType,
  data: CpkWebhookPayload["data"],
  severity: CpkWebhookPayload["severity"] = "info",
  filters?: {
    productionLineIds?: number[];
    workstationIds?: number[];
    productCodes?: string[];
  }
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    return { sent: 0, failed: 0 };
  }
  
  // Find all active webhook configs that subscribe to this event
  const configs = await db
    .select()
    .from(unifiedWebhookConfigs)
    .where(
      and(
        eq(unifiedWebhookConfigs.isActive, 1),
        // Check if config subscribes to this event type
        sql`JSON_CONTAINS(${unifiedWebhookConfigs.events}, ${JSON.stringify(eventType)})`
      )
    );
  
  // Filter by severity
  const severityOrder = { info: 0, minor: 1, major: 2, critical: 3 };
  const filteredConfigs = configs.filter(config => {
    const minSeverity = config.minSeverity || "major";
    return severityOrder[severity] >= severityOrder[minSeverity as keyof typeof severityOrder];
  });
  
  const payload: CpkWebhookPayload = {
    eventType,
    timestamp: new Date().toISOString(),
    severity,
    data,
  };
  
  let sent = 0;
  let failed = 0;
  
  // Send webhooks in parallel
  const results = await Promise.all(
    filteredConfigs.map(config => sendCpkWebhook(config, payload))
  );
  
  for (const result of results) {
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }
  
  return { sent, failed };
}

/**
 * Send CPK alert when CPK drops below threshold
 */
export async function sendCpkAlert(
  productCode: string,
  productionLineName: string,
  currentCpk: number,
  cpkThreshold: number = 1.33,
  actionUrl?: string
): Promise<{ sent: number; failed: number }> {
  const severity = currentCpk < 1.0 ? "critical" : currentCpk < 1.33 ? "major" : "minor";
  
  return triggerCpkWebhooks("cpk_alert", {
    productCode,
    productionLineName,
    currentCpk,
    cpkThreshold,
    message: `CPK ${currentCpk.toFixed(3)} dưới ngưỡng ${cpkThreshold}`,
    actionUrl,
  }, severity);
}

/**
 * Send CPK improvement notification
 */
export async function sendCpkImprovementNotification(
  productCode: string,
  productionLineName: string,
  previousCpk: number,
  currentCpk: number,
  actionUrl?: string
): Promise<{ sent: number; failed: number }> {
  const cpkChange = currentCpk - previousCpk;
  const cpkChangePercent = (cpkChange / previousCpk) * 100;
  
  return triggerCpkWebhooks("cpk_improvement", {
    productCode,
    productionLineName,
    previousCpk,
    currentCpk,
    cpkChange,
    cpkChangePercent,
    message: `CPK cải thiện từ ${previousCpk.toFixed(3)} lên ${currentCpk.toFixed(3)} (+${cpkChangePercent.toFixed(1)}%)`,
    actionUrl,
  }, "info");
}

/**
 * Send Radar Chart comparison notification
 */
export async function sendRadarChartComparisonNotification(
  productCode: string,
  productionLineName: string,
  radarChartData: Array<{ metric: string; current: number; previous: number }>,
  reportPeriod: string,
  actionUrl?: string
): Promise<{ sent: number; failed: number }> {
  // Calculate overall improvement
  const cpkData = radarChartData.find(d => d.metric === "CPK");
  const improved = cpkData ? cpkData.current > cpkData.previous : false;
  
  return triggerCpkWebhooks("radar_chart_comparison", {
    productCode,
    productionLineName,
    radarChartData,
    reportPeriod,
    currentCpk: cpkData?.current,
    previousCpk: cpkData?.previous,
    cpkChange: cpkData ? cpkData.current - cpkData.previous : undefined,
    message: `So sánh Radar Chart ${reportPeriod}: CPK ${improved ? "cải thiện" : "suy giảm"}`,
    actionUrl,
  }, improved ? "info" : "minor");
}

/**
 * Test webhook configuration
 */
export async function testCpkWebhook(configId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }
  
  const [config] = await db
    .select()
    .from(unifiedWebhookConfigs)
    .where(eq(unifiedWebhookConfigs.id, configId));
  
  if (!config) {
    return { success: false, error: "Webhook config not found" };
  }
  
  const testPayload: CpkWebhookPayload = {
    eventType: "cpk_alert",
    timestamp: new Date().toISOString(),
    severity: "info",
    data: {
      productCode: "TEST-PRODUCT",
      productionLineName: "TEST-LINE",
      currentCpk: 1.25,
      cpkThreshold: 1.33,
      message: "Đây là tin nhắn test từ hệ thống SPC/CPK Calculator",
      radarChartData: [
        { metric: "CPK", current: 1.45, previous: 1.32 },
        { metric: "CP", current: 1.52, previous: 1.40 },
        { metric: "PP", current: 1.48, previous: 1.35 },
        { metric: "PPK", current: 1.42, previous: 1.30 },
      ],
    },
  };
  
  return sendCpkWebhook(config, testPayload);
}

/**
 * Process webhook retries for failed deliveries
 */
export async function processCpkWebhookRetries(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  
  // Find failed logs that need retry
  const failedLogs = await db
    .select()
    .from(unifiedWebhookLogs)
    .where(
      and(
        eq(unifiedWebhookLogs.status, "failed"),
        sql`${unifiedWebhookLogs.retryCount} < 5`
      )
    )
    .limit(50);
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  for (const log of failedLogs) {
    processed++;
    
    // Get the webhook config
    const [config] = await db
      .select()
      .from(unifiedWebhookConfigs)
      .where(eq(unifiedWebhookConfigs.id, log.webhookConfigId));
    
    if (!config || !config.isActive) {
      // Mark as exhausted
      await db.update(unifiedWebhookLogs)
        .set({ status: "failed", errorMessage: "Webhook config not found or disabled" })
        .where(eq(unifiedWebhookLogs.id, log.id));
      failed++;
      continue;
    }
    
    try {
      const payload = log.requestPayload ? JSON.parse(log.requestPayload) : {};
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      
      let response: Response;
      try {
        response = await fetch(config.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: log.requestPayload || JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      
      const responseBody = await response.text();
      
      if (response.ok) {
        await db.update(unifiedWebhookLogs)
          .set({
            status: "sent",
            responseStatus: response.status,
            responseBody: responseBody.substring(0, 1000),
            retryCount: log.retryCount + 1,
            errorMessage: null,
          })
          .where(eq(unifiedWebhookLogs.id, log.id));
        succeeded++;
      } else {
        await db.update(unifiedWebhookLogs)
          .set({
            retryCount: log.retryCount + 1,
            responseStatus: response.status,
            responseBody: responseBody.substring(0, 1000),
            errorMessage: `HTTP ${response.status}`,
          })
          .where(eq(unifiedWebhookLogs.id, log.id));
        failed++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await db.update(unifiedWebhookLogs)
        .set({
          retryCount: log.retryCount + 1,
          errorMessage,
        })
        .where(eq(unifiedWebhookLogs.id, log.id));
      failed++;
    }
  }
  
  return { processed, succeeded, failed };
}
