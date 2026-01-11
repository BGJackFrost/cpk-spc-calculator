import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDb
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";
import { factoryWorkshopRouter } from "./factoryWorkshopRouter";

const mockedGetDb = vi.mocked(getDb);

describe("factoryWorkshopRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listFactories", () => {
    it("should return empty data when db is not available", async () => {
      mockedGetDb.mockResolvedValue(null);

      const caller = factoryWorkshopRouter.createCaller({
        user: { id: 1, name: "Test User", role: "admin" },
      } as any);

      const result = await caller.listFactories({});

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    });

    it("should return factories with pagination", async () => {
      const mockFactories = [
        { id: 1, code: "FAC-01", name: "Factory 1", status: "active" },
        { id: 2, code: "FAC-02", name: "Factory 2", status: "active" },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue(mockFactories),
      };

      // Mock for count query
      const mockCountDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 2 }]),
      };

      mockedGetDb.mockResolvedValue({
        select: vi.fn().mockImplementation(() => {
          return {
            from: vi.fn().mockImplementation(() => {
              return {
                where: vi.fn().mockImplementation(() => {
                  return {
                    orderBy: vi.fn().mockImplementation(() => {
                      return {
                        limit: vi.fn().mockImplementation(() => {
                          return {
                            offset: vi.fn().mockResolvedValue(mockFactories),
                          };
                        }),
                      };
                    }),
                  };
                }),
              };
            }),
          };
        }),
      } as any);

      const caller = factoryWorkshopRouter.createCaller({
        user: { id: 1, name: "Test User", role: "admin" },
      } as any);

      const result = await caller.listFactories({ page: 1, pageSize: 20 });

      expect(result.data).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });
  });

  describe("listWorkshops", () => {
    it("should return empty data when db is not available", async () => {
      mockedGetDb.mockResolvedValue(null);

      const caller = factoryWorkshopRouter.createCaller({
        user: { id: 1, name: "Test User", role: "admin" },
      } as any);

      const result = await caller.listWorkshops({});

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    });
  });

  describe("getDropdownOptions", () => {
    it("should return empty arrays when db is not available", async () => {
      mockedGetDb.mockResolvedValue(null);

      const caller = factoryWorkshopRouter.createCaller({
        user: { id: 1, name: "Test User", role: "admin" },
      } as any);

      const result = await caller.getDropdownOptions();

      expect(result).toEqual({
        factories: [],
        workshops: [],
      });
    });
  });

  describe("getStatistics", () => {
    it("should return zero statistics when db is not available", async () => {
      mockedGetDb.mockResolvedValue(null);

      const caller = factoryWorkshopRouter.createCaller({
        user: { id: 1, name: "Test User", role: "admin" },
      } as any);

      const result = await caller.getStatistics();

      expect(result).toEqual({
        factories: { total: 0, active: 0 },
        workshops: { total: 0, active: 0 },
        productionLines: { total: 0, active: 0, assigned: 0 },
      });
    });
  });

  describe("getHierarchy", () => {
    it("should return empty array when db is not available", async () => {
      mockedGetDb.mockResolvedValue(null);

      const caller = factoryWorkshopRouter.createCaller({
        user: { id: 1, name: "Test User", role: "admin" },
      } as any);

      const result = await caller.getHierarchy({});

      expect(result).toEqual([]);
    });
  });
});
