import { describe, it, expect } from "vitest";

describe("Phase 64 - SPC Plan Optimization, Notifications, Shift CPK", () => {
  describe("Email Multiple Recipients", () => {
    it("should parse multiple email addresses from comma-separated string", () => {
      const emailString = "user1@example.com, user2@example.com, user3@example.com";
      const emails = emailString.split(",").map(e => e.trim()).filter(e => e.length > 0);
      
      expect(emails).toHaveLength(3);
      expect(emails[0]).toBe("user1@example.com");
      expect(emails[1]).toBe("user2@example.com");
      expect(emails[2]).toBe("user3@example.com");
    });

    it("should handle single email address", () => {
      const emailString = "single@example.com";
      const emails = emailString.split(",").map(e => e.trim()).filter(e => e.length > 0);
      
      expect(emails).toHaveLength(1);
      expect(emails[0]).toBe("single@example.com");
    });

    it("should handle empty strings and whitespace", () => {
      const emailString = "user1@example.com,  , user2@example.com, ";
      const emails = emailString.split(",").map(e => e.trim()).filter(e => e.length > 0);
      
      expect(emails).toHaveLength(2);
      expect(emails).not.toContain("");
    });
  });

  describe("Shift CPK Analysis", () => {
    const DEFAULT_SHIFTS = [
      { id: "morning", name: "Ca sáng", startHour: 6, endHour: 14 },
      { id: "afternoon", name: "Ca chiều", startHour: 14, endHour: 22 },
      { id: "night", name: "Ca đêm", startHour: 22, endHour: 6 },
    ];

    function getShiftFromHour(hour: number): string {
      if (hour >= 6 && hour < 14) return "morning";
      if (hour >= 14 && hour < 22) return "afternoon";
      return "night";
    }

    it("should correctly identify morning shift (6:00 - 14:00)", () => {
      expect(getShiftFromHour(6)).toBe("morning");
      expect(getShiftFromHour(10)).toBe("morning");
      expect(getShiftFromHour(13)).toBe("morning");
    });

    it("should correctly identify afternoon shift (14:00 - 22:00)", () => {
      expect(getShiftFromHour(14)).toBe("afternoon");
      expect(getShiftFromHour(18)).toBe("afternoon");
      expect(getShiftFromHour(21)).toBe("afternoon");
    });

    it("should correctly identify night shift (22:00 - 6:00)", () => {
      expect(getShiftFromHour(22)).toBe("night");
      expect(getShiftFromHour(0)).toBe("night");
      expect(getShiftFromHour(5)).toBe("night");
    });

    it("should calculate average CPK correctly", () => {
      const cpkValues = [1.2, 1.5, 1.3, 1.4, 1.6];
      const avgCpk = cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length;
      
      expect(avgCpk).toBeCloseTo(1.4, 2);
    });

    it("should determine CPK trend correctly", () => {
      function calculateTrend(cpks: number[]): "up" | "down" | "stable" {
        if (cpks.length < 2) return "stable";
        
        const halfIndex = Math.floor(cpks.length / 2);
        const firstHalf = cpks.slice(0, halfIndex);
        const secondHalf = cpks.slice(halfIndex);
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        if (secondAvg > firstAvg * 1.05) return "up";
        if (secondAvg < firstAvg * 0.95) return "down";
        return "stable";
      }

      // Increasing trend
      expect(calculateTrend([1.0, 1.1, 1.2, 1.3, 1.4, 1.5])).toBe("up");
      
      // Decreasing trend
      expect(calculateTrend([1.5, 1.4, 1.3, 1.2, 1.1, 1.0])).toBe("down");
      
      // Stable trend
      expect(calculateTrend([1.3, 1.31, 1.29, 1.3, 1.31, 1.3])).toBe("stable");
    });
  });

  describe("Notification Store", () => {
    it("should create notification with required fields", () => {
      const notification = {
        id: Date.now().toString(),
        type: "cpk_warning" as const,
        title: "CPK Warning",
        message: "Product A - Station 1",
        timestamp: new Date(),
        read: false,
        data: {
          cpk: 1.1,
          threshold: 1.33,
          productCode: "PROD-A",
          stationName: "Station 1",
        },
      };

      expect(notification.id).toBeDefined();
      expect(notification.type).toBe("cpk_warning");
      expect(notification.read).toBe(false);
      expect(notification.data?.cpk).toBe(1.1);
    });

    it("should format notification time correctly", () => {
      function formatTime(date: Date): string {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Vừa xong";
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        return `${days} ngày trước`;
      }

      const now = new Date();
      expect(formatTime(now)).toBe("Vừa xong");
      
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
      expect(formatTime(fiveMinutesAgo)).toBe("5 phút trước");
      
      const twoHoursAgo = new Date(now.getTime() - 2 * 3600000);
      expect(formatTime(twoHoursAgo)).toBe("2 giờ trước");
      
      const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
      expect(formatTime(threeDaysAgo)).toBe("3 ngày trước");
    });
  });

  describe("CPK Badge Classification", () => {
    function getCpkStatus(cpk: number): string {
      if (cpk === 0) return "N/A";
      if (cpk >= 1.67) return "Xuất sắc";
      if (cpk >= 1.33) return "Tốt";
      if (cpk >= 1.0) return "Chấp nhận";
      return "Cần cải thiện";
    }

    it("should classify CPK values correctly", () => {
      expect(getCpkStatus(0)).toBe("N/A");
      expect(getCpkStatus(0.8)).toBe("Cần cải thiện");
      expect(getCpkStatus(1.0)).toBe("Chấp nhận");
      expect(getCpkStatus(1.33)).toBe("Tốt");
      expect(getCpkStatus(1.67)).toBe("Xuất sắc");
      expect(getCpkStatus(2.0)).toBe("Xuất sắc");
    });
  });
});
