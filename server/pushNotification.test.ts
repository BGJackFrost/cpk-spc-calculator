import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./_core/notification', () => ({
  notifyOwner: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('./sse', () => ({
  sendSseEvent: vi.fn(),
}));

vi.mock('./db', () => ({
  getDb: vi.fn(() => null),
}));

// Import after mocking
import pushNotificationService from './services/pushNotificationService';
import { notifyOwner } from './_core/notification';
import { sendSseEvent } from './sse';

describe('Push Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('should send notification through SSE', async () => {
      const result = await pushNotificationService.sendNotification({
        type: 'system',
        severity: 'info',
        title: 'Test Title',
        message: 'Test Message',
      });

      expect(result.success).toBe(true);
      expect(result.channels.sse).toBe(true);
      expect(sendSseEvent).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'system',
        severity: 'info',
        title: 'Test Title',
        message: 'Test Message',
      }));
    });

    it('should send owner notification for critical alerts', async () => {
      const result = await pushNotificationService.sendNotification({
        type: 'iot_alert',
        severity: 'critical',
        title: 'Critical Alert',
        message: 'Critical message',
      });

      expect(result.success).toBe(true);
      expect(result.channels.owner).toBe(true);
      expect(notifyOwner).toHaveBeenCalledWith({
        title: 'Critical Alert',
        content: 'Critical message',
      });
    });

    it('should not send owner notification for non-critical alerts', async () => {
      const result = await pushNotificationService.sendNotification({
        type: 'system',
        severity: 'warning',
        title: 'Warning Alert',
        message: 'Warning message',
      });

      expect(result.success).toBe(true);
      expect(notifyOwner).not.toHaveBeenCalled();
    });
  });

  describe('sendIoTAlert', () => {
    it('should send IoT alert notification', async () => {
      const result = await pushNotificationService.sendIoTAlert(
        1,
        'Temperature Sensor 1',
        'temperature',
        45.5,
        40,
        'critical'
      );

      expect(result.success).toBe(true);
      expect(sendSseEvent).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'iot_alert',
        severity: 'critical',
      }));
    });

    it('should include correct data in IoT alert', async () => {
      await pushNotificationService.sendIoTAlert(
        2,
        'Pressure Sensor',
        'pressure',
        1200,
        1100,
        'warning'
      );

      expect(sendSseEvent).toHaveBeenCalledWith('notification', expect.objectContaining({
        data: expect.objectContaining({
          deviceId: 2,
          deviceName: 'Pressure Sensor',
          sensorType: 'pressure',
          value: 1200,
          threshold: 1100,
        }),
      }));
    });
  });

  describe('sendSPCAlert', () => {
    it('should send SPC alert notification', async () => {
      const result = await pushNotificationService.sendSPCAlert(
        'Plan A',
        'Rule 1',
        'R1',
        2.5,
        'warning'
      );

      expect(result.success).toBe(true);
      expect(sendSseEvent).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'spc_alert',
        severity: 'warning',
      }));
    });
  });

  describe('sendCPKAlert', () => {
    it('should send CPK alert notification', async () => {
      const result = await pushNotificationService.sendCPKAlert(
        'Production Plan',
        0.95,
        1.33,
        'critical'
      );

      expect(result.success).toBe(true);
      expect(sendSseEvent).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'cpk_alert',
        severity: 'critical',
      }));
    });
  });

  describe('sendSystemNotification', () => {
    it('should send system notification with default severity', async () => {
      const result = await pushNotificationService.sendSystemNotification(
        'System Update',
        'System has been updated'
      );

      expect(result.success).toBe(true);
      expect(sendSseEvent).toHaveBeenCalledWith('notification', expect.objectContaining({
        type: 'system',
        severity: 'info',
        title: 'System Update',
        message: 'System has been updated',
      }));
    });

    it('should send system notification with custom severity', async () => {
      const result = await pushNotificationService.sendSystemNotification(
        'Warning',
        'System warning',
        'warning'
      );

      expect(result.success).toBe(true);
      expect(sendSseEvent).toHaveBeenCalledWith('notification', expect.objectContaining({
        severity: 'warning',
      }));
    });
  });

  describe('getNotificationHistory', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const history = await pushNotificationService.getNotificationHistory();
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });
  });

  describe('isNotificationEnabled', () => {
    it('should return true when database is not available', async () => {
      const enabled = await pushNotificationService.isNotificationEnabled('user1', 'iot_alert');
      
      expect(enabled).toBe(true);
    });
  });

  describe('updateNotificationSettings', () => {
    it('should return false when database is not available', async () => {
      const result = await pushNotificationService.updateNotificationSettings('user1', {
        iotAlerts: true,
        spcAlerts: false,
      });
      
      expect(result).toBe(false);
    });
  });
});
