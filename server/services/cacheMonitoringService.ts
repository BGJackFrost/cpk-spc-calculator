/**
 * Cache Monitoring Service
 * Central service for cache health monitoring
 */

import { getCacheStats, cache } from '../cache';
import { cacheWarmingService } from './cacheWarmingService';

export interface CacheHealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  hitRate: number;
  sizeUsage: number;
  recommendations: string[];
}

export interface CacheSummary {
  currentStats: {
    hitRate: number;
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    evictions: number;
  };
  health: CacheHealthStatus;
  warmingStatus: {
    isWarming: boolean;
    configsCount: number;
    enabledCount: number;
  };
}

const warmingHistory: Array<{ timestamp: Date; total: number; success: number; failed: number; duration: number }> = [];

export const cacheMonitoringService = {
  getHealthStatus(): CacheHealthStatus {
    const stats = getCacheStats();
    const hitRate = stats.hitRate;
    const sizeUsage = (stats.size / stats.maxSize) * 100;
    const recommendations: string[] = [];
    
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (hitRate < 30) {
      status = 'critical';
      recommendations.push('Hit rate rất thấp. Cần kiểm tra ngay cấu hình cache.');
    } else if (hitRate < 50) {
      status = 'warning';
      recommendations.push('Hit rate thấp. Xem xét tăng TTL hoặc warm cache.');
    }
    
    if (sizeUsage > 95) {
      status = 'critical';
      recommendations.push('Cache gần đầy. Cần tăng maxSize hoặc giảm TTL.');
    } else if (sizeUsage > 80) {
      if (status !== 'critical') status = 'warning';
      recommendations.push('Cache sử dụng > 80%. Xem xét tăng maxSize.');
    }
    
    if (stats.metrics.evictions > stats.metrics.hits * 0.2) {
      if (status !== 'critical') status = 'warning';
      recommendations.push('Tỷ lệ eviction cao. Xem xét tăng maxSize.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Cache hoạt động bình thường.');
    }
    
    return { status, hitRate, sizeUsage, recommendations };
  },

  getSummary(): CacheSummary {
    const stats = getCacheStats();
    const health = this.getHealthStatus();
    const warmingStatus = cacheWarmingService.getWarmingStatus();
    
    return {
      currentStats: {
        hitRate: stats.hitRate,
        size: stats.size,
        maxSize: stats.maxSize,
        hits: stats.metrics.hits,
        misses: stats.metrics.misses,
        evictions: stats.metrics.evictions,
      },
      health,
      warmingStatus: {
        isWarming: warmingStatus.isWarming,
        configsCount: warmingStatus.configsCount,
        enabledCount: warmingStatus.enabledCount,
      },
    };
  },

  async clearAllCache(triggerWarming: boolean = false): Promise<{ success: boolean; cleared: number; warmed: boolean }> {
    const statsBefore = getCacheStats();
    cache.clear();
    
    let warmed = false;
    if (triggerWarming) {
      await cacheWarmingService.warmAllCaches({ onlyHighPriority: true });
      warmed = true;
    }
    
    return { success: true, cleared: statsBefore.size, warmed };
  },

  recordWarmingEvent(event: { total: number; success: number; failed: number; duration: number }): void {
    warmingHistory.push({ timestamp: new Date(), ...event });
    if (warmingHistory.length > 100) warmingHistory.shift();
  },

  getWarmingHistory(limit: number = 50): Array<{ timestamp: Date; total: number; success: number; failed: number; duration: number }> {
    return cacheWarmingService.getWarmingHistory(limit);
  },
};

export default cacheMonitoringService;
