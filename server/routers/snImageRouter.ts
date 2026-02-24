import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { snImages } from "../../drizzle/schema";
import { eq, desc, and, like, gte, lte, sql } from "drizzle-orm";

const measurementPointSchema = z.object({
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
});

const defectLocationSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  type: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
});

export const snImageRouter = router({
  // List images with filters
  list: protectedProcedure
    .input(z.object({
      serialNumber: z.string().optional(),
      analysisResult: z.enum(['ok', 'ng', 'warning', 'pending']).optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      cameraId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      
      if (input?.serialNumber) {
        conditions.push(like(snImages.serialNumber, `%${input.serialNumber}%`));
      }
      if (input?.analysisResult) {
        conditions.push(eq(snImages.analysisResult, input.analysisResult));
      }
      if (input?.productId) {
        conditions.push(eq(snImages.productId, input.productId));
      }
      if (input?.productionLineId) {
        conditions.push(eq(snImages.productionLineId, input.productionLineId));
      }
      if (input?.cameraId) {
        conditions.push(eq(snImages.cameraId, input.cameraId));
      }
      if (input?.startDate) {
        conditions.push(gte(snImages.capturedAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(snImages.capturedAt, input.endDate));
      }

      let query = db.select().from(snImages);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const items = await query
        .orderBy(desc(snImages.capturedAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      // Get total count
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(snImages)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        items,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get images by serial number
  getBySerialNumber: protectedProcedure
    .input(z.object({ serialNumber: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      return db.select()
        .from(snImages)
        .where(eq(snImages.serialNumber, input.serialNumber))
        .orderBy(desc(snImages.capturedAt));
    }),

  // Get single image
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const [image] = await db.select()
        .from(snImages)
        .where(eq(snImages.id, input.id));
      return image;
    }),

  // Create image record
  create: protectedProcedure
    .input(z.object({
      serialNumber: z.string(),
      imageUrl: z.string(),
      thumbnailUrl: z.string().optional(),
      measurementPoints: z.array(measurementPointSchema).optional(),
      defectLocations: z.array(defectLocationSchema).optional(),
      analysisResult: z.enum(['ok', 'ng', 'warning', 'pending']).optional(),
      qualityScore: z.number().min(0).max(100).optional(),
      defectsFound: z.number().optional().default(0),
      measurementsCount: z.number().optional().default(0),
      cameraId: z.number().optional(),
      batchJobId: z.number().optional(),
      source: z.enum(['camera', 'upload', 'api', 'batch_job']).optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      capturedAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const [result] = await db.insert(snImages).values({
        serialNumber: input.serialNumber,
        imageUrl: input.imageUrl,
        thumbnailUrl: input.thumbnailUrl,
        measurementPoints: input.measurementPoints,
        defectLocations: input.defectLocations,
        analysisResult: input.analysisResult || 'pending',
        qualityScore: input.qualityScore ? String(input.qualityScore) : null,
        defectsFound: input.defectsFound || 0,
        measurementsCount: input.measurementsCount || 0,
        cameraId: input.cameraId,
        batchJobId: input.batchJobId,
        source: input.source || 'upload',
        productId: input.productId,
        productionLineId: input.productionLineId,
        workstationId: input.workstationId,
        capturedAt: input.capturedAt || new Date().toISOString(),
        analyzedBy: ctx.user.id,
      });
      return { id: result.insertId };
    }),

  // Update image analysis
  updateAnalysis: protectedProcedure
    .input(z.object({
      id: z.number(),
      measurementPoints: z.array(measurementPointSchema).optional(),
      defectLocations: z.array(defectLocationSchema).optional(),
      analysisResult: z.enum(['ok', 'ng', 'warning', 'pending']).optional(),
      qualityScore: z.number().min(0).max(100).optional(),
      defectsFound: z.number().optional(),
      measurementsCount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { id, ...data } = input;
      
      const updateData: any = {
        analyzedAt: new Date().toISOString(),
        analyzedBy: ctx.user.id,
      };
      
      if (data.measurementPoints !== undefined) updateData.measurementPoints = data.measurementPoints;
      if (data.defectLocations !== undefined) updateData.defectLocations = data.defectLocations;
      if (data.analysisResult !== undefined) updateData.analysisResult = data.analysisResult;
      if (data.qualityScore !== undefined) updateData.qualityScore = String(data.qualityScore);
      if (data.defectsFound !== undefined) updateData.defectsFound = data.defectsFound;
      if (data.measurementsCount !== undefined) updateData.measurementsCount = data.measurementsCount;

      await db.update(snImages)
        .set(updateData)
        .where(eq(snImages.id, id));
      
      return { success: true };
    }),

  // Delete image
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(snImages).where(eq(snImages.id, input.id));
      return { success: true };
    }),

  // Get statistics
  getStats: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      productionLineId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const conditions = [];
      
      if (input?.startDate) {
        conditions.push(gte(snImages.capturedAt, input.startDate));
      }
      if (input?.endDate) {
        conditions.push(lte(snImages.capturedAt, input.endDate));
      }
      if (input?.productionLineId) {
        conditions.push(eq(snImages.productionLineId, input.productionLineId));
      }

      let query = db.select().from(snImages);
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const images = await query;
      
      return {
        total: images.length,
        ok: images.filter(i => i.analysisResult === 'ok').length,
        ng: images.filter(i => i.analysisResult === 'ng').length,
        warning: images.filter(i => i.analysisResult === 'warning').length,
        pending: images.filter(i => i.analysisResult === 'pending').length,
        avgQualityScore: images.length > 0 
          ? images.reduce((sum, i) => sum + (parseFloat(i.qualityScore || '0')), 0) / images.length 
          : 0,
        totalDefects: images.reduce((sum, i) => sum + (i.defectsFound || 0), 0),
        totalMeasurements: images.reduce((sum, i) => sum + (i.measurementsCount || 0), 0),
      };
    }),

  // Get unique serial numbers
  getSerialNumbers: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(100).optional().default(20),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      let query = db.selectDistinct({ serialNumber: snImages.serialNumber })
        .from(snImages);
      
      if (input?.search) {
        query = query.where(like(snImages.serialNumber, `%${input.search}%`)) as any;
      }

      const results = await query.limit(input?.limit || 20);
      return results.map(r => r.serialNumber);
    }),
});
