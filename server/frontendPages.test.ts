import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── WebSocket Monitor Router Tests ──────────────────────────────────────
describe("WebSocket Monitor Router Endpoints", () => {
  describe("wsMonitor.stats", () => {
    it("should return detailed stats from wsServer", async () => {
      const ws = await import("./websocket");
      const stats = ws.wsServer.getDetailedStats();
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalConnections");
      expect(typeof stats.totalConnections).toBe("number");
    });

    it("should include rooms info in stats", async () => {
      const ws = await import("./websocket");
      const stats = ws.wsServer.getDetailedStats();
      expect(stats).toHaveProperty("rooms");
    });
  });

  describe("wsMonitor.eventLog", () => {
    it("should return event log array", async () => {
      const ws = await import("./websocket");
      const log = ws.wsServer.getEventLog(50);
      expect(Array.isArray(log)).toBe(true);
    });

    it("should respect limit parameter", async () => {
      const ws = await import("./websocket");
      const log = ws.wsServer.getEventLog(10);
      expect(log.length).toBeLessThanOrEqual(10);
    });
  });

  describe("wsMonitor.rooms", () => {
    it("should return rooms as object", async () => {
      const ws = await import("./websocket");
      const rooms = ws.wsServer.getRooms();
      expect(rooms).toBeDefined();
      expect(typeof rooms).toBe("object");
    });
  });

  describe("wsMonitor.clientsInRoom", () => {
    it("should return empty array for non-existent room", async () => {
      const ws = await import("./websocket");
      const clients = ws.wsServer.getClientsInRoom("non-existent-room");
      expect(Array.isArray(clients)).toBe(true);
      expect(clients.length).toBe(0);
    });
  });

  describe("wsMonitor.clearEventLog", () => {
    it("should clear event log without error", async () => {
      const ws = await import("./websocket");
      expect(() => ws.wsServer.clearEventLog()).not.toThrow();
      const log = ws.wsServer.getEventLog(50);
      expect(log.length).toBe(0);
    });
  });

  describe("wsMonitor.broadcast", () => {
    it("should have broadcastAll method", async () => {
      const ws = await import("./websocket");
      expect(typeof ws.wsServer.broadcastAll).toBe("function");
    });

    it("should return 0 when no clients connected", async () => {
      const ws = await import("./websocket");
      const count = ws.wsServer.broadcastAll("test", { message: "hello" });
      expect(count).toBe(0);
    });

    it("should have broadcastToRoom method", async () => {
      const ws = await import("./websocket");
      const count = ws.wsServer.broadcastToRoom("test-room", "test", {});
      expect(count).toBe(0);
    });

    it("should have broadcastToUser method", async () => {
      const ws = await import("./websocket");
      const count = ws.wsServer.broadcastToUser("test-user", "test", {});
      expect(count).toBe(0);
    });
  });
});

// ─── Custom Alert Rules Tests ──────────────────────────────────────
describe("Custom Alert Engine", () => {
  describe("customAlertEngine module", () => {
    it("should export evaluateAllRules function", async () => {
      const engine = await import("./services/customAlertEngine");
      expect(engine.evaluateAllRules).toBeDefined();
      expect(typeof engine.evaluateAllRules).toBe("function");
    });

    it("should export getAlertStats function", async () => {
      const engine = await import("./services/customAlertEngine");
      expect(engine.getAlertStats).toBeDefined();
      expect(typeof engine.getAlertStats).toBe("function");
    });
  });

  describe("Custom Alert Rules schema", () => {
    it("should have customAlertRules table in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.customAlertRules).toBeDefined();
    });

    it("should have customAlertHistory table in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.customAlertHistory).toBeDefined();
    });

    it("customAlertRules should have required columns", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.customAlertRules;
      // Check key columns exist
      const columnNames = Object.keys(table);
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("metricType");
      expect(columnNames).toContain("operator");
      expect(columnNames).toContain("threshold");
      expect(columnNames).toContain("severity");
      expect(columnNames).toContain("isActive");
    });

    it("customAlertHistory should have required columns", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.customAlertHistory;
      const columnNames = Object.keys(table);
      expect(columnNames).toContain("ruleId");
      expect(columnNames).toContain("severity");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("triggeredAt");
    });
  });
});

// ─── Database Backup Service Tests ──────────────────────────────────────
describe("Database Backup Service - S3 Integration", () => {
  describe("Service exports", () => {
    it("should export createBackup function", async () => {
      const service = await import("./services/databaseBackupService");
      expect(service.createBackup).toBeDefined();
      expect(typeof service.createBackup).toBe("function");
    });

    it("should export getBackupHistory function", async () => {
      const service = await import("./services/databaseBackupService");
      expect(service.getBackupHistory).toBeDefined();
      expect(typeof service.getBackupHistory).toBe("function");
    });

    it("should export getBackupStats function", async () => {
      const service = await import("./services/databaseBackupService");
      expect(service.getBackupStats).toBeDefined();
      expect(typeof service.getBackupStats).toBe("function");
    });

    it("should export getBackupById function", async () => {
      const service = await import("./services/databaseBackupService");
      expect(service.getBackupById).toBeDefined();
      expect(typeof service.getBackupById).toBe("function");
    });

    it("should export generateRestoreScript function", async () => {
      const service = await import("./services/databaseBackupService");
      expect(service.generateRestoreScript).toBeDefined();
      expect(typeof service.generateRestoreScript).toBe("function");
    });
  });

  describe("getBackupHistory", () => {
    it("should return an array", async () => {
      const service = await import("./services/databaseBackupService");
      const history = service.getBackupHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe("getBackupStats", () => {
    it("should return stats object with required fields", async () => {
      const service = await import("./services/databaseBackupService");
      const stats = service.getBackupStats();
      expect(stats).toHaveProperty("totalBackups");
      expect(stats).toHaveProperty("successCount");
      expect(stats).toHaveProperty("failedCount");
      expect(stats).toHaveProperty("totalSizeBytes");
      expect(stats).toHaveProperty("totalSizeFormatted");
      expect(stats).toHaveProperty("avgDurationMs");
      expect(stats).toHaveProperty("retentionDays");
      expect(stats).toHaveProperty("maxBackups");
    });

    it("should have numeric values for counts", async () => {
      const service = await import("./services/databaseBackupService");
      const stats = service.getBackupStats();
      expect(typeof stats.totalBackups).toBe("number");
      expect(typeof stats.successCount).toBe("number");
      expect(typeof stats.failedCount).toBe("number");
      expect(typeof stats.totalSizeBytes).toBe("number");
    });
  });

  describe("getBackupById", () => {
    it("should return undefined for non-existent id", async () => {
      const service = await import("./services/databaseBackupService");
      const backup = service.getBackupById("non-existent-id");
      expect(backup).toBeUndefined();
    });
  });

  describe("generateRestoreScript", () => {
    it("should generate a valid restore script", async () => {
      const service = await import("./services/databaseBackupService");
      const mockMeta = {
        id: "test-123",
        timestamp: new Date().toISOString(),
        fileName: "backup-test.sql",
        fileSize: 1024,
        tableCount: 10,
        totalRows: 500,
        duration: 2000,
        s3Url: "https://s3.example.com/backup-test.sql",
        s3Key: "backups/backup-test.sql",
        status: "success",
        config: {
          retentionDays: 30,
          maxBackups: 30,
          includeSchema: true,
          includeData: true,
          compressData: false,
          excludeTables: [],
        },
      };
      const script = service.generateRestoreScript(mockMeta);
      expect(typeof script).toBe("string");
      expect(script.length).toBeGreaterThan(0);
      expect(script).toContain("backup-test.sql");
    });

    it("should include S3 URL in restore script", async () => {
      const service = await import("./services/databaseBackupService");
      const mockMeta = {
        id: "test-456",
        timestamp: new Date().toISOString(),
        fileName: "backup-s3.sql",
        fileSize: 2048,
        tableCount: 15,
        totalRows: 1000,
        duration: 3000,
        s3Url: "https://s3.example.com/backups/backup-s3.sql",
        s3Key: "backups/backup-s3.sql",
        status: "success",
        config: {
          retentionDays: 30,
          maxBackups: 30,
          includeSchema: true,
          includeData: true,
          compressData: false,
          excludeTables: [],
        },
      };
      const script = service.generateRestoreScript(mockMeta);
      expect(script).toContain("s3.example.com");
    });
  });
});

// ─── Frontend Page Component Existence Tests ──────────────────────────────────────
describe("Frontend Page Components", () => {
  it("WebSocketDashboard page file should exist", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("client/src/pages/WebSocketDashboard.tsx");
    expect(exists).toBe(true);
  });

  it("CustomAlertRules page file should exist", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("client/src/pages/CustomAlertRules.tsx");
    expect(exists).toBe(true);
  });

  it("BackupHistory page file should exist", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("client/src/pages/BackupHistory.tsx");
    expect(exists).toBe(true);
  });

  it("App.tsx should have WebSocket Dashboard route", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(content).toContain("/websocket-dashboard");
    expect(content).toContain("WebSocketDashboard");
  });

  it("App.tsx should have Custom Alert Rules route", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(content).toContain("/custom-alert-rules");
    expect(content).toContain("CustomAlertRules");
  });

  it("BackupHistory should contain S3 Cloud Backup tab", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("client/src/pages/BackupHistory.tsx", "utf-8");
    expect(content).toContain("s3-cloud");
    expect(content).toContain("S3 Cloud Backup");
    expect(content).toContain("createS3Backup");
    expect(content).toContain("s3History");
    expect(content).toContain("s3Stats");
    expect(content).toContain("generateRestoreScript");
  });
});
