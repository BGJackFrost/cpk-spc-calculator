/**
 * Rate Limiting Service
 * 
 * Provides dynamic rate limiting with token bucket algorithm,
 * role-based limits, and monitoring dashboard.
 */

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  burstLimit?: number; // Max burst requests
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

// Rate limit entry
interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
  requests: number;
  blocked: number;
  firstRequest: number;
}

// Rate limit stats
export interface RateLimitStats {
  key: string;
  requests: number;
  blocked: number;
  remaining: number;
  resetAt: Date;
}

// Rate limit event
export interface RateLimitEvent {
  id: string;
  timestamp: Date;
  key: string;
  endpoint?: string;
  blocked: boolean;
  remaining: number;
  userId?: string;
  ip?: string;
}

// Default limits by role
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  anonymous: { windowMs: 60000, maxRequests: 30, burstLimit: 10 },
  user: { windowMs: 60000, maxRequests: 100, burstLimit: 20 },
  admin: { windowMs: 60000, maxRequests: 500, burstLimit: 50 },
  api_key: { windowMs: 60000, maxRequests: 1000, burstLimit: 100 },
};

// Endpoint-specific limits
const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  '/api/auth/login': { windowMs: 300000, maxRequests: 5, burstLimit: 3 },
  '/api/auth/register': { windowMs: 3600000, maxRequests: 3, burstLimit: 1 },
  '/api/export': { windowMs: 60000, maxRequests: 10, burstLimit: 2 },
  '/api/ai': { windowMs: 60000, maxRequests: 20, burstLimit: 5 },
};

class RateLimitService {
  private limits: Map<string, RateLimitEntry> = new Map();
  private events: RateLimitEvent[] = [];
  private maxEvents: number = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    if (this.cleanupInterval) return;
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Stop cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.limits.forEach((entry, key) => {
      // Remove entries older than 1 hour
      if (now - entry.lastRefill > 3600000) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.limits.delete(key));
  }

  /**
   * Get rate limit config for request
   */
  private getConfig(options: {
    role?: string;
    endpoint?: string;
    apiKey?: string;
  }): RateLimitConfig {
    // Check endpoint-specific limit first
    if (options.endpoint && ENDPOINT_LIMITS[options.endpoint]) {
      return ENDPOINT_LIMITS[options.endpoint];
    }

    // Check API key limit
    if (options.apiKey) {
      return DEFAULT_LIMITS.api_key;
    }

    // Check role-based limit
    if (options.role && DEFAULT_LIMITS[options.role]) {
      return DEFAULT_LIMITS[options.role];
    }

    return DEFAULT_LIMITS.anonymous;
  }

  /**
   * Check rate limit using token bucket algorithm
   */
  checkLimit(
    key: string,
    options?: {
      role?: string;
      endpoint?: string;
      apiKey?: string;
      userId?: string;
      ip?: string;
    }
  ): {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
    retryAfter?: number;
  } {
    const config = this.getConfig(options || {});
    const now = Date.now();

    // Get or create entry
    let entry = this.limits.get(key);
    if (!entry) {
      entry = {
        tokens: config.maxRequests,
        lastRefill: now,
        requests: 0,
        blocked: 0,
        firstRequest: now,
      };
      this.limits.set(key, entry);
    }

    // Refill tokens based on time passed
    const timePassed = now - entry.lastRefill;
    const tokensToAdd = Math.floor(timePassed / config.windowMs) * config.maxRequests;
    
    if (tokensToAdd > 0) {
      entry.tokens = Math.min(config.maxRequests, entry.tokens + tokensToAdd);
      entry.lastRefill = now;
    }

    // Check burst limit
    const burstLimit = config.burstLimit || config.maxRequests;
    const recentRequests = entry.requests;
    
    // Check if allowed
    const allowed = entry.tokens > 0 && recentRequests < burstLimit;

    if (allowed) {
      entry.tokens--;
      entry.requests++;
    } else {
      entry.blocked++;
    }

    // Calculate reset time
    const resetAt = new Date(entry.lastRefill + config.windowMs);
    const retryAfter = allowed ? undefined : Math.ceil((config.windowMs - timePassed) / 1000);

    // Log event
    this.logEvent({
      key,
      endpoint: options?.endpoint,
      blocked: !allowed,
      remaining: entry.tokens,
      userId: options?.userId,
      ip: options?.ip,
    });

    return {
      allowed,
      remaining: Math.max(0, entry.tokens),
      resetAt,
      retryAfter,
    };
  }

  /**
   * Log rate limit event
   */
  private logEvent(event: Omit<RateLimitEvent, 'id' | 'timestamp'>): void {
    this.events.push({
      ...event,
      id: `rl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    });

    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  /**
   * Get rate limit stats for a key
   */
  getStats(key: string): RateLimitStats | null {
    const entry = this.limits.get(key);
    if (!entry) return null;

    return {
      key,
      requests: entry.requests,
      blocked: entry.blocked,
      remaining: entry.tokens,
      resetAt: new Date(entry.lastRefill + 60000),
    };
  }

  /**
   * Get all rate limit stats
   */
  getAllStats(): RateLimitStats[] {
    const stats: RateLimitStats[] = [];
    
    this.limits.forEach((entry, key) => {
      stats.push({
        key,
        requests: entry.requests,
        blocked: entry.blocked,
        remaining: entry.tokens,
        resetAt: new Date(entry.lastRefill + 60000),
      });
    });

    return stats.sort((a, b) => b.requests - a.requests);
  }

  /**
   * Get rate limit events
   */
  getEvents(options?: {
    key?: string;
    blocked?: boolean;
    limit?: number;
  }): RateLimitEvent[] {
    let events = [...this.events];

    if (options?.key) {
      events = events.filter(e => e.key === options.key);
    }

    if (options?.blocked !== undefined) {
      events = events.filter(e => e.blocked === options.blocked);
    }

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  /**
   * Get dashboard data
   */
  getDashboardData(): {
    totalRequests: number;
    blockedRequests: number;
    blockRate: number;
    topKeys: { key: string; requests: number; blocked: number }[];
    recentBlocks: RateLimitEvent[];
  } {
    let totalRequests = 0;
    let blockedRequests = 0;
    const keyStats: { key: string; requests: number; blocked: number }[] = [];

    this.limits.forEach((entry, key) => {
      totalRequests += entry.requests;
      blockedRequests += entry.blocked;
      keyStats.push({
        key,
        requests: entry.requests,
        blocked: entry.blocked,
      });
    });

    return {
      totalRequests,
      blockedRequests,
      blockRate: totalRequests > 0 ? Math.round((blockedRequests / totalRequests) * 100) : 0,
      topKeys: keyStats.sort((a, b) => b.requests - a.requests).slice(0, 10),
      recentBlocks: this.getEvents({ blocked: true, limit: 10 }),
    };
  }

  /**
   * Reset rate limit for a key
   */
  resetLimit(key: string): boolean {
    return this.limits.delete(key);
  }

  /**
   * Reset all rate limits
   */
  resetAllLimits(): void {
    this.limits.clear();
  }

  /**
   * Get rate limit headers
   */
  getHeaders(key: string): Record<string, string> {
    const entry = this.limits.get(key);
    if (!entry) {
      return {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '100',
        'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
      };
    }

    return {
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': String(Math.max(0, entry.tokens)),
      'X-RateLimit-Reset': new Date(entry.lastRefill + 60000).toISOString(),
    };
  }

  /**
   * Update default limits
   */
  updateDefaultLimits(role: string, config: Partial<RateLimitConfig>): void {
    if (DEFAULT_LIMITS[role]) {
      DEFAULT_LIMITS[role] = { ...DEFAULT_LIMITS[role], ...config };
    }
  }

  /**
   * Update endpoint limits
   */
  updateEndpointLimits(endpoint: string, config: RateLimitConfig): void {
    ENDPOINT_LIMITS[endpoint] = config;
  }

  /**
   * Get configured limits
   */
  getConfiguredLimits(): {
    defaultLimits: Record<string, RateLimitConfig>;
    endpointLimits: Record<string, RateLimitConfig>;
  } {
    return {
      defaultLimits: { ...DEFAULT_LIMITS },
      endpointLimits: { ...ENDPOINT_LIMITS },
    };
  }
}

// Singleton instance
export const rateLimitService = new RateLimitService();

// Export functions
export const checkRateLimit = rateLimitService.checkLimit.bind(rateLimitService);
export const getRateLimitStats = rateLimitService.getStats.bind(rateLimitService);
export const getAllRateLimitStats = rateLimitService.getAllStats.bind(rateLimitService);
export const getRateLimitEvents = rateLimitService.getEvents.bind(rateLimitService);
export const getRateLimitDashboard = rateLimitService.getDashboardData.bind(rateLimitService);
export const resetRateLimit = rateLimitService.resetLimit.bind(rateLimitService);
export const resetAllRateLimits = rateLimitService.resetAllLimits.bind(rateLimitService);
export const getRateLimitHeaders = rateLimitService.getHeaders.bind(rateLimitService);
export const updateDefaultRateLimits = rateLimitService.updateDefaultLimits.bind(rateLimitService);
export const updateEndpointRateLimits = rateLimitService.updateEndpointLimits.bind(rateLimitService);
export const getConfiguredRateLimits = rateLimitService.getConfiguredLimits.bind(rateLimitService);
