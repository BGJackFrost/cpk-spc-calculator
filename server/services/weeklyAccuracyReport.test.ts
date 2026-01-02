import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateWeeklyReportData,
  sendWeeklyAccuracyReport,
  triggerWeeklyAccuracyReport,
} from "./weeklyAccuracyReportService";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../emailService", () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true, sentCount: 1 })),
}));

vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

describe("Weekly Accuracy Report Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateWeeklyReportData", () => {
    it("should return report data structure", async () => {
      const report = await generateWeeklyReportData();
      
      expect(report).toBeDefined();
      expect(report.reportPeriod).toBeDefined();
      expect(report.reportPeriod.start).toBeDefined();
      expect(report.reportPeriod.end).toBeDefined();
    });

    it("should include all required sections", async () => {
      const report = await generateWeeklyReportData();
      
      expect(report).toHaveProperty("reportPeriod");
      expect(report).toHaveProperty("overallMetrics");
      expect(report).toHaveProperty("modelComparison");
      expect(report).toHaveProperty("byPredictionType");
      expect(report).toHaveProperty("weekOverWeekChange");
      expect(report).toHaveProperty("alerts");
    });

    it("should have correct date range for weekly report", async () => {
      const report = await generateWeeklyReportData();
      
      const startDate = new Date(report.reportPeriod.start);
      const endDate = new Date(report.reportPeriod.end);
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysDiff).toBe(7);
    });
  });

  describe("sendWeeklyAccuracyReport", () => {
    it("should return result with sent and failed counts", async () => {
      const result = await sendWeeklyAccuracyReport();
      
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("failed");
      expect(typeof result.sent).toBe("number");
      expect(typeof result.failed).toBe("number");
    });
  });

  describe("triggerWeeklyAccuracyReport", () => {
    it("should return success status and message", async () => {
      const result = await triggerWeeklyAccuracyReport();
      
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("failed");
    });
  });
});
