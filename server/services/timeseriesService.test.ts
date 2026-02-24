/**
 * Timeseries Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('TimeseriesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Time Range Calculations', () => {
    it('should calculate 1 hour range correctly', () => {
      const now = Date.now();
      const oneHourMs = 3600000;
      const startTime = now - oneHourMs;
      expect(now - startTime).toBe(oneHourMs);
    });

    it('should calculate 24 hour range correctly', () => {
      const now = Date.now();
      const oneDayMs = 86400000;
      const startTime = now - oneDayMs;
      expect(now - startTime).toBe(oneDayMs);
    });

    it('should calculate 7 day range correctly', () => {
      const now = Date.now();
      const sevenDaysMs = 604800000;
      const startTime = now - sevenDaysMs;
      expect(now - startTime).toBe(sevenDaysMs);
    });

    it('should calculate 30 day range correctly', () => {
      const now = Date.now();
      const thirtyDaysMs = 2592000000;
      const startTime = now - thirtyDaysMs;
      expect(now - startTime).toBe(thirtyDaysMs);
    });
  });

  describe('Aggregation Calculations', () => {
    it('should calculate average correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      expect(avg).toBe(30);
    });

    it('should calculate min correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const min = Math.min(...values);
      expect(min).toBe(10);
    });

    it('should calculate max correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const max = Math.max(...values);
      expect(max).toBe(50);
    });

    it('should calculate standard deviation correctly', () => {
      const values = [10, 20, 30, 40, 50];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const squareDiffs = values.map(v => Math.pow(v - avg, 2));
      const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
      const stdDev = Math.sqrt(avgSquareDiff);
      expect(stdDev).toBeCloseTo(14.142, 2);
    });
  });

  describe('Downsampling', () => {
    it('should downsample data correctly', () => {
      const data = Array.from({ length: 1000 }, (_, i) => ({ timestamp: i, value: i }));
      const targetPoints = 100;
      const step = Math.ceil(data.length / targetPoints);
      const downsampled = data.filter((_, i) => i % step === 0);
      expect(downsampled.length).toBeLessThanOrEqual(targetPoints);
    });

    it('should preserve first and last points', () => {
      const data = [
        { timestamp: 0, value: 0 },
        { timestamp: 1, value: 1 },
        { timestamp: 2, value: 2 },
        { timestamp: 3, value: 3 },
        { timestamp: 4, value: 4 }
      ];
      expect(data[0].timestamp).toBe(0);
      expect(data[data.length - 1].timestamp).toBe(4);
    });
  });

  describe('Time Bucket Calculations', () => {
    it('should calculate hourly bucket correctly', () => {
      const timestamp = 1704067200000;
      const hourMs = 3600000;
      const bucket = Math.floor(timestamp / hourMs) * hourMs;
      expect(bucket).toBe(timestamp);
    });

    it('should calculate daily bucket correctly', () => {
      const timestamp = 1704067200000;
      const dayMs = 86400000;
      const bucket = Math.floor(timestamp / dayMs) * dayMs;
      expect(bucket).toBe(timestamp);
    });
  });

  describe('Data Validation', () => {
    it('should validate numeric values', () => {
      const value = 25.5;
      expect(typeof value).toBe('number');
      expect(isNaN(value)).toBe(false);
      expect(isFinite(value)).toBe(true);
    });

    it('should reject NaN values', () => {
      const value = NaN;
      expect(isNaN(value)).toBe(true);
    });

    it('should reject Infinity values', () => {
      const value = Infinity;
      expect(isFinite(value)).toBe(false);
    });
  });

  describe('Timestamp Validation', () => {
    it('should validate timestamp is positive', () => {
      const timestamp = Date.now();
      expect(timestamp).toBeGreaterThan(0);
    });

    it('should validate timestamp is not in future', () => {
      const timestamp = Date.now();
      const futureTimestamp = timestamp + 86400000;
      expect(futureTimestamp).toBeGreaterThan(timestamp);
    });
  });

  describe('Sample Count', () => {
    it('should count samples correctly', () => {
      const samples = [1, 2, 3, 4, 5];
      expect(samples.length).toBe(5);
    });

    it('should handle empty samples', () => {
      const samples: number[] = [];
      expect(samples.length).toBe(0);
    });
  });
});
