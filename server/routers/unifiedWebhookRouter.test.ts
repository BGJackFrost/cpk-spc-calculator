import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database functions
vi.mock('../db', () => ({
  getUnifiedWebhookConfigs: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Slack Production Alerts',
      channelType: 'slack',
      webhookUrl: 'https://hooks.slack.com/services/xxx',
      slackChannel: '#alerts',
      slackUsername: 'SPC Alert Bot',
      slackIconEmoji: ':warning:',
      minSeverity: 'major',
      rateLimitMinutes: 5,
      isActive: 1,
      totalNotificationsSent: 50,
      createdAt: new Date().toISOString(),
    },
  ]),
  getUnifiedWebhookConfigById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Slack Production Alerts',
    channelType: 'slack',
    webhookUrl: 'https://hooks.slack.com/services/xxx',
    slackChannel: '#alerts',
    slackUsername: 'SPC Alert Bot',
    slackIconEmoji: ':warning:',
    minSeverity: 'major',
    rateLimitMinutes: 5,
    isActive: 1,
    totalNotificationsSent: 50,
    createdAt: new Date().toISOString(),
  }),
  createUnifiedWebhookConfig: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateUnifiedWebhookConfig: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  deleteUnifiedWebhookConfig: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  getUnifiedWebhookLogs: vi.fn().mockResolvedValue([
    {
      id: 1,
      webhookConfigId: 1,
      eventType: 'cpk_alert',
      eventTitle: 'CPK Below Threshold',
      severity: 'major',
      status: 'sent',
      createdAt: new Date().toISOString(),
    },
  ]),
  createUnifiedWebhookLog: vi.fn().mockResolvedValue({ insertId: 1 }),
  getUnifiedWebhookStats: vi.fn().mockResolvedValue({
    total: 100,
    sent: 95,
    failed: 5,
    pending: 0,
    successRate: 95,
  }),
}));

// Mock fetch for webhook testing
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ ok: true }),
});

describe('UnifiedWebhook Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return list of webhook configs', async () => {
      const { getUnifiedWebhookConfigs } = await import('../db');
      const result = await getUnifiedWebhookConfigs();
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Slack Production Alerts');
      expect(result[0].channelType).toBe('slack');
    });
  });

  describe('getById', () => {
    it('should return webhook config by id', async () => {
      const { getUnifiedWebhookConfigById } = await import('../db');
      const result = await getUnifiedWebhookConfigById(1);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.channelType).toBe('slack');
    });
  });

  describe('create', () => {
    it('should create new webhook config', async () => {
      const { createUnifiedWebhookConfig } = await import('../db');
      const newConfig = {
        name: 'Teams Alerts',
        channelType: 'teams' as const,
        webhookUrl: 'https://outlook.office.com/webhook/xxx',
        teamsTitle: 'SPC Alert',
        teamsThemeColor: 'FF0000',
        minSeverity: 'critical' as const,
        rateLimitMinutes: 10,
        isActive: true,
        createdBy: 1,
      };
      
      const result = await createUnifiedWebhookConfig(newConfig);
      
      expect(result).toBeDefined();
      expect(result.insertId).toBe(1);
    });
  });

  describe('toggleActive', () => {
    it('should toggle webhook active status', async () => {
      const { updateUnifiedWebhookConfig } = await import('../db');
      const result = await updateUnifiedWebhookConfig(1, { isActive: 0 });
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete webhook config', async () => {
      const { deleteUnifiedWebhookConfig } = await import('../db');
      const result = await deleteUnifiedWebhookConfig(1);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('getLogs', () => {
    it('should return webhook logs', async () => {
      const { getUnifiedWebhookLogs } = await import('../db');
      const result = await getUnifiedWebhookLogs(1, 20);
      
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('sent');
      expect(result[0].eventType).toBe('cpk_alert');
    });
  });

  describe('getStats', () => {
    it('should return webhook statistics', async () => {
      const { getUnifiedWebhookStats } = await import('../db');
      const result = await getUnifiedWebhookStats(1);
      
      expect(result).toBeDefined();
      expect(result.total).toBe(100);
      expect(result.successRate).toBe(95);
    });
  });

  describe('test', () => {
    it('should send test message to webhook', async () => {
      const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
      
      await fetch('https://hooks.slack.com/services/xxx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test message' }),
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/xxx',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });
});
