import { describe, it, expect, afterAll, vi } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { autoResolveConfigs } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";

// Create admin context for testing
function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 999,
      openId: "test-admin-open-id",
      name: "Test Admin",
      email: "admin@test.com",
      loginMethod: "manus",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const adminCtx = createAdminContext();
const caller = appRouter.createCaller(adminCtx);

describe("SMS Router", () => {
  describe("sms.getConfig", () => {
    it("should return SMS config or default values", async () => {
      const result = await caller.sms.getConfig();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("enabled");
      expect(["twilio", "vonage", "custom"]).toContain(result.provider);
    });
  });

  describe("sms.saveConfig", () => {
    it("should save SMS config successfully", async () => {
      const configData = {
        provider: "twilio" as const,
        enabled: true,
        twilioAccountSid: "AC123456789",
        twilioAuthToken: "test-auth-token",
        twilioFromNumber: "+84123456789",
        vonageApiKey: "",
        vonageApiSecret: "",
        vonageFromNumber: "",
        customWebhookUrl: "",
        customWebhookMethod: "POST" as const,
        customWebhookHeaders: "",
        customWebhookBodyTemplate: "",
      };

      const result = await caller.sms.saveConfig(configData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("sms.getStats", () => {
    it("should return SMS statistics", async () => {
      const result = await caller.sms.getStats();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("failed");
      expect(result).toHaveProperty("today");
    });
  });

  describe("sms.getLogs", () => {
    it("should return paginated SMS logs", async () => {
      const result = await caller.sms.getLogs({ page: 1, pageSize: 10 });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("logs");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.logs)).toBe(true);
    });
  });
});

describe("Escalation History Router", () => {
  describe("escalationHistory.getList", () => {
    it("should return paginated escalation history", async () => {
      const result = await caller.escalationHistory.getList({ page: 1, pageSize: 10 });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe("escalationHistory.getStats", () => {
    it("should return escalation statistics", async () => {
      const result = await caller.escalationHistory.getStats({});
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totals");
      expect(result).toHaveProperty("statusDistribution");
      expect(result).toHaveProperty("severityDistribution");
    });
  });

  describe("escalationHistory.getMttr", () => {
    it("should return MTTR statistics", async () => {
      const result = await caller.escalationHistory.getMttr({});
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("overall");
      expect(result).toHaveProperty("byLevel");
      expect(result).toHaveProperty("bySeverity");
    });
  });

  describe("escalationHistory.getAlertTypes", () => {
    it("should return list of alert types", async () => {
      const result = await caller.escalationHistory.getAlertTypes();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("Auto-resolve Router", () => {
  let createdConfigId: number;

  describe("autoResolve.getList", () => {
    it("should return list of auto-resolve configs", async () => {
      const result = await caller.autoResolve.getList();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("autoResolve.create", () => {
    it("should create a new auto-resolve config", async () => {
      const configData = {
        name: "Test Auto-resolve Config",
        description: "Test description",
        alertType: "cpk_warning",
        isActive: true,
        metricThreshold: 1.33,
        metricOperator: "gte" as const,
        consecutiveOkCount: 3,
        autoResolveAfterMinutes: 30,
        notifyOnAutoResolve: true,
        notificationChannels: "email",
      };

      const result = await caller.autoResolve.create(configData);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("id");
      expect(result.name).toBe(configData.name);
      
      createdConfigId = result.id;
    });
  });

  describe("autoResolve.getStats", () => {
    it("should return auto-resolve statistics", async () => {
      const result = await caller.autoResolve.getStats();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalConfigs");
      expect(result).toHaveProperty("activeConfigs");
    });
  });

  describe("autoResolve.getLogs", () => {
    it("should return paginated auto-resolve logs", async () => {
      const result = await caller.autoResolve.getLogs({ page: 1, pageSize: 10 });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty("logs");
      expect(Array.isArray(result.logs)).toBe(true);
    });
  });

  describe("autoResolve.getAlertTypes", () => {
    it("should return list of available alert types", async () => {
      const result = await caller.autoResolve.getAlertTypes();
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("autoResolve.delete", () => {
    it("should delete an auto-resolve config", async () => {
      if (!createdConfigId) {
        const createResult = await caller.autoResolve.create({
          name: "Test Config for Delete",
          alertType: "cpk_warning",
          isActive: true,
          consecutiveOkCount: 3,
          autoResolveAfterMinutes: 30,
          notifyOnAutoResolve: true,
        });
        createdConfigId = createResult.id;
      }

      const result = await caller.autoResolve.delete({ id: createdConfigId });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});

// Cleanup after all tests
afterAll(async () => {
  try {
    const db = await getDb();
    if (db) {
      await db.delete(autoResolveConfigs).where(sql`name LIKE 'Test%'`);
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});
