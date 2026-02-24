/**
 * Unit tests for AOI/AVI Router
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
  }),
}));

// Mock storage
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://example.com/image.jpg", key: "test-key" }),
}));

describe("AOI/AVI Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Router Export", () => {
    it("should export aoiAviRouter", async () => {
      const module = await import("./aoiAviRouter");
      expect(module.aoiAviRouter).toBeDefined();
    });

    it("should have _def property", async () => {
      const { aoiAviRouter } = await import("./aoiAviRouter");
      expect(aoiAviRouter._def).toBeDefined();
    });

    it("should have procedures property", async () => {
      const { aoiAviRouter } = await import("./aoiAviRouter");
      expect(aoiAviRouter._def.procedures).toBeDefined();
    });

    it("should have uploadImage procedure", async () => {
      const { aoiAviRouter } = await import("./aoiAviRouter");
      const procedures = aoiAviRouter._def.procedures;
      expect(procedures.uploadImage).toBeDefined();
    });

    it("should have multiple procedures defined", async () => {
      const { aoiAviRouter } = await import("./aoiAviRouter");
      const procedures = aoiAviRouter._def.procedures;
      const procedureKeys = Object.keys(procedures);
      expect(procedureKeys.length).toBeGreaterThan(0);
      console.log("Available procedures:", procedureKeys);
    });
  });
});
