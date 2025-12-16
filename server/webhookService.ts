import { getDb } from "./db";
import { webhooks, webhookLogs, type Webhook } from "../drizzle/schema";
import { eq, and, like, lte, isNotNull } from "drizzle-orm";

export type WebhookEventType = "cpk_alert" | "rule_violation" | "analysis_complete" | "license_expiring" | "license_expired" | "license_revoked";

// Retry configuration
const RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // 1min, 5min, 15min, 1hr, 2hr
const MAX_RETRIES = 5;

// Webhook limits to prevent system hang
const WEBHOOK_TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS || '10000'); // 10 seconds default
const WEBHOOK_MAX_PAYLOAD_SIZE = parseInt(process.env.WEBHOOK_MAX_PAYLOAD_SIZE || '102400'); // 100KB default
const WEBHOOK_MAX_CONCURRENT = parseInt(process.env.WEBHOOK_MAX_CONCURRENT || '10'); // Max concurrent requests

let activeWebhookRequests = 0;

// Helper to create AbortController with timeout
function createTimeoutController(timeoutMs: number): { controller: AbortController; timeoutId: NodeJS.Timeout } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Calculate next retry time using exponential backoff
 */
function calculateNextRetry(retryCount: number): Date {
  const delaySeconds = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)];
  return new Date(Date.now() + delaySeconds * 1000);
}

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
    case "license_expiring":
      title = "⏰ License Sắp Hết Hạn";
      text = `*Công ty:* ${payload.data.companyName}\n*License:* ${payload.data.licenseType}\n*Hết hạn:* ${payload.data.expiresAt}\n*Còn lại:* ${payload.data.daysLeft} ngày`;
      break;
    case "license_expired":
      title = "🚨 License Đã Hết Hạn";
      text = `*Công ty:* ${payload.data.companyName}\n*License:* ${payload.data.licenseType}\n*Hết hạn:* ${payload.data.expiresAt}`;
      break;
    case "license_revoked":
      title = "⛔ License Bị Thu Hồi";
      text = `*Công ty:* ${payload.data.companyName}\n*License:* ${payload.data.licenseKey}\n*Lý do:* ${payload.data.reason || 'Không xác định'}`;
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
    case "license_expiring":
      title = "⏰ License Sắp Hết Hạn";
      facts = [
        { name: "Công ty", value: String(payload.data.companyName) || "N/A" },
        { name: "Loại", value: String(payload.data.licenseType) || "N/A" },
        { name: "Hết hạn", value: String(payload.data.expiresAt) || "N/A" },
        { name: "Còn lại", value: `${payload.data.daysLeft} ngày` },
      ];
      break;
    case "license_expired":
      title = "🚨 License Đã Hết Hạn";
      facts = [
        { name: "Công ty", value: String(payload.data.companyName) || "N/A" },
        { name: "Loại", value: String(payload.data.licenseType) || "N/A" },
        { name: "Hết hạn", value: String(payload.data.expiresAt) || "N/A" },
      ];
      break;
    case "license_revoked":
      title = "⛔ License Bị Thu Hồi";
      facts = [
        { name: "Công ty", value: String(payload.data.companyName) || "N/A" },
        { name: "License Key", value: String(payload.data.licenseKey) || "N/A" },
        { name: "Lý do", value: String(payload.data.reason) || "Không xác định" },
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
    
    // Check concurrent limit
    if (activeWebhookRequests >= WEBHOOK_MAX_CONCURRENT) {
      console.log('[Webhook] Max concurrent requests reached, queuing...');
      // Wait a bit and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Check payload size
    if (body.length > WEBHOOK_MAX_PAYLOAD_SIZE) {
      throw new Error(`Payload too large: ${body.length} bytes (max: ${WEBHOOK_MAX_PAYLOAD_SIZE})`);
    }

    activeWebhookRequests++;
    const { controller, timeoutId } = createTimeoutController(WEBHOOK_TIMEOUT_MS);
    
    let response: Response;
    try {
      response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      activeWebhookRequests--;
    }
    
    const responseBody = await response.text();
    
    // Log the webhook delivery
    const logEntry = {
      webhookId: webhook.id,
      eventType: payload.eventType,
      payload: body,
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 1000), // Limit response body size
      success: response.ok ? 1 : 0,
      errorMessage: response.ok ? null : `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
      retryCount: 0,
      maxRetries: 5,
      retryStatus: response.ok ? "none" : "pending",
      nextRetryAt: response.ok ? null : calculateNextRetry(0),
    };
    await db.insert(webhookLogs).values(logEntry);
    
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
    
    // Log the failed delivery with retry info
    await db.insert(webhookLogs).values({
      webhookId: webhook.id,
      eventType: payload.eventType,
      payload: JSON.stringify(payload),
      success: 0,
      errorMessage,
      retryCount: 0,
      maxRetries: 5,
      retryStatus: "pending",
      nextRetryAt: calculateNextRetry(0),
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


/**
 * Retry a single failed webhook log entry
 */
async function retryWebhookLog(
  logEntry: typeof webhookLogs.$inferSelect
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  // Get the webhook
  const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, logEntry.webhookId));
  if (!webhook) {
    // Mark as exhausted if webhook no longer exists
    await db.update(webhookLogs)
      .set({ retryStatus: "exhausted", errorMessage: "Webhook deleted" })
      .where(eq(webhookLogs.id, logEntry.id));
    return { success: false, error: "Webhook not found" };
  }

  if (!webhook.isActive) {
    // Mark as exhausted if webhook is disabled
    await db.update(webhookLogs)
      .set({ retryStatus: "exhausted", errorMessage: "Webhook disabled" })
      .where(eq(webhookLogs.id, logEntry.id));
    return { success: false, error: "Webhook disabled" };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (webhook.headers) {
      try {
        const customHeaders = JSON.parse(webhook.headers);
        Object.assign(headers, customHeaders);
      } catch {
        // Ignore invalid headers
      }
    }

    // Add timeout for retry requests
    activeWebhookRequests++;
    const { controller, timeoutId } = createTimeoutController(WEBHOOK_TIMEOUT_MS);
    
    let response: Response;
    try {
      response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: logEntry.payload,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
      activeWebhookRequests--;
    }

    const responseBody = await response.text();
    const newRetryCount = logEntry.retryCount + 1;

    if (response.ok) {
      // Success! Update log entry
      await db.update(webhookLogs)
        .set({
          success: 1,
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          retryCount: newRetryCount,
          lastRetryAt: new Date(),
          retryStatus: "none",
          nextRetryAt: null,
          errorMessage: null,
        })
        .where(eq(webhookLogs.id, logEntry.id));

      return { success: true };
    } else {
      // Failed again
      const isExhausted = newRetryCount >= logEntry.maxRetries;
      await db.update(webhookLogs)
        .set({
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          retryCount: newRetryCount,
          lastRetryAt: new Date(),
          retryStatus: isExhausted ? "exhausted" : "pending",
          nextRetryAt: isExhausted ? null : calculateNextRetry(newRetryCount),
          errorMessage: `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
        })
        .where(eq(webhookLogs.id, logEntry.id));

      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const newRetryCount = logEntry.retryCount + 1;
    const isExhausted = newRetryCount >= logEntry.maxRetries;

    await db.update(webhookLogs)
      .set({
        retryCount: newRetryCount,
        lastRetryAt: new Date(),
        retryStatus: isExhausted ? "exhausted" : "pending",
        nextRetryAt: isExhausted ? null : calculateNextRetry(newRetryCount),
        errorMessage,
      })
      .where(eq(webhookLogs.id, logEntry.id));

    return { success: false, error: errorMessage };
  }
}

/**
 * Process all pending webhook retries
 * Should be called periodically (e.g., every minute)
 */
export async function processWebhookRetries(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const db = await getDb();
  if (!db) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const now = new Date();

  // Find all pending retries that are due
  const pendingRetries = await db.select()
    .from(webhookLogs)
    .where(
      and(
        eq(webhookLogs.retryStatus, "pending"),
        lte(webhookLogs.nextRetryAt, now),
        isNotNull(webhookLogs.nextRetryAt)
      )
    )
    .limit(50); // Process max 50 at a time

  let succeeded = 0;
  let failed = 0;

  for (const logEntry of pendingRetries) {
    const result = await retryWebhookLog(logEntry);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }

  console.log(`[WebhookRetry] Processed ${pendingRetries.length} retries: ${succeeded} succeeded, ${failed} failed`);

  return {
    processed: pendingRetries.length,
    succeeded,
    failed,
  };
}

/**
 * Get retry statistics
 */
export async function getRetryStats(): Promise<{
  pending: number;
  exhausted: number;
  totalRetries: number;
}> {
  const db = await getDb();
  if (!db) {
    return { pending: 0, exhausted: 0, totalRetries: 0 };
  }

  const pendingCount = await db.select()
    .from(webhookLogs)
    .where(eq(webhookLogs.retryStatus, "pending"));

  const exhaustedCount = await db.select()
    .from(webhookLogs)
    .where(eq(webhookLogs.retryStatus, "exhausted"));

  return {
    pending: pendingCount.length,
    exhausted: exhaustedCount.length,
    totalRetries: pendingCount.reduce((sum, log) => sum + log.retryCount, 0),
  };
}

/**
 * Manually retry a specific webhook log
 */
export async function manualRetryWebhook(logId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  const [logEntry] = await db.select().from(webhookLogs).where(eq(webhookLogs.id, logId));
  if (!logEntry) {
    return { success: false, error: "Log entry not found" };
  }

  if (logEntry.success === 1) {
    return { success: false, error: "Webhook already succeeded" };
  }

  // Reset retry count for manual retry
  await db.update(webhookLogs)
    .set({
      retryStatus: "pending",
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      nextRetryAt: new Date(), // Retry immediately
    })
    .where(eq(webhookLogs.id, logId));

  return retryWebhookLog({ ...logEntry, retryCount: -1, maxRetries: MAX_RETRIES });
}
