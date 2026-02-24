/**
 * Tests for Webhook History Router
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the webhookHistoryService
vi.mock("./services/webhookHistoryService", () => ({
  getDeliveryHistory: vi.fn().mockReturnValue([
    {
      id: "wh-1",
      webhookId: 1,
      webhookName: "Test Webhook",
      url: "https://example.com/webhook",
      payload: { test: "data" },
      status: "success",
      statusCode: 200,
      response: '{"ok": true}',
      error: null,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null,
      createdAt: new Date(),
      completedAt: new Date(),
    },
    {
      id: "wh-2",
      webhookId: 2,
      webhookName: "Failed Webhook",
      url: "https://example.com/webhook2",
      payload: { test: "data2" },
      status: "failed",
      statusCode: 500,
      response: null,
      error: "Connection timeout",
      retryCount: 3,
      maxRetries: 3,
      nextRetryAt: null,
      createdAt: new Date(),
      completedAt: null,
    },
  ]),
  getWebhookStatistics: vi.fn().mockReturnValue({
    total: 100,
    success: 85,
    failed: 10,
    pending: 5,
    successRate: 85,
  }),
  getRetryStatistics: vi.fn().mockReturnValue({
    totalRetries: 20,
    successfulRetries: 15,
    failedRetries: 5,
    avgRetriesPerDelivery: 1.5,
  }),
  retryDelivery: vi.fn().mockResolvedValue({ success: true }),
  processRetries: vi.fn().mockResolvedValue({
    processed: 5,
    succeeded: 4,
    failed: 1,
  }),
  clearDeliveryHistory: vi.fn().mockReturnValue(10),
  getDeliveryById: vi.fn().mockReturnValue({
    id: "wh-1",
    webhookId: 1,
    webhookName: "Test Webhook",
    url: "https://example.com/webhook",
    payload: { test: "data" },
    status: "success",
    statusCode: 200,
  }),
  exportDeliveryHistory: vi.fn().mockReturnValue([
    { id: "wh-1", webhookName: "Test Webhook", status: "success" },
  ]),
}));

import {
  getDeliveryHistory,
  getWebhookStatistics,
  getRetryStatistics,
  retryDelivery,
  processRetries,
  clearDeliveryHistory,
  getDeliveryById,
  exportDeliveryHistory,
} from "./services/webhookHistoryService";

describe("Webhook History Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDeliveryHistory", () => {
    it("should return delivery history list", () => {
      const history = getDeliveryHistory({ limit: 100 });
      
      expect(history).toHaveLength(2);
      expect(history[0].webhookName).toBe("Test Webhook");
      expect(history[0].status).toBe("success");
      expect(history[1].status).toBe("failed");
    });

    it("should be called with correct parameters", () => {
      getDeliveryHistory({ limit: 50, status: "failed" });
      
      expect(getDeliveryHistory).toHaveBeenCalledWith({
        limit: 50,
        status: "failed",
      });
    });
  });

  describe("getWebhookStatistics", () => {
    it("should return webhook statistics", () => {
      const stats = getWebhookStatistics();
      
      expect(stats.total).toBe(100);
      expect(stats.success).toBe(85);
      expect(stats.failed).toBe(10);
      expect(stats.successRate).toBe(85);
    });
  });

  describe("getRetryStatistics", () => {
    it("should return retry statistics", () => {
      const stats = getRetryStatistics();
      
      expect(stats.totalRetries).toBe(20);
      expect(stats.successfulRetries).toBe(15);
      expect(stats.failedRetries).toBe(5);
    });
  });

  describe("retryDelivery", () => {
    it("should retry a delivery successfully", async () => {
      const result = await retryDelivery("wh-1");
      
      expect(result.success).toBe(true);
      expect(retryDelivery).toHaveBeenCalledWith("wh-1");
    });
  });

  describe("processRetries", () => {
    it("should process all pending retries", async () => {
      const result = await processRetries();
      
      expect(result.processed).toBe(5);
      expect(result.succeeded).toBe(4);
      expect(result.failed).toBe(1);
    });
  });

  describe("clearDeliveryHistory", () => {
    it("should clear old delivery history", () => {
      const deleted = clearDeliveryHistory(30);
      
      expect(deleted).toBe(10);
      expect(clearDeliveryHistory).toHaveBeenCalledWith(30);
    });
  });

  describe("getDeliveryById", () => {
    it("should return delivery by ID", () => {
      const delivery = getDeliveryById("wh-1");
      
      expect(delivery).toBeDefined();
      expect(delivery?.webhookName).toBe("Test Webhook");
    });
  });

  describe("exportDeliveryHistory", () => {
    it("should export delivery history", () => {
      const data = exportDeliveryHistory();
      
      expect(data).toHaveLength(1);
      expect(data[0].webhookName).toBe("Test Webhook");
    });
  });
});

describe("Webhook History Router Integration", () => {
  it("should filter history by search term", () => {
    const history = getDeliveryHistory({ limit: 100 });
    const searchTerm = "test";
    
    const filtered = history.filter(item =>
      item.webhookName?.toLowerCase().includes(searchTerm) ||
      item.url?.toLowerCase().includes(searchTerm)
    );
    
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("should filter history by status", () => {
    const history = getDeliveryHistory({ limit: 100 });
    
    const successItems = history.filter(item => item.status === "success");
    const failedItems = history.filter(item => item.status === "failed");
    
    expect(successItems.length).toBe(1);
    expect(failedItems.length).toBe(1);
  });
});
