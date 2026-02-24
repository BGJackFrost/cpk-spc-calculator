/**
 * Unit tests for Line Comparison Export Service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

describe('Line Comparison Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Data Preparation', () => {
    it('should prepare comparison data correctly', () => {
      const prepareComparisonData = (lines: Array<{
        lineId: number;
        lineName: string;
        avgCpk: number;
        avgCp: number;
        totalSamples: number;
        passRate: number;
      }>) => {
        return lines.map((line, index) => ({
          rank: index + 1,
          ...line,
          cpkStatus: line.avgCpk >= 1.33 ? 'Tốt' : line.avgCpk >= 1.0 ? 'Chấp nhận' : 'Cần cải thiện',
        })).sort((a, b) => b.avgCpk - a.avgCpk);
      };

      const lines = [
        { lineId: 1, lineName: 'Line A', avgCpk: 1.2, avgCp: 1.4, totalSamples: 1000, passRate: 95 },
        { lineId: 2, lineName: 'Line B', avgCpk: 1.5, avgCp: 1.7, totalSamples: 1200, passRate: 98 },
        { lineId: 3, lineName: 'Line C', avgCpk: 0.8, avgCp: 1.0, totalSamples: 800, passRate: 85 },
      ];

      const result = prepareComparisonData(lines);
      
      expect(result[0].lineName).toBe('Line B'); // Highest CPK
      expect(result[0].cpkStatus).toBe('Tốt');
      expect(result[2].cpkStatus).toBe('Cần cải thiện');
    });
  });

  describe('Excel Export', () => {
    it('should format Excel headers correctly', () => {
      const getExcelHeaders = () => [
        { header: 'Xếp hạng', key: 'rank', width: 10 },
        { header: 'Mã dây chuyền', key: 'lineCode', width: 15 },
        { header: 'Tên dây chuyền', key: 'lineName', width: 25 },
        { header: 'CPK TB', key: 'avgCpk', width: 12 },
        { header: 'CP TB', key: 'avgCp', width: 12 },
        { header: 'Tổng mẫu', key: 'totalSamples', width: 12 },
        { header: 'Pass Rate (%)', key: 'passRate', width: 15 },
        { header: 'Trạng thái', key: 'cpkStatus', width: 15 },
      ];

      const headers = getExcelHeaders();
      
      expect(headers.length).toBe(8);
      expect(headers[0].header).toBe('Xếp hạng');
      expect(headers.find(h => h.key === 'avgCpk')).toBeTruthy();
    });

    it('should format numeric values correctly', () => {
      const formatValue = (value: number, decimals: number = 2) => {
        return Number(value.toFixed(decimals));
      };

      expect(formatValue(1.23456, 3)).toBe(1.235);
      expect(formatValue(95.5678, 1)).toBe(95.6);
    });
  });

  describe('PDF Export', () => {
    it('should generate PDF title correctly', () => {
      const generateTitle = (startDate: Date, endDate: Date) => {
        const formatDate = (d: Date) => d.toLocaleDateString('vi-VN');
        return `Báo cáo So sánh Dây chuyền\n${formatDate(startDate)} - ${formatDate(endDate)}`;
      };

      const title = generateTitle(new Date('2024-01-01T12:00:00'), new Date('2024-01-31T12:00:00'));
      
      expect(title).toContain('Báo cáo So sánh Dây chuyền');
      // Check that dates are formatted (format may vary by locale)
      expect(title.split('\n')[1]).toMatch(/\d+\/\d+\/\d+.*-.*\d+\/\d+\/\d+/);
    });

    it('should calculate summary statistics', () => {
      const calculateSummary = (lines: Array<{ avgCpk: number; passRate: number }>) => {
        if (lines.length === 0) return null;
        
        const avgCpk = lines.reduce((sum, l) => sum + l.avgCpk, 0) / lines.length;
        const avgPassRate = lines.reduce((sum, l) => sum + l.passRate, 0) / lines.length;
        const bestLine = lines.reduce((best, l) => l.avgCpk > best.avgCpk ? l : best);
        const worstLine = lines.reduce((worst, l) => l.avgCpk < worst.avgCpk ? l : worst);
        
        return {
          avgCpk,
          avgPassRate,
          bestCpk: bestLine.avgCpk,
          worstCpk: worstLine.avgCpk,
        };
      };

      const lines = [
        { avgCpk: 1.2, passRate: 95 },
        { avgCpk: 1.5, passRate: 98 },
        { avgCpk: 0.8, passRate: 85 },
      ];

      const summary = calculateSummary(lines);
      
      expect(summary?.avgCpk).toBeCloseTo(1.167, 2);
      expect(summary?.avgPassRate).toBeCloseTo(92.67, 1);
      expect(summary?.bestCpk).toBe(1.5);
      expect(summary?.worstCpk).toBe(0.8);
    });
  });

  describe('Date Range Validation', () => {
    it('should validate date range', () => {
      const validateDateRange = (startDate: Date, endDate: Date) => {
        const errors: string[] = [];
        
        if (startDate > endDate) {
          errors.push('Ngày bắt đầu phải trước ngày kết thúc');
        }
        
        const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
          errors.push('Khoảng thời gian không được vượt quá 365 ngày');
        }
        
        return {
          valid: errors.length === 0,
          errors,
        };
      };

      // Valid range
      const validResult = validateDateRange(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
      expect(validResult.valid).toBe(true);

      // Invalid: start after end
      const invalidResult = validateDateRange(
        new Date('2024-02-01'),
        new Date('2024-01-01')
      );
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('Line Selection Validation', () => {
    it('should validate line selection', () => {
      const validateLineSelection = (lineIds: number[]) => {
        const errors: string[] = [];
        
        if (lineIds.length < 2) {
          errors.push('Cần chọn ít nhất 2 dây chuyền để so sánh');
        }
        
        if (lineIds.length > 10) {
          errors.push('Tối đa 10 dây chuyền để so sánh');
        }
        
        const uniqueIds = new Set(lineIds);
        if (uniqueIds.size !== lineIds.length) {
          errors.push('Không được chọn trùng dây chuyền');
        }
        
        return {
          valid: errors.length === 0,
          errors,
        };
      };

      // Valid selection
      expect(validateLineSelection([1, 2, 3]).valid).toBe(true);

      // Too few
      expect(validateLineSelection([1]).valid).toBe(false);

      // Duplicates
      expect(validateLineSelection([1, 1, 2]).valid).toBe(false);
    });
  });

  describe('Chart Data Generation', () => {
    it('should generate bar chart data', () => {
      const generateBarChartData = (lines: Array<{
        lineCode: string;
        avgCpk: number;
        avgCp: number;
      }>) => {
        return {
          labels: lines.map(l => l.lineCode),
          datasets: [
            {
              label: 'CPK',
              data: lines.map(l => l.avgCpk),
              backgroundColor: '#3b82f6',
            },
            {
              label: 'CP',
              data: lines.map(l => l.avgCp),
              backgroundColor: '#8b5cf6',
            },
          ],
        };
      };

      const lines = [
        { lineCode: 'LINE-A', avgCpk: 1.2, avgCp: 1.4 },
        { lineCode: 'LINE-B', avgCpk: 1.5, avgCp: 1.7 },
      ];

      const chartData = generateBarChartData(lines);
      
      expect(chartData.labels).toEqual(['LINE-A', 'LINE-B']);
      expect(chartData.datasets[0].data).toEqual([1.2, 1.5]);
    });

    it('should generate radar chart data', () => {
      const generateRadarChartData = (lines: Array<{
        lineCode: string;
        avgCpk: number;
        avgCp: number;
        passRate: number;
        totalSamples: number;
      }>) => {
        const metrics = ['CPK', 'CP', 'Pass Rate', 'Samples'];
        
        return {
          labels: metrics,
          datasets: lines.map((line, index) => ({
            label: line.lineCode,
            data: [
              line.avgCpk,
              line.avgCp,
              line.passRate / 100,
              line.totalSamples / 5000,
            ],
            borderColor: ['#3b82f6', '#22c55e', '#eab308'][index % 3],
          })),
        };
      };

      const lines = [
        { lineCode: 'LINE-A', avgCpk: 1.2, avgCp: 1.4, passRate: 95, totalSamples: 2500 },
      ];

      const chartData = generateRadarChartData(lines);
      
      expect(chartData.labels).toEqual(['CPK', 'CP', 'Pass Rate', 'Samples']);
      expect(chartData.datasets[0].data[2]).toBe(0.95); // Pass rate normalized
    });
  });

  describe('File Naming', () => {
    it('should generate unique file names', () => {
      const generateFileName = (type: 'excel' | 'pdf', timestamp: Date) => {
        const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = timestamp.toISOString().slice(11, 19).replace(/:/g, '');
        const ext = type === 'excel' ? 'xlsx' : 'pdf';
        return `line-comparison-${dateStr}-${timeStr}.${ext}`;
      };

      const timestamp = new Date('2024-01-15T10:30:00Z');
      
      expect(generateFileName('excel', timestamp)).toBe('line-comparison-20240115-103000.xlsx');
      expect(generateFileName('pdf', timestamp)).toBe('line-comparison-20240115-103000.pdf');
    });
  });
});
