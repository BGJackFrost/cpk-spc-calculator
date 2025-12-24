import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { iotDevices, iotDeviceData, iotAlarms } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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
      return device;
    }),

  // Delete device
  deleteDevice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(iotDevices).where(eq(iotDevices.id, input.id));
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

  // Get dashboard stats
  getStats: protectedProcedure.query(async () => {
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
});
