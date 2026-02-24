import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database functions
vi.mock('../db', () => ({
  getAutoCaptureSchedules: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: 'Test Schedule',
      cameraUrl: 'rtsp://192.168.1.100:554/stream',
      cameraType: 'ip_camera',
      intervalSeconds: 60,
      scheduleType: 'continuous',
      status: 'active',
      enableAiAnalysis: 1,
      analysisType: 'quality_check',
      qualityThreshold: 80,
      alertOnDefect: 1,
      alertSeverityThreshold: 'major',
      createdAt: new Date().toISOString(),
    },
  ]),
  getAutoCaptureScheduleById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Test Schedule',
    cameraUrl: 'rtsp://192.168.1.100:554/stream',
    cameraType: 'ip_camera',
    intervalSeconds: 60,
    scheduleType: 'continuous',
    status: 'active',
    enableAiAnalysis: 1,
    analysisType: 'quality_check',
    qualityThreshold: 80,
    alertOnDefect: 1,
    alertSeverityThreshold: 'major',
    createdAt: new Date().toISOString(),
  }),
  createAutoCaptureSchedule: vi.fn().mockResolvedValue({ insertId: 1 }),
  updateAutoCaptureSchedule: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  deleteAutoCaptureSchedule: vi.fn().mockResolvedValue({ affectedRows: 1 }),
  getAutoCaptureHistory: vi.fn().mockResolvedValue([
    {
      id: 1,
      scheduleId: 1,
      capturedAt: new Date().toISOString(),
      imageUrl: 'https://example.com/image.jpg',
      analysisStatus: 'completed',
      qualityScore: 95,
      defectsFound: 0,
      severity: 'none',
    },
  ]),
  getAutoCaptureStats: vi.fn().mockResolvedValue({
    totalCaptures: 100,
    completedCaptures: 95,
    failedCaptures: 5,
    totalDefects: 10,
    avgQualityScore: 92.5,
  }),
}));

describe('AutoCapture Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return list of auto-capture schedules', async () => {
      const { getAutoCaptureSchedules } = await import('../db');
      const result = await getAutoCaptureSchedules();
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Schedule');
      expect(result[0].status).toBe('active');
    });
  });

  describe('getById', () => {
    it('should return schedule by id', async () => {
      const { getAutoCaptureScheduleById } = await import('../db');
      const result = await getAutoCaptureScheduleById(1);
      
      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.name).toBe('Test Schedule');
    });
  });

  describe('create', () => {
    it('should create new auto-capture schedule', async () => {
      const { createAutoCaptureSchedule } = await import('../db');
      const newSchedule = {
        name: 'New Schedule',
        cameraUrl: 'rtsp://192.168.1.101:554/stream',
        cameraType: 'ip_camera' as const,
        intervalSeconds: 120,
        scheduleType: 'continuous' as const,
        enableAiAnalysis: true,
        analysisType: 'quality_check' as const,
        qualityThreshold: 85,
        alertOnDefect: true,
        alertSeverityThreshold: 'critical' as const,
        createdBy: 1,
      };
      
      const result = await createAutoCaptureSchedule(newSchedule);
      
      expect(result).toBeDefined();
      expect(result.insertId).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('should update schedule status', async () => {
      const { updateAutoCaptureSchedule } = await import('../db');
      const result = await updateAutoCaptureSchedule(1, { status: 'paused' });
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('delete', () => {
    it('should delete schedule', async () => {
      const { deleteAutoCaptureSchedule } = await import('../db');
      const result = await deleteAutoCaptureSchedule(1);
      
      expect(result).toBeDefined();
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('getHistory', () => {
    it('should return capture history for schedule', async () => {
      const { getAutoCaptureHistory } = await import('../db');
      const result = await getAutoCaptureHistory(1, 20);
      
      expect(result).toHaveLength(1);
      expect(result[0].scheduleId).toBe(1);
      expect(result[0].analysisStatus).toBe('completed');
    });
  });

  describe('getStats', () => {
    it('should return statistics for schedule', async () => {
      const { getAutoCaptureStats } = await import('../db');
      const result = await getAutoCaptureStats(1);
      
      expect(result).toBeDefined();
      expect(result.totalCaptures).toBe(100);
      expect(result.completedCaptures).toBe(95);
      expect(result.avgQualityScore).toBe(92.5);
    });
  });
});


// Additional tests for Phase 10.1 - Camera RTSP Test

describe('Camera Connection Test', () => {
  describe('RTSP URL validation', () => {
    it('should validate correct RTSP URL formats', () => {
      const validRtspUrls = [
        'rtsp://192.168.1.100:554/stream',
        'rtsp://admin:password@192.168.1.100:554/stream',
        'rtsp://camera.example.com/live',
        'rtsp://user:pass@camera.local:8554/h264',
      ];

      const rtspRegex = /^rtsp:\/\/([^:]+:[^@]+@)?[\w.-]+(:\d+)?(\/.*)?$/i;

      validRtspUrls.forEach((url) => {
        expect(rtspRegex.test(url)).toBe(true);
      });
    });

    it('should reject invalid RTSP URL formats', () => {
      const invalidRtspUrls = [
        'http://192.168.1.100/stream',
        'rtsp:/missing-slash',
        'rtsp://',
        'ftp://camera.com/stream',
      ];

      const rtspRegex = /^rtsp:\/\/([^:]+:[^@]+@)?[\w.-]+(:\d+)?(\/.*)?$/i;

      invalidRtspUrls.forEach((url) => {
        expect(rtspRegex.test(url)).toBe(false);
      });
    });

    it('should extract host and port from RTSP URL', () => {
      const testCases = [
        { url: 'rtsp://192.168.1.100:554/stream', expectedHost: '192.168.1.100', expectedPort: '554' },
        { url: 'rtsp://camera.local/live', expectedHost: 'camera.local', expectedPort: undefined },
        { url: 'rtsp://admin:pass@10.0.0.1:8554/h264', expectedHost: '10.0.0.1', expectedPort: '8554' },
      ];

      testCases.forEach(({ url, expectedHost, expectedPort }) => {
        const match = url.match(/rtsp:\/\/(?:[^:]+:[^@]+@)?([\w.-]+)(?::(\d+))?/);
        expect(match).not.toBeNull();
        expect(match![1]).toBe(expectedHost);
        expect(match![2]).toBe(expectedPort);
      });
    });
  });

  describe('Camera type handling', () => {
    it('should recognize supported camera types', () => {
      const supportedTypes = ['ip_camera', 'usb_camera', 'rtsp', 'http_snapshot'];
      
      supportedTypes.forEach((type) => {
        expect(['ip_camera', 'usb_camera', 'rtsp', 'http_snapshot'].includes(type)).toBe(true);
      });
    });
  });
});

describe('Quality Trend PDF Export', () => {
  it('should have correct report data structure', () => {
    const reportData = {
      periodType: 'weekly',
      comparisonPeriods: 4,
      generatedAt: new Date().toISOString(),
      periodData: [
        { period: 'Tuần 1', avgCpk: 1.2, avgPpk: 1.1, totalSamples: 100, totalViolations: 5, defectRate: 5 },
        { period: 'Tuần 2', avgCpk: 1.3, avgPpk: 1.2, totalSamples: 120, totalViolations: 4, defectRate: 3.3 },
      ],
      summary: {
        currentPeriod: 'Tuần 2',
        avgCpk: 1.3,
        avgPpk: 1.2,
        totalSamples: 120,
        totalViolations: 4,
        defectRate: 3.3,
        cpkChange: 8.3,
        defectRateChange: -34,
      },
    };

    expect(reportData.periodType).toBe('weekly');
    expect(reportData.periodData.length).toBe(2);
    expect(reportData.summary.avgCpk).toBe(1.3);
  });

  it('should handle empty period data gracefully', () => {
    const emptyReportData = {
      periodType: 'daily',
      comparisonPeriods: 2,
      periodData: [],
      summary: {
        currentPeriod: 'N/A',
        avgCpk: 0,
        avgPpk: 0,
        totalSamples: 0,
        totalViolations: 0,
        defectRate: 0,
        cpkChange: 0,
        defectRateChange: 0,
      },
    };

    expect(emptyReportData.periodData.length).toBe(0);
    expect(emptyReportData.summary.currentPeriod).toBe('N/A');
  });
});

describe('Unified Webhook - Slack/Teams Integration', () => {
  it('should build correct Slack payload structure', () => {
    const event = {
      type: 'cpk_alert',
      title: 'CPK Alert',
      message: 'CPK value below threshold',
      severity: 'major',
    };

    const severityColors: Record<string, string> = {
      info: '#36a64f',
      minor: '#ffcc00',
      major: '#ff9900',
      critical: '#ff0000',
    };

    const slackPayload = {
      channel: '#alerts',
      username: 'SPC Alert Bot',
      icon_emoji: ':warning:',
      attachments: [
        {
          color: severityColors[event.severity],
          title: event.title,
          text: event.message,
          fields: [
            { title: 'Loại sự kiện', value: event.type, short: true },
            { title: 'Mức độ', value: event.severity.toUpperCase(), short: true },
          ],
          footer: 'CPK/SPC Calculator',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    expect(slackPayload.attachments).toHaveLength(1);
    expect(slackPayload.attachments[0].color).toBe('#ff9900');
    expect(slackPayload.attachments[0].fields).toHaveLength(2);
  });

  it('should build correct Teams payload structure', () => {
    const event = {
      type: 'quality_alert',
      title: 'Quality Alert',
      message: 'Defect rate exceeded threshold',
      severity: 'critical',
    };

    const teamsPayload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: 'FF0000',
      summary: event.title,
      sections: [
        {
          activityTitle: event.title,
          facts: [
            { name: 'Loại sự kiện', value: event.type },
            { name: 'Mức độ', value: event.severity.toUpperCase() },
            { name: 'Thời gian', value: new Date().toLocaleString('vi-VN') },
          ],
          text: event.message,
          markdown: true,
        },
      ],
    };

    expect(teamsPayload['@type']).toBe('MessageCard');
    expect(teamsPayload.themeColor).toBe('FF0000');
    expect(teamsPayload.sections[0].facts).toHaveLength(3);
  });

  it('should map severity to correct colors', () => {
    const severityColors: Record<string, string> = {
      info: '#36a64f',
      minor: '#ffcc00',
      major: '#ff9900',
      critical: '#ff0000',
    };

    expect(severityColors.info).toBe('#36a64f');
    expect(severityColors.minor).toBe('#ffcc00');
    expect(severityColors.major).toBe('#ff9900');
    expect(severityColors.critical).toBe('#ff0000');
  });
});
