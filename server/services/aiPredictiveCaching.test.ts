import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cache, cacheKeys, TTL, withCache, invalidateRelatedCaches } from '../cache';

describe('AI Predictive Caching', () => {
  beforeEach(() => {
    cache.clear();
    cache.resetMetrics();
  });

  describe('Cache Keys', () => {
    it('should generate correct AI CPK history cache key', () => {
      const key = cacheKeys.aiCpkHistory('PROD-001', 'Station-A', 30);
      expect(key).toBe('ai:cpk:history:PROD-001:Station-A:30');
    });

    it('should generate correct AI OEE history cache key', () => {
      const key = cacheKeys.aiOeeHistory('LINE-001', 30);
      expect(key).toBe('ai:oee:history:LINE-001:30');
    });

    it('should generate correct AI CPK prediction cache key', () => {
      const key = cacheKeys.aiCpkPrediction('PROD-001', 'Station-A', 7);
      expect(key).toBe('ai:cpk:prediction:PROD-001:Station-A:7');
    });

    it('should generate correct AI OEE prediction cache key', () => {
      const key = cacheKeys.aiOeePrediction('LINE-001', 7);
      expect(key).toBe('ai:oee:prediction:LINE-001:7');
    });
  });

  describe('IoT Cache Keys', () => {
    it('should generate correct IoT devices cache key', () => {
      const key = cacheKeys.iotDevices();
      expect(key).toBe('iot:devices:all');
    });

    it('should generate correct IoT stats cache key', () => {
      const key = cacheKeys.iotStats();
      expect(key).toBe('iot:stats');
    });

    it('should generate correct IoT alarms cache key', () => {
      const key = cacheKeys.iotAlarms(50, true);
      expect(key).toBe('iot:alarms:50:true');
    });

    it('should generate correct IoT alarms cache key without acknowledged filter', () => {
      const key = cacheKeys.iotAlarms(50);
      expect(key).toBe('iot:alarms:50:all');
    });
  });

  describe('withCache', () => {
    it('should cache and return data', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });
      
      // First call - should fetch
      const result1 = await withCache('test:key', TTL.SHORT, fetchFn);
      expect(result1).toEqual({ data: 'test' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
      
      // Second call - should use cache
      const result2 = await withCache('test:key', TTL.SHORT, fetchFn);
      expect(result2).toEqual({ data: 'test' });
      expect(fetchFn).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should track cache hits and misses', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'test' });
      
      await withCache('test:key', TTL.SHORT, fetchFn);
      await withCache('test:key', TTL.SHORT, fetchFn);
      
      const stats = cache.stats();
      expect(stats.metrics.misses).toBe(1);
      expect(stats.metrics.hits).toBe(1);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate AI predictions cache', () => {
      // Set some cache entries
      cache.set('ai:cpk:history:PROD-001:Station-A:30', { data: 'cpk' });
      cache.set('ai:oee:history:LINE-001:30', { data: 'oee' });
      cache.set('other:key', { data: 'other' });
      
      // Invalidate AI predictions
      invalidateRelatedCaches('aiPredictions');
      
      // AI caches should be cleared
      expect(cache.get('ai:cpk:history:PROD-001:Station-A:30')).toBeNull();
      expect(cache.get('ai:oee:history:LINE-001:30')).toBeNull();
      // Other cache should remain
      expect(cache.get('other:key')).toEqual({ data: 'other' });
    });

    it('should invalidate IoT devices cache', () => {
      cache.set('iot:devices:all', { devices: [] });
      cache.set('iot:device:1', { device: {} });
      cache.set('iot:stats', { stats: {} });
      cache.set('other:key', { data: 'other' });
      
      invalidateRelatedCaches('iotDevices');
      
      expect(cache.get('iot:devices:all')).toBeNull();
      expect(cache.get('iot:device:1')).toBeNull();
      expect(cache.get('other:key')).toEqual({ data: 'other' });
    });
  });

  describe('TTL Constants', () => {
    it('should have correct TTL values', () => {
      expect(TTL.SHORT).toBe(30 * 1000); // 30 seconds
      expect(TTL.MEDIUM).toBe(60 * 1000); // 1 minute
      expect(TTL.LONG).toBe(5 * 60 * 1000); // 5 minutes
      expect(TTL.VERY_LONG).toBe(30 * 60 * 1000); // 30 minutes
    });
  });
});
