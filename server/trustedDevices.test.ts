import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('./db', () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

// Import after mocking
import {
  isTrustedDevice,
  addTrustedDevice,
  getTrustedDevices,
  removeTrustedDevice,
  removeAllTrustedDevices,
  recordFailedLoginAttempt,
  isAccountLocked,
  unlockAccount,
  getLockedAccounts,
  clearFailedAttempts,
  getIpLocation,
} from './localAuthService';

describe('Trusted Devices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isTrustedDevice', () => {
    it('should return false when database is not available', async () => {
      const result = await isTrustedDevice(1, 'test-fingerprint');
      expect(result).toBe(false);
    });
  });

  describe('addTrustedDevice', () => {
    it('should return failure when database is not available', async () => {
      const result = await addTrustedDevice(1, 'test-fingerprint', {
        deviceName: 'Test Device',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        trustDays: 30,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getTrustedDevices', () => {
    it('should return empty array when database is not available', async () => {
      const result = await getTrustedDevices(1);
      expect(result).toEqual([]);
    });
  });

  describe('removeTrustedDevice', () => {
    it('should return false when database is not available', async () => {
      const result = await removeTrustedDevice(1, 1);
      expect(result).toBe(false);
    });
  });

  describe('removeAllTrustedDevices', () => {
    it('should not throw when database is not available', async () => {
      await expect(removeAllTrustedDevices(1)).resolves.not.toThrow();
    });
  });
});

describe('Failed Login Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordFailedLoginAttempt', () => {
    it('should return default values when database is not available', async () => {
      const result = await recordFailedLoginAttempt(
        'testuser',
        '192.168.1.1',
        'Mozilla/5.0',
        'wrong_password'
      );
      expect(result).toEqual({
        failedCount: 0,
        shouldAlert: false,
        shouldLock: false,
      });
    });
  });

  describe('isAccountLocked', () => {
    it('should return not locked when database is not available', async () => {
      const result = await isAccountLocked('testuser');
      expect(result.locked).toBe(false);
    });
  });

  describe('unlockAccount', () => {
    it('should return false when database is not available', async () => {
      const result = await unlockAccount('testuser', 1);
      expect(result).toBe(false);
    });
  });

  describe('getLockedAccounts', () => {
    it('should return empty array when database is not available', async () => {
      const result = await getLockedAccounts();
      expect(result).toEqual([]);
    });
  });

  describe('clearFailedAttempts', () => {
    it('should not throw when database is not available', async () => {
      await expect(clearFailedAttempts('testuser')).resolves.not.toThrow();
    });
  });
});

describe('IP Location', () => {
  describe('getIpLocation', () => {
    it('should return Local Network info for private IP addresses', async () => {
      const result = await getIpLocation('192.168.1.1');
      expect(result).toEqual({
        country: 'Local Network',
        countryCode: 'LO',
        city: 'Local',
      });
    });

    it('should return Local Network info for localhost', async () => {
      const result = await getIpLocation('127.0.0.1');
      expect(result).toEqual({
        country: 'Local Network',
        countryCode: 'LO',
        city: 'Local',
      });
    });

    it('should return Local Network info for unknown IP', async () => {
      const result = await getIpLocation('unknown');
      expect(result).toEqual({
        country: 'Local Network',
        countryCode: 'LO',
        city: 'Local',
      });
    });
  });
});
