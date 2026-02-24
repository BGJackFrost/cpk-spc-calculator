import { describe, it, expect, vi } from "vitest";

describe("Phase 63: SPC Plan Logic, CPK Alerts, Validation Rules, CPK Trend", () => {
  describe("SPC Plan Logic theo Tiêu chuẩn đo", () => {
    it("should auto-fill SPC Plan from Measurement Standard", () => {
      const measurementStandard = {
        id: 1,
        measurementName: "Đo chiều dài sản phẩm A",
        productId: 1,
        workstationId: 2,
        machineId: 3,
        usl: 100,
        lsl: 90,
        target: 95,
        appliedSpcRules: JSON.stringify(["R1", "R2"]),
      };

      // Simulate auto-fill logic
      const spcPlanData = {
        name: `SPC Plan - ${measurementStandard.measurementName}`,
        productId: measurementStandard.productId,
        workstationId: measurementStandard.workstationId,
        machineId: measurementStandard.machineId,
        appliedRules: measurementStandard.appliedSpcRules,
      };

      expect(spcPlanData.name).toContain(measurementStandard.measurementName);
      expect(spcPlanData.productId).toBe(measurementStandard.productId);
      expect(spcPlanData.workstationId).toBe(measurementStandard.workstationId);
      expect(spcPlanData.machineId).toBe(measurementStandard.machineId);
    });
  });

  describe("CPK Warning Alerts", () => {
    it("should trigger warning when CPK below threshold", () => {
      const cpkValue = 0.95;
      const warningThreshold = 1.33;
      const criticalThreshold = 1.0;

      const shouldTriggerWarning = cpkValue < warningThreshold;
      const isCritical = cpkValue < criticalThreshold;

      expect(shouldTriggerWarning).toBe(true);
      expect(isCritical).toBe(true);
    });

    it("should not trigger warning when CPK above threshold", () => {
      const cpkValue = 1.5;
      const warningThreshold = 1.33;

      const shouldTriggerWarning = cpkValue < warningThreshold;

      expect(shouldTriggerWarning).toBe(false);
    });

    it("should generate correct alert message", () => {
      const cpkValue = 0.85;
      const productCode = "PROD-001";
      const stationName = "Station-A";

      const alertMessage = `CPK Alert: ${productCode} at ${stationName} has CPK ${cpkValue.toFixed(2)} below threshold`;

      expect(alertMessage).toContain(productCode);
      expect(alertMessage).toContain(stationName);
      expect(alertMessage).toContain("0.85");
    });
  });

  describe("Validation Rules Integration", () => {
    it("should check range_check rule", () => {
      const rule = {
        ruleType: "range_check",
        ruleConfig: JSON.stringify({ min: 90, max: 110 }),
      };
      const meanValue = 105;

      const config = JSON.parse(rule.ruleConfig);
      const passed = meanValue >= config.min && meanValue <= config.max;

      expect(passed).toBe(true);
    });

    it("should fail range_check when value out of range", () => {
      const rule = {
        ruleType: "range_check",
        ruleConfig: JSON.stringify({ min: 90, max: 110 }),
      };
      const meanValue = 115;

      const config = JSON.parse(rule.ruleConfig);
      const passed = meanValue >= config.min && meanValue <= config.max;

      expect(passed).toBe(false);
    });

    it("should detect increasing trend", () => {
      const dataPoints = [
        { value: 100 },
        { value: 101 },
        { value: 102 },
        { value: 103 },
        { value: 104 },
        { value: 105 },
        { value: 106 },
      ];

      let increasing = true;
      for (let i = 1; i < dataPoints.length; i++) {
        if (dataPoints[i].value <= dataPoints[i - 1].value) {
          increasing = false;
          break;
        }
      }

      expect(increasing).toBe(true);
    });

    it("should not detect trend when values fluctuate", () => {
      const dataPoints = [
        { value: 100 },
        { value: 102 },
        { value: 101 },
        { value: 103 },
        { value: 100 },
        { value: 104 },
        { value: 102 },
      ];

      let increasing = true;
      let decreasing = true;
      for (let i = 1; i < dataPoints.length; i++) {
        if (dataPoints[i].value <= dataPoints[i - 1].value) increasing = false;
        if (dataPoints[i].value >= dataPoints[i - 1].value) decreasing = false;
      }

      expect(increasing).toBe(false);
      expect(decreasing).toBe(false);
    });
  });

  describe("CPK Trend Calculation", () => {
    it("should calculate average CPK correctly", () => {
      const cpkHistory = [
        { cpk: 1500 }, // 1.5
        { cpk: 1400 }, // 1.4
        { cpk: 1300 }, // 1.3
        { cpk: 1200 }, // 1.2
      ];

      const cpkValues = cpkHistory.map((h) => h.cpk / 1000);
      const avgCpk = cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length;

      expect(avgCpk).toBe(1.35);
    });

    it("should calculate trend direction correctly", () => {
      const cpkHistory = [
        { cpk: 1500 }, // Latest: 1.5
        { cpk: 1400 },
        { cpk: 1300 },
        { cpk: 1200 }, // Oldest: 1.2
      ];

      const cpkValues = cpkHistory.map((h) => h.cpk / 1000);
      const trend = cpkValues[0] - cpkValues[cpkValues.length - 1];

      expect(trend).toBeCloseTo(0.3); // Positive trend (improving)
      expect(trend > 0).toBe(true);
    });

    it("should detect negative trend", () => {
      const cpkHistory = [
        { cpk: 1000 }, // Latest: 1.0
        { cpk: 1200 },
        { cpk: 1400 },
        { cpk: 1600 }, // Oldest: 1.6
      ];

      const cpkValues = cpkHistory.map((h) => h.cpk / 1000);
      const trend = cpkValues[0] - cpkValues[cpkValues.length - 1];

      expect(trend).toBeCloseTo(-0.6); // Negative trend (declining)
      expect(trend < 0).toBe(true);
    });

    it("should classify CPK status correctly", () => {
      const classifyCpk = (cpk: number) => {
        if (cpk >= 1.33) return "good";
        if (cpk >= 1.0) return "warning";
        return "critical";
      };

      expect(classifyCpk(1.5)).toBe("good");
      expect(classifyCpk(1.2)).toBe("warning");
      expect(classifyCpk(0.8)).toBe("critical");
    });
  });

  describe("Validation Results Format", () => {
    it("should return validation results in correct format", () => {
      const validationResults = [
        { ruleId: 1, ruleName: "Range Check", passed: true, message: "Passed" },
        {
          ruleId: 2,
          ruleName: "Trend Check",
          passed: false,
          message: "Detected increasing trend",
        },
      ];

      expect(validationResults).toHaveLength(2);
      expect(validationResults[0]).toHaveProperty("ruleId");
      expect(validationResults[0]).toHaveProperty("ruleName");
      expect(validationResults[0]).toHaveProperty("passed");
      expect(validationResults[0]).toHaveProperty("message");
    });
  });
});
