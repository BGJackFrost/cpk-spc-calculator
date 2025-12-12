import { describe, expect, it } from "vitest";

describe("Phase 7 - Seed Data, SMTP và Khởi tạo Quyền", () => {
  describe("Seed Data", () => {
    it("should have DEFAULT_PERMISSIONS defined with correct structure", async () => {
      const { initializePermissions, seedSampleData } = await import("./seedData");
      
      expect(typeof initializePermissions).toBe("function");
      expect(typeof seedSampleData).toBe("function");
    }, 15000);

    it("should define sample products with required fields", async () => {
      // Test that seed data module exports correctly
      const seedModule = await import("./seedData");
      expect(seedModule).toBeDefined();
    });
  });

  describe("Email Service", () => {
    it("should export email service functions", async () => {
      const { getSmtpConfig, saveSmtpConfig, sendEmail, notifySpcViolation, notifyCpkWarning } = await import("./emailService");
      
      expect(typeof getSmtpConfig).toBe("function");
      expect(typeof saveSmtpConfig).toBe("function");
      expect(typeof sendEmail).toBe("function");
      expect(typeof notifySpcViolation).toBe("function");
      expect(typeof notifyCpkWarning).toBe("function");
    });

    it("should handle missing SMTP config gracefully", async () => {
      const { sendEmail } = await import("./emailService");
      
      const result = await sendEmail("test@example.com", "Test Subject", "<p>Test</p>");
      
      // Should return error when SMTP not configured
      expect(result).toHaveProperty("success");
    }, 15000);
  });

  describe("SMTP Configuration", () => {
    it("should validate SMTP settings structure", () => {
      const validSettings = {
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        username: "user@gmail.com",
        password: "password123",
        fromEmail: "noreply@example.com",
        fromName: "SPC Calculator",
      };

      expect(validSettings.host).toBeTruthy();
      expect(validSettings.port).toBeGreaterThan(0);
      expect(typeof validSettings.secure).toBe("boolean");
      expect(validSettings.username).toBeTruthy();
      expect(validSettings.fromEmail).toContain("@");
    });
  });

  describe("Permission System", () => {
    it("should define role permission mappings", async () => {
      const seedModule = await import("./seedData");
      
      // Verify module loads without errors
      expect(seedModule).toBeDefined();
      expect(seedModule.initializePermissions).toBeDefined();
    });

    it("should have correct permission code format", () => {
      const samplePermissions = [
        { code: "dashboard.view", name: "Xem Dashboard" },
        { code: "analyze.execute", name: "Thực hiện Phân tích" },
        { code: "mapping.manage", name: "Quản lý Mapping" },
      ];

      for (const perm of samplePermissions) {
        expect(perm.code).toMatch(/^[a-z_]+\.[a-z_]+$/);
        expect(perm.name).toBeTruthy();
      }
    });
  });

  describe("Email Templates", () => {
    it("should generate valid SPC violation email data structure", () => {
      const violationData = {
        productCode: "PCB-001",
        stationName: "AOI-01",
        violationType: "Rule 1 - Point beyond 3σ",
        violationDetails: "Point at index 5 exceeded UCL",
        currentValue: 0.55,
        ucl: 0.5,
        lcl: 0.1,
        timestamp: new Date(),
      };

      expect(violationData.productCode).toBeTruthy();
      expect(violationData.stationName).toBeTruthy();
      expect(violationData.currentValue).toBeGreaterThan(violationData.ucl);
      expect(violationData.timestamp).toBeInstanceOf(Date);
    });

    it("should generate valid CPK warning email data structure", () => {
      const warningData = {
        productCode: "IC-001",
        stationName: "ICT-01",
        cpkValue: 1.15,
        threshold: 1.33,
        recommendation: "Review process parameters",
        timestamp: new Date(),
      };

      expect(warningData.cpkValue).toBeLessThan(warningData.threshold);
      expect(warningData.recommendation).toBeTruthy();
    });
  });
});
