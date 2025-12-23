/**
 * PredictiveAnalyticsService - Dự đoán xu hướng và phân tích nâng cao
 * Phase 3.2 - Advanced Analytics
 */

// Types
export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface ForecastResult {
  timestamp: Date;
  predicted: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  slope: number;
  strength: number; // 0-1
  rSquared: number;
  forecast: ForecastResult[];
}

export interface AnomalyResult {
  timestamp: Date;
  value: number;
  isAnomaly: boolean;
  score: number;
  type: 'spike' | 'dip' | 'shift' | 'trend' | 'normal';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface CorrelationResult {
  variable1: string;
  variable2: string;
  correlation: number;
  pValue: number;
  significance: 'strong' | 'moderate' | 'weak' | 'none';
  relationship: 'positive' | 'negative' | 'none';
}

export interface SeasonalityResult {
  hasSeasonal: boolean;
  period: number;
  strength: number;
  pattern: number[];
}

export interface ForecastConfig {
  horizon: number; // Number of periods to forecast
  confidenceLevel: number; // 0.90, 0.95, 0.99
  method: 'linear' | 'exponential' | 'moving_average' | 'arima_simple';
  seasonalPeriod?: number;
}

class PredictiveAnalyticsService {
  private readonly DEFAULT_CONFIDENCE = 0.95;
  private readonly DEFAULT_HORIZON = 10;

  /**
   * Perform linear regression forecast
   */
  linearForecast(data: TimeSeriesData[], config?: Partial<ForecastConfig>): TrendAnalysis {
    const horizon = config?.horizon || this.DEFAULT_HORIZON;
    const confidence = config?.confidenceLevel || this.DEFAULT_CONFIDENCE;

    if (data.length < 3) {
      throw new Error('Need at least 3 data points for forecasting');
    }

    // Extract values
    const values = data.map(d => d.value);
    const n = values.length;

    // Calculate linear regression
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += (i - xMean) ** 2;
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    // Calculate R-squared
    let ssRes = 0;
    let ssTot = 0;

    for (let i = 0; i < n; i++) {
      const predicted = intercept + slope * i;
      ssRes += (values[i] - predicted) ** 2;
      ssTot += (values[i] - yMean) ** 2;
    }

    const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

    // Calculate standard error
    const se = Math.sqrt(ssRes / (n - 2));

    // Z-score for confidence interval
    const zScore = this.getZScore(confidence);

    // Generate forecast
    const lastTimestamp = data[data.length - 1].timestamp;
    const timeStep = n > 1 
      ? (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / (n - 1)
      : 86400000; // Default 1 day

    const forecast: ForecastResult[] = [];

    for (let i = 1; i <= horizon; i++) {
      const x = n - 1 + i;
      const predicted = intercept + slope * x;
      const margin = zScore * se * Math.sqrt(1 + 1/n + (x - xMean)**2 / denominator);

      forecast.push({
        timestamp: new Date(lastTimestamp.getTime() + i * timeStep),
        predicted,
        lowerBound: predicted - margin,
        upperBound: predicted + margin,
        confidence
      });
    }

    // Determine trend direction
    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(slope) > 0.01) {
      direction = slope > 0 ? 'up' : 'down';
    }

    return {
      direction,
      slope,
      strength: Math.min(Math.abs(slope) / (yMean || 1), 1),
      rSquared: Math.max(0, Math.min(1, rSquared)),
      forecast
    };
  }

  /**
   * Exponential smoothing forecast
   */
  exponentialForecast(data: TimeSeriesData[], config?: Partial<ForecastConfig>): TrendAnalysis {
    const horizon = config?.horizon || this.DEFAULT_HORIZON;
    const confidence = config?.confidenceLevel || this.DEFAULT_CONFIDENCE;
    const alpha = 0.3; // Smoothing factor

    if (data.length < 3) {
      throw new Error('Need at least 3 data points for forecasting');
    }

    const values = data.map(d => d.value);
    const n = values.length;

    // Calculate exponential smoothing
    let smoothed = values[0];
    const smoothedValues: number[] = [smoothed];

    for (let i = 1; i < n; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
      smoothedValues.push(smoothed);
    }

    // Calculate trend
    const trend = smoothedValues[n - 1] - smoothedValues[Math.max(0, n - 5)];
    const avgTrend = trend / Math.min(5, n - 1);

    // Calculate standard error
    let sumSquaredError = 0;
    for (let i = 1; i < n; i++) {
      sumSquaredError += (values[i] - smoothedValues[i - 1]) ** 2;
    }
    const se = Math.sqrt(sumSquaredError / (n - 1));

    const zScore = this.getZScore(confidence);

    // Generate forecast
    const lastTimestamp = data[data.length - 1].timestamp;
    const timeStep = n > 1
      ? (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / (n - 1)
      : 86400000;

    const forecast: ForecastResult[] = [];
    let lastPredicted = smoothed;

    for (let i = 1; i <= horizon; i++) {
      const predicted = lastPredicted + avgTrend;
      const margin = zScore * se * Math.sqrt(i);

      forecast.push({
        timestamp: new Date(lastTimestamp.getTime() + i * timeStep),
        predicted,
        lowerBound: predicted - margin,
        upperBound: predicted + margin,
        confidence
      });

      lastPredicted = predicted;
    }

    // Calculate R-squared equivalent
    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let ssTot = 0;
    for (const v of values) {
      ssTot += (v - yMean) ** 2;
    }
    const rSquared = ssTot !== 0 ? 1 - sumSquaredError / ssTot : 0;

    return {
      direction: avgTrend > 0.01 ? 'up' : avgTrend < -0.01 ? 'down' : 'stable',
      slope: avgTrend,
      strength: Math.min(Math.abs(avgTrend) / (yMean || 1), 1),
      rSquared: Math.max(0, Math.min(1, rSquared)),
      forecast
    };
  }

  /**
   * Moving average forecast
   */
  movingAverageForecast(data: TimeSeriesData[], config?: Partial<ForecastConfig>): TrendAnalysis {
    const horizon = config?.horizon || this.DEFAULT_HORIZON;
    const confidence = config?.confidenceLevel || this.DEFAULT_CONFIDENCE;
    const windowSize = Math.min(5, Math.floor(data.length / 2));

    if (data.length < 3) {
      throw new Error('Need at least 3 data points for forecasting');
    }

    const values = data.map(d => d.value);
    const n = values.length;

    // Calculate moving averages
    const movingAvgs: number[] = [];
    for (let i = windowSize - 1; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += values[i - j];
      }
      movingAvgs.push(sum / windowSize);
    }

    // Calculate trend from moving averages
    const lastMA = movingAvgs[movingAvgs.length - 1];
    const prevMA = movingAvgs[Math.max(0, movingAvgs.length - 3)];
    const trend = (lastMA - prevMA) / Math.min(3, movingAvgs.length);

    // Calculate standard error
    let sumSquaredError = 0;
    for (let i = windowSize; i < n; i++) {
      sumSquaredError += (values[i] - movingAvgs[i - windowSize]) ** 2;
    }
    const se = Math.sqrt(sumSquaredError / (n - windowSize));

    const zScore = this.getZScore(confidence);

    // Generate forecast
    const lastTimestamp = data[data.length - 1].timestamp;
    const timeStep = n > 1
      ? (data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime()) / (n - 1)
      : 86400000;

    const forecast: ForecastResult[] = [];
    let predicted = lastMA;

    for (let i = 1; i <= horizon; i++) {
      predicted += trend;
      const margin = zScore * se * Math.sqrt(i);

      forecast.push({
        timestamp: new Date(lastTimestamp.getTime() + i * timeStep),
        predicted,
        lowerBound: predicted - margin,
        upperBound: predicted + margin,
        confidence
      });
    }

    const yMean = values.reduce((a, b) => a + b, 0) / n;
    let ssTot = 0;
    for (const v of values) {
      ssTot += (v - yMean) ** 2;
    }
    const rSquared = ssTot !== 0 ? 1 - sumSquaredError / ssTot : 0;

    return {
      direction: trend > 0.01 ? 'up' : trend < -0.01 ? 'down' : 'stable',
      slope: trend,
      strength: Math.min(Math.abs(trend) / (yMean || 1), 1),
      rSquared: Math.max(0, Math.min(1, rSquared)),
      forecast
    };
  }

  /**
   * Detect anomalies in time series data
   */
  detectAnomalies(data: TimeSeriesData[], sensitivity: number = 2): AnomalyResult[] {
    if (data.length < 5) {
      return data.map(d => ({
        timestamp: d.timestamp,
        value: d.value,
        isAnomaly: false,
        score: 0,
        type: 'normal' as const,
        severity: 'low' as const
      }));
    }

    const values = data.map(d => d.value);
    const n = values.length;

    // Calculate mean and standard deviation
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    // Calculate moving statistics for local anomaly detection
    const windowSize = Math.min(10, Math.floor(n / 3));
    
    const results: AnomalyResult[] = [];

    for (let i = 0; i < n; i++) {
      const value = values[i];
      
      // Global z-score
      const globalZScore = stdDev !== 0 ? Math.abs(value - mean) / stdDev : 0;

      // Local z-score
      const start = Math.max(0, i - windowSize);
      const end = Math.min(n, i + windowSize + 1);
      const localValues = values.slice(start, end);
      const localMean = localValues.reduce((a, b) => a + b, 0) / localValues.length;
      const localVariance = localValues.reduce((a, b) => a + (b - localMean) ** 2, 0) / localValues.length;
      const localStdDev = Math.sqrt(localVariance);
      const localZScore = localStdDev !== 0 ? Math.abs(value - localMean) / localStdDev : 0;

      // Combined score
      const score = (globalZScore + localZScore) / 2;
      const isAnomaly = score > sensitivity;

      // Determine anomaly type
      let type: AnomalyResult['type'] = 'normal';
      if (isAnomaly) {
        if (value > mean + sensitivity * stdDev) {
          type = 'spike';
        } else if (value < mean - sensitivity * stdDev) {
          type = 'dip';
        } else if (i > 0 && Math.abs(value - values[i - 1]) > 2 * stdDev) {
          type = 'shift';
        } else {
          type = 'trend';
        }
      }

      // Determine severity
      let severity: AnomalyResult['severity'] = 'low';
      if (score > sensitivity * 2) {
        severity = 'critical';
      } else if (score > sensitivity * 1.5) {
        severity = 'high';
      } else if (score > sensitivity) {
        severity = 'medium';
      }

      results.push({
        timestamp: data[i].timestamp,
        value,
        isAnomaly,
        score,
        type,
        severity
      });
    }

    return results;
  }

  /**
   * Calculate correlation between two variables
   */
  calculateCorrelation(data1: number[], data2: number[]): CorrelationResult {
    if (data1.length !== data2.length || data1.length < 3) {
      throw new Error('Data arrays must have same length and at least 3 points');
    }

    const n = data1.length;
    const mean1 = data1.reduce((a, b) => a + b, 0) / n;
    const mean2 = data2.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = data1[i] - mean1;
      const diff2 = data2[i] - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 ** 2;
      denom2 += diff2 ** 2;
    }

    const denominator = Math.sqrt(denom1 * denom2);
    const correlation = denominator !== 0 ? numerator / denominator : 0;

    // Calculate t-statistic and p-value approximation
    const tStat = correlation * Math.sqrt((n - 2) / (1 - correlation ** 2));
    const pValue = this.approximatePValue(tStat, n - 2);

    // Determine significance
    let significance: CorrelationResult['significance'] = 'none';
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.7) {
      significance = 'strong';
    } else if (absCorr >= 0.4) {
      significance = 'moderate';
    } else if (absCorr >= 0.2) {
      significance = 'weak';
    }

    return {
      variable1: 'Variable 1',
      variable2: 'Variable 2',
      correlation,
      pValue,
      significance,
      relationship: correlation > 0.1 ? 'positive' : correlation < -0.1 ? 'negative' : 'none'
    };
  }

  /**
   * Detect seasonality in time series
   */
  detectSeasonality(data: TimeSeriesData[], maxPeriod: number = 30): SeasonalityResult {
    if (data.length < maxPeriod * 2) {
      return {
        hasSeasonal: false,
        period: 0,
        strength: 0,
        pattern: []
      };
    }

    const values = data.map(d => d.value);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    // Calculate autocorrelation for different lags
    const autocorrelations: number[] = [];
    
    for (let lag = 1; lag <= maxPeriod; lag++) {
      let numerator = 0;
      let denominator = 0;

      for (let i = 0; i < n - lag; i++) {
        numerator += (values[i] - mean) * (values[i + lag] - mean);
      }

      for (let i = 0; i < n; i++) {
        denominator += (values[i] - mean) ** 2;
      }

      autocorrelations.push(denominator !== 0 ? numerator / denominator : 0);
    }

    // Find peak autocorrelation (excluding lag 1)
    let maxCorr = 0;
    let period = 0;

    for (let i = 1; i < autocorrelations.length; i++) {
      if (autocorrelations[i] > maxCorr) {
        maxCorr = autocorrelations[i];
        period = i + 1;
      }
    }

    const hasSeasonal = maxCorr > 0.3;

    // Extract seasonal pattern
    const pattern: number[] = [];
    if (hasSeasonal && period > 0) {
      for (let i = 0; i < period; i++) {
        let sum = 0;
        let count = 0;
        for (let j = i; j < n; j += period) {
          sum += values[j];
          count++;
        }
        pattern.push(count > 0 ? sum / count : 0);
      }
    }

    return {
      hasSeasonal,
      period,
      strength: maxCorr,
      pattern
    };
  }

  /**
   * Get summary statistics
   */
  getSummaryStatistics(values: number[]): {
    count: number;
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    range: number;
    q1: number;
    q3: number;
    iqr: number;
    skewness: number;
    kurtosis: number;
  } {
    const n = values.length;
    if (n === 0) {
      return {
        count: 0,
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        range: 0,
        q1: 0,
        q3: 0,
        iqr: 0,
        skewness: 0,
        kurtosis: 0
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];

    // Calculate skewness and kurtosis
    let m3 = 0;
    let m4 = 0;
    for (const v of values) {
      const diff = v - mean;
      m3 += diff ** 3;
      m4 += diff ** 4;
    }
    m3 /= n;
    m4 /= n;

    const skewness = stdDev !== 0 ? m3 / (stdDev ** 3) : 0;
    const kurtosis = stdDev !== 0 ? m4 / (stdDev ** 4) - 3 : 0;

    return {
      count: n,
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[n - 1],
      range: sorted[n - 1] - sorted[0],
      q1,
      q3,
      iqr: q3 - q1,
      skewness,
      kurtosis
    };
  }

  /**
   * Get Z-score for confidence level
   */
  private getZScore(confidence: number): number {
    const zScores: Record<number, number> = {
      0.90: 1.645,
      0.95: 1.96,
      0.99: 2.576
    };
    return zScores[confidence] || 1.96;
  }

  /**
   * Approximate p-value from t-statistic
   */
  private approximatePValue(tStat: number, df: number): number {
    // Simple approximation using normal distribution for large df
    const absT = Math.abs(tStat);
    if (df > 30) {
      // Use normal approximation
      return 2 * (1 - this.normalCDF(absT));
    }
    // For smaller df, use a rough approximation
    return Math.exp(-0.5 * absT * absT) * (1 + 0.5 / df);
  }

  /**
   * Normal CDF approximation
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }
}

// Singleton instance
export const predictiveAnalyticsService = new PredictiveAnalyticsService();

// Export class for testing
export { PredictiveAnalyticsService };
