import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  machineApiKeys, 
  machineDataLogs, 
  machineIntegrationConfigs,
  machineInspectionData,
  machineMeasurementData,
  machineOeeData,
  machineWebhookConfigs,
  machineWebhookLogs,
  machineFieldMappings,
  machineRealtimeEvents,
  oeeAlertConfigs,
  oeeAlertHistory,
  oeeReportSchedules,
  oeeReportHistory,
  downtimeReasons,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import crypto from "crypto";

// Helper to generate secure API key
function generateApiKey(): string {
  return `mak_${crypto.randomBytes(24).toString("hex")}`;
}

// Helper to hash API key for storage
function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

// Validate API key and return key info
async function validateApiKey(apiKey: string) {
  const db = await getDb();
 if (!db) return;
  if (!db) return null;
  
  const apiKeyHash = hashApiKey(apiKey);
  const [keyInfo] = await db
    .select()
    .from(machineApiKeys)
    .where(and(
      eq(machineApiKeys.apiKeyHash, apiKeyHash),
      eq(machineApiKeys.isActive, 1)
    ))
    .limit(1);

  if (!keyInfo) {
    return null;
  }

  // Check expiration
  if (keyInfo.expiresAt && new Date(keyInfo.expiresAt) < new Date()) {
    return null;
  }

  // Update last used
  await db
    .update(machineApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(machineApiKeys.id, keyInfo.id));

  return keyInfo;
}

// Log API request
async function logRequest(
  apiKeyId: number,
  endpoint: string,
  method: string,
  requestBody: string | null,
  responseStatus: number,
  responseBody: string | null,
  processingTimeMs: number,
  ipAddress: string | null,
  userAgent: string | null,
  errorMessage: string | null
) {
  const db = await getDb();
 if (!db) return;
  if (!db) return;
  
  await db.insert(machineDataLogs).values({
    apiKeyId,
    endpoint,
    method,
    requestBody,
    responseStatus,
    responseBody,
    processingTimeMs,
    ipAddress,
    userAgent,
    errorMessage,
  });
}

// ==================== Field Mapping Helper ====================

// Get value from nested object using dot notation (e.g., "data.value")
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Apply transform to value
function applyTransform(
  value: unknown,
  transformType: string,
  transformValue: string | null
): unknown {
  if (value === undefined || value === null) return value;
  
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(numValue)) return value;
  
  const transformNum = transformValue ? parseFloat(transformValue) : 0;
  
  switch (transformType) {
    case 'multiply':
      return numValue * transformNum;
    case 'divide':
      return transformNum !== 0 ? numValue / transformNum : numValue;
    case 'add':
      return numValue + transformNum;
    case 'subtract':
      return numValue - transformNum;
    case 'direct':
    default:
      return value;
  }
}

// Apply field mappings to transform machine data
async function applyFieldMappings(
  apiKeyId: number,
  machineType: string,
  targetTable: 'measurements' | 'inspection_data' | 'oee_records',
  rawData: Record<string, unknown>
): Promise<{ success: boolean; transformedData: Record<string, unknown>; mappingsApplied: number }> {
  const db = await getDb();
  if (!db) return { success: false, transformedData: rawData, mappingsApplied: 0 };
  
  // Get active mappings for this API key or machine type
  const mappings = await db
    .select()
    .from(machineFieldMappings)
    .where(and(
      eq(machineFieldMappings.isActive, 1),
      eq(machineFieldMappings.targetTable, targetTable),
      sql`(${machineFieldMappings.apiKeyId} = ${apiKeyId} OR ${machineFieldMappings.apiKeyId} IS NULL)`,
      sql`(${machineFieldMappings.machineType} = ${machineType} OR ${machineFieldMappings.machineType} IS NULL)`
    ));

  if (mappings.length === 0) {
    return { success: true, transformedData: rawData, mappingsApplied: 0 };
  }

  const transformedData: Record<string, unknown> = { ...rawData };
  let mappingsApplied = 0;

  for (const mapping of mappings) {
    const sourceValue = getNestedValue(rawData, mapping.sourceField);
    
    if (sourceValue !== undefined) {
      const transformedValue = applyTransform(
        sourceValue,
        mapping.transformType,
        mapping.transformValue
      );
      transformedData[mapping.targetField] = transformedValue;
      mappingsApplied++;
    } else if (mapping.isRequired && mapping.defaultValue) {
      transformedData[mapping.targetField] = mapping.defaultValue;
      mappingsApplied++;
    }
  }

  return { success: true, transformedData, mappingsApplied };
}

// Log field mapping result
async function logMappingResult(
  apiKeyId: number,
  targetTable: string,
  mappingsApplied: number,
  success: boolean,
  errorMessage?: string
) {
  const db = await getDb();
 if (!db) return;
  if (!db) return;
  
  await db.insert(machineRealtimeEvents).values({
    eventType: 'status',
    apiKeyId,
    eventData: JSON.stringify({
      type: 'field_mapping',
      targetTable,
      mappingsApplied,
      success,
      errorMessage,
    }),
    severity: success ? 'info' : 'warning',
  });
}

// ==================== Webhook Trigger Helpers ====================

// Check and trigger webhooks for OEE low
async function checkAndTriggerOeeWebhooks(
  apiKeyId: number,
  machineId: number | null,
  machineName: string,
  oeeValue: number,
  oeeData: Record<string, unknown>
) {
  const db = await getDb();
 if (!db) return;
  if (!db) return;
  
  // Get webhooks configured for OEE low or all
  const webhooks = await db.select().from(machineWebhookConfigs)
    .where(and(
      eq(machineWebhookConfigs.isActive, 1),
      sql`${machineWebhookConfigs.triggerType} IN ('oee_low', 'all')`
    ));

  for (const webhook of webhooks) {
    // Check if machine is in the configured list
    const machineIds = webhook.machineIds ? JSON.parse(webhook.machineIds) : null;
    if (machineIds && machineId && !machineIds.includes(machineId)) continue;

    // Check if OEE is below threshold
    const threshold = webhook.oeeThreshold ? parseFloat(webhook.oeeThreshold) : 85;
    if (oeeValue >= threshold) continue;

    const payload = {
      type: 'oee_low',
      timestamp: new Date().toISOString(),
      machineId,
      machineName,
      oeeValue: oeeValue.toFixed(2),
      threshold,
      difference: (threshold - oeeValue).toFixed(2),
      details: oeeData,
    };

    // Create realtime event
    await db.insert(machineRealtimeEvents).values({
      eventType: 'alert',
      machineId,
      machineName,
      apiKeyId,
      eventData: JSON.stringify(payload),
      severity: oeeValue < threshold - 20 ? 'critical' : 'warning',
    });

    // Trigger webhook
    triggerWebhook(webhook, payload, 'oee_low').catch(console.error);
  }
}

// Check and trigger webhooks for measurement out of spec
async function checkAndTriggerMeasurementWebhooks(
  apiKeyId: number,
  machineId: number | null,
  machineName: string,
  outOfSpecMeasurements: Array<{
    parameterName: string;
    measuredValue: number;
    lsl?: number;
    usl?: number;
  }>
) {
  if (outOfSpecMeasurements.length === 0) return;

  const db = await getDb();
 if (!db) return;
  if (!db) return;
  
  // Get webhooks configured for measurement out of spec or all
  const webhooks = await db.select().from(machineWebhookConfigs)
    .where(and(
      eq(machineWebhookConfigs.isActive, 1),
      sql`${machineWebhookConfigs.triggerType} IN ('measurement_out_of_spec', 'all')`
    ));

  for (const webhook of webhooks) {
    // Check if machine is in the configured list
    const machineIds = webhook.machineIds ? JSON.parse(webhook.machineIds) : null;
    if (machineIds && machineId && !machineIds.includes(machineId)) continue;

    const payload = {
      type: 'measurement_out_of_spec',
      timestamp: new Date().toISOString(),
      machineId,
      machineName,
      outOfSpecCount: outOfSpecMeasurements.length,
      measurements: outOfSpecMeasurements,
    };

    // Create realtime event
    await db.insert(machineRealtimeEvents).values({
      eventType: 'alert',
      machineId,
      machineName,
      apiKeyId,
      eventData: JSON.stringify(payload),
      severity: outOfSpecMeasurements.length > 5 ? 'critical' : 'error',
    });

    // Trigger webhook
    triggerWebhook(webhook, payload, 'measurement_out_of_spec').catch(console.error);
  }
}

// Trigger webhook with retry logic
async function triggerWebhook(
  webhook: typeof machineWebhookConfigs.$inferSelect,
  payload: Record<string, unknown>,
  triggerType: string,
  attempt = 1
) {
  const db = await getDb();
 if (!db) return;
  if (!db) return;
  
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (webhook.webhookSecret) {
      headers["X-Webhook-Secret"] = webhook.webhookSecret;
    }
    if (webhook.headers) {
      Object.assign(headers, JSON.parse(webhook.headers));
    }

    const startTime = Date.now();
    const response = await fetch(webhook.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();

    await db.insert(machineWebhookLogs).values({
      webhookConfigId: webhook.id,
      triggerType,
      requestPayload: JSON.stringify(payload),
      responseStatus: response.status,
      responseBody: responseBody.substring(0, 5000),
      responseTime,
      attempt,
      status: response.ok ? "success" : "failed",
      completedAt: new Date(),
    });

    // Retry on failure
    if (!response.ok && attempt < webhook.retryCount) {
      setTimeout(() => {
        triggerWebhook(webhook, payload, triggerType, attempt + 1).catch(console.error);
      }, webhook.retryDelaySeconds * 1000);
    }
  } catch (error) {
    await db.insert(machineWebhookLogs).values({
      webhookConfigId: webhook.id,
      triggerType,
      requestPayload: JSON.stringify(payload),
      attempt,
      status: attempt < webhook.retryCount ? "retrying" : "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      completedAt: new Date(),
    });

    // Retry on error
    if (attempt < webhook.retryCount) {
      setTimeout(() => {
        triggerWebhook(webhook, payload, triggerType, attempt + 1).catch(console.error);
      }, webhook.retryDelaySeconds * 1000);
    }
  }
}

export const machineIntegrationRouter = router({
  // ==================== OEE Widget ====================
  
  getLatestOee: publicProcedure
    .input(z.object({ machineId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const conditions = [gte(machineOeeData.recordedAt, todayStart)];
      if (input.machineId) {
        conditions.push(eq(machineOeeData.machineId, input.machineId));
      }

      const [result] = await db
        .select({
          oee: sql<number>`AVG(${machineOeeData.oee})`,
          availability: sql<number>`AVG(${machineOeeData.availability})`,
          performance: sql<number>`AVG(${machineOeeData.performance})`,
          quality: sql<number>`AVG(${machineOeeData.quality})`,
          machineId: machineOeeData.machineId,
        })
        .from(machineOeeData)
        .where(and(...conditions));

      if (!result || result.oee === null) {
        // Return mock data if no real data
        return {
          oee: 0,
          availability: 0,
          performance: 0,
          quality: 0,
          machineName: input.machineId ? `Machine ${input.machineId}` : 'Tổng hợp',
        };
      }

      return {
        oee: Number(result.oee) || 0,
        availability: Number(result.availability) || 0,
        performance: Number(result.performance) || 0,
        quality: Number(result.quality) || 0,
        machineName: result.machineId ? `Machine ${result.machineId}` : 'Tổng hợp',
      };
    }),

  // ==================== Dashboard Overview ====================
  
  getDashboardOverview: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Total connected machines
      const [machineCount] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${machineApiKeys.machineId})` })
        .from(machineApiKeys)
        .where(eq(machineApiKeys.isActive, 1));

      // Active API keys
      const [apiKeyCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(machineApiKeys)
        .where(eq(machineApiKeys.isActive, 1));

      // OEE averages
      const [oeeToday] = await db
        .select({ avg: sql<number>`AVG(${machineOeeData.oee})` })
        .from(machineOeeData)
        .where(gte(machineOeeData.recordedAt, todayStart));

      const [oeeWeek] = await db
        .select({ avg: sql<number>`AVG(${machineOeeData.oee})` })
        .from(machineOeeData)
        .where(gte(machineOeeData.recordedAt, weekStart));

      const [oeeMonth] = await db
        .select({ avg: sql<number>`AVG(${machineOeeData.oee})` })
        .from(machineOeeData)
        .where(gte(machineOeeData.recordedAt, monthStart));

      // Pending alerts (not acknowledged or not resolved)
      const [pendingAlerts] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(oeeAlertHistory)
        .where(and(
          eq(oeeAlertHistory.resolved, 0)
        ));

      // Reports sent this week
      const [reportsSent] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(oeeReportHistory)
        .where(and(
          gte(oeeReportHistory.createdAt, weekStart),
          eq(oeeReportHistory.emailSent, 1)
        ));

      // OEE trend last 7 days
      const oeeTrend = await db
        .select({
          date: sql<string>`DATE(${machineOeeData.recordedAt})`,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(gte(machineOeeData.recordedAt, weekStart))
        .groupBy(sql`DATE(${machineOeeData.recordedAt})`)
        .orderBy(sql`DATE(${machineOeeData.recordedAt})`);

      // Machines with lowest OEE today
      const lowestOeeMachines = await db
        .select({
          machineId: machineOeeData.machineId,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(gte(machineOeeData.recordedAt, todayStart))
        .groupBy(machineOeeData.machineId)
        .orderBy(sql`AVG(${machineOeeData.oee})`)
        .limit(5);

      // Get machine names
      const machineIds = lowestOeeMachines.map(m => m.machineId).filter(Boolean) as number[];
      let machineNames: Map<number, string> = new Map();
      if (machineIds.length > 0) {
        const names = await db
          .select({ machineId: machineApiKeys.machineId, name: machineApiKeys.name })
          .from(machineApiKeys)
          .where(sql`${machineApiKeys.machineId} IN (${sql.raw(machineIds.join(','))})`);
        machineNames = new Map(names.map(n => [n.machineId!, n.name]));
      }

      // Recent events
      const recentEvents = await db
        .select()
        .from(machineRealtimeEvents)
        .orderBy(desc(machineRealtimeEvents.createdAt))
        .limit(10);

      // Inspection stats today
      const [inspectionStats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          passed: sql<number>`SUM(CASE WHEN ${machineInspectionData.inspectionResult} = 'pass' THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN ${machineInspectionData.inspectionResult} = 'fail' THEN 1 ELSE 0 END)`,
        })
        .from(machineInspectionData)
        .where(gte(machineInspectionData.inspectedAt, todayStart));

      return {
        totalMachines: machineCount?.count || 0,
        activeApiKeys: apiKeyCount?.count || 0,
        oee: {
          today: oeeToday?.avg || 0,
          week: oeeWeek?.avg || 0,
          month: oeeMonth?.avg || 0,
        },
        pendingAlerts: pendingAlerts?.count || 0,
        reportsSentThisWeek: reportsSent?.count || 0,
        oeeTrend: oeeTrend.map(t => ({
          date: t.date,
          avgOee: t.avgOee || 0,
          recordCount: t.recordCount || 0,
        })),
        lowestOeeMachines: lowestOeeMachines.map(m => ({
          machineId: m.machineId,
          machineName: machineNames.get(m.machineId!) || `Machine ${m.machineId}`,
          avgOee: m.avgOee || 0,
          recordCount: m.recordCount || 0,
        })),
        recentEvents: recentEvents.map(e => ({
          id: e.id,
          eventType: e.eventType,
          machineName: e.machineName,
          severity: e.severity,
          createdAt: e.createdAt,
        })),
        inspection: {
          total: inspectionStats?.total || 0,
          passed: inspectionStats?.passed || 0,
          failed: inspectionStats?.failed || 0,
          passRate: inspectionStats?.total ? ((inspectionStats.passed || 0) / inspectionStats.total * 100) : 0,
        },
      };
    }),

  // Test send OEE alert email
  testSendOeeAlert: protectedProcedure
    .input(z.object({
      alertConfigId: z.number(),
      testEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      // Get alert config
      const [config] = await db.select().from(oeeAlertConfigs).where(eq(oeeAlertConfigs.id, input.alertConfigId));
      if (!config) {
        return { success: false, message: 'Alert config not found' };
      }

      // Import sendEmail
      const { sendEmail } = await import('../emailService');
      
      // Generate test email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ TEST: Cảnh báo OEE</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${config.name}</p>
          </div>
          <div style="padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="margin: 0 0 15px 0; color: #1e293b;">🔔 Đây là email test</h2>
              <p>Email này được gửi để kiểm tra cấu hình cảnh báo OEE.</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Tên cảnh báo:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${config.name}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Ngưỡng OEE:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${config.oeeThreshold}%</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Số ngày liên tiếp:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${config.consecutiveDays} ngày</td></tr>
              </table>
            </div>
          </div>
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">Email test từ hệ thống SPC/CPK Calculator</p>
          </div>
        </div>
      `;

      try {
        const result = await sendEmail(
          input.testEmail,
          `[TEST] Cảnh báo OEE: ${config.name}`,
          emailHtml
        );
        return { success: result.success, message: result.success ? 'Email sent successfully' : 'Failed to send email' };
      } catch (error) {
        return { success: false, message: String(error) };
      }
    }),

  // Test send OEE report email
  testSendOeeReport: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      testEmail: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      // Get report schedule
      const [schedule] = await db.select().from(oeeReportSchedules).where(eq(oeeReportSchedules.id, input.scheduleId));
      if (!schedule) {
        return { success: false, message: 'Report schedule not found' };
      }

      // Import sendEmail
      const { sendEmail } = await import('../emailService');
      
      // Generate test email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📊 TEST: Báo cáo OEE</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${schedule.name}</p>
          </div>
          <div style="padding: 20px;">
            <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="margin: 0 0 15px 0; color: #1e293b;">🔔 Đây là email test</h2>
              <p>Email này được gửi để kiểm tra cấu hình báo cáo OEE định kỳ.</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Tên báo cáo:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${schedule.name}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Tần suất:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${schedule.frequency === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}</td></tr>
                <tr><td style="padding: 8px; border: 1px solid #e2e8f0;"><strong>Giờ gửi:</strong></td><td style="padding: 8px; border: 1px solid #e2e8f0;">${schedule.hour}:00</td></tr>
              </table>
            </div>
          </div>
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p style="margin: 0;">Email test từ hệ thống SPC/CPK Calculator</p>
          </div>
        </div>
      `;

      try {
        const result = await sendEmail(
          input.testEmail,
          `[TEST] Báo cáo OEE: ${schedule.name}`,
          emailHtml
        );
        return { success: result.success, message: result.success ? 'Email sent successfully' : 'Failed to send email' };
      } catch (error) {
        return { success: false, message: String(error) };
      }
    }),

  // Get OEE by shift comparison
  getOeeByShift: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      period: z.enum(['week', 'month']).default('week'),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      const now = new Date();
      const startDate = input.period === 'week'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const conditions = [gte(machineOeeData.recordedAt, startDate)];
      if (input.machineId) {
        conditions.push(eq(machineOeeData.machineId, input.machineId));
      }

      // Get OEE by shift (morning: 6-14, afternoon: 14-22, night: 22-6)
      const shiftData = await db
        .select({
          shift: sql<string>`CASE 
            WHEN HOUR(${machineOeeData.recordedAt}) >= 6 AND HOUR(${machineOeeData.recordedAt}) < 14 THEN 'morning'
            WHEN HOUR(${machineOeeData.recordedAt}) >= 14 AND HOUR(${machineOeeData.recordedAt}) < 22 THEN 'afternoon'
            ELSE 'night'
          END`,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          avgAvailability: sql<number>`AVG(${machineOeeData.availability})`,
          avgPerformance: sql<number>`AVG(${machineOeeData.performance})`,
          avgQuality: sql<number>`AVG(${machineOeeData.quality})`,
          recordCount: sql<number>`COUNT(*)`,
          totalDowntime: sql<number>`SUM(COALESCE(${machineOeeData.downtime}, 0))`,
        })
        .from(machineOeeData)
        .where(and(...conditions))
        .groupBy(sql`CASE 
          WHEN HOUR(${machineOeeData.recordedAt}) >= 6 AND HOUR(${machineOeeData.recordedAt}) < 14 THEN 'morning'
          WHEN HOUR(${machineOeeData.recordedAt}) >= 14 AND HOUR(${machineOeeData.recordedAt}) < 22 THEN 'afternoon'
          ELSE 'night'
        END`);

      // Get OEE trend by shift and date
      const trendData = await db
        .select({
          date: sql<string>`DATE(${machineOeeData.recordedAt})`,
          shift: sql<string>`CASE 
            WHEN HOUR(${machineOeeData.recordedAt}) >= 6 AND HOUR(${machineOeeData.recordedAt}) < 14 THEN 'morning'
            WHEN HOUR(${machineOeeData.recordedAt}) >= 14 AND HOUR(${machineOeeData.recordedAt}) < 22 THEN 'afternoon'
            ELSE 'night'
          END`,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
        })
        .from(machineOeeData)
        .where(and(...conditions))
        .groupBy(
          sql`DATE(${machineOeeData.recordedAt})`,
          sql`CASE 
            WHEN HOUR(${machineOeeData.recordedAt}) >= 6 AND HOUR(${machineOeeData.recordedAt}) < 14 THEN 'morning'
            WHEN HOUR(${machineOeeData.recordedAt}) >= 14 AND HOUR(${machineOeeData.recordedAt}) < 22 THEN 'afternoon'
            ELSE 'night'
          END`
        )
        .orderBy(sql`DATE(${machineOeeData.recordedAt})`);

      // Format shift data
      const shiftMap = new Map(shiftData.map(s => [s.shift, s]));
      const shifts = ['morning', 'afternoon', 'night'].map(shift => {
        const data = shiftMap.get(shift);
        return {
          shift,
          shiftName: shift === 'morning' ? 'Ca Sáng (6:00-14:00)' 
            : shift === 'afternoon' ? 'Ca Chiều (14:00-22:00)' 
            : 'Ca Đêm (22:00-6:00)',
          avgOee: data?.avgOee || 0,
          avgAvailability: data?.avgAvailability || 0,
          avgPerformance: data?.avgPerformance || 0,
          avgQuality: data?.avgQuality || 0,
          recordCount: data?.recordCount || 0,
          totalDowntime: data?.totalDowntime || 0,
        };
      });

      // Format trend data by date
      const dateMap = new Map<string, { date: string; morning: number; afternoon: number; night: number }>();
      for (const row of trendData) {
        if (!dateMap.has(row.date)) {
          dateMap.set(row.date, { date: row.date, morning: 0, afternoon: 0, night: 0 });
        }
        const entry = dateMap.get(row.date)!;
        if (row.shift === 'morning') entry.morning = row.avgOee || 0;
        else if (row.shift === 'afternoon') entry.afternoon = row.avgOee || 0;
        else entry.night = row.avgOee || 0;
      }

      // Find best and worst shift
      const sortedShifts = [...shifts].sort((a, b) => b.avgOee - a.avgOee);
      const bestShift = sortedShifts[0];
      const worstShift = sortedShifts[sortedShifts.length - 1];

      return {
        shifts,
        trend: Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        bestShift: bestShift.avgOee > 0 ? bestShift : null,
        worstShift: worstShift.avgOee > 0 ? worstShift : null,
        oeeGap: bestShift.avgOee > 0 && worstShift.avgOee > 0 
          ? bestShift.avgOee - worstShift.avgOee 
          : 0,
      };
    }),

  // Generate OEE Report Data for PDF export
  generateOeeReportData: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(30),
      machineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const now = new Date();
      const startDate = new Date(now.getTime() - input.days * 24 * 60 * 60 * 1000);

      const conditions = [gte(machineOeeData.recordedAt, startDate)];
      if (input.machineId) {
        conditions.push(eq(machineOeeData.machineId, input.machineId));
      }

      // Summary stats
      const [summary] = await db
        .select({
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          avgAvailability: sql<number>`AVG(${machineOeeData.availability})`,
          avgPerformance: sql<number>`AVG(${machineOeeData.performance})`,
          avgQuality: sql<number>`AVG(${machineOeeData.quality})`,
          totalRecords: sql<number>`COUNT(*)`,
          minOee: sql<number>`MIN(${machineOeeData.oee})`,
          maxOee: sql<number>`MAX(${machineOeeData.oee})`,
        })
        .from(machineOeeData)
        .where(and(...conditions));

      // Daily trend
      const dailyTrend = await db
        .select({
          date: sql<string>`DATE(${machineOeeData.recordedAt})`,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          avgAvailability: sql<number>`AVG(${machineOeeData.availability})`,
          avgPerformance: sql<number>`AVG(${machineOeeData.performance})`,
          avgQuality: sql<number>`AVG(${machineOeeData.quality})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(and(...conditions))
        .groupBy(sql`DATE(${machineOeeData.recordedAt})`)
        .orderBy(sql`DATE(${machineOeeData.recordedAt})`);

      // Machine comparison
      const machineComparison = await db
        .select({
          machineId: machineOeeData.machineId,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          avgAvailability: sql<number>`AVG(${machineOeeData.availability})`,
          avgPerformance: sql<number>`AVG(${machineOeeData.performance})`,
          avgQuality: sql<number>`AVG(${machineOeeData.quality})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(and(...conditions))
        .groupBy(machineOeeData.machineId)
        .orderBy(desc(sql`AVG(${machineOeeData.oee})`));

      // Shift comparison
      const shiftComparison = await db
        .select({
          shift: sql<string>`CASE 
            WHEN HOUR(${machineOeeData.recordedAt}) >= 6 AND HOUR(${machineOeeData.recordedAt}) < 14 THEN 'Ca Sáng'
            WHEN HOUR(${machineOeeData.recordedAt}) >= 14 AND HOUR(${machineOeeData.recordedAt}) < 22 THEN 'Ca Chiều'
            ELSE 'Ca Đêm'
          END`,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          avgAvailability: sql<number>`AVG(${machineOeeData.availability})`,
          avgPerformance: sql<number>`AVG(${machineOeeData.performance})`,
          avgQuality: sql<number>`AVG(${machineOeeData.quality})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(and(...conditions))
        .groupBy(sql`CASE 
          WHEN HOUR(${machineOeeData.recordedAt}) >= 6 AND HOUR(${machineOeeData.recordedAt}) < 14 THEN 'Ca Sáng'
          WHEN HOUR(${machineOeeData.recordedAt}) >= 14 AND HOUR(${machineOeeData.recordedAt}) < 22 THEN 'Ca Chiều'
          ELSE 'Ca Đêm'
        END`);

      return {
        reportDate: now.toISOString(),
        period: {
          from: startDate.toISOString(),
          to: now.toISOString(),
          days: input.days,
        },
        summary: {
          avgOee: summary?.avgOee || 0,
          avgAvailability: summary?.avgAvailability || 0,
          avgPerformance: summary?.avgPerformance || 0,
          avgQuality: summary?.avgQuality || 0,
          totalRecords: summary?.totalRecords || 0,
          minOee: summary?.minOee || 0,
          maxOee: summary?.maxOee || 0,
        },
        dailyTrend: dailyTrend.map(d => ({
          date: d.date,
          oee: Number(d.avgOee) || 0,
          availability: Number(d.avgAvailability) || 0,
          performance: Number(d.avgPerformance) || 0,
          quality: Number(d.avgQuality) || 0,
          records: d.recordCount,
        })),
        machineComparison: machineComparison.map(m => ({
          machineId: m.machineId,
          machineName: `Machine ${m.machineId}`,
          oee: Number(m.avgOee) || 0,
          availability: Number(m.avgAvailability) || 0,
          performance: Number(m.avgPerformance) || 0,
          quality: Number(m.avgQuality) || 0,
          records: m.recordCount,
        })),
        shiftComparison: shiftComparison.map(s => ({
          shift: s.shift,
          oee: Number(s.avgOee) || 0,
          availability: Number(s.avgAvailability) || 0,
          performance: Number(s.avgPerformance) || 0,
          quality: Number(s.avgQuality) || 0,
          records: s.recordCount,
        })),
      };
    }),

  // ==================== API Key Management ====================
  
  createApiKey: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      vendorName: z.string().min(1),
      machineType: z.string().min(1),
      machineId: z.number().optional(),
      productionLineId: z.number().optional(),
      permissions: z.array(z.string()).optional(),
      rateLimit: z.number().min(1).max(1000).default(100),
      expiresAt: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return;
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      const [result] = await db.insert(machineApiKeys).values({
        name: input.name,
        apiKey: apiKey.substring(0, 12) + "..." + apiKey.substring(apiKey.length - 4), // Store partial for display
        apiKeyHash,
        vendorName: input.vendorName,
        machineType: input.machineType,
        machineId: input.machineId,
        productionLineId: input.productionLineId,
        permissions: input.permissions ? JSON.stringify(input.permissions) : null,
        rateLimit: input.rateLimit,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdBy: ctx.user.id,
      });

      return {
        id: result.insertId,
        apiKey, // Return full key only once
        message: "API key created successfully. Save this key securely - it won't be shown again.",
      };
    }),

  listApiKeys: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return;
      const keys = await db
        .select()
        .from(machineApiKeys)
        .orderBy(desc(machineApiKeys.createdAt));
      return keys;
    }),

  updateApiKey: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      vendorName: z.string().optional(),
      machineType: z.string().optional(),
      machineId: z.number().nullable().optional(),
      productionLineId: z.number().nullable().optional(),
      permissions: z.array(z.string()).optional(),
      rateLimit: z.number().min(1).max(1000).optional(),
      isActive: z.number().min(0).max(1).optional(),
      expiresAt: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const { id, permissions, expiresAt, ...rest } = input;
      await db
        .update(machineApiKeys)
        .set({
          ...rest,
          permissions: permissions ? JSON.stringify(permissions) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : expiresAt === null ? null : undefined,
        })
        .where(eq(machineApiKeys.id, id));
      return { success: true };
    }),

  regenerateApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);

      await db
        .update(machineApiKeys)
        .set({
          apiKey: apiKey.substring(0, 12) + "..." + apiKey.substring(apiKey.length - 4),
          apiKeyHash,
        })
        .where(eq(machineApiKeys.id, input.id));

      return {
        apiKey,
        message: "API key regenerated. Save this key securely - it won't be shown again.",
      };
    }),

  deleteApiKey: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      await db.delete(machineApiKeys).where(eq(machineApiKeys.id, input.id));
      return { success: true };
    }),

  // ==================== API Logs ====================

  listApiLogs: protectedProcedure
    .input(z.object({
      apiKeyId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(1000).default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      let query = db.select().from(machineDataLogs);
      
      const conditions = [];
      if (input.apiKeyId) {
        conditions.push(eq(machineDataLogs.apiKeyId, input.apiKeyId));
      }
      if (input.startDate) {
        conditions.push(gte(machineDataLogs.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(machineDataLogs.createdAt, new Date(input.endDate)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const logs = await query
        .orderBy(desc(machineDataLogs.createdAt))
        .limit(input.limit);

      return logs;
    }),

  getApiStats: protectedProcedure
    .input(z.object({
      apiKeyId: z.number().optional(),
      days: z.number().min(1).max(90).default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      const conditions = [gte(machineDataLogs.createdAt, startDate)];
      if (input.apiKeyId) {
        conditions.push(eq(machineDataLogs.apiKeyId, input.apiKeyId));
      }

      const stats = await db
        .select({
          date: sql<string>`DATE(${machineDataLogs.createdAt})`,
          totalRequests: sql<number>`COUNT(*)`,
          successRequests: sql<number>`SUM(CASE WHEN ${machineDataLogs.responseStatus} < 400 THEN 1 ELSE 0 END)`,
          errorRequests: sql<number>`SUM(CASE WHEN ${machineDataLogs.responseStatus} >= 400 THEN 1 ELSE 0 END)`,
          avgProcessingTime: sql<number>`AVG(${machineDataLogs.processingTimeMs})`,
        })
        .from(machineDataLogs)
        .where(and(...conditions))
        .groupBy(sql`DATE(${machineDataLogs.createdAt})`)
        .orderBy(sql`DATE(${machineDataLogs.createdAt})`);

      return stats;
    }),

  // ==================== Integration Configs ====================

  saveConfig: protectedProcedure
    .input(z.object({
      apiKeyId: z.number(),
      configType: z.string(),
      configName: z.string(),
      configValue: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      // Check if config exists
      const [existing] = await db
        .select()
        .from(machineIntegrationConfigs)
        .where(and(
          eq(machineIntegrationConfigs.apiKeyId, input.apiKeyId),
          eq(machineIntegrationConfigs.configType, input.configType),
          eq(machineIntegrationConfigs.configName, input.configName)
        ))
        .limit(1);

      if (existing) {
        await db
          .update(machineIntegrationConfigs)
          .set({ configValue: input.configValue })
          .where(eq(machineIntegrationConfigs.id, existing.id));
        return { id: existing.id, updated: true };
      } else {
        const [result] = await db.insert(machineIntegrationConfigs).values(input);
        return { id: result.insertId, updated: false };
      }
    }),

  listConfigs: protectedProcedure
    .input(z.object({ apiKeyId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const configs = await db
        .select()
        .from(machineIntegrationConfigs)
        .where(eq(machineIntegrationConfigs.apiKeyId, input.apiKeyId));
      return configs;
    }),

  // ==================== Data Queries ====================

  listInspectionData: protectedProcedure
    .input(z.object({
      apiKeyId: z.number().optional(),
      machineId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(1000).default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const conditions = [];
      if (input.apiKeyId) {
        conditions.push(eq(machineInspectionData.apiKeyId, input.apiKeyId));
      }
      if (input.machineId) {
        conditions.push(eq(machineInspectionData.machineId, input.machineId));
      }
      if (input.startDate) {
        conditions.push(gte(machineInspectionData.inspectedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(machineInspectionData.inspectedAt, new Date(input.endDate)));
      }

      let baseQuery = db.select().from(machineInspectionData);
      
      const data = await (conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery
      )
        .orderBy(desc(machineInspectionData.inspectedAt))
        .limit(input.limit);

      return data;
    }),

  listMeasurementData: protectedProcedure
    .input(z.object({
      apiKeyId: z.number().optional(),
      machineId: z.number().optional(),
      parameterName: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(1000).default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const conditions = [];
      if (input.apiKeyId) {
        conditions.push(eq(machineMeasurementData.apiKeyId, input.apiKeyId));
      }
      if (input.machineId) {
        conditions.push(eq(machineMeasurementData.machineId, input.machineId));
      }
      if (input.startDate) {
        conditions.push(gte(machineMeasurementData.measuredAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(machineMeasurementData.measuredAt, new Date(input.endDate)));
      }

      let baseQuery = db.select().from(machineMeasurementData);
      
      const data = await (conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery
      )
        .orderBy(desc(machineMeasurementData.measuredAt))
        .limit(input.limit);

      return data;
    }),

  listMachineOeeData: protectedProcedure
    .input(z.object({
      apiKeyId: z.number().optional(),
      machineId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(1000).default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const conditions = [];
      if (input.apiKeyId) {
        conditions.push(eq(machineOeeData.apiKeyId, input.apiKeyId));
      }
      if (input.machineId) {
        conditions.push(eq(machineOeeData.machineId, input.machineId));
      }
      if (input.startDate) {
        conditions.push(gte(machineOeeData.recordDate, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(machineOeeData.recordDate, input.endDate));
      }

      let baseQuery = db.select().from(machineOeeData);
      
      const data = await (conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery
      )
        .orderBy(desc(machineOeeData.recordedAt))
        .limit(input.limit);

      return data;
    }),

  // ==================== Webhook Config APIs ====================
  listWebhookConfigs: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return;
      return db.select().from(machineWebhookConfigs).orderBy(desc(machineWebhookConfigs.createdAt));
    }),

  createWebhookConfig: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      webhookUrl: z.string().url(),
      webhookSecret: z.string().optional(),
      triggerType: z.enum(["inspection_fail", "oee_low", "measurement_out_of_spec", "all"]),
      machineIds: z.array(z.number()).optional(),
      oeeThreshold: z.number().min(0).max(100).optional(),
      retryCount: z.number().min(0).max(10).default(3),
      retryDelaySeconds: z.number().min(10).max(3600).default(60),
      headers: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return;
      const result = await db.insert(machineWebhookConfigs).values({
        name: input.name,
        webhookUrl: input.webhookUrl,
        webhookSecret: input.webhookSecret || null,
        triggerType: input.triggerType,
        machineIds: input.machineIds ? JSON.stringify(input.machineIds) : null,
        oeeThreshold: input.oeeThreshold?.toString() || null,
        retryCount: input.retryCount,
        retryDelaySeconds: input.retryDelaySeconds,
        headers: input.headers ? JSON.stringify(input.headers) : null,
        createdBy: ctx.user.id,
      });
      return { id: Number((result as any).insertId || 0) };
    }),

  updateWebhookConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      webhookUrl: z.string().url().optional(),
      webhookSecret: z.string().optional(),
      triggerType: z.enum(["inspection_fail", "oee_low", "measurement_out_of_spec", "all"]).optional(),
      machineIds: z.array(z.number()).optional(),
      oeeThreshold: z.number().min(0).max(100).optional(),
      isActive: z.boolean().optional(),
      retryCount: z.number().min(0).max(10).optional(),
      retryDelaySeconds: z.number().min(10).max(3600).optional(),
      headers: z.record(z.string(), z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.webhookUrl !== undefined) updateData.webhookUrl = input.webhookUrl;
      if (input.webhookSecret !== undefined) updateData.webhookSecret = input.webhookSecret;
      if (input.triggerType !== undefined) updateData.triggerType = input.triggerType;
      if (input.machineIds !== undefined) updateData.machineIds = JSON.stringify(input.machineIds);
      if (input.oeeThreshold !== undefined) updateData.oeeThreshold = input.oeeThreshold.toString();
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
      if (input.retryCount !== undefined) updateData.retryCount = input.retryCount;
      if (input.retryDelaySeconds !== undefined) updateData.retryDelaySeconds = input.retryDelaySeconds;
      if (input.headers !== undefined) updateData.headers = JSON.stringify(input.headers);

      await db.update(machineWebhookConfigs).set(updateData).where(eq(machineWebhookConfigs.id, input.id));
      return { success: true };
    }),

  deleteWebhookConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      await db.delete(machineWebhookConfigs).where(eq(machineWebhookConfigs.id, input.id));
      return { success: true };
    }),

  listWebhookLogs: protectedProcedure
    .input(z.object({
      webhookConfigId: z.number().optional(),
      status: z.enum(["pending", "success", "failed", "retrying"]).optional(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const conditions = [];
      if (input.webhookConfigId) conditions.push(eq(machineWebhookLogs.webhookConfigId, input.webhookConfigId));
      if (input.status) conditions.push(eq(machineWebhookLogs.status, input.status));

      let baseQuery = db.select().from(machineWebhookLogs);
      const data = await (conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery
      ).orderBy(desc(machineWebhookLogs.triggeredAt)).limit(input.limit);

      return data;
    }),

  testWebhook: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const [config] = await db.select().from(machineWebhookConfigs).where(eq(machineWebhookConfigs.id, input.id));
      if (!config) throw new Error("Webhook config not found");

      const testPayload = {
        type: "test",
        timestamp: new Date().toISOString(),
        message: "This is a test webhook from CPK/SPC Calculator",
        configId: config.id,
        configName: config.name,
      };

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (config.webhookSecret) {
          headers["X-Webhook-Secret"] = config.webhookSecret;
        }
        if (config.headers) {
          Object.assign(headers, JSON.parse(config.headers));
        }

        const startTime = Date.now();
        const response = await fetch(config.webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(testPayload),
        });
        const responseTime = Date.now() - startTime;
        const responseBody = await response.text();

        await db.insert(machineWebhookLogs).values({
          webhookConfigId: config.id,
          triggerType: "test",
          requestPayload: JSON.stringify(testPayload),
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 5000),
          responseTime,
          status: response.ok ? "success" : "failed",
          completedAt: new Date(),
        });

        return { success: response.ok, status: response.status, responseTime };
      } catch (error) {
        await db.insert(machineWebhookLogs).values({
          webhookConfigId: config.id,
          triggerType: "test",
          requestPayload: JSON.stringify(testPayload),
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        });
        throw error;
      }
    }),

  // ==================== Field Mapping APIs ====================
  listFieldMappings: protectedProcedure
    .input(z.object({
      apiKeyId: z.number().optional(),
      machineType: z.string().optional(),
      targetTable: z.enum(["measurements", "inspection_data", "oee_records"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const conditions = [];
      if (input.apiKeyId) conditions.push(eq(machineFieldMappings.apiKeyId, input.apiKeyId));
      if (input.machineType) conditions.push(eq(machineFieldMappings.machineType, input.machineType));
      if (input.targetTable) conditions.push(eq(machineFieldMappings.targetTable, input.targetTable));

      let baseQuery = db.select().from(machineFieldMappings);
      return (conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery
      ).orderBy(desc(machineFieldMappings.createdAt));
    }),

  createFieldMapping: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      apiKeyId: z.number().optional(),
      machineType: z.string().optional(),
      sourceField: z.string().min(1),
      targetField: z.string().min(1),
      targetTable: z.enum(["measurements", "inspection_data", "oee_records"]),
      transformType: z.enum(["direct", "multiply", "divide", "add", "subtract", "custom"]).default("direct"),
      transformValue: z.number().optional(),
      customTransform: z.string().optional(),
      defaultValue: z.string().optional(),
      isRequired: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return;
      const [result] = await db.insert(machineFieldMappings).values({
        name: input.name,
        apiKeyId: input.apiKeyId || null,
        machineType: input.machineType || null,
        sourceField: input.sourceField,
        targetField: input.targetField,
        targetTable: input.targetTable,
        transformType: input.transformType,
        transformValue: input.transformValue?.toString() || null,
        customTransform: input.customTransform || null,
        defaultValue: input.defaultValue || null,
        isRequired: input.isRequired ? 1 : 0,
        createdBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),

  updateFieldMapping: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      sourceField: z.string().min(1).optional(),
      targetField: z.string().min(1).optional(),
      transformType: z.enum(["direct", "multiply", "divide", "add", "subtract", "custom"]).optional(),
      transformValue: z.number().optional(),
      customTransform: z.string().optional(),
      defaultValue: z.string().optional(),
      isRequired: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.sourceField !== undefined) updateData.sourceField = input.sourceField;
      if (input.targetField !== undefined) updateData.targetField = input.targetField;
      if (input.transformType !== undefined) updateData.transformType = input.transformType;
      if (input.transformValue !== undefined) updateData.transformValue = input.transformValue.toString();
      if (input.customTransform !== undefined) updateData.customTransform = input.customTransform;
      if (input.defaultValue !== undefined) updateData.defaultValue = input.defaultValue;
      if (input.isRequired !== undefined) updateData.isRequired = input.isRequired ? 1 : 0;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

      await db.update(machineFieldMappings).set(updateData).where(eq(machineFieldMappings.id, input.id));
      return { success: true };
    }),

  deleteFieldMapping: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      await db.delete(machineFieldMappings).where(eq(machineFieldMappings.id, input.id));
      return { success: true };
    }),

  detectFields: protectedProcedure
    .input(z.object({ sampleData: z.record(z.string(), z.unknown()) }))
    .mutation(async ({ input }) => {
      const fields: Array<{ name: string; type: string; sample: unknown }> = [];
      
      function extractFields(obj: Record<string, unknown>, prefix = "") {
        for (const [key, value] of Object.entries(obj)) {
          const fieldName = prefix ? `${prefix}.${key}` : key;
          if (value !== null && typeof value === "object" && !Array.isArray(value)) {
            extractFields(value as Record<string, unknown>, fieldName);
          } else {
            fields.push({
              name: fieldName,
              type: Array.isArray(value) ? "array" : typeof value,
              sample: value,
            });
          }
        }
      }

      extractFields(input.sampleData);
      return fields;
    }),

  // ==================== Realtime Events APIs ====================
  listRealtimeEvents: protectedProcedure
    .input(z.object({
      eventType: z.enum(["inspection", "measurement", "oee", "alert", "status"]).optional(),
      machineId: z.number().optional(),
      severity: z.enum(["info", "warning", "error", "critical"]).optional(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const conditions = [];
      if (input.eventType) conditions.push(eq(machineRealtimeEvents.eventType, input.eventType));
      if (input.machineId) conditions.push(eq(machineRealtimeEvents.machineId, input.machineId));
      if (input.severity) conditions.push(eq(machineRealtimeEvents.severity, input.severity));

      let baseQuery = db.select().from(machineRealtimeEvents);
      return (conditions.length > 0 
        ? baseQuery.where(and(...conditions))
        : baseQuery
      ).orderBy(desc(machineRealtimeEvents.createdAt)).limit(input.limit);
    }),

  getRealtimeStats: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return;
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [stats] = await db
        .select({
          totalEvents: sql<number>`COUNT(*)`,
          inspectionEvents: sql<number>`SUM(CASE WHEN ${machineRealtimeEvents.eventType} = 'inspection' THEN 1 ELSE 0 END)`,
          measurementEvents: sql<number>`SUM(CASE WHEN ${machineRealtimeEvents.eventType} = 'measurement' THEN 1 ELSE 0 END)`,
          oeeEvents: sql<number>`SUM(CASE WHEN ${machineRealtimeEvents.eventType} = 'oee' THEN 1 ELSE 0 END)`,
          alertEvents: sql<number>`SUM(CASE WHEN ${machineRealtimeEvents.eventType} = 'alert' THEN 1 ELSE 0 END)`,
          criticalCount: sql<number>`SUM(CASE WHEN ${machineRealtimeEvents.severity} = 'critical' THEN 1 ELSE 0 END)`,
          errorCount: sql<number>`SUM(CASE WHEN ${machineRealtimeEvents.severity} = 'error' THEN 1 ELSE 0 END)`,
          warningCount: sql<number>`SUM(CASE WHEN ${machineRealtimeEvents.severity} = 'warning' THEN 1 ELSE 0 END)`,
        })
        .from(machineRealtimeEvents)
        .where(gte(machineRealtimeEvents.createdAt, oneHourAgo));

      return stats;
    }),

  // Get inspection pass/fail statistics for live chart
  getInspectionStats: protectedProcedure
    .input(z.object({
      timeRange: z.enum(['1h', '4h', '8h', '24h']).default('1h'),
      machineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const now = new Date();
      
      // Calculate time range
      const hours = input.timeRange === '1h' ? 1 : input.timeRange === '4h' ? 4 : input.timeRange === '8h' ? 8 : 24;
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      
      // Determine grouping interval based on time range
      const intervalMinutes = hours <= 1 ? 5 : hours <= 4 ? 15 : hours <= 8 ? 30 : 60;
      
      const conditions = [
        gte(machineInspectionData.inspectedAt, startTime),
      ];
      if (input.machineId) {
        conditions.push(eq(machineInspectionData.machineId, input.machineId));
      }

      // Get time-series data grouped by interval
      const timeSeriesData = await db
        .select({
          timeSlot: sql<string>`DATE_FORMAT(${machineInspectionData.inspectedAt}, '%Y-%m-%d %H:%i')`,
          passCount: sql<number>`SUM(CASE WHEN ${machineInspectionData.inspectionResult} = 'pass' THEN 1 ELSE 0 END)`,
          failCount: sql<number>`SUM(CASE WHEN ${machineInspectionData.inspectionResult} = 'fail' THEN 1 ELSE 0 END)`,
          reworkCount: sql<number>`SUM(CASE WHEN ${machineInspectionData.inspectionResult} = 'rework' THEN 1 ELSE 0 END)`,
          totalCount: sql<number>`COUNT(*)`,
        })
        .from(machineInspectionData)
        .where(and(...conditions))
        .groupBy(sql`FLOOR(UNIX_TIMESTAMP(${machineInspectionData.inspectedAt}) / ${intervalMinutes * 60})`)
        .orderBy(sql`${machineInspectionData.inspectedAt}`);

      // Get overall summary
      const [summary] = await db
        .select({
          totalPass: sql<number>`SUM(CASE WHEN ${machineInspectionData.inspectionResult} = 'pass' THEN 1 ELSE 0 END)`,
          totalFail: sql<number>`SUM(CASE WHEN ${machineInspectionData.inspectionResult} = 'fail' THEN 1 ELSE 0 END)`,
          totalRework: sql<number>`SUM(CASE WHEN ${machineInspectionData.inspectionResult} = 'rework' THEN 1 ELSE 0 END)`,
          totalInspections: sql<number>`COUNT(*)`,
          avgCycleTime: sql<number>`AVG(${machineInspectionData.cycleTimeMs})`,
          totalDefects: sql<number>`SUM(${machineInspectionData.defectCount})`,
        })
        .from(machineInspectionData)
        .where(and(...conditions));

      // Calculate pass rate
      const passRate = summary.totalInspections > 0 
        ? (summary.totalPass / summary.totalInspections * 100).toFixed(2)
        : '0.00';

      // Format time series for chart
      const chartData = timeSeriesData.map(row => ({
        time: row.timeSlot,
        pass: row.passCount || 0,
        fail: row.failCount || 0,
        rework: row.reworkCount || 0,
        total: row.totalCount || 0,
        passRate: row.totalCount > 0 ? ((row.passCount || 0) / row.totalCount * 100).toFixed(1) : '0.0',
      }));

      return {
        chartData,
        summary: {
          totalPass: summary.totalPass || 0,
          totalFail: summary.totalFail || 0,
          totalRework: summary.totalRework || 0,
          totalInspections: summary.totalInspections || 0,
          passRate,
          avgCycleTime: summary.avgCycleTime ? Math.round(summary.avgCycleTime) : 0,
          totalDefects: summary.totalDefects || 0,
        },
        timeRange: input.timeRange,
        intervalMinutes,
      };
    }),

  // Get measurement out-of-spec statistics
  getMeasurementStats: protectedProcedure
    .input(z.object({
      timeRange: z.enum(['1h', '4h', '8h', '24h']).default('1h'),
      machineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const now = new Date();
      
      const hours = input.timeRange === '1h' ? 1 : input.timeRange === '4h' ? 4 : input.timeRange === '8h' ? 8 : 24;
      const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
      
      const conditions = [
        gte(machineMeasurementData.measuredAt, startTime),
      ];
      if (input.machineId) {
        conditions.push(eq(machineMeasurementData.machineId, input.machineId));
      }

      // Get summary statistics
      const [summary] = await db
        .select({
          totalMeasurements: sql<number>`COUNT(*)`,
          inSpecCount: sql<number>`SUM(CASE WHEN ${machineMeasurementData.isWithinSpec} = 1 THEN 1 ELSE 0 END)`,
          outOfSpecCount: sql<number>`SUM(CASE WHEN ${machineMeasurementData.isWithinSpec} = 0 THEN 1 ELSE 0 END)`,
          unknownSpecCount: sql<number>`SUM(CASE WHEN ${machineMeasurementData.isWithinSpec} IS NULL THEN 1 ELSE 0 END)`,
        })
        .from(machineMeasurementData)
        .where(and(...conditions));

      // Get out-of-spec by parameter
      const byParameter = await db
        .select({
          parameterName: machineMeasurementData.parameterName,
          totalCount: sql<number>`COUNT(*)`,
          outOfSpecCount: sql<number>`SUM(CASE WHEN ${machineMeasurementData.isWithinSpec} = 0 THEN 1 ELSE 0 END)`,
        })
        .from(machineMeasurementData)
        .where(and(...conditions))
        .groupBy(machineMeasurementData.parameterName)
        .orderBy(sql`SUM(CASE WHEN ${machineMeasurementData.isWithinSpec} = 0 THEN 1 ELSE 0 END) DESC`)
        .limit(10);

      return {
        summary: {
          totalMeasurements: summary.totalMeasurements || 0,
          inSpecCount: summary.inSpecCount || 0,
          outOfSpecCount: summary.outOfSpecCount || 0,
          unknownSpecCount: summary.unknownSpecCount || 0,
          inSpecRate: summary.totalMeasurements > 0 
            ? ((summary.inSpecCount || 0) / summary.totalMeasurements * 100).toFixed(2)
            : '0.00',
        },
        byParameter: byParameter.map(p => ({
          parameterName: p.parameterName,
          totalCount: p.totalCount || 0,
          outOfSpecCount: p.outOfSpecCount || 0,
          outOfSpecRate: p.totalCount > 0 
            ? ((p.outOfSpecCount || 0) / p.totalCount * 100).toFixed(1)
            : '0.0',
        })),
        timeRange: input.timeRange,
      };
    }),

  // Get OEE statistics
  getOeeStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(30).default(7),
      machineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      
      const conditions = [
        gte(machineOeeData.recordedAt, startDate),
      ];
      if (input.machineId) {
        conditions.push(eq(machineOeeData.machineId, input.machineId));
      }

      // Get daily OEE averages
      const dailyOee = await db
        .select({
          date: machineOeeData.recordDate,
          avgOee: sql<number>`AVG(CAST(${machineOeeData.oee} AS DECIMAL(10,2)))`,
          avgAvailability: sql<number>`AVG(CAST(${machineOeeData.availability} AS DECIMAL(10,2)))`,
          avgPerformance: sql<number>`AVG(CAST(${machineOeeData.performance} AS DECIMAL(10,2)))`,
          avgQuality: sql<number>`AVG(CAST(${machineOeeData.quality} AS DECIMAL(10,2)))`,
          totalDowntime: sql<number>`SUM(${machineOeeData.downtime})`,
          totalGood: sql<number>`SUM(${machineOeeData.goodCount})`,
          totalReject: sql<number>`SUM(${machineOeeData.rejectCount})`,
        })
        .from(machineOeeData)
        .where(and(...conditions))
        .groupBy(machineOeeData.recordDate)
        .orderBy(machineOeeData.recordDate);

      // Get overall summary
      const [summary] = await db
        .select({
          avgOee: sql<number>`AVG(CAST(${machineOeeData.oee} AS DECIMAL(10,2)))`,
          minOee: sql<number>`MIN(CAST(${machineOeeData.oee} AS DECIMAL(10,2)))`,
          maxOee: sql<number>`MAX(CAST(${machineOeeData.oee} AS DECIMAL(10,2)))`,
          avgAvailability: sql<number>`AVG(CAST(${machineOeeData.availability} AS DECIMAL(10,2)))`,
          avgPerformance: sql<number>`AVG(CAST(${machineOeeData.performance} AS DECIMAL(10,2)))`,
          avgQuality: sql<number>`AVG(CAST(${machineOeeData.quality} AS DECIMAL(10,2)))`,
          totalDowntime: sql<number>`SUM(${machineOeeData.downtime})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(and(...conditions));

      return {
        chartData: dailyOee.map(row => ({
          date: row.date,
          oee: row.avgOee ? parseFloat(row.avgOee.toFixed(1)) : 0,
          availability: row.avgAvailability ? parseFloat(row.avgAvailability.toFixed(1)) : 0,
          performance: row.avgPerformance ? parseFloat(row.avgPerformance.toFixed(1)) : 0,
          quality: row.avgQuality ? parseFloat(row.avgQuality.toFixed(1)) : 0,
          downtime: row.totalDowntime || 0,
          goodCount: row.totalGood || 0,
          rejectCount: row.totalReject || 0,
        })),
        summary: {
          avgOee: summary.avgOee ? parseFloat(summary.avgOee.toFixed(1)) : 0,
          minOee: summary.minOee ? parseFloat(summary.minOee.toFixed(1)) : 0,
          maxOee: summary.maxOee ? parseFloat(summary.maxOee.toFixed(1)) : 0,
          avgAvailability: summary.avgAvailability ? parseFloat(summary.avgAvailability.toFixed(1)) : 0,
          avgPerformance: summary.avgPerformance ? parseFloat(summary.avgPerformance.toFixed(1)) : 0,
          avgQuality: summary.avgQuality ? parseFloat(summary.avgQuality.toFixed(1)) : 0,
          totalDowntime: summary.totalDowntime || 0,
          recordCount: summary.recordCount || 0,
        },
        days: input.days,
      };
    }),

  // Get list of machines for filter dropdown
  listMachines: protectedProcedure
    .query(async () => {
      const db = await getDb();
      
      if (!db) return;
      
      // Get unique machines from API keys
      const machines = await db
        .select({
          machineId: machineApiKeys.machineId,
          name: machineApiKeys.name,
          machineType: machineApiKeys.machineType,
          productionLineId: machineApiKeys.productionLineId,
        })
        .from(machineApiKeys)
        .where(eq(machineApiKeys.isActive, 1))
        .groupBy(machineApiKeys.machineId);

      return machines.map(m => ({
        id: m.machineId,
        name: m.name,
        machineType: m.machineType,
        productionLineId: m.productionLineId,
      }));
    }),

  // Get OEE dashboard data with comparison between machines
  getOeeDashboard: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Get OEE by machine
      const byMachine = await db
        .select({
          machineId: machineOeeData.machineId,
          avgOee: sql<number>`AVG(CAST(${machineOeeData.oee} AS DECIMAL(10,2)))`,
          avgAvailability: sql<number>`AVG(CAST(${machineOeeData.availability} AS DECIMAL(10,2)))`,
          avgPerformance: sql<number>`AVG(CAST(${machineOeeData.performance} AS DECIMAL(10,2)))`,
          avgQuality: sql<number>`AVG(CAST(${machineOeeData.quality} AS DECIMAL(10,2)))`,
          totalDowntime: sql<number>`SUM(${machineOeeData.downtime})`,
          totalGood: sql<number>`SUM(${machineOeeData.goodCount})`,
          totalReject: sql<number>`SUM(${machineOeeData.rejectCount})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(gte(machineOeeData.recordedAt, startDate))
        .groupBy(machineOeeData.machineId);

      // Get machine names
      const machineNames = await db
        .select({
          machineId: machineApiKeys.machineId,
          name: machineApiKeys.name,
        })
        .from(machineApiKeys)
        .groupBy(machineApiKeys.machineId);

      const nameMap = new Map(machineNames.map(m => [m.machineId, m.name]));

      // Get daily trend for all machines
      const dailyTrend = await db
        .select({
          date: machineOeeData.recordDate,
          avgOee: sql<number>`AVG(CAST(${machineOeeData.oee} AS DECIMAL(10,2)))`,
          avgAvailability: sql<number>`AVG(CAST(${machineOeeData.availability} AS DECIMAL(10,2)))`,
          avgPerformance: sql<number>`AVG(CAST(${machineOeeData.performance} AS DECIMAL(10,2)))`,
          avgQuality: sql<number>`AVG(CAST(${machineOeeData.quality} AS DECIMAL(10,2)))`,
        })
        .from(machineOeeData)
        .where(gte(machineOeeData.recordedAt, startDate))
        .groupBy(machineOeeData.recordDate)
        .orderBy(machineOeeData.recordDate);

      // Calculate overall summary
      const [overall] = await db
        .select({
          avgOee: sql<number>`AVG(CAST(${machineOeeData.oee} AS DECIMAL(10,2)))`,
          avgAvailability: sql<number>`AVG(CAST(${machineOeeData.availability} AS DECIMAL(10,2)))`,
          avgPerformance: sql<number>`AVG(CAST(${machineOeeData.performance} AS DECIMAL(10,2)))`,
          avgQuality: sql<number>`AVG(CAST(${machineOeeData.quality} AS DECIMAL(10,2)))`,
          totalDowntime: sql<number>`SUM(${machineOeeData.downtime})`,
          totalGood: sql<number>`SUM(${machineOeeData.goodCount})`,
          totalReject: sql<number>`SUM(${machineOeeData.rejectCount})`,
        })
        .from(machineOeeData)
        .where(gte(machineOeeData.recordedAt, startDate));

      // Find best and worst machines
      const sortedByOee = [...byMachine].sort((a, b) => (b.avgOee || 0) - (a.avgOee || 0));
      const bestMachine = sortedByOee[0];
      const worstMachine = sortedByOee[sortedByOee.length - 1];

      return {
        byMachine: byMachine.map(m => ({
          machineId: m.machineId,
          machineName: nameMap.get(m.machineId) || `Machine ${m.machineId}`,
          avgOee: m.avgOee ? parseFloat(m.avgOee.toFixed(1)) : 0,
          avgAvailability: m.avgAvailability ? parseFloat(m.avgAvailability.toFixed(1)) : 0,
          avgPerformance: m.avgPerformance ? parseFloat(m.avgPerformance.toFixed(1)) : 0,
          avgQuality: m.avgQuality ? parseFloat(m.avgQuality.toFixed(1)) : 0,
          totalDowntime: m.totalDowntime || 0,
          totalGood: m.totalGood || 0,
          totalReject: m.totalReject || 0,
          recordCount: m.recordCount || 0,
        })),
        dailyTrend: dailyTrend.map(d => ({
          date: d.date,
          oee: d.avgOee ? parseFloat(d.avgOee.toFixed(1)) : 0,
          availability: d.avgAvailability ? parseFloat(d.avgAvailability.toFixed(1)) : 0,
          performance: d.avgPerformance ? parseFloat(d.avgPerformance.toFixed(1)) : 0,
          quality: d.avgQuality ? parseFloat(d.avgQuality.toFixed(1)) : 0,
        })),
        summary: {
          avgOee: overall.avgOee ? parseFloat(overall.avgOee.toFixed(1)) : 0,
          avgAvailability: overall.avgAvailability ? parseFloat(overall.avgAvailability.toFixed(1)) : 0,
          avgPerformance: overall.avgPerformance ? parseFloat(overall.avgPerformance.toFixed(1)) : 0,
          avgQuality: overall.avgQuality ? parseFloat(overall.avgQuality.toFixed(1)) : 0,
          totalDowntime: overall.totalDowntime || 0,
          totalGood: overall.totalGood || 0,
          totalReject: overall.totalReject || 0,
          machineCount: byMachine.length,
          bestMachine: bestMachine ? {
            machineId: bestMachine.machineId,
            name: nameMap.get(bestMachine.machineId) || `Machine ${bestMachine.machineId}`,
            oee: bestMachine.avgOee ? parseFloat(bestMachine.avgOee.toFixed(1)) : 0,
          } : null,
          worstMachine: worstMachine && byMachine.length > 1 ? {
            machineId: worstMachine.machineId,
            name: nameMap.get(worstMachine.machineId) || `Machine ${worstMachine.machineId}`,
            oee: worstMachine.avgOee ? parseFloat(worstMachine.avgOee.toFixed(1)) : 0,
          } : null,
        },
        days: input.days,
      };
    }),

  // Export inspection data
  exportInspectionData: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      format: z.enum(['csv', 'json']).default('csv'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      const conditions = [];
      if (input.machineId) {
        conditions.push(eq(machineInspectionData.machineId, input.machineId));
      }
      if (input.startDate) {
        conditions.push(gte(machineInspectionData.inspectedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(machineInspectionData.inspectedAt, new Date(input.endDate)));
      }

      const data = await db
        .select()
        .from(machineInspectionData)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(machineInspectionData.inspectedAt))
        .limit(10000);

      // Get machine names
      const machineNames = await db
        .select({ machineId: machineApiKeys.machineId, name: machineApiKeys.name })
        .from(machineApiKeys)
        .groupBy(machineApiKeys.machineId);
      const nameMap = new Map(machineNames.map(m => [m.machineId, m.name]));

      const exportData = data.map(row => ({
        id: row.id,
        machineId: row.machineId,
        machineName: nameMap.get(row.machineId!) || '',
        batchId: row.batchId || '',
        productCode: row.productCode || '',
        serialNumber: row.serialNumber || '',
        inspectionType: row.inspectionType,
        inspectionResult: row.inspectionResult,
        defectCount: row.defectCount || 0,
        defectTypes: row.defectTypes || '',
        inspectedAt: row.inspectedAt?.toISOString() || '',
        cycleTimeMs: row.cycleTimeMs || 0,
        operatorId: row.operatorId || '',
        shiftId: row.shiftId || '',
      }));

      if (input.format === 'csv') {
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        return {
          data: [headers, ...rows].join('\n'),
          filename: `inspection_data_${new Date().toISOString().split('T')[0]}.csv`,
          mimeType: 'text/csv',
        };
      }

      return {
        data: JSON.stringify(exportData, null, 2),
        filename: `inspection_data_${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json',
      };
    }),

  // Export measurement data
  exportMeasurementData: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      format: z.enum(['csv', 'json']).default('csv'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      const conditions = [];
      if (input.machineId) {
        conditions.push(eq(machineMeasurementData.machineId, input.machineId));
      }
      if (input.startDate) {
        conditions.push(gte(machineMeasurementData.measuredAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(machineMeasurementData.measuredAt, new Date(input.endDate)));
      }

      const data = await db
        .select()
        .from(machineMeasurementData)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(machineMeasurementData.measuredAt))
        .limit(10000);

      // Get machine names
      const machineNames = await db
        .select({ machineId: machineApiKeys.machineId, name: machineApiKeys.name })
        .from(machineApiKeys)
        .groupBy(machineApiKeys.machineId);
      const nameMap = new Map(machineNames.map(m => [m.machineId, m.name]));

      const exportData = data.map(row => ({
        id: row.id,
        machineId: row.machineId,
        machineName: nameMap.get(row.machineId!) || '',
        batchId: row.batchId || '',
        productCode: row.productCode || '',
        serialNumber: row.serialNumber || '',
        parameterName: row.parameterName,
        measuredValue: row.measuredValue,
        unit: row.unit || '',
        nominalValue: row.target?.toString() || '',
        usl: row.usl || '',
        lsl: row.lsl || '',
        isWithinSpec: row.isWithinSpec,
        measuredAt: row.measuredAt?.toISOString() || '',
        operatorId: row.operatorId || '',
        shiftId: row.shiftId || '',
      }));

      if (input.format === 'csv') {
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        return {
          data: [headers, ...rows].join('\n'),
          filename: `measurement_data_${new Date().toISOString().split('T')[0]}.csv`,
          mimeType: 'text/csv',
        };
      }

      return {
        data: JSON.stringify(exportData, null, 2),
        filename: `measurement_data_${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json',
      };
    }),

  // Export OEE data
  exportOeeData: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      format: z.enum(['csv', 'json']).default('csv'),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      const conditions = [];
      if (input.machineId) {
        conditions.push(eq(machineOeeData.machineId, input.machineId));
      }
      if (input.startDate) {
        conditions.push(gte(machineOeeData.recordedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(machineOeeData.recordedAt, new Date(input.endDate)));
      }

      const data = await db
        .select()
        .from(machineOeeData)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(machineOeeData.recordedAt))
        .limit(10000);

      // Get machine names
      const machineNames = await db
        .select({ machineId: machineApiKeys.machineId, name: machineApiKeys.name })
        .from(machineApiKeys)
        .groupBy(machineApiKeys.machineId);
      const nameMap = new Map(machineNames.map(m => [m.machineId, m.name]));

      const exportData = data.map(row => ({
        id: row.id,
        machineId: row.machineId,
        machineName: nameMap.get(row.machineId!) || '',
        recordDate: row.recordDate,
        shiftId: row.shiftId || '',
        plannedProductionTime: row.plannedProductionTime || 0,
        actualProductionTime: row.actualProductionTime || 0,
        downtime: row.downtime || 0,
        totalCount: row.totalCount || 0,
        goodCount: row.goodCount || 0,
        rejectCount: row.rejectCount || 0,
        availability: row.availability || '',
        performance: row.performance || '',
        quality: row.quality || '',
        oee: row.oee || '',
        recordedAt: row.recordedAt?.toISOString() || '',
      }));

      if (input.format === 'csv') {
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
        return {
          data: [headers, ...rows].join('\n'),
          filename: `oee_data_${new Date().toISOString().split('T')[0]}.csv`,
          mimeType: 'text/csv',
        };
      }

      return {
        data: JSON.stringify(exportData, null, 2),
        filename: `oee_data_${new Date().toISOString().split('T')[0]}.json`,
        mimeType: 'application/json',
      };
    }),

  // ==================== OEE Alert Configurations ====================
  
  // List OEE alert configs
  listOeeAlertConfigs: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return;
      const configs = await db
        .select()
        .from(oeeAlertConfigs)
        .where(eq(oeeAlertConfigs.userId, ctx.user.id))
        .orderBy(desc(oeeAlertConfigs.createdAt));

      // Get machine names
      const machineNames = await db
        .select({ machineId: machineApiKeys.machineId, name: machineApiKeys.name })
        .from(machineApiKeys)
        .groupBy(machineApiKeys.machineId);
      const nameMap = new Map(machineNames.map(m => [m.machineId, m.name]));

      return configs.map(c => ({
        ...c,
        machineName: c.machineId ? nameMap.get(c.machineId) || `Machine ${c.machineId}` : 'Tất cả máy',
        recipients: JSON.parse(c.recipients || '[]'),
      }));
    }),

  // Create OEE alert config
  createOeeAlertConfig: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      machineId: z.number().optional(),
      oeeThreshold: z.number().min(0).max(100),
      consecutiveDays: z.number().min(1).max(30),
      recipients: z.array(z.string().email()),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      const [result] = await db.insert(oeeAlertConfigs).values({
        userId: ctx.user.id,
        name: input.name,
        machineId: input.machineId,
        oeeThreshold: String(input.oeeThreshold),
        consecutiveDays: input.consecutiveDays,
        recipients: JSON.stringify(input.recipients),
      });
      return { id: result.insertId };
    }),

  // Update OEE alert config
  updateOeeAlertConfig: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      machineId: z.number().optional().nullable(),
      oeeThreshold: z.number().min(0).max(100).optional(),
      consecutiveDays: z.number().min(1).max(30).optional(),
      recipients: z.array(z.string().email()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.machineId !== undefined) updates.machineId = input.machineId;
      if (input.oeeThreshold !== undefined) updates.oeeThreshold = String(input.oeeThreshold);
      if (input.consecutiveDays !== undefined) updates.consecutiveDays = input.consecutiveDays;
      if (input.recipients !== undefined) updates.recipients = JSON.stringify(input.recipients);
      if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;
      
      await db.update(oeeAlertConfigs)
        .set(updates)
        .where(and(
          eq(oeeAlertConfigs.id, input.id),
          eq(oeeAlertConfigs.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  // Delete OEE alert config
  deleteOeeAlertConfig: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      await db.delete(oeeAlertConfigs)
        .where(and(
          eq(oeeAlertConfigs.id, input.id),
          eq(oeeAlertConfigs.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  // Get OEE alert history
  getOeeAlertHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      // Get user's alert config IDs
      const userConfigs = await db
        .select({ id: oeeAlertConfigs.id })
        .from(oeeAlertConfigs)
        .where(eq(oeeAlertConfigs.userId, ctx.user.id));
      const configIds = userConfigs.map(c => c.id);

      if (configIds.length === 0) return [];

      const history = await db
        .select()
        .from(oeeAlertHistory)
        .where(sql`${oeeAlertHistory.alertConfigId} IN (${sql.raw(configIds.join(','))})`)
        .orderBy(desc(oeeAlertHistory.createdAt))
        .limit(input.limit);

      return history.map(h => ({
        ...h,
        recipients: JSON.parse(h.recipients || '[]'),
      }));
    }),

  // Acknowledge an alert
  acknowledgeAlert: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      await db.update(oeeAlertHistory)
        .set({
          acknowledged: 1,
          acknowledgedAt: new Date(),
          acknowledgedBy: ctx.user.name || ctx.user.email || `User ${ctx.user.id}`,
        })
        .where(eq(oeeAlertHistory.id, input.id));
      return { success: true };
    }),

  // Resolve an alert
  resolveAlert: protectedProcedure
    .input(z.object({
      id: z.number(),
      resolution: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      await db.update(oeeAlertHistory)
        .set({
          acknowledged: 1,
          acknowledgedAt: sql`COALESCE(${oeeAlertHistory.acknowledgedAt}, NOW())`,
          acknowledgedBy: sql`COALESCE(${oeeAlertHistory.acknowledgedBy}, ${ctx.user.name || ctx.user.email || `User ${ctx.user.id}`})`,
          resolved: 1,
          resolvedAt: new Date(),
          resolvedBy: ctx.user.name || ctx.user.email || `User ${ctx.user.id}`,
          resolution: input.resolution,
        })
        .where(eq(oeeAlertHistory.id, input.id));
      return { success: true };
    }),

  // Get pending alerts for dashboard
  getPendingAlerts: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      
      if (!db) return;
      
      // Get user's alert config IDs
      const userConfigs = await db
        .select({ id: oeeAlertConfigs.id })
        .from(oeeAlertConfigs)
        .where(eq(oeeAlertConfigs.userId, ctx.user.id));
      const configIds = userConfigs.map(c => c.id);

      if (configIds.length === 0) return [];

      const alerts = await db
        .select()
        .from(oeeAlertHistory)
        .where(and(
          sql`${oeeAlertHistory.alertConfigId} IN (${sql.raw(configIds.join(','))})`,
          eq(oeeAlertHistory.resolved, 0)
        ))
        .orderBy(desc(oeeAlertHistory.createdAt))
        .limit(20);

      return alerts.map(a => ({
        ...a,
        recipients: JSON.parse(a.recipients || '[]'),
      }));
    }),

  // ==================== OEE Report Schedules ====================
  
  // List OEE report schedules
  listOeeReportSchedules: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return;
      const schedules = await db
        .select()
        .from(oeeReportSchedules)
        .where(eq(oeeReportSchedules.userId, ctx.user.id))
        .orderBy(desc(oeeReportSchedules.createdAt));

      return schedules.map(s => ({
        ...s,
        machineIds: JSON.parse(s.machineIds || '[]'),
        recipients: JSON.parse(s.recipients || '[]'),
      }));
    }),

  // Create OEE report schedule
  createOeeReportSchedule: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      frequency: z.enum(['weekly', 'monthly']),
      dayOfWeek: z.number().min(0).max(6).optional(),
      dayOfMonth: z.number().min(1).max(31).optional(),
      hour: z.number().min(0).max(23),
      machineIds: z.array(z.number()).optional(),
      recipients: z.array(z.string().email()),
      includeCharts: z.boolean().default(true),
      includeTrend: z.boolean().default(true),
      includeComparison: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      // Calculate next scheduled time
      const now = new Date();
      let nextScheduledAt = new Date();
      
      if (input.frequency === 'weekly') {
        const dayOfWeek = input.dayOfWeek ?? 1; // Default Monday
        const daysUntilNext = (dayOfWeek - now.getDay() + 7) % 7 || 7;
        nextScheduledAt.setDate(now.getDate() + daysUntilNext);
      } else {
        const dayOfMonth = input.dayOfMonth ?? 1;
        nextScheduledAt.setMonth(now.getMonth() + 1);
        nextScheduledAt.setDate(dayOfMonth);
      }
      nextScheduledAt.setHours(input.hour, 0, 0, 0);

      const [result] = await db.insert(oeeReportSchedules).values({
        userId: ctx.user.id,
        name: input.name,
        frequency: input.frequency,
        dayOfWeek: input.dayOfWeek,
        dayOfMonth: input.dayOfMonth,
        hour: input.hour,
        machineIds: input.machineIds ? JSON.stringify(input.machineIds) : null,
        recipients: JSON.stringify(input.recipients),
        includeCharts: input.includeCharts ? 1 : 0,
        includeTrend: input.includeTrend ? 1 : 0,
        includeComparison: input.includeComparison ? 1 : 0,
        nextScheduledAt,
      });
      return { id: result.insertId };
    }),

  // Update OEE report schedule
  updateOeeReportSchedule: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      frequency: z.enum(['weekly', 'monthly']).optional(),
      dayOfWeek: z.number().min(0).max(6).optional().nullable(),
      dayOfMonth: z.number().min(1).max(31).optional().nullable(),
      hour: z.number().min(0).max(23).optional(),
      machineIds: z.array(z.number()).optional().nullable(),
      recipients: z.array(z.string().email()).optional(),
      includeCharts: z.boolean().optional(),
      includeTrend: z.boolean().optional(),
      includeComparison: z.boolean().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.frequency !== undefined) updates.frequency = input.frequency;
      if (input.dayOfWeek !== undefined) updates.dayOfWeek = input.dayOfWeek;
      if (input.dayOfMonth !== undefined) updates.dayOfMonth = input.dayOfMonth;
      if (input.hour !== undefined) updates.hour = input.hour;
      if (input.machineIds !== undefined) updates.machineIds = input.machineIds ? JSON.stringify(input.machineIds) : null;
      if (input.recipients !== undefined) updates.recipients = JSON.stringify(input.recipients);
      if (input.includeCharts !== undefined) updates.includeCharts = input.includeCharts ? 1 : 0;
      if (input.includeTrend !== undefined) updates.includeTrend = input.includeTrend ? 1 : 0;
      if (input.includeComparison !== undefined) updates.includeComparison = input.includeComparison ? 1 : 0;
      if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;
      
      await db.update(oeeReportSchedules)
        .set(updates)
        .where(and(
          eq(oeeReportSchedules.id, input.id),
          eq(oeeReportSchedules.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  // Delete OEE report schedule
  deleteOeeReportSchedule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return;
      await db.delete(oeeReportSchedules)
        .where(and(
          eq(oeeReportSchedules.id, input.id),
          eq(oeeReportSchedules.userId, ctx.user.id)
        ));
      return { success: true };
    }),

  // Get OEE report history
  getOeeReportHistory: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      // Get user's schedule IDs
      const userSchedules = await db
        .select({ id: oeeReportSchedules.id })
        .from(oeeReportSchedules)
        .where(eq(oeeReportSchedules.userId, ctx.user.id));
      const scheduleIds = userSchedules.map(s => s.id);

      if (scheduleIds.length === 0) return [];

      const history = await db
        .select()
        .from(oeeReportHistory)
        .where(sql`${oeeReportHistory.scheduleId} IN (${sql.raw(scheduleIds.join(','))})`)
        .orderBy(desc(oeeReportHistory.createdAt))
        .limit(input.limit);

      return history.map(h => ({
        ...h,
        recipients: JSON.parse(h.recipients || '[]'),
        reportData: h.reportData ? JSON.parse(h.reportData) : null,
      }));
    }),

  // ==================== Downtime Analysis (Pareto) ====================
  
  // Get downtime analysis for Pareto chart
  getDowntimeAnalysis: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      days: z.number().min(1).max(90).default(30),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Build conditions
      const conditions = [gte(downtimeReasons.occurredAt, startDate)];
      if (input.machineId) {
        conditions.push(eq(downtimeReasons.machineId, input.machineId));
      }

      // Get downtime by reason code
      const byReason = await db
        .select({
          reasonCode: downtimeReasons.reasonCode,
          reasonCategory: downtimeReasons.reasonCategory,
          reasonDescription: downtimeReasons.reasonDescription,
          totalMinutes: sql<number>`SUM(${downtimeReasons.durationMinutes})`,
          occurrenceCount: sql<number>`COUNT(*)`,
        })
        .from(downtimeReasons)
        .where(and(...conditions))
        .groupBy(downtimeReasons.reasonCode, downtimeReasons.reasonCategory, downtimeReasons.reasonDescription)
        .orderBy(desc(sql`SUM(${downtimeReasons.durationMinutes})`));

      // Get downtime by category
      const byCategory = await db
        .select({
          category: downtimeReasons.reasonCategory,
          totalMinutes: sql<number>`SUM(${downtimeReasons.durationMinutes})`,
          occurrenceCount: sql<number>`COUNT(*)`,
        })
        .from(downtimeReasons)
        .where(and(...conditions))
        .groupBy(downtimeReasons.reasonCategory)
        .orderBy(desc(sql`SUM(${downtimeReasons.durationMinutes})`));

      // Get downtime by machine
      const byMachine = await db
        .select({
          machineId: downtimeReasons.machineId,
          totalMinutes: sql<number>`SUM(${downtimeReasons.durationMinutes})`,
          occurrenceCount: sql<number>`COUNT(*)`,
        })
        .from(downtimeReasons)
        .where(gte(downtimeReasons.occurredAt, startDate))
        .groupBy(downtimeReasons.machineId)
        .orderBy(desc(sql`SUM(${downtimeReasons.durationMinutes})`));

      // Get machine names
      const machineNames = await db
        .select({ machineId: machineApiKeys.machineId, name: machineApiKeys.name })
        .from(machineApiKeys)
        .groupBy(machineApiKeys.machineId);
      const nameMap = new Map(machineNames.map(m => [m.machineId, m.name]));

      // Calculate total for percentage
      const totalDowntime = byReason.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);

      // Calculate cumulative percentage for Pareto
      let cumulative = 0;
      const paretoData = byReason.map(r => {
        const percentage = totalDowntime > 0 ? ((r.totalMinutes || 0) / totalDowntime) * 100 : 0;
        cumulative += percentage;
        return {
          reasonCode: r.reasonCode,
          reasonCategory: r.reasonCategory || 'Khác',
          reasonDescription: r.reasonDescription || r.reasonCode,
          totalMinutes: r.totalMinutes || 0,
          occurrenceCount: r.occurrenceCount || 0,
          percentage: parseFloat(percentage.toFixed(1)),
          cumulativePercentage: parseFloat(cumulative.toFixed(1)),
        };
      });

      return {
        paretoData,
        byCategory: byCategory.map(c => ({
          category: c.category || 'Khác',
          totalMinutes: c.totalMinutes || 0,
          occurrenceCount: c.occurrenceCount || 0,
          percentage: totalDowntime > 0 ? parseFloat((((c.totalMinutes || 0) / totalDowntime) * 100).toFixed(1)) : 0,
        })),
        byMachine: byMachine.map(m => ({
          machineId: m.machineId,
          machineName: nameMap.get(m.machineId!) || `Machine ${m.machineId}`,
          totalMinutes: m.totalMinutes || 0,
          occurrenceCount: m.occurrenceCount || 0,
        })),
        summary: {
          totalDowntimeMinutes: totalDowntime,
          totalDowntimeHours: parseFloat((totalDowntime / 60).toFixed(1)),
          uniqueReasons: byReason.length,
          uniqueCategories: byCategory.length,
          days: input.days,
        },
      };
    }),

  // Add downtime reason (for manual entry or from OEE data)
  addDowntimeReason: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      oeeDataId: z.number().optional(),
      reasonCode: z.string().min(1),
      reasonCategory: z.string().optional(),
      reasonDescription: z.string().optional(),
      durationMinutes: z.number().min(1),
      occurredAt: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return;
      const [result] = await db.insert(downtimeReasons).values({
        machineId: input.machineId,
        oeeDataId: input.oeeDataId,
        reasonCode: input.reasonCode,
        reasonCategory: input.reasonCategory,
        reasonDescription: input.reasonDescription,
        durationMinutes: input.durationMinutes,
        occurredAt: new Date(input.occurredAt),
      });
      return { id: result.insertId };
    }),

  // Get OEE hourly trend for pattern analysis
  getOeeHourlyTrend: protectedProcedure
    .input(z.object({
      machineId: z.number().optional(),
      days: z.number().default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      if (!db) return;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      
      const conditions = [gte(machineOeeData.recordedAt, startDate)];
      if (input.machineId) {
        conditions.push(eq(machineOeeData.machineId, input.machineId));
      }
      
      // Get OEE by hour of day
      const hourlyData = await db
        .select({
          hour: sql<number>`HOUR(${machineOeeData.recordedAt})`,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          avgAvailability: sql<number>`AVG(${machineOeeData.availability})`,
          avgPerformance: sql<number>`AVG(${machineOeeData.performance})`,
          avgQuality: sql<number>`AVG(${machineOeeData.quality})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(and(...conditions))
        .groupBy(sql`HOUR(${machineOeeData.recordedAt})`)
        .orderBy(sql`HOUR(${machineOeeData.recordedAt})`);
      
      // Get OEE heatmap (hour x day of week)
      const heatmapData = await db
        .select({
          dayOfWeek: sql<number>`DAYOFWEEK(${machineOeeData.recordedAt})`,
          hour: sql<number>`HOUR(${machineOeeData.recordedAt})`,
          avgOee: sql<number>`AVG(${machineOeeData.oee})`,
          recordCount: sql<number>`COUNT(*)`,
        })
        .from(machineOeeData)
        .where(and(...conditions))
        .groupBy(sql`DAYOFWEEK(${machineOeeData.recordedAt})`, sql`HOUR(${machineOeeData.recordedAt})`)
        .orderBy(sql`DAYOFWEEK(${machineOeeData.recordedAt})`, sql`HOUR(${machineOeeData.recordedAt})`);
      
      // Find lowest OEE hours
      const lowestHours = [...hourlyData]
        .sort((a, b) => (a.avgOee || 0) - (b.avgOee || 0))
        .slice(0, 3)
        .map(h => ({
          hour: h.hour,
          avgOee: h.avgOee || 0,
          timeRange: `${String(h.hour).padStart(2, '0')}:00 - ${String(h.hour + 1).padStart(2, '0')}:00`,
        }));
      
      // Find highest OEE hours
      const highestHours = [...hourlyData]
        .sort((a, b) => (b.avgOee || 0) - (a.avgOee || 0))
        .slice(0, 3)
        .map(h => ({
          hour: h.hour,
          avgOee: h.avgOee || 0,
          timeRange: `${String(h.hour).padStart(2, '0')}:00 - ${String(h.hour + 1).padStart(2, '0')}:00`,
        }));
      
      // Calculate shift averages (morning: 6-14, afternoon: 14-22, night: 22-6)
      const shiftData = {
        morning: hourlyData.filter(h => h.hour >= 6 && h.hour < 14),
        afternoon: hourlyData.filter(h => h.hour >= 14 && h.hour < 22),
        night: hourlyData.filter(h => h.hour >= 22 || h.hour < 6),
      };
      
      const shiftAverages = {
        morning: shiftData.morning.length > 0
          ? shiftData.morning.reduce((sum, h) => sum + (h.avgOee || 0), 0) / shiftData.morning.length
          : 0,
        afternoon: shiftData.afternoon.length > 0
          ? shiftData.afternoon.reduce((sum, h) => sum + (h.avgOee || 0), 0) / shiftData.afternoon.length
          : 0,
        night: shiftData.night.length > 0
          ? shiftData.night.reduce((sum, h) => sum + (h.avgOee || 0), 0) / shiftData.night.length
          : 0,
      };
      
      return {
        hourlyData: hourlyData.map(h => ({
          hour: h.hour,
          avgOee: h.avgOee || 0,
          avgAvailability: h.avgAvailability || 0,
          avgPerformance: h.avgPerformance || 0,
          avgQuality: h.avgQuality || 0,
          recordCount: h.recordCount || 0,
        })),
        heatmapData: heatmapData.map(h => ({
          dayOfWeek: h.dayOfWeek,
          hour: h.hour,
          avgOee: h.avgOee || 0,
          recordCount: h.recordCount || 0,
        })),
        lowestHours,
        highestHours,
        shiftAverages,
      };
    }),

  // Get predefined downtime reason codes
  getDowntimeReasonCodes: protectedProcedure
    .query(async () => {
      // Return predefined reason codes with categories
      return [
        { code: 'EQ_BREAKDOWN', category: 'Equipment', description: 'Hỏng thiết bị' },
        { code: 'EQ_MAINTENANCE', category: 'Equipment', description: 'Bảo trì định kỳ' },
        { code: 'EQ_SETUP', category: 'Equipment', description: 'Cài đặt/điều chỉnh máy' },
        { code: 'EQ_TOOLCHANGE', category: 'Equipment', description: 'Thay dụng cụ' },
        { code: 'MAT_SHORTAGE', category: 'Material', description: 'Thiếu nguyên liệu' },
        { code: 'MAT_QUALITY', category: 'Material', description: 'Lỗi nguyên liệu' },
        { code: 'MAT_CHANGEOVER', category: 'Material', description: 'Thay đổi nguyên liệu' },
        { code: 'LAB_SHORTAGE', category: 'Labor', description: 'Thiếu nhân lực' },
        { code: 'LAB_TRAINING', category: 'Labor', description: 'Đào tạo' },
        { code: 'LAB_BREAK', category: 'Labor', description: 'Nghỉ giải lao' },
        { code: 'PLAN_NOORDER', category: 'Planning', description: 'Không có đơn hàng' },
        { code: 'PLAN_CHANGEOVER', category: 'Planning', description: 'Chuyển đổi sản phẩm' },
        { code: 'QUAL_INSPECTION', category: 'Quality', description: 'Kiểm tra chất lượng' },
        { code: 'QUAL_REWORK', category: 'Quality', description: 'Sửa lỗi sản phẩm' },
        { code: 'EXT_POWER', category: 'External', description: 'Mất điện' },
        { code: 'EXT_WEATHER', category: 'External', description: 'Thời tiết' },
        { code: 'OTHER', category: 'Other', description: 'Khác' },
      ];
    }),
});

// ==================== Public API Endpoints (for machine vendors) ====================

export const machinePublicRouter = router({
  // Push inspection data from AOI/AVI machines
  pushInspectionData: publicProcedure
    .input(z.object({
      apiKey: z.string(),
      data: z.array(z.object({
        batchId: z.string().optional(),
        productCode: z.string().optional(),
        serialNumber: z.string().optional(),
        inspectionType: z.string(),
        inspectionResult: z.enum(["pass", "fail", "rework"]),
        defectCount: z.number().optional(),
        defectTypes: z.array(z.string()).optional(),
        defectDetails: z.any().optional(),
        imageUrls: z.array(z.string()).optional(),
        inspectedAt: z.string(),
        cycleTimeMs: z.number().optional(),
        operatorId: z.string().optional(),
        shiftId: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      
      // Validate API key
      const keyInfo = await validateApiKey(input.apiKey);
      if (!keyInfo) {
        return {
          success: false,
          error: "Invalid or expired API key",
          code: "INVALID_API_KEY",
        };
      }

      try {
        const db = await getDb();
        
        if (!db) return;
        
        // Apply field mappings to each data item
        const processedData = await Promise.all(input.data.map(async (item) => {
          const { transformedData, mappingsApplied } = await applyFieldMappings(
            keyInfo.id,
            keyInfo.machineType,
            'inspection_data',
            item as Record<string, unknown>
          );
          
          // Log mapping result if mappings were applied
          if (mappingsApplied > 0) {
            await logMappingResult(keyInfo.id, 'inspection_data', mappingsApplied, true);
          }
          
          return { ...item, ...transformedData };
        }));
        
        // Insert inspection data
        const insertData = processedData.map(item => ({
          apiKeyId: keyInfo.id,
          machineId: keyInfo.machineId,
          productionLineId: keyInfo.productionLineId,
          batchId: item.batchId,
          productCode: item.productCode,
          serialNumber: item.serialNumber,
          inspectionType: item.inspectionType,
          inspectionResult: item.inspectionResult,
          defectCount: item.defectCount || 0,
          defectTypes: item.defectTypes ? JSON.stringify(item.defectTypes) : null,
          defectDetails: item.defectDetails ? JSON.stringify(item.defectDetails) : null,
          imageUrls: item.imageUrls ? JSON.stringify(item.imageUrls) : null,
          inspectedAt: new Date(item.inspectedAt),
          cycleTimeMs: item.cycleTimeMs,
          operatorId: item.operatorId,
          shiftId: item.shiftId,
          rawData: JSON.stringify(item),
        }));

        await db.insert(machineInspectionData).values(insertData);

        // Check for failed inspections and trigger webhooks
        const failedInspections = processedData.filter(d => d.inspectionResult === "fail" || (d.inspectionResult as string) === "ng");
        if (failedInspections.length > 0) {
          // Create realtime event for failed inspections
          await db.insert(machineRealtimeEvents).values({
            eventType: "inspection",
            machineId: keyInfo.machineId,
            machineName: keyInfo.name,
            apiKeyId: keyInfo.id,
            eventData: JSON.stringify({
              type: "inspection_fail",
              failedCount: failedInspections.length,
              totalCount: input.data.length,
              samples: failedInspections.slice(0, 5),
            }),
            severity: failedInspections.length > 5 ? "critical" : "warning",
          });

          // Trigger webhooks for inspection failures
          const webhooks = await db.select().from(machineWebhookConfigs)
            .where(and(
              eq(machineWebhookConfigs.isActive, 1),
              sql`${machineWebhookConfigs.triggerType} IN ('inspection_fail', 'all')`
            ));

          for (const webhook of webhooks) {
            const machineIds = webhook.machineIds ? JSON.parse(webhook.machineIds) : null;
            if (machineIds && !machineIds.includes(keyInfo.machineId)) continue;

            const payload = {
              type: "inspection_fail",
              timestamp: new Date().toISOString(),
              machineId: keyInfo.machineId,
              machineName: keyInfo.name,
              failedCount: failedInspections.length,
              totalCount: input.data.length,
              failureRate: (failedInspections.length / input.data.length * 100).toFixed(2) + "%",
              samples: failedInspections.slice(0, 5),
            };

            // Fire and forget webhook call
            triggerWebhook(webhook, payload, "inspection_fail").catch(console.error);
          }
        }

        const processingTime = Date.now() - startTime;
        await logRequest(
          keyInfo.id,
          "/api/machine/push-inspection-data",
          "POST",
          JSON.stringify({ count: input.data.length }),
          200,
          JSON.stringify({ success: true, count: input.data.length }),
          processingTime,
          null,
          null,
          null
        );

        return {
          success: true,
          message: `Successfully received ${input.data.length} inspection records`,
          count: input.data.length,
        };
      } catch (error: any) {
        const processingTime = Date.now() - startTime;
        await logRequest(
          keyInfo.id,
          "/api/machine/push-inspection-data",
          "POST",
          JSON.stringify({ count: input.data.length }),
          500,
          null,
          processingTime,
          null,
          null,
          error.message
        );

        return {
          success: false,
          error: "Failed to process inspection data",
          code: "PROCESSING_ERROR",
        };
      }
    }),

  // Push measurement data for SPC
  pushMeasurementData: publicProcedure
    .input(z.object({
      apiKey: z.string(),
      data: z.array(z.object({
        batchId: z.string().optional(),
        productCode: z.string().optional(),
        serialNumber: z.string().optional(),
        parameterName: z.string(),
        parameterCode: z.string().optional(),
        measuredValue: z.number(),
        unit: z.string().optional(),
        lsl: z.number().optional(),
        usl: z.number().optional(),
        target: z.number().optional(),
        measuredAt: z.string(),
        operatorId: z.string().optional(),
        shiftId: z.string().optional(),
      })),
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      
      const keyInfo = await validateApiKey(input.apiKey);
      if (!keyInfo) {
        return {
          success: false,
          error: "Invalid or expired API key",
          code: "INVALID_API_KEY",
        };
      }

      try {
        const db = await getDb();
        
        if (!db) return;
        
        // Apply field mappings to each data item
        const processedData = await Promise.all(input.data.map(async (item) => {
          const { transformedData, mappingsApplied } = await applyFieldMappings(
            keyInfo.id,
            keyInfo.machineType,
            'measurements',
            item as Record<string, unknown>
          );
          
          // Log mapping result if mappings were applied
          if (mappingsApplied > 0) {
            await logMappingResult(keyInfo.id, 'measurements', mappingsApplied, true);
          }
          
          return { ...item, ...transformedData };
        }));
        
        const insertData = processedData.map(item => {
          const isWithinSpec = item.lsl !== undefined && item.usl !== undefined
            ? (item.measuredValue >= item.lsl && item.measuredValue <= item.usl ? 1 : 0)
            : null;

          return {
            apiKeyId: keyInfo.id,
            machineId: keyInfo.machineId,
            productionLineId: keyInfo.productionLineId,
            batchId: item.batchId,
            productCode: item.productCode,
            serialNumber: item.serialNumber,
            parameterName: item.parameterName,
            parameterCode: item.parameterCode,
            measuredValue: item.measuredValue.toString(),
            unit: item.unit,
            lsl: item.lsl?.toString(),
            usl: item.usl?.toString(),
            target: item.target?.toString(),
            isWithinSpec,
            measuredAt: new Date(item.measuredAt),
            operatorId: item.operatorId,
            shiftId: item.shiftId,
            rawData: JSON.stringify(item),
          };
        });

        await db.insert(machineMeasurementData).values(insertData);

        // Check for out-of-spec measurements and trigger webhooks
        const outOfSpecMeasurements = processedData.filter(item => {
          if (item.lsl !== undefined && item.usl !== undefined) {
            return item.measuredValue < item.lsl || item.measuredValue > item.usl;
          }
          return false;
        }).map(item => ({
          parameterName: item.parameterName,
          measuredValue: item.measuredValue,
          lsl: item.lsl,
          usl: item.usl,
        }));

        if (outOfSpecMeasurements.length > 0) {
          // Create realtime event for out-of-spec measurements
          await db.insert(machineRealtimeEvents).values({
            eventType: 'measurement',
            machineId: keyInfo.machineId,
            machineName: keyInfo.name,
            apiKeyId: keyInfo.id,
            eventData: JSON.stringify({
              type: 'measurement_out_of_spec',
              outOfSpecCount: outOfSpecMeasurements.length,
              totalCount: input.data.length,
              samples: outOfSpecMeasurements.slice(0, 5),
            }),
            severity: outOfSpecMeasurements.length > 5 ? 'critical' : 'error',
          });

          // Trigger webhooks for out-of-spec measurements
          await checkAndTriggerMeasurementWebhooks(
            keyInfo.id,
            keyInfo.machineId,
            keyInfo.name,
            outOfSpecMeasurements
          );
        }

        const processingTime = Date.now() - startTime;
        await logRequest(
          keyInfo.id,
          "/api/machine/push-measurement-data",
          "POST",
          JSON.stringify({ count: input.data.length }),
          200,
          JSON.stringify({ success: true, count: input.data.length, outOfSpec: outOfSpecMeasurements.length }),
          processingTime,
          null,
          null,
          null
        );

        return {
          success: true,
          message: `Successfully received ${input.data.length} measurement records`,
          count: input.data.length,
          outOfSpecCount: outOfSpecMeasurements.length,
        };
      } catch (error: any) {
        const processingTime = Date.now() - startTime;
        await logRequest(
          keyInfo.id,
          "/api/machine/push-measurement-data",
          "POST",
          JSON.stringify({ count: input.data.length }),
          500,
          null,
          processingTime,
          null,
          null,
          error.message
        );

        return {
          success: false,
          error: "Failed to process measurement data",
          code: "PROCESSING_ERROR",
        };
      }
    }),

  // Push OEE data
  pushOeeData: publicProcedure
    .input(z.object({
      apiKey: z.string(),
      data: z.array(z.object({
        shiftId: z.string().optional(),
        recordDate: z.string(),
        plannedProductionTime: z.number().optional(),
        actualProductionTime: z.number().optional(),
        downtime: z.number().optional(),
        downtimeReasons: z.array(z.object({
          reason: z.string(),
          duration: z.number(),
        })).optional(),
        idealCycleTime: z.number().optional(),
        actualCycleTime: z.number().optional(),
        totalCount: z.number().optional(),
        goodCount: z.number().optional(),
        rejectCount: z.number().optional(),
        reworkCount: z.number().optional(),
        availability: z.number().optional(),
        performance: z.number().optional(),
        quality: z.number().optional(),
        oee: z.number().optional(),
        recordedAt: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      const startTime = Date.now();
      
      const keyInfo = await validateApiKey(input.apiKey);
      if (!keyInfo) {
        return {
          success: false,
          error: "Invalid or expired API key",
          code: "INVALID_API_KEY",
        };
      }

      try {
        const db = await getDb();
        
        if (!db) return;
        
        // Apply field mappings to each data item
        const processedData = await Promise.all(input.data.map(async (item) => {
          const { transformedData, mappingsApplied } = await applyFieldMappings(
            keyInfo.id,
            keyInfo.machineType,
            'oee_records',
            item as Record<string, unknown>
          );
          
          // Log mapping result if mappings were applied
          if (mappingsApplied > 0) {
            await logMappingResult(keyInfo.id, 'oee_records', mappingsApplied, true);
          }
          
          return { ...item, ...transformedData };
        }));
        
        const insertData = processedData.map(item => ({
          apiKeyId: keyInfo.id,
          machineId: keyInfo.machineId,
          productionLineId: keyInfo.productionLineId,
          shiftId: item.shiftId,
          recordDate: item.recordDate,
          plannedProductionTime: item.plannedProductionTime,
          actualProductionTime: item.actualProductionTime,
          downtime: item.downtime,
          downtimeReasons: item.downtimeReasons ? JSON.stringify(item.downtimeReasons) : null,
          idealCycleTime: item.idealCycleTime?.toString(),
          actualCycleTime: item.actualCycleTime?.toString(),
          totalCount: item.totalCount,
          goodCount: item.goodCount,
          rejectCount: item.rejectCount,
          reworkCount: item.reworkCount,
          availability: item.availability?.toString(),
          performance: item.performance?.toString(),
          quality: item.quality?.toString(),
          oee: item.oee?.toString(),
          recordedAt: new Date(item.recordedAt),
          rawData: JSON.stringify(item),
        }));

        await db.insert(machineOeeData).values(insertData);

        // Check for low OEE values and trigger webhooks
        let lowOeeCount = 0;
        for (const item of processedData) {
          if (item.oee !== undefined) {
            // Create realtime event for OEE data
            await db.insert(machineRealtimeEvents).values({
              eventType: 'oee',
              machineId: keyInfo.machineId,
              machineName: keyInfo.name,
              apiKeyId: keyInfo.id,
              eventData: JSON.stringify({
                type: 'oee_update',
                oee: item.oee,
                availability: item.availability,
                performance: item.performance,
                quality: item.quality,
                recordDate: item.recordDate,
              }),
              severity: item.oee < 60 ? 'critical' : item.oee < 85 ? 'warning' : 'info',
            });

            // Trigger webhook if OEE is low
            await checkAndTriggerOeeWebhooks(
              keyInfo.id,
              keyInfo.machineId,
              keyInfo.name,
              item.oee,
              {
                availability: item.availability,
                performance: item.performance,
                quality: item.quality,
                recordDate: item.recordDate,
                downtime: item.downtime,
                totalCount: item.totalCount,
                goodCount: item.goodCount,
                rejectCount: item.rejectCount,
              }
            );
            
            if (item.oee < 85) lowOeeCount++;
          }
        }

        const processingTime = Date.now() - startTime;
        await logRequest(
          keyInfo.id,
          "/api/machine/push-oee-data",
          "POST",
          JSON.stringify({ count: input.data.length }),
          200,
          JSON.stringify({ success: true, count: input.data.length, lowOeeCount }),
          processingTime,
          null,
          null,
          null
        );

        return {
          success: true,
          message: `Successfully received ${input.data.length} OEE records`,
          count: input.data.length,
          lowOeeCount,
        };
      } catch (error: any) {
        const processingTime = Date.now() - startTime;
        await logRequest(
          keyInfo.id,
          "/api/machine/push-oee-data",
          "POST",
          JSON.stringify({ count: input.data.length }),
          500,
          null,
          processingTime,
          null,
          null,
          error.message
        );

        return {
          success: false,
          error: "Failed to process OEE data",
          code: "PROCESSING_ERROR",
        };
      }
    }),

  // Health check endpoint
  healthCheck: publicProcedure
    .input(z.object({ apiKey: z.string() }))
    .query(async ({ input }) => {
      const keyInfo = await validateApiKey(input.apiKey);
      if (!keyInfo) {
        return {
          success: false,
          error: "Invalid or expired API key",
          code: "INVALID_API_KEY",
        };
      }

      return {
        success: true,
        status: "healthy",
        keyInfo: {
          name: keyInfo.name,
          vendorName: keyInfo.vendorName,
          machineType: keyInfo.machineType,
          rateLimit: keyInfo.rateLimit,
          expiresAt: keyInfo.expiresAt,
        },
      };
    }),
});
