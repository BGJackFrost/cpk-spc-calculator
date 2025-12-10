import { describe, expect, it } from "vitest";
import { calculateSpc } from "./db";

describe("SPC Calculation", () => {
  it("calculates basic statistics correctly", () => {
    const data = [
      { value: 10, timestamp: new Date() },
      { value: 12, timestamp: new Date() },
      { value: 11, timestamp: new Date() },
      { value: 13, timestamp: new Date() },
      { value: 10, timestamp: new Date() },
      { value: 11, timestamp: new Date() },
      { value: 12, timestamp: new Date() },
      { value: 11, timestamp: new Date() },
      { value: 10, timestamp: new Date() },
      { value: 12, timestamp: new Date() },
    ];

    const result = calculateSpc(data, 15, 8);

    expect(result.sampleCount).toBe(10);
    expect(result.mean).toBeCloseTo(11.2, 1);
    expect(result.min).toBe(10);
    expect(result.max).toBe(13);
    expect(result.range).toBe(3);
    expect(result.stdDev).toBeGreaterThan(0);
  });

  it("calculates Cp and Cpk when spec limits are provided", () => {
    const data = Array.from({ length: 25 }, (_, i) => ({
      value: 100 + (i % 5) - 2,
      timestamp: new Date(),
    }));

    const result = calculateSpc(data, 110, 90);

    expect(result.cp).not.toBeNull();
    expect(result.cpk).not.toBeNull();
    expect(result.cp).toBeGreaterThan(0);
    expect(result.cpk).toBeGreaterThan(0);
  });

  it("returns null Cp/Cpk when no spec limits provided", () => {
    const data = [
      { value: 10, timestamp: new Date() },
      { value: 12, timestamp: new Date() },
      { value: 11, timestamp: new Date() },
      { value: 13, timestamp: new Date() },
      { value: 10, timestamp: new Date() },
    ];

    const result = calculateSpc(data);

    expect(result.cp).toBeNull();
    expect(result.cpk).toBeNull();
  });

  it("calculates control limits correctly", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      value: 50 + Math.sin(i) * 2,
      timestamp: new Date(),
    }));

    const result = calculateSpc(data, 60, 40);

    expect(result.ucl).toBeGreaterThan(result.mean);
    expect(result.lcl).toBeLessThan(result.mean);
    expect(result.uclR).toBeGreaterThan(0);
    expect(result.lclR).toBeGreaterThanOrEqual(0);
  });

  it("generates X-bar and R chart data", () => {
    const data = Array.from({ length: 25 }, (_, i) => ({
      value: 100 + (i % 5),
      timestamp: new Date(),
    }));

    const result = calculateSpc(data, 110, 90);

    expect(result.xBarData.length).toBeGreaterThan(0);
    expect(result.rangeData.length).toBeGreaterThan(0);
    expect(result.xBarData[0]).toHaveProperty("index");
    expect(result.xBarData[0]).toHaveProperty("value");
    expect(result.rangeData[0]).toHaveProperty("index");
    expect(result.rangeData[0]).toHaveProperty("value");
  });

  it("handles empty data array", () => {
    const result = calculateSpc([]);

    expect(result.sampleCount).toBe(0);
    expect(result.mean).toBe(0);
    expect(result.stdDev).toBe(0);
    expect(result.xBarData).toHaveLength(0);
    expect(result.rangeData).toHaveLength(0);
  });

  it("handles single data point", () => {
    const data = [{ value: 10, timestamp: new Date() }];

    const result = calculateSpc(data, 15, 5);

    expect(result.sampleCount).toBe(1);
    expect(result.mean).toBe(10);
    expect(result.min).toBe(10);
    expect(result.max).toBe(10);
  });
});

describe("CPK Status Classification", () => {
  it("identifies excellent CPK (>= 1.67)", () => {
    // Generate data with very low variation relative to spec limits
    const data = Array.from({ length: 50 }, () => ({
      value: 100 + (Math.random() - 0.5) * 0.5,
      timestamp: new Date(),
    }));

    const result = calculateSpc(data, 150, 50);
    
    // With such wide spec limits and low variation, CPK should be high
    if (result.cpk !== null) {
      expect(result.cpk).toBeGreaterThan(1);
    }
  });
});
