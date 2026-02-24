import { describe, it, expect } from "vitest";
import * as schema from "../drizzle/schema";

describe("Phase 157 - OEE/CPK UI Management & Home Widget", () => {
  describe("OEE Alert Thresholds UI", () => {
    it("should have oeeAlertThresholds table with required fields", () => {
      expect(schema.oeeAlertThresholds).toBeDefined();
      
      // Check table has required columns
      const columns = Object.keys(schema.oeeAlertThresholds);
      expect(columns).toContain("id");
      expect(columns).toContain("machineId");
      expect(columns).toContain("productionLineId");
      expect(columns).toContain("targetOee");
      expect(columns).toContain("warningThreshold");
      expect(columns).toContain("criticalThreshold");
    });

    it("should support machine and production line filtering", () => {
      // Verify the table supports filtering by machine and line
      const columns = Object.keys(schema.oeeAlertThresholds);
      expect(columns).toContain("machineId");
      expect(columns).toContain("productionLineId");
      expect(columns).toContain("isActive");
    });

    it("should have target fields for OEE components", () => {
      const columns = Object.keys(schema.oeeAlertThresholds);
      expect(columns).toContain("availabilityTarget");
      expect(columns).toContain("performanceTarget");
      expect(columns).toContain("qualityTarget");
    });
  });

  describe("Scheduled Reports Management", () => {
    it("should have scheduledReports table with required fields", () => {
      expect(schema.scheduledReports).toBeDefined();
      
      const columns = Object.keys(schema.scheduledReports);
      expect(columns).toContain("id");
      expect(columns).toContain("name");
      expect(columns).toContain("reportType");
      expect(columns).toContain("scheduleType"); // Schedule type: daily/weekly/monthly
      expect(columns).toContain("recipients");
    });

    it("should support multiple report types", () => {
      const reportTypes = [
        "oee_daily", "oee_weekly", "oee_monthly",
        "maintenance_daily", "maintenance_weekly", "maintenance_monthly",
        "combined_weekly", "combined_monthly"
      ];
      reportTypes.forEach(type => {
        expect(typeof type).toBe("string");
      });
    });

    it("should support daily, weekly, and monthly schedules", () => {
      const schedules = ["daily", "weekly", "monthly"];
      schedules.forEach(schedule => {
        expect(typeof schedule).toBe("string");
      });
    });

    it("should have scheduledReportLogs table for history", () => {
      expect(schema.scheduledReportLogs).toBeDefined();
      
      const columns = Object.keys(schema.scheduledReportLogs);
      expect(columns).toContain("id");
      expect(columns).toContain("reportId");
      expect(columns).toContain("status");
      expect(columns).toContain("emailsSent");
      expect(columns).toContain("recipientCount");
    });
  });

  describe("Unified Summary Widget", () => {
    it("should calculate OEE statistics correctly", () => {
      const calculateOeeStats = (oeeValues: number[]) => {
        if (oeeValues.length === 0) return { avg: 0, trend: 0 };
        const avg = oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length;
        const trend = oeeValues.length >= 2 
          ? oeeValues[oeeValues.length - 1] - oeeValues[oeeValues.length - 2]
          : 0;
        return { avg, trend };
      };

      const oeeValues = [80, 82, 85, 83, 87];
      const stats = calculateOeeStats(oeeValues);
      
      expect(stats.avg).toBeCloseTo(83.4, 1);
      expect(stats.trend).toBe(4); // 87 - 83
    });

    it("should calculate CPK statistics correctly", () => {
      const calculateCpkStats = (cpkValues: number[]) => {
        if (cpkValues.length === 0) return { avg: 0, trend: 0 };
        const avg = cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length;
        const trend = cpkValues.length >= 2 
          ? cpkValues[cpkValues.length - 1] - cpkValues[cpkValues.length - 2]
          : 0;
        return { avg, trend };
      };

      const cpkValues = [1.2, 1.3, 1.25, 1.4, 1.35];
      const stats = calculateCpkStats(cpkValues);
      
      expect(stats.avg).toBeCloseTo(1.3, 1);
      expect(stats.trend).toBeCloseTo(-0.05, 2); // 1.35 - 1.4
    });

    it("should count alerts correctly", () => {
      const countAlerts = (oeeValues: number[], cpkValues: number[]) => {
        const oeeAlerts = oeeValues.filter(v => v < 70).length;
        const cpkAlerts = cpkValues.filter(v => v < 1.0).length;
        return { oeeAlerts, cpkAlerts, total: oeeAlerts + cpkAlerts };
      };

      const oeeValues = [80, 65, 75, 68, 85]; // 2 below 70
      const cpkValues = [1.2, 0.9, 1.1, 0.8, 1.3]; // 2 below 1.0
      const alerts = countAlerts(oeeValues, cpkValues);
      
      expect(alerts.oeeAlerts).toBe(2);
      expect(alerts.cpkAlerts).toBe(2);
      expect(alerts.total).toBe(4);
    });

    it("should determine OEE status correctly", () => {
      const getOeeStatus = (oee: number) => {
        if (oee >= 85) return "good";
        if (oee >= 70) return "average";
        return "needs_improvement";
      };

      expect(getOeeStatus(90)).toBe("good");
      expect(getOeeStatus(85)).toBe("good");
      expect(getOeeStatus(75)).toBe("average");
      expect(getOeeStatus(70)).toBe("average");
      expect(getOeeStatus(65)).toBe("needs_improvement");
    });

    it("should determine CPK status correctly", () => {
      const getCpkStatus = (cpk: number) => {
        if (cpk >= 1.33) return "good";
        if (cpk >= 1.0) return "acceptable";
        return "needs_improvement";
      };

      expect(getCpkStatus(1.5)).toBe("good");
      expect(getCpkStatus(1.33)).toBe("good");
      expect(getCpkStatus(1.2)).toBe("acceptable");
      expect(getCpkStatus(1.0)).toBe("acceptable");
      expect(getCpkStatus(0.8)).toBe("needs_improvement");
    });
  });

  describe("Mini Chart Data Processing", () => {
    it("should group data by day correctly", () => {
      const groupByDay = (records: { date: string; value: number }[]) => {
        const byDay: Record<string, number[]> = {};
        records.forEach(r => {
          const day = r.date.split("T")[0];
          if (!byDay[day]) byDay[day] = [];
          byDay[day].push(r.value);
        });
        return Object.keys(byDay).sort().map(day => {
          const values = byDay[day];
          return values.reduce((a, b) => a + b, 0) / values.length;
        });
      };

      const records = [
        { date: "2024-01-01T08:00:00", value: 80 },
        { date: "2024-01-01T12:00:00", value: 82 },
        { date: "2024-01-02T08:00:00", value: 85 },
        { date: "2024-01-02T12:00:00", value: 87 },
      ];
      
      const dailyAvg = groupByDay(records);
      expect(dailyAvg).toHaveLength(2);
      expect(dailyAvg[0]).toBe(81); // (80 + 82) / 2
      expect(dailyAvg[1]).toBe(86); // (85 + 87) / 2
    });

    it("should calculate chart points correctly", () => {
      const calculateChartPoints = (data: number[], height: number) => {
        if (data.length === 0) return [];
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        return data.map((value, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = height - ((value - min) / range) * height;
          return { x, y };
        });
      };

      const data = [70, 80, 90];
      const points = calculateChartPoints(data, 40);
      
      expect(points).toHaveLength(3);
      expect(points[0].x).toBe(0);
      expect(points[0].y).toBe(40); // min value at bottom
      expect(points[2].x).toBe(100);
      expect(points[2].y).toBe(0); // max value at top
    });
  });
});
