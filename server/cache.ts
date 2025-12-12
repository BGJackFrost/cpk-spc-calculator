/**
 * Simple in-memory caching layer for frequently accessed data
 * Reduces database load for read-heavy operations
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 60 * 1000; // 1 minute default

  /**
   * Get cached data or return null if expired/missing
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Set cache with optional TTL (in milliseconds)
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttl || this.defaultTTL),
    });
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all entries matching a pattern
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache key generators
export const cacheKeys = {
  // Master data (longer TTL - 5 minutes)
  products: () => 'products:all',
  productById: (id: number) => "products:" + id,
  workstations: () => 'workstations:all',
  workstationById: (id: number) => "workstations:" + id,
  machines: () => 'machines:all',
  machineTypes: () => 'machineTypes:all',
  fixtures: () => 'fixtures:all',
  fixturesByMachine: (machineId: number) => "fixtures:machine:" + machineId,
  productionLines: () => 'productionLines:all',
  samplingConfigs: () => 'samplingConfigs:all',
  specifications: () => 'specifications:all',
  
  // SPC data (shorter TTL - 30 seconds)
  spcPlans: () => 'spcPlans:all',
  spcPlanById: (id: number) => "spcPlans:" + id,
  analysisHistory: (page: number, limit: number) => "analysisHistory:page:" + page + ":limit:" + limit,
  realtimeData: (planId: number) => "realtimeData:plan:" + planId,
  summaryStats: (planId: number, period: string) => "summaryStats:plan:" + planId + ":period:" + period,
  
  // Dashboard (medium TTL - 1 minute)
  dashboardStats: (userId: number) => "dashboard:stats:" + userId,
  dashboardConfig: (userId: number) => "dashboard:config:" + userId,
};

// TTL constants (in milliseconds)
export const TTL = {
  SHORT: 30 * 1000,      // 30 seconds - for frequently changing data
  MEDIUM: 60 * 1000,     // 1 minute - for dashboard data
  LONG: 5 * 60 * 1000,   // 5 minutes - for master data
  VERY_LONG: 30 * 60 * 1000, // 30 minutes - for rarely changing config
};

/**
 * Cache wrapper for async functions
 * Usage: const data = await withCache(cacheKeys.products(), TTL.LONG, () => getProducts());
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  if (data !== null && data !== undefined) {
    cache.set(key, data, ttl);
  }
  
  return data;
}

/**
 * Invalidate cache when data changes
 */
export function invalidateCache(patterns: string[]): void {
  for (const pattern of patterns) {
    cache.deletePattern(pattern);
  }
}

// Export for use in routers
export default cache;
