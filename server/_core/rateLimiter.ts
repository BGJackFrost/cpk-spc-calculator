import rateLimit from "express-rate-limit";
import { Request, Response } from "express";

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 1000; // Max requests per window
const RATE_LIMIT_MAX_AUTH_REQUESTS = 50; // Max auth requests per window
const RATE_LIMIT_MAX_EXPORT_REQUESTS = 30; // Max export requests per window

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    },
  });
};

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.",
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === "/api/health" || req.path === "/api/sse";
  },
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_AUTH_REQUESTS,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Quá nhiều yêu cầu đăng nhập, vui lòng thử lại sau 15 phút.",
});

// Rate limiter for export endpoints (PDF, Excel)
export const exportRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_EXPORT_REQUESTS,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Quá nhiều yêu cầu xuất file, vui lòng thử lại sau 15 phút.",
});

// In-memory store for tracking request counts (for logging/monitoring)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function trackRequest(key: string): { count: number; remaining: number } {
  const now = Date.now();
  const existing = requestCounts.get(key);
  
  if (!existing || existing.resetAt < now) {
    requestCounts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { count: 1, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }
  
  existing.count++;
  return { count: existing.count, remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - existing.count) };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const keys = Array.from(requestCounts.keys());
  for (const key of keys) {
    const value = requestCounts.get(key);
    if (value && value.resetAt < now) {
      requestCounts.delete(key);
    }
  }
}, 60 * 1000); // Cleanup every minute

console.log("[RateLimiter] Rate limiting configured:");
console.log(`  - General API: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Auth endpoints: ${RATE_LIMIT_MAX_AUTH_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Export endpoints: ${RATE_LIMIT_MAX_EXPORT_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
