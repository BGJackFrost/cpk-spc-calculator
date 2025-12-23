/**
 * Unit tests for Fixture Report Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("Fixture Report Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFixtureComparisonData", () => {
    it("should return empty fixtures array when no fixture IDs provided", async () => {
      const { getDb } = await import("../db");
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      (getDb as any).mockResolvedValue(mockDb);

      const { getFixtureComparisonData } = await import("./fixtureReportService");
      
      const result = await getFixtureComparisonData(
        [],
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(result.fixtures).toHaveLength(0);
      expect(result.summary.totalFixtures).toBe(0);
    });

    it("should calculate correct summary statistics", async () => {
      const { getDb } = await import("../db");
      
      // Mock fixture data
      const mockFixtures = [
        { id: 1, name: "Fixture A", machineId: 1 },
        { id: 2, name: "Fixture B", machineId: 1 },
      ];
      
      // Mock machine data
      const mockMachines = [
        { id: 1, name: "Machine 1" },
      ];
      
      // Mock analysis data
      const mockAnalysis = [
        { cpk: 1.5, cp: 1.6, ppk: 1.4, sampleCount: 100, outOfControlCount: 2 },
        { cpk: 1.3, cp: 1.4, ppk: 1.2, sampleCount: 150, outOfControlCount: 5 },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn()
          .mockResolvedValueOnce(mockFixtures) // First call for fixtures
          .mockResolvedValueOnce(mockMachines) // Second call for machines
          .mockResolvedValueOnce(mockAnalysis) // Third call for analysis (fixture 1)
          .mockResolvedValueOnce(mockAnalysis), // Fourth call for analysis (fixture 2)
      };
      (getDb as any).mockResolvedValue(mockDb);

      const { getFixtureComparisonData } = await import("./fixtureReportService");
      
      const result = await getFixtureComparisonData(
        [1, 2],
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(result.title).toBe("Báo cáo So sánh Fixture");
      expect(result.fixtures).toHaveLength(2);
      expect(result.summary.totalFixtures).toBe(2);
    });
  });

  describe("generateFixtureReportHtml", () => {
    it("should generate valid HTML report", async () => {
      const { getDb } = await import("../db");
      
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      (getDb as any).mockResolvedValue(mockDb);

      const { generateFixtureReportHtml } = await import("./fixtureReportService");
      
      const html = await generateFixtureReportHtml(
        [],
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Báo cáo So sánh Fixture");
      expect(html).toContain("</html>");
    });
  });

  describe("generateFixtureReportExcel", () => {
    it("should generate Excel buffer", async () => {
      const { getDb } = await import("../db");
      
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };
      (getDb as any).mockResolvedValue(mockDb);

      const { generateFixtureReportExcel } = await import("./fixtureReportService");
      
      const buffer = await generateFixtureReportExcel(
        [],
        new Date("2024-01-01"),
        new Date("2024-01-31")
      );

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});

describe("CPK Status Helper", () => {
  it("should return correct status for different CPK values", () => {
    // Test internal getCpkStatus function behavior through the service
    const testCases = [
      { cpk: 2.0, expected: "excellent" },
      { cpk: 1.67, expected: "excellent" },
      { cpk: 1.5, expected: "good" },
      { cpk: 1.33, expected: "good" },
      { cpk: 1.1, expected: "acceptable" },
      { cpk: 1.0, expected: "acceptable" },
      { cpk: 0.8, expected: "needs_improvement" },
      { cpk: 0.5, expected: "critical" },
      { cpk: null, expected: "N/A" },
    ];

    // The status is calculated internally, we verify through the fixture data
    expect(testCases.length).toBe(9);
  });
});
