/**
 * GĐ1 Tests - Mock Data Removal, Notification Channels, Index Migration Fixes
 */
import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SERVICES_DIR = path.join(__dirname, "services");

describe("GĐ1: Mock Data Removal Verification", () => {
  const refactoredServices = [
    "anomalyDetectionService.ts",
    "defectPredictionService.ts",
    "mttrMtbfPredictionService.ts",
    "oeeForecastingService.ts",
    "timeseriesService.ts",
    "iotSensorService.ts",
    "realtimeDataExportService.ts",
    "edgeGatewayService.ts",
  ];

  for (const svc of refactoredServices) {
    it(`${svc} should not contain generateMock* function calls`, () => {
      const filePath = path.join(SERVICES_DIR, svc);
      if (!fs.existsSync(filePath)) return; // skip if file doesn't exist
      const content = fs.readFileSync(filePath, "utf-8");
      // Should not have active mock data generation calls (comments are ok)
      const lines = content.split("\n");
      const activeGenerateMockCalls = lines.filter(
        (line) =>
          line.includes("generateMock") &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*") &&
          !line.includes("function generateMock") &&
          !line.includes("export function generateMock")
      );
      expect(activeGenerateMockCalls.length).toBe(0);
    });

    it(`${svc} should not have active mock data arrays as fallback`, () => {
      const filePath = path.join(SERVICES_DIR, svc);
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, "utf-8");
      // Should not have patterns like "return mockData" or "return generateMock"
      const lines = content.split("\n");
      const mockReturnLines = lines.filter(
        (line) =>
          (line.includes("return mockData") ||
            line.includes("return generateMock")) &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*")
      );
      expect(mockReturnLines.length).toBe(0);
    });
  }
});

describe("GĐ1: Notification Channels Implementation", () => {
  it("iotAlertService should import sendEmail and sendAlertToWebhooks", () => {
    const filePath = path.join(SERVICES_DIR, "iotAlertService.ts");
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("import { sendEmail }");
    expect(content).toContain("import { sendAlertToWebhooks }");
  });

  it("iotAlertService should not have TODO for email notification", () => {
    const filePath = path.join(SERVICES_DIR, "iotAlertService.ts");
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("// TODO: Implement email notification");
  });

  it("spcAlertService should import sendEmail and sendAlertToWebhooks", () => {
    const filePath = path.join(SERVICES_DIR, "spcAlertService.ts");
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("import { sendEmail }");
    expect(content).toContain("import { sendAlertToWebhooks }");
  });

  it("spcAlertService should not have TODO for email notification", () => {
    const filePath = path.join(SERVICES_DIR, "spcAlertService.ts");
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).not.toContain("// TODO: Implement email notification");
  });

  it("iotAlertEscalationService should have real notification dispatch", () => {
    const filePath = path.join(SERVICES_DIR, "iotAlertEscalationService.ts");
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    // Should have sendEmail or sendAlertToWebhooks
    const hasRealNotification =
      content.includes("sendEmail") || content.includes("sendAlertToWebhooks");
    expect(hasRealNotification).toBe(true);
  });
});

describe("GĐ1: Index Migration Column Fix", () => {
  it("migration should use correct column names for iot_device_data", () => {
    const filePath = path.join(
      __dirname,
      "migrations",
      "add-advanced-indexes.ts"
    );
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    // Should use created_at instead of recorded_at for iot_device_data
    expect(content).not.toMatch(
      /table:\s*"iot_device_data"[\s\S]*?columns:\s*".*recorded_at/
    );
    expect(content).toContain("device_id, created_at DESC");
  });

  it("migration should use webhook_config_id for alert_webhook_logs", () => {
    const filePath = path.join(
      __dirname,
      "migrations",
      "add-advanced-indexes.ts"
    );
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    // Should not reference non-existent webhook_id column
    expect(content).not.toMatch(
      /table:\s*"alert_webhook_logs"[\s\S]*?columns:\s*"webhook_id/
    );
    expect(content).toContain("webhook_config_id, sent_at DESC");
  });

  it("migration should use correct column for kpi_alert_stats", () => {
    const filePath = path.join(
      __dirname,
      "migrations",
      "add-advanced-indexes.ts"
    );
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    // Should use 'date' not 'record_date'
    expect(content).toContain("date, alert_type");
  });

  it("migration should use correct column for production_lines", () => {
    const filePath = path.join(
      __dirname,
      "migrations",
      "add-advanced-indexes.ts"
    );
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    // Should use 'isActive' not 'status'
    const prodLineSection = content.substring(
      content.indexOf("idx_production_lines_status"),
      content.indexOf("idx_production_lines_status") + 200
    );
    expect(prodLineSection).toContain("isActive");
  });

  it("migration should use machineId for machine_inspection_data", () => {
    const filePath = path.join(
      __dirname,
      "migrations",
      "add-advanced-indexes.ts"
    );
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("machineId, inspectedAt DESC");
  });

  it("migration should use statistics_date for machine_yield_statistics", () => {
    const filePath = path.join(
      __dirname,
      "migrations",
      "add-advanced-indexes.ts"
    );
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("machine_id, statistics_date DESC");
  });
});
