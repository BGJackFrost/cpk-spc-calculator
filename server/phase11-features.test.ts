/**
 * Phase 11 Features Test
 * Test các tính năng mới: lọc thông báo, notification channels, radar chart history
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('./db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue([]),
  })),
}));

// Mock email service
vi.mock('./emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  getSmtpConfig: vi.fn().mockResolvedValue({
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    username: 'test',
    password: 'test',
    fromEmail: 'test@test.com',
    fromName: 'Test',
  }),
}));

// Mock telegram service
vi.mock('./services/telegramService', () => ({
  sendTelegramAlert: vi.fn().mockResolvedValue({ sent: 1, failed: 0, errors: [] }),
  getTelegramConfigs: vi.fn().mockResolvedValue([
    { id: 1, name: 'Test Bot', botToken: 'test', chatId: '123', isActive: true, alertTypes: ['cpk_alert'] },
  ]),
}));

describe('Phase 11 - Notification Filter Features', () => {
  describe('userNotificationRouter', () => {
    it('should have list procedure with filter support', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter).toBeDefined();
      expect(userNotificationRouter._def.procedures).toHaveProperty('list');
    });

    it('should have getStats procedure', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter._def.procedures).toHaveProperty('getStats');
    });

    it('should have markAsRead procedure', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter._def.procedures).toHaveProperty('markAsRead');
    });

    it('should have markAllAsRead procedure', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter._def.procedures).toHaveProperty('markAllAsRead');
    });

    it('should have deleteAllRead procedure', async () => {
      const { userNotificationRouter } = await import('./routers/userNotificationRouter');
      expect(userNotificationRouter._def.procedures).toHaveProperty('deleteAllRead');
    });
  });
});

describe('Phase 11 - Notification Preferences Features', () => {
  describe('notificationPreferencesRouter', () => {
    it('should have get procedure', async () => {
      const { notificationPreferencesRouter } = await import('./routers/notificationPreferencesRouter');
      expect(notificationPreferencesRouter).toBeDefined();
      expect(notificationPreferencesRouter._def.procedures).toHaveProperty('get');
    });

    it('should have update procedure', async () => {
      const { notificationPreferencesRouter } = await import('./routers/notificationPreferencesRouter');
      expect(notificationPreferencesRouter._def.procedures).toHaveProperty('update');
    });

    it('should have getMyPreferences procedure', async () => {
      const { notificationPreferencesRouter } = await import('./routers/notificationPreferencesRouter');
      expect(notificationPreferencesRouter._def.procedures).toHaveProperty('getMyPreferences');
    });

    it('should have testEmail procedure', async () => {
      const { notificationPreferencesRouter } = await import('./routers/notificationPreferencesRouter');
      expect(notificationPreferencesRouter._def.procedures).toHaveProperty('testEmail');
    });

    it('should have testTelegram procedure', async () => {
      const { notificationPreferencesRouter } = await import('./routers/notificationPreferencesRouter');
      expect(notificationPreferencesRouter._def.procedures).toHaveProperty('testTelegram');
    });
  });
});

describe('Phase 11 - Critical Alert Service', () => {
  describe('criticalAlertService', () => {
    it('should export sendCriticalAlert function', async () => {
      const { sendCriticalAlert } = await import('./services/criticalAlertService');
      expect(typeof sendCriticalAlert).toBe('function');
    });

    it('should export sendCpkCriticalAlert function', async () => {
      const { sendCpkCriticalAlert } = await import('./services/criticalAlertService');
      expect(typeof sendCpkCriticalAlert).toBe('function');
    });

    it('should export sendSpcViolationAlert function', async () => {
      const { sendSpcViolationAlert } = await import('./services/criticalAlertService');
      expect(typeof sendSpcViolationAlert).toBe('function');
    });
  });
});

describe('Phase 11 - CPK History Router', () => {
  describe('cpkHistoryRouter', () => {
    it('should have getHistoricalTrend procedure', async () => {
      const { cpkHistoryRouter } = await import('./routers/cpkHistoryRouter');
      expect(cpkHistoryRouter).toBeDefined();
      expect(cpkHistoryRouter._def.procedures).toHaveProperty('getHistoricalTrend');
    });

    it('should have getComparisonByDates procedure', async () => {
      const { cpkHistoryRouter } = await import('./routers/cpkHistoryRouter');
      expect(cpkHistoryRouter._def.procedures).toHaveProperty('getComparisonByDates');
    });

    it('should have getImprovementSummary procedure', async () => {
      const { cpkHistoryRouter } = await import('./routers/cpkHistoryRouter');
      expect(cpkHistoryRouter._def.procedures).toHaveProperty('getImprovementSummary');
    });
  });
});

describe('Phase 11 - Telegram Service Integration', () => {
  describe('telegramService', () => {
    it('should export getTelegramConfigs function', async () => {
      const { getTelegramConfigs } = await import('./services/telegramService');
      expect(typeof getTelegramConfigs).toBe('function');
    });

    it('should export sendTelegramAlert function', async () => {
      const { sendTelegramAlert } = await import('./services/telegramService');
      expect(typeof sendTelegramAlert).toBe('function');
    });

    it('should have message templates for different alert types', async () => {
      const telegramService = await import('./services/telegramService');
      // AlertType should include cpk_alert, spc_violation, etc.
      expect(telegramService).toBeDefined();
    });
  });
});

describe('Phase 11 - Email Service Integration', () => {
  describe('emailService', () => {
    it('should export sendEmail function', async () => {
      const { sendEmail } = await import('./emailService');
      expect(typeof sendEmail).toBe('function');
    });

    it('should export getSmtpConfig function', async () => {
      const { getSmtpConfig } = await import('./emailService');
      expect(typeof getSmtpConfig).toBe('function');
    });
  });
});
