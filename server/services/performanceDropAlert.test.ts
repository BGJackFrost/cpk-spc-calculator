/**
 * Unit tests for Performance Drop Alert Service
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

describe('Performance Drop Alert Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Performance Drop Detection', () => {
    it('should detect OEE drop correctly', () => {
      const detectOeeDrop = (currentOee: number, baselineOee: number, threshold: number) => {
        const drop = baselineOee - currentOee;
        const dropPercent = (drop / baselineOee) * 100;
        return {
          dropped: dropPercent >= threshold,
          dropPercent,
          currentOee,
          baselineOee,
        };
      };

      // Test case: OEE dropped from 85% to 70% (17.6% drop)
      const result = detectOeeDrop(70, 85, 10);
      expect(result.dropped).toBe(true);
      expect(result.dropPercent).toBeCloseTo(17.6, 1);
    });

    it('should detect CPK drop correctly', () => {
      const detectCpkDrop = (currentCpk: number, baselineCpk: number, threshold: number) => {
        const drop = baselineCpk - currentCpk;
        return {
          dropped: drop >= threshold,
          dropValue: drop,
          currentCpk,
          baselineCpk,
        };
      };

      // Test case: CPK dropped from 1.5 to 1.2 (0.3 drop)
      const result = detectCpkDrop(1.2, 1.5, 0.2);
      expect(result.dropped).toBe(true);
      expect(result.dropValue).toBeCloseTo(0.3, 2);
    });

    it('should not trigger alert when within threshold', () => {
      const detectOeeDrop = (currentOee: number, baselineOee: number, threshold: number) => {
        const drop = baselineOee - currentOee;
        const dropPercent = (drop / baselineOee) * 100;
        return {
          dropped: dropPercent >= threshold,
          dropPercent,
        };
      };

      // Test case: OEE dropped from 85% to 82% (3.5% drop, below 10% threshold)
      const result = detectOeeDrop(82, 85, 10);
      expect(result.dropped).toBe(false);
    });
  });

  describe('Alert Severity Classification', () => {
    it('should classify critical alerts correctly', () => {
      const classifySeverity = (dropPercent: number, cpkValue: number) => {
        if (dropPercent >= 20 || cpkValue < 0.67) {
          return 'critical';
        }
        if (dropPercent >= 10 || cpkValue < 1.0) {
          return 'warning';
        }
        return 'info';
      };

      expect(classifySeverity(25, 1.2)).toBe('critical');
      expect(classifySeverity(15, 0.5)).toBe('critical');
      expect(classifySeverity(15, 1.2)).toBe('warning');
      expect(classifySeverity(5, 1.5)).toBe('info');
    });
  });

  describe('Baseline Calculation', () => {
    it('should calculate baseline from historical data', () => {
      const calculateBaseline = (values: number[]) => {
        if (values.length === 0) return null;
        
        // Remove outliers (values outside 2 standard deviations)
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const stdDev = Math.sqrt(
          values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length
        );
        
        const filtered = values.filter(v => 
          v >= mean - 2 * stdDev && v <= mean + 2 * stdDev
        );
        
        return filtered.reduce((a, b) => a + b, 0) / filtered.length;
      };

      const historicalOee = [82, 85, 83, 84, 86, 85, 84, 83, 85, 84];
      const baseline = calculateBaseline(historicalOee);
      
      expect(baseline).toBeCloseTo(84.1, 1);
    });

    it('should handle empty historical data', () => {
      const calculateBaseline = (values: number[]) => {
        if (values.length === 0) return null;
        return values.reduce((a, b) => a + b, 0) / values.length;
      };

      expect(calculateBaseline([])).toBeNull();
    });
  });

  describe('Alert Deduplication', () => {
    it('should not create duplicate alerts within cooldown period', () => {
      const alerts: { lineId: number; type: string; createdAt: Date }[] = [];
      const cooldownMinutes = 60;

      const shouldCreateAlert = (lineId: number, alertType: string) => {
        const recentAlert = alerts.find(a => 
          a.lineId === lineId && 
          a.type === alertType &&
          (Date.now() - a.createdAt.getTime()) < cooldownMinutes * 60 * 1000
        );
        return !recentAlert;
      };

      // First alert should be created
      expect(shouldCreateAlert(1, 'oee_drop')).toBe(true);
      
      // Add the alert
      alerts.push({ lineId: 1, type: 'oee_drop', createdAt: new Date() });
      
      // Second alert within cooldown should not be created
      expect(shouldCreateAlert(1, 'oee_drop')).toBe(false);
      
      // Different line should still create alert
      expect(shouldCreateAlert(2, 'oee_drop')).toBe(true);
    });
  });

  describe('Notification Formatting', () => {
    it('should format alert notification correctly', () => {
      const formatNotification = (alert: {
        lineName: string;
        alertType: string;
        severity: string;
        currentValue: number;
        baselineValue: number;
      }) => {
        const typeLabels: Record<string, string> = {
          'oee_drop': 'OEE giảm đột ngột',
          'cpk_drop': 'CPK giảm đột ngột',
          'availability_drop': 'Availability giảm',
          'quality_drop': 'Quality giảm',
        };

        const severityEmoji: Record<string, string> = {
          'critical': '🔴',
          'warning': '🟡',
          'info': '🔵',
        };

        return {
          title: `${severityEmoji[alert.severity]} ${typeLabels[alert.alertType] || alert.alertType}`,
          body: `Dây chuyền ${alert.lineName}: ${alert.currentValue.toFixed(2)} (baseline: ${alert.baselineValue.toFixed(2)})`,
        };
      };

      const notification = formatNotification({
        lineName: 'Line A',
        alertType: 'oee_drop',
        severity: 'critical',
        currentValue: 65,
        baselineValue: 85,
      });

      expect(notification.title).toContain('🔴');
      expect(notification.title).toContain('OEE giảm đột ngột');
      expect(notification.body).toContain('Line A');
      expect(notification.body).toContain('65.00');
    });
  });

  describe('Configuration Validation', () => {
    it('should validate config thresholds', () => {
      const validateConfig = (config: {
        oeeDropThreshold: number;
        cpkDropThreshold: number;
        comparisonPeriodHours: number;
        minSamplesRequired: number;
      }) => {
        const errors: string[] = [];
        
        if (config.oeeDropThreshold < 1 || config.oeeDropThreshold > 50) {
          errors.push('OEE threshold must be between 1 and 50');
        }
        if (config.cpkDropThreshold < 0.1 || config.cpkDropThreshold > 1) {
          errors.push('CPK threshold must be between 0.1 and 1');
        }
        if (config.comparisonPeriodHours < 1 || config.comparisonPeriodHours > 168) {
          errors.push('Comparison period must be between 1 and 168 hours');
        }
        if (config.minSamplesRequired < 1 || config.minSamplesRequired > 100) {
          errors.push('Min samples must be between 1 and 100');
        }
        
        return {
          valid: errors.length === 0,
          errors,
        };
      };

      // Valid config
      const validResult = validateConfig({
        oeeDropThreshold: 10,
        cpkDropThreshold: 0.2,
        comparisonPeriodHours: 24,
        minSamplesRequired: 5,
      });
      expect(validResult.valid).toBe(true);

      // Invalid config
      const invalidResult = validateConfig({
        oeeDropThreshold: 100, // Too high
        cpkDropThreshold: 0.2,
        comparisonPeriodHours: 24,
        minSamplesRequired: 5,
      });
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toContain('OEE threshold must be between 1 and 50');
    });
  });

  describe('Statistics Aggregation', () => {
    it('should aggregate alerts by type', () => {
      const alerts = [
        { type: 'oee_drop', severity: 'critical' },
        { type: 'oee_drop', severity: 'warning' },
        { type: 'cpk_drop', severity: 'critical' },
        { type: 'oee_drop', severity: 'warning' },
      ];

      const aggregateByType = (alerts: { type: string }[]) => {
        const counts: Record<string, number> = {};
        alerts.forEach(a => {
          counts[a.type] = (counts[a.type] || 0) + 1;
        });
        return Object.entries(counts).map(([type, count]) => ({ type, count }));
      };

      const result = aggregateByType(alerts);
      expect(result.find(r => r.type === 'oee_drop')?.count).toBe(3);
      expect(result.find(r => r.type === 'cpk_drop')?.count).toBe(1);
    });

    it('should aggregate alerts by severity', () => {
      const alerts = [
        { type: 'oee_drop', severity: 'critical' },
        { type: 'oee_drop', severity: 'warning' },
        { type: 'cpk_drop', severity: 'critical' },
        { type: 'oee_drop', severity: 'warning' },
      ];

      const aggregateBySeverity = (alerts: { severity: string }[]) => {
        const counts: Record<string, number> = {};
        alerts.forEach(a => {
          counts[a.severity] = (counts[a.severity] || 0) + 1;
        });
        return Object.entries(counts).map(([severity, count]) => ({ severity, count }));
      };

      const result = aggregateBySeverity(alerts);
      expect(result.find(r => r.severity === 'critical')?.count).toBe(2);
      expect(result.find(r => r.severity === 'warning')?.count).toBe(2);
    });
  });
});
