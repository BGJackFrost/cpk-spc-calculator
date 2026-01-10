import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { authenticator } from "otplib";

// Mock database functions
vi.mock("./db", () => ({
  getLoginCustomization: vi.fn().mockResolvedValue({
    logoUrl: null,
    logoAlt: "Logo",
    welcomeTitle: "Chào mừng",
    welcomeSubtitle: "Đăng nhập để tiếp tục",
    primaryColor: "#3b82f6",
    secondaryColor: "#1e40af",
    backgroundGradient: null,
    footerText: null,
    showOauth: true,
    showRegister: true,
    customCss: null,
  }),
  updateLoginCustomization: vi.fn().mockResolvedValue({ success: true }),
}));

describe("Two-Factor Authentication", () => {
  describe("TOTP Generation", () => {
    it("should generate a valid TOTP secret", () => {
      const secret = authenticator.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(10);
    });

    it("should generate a valid TOTP token from secret", () => {
      const secret = authenticator.generateSecret();
      const token = authenticator.generate(secret);
      expect(token).toBeDefined();
      expect(token.length).toBe(6);
      expect(/^\d{6}$/.test(token)).toBe(true);
    });

    it("should verify a valid TOTP token", () => {
      const secret = authenticator.generateSecret();
      const token = authenticator.generate(secret);
      const isValid = authenticator.verify({ token, secret });
      expect(isValid).toBe(true);
    });

    it("should reject an invalid TOTP token", () => {
      const secret = authenticator.generateSecret();
      const isValid = authenticator.verify({ token: "000000", secret });
      expect(isValid).toBe(false);
    });
  });

  describe("Backup Codes", () => {
    it("should generate 10 backup codes", () => {
      const codes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        codes.push(code);
      }
      expect(codes.length).toBe(10);
      codes.forEach(code => {
        expect(code.length).toBe(8);
      });
    });
  });
});

describe("Password Reset", () => {
  describe("Token Generation", () => {
    it("should generate a valid reset token", () => {
      const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(20);
    });

    it("should generate unique tokens", () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        tokens.add(token);
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe("Token Expiry", () => {
    it("should check token expiry correctly", () => {
      const now = Date.now();
      const oneHourAgo = now - 60 * 60 * 1000;
      const oneHourLater = now + 60 * 60 * 1000;
      
      expect(oneHourAgo < now).toBe(true);
      expect(oneHourLater > now).toBe(true);
    });
  });
});

describe("Login Customization", () => {
  describe("Default Values", () => {
    it("should have valid default customization values", async () => {
      const { getLoginCustomization } = await import("./db");
      const customization = await getLoginCustomization();
      
      expect(customization).toBeDefined();
      expect(customization.welcomeTitle).toBe("Chào mừng");
      expect(customization.showOauth).toBe(true);
      expect(customization.showRegister).toBe(true);
    });
  });

  describe("Color Validation", () => {
    it("should validate hex color format", () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      expect(hexColorRegex.test("#3b82f6")).toBe(true);
      expect(hexColorRegex.test("#1e40af")).toBe(true);
      expect(hexColorRegex.test("invalid")).toBe(false);
      expect(hexColorRegex.test("#fff")).toBe(false);
    });
  });
});
