/**
 * Tests for Firmware OTA Service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{ insertId: 1 }])),
    })),
    select: vi.fn(() => {
      const mockResult = [{
        id: 1,
        name: "Test Firmware",
        version: "1.0.0",
        deviceType: "plc",
        status: "draft",
      }];
      // Mock result for leftJoin queries (deployment + firmware name/version)
      const deploymentResult = [{
        deployment: { id: 1, name: "Test Deployment", firmwarePackageId: 1, status: "pending" },
        firmwareName: "Test Firmware",
        firmwareVersion: "1.0.0",
      }];
      const makeChainable = (result: any) => {
        const chain: any = {};
        chain.where = vi.fn(() => makeChainable(result));
        chain.orderBy = vi.fn(() => makeChainable(result));
        chain.limit = vi.fn(() => Promise.resolve(result));
        chain.leftJoin = vi.fn(() => makeChainable(deploymentResult));
        // Make it thenable so await works on the chain directly
        chain.then = (resolve: any) => Promise.resolve(result).then(resolve);
        return chain;
      };
      return {
        from: vi.fn(() => makeChainable(mockResult)),
      };
    }),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}));

// Mock storage
vi.mock("../storage", () => ({
  storagePut: vi.fn(() => Promise.resolve({ url: "https://storage.example.com/test.bin", key: "test.bin" })),
}));

import {
  createFirmwarePackage,
  getFirmwarePackages,
  getFirmwarePackageById,
  updateFirmwarePackage,
  deleteFirmwarePackage,
  publishFirmwarePackage,
  createOtaDeployment,
  getOtaDeployments,
  uploadFirmwareFile,
} from "./firmwareOtaService";

describe("Firmware OTA Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createFirmwarePackage", () => {
    it("should create a new firmware package", async () => {
      const packageData = {
        name: "Test Firmware",
        version: "1.0.0",
        deviceType: "plc" as const,
        fileUrl: "https://example.com/firmware.bin",
        fileSize: 1024,
        checksum: "abc123",
        createdBy: 1,
      };

      const id = await createFirmwarePackage(packageData);
      expect(id).toBe(1);
    });
  });

  describe("getFirmwarePackages", () => {
    it("should return list of firmware packages", async () => {
      const packages = await getFirmwarePackages();
      expect(packages).toBeDefined();
      expect(Array.isArray(packages)).toBe(true);
    });

    it("should filter by device type", async () => {
      const packages = await getFirmwarePackages({ deviceType: "plc" });
      expect(packages).toBeDefined();
    });
  });

  describe("getFirmwarePackageById", () => {
    it("should return firmware package by id", async () => {
      const pkg = await getFirmwarePackageById(1);
      expect(pkg).toBeDefined();
      expect(pkg?.id).toBe(1);
    });
  });

  describe("updateFirmwarePackage", () => {
    it("should update firmware package", async () => {
      await expect(
        updateFirmwarePackage(1, { name: "Updated Firmware" })
      ).resolves.not.toThrow();
    });
  });

  describe("deleteFirmwarePackage", () => {
    it("should delete firmware package", async () => {
      await expect(deleteFirmwarePackage(1)).resolves.not.toThrow();
    });
  });

  describe("publishFirmwarePackage", () => {
    it("should publish firmware package", async () => {
      await expect(publishFirmwarePackage(1, 1)).resolves.not.toThrow();
    });
  });

  describe("createOtaDeployment", () => {
    it("should create a new OTA deployment", async () => {
      const deploymentData = {
        name: "Test Deployment",
        firmwarePackageId: 1,
        targetDeviceIds: [1, 2, 3],
        createdBy: 1,
      };

      const id = await createOtaDeployment(deploymentData);
      expect(id).toBe(1);
    });
  });

  describe("getOtaDeployments", () => {
    it("should return list of deployments", async () => {
      const deployments = await getOtaDeployments();
      expect(deployments).toBeDefined();
      expect(Array.isArray(deployments)).toBe(true);
    });
  });

  describe("uploadFirmwareFile", () => {
    it("should upload firmware file to storage", async () => {
      const buffer = Buffer.from("test firmware content");
      const result = await uploadFirmwareFile(buffer, "test.bin", "application/octet-stream");
      
      expect(result).toBeDefined();
      expect(result.url).toContain("storage.example.com");
      expect(result.checksum).toBeDefined();
    });
  });
});
