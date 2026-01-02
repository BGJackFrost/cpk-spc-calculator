import { describe, it, expect, vi } from "vitest";

// Mock database to prevent timeout
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(null)),
  getSmtpConfig: vi.fn(() => Promise.resolve(null)),
}));

import {
  notifyOeeAlert,
  notifyMaintenanceAlert,
  notifyPredictiveAlert,
  OeeAlertEmailData,
  MaintenanceAlertEmailData,
  PredictiveAlertEmailData,
} from "../emailService";

describe("Phase 81 - MMS UX Improvements", () => {
  describe("Email Alert Functions", () => {
    it("should have notifyOeeAlert function defined", () => {
      expect(typeof notifyOeeAlert).toBe("function");
    });

    it("should have notifyMaintenanceAlert function defined", () => {
      expect(typeof notifyMaintenanceAlert).toBe("function");
    });

    it("should have notifyPredictiveAlert function defined", () => {
      expect(typeof notifyPredictiveAlert).toBe("function");
    });

    it("should handle OEE alert with correct data structure", async () => {
      const oeeData: OeeAlertEmailData = {
        machineName: "CNC Machine 1",
        machineCode: "CNC001",
        oeeValue: 65.5,
        threshold: 75,
        availability: 85.2,
        performance: 78.3,
        quality: 98.5,
        timestamp: new Date(),
      };

      // Should not throw when called (SMTP not configured returns gracefully)
      const result = await notifyOeeAlert(oeeData, ["test@example.com"]);
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      // sentCount may not be present when SMTP not configured
      if ("sentCount" in result) {
        expect(typeof result.sentCount).toBe("number");
      }
    });

    it("should handle Maintenance alert with correct data structure", async () => {
      const maintenanceData: MaintenanceAlertEmailData = {
        workOrderTitle: "Preventive Maintenance - Motor Check",
        machineName: "CNC Machine 1",
        alertType: "upcoming",
        scheduledDate: new Date(),
        priority: "high",
        technicianName: "John Doe",
      };

      const result = await notifyMaintenanceAlert(maintenanceData, ["test@example.com"]);
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      if ("sentCount" in result) {
        expect(typeof result.sentCount).toBe("number");
      }
    });

    it("should handle Predictive alert with correct data structure", async () => {
      const predictiveData: PredictiveAlertEmailData = {
        machineName: "CNC Machine 1",
        machineCode: "CNC001",
        predictionType: "Bearing Failure",
        probability: 85.5,
        estimatedFailureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        recommendation: "Replace bearing within 7 days",
      };

      const result = await notifyPredictiveAlert(predictiveData, ["test@example.com"]);
      expect(result).toHaveProperty("success");
      expect(typeof result.success).toBe("boolean");
      if ("sentCount" in result) {
        expect(typeof result.sentCount).toBe("number");
      }
    });
  });

  describe("Translations", () => {
    it("should have Vietnamese translations for MMS menu", async () => {
      const vi = await import("../../client/src/locales/vi.json");
      
      // Check menuGroup translations
      expect(vi.menuGroup).toBeDefined();
      expect(vi.menuGroup.oee).toBe("OEE & Hiệu suất");
      expect(vi.menuGroup.maintenance).toBe("Bảo trì");
      expect(vi.menuGroup.equipment).toBe("Thiết bị");
      
      // Check nav translations
      expect(vi.nav).toBeDefined();
      expect(vi.nav.oeeDashboard).toBe("Dashboard OEE");
      expect(vi.nav.plantKpi).toBe("KPI Nhà máy");
      expect(vi.nav.maintenanceDashboard).toBe("Dashboard Bảo trì");
      expect(vi.nav.maintenanceSchedule).toBe("Lịch Bảo trì");
      expect(vi.nav.spareParts).toBe("Phụ tùng");
      expect(vi.nav.predictiveMaintenance).toBe("Bảo trì Dự đoán");
      expect(vi.nav.iotGateway).toBe("IoT Gateway");
      expect(vi.nav.equipmentQr).toBe("Tra cứu QR Thiết bị");
    });

    it("should have English translations for MMS menu", async () => {
      const en = await import("../../client/src/locales/en.json");
      
      // Check menuGroup translations
      expect(en.menuGroup).toBeDefined();
      expect(en.menuGroup.oee).toBe("OEE & Performance");
      expect(en.menuGroup.maintenance).toBe("Maintenance");
      expect(en.menuGroup.equipment).toBe("Equipment");
      
      // Check nav translations
      expect(en.nav).toBeDefined();
      expect(en.nav.oeeDashboard).toBe("OEE Dashboard");
      expect(en.nav.plantKpi).toBe("Plant KPI");
      expect(en.nav.maintenanceDashboard).toBe("Maintenance Dashboard");
      expect(en.nav.maintenanceSchedule).toBe("Maintenance Schedule");
      expect(en.nav.spareParts).toBe("Spare Parts");
      expect(en.nav.predictiveMaintenance).toBe("Predictive Maintenance");
      expect(en.nav.iotGateway).toBe("IoT Gateway");
      expect(en.nav.equipmentQr).toBe("Equipment QR Lookup");
    });
  });
});
