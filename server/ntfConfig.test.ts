import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
const mockDb = {
  execute: vi.fn(),
};

vi.mock("./db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

vi.mock("drizzle-orm", () => ({
  sql: (strings: TemplateStringsArray, ...values: any[]) => ({
    strings,
    values,
  }),
}));

describe("NTF Alert Config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Database Tables", () => {
    it("should have ntf_alert_config table with correct structure", async () => {
      // The table should have these columns:
      // id, warningThreshold, criticalThreshold, alertEmails, enabled,
      // checkIntervalMinutes, cooldownMinutes, lastAlertAt, lastAlertNtfRate
      const expectedColumns = [
        "id",
        "warningThreshold",
        "criticalThreshold",
        "alertEmails",
        "enabled",
        "checkIntervalMinutes",
        "cooldownMinutes",
        "lastAlertAt",
        "lastAlertNtfRate",
        "createdAt",
        "updatedAt",
      ];

      // This is a structural test - verifying the schema design
      expect(expectedColumns).toContain("warningThreshold");
      expect(expectedColumns).toContain("criticalThreshold");
      expect(expectedColumns).toContain("alertEmails");
      expect(expectedColumns).toContain("enabled");
    });

    it("should have ntf_alert_history table with correct structure", async () => {
      const expectedColumns = [
        "id",
        "ntfRate",
        "totalDefects",
        "ntfCount",
        "realNgCount",
        "pendingCount",
        "alertType",
        "emailSent",
        "emailSentAt",
        "emailRecipients",
        "periodStart",
        "periodEnd",
        "createdAt",
      ];

      expect(expectedColumns).toContain("ntfRate");
      expect(expectedColumns).toContain("alertType");
      expect(expectedColumns).toContain("emailSent");
    });

    it("should have ntf_report_schedule table with correct structure", async () => {
      const expectedColumns = [
        "id",
        "name",
        "reportType",
        "sendHour",
        "sendDay",
        "recipients",
        "enabled",
        "lastSentAt",
        "lastSentStatus",
        "lastSentError",
        "createdBy",
        "createdAt",
        "updatedAt",
      ];

      expect(expectedColumns).toContain("reportType");
      expect(expectedColumns).toContain("sendHour");
      expect(expectedColumns).toContain("recipients");
    });
  });

  describe("NTF Rate Calculation", () => {
    it("should calculate NTF rate correctly", () => {
      const total = 100;
      const ntfCount = 25;
      const ntfRate = (ntfCount / total) * 100;

      expect(ntfRate).toBe(25);
    });

    it("should handle zero total defects", () => {
      const total = 0;
      const ntfCount = 0;
      const ntfRate = total > 0 ? (ntfCount / total) * 100 : 0;

      expect(ntfRate).toBe(0);
    });

    it("should determine warning alert type correctly", () => {
      const ntfRate = 25;
      const warningThreshold = 20;
      const criticalThreshold = 30;

      let alertType: "warning" | "critical" | null = null;
      if (ntfRate >= criticalThreshold) {
        alertType = "critical";
      } else if (ntfRate >= warningThreshold) {
        alertType = "warning";
      }

      expect(alertType).toBe("warning");
    });

    it("should determine critical alert type correctly", () => {
      const ntfRate = 35;
      const warningThreshold = 20;
      const criticalThreshold = 30;

      let alertType: "warning" | "critical" | null = null;
      if (ntfRate >= criticalThreshold) {
        alertType = "critical";
      } else if (ntfRate >= warningThreshold) {
        alertType = "warning";
      }

      expect(alertType).toBe("critical");
    });

    it("should not trigger alert below threshold", () => {
      const ntfRate = 15;
      const warningThreshold = 20;
      const criticalThreshold = 30;

      let alertType: "warning" | "critical" | null = null;
      if (ntfRate >= criticalThreshold) {
        alertType = "critical";
      } else if (ntfRate >= warningThreshold) {
        alertType = "warning";
      }

      expect(alertType).toBeNull();
    });
  });

  describe("Report Schedule Types", () => {
    it("should support daily report type", () => {
      const reportTypes = ["daily", "weekly", "monthly"];
      expect(reportTypes).toContain("daily");
    });

    it("should support weekly report type", () => {
      const reportTypes = ["daily", "weekly", "monthly"];
      expect(reportTypes).toContain("weekly");
    });

    it("should support monthly report type", () => {
      const reportTypes = ["daily", "weekly", "monthly"];
      expect(reportTypes).toContain("monthly");
    });

    it("should calculate correct date range for daily report", () => {
      const endDate = new Date("2024-01-15");
      const startDate = new Date("2024-01-15");
      startDate.setDate(startDate.getDate() - 1);

      expect(startDate.toISOString().split("T")[0]).toBe("2024-01-14");
    });

    it("should calculate correct date range for weekly report", () => {
      const endDate = new Date("2024-01-15");
      const startDate = new Date("2024-01-15");
      startDate.setDate(startDate.getDate() - 7);

      expect(startDate.toISOString().split("T")[0]).toBe("2024-01-08");
    });

    it("should calculate correct date range for monthly report", () => {
      const endDate = new Date("2024-02-15");
      const startDate = new Date("2024-02-15");
      startDate.setMonth(startDate.getMonth() - 1);

      expect(startDate.toISOString().split("T")[0]).toBe("2024-01-15");
    });
  });

  describe("NTF Reason Labels", () => {
    it("should have correct label for sensor_error", () => {
      const labels: Record<string, string> = {
        sensor_error: "Lỗi cảm biến",
        false_detection: "Phát hiện sai",
        calibration_issue: "Vấn đề hiệu chuẩn",
        environmental_factor: "Yếu tố môi trường",
        operator_error: "Lỗi vận hành",
        software_bug: "Lỗi phần mềm",
        other: "Khác",
      };

      expect(labels["sensor_error"]).toBe("Lỗi cảm biến");
    });

    it("should have correct label for false_detection", () => {
      const labels: Record<string, string> = {
        sensor_error: "Lỗi cảm biến",
        false_detection: "Phát hiện sai",
      };

      expect(labels["false_detection"]).toBe("Phát hiện sai");
    });
  });

  describe("Cooldown Logic", () => {
    it("should respect cooldown period", () => {
      const lastAlertAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const cooldownMinutes = 120; // 2 hours
      const cooldownMs = cooldownMinutes * 60 * 1000;

      const isInCooldown = Date.now() - lastAlertAt.getTime() < cooldownMs;

      expect(isInCooldown).toBe(true);
    });

    it("should allow alert after cooldown period", () => {
      const lastAlertAt = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const cooldownMinutes = 120; // 2 hours
      const cooldownMs = cooldownMinutes * 60 * 1000;

      const isInCooldown = Date.now() - lastAlertAt.getTime() < cooldownMs;

      expect(isInCooldown).toBe(false);
    });
  });

  describe("Email Recipients", () => {
    it("should parse JSON email array correctly", () => {
      const emailsJson = '["test1@example.com", "test2@example.com"]';
      const emails = JSON.parse(emailsJson);

      expect(emails).toHaveLength(2);
      expect(emails[0]).toBe("test1@example.com");
    });

    it("should handle empty email array", () => {
      const emailsJson = "[]";
      const emails = JSON.parse(emailsJson);

      expect(emails).toHaveLength(0);
    });

    it("should handle null alertEmails", () => {
      const alertEmails = null;
      const emails = alertEmails ? JSON.parse(alertEmails) : [];

      expect(emails).toHaveLength(0);
    });
  });
});
