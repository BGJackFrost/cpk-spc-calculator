import { getDb } from "./db";
import { webhooks, webhookLogs, type Webhook } from "../drizzle/schema";
import { eq, and, like } from "drizzle-orm";

export type WebhookEventType = "cpk_alert" | "rule_violation" | "analysis_complete";

export interface WebhookPayload {
  eventType: WebhookEventType;
  timestamp: string;
  data: {
    productCode?: string;
    stationName?: string;
    cpk?: number;
    cpkThreshold?: number;
    ruleViolation?: string;
    analysisId?: number;
    message?: string;
    severity?: "info" | "warning" | "critical";
    [key: string]: unknown;
  };
}

// Format payload for Slack
function formatSlackPayload(payload: WebhookPayload): object {
  const severity = payload.data.severity || "info";
  const color = severity === "critical" ? "#dc2626" : severity === "warning" ? "#f59e0b" : "#22c55e";
  
  let title = "";
  let text = "";
  
  switch (payload.eventType) {
    case "cpk_alert":
      title = "⚠️ CPK Alert";
      text = `*Product:* ${payload.data.productCode}\n*Station:* ${payload.data.stationName}\n*CPK:* ${payload.data.cpk?.toFixed(3)} (Threshold: ${payload.data.cpkThreshold})`;
      break;
    case "rule_violation":
      title = "🚨 Rule Violation";
      text = `*Product:* ${payload.data.productCode}\n*Station:* ${payload.data.stationName}\n*Rule:* ${payload.data.ruleViolation}`;
      break;
    case "analysis_complete":
      title = "✅ Analysis Complete";
      text = `*Product:* ${payload.data.productCode}\n*Station:* ${payload.data.stationName}\n*CPK:* ${payload.data.cpk?.toFixed(3)}`;
      break;
  }
  
  return {
    attachments: [
      {
        color,
        title,
        text,
        footer: "SPC/CPK Calculator",
        ts: Math.floor(new Date(payload.timestamp).getTime() / 1000),
      },
    ],
  };
}

// Format payload for Microsoft Teams
function formatTeamsPayload(payload: WebhookPayload): object {
  const severity = payload.data.severity || "info";
  const themeColor = severity === "critical" ? "dc2626" : severity === "warning" ? "f59e0b" : "22c55e";
  
  let title = "";
  let facts: Array<{ name: string; value: string }> = [];
  
  switch (payload.eventType) {
    case "cpk_alert":
      title = "⚠️ CPK Alert";
      facts = [
        { name: "Product", value: payload.data.productCode || "N/A" },
        { name: "Station", value: payload.data.stationName || "N/A" },
        { name: "CPK", value: payload.data.cpk?.toFixed(3) || "N/A" },
        { name: "Threshold", value: String(payload.data.cpkThreshold) || "N/A" },
      ];
      break;
    case "rule_violation":
      title = "🚨 Rule Violation";
      facts = [
        { name: "Product", value: payload.data.productCode || "N/A" },
        { name: "Station", value: payload.data.stationName || "N/A" },
        { name: "Rule", value: payload.data.ruleViolation || "N/A" },
      ];
      break;
    case "analysis_complete":
      title = "✅ Analysis Complete";
      facts = [
        { name: "Product", value: payload.data.productCode || "N/A" },
        { name: "Station", value: payload.data.stationName || "N/A" },
        { name: "CPK", value: payload.data.cpk?.toFixed(3) || "N/A" },
      ];
      break;
  }
  
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    themeColor,
    summary: title,
    sections: [
      {
        activityTitle: title,
        facts,
        markdown: true,
      },
    ],
  };
}

// Send webhook notification
export async function sendWebhook(
  webhook: Webhook,
  payload: WebhookPayload
): Promise<{ success: boolean; error?: string }> {
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
    if (webhook.headers) {
      try {
        const customHeaders = JSON.parse(webhook.headers);
        Object.assign(headers, customHeaders);
      } catch {
        // Ignore invalid headers
      }
    }
    
    // Format payload based on webhook type
    switch (webhook.webhookType) {
      case "slack":
        body = JSON.stringify(formatSlackPayload(payload));
        break;
      case "teams":
        body = JSON.stringify(formatTeamsPayload(payload));
        break;
      default:
        body = JSON.stringify(payload);
    }
    
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body,
    });
    
    const responseBody = await response.text();
    
    // Log the webhook delivery
    await db.insert(webhookLogs).values({
      webhookId: webhook.id,
      eventType: payload.eventType,
      payload: body,
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000), // Limit response body size
      success: response.ok ? 1 : 0,
      errorMessage: response.ok ? null : `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
    });
    
    // Update webhook stats
    await db
      .update(webhooks)
      .set({
        triggerCount: webhook.triggerCount + 1,
        lastTriggeredAt: new Date(),
        lastError: response.ok ? null : `HTTP ${response.status}`,
      })
      .where(eq(webhooks.id, webhook.id));
    
    return { success: response.ok, error: response.ok ? undefined : `HTTP ${response.status}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Log the failed delivery
    await db.insert(webhookLogs).values({
      webhookId: webhook.id,
      eventType: payload.eventType,
      payload: JSON.stringify(payload),
      success: 0,
      errorMessage,
    });
    
    // Update webhook with error
    await db
      .update(webhooks)
      .set({
        triggerCount: webhook.triggerCount + 1,
        lastTriggeredAt: new Date(),
        lastError: errorMessage,
      })
      .where(eq(webhooks.id, webhook.id));
    
    return { success: false, error: errorMessage };
  }
}

// Trigger webhooks for a specific event
export async function triggerWebhooks(
  eventType: WebhookEventType,
  data: WebhookPayload["data"]
): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    return { sent: 0, failed: 0 };
  }
  
  // Find all active webhooks that subscribe to this event
  const activeWebhooks = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.isActive, 1),
        like(webhooks.events, `%${eventType}%`)
      )
    );
  
  const payload: WebhookPayload = {
    eventType,
    timestamp: new Date().toISOString(),
    data,
  };
  
  let sent = 0;
  let failed = 0;
  
  // Send webhooks in parallel
  const results = await Promise.all(
    activeWebhooks.map((webhook: Webhook) => sendWebhook(webhook, payload))
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

// Test a webhook
export async function testWebhook(webhookId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }
  
  const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId));
  
  if (!webhook) {
    return { success: false, error: "Webhook not found" };
  }
  
  const testPayload: WebhookPayload = {
    eventType: "cpk_alert",
    timestamp: new Date().toISOString(),
    data: {
      productCode: "TEST-PRODUCT",
      stationName: "TEST-STATION",
      cpk: 1.25,
      cpkThreshold: 1.33,
      message: "This is a test webhook notification",
      severity: "info",
    },
  };
  
  return sendWebhook(webhook, testPayload);
}
