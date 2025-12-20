import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 201 - Security Features", () => {
  describe("Password Reset", () => {
    it("should have password reset tables in schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("passwordResetTokens");
    });

    it("should have generatePasswordResetToken function in localAuthService", () => {
      const servicePath = path.join(__dirname, "./localAuthService.ts");
      const content = fs.readFileSync(servicePath, "utf-8");
      expect(content).toContain("generatePasswordResetToken");
    });

    it("should have resetPasswordWithToken function in localAuthService", () => {
      const servicePath = path.join(__dirname, "./localAuthService.ts");
      const content = fs.readFileSync(servicePath, "utf-8");
      expect(content).toContain("resetPasswordWithToken");
    });

    it("should have password reset API endpoints in routers", () => {
      const routersPath = path.join(__dirname, "./routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      expect(content).toContain("requestPasswordReset");
      expect(content).toContain("resetPasswordWithToken");
    });

    it("should have ForgotPassword page", () => {
      const pagePath = path.join(__dirname, "../client/src/pages/ForgotPassword.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    });
  });

  describe("Session Management", () => {
    it("should have user sessions table in schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("userSessions");
    });

    it("should have session management functions in localAuthService", () => {
      const servicePath = path.join(__dirname, "./localAuthService.ts");
      const content = fs.readFileSync(servicePath, "utf-8");
      expect(content).toContain("createSession");
      expect(content).toContain("getUserSessions");
      expect(content).toContain("revokeSession");
      expect(content).toContain("revokeAllOtherSessions");
    });

    it("should have session management API endpoints in routers", () => {
      const routersPath = path.join(__dirname, "./routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      expect(content).toContain("getSessions");
      expect(content).toContain("revokeSession");
      expect(content).toContain("revokeAllOtherSessions");
    });

    it("should have SessionManagement page", () => {
      const pagePath = path.join(__dirname, "../client/src/pages/SessionManagement.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    });
  });

  describe("Two Factor Authentication", () => {
    it("should have 2FA tables in schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("twoFactorAuth");
      expect(content).toContain("twoFactorBackupCodes");
    });

    it("should have 2FA functions in localAuthService", () => {
      const servicePath = path.join(__dirname, "./localAuthService.ts");
      const content = fs.readFileSync(servicePath, "utf-8");
      expect(content).toContain("generate2FASecret");
      expect(content).toContain("verify2FAAndEnable");
      expect(content).toContain("verify2FACode");
      expect(content).toContain("is2FAEnabled");
      expect(content).toContain("disable2FA");
      expect(content).toContain("getBackupCodesCount");
      expect(content).toContain("regenerateBackupCodes");
    });

    it("should have 2FA API endpoints in routers", () => {
      const routersPath = path.join(__dirname, "./routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      expect(content).toContain("is2FAEnabled");
      expect(content).toContain("setup2FA");
      expect(content).toContain("verify2FA");
      expect(content).toContain("disable2FA");
      expect(content).toContain("regenerateBackupCodes");
    });

    it("should have TwoFactorSettings page", () => {
      const pagePath = path.join(__dirname, "../client/src/pages/TwoFactorSettings.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    });
  });

  describe("Routes and Navigation", () => {
    it("should have routes for new pages in App.tsx", () => {
      const appPath = path.join(__dirname, "../client/src/App.tsx");
      const content = fs.readFileSync(appPath, "utf-8");
      expect(content).toContain("/forgot-password");
      expect(content).toContain("/session-management");
      expect(content).toContain("/two-factor-settings");
    });

    it("should have menu items for session and 2FA in systemMenu", () => {
      const menuPath = path.join(__dirname, "../client/src/config/systemMenu.ts");
      const content = fs.readFileSync(menuPath, "utf-8");
      expect(content).toContain("session-management");
      expect(content).toContain("two-factor-settings");
    });

    it("should have forgot password link in Home page", () => {
      const homePath = path.join(__dirname, "../client/src/pages/Home.tsx");
      const content = fs.readFileSync(homePath, "utf-8");
      expect(content).toContain("/forgot-password");
      expect(content).toContain("Quên mật khẩu");
    });
  });
});
