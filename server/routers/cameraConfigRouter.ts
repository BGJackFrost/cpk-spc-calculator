import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cameraConfigs } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const cameraConfigRouter = router({
  // List all cameras
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'inactive', 'error', 'disconnected']).optional(),
      cameraType: z.enum(['avi', 'aoi', 'ip_camera', 'usb_camera', 'rtsp', 'http_stream']).optional(),
      productionLineId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.select().from(cameraConfigs);
      
      const conditions = [];
      if (input?.status) {
        conditions.push(eq(cameraConfigs.status, input.status));
      }
      if (input?.cameraType) {
        conditions.push(eq(cameraConfigs.cameraType, input.cameraType));
      }
      if (input?.productionLineId) {
        conditions.push(eq(cameraConfigs.productionLineId, input.productionLineId));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      return query.orderBy(desc(cameraConfigs.createdAt));
    }),

  // Get single camera
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [camera] = await db.select()
        .from(cameraConfigs)
        .where(eq(cameraConfigs.id, input.id));
      return camera;
    }),

  // Create camera
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      cameraType: z.enum(['avi', 'aoi', 'ip_camera', 'usb_camera', 'rtsp', 'http_stream']),
      connectionUrl: z.string().min(1),
      username: z.string().optional(),
      password: z.string().optional(),
      apiKey: z.string().optional(),
      analysisType: z.enum(['defect_detection', 'quality_inspection', 'measurement', 'ocr', 'custom']).optional(),
      analysisModelId: z.number().optional(),
      analysisConfig: z.any().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      machineId: z.number().optional(),
      alertEnabled: z.boolean().optional().default(true),
      alertThreshold: z.number().min(0).max(1).optional().default(0.8),
      alertEmails: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db.insert(cameraConfigs).values({
        name: input.name,
        description: input.description,
        cameraType: input.cameraType,
        connectionUrl: input.connectionUrl,
        username: input.username,
        password: input.password,
        apiKey: input.apiKey,
        analysisType: input.analysisType,
        analysisModelId: input.analysisModelId,
        analysisConfig: input.analysisConfig,
        productionLineId: input.productionLineId,
        workstationId: input.workstationId,
        machineId: input.machineId,
        alertEnabled: input.alertEnabled ? 1 : 0,
        alertThreshold: String(input.alertThreshold),
        alertEmails: input.alertEmails,
        status: 'inactive',
        createdBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),

  // Update camera
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      cameraType: z.enum(['avi', 'aoi', 'ip_camera', 'usb_camera', 'rtsp', 'http_stream']).optional(),
      connectionUrl: z.string().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      apiKey: z.string().optional(),
      analysisType: z.enum(['defect_detection', 'quality_inspection', 'measurement', 'ocr', 'custom']).optional(),
      analysisModelId: z.number().optional(),
      analysisConfig: z.any().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      machineId: z.number().optional(),
      alertEnabled: z.boolean().optional(),
      alertThreshold: z.number().min(0).max(1).optional(),
      alertEmails: z.string().optional(),
      status: z.enum(['active', 'inactive', 'error', 'disconnected']).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.cameraType !== undefined) updateData.cameraType = data.cameraType;
      if (data.connectionUrl !== undefined) updateData.connectionUrl = data.connectionUrl;
      if (data.username !== undefined) updateData.username = data.username;
      if (data.password !== undefined) updateData.password = data.password;
      if (data.apiKey !== undefined) updateData.apiKey = data.apiKey;
      if (data.analysisType !== undefined) updateData.analysisType = data.analysisType;
      if (data.analysisModelId !== undefined) updateData.analysisModelId = data.analysisModelId;
      if (data.analysisConfig !== undefined) updateData.analysisConfig = data.analysisConfig;
      if (data.productionLineId !== undefined) updateData.productionLineId = data.productionLineId;
      if (data.workstationId !== undefined) updateData.workstationId = data.workstationId;
      if (data.machineId !== undefined) updateData.machineId = data.machineId;
      if (data.alertEnabled !== undefined) updateData.alertEnabled = data.alertEnabled ? 1 : 0;
      if (data.alertThreshold !== undefined) updateData.alertThreshold = String(data.alertThreshold);
      if (data.alertEmails !== undefined) updateData.alertEmails = data.alertEmails;
      if (data.status !== undefined) updateData.status = data.status;

      await db.update(cameraConfigs)
        .set(updateData)
        .where(eq(cameraConfigs.id, id));
      
      return { success: true };
    }),

  // Delete camera
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(cameraConfigs).where(eq(cameraConfigs.id, input.id));
      return { success: true };
    }),

  // Test camera connection
  testConnection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [camera] = await db.select()
        .from(cameraConfigs)
        .where(eq(cameraConfigs.id, input.id));

      if (!camera) {
        return { success: false, error: 'Camera không tồn tại' };
      }

      try {
        // Test connection based on camera type
        if (camera.cameraType === 'http_stream' || camera.cameraType === 'ip_camera') {
          const response = await fetch(camera.connectionUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          });
          
          if (response.ok) {
            await db.update(cameraConfigs)
              .set({ 
                status: 'active', 
                lastConnectedAt: new Date().toISOString(),
                lastErrorMessage: null,
              })
              .where(eq(cameraConfigs.id, input.id));
            return { success: true, message: 'Kết nối thành công' };
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        }

        // For other camera types, just mark as active (would need specific SDK)
        await db.update(cameraConfigs)
          .set({ 
            status: 'active', 
            lastConnectedAt: new Date().toISOString(),
            lastErrorMessage: null,
          })
          .where(eq(cameraConfigs.id, input.id));
        
        return { success: true, message: 'Đã đánh dấu camera là active' };
      } catch (error) {
        await db.update(cameraConfigs)
          .set({ 
            status: 'error', 
            lastErrorMessage: String(error),
          })
          .where(eq(cameraConfigs.id, input.id));
        
        return { success: false, error: String(error) };
      }
    }),

  // Get camera stats
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    const cameras = await db.select().from(cameraConfigs);
    
    return {
      total: cameras.length,
      active: cameras.filter(c => c.status === 'active').length,
      inactive: cameras.filter(c => c.status === 'inactive').length,
      error: cameras.filter(c => c.status === 'error').length,
      disconnected: cameras.filter(c => c.status === 'disconnected').length,
      byType: {
        avi: cameras.filter(c => c.cameraType === 'avi').length,
        aoi: cameras.filter(c => c.cameraType === 'aoi').length,
        ip_camera: cameras.filter(c => c.cameraType === 'ip_camera').length,
        usb_camera: cameras.filter(c => c.cameraType === 'usb_camera').length,
        rtsp: cameras.filter(c => c.cameraType === 'rtsp').length,
        http_stream: cameras.filter(c => c.cameraType === 'http_stream').length,
      },
    };
  }),
});
