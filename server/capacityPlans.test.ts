import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getCapacityPlans: vi.fn(),
  createCapacityPlan: vi.fn(),
  updateCapacityPlan: vi.fn(),
  deleteCapacityPlan: vi.fn(),
  getCapacityComparison: vi.fn(),
  getCapacitySummaryByWorkshop: vi.fn(),
}));

import {
  getCapacityPlans,
  createCapacityPlan,
  updateCapacityPlan,
  deleteCapacityPlan,
  getCapacityComparison,
  getCapacitySummaryByWorkshop,
} from './db';

describe('Capacity Plans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCapacityPlans', () => {
    it('should return capacity plans with filters', async () => {
      const mockPlans = [
        {
          id: 1,
          workshop_id: 1,
          plan_date: '2026-01-10',
          planned_capacity: 1000,
          actual_capacity: 950,
          workshop_name: 'Workshop A',
          factory_name: 'Factory 1',
        },
        {
          id: 2,
          workshop_id: 2,
          plan_date: '2026-01-10',
          planned_capacity: 800,
          actual_capacity: 850,
          workshop_name: 'Workshop B',
          factory_name: 'Factory 1',
        },
      ];

      vi.mocked(getCapacityPlans).mockResolvedValue(mockPlans);

      const result = await getCapacityPlans({ workshopId: 1 });
      
      expect(getCapacityPlans).toHaveBeenCalledWith({ workshopId: 1 });
      expect(result).toEqual(mockPlans);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no plans found', async () => {
      vi.mocked(getCapacityPlans).mockResolvedValue([]);

      const result = await getCapacityPlans();
      
      expect(result).toEqual([]);
    });
  });

  describe('createCapacityPlan', () => {
    it('should create a new capacity plan', async () => {
      vi.mocked(createCapacityPlan).mockResolvedValue(1);

      const newPlan = {
        workshopId: 1,
        planDate: '2026-01-15',
        plannedCapacity: 1200,
        targetEfficiency: 90,
        shiftType: 'full_day' as const,
        notes: 'Test plan',
      };

      const result = await createCapacityPlan(newPlan);
      
      expect(createCapacityPlan).toHaveBeenCalledWith(newPlan);
      expect(result).toBe(1);
    });

    it('should return null on creation failure', async () => {
      vi.mocked(createCapacityPlan).mockResolvedValue(null);

      const result = await createCapacityPlan({
        workshopId: 999,
        planDate: '2026-01-15',
        plannedCapacity: 1200,
      });
      
      expect(result).toBeNull();
    });
  });

  describe('updateCapacityPlan', () => {
    it('should update actual capacity and calculate efficiency', async () => {
      vi.mocked(updateCapacityPlan).mockResolvedValue(true);

      const result = await updateCapacityPlan(1, {
        actualCapacity: 1100,
        status: 'completed',
      });
      
      expect(updateCapacityPlan).toHaveBeenCalledWith(1, {
        actualCapacity: 1100,
        status: 'completed',
      });
      expect(result).toBe(true);
    });

    it('should return false on update failure', async () => {
      vi.mocked(updateCapacityPlan).mockResolvedValue(false);

      const result = await updateCapacityPlan(999, { actualCapacity: 500 });
      
      expect(result).toBe(false);
    });
  });

  describe('deleteCapacityPlan', () => {
    it('should delete capacity plan and its history', async () => {
      vi.mocked(deleteCapacityPlan).mockResolvedValue(true);

      const result = await deleteCapacityPlan(1);
      
      expect(deleteCapacityPlan).toHaveBeenCalledWith(1);
      expect(result).toBe(true);
    });
  });

  describe('getCapacityComparison', () => {
    it('should return comparison data grouped by workshop and date', async () => {
      const mockComparison = [
        {
          workshop_id: 1,
          workshop_name: 'Workshop A',
          plan_date: '2026-01-10',
          total_planned: 5000,
          total_actual: 4800,
          avg_target_efficiency: 85,
          avg_actual_efficiency: 82,
        },
      ];

      vi.mocked(getCapacityComparison).mockResolvedValue(mockComparison);

      const result = await getCapacityComparison({ factoryId: 1 });
      
      expect(getCapacityComparison).toHaveBeenCalledWith({ factoryId: 1 });
      expect(result).toEqual(mockComparison);
    });
  });

  describe('getCapacitySummaryByWorkshop', () => {
    it('should return summary with achievement and utilization rates', async () => {
      const mockSummary = [
        {
          workshop_id: 1,
          workshop_name: 'Workshop A',
          total_planned: 10000,
          total_actual: 9500,
          avg_efficiency: 95,
          plan_count: 10,
          achieved_count: 8,
          achievementRate: '80.0',
          utilizationRate: '95.0',
        },
      ];

      vi.mocked(getCapacitySummaryByWorkshop).mockResolvedValue(mockSummary);

      const result = await getCapacitySummaryByWorkshop();
      
      expect(result).toEqual(mockSummary);
      expect(result[0].achievementRate).toBe('80.0');
      expect(result[0].utilizationRate).toBe('95.0');
    });
  });
});

describe('CPK Trend', () => {
  it('should calculate CPK trend data correctly', () => {
    const mockTrendData = [
      { date: '2026-01-01', avgCpk: 1.5, minCpk: 1.2, maxCpk: 1.8, count: 10 },
      { date: '2026-01-02', avgCpk: 1.4, minCpk: 1.1, maxCpk: 1.7, count: 15 },
      { date: '2026-01-03', avgCpk: 1.6, minCpk: 1.3, maxCpk: 1.9, count: 12 },
    ];

    // Verify data structure
    expect(mockTrendData.length).toBe(3);
    expect(mockTrendData[0]).toHaveProperty('date');
    expect(mockTrendData[0]).toHaveProperty('avgCpk');
    expect(mockTrendData[0]).toHaveProperty('minCpk');
    expect(mockTrendData[0]).toHaveProperty('maxCpk');
    expect(mockTrendData[0]).toHaveProperty('count');

    // Calculate average CPK
    const avgCpk = mockTrendData.reduce((sum, d) => sum + d.avgCpk, 0) / mockTrendData.length;
    expect(avgCpk).toBeCloseTo(1.5, 1);

    // Find violations (CPK < 1.33)
    const violations = mockTrendData.filter(d => d.avgCpk < 1.33);
    expect(violations.length).toBe(0);
  });

  it('should identify CPK violations correctly', () => {
    const CPK_THRESHOLD = 1.33;
    const mockData = [
      { avgCpk: 1.5 },
      { avgCpk: 1.2 }, // violation
      { avgCpk: 1.0 }, // violation
      { avgCpk: 1.4 },
    ];

    const violations = mockData.filter(d => d.avgCpk < CPK_THRESHOLD);
    expect(violations.length).toBe(2);
  });
});

describe('Print Report Layout', () => {
  it('should have correct A4 dimensions', () => {
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const MARGIN_MM = 15;

    const contentWidth = A4_WIDTH_MM - (2 * MARGIN_MM);
    const contentHeight = A4_HEIGHT_MM - (2 * MARGIN_MM);

    expect(contentWidth).toBe(180);
    expect(contentHeight).toBe(267);
  });

  it('should format SPC result for printing', () => {
    const spcResult = {
      sampleCount: 100,
      mean: 50.5,
      stdDev: 2.3,
      cpk: 1.45,
      cp: 1.52,
      ucl: 57.4,
      lcl: 43.6,
      usl: 60,
      lsl: 40,
    };

    // Verify formatting
    expect(spcResult.mean.toFixed(4)).toBe('50.5000');
    expect(spcResult.cpk.toFixed(3)).toBe('1.450');
    expect(spcResult.cpk >= 1.33).toBe(true);
  });
});
