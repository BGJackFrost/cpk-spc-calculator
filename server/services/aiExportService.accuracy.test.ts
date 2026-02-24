import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAccuracyMetricsData,
  generateAccuracyMetricsHtml,
  generateAccuracyMetricsExcel,
} from "./aiExportService";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

describe("aiExportService - Accuracy Metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAccuracyMetricsData", () => {
    it("should throw error when database is not available", async () => {
      await expect(getAccuracyMetricsData(30)).rejects.toThrow("Database not available");
    });
  });

  describe("generateAccuracyMetricsHtml", () => {
    it("should generate valid HTML report", async () => {
      const mockData = {
        generatedAt: new Date(),
        period: {
          startDate: "2024-12-01",
          endDate: "2024-12-31",
          days: 30,
        },
        overallMetrics: {
          cpkAccuracy: 85.5,
          oeeAccuracy: 82.3,
          trendAccuracy: 83.9,
          totalPredictions: 100,
          correctPredictions: 85,
        },
        modelMetrics: [
          {
            modelId: 1,
            modelName: "CPK Predictor",
            modelType: "regression",
            accuracy: 88.5,
            precision: 0.87,
            recall: 0.89,
            f1Score: 0.88,
            totalPredictions: 50,
            correctPredictions: 44,
          },
        ],
        dailyMetrics: [
          {
            date: "2024-12-30",
            cpkAccuracy: 85.0,
            oeeAccuracy: 82.0,
            predictions: 10,
          },
          {
            date: "2024-12-31",
            cpkAccuracy: 86.0,
            oeeAccuracy: 83.0,
            predictions: 12,
          },
        ],
      };

      const html = await generateAccuracyMetricsHtml(mockData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Báo cáo Accuracy Metrics");
      expect(html).toContain("CPK Accuracy");
      expect(html).toContain("OEE Accuracy");
      expect(html).toContain("85.5%");
      expect(html).toContain("82.3%");
      expect(html).toContain("CPK Predictor");
    });

    it("should include period information in HTML", async () => {
      const mockData = {
        generatedAt: new Date(),
        period: {
          startDate: "2024-12-01",
          endDate: "2024-12-31",
          days: 30,
        },
        overallMetrics: {
          cpkAccuracy: 85.5,
          oeeAccuracy: 82.3,
          trendAccuracy: 83.9,
          totalPredictions: 100,
          correctPredictions: 85,
        },
        modelMetrics: [],
        dailyMetrics: [],
      };

      const html = await generateAccuracyMetricsHtml(mockData);

      expect(html).toContain("30 ngày");
    });
  });

  describe("generateAccuracyMetricsExcel", () => {
    it("should generate valid Excel buffer", async () => {
      const mockData = {
        generatedAt: new Date(),
        period: {
          startDate: "2024-12-01",
          endDate: "2024-12-31",
          days: 30,
        },
        overallMetrics: {
          cpkAccuracy: 85.5,
          oeeAccuracy: 82.3,
          trendAccuracy: 83.9,
          totalPredictions: 100,
          correctPredictions: 85,
        },
        modelMetrics: [
          {
            modelId: 1,
            modelName: "CPK Predictor",
            modelType: "regression",
            accuracy: 88.5,
            precision: 0.87,
            recall: 0.89,
            f1Score: 0.88,
            totalPredictions: 50,
            correctPredictions: 44,
          },
        ],
        dailyMetrics: [
          {
            date: "2024-12-30",
            cpkAccuracy: 85.0,
            oeeAccuracy: 82.0,
            predictions: 10,
          },
        ],
      };

      const buffer = await generateAccuracyMetricsExcel(mockData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Excel files start with PK (zip format)
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
    });
  });
});
