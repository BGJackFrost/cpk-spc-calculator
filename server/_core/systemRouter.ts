import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, protectedProcedure, router } from "./trpc";
import { getDb } from "../db";
import { getPgStatus, isPgConfigured } from "../db-postgresql";
import { getDatabaseType, getAllDatabaseStatuses, listTables } from "../db-unified";
import { systemConfig, companyInfo, twilioConfig, webhookConfig, alertAnalytics, kpiAlertStats } from "../../drizzle/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";
import { storagePut } from "../storage";
import { isWebSocketEnabled, setWebSocketEnabled, realtimeWebSocketServer, loadWebSocketConfig, getEventLog, clearEventLog } from "../websocketServer";
import { getConnectedClientsCount as getSseClientCount, isSseServerEnabled, setSseServerEnabled, getSseEventLog, clearSseEventLog } from "../sse";
import { getRecentLogs, clearLogBuffer, getLogStats, type LogLevel } from "./logger";
import { getFailoverState, startFailoverMonitoring, stopFailoverMonitoring, manualFailover, manualRecovery, isFailoverActive, getActiveDatabase } from "../db-failover";

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

  // Database health check - monitor both MySQL and PostgreSQL
  databaseHealth: publicProcedure.query(async () => {
    const startTime = Date.now();
    
    // Get all database statuses
    const statuses = await getAllDatabaseStatuses();
    
    // Get active database type
    const activeDb = getDatabaseType();
    
    // Get table count for active database
    let tableCount = 0;
    try {
      const tables = await listTables();
      tableCount = tables.length;
    } catch (e) {
      // Ignore errors
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
    return {
      status: statuses[activeDb].connected ? 'healthy' : 'unhealthy',
      activeDatabase: activeDb,
      responseTimeMs: responseTime,
      tableCount,
      databases: {
        mysql: {
          configured: statuses.mysql.configured,
          connected: statuses.mysql.connected,
          status: statuses.mysql.connected ? 'connected' : (statuses.mysql.configured ? 'disconnected' : 'not_configured'),
        },
        postgresql: {
          configured: statuses.postgresql.configured,
          connected: statuses.postgresql.connected,
          status: statuses.postgresql.connected ? 'connected' : (statuses.postgresql.configured ? 'disconnected' : 'not_configured'),
        },
      },
      timestamp: new Date().toISOString(),
    };
  }),

  // Detailed database status (admin only)
  databaseStatus: adminProcedure.query(async () => {
    const startTime = Date.now();
    
    // MySQL status
    let mysqlStatus: {
      configured: boolean;
      connected: boolean;
      tableCount?: number;
      error?: string;
    } = { configured: false, connected: false };
    
    try {
      const db = await getDb();
      if (db) {
        mysqlStatus.configured = true;
        mysqlStatus.connected = true;
        
        // Count tables
        const result = await db.execute(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE()`
        );
        mysqlStatus.tableCount = (result[0] as any)?.[0]?.count || 0;
      }
    } catch (e: any) {
      mysqlStatus.configured = !!process.env.DATABASE_URL;
      mysqlStatus.error = e.message;
    }
    
    // PostgreSQL status
    let pgStatus: {
      configured: boolean;
      connected: boolean;
      tableCount?: number;
      poolSize?: number;
      idleCount?: number;
      error?: string;
    } = { configured: false, connected: false };
    
    try {
      const status = await getPgStatus();
      pgStatus.configured = status.configured;
      pgStatus.connected = status.connected;
      pgStatus.poolSize = status.poolSize;
      pgStatus.idleCount = status.idleCount;
      
      if (status.connected) {
        // Count tables
        const { executePgQuery } = await import("../db-postgresql");
        const result = await executePgQuery<{ count: string }>(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );
        pgStatus.tableCount = parseInt(result[0]?.count || '0');
      }
    } catch (e: any) {
      pgStatus.configured = isPgConfigured();
      pgStatus.error = e.message;
    }
    
    const responseTime = Date.now() - startTime;
    
    return {
      activeDatabase: getDatabaseType(),
      responseTimeMs: responseTime,
      mysql: mysqlStatus,
      postgresql: pgStatus,
      environment: {
        DATABASE_TYPE: process.env.DATABASE_TYPE || 'mysql (default)',
        DATABASE_URL: process.env.DATABASE_URL ? '***configured***' : 'not set',
        POSTGRES_URL: process.env.POSTGRES_URL ? '***configured***' : 'not set',
      },
      timestamp: new Date().toISOString(),
    };
  }),

  // Switch active database (admin only)
  switchDatabase: adminProcedure
    .input(z.object({
      database: z.enum(['mysql', 'postgresql']),
    }))
    .mutation(async ({ input }) => {
      // Note: This only returns info about what would need to change
      // Actual switching requires changing DATABASE_TYPE env var and restarting
      const currentDb = getDatabaseType();
      
      if (input.database === currentDb) {
        return {
          success: true,
          message: `Already using ${input.database}`,
          currentDatabase: currentDb,
        };
      }
      
      // Check if target database is configured
      if (input.database === 'postgresql') {
        if (!isPgConfigured()) {
          return {
            success: false,
            message: 'PostgreSQL is not configured. Set POSTGRES_URL environment variable.',
            currentDatabase: currentDb,
          };
        }
      } else {
        if (!process.env.DATABASE_URL) {
          return {
            success: false,
            message: 'MySQL is not configured. Set DATABASE_URL environment variable.',
            currentDatabase: currentDb,
          };
        }
      }
      
      return {
        success: false,
        message: `To switch to ${input.database}, set DATABASE_TYPE=${input.database} in environment and restart the server.`,
        currentDatabase: currentDb,
        targetDatabase: input.database,
        instructions: [
          `1. Set DATABASE_TYPE=${input.database} in environment variables`,
          '2. Restart the server',
          '3. Verify connection with /api/trpc/system.databaseHealth',
        ],
      };
    }),

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

  // Database failover status
  failoverStatus: publicProcedure.query(async () => {
    const state = getFailoverState();
    return {
      enabled: process.env.DATABASE_FAILOVER_ENABLED === 'true',
      activeDatabase: state.activeDatabase,
      isFailoverActive: isFailoverActive(),
      mysqlHealthy: state.mysqlHealthy,
      postgresqlHealthy: state.postgresqlHealthy,
      lastMysqlCheck: state.lastMysqlCheck?.toISOString() || null,
      lastPostgresqlCheck: state.lastPostgresqlCheck?.toISOString() || null,
      failoverCount: state.failoverCount,
      recoveryCount: state.recoveryCount,
      lastFailoverAt: state.lastFailoverAt?.toISOString() || null,
      lastRecoveryAt: state.lastRecoveryAt?.toISOString() || null,
    };
  }),

  // Start failover monitoring (admin only)
  startFailoverMonitoring: adminProcedure.mutation(async () => {
    startFailoverMonitoring();
    return {
      success: true,
      message: 'Failover monitoring started',
    };
  }),

  // Stop failover monitoring (admin only)
  stopFailoverMonitoring: adminProcedure.mutation(async () => {
    stopFailoverMonitoring();
    return {
      success: true,
      message: 'Failover monitoring stopped',
    };
  }),

  // Manual failover to PostgreSQL (admin only)
  manualFailover: adminProcedure.mutation(async () => {
    const success = await manualFailover();
    return {
      success,
      message: success ? 'Failover to PostgreSQL successful' : 'Failover failed - PostgreSQL may not be available',
      activeDatabase: getActiveDatabase(),
    };
  }),

  // Manual recovery to MySQL (admin only)
  manualRecovery: adminProcedure.mutation(async () => {
    const success = await manualRecovery();
    return {
      success,
      message: success ? 'Recovery to MySQL successful' : 'Recovery failed - MySQL may not be available',
      activeDatabase: getActiveDatabase(),
    };
  }),

  // ==================== Twilio SMS Configuration ====================
  getTwilioConfig: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
    const [config] = await db.select().from(twilioConfig).limit(1);
    return config ? {
      accountSid: config.accountSid || '',
      authToken: config.authToken ? '********' : '', // Mask token
      fromNumber: config.fromNumber || '',
      enabled: config.enabled === 1,
    } : null;
  }),

  saveTwilioConfig: adminProcedure
    .input(z.object({
      accountSid: z.string(),
      authToken: z.string(),
      fromNumber: z.string(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const [existing] = await db.select().from(twilioConfig).limit(1);
      if (existing) {
        await db.update(twilioConfig).set({
          accountSid: input.accountSid,
          authToken: input.authToken.includes('*') ? existing.authToken : input.authToken,
          fromNumber: input.fromNumber,
          enabled: input.enabled ? 1 : 0,
        }).where(eq(twilioConfig.id, existing.id));
      } else {
        await db.insert(twilioConfig).values({
          accountSid: input.accountSid,
          authToken: input.authToken,
          fromNumber: input.fromNumber,
          enabled: input.enabled ? 1 : 0,
        });
      }
      return { success: true };
    }),

  testTwilioSms: adminProcedure
    .input(z.object({ toNumber: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const [config] = await db.select().from(twilioConfig).limit(1);
      if (!config || !config.enabled) {
        throw new Error('Twilio chưa được cấu hình hoặc chưa kích hoạt');
      }
      // In production, integrate with Twilio SDK here
      // For now, simulate success
      console.log(`[Twilio Test] Sending SMS to ${input.toNumber} from ${config.fromNumber}`);
      return { success: true, message: `SMS test sent to ${input.toNumber}` };
    }),

  // ==================== Webhook Configuration (Slack/Teams) ====================
  getWebhookConfig: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database connection failed');
    const [config] = await db.select().from(webhookConfig).limit(1);
    return config ? {
      slackWebhookUrl: config.slackWebhookUrl || '',
      slackChannel: config.slackChannel || '',
      slackEnabled: config.slackEnabled === 1,
      teamsWebhookUrl: config.teamsWebhookUrl || '',
      teamsEnabled: config.teamsEnabled === 1,
    } : null;
  }),

  saveWebhookConfig: adminProcedure
    .input(z.object({
      slackWebhookUrl: z.string().optional(),
      slackChannel: z.string().optional(),
      slackEnabled: z.boolean(),
      teamsWebhookUrl: z.string().optional(),
      teamsEnabled: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const [existing] = await db.select().from(webhookConfig).limit(1);
      if (existing) {
        await db.update(webhookConfig).set({
          slackWebhookUrl: input.slackWebhookUrl || null,
          slackChannel: input.slackChannel || null,
          slackEnabled: input.slackEnabled ? 1 : 0,
          teamsWebhookUrl: input.teamsWebhookUrl || null,
          teamsEnabled: input.teamsEnabled ? 1 : 0,
        }).where(eq(webhookConfig.id, existing.id));
      } else {
        await db.insert(webhookConfig).values({
          slackWebhookUrl: input.slackWebhookUrl || null,
          slackChannel: input.slackChannel || null,
          slackEnabled: input.slackEnabled ? 1 : 0,
          teamsWebhookUrl: input.teamsWebhookUrl || null,
          teamsEnabled: input.teamsEnabled ? 1 : 0,
        });
      }
      return { success: true };
    }),

  testSlackWebhook: adminProcedure
    .input(z.object({}))
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const [config] = await db.select().from(webhookConfig).limit(1);
      if (!config || !config.slackEnabled || !config.slackWebhookUrl) {
        throw new Error('Slack webhook chưa được cấu hình hoặc chưa kích hoạt');
      }
      // Send test message to Slack
      const response = await fetch(config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: config.slackChannel || undefined,
          text: ':white_check_mark: Test message từ SPC System',
          attachments: [{
            color: '#36a64f',
            title: 'SPC Alert Test',
            text: 'Webhook đã được cấu hình thành công!',
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });
      if (!response.ok) throw new Error('Failed to send Slack message');
      return { success: true };
    }),

  testTeamsWebhook: adminProcedure
    .input(z.object({}))
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');
      const [config] = await db.select().from(webhookConfig).limit(1);
      if (!config || !config.teamsEnabled || !config.teamsWebhookUrl) {
        throw new Error('Teams webhook chưa được cấu hình hoặc chưa kích hoạt');
      }
      // Send test message to Teams (Adaptive Card format)
      const response = await fetch(config.teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          '@context': 'http://schema.org/extensions',
          themeColor: '0076D7',
          summary: 'SPC Alert Test',
          sections: [{
            activityTitle: 'SPC Alert Test',
            activitySubtitle: new Date().toLocaleString('vi-VN'),
            facts: [{ name: 'Status', value: 'Webhook đã được cấu hình thành công!' }],
            markdown: true,
          }],
        }),
      });
      if (!response.ok) throw new Error('Failed to send Teams message');
      return { success: true };
    }),
});
