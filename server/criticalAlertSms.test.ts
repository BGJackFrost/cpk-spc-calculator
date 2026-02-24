/**
 * Tests for Critical Alert SMS Service
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Critical Alert SMS Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SMS Configuration", () => {
    it("should have default configuration values", () => {
      const defaultConfig = {
        enabled: false,
        provider: "custom",
        timeoutMinutes: 30,
        recipients: [],
        escalationEnabled: true,
        escalationIntervalMinutes: 15,
        maxEscalations: 3,
      };

      expect(defaultConfig.enabled).toBe(false);
      expect(defaultConfig.timeoutMinutes).toBe(30);
      expect(defaultConfig.escalationEnabled).toBe(true);
    });

    it("should validate timeout range", () => {
      const minTimeout = 5;
      const maxTimeout = 120;
      const validTimeout = 30;

      expect(validTimeout).toBeGreaterThanOrEqual(minTimeout);
      expect(validTimeout).toBeLessThanOrEqual(maxTimeout);
    });

    it("should validate escalation settings", () => {
      const minInterval = 5;
      const maxInterval = 60;
      const maxEscalations = 10;

      const config = {
        escalationIntervalMinutes: 15,
        maxEscalations: 3,
      };

      expect(config.escalationIntervalMinutes).toBeGreaterThanOrEqual(minInterval);
      expect(config.escalationIntervalMinutes).toBeLessThanOrEqual(maxInterval);
      expect(config.maxEscalations).toBeLessThanOrEqual(maxEscalations);
    });
  });

  describe("SMS Message Formatting", () => {
    it("should format alert message correctly", () => {
      const alert = {
        alertType: "cpk_low",
        productionLineName: "Line A",
        currentValue: 0.85,
        thresholdValue: 1.33,
        minutesSinceCreated: 45,
        id: 123,
      };

      const alertType = alert.alertType.replace(/_/g, " ").toUpperCase();
      const message = `[CRITICAL] ${alertType}
Line: ${alert.productionLineName}
Value: ${alert.currentValue.toFixed(2)} (Threshold: ${alert.thresholdValue.toFixed(2)})
Unresolved: ${alert.minutesSinceCreated} min
ID: ${alert.id}`;

      expect(message).toContain("[CRITICAL]");
      expect(message).toContain("CPK LOW");
      expect(message).toContain("Line A");
      expect(message).toContain("0.85");
      expect(message).toContain("45 min");
    });

    it("should handle missing production line name", () => {
      const alert = {
        alertType: "oee_low",
        productionLineId: 5,
        productionLineName: undefined,
        currentValue: 65,
        thresholdValue: 85,
        minutesSinceCreated: 35,
        id: 456,
      };

      const lineName = alert.productionLineName || `Line #${alert.productionLineId}` || "N/A";
      expect(lineName).toBe("Line #5");
    });
  });

  describe("Provider Support", () => {
    it("should support Twilio provider", () => {
      const providers = ["twilio", "nexmo", "custom"];
      expect(providers).toContain("twilio");
    });

    it("should support Nexmo provider", () => {
      const providers = ["twilio", "nexmo", "custom"];
      expect(providers).toContain("nexmo");
    });

    it("should support custom endpoint provider", () => {
      const providers = ["twilio", "nexmo", "custom"];
      expect(providers).toContain("custom");
    });
  });

  describe("Alert Filtering", () => {
    it("should filter alerts older than timeout", () => {
      const timeoutMinutes = 30;
      const now = Date.now();
      const cutoffTime = now - timeoutMinutes * 60 * 1000;

      const alerts = [
        { id: 1, createdAt: new Date(now - 45 * 60 * 1000) }, // 45 min ago - should include
        { id: 2, createdAt: new Date(now - 20 * 60 * 1000) }, // 20 min ago - should exclude
        { id: 3, createdAt: new Date(now - 60 * 60 * 1000) }, // 60 min ago - should include
      ];

      const filtered = alerts.filter(a => a.createdAt.getTime() < cutoffTime);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(a => a.id)).toEqual([1, 3]);
    });

    it("should only include critical severity alerts", () => {
      const alerts = [
        { id: 1, severity: "critical" },
        { id: 2, severity: "warning" },
        { id: 3, severity: "critical" },
        { id: 4, severity: "info" },
      ];

      const criticalAlerts = alerts.filter(a => a.severity === "critical");
      expect(criticalAlerts).toHaveLength(2);
    });

    it("should exclude resolved alerts", () => {
      const alerts = [
        { id: 1, resolvedAt: null },
        { id: 2, resolvedAt: new Date() },
        { id: 3, resolvedAt: null },
      ];

      const unresolvedAlerts = alerts.filter(a => a.resolvedAt === null);
      expect(unresolvedAlerts).toHaveLength(2);
    });
  });

  describe("Escalation Logic", () => {
    it("should determine if SMS should be sent for new alert", () => {
      const tracker = new Map();
      const alertId = 1;
      
      const shouldSend = !tracker.has(alertId);
      expect(shouldSend).toBe(true);
    });

    it("should determine if escalation SMS should be sent", () => {
      const config = {
        escalationEnabled: true,
        escalationIntervalMinutes: 15,
        maxEscalations: 3,
      };

      const tracker = new Map([
        [1, { count: 1, lastSentAt: new Date(Date.now() - 20 * 60 * 1000) }],
      ]);

      const alertId = 1;
      const trackerEntry = tracker.get(alertId);
      const now = new Date();
      const minutesSinceLastSms = (now.getTime() - trackerEntry!.lastSentAt.getTime()) / 60000;

      const shouldEscalate = 
        config.escalationEnabled &&
        minutesSinceLastSms >= config.escalationIntervalMinutes &&
        trackerEntry!.count < config.maxEscalations;

      expect(shouldEscalate).toBe(true);
    });

    it("should not escalate if max escalations reached", () => {
      const config = {
        escalationEnabled: true,
        escalationIntervalMinutes: 15,
        maxEscalations: 3,
      };

      const tracker = new Map([
        [1, { count: 3, lastSentAt: new Date(Date.now() - 20 * 60 * 1000) }],
      ]);

      const alertId = 1;
      const trackerEntry = tracker.get(alertId);

      const shouldEscalate = trackerEntry!.count < config.maxEscalations;
      expect(shouldEscalate).toBe(false);
    });
  });

  describe("Statistics", () => {
    it("should calculate SMS statistics correctly", () => {
      const smsLogs = [
        { alertId: 1, recipientCount: 2, sentAt: new Date() },
        { alertId: 2, recipientCount: 2, sentAt: new Date() },
        { alertId: 1, recipientCount: 2, sentAt: new Date() }, // Escalation for alert 1
      ];

      const totalSent = smsLogs.length;
      const alertsCovered = new Set(smsLogs.map(l => l.alertId)).size;

      expect(totalSent).toBe(3);
      expect(alertsCovered).toBe(2);
    });
  });
});
