import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getEffectiveThreshold,
  checkCpkPredictionAlert,
  checkOeePredictionAlert,
  getPredictionAlertStats,
} from "./predictionAlertNotificationService";

// Mock dependencies
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("../sse", () => ({
  broadcastEvent: vi.fn(),
}));

describe("predictionAlertNotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEffectiveThreshold", () => {
    it("should return default thresholds when database is not available", async () => {
      const threshold = await getEffectiveThreshold();
      
      expect(threshold).toEqual({
        cpkWarning: 1.33,
        cpkCritical: 1.0,
        oeeWarning: 75,
        oeeCritical: 60,
        trendDeclineWarning: 5,
        trendDeclineCritical: 10,
        emailAlertEnabled: true,
        alertEmails: null,
        webhookEnabled: false,
        webhookUrl: null,
      });
    });
  });

  describe("checkCpkPredictionAlert", () => {
    it("should return critical alert when predicted CPK is below critical threshold", async () => {
      const result = await checkCpkPredictionAlert(
        0.8, // predictedCpk below critical (1.0)
        1.5, // currentCpk
        "PRODUCT-001",
        "Station-A"
      );

      expect(result).not.toBeNull();
      expect(result?.alertType).toBe("critical");
      expect(result?.metric).toBe("cpk");
      expect(result?.message).toContain("CẢNH BÁO NGHIÊM TRỌNG");
    });

    it("should return warning alert when predicted CPK is below warning threshold", async () => {
      const result = await checkCpkPredictionAlert(
        1.2, // predictedCpk below warning (1.33) but above critical (1.0)
        1.5, // currentCpk
        "PRODUCT-001",
        "Station-A"
      );

      expect(result).not.toBeNull();
      expect(result?.alertType).toBe("warning");
      expect(result?.metric).toBe("cpk");
      expect(result?.message).toContain("CẢNH BÁO");
    });

    it("should return null when predicted CPK is above warning threshold", async () => {
      const result = await checkCpkPredictionAlert(
        1.5, // predictedCpk above warning (1.33)
        1.5, // currentCpk
        "PRODUCT-001",
        "Station-A"
      );

      expect(result).toBeNull();
    });

    it("should detect trend decline critical alert", async () => {
      const result = await checkCpkPredictionAlert(
        1.35, // predictedCpk above warning
        1.6, // currentCpk - decline of 15.6% > trendDeclineCritical (10%)
        "PRODUCT-001",
        "Station-A"
      );

      expect(result).not.toBeNull();
      expect(result?.alertType).toBe("critical");
      expect(result?.message).toContain("giảm");
    });

    it("should detect trend decline warning alert", async () => {
      const result = await checkCpkPredictionAlert(
        1.4, // predictedCpk above warning
        1.5, // currentCpk - decline of 6.7% > trendDeclineWarning (5%)
        "PRODUCT-001",
        "Station-A"
      );

      expect(result).not.toBeNull();
      expect(result?.alertType).toBe("warning");
      expect(result?.message).toContain("giảm");
    });
  });

  describe("checkOeePredictionAlert", () => {
    it("should return critical alert when predicted OEE is below critical threshold", async () => {
      const result = await checkOeePredictionAlert(
        55, // predictedOee below critical (60)
        80, // currentOee
        1,
        "Line-A"
      );

      expect(result).not.toBeNull();
      expect(result?.alertType).toBe("critical");
      expect(result?.metric).toBe("oee");
      expect(result?.message).toContain("CẢNH BÁO NGHIÊM TRỌNG");
    });

    it("should return warning alert when predicted OEE is below warning threshold", async () => {
      const result = await checkOeePredictionAlert(
        70, // predictedOee below warning (75) but above critical (60)
        85, // currentOee
        1,
        "Line-A"
      );

      expect(result).not.toBeNull();
      expect(result?.alertType).toBe("warning");
      expect(result?.metric).toBe("oee");
      expect(result?.message).toContain("CẢNH BÁO");
    });

    it("should return null when predicted OEE is above warning threshold", async () => {
      const result = await checkOeePredictionAlert(
        85, // predictedOee above warning (75)
        85, // currentOee
        1,
        "Line-A"
      );

      expect(result).toBeNull();
    });
  });

  describe("getPredictionAlertStats", () => {
    it("should return empty stats when database is not available", async () => {
      const stats = await getPredictionAlertStats(7);

      expect(stats).toEqual({
        totalAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        cpkAlerts: 0,
        oeeAlerts: 0,
        alertsByDay: [],
      });
    });
  });
});
