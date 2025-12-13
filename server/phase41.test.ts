import { describe, it, expect } from "vitest";
import { encrypt, decrypt, isEncrypted, hashData, maskSensitiveData, encryptSensitiveFields, decryptSensitiveFields } from "./encryptionService";

describe("Phase 41 - Encryption Service", () => {
  describe("encrypt/decrypt", () => {
    it("should encrypt and decrypt a simple string", () => {
      const plaintext = "Hello, World!";
      const encrypted = encrypt(plaintext);
      
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted.length).toBeGreaterThan(0);
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should encrypt and decrypt a complex string", () => {
      const plaintext = "mysql://user:p@ssw0rd!@localhost:3306/database?ssl=true";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it("should handle empty strings", () => {
      expect(encrypt("")).toBe("");
      expect(decrypt("")).toBe("");
    });

    it("should produce different ciphertext for same plaintext", () => {
      const plaintext = "test";
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      
      // Due to random IV and salt, same plaintext should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it("should handle unicode characters", () => {
      const plaintext = "Xin chào 世界 🌍";
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });
  });

  describe("isEncrypted", () => {
    it("should return true for encrypted data", () => {
      const encrypted = encrypt("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return false for plain text", () => {
      expect(isEncrypted("plain text")).toBe(false);
      expect(isEncrypted("")).toBe(false);
      expect(isEncrypted("short")).toBe(false);
    });
  });

  describe("hashData", () => {
    it("should produce consistent hash for same input", () => {
      const data = "test data";
      const hash1 = hashData(data);
      const hash2 = hashData(data);
      
      expect(hash1).toBe(hash2);
    });

    it("should produce different hash for different input", () => {
      const hash1 = hashData("data1");
      const hash2 = hashData("data2");
      
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      expect(hashData("")).toBe("");
    });
  });

  describe("maskSensitiveData", () => {
    it("should mask middle of string", () => {
      const masked = maskSensitiveData("1234567890");
      expect(masked).toBe("1234**7890");
    });

    it("should handle short strings", () => {
      const masked = maskSensitiveData("abc");
      expect(masked).toBe("****");
    });

    it("should handle empty string", () => {
      expect(maskSensitiveData("")).toBe("");
    });

    it("should respect custom visible chars", () => {
      const masked = maskSensitiveData("1234567890", 2);
      expect(masked).toBe("12******90");
    });
  });

  describe("encryptSensitiveFields", () => {
    it("should encrypt specified fields", () => {
      const obj = {
        name: "Test",
        password: "secret123",
        apiKey: "key-abc-123",
      };
      
      const encrypted = encryptSensitiveFields(obj, ["password", "apiKey"]);
      
      expect(encrypted.name).toBe("Test");
      expect(encrypted.password).not.toBe("secret123");
      expect(encrypted.apiKey).not.toBe("key-abc-123");
      expect(isEncrypted(encrypted.password as string)).toBe(true);
      expect(isEncrypted(encrypted.apiKey as string)).toBe(true);
    });

    it("should not re-encrypt already encrypted fields", () => {
      const encrypted = encrypt("secret");
      const obj = { password: encrypted };
      
      const result = encryptSensitiveFields(obj, ["password"]);
      expect(result.password).toBe(encrypted);
    });
  });

  describe("decryptSensitiveFields", () => {
    it("should decrypt specified fields", () => {
      const obj = {
        name: "Test",
        password: encrypt("secret123"),
        apiKey: encrypt("key-abc-123"),
      };
      
      const decrypted = decryptSensitiveFields(obj, ["password", "apiKey"]);
      
      expect(decrypted.name).toBe("Test");
      expect(decrypted.password).toBe("secret123");
      expect(decrypted.apiKey).toBe("key-abc-123");
    });

    it("should not modify non-encrypted fields", () => {
      const obj = { password: "plain-text" };
      
      const result = decryptSensitiveFields(obj, ["password"]);
      expect(result.password).toBe("plain-text");
    });
  });
});

describe("Phase 41 - Database Explorer Service", () => {
  describe("Service exports", () => {
    it("should export required functions", async () => {
      const service = await import("./databaseExplorerService");
      
      expect(typeof service.getConnectionInfo).toBe("function");
      expect(typeof service.getTables).toBe("function");
      expect(typeof service.getTableData).toBe("function");
      expect(typeof service.getTableSchema).toBe("function");
      expect(typeof service.getDatabaseStats).toBe("function");
    });
  });
});
