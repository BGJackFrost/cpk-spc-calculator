import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { escalationHistory } from "../../drizzle/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";

export const escalationHistoryRouter = router({
  // Get escalation history list
  getList: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      status: z.enum(["active", "acknowledged", "resolved", "auto_resolved"]).optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      alertType: z.string().optional(),
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], total: 0, page: input.page, pageSize: input.pageSize, totalPages: 0 };
      
      const { page, pageSize, status, severity, alertType, startDate, endDate } = input;
      const offset = (page - 1) * pageSize;
      
      const conditions = [];
      if (status) conditions.push(eq(escalationHistory.status, status));
      if (severity) conditions.push(eq(escalationHistory.severity, severity));
      if (alertType) conditions.push(eq(escalationHistory.alertType, alertType));
      if (startDate) conditions.push(gte(escalationHistory.createdAt, startDate));
      if (endDate) conditions.push(lte(escalationHistory.createdAt, endDate));
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const [items, totalResult] = await Promise.all([
        db.select()
          .from(escalationHistory)
          .where(whereClause)
          .orderBy(desc(escalationHistory.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: sql<number>`count(*)` })
          .from(escalationHistory)
          .where(whereClause),
      ]);
      
      return {
        items,
        total: Number(totalResult[0]?.count || 0),
        page,
        pageSize,
        totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / pageSize),
      };
    }),

  // Get escalation statistics
  getStats: protectedProcedure
    .input(z.object({
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {
        totals: { total: 0, active: 0, acknowledged: 0, resolved: 0, autoResolved: 0 },
        statusDistribution: [],
        severityDistribution: [],
        alertTypeDistribution: [],
      };
      
      const { startDate, endDate } = input;
      
      const conditions = [];
      if (startDate) conditions.push(gte(escalationHistory.createdAt, startDate));
      if (endDate) conditions.push(lte(escalationHistory.createdAt, endDate));
      
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      
      const [totalResult, activeResult, acknowledgedResult, resolvedResult, autoResolvedResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(whereClause),
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(and(whereClause, eq(escalationHistory.status, "active"))),
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(and(whereClause, eq(escalationHistory.status, "acknowledged"))),
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(and(whereClause, eq(escalationHistory.status, "resolved"))),
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(and(whereClause, eq(escalationHistory.status, "auto_resolved"))),
      ]);
      
      const [lowResult, mediumResult, highResult, criticalResult] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(and(whereClause, eq(escalationHistory.severity, "low"))),
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(and(whereClause, eq(escalationHistory.severity, "medium"))),
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(and(whereClause, eq(escalationHistory.severity, "high"))),
        db.select({ count: sql<number>`count(*)` }).from(escalationHistory).where(and(whereClause, eq(escalationHistory.severity, "critical"))),
      ]);
      
      const alertTypeDistribution = await db
        .select({
          alertType: escalationHistory.alertType,
          count: sql<number>`count(*)`,
        })
        .from(escalationHistory)
        .where(whereClause)
        .groupBy(escalationHistory.alertType);
      
      return {
        totals: {
          total: Number(totalResult[0]?.count || 0),
          active: Number(activeResult[0]?.count || 0),
          acknowledged: Number(acknowledgedResult[0]?.count || 0),
          resolved: Number(resolvedResult[0]?.count || 0),
          autoResolved: Number(autoResolvedResult[0]?.count || 0),
        },
        statusDistribution: [
          { status: "active", count: Number(activeResult[0]?.count || 0) },
          { status: "acknowledged", count: Number(acknowledgedResult[0]?.count || 0) },
          { status: "resolved", count: Number(resolvedResult[0]?.count || 0) },
          { status: "auto_resolved", count: Number(autoResolvedResult[0]?.count || 0) },
        ],
        severityDistribution: [
          { severity: "low", count: Number(lowResult[0]?.count || 0) },
          { severity: "medium", count: Number(mediumResult[0]?.count || 0) },
          { severity: "high", count: Number(highResult[0]?.count || 0) },
          { severity: "critical", count: Number(criticalResult[0]?.count || 0) },
        ],
        alertTypeDistribution: alertTypeDistribution.map(item => ({
          alertType: item.alertType,
          count: Number(item.count),
        })),
      };
    }),

  // Get MTTR statistics
  getMttr: protectedProcedure
    .input(z.object({
      startDate: z.number().optional(),
      endDate: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return {
        overall: { avgMttrMinutes: 0, minMttrMinutes: 0, maxMttrMinutes: 0, totalResolved: 0 },
        byLevel: [],
        bySeverity: [],
      };
      
      const { startDate, endDate } = input;
      
      const conditions = [
        sql`${escalationHistory.resolvedAt} IS NOT NULL`,
      ];
      if (startDate) conditions.push(gte(escalationHistory.createdAt, startDate));
      if (endDate) conditions.push(lte(escalationHistory.createdAt, endDate));
      
      const whereClause = and(...conditions);
      
      const overallResult = await db
        .select({
          avgMttr: sql<number>`AVG(${escalationHistory.resolvedAt} - ${escalationHistory.createdAt})`,
          minMttr: sql<number>`MIN(${escalationHistory.resolvedAt} - ${escalationHistory.createdAt})`,
          maxMttr: sql<number>`MAX(${escalationHistory.resolvedAt} - ${escalationHistory.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(escalationHistory)
        .where(whereClause);
      
      const byLevelResult = await db
        .select({
          level: escalationHistory.currentLevel,
          avgMttr: sql<number>`AVG(${escalationHistory.resolvedAt} - ${escalationHistory.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(escalationHistory)
        .where(whereClause)
        .groupBy(escalationHistory.currentLevel);
      
      const bySeverityResult = await db
        .select({
          severity: escalationHistory.severity,
          avgMttr: sql<number>`AVG(${escalationHistory.resolvedAt} - ${escalationHistory.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(escalationHistory)
        .where(whereClause)
        .groupBy(escalationHistory.severity);
      
      return {
        overall: {
          avgMttrMinutes: Math.round(Number(overallResult[0]?.avgMttr || 0) / 60000),
          minMttrMinutes: Math.round(Number(overallResult[0]?.minMttr || 0) / 60000),
          maxMttrMinutes: Math.round(Number(overallResult[0]?.maxMttr || 0) / 60000),
          totalResolved: Number(overallResult[0]?.count || 0),
        },
        byLevel: byLevelResult.map(item => ({
          level: item.level,
          avgMttrMinutes: Math.round(Number(item.avgMttr || 0) / 60000),
          count: Number(item.count),
        })),
        bySeverity: bySeverityResult.map(item => ({
          severity: item.severity,
          avgMttrMinutes: Math.round(Number(item.avgMttr || 0) / 60000),
          count: Number(item.count),
        })),
      };
    }),

  // Get alert types
  getAlertTypes: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    
    const result = await db
      .select({ alertType: escalationHistory.alertType })
      .from(escalationHistory)
      .groupBy(escalationHistory.alertType);
    
    return result.map(item => item.alertType).filter(Boolean);
  }),

  // Acknowledge an escalation
  acknowledge: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      await db.update(escalationHistory)
        .set({
          status: "acknowledged",
          acknowledgedAt: Date.now(),
          acknowledgedBy: ctx.user?.id || null,
          notes: input.notes || null,
          updatedAt: Date.now(),
        })
        .where(eq(escalationHistory.id, input.id));
      
      return { success: true };
    }),

  // Resolve an escalation
  resolve: protectedProcedure
    .input(z.object({
      id: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };
      
      await db.update(escalationHistory)
        .set({
          status: "resolved",
          resolvedAt: Date.now(),
          resolvedBy: ctx.user?.id || null,
          notes: input.notes || null,
          updatedAt: Date.now(),
        })
        .where(eq(escalationHistory.id, input.id));
      
      return { success: true };
    }),
});
