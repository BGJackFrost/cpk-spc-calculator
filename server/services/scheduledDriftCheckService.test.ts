import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create mock db object
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
};

// Mock database - must be before importing the service
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

// Mock dataDriftService
vi.mock("./dataDriftService", () => ({
  dataDriftService: {
    runMonitoringCheck: vi.fn().mockResolvedValue({
      driftDetected: false,
      alert: null,
    }),
  },
}));

// Mock webhookNotificationService
vi.mock("./webhookNotificationService", () => ({
  webhookNotificationService: {
    sendDriftAlert: vi.fn().mockResolvedValue({ slack: { success: true }, teams: { success: true } }),
    sendDriftCheckSummary: vi.fn().mockResolvedValue({ slack: { success: true }, teams: { success: true } }),
  },
}));

// Mock notifyOwner
vi.mock("../_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Import after mocking
import { scheduledDriftCheckService, runScheduledDriftCheck } from "./scheduledDriftCheckService";

describe("ScheduledDriftCheckService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.orderBy.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getModelsWithDriftConfig", () => {
    it("should return empty array when no models have drift config", async () => {
      const result = await scheduledDriftCheckService.getModelsWithDriftConfig();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe("checkModel", () => {
    it("should return check result for a model without recent metrics", async () => {
      const result = await scheduledDriftCheckService.checkModel(1, "Test Model");

      expect(result).toHaveProperty("modelId", 1);
      expect(result).toHaveProperty("modelName", "Test Model");
      expect(result).toHaveProperty("checked", false);
      expect(result).toHaveProperty("driftDetected", false);
      expect(result).toHaveProperty("alertCreated", false);
      expect(result.error).toContain("No recent metrics");
    });
  });

  describe("runScheduledCheck", () => {
    it("should return summary with correct structure", async () => {
      const result = await runScheduledDriftCheck();

      expect(result).toHaveProperty("startTime");
      expect(result).toHaveProperty("endTime");
      expect(result).toHaveProperty("duration");
      expect(result).toHaveProperty("modelsChecked");
      expect(result).toHaveProperty("alertsCreated");
      expect(result).toHaveProperty("criticalAlerts");
      expect(result).toHaveProperty("highAlerts");
      expect(result).toHaveProperty("mediumAlerts");
      expect(result).toHaveProperty("lowAlerts");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("results");
      expect(Array.isArray(result.results)).toBe(true);
    });

    it("should have valid duration", async () => {
      const result = await runScheduledDriftCheck();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.endTime.getTime()).toBeGreaterThanOrEqual(result.startTime.getTime());
    });

    it("should return 0 models checked when no drift configs exist", async () => {
      const result = await runScheduledDriftCheck();

      expect(result.modelsChecked).toBe(0);
      expect(result.alertsCreated).toBe(0);
    });
  });

  describe("getLastCheckSummary", () => {
    it("should return last check summary with null lastCheck when no alerts exist", async () => {
      const result = await scheduledDriftCheckService.getLastCheckSummary();

      expect(result).toHaveProperty("lastCheck", null);
      expect(result).toHaveProperty("alertCount", 0);
    });
  });
});
