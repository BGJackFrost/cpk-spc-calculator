import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cameraSessions, snImages, cameraConfigurations } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { storagePut } from "../storage";

export const cameraSessionRouter = router({
  // List all sessions
  list: protectedProcedure
    .input(z.object({
      status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
      productionLineId: z.number().optional(),
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const conditions = [eq(cameraSessions.userId, ctx.user.id)];
      
      if (input?.status) {
        conditions.push(eq(cameraSessions.status, input.status));
      }
      if (input?.productionLineId) {
        conditions.push(eq(cameraSessions.productionLineId, input.productionLineId));
      }

      const items = await db.select()
        .from(cameraSessions)
        .where(and(...conditions))
        .orderBy(desc(cameraSessions.startedAt))
        .limit(input?.limit || 20)
        .offset(input?.offset || 0);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(cameraSessions)
        .where(and(...conditions));

      return {
        items,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get single session
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [session] = await db.select()
        .from(cameraSessions)
        .where(eq(cameraSessions.id, input.id));
      return session;
    }),

  // Create new session
  create: protectedProcedure
    .input(z.object({
      sessionName: z.string().optional(),
      cameraId: z.number().optional(),
      cameraStreamUrl: z.string().optional(),
      resolution: z.string().optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      captureInterval: z.number().optional(),
      autoCapture: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db.insert(cameraSessions).values({
        userId: ctx.user.id,
        sessionName: input.sessionName || `Session ${new Date().toLocaleString('vi-VN')}`,
        cameraId: input.cameraId,
        cameraStreamUrl: input.cameraStreamUrl,
        resolution: input.resolution,
        productId: input.productId,
        productionLineId: input.productionLineId,
        workstationId: input.workstationId,
        captureInterval: input.captureInterval,
        autoCapture: input.autoCapture,
        status: 'active',
        captureCount: 0,
      });
      return { id: result.insertId };
    }),

  // Update session
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      sessionName: z.string().optional(),
      status: z.enum(['active', 'paused', 'completed', 'cancelled']).optional(),
      captureInterval: z.number().optional(),
      autoCapture: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const updateData: any = {};
      if (data.sessionName !== undefined) updateData.sessionName = data.sessionName;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === 'completed' || data.status === 'cancelled') {
          updateData.endedAt = new Date().toISOString();
        }
      }
      if (data.captureInterval !== undefined) updateData.captureInterval = data.captureInterval;
      if (data.autoCapture !== undefined) updateData.autoCapture = data.autoCapture;

      await db.update(cameraSessions)
        .set(updateData)
        .where(eq(cameraSessions.id, id));
      
      return { success: true };
    }),

  // End session
  endSession: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.update(cameraSessions)
        .set({
          status: 'completed',
          endedAt: new Date().toISOString(),
        })
        .where(eq(cameraSessions.id, input.id));
      
      return { success: true };
    }),

  // Capture image from session
  captureImage: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      serialNumber: z.string(),
      imageData: z.string(), // Base64 encoded image
      measurementPoints: z.array(z.object({
        x: z.number(),
        y: z.number(),
        label: z.string(),
        value: z.number(),
        unit: z.string(),
        result: z.enum(['ok', 'ng', 'warning']),
        tolerance: z.object({
          min: z.number(),
          max: z.number(),
        }),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      
      // Get session info
      const [session] = await db.select()
        .from(cameraSessions)
        .where(eq(cameraSessions.id, input.sessionId));
      
      if (!session) {
        throw new Error('Session không tồn tại');
      }

      // Convert base64 to buffer and upload to S3
      const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `sn-images/${input.serialNumber}/${timestamp}-${randomSuffix}.jpg`;
      
      const { url: imageUrl } = await storagePut(fileKey, imageBuffer, 'image/jpeg');

      // Create SN image record
      const [imageResult] = await db.insert(snImages).values({
        serialNumber: input.serialNumber,
        imageUrl,
        measurementPoints: input.measurementPoints,
        analysisResult: 'pending',
        defectsFound: 0,
        measurementsCount: input.measurementPoints?.length || 0,
        cameraId: session.cameraId,
        source: 'camera',
        productId: session.productId,
        productionLineId: session.productionLineId,
        workstationId: session.workstationId,
        capturedAt: new Date().toISOString(),
        analyzedBy: ctx.user.id,
      });

      // Update session capture count
      await db.update(cameraSessions)
        .set({
          captureCount: sql`${cameraSessions.captureCount} + 1`,
        })
        .where(eq(cameraSessions.id, input.sessionId));

      return { 
        id: imageResult.insertId,
        imageUrl,
      };
    }),

  // Get session images
  getSessionImages: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Get session to get production line and workstation
      const [session] = await db.select()
        .from(cameraSessions)
        .where(eq(cameraSessions.id, input.sessionId));
      
      if (!session) {
        return { items: [], total: 0 };
      }

      const conditions = [];
      if (session.productionLineId) {
        conditions.push(eq(snImages.productionLineId, session.productionLineId));
      }
      if (session.cameraId) {
        conditions.push(eq(snImages.cameraId, session.cameraId));
      }
      if (session.startedAt) {
        conditions.push(sql`${snImages.capturedAt} >= ${session.startedAt}`);
      }

      let query = db.select().from(snImages);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const items = await query
        .orderBy(desc(snImages.capturedAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(snImages)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get available cameras
  getAvailableCameras: protectedProcedure.query(async () => {
    const db = await getDb();
    const cameras = await db.select()
      .from(cameraConfigurations)
      .where(eq(cameraConfigurations.isActive, true));
    return cameras;
  }),

  // Delete session
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(cameraSessions).where(eq(cameraSessions.id, input.id));
      return { success: true };
    }),
});
