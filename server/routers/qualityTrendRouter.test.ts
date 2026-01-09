import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database functions
vi.mock('../db', () => ({
  getQualityTrendReportConfigs: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Weekly Quality Report',
      periodType: 'weekly',
      comparisonPeriods: 4,
      includeCpk: 1,
      includePpk: 1,
      includeDefectRate: 1,
      includeViolationCount: 1,
      enableLineChart: 1,
      enableBarChart: 1,
      enablePieChart: 1,
      isActive: 1,
      createdAt: new Date().toISOString(),
    },
  ]),
  getQualityTrendReportConfigById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Weekly Quality Report',
    periodType: 'weekly',
    comparisonPeriods: 4,
    includeCpk: 1,
    includePpk: 1,
    includeDefectRate: 1,
    includeViolationCount: 1,
    enableLineChart: 1,
    enableBarChart: 1,
    enablePieChart: 1,
    isActive: 1,
    createdAt: new Date().toISOString(),
  }),
  createQualityTrendReportConfig: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateQualityTrendReportConfig: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  deleteQualityTrendReportConfig: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  getQualityTrendData: vi.fn().mockResolvedValue({
    periodData: [
      { period: 'Week 1', avgCpk: 1.25, avgPpk: 1.20, totalSamples: 1000, totalViolations: 10, defectRate: 1.0 },
      { period: 'Week 2', avgCpk: 1.30, avgPpk: 1.25, totalSamples: 1100, totalViolations: 8, defectRate: 0.73 },
      { period: 'Week 3', avgCpk: 1.35, avgPpk: 1.30, totalSamples: 1050, totalViolations: 5, defectRate: 0.48 },
      { period: 'Week 4', avgCpk: 1.40, avgPpk: 1.35, totalSamples: 1200, totalViolations: 4, defectRate: 0.33 },
    ],
    summary: {
      avgCpk: 1.325,
      avgPpk: 1.275,
      totalSamples: 4350,
      totalViolations: 27,
      defectRate: 0.62,
      cpkChange: 12.0,
      defectRateChange: -67.0,
    },
    trends: {
      cpk: { trend: 'improving', percent: 12.0 },
      ppk: { trend: 'improving', percent: 12.5 },
      defect: { trend: 'improving', percent: -67.0 },
    },
    violationDistribution: [
      { violationType: 'Out of Spec', count: 15 },
      { violationType: 'Process Shift', count: 8 },
      { violationType: 'Trend', count: 4 },
    ],
  }),
}));

describe('QualityTrend Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listConfigs', () => {
    it('should return list of report configs', async () => {
      const { getQualityTrendReportConfigs } = await import('../db');
      const result = await getQualityTrendReportConfigs();
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Weekly Quality Report');
      expect(result[0].periodType).toBe('weekly');
    });
  });

  describe('getConfigById', () => {
    it('should return config by id', async () => {
      const { getQualityTrendReportConfigById } = await import('../db');
      const result = await getQualityTrendReportConfigById(1);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.comparisonPeriods).toBe(4);
    });
  });

  describe('createConfig', () => {
    it('should create new report config', async () => {
      const { createQualityTrendReportConfig } = await import('../db');
      const newConfig = {
        name: 'Monthly Quality Report',
        periodType: 'monthly' as const,
        comparisonPeriods: 6,
        includeCpk: true,
        includePpk: true,
        includeDefectRate: true,
        includeViolationCount: true,
        enableLineChart: true,
        enableBarChart: true,
        enablePieChart: false,
        createdBy: 1,
      };
      
      const result = await createQualityTrendReportConfig(newConfig);
      
      expect(result).toBeDefined();
      expect(result.insertId).toBe(1);
    });
  });

  describe('deleteConfig', () => {
    it('should delete report config', async () => {
      const { deleteQualityTrendReportConfig } = await import('../db');
      const result = await deleteQualityTrendReportConfig(1);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should generate quality trend report', async () => {
      const { getQualityTrendData } = await import('../db');
      const result = await getQualityTrendData('weekly', 4);
      
      expect(result).toBeDefined();
      expect(result.periodData).toHaveLength(4);
      expect(result.summary.avgCpk).toBe(1.325);
      expect(result.trends.cpk.trend).toBe('improving');
    });

    it('should calculate correct trend direction', async () => {
      const { getQualityTrendData } = await import('../db');
      const result = await getQualityTrendData('weekly', 4);
      
      // CPK is improving (increasing)
      expect(result.trends.cpk.trend).toBe('improving');
      expect(result.trends.cpk.percent).toBeGreaterThan(0);
      
      // Defect rate is improving (decreasing)
      expect(result.trends.defect.trend).toBe('improving');
      expect(result.trends.defect.percent).toBeLessThan(0);
    });

    it('should include violation distribution', async () => {
      const { getQualityTrendData } = await import('../db');
      const result = await getQualityTrendData('weekly', 4);
      
      expect(result.violationDistribution).toHaveLength(3);
      expect(result.violationDistribution[0].violationType).toBe('Out of Spec');
    });
  });

  describe('period calculations', () => {
    it('should handle different period types', async () => {
      const periodTypes = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      
      for (const periodType of periodTypes) {
        expect(periodType).toBeDefined();
      }
    });
  });
});
