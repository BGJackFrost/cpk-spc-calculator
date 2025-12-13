import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Phase 33 - License UI, License Admin, Login History", () => {
  describe("License Functions", () => {
    it("should have getLicenses function", () => {
      expect(typeof db.getLicenses).toBe("function");
    });

    it("should have createLicense function", () => {
      expect(typeof db.createLicense).toBe("function");
    });

    it("should have getLicenseByKey function", () => {
      expect(typeof db.getLicenseByKey).toBe("function");
    });

    it("should have getActiveLicense function", () => {
      expect(typeof db.getActiveLicense).toBe("function");
    });
  });

  describe("Login History Functions", () => {
    it("should have logLoginEvent function", () => {
      expect(typeof db.logLoginEvent).toBe("function");
    });

    it("should have getLoginHistory function", () => {
      expect(typeof db.getLoginHistory).toBe("function");
    });

    it("should have getLoginStats function", () => {
      expect(typeof db.getLoginStats).toBe("function");
    });

    it("getLoginStats should return correct structure", async () => {
      const stats = await db.getLoginStats();
      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("totalLogins");
      expect(stats).toHaveProperty("loginSuccess");
      expect(stats).toHaveProperty("loginFailed");
      expect(stats).toHaveProperty("logoutCount");
      expect(stats).toHaveProperty("lastLogin");
      expect(stats).toHaveProperty("failedAttempts");
    });
  });

  describe("License Server Module", () => {
    it("should export LicenseServer class", async () => {
      const licenseServer = await import("./licenseServer");
      expect(licenseServer.LicenseServer).toBeDefined();
    });

    it("should have createLicense method", async () => {
      const licenseServer = await import("./licenseServer");
      const instance = new licenseServer.LicenseServer();
      expect(typeof instance.createLicense).toBe("function");
    });

    it("should have activateOnline method", async () => {
      const licenseServer = await import("./licenseServer");
      const instance = new licenseServer.LicenseServer();
      expect(typeof instance.activateOnline).toBe("function");
    });
  });

  describe("App Router License Endpoints", () => {
    it("should have appRouter defined", async () => {
      const routers = await import("./routers");
      expect(routers.appRouter).toBeDefined();
    });
  });
});
