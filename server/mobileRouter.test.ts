import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createAuthContext(userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-open-id-${userId}`,
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext['res'],
  };

  return { ctx };
}

describe('mobile router', () => {
  describe('getNotificationSettings', () => {
    it('should return notification settings', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // This will return default settings since no settings exist
      const result = await caller.mobile.getNotificationSettings();

      expect(result).toHaveProperty('enabled');
      expect(result).toHaveProperty('cpkAlerts');
      expect(result).toHaveProperty('spcAlerts');
      expect(result).toHaveProperty('oeeAlerts');
      expect(result).toHaveProperty('dailyReport');
      expect(result).toHaveProperty('soundEnabled');
      expect(result).toHaveProperty('vibrationEnabled');
    });

    it('should return default values when no settings exist', async () => {
      // Use a unique user ID that won't have existing settings in DB
      const { ctx } = createAuthContext(99999);
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mobile.getNotificationSettings();

      // Default values
      expect(result.enabled).toBe(true);
      expect(result.cpkAlerts).toBe(true);
      expect(result.spcAlerts).toBe(true);
      expect(result.oeeAlerts).toBe(true);
      expect(result.dailyReport).toBe(false);
      expect(result.soundEnabled).toBe(true);
      expect(result.vibrationEnabled).toBe(true);
    });
  });

  describe('getDevices', () => {
    it('should return array of devices', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mobile.getDevices();

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('registerDevice', () => {
    it('should register a new iOS device', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mobile.registerDevice({
        token: 'ExponentPushToken[test-token-' + Date.now() + ']',
        platform: 'ios',
        deviceName: 'iPhone 15',
        deviceModel: 'iPhone15,2',
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });

    it('should register a new Android device', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mobile.registerDevice({
        token: 'fcm-token-' + Date.now(),
        platform: 'android',
        deviceName: 'Samsung Galaxy S24',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mobile.updateNotificationSettings({
        enabled: true,
        cpkAlerts: false,
        spcAlerts: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Settings updated');
    });

    it('should accept partial updates', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.mobile.updateNotificationSettings({
        dailyReport: true,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('unregisterDevice', () => {
    it('should unregister a device', async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // First register a device
      const token = 'test-token-to-unregister-' + Date.now();
      await caller.mobile.registerDevice({
        token,
        platform: 'ios',
      });

      // Then unregister it
      const result = await caller.mobile.unregisterDevice({
        token,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Device unregistered');
    });
  });
});
