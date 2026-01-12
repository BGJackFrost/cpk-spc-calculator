/**
 * Tests for heatMapYieldRouter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(() => null),
}));

// Mock trpc
vi.mock('../_core/trpc', () => ({
  router: vi.fn((routes) => routes),
  publicProcedure: {
    input: vi.fn(() => ({
      query: vi.fn((fn) => fn),
      mutation: vi.fn((fn) => fn),
    })),
  },
  protectedProcedure: {
    input: vi.fn(() => ({
      query: vi.fn((fn) => fn),
      mutation: vi.fn((fn) => fn),
    })),
  },
}));

describe('heatMapYieldRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFloorPlanYield', () => {
    it('should be defined with correct procedures', async () => {
      const { heatMapYieldRouter } = await import('./heatMapYieldRouter');
      
      expect(heatMapYieldRouter).toBeDefined();
      expect(heatMapYieldRouter.getFloorPlanYield).toBeDefined();
      expect(heatMapYieldRouter.getTopProblemZones).toBeDefined();
      expect(heatMapYieldRouter.getYieldTrend).toBeDefined();
    });
  });
});

describe('Yield Color Helper Functions', () => {
  it('should return correct colors based on yield rate thresholds', () => {
    const getYieldColor = (yieldRate: number): string => {
      if (yieldRate >= 98) return '#22c55e';
      if (yieldRate >= 95) return '#84cc16';
      if (yieldRate >= 90) return '#eab308';
      if (yieldRate >= 85) return '#f97316';
      return '#ef4444';
    };

    expect(getYieldColor(99)).toBe('#22c55e');
    expect(getYieldColor(98)).toBe('#22c55e');
    expect(getYieldColor(96)).toBe('#84cc16');
    expect(getYieldColor(92)).toBe('#eab308');
    expect(getYieldColor(87)).toBe('#f97316');
    expect(getYieldColor(80)).toBe('#ef4444');
  });

  it('should return correct status labels based on yield rate', () => {
    const getYieldStatus = (yieldRate: number): string => {
      if (yieldRate >= 98) return 'Xuất sắc';
      if (yieldRate >= 95) return 'Tốt';
      if (yieldRate >= 90) return 'Cảnh báo';
      if (yieldRate >= 85) return 'Quan ngại';
      return 'Nghiêm trọng';
    };

    expect(getYieldStatus(99)).toBe('Xuất sắc');
    expect(getYieldStatus(96)).toBe('Tốt');
    expect(getYieldStatus(92)).toBe('Cảnh báo');
    expect(getYieldStatus(87)).toBe('Quan ngại');
    expect(getYieldStatus(80)).toBe('Nghiêm trọng');
  });
});
