import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

describe("ERP Integration Router", () => {
  const mockUser = { id: 1, openId: "test-user", name: "Test User", role: "admin" as const };
  
  const createCaller = () => {
    return appRouter.createCaller({
      user: mockUser,
      req: {} as any,
      res: {} as any,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("erpIntegration.getStats", () => {
    it("should return ERP integration stats with expected properties", async () => {
      const caller = createCaller();
      const result = await caller.erpIntegration.getStats();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalIntegrations");
      expect(result).toHaveProperty("activeIntegrations");
    });
  });

  describe("erpIntegration.listIntegrations", () => {
    it("should return an array of integrations", async () => {
      const caller = createCaller();
      const result = await caller.erpIntegration.listIntegrations();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("erpIntegration.createIntegration", () => {
    it("should create an integration and return result", async () => {
      const caller = createCaller();
      const result = await caller.erpIntegration.createIntegration({
        name: "Test ERP",
        type: "sap",
        connectionString: "https://test.example.com",
      });
      
      expect(result).toBeDefined();
      // Result may have id or success property depending on implementation
      expect(result).toHaveProperty("id");
    });
  });
});
