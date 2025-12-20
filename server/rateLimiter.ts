/**
 * Simple in-memory rate limiter for API endpoints
 * Prevents brute force attacks on sensitive endpoints like password reset
 */

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blockedUntil: number | null;
}

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  blockDurationMs: number; // Block duration after exceeding limit
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  passwordReset: {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxRequests: 5,              // 5 requests per 15 minutes
    blockDurationMs: 30 * 60 * 1000, // Block for 30 minutes
  },
  login: {
    windowMs: 15 * 60 * 1000,    // 15 minutes
    maxRequests: 10,             // 10 attempts per 15 minutes
    blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
  },
  twoFactorVerify: {
    windowMs: 5 * 60 * 1000,     // 5 minutes
    maxRequests: 5,              // 5 attempts per 5 minutes
    blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
  },
} as const;

/**
 * Check if a request is rate limited
 * @param key Unique identifier (e.g., IP address, email, or combination)
 * @param config Rate limit configuration
 * @returns Object with isLimited flag and retryAfter (seconds)
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { isLimited: boolean; retryAfter: number; remainingRequests: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // If blocked, check if block has expired
  if (entry?.blockedUntil) {
    if (now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return { isLimited: true, retryAfter, remainingRequests: 0 };
    }
    // Block expired, reset entry
    rateLimitStore.delete(key);
  }

  // No entry or window expired, create new entry
  if (!entry || (now - entry.firstRequest) > config.windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      blockedUntil: null,
    });
    return { isLimited: false, retryAfter: 0, remainingRequests: config.maxRequests - 1 };
  }

  // Within window, increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.maxRequests) {
    entry.blockedUntil = now + config.blockDurationMs;
    const retryAfter = Math.ceil(config.blockDurationMs / 1000);
    return { isLimited: true, retryAfter, remainingRequests: 0 };
  }

  return { 
    isLimited: false, 
    retryAfter: 0, 
    remainingRequests: config.maxRequests - entry.count 
  };
}

/**
 * Reset rate limit for a key (e.g., after successful login)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get rate limit key from request context
 */
export function getRateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

/**
 * Clean up expired entries periodically
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    // Remove entries that are both:
    // 1. Not blocked or block expired
    // 2. Window expired
    const windowExpired = (now - entry.firstRequest) > 60 * 60 * 1000; // 1 hour
    const blockExpired = !entry.blockedUntil || now > entry.blockedUntil;
    
    if (windowExpired && blockExpired) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupExpiredEntries, 10 * 60 * 1000);

/**
 * Get current rate limit status for monitoring
 */
export function getRateLimitStats(): { totalEntries: number; blockedEntries: number } {
  let blockedEntries = 0;
  const now = Date.now();
  
  const values = Array.from(rateLimitStore.values());
  for (const entry of values) {
    if (entry.blockedUntil && now < entry.blockedUntil) {
      blockedEntries++;
    }
  }
  
  return {
    totalEntries: rateLimitStore.size,
    blockedEntries,
  };
}
