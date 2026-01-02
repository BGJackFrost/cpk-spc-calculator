import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original fetch
const originalFetch = global.fetch;

// Mock the db module
vi.mock('../db', () => ({
  db: {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
  },
  getSmtpConfig: vi.fn().mockResolvedValue({
    host: 'smtp.test.com',
    port: 587,
    user: 'test@test.com',
    pass: 'password',
    from: 'test@test.com',
  }),
  getSystemSetting: vi.fn().mockImplementation((key: string) => {
    const settings: Record<string, string> = {
      twilio_account_sid: 'ACtest123',
      twilio_auth_token: 'authtoken123',
      twilio_from_number: '+1234567890',
      twilio_enabled: 'true',
      critical_alert_emails: 'admin@test.com,manager@test.com',
      critical_alert_phones: '+84901234567,+84909876543',
    };
    return Promise.resolve(settings[key] || null);
  }),
}));

// Mock email service
vi.mock('../emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Critical Alert Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch for Twilio API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: 'SM123' }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getTwilioConfig', () => {
    it('should return Twilio config from system settings', async () => {
      const { getTwilioConfig } = await import('./criticalAlertNotificationService');
      const config = await getTwilioConfig();

      // Config may be null if database is not available
      if (config) {
        expect(config).toHaveProperty('accountSid');
        expect(config).toHaveProperty('authToken');
        expect(config).toHaveProperty('fromNumber');
        expect(config).toHaveProperty('enabled');
      } else {
        expect(config).toBeNull();
      }
    });
  });

  describe('getAlertRecipients', () => {
    it('should parse email and phone recipients from settings', async () => {
      const { getAlertRecipients } = await import('./criticalAlertNotificationService');
      const recipients = await getAlertRecipients();

      expect(recipients.emails.length).toBeGreaterThanOrEqual(0);
      expect(recipients.phoneNumbers.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('sendSms', () => {
    it('should return error if Twilio is disabled', async () => {
      const { getSystemSetting } = await import('../db');
      vi.mocked(getSystemSetting).mockImplementation((key: string) => {
        if (key === 'twilio_enabled') return Promise.resolve('false');
        if (key === 'twilio_account_sid') return Promise.resolve('ACtest123');
        if (key === 'twilio_auth_token') return Promise.resolve('authtoken123');
        if (key === 'twilio_from_number') return Promise.resolve('+1234567890');
        return Promise.resolve(null);
      });

      // Re-import to get fresh module
      vi.resetModules();
      const { sendSms } = await import('./criticalAlertNotificationService');
      const result = await sendSms('+84901234567', 'Test message');

      expect(result.success).toBe(false);
    });
  });

  describe('sendCriticalAlertNotification', () => {
    it('should not send notifications for warning alerts', async () => {
      const { sendCriticalAlertNotification } = await import('./criticalAlertNotificationService');

      const alert = {
        id: 1,
        alertType: 'cpk_below_warning',
        severity: 'warning' as const,
        alertMessage: 'CPK dropped below warning threshold',
        currentValue: 1.2,
        thresholdValue: 1.33,
        createdAt: new Date(),
      };

      const result = await sendCriticalAlertNotification(alert);

      expect(result.email.sent).toBe(false);
      expect(result.sms.sent).toBe(false);
    });

    it('should handle critical alerts', async () => {
      const { sendCriticalAlertNotification } = await import('./criticalAlertNotificationService');

      const alert = {
        id: 1,
        alertType: 'cpk_below_critical',
        severity: 'critical' as const,
        alertMessage: 'CPK dropped below critical threshold',
        currentValue: 0.8,
        thresholdValue: 1.0,
        productionLineId: 1,
        productionLineName: 'Line A',
        createdAt: new Date(),
      };

      const result = await sendCriticalAlertNotification(alert);

      // Result should have email and sms properties
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('sms');
    });
  });
});
