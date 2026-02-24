/**
 * Tests for yieldDefectAlertService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  AlertThreshold,
  AlertEvent,
  getAlertStatistics,
  clearCache,
} from './yieldDefectAlertService';

describe('yieldDefectAlertService', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('DEFAULT_THRESHOLDS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_THRESHOLDS.yieldWarningThreshold).toBe(95);
      expect(DEFAULT_THRESHOLDS.yieldCriticalThreshold).toBe(90);
      expect(DEFAULT_THRESHOLDS.defectWarningThreshold).toBe(3);
      expect(DEFAULT_THRESHOLDS.defectCriticalThreshold).toBe(5);
      expect(DEFAULT_THRESHOLDS.yieldDropThreshold).toBe(5);
      expect(DEFAULT_THRESHOLDS.defectSpikeThreshold).toBe(50);
      expect(DEFAULT_THRESHOLDS.cooldownMinutes).toBe(30);
      expect(DEFAULT_THRESHOLDS.enabled).toBe(true);
      expect(DEFAULT_THRESHOLDS.notifyEmail).toBe(true);
      expect(DEFAULT_THRESHOLDS.notifyWebSocket).toBe(true);
      expect(DEFAULT_THRESHOLDS.notifyPush).toBe(true);
      expect(DEFAULT_THRESHOLDS.notifyTelegram).toBe(true);
      expect(DEFAULT_THRESHOLDS.emailRecipients).toEqual([]);
    });
  });

  describe('getAlertStatistics', () => {
    it('should return default statistics', () => {
      const stats = getAlertStatistics();
      expect(stats.totalAlerts).toBe(0);
      expect(stats.criticalAlerts).toBe(0);
      expect(stats.warningAlerts).toBe(0);
      expect(stats.lastAlertTime).toBeNull();
    });

    it('should accept optional productionLineId', () => {
      const stats = getAlertStatistics(123);
      expect(stats.totalAlerts).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache when no productionLineId provided', () => {
      expect(() => clearCache()).not.toThrow();
    });

    it('should clear specific production line cache', () => {
      expect(() => clearCache(123)).not.toThrow();
    });
  });

  describe('AlertThreshold interface', () => {
    it('should allow creating valid threshold config', () => {
      const threshold: AlertThreshold = {
        yieldWarningThreshold: 96,
        yieldCriticalThreshold: 92,
        defectWarningThreshold: 2,
        defectCriticalThreshold: 4,
        yieldDropThreshold: 3,
        defectSpikeThreshold: 40,
        cooldownMinutes: 15,
        enabled: true,
        notifyEmail: true,
        notifyWebSocket: true,
        notifyPush: false,
        notifyTelegram: true,
        emailRecipients: ['test@example.com'],
      };

      expect(threshold.yieldWarningThreshold).toBe(96);
      expect(threshold.emailRecipients).toContain('test@example.com');
    });
  });

  describe('AlertEvent interface', () => {
    it('should allow creating valid alert events', () => {
      const alertEvent: AlertEvent = {
        type: 'yield_low',
        severity: 'warning',
        productionLineId: 1,
        productionLineName: 'Line A',
        currentValue: 94.5,
        threshold: 95,
        message: 'Yield rate below warning threshold',
        timestamp: new Date(),
        acknowledged: false,
      };

      expect(alertEvent.type).toBe('yield_low');
      expect(alertEvent.severity).toBe('warning');
      expect(alertEvent.currentValue).toBe(94.5);
    });

    it('should support all alert types', () => {
      const types: AlertEvent['type'][] = [
        'yield_low',
        'yield_critical',
        'defect_high',
        'defect_critical',
        'yield_drop',
        'defect_spike',
      ];

      types.forEach((type) => {
        const event: AlertEvent = {
          type,
          severity: type.includes('critical') ? 'critical' : 'warning',
          currentValue: 90,
          threshold: 95,
          message: `Test ${type}`,
          timestamp: new Date(),
          acknowledged: false,
        };
        expect(event.type).toBe(type);
      });
    });
  });
});
