import { describe, it, expect } from "vitest";

describe("IoT OEE Alert Router", () => {
  describe("Structure", () => {
    it("should have getConfigs procedure", async () => {
      const { iotOeeAlertRouter } = await import("./iotOeeAlertRouter");
      expect(iotOeeAlertRouter).toBeDefined();
      expect(iotOeeAlertRouter._def.procedures.getConfigs).toBeDefined();
    });

    it("should have createConfig procedure", async () => {
      const { iotOeeAlertRouter } = await import("./iotOeeAlertRouter");
      expect(iotOeeAlertRouter._def.procedures.createConfig).toBeDefined();
    });

    it("should have updateConfig procedure", async () => {
      const { iotOeeAlertRouter } = await import("./iotOeeAlertRouter");
      expect(iotOeeAlertRouter._def.procedures.updateConfig).toBeDefined();
    });

    it("should have deleteConfig procedure", async () => {
      const { iotOeeAlertRouter } = await import("./iotOeeAlertRouter");
      expect(iotOeeAlertRouter._def.procedures.deleteConfig).toBeDefined();
    });

    it("should have acknowledgeAlert procedure", async () => {
      const { iotOeeAlertRouter } = await import("./iotOeeAlertRouter");
      expect(iotOeeAlertRouter._def.procedures.acknowledgeAlert).toBeDefined();
    });
  });
});

describe("IoT OEE Alert Service", () => {
  it("should export getAlertConfigs function", async () => {
    const service = await import("../services/iotOeeAlertService");
    expect(service.getAlertConfigs).toBeDefined();
    expect(typeof service.getAlertConfigs).toBe("function");
  });

  it("should export saveAlertHistory function", async () => {
    const service = await import("../services/iotOeeAlertService");
    expect(service.saveAlertHistory).toBeDefined();
    expect(typeof service.saveAlertHistory).toBe("function");
  });

  it("should export getAlertHistory function", async () => {
    const service = await import("../services/iotOeeAlertService");
    expect(service.getAlertHistory).toBeDefined();
    expect(typeof service.getAlertHistory).toBe("function");
  });

  it("should export getAlertStatistics function", async () => {
    const service = await import("../services/iotOeeAlertService");
    expect(service.getAlertStatistics).toBeDefined();
    expect(typeof service.getAlertStatistics).toBe("function");
  });
});

describe("OEE Router - getRealtimeOeeByLines", () => {
  it("should have getRealtimeOeeByLines procedure", async () => {
    const { oeeRouter } = await import("./oeeRouter");
    expect(oeeRouter._def.procedures.getRealtimeOeeByLines).toBeDefined();
  });
});
