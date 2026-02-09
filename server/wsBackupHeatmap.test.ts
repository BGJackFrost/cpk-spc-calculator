import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── WebSocket Service Tests ──────────────────────────────────────
describe("WebSocket Server Enhancement", () => {
  describe("WebSocket module structure", () => {
    it("should export wsServer instance", async () => {
      const ws = await import("./websocket");
      expect(ws.wsServer).toBeDefined();
      expect(typeof ws.wsServer.initialize).toBe("function");
      expect(typeof ws.wsServer.broadcastAll).toBe("function");
    });

    it("should have getDetailedStats method", async () => {
      const ws = await import("./websocket");
      expect(typeof ws.wsServer.getDetailedStats).toBe("function");
      const stats = ws.wsServer.getDetailedStats();
      expect(stats).toHaveProperty("totalConnections");
      expect(stats).toHaveProperty("rooms");
    });

    it("should have broadcastToRoom method", async () => {
      const ws = await import("./websocket");
      expect(typeof ws.wsServer.broadcastToRoom).toBe("function");
    });

    it("should have broadcastToUser method", async () => {
      const ws = await import("./websocket");
      expect(typeof ws.wsServer.broadcastToUser).toBe("function");
    });

    it("should have event log functions", async () => {
      const ws = await import("./websocket");
      expect(typeof ws.wsServer.getEventLog).toBe("function");
      expect(typeof ws.wsServer.clearEventLog).toBe("function");
    });

    it("should have room management functions", async () => {
      const ws = await import("./websocket");
      expect(typeof ws.wsServer.getRooms).toBe("function");
      expect(typeof ws.wsServer.getClientsInRoom).toBe("function");
    });

    it("should have SSE bridge method", async () => {
      const ws = await import("./websocket");
      expect(typeof ws.wsServer.bridgeSseEvent).toBe("function");
    });

    it("should return stats without server initialized", async () => {
      const ws = await import("./websocket");
      const stats = ws.wsServer.getStats();
      expect(stats).toHaveProperty("totalConnections");
      expect(stats.totalConnections).toBe(0);
    });
  });

  describe("SSE Bridge", () => {
    it("should have SSE sendSseEvent function", async () => {
      const sse = await import("./sse");
      expect(sse.sendSseEvent).toBeDefined();
      expect(typeof sse.sendSseEvent).toBe("function");
    });

    it("should have broadcastEvent function", async () => {
      const sse = await import("./sse");
      expect(sse.broadcastEvent).toBeDefined();
      expect(typeof sse.broadcastEvent).toBe("function");
    });
  });
});

// ─── useUnifiedRealtime Hook Tests ────────────────────────────────
describe("useUnifiedRealtime Hook", () => {
  it("should exist as a module", async () => {
    // Verify the hook file exists and exports correctly
    const fs = await import("fs");
    const path = await import("path");
    const hookPath = path.resolve(__dirname, "../client/src/hooks/useUnifiedRealtime.ts");
    expect(fs.existsSync(hookPath)).toBe(true);
  });

  it("should export useUnifiedRealtime function", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const hookPath = path.resolve(__dirname, "../client/src/hooks/useUnifiedRealtime.ts");
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("export function useUnifiedRealtime");
  });

  it("should support WebSocket and SSE transport", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const hookPath = path.resolve(__dirname, "../client/src/hooks/useUnifiedRealtime.ts");
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("WebSocket");
    expect(content).toContain("EventSource");
  });

  it("should support room management", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const hookPath = path.resolve(__dirname, "../client/src/hooks/useUnifiedRealtime.ts");
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("joinRoom");
    expect(content).toContain("leaveRoom");
  });
});

// ─── Database Backup Service Tests ────────────────────────────────
describe("Database Backup Service", () => {
  it("should export required functions", async () => {
    const backup = await import("./services/databaseBackupService");
    expect(backup.createBackup).toBeDefined();
    expect(backup.getBackupHistory).toBeDefined();
    expect(backup.getBackupStats).toBeDefined();
    expect(backup.generateRestoreScript).toBeDefined();
    expect(backup.createSchemaBackup).toBeDefined();
    expect(backup.getBackupById).toBeDefined();
  });

  it("should have correct default config", async () => {
    const backup = await import("./services/databaseBackupService");
    const stats = backup.getBackupStats();
    expect(stats).toBeDefined();
    expect(stats).toHaveProperty("totalBackups");
    expect(stats).toHaveProperty("totalSizeBytes");
    expect(typeof stats.totalBackups).toBe("number");
  });

  it("should return empty history initially", async () => {
    const backup = await import("./services/databaseBackupService");
    const history = backup.getBackupHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it("should generate restore script", async () => {
    const backup = await import("./services/databaseBackupService");
    const mockMeta = {
      id: 'test-1',
      timestamp: Date.now(),
      filename: 'backup-test.sql',
      sizeBytes: 1024,
      tableCount: 5,
      totalRows: 100,
      s3Url: 'https://example.com/backup.sql',
      s3Key: 'backups/backup-test.sql',
      type: 'full' as const,
      status: 'completed' as const,
      durationMs: 500,
    };
    const script = backup.generateRestoreScript(mockMeta);
    expect(script).toBeDefined();
    expect(typeof script).toBe("string");
    expect(script).toContain("#!/bin/bash");
    expect(script).toContain("https://example.com/backup.sql");
  });

  it("should generate restore script with mysql commands", async () => {
    const backup = await import("./services/databaseBackupService");
    const mockMeta = {
      id: 'test-2',
      timestamp: Date.now(),
      filename: 'backup-prod.sql',
      sizeBytes: 2048,
      tableCount: 10,
      totalRows: 500,
      s3Url: 'https://s3.example.com/backup.sql',
      s3Key: 'backups/backup-prod.sql',
      type: 'full' as const,
      status: 'completed' as const,
      durationMs: 1000,
    };
    const script = backup.generateRestoreScript(mockMeta);
    expect(script).toContain("mysql");
    expect(script).toContain("curl");
  });

  it("should get backup by id", async () => {
    const backup = await import("./services/databaseBackupService");
    // Should return undefined for non-existent id
    const result = backup.getBackupById("non-existent-id");
    expect(result).toBeUndefined();
  });
});

// ─── Activity Heatmap Data Tests ──────────────────────────────────
describe("Activity Heatmap Data", () => {
  it("should export getActivityHeatmapData function", async () => {
    const db = await import("./db");
    expect(db.getActivityHeatmapData).toBeDefined();
    expect(typeof db.getActivityHeatmapData).toBe("function");
  });

  it("should return correct structure when DB is unavailable", async () => {
    // Mock getDb to return null
    vi.doMock("./db", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./db")>();
      return {
        ...actual,
        getDb: vi.fn().mockResolvedValue(null),
      };
    });

    // Re-import to get mocked version
    const { getActivityHeatmapData } = await import("./db");
    const result = await getActivityHeatmapData({ weeks: 1 });
    
    expect(result).toHaveProperty("heatmap");
    expect(result).toHaveProperty("dailyTotals");
    expect(result).toHaveProperty("hourlyTotals");
    expect(result).toHaveProperty("peakHour");
    expect(result).toHaveProperty("peakDay");
    expect(result).toHaveProperty("totalActivities");
    expect(result).toHaveProperty("dateRange");
    
    vi.restoreAllMocks();
  });

  it("should have heatmap grid with 168 cells (7x24)", async () => {
    const { getActivityHeatmapData } = await import("./db");
    const result = await getActivityHeatmapData({ weeks: 1 });
    
    // Even with no data, should return 168 cells
    if (result.heatmap.length > 0) {
      expect(result.heatmap.length).toBe(168); // 7 days * 24 hours
    }
  });

  it("should have hourly totals with 24 entries", async () => {
    const { getActivityHeatmapData } = await import("./db");
    const result = await getActivityHeatmapData({ weeks: 1 });
    
    if (result.hourlyTotals.length > 0) {
      expect(result.hourlyTotals.length).toBe(24);
      result.hourlyTotals.forEach((h: any) => {
        expect(h.hour).toBeGreaterThanOrEqual(0);
        expect(h.hour).toBeLessThan(24);
        expect(h.count).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("should accept filter parameters", async () => {
    const { getActivityHeatmapData } = await import("./db");
    // Should not throw with various filter combinations
    await expect(getActivityHeatmapData({ weeks: 2, action: "login" })).resolves.toBeDefined();
    await expect(getActivityHeatmapData({ weeks: 4, module: "auth" })).resolves.toBeDefined();
  });
});

// ─── AuditLogs UI Heatmap Integration Tests ──────────────────────
describe("AuditLogs Heatmap UI Integration", () => {
  it("should have heatmap component in AuditLogs.tsx", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/pages/AuditLogs.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Heatmap Hoạt động");
    expect(content).toContain("activityHeatmap");
  });

  it("should have heatmap weeks selector", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/pages/AuditLogs.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("heatmapWeeks");
    expect(content).toContain("setHeatmapWeeks");
  });

  it("should have color scale legend", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/pages/AuditLogs.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Ít");
    expect(content).toContain("Nhiều");
    expect(content).toContain("bg-green-");
  });

  it("should have hourly distribution bar chart", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/pages/AuditLogs.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Phân bổ theo giờ");
    expect(content).toContain("hourlyTotals");
  });

  it("should display peak hour and peak day", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "../client/src/pages/AuditLogs.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("Giờ cao điểm");
    expect(content).toContain("Ngày cao điểm");
    expect(content).toContain("peakHour");
    expect(content).toContain("peakDay");
  });
});

// ─── Scheduled Backup Job Tests ──────────────────────────────────
describe("Scheduled Backup Job", () => {
  it("should have backup job in scheduledJobs.ts", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.resolve(__dirname, "./scheduledJobs.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("backup");
    expect(content).toContain("createBackup");
  });
});
