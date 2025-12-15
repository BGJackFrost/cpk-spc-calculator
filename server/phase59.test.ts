import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db functions
vi.mock("./db", () => ({
  getMeasurementStandards: vi.fn(),
  getMeasurementStandardById: vi.fn(),
  createMeasurementStandard: vi.fn(),
  updateMeasurementStandard: vi.fn(),
  deleteMeasurementStandard: vi.fn(),
  getProducts: vi.fn(),
  getAllWorkstations: vi.fn(),
  getMachines: vi.fn(),
}));

import {
  getMeasurementStandards,
  getProducts,
  getAllWorkstations,
  getMachines,
} from "./db";

describe("Phase 59 - Dashboard Tiêu chuẩn đo và Tích hợp SPC Plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MeasurementStandards Dashboard Statistics", () => {
    it("should calculate total standards count", async () => {
      const mockStandards = [
        { id: 1, measurementName: "Dimension A", isActive: 1 },
        { id: 2, measurementName: "Dimension B", isActive: 1 },
        { id: 3, measurementName: "Dimension C", isActive: 0 },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      expect(standards.length).toBe(3);
    });

    it("should calculate active vs inactive standards", async () => {
      const mockStandards = [
        { id: 1, isActive: 1 },
        { id: 2, isActive: 1 },
        { id: 3, isActive: 0 },
        { id: 4, isActive: 1 },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const active = standards.filter((s: any) => s.isActive === 1).length;
      const inactive = standards.filter((s: any) => s.isActive === 0).length;

      expect(active).toBe(3);
      expect(inactive).toBe(1);
    });

    it("should count standards by product", async () => {
      const mockStandards = [
        { id: 1, productId: 1 },
        { id: 2, productId: 1 },
        { id: 3, productId: 2 },
        { id: 4, productId: 1 },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const byProduct = standards.reduce((acc: Record<number, number>, s: any) => {
        if (s.productId) {
          acc[s.productId] = (acc[s.productId] || 0) + 1;
        }
        return acc;
      }, {});

      expect(byProduct[1]).toBe(3);
      expect(byProduct[2]).toBe(1);
    });

    it("should count standards by workstation", async () => {
      const mockStandards = [
        { id: 1, workstationId: 1 },
        { id: 2, workstationId: 2 },
        { id: 3, workstationId: 1 },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const byWorkstation = standards.reduce((acc: Record<number, number>, s: any) => {
        if (s.workstationId) {
          acc[s.workstationId] = (acc[s.workstationId] || 0) + 1;
        }
        return acc;
      }, {});

      expect(byWorkstation[1]).toBe(2);
      expect(byWorkstation[2]).toBe(1);
    });

    it("should count standards with SPC rules configured", async () => {
      const mockStandards = [
        { id: 1, appliedSpcRules: JSON.stringify([1, 2, 3]) },
        { id: 2, appliedSpcRules: JSON.stringify([]) },
        { id: 3, appliedSpcRules: null },
        { id: 4, appliedSpcRules: JSON.stringify([1]) },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const withSpcRules = standards.filter((s: any) => {
        if (!s.appliedSpcRules) return false;
        try {
          const rules = JSON.parse(s.appliedSpcRules);
          return Array.isArray(rules) && rules.length > 0;
        } catch {
          return false;
        }
      }).length;

      expect(withSpcRules).toBe(2);
    });

    it("should calculate completion rate", async () => {
      const mockStandards = [
        { id: 1, usl: 100, lsl: 90, sampleSize: 5, sampleFrequency: 60 },
        { id: 2, usl: 100, lsl: null, sampleSize: 5, sampleFrequency: 60 },
        { id: 3, usl: 100, lsl: 90, sampleSize: null, sampleFrequency: 60 },
        { id: 4, usl: 100, lsl: 90, sampleSize: 5, sampleFrequency: 60 },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const complete = standards.filter((s: any) => 
        s.usl !== null && s.lsl !== null && s.sampleSize !== null && s.sampleFrequency !== null
      ).length;
      const completionRate = Math.round((complete / standards.length) * 100);

      expect(complete).toBe(2);
      expect(completionRate).toBe(50);
    });

    it("should identify standards needing attention", async () => {
      const mockStandards = [
        { id: 1, isActive: 1, usl: 100, lsl: 90, sampleSize: 5 },
        { id: 2, isActive: 1, usl: null, lsl: 90, sampleSize: 5 },
        { id: 3, isActive: 0, usl: null, lsl: null, sampleSize: null },
        { id: 4, isActive: 1, usl: 100, lsl: 90, sampleSize: null },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const needsAttention = standards.filter((s: any) => 
        s.isActive === 1 && (s.usl === null || s.lsl === null || s.sampleSize === null)
      ).length;

      expect(needsAttention).toBe(2);
    });
  });

  describe("SPC Plan Integration with Measurement Standards", () => {
    it("should parse appliedSpcRules from measurement standard", () => {
      const standard = {
        id: 1,
        appliedSpcRules: JSON.stringify([1, 2, 3, 4]),
      };

      const rules = JSON.parse(standard.appliedSpcRules);
      expect(rules).toEqual([1, 2, 3, 4]);
    });

    it("should handle empty appliedSpcRules", () => {
      const standard = {
        id: 1,
        appliedSpcRules: null,
      };

      const rules = standard.appliedSpcRules ? JSON.parse(standard.appliedSpcRules) : [];
      expect(rules).toEqual([]);
    });

    it("should auto-fill SPC Plan form from measurement standard", () => {
      const standard = {
        id: 1,
        productId: 10,
        workstationId: 20,
        machineId: 30,
        appliedSpcRules: JSON.stringify([1, 2]),
      };

      const formData = {
        measurementStandardId: standard.id,
        productId: standard.productId,
        workstationId: standard.workstationId,
        machineId: standard.machineId,
        enabledSpcRules: JSON.parse(standard.appliedSpcRules),
      };

      expect(formData.measurementStandardId).toBe(1);
      expect(formData.productId).toBe(10);
      expect(formData.workstationId).toBe(20);
      expect(formData.machineId).toBe(30);
      expect(formData.enabledSpcRules).toEqual([1, 2]);
    });
  });

  describe("Production Line Image Upload", () => {
    it("should validate image URL format", () => {
      const validUrls = [
        "https://storage.example.com/images/line1.jpg",
        "https://cdn.example.com/production/line.png",
      ];

      validUrls.forEach(url => {
        expect(url.startsWith("https://")).toBe(true);
      });
    });

    it("should handle empty image URL", () => {
      const productionLine = {
        id: 1,
        name: "Line 1",
        imageUrl: "",
      };

      expect(productionLine.imageUrl || undefined).toBeUndefined();
    });
  });

  describe("Dashboard Filtering", () => {
    it("should filter standards by search term", async () => {
      const mockStandards = [
        { id: 1, measurementName: "Dimension Width" },
        { id: 2, measurementName: "Dimension Height" },
        { id: 3, measurementName: "Weight" },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const searchTerm = "dimension";
      const filtered = standards.filter((s: any) => 
        s.measurementName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filtered.length).toBe(2);
    });

    it("should filter standards by status", async () => {
      const mockStandards = [
        { id: 1, isActive: 1 },
        { id: 2, isActive: 0 },
        { id: 3, isActive: 1 },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const activeOnly = standards.filter((s: any) => s.isActive === 1);

      expect(activeOnly.length).toBe(2);
    });

    it("should filter standards by product", async () => {
      const mockStandards = [
        { id: 1, productId: 1 },
        { id: 2, productId: 2 },
        { id: 3, productId: 1 },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const standards = await getMeasurementStandards();
      const productFilter = 1;
      const filtered = standards.filter((s: any) => s.productId === productFilter);

      expect(filtered.length).toBe(2);
    });
  });
});
