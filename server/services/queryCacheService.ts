/**
 * Query Cache Service
 * 
 * Provides in-memory caching for frequently accessed database queries
 * to reduce database load and improve response times.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryUsage: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  entriesByCategory: Record<string, number>;
  // Additional fields for compatibility
  size: number;
  evictions: number;
  byCategory: Record<string, number>;
}

class QueryCacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private totalHits: number = 0;
  private totalMisses: number = 0;
  private maxEntries: number = 1000;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default
  
  // TTL configurations for different query types (in milliseconds)
  private ttlConfig: Record<string, number> = {
    // Statistics queries - cache longer (10 minutes)
    'statistics': 10 * 60 * 1000,
    'analytics': 10 * 60 * 1000,
    'dashboard': 10 * 60 * 1000,
    
    // List queries - cache shorter (2 minutes)
    'list': 2 * 60 * 1000,
    'search': 2 * 60 * 1000,
    
    // Aggregation queries - cache medium (5 minutes)
    'count': 5 * 60 * 1000,
    'sum': 5 * 60 * 1000,
    'avg': 5 * 60 * 1000,
    
    // Real-time data - very short cache (30 seconds)
    'realtime': 30 * 1000,
    'pool': 30 * 1000,
    'performance': 30 * 1000,
    
    // Configuration data - cache longer (15 minutes)
    'config': 15 * 60 * 1000,
    'settings': 15 * 60 * 1000,
    
    // User data - short cache (1 minute)
    'user': 60 * 1000,
    'auth': 60 * 1000,
  };
  
  /**
   * Generate a cache key from query identifier and parameters
   */
  generateKey(queryId: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return queryId;
    }
    
    // Sort params for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>);
    
    return `${queryId}:${JSON.stringify(sortedParams)}`;
  }
  
  /**
   * Get TTL based on query category
   */
  private getTTL(queryId: string, customTTL?: number): number {
    if (customTTL !== undefined) {
      return customTTL;
    }
    
    // Check if queryId matches any category
    for (const [category, ttl] of Object.entries(this.ttlConfig)) {
      if (queryId.toLowerCase().includes(category)) {
        return ttl;
      }
    }
    
    return this.defaultTTL;
  }
  
  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.totalMisses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.totalMisses++;
      return null;
    }
    
    // Update hit count
    entry.hits++;
    this.totalHits++;
    
    return entry.data as T;
  }
  
  /**
   * Set cached data with optional TTL
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    // Evict old entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }
    
    const ttl = this.getTTL(key, customTTL);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
  }
  
  /**
   * Get or set cached data using a factory function
   */
  async getOrSet<T>(
    queryId: string,
    params: Record<string, any> | undefined,
    factory: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    const key = this.generateKey(queryId, params);
    
    // Try to get from cache
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute factory and cache result
    const data = await factory();
    this.set(key, data, customTTL);
    
    return data;
  }
  
  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Invalidate all entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    
    Array.from(this.cache.keys()).forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * Invalidate all entries for a specific query ID (regardless of params)
   */
  invalidateQuery(queryId: string): number {
    let count = 0;
    
    Array.from(this.cache.keys()).forEach((key) => {
      if (key === queryId || key.startsWith(`${queryId}:`)) {
        this.cache.delete(key);
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }
  
  /**
   * Evict oldest entries to make room for new ones
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Evict entries based on LRU (Least Recently Used)
   */
  evictLRU(count: number = 1): number {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits);
    
    let evicted = 0;
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
      evicted++;
    }
    
    return evicted;
  }
  
  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let count = 0;
    const now = Date.now();
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;
    const entriesByCategory: Record<string, number> = {};
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      // Track oldest/newest
      if (oldestEntry === null || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (newestEntry === null || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
      
      // Count by category
      const category = key.split(':')[0].split('_')[0];
      entriesByCategory[category] = (entriesByCategory[category] || 0) + 1;
    });
    
    const totalRequests = this.totalHits + this.totalMisses;
    
    return {
      totalEntries: this.cache.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate: totalRequests > 0 ? this.totalHits / totalRequests : 0,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry,
      newestEntry,
      entriesByCategory,
      // Additional fields for compatibility
      size: this.cache.size,
      evictions: 0, // Track separately if needed
      byCategory: entriesByCategory,
    };
  }
  
  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      // Rough estimation: key size + JSON stringified data size
      size += key.length * 2; // UTF-16
      size += JSON.stringify(entry.data).length * 2;
      size += 32; // Overhead for entry metadata
    });
    
    return size;
  }
  
  /**
   * Get detailed cache entries info
   */
  getEntries(): Array<{
    key: string;
    timestamp: number;
    ttl: number;
    hits: number;
    age: number;
    expiresIn: number;
  }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      hits: entry.hits,
      age: now - entry.timestamp,
      expiresIn: Math.max(0, entry.ttl - (now - entry.timestamp)),
    }));
  }
  
  /**
   * Configure TTL for a category
   */
  setTTLConfig(category: string, ttl: number): void {
    this.ttlConfig[category] = ttl;
  }
  
  /**
   * Set maximum cache entries
   */
  setMaxEntries(max: number): void {
    this.maxEntries = max;
    
    // Evict if over new limit
    while (this.cache.size > this.maxEntries) {
      this.evictOldest();
    }
  }
  
  /**
   * Warm up cache with common queries
   */
  async warmup(queries: Array<{
    queryId: string;
    params?: Record<string, any>;
    factory: () => Promise<any>;
    ttl?: number;
  }>): Promise<number> {
    let warmedUp = 0;
    
    for (const query of queries) {
      try {
        await this.getOrSet(query.queryId, query.params, query.factory, query.ttl);
        warmedUp++;
      } catch (error) {
        console.error(`Failed to warm up cache for ${query.queryId}:`, error);
      }
    }
    
    return warmedUp;
  }
}

// Singleton instance
export const queryCache = new QueryCacheService();

// Helper function for common use cases
export function withCache<T>(
  queryId: string,
  params?: Record<string, any>,
  ttl?: number
) {
  return async (factory: () => Promise<T>): Promise<T> => {
    return queryCache.getOrSet(queryId, params, factory, ttl);
  };
}

// Decorator-style helper for caching query results
export function cached(queryId: string, ttl?: number) {
  return function <T extends (...args: any[]) => Promise<any>>(
    _target: any,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;
    
    descriptor.value = async function (this: any, ...args: any[]) {
      const params = args.length > 0 ? { args: JSON.stringify(args) } : undefined;
      return queryCache.getOrSet(queryId, params, () => originalMethod.apply(this, args), ttl);
    } as T;
    
    return descriptor;
  };
}

export default queryCache;
