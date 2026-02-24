import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";

describe("Phase 3.12 - Jig Management, License Notification Report, Image Lightbox", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("Jig Management", () => {
    it("should have jigs table in database", async () => {
      if (!db) {
        console.log("Database not available, skipping test");
        return;
      }
      
      // Check if jigs table exists by querying it
      const { jigs } = await import("../drizzle/schema");
      const result = await db.select().from(jigs).limit(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should have jig CRUD functions in db.ts", async () => {
      const dbModule = await import("./db");
      
      // Check that jig functions exist
      expect(typeof dbModule.getJigs).toBe("function");
      expect(typeof dbModule.getJigById).toBe("function");
      expect(typeof dbModule.createJig).toBe("function");
      expect(typeof dbModule.updateJig).toBe("function");
      expect(typeof dbModule.deleteJig).toBe("function");
    });

    it("should have jig router in routers.ts", async () => {
      const routersModule = await import("./routers");
      const appRouter = routersModule.appRouter;
      
      // Check that jig router exists by checking for jig.list procedure
      const procedures = Object.keys(appRouter._def.procedures);
      const hasJigRouter = procedures.some(p => p.startsWith("jig."));
      expect(hasJigRouter).toBe(true);
    });
  });

  describe("License Notification Logs", () => {
    it("should have license_notification_logs table in database", async () => {
      if (!db) {
        console.log("Database not available, skipping test");
        return;
      }
      
      // Check if license_notification_logs table exists
      const { licenseNotificationLogs } = await import("../drizzle/schema");
      const result = await db.select().from(licenseNotificationLogs).limit(1);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should have notification logs functions in db.ts", async () => {
      const dbModule = await import("./db");
      
      // Check that notification logs functions exist
      expect(typeof dbModule.getLicenseNotificationLogs).toBe("function");
      expect(typeof dbModule.getLicenseNotificationStats).toBe("function");
    });

    it("should have notification logs API in license router", async () => {
      const routersModule = await import("./routers");
      const appRouter = routersModule.appRouter;
      
      // Check that license router has notification logs procedures
      const procedures = Object.keys(appRouter._def.procedures);
      const hasLicenseNotificationLogs = procedures.some(p => p.includes("license.getNotificationLogs"));
      expect(hasLicenseNotificationLogs).toBe(true);
    });
  });

  describe("Image Lightbox Component", () => {
    it("should have ImageLightbox component file", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const componentPath = path.join(
        process.cwd(),
        "client/src/components/ImageLightbox.tsx"
      );
      
      const exists = await fs.access(componentPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should export useImageLightbox hook", async () => {
      // This test verifies the component structure by checking the file content
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const componentPath = path.join(
        process.cwd(),
        "client/src/components/ImageLightbox.tsx"
      );
      
      const content = await fs.readFile(componentPath, "utf-8");
      expect(content).toContain("export function useImageLightbox");
      expect(content).toContain("export default function ImageLightbox");
    });
  });

  describe("JigManagement Page", () => {
    it("should have JigManagement page file", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/JigManagement.tsx"
      );
      
      const exists = await fs.access(pagePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should use ImageLightbox in JigManagement", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/JigManagement.tsx"
      );
      
      const content = await fs.readFile(pagePath, "utf-8");
      expect(content).toContain("ImageLightbox");
      expect(content).toContain("useImageLightbox");
    });
  });

  describe("LicenseNotificationReport Page", () => {
    it("should have LicenseNotificationReport page file", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/LicenseNotificationReport.tsx"
      );
      
      const exists = await fs.access(pagePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should have proper statistics display", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/LicenseNotificationReport.tsx"
      );
      
      const content = await fs.readFile(pagePath, "utf-8");
      expect(content).toContain("getNotificationLogs");
      expect(content).toContain("getNotificationStats");
    });
  });

  describe("Route Configuration", () => {
    it("should have /jigs route in App.tsx", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const appPath = path.join(
        process.cwd(),
        "client/src/App.tsx"
      );
      
      const content = await fs.readFile(appPath, "utf-8");
      expect(content).toContain('path="/jigs"');
      expect(content).toContain("JigManagement");
    });

    it("should have /license-notification-report route in App.tsx", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const appPath = path.join(
        process.cwd(),
        "client/src/App.tsx"
      );
      
      const content = await fs.readFile(appPath, "utf-8");
      expect(content).toContain('path="/license-notification-report"');
      expect(content).toContain("LicenseNotificationReport");
    });
  });

  describe("Menu Configuration", () => {
    it("should have jigs menu in systemMenu.ts", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const menuPath = path.join(
        process.cwd(),
        "client/src/config/systemMenu.ts"
      );
      
      const content = await fs.readFile(menuPath, "utf-8");
      expect(content).toContain('id: "jigs"');
      expect(content).toContain('path: "/jigs"');
    });

    it("should have license-notification-report menu in systemMenu.ts", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const menuPath = path.join(
        process.cwd(),
        "client/src/config/systemMenu.ts"
      );
      
      const content = await fs.readFile(menuPath, "utf-8");
      expect(content).toContain('id: "license-notification-report"');
      expect(content).toContain('path: "/license-notification-report"');
    });
  });
});
