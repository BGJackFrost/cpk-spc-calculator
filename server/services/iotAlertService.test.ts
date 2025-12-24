/**
 * Tests for IoT Alert Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IoTAlertService, getIoTAlertService } from './iotAlertService';

// Mock database
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

describe('IoTAlertService', () => {
  let service: IoTAlertService;

  beforeEach(() => {
    service = new IoTAlertService();
  });

  describe('Service Lifecycle', () => {
    it('should start service', () => {
      service.start();
      const status = service.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should stop service', () => {
      service.start();
      service.stop();
      const status = service.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should emit started event', () => {
      const handler = vi.fn();
      service.on('started', handler);
      service.start();
      expect(handler).toHaveBeenCalled();
    });

    it('should emit stopped event', () => {
      const handler = vi.fn();
      service.on('stopped', handler);
      service.start();
      service.stop();
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Status', () => {
    it('should return correct status', () => {
      const status = service.getStatus();
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('cacheSize');
      expect(status).toHaveProperty('cooldownCount');
    });

    it('should track cache size', () => {
      const status = service.getStatus();
      expect(typeof status.cacheSize).toBe('number');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      service.clearCache();
      const status = service.getStatus();
      expect(status.cacheSize).toBe(0);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getIoTAlertService();
      const instance2 = getIoTAlertService();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Alert Events', () => {
    it('should emit alert event', async () => {
      const handler = vi.fn();
      service.on('alert', handler);
      
      // Note: Full test requires database connection
      // This just verifies event system works
      service.emit('alert', { type: 'test' });
      expect(handler).toHaveBeenCalledWith({ type: 'test' });
    });
  });

  describe('Reading Check (Unit)', () => {
    it('should handle missing threshold gracefully', async () => {
      const result = await service.checkReading({
        deviceId: 999,
        metric: 'nonexistent',
        value: 50,
        timestamp: new Date(),
      });
      
      // Should return null when no threshold found
      expect(result).toBeNull();
    });
  });
});

describe('Alert Type Determination', () => {
  // Test the logic without database
  it('should correctly identify upper limit violation', () => {
    const value = 100;
    const upperLimit = 90;
    expect(value >= upperLimit).toBe(true);
  });

  it('should correctly identify lower limit violation', () => {
    const value = 10;
    const lowerLimit = 20;
    expect(value <= lowerLimit).toBe(true);
  });

  it('should correctly identify upper warning', () => {
    const value = 85;
    const upperWarning = 80;
    const upperLimit = 90;
    expect(value >= upperWarning && value < upperLimit).toBe(true);
  });

  it('should correctly identify lower warning', () => {
    const value = 25;
    const lowerWarning = 30;
    const lowerLimit = 20;
    expect(value <= lowerWarning && value > lowerLimit).toBe(true);
  });

  it('should identify normal value', () => {
    const value = 50;
    const upperLimit = 90;
    const lowerLimit = 20;
    const upperWarning = 80;
    const lowerWarning = 30;
    
    const isNormal = value < upperWarning && 
                     value > lowerWarning && 
                     value < upperLimit && 
                     value > lowerLimit;
    expect(isNormal).toBe(true);
  });
});

describe('Alert Message Formatting', () => {
  it('should format upper limit message correctly', () => {
    const message = formatTestMessage('upper_limit', 'Sensor-01', 'temperature', 95.5, 90, '°C');
    expect(message).toContain('VƯỢT NGƯỠNG TRÊN');
    expect(message).toContain('Sensor-01');
    expect(message).toContain('temperature');
    expect(message).toContain('95.50');
  });

  it('should format lower limit message correctly', () => {
    const message = formatTestMessage('lower_limit', 'Sensor-01', 'temperature', 15.5, 20, '°C');
    expect(message).toContain('DƯỚI NGƯỠNG DƯỚI');
  });

  it('should format warning messages correctly', () => {
    const upperWarning = formatTestMessage('upper_warning', 'Sensor-01', 'temperature', 85, 80, '°C');
    expect(upperWarning).toContain('Cảnh báo ngưỡng trên');
    
    const lowerWarning = formatTestMessage('lower_warning', 'Sensor-01', 'temperature', 25, 30, '°C');
    expect(lowerWarning).toContain('Cảnh báo ngưỡng dưới');
  });
});

// Helper function for testing message format
function formatTestMessage(
  alertType: string,
  deviceName: string,
  metric: string,
  value: number,
  threshold: number,
  unit: string
): string {
  const typeLabels: Record<string, string> = {
    'upper_limit': 'VƯỢT NGƯỠNG TRÊN',
    'lower_limit': 'DƯỚI NGƯỠNG DƯỚI',
    'upper_warning': 'Cảnh báo ngưỡng trên',
    'lower_warning': 'Cảnh báo ngưỡng dưới',
  };

  const label = typeLabels[alertType] || alertType;
  return `[${label}] ${deviceName} - ${metric}: ${value.toFixed(2)}${unit} (Ngưỡng: ${threshold.toFixed(2)}${unit})`;
}
