/**
 * Tests for paretoChartRouter
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

describe('paretoChartRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDefectPareto', () => {
    it('should be defined with correct procedures', async () => {
      const { paretoChartRouter } = await import('./paretoChartRouter');
      
      expect(paretoChartRouter).toBeDefined();
      expect(paretoChartRouter.getDefectPareto).toBeDefined();
      expect(paretoChartRouter.getDashboardSummary).toBeDefined();
    });
  });
});

describe('Pareto Analysis Logic', () => {
  it('should correctly calculate cumulative percentages', () => {
    const defects = [
      { count: 50, name: 'A' },
      { count: 30, name: 'B' },
      { count: 15, name: 'C' },
      { count: 5, name: 'D' },
    ];
    
    const total = defects.reduce((sum, d) => sum + d.count, 0);
    let cumulative = 0;
    
    const result = defects.map(d => {
      const percentage = (d.count / total) * 100;
      cumulative += d.count;
      const cumulativePercentage = (cumulative / total) * 100;
      return {
        ...d,
        percentage: Math.round(percentage * 100) / 100,
        cumulativePercentage: Math.round(cumulativePercentage * 100) / 100,
        isIn80Percent: cumulativePercentage <= 80,
      };
    });
    
    expect(result[0].percentage).toBe(50);
    expect(result[0].cumulativePercentage).toBe(50);
    expect(result[0].isIn80Percent).toBe(true);
    
    expect(result[1].percentage).toBe(30);
    expect(result[1].cumulativePercentage).toBe(80);
    expect(result[1].isIn80Percent).toBe(true);
    
    expect(result[2].percentage).toBe(15);
    expect(result[2].cumulativePercentage).toBe(95);
    expect(result[2].isIn80Percent).toBe(false);
  });

  it('should identify 80% cutoff point correctly', () => {
    const paretoData = [
      { cumulativePercentage: 40 },
      { cumulativePercentage: 70 },
      { cumulativePercentage: 85 },
      { cumulativePercentage: 95 },
      { cumulativePercentage: 100 },
    ];
    
    const cutoffIndex = paretoData.findIndex(d => d.cumulativePercentage > 80);
    const itemsIn80Percent = cutoffIndex === -1 ? paretoData.length : cutoffIndex + 1;
    
    expect(cutoffIndex).toBe(2);
    expect(itemsIn80Percent).toBe(3);
  });
});
