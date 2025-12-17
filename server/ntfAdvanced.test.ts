import { describe, it, expect } from "vitest";

describe("NTF Advanced Features", () => {
  describe("NTF Comparison Logic", () => {
    it("should sort production lines by NTF rate descending", () => {
      const lines = [
        { name: "Line A", ntfRate: 25 },
        { name: "Line B", ntfRate: 35 },
        { name: "Line C", ntfRate: 15 },
      ];
      const sorted = [...lines].sort((a, b) => b.ntfRate - a.ntfRate);
      expect(sorted[0].name).toBe("Line B");
      expect(sorted[2].name).toBe("Line C");
    });

    it("should calculate average NTF rate across lines", () => {
      const lines = [
        { ntfRate: 20 },
        { ntfRate: 30 },
        { ntfRate: 25 },
      ];
      const avg = lines.reduce((sum, l) => sum + l.ntfRate, 0) / lines.length;
      expect(avg).toBe(25);
    });

    it("should find line with highest NTF rate", () => {
      const lines = [
        { name: "Line A", ntfRate: 25 },
        { name: "Line B", ntfRate: 35 },
        { name: "Line C", ntfRate: 15 },
      ];
      const maxLine = lines.reduce((max, l) => l.ntfRate > max.ntfRate ? l : max, lines[0]);
      expect(maxLine.name).toBe("Line B");
    });

    it("should find line with lowest NTF rate", () => {
      const lines = [
        { name: "Line A", ntfRate: 25 },
        { name: "Line B", ntfRate: 35 },
        { name: "Line C", ntfRate: 15 },
      ];
      const minLine = lines.reduce((min, l) => l.ntfRate < min.ntfRate ? l : min, lines[0]);
      expect(minLine.name).toBe("Line C");
    });
  });

  describe("Root Cause Analysis (5M1E)", () => {
    const CATEGORY_NAMES: Record<string, string> = {
      'Machine': 'Máy móc',
      'Material': 'Nguyên vật liệu',
      'Method': 'Phương pháp',
      'Man': 'Nhân lực',
      'Environment': 'Môi trường',
      'Measurement': 'Đo lường',
    };

    it("should map category codes to Vietnamese names", () => {
      expect(CATEGORY_NAMES['Machine']).toBe('Máy móc');
      expect(CATEGORY_NAMES['Material']).toBe('Nguyên vật liệu');
      expect(CATEGORY_NAMES['Man']).toBe('Nhân lực');
    });

    it("should calculate Pareto cumulative percentage", () => {
      const categories = [
        { category: 'Machine', count: 50 },
        { category: 'Material', count: 30 },
        { category: 'Method', count: 20 },
      ];
      const total = categories.reduce((sum, c) => sum + c.count, 0);
      
      let cumulative = 0;
      const paretoData = categories.map(cat => {
        cumulative += cat.count;
        return {
          ...cat,
          percentage: (cat.count / total) * 100,
          cumulative: (cumulative / total) * 100,
        };
      });

      expect(paretoData[0].percentage).toBe(50);
      expect(paretoData[0].cumulative).toBe(50);
      expect(paretoData[1].cumulative).toBe(80);
      expect(paretoData[2].cumulative).toBe(100);
    });

    it("should generate recommendations based on NTF rate", () => {
      const generateRecommendations = (ntfRate: number): string[] => {
        const recommendations: string[] = [];
        if (ntfRate > 30) {
          recommendations.push('NTF rate rất cao (>30%). Cần rà soát lại quy trình kiểm tra.');
        } else if (ntfRate > 20) {
          recommendations.push('NTF rate cao (>20%). Xem xét cải thiện đào tạo nhân viên.');
        }
        if (recommendations.length === 0) {
          recommendations.push('Hệ thống đang hoạt động ổn định.');
        }
        return recommendations;
      };

      expect(generateRecommendations(35)).toContain('NTF rate rất cao (>30%). Cần rà soát lại quy trình kiểm tra.');
      expect(generateRecommendations(25)).toContain('NTF rate cao (>20%). Xem xét cải thiện đào tạo nhân viên.');
      expect(generateRecommendations(15)).toContain('Hệ thống đang hoạt động ổn định.');
    });
  });

  describe("Notification Channels", () => {
    it("should validate email format", () => {
      const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      expect(isValidEmail('admin@example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@domain')).toBe(false);
    });

    it("should validate phone number format", () => {
      const isValidPhone = (phone: string) => /^\+?[0-9]{10,15}$/.test(phone);
      expect(isValidPhone('+84123456789')).toBe(true);
      expect(isValidPhone('0123456789')).toBe(true);
      expect(isValidPhone('123')).toBe(false);
    });

    it("should validate webhook URL format", () => {
      const isValidUrl = (url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };
      expect(isValidUrl('https://example.com/webhook')).toBe(true);
      expect(isValidUrl('http://localhost:3000/api')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
    });

    it("should format notification message", () => {
      const formatMessage = (ntfRate: number, total: number, ntfCount: number) => {
        return `NTF Rate: ${ntfRate.toFixed(1)}%\nTổng lỗi: ${total}\nNTF: ${ntfCount}`;
      };
      const message = formatMessage(35.5, 100, 35);
      expect(message).toContain('35.5%');
      expect(message).toContain('100');
      expect(message).toContain('35');
    });
  });

  describe("Dashboard Summary", () => {
    it("should calculate trend data correctly", () => {
      const trendData = [
        { date: '2024-01-01', total: 100, ntfCount: 20 },
        { date: '2024-01-02', total: 80, ntfCount: 24 },
        { date: '2024-01-03', total: 120, ntfCount: 30 },
      ];
      
      const processedTrend = trendData.map(d => ({
        ...d,
        ntfRate: d.total > 0 ? (d.ntfCount / d.total) * 100 : 0,
      }));

      expect(processedTrend[0].ntfRate).toBe(20);
      expect(processedTrend[1].ntfRate).toBe(30);
      expect(processedTrend[2].ntfRate).toBe(25);
    });

    it("should rank top production lines by NTF count", () => {
      const lines = [
        { name: 'Line A', ntfCount: 50 },
        { name: 'Line B', ntfCount: 30 },
        { name: 'Line C', ntfCount: 70 },
        { name: 'Line D', ntfCount: 20 },
      ];
      
      const topLines = [...lines].sort((a, b) => b.ntfCount - a.ntfCount).slice(0, 3);
      
      expect(topLines[0].name).toBe('Line C');
      expect(topLines[1].name).toBe('Line A');
      expect(topLines[2].name).toBe('Line B');
    });
  });

  describe("Status Color Logic", () => {
    it("should return correct status color based on thresholds", () => {
      const getStatusColor = (ntfRate: number) => {
        if (ntfRate >= 30) return "text-red-500";
        if (ntfRate >= 20) return "text-yellow-500";
        return "text-green-500";
      };

      expect(getStatusColor(35)).toBe("text-red-500");
      expect(getStatusColor(30)).toBe("text-red-500");
      expect(getStatusColor(25)).toBe("text-yellow-500");
      expect(getStatusColor(20)).toBe("text-yellow-500");
      expect(getStatusColor(15)).toBe("text-green-500");
    });

    it("should return correct bar color for charts", () => {
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
});
