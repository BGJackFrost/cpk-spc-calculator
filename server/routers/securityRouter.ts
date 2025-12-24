import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { securityAuditLogs, apiRateLimits } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export const securityRouter = router({
  // Get audit logs
  getAuditLogs: protectedProcedure
    .input(z.object({
      userId: z.string().optional(),
      action: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      let conditions: any[] = [];
      
      if (input.userId) {
        conditions.push(eq(securityAuditLogs.userId, input.userId));
      }
      if (input.action) {
        conditions.push(eq(securityAuditLogs.action, input.action));
      }
      if (input.startDate) {
        conditions.push(gte(securityAuditLogs.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(securityAuditLogs.createdAt, new Date(input.endDate)));
      }
      
      const logs = await db.select()
        .from(securityAuditLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return logs;
    }),

  // Log security event
  logEvent: protectedProcedure
    .input(z.object({
      action: z.string(),
      resource: z.string(),
      details: z.record(z.string(), z.any()).optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const [log] = await db.insert(securityAuditLogs).values({
        userId: ctx.user?.id,
        action: input.action,
        resource: input.resource,
        details: JSON.stringify(input.details || {}),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      }).execute();
      return log;
    }),

  // Get rate limits
  getRateLimits: protectedProcedure.query(async () => {
    const db = await getDb();
    const limits = await db.select()
      .from(apiRateLimits)
      .orderBy(desc(apiRateLimits.createdAt));
    return limits;
  }),

  // Create rate limit
  createRateLimit: protectedProcedure
    .input(z.object({
      endpoint: z.string(),
      maxRequests: z.number(),
      windowSeconds: z.number(),
      enabled: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const [limit] = await db.insert(apiRateLimits).values({
        endpoint: input.endpoint,
        maxRequests: input.maxRequests,
        windowSeconds: input.windowSeconds,
        enabled: input.enabled,
      }).execute();
      return limit;
    }),

  // Update rate limit
  updateRateLimit: protectedProcedure
    .input(z.object({
      id: z.number(),
      maxRequests: z.number().optional(),
      windowSeconds: z.number().optional(),
      enabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      const updateData: Record<string, any> = {};
      if (input.maxRequests !== undefined) updateData.maxRequests = input.maxRequests;
      if (input.windowSeconds !== undefined) updateData.windowSeconds = input.windowSeconds;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      
      const [limit] = await db.update(apiRateLimits)
        .set(updateData)
        .where(eq(apiRateLimits.id, input.id))
        .execute();
      return limit;
    }),

  // Delete rate limit
  deleteRateLimit: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(apiRateLimits).where(eq(apiRateLimits.id, input.id));
      return { success: true };
    }),

  // Get security stats
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    const logs = await db.select().from(securityAuditLogs).limit(1000);
    const rateLimits = await db.select().from(apiRateLimits);
    
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentLogs = logs.filter(l => new Date(l.createdAt!) > last24h);
    
    return {
      totalEvents: logs.length,
      eventsLast24h: recentLogs.length,
      uniqueUsers: new Set(logs.map(l => l.userId)).size,
      totalRateLimits: rateLimits.length,
      activeRateLimits: rateLimits.filter(r => r.enabled).length,
      topActions: Object.entries(
        logs.reduce((acc, l) => {
          acc[l.action] = (acc[l.action] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }),

  // Run security scan
  runSecurityScan: protectedProcedure.mutation(async () => {
    // Simulate security scan
    const findings = [
      { severity: "low", type: "config", message: "Debug mode enabled in production", recommendation: "Disable debug mode" },
      { severity: "medium", type: "auth", message: "Session timeout too long", recommendation: "Reduce session timeout to 30 minutes" },
    ];
    
    return {
      scanId: `scan-${Date.now()}`,
      status: "completed",
      findings,
      score: 85,
      scannedAt: new Date(),
    };
  }),
});
