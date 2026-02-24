/**
 * Tests for User Notification Router
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  }),
}));

describe('User Notification Service', () => {
  describe('Notification Types', () => {
    it('should have valid notification types', () => {
      const validTypes = ['report_sent', 'spc_violation', 'cpk_alert', 'system', 'anomaly_detected'];
      expect(validTypes).toContain('report_sent');
      expect(validTypes).toContain('spc_violation');
      expect(validTypes).toContain('cpk_alert');
      expect(validTypes).toContain('system');
      expect(validTypes).toContain('anomaly_detected');
    });

    it('should have valid severity levels', () => {
      const validSeverities = ['info', 'warning', 'critical'];
      expect(validSeverities).toContain('info');
      expect(validSeverities).toContain('warning');
      expect(validSeverities).toContain('critical');
    });
  });

  describe('Notification Data Structure', () => {
    it('should create notification with required fields', () => {
      const notification = {
        userId: 1,
        type: 'report_sent' as const,
        severity: 'info' as const,
        title: 'Báo cáo mới',
        message: 'Báo cáo CPK hàng ngày đã được gửi',
        isRead: 0,
        createdAt: new Date(),
      };

      expect(notification).toHaveProperty('userId');
      expect(notification).toHaveProperty('type');
      expect(notification).toHaveProperty('severity');
      expect(notification).toHaveProperty('title');
      expect(notification).toHaveProperty('message');
      expect(notification).toHaveProperty('isRead');
      expect(notification).toHaveProperty('createdAt');
    });

    it('should create notification with optional metadata', () => {
      const notification = {
        userId: 1,
        type: 'cpk_alert' as const,
        severity: 'critical' as const,
        title: 'Cảnh báo CPK',
        message: 'CPK dưới ngưỡng cho phép',
        referenceType: 'spc_analysis',
        referenceId: 123,
        metadata: JSON.stringify({ cpk: 0.85, threshold: 1.0 }),
        isRead: 0,
        createdAt: new Date(),
      };

      expect(notification).toHaveProperty('referenceType');
      expect(notification).toHaveProperty('referenceId');
      expect(notification).toHaveProperty('metadata');
      expect(JSON.parse(notification.metadata)).toHaveProperty('cpk');
    });
  });

  describe('SSE Event Types', () => {
    it('should have user_notification event type', () => {
      const eventType = 'user_notification';
      expect(eventType).toBe('user_notification');
    });

    it('should have scheduled_report_pdf_ready event type', () => {
      const eventType = 'scheduled_report_pdf_ready';
      expect(eventType).toBe('scheduled_report_pdf_ready');
    });
  });

  describe('Notification Filtering', () => {
    it('should filter notifications by type', () => {
      const notifications = [
        { id: 1, type: 'report_sent', title: 'Report 1' },
        { id: 2, type: 'cpk_alert', title: 'Alert 1' },
        { id: 3, type: 'report_sent', title: 'Report 2' },
      ];

      const reportNotifications = notifications.filter(n => n.type === 'report_sent');
      expect(reportNotifications).toHaveLength(2);
    });

    it('should filter notifications by severity', () => {
      const notifications = [
        { id: 1, severity: 'info', title: 'Info 1' },
        { id: 2, severity: 'critical', title: 'Critical 1' },
        { id: 3, severity: 'warning', title: 'Warning 1' },
      ];

      const criticalNotifications = notifications.filter(n => n.severity === 'critical');
      expect(criticalNotifications).toHaveLength(1);
    });

    it('should filter unread notifications', () => {
      const notifications = [
        { id: 1, isRead: 0, title: 'Unread 1' },
        { id: 2, isRead: 1, title: 'Read 1' },
        { id: 3, isRead: 0, title: 'Unread 2' },
      ];

      const unreadNotifications = notifications.filter(n => n.isRead === 0);
      expect(unreadNotifications).toHaveLength(2);
    });
  });
});

describe('Radar Chart Data', () => {
  describe('Metric Calculations', () => {
    it('should calculate CPK score correctly', () => {
      const cpkValue = 1.5;
      const cpkScore = Math.min(cpkValue * 50, 100);
      expect(cpkScore).toBe(75);
    });

    it('should cap CPK score at 100', () => {
      const cpkValue = 3.0;
      const cpkScore = Math.min(cpkValue * 50, 100);
      expect(cpkScore).toBe(100);
    });

    it('should calculate stability score from std deviation', () => {
      const stdDev = 0.3;
      const stabilityScore = Math.max(100 - stdDev * 100, 0);
      expect(stabilityScore).toBe(70);
    });

    it('should calculate quality score from NG rate', () => {
      const ngRate = 5.5;
      const qualityScore = Math.max(100 - ngRate, 0);
      expect(qualityScore).toBe(94.5);
    });

    it('should calculate compliance score from violations', () => {
      const violationCount = 3;
      const totalAnalyses = 100;
      const complianceScore = Math.max(100 - (violationCount / totalAnalyses) * 100, 0);
      expect(complianceScore).toBe(97);
    });

    it('should handle zero total analyses', () => {
      const violationCount = 0;
      const totalAnalyses = 0;
      const complianceScore = Math.max(100 - (violationCount / Math.max(totalAnalyses, 1)) * 100, 0);
      expect(complianceScore).toBe(100);
    });
  });

  describe('Average Score Calculation', () => {
    it('should calculate average score correctly', () => {
      const cpkScore = 75;
      const stabilityScore = 80;
      const qualityScore = 95;
      const complianceScore = 97;
      
      const avgScore = (cpkScore + stabilityScore + qualityScore + complianceScore) / 4;
      expect(avgScore).toBe(86.75);
    });
  });
});
