import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { iotDevices, iotDeviceData, iotAlarms, userDashboardConfigs, notificationLogs, telegramMessageHistory } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, asc, or } from "drizzle-orm";
import { cache, cacheKeys, TTL, withCache, invalidateRelatedCaches } from "../cache";

export const iotDashboardRouter = router({
  // List all IoT devices
  listDevices: protectedProcedure
    .input(z.object({
      status: z.enum(["online", "offline", "error", "maintenance"]).optional(),
      type: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(iotDevices);
      
      if (input?.status) {
        query = query.where(eq(iotDevices.status, input.status)) as typeof query;
      }
      
      const devices = await query.orderBy(desc(iotDevices.lastSeen));
      return devices;
    }),

  // Register new device
  registerDevice: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      name: z.string(),
      type: z.string(),
      location: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [device] = await db.insert(iotDevices).values({
        deviceId: input.deviceId,
        name: input.name,
        type: input.type,
        location: input.location,
        metadata: JSON.stringify(input.metadata || {}),
        status: "offline",
      }).execute();
      // Invalidate IoT caches
      invalidateRelatedCaches('iotDevices');
      return device;
    }),

  // Update device
  updateDevice: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      status: z.enum(["online", "offline", "error", "maintenance"]).optional(),
      location: z.string().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const updateData: Record<string, any> = {};
      if (input.name) updateData.name = input.name;
      if (input.status) updateData.status = input.status;
      if (input.location) updateData.location = input.location;
      if (input.metadata) updateData.metadata = JSON.stringify(input.metadata);
      
      const [device] = await db.update(iotDevices)
        .set(updateData)
        .where(eq(iotDevices.id, input.id))
        .execute();
      // Invalidate IoT caches
      invalidateRelatedCaches('iotDevices');
      return device;
    }),

  // Get devices for Sensor Dashboard
  getDevices: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    const devices = await db.select().from(iotDevices);
    return devices.map(d => ({
      id: d.id,
      name: d.deviceName || d.deviceCode,
      type: d.deviceType,
      status: d.status,
      protocol: d.protocol || 'mqtt',
      lastValue: Math.random() * 100,
      unit: d.deviceType === 'sensor' ? '°C' : '',
      lastUpdate: d.updatedAt || new Date().toISOString()
    }));
  }),

  // Delete device
  deleteDevice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(iotDevices).where(eq(iotDevices.id, input.id));
      // Invalidate IoT caches
      invalidateRelatedCaches('iotDevices');
      return { success: true };
    }),

  // Get device data
  getDeviceData: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let conditions = [eq(iotDeviceData.deviceId, input.deviceId)];
      
      if (input.startDate) {
        conditions.push(gte(iotDeviceData.timestamp, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(iotDeviceData.timestamp, new Date(input.endDate)));
      }
      
      const data = await db.select()
        .from(iotDeviceData)
        .where(and(...conditions))
        .orderBy(desc(iotDeviceData.timestamp))
        .limit(input.limit);
      
      return data;
    }),

  // Get dashboard stats (with caching - 30 seconds TTL)
  getStats: protectedProcedure.query(async () => {
    return withCache(cacheKeys.iotStats(), TTL.SHORT, async () => {
      const db = await getDb();
      const devices = await db.select().from(iotDevices);
      
      const stats = {
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.status === "online").length,
        offlineDevices: devices.filter(d => d.status === "offline").length,
        errorDevices: devices.filter(d => d.status === "error").length,
        maintenanceDevices: devices.filter(d => d.status === "maintenance").length,
      };
      
      return stats;
    });
  }),

  // Get alarms
  getAlarms: protectedProcedure
    .input(z.object({
      deviceId: z.number().optional(),
      acknowledged: z.boolean().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let conditions: any[] = [];
      
      if (input.deviceId) {
        conditions.push(eq(iotAlarms.deviceId, input.deviceId));
      }
      if (input.acknowledged !== undefined) {
        conditions.push(eq(iotAlarms.acknowledged, input.acknowledged));
      }
      
      const alarms = await db.select()
        .from(iotAlarms)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(iotAlarms.createdAt))
        .limit(input.limit);
      
      return alarms;
    }),

  // Acknowledge alarm
  acknowledgeAlarm: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [alarm] = await db.update(iotAlarms)
        .set({
          acknowledged: true,
          acknowledgedAt: new Date(),
          acknowledgedBy: ctx.user?.id,
        })
        .where(eq(iotAlarms.id, input.id))
        .execute();
      return alarm;
    }),

  // ============ IoT Connection Management (MQTT/OPC-UA) ============

  // List all connections
  listConnections: protectedProcedure.query(async () => {
    const { getAllIoTConnections } = await import("../services/iotConnectionService");
    return getAllIoTConnections();
  }),

  // Create new connection
  createConnection: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      protocol: z.enum(["mqtt", "opcua", "modbus"]),
      config: z.any(), // Flexible config based on protocol
    }))
    .mutation(async ({ input }) => {
      const { createIoTConnection } = await import("../services/iotConnectionService");
      return createIoTConnection({
        name: input.name,
        description: input.description,
        config: { protocol: input.protocol, ...input.config },
      });
    }),

  // Update connection
  updateConnection: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      config: z.any().optional(),
    }))
    .mutation(async ({ input }) => {
      const { updateIoTConnection } = await import("../services/iotConnectionService");
      return updateIoTConnection(input.id, {
        name: input.name,
        description: input.description,
        config: input.config,
      });
    }),

  // Delete connection
  deleteConnection: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { deleteIoTConnection } = await import("../services/iotConnectionService");
      return { success: deleteIoTConnection(input.id) };
    }),

  // Connect to IoT broker/device
  connect: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { connectIoT } = await import("../services/iotConnectionService");
      return await connectIoT(input.id);
    }),

  // Disconnect from IoT broker/device
  disconnect: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { disconnectIoT } = await import("../services/iotConnectionService");
      return { success: disconnectIoT(input.id) };
    }),

  // Test connection
  testConnection: protectedProcedure
    .input(z.object({
      protocol: z.enum(["mqtt", "opcua", "modbus"]),
      config: z.any(),
    }))
    .mutation(async ({ input }) => {
      const { testIoTConnection } = await import("../services/iotConnectionService");
      return await testIoTConnection({ protocol: input.protocol, ...input.config });
    }),

  // Start simulation for testing
  startSimulation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { startIoTSimulation } = await import("../services/iotConnectionService");
      return { success: startIoTSimulation(input.id) };
    }),

  // Stop simulation
  stopSimulation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const { stopIoTSimulation } = await import("../services/iotConnectionService");
      return { success: stopIoTSimulation(input.id) };
    }),

  // Get recent data from connection
  getConnectionData: protectedProcedure
    .input(z.object({
      connectionId: z.string(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const { getIoTRecentData } = await import("../services/iotConnectionService");
      return getIoTRecentData(input.connectionId, input.limit);
    }),

  // Get connection statistics
  getConnectionStats: protectedProcedure.query(async () => {
    const { getIoTConnectionStats } = await import("../services/iotConnectionService");
    return getIoTConnectionStats();
  }),

  // Publish MQTT message
  publishMessage: protectedProcedure
    .input(z.object({
      connectionId: z.string(),
      topic: z.string(),
      message: z.any(),
    }))
    .mutation(async ({ input }) => {
      const { publishIoTMessage } = await import("../services/iotConnectionService");
      return { success: await publishIoTMessage(input.connectionId, input.topic, input.message) };
    }),

  // Write value to OPC-UA/Modbus
  writeValue: protectedProcedure
    .input(z.object({
      connectionId: z.string(),
      nodeIdOrRegister: z.union([z.string(), z.number()]),
      value: z.any(),
    }))
    .mutation(async ({ input }) => {
      const { writeIoTValue } = await import("../services/iotConnectionService");
      return { success: await writeIoTValue(input.connectionId, input.nodeIdOrRegister, input.value) };
    }),

  // ============ Widget Layout Management ============

  // Get user's widget layout for IoT Dashboard
  getWidgetLayout: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const configs = await db.select()
      .from(userDashboardConfigs)
      .where(eq(userDashboardConfigs.userId, ctx.user.id))
      .orderBy(asc(userDashboardConfigs.displayOrder));

    // Filter only IoT dashboard widgets
    const iotWidgetKeys = [
      'stats_cards', 'mttr_mtbf_summary', 'alarm_severity', 'alarm_trend',
      'severity_distribution', 'mttr_trend', 'mtbf_trend', 'mttr_mtbf_comparison',
      'oee_comparison', 'mqtt_realtime', 'alert_history', 'recent_alarms'
    ];

    return configs.filter(c => iotWidgetKeys.includes(c.widgetKey));
  }),

  // Save user's widget layout for IoT Dashboard
  saveWidgetLayout: protectedProcedure
    .input(z.object({
      widgets: z.array(z.object({
        widgetKey: z.string(),
        isVisible: z.number(),
        displayOrder: z.number(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete existing IoT widget configs for this user
      const iotWidgetKeys = [
        'stats_cards', 'mttr_mtbf_summary', 'alarm_severity', 'alarm_trend',
        'severity_distribution', 'mttr_trend', 'mtbf_trend', 'mttr_mtbf_comparison',
        'oee_comparison', 'mqtt_realtime', 'alert_history', 'recent_alarms'
      ];

      // Delete old configs
      for (const key of iotWidgetKeys) {
        await db.delete(userDashboardConfigs)
          .where(and(
            eq(userDashboardConfigs.userId, ctx.user.id),
            eq(userDashboardConfigs.widgetKey, key)
          ));
      }

      // Insert new configs
      for (const widget of input.widgets) {
        await db.insert(userDashboardConfigs).values({
          userId: ctx.user.id,
          widgetKey: widget.widgetKey,
          isVisible: widget.isVisible,
          displayOrder: widget.displayOrder,
        });
      }

      return { success: true };
    }),

  // ============ Alert Message History ============

  // Get alert message history (Telegram/Slack/Email)
  getAlertMessageHistory: protectedProcedure
    .input(z.object({
      channel: z.string().optional(),
      status: z.string().optional(),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const results: any[] = [];

      // Get from notification_logs
      try {
        let notifConditions: any[] = [];
        if (input.channel && input.channel !== 'all') {
          notifConditions.push(eq(notificationLogs.channelType, input.channel));
        }
        if (input.status && input.status !== 'all') {
          notifConditions.push(eq(notificationLogs.status, input.status as any));
        }
        if (input.startDate) {
          notifConditions.push(gte(notificationLogs.createdAt, input.startDate.toISOString()));
        }
        if (input.endDate) {
          notifConditions.push(lte(notificationLogs.createdAt, input.endDate.toISOString()));
        }

        const notifLogs = await db.select()
          .from(notificationLogs)
          .where(notifConditions.length > 0 ? and(...notifConditions) : undefined)
          .orderBy(desc(notificationLogs.createdAt))
          .limit(input.limit);

        results.push(...notifLogs.map(n => ({
          id: n.id,
          channelType: n.channelType,
          alertTitle: n.subject || 'Notification',
          alertMessage: n.message,
          status: n.status,
          errorMessage: n.errorMessage,
          createdAt: n.createdAt,
          source: 'notification_logs',
        })));
      } catch (e) {
        console.error('Error fetching notification_logs:', e);
      }

      // Get from telegram_message_history
      try {
        if (!input.channel || input.channel === 'all' || input.channel === 'telegram') {
          let telegramConditions: any[] = [];
          if (input.status && input.status !== 'all') {
            telegramConditions.push(eq(telegramMessageHistory.status, input.status as any));
          }
          if (input.startDate) {
            telegramConditions.push(gte(telegramMessageHistory.createdAt, input.startDate.toISOString()));
          }
          if (input.endDate) {
            telegramConditions.push(lte(telegramMessageHistory.createdAt, input.endDate.toISOString()));
          }

          const telegramLogs = await db.select()
            .from(telegramMessageHistory)
            .where(telegramConditions.length > 0 ? and(...telegramConditions) : undefined)
            .orderBy(desc(telegramMessageHistory.createdAt))
            .limit(input.limit);

          results.push(...telegramLogs.map(t => ({
            id: `telegram_${t.id}`,
            channelType: 'telegram',
            alertTitle: t.messageType || 'Telegram Alert',
            alertMessage: t.content,
            status: t.status,
            errorMessage: t.errorMessage,
            createdAt: t.createdAt,
            source: 'telegram_message_history',
          })));
        }
      } catch (e) {
        console.error('Error fetching telegram_message_history:', e);
      }

      // Sort by createdAt descending and limit
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return results.slice(0, input.limit);
    }),
});


// ============ Export Reports ============

// Export IoT dashboard report as PDF (HTML)
export const iotExportRouter = router({
  exportDashboardHtml: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const { generateIotDashboardHtml } = await import("../services/iotExportService");
      const { storagePut } = await import("../storage");
      const { nanoid } = await import("nanoid");
      
      const html = await generateIotDashboardHtml(input?.startDate, input?.endDate);
      
      const fileKey = `iot-reports/dashboard-${nanoid(8)}.html`;
      const result = await storagePut(fileKey, Buffer.from(html, "utf-8"), "text/html");
      
      return {
        success: true,
        url: result.url,
        filename: `iot-dashboard-${new Date().toISOString().split("T")[0]}.html`,
      };
    }),

  exportDashboardExcel: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const { generateIotDashboardExcel } = await import("../services/iotExportService");
      const { storagePut } = await import("../storage");
      const { nanoid } = await import("nanoid");
      
      const buffer = await generateIotDashboardExcel(input?.startDate, input?.endDate);
      
      const fileKey = `iot-reports/dashboard-${nanoid(8)}.xlsx`;
      const result = await storagePut(
        fileKey,
        buffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      
      return {
        success: true,
        url: result.url,
        filename: `iot-dashboard-${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    }),

  exportDeviceReportHtml: protectedProcedure
    .input(z.object({
      deviceId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { generateDeviceReportHtml } = await import("../services/iotExportService");
      const { storagePut } = await import("../storage");
      const { nanoid } = await import("nanoid");
      
      const html = await generateDeviceReportHtml(input.deviceId, input.startDate, input.endDate);
      
      const fileKey = `iot-reports/device-${input.deviceId}-${nanoid(8)}.html`;
      const result = await storagePut(fileKey, Buffer.from(html, "utf-8"), "text/html");
      
      return {
        success: true,
        url: result.url,
        filename: `iot-device-${input.deviceId}-${new Date().toISOString().split("T")[0]}.html`,
      };
    }),
});
