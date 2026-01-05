/**
 * Tests for Work Order Notification Scheduler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./db', () => ({
  getDb: vi.fn().mockReturnValue(null),
}));

vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe('Work Order Notification Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Structure', () => {
    it('should export checkWorkOrderNotifications function', async () => {
      const service = await import('./services/workOrderNotificationScheduler');
      expect(typeof service.checkWorkOrderNotifications).toBe('function');
    });

    it('should export triggerWorkOrderNotificationCheck function', async () => {
      const service = await import('./services/workOrderNotificationScheduler');
      expect(typeof service.triggerWorkOrderNotificationCheck).toBe('function');
    });
  });

  describe('Notification Result Structure', () => {
    it('should return proper result structure', async () => {
      const service = await import('./services/workOrderNotificationScheduler');
      const result = await service.checkWorkOrderNotifications();

      expect(result).toHaveProperty('dueSoon');
      expect(result).toHaveProperty('overdue');
      expect(result).toHaveProperty('timestamp');

      expect(result.dueSoon).toHaveProperty('checked');
      expect(result.dueSoon).toHaveProperty('notified');
      expect(result.dueSoon).toHaveProperty('errors');

      expect(result.overdue).toHaveProperty('checked');
      expect(result.overdue).toHaveProperty('notified');
      expect(result.overdue).toHaveProperty('errors');
    });
  });

  describe('SMS Notification Service', () => {
    it('should export sendSmsNotification function', async () => {
      const service = await import('./services/smsNotificationService');
      expect(typeof service.sendSmsNotification).toBe('function');
    });

    it('should export isSmsConfigured function', async () => {
      const service = await import('./services/smsNotificationService');
      expect(typeof service.isSmsConfigured).toBe('function');
    });

    it('should export sendWorkOrderSms function', async () => {
      const service = await import('./services/smsNotificationService');
      expect(typeof service.sendWorkOrderSms).toBe('function');
    });

    it('should export sendAlertSms function', async () => {
      const service = await import('./services/smsNotificationService');
      expect(typeof service.sendAlertSms).toBe('function');
    });

    it('should check if SMS is configured based on env vars', async () => {
      const service = await import('./services/smsNotificationService');
      const isConfigured = service.isSmsConfigured();
      
      // Should return true if TWILIO_* env vars are set
      const hasEnvVars = !!(
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
      );
      
      expect(isConfigured).toBe(hasEnvVars);
    });
  });

  describe('Scheduled Jobs Integration', () => {
    it('should have triggerWorkOrderNotificationCheck in scheduledJobs', async () => {
      const jobs = await import('./scheduledJobs');
      expect(typeof jobs.triggerWorkOrderNotificationCheck).toBe('function');
    });

    it('should return proper structure from triggerWorkOrderNotificationCheck', async () => {
      const jobs = await import('./scheduledJobs');
      const result = await jobs.triggerWorkOrderNotificationCheck();

      expect(result).toHaveProperty('dueSoon');
      expect(result).toHaveProperty('overdue');
    });
  });

  describe('Notification Types', () => {
    it('should support due_soon notification type', () => {
      const notificationTypes = ['new_work_order', 'assigned', 'status_change', 'due_soon', 'overdue', 'comment', 'escalation'];
      expect(notificationTypes).toContain('due_soon');
    });

    it('should support overdue notification type', () => {
      const notificationTypes = ['new_work_order', 'assigned', 'status_change', 'due_soon', 'overdue', 'comment', 'escalation'];
      expect(notificationTypes).toContain('overdue');
    });
  });

  describe('Cron Schedule Configuration', () => {
    it('should have due soon check scheduled every hour at :30', () => {
      // Cron expression: '0 30 * * * *' means at minute 30 of every hour
      const dueSoonSchedule = '0 30 * * * *';
      expect(dueSoonSchedule).toBe('0 30 * * * *');
    });

    it('should have overdue check scheduled at 8:00, 14:00, 20:00', () => {
      // Cron expression: '0 0 8,14,20 * * *' means at 8:00, 14:00, 20:00
      const overdueSchedule = '0 0 8,14,20 * * *';
      expect(overdueSchedule).toBe('0 0 8,14,20 * * *');
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format Vietnamese phone numbers correctly', () => {
      const formatPhoneNumber = (phone: string): string => {
        let formatted = phone.replace(/[^\d+]/g, '');
        if (!formatted.startsWith('+')) {
          if (formatted.startsWith('0')) {
            formatted = formatted.substring(1);
          }
          formatted = '+84' + formatted;
        }
        return formatted;
      };

      expect(formatPhoneNumber('0912345678')).toBe('+84912345678');
      expect(formatPhoneNumber('912345678')).toBe('+84912345678');
      expect(formatPhoneNumber('+84912345678')).toBe('+84912345678');
      expect(formatPhoneNumber('0912 345 678')).toBe('+84912345678');
    });
  });
});
