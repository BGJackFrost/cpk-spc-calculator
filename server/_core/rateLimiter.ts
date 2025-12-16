import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import Redis from "ioredis";
import { RedisStore } from "rate-limit-redis";

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 5000; // Max requests per window
const RATE_LIMIT_MAX_AUTH_REQUESTS = 200; // Max auth requests per window
const RATE_LIMIT_MAX_EXPORT_REQUESTS = 100; // Max export requests per window
const RATE_LIMIT_MAX_USER_REQUESTS = 3000; // Max requests per user per window

// Global rate limit enabled flag - DEFAULT IS DISABLED
let rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true'; // Default: disabled
let configInitialized = false;

// Import config service (lazy to avoid circular deps)
let configService: any = null;
async function getConfigService() {
  if (!configService) {
    configService = await import('../services/rateLimitConfigService');
  }
  return configService;
}

// Initialize from database
export async function initFromDatabase(): Promise<void> {
  if (configInitialized) return;
  try {
    const svc = await getConfigService();
    const enabled = await svc.getBooleanConfig('enabled', false);
    rateLimitEnabled = enabled;
    configInitialized = true;
    console.log(`[RateLimiter] Loaded config from database: enabled=${enabled}`);
  } catch (error) {
    console.warn('[RateLimiter] Failed to load config from database, using defaults');
  }
}

// Enable/disable rate limiting (also saves to database)
export async function setRateLimitEnabled(
  enabled: boolean, 
  userId?: number, 
  userName?: string,
  ipAddress?: string
): Promise<boolean> {
  rateLimitEnabled = enabled;
  console.log(`[RateLimiter] Rate limiting ${enabled ? 'ENABLED' : 'DISABLED'}`);
  
  // Save to database if user info provided
  if (userId && userName) {
    try {
      const svc = await getConfigService();
      await svc.setConfigValue(
        'enabled', 
        String(enabled), 
        userId, 
        userName,
        `Rate limiting ${enabled ? 'enabled' : 'disabled'}`,
        ipAddress
      );
    } catch (error) {
      console.error('[RateLimiter] Failed to save config to database:', error);
      return false;
    }
  }
  return true;
}

// Check if rate limiting is enabled
export function isRateLimitEnabled(): boolean {
  return rateLimitEnabled;
}

// Alert configuration
const BLOCK_RATE_ALERT_THRESHOLD = 5; // Alert when block rate > 5%
const ALERT_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
let lastAlertTime = 0;
const ALERT_COOLDOWN = 30 * 60 * 1000; // 30 minutes cooldown between alerts

// IP Whitelist - these IPs bypass rate limiting completely
const IP_WHITELIST = new Set<string>([
  "127.0.0.1",
  "::1",
  "localhost",
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
]);

// Check if IP is in whitelist (supports CIDR notation)
function isWhitelisted(ip: string | undefined): boolean {
  if (!ip) return false;
  
  if (IP_WHITELIST.has(ip)) return true;
  
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
  byUser: Map<string, { total: number; blocked: number; lastBlocked?: number }>;
  hourlyBlocked: number[];
  lastReset: number;
  alerts: Array<{ timestamp: number; blockRate: number; message: string }>;
}

const stats: RateLimitStats = {
  totalRequests: 0,
  blockedRequests: 0,
  byEndpoint: new Map(),
  byIp: new Map(),
  byUser: new Map(),
  hourlyBlocked: new Array(24).fill(0),
  lastReset: Date.now(),
  alerts: [],
};

// User rate limit tracking
const userRateLimits = new Map<string, { count: number; resetAt: number }>();

// Check and track user rate limit
export function checkUserRateLimit(userId: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = userRateLimits.get(userId);
  
  if (!existing || existing.resetAt < now) {
    userRateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_USER_REQUESTS - 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  
  if (existing.count >= RATE_LIMIT_MAX_USER_REQUESTS) {
    // Track blocked request for user
    const userStats = stats.byUser.get(userId) || { total: 0, blocked: 0 };
    userStats.blocked++;
    userStats.lastBlocked = now;
    stats.byUser.set(userId, userStats);
    
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  
  existing.count++;
  
  // Track request for user
  const userStats = stats.byUser.get(userId) || { total: 0, blocked: 0 };
  userStats.total++;
  stats.byUser.set(userId, userStats);
  
  return { allowed: true, remaining: RATE_LIMIT_MAX_USER_REQUESTS - existing.count, resetAt: existing.resetAt };
}

// Get user rate limit info
export function getUserRateLimitInfo(userId: string): { count: number; limit: number; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = userRateLimits.get(userId);
  
  if (!existing || existing.resetAt < now) {
    return { count: 0, limit: RATE_LIMIT_MAX_USER_REQUESTS, remaining: RATE_LIMIT_MAX_USER_REQUESTS, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  
  return { 
    count: existing.count, 
    limit: RATE_LIMIT_MAX_USER_REQUESTS, 
    remaining: Math.max(0, RATE_LIMIT_MAX_USER_REQUESTS - existing.count),
    resetAt: existing.resetAt 
  };
}

// Alert callback type
type AlertCallback = (alert: { blockRate: number; message: string; timestamp: number }) => void;
let alertCallback: AlertCallback | null = null;

// Set alert callback
export function setAlertCallback(callback: AlertCallback) {
  alertCallback = callback;
}

// Check block rate and trigger alert if needed
function checkBlockRateAlert() {
  if (stats.totalRequests < 100) return; // Need minimum requests to calculate meaningful rate
  
  const blockRate = (stats.blockedRequests / stats.totalRequests) * 100;
  const now = Date.now();
  
  if (blockRate > BLOCK_RATE_ALERT_THRESHOLD && (now - lastAlertTime) > ALERT_COOLDOWN) {
    lastAlertTime = now;
    
    const alert = {
      timestamp: now,
      blockRate: parseFloat(blockRate.toFixed(2)),
      message: `Cảnh báo: Tỷ lệ block cao (${blockRate.toFixed(2)}%) - ${stats.blockedRequests}/${stats.totalRequests} requests bị block trong 15 phút qua`,
    };
    
    stats.alerts.push(alert);
    if (stats.alerts.length > 100) stats.alerts.shift(); // Keep last 100 alerts
    
    console.warn(`[RateLimiter] ${alert.message}`);
    
    if (alertCallback) {
      alertCallback(alert);
    }
  }
}

// Track request for monitoring
export function trackRateLimitRequest(ip: string, endpoint: string, blocked: boolean, userId?: string) {
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
    
    const hour = new Date().getHours();
    stats.hourlyBlocked[hour]++;
  }
  stats.byIp.set(ip, ipStats);
  
  // Track by user if provided
  if (userId) {
    const userStats = stats.byUser.get(userId) || { total: 0, blocked: 0 };
    userStats.total++;
    if (blocked) {
      userStats.blocked++;
      userStats.lastBlocked = Date.now();
    }
    stats.byUser.set(userId, userStats);
  }
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

  const topBlockedUsers = Array.from(stats.byUser.entries())
    .filter(([_, s]) => s.blocked > 0)
    .sort((a, b) => b[1].blocked - a[1].blocked)
    .slice(0, 10)
    .map(([userId, s]) => ({ userId, ...s }));

  const blockRate = stats.totalRequests > 0 
    ? (stats.blockedRequests / stats.totalRequests) * 100
    : 0;

  return {
    totalRequests: stats.totalRequests,
    blockedRequests: stats.blockedRequests,
    blockRate: blockRate.toFixed(2) + '%',
    blockRateValue: blockRate,
    alertThreshold: BLOCK_RATE_ALERT_THRESHOLD,
    isAlertActive: blockRate > BLOCK_RATE_ALERT_THRESHOLD,
    topBlockedIps,
    topBlockedEndpoints,
    topBlockedUsers,
    hourlyBlocked: stats.hourlyBlocked,
    uptime: Date.now() - stats.lastReset,
    recentAlerts: stats.alerts.slice(-10),
    enabled: rateLimitEnabled,
    config: {
      windowMs: RATE_LIMIT_WINDOW_MS,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      maxAuthRequests: RATE_LIMIT_MAX_AUTH_REQUESTS,
      maxExportRequests: RATE_LIMIT_MAX_EXPORT_REQUESTS,
      maxUserRequests: RATE_LIMIT_MAX_USER_REQUESTS,
      alertThreshold: BLOCK_RATE_ALERT_THRESHOLD,
    },
    whitelistedIps: Array.from(IP_WHITELIST),
    redisConnected: redisClient?.status === 'ready',
  };
}

// Reset statistics
export function resetRateLimitStats() {
  stats.totalRequests = 0;
  stats.blockedRequests = 0;
  stats.byEndpoint.clear();
  stats.byIp.clear();
  stats.byUser.clear();
  stats.hourlyBlocked = new Array(24).fill(0);
  stats.lastReset = Date.now();
  // Keep alerts history
}

// Clear alerts
export function clearAlerts() {
  stats.alerts = [];
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

// Redis client
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
  console.log("[RateLimiter] To enable Redis, set REDIS_URL environment variable");
  console.log("[RateLimiter] Example: redis://localhost:6379 or redis://:password@host:port");
}

// Export Redis connection status
export function getRedisStatus(): { connected: boolean; url: string | null } {
  return {
    connected: redisClient?.status === 'ready',
    url: REDIS_URL ? REDIS_URL.replace(/:[^:@]+@/, ':***@') : null, // Hide password
  };
}

// Custom handler for rate limit exceeded
const rateLimitHandler = (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const userId = (req as any).user?.id;
  trackRateLimitRequest(ip, req.path, true, userId);
  
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

// Skip function with whitelist check and enabled check
const createSkipFunction = (additionalSkips?: (req: Request) => boolean) => {
  return (req: Request) => {
    // Skip all rate limiting if disabled
    if (!rateLimitEnabled) {
      return true;
    }
    
    const ip = req.ip || req.socket.remoteAddress;
    
    if (isWhitelisted(ip)) {
      return true;
    }
    
    if (req.path === "/api/health" || 
        req.path === "/api/sse" ||
        req.path.startsWith("/@") ||
        req.path.startsWith("/src/") ||
        req.path.startsWith("/node_modules/")) {
      return true;
    }
    
    if (additionalSkips && additionalSkips(req)) {
      return true;
    }
    
    const userId = (req as any).user?.id;
    trackRateLimitRequest(ip || "unknown", req.path, false, userId);
    
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

// In-memory store for tracking request counts
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
  
  // Cleanup request counts
  const keys = Array.from(requestCounts.keys());
  for (const key of keys) {
    const value = requestCounts.get(key);
    if (value && value.resetAt < now) {
      requestCounts.delete(key);
    }
  }
  
  // Cleanup user rate limits
  const userKeys = Array.from(userRateLimits.keys());
  for (const key of userKeys) {
    const value = userRateLimits.get(key);
    if (value && value.resetAt < now) {
      userRateLimits.delete(key);
    }
  }
}, 60 * 1000);

// Check block rate alert periodically
setInterval(() => {
  checkBlockRateAlert();
}, ALERT_CHECK_INTERVAL);

// Reset hourly stats at midnight
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    stats.hourlyBlocked = new Array(24).fill(0);
  }
}, 60 * 1000);

console.log("[RateLimiter] Rate limiting configured:");
console.log(`  - Status: ${rateLimitEnabled ? 'ENABLED' : 'DISABLED (default)'}`);
console.log(`  - General API: ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Auth endpoints: ${RATE_LIMIT_MAX_AUTH_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Export endpoints: ${RATE_LIMIT_MAX_EXPORT_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Per-user limit: ${RATE_LIMIT_MAX_USER_REQUESTS} requests per ${RATE_LIMIT_WINDOW_MS / 60000} minutes`);
console.log(`  - Alert threshold: ${BLOCK_RATE_ALERT_THRESHOLD}% block rate`);
console.log(`  - Store: ${redisStore ? 'Redis' : 'Memory'}`);
console.log(`  - Whitelisted IPs: ${IP_WHITELIST.size}`);
console.log(`  - To enable rate limiting, set RATE_LIMIT_ENABLED=true in environment`);
