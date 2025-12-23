import { describe, it, expect } from "vitest";
import {
  getShiftFromHour,
  getShiftTimeRange,
  getDayTimeRange,
  getWeekTimeRange,
  getMonthTimeRange,
  SHIFT_DEFINITIONS,
  calculateStatistics,
  determineOverallStatus,
} from "./spcAggregationService";

describe("SPC Aggregation Service", () => {
  describe("getShiftFromHour", () => {
    it("should return morning shift for hours 6-13", () => {
      expect(getShiftFromHour(6)).toBe("morning");
      expect(getShiftFromHour(10)).toBe("morning");
      expect(getShiftFromHour(13)).toBe("morning");
    });

    it("should return afternoon shift for hours 14-21", () => {
      expect(getShiftFromHour(14)).toBe("afternoon");
      expect(getShiftFromHour(18)).toBe("afternoon");
      expect(getShiftFromHour(21)).toBe("afternoon");
    });

    it("should return night shift for hours 22-5", () => {
      expect(getShiftFromHour(22)).toBe("night");
      expect(getShiftFromHour(23)).toBe("night");
      expect(getShiftFromHour(0)).toBe("night");
      expect(getShiftFromHour(3)).toBe("night");
      expect(getShiftFromHour(5)).toBe("night");
    });
  });

  describe("getShiftTimeRange", () => {
    it("should return correct time range for morning shift", () => {
      const date = new Date("2024-01-15T10:00:00");
      const range = getShiftTimeRange(date, "morning");
      
      expect(range.start.getHours()).toBe(6);
      expect(range.end.getHours()).toBe(14);
      expect(range.start.getDate()).toBe(range.end.getDate());
    });

    it("should return correct time range for afternoon shift", () => {
      const date = new Date("2024-01-15T18:00:00");
      const range = getShiftTimeRange(date, "afternoon");
      
      expect(range.start.getHours()).toBe(14);
      expect(range.end.getHours()).toBe(22);
    });

    it("should return correct time range for night shift (crosses midnight)", () => {
      const date = new Date("2024-01-15T23:00:00");
      const range = getShiftTimeRange(date, "night");
      
      expect(range.start.getHours()).toBe(22);
      expect(range.end.getHours()).toBe(6);
      expect(range.end.getDate()).toBe(range.start.getDate() + 1);
    });
  });

  describe("getDayTimeRange", () => {
    it("should return correct time range for a day", () => {
      const date = new Date("2024-01-15T10:30:00");
      const range = getDayTimeRange(date);
      
      expect(range.start.getHours()).toBe(0);
      expect(range.start.getMinutes()).toBe(0);
      expect(range.end.getHours()).toBe(23);
      expect(range.end.getMinutes()).toBe(59);
      expect(range.start.getDate()).toBe(15);
      expect(range.end.getDate()).toBe(15);
    });
  });

  describe("getWeekTimeRange", () => {
    it("should return Monday to Sunday range", () => {
      // Wednesday Jan 17, 2024
      const date = new Date("2024-01-17T10:00:00");
      const range = getWeekTimeRange(date);
      
      // Should start on Monday Jan 15
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.start.getDate()).toBe(15);
      
      // Should end on Sunday Jan 21
      expect(range.end.getDay()).toBe(0); // Sunday
      expect(range.end.getDate()).toBe(21);
    });

    it("should handle Sunday correctly", () => {
      // Sunday Jan 21, 2024
      const date = new Date("2024-01-21T10:00:00");
      const range = getWeekTimeRange(date);
      
      // Should start on Monday Jan 15
      expect(range.start.getDay()).toBe(1);
      expect(range.start.getDate()).toBe(15);
    });
  });

  describe("getMonthTimeRange", () => {
    it("should return first to last day of month", () => {
      const date = new Date("2024-01-15T10:00:00");
      const range = getMonthTimeRange(date);
      
      expect(range.start.getDate()).toBe(1);
      expect(range.start.getMonth()).toBe(0); // January
      expect(range.end.getDate()).toBe(31);
      expect(range.end.getMonth()).toBe(0);
    });

    it("should handle February correctly", () => {
      // 2024 is a leap year
      const date = new Date("2024-02-15T10:00:00");
      const range = getMonthTimeRange(date);
      
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getDate()).toBe(29); // Leap year
    });
  });

  describe("SHIFT_DEFINITIONS", () => {
    it("should have correct shift definitions", () => {
      expect(SHIFT_DEFINITIONS.morning.name).toBe("Ca sáng");
      expect(SHIFT_DEFINITIONS.morning.startHour).toBe(6);
      expect(SHIFT_DEFINITIONS.morning.endHour).toBe(14);

      expect(SHIFT_DEFINITIONS.afternoon.name).toBe("Ca chiều");
      expect(SHIFT_DEFINITIONS.afternoon.startHour).toBe(14);
      expect(SHIFT_DEFINITIONS.afternoon.endHour).toBe(22);

      expect(SHIFT_DEFINITIONS.night.name).toBe("Ca đêm");
      expect(SHIFT_DEFINITIONS.night.startHour).toBe(22);
      expect(SHIFT_DEFINITIONS.night.endHour).toBe(6);
    });
  });

  describe("calculateStatistics", () => {
    it("should calculate correct statistics for valid data", () => {
      const values = [10, 20, 30, 40, 50];
      const stats = calculateStatistics(values);
      
      expect(stats.mean).toBe(30);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.range).toBe(40);
      expect(stats.stdDev).toBeCloseTo(15.81, 1);
    });

    it("should return null values for empty array", () => {
      const stats = calculateStatistics([]);
      
      expect(stats.mean).toBeNull();
      expect(stats.stdDev).toBeNull();
      expect(stats.min).toBeNull();
      expect(stats.max).toBeNull();
      expect(stats.range).toBeNull();
    });

    it("should handle single value", () => {
      const stats = calculateStatistics([100]);
      
      expect(stats.mean).toBe(100);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(100);
      expect(stats.range).toBe(0);
    });
  });

  describe("determineOverallStatus", () => {
    it("should return excellent for CPK >= 1.67", () => {
      expect(determineOverallStatus(1.67)).toBe("excellent");
      expect(determineOverallStatus(2.0)).toBe("excellent");
    });

    it("should return good for CPK >= 1.33 and < 1.67", () => {
      expect(determineOverallStatus(1.33)).toBe("good");
      expect(determineOverallStatus(1.5)).toBe("good");
    });

    it("should return acceptable for CPK >= 1.0 and < 1.33", () => {
      expect(determineOverallStatus(1.0)).toBe("acceptable");
      expect(determineOverallStatus(1.2)).toBe("acceptable");
    });

    it("should return needs_improvement for CPK >= 0.67 and < 1.0", () => {
      expect(determineOverallStatus(0.67)).toBe("needs_improvement");
      expect(determineOverallStatus(0.8)).toBe("needs_improvement");
    });

    it("should return critical for CPK < 0.67", () => {
      expect(determineOverallStatus(0.5)).toBe("critical");
      expect(determineOverallStatus(0.0)).toBe("critical");
    });

    it("should return needs_improvement for null CPK", () => {
      expect(determineOverallStatus(null)).toBe("needs_improvement");
    });
  });
});
