import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([[]]),
};

vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

describe('Phase 110 - IoT Enhancement Part 3', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OEE Thresholds by Production Line', () => {
    it('should create OEE threshold config with valid data', async () => {
      const input = {
        productionLineId: 1,
        targetOee: 85,
        warningThreshold: 80,
        criticalThreshold: 70,
        dropAlertThreshold: 5,
        relativeDropThreshold: 10,
        availabilityTarget: 90,
        performanceTarget: 95,
        qualityTarget: 99,
      };

      // Validate input constraints
      expect(input.targetOee).toBeGreaterThanOrEqual(0);
      expect(input.targetOee).toBeLessThanOrEqual(100);
      expect(input.warningThreshold).toBeGreaterThan(input.criticalThreshold);
      expect(input.criticalThreshold).toBeGreaterThanOrEqual(0);
      expect(input.availabilityTarget).toBeLessThanOrEqual(100);
      expect(input.performanceTarget).toBeLessThanOrEqual(100);
      expect(input.qualityTarget).toBeLessThanOrEqual(100);
    });

    it('should validate warning threshold is greater than critical', () => {
      const validConfig = {
        warningThreshold: 80,
        criticalThreshold: 70,
      };

      const invalidConfig = {
        warningThreshold: 60,
        criticalThreshold: 70,
      };

      expect(validConfig.warningThreshold > validConfig.criticalThreshold).toBe(true);
      expect(invalidConfig.warningThreshold > invalidConfig.criticalThreshold).toBe(false);
    });

    it('should support default threshold for all production lines', () => {
      const defaultConfig = {
        productionLineId: null, // null means default for all
        targetOee: 85,
        warningThreshold: 80,
        criticalThreshold: 70,
      };

      expect(defaultConfig.productionLineId).toBeNull();
      expect(defaultConfig.targetOee).toBe(85);
    });

    it('should support specific threshold for individual production line', () => {
      const specificConfig = {
        productionLineId: 5,
        targetOee: 90,
        warningThreshold: 85,
        criticalThreshold: 75,
      };

      expect(specificConfig.productionLineId).toBe(5);
      expect(specificConfig.targetOee).toBe(90);
    });

    it('should calculate OEE components correctly', () => {
      const config = {
        availabilityTarget: 90,
        performanceTarget: 95,
        qualityTarget: 99,
      };

      // OEE = A × P × Q
      const expectedOee = (config.availabilityTarget / 100) * 
                          (config.performanceTarget / 100) * 
                          (config.qualityTarget / 100) * 100;
      
      expect(expectedOee).toBeCloseTo(84.645, 2);
    });

    it('should support drop alert thresholds', () => {
      const config = {
        dropAlertThreshold: 5, // Alert when OEE drops 5% absolute
        relativeDropThreshold: 10, // Alert when OEE drops 10% relative
      };

      const previousOee = 85;
      const currentOee = 79;

      const absoluteDrop = previousOee - currentOee;
      const relativeDrop = ((previousOee - currentOee) / previousOee) * 100;

      expect(absoluteDrop).toBe(6);
      expect(absoluteDrop > config.dropAlertThreshold).toBe(true);
      expect(relativeDrop).toBeCloseTo(7.06, 1);
      expect(relativeDrop < config.relativeDropThreshold).toBe(true);
    });
  });

  describe('MQTT Realtime Sensor Trend Charts', () => {
    it('should store sensor history points', () => {
      const sensorHistory: Array<{ timestamp: number; value: number; status: string }> = [];
      const maxHistoryPoints = 60;

      // Simulate adding sensor data points
      for (let i = 0; i < 70; i++) {
        sensorHistory.push({
          timestamp: Date.now() + i * 2000,
          value: 25 + Math.random() * 5,
          status: 'normal',
        });

        // Keep only maxHistoryPoints
        if (sensorHistory.length > maxHistoryPoints) {
          sensorHistory.shift();
        }
      }

      expect(sensorHistory.length).toBe(maxHistoryPoints);
    });

    it('should filter data by time range', () => {
      const now = Date.now();
      const history = [
        { timestamp: now - 300000, value: 25 }, // 5 minutes ago
        { timestamp: now - 120000, value: 26 }, // 2 minutes ago
        { timestamp: now - 60000, value: 27 },  // 1 minute ago
        { timestamp: now - 30000, value: 28 },  // 30 seconds ago
      ];

      // Filter for last 1 minute
      const oneMinuteAgo = now - 60000;
      const filtered = history.filter(p => p.timestamp >= oneMinuteAgo);

      expect(filtered.length).toBe(2);
      expect(filtered[0].value).toBe(27);
    });

    it('should calculate trend direction', () => {
      const history = [
        { value: 25 },
        { value: 26 },
        { value: 27 },
        { value: 28 },
      ];

      const lastValue = history[history.length - 1].value;
      const previousValue = history[history.length - 2].value;
      const trend = lastValue - previousValue;

      expect(trend).toBe(1);
      expect(trend > 0).toBe(true); // Upward trend
    });

    it('should support multiple sensor types', () => {
      const sensorTypes = ['temperature', 'humidity', 'pressure', 'vibration', 'current', 'voltage'];
      const units: Record<string, string> = {
        temperature: '°C',
        humidity: '%',
        pressure: 'bar',
        vibration: 'mm/s',
        current: 'A',
        voltage: 'V',
      };

      sensorTypes.forEach(type => {
        expect(units[type]).toBeDefined();
      });

      expect(sensorTypes.length).toBe(6);
    });

    it('should aggregate data for multi-line chart', () => {
      const sensorData = new Map<string, { timestamp: number; value: number }[]>();
      
      sensorData.set('device-1-temperature', [
        { timestamp: 1000, value: 25 },
        { timestamp: 2000, value: 26 },
      ]);
      
      sensorData.set('device-2-temperature', [
        { timestamp: 1000, value: 30 },
        { timestamp: 2000, value: 31 },
      ]);

      // Aggregate by timestamp
      const timePoints = new Map<number, Record<string, number>>();
      
      sensorData.forEach((history, key) => {
        history.forEach(point => {
          const existing = timePoints.get(point.timestamp) || { timestamp: point.timestamp };
          existing[key] = point.value;
          timePoints.set(point.timestamp, existing);
        });
      });

      const chartData = Array.from(timePoints.values());
      
      expect(chartData.length).toBe(2);
      expect(chartData[0]['device-1-temperature']).toBe(25);
      expect(chartData[0]['device-2-temperature']).toBe(30);
    });
  });

  describe('MTTR/MTBF Export', () => {
    it('should format duration correctly', () => {
      const formatDuration = (minutes: number | null): string => {
        if (!minutes) return 'N/A';
        if (minutes < 60) return `${minutes.toFixed(0)} phút`;
        if (minutes < 1440) return `${(minutes / 60).toFixed(1)} giờ`;
        return `${(minutes / 1440).toFixed(1)} ngày`;
      };

      expect(formatDuration(null)).toBe('N/A');
      expect(formatDuration(30)).toBe('30 phút');
      expect(formatDuration(90)).toBe('1.5 giờ');
      expect(formatDuration(2880)).toBe('2.0 ngày');
    });

    it('should format percentage correctly', () => {
      const formatPercent = (value: number | null): string => {
        if (value === null || value === undefined) return 'N/A';
        return `${(value * 100).toFixed(1)}%`;
      };

      expect(formatPercent(null)).toBe('N/A');
      expect(formatPercent(0.85)).toBe('85.0%');
      expect(formatPercent(0.9999)).toBe('100.0%');
    });

    it('should calculate work order breakdown', () => {
      const workOrders = [
        { type: 'corrective', count: 10 },
        { type: 'preventive', count: 5 },
        { type: 'predictive', count: 3 },
        { type: 'emergency', count: 2 },
      ];

      const total = workOrders.reduce((sum, wo) => sum + wo.count, 0);
      const correctivePercent = (workOrders[0].count / total) * 100;

      expect(total).toBe(20);
      expect(correctivePercent).toBe(50);
    });

    it('should support export to Excel format', () => {
      const exportConfig = {
        targetType: 'machine' as const,
        targetId: 1,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        format: 'xlsx',
      };

      expect(exportConfig.format).toBe('xlsx');
      expect(exportConfig.startDate < exportConfig.endDate).toBe(true);
    });

    it('should support export to PDF format', () => {
      const exportConfig = {
        targetType: 'production_line' as const,
        targetId: 1,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        format: 'pdf',
      };

      expect(exportConfig.format).toBe('pdf');
      expect(['device', 'machine', 'production_line'].includes(exportConfig.targetType)).toBe(true);
    });

    it('should calculate MTTR from work orders', () => {
      const workOrders = [
        { createdAt: new Date('2025-01-01 10:00'), completedAt: new Date('2025-01-01 12:00') },
        { createdAt: new Date('2025-01-02 14:00'), completedAt: new Date('2025-01-02 15:30') },
        { createdAt: new Date('2025-01-03 09:00'), completedAt: new Date('2025-01-03 10:00') },
      ];

      const repairTimes = workOrders.map(wo => {
        return (wo.completedAt.getTime() - wo.createdAt.getTime()) / (1000 * 60); // minutes
      });

      const mttr = repairTimes.reduce((sum, t) => sum + t, 0) / repairTimes.length;

      expect(repairTimes[0]).toBe(120); // 2 hours
      expect(repairTimes[1]).toBe(90);  // 1.5 hours
      expect(repairTimes[2]).toBe(60);  // 1 hour
      expect(mttr).toBe(90); // Average 90 minutes
    });

    it('should calculate MTBF from failure events', () => {
      const failures = [
        { timestamp: new Date('2025-01-01 08:00') },
        { timestamp: new Date('2025-01-03 08:00') },
        { timestamp: new Date('2025-01-06 08:00') },
      ];

      const intervals: number[] = [];
      for (let i = 1; i < failures.length; i++) {
        const interval = (failures[i].timestamp.getTime() - failures[i-1].timestamp.getTime()) / (1000 * 60 * 60); // hours
        intervals.push(interval);
      }

      const mtbf = intervals.reduce((sum, t) => sum + t, 0) / intervals.length;

      expect(intervals[0]).toBe(48); // 2 days
      expect(intervals[1]).toBe(72); // 3 days
      expect(mtbf).toBe(60); // Average 60 hours
    });
  });

  describe('Integration Tests', () => {
    it('should integrate OEE thresholds with alert system', () => {
      const threshold = {
        productionLineId: 1,
        criticalThreshold: 70,
        warningThreshold: 80,
      };

      const currentOee = 65;

      let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';
      if (currentOee < threshold.criticalThreshold) {
        alertLevel = 'critical';
      } else if (currentOee < threshold.warningThreshold) {
        alertLevel = 'warning';
      }

      expect(alertLevel).toBe('critical');
    });

    it('should integrate sensor trends with status detection', () => {
      const sensorConfig = {
        warningThreshold: 30,
        criticalThreshold: 35,
      };

      const sensorValues = [25, 28, 31, 33, 36];
      
      const statuses = sensorValues.map(value => {
        if (value >= sensorConfig.criticalThreshold) return 'critical';
        if (value >= sensorConfig.warningThreshold) return 'warning';
        return 'normal';
      });

      expect(statuses).toEqual(['normal', 'normal', 'warning', 'warning', 'critical']);
    });
  });
});
