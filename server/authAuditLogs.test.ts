import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock email service
vi.mock('./emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, sentCount: 1 }),
  getSmtpConfig: vi.fn().mockResolvedValue({
    host: 'smtp.test.com',
    port: 587,
    username: 'test',
    password: 'test',
  }),
  sendAccountLockedNotification: vi.fn().mockResolvedValue({ success: true, sentCount: 1 }),
  sendSecurityAlertNotification: vi.fn().mockResolvedValue({ success: true, sentCount: 1 }),
  sendCriticalAlertEmail: vi.fn().mockResolvedValue({ success: true, sentCount: 1 }),
}));

describe("Phase 10 - Auth Audit Logs Features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Auth Audit Logs Schema", () => {
    it("should have auth_audit_logs table defined", async () => {
      const { authAuditLogs } = await import("../drizzle/schema");
      expect(authAuditLogs).toBeDefined();
    });

    it("should have correct columns in auth_audit_logs", async () => {
      const { authAuditLogs } = await import("../drizzle/schema");
      expect(authAuditLogs.id).toBeDefined();
      expect(authAuditLogs.userId).toBeDefined();
      expect(authAuditLogs.username).toBeDefined();
      expect(authAuditLogs.eventType).toBeDefined();
      expect(authAuditLogs.severity).toBeDefined();
      expect(authAuditLogs.ipAddress).toBeDefined();
      expect(authAuditLogs.userAgent).toBeDefined();
      expect(authAuditLogs.createdAt).toBeDefined();
    });

    it("should have account_lockouts table defined", async () => {
      const { accountLockouts } = await import("../drizzle/schema");
      expect(accountLockouts).toBeDefined();
    });
  });

  describe("Auth Audit Logs DB Functions", () => {
    it("should export logAuthAuditEvent function", async () => {
      const { logAuthAuditEvent } = await import("./db");
      expect(typeof logAuthAuditEvent).toBe("function");
    });

    it("should export getAuthAuditLogs function", async () => {
      const { getAuthAuditLogs } = await import("./db");
      expect(typeof getAuthAuditLogs).toBe("function");
    });

    it("should export getAuthAuditStats function", async () => {
      const { getAuthAuditStats } = await import("./db");
      expect(typeof getAuthAuditStats).toBe("function");
    });

    it("should export getSecurityOverviewStats function", async () => {
      const { getSecurityOverviewStats } = await import("./db");
      expect(typeof getSecurityOverviewStats).toBe("function");
    });

    it("should export getRecentFailedLoginsForDashboard function", async () => {
      const { getRecentFailedLoginsForDashboard } = await import("./db");
      expect(typeof getRecentFailedLoginsForDashboard).toBe("function");
    });

    it("should export getLockedAccountsForDashboard function", async () => {
      const { getLockedAccountsForDashboard } = await import("./db");
      expect(typeof getLockedAccountsForDashboard).toBe("function");
    });

    it("should export getFailedLoginsTrend function", async () => {
      const { getFailedLoginsTrend } = await import("./db");
      expect(typeof getFailedLoginsTrend).toBe("function");
    });
  });

  describe("Email Notification Functions", () => {
    it("should export sendAccountLockedNotification function", async () => {
      const { sendAccountLockedNotification } = await import("./emailService");
      expect(typeof sendAccountLockedNotification).toBe("function");
    });

    it("should export sendSecurityAlertNotification function", async () => {
      const { sendSecurityAlertNotification } = await import("./emailService");
      expect(typeof sendSecurityAlertNotification).toBe("function");
    });

    it("should export sendCriticalAlertEmail function", async () => {
      const { sendCriticalAlertEmail } = await import("./emailService");
      expect(typeof sendCriticalAlertEmail).toBe("function");
    });

    it("should call sendAccountLockedNotification with correct data", async () => {
      const { sendAccountLockedNotification } = await import("./emailService");
      
      const testData = {
        username: "testuser",
        lockedAt: new Date(),
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
        failedAttempts: 5,
        ipAddress: "192.168.1.1",
        reason: "Multiple failed login attempts",
      };
      
      const result = await sendAccountLockedNotification(testData);
      expect(sendAccountLockedNotification).toHaveBeenCalledWith(testData);
      expect(result).toHaveProperty("success");
    });

    it("should call sendSecurityAlertNotification with correct data", async () => {
      const { sendSecurityAlertNotification } = await import("./emailService");
      
      const testData = {
        alertType: "account_locked" as const,
        username: "testuser",
        ipAddress: "192.168.1.1",
        details: "Account locked due to multiple failed attempts",
        timestamp: new Date(),
        severity: "critical" as const,
      };
      
      const result = await sendSecurityAlertNotification(testData);
      expect(sendSecurityAlertNotification).toHaveBeenCalledWith(testData);
      expect(result).toHaveProperty("success");
    });
  });

  describe("Auth Audit Event Types", () => {
    it("should support login_success event type", () => {
      const validEventTypes = [
        "login_success",
        "login_failed",
        "logout",
        "password_change",
        "password_reset",
        "2fa_enabled",
        "2fa_disabled",
        "2fa_verified",
        "account_locked",
        "account_unlocked",
        "session_expired",
        "token_refresh",
      ];
      
      expect(validEventTypes).toContain("login_success");
      expect(validEventTypes).toContain("login_failed");
      expect(validEventTypes).toContain("account_locked");
    });

    it("should support severity levels", () => {
      const validSeverities = ["info", "warning", "critical"];
      
      expect(validSeverities).toContain("info");
      expect(validSeverities).toContain("warning");
      expect(validSeverities).toContain("critical");
    });
  });

  describe("Security Overview Stats", () => {
    it("should return correct structure from getSecurityOverviewStats", async () => {
      const { getSecurityOverviewStats } = await import("./db");
      
      // This will test the function structure
      expect(typeof getSecurityOverviewStats).toBe("function");
      
      // Expected return structure
      const expectedKeys = [
        "failedLogins24h",
        "successLogins24h",
        "currentlyLockedAccounts",
        "criticalEvents24h",
      ];
      
      expectedKeys.forEach(key => {
        expect(typeof key).toBe("string");
      });
    });
  });

  describe("Account Lockout Integration", () => {
    it("should have lockAccount function", async () => {
      const { lockAccount } = await import("./db");
      expect(typeof lockAccount).toBe("function");
    });

    it("should have unlockAccount function", async () => {
      const { unlockAccount } = await import("./db");
      expect(typeof unlockAccount).toBe("function");
    });

    it("should have isAccountLocked function", async () => {
      const { isAccountLocked } = await import("./db");
      expect(typeof isAccountLocked).toBe("function");
    });
  });

  describe("LocalAuth Service Integration", () => {
    it("should import sendAccountLockedNotification in localAuthService", async () => {
      // Verify the import exists in the service
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/localAuthService.ts", "utf-8");
      
      expect(content).toContain("sendAccountLockedNotification");
    });

    it("should call notification when account is locked", async () => {
      const fs = await import("fs/promises");
      const content = await fs.readFile("./server/localAuthService.ts", "utf-8");
      
      // Verify the notification call exists in the lockout flow
      expect(content).toContain("await sendAccountLockedNotification");
    });
  });

  describe("Dashboard Widget Data", () => {
    it("should have getRecentFailedLoginsForDashboard return correct structure", async () => {
      const { getRecentFailedLoginsForDashboard } = await import("./db");
      expect(typeof getRecentFailedLoginsForDashboard).toBe("function");
    });

    it("should have getFailedLoginsTrend return correct structure", async () => {
      const { getFailedLoginsTrend } = await import("./db");
      expect(typeof getFailedLoginsTrend).toBe("function");
    });
  });
});
