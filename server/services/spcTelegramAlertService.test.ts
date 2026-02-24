/**
 * Unit tests for SPC Telegram Alert Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCpkSeverity, clearAlertCooldownCache } from './spcTelegramAlertService';

vi.mock('./telegramService', () => ({
  sendTelegramAlert: vi.fn().mockResolvedValue({ sent: 1, errors: [] }),
  getTelegramConfigs: vi.fn().mockResolvedValue([
    { id: 1, isActive: true, alertTypes: ['cpk_alert', 'spc_violation'] }
  ]),
}));

vi.mock('../websocket', () => ({
  wsServer: { sendCpkAlert: vi.fn() },
}));

describe('SPC Telegram Alert Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAlertCooldownCache();
  });

  describe('getCpkSeverity', () => {
    it('should return critical for CPK < 1.0', () => {
      expect(getCpkSeverity(0.5)).toBe('critical');
      expect(getCpkSeverity(0.9)).toBe('critical');
    });

    it('should return warning for CPK >= 1.0 and < 1.33', () => {
      expect(getCpkSeverity(1.0)).toBe('warning');
      expect(getCpkSeverity(1.2)).toBe('warning');
    });

    it('should return good for CPK >= 1.33 and < 1.67', () => {
      expect(getCpkSeverity(1.33)).toBe('good');
      expect(getCpkSeverity(1.5)).toBe('good');
    });

    it('should return excellent for CPK >= 1.67', () => {
      expect(getCpkSeverity(1.67)).toBe('excellent');
      expect(getCpkSeverity(2.0)).toBe('excellent');
    });

    it('should use custom thresholds', () => {
      const customThresholds = { critical: 0.8, warning: 1.0, good: 1.5 };
      expect(getCpkSeverity(0.7, customThresholds)).toBe('critical');
      expect(getCpkSeverity(0.9, customThresholds)).toBe('warning');
      expect(getCpkSeverity(1.2, customThresholds)).toBe('good');
      expect(getCpkSeverity(1.6, customThresholds)).toBe('excellent');
    });
  });

  describe('Module exports', () => {
    it('should export required functions', async () => {
      const service = await import('./spcTelegramAlertService');
      expect(typeof service.sendCpkTelegramAlert).toBe('function');
      expect(typeof service.sendSpcViolationTelegramAlert).toBe('function');
      expect(typeof service.checkAndSendSpcAlerts).toBe('function');
      expect(typeof service.hasTelegramConfigForSpcAlerts).toBe('function');
      expect(typeof service.getCpkSeverity).toBe('function');
      expect(typeof service.clearAlertCooldownCache).toBe('function');
    });
  });

  describe('sendCpkTelegramAlert', () => {
    it('should not send alert for good CPK', async () => {
      const service = await import('./spcTelegramAlertService');
      const result = await service.sendCpkTelegramAlert({
        productCode: 'TEST-001',
        stationName: 'Station A',
        cpk: 1.5,
      });
      expect(result.sent).toBe(false);
      expect(result.reason).toContain('ngưỡng cho phép');
    });

    it('should not send alert for excellent CPK', async () => {
      const service = await import('./spcTelegramAlertService');
      const result = await service.sendCpkTelegramAlert({
        productCode: 'TEST-001',
        stationName: 'Station A',
        cpk: 2.0,
      });
      expect(result.sent).toBe(false);
      expect(result.reason).toContain('ngưỡng cho phép');
    });
  });

  describe('checkAndSendSpcAlerts', () => {
    it('should check CPK and SPC violations', async () => {
      const service = await import('./spcTelegramAlertService');
      const result = await service.checkAndSendSpcAlerts({
        productCode: 'TEST-001',
        stationName: 'Station A',
        cpk: 1.5,
        violations: [],
      });
      expect(result.cpkAlertSent).toBe(false);
      expect(result.spcViolationAlertsSent).toBe(0);
    });

    it('should handle null CPK', async () => {
      const service = await import('./spcTelegramAlertService');
      const result = await service.checkAndSendSpcAlerts({
        productCode: 'TEST-001',
        stationName: 'Station A',
        cpk: null,
        violations: [],
      });
      expect(result.cpkAlertSent).toBe(false);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('hasTelegramConfigForSpcAlerts', () => {
    it('should check for active Telegram configs', async () => {
      const service = await import('./spcTelegramAlertService');
      const hasConfig = await service.hasTelegramConfigForSpcAlerts();
      expect(hasConfig).toBe(true);
    });
  });

  describe('clearAlertCooldownCache', () => {
    it('should clear the cooldown cache', () => {
      expect(() => clearAlertCooldownCache()).not.toThrow();
    });
  });
});
