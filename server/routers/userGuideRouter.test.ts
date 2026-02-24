import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';

// Mock storage
vi.mock('../storage', () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: 'https://storage.example.com/exports/user-guide/test.html',
    key: 'exports/user-guide/test.html'
  })
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {} as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {} as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
  };
}

describe('userGuideRouter', () => {
  describe('getContent', () => {
    it('should return user guide content', async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userGuide.getContent();

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should contain key sections in content', async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userGuide.getContent();

      // Check for main sections
      expect(result.content).toContain('Tổng Quan Hệ Thống IoT');
      expect(result.content).toContain('Kiến Trúc Hệ Thống');
      expect(result.content).toContain('Giao Thức Kết Nối');
      expect(result.content).toContain('MQTT');
      expect(result.content).toContain('OPC-UA');
      expect(result.content).toContain('Modbus');
      expect(result.content).toContain('Quản Lý Thiết Bị');
      expect(result.content).toContain('Giám Sát Realtime');
      expect(result.content).toContain('Hệ Thống Cảnh Báo');
      expect(result.content).toContain('Quản Lý Bảo Trì');
      expect(result.content).toContain('MTTR/MTBF');
    });

    it('should return valid ISO date string for lastUpdated', async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userGuide.getContent();

      expect(result.lastUpdated).toBeDefined();
      // Check if it's a valid ISO date string
      const date = new Date(result.lastUpdated);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('exportPdf', () => {
    it('should export user guide to HTML for PDF conversion when authenticated', async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.userGuide.exportPdf();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.fileName).toBeDefined();
      expect(result.fileName).toContain('iot-user-guide');
      expect(result.fileName).toContain('.html');
      expect(result.message).toBeDefined();
    });

    it('should require authentication for export', async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // This should throw because exportPdf is a protectedProcedure
      await expect(caller.userGuide.exportPdf()).rejects.toThrow();
    });
  });
});
