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

  describe("ai.getStats", () => {
    it("should return AI stats with expected properties", async () => {
      const caller = createCaller();
      const result = await caller.ai.getStats();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalModels");
      expect(result).toHaveProperty("activeModels");
    });
  });

  describe("ai.listModels", () => {
    it("should return an array of models", async () => {
      const caller = createCaller();
      const result = await caller.ai.listModels();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("ai.createModel", () => {
    it("should create a model and return result", async () => {
      const caller = createCaller();
      const result = await caller.ai.createModel({
        name: "Test Model " + Date.now(),
        type: "anomaly_detection",
      });
      
      expect(result).toBeDefined();
      // MySQL returns insertId in ResultSetHeader
      expect(result).toHaveProperty("insertId");
    });
  });
});
