import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./trpc";
import { getDb } from "../db";
import { systemConfig, companyInfo } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";
import { isWebSocketEnabled, setWebSocketEnabled, realtimeWebSocketServer, loadWebSocketConfig, getEventLog, clearEventLog } from "../websocketServer";
import { getConnectedClientsCount as getSseClientCount, isSseServerEnabled, setSseServerEnabled, getSseEventLog, clearSseEventLog } from "../sse";
import { getRecentLogs, clearLogBuffer, getLogStats, type LogLevel } from "./logger";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // Check if system is initialized
  getSetupStatus: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { isInitialized: false };
      const [config] = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, "system_initialized"))
        .limit(1);
      return {
        isInitialized: config?.configValue === "true",
      };
    } catch {
      return { isInitialized: false };
    }
  }),

  // Save setup configuration
  saveSetupConfig: publicProcedure
    .input(
      z.object({
        configs: z.array(
          z.object({
            key: z.string(),
            value: z.string(),
            type: z.string().optional(),
            encrypted: z.boolean().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      for (const config of input.configs) {
        // Check if config exists
        const [existing] = await db
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.configKey, config.key))
          .limit(1);

        if (existing) {
          await db
            .update(systemConfig)
            .set({
              configValue: config.value,
              configType: config.type || "string",
              isEncrypted: config.encrypted ? 1 : 0,
            })
            .where(eq(systemConfig.configKey, config.key));
        } else {
          await db.insert(systemConfig).values({
            configKey: config.key,
            configValue: config.value,
            configType: config.type || "string",
            isEncrypted: config.encrypted ? 1 : 0,
          });
        }
      }
      return { success: true };
    }),

  // Save company info
  saveCompanyInfo: publicProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        companyCode: z.string().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        website: z.string().optional(),
        taxCode: z.string().optional(),
        industry: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      // Check if company info exists
      const [existing] = await db.select().from(companyInfo).limit(1);

      if (existing) {
        await db
          .update(companyInfo)
          .set({
            companyName: input.companyName,
            companyCode: input.companyCode,
            address: input.address,
            phone: input.phone,
            email: input.email,
            website: input.website,
            taxCode: input.taxCode,
            industry: input.industry,
            contactPerson: input.contactPerson,
            contactPhone: input.contactPhone,
            contactEmail: input.contactEmail,
            notes: input.notes,
          })
          .where(eq(companyInfo.id, existing.id));
      } else {
        await db.insert(companyInfo).values({
          companyName: input.companyName,
          companyCode: input.companyCode,
          address: input.address,
          phone: input.phone,
          email: input.email,
          website: input.website,
          taxCode: input.taxCode,
          industry: input.industry,
          contactPerson: input.contactPerson,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          notes: input.notes,
        });
      }
      return { success: true };
    }),

  // Get company info
  getCompanyInfo: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const [company] = await db.select().from(companyInfo).limit(1);
    return company || null;
  }),

  // Complete setup
  completeSetup: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    // Check if already initialized
    const [existing] = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, "system_initialized"))
      .limit(1);

    if (existing) {
      await db
        .update(systemConfig)
        .set({ configValue: "true" })
        .where(eq(systemConfig.configKey, "system_initialized"));
    } else {
      await db.insert(systemConfig).values({
        configKey: "system_initialized",
        configValue: "true",
        configType: "boolean",
        description: "System has been initialized",
      });
    }
    return { success: true };
  }),

  // Get system config
  getConfig: protectedProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [config] = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, input.key))
        .limit(1);
      return config || null;
    }),

  // Get all configs
  getAllConfigs: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const configs = await db.select().from(systemConfig);
    return configs;
  }),

  // Update config
  updateConfig: adminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
        type: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const [existing] = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, input.key))
        .limit(1);

      if (existing) {
        await db
          .update(systemConfig)
          .set({
            configValue: input.value,
            configType: input.type || existing.configType,
          })
          .where(eq(systemConfig.configKey, input.key));
      } else {
        await db.insert(systemConfig).values({
          configKey: input.key,
          configValue: input.value,
          configType: input.type || "string",
        });
      }
      return { success: true };
    }),

  // SSE status
  getSseStatus: publicProcedure.query(() => {
    return {
      enabled: isSseServerEnabled(),
      clientCount: getSseClientCount(),
    };
  }),

  // Toggle SSE server
  setSseServerEnabled: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      setSseServerEnabled(input.enabled);
      return { success: true, enabled: input.enabled };
    }),

  // Get SSE event log
  getSseEventLog: adminProcedure
    .input(z.object({ limit: z.number().optional().default(100) }))
    .query(({ input }) => {
      return getSseEventLog(input.limit);
    }),

  // Clear SSE event log
  clearSseEventLog: adminProcedure
    .mutation(() => {
      clearSseEventLog();
      return { success: true };
    }),

  // WebSocket status
  getWebSocketStatus: publicProcedure.query(() => {
    return {
      enabled: isWebSocketEnabled(),
      initialized: realtimeWebSocketServer.isInitialized(),
      clientCount: realtimeWebSocketServer.getClientCount(),
    };
  }),

  // Toggle WebSocket
  setWebSocketEnabled: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      await setWebSocketEnabled(input.enabled);
      return { success: true, enabled: input.enabled };
    }),

  // Get WebSocket event log
  getWebSocketEventLog: adminProcedure
    .input(z.object({ limit: z.number().optional().default(100) }))
    .query(({ input }) => {
      return getEventLog(input.limit);
    }),

  // Clear WebSocket event log
  clearWebSocketEventLog: adminProcedure
    .mutation(() => {
      clearEventLog();
      return { success: true };
    }),

  // Get application logs
  getLogs: adminProcedure
    .input(
      z.object({
        count: z.number().optional().default(100),
        level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
      })
    )
    .query(({ input }) => {
      return getRecentLogs(input.count, input.level as LogLevel | undefined);
    }),

  // Get log statistics
  getLogStats: adminProcedure.query(() => {
    return getLogStats();
  }),

  // Clear log buffer
  clearLogs: adminProcedure.mutation(() => {
    clearLogBuffer();
    return { success: true };
  }),

  // Upload company logo to S3
  uploadLogo: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      // Convert base64 to buffer
      const buffer = Buffer.from(input.base64Data, "base64");
      
      // Generate unique filename
      const timestamp = Date.now();
      const ext = input.filename.split(".").pop() || "png";
      const fileKey = `company-logos/logo-${timestamp}.${ext}`;
      
      // Upload to S3
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      
      // Update company info with new logo URL
      const [existing] = await db.select().from(companyInfo).limit(1);
      if (existing) {
        await db
          .update(companyInfo)
          .set({ logo: url })
          .where(eq(companyInfo.id, existing.id));
      }
      
      return { success: true, url };
    }),
});
