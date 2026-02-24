import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateAiReportHtml,
  generateCpkForecastReport,
} from "./aiExportService";

describe("aiExportService", () => {
  describe("generateAiReportHtml", () => {
    it("should generate valid HTML report with statistics", async () => {
      const mockData = {
        title: "Test AI Report",
        generatedAt: new Date("2024-01-01"),
        models: [
          {
            id: "model-1",
            name: "Test Model",
            type: "regression",
            accuracy: 95.5,
            status: "active",
            createdAt: new Date("2024-01-01"),
            predictions: 100,
          },
        ],
        predictions: [],
        trainingJobs: [
          {
            id: "job-1",
            name: "Training Job 1",
            status: "completed",
            progress: 100,
            accuracy: 92.3,
            startedAt: new Date("2024-01-01"),
            completedAt: new Date("2024-01-02"),
          },
        ],
        statistics: {
          totalModels: 5,
          activeModels: 3,
          avgAccuracy: 90.5,
          totalPredictions: 500,
          totalTrainingJobs: 10,
          completedJobs: 8,
        },
      };

      const html = await generateAiReportHtml(mockData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain(mockData.title);
      expect(html).toContain("5"); // totalModels
      expect(html).toContain("3"); // activeModels
      expect(html).toContain("90.5%"); // avgAccuracy
      expect(html).toContain("Test Model");
      expect(html).toContain("Training Job 1");
    });

    it("should handle empty data gracefully", async () => {
      const emptyData = {
        title: "Empty Report",
        generatedAt: new Date(),
        models: [],
        predictions: [],
        trainingJobs: [],
        statistics: {
          totalModels: 0,
          activeModels: 0,
          avgAccuracy: 0,
          totalPredictions: 0,
          totalTrainingJobs: 0,
          completedJobs: 0,
        },
      };

      const html = await generateAiReportHtml(emptyData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Empty Report");
      expect(html).toContain("0"); // totalModels
    });
  });

  describe("generateCpkForecastReport", () => {
    it("should generate valid CPK forecast HTML report", async () => {
      const mockData = {
        productCode: "PROD-001",
        stationName: "Station A",
        currentCpk: 1.45,
        forecastDays: 7,
        predictions: [
          {
            date: "2024-01-02",
            predictedCpk: 1.42,
            lowerBound: 1.35,
            upperBound: 1.49,
            confidence: 0.95,
          },
          {
            date: "2024-01-03",
            predictedCpk: 1.40,
            lowerBound: 1.32,
            upperBound: 1.48,
            confidence: 0.90,
          },
        ],
        trend: "stable" as const,
        recommendations: [
          "Duy trì quy trình hiện tại",
          "Tiếp tục theo dõi xu hướng",
        ],
      };

      const html = await generateCpkForecastReport(mockData);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("PROD-001");
      expect(html).toContain("Station A");
      expect(html).toContain("1.45"); // currentCpk
      expect(html).toContain("1.42"); // first prediction
      expect(html).toContain("Ổn định"); // trend text
      expect(html).toContain("Duy trì quy trình hiện tại");
    });

    it("should show correct trend indicators", async () => {
      const upTrendData = {
        productCode: "PROD-002",
        stationName: "Station B",
        currentCpk: 1.2,
        forecastDays: 7,
        predictions: [
          {
            date: "2024-01-02",
            predictedCpk: 1.3,
            lowerBound: 1.2,
            upperBound: 1.4,
            confidence: 0.9,
          },
        ],
        trend: "up" as const,
        recommendations: ["CPK đang cải thiện"],
      };

      const html = await generateCpkForecastReport(upTrendData);
      expect(html).toContain("Tăng");
      expect(html).toContain("#28a745"); // green color for up trend
    });

    it("should show down trend correctly", async () => {
      const downTrendData = {
        productCode: "PROD-003",
        stationName: "Station C",
        currentCpk: 1.5,
        forecastDays: 7,
        predictions: [
          {
            date: "2024-01-02",
            predictedCpk: 1.3,
            lowerBound: 1.2,
            upperBound: 1.4,
            confidence: 0.85,
          },
        ],
        trend: "down" as const,
        recommendations: ["Cần kiểm tra quy trình"],
      };

      const html = await generateCpkForecastReport(downTrendData);
      expect(html).toContain("Giảm");
      expect(html).toContain("#dc3545"); // red color for down trend
    });
  });
});
