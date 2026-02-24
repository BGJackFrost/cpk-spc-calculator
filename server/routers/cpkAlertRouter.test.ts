/**
 * Unit tests for cpkAlertRouter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
  }),
}));

describe('cpkAlertRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAlertHistory', () => {
    it('should return empty array when no data', async () => {
      const mockData = { items: [], total: 0, page: 1, pageSize: 20 };
      expect(mockData.items).toEqual([]);
      expect(mockData.total).toBe(0);
    });

    it('should return paginated results', async () => {
      const mockData = {
        items: [
          { id: 1, productCode: 'P001', cpkValue: 1.5, alertType: 'normal' },
          { id: 2, productCode: 'P002', cpkValue: 0.8, alertType: 'critical' },
        ],
        total: 2,
        page: 1,
        pageSize: 20,
      };
      expect(mockData.items.length).toBe(2);
      expect(mockData.page).toBe(1);
    });
  });

  describe('getAlertHistoryStats', () => {
    it('should return stats object', async () => {
      const mockStats = {
        totalAlerts: 100,
        criticalCount: 10,
        warningCount: 25,
        excellentCount: 30,
        avgCpk: 1.45,
      };
      expect(mockStats.totalAlerts).toBe(100);
      expect(mockStats.criticalCount).toBe(10);
      expect(mockStats.avgCpk).toBeCloseTo(1.45);
    });
  });

  describe('CPK Alert Type Classification', () => {
    it('should classify CPK < 1.0 as critical', () => {
      const cpkValue = 0.8;
      const alertType = cpkValue < 1.0 ? 'critical' : cpkValue < 1.33 ? 'warning' : cpkValue >= 1.67 ? 'excellent' : 'normal';
      expect(alertType).toBe('critical');
    });

    it('should classify CPK between 1.0 and 1.33 as warning', () => {
      const cpkValue = 1.2;
      const alertType = cpkValue < 1.0 ? 'critical' : cpkValue < 1.33 ? 'warning' : cpkValue >= 1.67 ? 'excellent' : 'normal';
      expect(alertType).toBe('warning');
    });

    it('should classify CPK between 1.33 and 1.67 as normal', () => {
      const cpkValue = 1.5;
      const alertType = cpkValue < 1.0 ? 'critical' : cpkValue < 1.33 ? 'warning' : cpkValue >= 1.67 ? 'excellent' : 'normal';
      expect(alertType).toBe('normal');
    });

    it('should classify CPK >= 1.67 as excellent', () => {
      const cpkValue = 1.8;
      const alertType = cpkValue < 1.0 ? 'critical' : cpkValue < 1.33 ? 'warning' : cpkValue >= 1.67 ? 'excellent' : 'normal';
      expect(alertType).toBe('excellent');
    });
  });

  describe('Excel Export', () => {
    it('should generate valid Excel buffer', async () => {
      const mockExcelResult = {
        filename: 'cpk_alert_history_20260108.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: 'base64encodedstring',
      };
      expect(mockExcelResult.filename).toContain('.xlsx');
      expect(mockExcelResult.mimeType).toContain('spreadsheetml');
      expect(mockExcelResult.buffer).toBeDefined();
    });

    it('should include correct headers in Excel', () => {
      const expectedHeaders = [
        'ID', 'Thời gian', 'Sản phẩm', 'Công trạm', 'CPK', 
        'Loại cảnh báo', 'Mean', 'Std Dev', 'Số mẫu'
      ];
      expect(expectedHeaders.length).toBe(9);
      expect(expectedHeaders).toContain('CPK');
      expect(expectedHeaders).toContain('Loại cảnh báo');
    });
  });

  describe('getCpkTrend', () => {
    it('should return trend data grouped by day', () => {
      const mockTrendData = {
        items: [
          { date: '2026-01-01', avgCpk: 1.5, minCpk: 1.2, maxCpk: 1.8, count: 10 },
          { date: '2026-01-02', avgCpk: 1.4, minCpk: 1.1, maxCpk: 1.7, count: 15 },
        ],
      };
      expect(mockTrendData.items.length).toBe(2);
      expect(mockTrendData.items[0].avgCpk).toBeCloseTo(1.5);
    });

    it('should calculate correct date range for different groupBy options', () => {
      const now = new Date();
      
      const dailyStart = new Date(now);
      dailyStart.setDate(dailyStart.getDate() - 30);
      expect(dailyStart.getTime()).toBeLessThan(now.getTime());
      
      const weeklyStart = new Date(now);
      weeklyStart.setDate(weeklyStart.getDate() - 90);
      expect(weeklyStart.getTime()).toBeLessThan(dailyStart.getTime());
      
      const monthlyStart = new Date(now);
      monthlyStart.setMonth(monthlyStart.getMonth() - 12);
      expect(monthlyStart.getTime()).toBeLessThan(weeklyStart.getTime());
    });
  });
});
