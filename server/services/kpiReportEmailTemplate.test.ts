/**
 * Tests for KPI Report Email Template
 * Kiểm tra template email báo cáo KPI
 */

import { describe, it, expect } from "vitest";
import { generateKPIReportEmail, generateSampleReportData, KPIReportData } from "./kpiReportEmailTemplate";

describe("KPI Report Email Template", () => {
  describe("generateKPIReportEmail", () => {
    it("should generate HTML and text content", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      expect(result).toHaveProperty("html");
      expect(result).toHaveProperty("text");
      expect(result.html.length).toBeGreaterThan(0);
      expect(result.text.length).toBeGreaterThan(0);
    });

    it("should include report name in HTML", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      expect(result.html).toContain(sampleData.reportName);
    });

    it("should include production line data in HTML", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      for (const line of sampleData.productionLines) {
        expect(result.html).toContain(line.name);
      }
    });

    it("should include alerts in HTML when present", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      if (sampleData.alerts.length > 0) {
        expect(result.html).toContain("Cảnh báo");
        for (const alert of sampleData.alerts) {
          expect(result.html).toContain(alert.message);
        }
      }
    });

    it("should include recommendations in HTML when present", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      if (sampleData.recommendations.length > 0) {
        expect(result.html).toContain("Khuyến nghị");
        for (const rec of sampleData.recommendations) {
          expect(result.html).toContain(rec);
        }
      }
    });

    it("should include shift data when provided", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      if (sampleData.shiftData && sampleData.shiftData.length > 0) {
        expect(result.html).toContain("Thống kê theo ca");
        for (const shift of sampleData.shiftData) {
          expect(result.html).toContain(shift.shift);
        }
      }
    });

    it("should generate valid HTML structure", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      expect(result.html).toContain("<!DOCTYPE html>");
      expect(result.html).toContain("<html>");
      expect(result.html).toContain("</html>");
      expect(result.html).toContain("<head>");
      expect(result.html).toContain("</head>");
      expect(result.html).toContain("<body>");
      expect(result.html).toContain("</body>");
    });

    it("should handle empty production lines", () => {
      const emptyData: KPIReportData = {
        reportName: "Test Report",
        reportType: "shift_summary",
        frequency: "daily",
        dateRange: {
          start: new Date(),
          end: new Date(),
        },
        productionLines: [],
        alerts: [],
        recommendations: [],
      };

      const result = generateKPIReportEmail(emptyData);

      expect(result.html.length).toBeGreaterThan(0);
      expect(result.text.length).toBeGreaterThan(0);
    });

    it("should format CPK values correctly", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      // CPK values should be formatted to 2-3 decimal places
      for (const line of sampleData.productionLines) {
        if (line.avgCpk !== null) {
          // Check that the formatted value appears in the HTML
          expect(result.html).toContain(line.avgCpk.toFixed(3));
        }
      }
    });

    it("should format OEE values correctly", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      // OEE values should be formatted with % sign
      for (const line of sampleData.productionLines) {
        if (line.avgOee !== null) {
          expect(result.html).toContain(`${line.avgOee.toFixed(1)}%`);
        }
      }
    });
  });

  describe("generateSampleReportData", () => {
    it("should return valid sample data", () => {
      const sampleData = generateSampleReportData();

      expect(sampleData).toHaveProperty("reportName");
      expect(sampleData).toHaveProperty("reportType");
      expect(sampleData).toHaveProperty("frequency");
      expect(sampleData).toHaveProperty("dateRange");
      expect(sampleData).toHaveProperty("productionLines");
      expect(sampleData).toHaveProperty("alerts");
      expect(sampleData).toHaveProperty("recommendations");
    });

    it("should have valid date range", () => {
      const sampleData = generateSampleReportData();

      expect(sampleData.dateRange.start).toBeInstanceOf(Date);
      expect(sampleData.dateRange.end).toBeInstanceOf(Date);
      expect(sampleData.dateRange.start.getTime()).toBeLessThanOrEqual(
        sampleData.dateRange.end.getTime()
      );
    });

    it("should have valid production line data", () => {
      const sampleData = generateSampleReportData();

      expect(sampleData.productionLines.length).toBeGreaterThan(0);
      
      for (const line of sampleData.productionLines) {
        expect(line).toHaveProperty("id");
        expect(line).toHaveProperty("name");
        expect(line).toHaveProperty("avgCpk");
        expect(line).toHaveProperty("avgOee");
        expect(line).toHaveProperty("defectRate");
        expect(line).toHaveProperty("totalSamples");
        expect(line).toHaveProperty("cpkTrend");
        expect(line).toHaveProperty("oeeTrend");
        
        // Validate trend values
        expect(["up", "down", "stable"]).toContain(line.cpkTrend);
        expect(["up", "down", "stable"]).toContain(line.oeeTrend);
      }
    });

    it("should have valid report type", () => {
      const sampleData = generateSampleReportData();

      expect(["shift_summary", "kpi_comparison", "trend_analysis", "full_report"]).toContain(
        sampleData.reportType
      );
    });

    it("should have valid frequency", () => {
      const sampleData = generateSampleReportData();

      expect(["daily", "weekly", "monthly"]).toContain(sampleData.frequency);
    });
  });

  describe("Email Template Styling", () => {
    it("should include responsive styles", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      expect(result.html).toContain("@media");
    });

    it("should include color coding for status", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      // Should have color classes for different statuses
      expect(result.html).toContain("good");
      expect(result.html).toContain("warning");
    });

    it("should include trend indicators", () => {
      const sampleData = generateSampleReportData();
      const result = generateKPIReportEmail(sampleData);

      // Should have trend arrows
      expect(result.html).toMatch(/[↑↓→]/);
    });
  });
});
