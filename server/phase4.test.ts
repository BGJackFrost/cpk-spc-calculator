import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Helper to create authenticated context
function createAuthContext(role: "user" | "admin" = "admin"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("SPC Plan Router", () => {
  it("should list SPC plans", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.spcPlan.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("User Line Router", () => {
  it("should list user line assignments", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.userLine.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Email Notification Router", () => {
  it("should get email notification settings", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.emailNotification.get();
    // Result can be null if no settings exist yet
    expect(result === null || typeof result === "object").toBe(true);
  });
});

describe("Production Line Router", () => {
  it("should list production lines", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.productionLine.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Sampling Config Router", () => {
  it("should list sampling configs", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.sampling.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Dashboard Router", () => {
  it("should get dashboard config", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.dashboard.getConfig();
    // Result can be null if no config exists yet
    expect(result === null || typeof result === "object").toBe(true);
  });
});
