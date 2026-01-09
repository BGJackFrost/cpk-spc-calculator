/**
 * Unit tests for PDF Export functionality
 */
import { describe, it, expect } from 'vitest';

const mockSpcReportData = {
  summary: {
    totalSamples: 150,
    avgCpk: 1.45,
    minCpk: 0.85,
    maxCpk: 2.10,
    violationCount: 5,
    warningCount: 12,
    goodCount: 133,
  },
  shiftStats: {
    morning: { count: 50, avgCpk: 1.52 },
    afternoon: { count: 55, avgCpk: 1.38 },
    night: { count: 45, avgCpk: 1.47 },
  },
};

describe('PDF Export', () => {
  describe('CPK Status Classification', () => {
    it('should correctly classify CPK status', () => {
      const getCpkStatus = (cpk: number): string => {
        if (cpk >= 1.67) return 'Xuất sắc';
        if (cpk >= 1.33) return 'Tốt';
        if (cpk >= 1.0) return 'Chấp nhận';
        return 'Cần cải tiến';
      };

      expect(getCpkStatus(2.0)).toBe('Xuất sắc');
      expect(getCpkStatus(1.67)).toBe('Xuất sắc');
      expect(getCpkStatus(1.5)).toBe('Tốt');
      expect(getCpkStatus(1.33)).toBe('Tốt');
      expect(getCpkStatus(1.2)).toBe('Chấp nhận');
      expect(getCpkStatus(1.0)).toBe('Chấp nhận');
      expect(getCpkStatus(0.9)).toBe('Cần cải tiến');
    });

    it('should return correct color for CPK status', () => {
      const getCpkColor = (cpk: number): [number, number, number] => {
        if (cpk >= 1.67) return [34, 197, 94];
        if (cpk >= 1.33) return [59, 130, 246];
        if (cpk >= 1.0) return [234, 179, 8];
        return [239, 68, 68];
      };

      expect(getCpkColor(1.8)).toEqual([34, 197, 94]);
      expect(getCpkColor(1.5)).toEqual([59, 130, 246]);
      expect(getCpkColor(1.1)).toEqual([234, 179, 8]);
      expect(getCpkColor(0.8)).toEqual([239, 68, 68]);
    });
  });

  describe('Percentage Calculations', () => {
    it('should calculate correct percentages', () => {
      const calculatePercentage = (count: number, total: number): number => {
        if (total === 0) return 0;
        return (count / total) * 100;
      };

      const { summary } = mockSpcReportData;
      const violationPct = calculatePercentage(summary.violationCount, summary.totalSamples);
      const warningPct = calculatePercentage(summary.warningCount, summary.totalSamples);
      const goodPct = calculatePercentage(summary.goodCount, summary.totalSamples);

      expect(violationPct).toBeCloseTo(3.33, 1);
      expect(warningPct).toBeCloseTo(8.0, 1);
      expect(goodPct).toBeCloseTo(88.67, 1);
    });

    it('should handle zero total samples', () => {
      const calculatePercentage = (count: number, total: number): number => {
        if (total === 0) return 0;
        return (count / total) * 100;
      };

      expect(calculatePercentage(5, 0)).toBe(0);
      expect(calculatePercentage(0, 0)).toBe(0);
    });
  });

  describe('Table Data Preparation', () => {
    it('should prepare summary table data', () => {
      const prepareSummaryData = (summary: typeof mockSpcReportData.summary): string[][] => {
        return [
          ['Tổng số mẫu', summary.totalSamples.toString()],
          ['CPK Trung bình', summary.avgCpk.toFixed(3)],
          ['CPK Thấp nhất', summary.minCpk.toFixed(3)],
          ['CPK Cao nhất', summary.maxCpk.toFixed(3)],
        ];
      };

      const tableData = prepareSummaryData(mockSpcReportData.summary);
      expect(tableData).toHaveLength(4);
      expect(tableData[0]).toEqual(['Tổng số mẫu', '150']);
      expect(tableData[1]).toEqual(['CPK Trung bình', '1.450']);
    });

    it('should prepare shift stats table data', () => {
      const prepareShiftData = (stats: typeof mockSpcReportData.shiftStats): string[][] => {
        return [
          ['Ca Sáng (6h-14h)', stats.morning.count.toString(), stats.morning.avgCpk.toFixed(3)],
          ['Ca Chiều (14h-22h)', stats.afternoon.count.toString(), stats.afternoon.avgCpk.toFixed(3)],
          ['Ca Tối (22h-6h)', stats.night.count.toString(), stats.night.avgCpk.toFixed(3)],
        ];
      };

      const tableData = prepareShiftData(mockSpcReportData.shiftStats);
      expect(tableData).toHaveLength(3);
      expect(tableData[0]).toEqual(['Ca Sáng (6h-14h)', '50', '1.520']);
    });
  });

  describe('File Name Generation', () => {
    it('should generate correct PDF file name', () => {
      const generateFileName = (prefix: string, date: Date): string => {
        const dateStr = date.toISOString().split('T')[0];
        return `${prefix}-${dateStr}.pdf`;
      };

      const date = new Date('2024-01-15');
      expect(generateFileName('bao-cao-spc', date)).toBe('bao-cao-spc-2024-01-15.pdf');
    });
  });

  describe('Page Layout Calculations', () => {
    it('should calculate content width correctly', () => {
      const calculateContentWidth = (pageWidth: number, margin: number): number => {
        return pageWidth - margin * 2;
      };

      expect(calculateContentWidth(210, 15)).toBe(180);
      expect(calculateContentWidth(210, 20)).toBe(170);
    });

    it('should determine if new page is needed', () => {
      const needsNewPage = (currentY: number, pageHeight: number, requiredSpace: number): boolean => {
        return currentY + requiredSpace > pageHeight;
      };

      expect(needsNewPage(200, 297, 50)).toBe(false);
      expect(needsNewPage(250, 297, 50)).toBe(true);
    });
  });
});
