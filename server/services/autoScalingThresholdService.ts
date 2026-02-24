/**
 * Auto-scaling Threshold Service
 * Automatically adjust drift detection thresholds based on historical data
 */

// Types
export interface ThresholdConfig {
  modelId: string;
  enabled: boolean;
  algorithm: 'moving_average' | 'percentile' | 'std_deviation' | 'adaptive';
  windowSize: number; // Number of data points to consider
  sensitivityFactor: number; // 0.5 = less sensitive, 1.0 = normal, 2.0 = more sensitive
  minThreshold: number;
  maxThreshold: number;
  updateFrequency: 'hourly' | 'daily' | 'weekly';
  lastUpdated?: Date;
}

export interface CalculatedThresholds {
  accuracyDropThreshold: number;
  featureDriftThreshold: number;
  predictionDriftThreshold: number;
  calculatedAt: Date;
  algorithm: string;
  dataPointsUsed: number;
  confidence: number;
}

export interface HistoricalMetrics {
  timestamp: Date;
  accuracyDrop: number;
  featureDrift: number;
  predictionDrift: number;
}

/**
 * Calculate moving average threshold
 */
function calculateMovingAverageThreshold(
  values: number[],
  sensitivityFactor: number,
  minThreshold: number,
  maxThreshold: number
): number {
  if (values.length === 0) return minThreshold;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  );

  // Threshold = mean + (sensitivityFactor * stdDev)
  let threshold = mean + (sensitivityFactor * stdDev);
  
  // Clamp to min/max
  threshold = Math.max(minThreshold, Math.min(maxThreshold, threshold));
  
  return threshold;
}

/**
 * Calculate percentile-based threshold
 */
function calculatePercentileThreshold(
  values: number[],
  percentile: number,
  minThreshold: number,
  maxThreshold: number
): number {
  if (values.length === 0) return minThreshold;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  let threshold = sorted[Math.max(0, index)];
  
  // Clamp to min/max
  threshold = Math.max(minThreshold, Math.min(maxThreshold, threshold));
  
  return threshold;
}

/**
 * Calculate standard deviation based threshold
 */
function calculateStdDeviationThreshold(
  values: number[],
  numStdDevs: number,
  minThreshold: number,
  maxThreshold: number
): number {
  if (values.length === 0) return minThreshold;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  );

  let threshold = mean + (numStdDevs * stdDev);
  
  // Clamp to min/max
  threshold = Math.max(minThreshold, Math.min(maxThreshold, threshold));
  
  return threshold;
}

/**
 * Calculate adaptive threshold using exponential weighted moving average
 */
function calculateAdaptiveThreshold(
  values: number[],
  alpha: number, // Smoothing factor (0-1)
  sensitivityFactor: number,
  minThreshold: number,
  maxThreshold: number
): number {
  if (values.length === 0) return minThreshold;

  // Calculate EWMA
  let ewma = values[0];
  let ewmaVariance = 0;

  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - ewma;
    ewma = ewma + alpha * diff;
    ewmaVariance = (1 - alpha) * (ewmaVariance + alpha * diff * diff);
  }

  const ewmaStdDev = Math.sqrt(ewmaVariance);
  let threshold = ewma + (sensitivityFactor * ewmaStdDev);
  
  // Clamp to min/max
  threshold = Math.max(minThreshold, Math.min(maxThreshold, threshold));
  
  return threshold;
}

/**
 * Calculate thresholds based on historical metrics
 */
export function calculateAutoScalingThresholds(
  historicalMetrics: HistoricalMetrics[],
  config: ThresholdConfig
): CalculatedThresholds {
  const accuracyDropValues = historicalMetrics.map(m => m.accuracyDrop);
  const featureDriftValues = historicalMetrics.map(m => m.featureDrift);
  const predictionDriftValues = historicalMetrics.map(m => m.predictionDrift);

  let accuracyDropThreshold: number;
  let featureDriftThreshold: number;
  let predictionDriftThreshold: number;

  switch (config.algorithm) {
    case 'moving_average':
      accuracyDropThreshold = calculateMovingAverageThreshold(
        accuracyDropValues, config.sensitivityFactor, config.minThreshold, config.maxThreshold
      );
      featureDriftThreshold = calculateMovingAverageThreshold(
        featureDriftValues, config.sensitivityFactor, config.minThreshold, config.maxThreshold
      );
      predictionDriftThreshold = calculateMovingAverageThreshold(
        predictionDriftValues, config.sensitivityFactor, config.minThreshold, config.maxThreshold
      );
      break;

    case 'percentile':
      // Use 95th percentile by default, adjusted by sensitivity
      const percentile = 95 - (config.sensitivityFactor - 1) * 10; // 85-95 range
      accuracyDropThreshold = calculatePercentileThreshold(
        accuracyDropValues, percentile, config.minThreshold, config.maxThreshold
      );
      featureDriftThreshold = calculatePercentileThreshold(
        featureDriftValues, percentile, config.minThreshold, config.maxThreshold
      );
      predictionDriftThreshold = calculatePercentileThreshold(
        predictionDriftValues, percentile, config.minThreshold, config.maxThreshold
      );
      break;

    case 'std_deviation':
      const numStdDevs = 2 * config.sensitivityFactor; // 1-4 std devs
      accuracyDropThreshold = calculateStdDeviationThreshold(
        accuracyDropValues, numStdDevs, config.minThreshold, config.maxThreshold
      );
      featureDriftThreshold = calculateStdDeviationThreshold(
        featureDriftValues, numStdDevs, config.minThreshold, config.maxThreshold
      );
      predictionDriftThreshold = calculateStdDeviationThreshold(
        predictionDriftValues, numStdDevs, config.minThreshold, config.maxThreshold
      );
      break;

    case 'adaptive':
    default:
      const alpha = 0.3; // Smoothing factor
      accuracyDropThreshold = calculateAdaptiveThreshold(
        accuracyDropValues, alpha, config.sensitivityFactor, config.minThreshold, config.maxThreshold
      );
      featureDriftThreshold = calculateAdaptiveThreshold(
        featureDriftValues, alpha, config.sensitivityFactor, config.minThreshold, config.maxThreshold
      );
      predictionDriftThreshold = calculateAdaptiveThreshold(
        predictionDriftValues, alpha, config.sensitivityFactor, config.minThreshold, config.maxThreshold
      );
      break;
  }

  // Calculate confidence based on data points
  const confidence = Math.min(1, historicalMetrics.length / config.windowSize);

  return {
    accuracyDropThreshold,
    featureDriftThreshold,
    predictionDriftThreshold,
    calculatedAt: new Date(),
    algorithm: config.algorithm,
    dataPointsUsed: historicalMetrics.length,
    confidence
  };
}

/**
 * Get default threshold config
 */
export function getDefaultThresholdConfig(modelId: string): ThresholdConfig {
  return {
    modelId,
    enabled: false,
    algorithm: 'adaptive',
    windowSize: 100,
    sensitivityFactor: 1.0,
    minThreshold: 0.01,
    maxThreshold: 0.5,
    updateFrequency: 'daily'
  };
}

/**
 * Validate threshold config
 */
export function validateThresholdConfig(config: Partial<ThresholdConfig>): string[] {
  const errors: string[] = [];

  if (config.windowSize !== undefined && (config.windowSize < 10 || config.windowSize > 1000)) {
    errors.push('Window size must be between 10 and 1000');
  }

  if (config.sensitivityFactor !== undefined && (config.sensitivityFactor < 0.1 || config.sensitivityFactor > 5)) {
    errors.push('Sensitivity factor must be between 0.1 and 5');
  }

  if (config.minThreshold !== undefined && config.maxThreshold !== undefined) {
    if (config.minThreshold >= config.maxThreshold) {
      errors.push('Min threshold must be less than max threshold');
    }
  }

  if (config.minThreshold !== undefined && (config.minThreshold < 0 || config.minThreshold > 1)) {
    errors.push('Min threshold must be between 0 and 1');
  }

  if (config.maxThreshold !== undefined && (config.maxThreshold < 0 || config.maxThreshold > 1)) {
    errors.push('Max threshold must be between 0 and 1');
  }

  return errors;
}

/**
 * Analyze threshold effectiveness
 */
export function analyzeThresholdEffectiveness(
  historicalMetrics: HistoricalMetrics[],
  currentThresholds: CalculatedThresholds,
  actualAlerts: number
): {
  falsePositiveRate: number;
  falseNegativeRate: number;
  recommendation: string;
} {
  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  historicalMetrics.forEach(m => {
    const wouldTrigger = 
      m.accuracyDrop > currentThresholds.accuracyDropThreshold ||
      m.featureDrift > currentThresholds.featureDriftThreshold ||
      m.predictionDrift > currentThresholds.predictionDriftThreshold;

    // Simplified analysis - in real scenario, we'd compare with actual alerts
    if (wouldTrigger) {
      if (m.accuracyDrop > 0.1 || m.featureDrift > 0.2 || m.predictionDrift > 0.15) {
        truePositives++;
      } else {
        falsePositives++;
      }
    } else {
      if (m.accuracyDrop > 0.1 || m.featureDrift > 0.2 || m.predictionDrift > 0.15) {
        falseNegatives++;
      } else {
        trueNegatives++;
      }
    }
  });

  const total = historicalMetrics.length || 1;
  const falsePositiveRate = falsePositives / total;
  const falseNegativeRate = falseNegatives / total;

  let recommendation = '';
  if (falsePositiveRate > 0.2) {
    recommendation = 'Ngưỡng quá thấp, gây nhiều cảnh báo giả. Tăng sensitivity factor hoặc sử dụng thuật toán percentile.';
  } else if (falseNegativeRate > 0.1) {
    recommendation = 'Ngưỡng quá cao, bỏ sót nhiều vấn đề. Giảm sensitivity factor hoặc giảm min threshold.';
  } else {
    recommendation = 'Ngưỡng hoạt động hiệu quả. Tiếp tục theo dõi và điều chỉnh khi cần.';
  }

  return {
    falsePositiveRate,
    falseNegativeRate,
    recommendation
  };
}

/**
 * Suggest optimal algorithm based on data characteristics
 */
export function suggestOptimalAlgorithm(
  historicalMetrics: HistoricalMetrics[]
): {
  algorithm: ThresholdConfig['algorithm'];
  reason: string;
} {
  if (historicalMetrics.length < 30) {
    return {
      algorithm: 'percentile',
      reason: 'Dữ liệu ít (<30 điểm). Percentile phù hợp vì ít bị ảnh hưởng bởi outliers.'
    };
  }

  // Check for trend
  const values = historicalMetrics.map(m => m.accuracyDrop);
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const trendStrength = Math.abs(secondMean - firstMean) / firstMean;

  if (trendStrength > 0.2) {
    return {
      algorithm: 'adaptive',
      reason: 'Dữ liệu có xu hướng rõ ràng. Adaptive (EWMA) phù hợp để theo dõi thay đổi.'
    };
  }

  // Check for volatility
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const cv = Math.sqrt(variance) / mean; // Coefficient of variation

  if (cv > 0.5) {
    return {
      algorithm: 'percentile',
      reason: 'Dữ liệu biến động cao. Percentile phù hợp để tránh cảnh báo giả.'
    };
  }

  return {
    algorithm: 'moving_average',
    reason: 'Dữ liệu ổn định. Moving average đơn giản và hiệu quả.'
  };
}
