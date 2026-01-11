import { describe, it, expect } from "vitest";
import { generateHistoryExcelBuffer, generateHistoryPdfHtml } from "./historyExportService";

describe("historyExportService", () => {
  const sampleData = [
    {
      id: 1,
      productCode: "PRD-001",
      stationName: "Station A",
      sampleCount: 100,
      mean: 10.5,
      stdDev: 0.5,
      cp: 1.5,
      cpk: 1.33,
      cpu: 1.4,
      cpl: 1.35,
      pp: 1.45,
      ppk: 1.3,
      ca: 0.05,
      usl: 12.0,
      lsl: 9.0,
      target: 10.5,
      ucl: 11.5,
      lcl: 9.5,
      alertTriggered: 0,
      createdAt: new Date("2024-01-15T10:30:00Z"),
      factoryName: "Factory A",
      workshopName: "Workshop 1",
    },
    {
      id: 2,
      productCode: "PRD-002",
      stationName: "Station B",
      sampleCount: 150,
      mean: 20.2,
      stdDev: 1.2,
      cp: 1.1,
      cpk: 0.95,
      cpu: 1.0,
      cpl: 0.9,
      pp: 1.05,
      ppk: 0.92,
      ca: 0.1,
      usl: 23.0,
      lsl: 17.0,
      target: 20.0,
      ucl: 22.0,
      lcl: 18.0,
      alertTriggered: 1,
      createdAt: new Date("2024-01-16T14:00:00Z"),
      factoryName: "Factory B",
      workshopName: "Workshop 2",
    },
  ];

  describe("generateHistoryExcelBuffer", () => {
    it("should generate a valid Excel buffer", async () => {
      const buffer = await generateHistoryExcelBuffer(sampleData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Check Excel file signature (PK for ZIP-based formats)
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it("should handle empty data", async () => {
      const buffer = await generateHistoryExcelBuffer([]);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("generateHistoryPdfHtml", () => {
    it("should generate valid HTML", () => {
      const html = generateHistoryPdfHtml(sampleData, {});
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Lịch sử Phân tích SPC/CPK");
    });

    it("should include data in the HTML", () => {
      const html = generateHistoryPdfHtml(sampleData, {});
      expect(html).toContain("PRD-001");
      expect(html).toContain("Station A");
    });

    it("should include filter information when provided", () => {
      const html = generateHistoryPdfHtml(sampleData, {
        productCode: "PRD-001",
        stationName: "Station A",
      });
      expect(html).toContain("Sản phẩm: PRD-001");
      expect(html).toContain("Công trạm: Station A");
    });

    it("should handle empty data", () => {
      const html = generateHistoryPdfHtml([], {});
      expect(html).toContain("<!DOCTYPE html>");
    });
  });
});
