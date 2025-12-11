import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("product router", () => {
  it("allows admin to access product list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    // Should not throw - admin has access
    const result = await caller.product.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows regular user to access product list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    
    // Protected procedure allows any authenticated user to read
    const result = await caller.product.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("productSpec router", () => {
  it("allows admin to access specification list", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.productSpec.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("allows regular user to access specification list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.productSpec.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("user router", () => {
  it("allows admin to list users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    
    const result = await caller.user.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("denies regular user from listing users", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.user.list()).rejects.toThrow();
  });
});
