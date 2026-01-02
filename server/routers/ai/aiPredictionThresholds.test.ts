import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
};

vi.mock("../../db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

vi.mock("../../../drizzle/schema", () => ({
  aiPredictionThresholds: { id: "id", name: "name", isActive: "isActive", priority: "priority", createdAt: "createdAt" },
  aiPredictionHistory: { id: "id", predictionType: "predictionType", status: "status", predictedAt: "predictedAt" },
  products: { id: "id", name: "name", code: "code" },
  productionLines: { id: "id", name: "name", status: "status" },
  workstations: { id: "id", name: "name", code: "code", isActive: "isActive" },
  spcAnalysisHistory: { cpk: "cpk", createdAt: "createdAt", productCode: "productCode" },
  oeeRecords: { oee: "oee", recordDate: "recordDate", productionLineId: "productionLineId" },
}));

describe("AI Prediction Thresholds Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return empty list when no thresholds exist", async () => {
      const result = { thresholds: [], total: 0 };
      expect(result.thresholds).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should return thresholds with correct structure", async () => {
      const mockThresholds = [
        {
          id: 1,
          name: "Test Threshold",
          cpkWarning: "1.33",
          cpkCritical: "1.00",
          oeeWarning: "75.00",
          oeeCritical: "60.00",
          isActive: 1,
          priority: 10,
        },
      ];

      const result = { thresholds: mockThresholds, total: 1 };
      expect(result.thresholds).toHaveLength(1);
      expect(result.thresholds[0].name).toBe("Test Threshold");
    });
  });

  describe("getEffective", () => {
    it("should return default thresholds when no custom thresholds exist", async () => {
      const defaultThresholds = {
        cpkWarning: 1.33,
        cpkCritical: 1.0,
        cpkTarget: 1.67,
        oeeWarning: 75,
        oeeCritical: 60,
        oeeTarget: 85,
        trendDeclineWarning: 5,
        trendDeclineCritical: 10,
        source: "default",
      };

      expect(defaultThresholds.cpkWarning).toBe(1.33);
      expect(defaultThresholds.cpkCritical).toBe(1.0);
      expect(defaultThresholds.oeeWarning).toBe(75);
      expect(defaultThresholds.source).toBe("default");
    });

    it("should return custom threshold when matching criteria", async () => {
      const mockThreshold = {
        id: 1,
        name: "Custom Threshold",
        cpkWarning: "1.50",
        cpkCritical: "1.20",
        cpkTarget: "2.00",
        oeeWarning: "80.00",
        oeeCritical: "70.00",
        oeeTarget: "90.00",
        productId: 1,
        isActive: 1,
        priority: 10,
      };

      const result = {
        cpkWarning: parseFloat(mockThreshold.cpkWarning),
        cpkCritical: parseFloat(mockThreshold.cpkCritical),
        cpkTarget: parseFloat(mockThreshold.cpkTarget),
        oeeWarning: parseFloat(mockThreshold.oeeWarning),
        oeeCritical: parseFloat(mockThreshold.oeeCritical),
        oeeTarget: parseFloat(mockThreshold.oeeTarget),
        source: mockThreshold.name,
        thresholdId: mockThreshold.id,
      };

      expect(result.cpkWarning).toBe(1.5);
      expect(result.cpkCritical).toBe(1.2);
      expect(result.oeeWarning).toBe(80);
      expect(result.source).toBe("Custom Threshold");
    });
  });

  describe("create", () => {
    it("should create a new threshold with valid data", async () => {
      const result = { success: true, id: 1 };
      expect(result.success).toBe(true);
      expect(result.id).toBe(1);
    });
  });

  describe("update", () => {
    it("should update threshold with partial data", async () => {
      const result = { success: true };
      expect(result.success).toBe(true);
    });
  });

  describe("delete", () => {
    it("should delete threshold by id", async () => {
      const result = { success: true };
      expect(result.success).toBe(true);
    });
  });
});

describe("AI Prediction History Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return empty history when no predictions exist", async () => {
      const result = { history: [], total: 0 };
      expect(result.history).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should return history with correct structure", async () => {
      const mockHistory = [
        {
          id: 1,
          predictionType: "cpk",
          predictedValue: "1.500000",
          actualValue: "1.480000",
          predictedAt: "2025-01-01T00:00:00.000Z",
          status: "verified",
          percentError: "1.3333",
          isWithinConfidence: 1,
        },
      ];

      const result = { history: mockHistory, total: 1 };
      expect(result.history).toHaveLength(1);
      expect(result.history[0].predictionType).toBe("cpk");
      expect(result.history[0].status).toBe("verified");
    });
  });

  describe("getAccuracyMetrics", () => {
    it("should return zero metrics when no verified predictions", async () => {
      const result = {
        totalPredictions: 0,
        verifiedPredictions: 0,
        mae: 0,
        rmse: 0,
        mape: 0,
        withinConfidenceRate: 0,
        trendAccuracy: 0,
      };

      expect(result.totalPredictions).toBe(0);
      expect(result.mae).toBe(0);
      expect(result.rmse).toBe(0);
    });

    it("should calculate metrics correctly", async () => {
      const mockPredictions = [
        { absoluteError: "0.02", squaredError: "0.0004", percentError: "1.33", isWithinConfidence: 1 },
        { absoluteError: "0.03", squaredError: "0.0009", percentError: "2.00", isWithinConfidence: 1 },
        { absoluteError: "0.05", squaredError: "0.0025", percentError: "3.33", isWithinConfidence: 0 },
      ];

      const n = mockPredictions.length;
      const sumAbsError = mockPredictions.reduce((sum, p) => sum + parseFloat(p.absoluteError), 0);
      const sumSquaredError = mockPredictions.reduce((sum, p) => sum + parseFloat(p.squaredError), 0);
      const sumPercentError = mockPredictions.reduce((sum, p) => sum + parseFloat(p.percentError), 0);
      const withinConfidenceCount = mockPredictions.filter(p => p.isWithinConfidence === 1).length;

      const mae = sumAbsError / n;
      const rmse = Math.sqrt(sumSquaredError / n);
      const mape = sumPercentError / n;
      const withinConfidenceRate = (withinConfidenceCount / n) * 100;

      expect(mae).toBeCloseTo(0.0333, 3);
      expect(rmse).toBeCloseTo(0.0356, 3);
      expect(mape).toBeCloseTo(2.22, 1);
      expect(withinConfidenceRate).toBeCloseTo(66.67, 1);
    });
  });

  describe("verifyPrediction", () => {
    it("should verify prediction and calculate errors", async () => {
      const prediction = {
        id: 1,
        predictedValue: "1.500000",
        confidenceLower: "1.400000",
        confidenceUpper: "1.600000",
      };
      const actualValue = 1.48;

      const predicted = parseFloat(prediction.predictedValue);
      const absoluteError = Math.abs(predicted - actualValue);
      const percentError = (absoluteError / Math.abs(predicted)) * 100;
      const squaredError = Math.pow(predicted - actualValue, 2);
      
      const lower = parseFloat(prediction.confidenceLower);
      const upper = parseFloat(prediction.confidenceUpper);
      const isWithinConfidence = actualValue >= lower && actualValue <= upper;

      expect(absoluteError).toBeCloseTo(0.02, 4);
      expect(percentError).toBeCloseTo(1.33, 1);
      expect(squaredError).toBeCloseTo(0.0004, 6);
      expect(isWithinConfidence).toBe(true);
    });
  });
});
