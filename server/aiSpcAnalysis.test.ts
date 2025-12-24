import { describe, it, expect, vi, beforeEach } from "vitest";

// Test AI SPC Analysis Service - Non-LLM functions
describe("AI SPC Analysis Service", () => {
  describe("generateQuickInsights", () => {
    it("should generate insights for excellent CPK", async () => {
      const { generateQuickInsights } = await import("./services/aiSpcAnalysisService");

      const result = generateQuickInsights({
        mean: 50.0,
        stdDev: 0.5,
        cp: 1.8,
        cpk: 1.75,
        usl: 52,
        lsl: 48,
        ucl: 51.5,
        lcl: 48.5,
        sampleSize: 100,
      });

      expect(result).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.insights.some((i) => i.includes("xuất sắc"))).toBe(true);
    });

    it("should generate alerts for low CPK", async () => {
      const { generateQuickInsights } = await import("./services/aiSpcAnalysisService");

      const result = generateQuickInsights({
        mean: 50.5,
        stdDev: 1.5,
        cp: 0.8,
        cpk: 0.7,
        usl: 52,
        lsl: 48,
        ucl: 55,
        lcl: 46,
        sampleSize: 50,
      });

      expect(result.alerts).toBeDefined();
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts.some((a) => a.includes("không đạt"))).toBe(true);
    });

    it("should detect off-center process", async () => {
      const { generateQuickInsights } = await import("./services/aiSpcAnalysisService");

      const result = generateQuickInsights({
        mean: 51.5, // Off-center towards USL
        stdDev: 0.5,
        cp: 1.5,
        cpk: 1.0,
        usl: 52,
        lsl: 48,
        ucl: 53,
        lcl: 50,
        sampleSize: 100,
      });

      expect(result.insights.length + result.alerts.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeCpkTrend", () => {
    it("should detect improving trend", async () => {
      const { analyzeCpkTrend } = await import("./services/aiSpcAnalysisService");

      const result = analyzeCpkTrend([1.0, 1.1, 1.2, 1.3, 1.4, 1.5]);

      expect(result.direction).toBe("improving");
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it("should detect declining trend", async () => {
      const { analyzeCpkTrend } = await import("./services/aiSpcAnalysisService");

      const result = analyzeCpkTrend([1.5, 1.4, 1.3, 1.2, 1.1, 1.0]);

      expect(result.direction).toBe("declining");
    });

    it("should detect stable trend", async () => {
      const { analyzeCpkTrend } = await import("./services/aiSpcAnalysisService");

      const result = analyzeCpkTrend([1.33, 1.34, 1.32, 1.33, 1.34, 1.33]);

      expect(result.direction).toBe("stable");
    });

    it("should handle small sample size", async () => {
      const { analyzeCpkTrend } = await import("./services/aiSpcAnalysisService");

      const result = analyzeCpkTrend([1.2, 1.3]);

      expect(result.direction).toBe("stable");
      expect(result.confidence).toBe(0.5);
    });
  });

  describe("calculateHealthScore", () => {
    it("should return excellent health for good metrics", async () => {
      const { calculateHealthScore } = await import("./services/aiSpcAnalysisService");

      const result = calculateHealthScore(
        {
          mean: 50.0,
          stdDev: 0.4,
          cp: 1.8,
          cpk: 1.75,
          usl: 52,
          lsl: 48,
          ucl: 51.2,
          lcl: 48.8,
          sampleSize: 100,
        },
        []
      );

      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.health).toBe("excellent");
    });

    it("should reduce score for violations", async () => {
      const { calculateHealthScore } = await import("./services/aiSpcAnalysisService");

      const result = calculateHealthScore(
        {
          mean: 50.0,
          stdDev: 0.5,
          cp: 1.5,
          cpk: 1.45,
          usl: 52,
          lsl: 48,
          ucl: 51.5,
          lcl: 48.5,
          sampleSize: 100,
        },
        [
          {
            rule: "Rule 1",
            description: "Point beyond control limits",
            severity: "critical",
            affectedPoints: [5],
          },
        ]
      );

      expect(result.score).toBeLessThan(100);
    });

    it("should return critical health for poor metrics", async () => {
      const { calculateHealthScore } = await import("./services/aiSpcAnalysisService");

      const result = calculateHealthScore(
        {
          mean: 51.5,
          stdDev: 1.5,
          cp: 0.6,
          cpk: 0.5,
          usl: 52,
          lsl: 48,
          ucl: 56,
          lcl: 47,
          sampleSize: 30,
        },
        [
          { rule: "Rule 1", description: "Test", severity: "critical", affectedPoints: [1] },
          { rule: "Rule 2", description: "Test", severity: "critical", affectedPoints: [2] },
        ]
      );

      expect(result.health).toBe("critical");
    });
  });

  describe("assessRisk", () => {
    it("should return low risk for good metrics", async () => {
      const { assessRisk } = await import("./services/aiSpcAnalysisService");

      const result = assessRisk(
        {
          mean: 50.0,
          stdDev: 0.4,
          cp: 1.8,
          cpk: 1.75,
          usl: 52,
          lsl: 48,
          ucl: 51.2,
          lcl: 48.8,
          sampleSize: 100,
        },
        []
      );

      expect(result.level).toBe("low");
      expect(result.factors.length).toBe(0);
    });

    it("should return high risk for low CPK", async () => {
      const { assessRisk } = await import("./services/aiSpcAnalysisService");

      const result = assessRisk(
        {
          mean: 50.0,
          stdDev: 1.5,
          cp: 0.8,
          cpk: 0.7,
          usl: 52,
          lsl: 48,
          ucl: 54.5,
          lcl: 45.5,
          sampleSize: 50,
        },
        []
      );

      expect(["high", "critical"]).toContain(result.level);
      expect(result.factors.length).toBeGreaterThan(0);
    });

    it("should include violation factors", async () => {
      const { assessRisk } = await import("./services/aiSpcAnalysisService");

      const result = assessRisk(
        {
          mean: 50.0,
          stdDev: 0.5,
          cp: 1.5,
          cpk: 1.45,
          usl: 52,
          lsl: 48,
          ucl: 51.5,
          lcl: 48.5,
          sampleSize: 100,
        },
        [
          { rule: "Rule 1", description: "Test", severity: "critical", affectedPoints: [1] },
        ]
      );

      expect(result.factors.some((f) => f.includes("vi phạm"))).toBe(true);
    });
  });
});

// Test IoT WebSocket Service
describe("IoT WebSocket Service", () => {
  describe("IotStateManager", () => {
    it("should register devices", async () => {
      const { iotStateManager } = await import("./services/iotWebSocketService");

      const device = {
        id: "test-device-001",
        name: "Test Sensor",
        type: "sensor" as const,
        status: "online" as const,
        lastSeen: new Date(),
        metrics: { temperature: 25.5 },
      };

      iotStateManager.registerDevice(device);
      const retrieved = iotStateManager.getDevice("test-device-001");

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe("Test Sensor");
    });

    it("should update device status", async () => {
      const { iotStateManager } = await import("./services/iotWebSocketService");

      iotStateManager.registerDevice({
        id: "test-device-002",
        name: "Test PLC",
        type: "plc",
        status: "online",
        lastSeen: new Date(),
        metrics: {},
      });

      iotStateManager.updateDeviceStatus("test-device-002", "warning");
      const device = iotStateManager.getDevice("test-device-002");

      expect(device?.status).toBe("warning");
    });

    it("should update metrics", async () => {
      const { iotStateManager } = await import("./services/iotWebSocketService");

      iotStateManager.registerDevice({
        id: "test-device-003",
        name: "Test Gateway",
        type: "gateway",
        status: "online",
        lastSeen: new Date(),
        metrics: { dataRate: 100 },
      });

      iotStateManager.updateMetric({
        deviceId: "test-device-003",
        metricName: "dataRate",
        value: 150,
        unit: "KB/s",
        timestamp: new Date(),
        quality: "good",
      });

      const device = iotStateManager.getDevice("test-device-003");
      expect(device?.metrics.dataRate).toBe(150);
    });

    it("should get stats", async () => {
      const { iotStateManager } = await import("./services/iotWebSocketService");

      const stats = iotStateManager.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalDevices).toBe("number");
      expect(typeof stats.onlineDevices).toBe("number");
      expect(typeof stats.activeAlarms).toBe("number");
    });

    it("should get all devices", async () => {
      const { iotStateManager } = await import("./services/iotWebSocketService");

      const devices = iotStateManager.getAllDevices();
      expect(Array.isArray(devices)).toBe(true);
    });
  });

  describe("Demo Functions", () => {
    it("should initialize demo devices", async () => {
      const { initializeDemoDevices, iotStateManager } = await import("./services/iotWebSocketService");

      initializeDemoDevices();
      const devices = iotStateManager.getAllDevices();

      expect(devices.length).toBeGreaterThan(0);
    });

    it("should start and stop simulation", async () => {
      const { startSimulation, stopSimulation } = await import("./services/iotWebSocketService");

      startSimulation();
      stopSimulation();
    });
  });
});

// Test SSE IoT Events
describe("SSE IoT Events", () => {
  it("should have IoT event types defined", async () => {
    const sse = await import("./sse");

    expect(typeof sse.notifyIotDeviceStatus).toBe("function");
    expect(typeof sse.notifyIotMetricUpdate).toBe("function");
    expect(typeof sse.notifyIotAlarm).toBe("function");
    expect(typeof sse.notifyIotAlarmAck).toBe("function");
    expect(typeof sse.notifyIotBatchMetrics).toBe("function");
  });
});
