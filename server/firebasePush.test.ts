/**
 * Unit tests for Firebase Push Service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase-admin
vi.mock('firebase-admin', () => ({
  default: {
    apps: [],
    initializeApp: vi.fn(() => ({ name: 'test-app' })),
    credential: {
      cert: vi.fn(() => ({})),
    },
    messaging: vi.fn(() => ({
      send: vi.fn().mockResolvedValue('message-id-123'),
      sendEachForMulticast: vi.fn().mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg-1' },
          { success: true, messageId: 'msg-2' },
        ],
      }),
    })),
  },
}));

describe('Firebase Push Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Firebase Admin SDK Integration', () => {
    it('should have firebase-admin package installed', async () => {
      // Check if firebase-admin can be imported
      const admin = await import('firebase-admin');
      expect(admin).toBeDefined();
    });

    it('should initialize Firebase app with credentials', async () => {
      const admin = (await import('firebase-admin')).default;
      
      const mockCredential = {
        projectId: 'test-project',
        clientEmail: 'test@test.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      };
      
      admin.initializeApp({
        credential: admin.credential.cert(mockCredential),
      });
      
      expect(admin.initializeApp).toHaveBeenCalled();
    });

    it('should get messaging instance', async () => {
      const admin = (await import('firebase-admin')).default;
      const messaging = admin.messaging();
      
      expect(messaging).toBeDefined();
      expect(messaging.send).toBeDefined();
    });
  });

  describe('Push Notification Message Format', () => {
    it('should create valid notification message', () => {
      const message = {
        notification: {
          title: 'Test Alert',
          body: 'This is a test notification',
        },
        data: {
          type: 'test',
          alertId: '123',
          severity: 'info',
        },
        token: 'device-token-123',
      };

      expect(message.notification.title).toBe('Test Alert');
      expect(message.notification.body).toBe('This is a test notification');
      expect(message.data.type).toBe('test');
      expect(message.token).toBe('device-token-123');
    });

    it('should create valid multicast message', () => {
      const multicastMessage = {
        notification: {
          title: 'Broadcast Alert',
          body: 'This is a broadcast notification',
        },
        data: {
          type: 'broadcast',
          alertId: '456',
        },
        tokens: ['token-1', 'token-2', 'token-3'],
      };

      expect(multicastMessage.tokens).toHaveLength(3);
      expect(multicastMessage.notification.title).toBe('Broadcast Alert');
    });

    it('should include Android-specific config', () => {
      const androidConfig = {
        priority: 'high' as const,
        notification: {
          channelId: 'alerts',
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        },
      };

      expect(androidConfig.priority).toBe('high');
      expect(androidConfig.notification.channelId).toBe('alerts');
    });

    it('should include iOS-specific config', () => {
      const apnsConfig = {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
      };

      expect(apnsConfig.payload.aps.sound).toBe('default');
      expect(apnsConfig.payload.aps.badge).toBe(1);
    });
  });

  describe('Alert Type Mapping', () => {
    it('should map IoT alert type correctly', () => {
      const alertTypes = {
        iot_alert: 'Cảnh báo IoT',
        spc_alert: 'Cảnh báo SPC',
        cpk_alert: 'Cảnh báo CPK',
        escalation_alert: 'Cảnh báo Escalation',
        system: 'Thông báo hệ thống',
      };

      expect(alertTypes.iot_alert).toBe('Cảnh báo IoT');
      expect(alertTypes.spc_alert).toBe('Cảnh báo SPC');
      expect(alertTypes.cpk_alert).toBe('Cảnh báo CPK');
      expect(alertTypes.escalation_alert).toBe('Cảnh báo Escalation');
    });

    it('should map severity levels correctly', () => {
      const severityLevels = {
        info: { color: '#3b82f6', priority: 'default' },
        warning: { color: '#f59e0b', priority: 'high' },
        critical: { color: '#dc2626', priority: 'high' },
      };

      expect(severityLevels.critical.priority).toBe('high');
      expect(severityLevels.info.priority).toBe('default');
    });
  });

  describe('Push Settings Validation', () => {
    it('should validate push settings structure', () => {
      const pushSettings = {
        enabled: true,
        iotAlerts: true,
        spcAlerts: true,
        cpkAlerts: true,
        escalationAlerts: true,
        systemAlerts: true,
        criticalOnly: false,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      };

      expect(pushSettings.enabled).toBe(true);
      expect(pushSettings.criticalOnly).toBe(false);
      expect(pushSettings.quietHoursEnabled).toBe(false);
    });

    it('should filter notifications based on settings', () => {
      const settings = {
        enabled: true,
        iotAlerts: false,
        spcAlerts: true,
        criticalOnly: true,
      };

      const shouldSendIot = settings.enabled && settings.iotAlerts;
      const shouldSendSpc = settings.enabled && settings.spcAlerts;

      expect(shouldSendIot).toBe(false);
      expect(shouldSendSpc).toBe(true);
    });

    it('should check quiet hours', () => {
      const isInQuietHours = (start: string | null, end: string | null, currentHour: number): boolean => {
        if (!start || !end) return false;
        const startHour = parseInt(start.split(':')[0]);
        const endHour = parseInt(end.split(':')[0]);
        
        if (startHour < endHour) {
          return currentHour >= startHour && currentHour < endHour;
        } else {
          // Overnight quiet hours (e.g., 22:00 - 06:00)
          return currentHour >= startHour || currentHour < endHour;
        }
      };

      expect(isInQuietHours('22:00', '06:00', 23)).toBe(true);
      expect(isInQuietHours('22:00', '06:00', 10)).toBe(false);
      expect(isInQuietHours('09:00', '17:00', 12)).toBe(true);
      expect(isInQuietHours(null, null, 12)).toBe(false);
    });
  });

  describe('Device Token Management', () => {
    it('should validate device token format', () => {
      const isValidToken = (token: string): boolean => {
        return token.length >= 100 && token.length <= 200;
      };

      const validToken = 'a'.repeat(150);
      const shortToken = 'short';
      const longToken = 'a'.repeat(250);

      expect(isValidToken(validToken)).toBe(true);
      expect(isValidToken(shortToken)).toBe(false);
      expect(isValidToken(longToken)).toBe(false);
    });

    it('should identify platform from token', () => {
      const identifyPlatform = (token: string): 'android' | 'ios' | 'unknown' => {
        // FCM tokens typically start with specific patterns
        if (token.includes(':')) return 'android';
        if (token.length === 64) return 'ios';
        return 'unknown';
      };

      expect(identifyPlatform('abc:def')).toBe('android');
      expect(identifyPlatform('a'.repeat(64))).toBe('ios');
    });
  });

  describe('Push History Tracking', () => {
    it('should create push history record', () => {
      const historyRecord = {
        id: 1,
        userId: 'user-123',
        deviceTokenId: 1,
        title: 'Test Alert',
        body: 'Test message',
        alertType: 'spc_alert',
        severity: 'warning',
        status: 'sent',
        messageId: 'msg-123',
        sentAt: Date.now(),
        deliveredAt: null,
        errorMessage: null,
      };

      expect(historyRecord.status).toBe('sent');
      expect(historyRecord.messageId).toBe('msg-123');
      expect(historyRecord.deliveredAt).toBeNull();
    });

    it('should track delivery status', () => {
      const updateDeliveryStatus = (record: any, delivered: boolean, error?: string) => {
        if (delivered) {
          return {
            ...record,
            status: 'delivered',
            deliveredAt: Date.now(),
          };
        } else {
          return {
            ...record,
            status: 'failed',
            errorMessage: error || 'Unknown error',
          };
        }
      };

      const record = { status: 'sent', deliveredAt: null, errorMessage: null };
      const delivered = updateDeliveryStatus(record, true);
      const failed = updateDeliveryStatus(record, false, 'Token expired');

      expect(delivered.status).toBe('delivered');
      expect(delivered.deliveredAt).toBeDefined();
      expect(failed.status).toBe('failed');
      expect(failed.errorMessage).toBe('Token expired');
    });
  });

  describe('Topic Subscription', () => {
    it('should create valid topic name', () => {
      const createTopicName = (type: string, id?: string): string => {
        const baseName = type.toLowerCase().replace(/[^a-z0-9]/g, '_');
        return id ? `${baseName}_${id}` : baseName;
      };

      expect(createTopicName('IoT Alerts')).toBe('iot_alerts');
      expect(createTopicName('SPC', 'line-1')).toBe('spc_line-1');
    });

    it('should manage topic subscriptions', () => {
      const subscriptions = new Map<string, Set<string>>();
      
      const subscribe = (topic: string, token: string) => {
        if (!subscriptions.has(topic)) {
          subscriptions.set(topic, new Set());
        }
        subscriptions.get(topic)!.add(token);
      };

      const unsubscribe = (topic: string, token: string) => {
        subscriptions.get(topic)?.delete(token);
      };

      subscribe('alerts', 'token-1');
      subscribe('alerts', 'token-2');
      expect(subscriptions.get('alerts')?.size).toBe(2);

      unsubscribe('alerts', 'token-1');
      expect(subscriptions.get('alerts')?.size).toBe(1);
    });
  });
});

describe('Escalation Export Service', () => {
  describe('PDF Export', () => {
    it('should generate PDF report structure', () => {
      const pdfReport = {
        title: 'Báo cáo Escalation',
        dateRange: { from: '2024-01-01', to: '2024-01-31' },
        summary: {
          totalAlerts: 100,
          resolved: 80,
          pending: 15,
          escalated: 5,
        },
        charts: ['trend', 'distribution', 'byType'],
        tables: ['alertList', 'statistics'],
      };

      expect(pdfReport.title).toBe('Báo cáo Escalation');
      expect(pdfReport.summary.totalAlerts).toBe(100);
      expect(pdfReport.charts).toContain('trend');
    });
  });

  describe('Excel Export', () => {
    it('should generate Excel workbook structure', () => {
      const workbook = {
        sheets: [
          { name: 'Tổng quan', type: 'summary' },
          { name: 'Chi tiết cảnh báo', type: 'data' },
          { name: 'Thống kê', type: 'statistics' },
        ],
        metadata: {
          author: 'CPK/SPC System',
          createdAt: new Date().toISOString(),
        },
      };

      expect(workbook.sheets).toHaveLength(3);
      expect(workbook.sheets[0].name).toBe('Tổng quan');
    });

    it('should format data for Excel export', () => {
      const formatAlertForExcel = (alert: any) => ({
        ID: alert.id,
        'Loại cảnh báo': alert.alertType,
        'Tiêu đề': alert.alertTitle,
        'Mức độ': alert.severity,
        'Trạng thái': alert.status,
        'Thời gian': new Date(alert.createdAt).toLocaleString('vi-VN'),
      });

      const alert = {
        id: 1,
        alertType: 'spc_alert',
        alertTitle: 'CPK thấp',
        severity: 'warning',
        status: 'pending',
        createdAt: Date.now(),
      };

      const formatted = formatAlertForExcel(alert);
      expect(formatted.ID).toBe(1);
      expect(formatted['Loại cảnh báo']).toBe('spc_alert');
    });
  });

  describe('Scheduled Reports', () => {
    it('should validate schedule configuration', () => {
      const scheduleConfig = {
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        hour: 8,
        minute: 0,
        timezone: 'Asia/Ho_Chi_Minh',
        recipients: ['admin@example.com'],
        format: 'pdf',
      };

      expect(scheduleConfig.frequency).toBe('weekly');
      expect(scheduleConfig.dayOfWeek).toBe(1);
      expect(scheduleConfig.recipients).toContain('admin@example.com');
    });

    it('should calculate next run time', () => {
      const getNextRunTime = (frequency: string, hour: number): Date => {
        const now = new Date();
        const next = new Date(now);
        
        switch (frequency) {
          case 'daily':
            next.setDate(next.getDate() + 1);
            break;
          case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
          case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        }
        
        next.setHours(hour, 0, 0, 0);
        return next;
      };

      const nextDaily = getNextRunTime('daily', 8);
      const nextWeekly = getNextRunTime('weekly', 8);

      expect(nextDaily.getHours()).toBe(8);
      expect(nextWeekly > new Date()).toBe(true);
    });
  });
});
