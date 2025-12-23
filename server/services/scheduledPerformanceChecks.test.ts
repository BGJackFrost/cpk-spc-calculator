import { describe, it, expect, beforeEach } from 'vitest';
import {
  getScheduledCheckConfig,
  updateScheduledCheckConfig,
  getCheckHistory,
  getCheckStats,
  clearCheckHistory,
} from './scheduledPerformanceChecks';

describe('scheduledPerformanceChecks', () => {
  beforeEach(() => {
    clearCheckHistory();
  });

  describe('getScheduledCheckConfig', () => {
    it('should return default config', () => {
      const config = getScheduledCheckConfig();
      
      expect(config).toBeDefined();
      expect(typeof config.enabled).toBe('boolean');
      expect(config.intervalMinutes).toBe(5);
      expect(typeof config.notifyEmail).toBe('boolean');
      expect(typeof config.notifyOwner).toBe('boolean');
      expect(Array.isArray(config.emailRecipients)).toBe(true);
    });
  });

  describe('updateScheduledCheckConfig', () => {
    it('should update config partially', () => {
      const updated = updateScheduledCheckConfig({
        enabled: true,
        intervalMinutes: 10,
      });
      
      expect(updated.enabled).toBe(true);
      expect(updated.intervalMinutes).toBe(10);
      expect(updated.notifyOwner).toBe(true);
    });

    it('should update email recipients', () => {
      const updated = updateScheduledCheckConfig({
        emailRecipients: ['admin@test.com', 'manager@test.com'],
      });
      
      expect(updated.emailRecipients).toEqual(['admin@test.com', 'manager@test.com']);
    });

    it('should update notification settings', () => {
      const updated = updateScheduledCheckConfig({
        notifyEmail: true,
        notifyOwner: false,
      });
      
      expect(updated.notifyEmail).toBe(true);
      expect(updated.notifyOwner).toBe(false);
    });
  });

  describe('getCheckHistory', () => {
    it('should return empty array initially', () => {
      const history = getCheckHistory(10);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it('should respect limit parameter', () => {
      const history = getCheckHistory(5);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getCheckStats', () => {
    it('should return stats object', () => {
      const stats = getCheckStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalChecks).toBe('number');
      expect(typeof stats.checksWithAlerts).toBe('number');
      expect(typeof stats.totalAlertsTriggered).toBe('number');
      expect(stats.totalChecks).toBeGreaterThanOrEqual(0);
    });

    it('should have lastCheckTime as null or Date', () => {
      const stats = getCheckStats();
      
      expect(stats.lastCheckTime === null || stats.lastCheckTime instanceof Date).toBe(true);
    });
  });

  describe('clearCheckHistory', () => {
    it('should clear all history', () => {
      clearCheckHistory();
      const history = getCheckHistory(100);
      
      expect(history.length).toBe(0);
    });
  });
});
