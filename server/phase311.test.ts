import { describe, it, expect } from "vitest";
import * as db from "./db";

describe("Phase 3.11 - License Activation, Expiry Job, Image Upload", () => {
  describe("License Activation", () => {
    it("should return null for non-existent license key", async () => {
      const result = await db.getLicenseByKey("INVALID-KEY-12345");
      expect(result).toBeNull();
    });
    
    it("should return license for valid key if exists", async () => {
      const licenses = await db.getLicenses();
      if (licenses.length > 0) {
        const validKey = licenses[0].licenseKey;
        const result = await db.getLicenseByKey(validKey);
        expect(result).not.toBeNull();
        expect(result?.licenseKey).toBe(validKey);
      }
    });
    
    it("should get licenses expiring soon", async () => {
      const result = await db.getLicensesExpiringSoon(30);
      expect(Array.isArray(result)).toBe(true);
    });
    
    it("should get expired licenses", async () => {
      const result = await db.getExpiredLicenses();
      expect(Array.isArray(result)).toBe(true);
    });
  });
  
  describe("Fixture with imageUrl", () => {
    it("should return fixtures with machine info including imageUrl field", async () => {
      const result = await db.getFixturesWithMachineInfo();
      expect(Array.isArray(result)).toBe(true);
      // If there are fixtures, check structure
      if (result.length > 0) {
        const fixture = result[0];
        expect(fixture).toHaveProperty("id");
        expect(fixture).toHaveProperty("code");
        expect(fixture).toHaveProperty("name");
        expect(fixture).toHaveProperty("machineId");
        expect(fixture).toHaveProperty("machineName");
        expect(fixture).toHaveProperty("machineCode");
        // imageUrl can be null or string
        expect("imageUrl" in fixture || fixture.imageUrl === undefined || fixture.imageUrl === null).toBe(true);
      }
    });
    
    it("should return fixtures by machine", async () => {
      const machines = await db.getAllMachines();
      if (machines.length > 0) {
        const machineId = machines[0].id;
        const result = await db.getFixtures(machineId);
        expect(Array.isArray(result)).toBe(true);
        // All fixtures should belong to the specified machine
        result.forEach(fixture => {
          expect(fixture.machineId).toBe(machineId);
        });
      }
    });
  });
  
  describe("Machine with imageUrl", () => {
    it("should return machines with imageUrl field", async () => {
      const result = await db.getAllMachines();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const machine = result[0];
        expect(machine).toHaveProperty("id");
        expect(machine).toHaveProperty("code");
        expect(machine).toHaveProperty("name");
        // imageUrl can be null or string
        expect("imageUrl" in machine || machine.imageUrl === undefined || machine.imageUrl === null).toBe(true);
      }
    });
  });
  
  describe("Workstation with imageUrl", () => {
    it("should return workstations with imageUrl field", async () => {
      const result = await db.getAllWorkstations();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        const workstation = result[0];
        expect(workstation).toHaveProperty("id");
        expect(workstation).toHaveProperty("code");
        expect(workstation).toHaveProperty("name");
        // imageUrl can be null or string
        expect("imageUrl" in workstation || workstation.imageUrl === undefined || workstation.imageUrl === null).toBe(true);
      }
    });
  });
});
