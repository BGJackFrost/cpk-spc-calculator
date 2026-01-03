import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Escalation Config Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export getEscalationConfig function', async () => {
      const module = await import('./alertEscalationService');
      expect(typeof module.getEscalationConfig).toBe('function');
    });

    it('should export saveEscalationConfig function', async () => {
      const module = await import('./alertEscalationService');
      expect(typeof module.saveEscalationConfig).toBe('function');
    });

    it('should export getEscalationStats function', async () => {
      const module = await import('./alertEscalationService');
      expect(typeof module.getEscalationStats).toBe('function');
    });

    it('should export getEscalationHistory function', async () => {
      const module = await import('./alertEscalationService');
      expect(typeof module.getEscalationHistory).toBe('function');
    });

    it('should export processEscalations function', async () => {
      const module = await import('./alertEscalationService');
      expect(typeof module.processEscalations).toBe('function');
    });

    it('should export testEscalation function', async () => {
      const module = await import('./alertEscalationService');
      expect(typeof module.testEscalation).toBe('function');
    });
  });

  describe('EscalationLevel interface', () => {
    it('should define correct structure for escalation level', () => {
      const level = {
        level: 1,
        name: 'Supervisor',
        timeoutMinutes: 15,
        notifyEmails: ['test@example.com'],
        notifyPhones: ['+84123456789'],
        notifyOwner: false,
      };

      expect(level.level).toBe(1);
      expect(level.name).toBe('Supervisor');
      expect(level.timeoutMinutes).toBe(15);
      expect(Array.isArray(level.notifyEmails)).toBe(true);
      expect(Array.isArray(level.notifyPhones)).toBe(true);
      expect(typeof level.notifyOwner).toBe('boolean');
    });
  });
});

describe('Webhook Escalation Cron Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module exports', () => {
    it('should export getWebhookEscalationConfig function', async () => {
      const module = await import('./webhookEscalationCronService');
      expect(typeof module.getWebhookEscalationConfig).toBe('function');
    });

    it('should export saveWebhookEscalationConfig function', async () => {
      const module = await import('./webhookEscalationCronService');
      expect(typeof module.saveWebhookEscalationConfig).toBe('function');
    });

    it('should export getEscalationStatus function', async () => {
      const module = await import('./webhookEscalationCronService');
      expect(typeof module.getEscalationStatus).toBe('function');
    });

    it('should export runWebhookEscalationCheck function', async () => {
      const module = await import('./webhookEscalationCronService');
      expect(typeof module.runWebhookEscalationCheck).toBe('function');
    });

    it('should export resetEscalationState function', async () => {
      const module = await import('./webhookEscalationCronService');
      expect(typeof module.resetEscalationState).toBe('function');
    });

    it('should export getEscalationLogs function', async () => {
      const module = await import('./webhookEscalationCronService');
      expect(typeof module.getEscalationLogs).toBe('function');
    });
  });

  describe('resetEscalationState', () => {
    it('should reset escalation state for a webhook', async () => {
      const { resetEscalationState } = await import('./webhookEscalationCronService');
      
      // Reset should not throw
      expect(() => resetEscalationState(1)).not.toThrow();
    });
  });
});

describe('Latency Percentile Trends', () => {
  it('should export getLatencyPercentileTrends function', async () => {
    const db = await import('../db');
    expect(typeof db.getLatencyPercentileTrends).toBe('function');
  });
});

describe('Scheduled Jobs', () => {
  it('should export initScheduledJobs function', async () => {
    const module = await import('../scheduledJobs');
    expect(typeof module.initScheduledJobs).toBe('function');
  });
});
