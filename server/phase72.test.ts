import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Phase 72 Tests: Workshop Production Line Assignment, Capacity Stats, PDF Charts
 */

describe("Phase 72: Workshop Production Line Assignment", () => {
  describe("Workshop Production Lines Table", () => {
    it("should have workshop_production_lines table schema defined", async () => {
      const { workshopProductionLines } = await import("../drizzle/schema");
      expect(workshopProductionLines).toBeDefined();
    });

    it("should have required columns in workshopProductionLines", async () => {
      const { workshopProductionLines } = await import("../drizzle/schema");
      // Check that the table has the expected columns
      expect(workshopProductionLines.workshopId).toBeDefined();
      expect(workshopProductionLines.productionLineId).toBeDefined();
      expect(workshopProductionLines.isActive).toBeDefined();
    });
  });

  describe("Factory Workshop Router - Production Line Assignment", () => {
    it("should export factoryWorkshopRouter with assignment procedures", async () => {
      const { factoryWorkshopRouter } = await import("./routers/factoryWorkshopRouter");
      expect(factoryWorkshopRouter).toBeDefined();
      
      // Check that the router has the new procedures
      const procedures = Object.keys(factoryWorkshopRouter._def.procedures);
      expect(procedures).toContain("getWorkshopProductionLines");
      expect(procedures).toContain("getAllProductionLines");
      expect(procedures).toContain("assignProductionLines");
      expect(procedures).toContain("removeProductionLineFromWorkshop");
      expect(procedures).toContain("getCapacityStats");
    });
  });
});

describe("Phase 72: Capacity Stats Widget", () => {
  it("should have getCapacityStats procedure in factoryWorkshopRouter", async () => {
    const { factoryWorkshopRouter } = await import("./routers/factoryWorkshopRouter");
    const procedures = Object.keys(factoryWorkshopRouter._def.procedures);
    expect(procedures).toContain("getCapacityStats");
  });
});

describe("Phase 72: PDF Export with SPC Charts", () => {
  describe("Export Service", () => {
    it("should export generatePdfHtml function", async () => {
      const { generatePdfHtml } = await import("./exportService");
      expect(generatePdfHtml).toBeDefined();
      expect(typeof generatePdfHtml).toBe("function");
    });

    it("should generate HTML with chart sections when data is provided", async () => {
      const { generatePdfHtml } = await import("./exportService");
      
      const testData = {
        productCode: "TEST-001",
        stationName: "Station A",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-10"),
        analysisDate: new Date(),
        spcResult: {
          sampleCount: 100,
          mean: 10.5,
          stdDev: 0.5,
          min: 9.0,
          max: 12.0,
          range: 3.0,
          cp: 1.5,
          cpk: 1.33,
          cpu: 1.4,
          cpl: 1.33,
          ucl: 11.5,
          lcl: 9.5,
          uclR: 2.0,
          lclR: 0,
          xBarData: [
            { index: 1, value: 10.2, timestamp: new Date() },
            { index: 2, value: 10.5, timestamp: new Date() },
            { index: 3, value: 10.8, timestamp: new Date() },
          ],
          rangeData: [
            { index: 1, value: 0.5 },
            { index: 2, value: 0.6 },
            { index: 3, value: 0.4 },
          ],
          rawData: [
            { value: 10.1, timestamp: new Date() },
            { value: 10.3, timestamp: new Date() },
            { value: 10.5, timestamp: new Date() },
          ],
        },
        usl: 12.0,
        lsl: 9.0,
        target: 10.5,
      };

      const html = generatePdfHtml(testData);
      
      // Check that HTML contains chart sections
      expect(html).toContain("X-Bar");
      expect(html).toContain("Control Chart");
      expect(html).toContain("svg");
      expect(html).toContain("UCL");
      expect(html).toContain("LCL");
    });

    it("should generate HTML without chart sections when no chart data", async () => {
      const { generatePdfHtml } = await import("./exportService");
      
      const testData = {
        productCode: "TEST-002",
        stationName: "Station B",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-10"),
        analysisDate: new Date(),
        spcResult: {
          sampleCount: 50,
          mean: 5.0,
          stdDev: 0.2,
          min: 4.5,
          max: 5.5,
          range: 1.0,
          cp: 1.2,
          cpk: 1.1,
          cpu: 1.15,
          cpl: 1.1,
          ucl: 5.5,
          lcl: 4.5,
          uclR: 1.0,
          lclR: 0,
          xBarData: [],
          rangeData: [],
          rawData: [],
        },
      };

      const html = generatePdfHtml(testData);
      
      // Should still have basic report structure
      expect(html).toContain("TEST-002");
      expect(html).toContain("Station B");
      expect(html).toContain("CPK");
    });

    it("should include histogram when rawData is provided", async () => {
      const { generatePdfHtml } = await import("./exportService");
      
      const rawData = Array.from({ length: 30 }, (_, i) => ({
        value: 10 + Math.random() * 2 - 1,
        timestamp: new Date(),
      }));

      const testData = {
        productCode: "TEST-003",
        stationName: "Station C",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-10"),
        analysisDate: new Date(),
        spcResult: {
          sampleCount: 30,
          mean: 10.0,
          stdDev: 0.5,
          min: 9.0,
          max: 11.0,
          range: 2.0,
          cp: 1.33,
          cpk: 1.2,
          cpu: 1.25,
          cpl: 1.2,
          ucl: 11.0,
          lcl: 9.0,
          uclR: 1.5,
          lclR: 0,
          xBarData: [],
          rangeData: [],
          rawData: rawData,
        },
        usl: 11.5,
        lsl: 8.5,
      };

      const html = generatePdfHtml(testData);
      
      // Should contain histogram section
      expect(html).toContain("Histogram");
      expect(html).toContain("Phân bố dữ liệu");
    });
  });
});

describe("Phase 72: Integration Tests", () => {
  it("should have all required exports from schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.workshopProductionLines).toBeDefined();
    expect(schema.workshops).toBeDefined();
    expect(schema.factories).toBeDefined();
    expect(schema.productionLines).toBeDefined();
  });

  it("should have factoryWorkshopRouter with correct procedures", async () => {
    const { factoryWorkshopRouter } = await import("./routers/factoryWorkshopRouter");
    expect(factoryWorkshopRouter).toBeDefined();
    const procedures = Object.keys(factoryWorkshopRouter._def.procedures);
    // Check that factoryWorkshop procedures are accessible
    expect(procedures).toContain("getCapacityStats");
    expect(procedures).toContain("assignProductionLines");
  });
});
