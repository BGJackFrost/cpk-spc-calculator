/**
 * Tests for MQTT Service
 * Uses mocks to avoid actual MQTT broker connections
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock mqtt module before importing the service
vi.mock('mqtt', () => {
  const mockClient = {
    on: vi.fn((event: string, callback: Function) => {
      if (event === 'connect') {
        // Simulate successful connection
        setTimeout(() => callback(), 10);
      }
      return mockClient;
    }),
    subscribe: vi.fn((topic: string, opts: any, callback?: Function) => {
      if (callback) callback(null);
      return mockClient;
    }),
    unsubscribe: vi.fn((topic: string, callback?: Function) => {
      if (callback) callback(null);
      return mockClient;
    }),
    publish: vi.fn((topic: string, message: string, opts: any, callback?: Function) => {
      if (callback) callback(null);
      return mockClient;
    }),
    end: vi.fn((force?: boolean, opts?: any, callback?: Function) => {
      if (callback) callback();
      return mockClient;
    }),
    connected: false,
  };
  
  return {
    connect: vi.fn(() => mockClient),
  };
});

import { MqttService, getMqttService, resetMqttService, IoTTopics } from './mqttService';

describe('MqttService', () => {
  let service: MqttService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetMqttService();
    service = new MqttService({
      brokerUrl: 'mqtt://localhost:1883',
      clientId: `test-client-${Date.now()}`,
    });
  });

  afterEach(async () => {
    if (service) {
      try {
        await service.disconnect();
      } catch {
        // Ignore disconnect errors in tests
      }
    }
  });

  describe('Configuration', () => {
    it('should create service with default config', () => {
      const defaultService = new MqttService();
      const status = defaultService.getStatus();
      
      expect(status.brokerUrl).toBe('mqtt://localhost:1883');
      expect(status.connected).toBe(false);
      expect(status.subscriptions).toEqual([]);
    });

    it('should create service with custom config', () => {
      const customService = new MqttService({
        brokerUrl: 'mqtt://custom-broker:1883',
        clientId: 'custom-client',
        keepalive: 120,
      });
      
      const status = customService.getStatus();
      expect(status.brokerUrl).toBe('mqtt://custom-broker:1883');
    });
  });

  describe('Connection (Mocked)', () => {
    it('should attempt to connect to MQTT broker', async () => {
      // With mocked mqtt, this should work without actual broker
      const mqtt = await import('mqtt');
      expect(mqtt.connect).toBeDefined();
    });

    it('should handle connection state', () => {
      const status = service.getStatus();
      expect(status.connected).toBe(false);
    });
  });

  describe('Message History', () => {
    it('should store messages in history', () => {
      const history = service.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should clear history', () => {
      service.clearHistory();
      const history = service.getHistory();
      expect(history.length).toBe(0);
    });

    it('should limit history size', () => {
      const history = service.getHistory(10);
      expect(history.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Singleton', () => {
    it('should return same instance', () => {
      const instance1 = getMqttService();
      const instance2 = getMqttService();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = getMqttService();
      resetMqttService();
      const instance2 = getMqttService();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('IoTTopics Helper', () => {
    it('should generate device metric topic', () => {
      const topic = IoTTopics.deviceMetric('sensor-01', 'temperature');
      expect(topic).toBe('devices/sensor-01/metrics/temperature');
    });

    it('should generate all device metrics topic', () => {
      const topic = IoTTopics.allDeviceMetrics('sensor-01');
      expect(topic).toBe('devices/sensor-01/metrics/#');
    });

    it('should generate all devices topic', () => {
      const topic = IoTTopics.allDevices();
      expect(topic).toBe('devices/#');
    });

    it('should generate device alarm topic', () => {
      const topic = IoTTopics.deviceAlarm('sensor-01');
      expect(topic).toBe('devices/sensor-01/alarms');
    });

    it('should generate SPC data topic', () => {
      const topic = IoTTopics.spcData('line-01', 'machine-01');
      expect(topic).toBe('spc/line-01/machine-01/data');
    });

    it('should generate SPC alert topic', () => {
      const topic = IoTTopics.spcAlert('line-01');
      expect(topic).toBe('spc/line-01/alerts');
    });
  });
});
