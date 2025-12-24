import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('webhookHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockReset();
  });

  describe('createWebhookDelivery', () => {
    it('should create a new delivery record', async () => {
      const { createWebhookDelivery } = await import('./webhookHistoryService');
      
      const delivery = await createWebhookDelivery(
        1,
        'Test Webhook',
        'slack',
        'https://hooks.slack.com/test',
        { text: 'Test message' },
        100,
        'cpk_alert'
      );
      
      expect(delivery).toBeDefined();
      expect(delivery.id).toMatch(/^wh_/);
      expect(delivery.webhookId).toBe(1);
      expect(delivery.webhookName).toBe('Test Webhook');
      expect(delivery.webhookType).toBe('slack');
      expect(delivery.status).toBe('pending');
      expect(delivery.retryCount).toBe(0);
    });
  });

  describe('updateDeliveryStatus', () => {
    it('should update delivery status', async () => {
      const { createWebhookDelivery, updateDeliveryStatus } = await import('./webhookHistoryService');
      
      const delivery = await createWebhookDelivery(
        1,
        'Test Webhook',
        'slack',
        'https://hooks.slack.com/test',
        { text: 'Test' }
      );
      
      const updated = updateDeliveryStatus(delivery.id, 'success', 200, 'ok');
      
      expect(updated).toBeDefined();
      expect(updated?.status).toBe('success');
      expect(updated?.statusCode).toBe(200);
      expect(updated?.completedAt).toBeDefined();
    });

    it('should return null for non-existent delivery', async () => {
      const { updateDeliveryStatus } = await import('./webhookHistoryService');
      
      const result = updateDeliveryStatus('non_existent_id', 'success');
      
      expect(result).toBeNull();
    });
  });

  describe('scheduleRetry', () => {
    it('should schedule retry with incremented count', async () => {
      const { createWebhookDelivery, scheduleRetry } = await import('./webhookHistoryService');
      
      const delivery = await createWebhookDelivery(
        1,
        'Test Webhook',
        'slack',
        'https://hooks.slack.com/test',
        { text: 'Test' }
      );
      
      const retried = scheduleRetry(delivery.id);
      
      expect(retried).toBeDefined();
      expect(retried?.status).toBe('retrying');
      expect(retried?.retryCount).toBe(1);
      expect(retried?.nextRetryAt).toBeDefined();
    });

    it('should return null for non-existent delivery', async () => {
      const { scheduleRetry } = await import('./webhookHistoryService');
      
      const result = scheduleRetry('non_existent_id');
      
      expect(result).toBeNull();
    });
  });

  describe('sendWebhookWithRetry', () => {
    it('should send webhook and return success on 200', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('ok')
      } as Response);
      
      const { createWebhookDelivery, sendWebhookWithRetry } = await import('./webhookHistoryService');
      
      const delivery = await createWebhookDelivery(
        1,
        'Test Webhook',
        'slack',
        'https://hooks.slack.com/test',
        { text: 'Test' }
      );
      
      const result = await sendWebhookWithRetry(delivery);
      
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
    });

    it('should schedule retry on failure', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error')
      } as Response);
      
      const { createWebhookDelivery, sendWebhookWithRetry } = await import('./webhookHistoryService');
      
      const delivery = await createWebhookDelivery(
        1,
        'Test Webhook',
        'slack',
        'https://hooks.slack.com/test',
        { text: 'Test' }
      );
      
      const result = await sendWebhookWithRetry(delivery);
      
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });
  });

  describe('getWebhookStatistics', () => {
    it('should return statistics', async () => {
      const { getWebhookStatistics } = await import('./webhookHistoryService');
      
      const stats = getWebhookStatistics();
      
      expect(stats).toBeDefined();
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.pending).toBe('number');
      expect(typeof stats.success).toBe('number');
      expect(typeof stats.failed).toBe('number');
      expect(typeof stats.retrying).toBe('number');
      expect(typeof stats.avgRetries).toBe('number');
      expect(typeof stats.successRate).toBe('number');
    });
  });

  describe('getDeliveryHistory', () => {
    it('should return delivery history', async () => {
      const { getDeliveryHistory } = await import('./webhookHistoryService');
      
      const history = getDeliveryHistory({ limit: 10 });
      
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('retryDelivery', () => {
    it('should return error for non-existent delivery', async () => {
      const { retryDelivery } = await import('./webhookHistoryService');
      
      const result = await retryDelivery('non_existent_id');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Delivery not found');
    });
  });
});
