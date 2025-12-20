import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

// Import after mocking
import {
  getSecuritySettings,
  getSecuritySetting,
  updateSecuritySettings,
  getSecuritySettingsWithDescriptions,
} from './localAuthService';

describe('Security Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSecuritySettings', () => {
    it('should return default settings when database is not available', async () => {
      const result = await getSecuritySettings();
      expect(result).toEqual({
        max_failed_attempts: "10",
        alert_threshold: "5",
        lockout_duration_minutes: "30",
        auto_unlock_enabled: "true",
        trusted_device_expiry_days: "30",
      });
    });
  });

  describe('getSecuritySetting', () => {
    it('should return default value for max_failed_attempts', async () => {
      const result = await getSecuritySetting('max_failed_attempts');
      expect(result).toBe("10");
    });

    it('should return default value for alert_threshold', async () => {
      const result = await getSecuritySetting('alert_threshold');
      expect(result).toBe("5");
    });

    it('should return default value for lockout_duration_minutes', async () => {
      const result = await getSecuritySetting('lockout_duration_minutes');
      expect(result).toBe("30");
    });

    it('should return default value for auto_unlock_enabled', async () => {
      const result = await getSecuritySetting('auto_unlock_enabled');
      expect(result).toBe("true");
    });

    it('should return default value for trusted_device_expiry_days', async () => {
      const result = await getSecuritySetting('trusted_device_expiry_days');
      expect(result).toBe("30");
    });
  });

  describe('updateSecuritySettings', () => {
    it('should return failure when database is not available', async () => {
      const result = await updateSecuritySettings(
        { max_failed_attempts: "15" },
        1
      );
      expect(result.success).toBe(false);
      expect(result.message).toBe("Database không khả dụng");
    });
  });

  describe('getSecuritySettingsWithDescriptions', () => {
    it('should return settings with descriptions', async () => {
      const result = await getSecuritySettingsWithDescriptions();
      
      expect(result).toHaveLength(5);
      
      // Check max_failed_attempts
      const maxFailedAttempts = result.find(s => s.key === 'max_failed_attempts');
      expect(maxFailedAttempts).toBeDefined();
      expect(maxFailedAttempts?.type).toBe('number');
      expect(maxFailedAttempts?.min).toBe(3);
      expect(maxFailedAttempts?.max).toBe(100);
      
      // Check alert_threshold
      const alertThreshold = result.find(s => s.key === 'alert_threshold');
      expect(alertThreshold).toBeDefined();
      expect(alertThreshold?.type).toBe('number');
      expect(alertThreshold?.min).toBe(1);
      expect(alertThreshold?.max).toBe(50);
      
      // Check lockout_duration_minutes
      const lockoutDuration = result.find(s => s.key === 'lockout_duration_minutes');
      expect(lockoutDuration).toBeDefined();
      expect(lockoutDuration?.type).toBe('number');
      expect(lockoutDuration?.min).toBe(1);
      expect(lockoutDuration?.max).toBe(1440);
      
      // Check auto_unlock_enabled
      const autoUnlock = result.find(s => s.key === 'auto_unlock_enabled');
      expect(autoUnlock).toBeDefined();
      expect(autoUnlock?.type).toBe('boolean');
      
      // Check trusted_device_expiry_days
      const trustedDeviceExpiry = result.find(s => s.key === 'trusted_device_expiry_days');
      expect(trustedDeviceExpiry).toBeDefined();
      expect(trustedDeviceExpiry?.type).toBe('number');
      expect(trustedDeviceExpiry?.min).toBe(1);
      expect(trustedDeviceExpiry?.max).toBe(365);
    });
  });
});
