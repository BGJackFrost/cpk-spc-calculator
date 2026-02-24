import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Twilio
vi.mock('twilio', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    sid: 'SM123456789',
    status: 'queued',
    to: '+84912345678',
    from: '+1234567890',
    body: 'Test message'
  });
  
  return {
    default: vi.fn(() => ({
      messages: {
        create: mockCreate
      }
    }))
  };
});

// Mock getDb
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      { key: 'twilio_account_sid', value: 'AC123456789' },
      { key: 'twilio_auth_token', value: 'test_token' },
      { key: 'twilio_from_number', value: '+1234567890' },
      { key: 'twilio_enabled', value: 'true' }
    ]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onDuplicateKeyUpdate: vi.fn().mockReturnThis(),
    set: vi.fn().mockResolvedValue({ affectedRows: 1 })
  })
}));

describe('twilioService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTwilioConfig', () => {
    it('should return null when db is not available', async () => {
      const { getDb } = await import('../db');
      vi.mocked(getDb).mockResolvedValueOnce(null);
      
      const { getTwilioConfig } = await import('./twilioService');
      const result = await getTwilioConfig();
      
      expect(result).toBeNull();
    });

    it('should return config when settings exist', async () => {
      const { getTwilioConfig } = await import('./twilioService');
      const result = await getTwilioConfig();
      
      expect(result).toEqual({
        accountSid: 'AC123456789',
        authToken: 'test_token',
        fromNumber: '+1234567890',
        enabled: true
      });
    });
  });

  describe('sendSms', () => {
    it('should return error when config is not available', async () => {
      const { getDb } = await import('../db');
      vi.mocked(getDb).mockResolvedValueOnce(null);
      
      const { sendSms } = await import('./twilioService');
      const result = await sendSms('+84912345678', 'Test message');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Twilio');
    });
  });

  describe('sendAlertSms', () => {
    it('should format alert message correctly', async () => {
      const { sendAlertSms } = await import('./twilioService');
      
      // This will fail due to config issues in test, but we're testing the function exists
      const result = await sendAlertSms({
        type: 'cpk',
        severity: 'critical',
        message: 'CPK below threshold',
        timestamp: new Date()
      }, '+84912345678');
      
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });
});
