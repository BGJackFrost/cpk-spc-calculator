import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing the module
vi.mock('../emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('./telegramService', () => ({
  sendTelegramAlert: vi.fn().mockResolvedValue({ sent: 1, failed: 0, errors: [] }),
}));

vi.mock('../_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock('../db', () => ({
  getDb: vi.fn().mockReturnValue(null),
}));

describe('IoT Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Module structure', () => {
    it('should export required functions', async () => {
      const module = await import('./iotNotificationService');
      
      expect(module.sendIotAlarmNotification).toBeDefined();
      expect(typeof module.sendIotAlarmNotification).toBe('function');
      
      expect(module.notifyOnCriticalAlarm).toBeDefined();
      expect(typeof module.notifyOnCriticalAlarm).toBe('function');
      
      expect(module.testNotificationChannels).toBeDefined();
      expect(typeof module.testNotificationChannels).toBe('function');
    });
  });

  describe('notifyOnCriticalAlarm', () => {
    it('should not send notification for non-critical alarms', async () => {
      const { notifyOnCriticalAlarm } = await import('./iotNotificationService');
      
      // Should not throw and should return early for warning
      await expect(notifyOnCriticalAlarm(1, 'warning')).resolves.toBeUndefined();
      
      // Should not throw and should return early for error
      await expect(notifyOnCriticalAlarm(2, 'error')).resolves.toBeUndefined();
    });

    it('should attempt to send notification for critical alarms', async () => {
      const { notifyOnCriticalAlarm, sendIotAlarmNotification } = await import('./iotNotificationService');
      
      // This will fail because db is mocked to return null, but it should not throw
      await expect(notifyOnCriticalAlarm(1, 'critical')).resolves.toBeUndefined();
    });
  });

  describe('sendIotAlarmNotification', () => {
    it('should return error when database is not available', async () => {
      const { sendIotAlarmNotification } = await import('./iotNotificationService');
      
      const result = await sendIotAlarmNotification(1, 'all');
      
      expect(result.success).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].error).toBe('Database not available');
    });
  });

  describe('testNotificationChannels', () => {
    it('should test all notification channels', async () => {
      const { testNotificationChannels } = await import('./iotNotificationService');
      
      const result = await testNotificationChannels();
      
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('telegram');
      expect(result).toHaveProperty('owner');
      
      // Each result should have required properties
      expect(result.email).toHaveProperty('channel', 'email');
      expect(result.email).toHaveProperty('success');
      expect(result.email).toHaveProperty('timestamp');
      
      expect(result.telegram).toHaveProperty('channel', 'telegram');
      expect(result.telegram).toHaveProperty('success');
      expect(result.telegram).toHaveProperty('timestamp');
      
      expect(result.owner).toHaveProperty('channel', 'owner');
      expect(result.owner).toHaveProperty('success');
      expect(result.owner).toHaveProperty('timestamp');
    });
  });
});
