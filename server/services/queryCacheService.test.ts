import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the query cache service
const createMockQueryCache = () => {
  const cache = new Map<string, { data: any; timestamp: number; ttl: number; hits: number }>();
  let totalHits = 0;
  let totalMisses = 0;
  
  return {
    cache,
    generateKey(queryId: string, params?: Record<string, any>): string {
      if (!params || Object.keys(params).length === 0) {
        return queryId;
      }
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
    },
    
    get<T>(key: string): T | null {
      const entry = cache.get(key);
      if (!entry) {
        totalMisses++;
        return null;
      }
      if (Date.now() - entry.timestamp > entry.ttl) {
        cache.delete(key);
        totalMisses++;
        return null;
      }
      entry.hits++;
      totalHits++;
      return entry.data as T;
    },
    
    set<T>(key: string, data: T, ttl: number = 300000): void {
      cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
        hits: 0,
      });
    },
    
    async getOrSet<T>(
      queryId: string,
      params: Record<string, any> | undefined,
      factory: () => Promise<T>,
      customTTL?: number
    ): Promise<T> {
      const key = this.generateKey(queryId, params);
      const cached = this.get<T>(key);
      if (cached !== null) {
        return cached;
      }
      const data = await factory();
      this.set(key, data, customTTL || 300000);
      return data;
    },
    
    invalidate(key: string): boolean {
      return cache.delete(key);
    },
    
    invalidateQuery(queryId: string): number {
      let count = 0;
      for (const key of cache.keys()) {
        if (key === queryId || key.startsWith(`${queryId}:`)) {
          cache.delete(key);
          count++;
        }
      }
      return count;
    },
    
    invalidatePattern(pattern: string): number {
      let count = 0;
      const regex = new RegExp(pattern);
      for (const key of cache.keys()) {
        if (regex.test(key)) {
          cache.delete(key);
          count++;
        }
      }
      return count;
    },
    
    clear(): void {
      cache.clear();
      totalHits = 0;
      totalMisses = 0;
    },
    
    cleanup(): number {
      let count = 0;
      const now = Date.now();
      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          cache.delete(key);
          count++;
        }
      }
      return count;
    },
    
    getStats() {
      const totalRequests = totalHits + totalMisses;
      return {
        totalEntries: cache.size,
        totalHits,
        totalMisses,
        hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
        memoryUsage: 0,
        oldestEntry: null,
        newestEntry: null,
        entriesByCategory: {},
      };
    },
    
    getEntries() {
      const now = Date.now();
      return Array.from(cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        ttl: entry.ttl,
        hits: entry.hits,
        age: now - entry.timestamp,
        expiresIn: Math.max(0, entry.ttl - (now - entry.timestamp)),
      }));
    },
    
    evictLRU(count: number = 1): number {
      const entries = Array.from(cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits);
      let evicted = 0;
      for (let i = 0; i < Math.min(count, entries.length); i++) {
        cache.delete(entries[i][0]);
        evicted++;
      }
      return evicted;
    },
    
    // For testing
    getTotalHits: () => totalHits,
    getTotalMisses: () => totalMisses,
  };
};

describe('QueryCacheService', () => {
  let queryCache: ReturnType<typeof createMockQueryCache>;
  
  beforeEach(() => {
    queryCache = createMockQueryCache();
  });
  
  describe('generateKey', () => {
    it('should generate key without params', () => {
      const key = queryCache.generateKey('statistics');
      expect(key).toBe('statistics');
    });
    
    it('should generate key with params', () => {
      const key = queryCache.generateKey('list', { page: 1, limit: 10 });
      expect(key).toBe('list:{"limit":10,"page":1}');
    });
    
    it('should sort params for consistent keys', () => {
      const key1 = queryCache.generateKey('list', { b: 2, a: 1 });
      const key2 = queryCache.generateKey('list', { a: 1, b: 2 });
      expect(key1).toBe(key2);
    });
    
    it('should ignore undefined/null params', () => {
      const key = queryCache.generateKey('list', { a: 1, b: undefined, c: null });
      expect(key).toBe('list:{"a":1}');
    });
  });
  
  describe('get/set', () => {
    it('should set and get cached data', () => {
      queryCache.set('test', { value: 123 });
      const result = queryCache.get<{ value: number }>('test');
      expect(result).toEqual({ value: 123 });
    });
    
    it('should return null for non-existent key', () => {
      const result = queryCache.get('nonexistent');
      expect(result).toBeNull();
    });
    
    it('should return null for expired entry', async () => {
      queryCache.set('test', { value: 123 }, 10); // 10ms TTL
      await new Promise(resolve => setTimeout(resolve, 20));
      const result = queryCache.get('test');
      expect(result).toBeNull();
    });
    
    it('should increment hits on successful get', () => {
      queryCache.set('test', { value: 123 });
      queryCache.get('test');
      queryCache.get('test');
      const entries = queryCache.getEntries();
      expect(entries[0].hits).toBe(2);
    });
  });
  
  describe('getOrSet', () => {
    it('should return cached data without calling factory', async () => {
      queryCache.set('test', { value: 'cached' });
      const factory = vi.fn().mockResolvedValue({ value: 'new' });
      
      const result = await queryCache.getOrSet('test', undefined, factory);
      
      expect(result).toEqual({ value: 'cached' });
      expect(factory).not.toHaveBeenCalled();
    });
    
    it('should call factory and cache result on miss', async () => {
      const factory = vi.fn().mockResolvedValue({ value: 'new' });
      
      const result = await queryCache.getOrSet('test', undefined, factory);
      
      expect(result).toEqual({ value: 'new' });
      expect(factory).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = await queryCache.getOrSet('test', undefined, factory);
      expect(result2).toEqual({ value: 'new' });
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('invalidate', () => {
    it('should invalidate specific key', () => {
      queryCache.set('test1', { value: 1 });
      queryCache.set('test2', { value: 2 });
      
      const result = queryCache.invalidate('test1');
      
      expect(result).toBe(true);
      expect(queryCache.get('test1')).toBeNull();
      expect(queryCache.get('test2')).toEqual({ value: 2 });
    });
    
    it('should return false for non-existent key', () => {
      const result = queryCache.invalidate('nonexistent');
      expect(result).toBe(false);
    });
  });
  
  describe('invalidateQuery', () => {
    it('should invalidate all entries for a query', () => {
      queryCache.set('list', { value: 1 });
      queryCache.set('list:{"page":1}', { value: 2 });
      queryCache.set('list:{"page":2}', { value: 3 });
      queryCache.set('other', { value: 4 });
      
      const count = queryCache.invalidateQuery('list');
      
      expect(count).toBe(3);
      expect(queryCache.get('list')).toBeNull();
      expect(queryCache.get('list:{"page":1}')).toBeNull();
      expect(queryCache.get('other')).toEqual({ value: 4 });
    });
  });
  
  describe('invalidatePattern', () => {
    it('should invalidate entries matching pattern', () => {
      queryCache.set('user_1', { value: 1 });
      queryCache.set('user_2', { value: 2 });
      queryCache.set('admin_1', { value: 3 });
      
      const count = queryCache.invalidatePattern('user_.*');
      
      expect(count).toBe(2);
      expect(queryCache.get('user_1')).toBeNull();
      expect(queryCache.get('admin_1')).toEqual({ value: 3 });
    });
  });
  
  describe('clear', () => {
    it('should clear all entries', () => {
      queryCache.set('test1', { value: 1 });
      queryCache.set('test2', { value: 2 });
      
      queryCache.clear();
      
      const stats = queryCache.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });
  
  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      queryCache.set('short', { value: 1 }, 10);
      queryCache.set('long', { value: 2 }, 10000);
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      const count = queryCache.cleanup();
      
      expect(count).toBe(1);
      expect(queryCache.get('short')).toBeNull();
      expect(queryCache.get('long')).toEqual({ value: 2 });
    });
  });
  
  describe('evictLRU', () => {
    it('should evict least used entries', () => {
      queryCache.set('popular', { value: 1 });
      queryCache.set('unpopular', { value: 2 });
      
      // Access popular entry multiple times
      queryCache.get('popular');
      queryCache.get('popular');
      queryCache.get('popular');
      
      const evicted = queryCache.evictLRU(1);
      
      expect(evicted).toBe(1);
      expect(queryCache.get('unpopular')).toBeNull();
      expect(queryCache.get('popular')).toEqual({ value: 1 });
    });
  });
  
  describe('getStats', () => {
    it('should return correct statistics', () => {
      queryCache.set('test1', { value: 1 });
      queryCache.set('test2', { value: 2 });
      queryCache.get('test1'); // hit
      queryCache.get('nonexistent'); // miss
      
      const stats = queryCache.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalHits).toBe(1);
      expect(stats.totalMisses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });
  });
  
  describe('getEntries', () => {
    it('should return entry details', () => {
      queryCache.set('test', { value: 1 }, 60000);
      
      const entries = queryCache.getEntries();
      
      expect(entries.length).toBe(1);
      expect(entries[0].key).toBe('test');
      expect(entries[0].ttl).toBe(60000);
      expect(entries[0].hits).toBe(0);
      expect(entries[0].age).toBeGreaterThanOrEqual(0);
      expect(entries[0].expiresIn).toBeGreaterThan(0);
    });
  });
});
