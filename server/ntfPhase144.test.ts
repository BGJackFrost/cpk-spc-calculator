import { describe, it, expect } from "vitest";

describe("NTF Phase 144 - Supplier Analysis, Monthly Report & Environment Correlation", () => {
  describe("Supplier NTF Analysis Logic", () => {
    it("should calculate supplier NTF rates correctly", () => {
      const suppliers = [
        { supplierId: 1, supplierName: 'Supplier A', total: 100, ntfCount: 30, realNgCount: 70 },
        { supplierId: 2, supplierName: 'Supplier B', total: 80, ntfCount: 16, realNgCount: 64 },
      ];
      
      const processed = suppliers.map(s => ({
        ...s,
        ntfRate: s.total > 0 ? (s.ntfCount / s.total) * 100 : 0,
      }));
      
      expect(processed[0].ntfRate).toBe(30);
      expect(processed[1].ntfRate).toBe(20);
    });

    it("should find best and worst suppliers", () => {
      const suppliers = [
        { supplierId: 1, supplierName: 'Supplier A', ntfRate: 30 },
        { supplierId: 2, supplierName: 'Supplier B', ntfRate: 15 },
        { supplierId: 3, supplierName: 'Supplier C', ntfRate: 25 },
      ];
      
      const worst = suppliers.reduce((max, s) => s.ntfRate > max.ntfRate ? s : max, suppliers[0]);
      const best = suppliers.reduce((min, s) => s.ntfRate < min.ntfRate ? s : min, suppliers[0]);
      
      expect(worst.supplierName).toBe('Supplier A');
      expect(best.supplierName).toBe('Supplier B');
    });

    it("should calculate quality rating based on NTF rate", () => {
      const getQualityRating = (ntfRate: number): { stars: number; label: string } => {
        if (ntfRate < 10) return { stars: 5, label: 'Xuất sắc' };
        if (ntfRate < 20) return { stars: 4, label: 'Tốt' };
        if (ntfRate < 30) return { stars: 3, label: 'Trung bình' };
        if (ntfRate < 40) return { stars: 2, label: 'Cần cải thiện' };
        return { stars: 1, label: 'Kém' };
      };

      expect(getQualityRating(5).stars).toBe(5);
      expect(getQualityRating(15).stars).toBe(4);
      expect(getQualityRating(25).stars).toBe(3);
      expect(getQualityRating(35).stars).toBe(2);
      expect(getQualityRating(45).stars).toBe(1);
    });
  });

  describe("Monthly Report Logic", () => {
    it("should calculate month-over-month change", () => {
      const lastMonthNtfRate = 28;
      const prevMonthNtfRate = 22;
      const change = lastMonthNtfRate - prevMonthNtfRate;
      
      expect(change).toBe(6);
    });

    it("should get correct date ranges for last month", () => {
      const now = new Date('2024-03-15');
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      
      expect(lastMonth.getMonth()).toBe(1); // February
      expect(lastMonthEnd.getDate()).toBe(29); // Feb 2024 has 29 days (leap year)
    });

    it("should format month name correctly", () => {
      const date = new Date('2024-02-01');
      const monthName = date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
      
      expect(monthName).toContain('2024');
    });
  });

  describe("Environment Correlation Logic", () => {
    it("should calculate Pearson correlation coefficient", () => {
      const calcCorrelation = (x: number[], y: number[]): number => {
        const n = x.length;
        if (n === 0) return 0;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
        const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
        const sumY2 = y.reduce((acc, yi) => acc + yi * yi, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
      };

      // Perfect positive correlation
      const x1 = [1, 2, 3, 4, 5];
      const y1 = [2, 4, 6, 8, 10];
      expect(calcCorrelation(x1, y1)).toBeCloseTo(1, 5);

      // Perfect negative correlation
      const x2 = [1, 2, 3, 4, 5];
      const y2 = [10, 8, 6, 4, 2];
      expect(calcCorrelation(x2, y2)).toBeCloseTo(-1, 5);

      // No correlation (random)
      const x3 = [1, 2, 3, 4, 5];
      const y3 = [5, 2, 8, 1, 9];
      const r3 = calcCorrelation(x3, y3);
      expect(Math.abs(r3)).toBeLessThan(0.5);
    });

    it("should determine correlation strength correctly", () => {
      const getCorrelationStrength = (r: number): string => {
        const absR = Math.abs(r);
        if (absR >= 0.7) return 'Rất mạnh';
        if (absR >= 0.5) return 'Mạnh';
        if (absR >= 0.3) return 'Trung bình';
        if (absR >= 0.1) return 'Yếu';
        return 'Không đáng kể';
      };

      expect(getCorrelationStrength(0.8)).toBe('Rất mạnh');
      expect(getCorrelationStrength(-0.75)).toBe('Rất mạnh');
      expect(getCorrelationStrength(0.6)).toBe('Mạnh');
      expect(getCorrelationStrength(0.4)).toBe('Trung bình');
      expect(getCorrelationStrength(0.2)).toBe('Yếu');
      expect(getCorrelationStrength(0.05)).toBe('Không đáng kể');
    });

    it("should determine correlation direction correctly", () => {
      const getCorrelationDirection = (r: number): string => {
        if (r > 0.1) return 'Thuận';
        if (r < -0.1) return 'Nghịch';
        return 'Không tương quan';
      };

      expect(getCorrelationDirection(0.5)).toBe('Thuận');
      expect(getCorrelationDirection(-0.5)).toBe('Nghịch');
      expect(getCorrelationDirection(0.05)).toBe('Không tương quan');
    });
  });

  describe("Data Processing", () => {
    it("should group trend data by supplier", () => {
      const trendData = [
        { supplierId: 1, date: '2024-01-01', ntfRate: 25 },
        { supplierId: 1, date: '2024-01-02', ntfRate: 28 },
        { supplierId: 2, date: '2024-01-01', ntfRate: 20 },
      ];
      
      const trendBySupplier: Record<number, any[]> = {};
      trendData.forEach(row => {
        if (!trendBySupplier[row.supplierId]) trendBySupplier[row.supplierId] = [];
        trendBySupplier[row.supplierId].push(row);
      });
      
      expect(trendBySupplier[1]).toHaveLength(2);
      expect(trendBySupplier[2]).toHaveLength(1);
    });

    it("should calculate summary statistics", () => {
      const suppliers = [
        { total: 100, ntfCount: 30 },
        { total: 80, ntfCount: 16 },
        { total: 120, ntfCount: 24 },
      ];
      
      const totalDefects = suppliers.reduce((sum, s) => sum + s.total, 0);
      const totalNtf = suppliers.reduce((sum, s) => sum + s.ntfCount, 0);
      const avgNtfRate = totalDefects > 0 ? (totalNtf / totalDefects) * 100 : 0;
      
      expect(totalDefects).toBe(300);
      expect(totalNtf).toBe(70);
      expect(avgNtfRate).toBeCloseTo(23.33, 1);
    });
  });

  describe("NTF Reason Labels", () => {
    it("should return correct labels for NTF reasons", () => {
      const getNtfReasonLabel = (reason: string): string => {
        const labels: Record<string, string> = {
          'sensor_error': 'Lỗi cảm biến',
          'false_detection': 'Phát hiện sai',
          'calibration_issue': 'Vấn đề hiệu chuẩn',
          'environmental_factor': 'Yếu tố môi trường',
          'operator_error': 'Lỗi vận hành',
          'software_bug': 'Lỗi phần mềm',
          'other': 'Khác',
        };
        return labels[reason] || reason;
      };

      expect(getNtfReasonLabel('sensor_error')).toBe('Lỗi cảm biến');
      expect(getNtfReasonLabel('false_detection')).toBe('Phát hiện sai');
      expect(getNtfReasonLabel('unknown_reason')).toBe('unknown_reason');
    });
  });
});
