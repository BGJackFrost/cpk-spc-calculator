/**
 * Tests for Cache Alert Service
 */

import { describe, it, expect } from 'vitest';
import { cacheAlertService } from './cacheAlertService';

describe('CacheAlertService', () => {
  describe('getAlertConfigs', () => {
    it('should return array of alert configs', () => {
      const configs = cacheAlertService.getAlertConfigs();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    it('should have default configs with required fields', () => {
      const configs = cacheAlertService.getAlertConfigs();
      const config = configs[0];
      expect(config).toHaveProperty('id');
      expect(config).toHaveProperty('name');
      expect(config).toHaveProperty('hitRateThreshold');
      expect(config).toHaveProperty('alertChannels');
      expect(config).toHaveProperty('enabled');
    });
  });

  describe('getAlertConfigById', () => {
    it('should return config by id', () => {
      const config = cacheAlertService.getAlertConfigById(1);
      expect(config).toBeDefined();
      expect(config?.id).toBe(1);
    });

    it('should return undefined for non-existent id', () => {
      const config = cacheAlertService.getAlertConfigById(9999);
      expect(config).toBeUndefined();
    });
  });

  describe('createAlertConfig', () => {
    it('should create new alert config', () => {
      const newConfig = cacheAlertService.createAlertConfig({
        name: 'Test Alert',
        hitRateThreshold: 40,
        checkIntervalMinutes: 10,
        alertChannels: ['notification'],
        emailRecipients: [],
        enabled: true,
        cooldownMinutes: 60,
      });
      expect(newConfig).toBeDefined();
      expect(newConfig.name).toBe('Test Alert');
      expect(newConfig.hitRateThreshold).toBe(40);
    });
  });

  describe('updateAlertConfig', () => {
    it('should return undefined for non-existent config', () => {
      const updated = cacheAlertService.updateAlertConfig(9999, { name: 'Test' });
      expect(updated).toBeUndefined();
    });
  });

  describe('getAlertHistory', () => {
    it('should return array of alert history', () => {
      const history = cacheAlertService.getAlertHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('checkAndAlert', () => {
    it('should return check result', async () => {
      const result = await cacheAlertService.checkAndAlert();
      expect(result).toHaveProperty('checked');
      expect(result).toHaveProperty('alertSent');
      expect(result).toHaveProperty('hitRate');
      expect(result.checked).toBe(true);
    });
  });
});
