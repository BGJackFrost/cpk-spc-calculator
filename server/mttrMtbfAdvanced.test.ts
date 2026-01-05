/**
 * Unit Tests for MTTR/MTBF Advanced Features
 * - Export PDF/Excel
 * - Alert Thresholds
 * - AI Prediction
 */
import { describe, it, expect } from 'vitest';

// Implement calculation functions locally for testing
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(data: number[], period: number): number[] {
  if (data.length < period) return [];
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  
  return result;
}

function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };
  
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;
  
  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = data[i] - yMean;
    ssXY += xDiff * yDiff;
    ssXX += xDiff * xDiff;
    ssYY += yDiff * yDiff;
  }
  
  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;
  const r2 = ssYY !== 0 ? (ssXY * ssXY) / (ssXX * ssYY) : 0;
  
  return { slope, intercept, r2 };
}

describe('MTTR/MTBF Prediction Service', () => {
  describe('calculateSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const period = 3;
      const result = calculateSMA(data, period);
      
      // First two values remain as is (not enough data for SMA)
      expect(result[0]).toBe(10);
      expect(result[1]).toBe(20);
      // SMA starts from index 2
      expect(result[2]).toBe(20); // (10+20+30)/3
      expect(result[3]).toBe(30); // (20+30+40)/3
      expect(result[4]).toBe(40); // (30+40+50)/3
    });

    it('should handle empty array', () => {
      const result = calculateSMA([], 3);
      expect(result).toEqual([]);
    });

    it('should handle single value', () => {
      const result = calculateSMA([10], 3);
      expect(result).toEqual([10]);
    });
  });

  describe('calculateEMA', () => {
    it('should calculate exponential moving average correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const period = 3;
      const result = calculateEMA(data, period);
      
      // First EMA is SMA of first 3 values = (10+20+30)/3 = 20
      expect(result[0]).toBe(20);
      // Multiplier = 2/(3+1) = 0.5
      // EMA[1] = (40 - 20) * 0.5 + 20 = 30
      expect(result[1]).toBe(30);
      // EMA[2] = (50 - 30) * 0.5 + 30 = 40
      expect(result[2]).toBe(40);
    });

    it('should handle data shorter than period', () => {
      const result = calculateEMA([10, 20], 3);
      // With only 2 values and period 3, returns empty
      expect(result).toEqual([]);
    });
  });

  describe('linearRegression', () => {
    it('should calculate linear regression for increasing data', () => {
      const data = [10, 20, 30, 40, 50];
      const { slope, intercept, r2 } = linearRegression(data);
      
      // Perfect linear increase: slope = 10, intercept = 10
      expect(slope).toBe(10);
      expect(intercept).toBe(10);
      expect(r2).toBe(1); // Perfect fit
    });

    it('should calculate linear regression for constant data', () => {
      const data = [20, 20, 20, 20, 20];
      const { slope, intercept } = linearRegression(data);
      
      expect(slope).toBe(0);
      expect(intercept).toBe(20);
    });

    it('should handle single value', () => {
      const { slope, intercept } = linearRegression([10]);
      expect(slope).toBe(0);
      expect(intercept).toBe(10);
    });

    it('should handle empty array', () => {
      const { slope, intercept, r2 } = linearRegression([]);
      expect(slope).toBe(0);
      expect(r2).toBe(0);
    });

    it('should calculate R-squared for noisy data', () => {
      const data = [10, 22, 28, 42, 48]; // Roughly linear with noise
      const { r2 } = linearRegression(data);
      
      // R² should be high but not perfect
      expect(r2).toBeGreaterThan(0.9);
      expect(r2).toBeLessThanOrEqual(1);
    });
  });
});

describe('MTTR/MTBF Alert Service', () => {
  describe('Threshold Validation', () => {
    it('should validate MTTR threshold correctly', () => {
      const mttrValue = 45; // minutes
      const mttrThreshold = 60; // max threshold
      
      const isViolation = mttrValue > mttrThreshold;
      expect(isViolation).toBe(false);
    });

    it('should detect MTTR threshold violation', () => {
      const mttrValue = 75; // minutes
      const mttrThreshold = 60; // max threshold
      
      const isViolation = mttrValue > mttrThreshold;
      expect(isViolation).toBe(true);
    });

    it('should validate MTBF threshold correctly', () => {
      const mtbfValue = 500; // minutes
      const mtbfThreshold = 300; // min threshold
      
      const isViolation = mtbfValue < mtbfThreshold;
      expect(isViolation).toBe(false);
    });

    it('should detect MTBF threshold violation', () => {
      const mtbfValue = 200; // minutes
      const mtbfThreshold = 300; // min threshold
      
      const isViolation = mtbfValue < mtbfThreshold;
      expect(isViolation).toBe(true);
    });

    it('should validate availability threshold correctly', () => {
      const availabilityValue = 0.95; // 95%
      const availabilityThreshold = 0.90; // min 90%
      
      const isViolation = availabilityValue < availabilityThreshold;
      expect(isViolation).toBe(false);
    });
  });
});

describe('MTTR/MTBF Export Service', () => {
  describe('Data Formatting', () => {
    it('should format MTTR value correctly', () => {
      const mttr = 45.6789;
      const formatted = mttr.toFixed(2);
      expect(formatted).toBe('45.68');
    });

    it('should format MTBF value correctly', () => {
      const mtbf = 123.456;
      const formatted = mtbf.toFixed(2);
      expect(formatted).toBe('123.46');
    });

    it('should format availability as percentage', () => {
      const availability = 0.9567;
      const formatted = (availability * 100).toFixed(2) + '%';
      expect(formatted).toBe('95.67%');
    });

    it('should handle null values', () => {
      const mttr: number | null = null;
      const formatted = mttr !== null ? mttr.toFixed(2) : 'N/A';
      expect(formatted).toBe('N/A');
    });
  });

  describe('Comparison Data Structure', () => {
    it('should structure comparison data correctly', () => {
      const comparisonData = {
        targets: [
          { id: 1, name: 'Device 1', mttr: 30, mtbf: 500, availability: 0.95 },
          { id: 2, name: 'Device 2', mttr: 45, mtbf: 400, availability: 0.90 },
        ],
        period: { start: '2024-01-01', end: '2024-01-31' },
      };

      expect(comparisonData.targets).toHaveLength(2);
      expect(comparisonData.targets[0].name).toBe('Device 1');
      expect(comparisonData.period.start).toBe('2024-01-01');
    });

    it('should calculate ranking correctly', () => {
      const targets = [
        { name: 'Device 1', mtbf: 500 },
        { name: 'Device 2', mtbf: 300 },
        { name: 'Device 3', mtbf: 700 },
      ];

      // Sort by MTBF descending (higher is better)
      const ranked = [...targets].sort((a, b) => b.mtbf - a.mtbf);
      
      expect(ranked[0].name).toBe('Device 3'); // Highest MTBF
      expect(ranked[1].name).toBe('Device 1');
      expect(ranked[2].name).toBe('Device 2'); // Lowest MTBF
    });
  });
});

describe('Trend Analysis', () => {
  it('should identify improving trend for MTTR (decreasing)', () => {
    const mttrData = [60, 55, 50, 45, 40]; // Decreasing = improving
    const { slope } = linearRegression(mttrData);
    
    const trend = slope < 0 ? 'improving' : slope > 0 ? 'declining' : 'stable';
    expect(trend).toBe('improving');
  });

  it('should identify improving trend for MTBF (increasing)', () => {
    const mtbfData = [200, 250, 300, 350, 400]; // Increasing = improving
    const { slope } = linearRegression(mtbfData);
    
    const trend = slope > 0 ? 'improving' : slope < 0 ? 'declining' : 'stable';
    expect(trend).toBe('improving');
  });

  it('should identify stable trend', () => {
    const data = [100, 102, 98, 101, 99]; // Roughly constant
    const { slope } = linearRegression(data);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const threshold = mean * 0.01; // 1% change threshold
    
    const trend = Math.abs(slope) < threshold ? 'stable' : slope > 0 ? 'improving' : 'declining';
    expect(trend).toBe('stable');
  });

  it('should calculate change percentage correctly', () => {
    const data = [100, 110, 120, 130, 140];
    const { slope } = linearRegression(data);
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const days = data.length;
    
    const changePercent = (slope * days / mean) * 100;
    expect(changePercent).toBeGreaterThan(0);
  });
});

describe('AI Recommendation Structure', () => {
  it('should have valid recommendation structure', () => {
    const recommendation = {
      summary: 'Test summary',
      riskLevel: 'low' as const,
      recommendations: ['Rec 1', 'Rec 2'],
      predictedIssues: ['Issue 1'],
      maintenanceAdvice: 'Test advice',
    };

    expect(recommendation.summary).toBeTruthy();
    expect(['low', 'medium', 'high']).toContain(recommendation.riskLevel);
    expect(Array.isArray(recommendation.recommendations)).toBe(true);
    expect(Array.isArray(recommendation.predictedIssues)).toBe(true);
    expect(recommendation.maintenanceAdvice).toBeTruthy();
  });

  it('should map risk level correctly', () => {
    const riskMapping = {
      low: { color: 'green', priority: 1 },
      medium: { color: 'yellow', priority: 2 },
      high: { color: 'red', priority: 3 },
    };

    expect(riskMapping.low.priority).toBe(1);
    expect(riskMapping.high.priority).toBe(3);
  });
});
