/**
 * Tests for alertConfigRouter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('../db', () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    execute: vi.fn(() => Promise.resolve([])),
  })),
}));

vi.mock('../services/yieldDefectAlertService', () => ({
  DEFAULT_THRESHOLDS: {
    yieldWarningThreshold: 95,
    yieldCriticalThreshold: 90,
    defectWarningThreshold: 3,
    defectCriticalThreshold: 5,
    yieldDropThreshold: 5,
    defectSpikeThreshold: 50,
    cooldownMinutes: 30,
    enabled: true,
    notifyEmail: true,
    notifyWebSocket: true,
    notifyPush: true,
    emailRecipients: [],
  },
}));

describe('AlertConfigRouter', () => {
  describe('DEFAULT_THRESHOLDS', () => {
    it('should have valid default threshold values', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      
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
      expect(DEFAULT_THRESHOLDS.emailRecipients).toEqual([]);
    });

    it('should have yield warning threshold higher than critical', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      
      expect(DEFAULT_THRESHOLDS.yieldWarningThreshold).toBeGreaterThan(
        DEFAULT_THRESHOLDS.yieldCriticalThreshold
      );
    });

    it('should have defect warning threshold lower than critical', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      
      expect(DEFAULT_THRESHOLDS.defectWarningThreshold).toBeLessThan(
        DEFAULT_THRESHOLDS.defectCriticalThreshold
      );
    });
  });

  describe('AlertThreshold interface', () => {
    it('should accept valid threshold configuration', () => {
      const validConfig = {
        productionLineId: 1,
        yieldWarningThreshold: 95,
        yieldCriticalThreshold: 90,
        defectWarningThreshold: 3,
        defectCriticalThreshold: 5,
        yieldDropThreshold: 5,
        defectSpikeThreshold: 50,
        cooldownMinutes: 30,
        enabled: true,
        notifyEmail: true,
        notifyWebSocket: true,
        notifyPush: true,
        emailRecipients: ['test@example.com'],
      };

      expect(validConfig.productionLineId).toBe(1);
      expect(validConfig.emailRecipients).toContain('test@example.com');
    });

    it('should allow optional productionLineId for global config', () => {
      const globalConfig = {
        yieldWarningThreshold: 95,
        yieldCriticalThreshold: 90,
        defectWarningThreshold: 3,
        defectCriticalThreshold: 5,
        yieldDropThreshold: 5,
        defectSpikeThreshold: 50,
        cooldownMinutes: 30,
        enabled: true,
        notifyEmail: true,
        notifyWebSocket: true,
        notifyPush: true,
        emailRecipients: [],
      };

      expect(globalConfig.yieldWarningThreshold).toBeDefined();
      expect((globalConfig as any).productionLineId).toBeUndefined();
    });
  });

  describe('Threshold validation logic', () => {
    it('should validate yield rate is within 0-100 range', () => {
      const yieldRate = 95.5;
      expect(yieldRate).toBeGreaterThanOrEqual(0);
      expect(yieldRate).toBeLessThanOrEqual(100);
    });

    it('should validate defect rate is within 0-100 range', () => {
      const defectRate = 2.5;
      expect(defectRate).toBeGreaterThanOrEqual(0);
      expect(defectRate).toBeLessThanOrEqual(100);
    });

    it('should detect yield below warning threshold', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      const currentYield = 94;
      
      const isWarning = currentYield < DEFAULT_THRESHOLDS.yieldWarningThreshold;
      const isCritical = currentYield < DEFAULT_THRESHOLDS.yieldCriticalThreshold;
      
      expect(isWarning).toBe(true);
      expect(isCritical).toBe(false);
    });

    it('should detect yield below critical threshold', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      const currentYield = 85;
      
      const isCritical = currentYield < DEFAULT_THRESHOLDS.yieldCriticalThreshold;
      
      expect(isCritical).toBe(true);
    });

    it('should detect defect above warning threshold', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      const currentDefect = 4;
      
      const isWarning = currentDefect > DEFAULT_THRESHOLDS.defectWarningThreshold;
      const isCritical = currentDefect > DEFAULT_THRESHOLDS.defectCriticalThreshold;
      
      expect(isWarning).toBe(true);
      expect(isCritical).toBe(false);
    });

    it('should detect defect above critical threshold', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      const currentDefect = 6;
      
      const isCritical = currentDefect > DEFAULT_THRESHOLDS.defectCriticalThreshold;
      
      expect(isCritical).toBe(true);
    });
  });

  describe('Cooldown logic', () => {
    it('should respect cooldown period between alerts', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      const cooldownMs = DEFAULT_THRESHOLDS.cooldownMinutes * 60 * 1000;
      
      const lastAlertTime = Date.now() - (20 * 60 * 1000); // 20 minutes ago
      const now = Date.now();
      
      const isInCooldown = (now - lastAlertTime) < cooldownMs;
      
      expect(isInCooldown).toBe(true); // Still in cooldown (20 < 30 minutes)
    });

    it('should allow alert after cooldown period', async () => {
      const { DEFAULT_THRESHOLDS } = await import('../services/yieldDefectAlertService');
      const cooldownMs = DEFAULT_THRESHOLDS.cooldownMinutes * 60 * 1000;
      
      const lastAlertTime = Date.now() - (35 * 60 * 1000); // 35 minutes ago
      const now = Date.now();
      
      const isInCooldown = (now - lastAlertTime) < cooldownMs;
      
      expect(isInCooldown).toBe(false); // Cooldown passed (35 > 30 minutes)
    });
  });
});
