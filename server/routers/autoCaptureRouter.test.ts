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
