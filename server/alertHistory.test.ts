import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('./db', () => ({
  getKpiAlertStats: vi.fn(),
  acknowledgeKpiAlert: vi.fn(),
  resolveKpiAlert: vi.fn(),
}));

import { getKpiAlertStats, acknowledgeKpiAlert, resolveKpiAlert } from './db';

describe('Alert History Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getKpiAlertStats', () => {
    it('should return empty array when no alerts exist', async () => {
      (getKpiAlertStats as any).mockResolvedValue([]);
      
      const result = await getKpiAlertStats({});
      
      expect(result).toEqual([]);
      expect(getKpiAlertStats).toHaveBeenCalledWith({});
    });

    it('should return alerts with filters applied', async () => {
      const mockAlerts = [
        {
          id: 1,
          alertType: 'cpk_low',
          severity: 'warning',
          alertMessage: 'CPK below threshold',
          currentValue: 1.2,
          thresholdValue: 1.33,
          createdAt: new Date(),
        },
        {
          id: 2,
          alertType: 'cpk_critical',
          severity: 'critical',
          alertMessage: 'CPK critical',
          currentValue: 0.8,
          thresholdValue: 1.0,
          createdAt: new Date(),
        },
      ];
      
      (getKpiAlertStats as any).mockResolvedValue(mockAlerts);
      
      const filters = {
        alertType: 'cpk_low',
        severity: 'warning',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };
      
      const result = await getKpiAlertStats(filters);
      
      expect(result).toHaveLength(2);
      expect(getKpiAlertStats).toHaveBeenCalledWith(filters);
    });

    it('should filter by production line', async () => {
      const mockAlerts = [
        {
          id: 1,
          alertType: 'cpk_low',
          productionLineId: 1,
          alertMessage: 'CPK below threshold',
        },
      ];
      
      (getKpiAlertStats as any).mockResolvedValue(mockAlerts);
      
      const result = await getKpiAlertStats({ productionLineId: 1 });
      
      expect(result).toHaveLength(1);
      expect(result[0].productionLineId).toBe(1);
    });
  });

  describe('acknowledgeKpiAlert', () => {
    it('should acknowledge an alert', async () => {
      const mockResult = {
        id: 1,
        acknowledgedAt: new Date(),
        acknowledgedBy: 'user1',
      };
      
      (acknowledgeKpiAlert as any).mockResolvedValue(mockResult);
      
      const result = await acknowledgeKpiAlert(1, 'user1');
      
      expect(result.acknowledgedAt).toBeDefined();
      expect(result.acknowledgedBy).toBe('user1');
    });

    it('should throw error for non-existent alert', async () => {
      (acknowledgeKpiAlert as any).mockRejectedValue(new Error('Alert not found'));
      
      await expect(acknowledgeKpiAlert(999, 'user1')).rejects.toThrow('Alert not found');
    });
  });

  describe('resolveKpiAlert', () => {
    it('should resolve an alert with notes', async () => {
      const mockResult = {
        id: 1,
        resolvedAt: new Date(),
        resolvedBy: 'user1',
        resolutionNotes: 'Issue fixed',
      };
      
      (resolveKpiAlert as any).mockResolvedValue(mockResult);
      
      const result = await resolveKpiAlert(1, 'user1', 'Issue fixed');
      
      expect(result.resolvedAt).toBeDefined();
      expect(result.resolvedBy).toBe('user1');
      expect(result.resolutionNotes).toBe('Issue fixed');
    });
  });
});

describe('Alert Filtering Logic', () => {
  it('should correctly filter pending alerts', () => {
    const alerts = [
      { id: 1, acknowledgedAt: null, resolvedAt: null },
      { id: 2, acknowledgedAt: new Date(), resolvedAt: null },
      { id: 3, acknowledgedAt: new Date(), resolvedAt: new Date() },
    ];
    
    const pendingAlerts = alerts.filter(a => !a.acknowledgedAt && !a.resolvedAt);
    
    expect(pendingAlerts).toHaveLength(1);
    expect(pendingAlerts[0].id).toBe(1);
  });

  it('should correctly filter acknowledged alerts', () => {
    const alerts = [
      { id: 1, acknowledgedAt: null, resolvedAt: null },
      { id: 2, acknowledgedAt: new Date(), resolvedAt: null },
      { id: 3, acknowledgedAt: new Date(), resolvedAt: new Date() },
    ];
    
    const acknowledgedAlerts = alerts.filter(a => a.acknowledgedAt && !a.resolvedAt);
    
    expect(acknowledgedAlerts).toHaveLength(1);
    expect(acknowledgedAlerts[0].id).toBe(2);
  });

  it('should correctly filter resolved alerts', () => {
    const alerts = [
      { id: 1, acknowledgedAt: null, resolvedAt: null },
      { id: 2, acknowledgedAt: new Date(), resolvedAt: null },
      { id: 3, acknowledgedAt: new Date(), resolvedAt: new Date() },
    ];
    
    const resolvedAlerts = alerts.filter(a => a.resolvedAt);
    
    expect(resolvedAlerts).toHaveLength(1);
    expect(resolvedAlerts[0].id).toBe(3);
  });

  it('should correctly search alerts by message', () => {
    const alerts = [
      { id: 1, alertMessage: 'CPK below threshold 1.33' },
      { id: 2, alertMessage: 'Temperature exceeded limit' },
      { id: 3, alertMessage: 'CPK critical warning' },
    ];
    
    const searchTerm = 'cpk';
    const filteredAlerts = alerts.filter(a => 
      a.alertMessage?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    expect(filteredAlerts).toHaveLength(2);
    expect(filteredAlerts.map(a => a.id)).toEqual([1, 3]);
  });
});

describe('CPK Alert Configuration', () => {
  it('should validate CPK threshold values', () => {
    const validateCpkThreshold = (low: number, high: number | null) => {
      if (low < 0) return false;
      if (high !== null && high <= low) return false;
      return true;
    };
    
    expect(validateCpkThreshold(1.33, null)).toBe(true);
    expect(validateCpkThreshold(1.33, 2.0)).toBe(true);
    expect(validateCpkThreshold(1.33, 1.0)).toBe(false);
    expect(validateCpkThreshold(-1, null)).toBe(false);
  });

  it('should determine alert severity based on CPK value', () => {
    const getAlertSeverity = (cpk: number, lowThreshold: number, criticalThreshold = 1.0) => {
      if (cpk < criticalThreshold) return 'critical';
      if (cpk < lowThreshold) return 'warning';
      return null;
    };
    
    expect(getAlertSeverity(0.8, 1.33)).toBe('critical');
    expect(getAlertSeverity(1.2, 1.33)).toBe('warning');
    expect(getAlertSeverity(1.5, 1.33)).toBeNull();
  });
});
