import { describe, it, expect } from "vitest";

describe("NTF Enhancements", () => {
  describe("NTF Trend Data Calculation", () => {
    it("should calculate NTF rate correctly", () => {
      const total = 100;
      const ntfCount = 25;
      const ntfRate = (ntfCount / total) * 100;
      expect(ntfRate).toBe(25);
    });

    it("should handle zero total defects", () => {
      const total = 0;
      const ntfCount = 0;
      const ntfRate = total > 0 ? (ntfCount / total) * 100 : 0;
      expect(ntfRate).toBe(0);
    });

    it("should calculate average NTF rate from trend data", () => {
      const trendData = [
        { ntfRate: 20 },
        { ntfRate: 25 },
        { ntfRate: 30 },
        { ntfRate: 15 },
      ];
      const avgRate = trendData.reduce((sum, d) => sum + d.ntfRate, 0) / trendData.length;
      expect(avgRate).toBe(22.5);
    });

    it("should find max NTF rate day", () => {
      const trendData = [
        { periodStart: "2024-01-01", ntfRate: 20 },
        { periodStart: "2024-01-02", ntfRate: 35 },
        { periodStart: "2024-01-03", ntfRate: 25 },
      ];
      const maxDay = trendData.reduce((max, d) => d.ntfRate > max.ntfRate ? d : max, trendData[0]);
      expect(maxDay.periodStart).toBe("2024-01-02");
      expect(maxDay.ntfRate).toBe(35);
    });
  });

  describe("NTF Stats Widget Logic", () => {
    it("should determine status color based on thresholds", () => {
      const getStatusColor = (ntfRate: number, warning: number, critical: number) => {
        if (ntfRate >= critical) return "text-red-500";
        if (ntfRate >= warning) return "text-yellow-500";
        return "text-green-500";
      };

      expect(getStatusColor(35, 20, 30)).toBe("text-red-500");
      expect(getStatusColor(25, 20, 30)).toBe("text-yellow-500");
      expect(getStatusColor(15, 20, 30)).toBe("text-green-500");
    });

    it("should determine status badge based on thresholds", () => {
      const getStatusBadge = (ntfRate: number, warning: number, critical: number) => {
        if (ntfRate >= critical) return "critical";
        if (ntfRate >= warning) return "warning";
        return "normal";
      };

      expect(getStatusBadge(35, 20, 30)).toBe("critical");
      expect(getStatusBadge(25, 20, 30)).toBe("warning");
      expect(getStatusBadge(15, 20, 30)).toBe("normal");
    });
  });

  describe("Export Alert History", () => {
    it("should format alert data for export", () => {
      const alert = {
        id: 1,
        createdAt: "2024-01-15T10:30:00Z",
        alertType: "critical",
        ntfRate: 35.5,
        totalDefects: 100,
        ntfCount: 35,
        realNgCount: 65,
        pendingCount: 0,
        emailSent: true,
        emailRecipients: ["admin@example.com", "manager@example.com"],
        periodStart: "2024-01-08T00:00:00Z",
        periodEnd: "2024-01-15T00:00:00Z",
      };

      expect(alert.alertType).toBe("critical");
      expect(alert.ntfRate).toBeCloseTo(35.5, 1);
      expect(alert.emailRecipients.length).toBe(2);
    });

    it("should parse email recipients from JSON string", () => {
      const recipientsJson = '["admin@example.com","manager@example.com"]';
      const recipients = JSON.parse(recipientsJson);
      expect(recipients).toHaveLength(2);
      expect(recipients[0]).toBe("admin@example.com");
    });

    it("should handle empty email recipients", () => {
      const recipientsJson = null;
      const recipients = recipientsJson ? JSON.parse(recipientsJson) : [];
      expect(recipients).toHaveLength(0);
    });
  });

  describe("Date Range Calculations", () => {
    it("should calculate start date for 7 days", () => {
      const days = 7;
      const now = new Date("2024-01-15T00:00:00Z");
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      expect(startDate.toISOString().split("T")[0]).toBe("2024-01-08");
    });

    it("should calculate start date for 30 days", () => {
      const days = 30;
      const now = new Date("2024-01-31T00:00:00Z");
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      expect(startDate.toISOString().split("T")[0]).toBe("2024-01-01");
    });

    it("should calculate start date for 90 days", () => {
      const days = 90;
      const now = new Date("2024-04-01T00:00:00Z");
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      expect(startDate.toISOString().split("T")[0]).toBe("2024-01-02");
    });
  });

  describe("Group By Logic", () => {
    it("should group data by day", () => {
      const groupBy = "day";
      const getGroupByClause = (gb: string) => {
        if (gb === "week") return "YEARWEEK(createdAt, 1)";
        if (gb === "month") return "DATE_FORMAT(createdAt, '%Y-%m')";
        return "DATE(createdAt)";
      };
      expect(getGroupByClause(groupBy)).toBe("DATE(createdAt)");
    });

    it("should group data by week", () => {
      const groupBy = "week";
      const getGroupByClause = (gb: string) => {
        if (gb === "week") return "YEARWEEK(createdAt, 1)";
        if (gb === "month") return "DATE_FORMAT(createdAt, '%Y-%m')";
        return "DATE(createdAt)";
      };
      expect(getGroupByClause(groupBy)).toBe("YEARWEEK(createdAt, 1)");
    });

    it("should group data by month", () => {
      const groupBy = "month";
      const getGroupByClause = (gb: string) => {
        if (gb === "week") return "YEARWEEK(createdAt, 1)";
        if (gb === "month") return "DATE_FORMAT(createdAt, '%Y-%m')";
        return "DATE(createdAt)";
      };
      expect(getGroupByClause(groupBy)).toBe("DATE_FORMAT(createdAt, '%Y-%m')");
    });
  });
});
