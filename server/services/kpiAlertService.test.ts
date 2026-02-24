/**
 * Tests for KPI Alert Service
 * Kiểm tra logic tích hợp ngưỡng KPI tùy chỉnh
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

// Mock email service
vi.mock("../emailService", () => ({
  sendEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

// Mock notification
vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

// Mock shiftManagerService
vi.mock("./shiftManagerService", () => ({
  compareKPIWithPreviousWeek: vi.fn(() => Promise.resolve({
    currentWeek: { avgCpk: 1.25, avgOee: 72 },
    previousWeek: { avgCpk: 1.35, avgOee: 78 },
    cpkChange: -7.4,
    oeeChange: -7.7,
    cpkDeclineAlert: true,
    oeeDeclineAlert: true,
    alertThreshold: -5,
  })),
  getShiftKPIData: vi.fn(() => Promise.resolve([])),
}));

describe("KPI Alert Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getThresholdForLine", () => {
    it("should return default config when database is not available", async () => {
      const { getThresholdForLine } = await import("./kpiAlertService");
      
      const config = await getThresholdForLine(1);
      
      expect(config).toEqual({
        cpkThreshold: -5,
        oeeThreshold: -5,
        cpkWarning: 1.33,
        cpkCritical: 1.00,
        oeeWarning: 75,
        oeeCritical: 60,
        enableEmailAlert: true,
        enableOwnerNotification: true,
      });
    });
  });

  describe("checkAndSendKPIAlerts", () => {
    it("should check KPI alerts with default config", async () => {
      const { checkAndSendKPIAlerts } = await import("./kpiAlertService");
      
      const result = await checkAndSendKPIAlerts();
      
      expect(result.checked).toBe(true);
      expect(result).toHaveProperty("cpkAlert");
      expect(result).toHaveProperty("oeeAlert");
      expect(result).toHaveProperty("cpkAbsoluteAlert");
      expect(result).toHaveProperty("oeeAbsoluteAlert");
      expect(result).toHaveProperty("thresholdUsed");
    });

    it("should use custom config when provided", async () => {
      const { checkAndSendKPIAlerts } = await import("./kpiAlertService");
      
      const customConfig = {
        cpkThreshold: -10,
        oeeThreshold: -10,
        cpkWarning: 1.5,
        cpkCritical: 1.2,
        oeeWarning: 80,
        oeeCritical: 70,
        enableEmailAlert: false,
        enableOwnerNotification: false,
      };
      
      const result = await checkAndSendKPIAlerts(undefined, undefined, customConfig);
      
      expect(result.checked).toBe(true);
      expect(result.thresholdUsed.cpkThreshold).toBe(-10);
      expect(result.thresholdUsed.oeeThreshold).toBe(-10);
    });
  });

  describe("checkAllLinesKPIAlerts", () => {
    it("should return empty results when no thresholds configured", async () => {
      const { checkAllLinesKPIAlerts } = await import("./kpiAlertService");
      
      const result = await checkAllLinesKPIAlerts();
      
      expect(result).toHaveProperty("totalLines");
      expect(result).toHaveProperty("alertsTriggered");
      expect(result).toHaveProperty("emailsSent");
      expect(result).toHaveProperty("results");
      expect(Array.isArray(result.results)).toBe(true);
    });
  });

  describe("runDailyKPICheck", () => {
    it("should run daily KPI check without errors", async () => {
      const { runDailyKPICheck } = await import("./kpiAlertService");
      
      // Should not throw
      await expect(runDailyKPICheck()).resolves.not.toThrow();
    });
  });
});

describe("KPI Alert Config", () => {
  it("should have correct default threshold values", async () => {
    const { getThresholdForLine } = await import("./kpiAlertService");
    
    const config = await getThresholdForLine(999);
    
    // Default CPK warning should be 1.33 (industry standard)
    expect(config.cpkWarning).toBe(1.33);
    
    // Default CPK critical should be 1.00
    expect(config.cpkCritical).toBe(1.00);
    
    // Default OEE warning should be 75%
    expect(config.oeeWarning).toBe(75);
    
    // Default OEE critical should be 60%
    expect(config.oeeCritical).toBe(60);
    
    // Default weekly decline threshold should be -5%
    expect(config.cpkThreshold).toBe(-5);
    expect(config.oeeThreshold).toBe(-5);
  });
});
