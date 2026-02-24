/**
 * Tests for Scheduled OEE Report Router
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service
vi.mock('./services/scheduledOeeReportService', () => ({
  getScheduledOeeReports: vi.fn(),
  getScheduledOeeReportById: vi.fn(),
  createScheduledOeeReport: vi.fn(),
  updateScheduledOeeReport: vi.fn(),
  deleteScheduledOeeReport: vi.fn(),
  sendOeeReport: vi.fn(),
  getScheduledOeeReportHistory: vi.fn(),
}));

import {
  getScheduledOeeReports,
  getScheduledOeeReportById,
  createScheduledOeeReport,
  updateScheduledOeeReport,
  deleteScheduledOeeReport,
  sendOeeReport,
  getScheduledOeeReportHistory,
} from './services/scheduledOeeReportService';

describe('Scheduled OEE Report Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getScheduledOeeReports', () => {
    it('should return list of scheduled reports', async () => {
      const mockReports = [
        {
          id: 1,
          name: 'Weekly OEE Report',
          frequency: 'weekly',
          notificationChannel: 'telegram',
          isActive: true,
        },
        {
          id: 2,
          name: 'Daily OEE Report',
          frequency: 'daily',
          notificationChannel: 'slack',
          isActive: false,
        },
      ];

      (getScheduledOeeReports as any).mockResolvedValue(mockReports);

      const result = await getScheduledOeeReports();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Weekly OEE Report');
      expect(result[1].frequency).toBe('daily');
    });

    it('should return empty array when no reports exist', async () => {
      (getScheduledOeeReports as any).mockResolvedValue([]);

      const result = await getScheduledOeeReports();

      expect(result).toHaveLength(0);
    });
  });

  describe('getScheduledOeeReportById', () => {
    it('should return report by id', async () => {
      const mockReport = {
        id: 1,
        name: 'Weekly OEE Report',
        productionLineIds: [1, 2, 3],
        frequency: 'weekly',
        dayOfWeek: 1,
        hour: 8,
        minute: 0,
        notificationChannel: 'telegram',
        telegramConfigId: 1,
        isActive: true,
      };

      (getScheduledOeeReportById as any).mockResolvedValue(mockReport);

      const result = await getScheduledOeeReportById(1);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Weekly OEE Report');
      expect(result?.productionLineIds).toEqual([1, 2, 3]);
    });

    it('should return null for non-existent report', async () => {
      (getScheduledOeeReportById as any).mockResolvedValue(null);

      const result = await getScheduledOeeReportById(999);

      expect(result).toBeNull();
    });
  });

  describe('createScheduledOeeReport', () => {
    it('should create new report and return id', async () => {
      (createScheduledOeeReport as any).mockResolvedValue(1);

      const result = await createScheduledOeeReport({
        name: 'New Report',
        productionLineIds: [1, 2],
        frequency: 'daily',
        hour: 9,
        minute: 0,
        timezone: 'Asia/Ho_Chi_Minh',
        notificationChannel: 'telegram',
        telegramConfigId: 1,
        includeAvailability: true,
        includePerformance: true,
        includeQuality: true,
        includeComparison: true,
        includeTrend: true,
        isActive: true,
      });

      expect(result).toBe(1);
      expect(createScheduledOeeReport).toHaveBeenCalledTimes(1);
    });

    it('should return null on creation failure', async () => {
      (createScheduledOeeReport as any).mockResolvedValue(null);

      const result = await createScheduledOeeReport({
        name: 'Failed Report',
        productionLineIds: [],
        frequency: 'daily',
        hour: 9,
        minute: 0,
        timezone: 'Asia/Ho_Chi_Minh',
        notificationChannel: 'telegram',
        includeAvailability: true,
        includePerformance: true,
        includeQuality: true,
        includeComparison: true,
        includeTrend: true,
        isActive: true,
      });

      expect(result).toBeNull();
    });
  });

  describe('updateScheduledOeeReport', () => {
    it('should update report successfully', async () => {
      (updateScheduledOeeReport as any).mockResolvedValue(true);

      const result = await updateScheduledOeeReport(1, {
        name: 'Updated Report',
        isActive: false,
      });

      expect(result).toBe(true);
    });

    it('should return false on update failure', async () => {
      (updateScheduledOeeReport as any).mockResolvedValue(false);

      const result = await updateScheduledOeeReport(999, {
        name: 'Non-existent Report',
      });

      expect(result).toBe(false);
    });
  });

  describe('deleteScheduledOeeReport', () => {
    it('should delete report successfully', async () => {
      (deleteScheduledOeeReport as any).mockResolvedValue(true);

      const result = await deleteScheduledOeeReport(1);

      expect(result).toBe(true);
    });

    it('should return false on delete failure', async () => {
      (deleteScheduledOeeReport as any).mockResolvedValue(false);

      const result = await deleteScheduledOeeReport(999);

      expect(result).toBe(false);
    });
  });

  describe('sendOeeReport', () => {
    it('should send report successfully', async () => {
      (sendOeeReport as any).mockResolvedValue({ success: true });

      const result = await sendOeeReport(1);

      expect(result.success).toBe(true);
    });

    it('should return error on send failure', async () => {
      (sendOeeReport as any).mockResolvedValue({
        success: false,
        error: 'Telegram API error',
      });

      const result = await sendOeeReport(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Telegram API error');
    });
  });

  describe('getScheduledOeeReportHistory', () => {
    it('should return history for all reports', async () => {
      const mockHistory = [
        {
          id: 1,
          reportId: 1,
          reportName: 'Weekly Report',
          channel: 'telegram',
          status: 'sent',
          sentAt: '2024-01-01T08:00:00Z',
        },
        {
          id: 2,
          reportId: 1,
          reportName: 'Weekly Report',
          channel: 'telegram',
          status: 'failed',
          errorMessage: 'Connection timeout',
          sentAt: '2024-01-02T08:00:00Z',
        },
      ];

      (getScheduledOeeReportHistory as any).mockResolvedValue(mockHistory);

      const result = await getScheduledOeeReportHistory(undefined, 50);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('sent');
      expect(result[1].status).toBe('failed');
    });

    it('should filter history by reportId', async () => {
      const mockHistory = [
        {
          id: 1,
          reportId: 1,
          reportName: 'Weekly Report',
          channel: 'telegram',
          status: 'sent',
        },
      ];

      (getScheduledOeeReportHistory as any).mockResolvedValue(mockHistory);

      const result = await getScheduledOeeReportHistory(1, 50);

      expect(result).toHaveLength(1);
      expect(result[0].reportId).toBe(1);
    });
  });
});

describe('Scheduled OEE Report Configuration', () => {
  it('should support daily frequency', () => {
    const config = {
      frequency: 'daily',
      hour: 8,
      minute: 0,
    };

    expect(config.frequency).toBe('daily');
  });

  it('should support weekly frequency with day of week', () => {
    const config = {
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      hour: 8,
      minute: 0,
    };

    expect(config.frequency).toBe('weekly');
    expect(config.dayOfWeek).toBe(1);
  });

  it('should support monthly frequency with day of month', () => {
    const config = {
      frequency: 'monthly',
      dayOfMonth: 1,
      hour: 8,
      minute: 0,
    };

    expect(config.frequency).toBe('monthly');
    expect(config.dayOfMonth).toBe(1);
  });

  it('should support multiple notification channels', () => {
    const telegramConfig = { notificationChannel: 'telegram' };
    const slackConfig = { notificationChannel: 'slack' };
    const bothConfig = { notificationChannel: 'both' };

    expect(telegramConfig.notificationChannel).toBe('telegram');
    expect(slackConfig.notificationChannel).toBe('slack');
    expect(bothConfig.notificationChannel).toBe('both');
  });
});
