/**
 * Cache Warming Service
 * Tự động load lại cache quan trọng sau khi clear
 */

import { getDb } from '../db';
import { cache, cacheKeys, TTL } from '../cache';

export interface CacheWarmingConfig {
  id: number;
  name: string;
  cacheKey: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  warmOnStartup: boolean;
  warmAfterClear: boolean;
  warmIntervalMinutes?: number;
  enabled: boolean;
  lastWarmedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WarmingResult {
  configId: number;
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

const defaultWarmingConfigs: CacheWarmingConfig[] = [
  { id: 1, name: 'Products List', cacheKey: cacheKeys.products(), category: 'master_data', priority: 'high', warmOnStartup: true, warmAfterClear: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 2, name: 'Workstations List', cacheKey: cacheKeys.workstations(), category: 'master_data', priority: 'high', warmOnStartup: true, warmAfterClear: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 3, name: 'Production Lines', cacheKey: cacheKeys.productionLines(), category: 'master_data', priority: 'high', warmOnStartup: true, warmAfterClear: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 4, name: 'Machines List', cacheKey: cacheKeys.machines(), category: 'master_data', priority: 'medium', warmOnStartup: true, warmAfterClear: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 5, name: 'Fixtures List', cacheKey: cacheKeys.fixtures(), category: 'master_data', priority: 'medium', warmOnStartup: true, warmAfterClear: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 6, name: 'SPC Rules', cacheKey: cacheKeys.spcRules(), category: 'config', priority: 'high', warmOnStartup: true, warmAfterClear: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 7, name: 'Active SPC Plans', cacheKey: cacheKeys.spcPlans(), category: 'operational', priority: 'high', warmOnStartup: true, warmAfterClear: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
  { id: 8, name: 'Mappings', cacheKey: cacheKeys.mappings(), category: 'config', priority: 'medium', warmOnStartup: true, warmAfterClear: true, enabled: true, createdAt: new Date(), updatedAt: new Date() },
];

let warmingConfigs = [...defaultWarmingConfigs];
let nextConfigId = 9;
let isWarming = false;

const warmingHistory: Array<{ timestamp: Date; total: number; success: number; failed: number; duration: number }> = [];

export const cacheWarmingService = {
  getWarmingConfigs(): CacheWarmingConfig[] {
    return [...warmingConfigs];
  },

  getWarmingConfigById(id: number): CacheWarmingConfig | undefined {
    return warmingConfigs.find(c => c.id === id);
  },

  createWarmingConfig(config: Omit<CacheWarmingConfig, 'id' | 'createdAt' | 'updatedAt'>): CacheWarmingConfig {
    const newConfig: CacheWarmingConfig = { ...config, id: nextConfigId++, createdAt: new Date(), updatedAt: new Date() };
    warmingConfigs.push(newConfig);
    return newConfig;
  },

  updateWarmingConfig(id: number, updates: Partial<CacheWarmingConfig>): CacheWarmingConfig | null {
    const index = warmingConfigs.findIndex(c => c.id === id);
    if (index === -1) return null;
    warmingConfigs[index] = { ...warmingConfigs[index], ...updates, updatedAt: new Date() };
    return warmingConfigs[index];
  },

  deleteWarmingConfig(id: number): boolean {
    const index = warmingConfigs.findIndex(c => c.id === id);
    if (index === -1) return false;
    warmingConfigs.splice(index, 1);
    return true;
  },

  getWarmingStatus(): { isWarming: boolean; configsCount: number; enabledCount: number; highPriorityCount: number; lastWarmed?: Date } {
    return {
      isWarming,
      configsCount: warmingConfigs.length,
      enabledCount: warmingConfigs.filter(c => c.enabled).length,
      highPriorityCount: warmingConfigs.filter(c => c.enabled && c.priority === 'high').length,
      lastWarmed: warmingHistory.length > 0 ? warmingHistory[warmingHistory.length - 1].timestamp : undefined,
    };
  },

  async warmAllCaches(options?: { onlyHighPriority?: boolean; category?: string }): Promise<{ total: number; success: number; failed: number; duration: number; results: WarmingResult[] }> {
    if (isWarming) return { total: 0, success: 0, failed: 0, duration: 0, results: [] };
    
    isWarming = true;
    const startTime = Date.now();
    const results: WarmingResult[] = [];
    
    let configs = warmingConfigs.filter(c => c.enabled);
    if (options?.onlyHighPriority) configs = configs.filter(c => c.priority === 'high');
    if (options?.category) configs = configs.filter(c => c.category === options.category);

    for (const config of configs) {
      const result = await this.warmCacheKey(config);
      results.push(result);
    }

    const duration = Date.now() - startTime;
    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    warmingHistory.push({ timestamp: new Date(), total: results.length, success, failed, duration });
    if (warmingHistory.length > 100) warmingHistory.shift();
    
    isWarming = false;
    return { total: results.length, success, failed, duration, results };
  },

  async warmById(id: number): Promise<WarmingResult | null> {
    const config = warmingConfigs.find(c => c.id === id);
    if (!config) return null;
    return this.warmCacheKey(config);
  },

  async warmByCategory(category: string): Promise<{ total: number; success: number; failed: number; duration: number }> {
    return this.warmAllCaches({ category });
  },

  async warmCacheKey(config: CacheWarmingConfig): Promise<WarmingResult> {
    const startTime = Date.now();
    try {
      const db = await getDb();
      let data: any = null;
      
      switch (config.cacheKey) {
        case cacheKeys.products(): data = await db.query.products?.findMany(); break;
        case cacheKeys.workstations(): data = await db.query.workstations?.findMany(); break;
        case cacheKeys.productionLines(): data = await db.query.productionLines?.findMany(); break;
        case cacheKeys.machines(): data = await db.query.machines?.findMany(); break;
        case cacheKeys.fixtures(): data = await db.query.fixtures?.findMany(); break;
        case cacheKeys.spcRules(): data = await db.query.spcRules?.findMany(); break;
        case cacheKeys.spcPlans(): data = await db.query.spcSamplingPlans?.findMany({ where: (plans, { eq }) => eq(plans.status, 'active') }); break;
        case cacheKeys.mappings(): data = await db.query.mappings?.findMany(); break;
        default: console.log(`Unknown cache key: ${config.cacheKey}`); break;
      }
      
      if (data !== null) {
        const ttl = config.priority === 'high' ? TTL.VERY_LONG : config.priority === 'medium' ? TTL.LONG : TTL.MEDIUM;
        cache.set(config.cacheKey, data, ttl);
        this.updateWarmingConfig(config.id, { lastWarmedAt: new Date() });
      }
      
      return { configId: config.id, name: config.name, success: true, duration: Date.now() - startTime };
    } catch (error) {
      return { configId: config.id, name: config.name, success: false, duration: Date.now() - startTime, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  resetToDefaults(): void {
    warmingConfigs = [...defaultWarmingConfigs];
    nextConfigId = 9;
  },

  getWarmingHistory(limit: number = 50): Array<{ timestamp: Date; total: number; success: number; failed: number; duration: number }> {
    return warmingHistory.slice(-limit).reverse();
  },
};

export default cacheWarmingService;
