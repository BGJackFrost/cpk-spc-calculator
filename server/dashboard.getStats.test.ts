import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

describe("dashboard.getStats", () => {
  it("should return stats without authentication", async () => {
    // Create a mock context without user (public access)
    const ctx = await createContext({
      req: { headers: {} } as any,
      res: {} as any,
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.getStats();

    // Should return stats object with expected fields
    expect(result).toHaveProperty("totalProductionLines");
    expect(result).toHaveProperty("totalProducts");
    expect(result).toHaveProperty("totalAnalyses");
    
    // Values should be numbers
    expect(typeof result.totalProductionLines).toBe("number");
    expect(typeof result.totalProducts).toBe("number");
    expect(typeof result.totalAnalyses).toBe("number");
    
    // Values should be non-negative
    expect(result.totalProductionLines).toBeGreaterThanOrEqual(0);
    expect(result.totalProducts).toBeGreaterThanOrEqual(0);
    expect(result.totalAnalyses).toBeGreaterThanOrEqual(0);
  });
});
