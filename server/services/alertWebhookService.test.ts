import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('alertWebhookService', () => {
  // Mock fetch globally
  const mockFetch = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    mockFetch.mockResolvedValue({ ok: true, text: () => Promise.resolve('ok') });
    // Reset module cache
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendAlertToWebhooks', () => {
    it('should send alert to Slack when enabled', async () => {
      // Mock database inline
      vi.doMock('../db', () => ({
        getDb: vi.fn(() => ({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 1,
                slackWebhookUrl: 'https://hooks.slack.com/services/test',
                slackChannel: '#alerts',
                slackEnabled: 1,
                teamsWebhookUrl: null,
                teamsEnabled: 0,
              }])),
            })),
          })),
        })),
      }));

      const { sendAlertToWebhooks } = await import('./alertWebhookService');
      
      const result = await sendAlertToWebhooks({
        title: 'Test Alert',
        message: 'This is a test message',
        severity: 'warning',
        source: 'Test Source',
      });

      expect(result.slack).toBe(true);
      expect(result.teams).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should send alert to Teams when enabled', async () => {
      vi.doMock('../db', () => ({
        getDb: vi.fn(() => ({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 1,
                slackWebhookUrl: null,
                slackChannel: null,
                slackEnabled: 0,
                teamsWebhookUrl: 'https://outlook.office.com/webhook/test',
                teamsEnabled: 1,
              }])),
            })),
          })),
        })),
      }));

      const { sendAlertToWebhooks } = await import('./alertWebhookService');
      
      const result = await sendAlertToWebhooks({
        title: 'Test Alert',
        message: 'This is a test message',
        severity: 'critical',
      });

      expect(result.slack).toBe(false);
      expect(result.teams).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://outlook.office.com/webhook/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return false when no config found', async () => {
      vi.doMock('../db', () => ({
        getDb: vi.fn(() => ({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      }));

      const { sendAlertToWebhooks } = await import('./alertWebhookService');
      
      const result = await sendAlertToWebhooks({
        title: 'Test Alert',
        message: 'This is a test message',
        severity: 'info',
      });

      expect(result.slack).toBe(false);
      expect(result.teams).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      vi.doMock('../db', () => ({
        getDb: vi.fn(() => ({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 1,
                slackWebhookUrl: 'https://hooks.slack.com/services/test',
                slackChannel: '#alerts',
                slackEnabled: 1,
                teamsWebhookUrl: null,
                teamsEnabled: 0,
              }])),
            })),
          })),
        })),
      }));

      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const { sendAlertToWebhooks } = await import('./alertWebhookService');
      
      const result = await sendAlertToWebhooks({
        title: 'Test Alert',
        message: 'This is a test message',
        severity: 'info',
      });

      expect(result.slack).toBe(false);
      expect(result.teams).toBe(false);
    });
  });

  describe('Alert payload format', () => {
    it('should format Slack message correctly', async () => {
      vi.doMock('../db', () => ({
        getDb: vi.fn(() => ({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 1,
                slackWebhookUrl: 'https://hooks.slack.com/services/test',
                slackChannel: '#alerts',
                slackEnabled: 1,
                teamsWebhookUrl: null,
                teamsEnabled: 0,
              }])),
            })),
          })),
        })),
      }));

      const { sendAlertToWebhooks } = await import('./alertWebhookService');
      
      await sendAlertToWebhooks({
        title: 'CPK Alert',
        message: 'CPK below threshold',
        severity: 'critical',
        source: 'Line 1',
        details: { CPK: '0.85', Product: 'PROD001' },
      });

      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      expect(callBody.channel).toBe('#alerts');
      expect(callBody.attachments[0].color).toBe('#ef4444'); // critical color
      expect(callBody.attachments[0].title).toBe('CPK Alert');
      expect(callBody.attachments[0].fields).toContainEqual(
        expect.objectContaining({ title: 'Severity', value: 'CRITICAL' })
      );
    });

    it('should format Teams message correctly', async () => {
      vi.doMock('../db', () => ({
        getDb: vi.fn(() => ({
          select: vi.fn(() => ({
            from: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                id: 1,
                slackWebhookUrl: null,
                slackChannel: null,
                slackEnabled: 0,
                teamsWebhookUrl: 'https://outlook.office.com/webhook/test',
                teamsEnabled: 1,
              }])),
            })),
          })),
        })),
      }));

      const { sendAlertToWebhooks } = await import('./alertWebhookService');
      
      await sendAlertToWebhooks({
        title: 'OEE Alert',
        message: 'OEE below threshold',
        severity: 'warning',
        source: 'Machine 1',
      });

      expect(mockFetch).toHaveBeenCalled();
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      
      expect(callBody['@type']).toBe('MessageCard');
      expect(callBody.themeColor).toBe('FFA500'); // warning color
      expect(callBody.summary).toBe('OEE Alert');
    });
  });
});
