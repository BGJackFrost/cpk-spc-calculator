import { describe, it, expect } from "vitest";
import { generateTrendPdfHtml, generateTrendExcel, type TrendDataPoint, type TrendExportOptions } from "./trendExportService";

const mockData: TrendDataPoint[] = [
  { timestamp: 1700000000000, date: "2024-11-14", yieldRate: 95.5, defectRate: 2.1, totalInspected: 1000, totalPassed: 955, totalDefects: 21 },
  { timestamp: 1700086400000, date: "2024-11-15", yieldRate: 93.2, defectRate: 3.5, totalInspected: 1200, totalPassed: 1118, totalDefects: 42 },
  { timestamp: 1700172800000, date: "2024-11-16", yieldRate: 97.1, defectRate: 1.2, totalInspected: 800, totalPassed: 777, totalDefects: 10 },
];

const mockOptions: TrendExportOptions = {
  title: "Test Trend Report",
  timeRange: "7d",
  aggregation: "daily",
  yieldWarningThreshold: 95,
  yieldCriticalThreshold: 90,
  defectWarningThreshold: 3,
  defectCriticalThreshold: 5,
};

describe("trendExportService", () => {
  describe("generateTrendPdfHtml", () => {
    it("should generate valid HTML string", () => {
      const html = generateTrendPdfHtml(mockData, mockOptions);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("</html>");
    });

    it("should include the report title", () => {
      const html = generateTrendPdfHtml(mockData, mockOptions);
      expect(html).toContain("Test Trend Report");
    });

    it("should include data values in the HTML", () => {
      const html = generateTrendPdfHtml(mockData, mockOptions);
      expect(html).toContain("95.5");
      expect(html).toContain("93.2");
      expect(html).toContain("97.1");
    });

    it("should handle empty data", () => {
      const html = generateTrendPdfHtml([], mockOptions);
      expect(html).toContain("<!DOCTYPE html>");
    });
  });

  describe("generateTrendExcel", () => {
    it("should generate a Buffer", async () => {
      const buffer = await generateTrendExcel(mockData, mockOptions);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should generate valid XLSX content", async () => {
      const buffer = await generateTrendExcel(mockData, mockOptions);
      // XLSX files start with PK (zip format)
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
    });

    it("should handle empty data", async () => {
      const buffer = await generateTrendExcel([], mockOptions);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
