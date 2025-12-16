import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import Redis from "ioredis";
import { RedisStore } from "rate-limit-redis";

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5000; // Max requests per window
const RATE_LIMIT_MAX_AUTH_REQUESTS = 200; // Max auth requests per window
const RATE_LIMIT_MAX_EXPORT_REQUESTS = 100; // Max export requests per window

// IP Whitelist - these IPs bypass rate limiting completely
const IP_WHITELIST = new Set<string>([
  "127.0.0.1",
  "::1",
  "localhost",
  // Add internal network IPs here
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
]);

// Check if IP is in whitelist (supports CIDR notation)
function isWhitelisted(ip: string | undefined): boolean {
  if (!ip) return false;
  
  // Direct match
  if (IP_WHITELIST.has(ip)) return true;
  
  // Check for private IP ranges
  if (ip.startsWith("10.") || 
      ip.startsWith("192.168.") ||
      ip.startsWith("172.16.") ||
      ip.startsWith("172.17.") ||
      ip.startsWith("172.18.") ||
      ip.startsWith("172.19.") ||
      ip.startsWith("172.20.") ||
      ip.startsWith("172.21.") ||
      ip.startsWith("172.22.") ||
      ip.startsWith("172.23.") ||
      ip.startsWith("172.24.") ||
      ip.startsWith("172.25.") ||
      ip.startsWith("172.26.") ||
      ip.startsWith("172.27.") ||
      ip.startsWith("172.28.") ||
      ip.startsWith("172.29.") ||
      ip.startsWith("172.30.") ||
      ip.startsWith("172.31.")) {
    return true;
  }
  
  return false;
}

// Rate limit statistics for monitoring
interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  byEndpoint: Map<string, { total: number; blocked: number }>;
  byIp: Map<string, { total: number; blocked: number; lastBlocked?: number }>;
  hourlyBlocked: number[];
  lastReset: number;
}

const stats: RateLimitStats = {
  totalRequests: 0,
  blockedRequests: 0,
  byEndpoint: new Map(),
  byIp: new Map(),
  hourlyBlocked: new Array(24).fill(0),
  lastReset: Date.now(),
};

// Track request for monitoring
export function trackRateLimitRequest(ip: string, endpoint: string, blocked: boolean) {
  stats.totalRequests++;
  
  // Track by endpoint
  const endpointStats = stats.byEndpoint.get(endpoint) || { total: 0, blocked: 0 };
  endpointStats.total++;
  if (blocked) endpointStats.blocked++;
  stats.byEndpoint.set(endpoint, endpointStats);
  
  // Track by IP
  const ipStats = stats.byIp.get(ip) || { total: 0, blocked: 0 };
  ipStats.total++;
  if (blocked) {
    ipStats.blocked++;
    ipStats.lastBlocked = Date.now();
    stats.blockedRequests++;
    
    // Track hourly blocked
    const hour = new Date().getHours();
    stats.hourlyBlocked[hour]++;
  }
  stats.byIp.set(ip, ipStats);
}

// Get rate limit statistics
export function getRateLimitStats() {
  const topBlockedIps = Array.from(stats.byIp.entries())
    .filter(([_, s]) => s.blocked > 0)
    .sort((a, b) => b[1].blocked - a[1].blocked)
    .slice(0, 10)
    .map(([ip, s]) => ({ ip, ...s }));

  const topBlockedEndpoints = Array.from(stats.byEndpoint.entries())
    .filter(([_, s]) => s.blocked > 0)
    .sort((a, b) => b[1].blocked - a[1].blocked)
    .slice(0, 10)
    .map(([endpoint, s]) => ({ endpoint, ...s }));

  return {
    totalRequests: stats.totalRequests,
    blockedRequests: stats.blockedRequests,
    blockRate: stats.totalRequests > 0 
      ? ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(2) + '%'
      : '0%',
    topBlockedIps,
    topBlockedEndpoints,
    hourlyBlocked: stats.hourlyBlocked,
    uptime: Date.now() - stats.lastReset,
    config: {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      maxAuthRequests: RATE_LIMIT_MAX_AUTH_REQUESTS,
      maxExportRequests: RATE_LIMIT_MAX_EXPORT_REQUESTS,
    },
    whitelistedIps: Array.from(IP_WHITELIST),
  };
}

// Reset statistics (call periodically or on demand)
export function resetRateLimitStats() {
  stats.totalRequests = 0;
  stats.blockedRequests = 0;
  stats.byEndpoint.clear();
  stats.byIp.clear();
  stats.hourlyBlocked = new Array(24).fill(0);
  stats.lastReset = Date.now();
}

// Add IP to whitelist
export function addToWhitelist(ip: string) {
  IP_WHITELIST.add(ip);
  console.log(`[RateLimiter] Added ${ip} to whitelist`);
}

// Remove IP from whitelist
export function removeFromWhitelist(ip: string) {
  IP_WHITELIST.delete(ip);
  console.log(`[RateLimiter] Removed ${ip} from whitelist`);
}

// Get whitelist
export function getWhitelist(): string[] {
  return Array.from(IP_WHITELIST);
}

// Redis client (optional - falls back to memory store if not configured)
let redisClient: Redis | null = null;
let redisStore: RedisStore | null = null;

// Initialize Redis store if REDIS_URL is configured
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 100, 3000);
      },
    });

    redisClient.on("error", (err) => {
      console.error("[RateLimiter] Redis error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("[RateLimiter] Connected to Redis");
    });

    redisStore = new RedisStore({
      // @ts-expect-error - ioredis is compatible
      sendCommand: (...args: string[]) => redisClient!.call(...args),
      prefix: "rl:",
    });

    console.log("[RateLimiter] Using Redis store for rate limiting");
  } catch (error) {
    console.warn("[RateLimiter] Failed to initialize Redis, using memory store:", error);
    redisClient = null;
    redisStore = null;
  }
} else {
  console.log("[RateLimiter] REDIS_URL not configured, using memory store");
}

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  trackRateLimitRequest(ip, req.path, true);
  
  res.status(429).json({
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Quá nhiều yêu cầu. Vui lòng thử lại sau.",
      retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    },
  });
};

// Disable all validation warnings for proxy environments
const validateOptions = { 
  xForwardedForHeader: false,
  trustProxy: false,
};

// Skip function with whitelist check
const createSkipFunction = (additionalSkips?: (req: Request) => boolean) => {
  return (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress;
    
    // Skip if IP is whitelisted
    if (isWhitelisted(ip)) {
      return true;
    }
    
    // Skip for health checks, SSE, and static assets
    if (req.path === "/api/health" || 
        req.path === "/api/sse" ||
        req.path.startsWith("/@") ||
        req.path.startsWith("/src/") ||
        req.path.startsWith("/node_modules/")) {
      return true;
    }
    
    // Additional custom skips
    if (additionalSkips && additionalSkips(req)) {
      return true;
    }
    
    // Track non-skipped request
    trackRateLimitRequest(ip || "unknown", req.path, false);
    
    return false;
  };
};

// General API rate limiter
export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.",
  skip: createSkipFunction(),
  validate: validateOptions,
  ...(redisStore && { store: redisStore }),
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_AUTH_REQUESTS,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Quá nhiều yêu cầu đăng nhập, vui lòng thử lại sau 15 phút.",
  skip: createSkipFunction(),
  validate: validateOptions,
  ...(redisStore && { store: redisStore }),
});

// Rate limiter for export endpoints (PDF, Excel)
export const exportRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_EXPORT_REQUESTS,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Quá nhiều yêu cầu xuất file, vui lòng thử lại sau 15 phút.",
  skip: createSkipFunction(),
  validate: validateOptions,
  ...(redisStore && { store: redisStore }),
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

// Reset hourly stats at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    stats.hourlyBlocked = new Array(24).fill(0);
  }
}, 60 * 1000);

console.log("[RateLimiter] Rate limiting configured:");
console.log(`  - General API: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Auth endpoints: ${RATE_LIMIT_MAX_AUTH_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Export endpoints: ${RATE_LIMIT_MAX_EXPORT_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Store: ${redisStore ? 'Redis' : 'Memory'}`);
console.log(`  - Whitelisted IPs: ${IP_WHITELIST.size}`);
