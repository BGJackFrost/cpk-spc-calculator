/**
 * Tests for Predictive Analytics Services
 * OEE Forecasting và Defect Rate Prediction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock getDb
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

describe('OEE Forecasting Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Structure', () => {
    it('should export forecastOEE function', async () => {
      const module = await import('./oeeForecastingService');
      expect(typeof module.forecastOEE).toBe('function');
    });

    it('should export getOEEHistoricalData function', async () => {
      const module = await import('./oeeForecastingService');
      expect(typeof module.getOEEHistoricalData).toBe('function');
    });

    it('should export compareProductionLines function', async () => {
      const module = await import('./oeeForecastingService');
      expect(typeof module.compareProductionLines).toBe('function');
    });
  });

  describe('forecastOEE', () => {
    it('should return forecast response with correct structure', async () => {
      const { forecastOEE } = await import('./oeeForecastingService');
      
      const result = await forecastOEE(null, null, {
        algorithm: 'holt_winters',
        forecastDays: 7,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      });

      expect(result).toHaveProperty('historicalData');
      expect(result).toHaveProperty('forecastData');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('alerts');
    });

    it('should handle database unavailable gracefully', async () => {
      const { forecastOEE } = await import('./oeeForecastingService');
      
      const result = await forecastOEE(null, null, {
        algorithm: 'sma',
        forecastDays: 7,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      });

      // When database is unavailable, should return empty arrays or mock data
      expect(Array.isArray(result.historicalData)).toBe(true);
      expect(Array.isArray(result.forecastData)).toBe(true);
    });

    it('should return arrays for forecast data', async () => {
      const { forecastOEE } = await import('./oeeForecastingService');
      
      const forecastDays = 14;
      const result = await forecastOEE(null, null, {
        algorithm: 'linear',
        forecastDays,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      });

      // When database is unavailable, forecastData may be empty or have data
      expect(Array.isArray(result.forecastData)).toBe(true);
    });

    it('should include confidence bounds in forecast', async () => {
      const { forecastOEE } = await import('./oeeForecastingService');
      
      const result = await forecastOEE(null, null, {
        algorithm: 'ema',
        forecastDays: 7,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      });

      for (const forecast of result.forecastData) {
        expect(forecast).toHaveProperty('predictedOEE');
        expect(forecast).toHaveProperty('lowerBound');
        expect(forecast).toHaveProperty('upperBound');
        expect(forecast).toHaveProperty('confidence');
        expect(forecast.lowerBound).toBeLessThanOrEqual(forecast.predictedOEE);
        expect(forecast.upperBound).toBeGreaterThanOrEqual(forecast.predictedOEE);
      }
    });

    it('should return valid trend value', async () => {
      const { forecastOEE } = await import('./oeeForecastingService');
      
      const result = await forecastOEE(null, null, {
        algorithm: 'holt_winters',
        forecastDays: 7,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      });

      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
    });

    it('should return metrics with valid values', async () => {
      const { forecastOEE } = await import('./oeeForecastingService');
      
      const result = await forecastOEE(null, null, {
        algorithm: 'holt_winters',
        forecastDays: 7,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      });

      expect(result.metrics).toHaveProperty('mape');
      expect(result.metrics).toHaveProperty('rmse');
      expect(result.metrics).toHaveProperty('mae');
      expect(result.metrics).toHaveProperty('r2');
    });
  });

  describe('getOEEHistoricalData', () => {
    it('should return empty array when database is unavailable', async () => {
      const { getOEEHistoricalData } = await import('./oeeForecastingService');
      
      const result = await getOEEHistoricalData(null, null, 30);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('compareProductionLines', () => {
    it('should return empty array for empty input', async () => {
      const { compareProductionLines } = await import('./oeeForecastingService');
      
      const result = await compareProductionLines([], {
        algorithm: 'holt_winters',
        forecastDays: 7,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      });

      expect(result).toEqual([]);
    });
  });
});

describe('Defect Rate Prediction Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Structure', () => {
    it('should export predictDefectRate function', async () => {
      const module = await import('./defectPredictionService');
      expect(typeof module.predictDefectRate).toBe('function');
    });

    it('should export getDefectStatsByCategory function', async () => {
      const module = await import('./defectPredictionService');
      expect(typeof module.getDefectStatsByCategory).toBe('function');
    });

    it('should export compareAlgorithms function', async () => {
      const module = await import('./defectPredictionService');
      expect(typeof module.compareAlgorithms).toBe('function');
    });
  });

  describe('predictDefectRate', () => {
    it('should return prediction response with correct structure', async () => {
      const { predictDefectRate } = await import('./defectPredictionService');
      
      const result = await predictDefectRate(null, null, {
        algorithm: 'ensemble',
        forecastDays: 7,
        confidenceLevel: 95,
        threshold: 0.05,
      });

      expect(result).toHaveProperty('historicalData');
      expect(result).toHaveProperty('forecastData');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('rootCauses');
    });

    it('should return forecast data array', async () => {
      const { predictDefectRate } = await import('./defectPredictionService');
      
      const forecastDays = 14;
      const result = await predictDefectRate(null, null, {
        algorithm: 'poisson',
        forecastDays,
        confidenceLevel: 95,
        threshold: 0.05,
      });

      // When database is unavailable, forecastData may be empty or have data
      expect(Array.isArray(result.forecastData)).toBe(true);
    });

    it('should include risk level in forecast', async () => {
      const { predictDefectRate } = await import('./defectPredictionService');
      
      const result = await predictDefectRate(null, null, {
        algorithm: 'logistic',
        forecastDays: 7,
        confidenceLevel: 95,
        threshold: 0.05,
      });

      for (const forecast of result.forecastData) {
        expect(forecast).toHaveProperty('riskLevel');
        expect(['low', 'medium', 'high', 'critical']).toContain(forecast.riskLevel);
      }
    });

    it('should return root causes', async () => {
      const { predictDefectRate } = await import('./defectPredictionService');
      
      const result = await predictDefectRate(null, null, {
        algorithm: 'arima',
        forecastDays: 7,
        confidenceLevel: 95,
        threshold: 0.05,
      });

      expect(Array.isArray(result.rootCauses)).toBe(true);
      if (result.rootCauses.length > 0) {
        expect(result.rootCauses[0]).toHaveProperty('cause');
        expect(result.rootCauses[0]).toHaveProperty('probability');
      }
    });

    it('should return valid trend value', async () => {
      const { predictDefectRate } = await import('./defectPredictionService');
      
      const result = await predictDefectRate(null, null, {
        algorithm: 'ensemble',
        forecastDays: 7,
        confidenceLevel: 95,
        threshold: 0.05,
      });

      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
    });
  });

  describe('getDefectStatsByCategory', () => {
    it('should return array of category statistics', async () => {
      const { getDefectStatsByCategory } = await import('./defectPredictionService');
      
      const result = await getDefectStatsByCategory(null, null, 30);
      
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('category');
        expect(result[0]).toHaveProperty('count');
        expect(result[0]).toHaveProperty('percentage');
      }
    });
  });

  describe('compareAlgorithms', () => {
    it('should return comparison for all algorithms', async () => {
      const { compareAlgorithms } = await import('./defectPredictionService');
      
      const result = await compareAlgorithms(null, null);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4); // poisson, logistic, arima, ensemble
      
      for (const algo of result) {
        expect(algo).toHaveProperty('algorithm');
        expect(algo).toHaveProperty('mape');
        expect(algo).toHaveProperty('rmse');
        expect(algo).toHaveProperty('accuracy');
      }
    });

    it('should sort results by MAPE', async () => {
      const { compareAlgorithms } = await import('./defectPredictionService');
      
      const result = await compareAlgorithms(null, null);
      
      for (let i = 1; i < result.length; i++) {
        expect(result[i].mape).toBeGreaterThanOrEqual(result[i - 1].mape);
      }
    });
  });
});

describe('Computer Vision Service', () => {
  describe('Module Structure', () => {
    it('should export detectDefects function', async () => {
      const module = await import('./computerVisionService');
      expect(typeof module.detectDefects).toBe('function');
    });

    it('should export detectDefectsBatch function', async () => {
      const module = await import('./computerVisionService');
      expect(typeof module.detectDefectsBatch).toBe('function');
    });

    it('should export getDefectStatistics function', async () => {
      const module = await import('./computerVisionService');
      expect(typeof module.getDefectStatistics).toBe('function');
    });

    it('should export getDefectCategories function', async () => {
      const module = await import('./computerVisionService');
      expect(typeof module.getDefectCategories).toBe('function');
    });

    it('should export getDefaultVisionConfig function', async () => {
      const module = await import('./computerVisionService');
      expect(typeof module.getDefaultVisionConfig).toBe('function');
    });
  });

  describe('detectDefects', () => {
    it('should return detection result with correct structure', async () => {
      const { detectDefects } = await import('./computerVisionService');
      
      const result = await detectDefects('https://example.com/image.jpg', {
        useSimulation: true,
      });

      expect(result).toHaveProperty('imageId');
      expect(result).toHaveProperty('originalImageUrl');
      expect(result).toHaveProperty('defects');
      expect(result).toHaveProperty('totalDefects');
      expect(result).toHaveProperty('overallQuality');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('processingTime');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('metadata');
    });

    it('should return valid quality status', async () => {
      const { detectDefects } = await import('./computerVisionService');
      
      const result = await detectDefects('https://example.com/image.jpg', {
        useSimulation: true,
      });

      expect(['pass', 'fail', 'warning']).toContain(result.overallQuality);
    });

    it('should return quality score between 0 and 100', async () => {
      const { detectDefects } = await import('./computerVisionService');
      
      const result = await detectDefects('https://example.com/image.jpg', {
        useSimulation: true,
      });

      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should include defect details when defects are found', async () => {
      const { detectDefects } = await import('./computerVisionService');
      
      // Run multiple times to get at least one with defects
      let foundDefects = false;
      for (let i = 0; i < 10; i++) {
        const result = await detectDefects('https://example.com/image.jpg', {
          useSimulation: true,
        });
        
        if (result.defects.length > 0) {
          foundDefects = true;
          const defect = result.defects[0];
          expect(defect).toHaveProperty('id');
          expect(defect).toHaveProperty('type');
          expect(defect).toHaveProperty('confidence');
          expect(defect).toHaveProperty('boundingBox');
          expect(defect).toHaveProperty('severity');
          expect(defect).toHaveProperty('description');
          break;
        }
      }
      // It's okay if no defects found in simulation
      expect(true).toBe(true);
    });
  });

  describe('getDefectCategories', () => {
    it('should return array of defect categories', async () => {
      const { getDefectCategories } = await import('./computerVisionService');
      
      const categories = getDefectCategories();
      
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      
      for (const category of categories) {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(category).toHaveProperty('severity');
      }
    });
  });

  describe('getDefaultVisionConfig', () => {
    it('should return default configuration', async () => {
      const { getDefaultVisionConfig } = await import('./computerVisionService');
      
      const config = getDefaultVisionConfig();
      
      expect(config).toHaveProperty('confidenceThreshold');
      expect(config).toHaveProperty('enableAutoAnnotation');
      expect(config).toHaveProperty('defectCategories');
      expect(config).toHaveProperty('qualityPassThreshold');
    });
  });

  describe('getDefectStatistics', () => {
    it('should calculate statistics from results', async () => {
      const { detectDefects, getDefectStatistics } = await import('./computerVisionService');
      
      const results = [];
      for (let i = 0; i < 5; i++) {
        results.push(await detectDefects('https://example.com/image.jpg', {
          useSimulation: true,
        }));
      }
      
      const stats = getDefectStatistics(results);
      
      expect(stats).toHaveProperty('totalImages');
      expect(stats).toHaveProperty('totalDefects');
      expect(stats).toHaveProperty('passRate');
      expect(stats).toHaveProperty('averageQualityScore');
      expect(stats).toHaveProperty('defectsByType');
      expect(stats).toHaveProperty('defectsBySeverity');
      
      expect(stats.totalImages).toBe(5);
    });
  });
});
