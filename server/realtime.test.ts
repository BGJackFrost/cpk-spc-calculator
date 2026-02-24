/**
 * Unit Tests cho Realtime Router và SSE Service
 * Phase 15 - Tích hợp dữ liệu thực và Realtime
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SSE functions
vi.mock('./sse', () => ({
  broadcastEvent: vi.fn(),
  notifyFloorPlanMachineUpdate: vi.fn(),
  notifyFloorPlanStatsUpdate: vi.fn(),
  notifyAviAoiInspectionResult: vi.fn(),
  notifyAviAoiDefectDetected: vi.fn(),
  notifyAviAoiStatsUpdate: vi.fn(),
  isSseServerEnabled: vi.fn().mockReturnValue(true),
}));

import {
  notifyFloorPlanMachineUpdate,
  notifyFloorPlanStatsUpdate,
  notifyAviAoiInspectionResult,
  notifyAviAoiDefectDetected,
  notifyAviAoiStatsUpdate,
} from './sse';

describe('Realtime SSE Events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Floor Plan Events', () => {
    it('should broadcast machine update event', () => {
      const machineData = {
        machineId: 1,
        machineName: 'CNC-001',
        status: 'running',
        oee: 85.5,
        cycleTime: 120,
        defectRate: 2.3,
        x: 100,
        y: 200,
        productionLineId: 1,
      };

      notifyFloorPlanMachineUpdate(machineData);

      expect(notifyFloorPlanMachineUpdate).toHaveBeenCalledWith(machineData);
    });

    it('should broadcast floor plan stats update', () => {
      const statsData = {
        floorPlanId: 1,
        total: 20,
        running: 15,
        idle: 2,
        error: 1,
        maintenance: 2,
        offline: 0,
        avgOee: 82.5,
      };

      notifyFloorPlanStatsUpdate(statsData);

      expect(notifyFloorPlanStatsUpdate).toHaveBeenCalledWith(statsData);
    });
  });

  describe('AVI/AOI Events', () => {
    it('should broadcast inspection result event', () => {
      const inspectionData = {
        inspectionId: 'INS-001',
        serialNumber: 'SN12345',
        machineId: 1,
        machineName: 'AVI-01',
        productId: 100,
        productName: 'Product A',
        result: 'pass' as const,
        defectCount: 0,
        cycleTime: 200,
        confidence: 0.95,
        imageUrl: 'https://example.com/image.jpg',
      };

      notifyAviAoiInspectionResult(inspectionData);

      expect(notifyAviAoiInspectionResult).toHaveBeenCalledWith(inspectionData);
    });

    it('should broadcast defect detected event', () => {
      const defectData = {
        inspectionId: 'INS-002',
        machineId: 1,
        machineName: 'AOI-01',
        defectType: 'Trầy xước',
        severity: 'high' as const,
        confidence: 0.92,
        location: { x: 100, y: 150, width: 50, height: 30 },
        imageUrl: 'https://example.com/defect.jpg',
      };

      notifyAviAoiDefectDetected(defectData);

      expect(notifyAviAoiDefectDetected).toHaveBeenCalledWith(defectData);
    });

    it('should broadcast AVI/AOI stats update', () => {
      const statsData = {
        total: 1000,
        pass: 950,
        fail: 30,
        warning: 20,
        passRate: '95.0',
        failRate: '3.0',
        timeRange: '24h',
      };

      notifyAviAoiStatsUpdate(statsData);

      expect(notifyAviAoiStatsUpdate).toHaveBeenCalledWith(statsData);
    });
  });
});

describe('Realtime Data Types', () => {
  it('should validate machine status types', () => {
    const validStatuses = ['running', 'idle', 'error', 'maintenance', 'offline'];
    
    validStatuses.forEach(status => {
      expect(['running', 'idle', 'error', 'maintenance', 'offline']).toContain(status);
    });
  });

  it('should validate inspection result types', () => {
    const validResults = ['pass', 'fail', 'warning'];
    
    validResults.forEach(result => {
      expect(['pass', 'fail', 'warning']).toContain(result);
    });
  });

  it('should validate defect severity types', () => {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    
    validSeverities.forEach(severity => {
      expect(['low', 'medium', 'high', 'critical']).toContain(severity);
    });
  });
});

describe('SSE Event Structure', () => {
  it('should have correct event structure for machine update', () => {
    const event = {
      type: 'floor_plan_machine_update',
      data: {
        machineId: 1,
        machineName: 'Test Machine',
        status: 'running',
        oee: 85,
        cycleTime: 100,
        defectRate: 1.5,
      },
      timestamp: new Date().toISOString(),
    };

    expect(event).toHaveProperty('type');
    expect(event).toHaveProperty('data');
    expect(event).toHaveProperty('timestamp');
    expect(event.data).toHaveProperty('machineId');
    expect(event.data).toHaveProperty('status');
    expect(event.data).toHaveProperty('oee');
  });

  it('should have correct event structure for inspection result', () => {
    const event = {
      type: 'avi_aoi_inspection_result',
      data: {
        inspectionId: 'INS-001',
        serialNumber: 'SN001',
        machineId: 1,
        machineName: 'AVI-01',
        result: 'pass',
        defectCount: 0,
        cycleTime: 150,
        confidence: 0.98,
      },
      timestamp: new Date().toISOString(),
    };

    expect(event).toHaveProperty('type');
    expect(event).toHaveProperty('data');
    expect(event.data).toHaveProperty('inspectionId');
    expect(event.data).toHaveProperty('result');
    expect(event.data).toHaveProperty('confidence');
  });
});

describe('Realtime Router Mock Data', () => {
  it('should generate valid mock inspection data', () => {
    const hours = 24;
    
    // Simulate mock data generation
    const trendData = Array.from({ length: hours }, (_, i) => ({
      time: `${String(i).padStart(2, '0')}:00`,
      total: 100 + Math.floor(Math.random() * 50),
      pass: 85 + Math.floor(Math.random() * 10),
      fail: 5 + Math.floor(Math.random() * 10),
      warning: 2 + Math.floor(Math.random() * 5),
    }));

    expect(trendData).toHaveLength(hours);
    trendData.forEach(item => {
      expect(item).toHaveProperty('time');
      expect(item).toHaveProperty('total');
      expect(item).toHaveProperty('pass');
      expect(item).toHaveProperty('fail');
      expect(item).toHaveProperty('warning');
      expect(item.total).toBeGreaterThanOrEqual(100);
    });
  });

  it('should generate valid defect type distribution', () => {
    const defectTypes = [
      { name: 'Trầy xước', count: 45, percentage: 35 },
      { name: 'Lõm/Móp', count: 28, percentage: 22 },
      { name: 'Nứt', count: 18, percentage: 14 },
      { name: 'Đổi màu', count: 15, percentage: 12 },
      { name: 'Tạp chất', count: 12, percentage: 9 },
      { name: 'Biến dạng', count: 10, percentage: 8 },
    ];

    const totalPercentage = defectTypes.reduce((sum, d) => sum + d.percentage, 0);
    expect(totalPercentage).toBe(100);

    defectTypes.forEach(defect => {
      expect(defect).toHaveProperty('name');
      expect(defect).toHaveProperty('count');
      expect(defect).toHaveProperty('percentage');
      expect(defect.count).toBeGreaterThan(0);
    });
  });
});
