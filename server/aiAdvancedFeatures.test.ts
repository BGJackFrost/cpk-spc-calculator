/**
 * AI Advanced Features Tests
 * Tests for Export Drift Report, Auto-scaling Threshold, and AI/ML Health Dashboard
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateDriftReportHtml,
  generateDriftReportExcel,
  generateDriftRecommendations,
  type DriftReportData
} from './services/driftReportExportService';
import {
  calculateAutoScalingThresholds,
  getDefaultThresholdConfig,
  validateThresholdConfig,
  analyzeThresholdEffectiveness,
  suggestOptimalAlgorithm,
  type ThresholdConfig,
  type HistoricalMetrics
} from './services/autoScalingThresholdService';

// ========== Drift Report Export Tests ==========
describe('Drift Report Export Service', () => {
  const mockReportData: DriftReportData = {
    modelId: '1',
    modelName: 'Test Model',
    reportPeriod: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    },
    summary: {
      totalChecks: 100,
      alertsTriggered: 5,
      avgAccuracy: 0.92,
      avgAccuracyDrop: 0.03,
      avgFeatureDrift: 0.05,
      avgPredictionDrift: 0.04,
      maxSeverity: 'medium'
    },
    metricsHistory: [
      { timestamp: new Date('2024-01-15'), accuracy: 0.95, accuracyDrop: 0.02, featureDrift: 0.03, predictionDrift: 0.02, severity: 'low' },
      { timestamp: new Date('2024-01-20'), accuracy: 0.90, accuracyDrop: 0.05, featureDrift: 0.08, predictionDrift: 0.06, severity: 'medium' }
    ],
    alerts: [
      { id: '1', timestamp: new Date('2024-01-20'), alertType: 'accuracy_drop', severity: 'medium', message: 'Accuracy dropped below threshold', acknowledged: false }
    ],
    recommendations: []
  };

  describe('generateDriftReportHtml', () => {
    it('should generate valid HTML report', () => {
      const html = generateDriftReportHtml(mockReportData);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test Model');
      expect(html).toContain('Báo cáo Drift Check'); // Vietnamese title
    });

    it('should include summary statistics', () => {
      const html = generateDriftReportHtml(mockReportData);
      expect(html).toContain('100'); // totalChecks
      expect(html).toContain('92'); // avgAccuracy as percentage
    });

    it('should include metrics history table', () => {
      const html = generateDriftReportHtml(mockReportData);
      expect(html).toContain('<table');
      expect(html).toContain('Accuracy');
    });

    it('should include alerts section', () => {
      const html = generateDriftReportHtml(mockReportData);
      expect(html).toContain('accuracy_drop');
      expect(html).toContain('medium');
    });
  });

  describe('generateDriftReportExcel', () => {
    it('should generate Excel buffer', async () => {
      const buffer = await generateDriftReportExcel(mockReportData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should create valid Excel file structure', async () => {
      const buffer = await generateDriftReportExcel(mockReportData);
      // Excel files start with PK signature (ZIP format)
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4B); // K
    });
  });

  describe('generateDriftRecommendations', () => {
    it('should generate recommendations for high accuracy drop', () => {
      const dataWithHighDrop: DriftReportData = {
        ...mockReportData,
        summary: { ...mockReportData.summary, avgAccuracyDrop: 0.15 }
      };
      const recommendations = generateDriftRecommendations(dataWithHighDrop);
      expect(recommendations.length).toBeGreaterThan(0);
      // Check for accuracy drop related recommendation
      expect(recommendations.some(r => r.includes('accuracy') || r.includes('giảm'))).toBe(true);
    });

    it('should generate recommendations for high feature drift', () => {
      const dataWithHighDrift: DriftReportData = {
        ...mockReportData,
        summary: { ...mockReportData.summary, avgFeatureDrift: 0.25 }
      };
      const recommendations = generateDriftRecommendations(dataWithHighDrift);
      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should return fewer recommendations for healthy model', () => {
      const healthyData: DriftReportData = {
        ...mockReportData,
        summary: {
          ...mockReportData.summary,
          avgAccuracy: 0.95,
          avgAccuracyDrop: 0.01,
          avgFeatureDrift: 0.02,
          avgPredictionDrift: 0.01,
          alertsTriggered: 0
        }
      };
      const recommendations = generateDriftRecommendations(healthyData);
      // Healthy model should have fewer recommendations
      expect(recommendations.length).toBeLessThan(5);
    });
  });
});

// ========== Auto-scaling Threshold Tests ==========
describe('Auto-scaling Threshold Service', () => {
  const mockHistoricalMetrics: HistoricalMetrics[] = [
    { timestamp: new Date('2024-01-01'), accuracyDrop: 0.02, featureDrift: 0.03, predictionDrift: 0.02 },
    { timestamp: new Date('2024-01-02'), accuracyDrop: 0.03, featureDrift: 0.04, predictionDrift: 0.03 },
    { timestamp: new Date('2024-01-03'), accuracyDrop: 0.04, featureDrift: 0.05, predictionDrift: 0.04 },
    { timestamp: new Date('2024-01-04'), accuracyDrop: 0.02, featureDrift: 0.03, predictionDrift: 0.02 },
    { timestamp: new Date('2024-01-05'), accuracyDrop: 0.05, featureDrift: 0.06, predictionDrift: 0.05 },
    { timestamp: new Date('2024-01-06'), accuracyDrop: 0.03, featureDrift: 0.04, predictionDrift: 0.03 },
    { timestamp: new Date('2024-01-07'), accuracyDrop: 0.04, featureDrift: 0.05, predictionDrift: 0.04 },
    { timestamp: new Date('2024-01-08'), accuracyDrop: 0.02, featureDrift: 0.03, predictionDrift: 0.02 },
    { timestamp: new Date('2024-01-09'), accuracyDrop: 0.03, featureDrift: 0.04, predictionDrift: 0.03 },
    { timestamp: new Date('2024-01-10'), accuracyDrop: 0.04, featureDrift: 0.05, predictionDrift: 0.04 },
  ];

  describe('getDefaultThresholdConfig', () => {
    it('should return valid default config', () => {
      const config = getDefaultThresholdConfig('1');
      expect(config.modelId).toBe('1');
      expect(config.enabled).toBe(false);
      expect(config.algorithm).toBe('adaptive');
      expect(config.windowSize).toBe(100);
      expect(config.sensitivityFactor).toBe(1.0);
    });
  });

  describe('validateThresholdConfig', () => {
    it('should pass for valid config', () => {
      const config: Partial<ThresholdConfig> = {
        windowSize: 50,
        sensitivityFactor: 1.5,
        minThreshold: 0.01,
        maxThreshold: 0.5
      };
      const errors = validateThresholdConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('should fail for invalid window size', () => {
      const config: Partial<ThresholdConfig> = {
        windowSize: 5 // Too small
      };
      const errors = validateThresholdConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail for invalid threshold range', () => {
      const config: Partial<ThresholdConfig> = {
        minThreshold: 0.5,
        maxThreshold: 0.1 // min > max
      };
      const errors = validateThresholdConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('calculateAutoScalingThresholds', () => {
    it('should calculate thresholds using moving_average algorithm', () => {
      const config: ThresholdConfig = {
        ...getDefaultThresholdConfig('1'),
        algorithm: 'moving_average'
      };
      const result = calculateAutoScalingThresholds(mockHistoricalMetrics, config);
      
      expect(result.accuracyDropThreshold).toBeGreaterThan(0);
      expect(result.featureDriftThreshold).toBeGreaterThan(0);
      expect(result.predictionDriftThreshold).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate thresholds using percentile algorithm', () => {
      const config: ThresholdConfig = {
        ...getDefaultThresholdConfig('1'),
        algorithm: 'percentile'
      };
      const result = calculateAutoScalingThresholds(mockHistoricalMetrics, config);
      
      expect(result.accuracyDropThreshold).toBeGreaterThan(0);
      expect(result.featureDriftThreshold).toBeGreaterThan(0);
    });

    it('should calculate thresholds using std_deviation algorithm', () => {
      const config: ThresholdConfig = {
        ...getDefaultThresholdConfig('1'),
        algorithm: 'std_deviation'
      };
      const result = calculateAutoScalingThresholds(mockHistoricalMetrics, config);
      
      expect(result.accuracyDropThreshold).toBeGreaterThan(0);
    });

    it('should calculate thresholds using adaptive algorithm', () => {
      const config: ThresholdConfig = {
        ...getDefaultThresholdConfig('1'),
        algorithm: 'adaptive'
      };
      const result = calculateAutoScalingThresholds(mockHistoricalMetrics, config);
      
      expect(result.accuracyDropThreshold).toBeGreaterThan(0);
      expect(result.algorithm).toBe('adaptive');
    });

    it('should respect min/max threshold bounds', () => {
      const config: ThresholdConfig = {
        ...getDefaultThresholdConfig('1'),
        minThreshold: 0.05,
        maxThreshold: 0.10
      };
      const result = calculateAutoScalingThresholds(mockHistoricalMetrics, config);
      
      expect(result.accuracyDropThreshold).toBeGreaterThanOrEqual(0.05);
      expect(result.accuracyDropThreshold).toBeLessThanOrEqual(0.10);
    });

    it('should handle empty metrics array', () => {
      const config = getDefaultThresholdConfig('1');
      const result = calculateAutoScalingThresholds([], config);
      
      expect(result.accuracyDropThreshold).toBe(config.minThreshold);
      expect(result.confidence).toBe(0);
    });
  });

  describe('suggestOptimalAlgorithm', () => {
    it('should suggest algorithm based on data characteristics', () => {
      const result = suggestOptimalAlgorithm(mockHistoricalMetrics);
      
      expect(result.algorithm).toBeDefined();
      expect(['moving_average', 'percentile', 'std_deviation', 'adaptive']).toContain(result.algorithm);
      expect(result.reason).toBeDefined();
    });

    it('should return a valid algorithm for insufficient data', () => {
      const result = suggestOptimalAlgorithm([]);
      
      // Should return a valid algorithm even with empty data
      expect(['moving_average', 'percentile', 'std_deviation', 'adaptive']).toContain(result.algorithm);
      expect(result.reason).toBeDefined();
    });
  });

  describe('analyzeThresholdEffectiveness', () => {
    it('should analyze threshold effectiveness', () => {
      const thresholds = {
        accuracyDropThreshold: 0.05,
        featureDriftThreshold: 0.08,
        predictionDriftThreshold: 0.06,
        confidence: 0.8,
        algorithm: 'adaptive' as const,
        calculatedAt: new Date()
      };
      
      const result = analyzeThresholdEffectiveness(mockHistoricalMetrics, thresholds, 3);
      
      expect(result.falsePositiveRate).toBeGreaterThanOrEqual(0);
      expect(result.falsePositiveRate).toBeLessThanOrEqual(1);
      expect(result.falseNegativeRate).toBeGreaterThanOrEqual(0);
      expect(result.falseNegativeRate).toBeLessThanOrEqual(1);
      expect(result.recommendation).toBeDefined();
    });
  });
});
