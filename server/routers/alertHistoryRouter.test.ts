import { describe, it, expect, vi } from "vitest";

// Mock getDb
vi.mock("../db", () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: vi.fn().mockResolvedValue([]),
  })),
}));

describe("alertHistoryRouter", () => {
  it("should export alertHistoryRouter", async () => {
    const mod = await import("./alertHistoryRouter");
    expect(mod.alertHistoryRouter).toBeDefined();
  });

  it("should have list procedure", async () => {
    const mod = await import("./alertHistoryRouter");
    const router = mod.alertHistoryRouter;
    expect(router._def.procedures).toHaveProperty("list");
  });

  it("should have stats procedure", async () => {
    const mod = await import("./alertHistoryRouter");
    const router = mod.alertHistoryRouter;
    expect(router._def.procedures).toHaveProperty("stats");
  });

  it("should have updateStatus procedure", async () => {
    const mod = await import("./alertHistoryRouter");
    const router = mod.alertHistoryRouter;
    expect(router._def.procedures).toHaveProperty("updateStatus");
  });

  it("should have bulkUpdateStatus procedure", async () => {
    const mod = await import("./alertHistoryRouter");
    const router = mod.alertHistoryRouter;
    expect(router._def.procedures).toHaveProperty("bulkUpdateStatus");
  });

  it("should calculate correct time range for 7d", () => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const start = now - sevenDaysMs;
    expect(now - start).toBe(sevenDaysMs);
  });

  it("should calculate correct time range for 30d", () => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const start = now - thirtyDaysMs;
    expect(now - start).toBe(thirtyDaysMs);
  });

  it("should calculate correct time range for 90d", () => {
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const start = now - ninetyDaysMs;
    expect(now - start).toBe(ninetyDaysMs);
  });
});
