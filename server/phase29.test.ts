import { describe, it, expect } from "vitest";

describe("Phase 29 - SMTP, Local Auth, Offline Mode, Webhook Retry", () => {
  describe("SMTP Configuration", () => {
    it("should have nodemailer installed", async () => {
      const nodemailer = await import("nodemailer");
      expect(nodemailer).toBeDefined();
      expect(nodemailer.createTransport).toBeDefined();
    });

    it("should have emailService with sendEmail function", async () => {
      const { sendEmail } = await import("./emailService");
      expect(typeof sendEmail).toBe("function");
    });
  });

  describe("Local Authentication", () => {
    it("should have localAuthService module", async () => {
      const localAuth = await import("./localAuthService");
      expect(localAuth).toBeDefined();
    });

    it("should have hashPassword function", async () => {
      const { hashPassword } = await import("./localAuthService");
      expect(typeof hashPassword).toBe("function");
    });

    it("should have verifyPassword function", async () => {
      const { verifyPassword } = await import("./localAuthService");
      expect(typeof verifyPassword).toBe("function");
    });

    it("should have generateLocalToken function", async () => {
      const { generateLocalToken } = await import("./localAuthService");
      expect(typeof generateLocalToken).toBe("function");
    });

    it("should have verifyLocalToken function", async () => {
      const { verifyLocalToken } = await import("./localAuthService");
      expect(typeof verifyLocalToken).toBe("function");
    });

    it("should have registerLocalUser function", async () => {
      const { registerLocalUser } = await import("./localAuthService");
      expect(typeof registerLocalUser).toBe("function");
    });

    it("should have loginLocalUser function", async () => {
      const { loginLocalUser } = await import("./localAuthService");
      expect(typeof loginLocalUser).toBe("function");
    });

    it("should hash password correctly", async () => {
      const { hashPassword, verifyPassword } = await import("./localAuthService");
      const password = "testPassword123";
      const hash = await hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
      
      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await verifyPassword("wrongPassword", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("Offline Mode Configuration", () => {
    it("should have offlineConfig module", async () => {
      const offlineConfig = await import("./offlineConfig");
      expect(offlineConfig).toBeDefined();
    });

    it("should have getOfflineConfig function", async () => {
      const { getOfflineConfig } = await import("./offlineConfig");
      expect(typeof getOfflineConfig).toBe("function");
    });

    it("should have isOfflineMode function", async () => {
      const { isOfflineMode } = await import("./offlineConfig");
      expect(typeof isOfflineMode).toBe("function");
    });

    it("should have isLlmAvailable function", async () => {
      const { isLlmAvailable } = await import("./offlineConfig");
      expect(typeof isLlmAvailable).toBe("function");
    });

    it("should have isS3Available function", async () => {
      const { isS3Available } = await import("./offlineConfig");
      expect(typeof isS3Available).toBe("function");
    });

    it("should have getOfflineDeploymentGuide function", async () => {
      const { getOfflineDeploymentGuide } = await import("./offlineConfig");
      expect(typeof getOfflineDeploymentGuide).toBe("function");
      const guide = getOfflineDeploymentGuide();
      expect(guide).toContain("Triển khai Offline");
      expect(guide).toContain("DATABASE_URL");
      expect(guide).toContain("OFFLINE_MODE");
    });
  });

  describe("Storage with Local Fallback", () => {
    it("should have isS3StorageAvailable function", async () => {
      const { isS3StorageAvailable } = await import("./storage");
      expect(typeof isS3StorageAvailable).toBe("function");
    });

    it("should have storagePutLocal function", async () => {
      const { storagePutLocal } = await import("./storage");
      expect(typeof storagePutLocal).toBe("function");
    });

    it("should have storageGetLocal function", async () => {
      const { storageGetLocal } = await import("./storage");
      expect(typeof storageGetLocal).toBe("function");
    });
  });

  describe("Webhook Retry Mechanism", () => {
    it("should have processWebhookRetries function", async () => {
      const { processWebhookRetries } = await import("./webhookService");
      expect(typeof processWebhookRetries).toBe("function");
    });

    it("should have getRetryStats function", async () => {
      const { getRetryStats } = await import("./webhookService");
      expect(typeof getRetryStats).toBe("function");
    });

    it("should have manualRetryWebhook function", async () => {
      const { manualRetryWebhook } = await import("./webhookService");
      expect(typeof manualRetryWebhook).toBe("function");
    });

    it("should have webhook_logs schema with retry columns", async () => {
      const { webhookLogs } = await import("../drizzle/schema");
      expect(webhookLogs).toBeDefined();
      // Check that the schema has the retry-related columns defined
      const columns = Object.keys(webhookLogs);
      expect(columns).toContain("retryCount");
      expect(columns).toContain("maxRetries");
      expect(columns).toContain("nextRetryAt");
      expect(columns).toContain("lastRetryAt");
      expect(columns).toContain("retryStatus");
    });
  });

  describe("ENV Configuration", () => {
    it("should have AUTH_MODE in ENV", async () => {
      const { ENV } = await import("./_core/env");
      expect(ENV.authMode).toBeDefined();
    });

    it("should have jwtSecret in ENV", async () => {
      const { ENV } = await import("./_core/env");
      expect(ENV.jwtSecret).toBeDefined();
    });
  });
});
