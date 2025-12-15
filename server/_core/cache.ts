/**
 * In-memory Cache Module
 * Provides caching for static and semi-static data to improve performance
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }
  
  /**
   * Get cached value
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  /**
   * Set cached value with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
      createdAt: now
    });
  }
  
  /**
   * Delete cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Delete all cached values matching a pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * Get or set with async factory function
   */
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttlSeconds: number = 300
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    
    const data = await factory();
    this.set(key, data, ttlSeconds);
    return data;
  }
  
  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  // Products cache (5 minutes)
  products: () => 'products:all',
  product: (id: number) => `products:${id}`,
  
  // Production lines cache (5 minutes)
  productionLines: () => 'production_lines:all',
  productionLine: (id: number) => `production_lines:${id}`,
  
  // Machines cache (5 minutes)
  machines: () => 'machines:all',
  machinesByLine: (lineId: number) => `machines:line:${lineId}`,
  
  // Mappings cache (10 minutes)
  mappings: () => 'mappings:all',
  mappingsByProduct: (productCode: string) => `mappings:product:${productCode}`,
  
  // SPC Rules cache (30 minutes - rarely changes)
  spcRules: () => 'spc_rules:all',
  spcRulesConfig: (mappingId: number) => `spc_rules_config:${mappingId}`,
  
  // Permissions cache (10 minutes)
  userPermissions: (userId: number) => `permissions:user:${userId}`,
  rolePermissions: (role: string) => `permissions:role:${role}`,
  
  // System settings cache (30 minutes)
  systemSettings: () => 'system_settings:all',
  systemSetting: (key: string) => `system_settings:${key}`,
  
  // Dashboard configs cache (5 minutes)
  dashboardConfig: (userId: number) => `dashboard_config:${userId}`,
  
  // License cache (1 hour)
  licenseStatus: () => 'license:status',
  
  // Defect categories cache (30 minutes)
  defectCategories: () => 'defect_categories:all',
  
  // Report templates cache (30 minutes)
  reportTemplates: () => 'report_templates:all',
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 600,        // 10 minutes
  VERY_LONG: 1800,  // 30 minutes
  HOUR: 3600,       // 1 hour
};

export default cache;
