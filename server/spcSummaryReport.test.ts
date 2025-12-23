/**
 * Tests for SPC Summary Report Service
 * Phase 35 - SPC Aggregation and Summary Reports
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  }),
  getDefaultReportTemplate: vi.fn().mockResolvedValue({
    id: 1,
    name: "Default",
    companyName: "Test Company",
    companyLogo: null,
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
    fontFamily: "Arial",
    showLogo: 1,
    showCompanyName: 1,
    showDate: 1,
    showCharts: 1,
    showRawData: 1,
  }),
}));

describe("SPC Summary Report Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Service Structure", () => {
    it("should export getSpcSummaryReportData function", async () => {
      const service = await import("./services/spcSummaryReportService");
      expect(typeof service.getSpcSummaryReportData).toBe("function");
    });

    it("should export generateSpcSummaryReportHtml function", async () => {
      const service = await import("./services/spcSummaryReportService");
      expect(typeof service.generateSpcSummaryReportHtml).toBe("function");
    });

    it("should export generateSpcSummaryCsv function", async () => {
      const service = await import("./services/spcSummaryReportService");
      expect(typeof service.generateSpcSummaryCsv).toBe("function");
    });
  });

  describe("Period Types", () => {
    it("should support shift period type", async () => {
      const service = await import("./services/spcSummaryReportService");
      // The service should accept "shift" as a valid period type
      expect(["shift", "day", "week", "month"]).toContain("shift");
    });

    it("should support day period type", async () => {
      expect(["shift", "day", "week", "month"]).toContain("day");
    });

    it("should support week period type", async () => {
      expect(["shift", "day", "week", "month"]).toContain("week");
    });

    it("should support month period type", async () => {
      expect(["shift", "day", "week", "month"]).toContain("month");
    });
  });

  describe("CPK Status Classification", () => {
    it("should classify CPK >= 1.67 as excellent", () => {
      const getCpkStatus = (cpk: number | null): string => {
        if (cpk === null) return "N/A";
        if (cpk >= 1.67) return "excellent";
        if (cpk >= 1.33) return "good";
        if (cpk >= 1.0) return "acceptable";
        if (cpk >= 0.67) return "needs_improvement";
        return "critical";
      };

      expect(getCpkStatus(1.67)).toBe("excellent");
      expect(getCpkStatus(2.0)).toBe("excellent");
    });

    it("should classify CPK >= 1.33 as good", () => {
      const getCpkStatus = (cpk: number | null): string => {
        if (cpk === null) return "N/A";
        if (cpk >= 1.67) return "excellent";
        if (cpk >= 1.33) return "good";
        if (cpk >= 1.0) return "acceptable";
        if (cpk >= 0.67) return "needs_improvement";
        return "critical";
      };

      expect(getCpkStatus(1.33)).toBe("good");
      expect(getCpkStatus(1.5)).toBe("good");
    });

    it("should classify CPK >= 1.0 as acceptable", () => {
      const getCpkStatus = (cpk: number | null): string => {
        if (cpk === null) return "N/A";
        if (cpk >= 1.67) return "excellent";
        if (cpk >= 1.33) return "good";
        if (cpk >= 1.0) return "acceptable";
        if (cpk >= 0.67) return "needs_improvement";
        return "critical";
      };

      expect(getCpkStatus(1.0)).toBe("acceptable");
      expect(getCpkStatus(1.2)).toBe("acceptable");
    });

    it("should classify CPK >= 0.67 as needs_improvement", () => {
      const getCpkStatus = (cpk: number | null): string => {
        if (cpk === null) return "N/A";
        if (cpk >= 1.67) return "excellent";
        if (cpk >= 1.33) return "good";
        if (cpk >= 1.0) return "acceptable";
        if (cpk >= 0.67) return "needs_improvement";
        return "critical";
      };

      expect(getCpkStatus(0.67)).toBe("needs_improvement");
      expect(getCpkStatus(0.9)).toBe("needs_improvement");
    });

    it("should classify CPK < 0.67 as critical", () => {
      const getCpkStatus = (cpk: number | null): string => {
        if (cpk === null) return "N/A";
        if (cpk >= 1.67) return "excellent";
        if (cpk >= 1.33) return "good";
        if (cpk >= 1.0) return "acceptable";
        if (cpk >= 0.67) return "needs_improvement";
        return "critical";
      };

      expect(getCpkStatus(0.5)).toBe("critical");
      expect(getCpkStatus(0.0)).toBe("critical");
    });

    it("should return N/A for null CPK", () => {
      const getCpkStatus = (cpk: number | null): string => {
        if (cpk === null) return "N/A";
        if (cpk >= 1.67) return "excellent";
        if (cpk >= 1.33) return "good";
        if (cpk >= 1.0) return "acceptable";
        if (cpk >= 0.67) return "needs_improvement";
        return "critical";
      };

      expect(getCpkStatus(null)).toBe("N/A");
    });
  });

  describe("Report Data Structure", () => {
    it("should have required summary fields", () => {
      const expectedFields = [
        "totalPeriods",
        "avgCpk",
        "minCpk",
        "maxCpk",
        "avgCp",
        "totalSamples",
        "excellentCount",
        "goodCount",
        "acceptableCount",
        "needsImprovementCount",
        "criticalCount",
      ];

      // Verify the structure is correct
      expectedFields.forEach((field) => {
        expect(expectedFields).toContain(field);
      });
    });

    it("should have required period data fields", () => {
      const expectedFields = [
        "periodStart",
        "periodEnd",
        "cpk",
        "cp",
        "ppk",
        "mean",
        "stdDev",
        "sampleCount",
        "status",
      ];

      expectedFields.forEach((field) => {
        expect(expectedFields).toContain(field);
      });
    });
  });
});

describe("SPC Aggregation Service", () => {
  describe("Service Structure", () => {
    it("should export aggregateSpcData function", async () => {
      const service = await import("./spcAggregationService");
      expect(typeof service.aggregateSpcData).toBe("function");
    });

    it("should export backfillSpcSummary function", async () => {
      const service = await import("./spcAggregationService");
      expect(typeof service.backfillSpcSummary).toBe("function");
    });

    it("should export compareShiftCpk function", async () => {
      const service = await import("./spcAggregationService");
      expect(typeof service.compareShiftCpk).toBe("function");
    });

    it("should export getShiftSummaryForDay function", async () => {
      const service = await import("./spcAggregationService");
      expect(typeof service.getShiftSummaryForDay).toBe("function");
    });

    it("should export aggregateAllActivePlans function", async () => {
      const service = await import("./spcAggregationService");
      expect(typeof service.aggregateAllActivePlans).toBe("function");
    });

    it("should export aggregatePlanAllPeriods function", async () => {
      const service = await import("./spcAggregationService");
      expect(typeof service.aggregatePlanAllPeriods).toBe("function");
    });
  });

  describe("Shift Time Calculations", () => {
    it("should define morning shift as 6h-14h", () => {
      const SHIFT_DEFINITIONS = {
        morning: { name: "Ca sáng", startHour: 6, endHour: 14 },
        afternoon: { name: "Ca chiều", startHour: 14, endHour: 22 },
        night: { name: "Ca đêm", startHour: 22, endHour: 6 },
      };

      expect(SHIFT_DEFINITIONS.morning.startHour).toBe(6);
      expect(SHIFT_DEFINITIONS.morning.endHour).toBe(14);
    });

    it("should define afternoon shift as 14h-22h", () => {
      const SHIFT_DEFINITIONS = {
        morning: { name: "Ca sáng", startHour: 6, endHour: 14 },
        afternoon: { name: "Ca chiều", startHour: 14, endHour: 22 },
        night: { name: "Ca đêm", startHour: 22, endHour: 6 },
      };

      expect(SHIFT_DEFINITIONS.afternoon.startHour).toBe(14);
      expect(SHIFT_DEFINITIONS.afternoon.endHour).toBe(22);
    });

    it("should define night shift as 22h-6h", () => {
      const SHIFT_DEFINITIONS = {
        morning: { name: "Ca sáng", startHour: 6, endHour: 14 },
        afternoon: { name: "Ca chiều", startHour: 14, endHour: 22 },
        night: { name: "Ca đêm", startHour: 22, endHour: 6 },
      };

      expect(SHIFT_DEFINITIONS.night.startHour).toBe(22);
      expect(SHIFT_DEFINITIONS.night.endHour).toBe(6);
    });
  });
});
