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

// Trigger webhook with retry logic
async function triggerWebhook(
  webhook: typeof machineWebhookConfigs.$inferSelect,
  payload: Record<string, unknown>,
  triggerType: string,
  attempt = 1
) {
  const db = await getDb();
  
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
      headers: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [result] = await db.insert(machineWebhookConfigs).values({
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
      return { id: result.insertId };
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
      headers: z.record(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
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
      await db.delete(machineFieldMappings).where(eq(machineFieldMappings.id, input.id));
      return { success: true };
    }),

  detectFields: protectedProcedure
    .input(z.object({ sampleData: z.record(z.unknown()) }))
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
        // Insert inspection data
        const insertData = input.data.map(item => ({
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
        const failedInspections = input.data.filter(d => d.inspectionResult === "fail" || d.inspectionResult === "ng");
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
        const insertData = input.data.map(item => {
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

        const processingTime = Date.now() - startTime;
        await logRequest(
          keyInfo.id,
          "/api/machine/push-measurement-data",
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
          message: `Successfully received ${input.data.length} measurement records`,
          count: input.data.length,
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
        const insertData = input.data.map(item => ({
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

        const processingTime = Date.now() - startTime;
        await logRequest(
          keyInfo.id,
          "/api/machine/push-oee-data",
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
          message: `Successfully received ${input.data.length} OEE records`,
          count: input.data.length,
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
