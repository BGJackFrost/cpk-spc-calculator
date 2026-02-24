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
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([])
            })
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

import { abTestingService } from './abTestingService';

describe('ABTestingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('selectModelForPrediction', () => {
    it('should select model A or B based on traffic split', () => {
      const test = {
        id: 1,
        name: 'Test',
        modelAId: 1,
        modelBId: 2,
        trafficSplitA: 50,
        trafficSplitB: 50,
        status: 'running' as const,
        minSampleSize: 100,
        confidenceLevel: '0.95',
        createdAt: new Date(),
      };

      // Run multiple times to verify distribution
      const results = { A: 0, B: 0 };
      for (let i = 0; i < 1000; i++) {
        const selection = abTestingService.selectModelForPrediction(test as any);
        results[selection.variant]++;
      }

      // With 50/50 split, expect roughly equal distribution (within 10%)
      expect(results.A).toBeGreaterThan(400);
      expect(results.A).toBeLessThan(600);
      expect(results.B).toBeGreaterThan(400);
      expect(results.B).toBeLessThan(600);
    });

    it('should respect traffic split percentages', () => {
      const test = {
        id: 1,
        name: 'Test',
        modelAId: 1,
        modelBId: 2,
        trafficSplitA: 80,
        trafficSplitB: 20,
        status: 'running' as const,
        minSampleSize: 100,
        confidenceLevel: '0.95',
        createdAt: new Date(),
      };

      const results = { A: 0, B: 0 };
      for (let i = 0; i < 1000; i++) {
        const selection = abTestingService.selectModelForPrediction(test as any);
        results[selection.variant]++;
      }

      // With 80/20 split, expect A to be significantly higher
      expect(results.A).toBeGreaterThan(700);
      expect(results.B).toBeLessThan(300);
    });
  });

  describe('normalCDF', () => {
    it('should calculate normal CDF correctly', () => {
      // Access private method through any
      const service = abTestingService as any;
      
      // Standard normal distribution values
      expect(service.normalCDF(0)).toBeCloseTo(0.5, 2);
      expect(service.normalCDF(1)).toBeCloseTo(0.8413, 2);
      expect(service.normalCDF(-1)).toBeCloseTo(0.1587, 2);
      expect(service.normalCDF(2)).toBeCloseTo(0.9772, 2);
    });
  });

  describe('determineWinner', () => {
    it('should return not significant when sample size is too small', () => {
      const service = abTestingService as any;
      
      const statsA = {
        modelId: 1,
        modelName: 'Model A',
        totalPredictions: 20, // Less than 30
        correctPredictions: 15,
        accuracy: 0.75,
        meanError: 0.1,
        meanAbsoluteError: 0.1,
        rootMeanSquaredError: 0.15,
        avgResponseTime: 100,
      };

      const statsB = {
        modelId: 2,
        modelName: 'Model B',
        totalPredictions: 25, // Less than 30
        correctPredictions: 18,
        accuracy: 0.72,
        meanError: 0.12,
        meanAbsoluteError: 0.12,
        rootMeanSquaredError: 0.18,
        avgResponseTime: 110,
      };

      const result = service.determineWinner(statsA, statsB, 0.95);
      expect(result.isSignificant).toBe(false);
    });

    it('should determine winner based on accuracy when available', () => {
      const service = abTestingService as any;
      
      const statsA = {
        modelId: 1,
        modelName: 'Model A',
        totalPredictions: 1000,
        correctPredictions: 800,
        accuracy: 0.80,
        meanError: 0.1,
        meanAbsoluteError: 0.1,
        rootMeanSquaredError: 0.15,
        avgResponseTime: 100,
      };

      const statsB = {
        modelId: 2,
        modelName: 'Model B',
        totalPredictions: 1000,
        correctPredictions: 600,
        accuracy: 0.60,
        meanError: 0.2,
        meanAbsoluteError: 0.2,
        rootMeanSquaredError: 0.25,
        avgResponseTime: 110,
      };

      const result = service.determineWinner(statsA, statsB, 0.95);
      expect(result.winner).toBe('A');
      expect(result.isSignificant).toBe(true);
    });

    it('should handle close accuracies appropriately', () => {
      const service = abTestingService as any;
      
      const statsA = {
        modelId: 1,
        modelName: 'Model A',
        totalPredictions: 1000,
        correctPredictions: 750,
        accuracy: 0.75,
        meanError: 0.1,
        meanAbsoluteError: 0.1,
        rootMeanSquaredError: 0.15,
        avgResponseTime: 100,
      };

      const statsB = {
        modelId: 2,
        modelName: 'Model B',
        totalPredictions: 1000,
        correctPredictions: 749,
        accuracy: 0.749,
        meanError: 0.101,
        meanAbsoluteError: 0.101,
        rootMeanSquaredError: 0.151,
        avgResponseTime: 101,
      };

      const result = service.determineWinner(statsA, statsB, 0.95);
      // When accuracies are very close, result should be valid
      expect(result).toBeDefined();
      expect(typeof result.isSignificant).toBe('boolean');
    });
  });
});
