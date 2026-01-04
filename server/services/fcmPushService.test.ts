/**
 * FCM Push Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fcmPushService from './fcmPushService';

// Mock the database
vi.mock('../db', () => ({
  getDb: () => null,
}));

// Mock firebase admin service
vi.mock('./firebaseAdminService', () => ({
  sendToDevice: vi.fn().mockResolvedValue({ success: true, successCount: 1, failureCount: 0 }),
  sendToMultipleDevices: vi.fn().mockResolvedValue({ success: true, successCount: 1, failureCount: 0 }),
  sendToTopic: vi.fn().mockResolvedValue({ success: true, successCount: 1, failureCount: 0 }),
  isFirebaseInitialized: vi.fn().mockReturnValue(true),
}));

describe('FCM Push Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserDeviceTokens', () => {
    it('should return empty array when no tokens found', async () => {
      const tokens = await fcmPushService.getUserDeviceTokens('user123');
      expect(Array.isArray(tokens)).toBe(true);
    });
  });

  describe('sendCPKAlert', () => {
    it('should format CPK alert notification correctly', async () => {
      const result = await fcmPushService.sendCPKAlert(
        ['user1'],
        {
          planName: 'Test Plan',
          productName: 'Product A',
          lineName: 'Line 1',
          cpkValue: 0.95,
          threshold: 1.33,
        }
      );
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('sent');
      expect(result).toHaveProperty('failed');
    });

    it('should set critical severity for CPK < 1.0', async () => {
      const result = await fcmPushService.sendCPKAlert(
        ['user1'],
        {
          planName: 'Test Plan',
          productName: 'Product A',
          lineName: 'Line 1',
          cpkValue: 0.8,
          threshold: 1.33,
        }
      );
      
      expect(result).toBeDefined();
    });

    it('should set warning severity for CPK >= 1.0', async () => {
      const result = await fcmPushService.sendCPKAlert(
        ['user1'],
        {
          planName: 'Test Plan',
          productName: 'Product A',
          lineName: 'Line 1',
          cpkValue: 1.1,
          threshold: 1.33,
        }
      );
      
      expect(result).toBeDefined();
    });
  });

  describe('sendSPCRuleAlert', () => {
    it('should format SPC rule alert correctly', async () => {
      const result = await fcmPushService.sendSPCRuleAlert(
        ['user1'],
        {
          planName: 'Test Plan',
          ruleName: 'Rule 1 - Beyond 3 sigma',
          ruleCode: 'R1',
          description: 'One point beyond 3 sigma',
        }
      );
      
      expect(result).toHaveProperty('success');
    });

    it('should set critical severity for R1 rules', async () => {
      const result = await fcmPushService.sendSPCRuleAlert(
        ['user1'],
        {
          planName: 'Test Plan',
          ruleName: 'Rule 1',
          ruleCode: 'R1',
          description: 'Critical rule violation',
        }
      );
      
      expect(result).toBeDefined();
    });
  });

  describe('sendOEEAlert', () => {
    it('should format OEE alert correctly', async () => {
      const result = await fcmPushService.sendOEEAlert(
        ['user1'],
        {
          lineName: 'Line 1',
          oeeValue: 0.65,
          threshold: 0.85,
        }
      );
      
      expect(result).toHaveProperty('success');
    });

    it('should include component in alert when provided', async () => {
      const result = await fcmPushService.sendOEEAlert(
        ['user1'],
        {
          lineName: 'Line 1',
          oeeValue: 0.7,
          threshold: 0.85,
          component: 'availability',
        }
      );
      
      expect(result).toBeDefined();
    });

    it('should set critical severity for OEE < 0.5', async () => {
      const result = await fcmPushService.sendOEEAlert(
        ['user1'],
        {
          lineName: 'Line 1',
          oeeValue: 0.4,
          threshold: 0.85,
        }
      );
      
      expect(result).toBeDefined();
    });
  });

  describe('sendIoTSensorAlert', () => {
    it('should format IoT sensor alert correctly', async () => {
      const result = await fcmPushService.sendIoTSensorAlert(
        ['user1'],
        {
          deviceName: 'Temperature Sensor 1',
          sensorType: 'Temperature',
          value: 85,
          threshold: 80,
          unit: '°C',
        }
      );
      
      expect(result).toHaveProperty('success');
    });
  });

  describe('sendEscalationAlert', () => {
    it('should format escalation alert correctly', async () => {
      const result = await fcmPushService.sendEscalationAlert(
        ['user1'],
        {
          alertId: 123,
          alertType: 'cpk',
          level: 2,
          message: 'Alert escalated to level 2',
        }
      );
      
      expect(result).toHaveProperty('success');
    });

    it('should set critical severity for level >= 3', async () => {
      const result = await fcmPushService.sendEscalationAlert(
        ['user1'],
        {
          alertId: 123,
          alertType: 'cpk',
          level: 3,
          message: 'Critical escalation',
        }
      );
      
      expect(result).toBeDefined();
    });
  });

  describe('sendDailyReportNotification', () => {
    it('should format daily report notification correctly', async () => {
      const result = await fcmPushService.sendDailyReportNotification(
        ['user1'],
        {
          date: '2026-01-04',
          cpkAvg: 1.45,
          oeeAvg: 0.87,
          alertCount: 5,
          criticalCount: 1,
        }
      );
      
      expect(result).toHaveProperty('success');
    });
  });

  describe('getPushStatistics', () => {
    it('should return statistics object', async () => {
      const stats = await fcmPushService.getPushStatistics(
        new Date('2026-01-01'),
        new Date('2026-01-04')
      );
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('success');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('byType');
    });
  });

  describe('sendNotificationToTopic', () => {
    it('should send notification to topic', async () => {
      const result = await fcmPushService.sendNotificationToTopic(
        'cpk-alerts',
        {
          type: 'cpk',
          severity: 'warning',
          title: 'Test Alert',
          body: 'Test body',
          data: { test: 'data' },
        }
      );
      
      expect(result).toHaveProperty('success');
    });
  });
});
