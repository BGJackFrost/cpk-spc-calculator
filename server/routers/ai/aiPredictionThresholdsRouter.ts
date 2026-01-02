import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { getDb } from "../../db";
import { 
  aiPredictionThresholds, 
  products, 
  productionLines, 
  workstations 
} from "../../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * AI Prediction Thresholds Router - Cấu hình ngưỡng cảnh báo tùy chỉnh
 */
export const aiPredictionThresholdsRouter = router({
  // List all thresholds
  list: protectedProcedure
    .input(z.object({
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { thresholds: [], total: 0 };

      const conditions = [];
      if (input?.productId) {
        conditions.push(eq(aiPredictionThresholds.productId, input.productId));
      }
      if (input?.productionLineId) {
        conditions.push(eq(aiPredictionThresholds.productionLineId, input.productionLineId));
      }
      if (input?.isActive !== undefined) {
        conditions.push(eq(aiPredictionThresholds.isActive, input.isActive ? 1 : 0));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [thresholds, countResult] = await Promise.all([
        db.select()
          .from(aiPredictionThresholds)
          .where(whereClause)
          .orderBy(desc(aiPredictionThresholds.priority), desc(aiPredictionThresholds.createdAt))
          .limit(input?.limit || 50)
          .offset(input?.offset || 0),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(aiPredictionThresholds)
          .where(whereClause),
      ]);

      return {
        thresholds,
        total: countResult[0]?.count || 0,
      };
    }),

  // Get threshold by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db.select()
        .from(aiPredictionThresholds)
        .where(eq(aiPredictionThresholds.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  // Get effective threshold for a specific context
  getEffective: protectedProcedure
    .input(z.object({
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return {
          cpkWarning: 1.33,
          cpkCritical: 1.0,
          cpkTarget: 1.67,
          oeeWarning: 75,
          oeeCritical: 60,
          oeeTarget: 85,
          trendDeclineWarning: 5,
          trendDeclineCritical: 10,
          source: "default",
        };
      }

      const conditions = [eq(aiPredictionThresholds.isActive, 1)];
      
      const results = await db.select()
        .from(aiPredictionThresholds)
        .where(and(...conditions))
        .orderBy(desc(aiPredictionThresholds.priority));

      let bestMatch = null;
      let bestScore = -1;

      for (const threshold of results) {
        let score = 0;
        
        if (input.workstationId && threshold.workstationId === input.workstationId) {
          score += 100;
        } else if (threshold.workstationId && threshold.workstationId !== input.workstationId) {
          continue;
        }
        
        if (input.productId && threshold.productId === input.productId) {
          score += 50;
        } else if (threshold.productId && threshold.productId !== input.productId) {
          continue;
        }
        
        if (input.productionLineId && threshold.productionLineId === input.productionLineId) {
          score += 25;
        } else if (threshold.productionLineId && threshold.productionLineId !== input.productionLineId) {
          continue;
        }
        
        if (!threshold.workstationId && !threshold.productId && !threshold.productionLineId) {
          score += 1;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = threshold;
        }
      }

      if (bestMatch) {
        return {
          cpkWarning: parseFloat(bestMatch.cpkWarning || "1.33"),
          cpkCritical: parseFloat(bestMatch.cpkCritical || "1.0"),
          cpkTarget: parseFloat(bestMatch.cpkTarget || "1.67"),
          oeeWarning: parseFloat(bestMatch.oeeWarning || "75"),
          oeeCritical: parseFloat(bestMatch.oeeCritical || "60"),
          oeeTarget: parseFloat(bestMatch.oeeTarget || "85"),
          trendDeclineWarning: parseFloat(bestMatch.trendDeclineWarning || "5"),
          trendDeclineCritical: parseFloat(bestMatch.trendDeclineCritical || "10"),
          source: bestMatch.name,
          thresholdId: bestMatch.id,
        };
      }

      return {
        cpkWarning: 1.33,
        cpkCritical: 1.0,
        cpkTarget: 1.67,
        oeeWarning: 75,
        oeeCritical: 60,
        oeeTarget: 85,
        trendDeclineWarning: 5,
        trendDeclineCritical: 10,
        source: "default",
      };
    }),

  // Create new threshold
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      productId: z.number().optional(),
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      cpkWarning: z.number().min(0).max(5).default(1.33),
      cpkCritical: z.number().min(0).max(5).default(1.0),
      cpkTarget: z.number().min(0).max(5).default(1.67),
      oeeWarning: z.number().min(0).max(100).default(75),
      oeeCritical: z.number().min(0).max(100).default(60),
      oeeTarget: z.number().min(0).max(100).default(85),
      trendDeclineWarning: z.number().min(0).max(50).default(5),
      trendDeclineCritical: z.number().min(0).max(50).default(10),
      emailAlertEnabled: z.boolean().default(true),
      alertEmails: z.string().optional(),
      webhookEnabled: z.boolean().default(false),
      webhookUrl: z.string().optional(),
      priority: z.number().min(0).max(100).default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db.insert(aiPredictionThresholds).values({
        name: input.name,
        description: input.description || null,
        productId: input.productId || null,
        productionLineId: input.productionLineId || null,
        workstationId: input.workstationId || null,
        cpkWarning: input.cpkWarning.toFixed(3),
        cpkCritical: input.cpkCritical.toFixed(3),
        cpkTarget: input.cpkTarget.toFixed(3),
        oeeWarning: input.oeeWarning.toFixed(2),
        oeeCritical: input.oeeCritical.toFixed(2),
        oeeTarget: input.oeeTarget.toFixed(2),
        trendDeclineWarning: input.trendDeclineWarning.toFixed(2),
        trendDeclineCritical: input.trendDeclineCritical.toFixed(2),
        emailAlertEnabled: input.emailAlertEnabled ? 1 : 0,
        alertEmails: input.alertEmails || null,
        webhookEnabled: input.webhookEnabled ? 1 : 0,
        webhookUrl: input.webhookUrl || null,
        priority: input.priority,
        createdBy: ctx.user?.id || null,
        isActive: 1,
      });

      return { success: true, id: result[0].insertId };
    }),

  // Update threshold
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      productId: z.number().nullable().optional(),
      productionLineId: z.number().nullable().optional(),
      workstationId: z.number().nullable().optional(),
      cpkWarning: z.number().min(0).max(5).optional(),
      cpkCritical: z.number().min(0).max(5).optional(),
      cpkTarget: z.number().min(0).max(5).optional(),
      oeeWarning: z.number().min(0).max(100).optional(),
      oeeCritical: z.number().min(0).max(100).optional(),
      oeeTarget: z.number().min(0).max(100).optional(),
      trendDeclineWarning: z.number().min(0).max(50).optional(),
      trendDeclineCritical: z.number().min(0).max(50).optional(),
      emailAlertEnabled: z.boolean().optional(),
      alertEmails: z.string().optional(),
      webhookEnabled: z.boolean().optional(),
      webhookUrl: z.string().optional(),
      priority: z.number().min(0).max(100).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.productId !== undefined) updateData.productId = input.productId;
      if (input.productionLineId !== undefined) updateData.productionLineId = input.productionLineId;
      if (input.workstationId !== undefined) updateData.workstationId = input.workstationId;
      if (input.cpkWarning !== undefined) updateData.cpkWarning = input.cpkWarning.toFixed(3);
      if (input.cpkCritical !== undefined) updateData.cpkCritical = input.cpkCritical.toFixed(3);
      if (input.cpkTarget !== undefined) updateData.cpkTarget = input.cpkTarget.toFixed(3);
      if (input.oeeWarning !== undefined) updateData.oeeWarning = input.oeeWarning.toFixed(2);
      if (input.oeeCritical !== undefined) updateData.oeeCritical = input.oeeCritical.toFixed(2);
      if (input.oeeTarget !== undefined) updateData.oeeTarget = input.oeeTarget.toFixed(2);
      if (input.trendDeclineWarning !== undefined) updateData.trendDeclineWarning = input.trendDeclineWarning.toFixed(2);
      if (input.trendDeclineCritical !== undefined) updateData.trendDeclineCritical = input.trendDeclineCritical.toFixed(2);
      if (input.emailAlertEnabled !== undefined) updateData.emailAlertEnabled = input.emailAlertEnabled ? 1 : 0;
      if (input.alertEmails !== undefined) updateData.alertEmails = input.alertEmails;
      if (input.webhookEnabled !== undefined) updateData.webhookEnabled = input.webhookEnabled ? 1 : 0;
      if (input.webhookUrl !== undefined) updateData.webhookUrl = input.webhookUrl;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;

      await db.update(aiPredictionThresholds)
        .set(updateData)
        .where(eq(aiPredictionThresholds.id, input.id));

      return { success: true };
    }),

  // Delete threshold
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(aiPredictionThresholds)
        .where(eq(aiPredictionThresholds.id, input.id));

      return { success: true };
    }),

  // Get products for dropdown
  getProducts: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const result = await db.select({
        id: products.id,
        name: products.name,
        code: products.code,
      })
      .from(products)
      .orderBy(products.name);

      return result;
    }),

  // Get production lines for dropdown
  getProductionLines: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const result = await db.select({
        id: productionLines.id,
        name: productionLines.name,
      })
      .from(productionLines)
      .where(eq(productionLines.status, "active"))
      .orderBy(productionLines.name);

      return result;
    }),

  // Get workstations for dropdown
  getWorkstations: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const result = await db.select({
        id: workstations.id,
        name: workstations.name,
        code: workstations.code,
      })
      .from(workstations)
      .where(eq(workstations.isActive, 1))
      .orderBy(workstations.name);

      return result;
    }),
});
