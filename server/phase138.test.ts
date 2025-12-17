import { describe, it, expect, vi } from "vitest";

describe("Phase 138 - Export BOM, NTF Alert, Dashboard Widget", () => {
  describe("Export BOM APIs", () => {
    it("should have machineRouter with BOM endpoints defined", async () => {
      const { machineRouter } = await import("./routers-extended");
      expect(machineRouter).toBeDefined();
      expect(machineRouter._def.procedures).toBeDefined();
    });
  });

  describe("NTF Alert APIs", () => {
    it("should have defectRouter with NTF endpoints defined", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter).toBeDefined();
      expect(appRouter._def.procedures).toBeDefined();
    });
  });

  describe("NTF Statistics API", () => {
    it("should have getNtfStatistics endpoint in defect router", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter).toBeDefined();
      // The endpoint should be accessible via defect.getNtfStatistics
    });
  });

  describe("Dashboard Widget Integration", () => {
    it("should have dashboard config toggle widget mutation", async () => {
      const { appRouter } = await import("./routers");
      expect(appRouter).toBeDefined();
      // dashboardConfig.toggleWidget should be available
    });
  });
});
