import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

/**
 * tRPC-level Rate Limiter
 * Provides per-user/IP rate limiting for tRPC procedures
 * Works alongside Express-level rate limiting for defense in depth
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

// Separate stores for different rate limit tiers
const stores = new Map<string, Map<string, RateLimitEntry>>();

function getStore(tier: string): Map<string, RateLimitEntry> {
  if (!stores.has(tier)) {
    stores.set(tier, new Map());
  }
  return stores.get(tier)!;
}

function getKey(ctx: TrpcContext): string {
  const userId = ctx.user?.id;
  if (userId) return `user:${userId}`;
  const ip = ctx.req.ip || ctx.req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

function checkLimit(key: string, store: Map<string, RateLimitEntry>, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  return { allowed: entry.count <= config.maxRequests, remaining, resetAt: entry.resetAt };
}

// Cleanup expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  }
}, 60_000);

// ==========================================
// Pre-configured rate limit tiers
// ==========================================

/** Export operations: 10 requests per minute per user */
const EXPORT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: parseInt(process.env.RATE_LIMIT_EXPORT_PER_MIN || '10'),
  message: 'Quá nhiều yêu cầu xuất file. Vui lòng chờ 1 phút.',
};

/** Upload operations: 20 requests per minute per user */
const UPLOAD_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD_PER_MIN || '20'),
  message: 'Quá nhiều yêu cầu upload. Vui lòng chờ 1 phút.',
};

/** Heavy computation: 5 requests per minute per user */
const COMPUTE_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: parseInt(process.env.RATE_LIMIT_COMPUTE_PER_MIN || '5'),
  message: 'Quá nhiều yêu cầu tính toán. Vui lòng chờ 1 phút.',
};

/** General API: 100 requests per minute per user */
const GENERAL_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: parseInt(process.env.RATE_LIMIT_GENERAL_PER_MIN || '100'),
  message: 'Quá nhiều yêu cầu. Vui lòng chờ 1 phút.',
};

/**
 * Create a tRPC middleware that enforces rate limiting
 * Usage in routers:
 *   .use(rateLimitMiddleware('export'))
 */
export function rateLimitMiddleware(tier: 'export' | 'upload' | 'compute' | 'general' = 'general') {
  const configs: Record<string, RateLimitConfig> = {
    export: EXPORT_CONFIG,
    upload: UPLOAD_CONFIG,
    compute: COMPUTE_CONFIG,
    general: GENERAL_CONFIG,
  };

  const config = configs[tier];
  const store = getStore(tier);

  return async ({ ctx, next }: { ctx: TrpcContext; next: () => Promise<any> }) => {
    // Skip rate limiting if globally disabled
    if (process.env.RATE_LIMIT_ENABLED !== 'true') {
      return next();
    }

    const key = getKey(ctx);
    const result = checkLimit(key, store, config);

    // Set rate limit headers
    ctx.res.setHeader('X-RateLimit-Limit', config.maxRequests);
    ctx.res.setHeader('X-RateLimit-Remaining', result.remaining);
    ctx.res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (!result.allowed) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: config.message || 'Rate limit exceeded',
      });
    }

    return next();
  };
}

/**
 * Get current rate limit stats for monitoring
 */
export function getRateLimitStats(): Record<string, { totalKeys: number; activeRequests: number }> {
  const stats: Record<string, { totalKeys: number; activeRequests: number }> = {};
  const now = Date.now();

  for (const [tier, store] of stores) {
    let activeRequests = 0;
    let totalKeys = 0;
    for (const [, entry] of store) {
      if (entry.resetAt >= now) {
        totalKeys++;
        activeRequests += entry.count;
      }
    }
    stats[tier] = { totalKeys, activeRequests };
  }

  return stats;
}
