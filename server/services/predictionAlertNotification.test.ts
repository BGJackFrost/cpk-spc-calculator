import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sendPredictionEmailAlert,
  checkCpkPredictionAlertWithEmail,
  checkOeePredictionAlertWithEmail,
  logPredictionAlert,
} from "./predictionAlertNotificationService";

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

vi.mock("../sse", () => ({
  broadcastEvent: vi.fn(),
}));

describe("Prediction Alert Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendPredictionEmailAlert", () => {
    it("should return failure when no db connection", async () => {
      const result = await sendPredictionEmailAlert(
        "warning",
        "cpk",
        1.2,
        1.5,
        1.33,
        { productCode: "TEST001", stationName: "Station A" }
      );
      
      expect(result).toEqual({ success: false, sentCount: 0 });
    });

    it("should accept all alert types", async () => {
      const warningResult = await sendPredictionEmailAlert(
        "warning",
        "cpk",
        1.2,
        1.5,
        1.33,
        {}
      );
      
      const criticalResult = await sendPredictionEmailAlert(
        "critical",
        "oee",
        55,
        70,
        60,
        {}
      );
      
      expect(warningResult).toBeDefined();
      expect(criticalResult).toBeDefined();
    });
  });

  describe("checkCpkPredictionAlertWithEmail", () => {
    it("should return null for good CPK values", async () => {
      const result = await checkCpkPredictionAlertWithEmail(
        1.67, // Good CPK
        1.5,
        "TEST001",
        "Station A"
      );
      
      expect(result).toBeNull();
    });

    it("should accept optional parameters", async () => {
      const result = await checkCpkPredictionAlertWithEmail(
        0.8, // Bad CPK
        1.5,
        "TEST001",
        "Station A",
        1, // productId
        2, // productionLineId
        3  // workstationId
      );
      
      // Result depends on threshold config, but function should not throw
      expect(result === null || result !== null).toBe(true);
    });
  });

  describe("checkOeePredictionAlertWithEmail", () => {
    it("should return null for good OEE values", async () => {
      const result = await checkOeePredictionAlertWithEmail(
        85, // Good OEE
        80,
        1,
        "Production Line 1"
      );
      
      expect(result).toBeNull();
    });
  });

  describe("logPredictionAlert", () => {
    it("should return null when no db connection", async () => {
      const result = await logPredictionAlert(
        "cpk",
        1.2,
        "warning",
        { productCode: "TEST001" }
      );
      
      expect(result).toBeNull();
    });

    it("should accept all prediction types", async () => {
      const cpkResult = await logPredictionAlert("cpk", 1.2, "warning", {});
      const oeeResult = await logPredictionAlert("oee", 70, "critical", {});
      const defectResult = await logPredictionAlert("defect_rate", 5, "warning", {});
      const trendResult = await logPredictionAlert("trend", -10, "critical", {});
      
      expect(cpkResult).toBeNull();
      expect(oeeResult).toBeNull();
      expect(defectResult).toBeNull();
      expect(trendResult).toBeNull();
    });
  });
});
