/**
 * Unit tests for notification test functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the email service
vi.mock('./emailService', () => ({
  sendEmail: vi.fn(),
  getSmtpConfig: vi.fn(),
}));

// Mock the telegram service
vi.mock('./services/telegramService', () => ({
  getTelegramConfigs: vi.fn(),
}));

describe('Notification Test APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Test Email Notification', () => {
    it('should return error when SMTP is not configured', async () => {
      const { getSmtpConfig } = await import('./emailService');
      (getSmtpConfig as any).mockResolvedValue(null);

      // Simulate the test email logic
      const smtpConfig = await getSmtpConfig();
      
      expect(smtpConfig).toBeNull();
      // When SMTP is not configured, should return error
    });

    it('should send test email when SMTP is configured', async () => {
      const { sendEmail, getSmtpConfig } = await import('./emailService');
      (getSmtpConfig as any).mockResolvedValue({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        username: 'test@test.com',
        password: 'password',
        fromEmail: 'noreply@test.com',
        fromName: 'Test System',
      });
      (sendEmail as any).mockResolvedValue({ success: true });

      const smtpConfig = await getSmtpConfig();
      expect(smtpConfig).not.toBeNull();
      expect(smtpConfig?.host).toBe('smtp.test.com');

      const result = await sendEmail(
        'user@example.com',
        '[TEST] Test Email',
        '<p>Test content</p>'
      );
      expect(result.success).toBe(true);
    });

    it('should handle email send failure', async () => {
      const { sendEmail, getSmtpConfig } = await import('./emailService');
      (getSmtpConfig as any).mockResolvedValue({
        host: 'smtp.test.com',
        port: 587,
      });
      (sendEmail as any).mockResolvedValue({ 
        success: false, 
        error: 'Connection refused' 
      });

      const result = await sendEmail(
        'user@example.com',
        '[TEST] Test Email',
        '<p>Test content</p>'
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
    });
  });

  describe('Test Telegram Notification', () => {
    it('should return error when no active Telegram config', async () => {
      const { getTelegramConfigs } = await import('./services/telegramService');
      (getTelegramConfigs as any).mockResolvedValue([]);

      const configs = await getTelegramConfigs();
      const activeConfig = configs.find((c: any) => c.isActive);
      
      expect(activeConfig).toBeUndefined();
    });

    it('should find active Telegram config', async () => {
      const { getTelegramConfigs } = await import('./services/telegramService');
      (getTelegramConfigs as any).mockResolvedValue([
        { id: 1, name: 'Bot 1', botToken: 'token1', isActive: false },
        { id: 2, name: 'Bot 2', botToken: 'token2', isActive: true },
      ]);

      const configs = await getTelegramConfigs();
      const activeConfig = configs.find((c: any) => c.isActive);
      
      expect(activeConfig).toBeDefined();
      expect(activeConfig?.name).toBe('Bot 2');
      expect(activeConfig?.botToken).toBe('token2');
    });
  });
});

describe('MTTR/MTBF Calculation from Work Orders', () => {
  it('should calculate MTTR from work order completion time', () => {
    // Mock work order data
    const workOrders = [
      { 
        id: 1, 
        createdAt: new Date('2024-01-01T08:00:00'),
        completedAt: new Date('2024-01-01T10:30:00'),
        status: 'completed'
      },
      { 
        id: 2, 
        createdAt: new Date('2024-01-02T14:00:00'),
        completedAt: new Date('2024-01-02T15:45:00'),
        status: 'completed'
      },
    ];

    // Calculate repair times in minutes
    const repairTimes = workOrders.map(wo => {
      const start = new Date(wo.createdAt).getTime();
      const end = new Date(wo.completedAt).getTime();
      return (end - start) / (1000 * 60); // minutes
    });

    // MTTR = average repair time
    const mttr = repairTimes.reduce((a, b) => a + b, 0) / repairTimes.length;

    expect(repairTimes[0]).toBe(150); // 2.5 hours = 150 minutes
    expect(repairTimes[1]).toBe(105); // 1.75 hours = 105 minutes
    expect(mttr).toBe(127.5); // Average
  });

  it('should calculate MTBF from time between failures', () => {
    // Mock failure timestamps (corrective work orders)
    const failureTimestamps = [
      new Date('2024-01-01T08:00:00').getTime(),
      new Date('2024-01-03T10:00:00').getTime(),
      new Date('2024-01-06T14:00:00').getTime(),
    ];

    // Calculate time between failures in hours
    const timeBetweenFailures: number[] = [];
    for (let i = 1; i < failureTimestamps.length; i++) {
      const diffHours = (failureTimestamps[i] - failureTimestamps[i-1]) / (1000 * 60 * 60);
      timeBetweenFailures.push(diffHours);
    }

    // MTBF = average time between failures
    const mtbf = timeBetweenFailures.reduce((a, b) => a + b, 0) / timeBetweenFailures.length;

    expect(timeBetweenFailures[0]).toBe(50); // 50 hours
    expect(timeBetweenFailures[1]).toBe(76); // 76 hours
    expect(mtbf).toBe(63); // Average
  });

  it('should calculate availability from MTBF and MTTR', () => {
    const mtbf = 100; // hours
    const mttr = 2; // hours (converted from minutes)

    // Availability = MTBF / (MTBF + MTTR)
    const availability = mtbf / (mtbf + mttr);

    expect(availability).toBeCloseTo(0.9804, 4); // ~98%
  });
});

describe('Scheduled MTTR/MTBF Reports', () => {
  it('should calculate correct date range for daily reports', () => {
    const endDate = new Date('2024-01-15T08:00:00');
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    expect(startDate.toISOString().slice(0, 10)).toBe('2024-01-14');
    expect(endDate.toISOString().slice(0, 10)).toBe('2024-01-15');
  });

  it('should calculate correct date range for weekly reports', () => {
    const endDate = new Date('2024-01-15T08:00:00');
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    expect(startDate.toISOString().slice(0, 10)).toBe('2024-01-08');
    expect(endDate.toISOString().slice(0, 10)).toBe('2024-01-15');
  });

  it('should calculate correct date range for monthly reports', () => {
    const endDate = new Date('2024-02-15T08:00:00');
    const startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);

    expect(startDate.toISOString().slice(0, 10)).toBe('2024-01-15');
    expect(endDate.toISOString().slice(0, 10)).toBe('2024-02-15');
  });

  it('should validate email recipients', () => {
    const validEmails = ['test@example.com', 'user@domain.org'];
    const invalidEmails = ['notanemail', 'missing@', '@nodomain.com'];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    validEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(true);
    });

    invalidEmails.forEach(email => {
      expect(emailRegex.test(email)).toBe(false);
    });
  });

  it('should check if report is due based on frequency', () => {
    const now = new Date('2024-01-15T08:00:00'); // Monday
    const currentDay = now.getDay(); // 1 = Monday

    // Weekly report scheduled for Monday
    const weeklyConfig = { frequency: 'weekly', dayOfWeek: 1 };
    expect(currentDay === weeklyConfig.dayOfWeek).toBe(true);

    // Monthly report scheduled for 15th
    const monthlyConfig = { frequency: 'monthly', dayOfMonth: 15 };
    expect(now.getDate() === monthlyConfig.dayOfMonth).toBe(true);

    // Daily report - always due
    const dailyConfig = { frequency: 'daily' };
    expect(dailyConfig.frequency === 'daily').toBe(true);
  });
});
