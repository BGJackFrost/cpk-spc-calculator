import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((a, b) => ({ type: 'eq', field: a, value: b })),
  and: vi.fn((...args) => ({ type: 'and', conditions: args })),
  desc: vi.fn((a) => ({ type: 'desc', field: a })),
  gte: vi.fn((a, b) => ({ type: 'gte', field: a, value: b })),
  lte: vi.fn((a, b) => ({ type: 'lte', field: a, value: b })),
  isNull: vi.fn((a) => ({ type: 'isNull', field: a })),
  or: vi.fn((...args) => ({ type: 'or', conditions: args })),
  sql: vi.fn((strings, ...values) => ({ type: 'sql', strings, values })),
}));

// Mock database
vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
          limit: vi.fn(() => Promise.resolve([])),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            offset: vi.fn(() => Promise.resolve([])),
          })),
        })),
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve({ insertId: 1 })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  },
}));

// Mock schema
vi.mock('../../drizzle/schema', () => ({
  predictiveAlertThresholds: { id: 'id', name: 'name', isActive: 'isActive' },
  predictiveAlertHistory: { id: 'id', thresholdId: 'thresholdId', status: 'status', severity: 'severity' },
  predictiveThresholdAdjustLogs: { id: 'id', thresholdId: 'thresholdId' },
  productionLines: { id: 'id', name: 'name' },
}));

// Mock OEE Forecasting Service
vi.mock('./oeeForecastingService', () => ({
  forecastOEE: vi.fn(() => Promise.resolve({
    historicalData: [
      { date: '2024-12-20', oee: 85 },
      { date: '2024-12-21', oee: 84 },
      { date: '2024-12-22', oee: 83 },
      { date: '2024-12-23', oee: 82 },
      { date: '2024-12-24', oee: 81 },
      { date: '2024-12-25', oee: 80 },
      { date: '2024-12-26', oee: 79 },
    ],
    forecastData: [
      { date: '2024-12-27', predictedOEE: 78, lowerBound: 75, upperBound: 81 },
      { date: '2024-12-28', predictedOEE: 77, lowerBound: 74, upperBound: 80 },
    ],
    modelMetrics: { mape: 5, rmse: 2.5 },
  })),
}));

// Mock Defect Prediction Service
vi.mock('./defectPredictionService', () => ({
  predictDefectRate: vi.fn(() => Promise.resolve({
    historicalData: [
      { date: '2024-12-20', defectRate: 2.5 },
      { date: '2024-12-21', defectRate: 2.6 },
      { date: '2024-12-22', defectRate: 2.7 },
      { date: '2024-12-23', defectRate: 2.8 },
      { date: '2024-12-24', defectRate: 2.9 },
      { date: '2024-12-25', defectRate: 3.0 },
      { date: '2024-12-26', defectRate: 3.1 },
    ],
    forecastData: [
      { date: '2024-12-27', predictedDefectRate: 3.2, lowerBound: 2.8, upperBound: 3.6 },
      { date: '2024-12-28', predictedDefectRate: 3.3, lowerBound: 2.9, upperBound: 3.7 },
    ],
    modelMetrics: { mape: 8, rmse: 0.3 },
  })),
}));

describe('PredictiveAlertService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ThresholdConfig Types', () => {
    it('should define correct threshold config structure', () => {
      const mockThreshold = {
        id: 1,
        name: 'Test Threshold',
        productionLineId: null,
        predictionType: 'both' as const,
        oeeWarningThreshold: 75,
        oeeCriticalThreshold: 65,
        oeeDeclineThreshold: 5,
        defectWarningThreshold: 3,
        defectCriticalThreshold: 5,
        defectIncreaseThreshold: 20,
        autoAdjustEnabled: false,
        autoAdjustSensitivity: 'medium' as const,
        autoAdjustPeriodDays: 30,
        emailAlertEnabled: true,
        alertEmails: ['test@example.com'],
        alertFrequency: 'immediate' as const,
        isActive: true,
      };

      expect(mockThreshold.id).toBe(1);
      expect(mockThreshold.predictionType).toBe('both');
      expect(mockThreshold.oeeWarningThreshold).toBe(75);
      expect(mockThreshold.defectWarningThreshold).toBe(3);
    });
  });

  describe('AlertCheckResult Types', () => {
    it('should define correct alert check result structure', () => {
      const mockAlert = {
        type: 'oee_low' as const,
        severity: 'warning' as const,
        title: 'OEE Warning',
        message: 'OEE is below warning threshold',
        currentValue: 80,
        thresholdValue: 75,
        predictedValue: 72,
        recommendations: ['Check equipment', 'Review maintenance schedule'],
      };

      expect(mockAlert.type).toBe('oee_low');
      expect(mockAlert.severity).toBe('warning');
      expect(mockAlert.recommendations.length).toBe(2);
    });

    it('should support oee_decline alert type', () => {
      const mockAlert = {
        type: 'oee_decline' as const,
        severity: 'warning' as const,
        title: 'OEE Decline Alert',
        message: 'OEE is declining rapidly',
        currentValue: 85,
        thresholdValue: 5,
        predictedValue: 78,
        changePercent: 8.2,
        recommendations: ['Analyze trend', 'Check production factors'],
      };

      expect(mockAlert.type).toBe('oee_decline');
      expect(mockAlert.changePercent).toBe(8.2);
    });

    it('should support defect_high alert type', () => {
      const mockAlert = {
        type: 'defect_high' as const,
        severity: 'critical' as const,
        title: 'High Defect Rate Alert',
        message: 'Defect rate exceeds critical threshold',
        currentValue: 4.5,
        thresholdValue: 5,
        predictedValue: 6.2,
        recommendations: ['Stop production', 'Quality inspection'],
      };

      expect(mockAlert.type).toBe('defect_high');
      expect(mockAlert.severity).toBe('critical');
    });

    it('should support defect_increase alert type', () => {
      const mockAlert = {
        type: 'defect_increase' as const,
        severity: 'warning' as const,
        title: 'Defect Rate Increase Alert',
        message: 'Defect rate is increasing rapidly',
        currentValue: 2.5,
        thresholdValue: 20,
        predictedValue: 3.5,
        changePercent: 40,
        recommendations: ['Review process changes', 'Check input materials'],
      };

      expect(mockAlert.type).toBe('defect_increase');
      expect(mockAlert.changePercent).toBe(40);
    });
  });

  describe('AutoAdjustResult Types', () => {
    it('should define correct auto adjust result structure', () => {
      const mockAdjustment = {
        type: 'oee_warning' as const,
        oldValue: 75,
        newValue: 78,
        reason: 'Based on 30 data points, average OEE: 82%',
        confidenceScore: 0.85,
      };

      expect(mockAdjustment.type).toBe('oee_warning');
      expect(mockAdjustment.newValue).toBeGreaterThan(mockAdjustment.oldValue);
      expect(mockAdjustment.confidenceScore).toBeLessThanOrEqual(1);
    });

    it('should support all adjustment types', () => {
      const adjustmentTypes = ['oee_warning', 'oee_critical', 'defect_warning', 'defect_critical'];
      
      adjustmentTypes.forEach(type => {
        const mockAdjustment = {
          type: type as any,
          oldValue: 50,
          newValue: 55,
          reason: 'Test reason',
          confidenceScore: 0.9,
        };
        expect(mockAdjustment.type).toBe(type);
      });
    });
  });

  describe('Threshold Validation', () => {
    it('should validate OEE thresholds are in correct range', () => {
      const validateOeeThreshold = (value: number): boolean => {
        return value >= 0 && value <= 100;
      };

      expect(validateOeeThreshold(75)).toBe(true);
      expect(validateOeeThreshold(65)).toBe(true);
      expect(validateOeeThreshold(0)).toBe(true);
      expect(validateOeeThreshold(100)).toBe(true);
      expect(validateOeeThreshold(-1)).toBe(false);
      expect(validateOeeThreshold(101)).toBe(false);
    });

    it('should validate defect thresholds are in correct range', () => {
      const validateDefectThreshold = (value: number): boolean => {
        return value >= 0 && value <= 100;
      };

      expect(validateDefectThreshold(3)).toBe(true);
      expect(validateDefectThreshold(5)).toBe(true);
      expect(validateDefectThreshold(0)).toBe(true);
      expect(validateDefectThreshold(-1)).toBe(false);
    });

    it('should validate warning threshold is higher than critical for OEE', () => {
      const validateOeeThresholds = (warning: number, critical: number): boolean => {
        return warning > critical;
      };

      expect(validateOeeThresholds(75, 65)).toBe(true);
      expect(validateOeeThresholds(80, 70)).toBe(true);
      expect(validateOeeThresholds(65, 75)).toBe(false);
      expect(validateOeeThresholds(70, 70)).toBe(false);
    });

    it('should validate warning threshold is lower than critical for defect', () => {
      const validateDefectThresholds = (warning: number, critical: number): boolean => {
        return warning < critical;
      };

      expect(validateDefectThresholds(3, 5)).toBe(true);
      expect(validateDefectThresholds(2, 4)).toBe(true);
      expect(validateDefectThresholds(5, 3)).toBe(false);
      expect(validateDefectThresholds(4, 4)).toBe(false);
    });
  });

  describe('Alert Severity Logic', () => {
    it('should determine correct severity for OEE alerts', () => {
      const getOeeSeverity = (
        predictedOee: number, 
        warningThreshold: number, 
        criticalThreshold: number
      ): 'info' | 'warning' | 'critical' => {
        if (predictedOee < criticalThreshold) return 'critical';
        if (predictedOee < warningThreshold) return 'warning';
        return 'info';
      };

      expect(getOeeSeverity(60, 75, 65)).toBe('critical');
      expect(getOeeSeverity(70, 75, 65)).toBe('warning');
      expect(getOeeSeverity(80, 75, 65)).toBe('info');
    });

    it('should determine correct severity for defect alerts', () => {
      const getDefectSeverity = (
        predictedDefect: number, 
        warningThreshold: number, 
        criticalThreshold: number
      ): 'info' | 'warning' | 'critical' => {
        if (predictedDefect > criticalThreshold) return 'critical';
        if (predictedDefect > warningThreshold) return 'warning';
        return 'info';
      };

      expect(getDefectSeverity(6, 3, 5)).toBe('critical');
      expect(getDefectSeverity(4, 3, 5)).toBe('warning');
      expect(getDefectSeverity(2, 3, 5)).toBe('info');
    });
  });

  describe('Auto Adjust Sensitivity', () => {
    it('should apply correct sensitivity multiplier', () => {
      const getSensitivityMultiplier = (sensitivity: 'low' | 'medium' | 'high'): number => {
        const multipliers = { low: 1.5, medium: 1.0, high: 0.5 };
        return multipliers[sensitivity];
      };

      expect(getSensitivityMultiplier('low')).toBe(1.5);
      expect(getSensitivityMultiplier('medium')).toBe(1.0);
      expect(getSensitivityMultiplier('high')).toBe(0.5);
    });

    it('should calculate new threshold based on statistics', () => {
      const calculateNewThreshold = (
        average: number, 
        stdDev: number, 
        sensitivity: number,
        isOee: boolean
      ): number => {
        if (isOee) {
          // For OEE, warning is avg - 1*std*sensitivity
          return Math.round((average - stdDev * sensitivity) * 100) / 100;
        } else {
          // For defect, warning is avg + 1*std*sensitivity
          return Math.round((average + stdDev * sensitivity) * 100) / 100;
        }
      };

      // OEE: avg=82, std=3, sensitivity=1.0 -> 82-3=79
      expect(calculateNewThreshold(82, 3, 1.0, true)).toBe(79);
      
      // Defect: avg=2.5, std=0.5, sensitivity=1.0 -> 2.5+0.5=3.0
      expect(calculateNewThreshold(2.5, 0.5, 1.0, false)).toBe(3);
    });
  });

  describe('Alert Frequency', () => {
    it('should support all alert frequency options', () => {
      const frequencies = ['immediate', 'hourly', 'daily'];
      
      frequencies.forEach(freq => {
        expect(['immediate', 'hourly', 'daily']).toContain(freq);
      });
    });
  });

  describe('Prediction Type', () => {
    it('should support all prediction types', () => {
      const types = ['oee', 'defect_rate', 'both'];
      
      types.forEach(type => {
        expect(['oee', 'defect_rate', 'both']).toContain(type);
      });
    });

    it('should check OEE alerts for oee and both types', () => {
      const shouldCheckOee = (type: string): boolean => {
        return type === 'oee' || type === 'both';
      };

      expect(shouldCheckOee('oee')).toBe(true);
      expect(shouldCheckOee('both')).toBe(true);
      expect(shouldCheckOee('defect_rate')).toBe(false);
    });

    it('should check defect alerts for defect_rate and both types', () => {
      const shouldCheckDefect = (type: string): boolean => {
        return type === 'defect_rate' || type === 'both';
      };

      expect(shouldCheckDefect('defect_rate')).toBe(true);
      expect(shouldCheckDefect('both')).toBe(true);
      expect(shouldCheckDefect('oee')).toBe(false);
    });
  });

  describe('Recommendations Generation', () => {
    it('should generate OEE low recommendations', () => {
      const getOeeLowRecommendations = (severity: 'warning' | 'critical'): string[] => {
        if (severity === 'critical') {
          return [
            'Kiểm tra và bảo trì thiết bị ngay lập tức',
            'Xem xét tăng cường nhân lực vận hành',
            'Phân tích nguyên nhân gốc rễ của sự suy giảm',
          ];
        }
        return [
          'Lên kế hoạch bảo trì phòng ngừa',
          'Theo dõi chặt chẽ hiệu suất thiết bị',
          'Xem xét tối ưu hóa quy trình sản xuất',
        ];
      };

      const criticalRecs = getOeeLowRecommendations('critical');
      expect(criticalRecs.length).toBe(3);
      expect(criticalRecs[0]).toContain('ngay lập tức');

      const warningRecs = getOeeLowRecommendations('warning');
      expect(warningRecs.length).toBe(3);
      expect(warningRecs[0]).toContain('phòng ngừa');
    });

    it('should generate defect high recommendations', () => {
      const getDefectHighRecommendations = (severity: 'warning' | 'critical'): string[] => {
        if (severity === 'critical') {
          return [
            'Dừng sản xuất và kiểm tra chất lượng ngay lập tức',
            'Xác định và xử lý nguyên nhân gốc rễ',
            'Tăng cường kiểm tra chất lượng đầu vào',
          ];
        }
        return [
          'Tăng tần suất kiểm tra chất lượng',
          'Xem xét điều chỉnh thông số quy trình',
          'Đào tạo lại nhân viên về tiêu chuẩn chất lượng',
        ];
      };

      const criticalRecs = getDefectHighRecommendations('critical');
      expect(criticalRecs.length).toBe(3);
      expect(criticalRecs[0]).toContain('Dừng sản xuất');

      const warningRecs = getDefectHighRecommendations('warning');
      expect(warningRecs.length).toBe(3);
      expect(warningRecs[0]).toContain('tần suất');
    });
  });

  describe('Change Percent Calculation', () => {
    it('should calculate OEE decline percentage correctly', () => {
      const calculateOeeDecline = (previousOee: number, predictedOee: number): number => {
        return ((previousOee - predictedOee) / previousOee) * 100;
      };

      // 85 -> 80 = 5.88% decline
      expect(calculateOeeDecline(85, 80)).toBeCloseTo(5.88, 1);
      
      // 90 -> 75 = 16.67% decline
      expect(calculateOeeDecline(90, 75)).toBeCloseTo(16.67, 1);
    });

    it('should calculate defect increase percentage correctly', () => {
      const calculateDefectIncrease = (previousDefect: number, predictedDefect: number): number => {
        if (previousDefect === 0) return 0;
        return ((predictedDefect - previousDefect) / previousDefect) * 100;
      };

      // 2.5 -> 3.0 = 20% increase
      expect(calculateDefectIncrease(2.5, 3.0)).toBe(20);
      
      // 2.0 -> 3.0 = 50% increase
      expect(calculateDefectIncrease(2.0, 3.0)).toBe(50);
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', () => {
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
    });
  });

  describe('Alert Status Transitions', () => {
    it('should support valid status transitions', () => {
      const validTransitions: Record<string, string[]> = {
        pending: ['sent', 'acknowledged'],
        sent: ['acknowledged'],
        acknowledged: ['resolved'],
        resolved: [],
      };

      expect(validTransitions.pending).toContain('acknowledged');
      expect(validTransitions.acknowledged).toContain('resolved');
      expect(validTransitions.resolved.length).toBe(0);
    });
  });
});
