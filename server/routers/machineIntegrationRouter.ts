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
