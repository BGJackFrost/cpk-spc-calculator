/**
 * Tests for IoT Database Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(() => null),
}));

import * as iotDbService from './iotDbService';

describe('IoT Database Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Device CRUD', () => {
    it('should return null when database is not available for getDeviceById', async () => {
      const result = await iotDbService.getDeviceById(1);
      expect(result).toBeNull();
    });

    it('should return empty array when database is not available for getDevices', async () => {
      const result = await iotDbService.getDevices();
      expect(result).toEqual([]);
    });

    it('should return default stats when database is not available', async () => {
      const result = await iotDbService.getDeviceStats();
      expect(result).toEqual({
        total: 0,
        online: 0,
        offline: 0,
        maintenance: 0,
        error: 0,
      });
    });

    it('should throw error when creating device without database', async () => {
      await expect(iotDbService.createDevice({
        deviceCode: 'TEST-001',
        deviceName: 'Test Device',
        deviceType: 'sensor',
      })).rejects.toThrow('Database not available');
    });

    it('should throw error when updating device without database', async () => {
      await expect(iotDbService.updateDevice({
        id: 1,
        deviceName: 'Updated Name',
      })).rejects.toThrow('Database not available');
    });

    it('should throw error when deleting device without database', async () => {
      await expect(iotDbService.deleteDevice(1)).rejects.toThrow('Database not available');
    });
  });

  describe('Alarm CRUD', () => {
    it('should return null when database is not available for getAlarmById', async () => {
      const result = await iotDbService.getAlarmById(1);
      expect(result).toBeNull();
    });

    it('should return empty array when database is not available for getAlarms', async () => {
      const result = await iotDbService.getAlarms();
      expect(result).toEqual([]);
    });

    it('should return default stats when database is not available for alarm stats', async () => {
      const result = await iotDbService.getAlarmStats();
      expect(result).toEqual({
        total: 0,
        unacknowledged: 0,
        unresolved: 0,
        critical: 0,
        error: 0,
        warning: 0,
      });
    });

    it('should throw error when creating alarm without database', async () => {
      await expect(iotDbService.createAlarm({
        deviceId: 1,
        alarmType: 'warning',
        alarmCode: 'TEST_ALARM',
        message: 'Test alarm message',
      })).rejects.toThrow('Database not available');
    });

    it('should throw error when acknowledging alarm without database', async () => {
      await expect(iotDbService.acknowledgeAlarm(1)).rejects.toThrow('Database not available');
    });

    it('should throw error when resolving alarm without database', async () => {
      await expect(iotDbService.resolveAlarm(1)).rejects.toThrow('Database not available');
    });
  });

  describe('Threshold CRUD', () => {
    it('should return null when database is not available for getThresholdById', async () => {
      const result = await iotDbService.getThresholdById(1);
      expect(result).toBeNull();
    });

    it('should return empty array when database is not available for getThresholds', async () => {
      const result = await iotDbService.getThresholds();
      expect(result).toEqual([]);
    });

    it('should throw error when creating threshold without database', async () => {
      await expect(iotDbService.createThreshold({
        deviceId: 1,
        metric: 'temperature',
      })).rejects.toThrow('Database not available');
    });

    it('should throw error when updating threshold without database', async () => {
      await expect(iotDbService.updateThreshold({
        id: 1,
        metric: 'pressure',
      })).rejects.toThrow('Database not available');
    });

    it('should throw error when deleting threshold without database', async () => {
      await expect(iotDbService.deleteThreshold(1)).rejects.toThrow('Database not available');
    });
  });

  describe('Seed Data', () => {
    it('should throw error when seeding devices without database', async () => {
      await expect(iotDbService.seedIotDevices()).rejects.toThrow('Database not available');
    });

    it('should throw error when seeding alarms without database', async () => {
      await expect(iotDbService.seedIotAlarms()).rejects.toThrow('Database not available');
    });

    it('should throw error when seeding thresholds without database', async () => {
      await expect(iotDbService.seedIotThresholds()).rejects.toThrow('Database not available');
    });
  });

  describe('Input Validation', () => {
    it('CreateDeviceInput should have required fields', () => {
      const input: iotDbService.CreateDeviceInput = {
        deviceCode: 'TEST-001',
        deviceName: 'Test Device',
        deviceType: 'sensor',
      };
      expect(input.deviceCode).toBe('TEST-001');
      expect(input.deviceName).toBe('Test Device');
      expect(input.deviceType).toBe('sensor');
    });

    it('UpdateDeviceInput should have id field', () => {
      const input: iotDbService.UpdateDeviceInput = {
        id: 1,
        deviceName: 'Updated Name',
      };
      expect(input.id).toBe(1);
      expect(input.deviceName).toBe('Updated Name');
    });

    it('CreateAlarmInput should have required fields', () => {
      const input: iotDbService.CreateAlarmInput = {
        deviceId: 1,
        alarmType: 'warning',
        alarmCode: 'TEST',
        message: 'Test message',
      };
      expect(input.deviceId).toBe(1);
      expect(input.alarmType).toBe('warning');
    });

    it('CreateThresholdInput should have required fields', () => {
      const input: iotDbService.CreateThresholdInput = {
        deviceId: 1,
        metric: 'temperature',
      };
      expect(input.deviceId).toBe(1);
      expect(input.metric).toBe('temperature');
    });
  });
});
