import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";

describe("Phase 3.13 - Thumbnail Lightbox, Retry Notification, License Dashboard", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  describe("Machine/Workstation Thumbnail & Lightbox", () => {
    it("should have ImageLightbox component", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const componentPath = path.join(
        process.cwd(),
        "client/src/components/ImageLightbox.tsx"
      );
      
      const exists = await fs.access(componentPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should have lightbox integrated in MachineManagement", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/MachineManagement.tsx"
      );
      
      const content = await fs.readFile(pagePath, "utf-8");
      expect(content).toContain("useImageLightbox");
      expect(content).toContain("LightboxComponent");
      expect(content).toContain("openLightbox");
    });

    it("should have lightbox integrated in WorkstationManagement", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/WorkstationManagement.tsx"
      );
      
      const content = await fs.readFile(pagePath, "utf-8");
      expect(content).toContain("useImageLightbox");
      expect(content).toContain("LightboxComponent");
      expect(content).toContain("openLightbox");
    });
  });

  describe("Retry Notification", () => {
    it("should have retry notification functions in db.ts", async () => {
      const dbModule = await import("./db");
      
      expect(typeof dbModule.getNotificationLogById).toBe("function");
      expect(typeof dbModule.updateLicenseNotificationLog).toBe("function");
    });

    it("should have retry APIs in license router", async () => {
      const routersModule = await import("./routers");
      const appRouter = routersModule.appRouter;
      
      const procedures = Object.keys(appRouter._def.procedures);
      const hasRetryNotification = procedures.some(p => p.includes("license.retryNotification"));
      const hasBulkRetry = procedures.some(p => p.includes("license.bulkRetryNotifications"));
      
      expect(hasRetryNotification).toBe(true);
      expect(hasBulkRetry).toBe(true);
    });

    it("should have retry UI in LicenseNotificationReport", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/LicenseNotificationReport.tsx"
      );
      
      const content = await fs.readFile(pagePath, "utf-8");
      expect(content).toContain("retryNotification");
      expect(content).toContain("bulkRetryNotifications");
      expect(content).toContain("handleRetry");
      expect(content).toContain("handleBulkRetry");
    });
  });

  describe("License Dashboard", () => {
    it("should have getLicenseDashboardStats function in db.ts", async () => {
      const dbModule = await import("./db");
      expect(typeof dbModule.getLicenseDashboardStats).toBe("function");
    });

    it("should have getDashboardStats API in license router", async () => {
      const routersModule = await import("./routers");
      const appRouter = routersModule.appRouter;
      
      const procedures = Object.keys(appRouter._def.procedures);
      const hasDashboardStats = procedures.some(p => p.includes("license.getDashboardStats"));
      expect(hasDashboardStats).toBe(true);
    });

    it("should have LicenseDashboard page", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/LicenseDashboard.tsx"
      );
      
      const exists = await fs.access(pagePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it("should have pie charts in LicenseDashboard", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const pagePath = path.join(
        process.cwd(),
        "client/src/pages/LicenseDashboard.tsx"
      );
      
      const content = await fs.readFile(pagePath, "utf-8");
      expect(content).toContain("PieChart");
      expect(content).toContain("BarChart");
      expect(content).toContain("getDashboardStats");
    });

    it("should have /license-dashboard route in App.tsx", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const appPath = path.join(
        process.cwd(),
        "client/src/App.tsx"
      );
      
      const content = await fs.readFile(appPath, "utf-8");
      expect(content).toContain('path="/license-dashboard"');
      expect(content).toContain("LicenseDashboard");
    });

    it("should have license-dashboard menu in systemMenu.ts", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const menuPath = path.join(
        process.cwd(),
        "client/src/config/systemMenu.ts"
      );
      
      const content = await fs.readFile(menuPath, "utf-8");
      expect(content).toContain('id: "license-dashboard"');
      expect(content).toContain('path: "/license-dashboard"');
    });
  });
});
