import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compareModelVersions,
  compareMultipleModels,
  getAllModelsAccuracySummary,
  getVersionAccuracyTrend,
} from "./modelVersionComparisonService";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

describe("Model Version Comparison Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("compareModelVersions", () => {
    it("should return null when no db connection", async () => {
      const result = await compareModelVersions(1);
      expect(result).toBeNull();
    });

    it("should accept optional date range parameters", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      
      const result = await compareModelVersions(1, startDate, endDate);
      expect(result).toBeNull(); // No db connection
    });
  });

  describe("compareMultipleModels", () => {
    it("should return empty models array when no db connection", async () => {
      const result = await compareMultipleModels([1, 2, 3]);
      
      expect(result).toBeDefined();
      expect(result.models).toEqual([]);
      expect(result.overallBestModel).toBeNull();
      expect(result.summary).toBeDefined();
    });

    it("should have correct summary structure", async () => {
      const result = await compareMultipleModels([1, 2]);
      
      expect(result.summary).toHaveProperty("totalModels");
      expect(result.summary).toHaveProperty("totalVersions");
      expect(result.summary).toHaveProperty("avgAccuracy");
      expect(result.summary).toHaveProperty("bestAccuracy");
      expect(result.summary).toHaveProperty("worstAccuracy");
    });
  });

  describe("getAllModelsAccuracySummary", () => {
    it("should return empty summary when no db connection", async () => {
      const result = await getAllModelsAccuracySummary();
      
      expect(result).toBeDefined();
      expect(result.models).toEqual([]);
      expect(result.totalModels).toBe(0);
      expect(result.activeModels).toBe(0);
    });
  });

  describe("getVersionAccuracyTrend", () => {
    it("should return empty trend when no db connection", async () => {
      const result = await getVersionAccuracyTrend(1);
      
      expect(result).toBeDefined();
      expect(result.modelId).toBe(1);
      expect(result.modelName).toBe("");
      expect(result.trend).toEqual([]);
      expect(result.trendDirection).toBe("stable");
      expect(result.improvementRate).toBe(0);
    });

    it("should accept limit parameter", async () => {
      const result = await getVersionAccuracyTrend(1, 5);
      
      expect(result).toBeDefined();
      expect(result.trend).toEqual([]);
    });
  });
});
