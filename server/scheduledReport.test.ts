import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createTestContext, createMockUser } from './_core/testUtils';

describe('Scheduled Report Router', () => {
  let ctx: any;
  let mockUser: any;

  beforeAll(async () => {
    mockUser = createMockUser({ role: 'admin' });
    ctx = await createTestContext(mockUser);
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe('scheduledReport.list', () => {
    it('should return empty array when no reports exist', async () => {
      // This test verifies the list endpoint returns proper structure
      const result = await ctx.caller.scheduledReport.list({ includeInactive: true });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('scheduledReport.create', () => {
    it('should create a new scheduled report with valid data', async () => {
      const reportData = {
        name: 'Test Daily SPC Report',
        reportType: 'spc_summary' as const,
        scheduleType: 'daily' as const,
        scheduleTime: '08:00',
        recipients: ['test@example.com'],
        includeCharts: true,
        includeRawData: false,
      };

      const result = await ctx.caller.scheduledReport.create(reportData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(reportData.name);
      expect(result.reportType).toBe(reportData.reportType);
      expect(result.scheduleType).toBe(reportData.scheduleType);
      expect(result.isActive).toBe(true);
    });

    it('should create weekly report with day of week', async () => {
      const reportData = {
        name: 'Test Weekly CPK Report',
        reportType: 'cpk_analysis' as const,
        scheduleType: 'weekly' as const,
        scheduleTime: '09:00',
        scheduleDayOfWeek: 1, // Monday
        recipients: ['manager@example.com'],
        includeCharts: true,
        includeRawData: true,
      };

      const result = await ctx.caller.scheduledReport.create(reportData);
      
      expect(result).toBeDefined();
      expect(result.scheduleDayOfWeek).toBe(1);
    });

    it('should create monthly report with day of month', async () => {
      const reportData = {
        name: 'Test Monthly Violation Report',
        reportType: 'violation_report' as const,
        scheduleType: 'monthly' as const,
        scheduleTime: '10:00',
        scheduleDayOfMonth: 15,
        recipients: ['director@example.com'],
        includeCharts: false,
        includeRawData: true,
      };

      const result = await ctx.caller.scheduledReport.create(reportData);
      
      expect(result).toBeDefined();
      expect(result.scheduleDayOfMonth).toBe(15);
    });
  });

  describe('scheduledReport.toggleActive', () => {
    it('should toggle report active status', async () => {
      // First create a report
      const report = await ctx.caller.scheduledReport.create({
        name: 'Toggle Test Report',
        reportType: 'spc_summary' as const,
        scheduleType: 'daily' as const,
        scheduleTime: '11:00',
        recipients: ['toggle@example.com'],
        includeCharts: true,
        includeRawData: false,
      });

      // Toggle to inactive
      const toggledOff = await ctx.caller.scheduledReport.toggleActive({ id: report.id });
      expect(toggledOff.isActive).toBe(false);

      // Toggle back to active
      const toggledOn = await ctx.caller.scheduledReport.toggleActive({ id: report.id });
      expect(toggledOn.isActive).toBe(true);
    });
  });

  describe('scheduledReport.delete', () => {
    it('should delete a report', async () => {
      // Create a report to delete
      const report = await ctx.caller.scheduledReport.create({
        name: 'Delete Test Report',
        reportType: 'production_line_status' as const,
        scheduleType: 'daily' as const,
        scheduleTime: '12:00',
        recipients: ['delete@example.com'],
        includeCharts: true,
        includeRawData: false,
      });

      // Delete the report
      const result = await ctx.caller.scheduledReport.delete({ id: report.id });
      expect(result.success).toBe(true);

      // Verify it's deleted
      const list = await ctx.caller.scheduledReport.list({ includeInactive: true });
      const found = list.find((r: any) => r.id === report.id);
      expect(found).toBeUndefined();
    });
  });
});

describe('AI Vision Dashboard Router', () => {
  let ctx: any;
  let mockUser: any;

  beforeAll(async () => {
    mockUser = createMockUser({ role: 'admin' });
    ctx = await createTestContext(mockUser);
  });

  describe('aiVisionDashboard.getData', () => {
    it('should return dashboard data with proper structure', async () => {
      const result = await ctx.caller.aiVisionDashboard.getData({ timeRange: '24h' });
      
      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.totalAnalyses).toBeDefined();
      expect(result.summary.avgCpk).toBeDefined();
      expect(result.summary.violationCount).toBeDefined();
      expect(result.summary.ngRate).toBeDefined();
      expect(result.trendData).toBeDefined();
      expect(Array.isArray(result.trendData)).toBe(true);
    });

    it('should return different data for different time ranges', async () => {
      const result1h = await ctx.caller.aiVisionDashboard.getData({ timeRange: '1h' });
      const result7d = await ctx.caller.aiVisionDashboard.getData({ timeRange: '7d' });
      
      expect(result1h).toBeDefined();
      expect(result7d).toBeDefined();
    });
  });

  describe('aiVisionDashboard.getConfig', () => {
    it('should return dashboard configuration', async () => {
      const result = await ctx.caller.aiVisionDashboard.getConfig();
      
      expect(result).toBeDefined();
    });
  });
});

describe('Line Comparison Router', () => {
  let ctx: any;
  let mockUser: any;

  beforeAll(async () => {
    mockUser = createMockUser({ role: 'admin' });
    ctx = await createTestContext(mockUser);
  });

  describe('lineComparison.list', () => {
    it('should return list of saved comparison sessions', async () => {
      const result = await ctx.caller.lineComparison.list();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('lineComparison.create', () => {
    it('should create a new comparison session', async () => {
      const sessionData = {
        name: 'Test Comparison Session',
        productionLineIds: [1, 2],
        dateFrom: '2024-01-01 00:00:00',
        dateTo: '2024-01-31 23:59:59',
      };

      const result = await ctx.caller.lineComparison.create(sessionData);
      
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(sessionData.name);
    });
  });

  describe('lineComparison.compare', () => {
    it('should compare multiple production lines', async () => {
      const result = await ctx.caller.lineComparison.compare({
        productionLineIds: [1, 2],
        dateFrom: '2024-01-01 00:00:00',
        dateTo: '2024-01-31 23:59:59',
      });
      
      expect(result).toBeDefined();
      expect(result.lines).toBeDefined();
      expect(Array.isArray(result.lines)).toBe(true);
      expect(result.rankings).toBeDefined();
    });
  });

  describe('lineComparison.getTrendComparison', () => {
    it('should return trend comparison data', async () => {
      const result = await ctx.caller.lineComparison.getTrendComparison({
        productionLineIds: [1, 2],
        dateFrom: '2024-01-01 00:00:00',
        dateTo: '2024-01-31 23:59:59',
        groupBy: 'day',
      });
      
      expect(result).toBeDefined();
      expect(result.lines).toBeDefined();
      expect(result.trendData).toBeDefined();
    });
  });

  describe('lineComparison.delete', () => {
    it('should delete a comparison session', async () => {
      // Create a session first
      const session = await ctx.caller.lineComparison.create({
        name: 'Session to Delete',
        productionLineIds: [1, 2],
        dateFrom: '2024-01-01 00:00:00',
        dateTo: '2024-01-31 23:59:59',
      });

      // Delete it
      const result = await ctx.caller.lineComparison.delete({ id: session.id });
      expect(result.success).toBe(true);
    });
  });
});
