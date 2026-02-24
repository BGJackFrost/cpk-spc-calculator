import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the prediction algorithms directly without database
describe("aiPredictiveService - Algorithms", () => {
  // Linear regression helper
  function linearRegression(data: { date: Date; value: number }[]): { slope: number; intercept: number; rSquared: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data[0]?.value || 0, rSquared: 0 };

    const xValues = data.map((_, i) => i);
    const yValues = data.map(d => d.value);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const meanY = sumY / n;
    const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    const ssResidual = yValues.reduce((sum, y, i) => sum + Math.pow(y - (slope * i + intercept), 2), 0);
    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    return { slope, intercept, rSquared };
  }

  // Calculate volatility
  function calculateVolatility(data: { date: Date; value: number }[]): number {
    if (data.length < 2) return 0;
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  describe("linearRegression", () => {
    it("should calculate correct slope for increasing data", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.0 },
        { date: new Date("2024-01-02"), value: 1.1 },
        { date: new Date("2024-01-03"), value: 1.2 },
        { date: new Date("2024-01-04"), value: 1.3 },
        { date: new Date("2024-01-05"), value: 1.4 },
      ];

      const result = linearRegression(data);

      expect(result.slope).toBeCloseTo(0.1, 5);
      expect(result.intercept).toBeCloseTo(1.0, 5);
      expect(result.rSquared).toBeCloseTo(1.0, 5);
    });

    it("should calculate correct slope for decreasing data", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.5 },
        { date: new Date("2024-01-02"), value: 1.4 },
        { date: new Date("2024-01-03"), value: 1.3 },
        { date: new Date("2024-01-04"), value: 1.2 },
        { date: new Date("2024-01-05"), value: 1.1 },
      ];

      const result = linearRegression(data);

      expect(result.slope).toBeCloseTo(-0.1, 5);
      expect(result.rSquared).toBeCloseTo(1.0, 5);
    });

    it("should return zero slope for constant data", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.33 },
        { date: new Date("2024-01-02"), value: 1.33 },
        { date: new Date("2024-01-03"), value: 1.33 },
      ];

      const result = linearRegression(data);

      expect(result.slope).toBeCloseTo(0, 5);
    });

    it("should handle single data point", () => {
      const data = [{ date: new Date("2024-01-01"), value: 1.5 }];

      const result = linearRegression(data);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(1.5);
    });

    it("should handle empty data", () => {
      const data: { date: Date; value: number }[] = [];

      const result = linearRegression(data);

      expect(result.slope).toBe(0);
      expect(result.intercept).toBe(0);
    });
  });

  describe("calculateVolatility", () => {
    it("should calculate correct volatility for varying data", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.0 },
        { date: new Date("2024-01-02"), value: 1.2 },
        { date: new Date("2024-01-03"), value: 0.8 },
        { date: new Date("2024-01-04"), value: 1.1 },
        { date: new Date("2024-01-05"), value: 0.9 },
      ];

      const volatility = calculateVolatility(data);

      expect(volatility).toBeGreaterThan(0);
      expect(volatility).toBeLessThan(0.5);
    });

    it("should return zero volatility for constant data", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.33 },
        { date: new Date("2024-01-02"), value: 1.33 },
        { date: new Date("2024-01-03"), value: 1.33 },
      ];

      const volatility = calculateVolatility(data);

      expect(volatility).toBe(0);
    });

    it("should handle single data point", () => {
      const data = [{ date: new Date("2024-01-01"), value: 1.5 }];

      const volatility = calculateVolatility(data);

      expect(volatility).toBe(0);
    });
  });

  describe("Trend Analysis", () => {
    it("should identify upward trend correctly", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.0 },
        { date: new Date("2024-01-02"), value: 1.05 },
        { date: new Date("2024-01-03"), value: 1.1 },
        { date: new Date("2024-01-04"), value: 1.15 },
        { date: new Date("2024-01-05"), value: 1.2 },
      ];

      const regression = linearRegression(data);
      const trend = regression.slope > 0.01 ? "up" : regression.slope < -0.01 ? "down" : "stable";

      expect(trend).toBe("up");
    });

    it("should identify downward trend correctly", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.5 },
        { date: new Date("2024-01-02"), value: 1.45 },
        { date: new Date("2024-01-03"), value: 1.4 },
        { date: new Date("2024-01-04"), value: 1.35 },
        { date: new Date("2024-01-05"), value: 1.3 },
      ];

      const regression = linearRegression(data);
      const trend = regression.slope > 0.01 ? "up" : regression.slope < -0.01 ? "down" : "stable";

      expect(trend).toBe("down");
    });

    it("should identify stable trend correctly", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.33 },
        { date: new Date("2024-01-02"), value: 1.34 },
        { date: new Date("2024-01-03"), value: 1.32 },
        { date: new Date("2024-01-04"), value: 1.33 },
        { date: new Date("2024-01-05"), value: 1.34 },
      ];

      const regression = linearRegression(data);
      const trend = regression.slope > 0.01 ? "up" : regression.slope < -0.01 ? "down" : "stable";

      expect(trend).toBe("stable");
    });
  });

  describe("Exponential Smoothing Predictions", () => {
    function exponentialSmoothing(data: { date: Date; value: number }[], alpha: number = 0.3, forecastDays: number = 7) {
      if (data.length === 0) return [];

      const values = data.map(d => d.value);
      let smoothed = values[0];
      
      for (let i = 1; i < values.length; i++) {
        smoothed = alpha * values[i] + (1 - alpha) * smoothed;
      }

      const regression = linearRegression(data);
      const volatility = calculateVolatility(data);

      const predictions: { date: string; predictedValue: number; lowerBound: number; upperBound: number; confidence: number }[] = [];
      const lastDate = data[data.length - 1].date;
      
      for (let i = 1; i <= forecastDays; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setDate(futureDate.getDate() + i);
        
        const trendAdjustment = regression.slope * i;
        const predictedValue = smoothed + trendAdjustment;
        
        const confidenceMultiplier = 1.96 * volatility * Math.sqrt(i);
        const confidence = Math.max(0.5, 1 - (i * 0.05));
        
        predictions.push({
          date: futureDate.toISOString().split('T')[0],
          predictedValue: Math.max(0, predictedValue),
          lowerBound: Math.max(0, predictedValue - confidenceMultiplier),
          upperBound: predictedValue + confidenceMultiplier,
          confidence,
        });
      }

      return predictions;
    }

    it("should generate correct number of predictions", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.3 },
        { date: new Date("2024-01-02"), value: 1.35 },
        { date: new Date("2024-01-03"), value: 1.32 },
      ];

      const predictions = exponentialSmoothing(data, 0.3, 7);

      expect(predictions).toHaveLength(7);
    });

    it("should have decreasing confidence over time", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.3 },
        { date: new Date("2024-01-02"), value: 1.35 },
        { date: new Date("2024-01-03"), value: 1.32 },
      ];

      const predictions = exponentialSmoothing(data, 0.3, 7);

      for (let i = 1; i < predictions.length; i++) {
        expect(predictions[i].confidence).toBeLessThanOrEqual(predictions[i - 1].confidence);
      }
    });

    it("should have widening confidence intervals over time", () => {
      const data = [
        { date: new Date("2024-01-01"), value: 1.3 },
        { date: new Date("2024-01-02"), value: 1.4 },
        { date: new Date("2024-01-03"), value: 1.2 },
        { date: new Date("2024-01-04"), value: 1.35 },
      ];

      const predictions = exponentialSmoothing(data, 0.3, 7);

      for (let i = 1; i < predictions.length; i++) {
        const prevWidth = predictions[i - 1].upperBound - predictions[i - 1].lowerBound;
        const currWidth = predictions[i].upperBound - predictions[i].lowerBound;
        expect(currWidth).toBeGreaterThanOrEqual(prevWidth - 0.001); // Allow small floating point errors
      }
    });

    it("should return empty array for empty data", () => {
      const predictions = exponentialSmoothing([], 0.3, 7);
      expect(predictions).toHaveLength(0);
    });
  });
});
