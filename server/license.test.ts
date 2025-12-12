import { describe, it, expect, vi } from "vitest";
import * as db from "./db";

describe("License API", () => {
  describe("getLicenseByKey", () => {
    it("should return null for non-existent license key", async () => {
      const result = await db.getLicenseByKey("INVALID-KEY-12345");
      expect(result).toBeNull();
    });
    
    it("should return license for valid key", async () => {
      // First get all licenses to find a valid key
      const licenses = await db.getLicenses();
      if (licenses.length > 0) {
        const validKey = licenses[0].licenseKey;
        const result = await db.getLicenseByKey(validKey);
        expect(result).not.toBeNull();
        expect(result?.licenseKey).toBe(validKey);
      }
    });
  });
  
  describe("getActiveLicense", () => {
    it("should return active license or null", async () => {
      const result = await db.getActiveLicense();
      // Either null or a license with isActive = 1
      if (result) {
        expect(result.isActive).toBe(1);
      }
    });
  });
  
  describe("getLicenses", () => {
    it("should return array of licenses", async () => {
      const result = await db.getLicenses();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
