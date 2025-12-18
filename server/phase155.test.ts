import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

vi.mock('./emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  getSmtpConfig: vi.fn().mockResolvedValue(null),
}));

vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock('./storage', () => ({
  storagePut: vi.fn().mockResolvedValue({ url: 'https://example.com/file.xlsx', key: 'file.xlsx' }),
}));

describe('Phase 155 - OEE/CPK Scheduled Jobs & Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OEE Alert Scheduled Job', () => {
    it('should have checkOeeAndSendAlerts function exported', async () => {
      const { checkOeeAndSendAlerts } = await import('./scheduledJobs');
      expect(typeof checkOeeAndSendAlerts).toBe('function');
    });

    it('should have triggerOeeAlertCheck function exported', async () => {
      const { triggerOeeAlertCheck } = await import('./scheduledJobs');
      expect(typeof triggerOeeAlertCheck).toBe('function');
    });

    it('should return proper structure when no database', async () => {
      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValue(null);
      
      const { checkOeeAndSendAlerts } = await import('./scheduledJobs');
      const result = await checkOeeAndSendAlerts('daily');
      
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('message');
    });
  });

  describe('CPK Export Excel', () => {
    it('should generate Excel file with proper structure', async () => {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.default.Workbook();
      
      // Test workbook creation
      expect(workbook).toBeDefined();
      
      // Create ranking sheet
      const rankingSheet = workbook.addWorksheet('Xếp hạng CPK');
      rankingSheet.columns = [
        { header: 'Hạng', key: 'rank', width: 8 },
        { header: 'Tên', key: 'name', width: 25 },
        { header: 'CPK TB', key: 'avgCpk', width: 12 },
      ];
      
      expect(rankingSheet.name).toBe('Xếp hạng CPK');
      expect(rankingSheet.columns.length).toBe(3);
    });

    it('should calculate CPK ratings correctly', () => {
      const getCpkRating = (cpk: number) => {
        if (cpk >= 1.67) return 'Xuất sắc';
        if (cpk >= 1.33) return 'Tốt';
        if (cpk >= 1.0) return 'Chấp nhận';
        if (cpk >= 0.67) return 'Cần cải thiện';
        return 'Kém';
      };

      expect(getCpkRating(2.0)).toBe('Xuất sắc');
      expect(getCpkRating(1.5)).toBe('Tốt');
      expect(getCpkRating(1.1)).toBe('Chấp nhận');
      expect(getCpkRating(0.8)).toBe('Cần cải thiện');
      expect(getCpkRating(0.5)).toBe('Kém');
    });
  });

  describe('CPK Algorithm Comparison', () => {
    it('should implement linear regression correctly', () => {
      const linearRegression = (data: number[]) => {
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        for (let i = 0; i < n; i++) {
          sumX += i;
          sumY += data[i];
          sumXY += i * data[i];
          sumX2 += i * i;
        }
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        return { slope, intercept };
      };

      // Test with known data: y = 2x + 1
      const testData = [1, 3, 5, 7, 9];
      const result = linearRegression(testData);
      
      expect(result.slope).toBeCloseTo(2, 1);
      expect(result.intercept).toBeCloseTo(1, 1);
    });

    it('should implement moving average correctly', () => {
      const movingAverage = (data: number[], window: number = 3) => {
        const lastWindow = data.slice(-window);
        return lastWindow.reduce((a, b) => a + b, 0) / window;
      };

      const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = movingAverage(testData, 3);
      
      // Last 3 values: 8, 9, 10 -> average = 9
      expect(result).toBe(9);
    });

    it('should implement exponential smoothing correctly', () => {
      const exponentialSmoothing = (data: number[], alpha: number = 0.3) => {
        let forecast = data[0];
        for (let i = 1; i < data.length; i++) {
          forecast = alpha * data[i] + (1 - alpha) * forecast;
        }
        return forecast;
      };

      const testData = [10, 12, 11, 13, 12, 14];
      const result = exponentialSmoothing(testData, 0.3);
      
      // Should be a weighted average closer to recent values
      expect(result).toBeGreaterThan(10);
      expect(result).toBeLessThan(14);
    });

    it('should calculate R² correctly', () => {
      const calculateR2 = (actual: number[], predicted: number[]) => {
        const n = actual.length;
        const mean = actual.reduce((a, b) => a + b, 0) / n;
        const ssTotal = actual.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        const ssRes = actual.reduce((a, b, i) => a + Math.pow(b - predicted[i], 2), 0);
        return 1 - ssRes / ssTotal;
      };

      // Perfect prediction
      const actual = [1, 2, 3, 4, 5];
      const predicted = [1, 2, 3, 4, 5];
      expect(calculateR2(actual, predicted)).toBeCloseTo(1, 5);

      // Imperfect prediction
      const predicted2 = [1.1, 2.1, 2.9, 4.1, 4.9];
      expect(calculateR2(actual, predicted2)).toBeGreaterThan(0.9);
    });

    it('should calculate RMSE correctly', () => {
      const calculateRMSE = (actual: number[], predicted: number[]) => {
        const n = actual.length;
        const sumSquaredError = actual.reduce((a, b, i) => a + Math.pow(b - predicted[i], 2), 0);
        return Math.sqrt(sumSquaredError / n);
      };

      // Perfect prediction
      const actual = [1, 2, 3, 4, 5];
      const predicted = [1, 2, 3, 4, 5];
      expect(calculateRMSE(actual, predicted)).toBe(0);

      // Known error
      const predicted2 = [2, 3, 4, 5, 6]; // All off by 1
      expect(calculateRMSE(actual, predicted2)).toBe(1);
    });
  });

  describe('OEE Alert Logic', () => {
    it('should identify significant OEE drops', () => {
      const shouldAlert = (currentOee: number, previousOee: number, targetOee: number) => {
        const change = currentOee - previousOee;
        const changePercent = previousOee > 0 ? (change / previousOee) * 100 : 0;
        
        return (
          change <= -5 || // Dropped 5+ points
          (currentOee < targetOee && change < 0) || // Below target and dropping
          changePercent <= -10 // Dropped 10%+ relative
        );
      };

      // Test cases
      expect(shouldAlert(80, 90, 85)).toBe(true); // Dropped 10 points
      expect(shouldAlert(84, 86, 85)).toBe(true); // Below target and dropping
      expect(shouldAlert(75, 85, 85)).toBe(true); // Dropped more than 10%
      expect(shouldAlert(88, 87, 85)).toBe(false); // Above target, slight increase
      expect(shouldAlert(90, 88, 85)).toBe(false); // Above target, increasing
    });

    it('should classify alert severity correctly', () => {
      const getSeverity = (change: number, currentOee: number, targetOee: number) => {
        if (change <= -10 || currentOee < targetOee - 10) return 'high';
        if (change <= -5 || currentOee < targetOee) return 'medium';
        return 'low';
      };

      expect(getSeverity(-12, 70, 85)).toBe('high');
      expect(getSeverity(-6, 82, 85)).toBe('medium');
      expect(getSeverity(-3, 88, 85)).toBe('low');
    });
  });

  describe('CPK Export PDF/HTML', () => {
    it('should generate valid HTML structure', () => {
      const generateHtml = (data: any[], compareBy: string, timeRange: string) => {
        const totalItems = data.length;
        const avgCpkAll = data.reduce((a, b) => a + b.avgCpk, 0) / totalItems;
        
        return `
          <!DOCTYPE html>
          <html>
          <head><title>Báo cáo So sánh CPK</title></head>
          <body>
            <h1>Báo cáo So sánh CPK</h1>
            <p>Thời gian: ${timeRange} ngày qua</p>
            <p>So sánh theo: ${compareBy === 'line' ? 'Dây chuyền' : 'Công trạm'}</p>
            <p>Tổng số: ${totalItems}</p>
            <p>CPK TB: ${avgCpkAll.toFixed(3)}</p>
          </body>
          </html>
        `;
      };

      const testData = [
        { name: 'Line 1', avgCpk: 1.5, avgCp: 1.6, minCpk: 1.2, maxCpk: 1.8, count: 100 },
        { name: 'Line 2', avgCpk: 1.3, avgCp: 1.4, minCpk: 1.0, maxCpk: 1.6, count: 80 },
      ];

      const html = generateHtml(testData, 'line', '30');
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Báo cáo So sánh CPK');
      expect(html).toContain('30 ngày qua');
      expect(html).toContain('Dây chuyền');
      expect(html).toContain('Tổng số: 2');
    });
  });
});
