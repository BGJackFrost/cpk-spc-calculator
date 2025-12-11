import { describe, expect, it } from "vitest";
import { 
  calculateSpcMetrics, 
  detectSpcViolations, 
  createSubgroups,
  getStatusFromCpk,
  SubgroupData
} from "./spcRealtimeService";

describe("SPC Realtime Service", () => {
  describe("createSubgroups", () => {
    it("should create subgroups from values array", () => {
      const values = [10, 12, 11, 13, 14, 15, 16, 17, 18, 19];
      const subgroups = createSubgroups(values, 5);
      
      expect(subgroups).toHaveLength(2);
      expect(subgroups[0].values).toEqual([10, 12, 11, 13, 14]);
      expect(subgroups[1].values).toEqual([15, 16, 17, 18, 19]);
    });

    it("should calculate mean and range for each subgroup", () => {
      const values = [10, 12, 11, 13, 14];
      const subgroups = createSubgroups(values, 5);
      
      expect(subgroups[0].mean).toBe(12); // (10+12+11+13+14)/5 = 12
      expect(subgroups[0].range).toBe(4); // 14 - 10 = 4
    });

    it("should ignore incomplete subgroups", () => {
      const values = [10, 12, 11, 13, 14, 15, 16];
      const subgroups = createSubgroups(values, 5);
      
      expect(subgroups).toHaveLength(1); // Only first complete subgroup
    });
  });

  describe("calculateSpcMetrics", () => {
    it("should return empty result for empty subgroups", () => {
      const result = calculateSpcMetrics([], null, null, null);
      
      expect(result.mean).toBe(0);
      expect(result.stdDev).toBe(0);
      expect(result.cp).toBeNull();
      expect(result.cpk).toBeNull();
    });

    it("should calculate basic statistics correctly", () => {
      const subgroups: SubgroupData[] = [
        { index: 0, values: [10, 11, 12, 13, 14], mean: 12, range: 4, timestamp: new Date() },
        { index: 1, values: [11, 12, 13, 14, 15], mean: 13, range: 4, timestamp: new Date() },
        { index: 2, values: [12, 13, 14, 15, 16], mean: 14, range: 4, timestamp: new Date() },
      ];
      
      const result = calculateSpcMetrics(subgroups, null, null, null);
      
      expect(result.mean).toBe(13); // (12+13+14)/3 = 13
      expect(result.range).toBe(4); // Average range
    });

    it("should calculate Cp and Cpk when USL/LSL provided", () => {
      const subgroups: SubgroupData[] = [
        { index: 0, values: [10, 11, 12, 13, 14], mean: 12, range: 4, timestamp: new Date() },
        { index: 1, values: [11, 12, 13, 14, 15], mean: 13, range: 4, timestamp: new Date() },
        { index: 2, values: [12, 13, 14, 15, 16], mean: 14, range: 4, timestamp: new Date() },
      ];
      
      const result = calculateSpcMetrics(subgroups, 20, 5, null);
      
      expect(result.cp).not.toBeNull();
      expect(result.cpk).not.toBeNull();
      expect(result.cp).toBeGreaterThan(0);
      expect(result.cpk).toBeGreaterThan(0);
    });

    it("should calculate Pp and Ppk (process performance)", () => {
      const subgroups: SubgroupData[] = [
        { index: 0, values: [10, 11, 12, 13, 14], mean: 12, range: 4, timestamp: new Date() },
        { index: 1, values: [11, 12, 13, 14, 15], mean: 13, range: 4, timestamp: new Date() },
        { index: 2, values: [12, 13, 14, 15, 16], mean: 14, range: 4, timestamp: new Date() },
      ];
      
      const result = calculateSpcMetrics(subgroups, 20, 5, null);
      
      expect(result.pp).not.toBeNull();
      expect(result.ppk).not.toBeNull();
    });

    it("should calculate Ca (capability accuracy)", () => {
      const subgroups: SubgroupData[] = [
        { index: 0, values: [10, 11, 12, 13, 14], mean: 12, range: 4, timestamp: new Date() },
        { index: 1, values: [11, 12, 13, 14, 15], mean: 13, range: 4, timestamp: new Date() },
      ];
      
      const result = calculateSpcMetrics(subgroups, 20, 5, 12.5);
      
      expect(result.ca).not.toBeNull();
    });
  });

  describe("detectSpcViolations", () => {
    it("should detect Rule 1: point beyond 3 sigma", () => {
      const subgroups: SubgroupData[] = [
        { index: 0, values: [10], mean: 10, range: 0, timestamp: new Date() },
        { index: 1, values: [12], mean: 12, range: 0, timestamp: new Date() },
        { index: 2, values: [50], mean: 50, range: 0, timestamp: new Date() }, // Beyond UCL
      ];
      
      const xBar = 12;
      const sigma = 2;
      const ucl = xBar + 3 * sigma; // 18
      const lcl = xBar - 3 * sigma; // 6
      
      const violations = detectSpcViolations(subgroups, xBar, sigma, ucl, lcl, null, null);
      
      const rule1Violations = violations.filter(v => v.ruleNumber === 1);
      expect(rule1Violations.length).toBeGreaterThan(0);
      expect(rule1Violations[0].severity).toBe("critical");
    });

    it("should detect violation when value exceeds USL", () => {
      const subgroups: SubgroupData[] = [
        { index: 0, values: [10], mean: 10, range: 0, timestamp: new Date() },
        { index: 1, values: [25], mean: 25, range: 0, timestamp: new Date() }, // Beyond USL
      ];
      
      const violations = detectSpcViolations(subgroups, 12, 2, 18, 6, 20, 5);
      
      const uslViolations = violations.filter(v => v.ruleNumber === 9);
      expect(uslViolations.length).toBeGreaterThan(0);
    });

    it("should detect violation when value below LSL", () => {
      const subgroups: SubgroupData[] = [
        { index: 0, values: [10], mean: 10, range: 0, timestamp: new Date() },
        { index: 1, values: [3], mean: 3, range: 0, timestamp: new Date() }, // Below LSL
      ];
      
      const violations = detectSpcViolations(subgroups, 12, 2, 18, 6, 20, 5);
      
      const lslViolations = violations.filter(v => v.ruleNumber === 10);
      expect(lslViolations.length).toBeGreaterThan(0);
    });
  });

  describe("getStatusFromCpk", () => {
    it("should return excellent for CPK >= 1.67", () => {
      expect(getStatusFromCpk(1.67)).toBe("excellent");
      expect(getStatusFromCpk(2.0)).toBe("excellent");
    });

    it("should return good for 1.33 <= CPK < 1.67", () => {
      expect(getStatusFromCpk(1.33)).toBe("good");
      expect(getStatusFromCpk(1.5)).toBe("good");
    });

    it("should return acceptable for 1.0 <= CPK < 1.33", () => {
      expect(getStatusFromCpk(1.0)).toBe("acceptable");
      expect(getStatusFromCpk(1.2)).toBe("acceptable");
    });

    it("should return needs_improvement for 0.67 <= CPK < 1.0", () => {
      expect(getStatusFromCpk(0.67)).toBe("needs_improvement");
      expect(getStatusFromCpk(0.9)).toBe("needs_improvement");
    });

    it("should return critical for CPK < 0.67", () => {
      expect(getStatusFromCpk(0.5)).toBe("critical");
      expect(getStatusFromCpk(0.3)).toBe("critical");
    });

    it("should return good for null CPK", () => {
      expect(getStatusFromCpk(null)).toBe("good");
    });
  });
});
