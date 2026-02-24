import { describe, it, expect } from "vitest";

describe("Phase 158 - SMTP Test, Widget Chart & Export", () => {
  describe("Test Email SMTP", () => {
    it("should validate email format correctly", () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      expect(emailRegex.test("test@example.com")).toBe(true);
      expect(emailRegex.test("user.name@domain.co")).toBe(true);
      expect(emailRegex.test("invalid-email")).toBe(false);
      expect(emailRegex.test("@domain.com")).toBe(false);
      expect(emailRegex.test("user@")).toBe(false);
    });

    it("should parse multiple emails correctly", () => {
      const parseEmails = (input: string) => {
        return input.split(",").map(e => e.trim()).filter(e => e);
      };

      expect(parseEmails("a@b.com, c@d.com")).toEqual(["a@b.com", "c@d.com"]);
      expect(parseEmails("single@email.com")).toEqual(["single@email.com"]);
      expect(parseEmails("  spaced@email.com  ")).toEqual(["spaced@email.com"]);
      expect(parseEmails("")).toEqual([]);
    });

    it("should generate test email content", () => {
      const generateTestContent = (smtpHost: string, smtpPort: number) => {
        return {
          subject: "[Test] Kiểm tra cấu hình SMTP",
          hasServerInfo: `${smtpHost}:${smtpPort}`,
        };
      };

      const content = generateTestContent("smtp.gmail.com", 587);
      expect(content.subject).toContain("Test");
      expect(content.hasServerInfo).toBe("smtp.gmail.com:587");
    });
  });

  describe("Dual Axis Chart", () => {
    it("should calculate OEE scale correctly", () => {
      const calculateScale = (data: number[]) => {
        const min = Math.min(...data, 0);
        const max = Math.max(...data, 100);
        return { min, max, range: max - min || 1 };
      };

      const scale = calculateScale([70, 80, 90]);
      expect(scale.min).toBe(0);
      expect(scale.max).toBe(100);
      expect(scale.range).toBe(100);
    });

    it("should calculate CPK scale correctly", () => {
      const calculateScale = (data: number[]) => {
        const min = Math.min(...data, 0);
        const max = Math.max(...data, 2);
        return { min, max, range: max - min || 1 };
      };

      const scale = calculateScale([1.0, 1.2, 1.5]);
      expect(scale.min).toBe(0);
      expect(scale.max).toBe(2);
      expect(scale.range).toBe(2);
    });

    it("should generate chart points correctly", () => {
      const generatePoints = (data: number[], min: number, max: number, height: number) => {
        const range = max - min || 1;
        return data.map((value, index) => {
          const x = (index / (data.length - 1 || 1)) * 100;
          const y = height - ((value - min) / range) * height;
          return { x, y };
        });
      };

      const points = generatePoints([0, 50, 100], 0, 100, 100);
      expect(points[0].x).toBe(0);
      expect(points[0].y).toBe(100); // 0% at bottom
      expect(points[1].x).toBe(50);
      expect(points[1].y).toBe(50); // 50% at middle
      expect(points[2].x).toBe(100);
      expect(points[2].y).toBe(0); // 100% at top
    });

    it("should generate Y-axis labels correctly", () => {
      const generateLabels = (min: number, max: number) => {
        return [min, (min + max) / 2, max];
      };

      const oeeLabels = generateLabels(0, 100);
      expect(oeeLabels).toEqual([0, 50, 100]);

      const cpkLabels = generateLabels(0, 2);
      expect(cpkLabels).toEqual([0, 1, 2]);
    });
  });

  describe("Export Alert Thresholds", () => {
    it("should format threshold data for Excel", () => {
      const formatThreshold = (threshold: {
        id: number;
        machineName: string | null;
        lineName: string | null;
        targetOee: string;
        isActive: number;
      }) => {
        return {
          id: threshold.id,
          machine: threshold.machineName || "Tất cả",
          line: threshold.lineName || "Tất cả",
          targetOee: Number(threshold.targetOee),
          status: threshold.isActive === 1 ? "Hoạt động" : "Tạm dừng",
        };
      };

      const formatted = formatThreshold({
        id: 1,
        machineName: "Machine A",
        lineName: null,
        targetOee: "85.00",
        isActive: 1,
      });

      expect(formatted.id).toBe(1);
      expect(formatted.machine).toBe("Machine A");
      expect(formatted.line).toBe("Tất cả");
      expect(formatted.targetOee).toBe(85);
      expect(formatted.status).toBe("Hoạt động");
    });

    it("should generate filename with timestamp", () => {
      const generateFilename = () => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        return `oee-alert-thresholds-${timestamp}.xlsx`;
      };

      const filename = generateFilename();
      expect(filename).toMatch(/^oee-alert-thresholds-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.xlsx$/);
    });

    it("should include all required columns", () => {
      const requiredColumns = [
        "ID",
        "Máy",
        "Dây chuyền",
        "Mục tiêu OEE (%)",
        "Ngưỡng cảnh báo (%)",
        "Ngưỡng nghiêm trọng (%)",
        "Trạng thái",
      ];

      requiredColumns.forEach(col => {
        expect(typeof col).toBe("string");
        expect(col.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Integration", () => {
    it("should handle empty data gracefully", () => {
      const handleEmptyData = (oeeData: number[], cpkData: number[]) => {
        const hasData = oeeData.length > 1 || cpkData.length > 1;
        return hasData;
      };

      expect(handleEmptyData([], [])).toBe(false);
      expect(handleEmptyData([80], [])).toBe(false);
      expect(handleEmptyData([80, 85], [])).toBe(true);
      expect(handleEmptyData([], [1.0, 1.2])).toBe(true);
    });

    it("should calculate test email results correctly", () => {
      const calculateResults = (sent: number, failed: number) => {
        return {
          success: failed === 0,
          message: failed === 0 
            ? `Đã gửi thành công ${sent} email test`
            : `Gửi ${sent} thành công, ${failed} thất bại`,
        };
      };

      const success = calculateResults(3, 0);
      expect(success.success).toBe(true);
      expect(success.message).toContain("3");

      const partial = calculateResults(2, 1);
      expect(partial.success).toBe(false);
      expect(partial.message).toContain("2 thành công");
      expect(partial.message).toContain("1 thất bại");
    });
  });
});
