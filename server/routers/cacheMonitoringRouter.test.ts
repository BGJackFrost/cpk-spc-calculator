/**
 * Unit tests for Cache Monitoring Router
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { cache, getCacheStats, cleanupCache, resetCacheMetrics } from "../cache";

describe("Cache Monitoring", () => {
  beforeEach(() => {
    // Clear cache before each test
    cache.clear();
    resetCacheMetrics();
  });

  describe("Cache Basic Operations", () => {
    it("should set and get cache values", () => {
      cache.set("test:key1", { data: "value1" }, 60000);
      const result = cache.get("test:key1");
      expect(result).toEqual({ data: "value1" });
    });

    it("should return null for non-existent keys", () => {
      const result = cache.get("non:existent:key");
      expect(result).toBeNull();
    });

    it("should delete cache entries", () => {
      cache.set("test:key2", "value2", 60000);
      expect(cache.get("test:key2")).toBe("value2");
      
      cache.delete("test:key2");
      expect(cache.get("test:key2")).toBeNull();
    });

    it("should clear all cache", () => {
      cache.set("test:key1", "value1", 60000);
      cache.set("test:key2", "value2", 60000);
      
      cache.clear();
      
      expect(cache.get("test:key1")).toBeNull();
      expect(cache.get("test:key2")).toBeNull();
    });
  });

  describe("Cache Metrics", () => {
    it("should track cache hits", () => {
      cache.set("test:key", "value", 60000);
      
      // Access the cache multiple times
      cache.get("test:key");
      cache.get("test:key");
      cache.get("test:key");
      
      const stats = getCacheStats();
      expect(stats.metrics.hits).toBe(3);
    });

    it("should track cache misses", () => {
      // Try to get non-existent keys
      cache.get("missing:key1");
      cache.get("missing:key2");
      
      const stats = getCacheStats();
      expect(stats.metrics.misses).toBe(2);
    });

    it("should calculate hit rate correctly", () => {
      cache.set("test:key", "value", 60000);
      
      // 3 hits
      cache.get("test:key");
      cache.get("test:key");
      cache.get("test:key");
      
      // 1 miss
      cache.get("missing:key");
      
      const stats = getCacheStats();
      // 3 hits / 4 total = 75%
      expect(stats.hitRate).toBe(75);
    });

    it("should reset metrics", () => {
      cache.set("test:key", "value", 60000);
      cache.get("test:key");
      cache.get("missing:key");
      
      resetCacheMetrics();
      
      const stats = getCacheStats();
      expect(stats.metrics.hits).toBe(0);
      expect(stats.metrics.misses).toBe(0);
    });
  });

  describe("Cache Stats", () => {
    it("should return correct cache size", () => {
      cache.set("test:key1", "value1", 60000);
      cache.set("test:key2", "value2", 60000);
      cache.set("test:key3", "value3", 60000);
      
      const stats = getCacheStats();
      expect(stats.size).toBe(3);
    });

    it("should return all cache keys", () => {
      cache.set("products:1", "product1", 60000);
      cache.set("products:2", "product2", 60000);
      cache.set("spcPlans:1", "plan1", 60000);
      
      const stats = getCacheStats();
      expect(stats.keys).toContain("products:1");
      expect(stats.keys).toContain("products:2");
      expect(stats.keys).toContain("spcPlans:1");
      expect(stats.keys.length).toBe(3);
    });

    it("should return max size", () => {
      const stats = getCacheStats();
      expect(stats.maxSize).toBeGreaterThan(0);
    });
  });

  describe("Cache Pattern Delete", () => {
    it("should delete entries matching pattern", () => {
      cache.set("products:1", "value1", 60000);
      cache.set("products:2", "value2", 60000);
      cache.set("spcPlans:1", "value3", 60000);
      
      cache.deletePattern("^products:");
      
      expect(cache.get("products:1")).toBeNull();
      expect(cache.get("products:2")).toBeNull();
      expect(cache.get("spcPlans:1")).toBe("value3");
    });
  });

  describe("Cache Cleanup", () => {
    it("should cleanup expired entries", async () => {
      // Set entry with very short TTL
      cache.set("test:expired", "value", 1); // 1ms TTL
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const cleaned = cleanupCache();
      expect(cleaned).toBeGreaterThanOrEqual(1);
      expect(cache.get("test:expired")).toBeNull();
    });
  });

  describe("Cache TTL", () => {
    it("should expire entries after TTL", async () => {
      cache.set("test:short-ttl", "value", 50); // 50ms TTL
      
      // Should exist immediately
      expect(cache.get("test:short-ttl")).toBe("value");
      
      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired now
      expect(cache.get("test:short-ttl")).toBeNull();
    });
  });

  describe("Cache Categories", () => {
    it("should categorize keys correctly", () => {
      cache.set("products:all", [], 60000);
      cache.set("products:1", {}, 60000);
      cache.set("spcPlans:all", [], 60000);
      cache.set("ai:predictions:1", {}, 60000);
      
      const stats = getCacheStats();
      const categories: Record<string, number> = {};
      
      stats.keys.forEach((key: string) => {
        const category = key.split(':')[0];
        categories[category] = (categories[category] || 0) + 1;
      });
      
      expect(categories["products"]).toBe(2);
      expect(categories["spcPlans"]).toBe(1);
      expect(categories["ai"]).toBe(1);
    });
  });
});
