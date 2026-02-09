/**
 * AVI/AOI Enhancement Router
 * Provides endpoints for enhanced AVI/AOI inspection features
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  referenceImages,
  ntfConfirmations,
  inspectionMeasurementPoints,
  machineYieldStatistics,
  aiImageAnalysisResults,
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  analyzeInspectionImage,
  compareWithReference,
  analyzeNtfProbability,
  classifyDefect,
  analyzeQualityTrends,
} from "../services/aviAoiAIService";

export const aviAoiEnhancementRouter = router({
  // Reference Images CRUD
  listReferenceImages: protectedProcedure
    .input(z.object({
      productId: z.number().optional(),
      machineId: z.number().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0 };

      const conditions = [];
      if (input.productId) conditions.push(eq(referenceImages.productId, input.productId));
      if (input.machineId) conditions.push(eq(referenceImages.machineId, input.machineId));
      conditions.push(eq(referenceImages.isActive, 1));

      const items = await db
        .select()
        .from(referenceImages)
        .where(and(...conditions))
        .orderBy(desc(referenceImages.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return { items, total: items.length };
    }),

  // NTF Confirmation
  confirmNtf: protectedProcedure
    .input(z.object({
      inspectionId: z.number(),
      originalResult: z.enum(['ng', 'ok', 'ntf']),
      confirmedResult: z.enum(['ng', 'ok', 'ntf']),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [result] = await db.insert(ntfConfirmations).values({
        inspectionId: input.inspectionId,
        originalResult: input.originalResult,
        confirmedResult: input.confirmedResult,
        reason: input.reason,
        confirmedBy: ctx.user.id,
      });

      return { success: true, id: result.insertId };
    }),

  // AI Image Analysis
  analyzeImage: protectedProcedure
    .input(z.object({
      imageUrl: z.string(),
      inspectionId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await analyzeInspectionImage(input.imageUrl);
      return result;
    }),

  // Compare with Reference
  compareImages: protectedProcedure
    .input(z.object({
      inspectionImageUrl: z.string(),
      referenceImageUrl: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await compareWithReference(input.inspectionImageUrl, input.referenceImageUrl);
      return result;
    }),

  // Machine Yield Statistics
  getYieldStats: protectedProcedure
    .input(z.object({
      machineId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(machineYieldStatistics.machineId, input.machineId)];

      const stats = await db
        .select()
        .from(machineYieldStatistics)
        .where(and(...conditions))
        .orderBy(desc(machineYieldStatistics.date))
        .limit(30);

      return stats;
    }),
});
