/**
 * Tests for Telegram Service
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock database
vi.mock('../db', () => ({
  getDb: vi.fn(() => null),
}));

// Import after mocking
import telegramService from './telegramService';

describe('Telegram Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTelegramConfigs', () => {
    it('should return empty array when database is not available', async () => {
      const configs = await telegramService.getTelegramConfigs();
      expect(configs).toEqual([]);
    });
  });

  describe('getTelegramConfigById', () => {
    it('should return null when database is not available', async () => {
      const config = await telegramService.getTelegramConfigById(1);
      expect(config).toBeNull();
    });
  });

  describe('createTelegramConfig', () => {
    it('should return null when database is not available', async () => {
      const result = await telegramService.createTelegramConfig({
        botToken: 'test-token',
        chatId: '123456',
        name: 'Test Bot',
        isActive: true,
        alertTypes: ['spc_violation'],
      });
      expect(result).toBeNull();
    });
  });

  describe('updateTelegramConfig', () => {
    it('should return false when database is not available', async () => {
      const result = await telegramService.updateTelegramConfig(1, { name: 'Updated' });
      expect(result).toBe(false);
    });
  });

  describe('deleteTelegramConfig', () => {
    it('should return false when database is not available', async () => {
      const result = await telegramService.deleteTelegramConfig(1);
      expect(result).toBe(false);
    });
  });

  describe('sendTelegramAlert', () => {
    it('should return empty result when no active configs', async () => {
      const result = await telegramService.sendTelegramAlert('spc_violation', {
        lineName: 'Line A',
        machineName: 'Machine 1',
        ruleName: 'Rule 1',
        value: 10,
      });
      
      expect(result).toEqual({
        sent: 0,
        failed: 0,
        errors: [],
      });
    });
  });

  describe('testTelegramConfig', () => {
    it('should return error when config not found', async () => {
      const result = await telegramService.testTelegramConfig(999);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Config not found');
    });
  });

  describe('getTelegramMessageHistory', () => {
    it('should return empty array when database is not available', async () => {
      const history = await telegramService.getTelegramMessageHistory();
      expect(history).toEqual([]);
    });
  });
});

describe('Telegram Message Templates', () => {
  it('should have all required alert types', () => {
    const alertTypes = [
      'spc_violation',
      'cpk_alert',
      'iot_critical',
      'maintenance',
      'system_error',
      'oee_drop',
      'defect_rate',
    ];

    // Test that sendTelegramAlert accepts all alert types
    alertTypes.forEach(async (type) => {
      const result = await telegramService.sendTelegramAlert(type as any, {});
      expect(result).toBeDefined();
    });
  });
});
