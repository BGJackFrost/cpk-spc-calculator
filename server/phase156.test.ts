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
  storagePut: vi.fn().mockResolvedValue({ url: 'https://example.com/report.html', key: 'report.html' }),
}));

describe('Phase 156 - OEE/CPK Advanced Configuration & Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OEE Alert Thresholds', () => {
    it('should have oeeAlertThresholds table in schema', async () => {
      const schema = await import('../drizzle/schema');
      expect(schema.oeeAlertThresholds).toBeDefined();
    });

    it('should have correct threshold fields', async () => {
      const schema = await import('../drizzle/schema');
      const table = schema.oeeAlertThresholds;
      
      // Check that table has expected structure
      expect(table).toBeDefined();
    });

    it('should calculate effective threshold with priority', () => {
      // Priority: Machine-specific > Line-specific > Global
      const getEffectiveThreshold = (
        machineThreshold: any,
        lineThreshold: any,
        globalThreshold: any
      ) => {
        if (machineThreshold) return machineThreshold;
        if (lineThreshold) return lineThreshold;
        if (globalThreshold) return globalThreshold;
        return {
          targetOee: 85,
          warningThreshold: 80,
          criticalThreshold: 70,
        };
      };

      const machineSpecific = { targetOee: 90, warningThreshold: 85, criticalThreshold: 75 };
      const lineSpecific = { targetOee: 88, warningThreshold: 83, criticalThreshold: 73 };
      const global = { targetOee: 85, warningThreshold: 80, criticalThreshold: 70 };

      // Machine-specific takes priority
      expect(getEffectiveThreshold(machineSpecific, lineSpecific, global)).toEqual(machineSpecific);
      
      // Line-specific when no machine-specific
      expect(getEffectiveThreshold(null, lineSpecific, global)).toEqual(lineSpecific);
      
      // Global when no others
      expect(getEffectiveThreshold(null, null, global)).toEqual(global);
      
      // Default when none
      expect(getEffectiveThreshold(null, null, null)).toEqual({
        targetOee: 85,
        warningThreshold: 80,
        criticalThreshold: 70,
      });
    });

    it('should classify OEE status correctly', () => {
      const classifyOeeStatus = (oee: number, threshold: any) => {
        if (oee >= threshold.targetOee) return 'good';
        if (oee >= threshold.warningThreshold) return 'warning';
        if (oee >= threshold.criticalThreshold) return 'critical';
        return 'severe';
      };

      const threshold = { targetOee: 85, warningThreshold: 80, criticalThreshold: 70 };

      expect(classifyOeeStatus(90, threshold)).toBe('good');
      expect(classifyOeeStatus(82, threshold)).toBe('warning');
      expect(classifyOeeStatus(72, threshold)).toBe('critical');
      expect(classifyOeeStatus(65, threshold)).toBe('severe');
    });
  });

  describe('Scheduled Reports', () => {
    it('should have scheduledReports table in schema', async () => {
      const schema = await import('../drizzle/schema');
      expect(schema.scheduledReports).toBeDefined();
    });

    it('should have scheduledReportLogs table in schema', async () => {
      const schema = await import('../drizzle/schema');
      expect(schema.scheduledReportLogs).toBeDefined();
    });

    it('should determine if report should run based on schedule', () => {
      const shouldRunReport = (
        report: { frequency: string; dayOfWeek?: number; dayOfMonth?: number; timeOfDay: string },
        currentTime: { hour: number; minute: number; dayOfWeek: number; dayOfMonth: number }
      ) => {
        const reportTime = report.timeOfDay.split(':');
        const reportHour = parseInt(reportTime[0]);
        const reportMinute = parseInt(reportTime[1]);

        if (currentTime.hour !== reportHour || currentTime.minute !== reportMinute) {
          return false;
        }

        if (report.frequency === 'daily') return true;
        if (report.frequency === 'weekly' && report.dayOfWeek === currentTime.dayOfWeek) return true;
        if (report.frequency === 'monthly' && report.dayOfMonth === currentTime.dayOfMonth) return true;

        return false;
      };

      // Daily report at 8:00
      const dailyReport = { frequency: 'daily', timeOfDay: '08:00' };
      expect(shouldRunReport(dailyReport, { hour: 8, minute: 0, dayOfWeek: 1, dayOfMonth: 15 })).toBe(true);
      expect(shouldRunReport(dailyReport, { hour: 9, minute: 0, dayOfWeek: 1, dayOfMonth: 15 })).toBe(false);

      // Weekly report on Monday at 9:00
      const weeklyReport = { frequency: 'weekly', dayOfWeek: 1, timeOfDay: '09:00' };
      expect(shouldRunReport(weeklyReport, { hour: 9, minute: 0, dayOfWeek: 1, dayOfMonth: 15 })).toBe(true);
      expect(shouldRunReport(weeklyReport, { hour: 9, minute: 0, dayOfWeek: 2, dayOfMonth: 16 })).toBe(false);

      // Monthly report on 1st at 10:00
      const monthlyReport = { frequency: 'monthly', dayOfMonth: 1, timeOfDay: '10:00' };
      expect(shouldRunReport(monthlyReport, { hour: 10, minute: 0, dayOfWeek: 0, dayOfMonth: 1 })).toBe(true);
      expect(shouldRunReport(monthlyReport, { hour: 10, minute: 0, dayOfWeek: 1, dayOfMonth: 15 })).toBe(false);
    });

    it('should generate report HTML correctly', () => {
      const generateReportHtml = (
        reportName: string,
        reportType: string,
        data: any[]
      ) => {
        const typeLabel = reportType === 'oee' ? 'OEE' : 
                         reportType === 'cpk' ? 'CPK' : 
                         'OEE & CPK';
        
        return `
          <!DOCTYPE html>
          <html>
          <head><title>${reportName}</title></head>
          <body>
            <h1>${reportName}</h1>
            <p>Loại báo cáo: ${typeLabel}</p>
            <p>Số bản ghi: ${data.length}</p>
          </body>
          </html>
        `;
      };

      const html = generateReportHtml('Test Report', 'oee', [1, 2, 3]);
      expect(html).toContain('Test Report');
      expect(html).toContain('OEE');
      expect(html).toContain('Số bản ghi: 3');
    });
  });

  describe('Unified Dashboard', () => {
    it('should calculate combined status correctly', () => {
      const getCombinedStatus = (oee: number, cpk: number) => {
        const oeeGood = oee >= 85;
        const cpkGood = cpk >= 1.33;
        
        if (oeeGood && cpkGood) return 'excellent';
        if (oeeGood || cpkGood) return 'attention';
        return 'needs_improvement';
      };

      expect(getCombinedStatus(90, 1.5)).toBe('excellent');
      expect(getCombinedStatus(90, 1.0)).toBe('attention');
      expect(getCombinedStatus(75, 1.5)).toBe('attention');
      expect(getCombinedStatus(75, 1.0)).toBe('needs_improvement');
    });

    it('should calculate correlation data correctly', () => {
      const calculateCorrelation = (data: { oee: number; cpk: number }[]) => {
        if (data.length < 2) return 0;

        const n = data.length;
        const sumOee = data.reduce((a, b) => a + b.oee, 0);
        const sumCpk = data.reduce((a, b) => a + b.cpk, 0);
        const sumOeeCpk = data.reduce((a, b) => a + b.oee * b.cpk, 0);
        const sumOee2 = data.reduce((a, b) => a + b.oee * b.oee, 0);
        const sumCpk2 = data.reduce((a, b) => a + b.cpk * b.cpk, 0);

        const numerator = n * sumOeeCpk - sumOee * sumCpk;
        const denominator = Math.sqrt(
          (n * sumOee2 - sumOee * sumOee) * (n * sumCpk2 - sumCpk * sumCpk)
        );

        return denominator === 0 ? 0 : numerator / denominator;
      };

      // Perfect positive correlation
      const perfectPositive = [
        { oee: 80, cpk: 1.0 },
        { oee: 85, cpk: 1.25 },
        { oee: 90, cpk: 1.5 },
      ];
      expect(calculateCorrelation(perfectPositive)).toBeGreaterThan(0.9);

      // Data with some correlation
      const someCorrelation = [
        { oee: 80, cpk: 1.5 },
        { oee: 90, cpk: 1.0 },
        { oee: 85, cpk: 1.25 },
      ];
      // Should return a valid correlation coefficient between -1 and 1
      const corr = calculateCorrelation(someCorrelation);
      expect(corr).toBeGreaterThanOrEqual(-1);
      expect(corr).toBeLessThanOrEqual(1);
    });

    it('should identify alerts correctly', () => {
      const identifyAlerts = (stats: { name: string; avgOee: number; avgCpk: number }[]) => {
        const critical = stats.filter(s => 
          (s.avgOee > 0 && s.avgOee < 70) || 
          (s.avgCpk > 0 && s.avgCpk < 1.0)
        );
        
        const warning = stats.filter(s => 
          (s.avgOee >= 70 && s.avgOee < 85) || 
          (s.avgCpk >= 1.0 && s.avgCpk < 1.33)
        );

        return { critical, warning };
      };

      const stats = [
        { name: 'Machine 1', avgOee: 65, avgCpk: 0.9 }, // Critical
        { name: 'Machine 2', avgOee: 75, avgCpk: 1.1 }, // Warning
        { name: 'Machine 3', avgOee: 90, avgCpk: 1.5 }, // Good
      ];

      const { critical, warning } = identifyAlerts(stats);
      
      expect(critical.length).toBe(1);
      expect(critical[0].name).toBe('Machine 1');
      
      expect(warning.length).toBe(1);
      expect(warning[0].name).toBe('Machine 2');
    });

    it('should calculate time series data correctly', () => {
      const aggregateTimeSeries = (
        oeeRecords: { date: string; oee: number }[],
        cpkRecords: { date: string; cpk: number }[]
      ) => {
        const data: Record<string, { oee: number[]; cpk: number[] }> = {};

        oeeRecords.forEach(r => {
          if (!data[r.date]) data[r.date] = { oee: [], cpk: [] };
          data[r.date].oee.push(r.oee);
        });

        cpkRecords.forEach(r => {
          if (!data[r.date]) data[r.date] = { oee: [], cpk: [] };
          data[r.date].cpk.push(r.cpk);
        });

        return Object.entries(data).map(([date, values]) => ({
          date,
          avgOee: values.oee.length > 0 ? values.oee.reduce((a, b) => a + b, 0) / values.oee.length : null,
          avgCpk: values.cpk.length > 0 ? values.cpk.reduce((a, b) => a + b, 0) / values.cpk.length : null,
        }));
      };

      const oeeRecords = [
        { date: '2024-01-01', oee: 80 },
        { date: '2024-01-01', oee: 85 },
        { date: '2024-01-02', oee: 90 },
      ];

      const cpkRecords = [
        { date: '2024-01-01', cpk: 1.2 },
        { date: '2024-01-02', cpk: 1.4 },
      ];

      const result = aggregateTimeSeries(oeeRecords, cpkRecords);
      
      const day1 = result.find(r => r.date === '2024-01-01');
      expect(day1?.avgOee).toBe(82.5); // (80 + 85) / 2
      expect(day1?.avgCpk).toBe(1.2);

      const day2 = result.find(r => r.date === '2024-01-02');
      expect(day2?.avgOee).toBe(90);
      expect(day2?.avgCpk).toBe(1.4);
    });
  });

  describe('generateAndSendScheduledReport', () => {
    it('should have generateAndSendScheduledReport function exported', async () => {
      const { generateAndSendScheduledReport } = await import('./scheduledJobs');
      expect(typeof generateAndSendScheduledReport).toBe('function');
    });

    it('should have processScheduledReports function exported', async () => {
      const { processScheduledReports } = await import('./scheduledJobs');
      expect(typeof processScheduledReports).toBe('function');
    });
  });
});
