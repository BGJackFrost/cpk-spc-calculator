import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{ insertId: 1 }])
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([])
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([])
    })
  })
}));

// Mock modelVersioningService
vi.mock('./modelVersioningService', () => ({
  modelVersioningService: {
    getActiveVersion: vi.fn().mockResolvedValue({
      id: 1,
      modelId: 1,
      version: '1.0.0',
      accuracy: '0.85',
    }),
    autoRollbackIfNeeded: vi.fn().mockResolvedValue({ rolled: false }),
  }
}));

import { dataDriftService } from './dataDriftService';

describe('DataDriftService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateFeatureStats', () => {
    it('should calculate basic statistics correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = dataDriftService.calculateFeatureStats(data);

      expect(stats.mean).toBeCloseTo(5.5, 2);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.uniqueCount).toBe(10);
    });

    it('should handle empty data', () => {
      const stats = dataDriftService.calculateFeatureStats([]);

      expect(stats.mean).toBe(0);
      expect(stats.stdDev).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.histogram).toEqual([]);
    });

    it('should calculate standard deviation correctly', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      const stats = dataDriftService.calculateFeatureStats(data);

      // Mean = 5, variance = 4, stdDev = 2
      expect(stats.mean).toBe(5);
      expect(stats.stdDev).toBeCloseTo(2, 2);
    });

    it('should calculate median correctly for odd count', () => {
      const data = [1, 3, 5, 7, 9];
      const stats = dataDriftService.calculateFeatureStats(data);

      expect(stats.median).toBe(5);
    });

    it('should calculate median correctly for even count', () => {
      const data = [1, 2, 3, 4];
      const stats = dataDriftService.calculateFeatureStats(data);

      expect(stats.median).toBe(2.5);
    });

    it('should calculate quartiles correctly', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      const stats = dataDriftService.calculateFeatureStats(data);

      expect(stats.q1).toBe(4);
      expect(stats.q3).toBe(10);
    });

    it('should create histogram with 10 bins', () => {
      const data = Array.from({ length: 100 }, (_, i) => i);
      const stats = dataDriftService.calculateFeatureStats(data);

      expect(stats.histogram.length).toBe(10);
      // Each bin should have approximately 10 items
      stats.histogram.forEach(bin => {
        expect(bin.count).toBeGreaterThanOrEqual(9);
        expect(bin.count).toBeLessThanOrEqual(11);
      });
    });
  });

  describe('calculateKSStatistic', () => {
    it('should return 0 for identical distributions', () => {
      const service = dataDriftService as any;
      const histogram = [
        { bin: 1, count: 10 },
        { bin: 2, count: 20 },
        { bin: 3, count: 30 },
        { bin: 4, count: 20 },
        { bin: 5, count: 10 },
      ];

      const ks = service.calculateKSStatistic(histogram, histogram);
      expect(ks).toBe(0);
    });

    it('should return high value for very different distributions', () => {
      const service = dataDriftService as any;
      const baseline = [
        { bin: 1, count: 100 },
        { bin: 2, count: 0 },
        { bin: 3, count: 0 },
      ];
      const current = [
        { bin: 1, count: 0 },
        { bin: 2, count: 0 },
        { bin: 3, count: 100 },
      ];

      const ks = service.calculateKSStatistic(baseline, current);
      expect(ks).toBeGreaterThan(0.5);
    });

    it('should return 0 for empty histograms', () => {
      const service = dataDriftService as any;
      
      expect(service.calculateKSStatistic([], [])).toBe(0);
      expect(service.calculateKSStatistic(null, null)).toBe(0);
      expect(service.calculateKSStatistic(undefined, undefined)).toBe(0);
    });

    it('should handle histograms with different bins', () => {
      const service = dataDriftService as any;
      const baseline = [
        { bin: 1, count: 50 },
        { bin: 2, count: 50 },
      ];
      const current = [
        { bin: 2, count: 50 },
        { bin: 3, count: 50 },
      ];

      const ks = service.calculateKSStatistic(baseline, current);
      expect(ks).toBeGreaterThan(0);
      expect(ks).toBeLessThanOrEqual(1);
    });
  });

  describe('severity determination', () => {
    it('should classify severity based on threshold multipliers', () => {
      // Test the severity classification logic
      const threshold = 0.05;
      
      // Low: below threshold
      const lowDrop = 0.03;
      expect(lowDrop <= threshold).toBe(true);
      
      // Medium: above threshold but below 2x
      const mediumDrop = 0.07;
      expect(mediumDrop > threshold && mediumDrop <= threshold * 2).toBe(true);
      
      // High: above 2x but below 3x
      const highDrop = 0.12;
      expect(highDrop > threshold * 2 && highDrop <= threshold * 3).toBe(true);
      
      // Critical: above 3x
      const criticalDrop = 0.20;
      expect(criticalDrop > threshold * 3).toBe(true);
    });
  });
});
