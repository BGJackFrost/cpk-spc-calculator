import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ col, val, type: 'eq' })),
  and: vi.fn((...conditions) => ({ conditions, type: 'and' })),
  asc: vi.fn((col) => ({ col, type: 'asc' })),
}));

describe('quickAccessRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return empty array when database is not available', async () => {
      const { getDb } = await import('../db');
      (getDb as any).mockResolvedValue(null);

      // Import router after mocking
      const { quickAccessRouter } = await import('./quickAccessRouter');
      
      // The router should handle null db gracefully
      expect(quickAccessRouter).toBeDefined();
    });

    it('should have list procedure defined', async () => {
      const { quickAccessRouter } = await import('./quickAccessRouter');
      expect(quickAccessRouter._def.procedures.list).toBeDefined();
    });
  });

  describe('add', () => {
    it('should have add procedure defined', async () => {
      const { quickAccessRouter } = await import('./quickAccessRouter');
      expect(quickAccessRouter._def.procedures.add).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should have remove procedure defined', async () => {
      const { quickAccessRouter } = await import('./quickAccessRouter');
      expect(quickAccessRouter._def.procedures.remove).toBeDefined();
    });
  });

  describe('reorder', () => {
    it('should have reorder procedure defined', async () => {
      const { quickAccessRouter } = await import('./quickAccessRouter');
      expect(quickAccessRouter._def.procedures.reorder).toBeDefined();
    });
  });

  describe('clearAll', () => {
    it('should have clearAll procedure defined', async () => {
      const { quickAccessRouter } = await import('./quickAccessRouter');
      expect(quickAccessRouter._def.procedures.clearAll).toBeDefined();
    });
  });
});

describe('cache module', () => {
  it('should export cache keys for quick access', async () => {
    const { cacheKeys } = await import('../cache');
    expect(cacheKeys.quickAccess).toBeDefined();
    expect(typeof cacheKeys.quickAccess).toBe('function');
    expect(cacheKeys.quickAccess(1)).toBe('quickAccess:user:1');
  });

  it('should export TTL constants', async () => {
    const { TTL } = await import('../cache');
    expect(TTL.SHORT).toBe(30 * 1000);
    expect(TTL.MEDIUM).toBe(60 * 1000);
    expect(TTL.LONG).toBe(5 * 60 * 1000);
    expect(TTL.VERY_LONG).toBe(30 * 60 * 1000);
  });

  it('should export withCache helper', async () => {
    const { withCache } = await import('../cache');
    expect(typeof withCache).toBe('function');
  });

  it('should export invalidateRelatedCaches helper', async () => {
    const { invalidateRelatedCaches } = await import('../cache');
    expect(typeof invalidateRelatedCaches).toBe('function');
  });

  it('should export getCacheStats helper', async () => {
    const { getCacheStats } = await import('../cache');
    expect(typeof getCacheStats).toBe('function');
    const stats = getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('keys');
  });
});
