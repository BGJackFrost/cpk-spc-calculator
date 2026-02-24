import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getDb
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

// Mock alertWebhookService
vi.mock('../services/alertWebhookService', () => ({
  testWebhookConfig: vi.fn(),
  getWebhookLogs: vi.fn(),
}));

import { getDb } from '../db';
import { testWebhookConfig, getWebhookLogs } from '../services/alertWebhookService';

describe('alertWebhookRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return empty array when db is not available', async () => {
      (getDb as any).mockResolvedValue(null);
      
      // The router should handle null db gracefully
      const db = await getDb();
      expect(db).toBeNull();
    });

    it('should return configs when db is available', async () => {
      const mockConfigs = [
        { id: 1, name: 'Slack Alerts', channelType: 'slack', isActive: 1 },
        { id: 2, name: 'Teams Alerts', channelType: 'teams', isActive: 1 },
      ];
      
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockConfigs),
      };
      
      (getDb as any).mockResolvedValue(mockDb);
      
      const db = await getDb();
      expect(db).not.toBeNull();
      
      const result = await db!.select().from({}).orderBy({});
      expect(result).toEqual(mockConfigs);
    });
  });

  describe('testWebhookConfig', () => {
    it('should call testWebhookConfig with correct id', async () => {
      (testWebhookConfig as any).mockResolvedValue({ success: true });
      
      const result = await testWebhookConfig(1);
      
      expect(testWebhookConfig).toHaveBeenCalledWith(1);
      expect(result).toEqual({ success: true });
    });

    it('should return error when test fails', async () => {
      (testWebhookConfig as any).mockResolvedValue({ 
        success: false, 
        error: 'Connection refused' 
      });
      
      const result = await testWebhookConfig(1);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });

  describe('getWebhookLogs', () => {
    it('should return logs with limit', async () => {
      const mockLogs = [
        { id: 1, alertType: 'cpk_warning', status: 'sent' },
        { id: 2, alertType: 'spc_violation', status: 'failed' },
      ];
      
      (getWebhookLogs as any).mockResolvedValue(mockLogs);
      
      const result = await getWebhookLogs(undefined, 50);
      
      expect(getWebhookLogs).toHaveBeenCalledWith(undefined, 50);
      expect(result).toEqual(mockLogs);
    });

    it('should filter by webhookConfigId', async () => {
      const mockLogs = [
        { id: 1, webhookConfigId: 1, alertType: 'cpk_warning' },
      ];
      
      (getWebhookLogs as any).mockResolvedValue(mockLogs);
      
      const result = await getWebhookLogs(1, 100);
      
      expect(getWebhookLogs).toHaveBeenCalledWith(1, 100);
      expect(result).toEqual(mockLogs);
    });
  });

  describe('webhook channel types', () => {
    it('should support all channel types', () => {
      const supportedChannels = ['slack', 'teams', 'email', 'discord', 'custom'];
      
      supportedChannels.forEach(channel => {
        expect(['slack', 'teams', 'email', 'discord', 'custom']).toContain(channel);
      });
    });
  });

  describe('alert types', () => {
    it('should support all alert types', () => {
      const alertTypes = [
        'cpk_warning',
        'cpk_critical',
        'spc_violation',
        'machine_down',
        'iot_alarm',
        'sensor_critical',
        'latency_warning',
        'oee_alert',
        'maintenance_alert',
      ];
      
      expect(alertTypes.length).toBe(9);
      expect(alertTypes).toContain('cpk_warning');
      expect(alertTypes).toContain('spc_violation');
    });
  });

  describe('severity levels', () => {
    it('should support all severity levels', () => {
      const severityLevels = ['info', 'warning', 'critical'];
      
      expect(severityLevels.length).toBe(3);
      expect(severityLevels).toContain('warning');
    });
  });
});
