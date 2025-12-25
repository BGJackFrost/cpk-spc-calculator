import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create mock db object
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
};

// Mock database - must be before importing the service
vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve(mockDb)),
}));

// Import after mocking
import { webhookNotificationService } from "./webhookNotificationService";

describe("WebhookNotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("buildSlackMessage", () => {
    it("should build correct Slack message structure", () => {
      const msg = {
        title: "Test Alert",
        message: "This is a test message",
        severity: "warning" as const,
        fields: [{ name: "Field1", value: "Value1" }],
        timestamp: new Date("2024-01-01T00:00:00Z"),
      };

      // Access private method through type assertion
      const service = webhookNotificationService as any;
      const result = service.buildSlackMessage(msg);

      expect(result).toHaveProperty("text", "Test Alert");
      expect(result).toHaveProperty("attachments");
      expect(result.attachments[0]).toHaveProperty("color", "#ff9800");
      expect(result.attachments[0]).toHaveProperty("title", "Test Alert");
      expect(result.attachments[0]).toHaveProperty("text", "This is a test message");
      expect(result.attachments[0].fields).toHaveLength(1);
      expect(result.attachments[0].fields[0]).toEqual({
        title: "Field1",
        value: "Value1",
        short: true,
      });
    });

    it("should use correct color for each severity", () => {
      const service = webhookNotificationService as any;
      
      const infoMsg = service.buildSlackMessage({ title: "Info", message: "Test", severity: "info" });
      expect(infoMsg.attachments[0].color).toBe("#36a64f");

      const warningMsg = service.buildSlackMessage({ title: "Warning", message: "Test", severity: "warning" });
      expect(warningMsg.attachments[0].color).toBe("#ff9800");

      const criticalMsg = service.buildSlackMessage({ title: "Critical", message: "Test", severity: "critical" });
      expect(criticalMsg.attachments[0].color).toBe("#f44336");
    });
  });

  describe("buildTeamsMessage", () => {
    it("should build correct Teams message structure", () => {
      const msg = {
        title: "Test Alert",
        message: "This is a test message",
        severity: "critical" as const,
        fields: [{ name: "Field1", value: "Value1" }],
      };

      const service = webhookNotificationService as any;
      const result = service.buildTeamsMessage(msg);

      expect(result["@type"]).toBe("MessageCard");
      expect(result["@context"]).toBe("http://schema.org/extensions");
      expect(result.themeColor).toBe("f44336");
      expect(result.summary).toBe("Test Alert");
      expect(result.sections[0].activityTitle).toBe("Test Alert");
      expect(result.sections[0].facts).toContainEqual({ name: "Message", value: "This is a test message" });
      expect(result.sections[0].facts).toContainEqual({ name: "Field1", value: "Value1" });
    });
  });

  describe("sendToSlack", () => {
    it("should return error when Slack is not configured", async () => {
      const result = await webhookNotificationService.sendToSlack({
        title: "Test",
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });
  });

  describe("sendToTeams", () => {
    it("should return error when Teams is not configured", async () => {
      const result = await webhookNotificationService.sendToTeams({
        title: "Test",
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not configured");
    });
  });

  describe("sendDriftAlert", () => {
    it("should format drift alert correctly", async () => {
      const alert = {
        modelId: 1,
        modelName: "Test Model",
        driftType: "accuracy_drop",
        severity: "high",
        driftScore: 0.15,
        recommendation: "Retrain model",
      };

      const result = await webhookNotificationService.sendDriftAlert(alert);

      // Since webhooks are not configured, both should fail
      expect(result.slack.success).toBe(false);
      expect(result.teams.success).toBe(false);
    });
  });

  describe("sendABTestCompletion", () => {
    it("should format A/B test completion notification correctly", async () => {
      const test = {
        testId: 1,
        testName: "Test A/B",
        winner: "B" as const,
        modelAAccuracy: 0.85,
        modelBAccuracy: 0.90,
        isSignificant: true,
        recommendation: "Deploy Model B",
      };

      const result = await webhookNotificationService.sendABTestCompletion(test);

      // Since webhooks are not configured, both should fail
      expect(result.slack.success).toBe(false);
      expect(result.teams.success).toBe(false);
    });
  });

  describe("sendDriftCheckSummary", () => {
    it("should format drift check summary correctly", async () => {
      const summary = {
        modelsChecked: 5,
        alertsCreated: 2,
        criticalAlerts: 1,
        highAlerts: 1,
        checkDuration: 1500,
      };

      const result = await webhookNotificationService.sendDriftCheckSummary(summary);

      // Since webhooks are not configured, both should fail
      expect(result.slack.success).toBe(false);
      expect(result.teams.success).toBe(false);
    });
  });
});
