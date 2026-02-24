/**
 * Tests for Predictive Maintenance Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Create a chainable mock that supports multiple leftJoin calls
const createChainableMock = () => {
  const mockPredictionResult = [{
    prediction: { id: 1, severity: "high", status: "active" },
    deviceName: "Test Device",
    deviceCode: "DEV-001",
    modelName: "Test Model",
  }];
  
  const mockHealthHistoryResult = [{
    id: 1,
    healthScore: "85.5",
    errorCount: 2,
    warningCount: 5,
    recordedAt: new Date().toISOString(),
  }];
  
  const mockModelResult = [{
    id: 1,
    name: "Test Model",
    modelType: "health_decay",
    isActive: 1,
  }];
  
  const mockPredictionsArray = [
    { id: 1, severity: "high", status: "active", confidenceScore: "0.85", deviceId: 1 },
    { id: 2, severity: "critical", status: "active", confidenceScore: "0.90", deviceId: 2 },
    { id: 3, severity: "medium", status: "resolved", confidenceScore: "0.75", deviceId: 1 },
  ];

  // Create a chainable object that returns itself for chaining
  const createChain = (finalResult: any) => {
    const chain: any = {
      from: vi.fn(() => chain),
      leftJoin: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => Promise.resolve(finalResult)),
      then: (resolve: any) => Promise.resolve(finalResult).then(resolve),
    };
    return chain;
  };

  return {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{ insertId: 1 }])),
    })),
    select: vi.fn((selectFields?: any) => {
      // If selecting specific fields (like in getMaintenancePredictions), return prediction results
      if (selectFields && typeof selectFields === 'object') {
        return createChain(mockPredictionResult);
      }
      // Default select returns array directly (for getPredictiveMaintenanceStats)
      const chain = createChain(mockPredictionsArray);
      // Override the promise behavior for direct select().from()
      chain.from = vi.fn(() => {
        const innerChain = createChain(mockPredictionsArray);
        // Make it directly thenable for simple queries
        innerChain.then = (resolve: any) => Promise.resolve(mockPredictionsArray).then(resolve);
        innerChain.where = vi.fn(() => {
          const whereChain = createChain(mockHealthHistoryResult);
          whereChain.orderBy = vi.fn(() => {
            const orderChain = createChain(mockHealthHistoryResult);
            orderChain.limit = vi.fn(() => Promise.resolve(mockHealthHistoryResult));
            orderChain.then = (resolve: any) => Promise.resolve(mockHealthHistoryResult).then(resolve);
            return orderChain;
          });
          whereChain.then = (resolve: any) => Promise.resolve(mockHealthHistoryResult).then(resolve);
          return whereChain;
        });
        innerChain.orderBy = vi.fn(() => {
          const orderChain = createChain(mockModelResult);
          orderChain.then = (resolve: any) => Promise.resolve(mockModelResult).then(resolve);
          return orderChain;
        });
        innerChain.leftJoin = vi.fn(() => {
          const joinChain = createChain(mockPredictionResult);
          joinChain.leftJoin = vi.fn(() => {
            const secondJoinChain = createChain(mockPredictionResult);
            secondJoinChain.where = vi.fn(() => {
              const whereChain = createChain(mockPredictionResult);
              whereChain.orderBy = vi.fn(() => {
                const orderChain = createChain(mockPredictionResult);
                orderChain.limit = vi.fn(() => Promise.resolve(mockPredictionResult));
                orderChain.then = (resolve: any) => Promise.resolve(mockPredictionResult).then(resolve);
                return orderChain;
              });
              whereChain.then = (resolve: any) => Promise.resolve(mockPredictionResult).then(resolve);
              return whereChain;
            });
            secondJoinChain.orderBy = vi.fn(() => {
              const orderChain = createChain(mockPredictionResult);
              orderChain.limit = vi.fn(() => Promise.resolve(mockPredictionResult));
              orderChain.then = (resolve: any) => Promise.resolve(mockPredictionResult).then(resolve);
              return orderChain;
            });
            secondJoinChain.then = (resolve: any) => Promise.resolve(mockPredictionResult).then(resolve);
            return secondJoinChain;
          });
          return joinChain;
        });
        return innerChain;
      });
      return chain;
    }),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  };
};

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(createChainableMock())),
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
        name: "Test Model",
        modelType: "health_decay" as const,
        description: "Test description",
        parameters: { threshold: 70 },
        isActive: true,
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
  });

  describe("getPredictionModelById", () => {
    it("should return a prediction model by id", async () => {
      const model = await getPredictionModelById(1);
      expect(model).toBeDefined();
    });
  });

  describe("updatePredictionModel", () => {
    it("should update a prediction model", async () => {
      await expect(
        updatePredictionModel(1, { name: "Updated Model" })
      ).resolves.not.toThrow();
    });
  });

  describe("deletePredictionModel", () => {
    it("should delete a prediction model", async () => {
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
