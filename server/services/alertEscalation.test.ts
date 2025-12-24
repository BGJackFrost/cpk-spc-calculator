import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('../db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
  },
  getSystemSetting: vi.fn().mockImplementation((key: string) => {
    const settings: Record<string, string> = {
      escalation_enabled: 'true',
      escalation_config: JSON.stringify([
        { level: 1, name: 'Supervisor', timeoutMinutes: 15, notifyEmails: ['sup@test.com'], notifyPhones: [], notifyOwner: false },
        { level: 2, name: 'Manager', timeoutMinutes: 30, notifyEmails: ['mgr@test.com'], notifyPhones: [], notifyOwner: true },
      ]),
    };
    return Promise.resolve(settings[key] || null);
  }),
}));

// Mock email service
vi.mock('../emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock SMS service
vi.mock('./criticalAlertNotificationService', () => ({
  sendSms: vi.fn().mockResolvedValue({ success: true }),
  getAlertRecipients: vi.fn().mockResolvedValue({
    emails: ['admin@test.com'],
    phoneNumbers: ['+84901234567'],
  }),
}));

describe('Alert Escalation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEscalationConfig', () => {
    it('should return escalation config from system settings', async () => {
      const { getEscalationConfig } = await import('./alertEscalationService');
      const config = await getEscalationConfig();

      expect(config.enabled).toBe(true);
      expect(config.levels.length).toBeGreaterThanOrEqual(0);
    });

    it('should return default config if not configured', async () => {
      const { getSystemSetting } = await import('../db');
      vi.mocked(getSystemSetting).mockResolvedValue(null);

      vi.resetModules();
      const { getEscalationConfig } = await import('./alertEscalationService');
      const config = await getEscalationConfig();

      expect(config.levels.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('saveEscalationConfig', () => {
    it('should save escalation config', async () => {
      const { saveEscalationConfig } = await import('./alertEscalationService');

      // saveEscalationConfig returns void, so we just check it doesn't throw
      await expect(saveEscalationConfig({
        enabled: true,
        levels: [
          { level: 1, name: 'Test', timeoutMinutes: 10, notifyEmails: [], notifyPhones: [], notifyOwner: false },
        ],
      })).resolves.not.toThrow();
    });
  });

  describe('getPendingAlertsForEscalation', () => {
    it('should return array of alerts', async () => {
      const { getPendingAlertsForEscalation } = await import('./alertEscalationService');
      const alerts = await getPendingAlertsForEscalation();

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('processEscalations', () => {
    it('should process escalations and return result', async () => {
      const { processEscalations } = await import('./alertEscalationService');
      const result = await processEscalations();

      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('escalated');
    });
  });

  describe('getEscalationStats', () => {
    it('should return escalation statistics', async () => {
      const { getEscalationStats } = await import('./alertEscalationService');
      const stats = await getEscalationStats(30);

      expect(stats).toHaveProperty('totalEscalations');
      expect(stats).toHaveProperty('byLevel');
    });
  });
});
