/**
 * Tests for Predictive Maintenance Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{ insertId: 1 }])),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{
            id: 1,
            name: "Test Model",
            modelType: "health_decay",
            isActive: 1,
          }])),
          orderBy: vi.fn(() => Promise.resolve([{
            id: 1,
            healthScore: "85.5",
            errorCount: 2,
            warningCount: 5,
            recordedAt: new Date().toISOString(),
          }])),
        })),
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{
              prediction: { id: 1, severity: "high", status: "active" },
              deviceName: "Test Device",
              deviceCode: "DEV-001",
              modelName: "Test Model",
            }])),
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{
                prediction: { id: 1, severity: "high", status: "active" },
                deviceName: "Test Device",
                deviceCode: "DEV-001",
                modelName: "Test Model",
              }])),
            })),
          })),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{
              prediction: { id: 1, severity: "high", status: "active" },
              deviceName: "Test Device",
              deviceCode: "DEV-001",
              modelName: "Test Model",
            }])),
          })),
        })),
        orderBy: vi.fn(() => Promise.resolve([{
          id: 1,
          name: "Test Model",
          modelType: "health_decay",
          isActive: 1,
        }])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}));

// Mock LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn(() => Promise.resolve({
    choices: [{
      message: {
        content: "Based on the device health data, I recommend scheduling preventive maintenance within the next 7 days.",
      },
    }],
  })),
}));

import {
  createPredictionModel,
  getPredictionModels,
  getPredictionModelById,
  updatePredictionModel,
  deletePredictionModel,
  createMaintenancePrediction,
  getMaintenancePredictions,
  acknowledgePrediction,
  resolvePrediction,
  recordDeviceHealthHistory,
  getDeviceHealthHistory,
  analyzeDeviceHealth,
  getPredictiveMaintenanceStats,
} from "./predictiveMaintenanceService";

describe("Predictive Maintenance Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createPredictionModel", () => {
    it("should create a new prediction model", async () => {
      const modelData = {
        name: "Health Decay Model",
        modelType: "health_decay" as const,
        inputFeatures: ["health_score", "error_count"],
        outputMetric: "days_until_maintenance",
        isActive: 1,
        createdBy: 1,
      };

      const id = await createPredictionModel(modelData);
      expect(id).toBe(1);
    });
  });

  describe("getPredictionModels", () => {
    it("should return list of prediction models", async () => {
      const models = await getPredictionModels();
      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
    });

    it("should filter by model type", async () => {
      const models = await getPredictionModels({ modelType: "health_decay" });
      expect(models).toBeDefined();
    });

    it("should filter by active status", async () => {
      const models = await getPredictionModels({ isActive: true });
      expect(models).toBeDefined();
    });
  });

  describe("getPredictionModelById", () => {
    it("should return prediction model by id", async () => {
      const model = await getPredictionModelById(1);
      expect(model).toBeDefined();
      expect(model?.id).toBe(1);
    });
  });

  describe("updatePredictionModel", () => {
    it("should update prediction model", async () => {
      await expect(
        updatePredictionModel(1, { name: "Updated Model" })
      ).resolves.not.toThrow();
    });
  });

  describe("deletePredictionModel", () => {
    it("should delete prediction model", async () => {
      await expect(deletePredictionModel(1)).resolves.not.toThrow();
    });
  });

  describe("createMaintenancePrediction", () => {
    it("should create a new maintenance prediction", async () => {
      const predictionData = {
        modelId: 1,
        deviceId: 1,
        predictionType: "maintenance_needed" as const,
        severity: "high" as const,
        status: "active" as const,
        confidenceScore: "0.85",
        currentHealthScore: "75.5",
      };

      const id = await createMaintenancePrediction(predictionData);
      expect(id).toBe(1);
    });
  });

  describe("getMaintenancePredictions", () => {
    it("should return list of predictions", async () => {
      const predictions = await getMaintenancePredictions();
      expect(predictions).toBeDefined();
      expect(Array.isArray(predictions)).toBe(true);
    });

    it("should filter by device id", async () => {
      const predictions = await getMaintenancePredictions({ deviceId: 1 });
      expect(predictions).toBeDefined();
    });

    it("should filter by severity", async () => {
      const predictions = await getMaintenancePredictions({ severity: "high" });
      expect(predictions).toBeDefined();
    });
  });

  describe("acknowledgePrediction", () => {
    it("should acknowledge a prediction", async () => {
      await expect(acknowledgePrediction(1, 1)).resolves.not.toThrow();
    });
  });

  describe("resolvePrediction", () => {
    it("should resolve a prediction", async () => {
      await expect(
        resolvePrediction(1, "Maintenance completed successfully", true)
      ).resolves.not.toThrow();
    });
  });

  describe("recordDeviceHealthHistory", () => {
    it("should record device health history", async () => {
      const historyData = {
        deviceId: 1,
        healthScore: "85.5",
        errorCount: 2,
        warningCount: 5,
        recordedAt: new Date().toISOString(),
      };

      const id = await recordDeviceHealthHistory(historyData);
      expect(id).toBe(1);
    });
  });

  describe("getDeviceHealthHistory", () => {
    it("should return device health history", async () => {
      const history = await getDeviceHealthHistory(1);
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });

    it("should filter by date range", async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const history = await getDeviceHealthHistory(1, {
        startDate,
        endDate: new Date(),
      });
      expect(history).toBeDefined();
    });
  });

  describe("analyzeDeviceHealth", () => {
    it("should analyze device health and return trend data", async () => {
      const analysis = await analyzeDeviceHealth(1);
      
      expect(analysis).toBeDefined();
      expect(analysis.currentHealth).toBeDefined();
      expect(analysis.trend).toBeDefined();
      expect(analysis.riskLevel).toBeDefined();
      expect(["low", "medium", "high", "critical"]).toContain(analysis.riskLevel);
    });
  });

  describe("getPredictiveMaintenanceStats", () => {
    it("should return predictive maintenance statistics", async () => {
      const stats = await getPredictiveMaintenanceStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.totalPredictions).toBe("number");
      expect(typeof stats.activePredictions).toBe("number");
      expect(typeof stats.criticalPredictions).toBe("number");
      expect(typeof stats.devicesAtRisk).toBe("number");
    });
  });
});

describe("Health Trend Analysis", () => {
  it("should calculate linear regression correctly", () => {
    // Test the trend calculation logic
    const data = [
      { x: 0, y: 100 },
      { x: 1, y: 95 },
      { x: 2, y: 90 },
      { x: 3, y: 85 },
      { x: 4, y: 80 },
    ];

    // Calculate expected slope: (80-100)/(4-0) = -5
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.x, 0);
    const sumY = data.reduce((sum, d) => sum + d.y, 0);
    const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
    const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    expect(slope).toBe(-5);
    expect(intercept).toBe(100);
  });

  it("should predict days until threshold correctly", () => {
    const slope = -5;
    const intercept = 100;
    const threshold = 50;
    const currentX = 4;

    // Current value: -5 * 4 + 100 = 80
    // Days until 50: (50 - 100) / -5 - 4 = 10 - 4 = 6 days
    const predictedDays = Math.ceil((threshold - intercept) / slope - currentX);
    
    expect(predictedDays).toBe(6);
  });
});
