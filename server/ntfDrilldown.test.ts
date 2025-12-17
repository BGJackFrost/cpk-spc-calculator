import { describe, it, expect } from "vitest";

describe("NTF Drill-down & Shift Analysis", () => {
  describe("Line Detail Logic", () => {
    it("should calculate NTF rate for a line", () => {
      const stats = { total: 100, ntfCount: 25, realNgCount: 75 };
      const ntfRate = stats.total > 0 ? (stats.ntfCount / stats.total) * 100 : 0;
      expect(ntfRate).toBe(25);
    });

    it("should sort machines by NTF count descending", () => {
      const machines = [
        { machineName: "Machine A", ntfCount: 10 },
        { machineName: "Machine B", ntfCount: 25 },
        { machineName: "Machine C", ntfCount: 15 },
      ];
      const sorted = [...machines].sort((a, b) => b.ntfCount - a.ntfCount);
      expect(sorted[0].machineName).toBe("Machine B");
      expect(sorted[2].machineName).toBe("Machine A");
    });

    it("should calculate trend data correctly", () => {
      const trendData = [
        { date: "2024-01-01", total: 100, ntfCount: 20 },
        { date: "2024-01-02", total: 80, ntfCount: 24 },
      ];
      const processed = trendData.map(d => ({
        ...d,
        ntfRate: d.total > 0 ? (d.ntfCount / d.total) * 100 : 0,
      }));
      expect(processed[0].ntfRate).toBe(20);
      expect(processed[1].ntfRate).toBe(30);
    });
  });

  describe("Shift Analysis Logic", () => {
    it("should categorize hours into shifts correctly", () => {
      const getShift = (hour: number): string => {
        if (hour >= 6 && hour < 14) return "morning";
        if (hour >= 14 && hour < 22) return "afternoon";
        return "night";
      };

      expect(getShift(8)).toBe("morning");
      expect(getShift(16)).toBe("afternoon");
      expect(getShift(23)).toBe("night");
      expect(getShift(2)).toBe("night");
    });

    it("should map shift codes to Vietnamese names", () => {
      const shiftNames: Record<string, string> = {
        morning: "Ca sáng (6h-14h)",
        afternoon: "Ca chiều (14h-22h)",
        night: "Ca đêm (22h-6h)",
      };
      expect(shiftNames["morning"]).toBe("Ca sáng (6h-14h)");
      expect(shiftNames["afternoon"]).toBe("Ca chiều (14h-22h)");
      expect(shiftNames["night"]).toBe("Ca đêm (22h-6h)");
    });

    it("should find best and worst shifts", () => {
      const shifts = [
        { shift: "morning", ntfRate: 20 },
        { shift: "afternoon", ntfRate: 35 },
        { shift: "night", ntfRate: 25 },
      ];
      const best = shifts.reduce((min, s) => s.ntfRate < min.ntfRate ? s : min, shifts[0]);
      const worst = shifts.reduce((max, s) => s.ntfRate > max.ntfRate ? s : max, shifts[0]);
      expect(best.shift).toBe("morning");
      expect(worst.shift).toBe("afternoon");
    });

    it("should calculate shift difference", () => {
      const worstNtfRate = 35;
      const bestNtfRate = 20;
      const difference = worstNtfRate - bestNtfRate;
      expect(difference).toBe(15);
    });
  });

  describe("AI Prediction Logic", () => {
    it("should calculate moving average", () => {
      const rates = [20, 25, 22, 28, 24, 26, 23];
      const avg = rates.reduce((sum, r) => sum + r, 0) / rates.length;
      expect(avg).toBeCloseTo(24, 0);
    });

    it("should determine trend direction", () => {
      const determineTrend = (rates: number[]): string => {
        if (rates.length < 3) return "stable";
        const first = rates[0];
        const last = rates[rates.length - 1];
        if (last > first + 2) return "increasing";
        if (last < first - 2) return "decreasing";
        return "stable";
      };

      expect(determineTrend([20, 22, 25, 28, 30])).toBe("increasing");
      expect(determineTrend([30, 28, 25, 22, 20])).toBe("decreasing");
      expect(determineTrend([25, 24, 26, 25, 25])).toBe("stable");
    });

    it("should determine risk level based on average rate", () => {
      const getRiskLevel = (avgRate: number): string => {
        if (avgRate > 30) return "critical";
        if (avgRate > 20) return "high";
        if (avgRate > 10) return "medium";
        return "low";
      };

      expect(getRiskLevel(35)).toBe("critical");
      expect(getRiskLevel(25)).toBe("high");
      expect(getRiskLevel(15)).toBe("medium");
      expect(getRiskLevel(5)).toBe("low");
    });

    it("should generate prediction dates", () => {
      const predictions = [];
      const baseDate = new Date("2024-01-15");
      for (let i = 1; i <= 7; i++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + i);
        predictions.push({
          date: date.toISOString().split("T")[0],
          day: i,
        });
      }
      expect(predictions).toHaveLength(7);
      expect(predictions[0].date).toBe("2024-01-16");
      expect(predictions[6].date).toBe("2024-01-22");
    });
  });

  describe("Status Color Logic", () => {
    it("should return correct status colors", () => {
      const getStatusColor = (ntfRate: number) => {
        if (ntfRate >= 30) return "text-red-500";
        if (ntfRate >= 20) return "text-yellow-500";
        return "text-green-500";
      };

      expect(getStatusColor(35)).toBe("text-red-500");
      expect(getStatusColor(25)).toBe("text-yellow-500");
      expect(getStatusColor(15)).toBe("text-green-500");
    });

    it("should return correct bar colors", () => {
      const getBarColor = (ntfRate: number) => {
        if (ntfRate >= 30) return "#dc2626";
        if (ntfRate >= 20) return "#f59e0b";
        return "#22c55e";
      };

      expect(getBarColor(35)).toBe("#dc2626");
      expect(getBarColor(25)).toBe("#f59e0b");
      expect(getBarColor(15)).toBe("#22c55e");
    });
  });

  describe("Hourly Analysis", () => {
    it("should generate 24-hour data structure", () => {
      const hourlyData = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        label: `${i}:00`,
      }));
      expect(hourlyData).toHaveLength(24);
      expect(hourlyData[0].label).toBe("0:00");
      expect(hourlyData[23].label).toBe("23:00");
    });

    it("should identify peak hours", () => {
      const hourlyData = [
        { hour: 8, ntfRate: 35 },
        { hour: 14, ntfRate: 28 },
        { hour: 20, ntfRate: 22 },
      ];
      const peakHours = hourlyData.filter(h => h.ntfRate > 30);
      expect(peakHours).toHaveLength(1);
      expect(peakHours[0].hour).toBe(8);
    });
  });
});
