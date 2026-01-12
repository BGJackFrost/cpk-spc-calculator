import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      setHeader: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe('Camera Capture Schedule Router', () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  describe('list', () => {
    it('should return list with items and total', async () => {
      const result = await caller.cameraCaptureSchedule.list();
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should support pagination parameters', async () => {
      const result = await caller.cameraCaptureSchedule.list({
        limit: 10,
        offset: 0,
      });
      expect(result).toBeDefined();
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should filter by isEnabled', async () => {
      const result = await caller.cameraCaptureSchedule.list({
        isEnabled: true,
      });
      expect(result).toBeDefined();
      // All returned items should be enabled
      result.items.forEach(item => {
        expect(item.isEnabled).toBe(true);
      });
    });
  });

  describe('getLogs', () => {
    it('should return capture logs', async () => {
      const result = await caller.cameraCaptureSchedule.getLogs();
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should support filtering by status', async () => {
      const result = await caller.cameraCaptureSchedule.getLogs({
        status: 'success',
      });
      expect(result).toBeDefined();
      // All returned items should have success status
      result.items.forEach(item => {
        expect(item.status).toBe('success');
      });
    });
  });

  describe('getStats', () => {
    it('should return statistics with correct structure', async () => {
      const result = await caller.cameraCaptureSchedule.getStats();
      expect(result).toBeDefined();
      expect(typeof result.total).toBe('number');
      expect(typeof result.success).toBe('number');
      expect(typeof result.failed).toBe('number');
      expect(typeof result.okCount).toBe('number');
      expect(typeof result.ngCount).toBe('number');
    });
  });

  describe('getEnabledSchedules', () => {
    it('should return only enabled schedules', async () => {
      const result = await caller.cameraCaptureSchedule.getEnabledSchedules();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // All returned schedules should be enabled
      result.forEach(schedule => {
        expect(schedule.isEnabled).toBe(true);
      });
    });
  });
});

describe('Quality Statistics Router', () => {
  const ctx = createAuthContext();
  const caller = appRouter.createCaller(ctx);

  describe('getStatistics', () => {
    it('should return quality statistics with correct structure', async () => {
      const result = await caller.qualityStatistics.getStatistics({
        periodType: 'daily',
      });
      expect(result).toBeDefined();
      expect(typeof result.totalSamples).toBe('number');
      expect(typeof result.okCount).toBe('number');
      expect(typeof result.ngCount).toBe('number');
      expect(typeof result.okRate).toBe('number');
      expect(typeof result.ngRate).toBe('number');
      expect(typeof result.avgQualityScore).toBe('number');
    });

    it('should support different period types', async () => {
      const dailyResult = await caller.qualityStatistics.getStatistics({
        periodType: 'daily',
      });
      const weeklyResult = await caller.qualityStatistics.getStatistics({
        periodType: 'weekly',
      });
      const monthlyResult = await caller.qualityStatistics.getStatistics({
        periodType: 'monthly',
      });

      expect(dailyResult).toBeDefined();
      expect(weeklyResult).toBeDefined();
      expect(monthlyResult).toBeDefined();
    });
  });

  describe('getTrendData', () => {
    it('should return trend data array', async () => {
      const result = await caller.qualityStatistics.getTrendData({
        periodType: 'daily',
        periods: 7,
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(7);

      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('totalSamples');
        expect(item).toHaveProperty('okCount');
        expect(item).toHaveProperty('ngCount');
        expect(item).toHaveProperty('okRate');
        expect(item).toHaveProperty('avgQualityScore');
      }
    });
  });

  describe('getLineComparison', () => {
    it('should return comparison data for production lines', async () => {
      const result = await caller.qualityStatistics.getLineComparison({});
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty('lineId');
        expect(item).toHaveProperty('lineName');
        expect(item).toHaveProperty('totalSamples');
        expect(item).toHaveProperty('okRate');
      }
    });
  });

  describe('getProductComparison', () => {
    it('should return comparison data for products', async () => {
      const result = await caller.qualityStatistics.getProductComparison({});
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty('productId');
        expect(item).toHaveProperty('productName');
        expect(item).toHaveProperty('totalSamples');
        expect(item).toHaveProperty('okRate');
      }
    });
  });

  describe('getDefectDistribution', () => {
    it('should return defect distribution data', async () => {
      const result = await caller.qualityStatistics.getDefectDistribution({});
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('count');
        expect(item).toHaveProperty('percentage');
      }
    });
  });

  describe('getCpkTrend', () => {
    it('should return CPK trend data', async () => {
      const result = await caller.qualityStatistics.getCpkTrend({
        periodType: 'daily',
        periods: 7,
      });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length > 0) {
        const item = result[0];
        expect(item).toHaveProperty('date');
        expect(item).toHaveProperty('avgCpk');
        expect(item).toHaveProperty('minCpk');
        expect(item).toHaveProperty('maxCpk');
        expect(item).toHaveProperty('sampleCount');
      }
    });
  });
});
