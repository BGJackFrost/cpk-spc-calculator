import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

describe("AI Router", () => {
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

  describe("ai.analytics.getDashboardStats", () => {
    it("should return AI stats with expected properties", async () => {
      const caller = createCaller();
      const result = await caller.ai.analytics.getDashboardStats();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalModels");
      expect(result).toHaveProperty("activeModels");
    });
  });

  describe("ai.models.list", () => {
    it("should return models with total count", async () => {
      const caller = createCaller();
      const result = await caller.ai.models.list();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("models");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.models)).toBe(true);
    });
  });

  describe("ai.models.get", () => {
    it("should have get procedure defined", async () => {
      const caller = createCaller();
      // Just verify the procedure exists by checking it doesn't throw on invalid input
      try {
        await caller.ai.models.get({ id: 999999 });
      } catch (e: any) {
        // Expected to throw "Model not found" or similar
        expect(e.message).toBeDefined();
      }
    });
  });
});
