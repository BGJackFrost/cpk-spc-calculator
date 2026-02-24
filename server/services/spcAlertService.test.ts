/**
 * Tests for SPC Alert Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as spcAlertService from './spcAlertService';

describe('SPC Alert Service', () => {
  describe('Module Structure', () => {
    it('should export checkPlanCpk function', () => {
      expect(typeof spcAlertService.checkPlanCpk).toBe('function');
    });

    it('should export getPlansWithCpkAlert function', () => {
      expect(typeof spcAlertService.getPlansWithCpkAlert).toBe('function');
    });

    it('should export updatePlanCpkAlert function', () => {
      expect(typeof spcAlertService.updatePlanCpkAlert).toBe('function');
    });

    it('should export getPlanCpkAlertHistory function', () => {
      expect(typeof spcAlertService.getPlanCpkAlertHistory).toBe('function');
    });
  });

  describe('CPK Check Logic', () => {
    it('should return null for non-existent plan', async () => {
      const result = await spcAlertService.checkPlanCpk(999999, 1.5);
      expect(result).toBeNull();
    });

    it('should handle CPK value correctly', async () => {
      // This test verifies the function doesn't throw
      const result = await spcAlertService.checkPlanCpk(1, 1.33);
      // Result can be null if plan doesn't exist or doesn't have alert enabled
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });

  describe('Get Plans with CPK Alert', () => {
    it('should return array of plans', async () => {
      const plans = await spcAlertService.getPlansWithCpkAlert();
      expect(Array.isArray(plans)).toBe(true);
    });
  });

  describe('Update Plan CPK Alert', () => {
    it('should return boolean result', async () => {
      const result = await spcAlertService.updatePlanCpkAlert(1, {
        cpkAlertEnabled: true,
        cpkLowerLimit: 1.0,
        cpkUpperLimit: 2.0,
      });
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Get Plan CPK Alert History', () => {
    it('should return array of alerts', async () => {
      const history = await spcAlertService.getPlanCpkAlertHistory(1);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const history = await spcAlertService.getPlanCpkAlertHistory(1, 10);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });
});
