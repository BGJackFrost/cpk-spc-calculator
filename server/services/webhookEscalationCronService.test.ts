import { describe, it, expect } from 'vitest';

describe('Webhook Escalation Cron Service', () => {
  it('should export getWebhookEscalationConfig function', async () => {
    const module = await import('./webhookEscalationCronService');
    expect(typeof module.getWebhookEscalationConfig).toBe('function');
  });

  it('should export runWebhookEscalationCheck function', async () => {
    const module = await import('./webhookEscalationCronService');
    expect(typeof module.runWebhookEscalationCheck).toBe('function');
  });

  it('should return default config', async () => {
    const { getWebhookEscalationConfig } = await import('./webhookEscalationCronService');
    const config = await getWebhookEscalationConfig();
    expect(config).toBeDefined();
    expect(config.enabled).toBe(true);
    expect(config.checkWindowMinutes).toBe(30);
  });

  it('should return escalation logs array', async () => {
    const { getEscalationLogs } = await import('./webhookEscalationCronService');
    const logs = await getEscalationLogs(10);
    expect(Array.isArray(logs)).toBe(true);
  });

  it('should return check result', async () => {
    const { runWebhookEscalationCheck } = await import('./webhookEscalationCronService');
    const result = await runWebhookEscalationCheck();
    expect(result).toBeDefined();
    expect(typeof result.checked).toBe('number');
    expect(typeof result.escalated).toBe('number');
  });
});
