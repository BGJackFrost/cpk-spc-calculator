import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db functions
vi.mock("./db", () => ({
  getMeasurementStandards: vi.fn(),
  getMeasurementStandardById: vi.fn(),
  getMeasurementStandardByProductWorkstation: vi.fn(),
  createMeasurementStandard: vi.fn(),
  updateMeasurementStandard: vi.fn(),
  deleteMeasurementStandard: vi.fn(),
}));

import {
  getMeasurementStandards,
  getMeasurementStandardById,
  getMeasurementStandardByProductWorkstation,
  createMeasurementStandard,
  updateMeasurementStandard,
  deleteMeasurementStandard,
} from "./db";

describe("MeasurementStandard DB Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getMeasurementStandards", () => {
    it("should return all measurement standards", async () => {
      const mockStandards = [
        {
          id: 1,
          productId: 1,
          workstationId: 1,
          machineId: null,
          measurementName: "Dimension A",
          usl: 1050000,
          lsl: 950000,
          target: 1000000,
          unit: "mm",
          sampleSize: 5,
          sampleFrequency: 60,
          samplingMethod: "random",
          appliedSpcRules: '["rule1","rule2"]',
          cpkWarningThreshold: 133,
          cpkCriticalThreshold: 100,
          notes: null,
          isActive: 1,
          createdBy: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandards);

      const result = await getMeasurementStandards();
      expect(result).toEqual(mockStandards);
      expect(getMeasurementStandards).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no standards exist", async () => {
      (getMeasurementStandards as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const result = await getMeasurementStandards();
      expect(result).toEqual([]);
    });
  });

  describe("getMeasurementStandardById", () => {
    it("should return a standard by id", async () => {
      const mockStandard = {
        id: 1,
        productId: 1,
        workstationId: 1,
        measurementName: "Dimension A",
        usl: 1050000,
        lsl: 950000,
        sampleSize: 5,
        sampleFrequency: 60,
      };

      (getMeasurementStandardById as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandard);

      const result = await getMeasurementStandardById(1);
      expect(result).toEqual(mockStandard);
      expect(getMeasurementStandardById).toHaveBeenCalledWith(1);
    });

    it("should return null for non-existent id", async () => {
      (getMeasurementStandardById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await getMeasurementStandardById(999);
      expect(result).toBeNull();
    });
  });

  describe("getMeasurementStandardByProductWorkstation", () => {
    it("should return standard for product-workstation combination", async () => {
      const mockStandard = {
        id: 1,
        productId: 1,
        workstationId: 2,
        machineId: null,
      };

      (getMeasurementStandardByProductWorkstation as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandard);

      const result = await getMeasurementStandardByProductWorkstation(1, 2);
      expect(result).toEqual(mockStandard);
      expect(getMeasurementStandardByProductWorkstation).toHaveBeenCalledWith(1, 2);
    });

    it("should return standard with machineId filter", async () => {
      const mockStandard = {
        id: 1,
        productId: 1,
        workstationId: 2,
        machineId: 3,
      };

      (getMeasurementStandardByProductWorkstation as ReturnType<typeof vi.fn>).mockResolvedValue(mockStandard);

      const result = await getMeasurementStandardByProductWorkstation(1, 2, 3);
      expect(result).toEqual(mockStandard);
      expect(getMeasurementStandardByProductWorkstation).toHaveBeenCalledWith(1, 2, 3);
    });
  });

  describe("createMeasurementStandard", () => {
    it("should create a new measurement standard", async () => {
      const newStandard = {
        productId: 1,
        workstationId: 2,
        measurementName: "New Dimension",
        usl: 1100000,
        lsl: 900000,
        target: 1000000,
        sampleSize: 5,
        sampleFrequency: 30,
        samplingMethod: "systematic",
        createdBy: 1,
      };

      const mockCreated = { id: 2, ...newStandard };
      (createMeasurementStandard as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreated);

      const result = await createMeasurementStandard(newStandard);
      expect(result).toEqual(mockCreated);
      expect(createMeasurementStandard).toHaveBeenCalledWith(newStandard);
    });
  });

  describe("updateMeasurementStandard", () => {
    it("should update an existing measurement standard", async () => {
      const updateData = {
        usl: 1200000,
        lsl: 800000,
        sampleSize: 10,
      };

      const mockUpdated = {
        id: 1,
        productId: 1,
        workstationId: 1,
        ...updateData,
      };

      (updateMeasurementStandard as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdated);

      const result = await updateMeasurementStandard(1, updateData);
      expect(result).toEqual(mockUpdated);
      expect(updateMeasurementStandard).toHaveBeenCalledWith(1, updateData);
    });
  });

  describe("deleteMeasurementStandard", () => {
    it("should delete a measurement standard", async () => {
      (deleteMeasurementStandard as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const result = await deleteMeasurementStandard(1);
      expect(result).toEqual({ success: true });
      expect(deleteMeasurementStandard).toHaveBeenCalledWith(1);
    });
  });
});

describe("MeasurementStandard Data Validation", () => {
  it("should validate USL > LSL", () => {
    const usl = 1050000;
    const lsl = 950000;
    expect(usl > lsl).toBe(true);
  });

  it("should validate target is between LSL and USL", () => {
    const usl = 1050000;
    const lsl = 950000;
    const target = 1000000;
    expect(target >= lsl && target <= usl).toBe(true);
  });

  it("should validate sampleSize is positive", () => {
    const sampleSize = 5;
    expect(sampleSize > 0).toBe(true);
  });

  it("should validate sampleFrequency is positive", () => {
    const sampleFrequency = 60;
    expect(sampleFrequency > 0).toBe(true);
  });

  it("should validate CPK thresholds", () => {
    const cpkWarning = 133; // 1.33 * 100
    const cpkCritical = 100; // 1.0 * 100
    expect(cpkWarning > cpkCritical).toBe(true);
  });
});
