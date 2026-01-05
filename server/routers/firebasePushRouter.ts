/**
 * Firebase Push Notification Router
 * API endpoints cho quản lý push notification qua Firebase
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { 
  firebaseConfig, 
  firebaseDeviceTokens, 
  firebasePushSettings, 
  firebasePushHistory,
  firebaseTopics,
  firebaseTopicSubscriptions 
} from '../../drizzle/schema';
import { eq, and, desc, inArray, sql, gte, lte } from 'drizzle-orm';
import firebaseAdmin, {
  initializeFirebase,
  isFirebaseInitialized,
  sendToDevice,
  sendToMultipleDevices,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendTestPush,
  sendIoTAlertPush,
  sendSPCAlertPush,
  sendCPKAlertPush,
  sendEscalationAlertPush,
} from '../services/firebaseAdminService';

export const firebasePushRouter = router({
  // ============ Firebase Config ============
  
  // Get Firebase config status
  getConfigStatus: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const configs = await db.select().from(firebaseConfig).where(eq(firebaseConfig.isActive, true)).limit(1);
    
    return {
      isConfigured: configs.length > 0,
      isInitialized: isFirebaseInitialized(),
      projectId: configs[0]?.projectId || null,
    };
  }),

  // Save Firebase config (admin only)
  saveConfig: protectedProcedure
    .input(z.object({
      projectId: z.string().min(1),
      clientEmail: z.string().email(),
      privateKey: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const now = Date.now();

      // Deactivate existing configs
      await db.update(firebaseConfig).set({ isActive: false, updatedAt: now });

      // Insert new config
      const [result] = await db.insert(firebaseConfig).values({
        projectId: input.projectId,
        clientEmail: input.clientEmail,
        privateKey: input.privateKey,
        isActive: true,
        createdBy: ctx.user?.id ? parseInt(ctx.user.id) : null,
        createdAt: now,
        updatedAt: now,
      });

      // Initialize Firebase with new config
      const initialized = await initializeFirebase({
        projectId: input.projectId,
        clientEmail: input.clientEmail,
        privateKey: input.privateKey,
      });

      return { success: true, initialized };
    }),

  // Initialize Firebase from stored config
  initializeFromConfig: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const configs = await db.select().from(firebaseConfig).where(eq(firebaseConfig.isActive, true)).limit(1);
    
    if (configs.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No Firebase config found' });
    }

    const config = configs[0];
    const initialized = await initializeFirebase({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    });

    return { success: initialized };
  }),

  // ============ Device Tokens ============

  // Register device token
  registerDeviceToken: protectedProcedure
    .input(z.object({
      token: z.string().min(1),
      platform: z.enum(['android', 'ios', 'web']),
      deviceName: z.string().optional(),
      deviceModel: z.string().optional(),
      appVersion: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user?.openId || ctx.user?.id;
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const now = Date.now();

      // Check if token already exists
      const existing = await db
        .select()
        .from(firebaseDeviceTokens)
        .where(eq(firebaseDeviceTokens.token, input.token))
        .limit(1);

      if (existing.length > 0) {
        // Update existing token
        await db
          .update(firebaseDeviceTokens)
          .set({
            userId: String(userId),
            platform: input.platform,
            deviceName: input.deviceName,
            deviceModel: input.deviceModel,
            appVersion: input.appVersion,
            isActive: true,
            lastUsedAt: now,
            updatedAt: now,
          })
          .where(eq(firebaseDeviceTokens.id, existing[0].id));

        return { success: true, tokenId: existing[0].id, isNew: false };
      }

      // Insert new token
      const [result] = await db.insert(firebaseDeviceTokens).values({
        userId: String(userId),
        token: input.token,
        platform: input.platform,
        deviceName: input.deviceName,
        deviceModel: input.deviceModel,
        appVersion: input.appVersion,
        isActive: true,
        lastUsedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, tokenId: result.insertId, isNew: true };
    }),

  // Unregister device token
  unregisterDeviceToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db
        .update(firebaseDeviceTokens)
        .set({ isActive: false, updatedAt: Date.now() })
        .where(eq(firebaseDeviceTokens.token, input.token));

      return { success: true };
    }),

  // Get user's device tokens
  getMyDeviceTokens: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const userId = ctx.user?.openId || ctx.user?.id;
    if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const tokens = await db
      .select()
      .from(firebaseDeviceTokens)
      .where(and(
        eq(firebaseDeviceTokens.userId, String(userId)),
        eq(firebaseDeviceTokens.isActive, true)
      ))
      .orderBy(desc(firebaseDeviceTokens.lastUsedAt));

    return tokens;
  }),

  // ============ Push Settings ============

  // Get user's push settings
  getMyPushSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const userId = ctx.user?.openId || ctx.user?.id;
    if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const settings = await db
      .select()
      .from(firebasePushSettings)
      .where(eq(firebasePushSettings.userId, String(userId)))
      .limit(1);

    if (settings.length === 0) {
      // Return default settings
      return {
        enabled: true,
        iotAlerts: true,
        spcAlerts: true,
        cpkAlerts: true,
        escalationAlerts: true,
        systemAlerts: true,
        criticalOnly: false,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        productionLineIds: null,
        machineIds: null,
      };
    }

    return settings[0];
  }),

  // Update push settings
  updatePushSettings: protectedProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      iotAlerts: z.boolean().optional(),
      spcAlerts: z.boolean().optional(),
      cpkAlerts: z.boolean().optional(),
      escalationAlerts: z.boolean().optional(),
      systemAlerts: z.boolean().optional(),
      criticalOnly: z.boolean().optional(),
      quietHoursEnabled: z.boolean().optional(),
      quietHoursStart: z.string().nullable().optional(),
      quietHoursEnd: z.string().nullable().optional(),
      productionLineIds: z.string().nullable().optional(),
      machineIds: z.string().nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user?.openId || ctx.user?.id;
      if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const now = Date.now();

      // Check if settings exist
      const existing = await db
        .select()
        .from(firebasePushSettings)
        .where(eq(firebasePushSettings.userId, String(userId)))
        .limit(1);

      if (existing.length === 0) {
        // Insert new settings
        await db.insert(firebasePushSettings).values({
          userId: String(userId),
          enabled: input.enabled ?? true,
          iotAlerts: input.iotAlerts ?? true,
          spcAlerts: input.spcAlerts ?? true,
          cpkAlerts: input.cpkAlerts ?? true,
          escalationAlerts: input.escalationAlerts ?? true,
          systemAlerts: input.systemAlerts ?? true,
          criticalOnly: input.criticalOnly ?? false,
          quietHoursEnabled: input.quietHoursEnabled ?? false,
          quietHoursStart: input.quietHoursStart,
          quietHoursEnd: input.quietHoursEnd,
          productionLineIds: input.productionLineIds,
          machineIds: input.machineIds,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Update existing settings
        await db
          .update(firebasePushSettings)
          .set({
            ...input,
            updatedAt: now,
          })
          .where(eq(firebasePushSettings.userId, String(userId)));
      }

      return { success: true };
    }),

  // ============ Send Notifications ============

  // Send test notification to current user
  sendTestNotification: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const userId = ctx.user?.openId || ctx.user?.id;
    if (!userId) throw new TRPCError({ code: 'UNAUTHORIZED' });

    // Get user's active tokens
    const tokens = await db
      .select()
      .from(firebaseDeviceTokens)
      .where(and(
        eq(firebaseDeviceTokens.userId, String(userId)),
        eq(firebaseDeviceTokens.isActive, true)
      ));

    if (tokens.length === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No registered devices found' });
    }

    const results = await Promise.all(
      tokens.map(async (t) => {
        const result = await sendTestPush(t.token);
        
        // Log to history
        await db.insert(firebasePushHistory).values({
          userId: String(userId),
          deviceTokenId: t.id,
          title: '🔔 Test Notification',
          body: 'This is a test push notification from CPK/SPC Calculator',
          alertType: 'test',
          severity: 'info',
          status: result.success ? 'sent' : 'failed',
          messageId: result.responses?.[0]?.messageId,
          errorMessage: result.responses?.[0]?.error,
          sentAt: Date.now(),
          createdAt: Date.now(),
        });

        return result;
      })
    );

    const successCount = results.filter(r => r.success).length;
    return { 
      success: successCount > 0, 
      successCount, 
      totalDevices: tokens.length 
    };
  }),

  // Send notification to specific users (admin)
  sendToUsers: protectedProcedure
    .input(z.object({
      userIds: z.array(z.string()),
      title: z.string().min(1),
      body: z.string().min(1),
      data: z.record(z.string()).optional(),
      alertType: z.enum(['iot_alert', 'spc_alert', 'cpk_alert', 'escalation_alert', 'system']),
      severity: z.enum(['info', 'warning', 'critical']),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get all active tokens for these users
      const tokens = await db
        .select()
        .from(firebaseDeviceTokens)
        .where(and(
          inArray(firebaseDeviceTokens.userId, input.userIds),
          eq(firebaseDeviceTokens.isActive, true)
        ));

      if (tokens.length === 0) {
        return { success: false, message: 'No devices found for specified users' };
      }

      const tokenStrings = tokens.map(t => t.token);
      const result = await sendToMultipleDevices(tokenStrings, {
        title: input.title,
        body: input.body,
        data: input.data,
        priority: input.severity === 'critical' ? 'high' : 'normal',
      });

      // Log to history
      const now = Date.now();
      await Promise.all(
        tokens.map((t, idx) =>
          db.insert(firebasePushHistory).values({
            userId: t.userId,
            deviceTokenId: t.id,
            title: input.title,
            body: input.body,
            data: input.data ? JSON.stringify(input.data) : null,
            alertType: input.alertType,
            severity: input.severity,
            status: result.responses?.[idx]?.success ? 'sent' : 'failed',
            messageId: result.responses?.[idx]?.messageId,
            errorMessage: result.responses?.[idx]?.error,
            sentAt: now,
            createdAt: now,
          })
        )
      );

      return result;
    }),

  // Send to topic
  sendToTopic: protectedProcedure
    .input(z.object({
      topicName: z.string().min(1),
      title: z.string().min(1),
      body: z.string().min(1),
      data: z.record(z.string()).optional(),
      alertType: z.enum(['iot_alert', 'spc_alert', 'cpk_alert', 'escalation_alert', 'system']),
      severity: z.enum(['info', 'warning', 'critical']),
    }))
    .mutation(async ({ input }) => {
      const result = await sendToTopic(input.topicName, {
        title: input.title,
        body: input.body,
        data: input.data,
        priority: input.severity === 'critical' ? 'high' : 'normal',
      });

      return result;
    }),

  // ============ Topics ============

  // Get all topics
  getTopics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const topics = await db
      .select()
      .from(firebaseTopics)
      .where(eq(firebaseTopics.isActive, true))
      .orderBy(firebaseTopics.name);

    return topics;
  }),

  // Create topic
  createTopic: protectedProcedure
    .input(z.object({
      name: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, 'Topic name must be alphanumeric'),
      displayName: z.string().min(1),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const now = Date.now();
      const [result] = await db.insert(firebaseTopics).values({
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, topicId: result.insertId };
    }),

  // Subscribe to topic
  subscribeToTopic: protectedProcedure
    .input(z.object({
      topicId: z.number(),
      deviceTokenId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get topic and token
      const [topic] = await db.select().from(firebaseTopics).where(eq(firebaseTopics.id, input.topicId));
      const [token] = await db.select().from(firebaseDeviceTokens).where(eq(firebaseDeviceTokens.id, input.deviceTokenId));

      if (!topic || !token) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Topic or device not found' });
      }

      // Subscribe via Firebase
      const result = await subscribeToTopic([token.token], topic.name);

      if (result.success) {
        // Record subscription
        await db.insert(firebaseTopicSubscriptions).values({
          topicId: input.topicId,
          deviceTokenId: input.deviceTokenId,
          subscribedAt: Date.now(),
        });
      }

      return result;
    }),

  // Unsubscribe from topic
  unsubscribeFromTopic: protectedProcedure
    .input(z.object({
      topicId: z.number(),
      deviceTokenId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get topic and token
      const [topic] = await db.select().from(firebaseTopics).where(eq(firebaseTopics.id, input.topicId));
      const [token] = await db.select().from(firebaseDeviceTokens).where(eq(firebaseDeviceTokens.id, input.deviceTokenId));

      if (!topic || !token) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Topic or device not found' });
      }

      // Unsubscribe via Firebase
      const result = await unsubscribeFromTopic([token.token], topic.name);

      if (result.success) {
        // Remove subscription record
        await db
          .delete(firebaseTopicSubscriptions)
          .where(and(
            eq(firebaseTopicSubscriptions.topicId, input.topicId),
            eq(firebaseTopicSubscriptions.deviceTokenId, input.deviceTokenId)
          ));
      }

      return result;
    }),

  // ============ History ============

  // Get notification history
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
      alertType: z.enum(['iot_alert', 'spc_alert', 'cpk_alert', 'escalation_alert', 'system', 'test']).optional(),
      severity: z.enum(['info', 'warning', 'critical']).optional(),
      status: z.enum(['pending', 'sent', 'delivered', 'failed']).optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const userId = ctx.user?.openId || ctx.user?.id;
      
      let query = db.select().from(firebasePushHistory);
      const conditions = [];

      // Filter by user if not admin
      if (ctx.user?.role !== 'admin') {
        conditions.push(eq(firebasePushHistory.userId, String(userId)));
      }

      if (input.alertType) {
        conditions.push(eq(firebasePushHistory.alertType, input.alertType));
      }
      if (input.severity) {
        conditions.push(eq(firebasePushHistory.severity, input.severity));
      }
      if (input.status) {
        conditions.push(eq(firebasePushHistory.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(firebasePushHistory.createdAt, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(firebasePushHistory.createdAt, input.endDate));
      }

      const history = await db
        .select()
        .from(firebasePushHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(firebasePushHistory.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(firebasePushHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items: history,
        total: countResult?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // Get notification stats
  getStats: protectedProcedure
    .input(z.object({
      days: z.number().min(1).max(90).default(7),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const startDate = Date.now() - input.days * 24 * 60 * 60 * 1000;

      // Get counts by status
      const statusCounts = await db
        .select({
          status: firebasePushHistory.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(firebasePushHistory)
        .where(gte(firebasePushHistory.createdAt, startDate))
        .groupBy(firebasePushHistory.status);

      // Get counts by alert type
      const typeCounts = await db
        .select({
          alertType: firebasePushHistory.alertType,
          count: sql<number>`COUNT(*)`,
        })
        .from(firebasePushHistory)
        .where(gte(firebasePushHistory.createdAt, startDate))
        .groupBy(firebasePushHistory.alertType);

      // Get counts by severity
      const severityCounts = await db
        .select({
          severity: firebasePushHistory.severity,
          count: sql<number>`COUNT(*)`,
        })
        .from(firebasePushHistory)
        .where(gte(firebasePushHistory.createdAt, startDate))
        .groupBy(firebasePushHistory.severity);

      // Get active device count
      const [deviceCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(firebaseDeviceTokens)
        .where(eq(firebaseDeviceTokens.isActive, true));

      return {
        byStatus: Object.fromEntries(statusCounts.map(s => [s.status, s.count])),
        byType: Object.fromEntries(typeCounts.map(t => [t.alertType, t.count])),
        bySeverity: Object.fromEntries(severityCounts.map(s => [s.severity, s.count])),
        activeDevices: deviceCount?.count || 0,
        period: { days: input.days, startDate },
      };
    }),
});

export default firebasePushRouter;
