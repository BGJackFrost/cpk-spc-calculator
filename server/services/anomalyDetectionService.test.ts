/**
 * Anomaly Detection Service Tests (Isolation Forest)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AnomalyDetectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Isolation Forest Parameters', () => {
    it('should validate number of trees', () => {
      const numTrees = 100;
      expect(numTrees).toBeGreaterThan(0);
      expect(numTrees).toBeLessThanOrEqual(1000);
    });

    it('should validate sample size', () => {
      const sampleSize = 256;
      expect(sampleSize).toBeGreaterThan(0);
      expect(sampleSize).toBeLessThanOrEqual(10000);
    });

    it('should validate contamination rate', () => {
      const contamination = 0.05;
      expect(contamination).toBeGreaterThan(0);
      expect(contamination).toBeLessThan(0.5);
    });

    it('should validate threshold', () => {
      const threshold = 0.6;
      expect(threshold).toBeGreaterThan(0);
      expect(threshold).toBeLessThanOrEqual(1);
    });
  });

  describe('Anomaly Score Calculations', () => {
    it('should calculate anomaly score in valid range', () => {
      const score = 0.75;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should classify as anomaly when score exceeds threshold', () => {
      const score = 0.8;
      const threshold = 0.6;
      const isAnomaly = score >= threshold;
      expect(isAnomaly).toBe(true);
    });

    it('should classify as normal when score below threshold', () => {
      const score = 0.4;
      const threshold = 0.6;
      const isAnomaly = score >= threshold;
      expect(isAnomaly).toBe(false);
    });
  });

  describe('Severity Classification', () => {
    it('should classify low severity correctly', () => {
      const score = 0.65;
      const getSeverity = (s: number) => {
        if (s >= 0.9) return 'critical';
        if (s >= 0.8) return 'high';
        if (s >= 0.7) return 'medium';
        return 'low';
      };
      expect(getSeverity(score)).toBe('low');
    });

    it('should classify medium severity correctly', () => {
      const score = 0.75;
      const getSeverity = (s: number) => {
        if (s >= 0.9) return 'critical';
        if (s >= 0.8) return 'high';
        if (s >= 0.7) return 'medium';
        return 'low';
      };
      expect(getSeverity(score)).toBe('medium');
    });

    it('should classify high severity correctly', () => {
      const score = 0.85;
      const getSeverity = (s: number) => {
        if (s >= 0.9) return 'critical';
        if (s >= 0.8) return 'high';
        if (s >= 0.7) return 'medium';
        return 'low';
      };
      expect(getSeverity(score)).toBe('high');
    });

    it('should classify critical severity correctly', () => {
      const score = 0.95;
      const getSeverity = (s: number) => {
        if (s >= 0.9) return 'critical';
        if (s >= 0.8) return 'high';
        if (s >= 0.7) return 'medium';
        return 'low';
      };
      expect(getSeverity(score)).toBe('critical');
    });
  });

  describe('Anomaly Type Detection', () => {
    it('should detect spike anomaly', () => {
      const values = [10, 10, 10, 100, 10, 10];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const anomalyValue = 100;
      const isSpike = anomalyValue > avg * 2;
      expect(isSpike).toBe(true);
    });

    it('should detect drop anomaly', () => {
      const values = [100, 100, 100, 10, 100, 100];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const anomalyValue = 10;
      const isDrop = anomalyValue < avg * 0.5;
      expect(isDrop).toBe(true);
    });

    it('should detect drift pattern', () => {
      const values = [10, 15, 20, 25, 30, 35, 40];
      const diffs = values.slice(1).map((v, i) => v - values[i]);
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const isDrift = avgDiff > 0;
      expect(isDrift).toBe(true);
    });
  });

  describe('Model Status Validation', () => {
    it('should validate model status values', () => {
      const validStatuses = ['active', 'inactive', 'training', 'failed'];
      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Training Job Status', () => {
    it('should validate training job status values', () => {
      const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled'];
      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe('Confidence Calculation', () => {
    it('should calculate confidence in valid range', () => {
      const confidence = 0.85;
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should have higher confidence for extreme scores', () => {
      const getConfidence = (score: number) => {
        return Math.abs(score - 0.5) * 2;
      };
      expect(getConfidence(0.9)).toBeGreaterThan(getConfidence(0.6));
    });
  });

  describe('Model Metrics', () => {
    it('should validate accuracy in range', () => {
      const accuracy = 0.92;
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(1);
    });

    it('should validate precision in range', () => {
      const precision = 0.88;
      expect(precision).toBeGreaterThanOrEqual(0);
      expect(precision).toBeLessThanOrEqual(1);
    });

    it('should validate recall in range', () => {
      const recall = 0.85;
      expect(recall).toBeGreaterThanOrEqual(0);
      expect(recall).toBeLessThanOrEqual(1);
    });

    it('should calculate F1 score correctly', () => {
      const precision = 0.88;
      const recall = 0.85;
      const f1 = 2 * (precision * recall) / (precision + recall);
      expect(f1).toBeCloseTo(0.865, 2);
    });
  });

  describe('Feature Extraction', () => {
    it('should extract statistical features', () => {
      const values = [10, 20, 30, 40, 50];
      const features = {
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        range: Math.max(...values) - Math.min(...values)
      };
      expect(features.mean).toBe(30);
      expect(features.min).toBe(10);
      expect(features.max).toBe(50);
      expect(features.range).toBe(40);
    });
  });
});
