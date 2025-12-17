import { describe, it, expect } from "vitest";

describe("NTF Phase 143 - Export, AI Monitor & Product Analysis", () => {
  describe("Export Shift Report Logic", () => {
    it("should calculate shift data correctly", () => {
      const shiftData = [
        { shift: 'morning', total: 100, ntfCount: 25, realNgCount: 75 },
        { shift: 'afternoon', total: 80, ntfCount: 20, realNgCount: 60 },
        { shift: 'night', total: 60, ntfCount: 18, realNgCount: 42 },
      ];
      
      const processed = shiftData.map(s => ({
        ...s,
        ntfRate: s.total > 0 ? (s.ntfCount / s.total) * 100 : 0,
      }));
      
      expect(processed[0].ntfRate).toBe(25);
      expect(processed[1].ntfRate).toBe(25);
      expect(processed[2].ntfRate).toBe(30);
    });

    it("should map shift names correctly", () => {
      const shiftNames: Record<string, string> = {
        'morning': 'Ca sáng (6h-14h)',
        'afternoon': 'Ca chiều (14h-22h)',
        'night': 'Ca đêm (22h-6h)',
      };
      
      expect(shiftNames['morning']).toBe('Ca sáng (6h-14h)');
      expect(shiftNames['afternoon']).toBe('Ca chiều (14h-22h)');
      expect(shiftNames['night']).toBe('Ca đêm (22h-6h)');
    });
  });

  describe("AI Trend Monitor Logic", () => {
    it("should detect abnormal trend when recent avg is much higher", () => {
      const recentAvg = 35;
      const olderAvg = 25;
      const isAbnormal = recentAvg > olderAvg + 5 || recentAvg > 30;
      expect(isAbnormal).toBe(true);
    });

    it("should not flag normal trends", () => {
      const recentAvg = 22;
      const olderAvg = 20;
      const isAbnormal = recentAvg > olderAvg + 5 || recentAvg > 30;
      expect(isAbnormal).toBe(false);
    });

    it("should determine trend direction correctly", () => {
      const determineTrend = (recent: number, older: number): string => {
        if (recent > older + 2) return 'increasing';
        if (recent < older - 2) return 'decreasing';
        return 'stable';
      };

      expect(determineTrend(30, 20)).toBe('increasing');
      expect(determineTrend(15, 25)).toBe('decreasing');
      expect(determineTrend(21, 20)).toBe('stable');
    });

    it("should calculate change correctly", () => {
      const recentAvg = 28;
      const olderAvg = 22;
      const change = recentAvg - olderAvg;
      expect(change).toBe(6);
    });
  });

  describe("Product NTF Analysis Logic", () => {
    it("should calculate product NTF rates", () => {
      const products = [
        { productId: 1, productName: 'Product A', total: 100, ntfCount: 30, realNgCount: 70 },
        { productId: 2, productName: 'Product B', total: 80, ntfCount: 16, realNgCount: 64 },
      ];
      
      const processed = products.map(p => ({
        ...p,
        ntfRate: p.total > 0 ? (p.ntfCount / p.total) * 100 : 0,
      }));
      
      expect(processed[0].ntfRate).toBe(30);
      expect(processed[1].ntfRate).toBe(20);
    });

    it("should find worst and best products", () => {
      const products = [
        { productId: 1, productName: 'Product A', ntfRate: 30 },
        { productId: 2, productName: 'Product B', ntfRate: 15 },
        { productId: 3, productName: 'Product C', ntfRate: 25 },
      ];
      
      const worst = products.reduce((max, p) => p.ntfRate > max.ntfRate ? p : max, products[0]);
      const best = products.reduce((min, p) => p.ntfRate < min.ntfRate ? p : min, products[0]);
      
      expect(worst.productName).toBe('Product A');
      expect(best.productName).toBe('Product B');
    });

    it("should calculate summary statistics", () => {
      const products = [
        { total: 100, ntfCount: 30 },
        { total: 80, ntfCount: 16 },
        { total: 120, ntfCount: 24 },
      ];
      
      const totalDefects = products.reduce((sum, p) => sum + p.total, 0);
      const totalNtf = products.reduce((sum, p) => sum + p.ntfCount, 0);
      const avgNtfRate = totalDefects > 0 ? (totalNtf / totalDefects) * 100 : 0;
      
      expect(totalDefects).toBe(300);
      expect(totalNtf).toBe(70);
      expect(avgNtfRate).toBeCloseTo(23.33, 1);
    });
  });

  describe("Status Color Logic", () => {
    it("should return correct colors for NTF rates", () => {
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

  describe("Data Processing", () => {
    it("should group trend data by product", () => {
      const trendData = [
        { productId: 1, date: '2024-01-01', ntfRate: 25 },
        { productId: 1, date: '2024-01-02', ntfRate: 28 },
        { productId: 2, date: '2024-01-01', ntfRate: 20 },
      ];
      
      const trendByProduct: Record<number, any[]> = {};
      trendData.forEach(row => {
        if (!trendByProduct[row.productId]) trendByProduct[row.productId] = [];
        trendByProduct[row.productId].push(row);
      });
      
      expect(trendByProduct[1]).toHaveLength(2);
      expect(trendByProduct[2]).toHaveLength(1);
    });

    it("should prepare pie chart data", () => {
      const products = [
        { productName: 'Product A', ntfCount: 30 },
        { productName: 'Product B', ntfCount: 20 },
      ];
      
      const COLORS = ['#3b82f6', '#22c55e'];
      const pieData = products.map((p, i) => ({
        name: p.productName,
        value: p.ntfCount,
        fill: COLORS[i % COLORS.length],
      }));
      
      expect(pieData[0].name).toBe('Product A');
      expect(pieData[0].value).toBe(30);
      expect(pieData[0].fill).toBe('#3b82f6');
    });
  });
});
