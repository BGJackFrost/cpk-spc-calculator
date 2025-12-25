import { describe, it, expect, vi, beforeEach } from "vitest";
import { VIDEO_CATEGORIES, VIDEO_LEVELS } from "./videoTutorialRouter";
import { appRouter } from "../routers";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }),
}));

describe("videoTutorialRouter", () => {
  const createCaller = (user: any = null) => {
    return appRouter.createCaller({ user });
  };

  describe("getCategories", () => {
    it("should return all video categories", async () => {
      const caller = createCaller();
      const categories = await caller.videoTutorial.getCategories();
      
      expect(categories).toEqual(VIDEO_CATEGORIES);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty("value");
      expect(categories[0]).toHaveProperty("label");
    });
  });

  describe("getLevels", () => {
    it("should return all video levels", async () => {
      const caller = createCaller();
      const levels = await caller.videoTutorial.getLevels();
      
      expect(levels).toEqual(VIDEO_LEVELS);
      expect(levels.length).toBe(3);
      expect(levels.map(l => l.value)).toContain("beginner");
      expect(levels.map(l => l.value)).toContain("intermediate");
      expect(levels.map(l => l.value)).toContain("advanced");
    });
  });

  describe("list", () => {
    it("should return empty array when no videos exist", async () => {
      const caller = createCaller();
      const videos = await caller.videoTutorial.list({ activeOnly: true });
      
      expect(Array.isArray(videos)).toBe(true);
    });

    it("should accept optional filters", async () => {
      const caller = createCaller();
      
      // Test with category filter
      const videosWithCategory = await caller.videoTutorial.list({ 
        category: "getting_started",
        activeOnly: true 
      });
      expect(Array.isArray(videosWithCategory)).toBe(true);

      // Test with level filter
      const videosWithLevel = await caller.videoTutorial.list({ 
        level: "beginner",
        activeOnly: true 
      });
      expect(Array.isArray(videosWithLevel)).toBe(true);

      // Test with search filter
      const videosWithSearch = await caller.videoTutorial.list({ 
        search: "test",
        activeOnly: true 
      });
      expect(Array.isArray(videosWithSearch)).toBe(true);
    });
  });

  describe("create", () => {
    it("should reject non-admin users", async () => {
      const caller = createCaller({ id: 1, role: "user", openId: "test", name: "Test User" });
      
      await expect(caller.videoTutorial.create({
        title: "Test Video",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        category: "getting_started",
        level: "beginner",
      })).rejects.toThrow("Chỉ admin mới có quyền thêm video");
    });

    it("should reject invalid YouTube URLs", async () => {
      const caller = createCaller({ id: 1, role: "admin", openId: "admin", name: "Admin" });
      
      await expect(caller.videoTutorial.create({
        title: "Test Video",
        youtubeUrl: "https://invalid-url.com/video",
        category: "getting_started",
        level: "beginner",
      })).rejects.toThrow("URL YouTube không hợp lệ");
    });
  });

  describe("update", () => {
    it("should reject non-admin users", async () => {
      const caller = createCaller({ id: 1, role: "user", openId: "test", name: "Test User" });
      
      await expect(caller.videoTutorial.update({
        id: 1,
        title: "Updated Title",
      })).rejects.toThrow("Chỉ admin mới có quyền sửa video");
    });
  });

  describe("delete", () => {
    it("should reject non-admin users", async () => {
      const caller = createCaller({ id: 1, role: "user", openId: "test", name: "Test User" });
      
      await expect(caller.videoTutorial.delete({ id: 1 })).rejects.toThrow("Chỉ admin mới có quyền xóa video");
    });
  });

  describe("incrementViewCount", () => {
    it("should return success", async () => {
      const caller = createCaller();
      const result = await caller.videoTutorial.incrementViewCount({ id: 1 });
      
      expect(result).toHaveProperty("success");
    });
  });
});
