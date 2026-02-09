import { describe, it, expect, vi } from "vitest";

// ─── CSP Nonce Middleware Tests ─────────────────────────────────────────────

describe("CSP Nonce Middleware", () => {
  it("should generate a base64 nonce and attach to res.locals", async () => {
    const { cspNonceMiddleware } = await import("./_core/cspNonce");
    const req = {} as any;
    const res = { locals: {} } as any;
    const next = vi.fn();

    cspNonceMiddleware(req, res, next);

    expect(res.locals.cspNonce).toBeDefined();
    expect(typeof res.locals.cspNonce).toBe("string");
    expect(res.locals.cspNonce.length).toBe(24);
    expect(next).toHaveBeenCalledOnce();
  });

  it("should generate unique nonces for different requests", async () => {
    const { cspNonceMiddleware } = await import("./_core/cspNonce");
    const nonces = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const res = { locals: {} } as any;
      cspNonceMiddleware({} as any, res, vi.fn());
      nonces.add(res.locals.cspNonce);
    }

    expect(nonces.size).toBe(100);
  });

  it("should produce valid base64 strings", async () => {
    const { cspNonceMiddleware } = await import("./_core/cspNonce");
    const res = { locals: {} } as any;
    cspNonceMiddleware({} as any, res, vi.fn());

    const decoded = Buffer.from(res.locals.cspNonce, "base64");
    expect(decoded.length).toBe(16);
    expect(decoded.toString("base64")).toBe(res.locals.cspNonce);
  });
});

// ─── CSP Directives Tests ───────────────────────────────────────────────────

describe("CSP Directives", () => {
  it("should return dev directives with unsafe-inline and unsafe-eval", async () => {
    const { getCSPDirectives } = await import("./_core/cspNonce");
    const directives = getCSPDirectives(true);

    expect(directives.scriptSrc).toContain("'unsafe-inline'");
    expect(directives.scriptSrc).toContain("'unsafe-eval'");
    expect(directives.defaultSrc).toContain("'self'");
    expect(directives.objectSrc).toContain("'none'");
  });

  it("should return production directives with nonce function instead of unsafe-inline", async () => {
    const { getCSPDirectives } = await import("./_core/cspNonce");
    const directives = getCSPDirectives(false);

    expect(directives.scriptSrc).not.toContain("'unsafe-inline'");
    const nonceFn = directives.scriptSrc.find((s: any) => typeof s === "function");
    expect(nonceFn).toBeDefined();

    if (nonceFn) {
      const mockRes = { locals: { cspNonce: "testNonce123" } } as any;
      const result = nonceFn({} as any, mockRes);
      expect(result).toBe("'nonce-testNonce123'");
    }
  });

  it("should include worker-src and child-src directives", async () => {
    const { getCSPDirectives } = await import("./_core/cspNonce");
    const directives = getCSPDirectives(false);

    expect(directives.workerSrc).toContain("'self'");
    expect(directives.childSrc).toContain("'self'");
  });

  it("should allow WebSocket connections via wss:", async () => {
    const { getCSPDirectives } = await import("./_core/cspNonce");
    const directives = getCSPDirectives(false);

    expect(directives.connectSrc).toContain("wss:");
  });
});

// ─── Service Worker Configuration Tests ─────────────────────────────────────

describe("Service Worker Configuration", () => {
  it("sw.js should exist in client/public", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const swPath = path.resolve(import.meta.dirname, "../client/public/sw.js");
    expect(fs.existsSync(swPath)).toBe(true);
  });

  it("sw.js should contain CACHE_VERSION v4", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const swPath = path.resolve(import.meta.dirname, "../client/public/sw.js");
    const content = fs.readFileSync(swPath, "utf-8");
    expect(content).toContain("const CACHE_VERSION = 'v4'");
  });

  it("sw.js should define all cache names", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const swPath = path.resolve(import.meta.dirname, "../client/public/sw.js");
    const content = fs.readFileSync(swPath, "utf-8");

    expect(content).toContain("IMMUTABLE_CACHE");
    expect(content).toContain("STATIC_CACHE");
    expect(content).toContain("DYNAMIC_CACHE");
    expect(content).toContain("API_CACHE");
  });

  it("sw.js should have IndexedDB offline queue support", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const swPath = path.resolve(import.meta.dirname, "../client/public/sw.js");
    const content = fs.readFileSync(swPath, "utf-8");

    expect(content).toContain("cpk-spc-offline");
    expect(content).toContain("pending-mutations");
    expect(content).toContain("queueMutation");
    expect(content).toContain("replayMutations");
  });

  it("sw.js should handle SW_UPDATED message", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const swPath = path.resolve(import.meta.dirname, "../client/public/sw.js");
    const content = fs.readFileSync(swPath, "utf-8");

    expect(content).toContain("SW_UPDATED");
    expect(content).toContain("SKIP_WAITING");
    expect(content).toContain("CLEAR_CACHE");
    expect(content).toContain("GET_VERSION");
    expect(content).toContain("ONLINE");
    expect(content).toContain("PRECACHE_ASSETS");
  });

  it("sw.js should have proper cache strategies", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const swPath = path.resolve(import.meta.dirname, "../client/public/sw.js");
    const content = fs.readFileSync(swPath, "utf-8");

    expect(content).toContain("cacheFirstImmutable");
    expect(content).toContain("networkFirstApi");
    expect(content).toContain("networkFirstNavigation");
    expect(content).toContain("staleWhileRevalidate");
    expect(content).toContain("handleMutation");
  });
});

// ─── Preload Configuration Tests ────────────────────────────────────────────

describe("Preload Configuration", () => {
  it("vite.config.ts should have modulePreload enabled", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const configPath = path.resolve(import.meta.dirname, "../vite.config.ts");
    const content = fs.readFileSync(configPath, "utf-8");

    expect(content).toContain("modulePreload:");
    expect(content).toContain("polyfill: true");
    expect(content).not.toContain("modulePreload: false");
  });

  it("index.html should have preconnect hints for Google Fonts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const htmlPath = path.resolve(import.meta.dirname, "../client/index.html");
    const content = fs.readFileSync(htmlPath, "utf-8");

    expect(content).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
    expect(content).toContain('rel="preconnect" href="https://fonts.gstatic.com"');
    expect(content).toContain('rel="dns-prefetch" href="https://fonts.googleapis.com"');
    expect(content).toContain('rel="dns-prefetch" href="https://fonts.gstatic.com"');
  });

  it("vite.ts should inject nonce into script tags", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const vitePath = path.resolve(import.meta.dirname, "./_core/vite.ts");
    const content = fs.readFileSync(vitePath, "utf-8");

    expect(content).toContain("cspNonce");
    expect(content).toContain("nonce=");
  });

  it("vite.ts should inject preload tags into production HTML", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const vitePath = path.resolve(import.meta.dirname, "./_core/vite.ts");
    const content = fs.readFileSync(vitePath, "utf-8");

    expect(content).toContain('rel="preload"');
    expect(content).toContain("crossorigin");
  });
});

// ─── ServiceWorkerUpdater Component Tests ───────────────────────────────────

describe("ServiceWorkerUpdater Component", () => {
  it("component file should exist", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(import.meta.dirname, "../client/src/components/ServiceWorkerUpdater.tsx");
    expect(fs.existsSync(componentPath)).toBe(true);
  });

  it("should export ServiceWorkerUpdater and OfflineIndicator", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(import.meta.dirname, "../client/src/components/ServiceWorkerUpdater.tsx");
    const content = fs.readFileSync(componentPath, "utf-8");

    expect(content).toContain("export function ServiceWorkerUpdater");
    expect(content).toContain("export function OfflineIndicator");
  });

  it("ServiceWorkerUpdater should listen for SW_UPDATED messages", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(import.meta.dirname, "../client/src/components/ServiceWorkerUpdater.tsx");
    const content = fs.readFileSync(componentPath, "utf-8");

    expect(content).toContain("SW_UPDATED");
    expect(content).toContain("SKIP_WAITING");
  });

  it("OfflineIndicator should handle online/offline events", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const componentPath = path.resolve(import.meta.dirname, "../client/src/components/ServiceWorkerUpdater.tsx");
    const content = fs.readFileSync(componentPath, "utf-8");

    expect(content).toContain("navigator.onLine");
    expect(content).toContain("ONLINE");
  });
});

// ─── main.tsx Integration Tests ─────────────────────────────────────────────

describe("main.tsx Integration", () => {
  it("should import ServiceWorkerUpdater and OfflineIndicator", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const mainPath = path.resolve(import.meta.dirname, "../client/src/main.tsx");
    const content = fs.readFileSync(mainPath, "utf-8");

    expect(content).toContain("ServiceWorkerUpdater");
    expect(content).toContain("OfflineIndicator");
  });

  it("should register SW with update detection", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const mainPath = path.resolve(import.meta.dirname, "../client/src/main.tsx");
    const content = fs.readFileSync(mainPath, "utf-8");

    expect(content).toContain("updatefound");
    expect(content).toContain("register('/sw.js')");
  });

  it("should render ServiceWorkerUpdater and OfflineIndicator in the app tree", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const mainPath = path.resolve(import.meta.dirname, "../client/src/main.tsx");
    const content = fs.readFileSync(mainPath, "utf-8");

    expect(content).toContain("<ServiceWorkerUpdater />");
    expect(content).toContain("<OfflineIndicator />");
  });
});
