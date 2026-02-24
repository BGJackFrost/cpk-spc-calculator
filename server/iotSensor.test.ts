import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db module
vi.mock('./db', () => ({
  getDb: vi.fn(() => null), // Return null to use mock data
}));

// Import after mocking
import iotSensorService from './services/iotSensorService';

describe('IoT Sensor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllSensors', () => {
    it('should return mock sensors when database is not available', async () => {
      const sensors = await iotSensorService.getAllSensors();
      
      expect(sensors).toBeDefined();
      expect(Array.isArray(sensors)).toBe(true);
      expect(sensors.length).toBeGreaterThan(0);
      
      // Check sensor structure
      const sensor = sensors[0];
      expect(sensor).toHaveProperty('id');
      expect(sensor).toHaveProperty('name');
      expect(sensor).toHaveProperty('type');
      expect(sensor).toHaveProperty('status');
    });

    it('should filter sensors by type', async () => {
      const temperatureSensors = await iotSensorService.getAllSensors({ 
        sensorType: 'temperature' 
      });
      
      expect(temperatureSensors).toBeDefined();
      temperatureSensors.forEach(sensor => {
        expect(sensor.type).toBe('temperature');
      });
    });

    it('should filter sensors by status', async () => {
      const onlineSensors = await iotSensorService.getAllSensors({ 
        status: 'online' 
      });
      
      expect(onlineSensors).toBeDefined();
      onlineSensors.forEach(sensor => {
        expect(sensor.status).toBe('online');
      });
    });
  });

  describe('getSensorReadings', () => {
    it('should return readings for a device', async () => {
      const readings = await iotSensorService.getSensorReadings(1, '1h');
      
      expect(readings).toBeDefined();
      expect(Array.isArray(readings)).toBe(true);
      expect(readings.length).toBeGreaterThan(0);
      
      // Check reading structure
      const reading = readings[0];
      expect(reading).toHaveProperty('id');
      expect(reading).toHaveProperty('deviceId');
      expect(reading).toHaveProperty('sensorType');
      expect(reading).toHaveProperty('value');
      expect(reading).toHaveProperty('unit');
      expect(reading).toHaveProperty('timestamp');
      expect(reading).toHaveProperty('quality');
    });

    it('should return different amounts of data for different time ranges', async () => {
      const readings1h = await iotSensorService.getSensorReadings(1, '1h');
      const readings24h = await iotSensorService.getSensorReadings(1, '24h');
      
      // 24h should have more or equal readings than 1h
      expect(readings24h.length).toBeGreaterThanOrEqual(readings1h.length);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts', async () => {
      const alerts = await iotSensorService.getActiveAlerts();
      
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
      
      if (alerts.length > 0) {
        const alert = alerts[0];
        expect(alert).toHaveProperty('id');
        expect(alert).toHaveProperty('deviceId');
        expect(alert).toHaveProperty('deviceName');
        expect(alert).toHaveProperty('sensorType');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(['warning', 'critical']).toContain(alert.severity);
      }
    });

    it('should filter alerts by severity', async () => {
      const criticalAlerts = await iotSensorService.getActiveAlerts({ 
        severity: 'critical' 
      });
      
      expect(criticalAlerts).toBeDefined();
      criticalAlerts.forEach(alert => {
        expect(alert.severity).toBe('critical');
      });
    });
  });

  describe('getSensorStatistics', () => {
    it('should return sensor statistics', async () => {
      const stats = await iotSensorService.getSensorStatistics();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalSensors');
      expect(stats).toHaveProperty('onlineSensors');
      expect(stats).toHaveProperty('offlineSensors');
      expect(stats).toHaveProperty('errorSensors');
      expect(stats).toHaveProperty('activeAlerts');
      expect(stats).toHaveProperty('criticalAlerts');
      
      // Validate numbers
      expect(typeof stats.totalSensors).toBe('number');
      expect(stats.totalSensors).toBeGreaterThanOrEqual(0);
      expect(stats.onlineSensors + stats.offlineSensors + stats.errorSensors).toBeLessThanOrEqual(stats.totalSensors);
    });
  });

  describe('recordSensorReading', () => {
    it('should record a new sensor reading', async () => {
      const result = await iotSensorService.recordSensorReading(
        1,
        'temperature',
        25.5,
        '°C'
      );
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('reading');
      expect(result.reading.deviceId).toBe(1);
      expect(result.reading.sensorType).toBe('temperature');
      expect(result.reading.value).toBe(25.5);
      expect(result.reading.unit).toBe('°C');
    });

    it('should determine quality based on value', async () => {
      // Normal temperature
      const normalResult = await iotSensorService.recordSensorReading(
        1,
        'temperature',
        25,
        '°C'
      );
      expect(normalResult.reading.quality).toBe('good');

      // High temperature (warning)
      const warningResult = await iotSensorService.recordSensorReading(
        1,
        'temperature',
        38,
        '°C'
      );
      expect(warningResult.reading.quality).toBe('warning');

      // Very high temperature (critical)
      const criticalResult = await iotSensorService.recordSensorReading(
        1,
        'temperature',
        50,
        '°C'
      );
      expect(criticalResult.reading.quality).toBe('critical');
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      const result = await iotSensorService.acknowledgeAlert(1);
      
      // When DB is not available, it returns true
      expect(result).toBe(true);
    });
  });
});
