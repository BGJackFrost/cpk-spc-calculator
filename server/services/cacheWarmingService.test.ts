/**
 * Tests for Cache Warming Service
 */

import { describe, it, expect } from 'vitest';
import { cacheWarmingService } from './cacheWarmingService';

describe('CacheWarmingService', () => {
  describe('getWarmingConfigs', () => {
    it('should return array of warming configs', () => {
      const configs = cacheWarmingService.getWarmingConfigs();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    it('should have default configs with required fields', () => {
      const configs = cacheWarmingService.getWarmingConfigs();
      const config = configs[0];
      expect(config).toHaveProperty('id');
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('cacheKey');
      expect(config).toHaveProperty('category');
      expect(config).toHaveProperty('priority');
      expect(config).toHaveProperty('enabled');
    });
  });

  describe('getWarmingConfigById', () => {
    it('should return config by id', () => {
      const config = cacheWarmingService.getWarmingConfigById(1);
      expect(config).toBeDefined();
      expect(config?.id).toBe(1);
    });

    it('should return undefined for non-existent id', () => {
      const config = cacheWarmingService.getWarmingConfigById(9999);
      expect(config).toBeUndefined();
    });
  });

  describe('createWarmingConfig', () => {
    it('should create new warming config', () => {
      const newConfig = cacheWarmingService.createWarmingConfig({
        name: 'Test Warming',
        cacheKey: 'test:key',
        category: 'test',
        priority: 'medium',
        warmOnStartup: true,
        warmAfterClear: true,
        enabled: true,
      });
      expect(newConfig).toBeDefined();
      expect(newConfig.name).toBe('Test Warming');
      expect(newConfig.cacheKey).toBe('test:key');
    });
  });

  describe('updateWarmingConfig', () => {
    it('should return null for non-existent config', () => {
      const updated = cacheWarmingService.updateWarmingConfig(9999, { priority: 'low' });
      expect(updated === null || updated === undefined).toBe(true);
    });
  });

  describe('getWarmingStatus', () => {
    it('should return warming status', () => {
      const status = cacheWarmingService.getWarmingStatus();
      expect(status).toHaveProperty('isWarming');
      expect(status).toHaveProperty('configsCount');
      expect(status).toHaveProperty('enabledCount');
      expect(status).toHaveProperty('highPriorityCount');
    });
  });

  describe('warmAllCaches', () => {
    it('should return warming result', async () => {
      const result = await cacheWarmingService.warmAllCaches();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('results');
    });
  });

  describe('warmById', () => {
    it('should return null for non-existent ID', async () => {
      const result = await cacheWarmingService.warmById(9999);
      expect(result === null || result === undefined).toBe(true);
    });
  });

  describe('getWarmingHistory', () => {
    it('should return array of warming history', () => {
      const history = cacheWarmingService.getWarmingHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset configs without error', () => {
      expect(() => cacheWarmingService.resetToDefaults()).not.toThrow();
    });
  });
});
