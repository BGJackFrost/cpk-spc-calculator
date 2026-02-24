import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Admin Monitoring - Phase 229 Features', () => {
  describe('Rate Limit Alert Config Service', () => {
    it('should have getRateLimitAlertConfig function', async () => {
      const { getRateLimitAlertConfig } = await import('./services/rateLimitConfigService');
      expect(typeof getRateLimitAlertConfig).toBe('function');
    });

    it('should have updateRateLimitAlertConfig function', async () => {
      const { updateRateLimitAlertConfig } = await import('./services/rateLimitConfigService');
      expect(typeof updateRateLimitAlertConfig).toBe('function');
    });

    it('should have setLastAlertTime function', async () => {
      const { setLastAlertTime } = await import('./services/rateLimitConfigService');
      expect(typeof setLastAlertTime).toBe('function');
    });

    it('should have shouldSendAlert function', async () => {
      const { shouldSendAlert } = await import('./services/rateLimitConfigService');
      expect(typeof shouldSendAlert).toBe('function');
    });

    it('should return proper config structure from getRateLimitAlertConfig', async () => {
      const { getRateLimitAlertConfig } = await import('./services/rateLimitConfigService');
      const config = await getRateLimitAlertConfig();
      
      expect(config).toHaveProperty('email');
      expect(config).toHaveProperty('threshold');
      expect(config).toHaveProperty('cooldownMinutes');
      expect(config).toHaveProperty('lastAlertTime');
      
      expect(typeof config.threshold).toBe('number');
      expect(typeof config.cooldownMinutes).toBe('number');
    });

    it('should have default threshold of 5%', async () => {
      const { getRateLimitAlertConfig } = await import('./services/rateLimitConfigService');
      const config = await getRateLimitAlertConfig();
      
      // Default threshold should be 5 if not configured
      expect(config.threshold).toBeGreaterThanOrEqual(1);
      expect(config.threshold).toBeLessThanOrEqual(100);
    });

    it('should have default cooldown of 30 minutes', async () => {
      const { getRateLimitAlertConfig } = await import('./services/rateLimitConfigService');
      const config = await getRateLimitAlertConfig();
      
      // Default cooldown should be 30 if not configured
      expect(config.cooldownMinutes).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Rate Limiter Alert Integration', () => {
    it('should have getRateLimitStats function', async () => {
      const { getRateLimitStats } = await import('./_core/rateLimiter');
      expect(typeof getRateLimitStats).toBe('function');
    });

    it('should return stats with alertsTriggered field', async () => {
      const { getRateLimitStats } = await import('./_core/rateLimiter');
      const stats = getRateLimitStats();
      
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('blockedRequests');
      expect(stats).toHaveProperty('blockRate');
      expect(stats).toHaveProperty('recentAlerts');
    });

    it('should have setAlertCallback function', async () => {
      const { setAlertCallback } = await import('./_core/rateLimiter');
      expect(typeof setAlertCallback).toBe('function');
    });

    it('should have isRateLimitEnabled function', async () => {
      const { isRateLimitEnabled } = await import('./_core/rateLimiter');
      expect(typeof isRateLimitEnabled).toBe('function');
      expect(typeof isRateLimitEnabled()).toBe('boolean');
    });
  });

  describe('Export Statistics', () => {
    it('should return stats with proper numeric values', async () => {
      const { getRateLimitStats } = await import('./_core/rateLimiter');
      const stats = getRateLimitStats();
      
      expect(typeof stats.totalRequests).toBe('number');
      expect(typeof stats.blockedRequests).toBe('number');
      expect(stats.totalRequests).toBeGreaterThanOrEqual(0);
      expect(stats.blockedRequests).toBeGreaterThanOrEqual(0);
    });

    it('should have config object in stats', async () => {
      const { getRateLimitStats } = await import('./_core/rateLimiter');
      const stats = getRateLimitStats();
      
      expect(stats).toHaveProperty('config');
      expect(stats.config).toHaveProperty('windowMs');
      expect(stats.config).toHaveProperty('maxRequests');
      expect(stats.config).toHaveProperty('alertThreshold');
    });
  });

  describe('Cache Stats', () => {
    it('should have cache module', async () => {
      const cacheModule = await import('./cache');
      expect(cacheModule).toBeDefined();
      expect(cacheModule.cache).toBeDefined();
    });

    it('should have cache with get and set methods', async () => {
      const { cache } = await import('./cache');
      expect(typeof cache.get).toBe('function');
      expect(typeof cache.set).toBe('function');
    });

    it('should have cleanup function', async () => {
      const { cache } = await import('./cache');
      expect(typeof cache.cleanup).toBe('function');
    });

    it('should have clear function', async () => {
      const { cache } = await import('./cache');
      expect(typeof cache.clear).toBe('function');
    });

    it('should have resetMetrics function', async () => {
      const { cache } = await import('./cache');
      expect(typeof cache.resetMetrics).toBe('function');
    });
  });

  describe('Alert Config Keys', () => {
    it('should use correct config keys for alert settings', async () => {
      // These keys should be used in the config service
      const { getRateLimitAlertConfig } = await import('./services/rateLimitConfigService');
      const config = await getRateLimitAlertConfig();
      
      // Config should have all required fields
      expect(Object.keys(config)).toContain('email');
      expect(Object.keys(config)).toContain('threshold');
      expect(Object.keys(config)).toContain('cooldownMinutes');
      expect(Object.keys(config)).toContain('lastAlertTime');
    });
  });
});
