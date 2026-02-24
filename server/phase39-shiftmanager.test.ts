/**
 * Phase 39 Tests - Nâng cấp Shift Manager Dashboard
 * - Bộ lọc theo Line/Machine trong biểu đồ so sánh KPI
 * - Export PDF/Excel cho Shift Manager Dashboard
 * - Cảnh báo tự động khi KPI giảm so với tuần trước
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

// Mock email service
vi.mock("./emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("Phase 39 - Nâng cấp Shift Manager Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("shiftManagerService", () => {
    it("should export getShiftKPIData function", async () => {
      const service = await import("./services/shiftManagerService");
      expect(typeof service.getShiftKPIData).toBe("function");
    });

    it("should export getMachinePerformanceData function", async () => {
      const service = await import("./services/shiftManagerService");
      expect(typeof service.getMachinePerformanceData).toBe("function");
    });

    it("should export getDailyTrendData function", async () => {
      const service = await import("./services/shiftManagerService");
      expect(typeof service.getDailyTrendData).toBe("function");
    });

    it("should export getWeeklyCompareData function", async () => {
      const service = await import("./services/shiftManagerService");
      expect(typeof service.getWeeklyCompareData).toBe("function");
    });

    it("should export compareKPIWithPreviousWeek function", async () => {
      const service = await import("./services/shiftManagerService");
      expect(typeof service.compareKPIWithPreviousWeek).toBe("function");
    });

    it("should export exportShiftManagerExcel function", async () => {
      const service = await import("./services/shiftManagerService");
      expect(typeof service.exportShiftManagerExcel).toBe("function");
    });

    it("should export exportShiftManagerPdf function", async () => {
      const service = await import("./services/shiftManagerService");
      expect(typeof service.exportShiftManagerPdf).toBe("function");
    });

    it("should define SHIFTS constant with correct structure", async () => {
      const service = await import("./services/shiftManagerService");
      expect(service.SHIFTS).toBeDefined();
      expect(service.SHIFTS.morning).toEqual({ start: 6, end: 14, name: "Ca sáng" });
      expect(service.SHIFTS.afternoon).toEqual({ start: 14, end: 22, name: "Ca chiều" });
      expect(service.SHIFTS.night).toEqual({ start: 22, end: 6, name: "Ca đêm" });
    });

    it("should return empty array when database is not available", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.getShiftKPIData({ date: new Date() });
      expect(result).toEqual([]);
    });

    it("should return empty array for machine performance when database is not available", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.getMachinePerformanceData({ date: new Date() });
      expect(result).toEqual([]);
    });

    it("should return empty array for daily trend when database is not available", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.getDailyTrendData({ date: new Date(), days: 7 });
      expect(result).toEqual([]);
    });
  });

  describe("kpiAlertService", () => {
    it("should export checkAndSendKPIAlerts function", async () => {
      const service = await import("./services/kpiAlertService");
      expect(typeof service.checkAndSendKPIAlerts).toBe("function");
    });

    it("should export runDailyKPICheck function", async () => {
      const service = await import("./services/kpiAlertService");
      expect(typeof service.runDailyKPICheck).toBe("function");
    });

    it("should return proper structure when checking alerts", async () => {
      const service = await import("./services/kpiAlertService");
      const result = await service.checkAndSendKPIAlerts();
      
      expect(result).toHaveProperty("checked");
      expect(result).toHaveProperty("cpkAlert");
      expect(result).toHaveProperty("oeeAlert");
      expect(result).toHaveProperty("emailSent");
      expect(result).toHaveProperty("ownerNotified");
    });
  });

  describe("scheduledJobs - KPI Alert", () => {
    it("should export checkKPIDeclineAlerts function", async () => {
      const jobs = await import("./scheduledJobs");
      expect(typeof jobs.checkKPIDeclineAlerts).toBe("function");
    });

    it("should export triggerKPIDeclineCheck function", async () => {
      const jobs = await import("./scheduledJobs");
      expect(typeof jobs.triggerKPIDeclineCheck).toBe("function");
    });

    it("should return proper structure when checking KPI decline", async () => {
      const jobs = await import("./scheduledJobs");
      const result = await jobs.checkKPIDeclineAlerts();
      
      expect(result).toHaveProperty("checked");
      expect(result).toHaveProperty("totalLines");
      expect(result).toHaveProperty("alertsTriggered");
      expect(result).toHaveProperty("emailsSent");
      expect(result).toHaveProperty("results");
      expect(Array.isArray(result.results)).toBe(true);
    });
  });

  describe("shiftManager router", () => {
    it("should have shiftManager router defined in appRouter", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter._def.procedures).toBeDefined();
    });
  });

  describe("Filter functionality", () => {
    it("should accept productionLineId filter parameter", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.getShiftKPIData({ 
        date: new Date(),
        productionLineId: 1 
      });
      expect(result).toEqual([]);
    });

    it("should accept machineId filter parameter", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.getShiftKPIData({ 
        date: new Date(),
        machineId: 1 
      });
      expect(result).toEqual([]);
    });

    it("should accept both filter parameters", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.getShiftKPIData({ 
        date: new Date(),
        productionLineId: 1,
        machineId: 1 
      });
      expect(result).toEqual([]);
    });
  });

  describe("Export functionality", () => {
    it("should accept days parameter for Excel export", async () => {
      const service = await import("./services/shiftManagerService");
      // Test that the function accepts the days parameter without throwing
      const result = await service.exportShiftManagerExcel({ 
        date: new Date(),
        days: 14 
      });
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("filename");
      expect(result).toHaveProperty("mimeType");
    });

    it("should generate correct filename for Excel export", async () => {
      const service = await import("./services/shiftManagerService");
      const testDate = new Date("2024-01-15");
      const result = await service.exportShiftManagerExcel({ 
        date: testDate,
        days: 7 
      });
      expect(result.filename).toContain("shift_manager_report_");
      expect(result.filename).toContain(".xlsx");
    });

    it("should generate correct MIME type for Excel export", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.exportShiftManagerExcel({ 
        date: new Date(),
        days: 7 
      });
      expect(result.mimeType).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    });

    it("should generate correct MIME type for PDF export", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.exportShiftManagerPdf({ 
        date: new Date()
      });
      expect(result.mimeType).toBe("application/pdf");
    });
  });

  describe("KPI Comparison", () => {
    it("should return comparison structure with correct properties", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.compareKPIWithPreviousWeek({ date: new Date() });
      
      expect(result).toHaveProperty("currentWeek");
      expect(result).toHaveProperty("previousWeek");
      expect(result).toHaveProperty("cpkChange");
      expect(result).toHaveProperty("oeeChange");
      expect(result).toHaveProperty("cpkDeclineAlert");
      expect(result).toHaveProperty("oeeDeclineAlert");
      expect(result).toHaveProperty("alertThreshold");
    });

    it("should have default alert threshold of -5%", async () => {
      const service = await import("./services/shiftManagerService");
      const result = await service.compareKPIWithPreviousWeek({ date: new Date() });
      expect(result.alertThreshold).toBe(-5);
    });
  });
});
