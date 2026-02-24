import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 31 - Offline Package, Webhook Retry, Password Change, Login History", () => {
  describe("Export Offline Package", () => {
    it("should have build-offline.sh script", () => {
      const scriptPath = path.join(__dirname, "../scripts/build-offline.sh");
      expect(fs.existsSync(scriptPath)).toBe(true);
    });

    it("should have executable permissions on build script", () => {
      const scriptPath = path.join(__dirname, "../scripts/build-offline.sh");
      const stats = fs.statSync(scriptPath);
      // Check if file has execute permission (mode includes 0o111)
      expect(stats.mode & 0o111).toBeGreaterThan(0);
    });

    it("should include Docker configuration in build script", () => {
      const scriptPath = path.join(__dirname, "../scripts/build-offline.sh");
      const content = fs.readFileSync(scriptPath, "utf-8");
      expect(content).toContain("docker-compose.yml");
      expect(content).toContain("Dockerfile");
      expect(content).toContain(".env.example");
    });
  });

  describe("Dashboard Webhook Retry Widget", () => {
    it("should have WebhookRetryWidget component", () => {
      const componentPath = path.join(__dirname, "../client/src/components/WebhookRetryWidget.tsx");
      expect(fs.existsSync(componentPath)).toBe(true);
    });

    it("should import WebhookRetryWidget in Dashboard", () => {
      const dashboardPath = path.join(__dirname, "../client/src/pages/Dashboard.tsx");
      const content = fs.readFileSync(dashboardPath, "utf-8");
      expect(content).toContain("WebhookRetryWidget");
    });
  });

  describe("Password Change Feature", () => {
    it("should have ChangePassword page", () => {
      const pagePath = path.join(__dirname, "../client/src/pages/ChangePassword.tsx");
      expect(fs.existsSync(pagePath)).toBe(true);
    });

    it("should have mustChangePassword in schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("mustChangePassword");
    });

    it("should have changeLocalPassword function in localAuthService", () => {
      const servicePath = path.join(__dirname, "./localAuthService.ts");
      const content = fs.readFileSync(servicePath, "utf-8");
      expect(content).toContain("changeLocalPassword");
      expect(content).toContain("adminResetPassword");
    });

    it("should have change-password route in App.tsx", () => {
      const appPath = path.join(__dirname, "../client/src/App.tsx");
      const content = fs.readFileSync(appPath, "utf-8");
      expect(content).toContain("/change-password");
      expect(content).toContain("ChangePassword");
    });
  });

  describe("Login History Feature", () => {
    it("should have loginHistory table in schema", () => {
      const schemaPath = path.join(__dirname, "../drizzle/schema.ts");
      const content = fs.readFileSync(schemaPath, "utf-8");
      expect(content).toContain("loginHistory");
      expect(content).toContain("eventType");
      expect(content).toContain("login_failed");
    });

    it("should have logLoginEvent function in db.ts", () => {
      const dbPath = path.join(__dirname, "./db.ts");
      const content = fs.readFileSync(dbPath, "utf-8");
      expect(content).toContain("logLoginEvent");
      expect(content).toContain("getLoginHistory");
      expect(content).toContain("getLoginStats");
    });

    it("should log login events in localAuthService", () => {
      const servicePath = path.join(__dirname, "./localAuthService.ts");
      const content = fs.readFileSync(servicePath, "utf-8");
      expect(content).toContain("logLoginEvent");
      expect(content).toContain('eventType: "login"');
      expect(content).toContain('eventType: "login_failed"');
    });

    it("should have loginHistory and loginStats endpoints in routers", () => {
      const routersPath = path.join(__dirname, "./routers.ts");
      const content = fs.readFileSync(routersPath, "utf-8");
      expect(content).toContain("loginHistory:");
      expect(content).toContain("loginStats:");
    });
  });

  describe("Local Auth Service", () => {
    it("should export all required functions", async () => {
      const localAuth = await import("./localAuthService");
      expect(typeof localAuth.registerLocalUser).toBe("function");
      expect(typeof localAuth.loginLocalUser).toBe("function");
      expect(typeof localAuth.verifyLocalToken).toBe("function");
      expect(typeof localAuth.changeLocalPassword).toBe("function");
      expect(typeof localAuth.adminResetPassword).toBe("function");
      expect(typeof localAuth.ensureDefaultAdmin).toBe("function");
    });
  });

  describe("Offline Configuration", () => {
    it("should have offlineConfig.ts", () => {
      const configPath = path.join(__dirname, "./offlineConfig.ts");
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it("should have offline mode settings", () => {
      const configPath = path.join(__dirname, "./offlineConfig.ts");
      const content = fs.readFileSync(configPath, "utf-8");
      expect(content).toContain("OFFLINE_MODE");
      expect(content).toContain("AUTH_MODE");
      expect(content).toContain("STORAGE_MODE");
    });
  });
});
