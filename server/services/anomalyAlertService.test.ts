/**
 * Unit tests for Anomaly Alert Service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock getDb
const mockExecute = vi.fn();
vi.mock('../db', () => ({
  getDb: () => ({
    execute: mockExecute,
  }),
}));

// Mock email service
vi.mock('../emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  getSmtpConfig: vi.fn().mockResolvedValue({ host: 'smtp.test.com' }),
}));

// Mock telegram service
vi.mock('./telegramService', () => ({
  getTelegramConfigs: vi.fn().mockResolvedValue([]),
}));

import * as anomalyAlertService from './anomalyAlertService';

describe('AnomalyAlertService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getAllAlertConfigs', () => {
    it('should return empty array when no configs exist', async () => {
      mockExecute.mockResolvedValueOnce([]);
      
      const configs = await anomalyAlertService.getAllAlertConfigs();
      
      expect(configs).toEqual([]);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM anomaly_alert_configs')
      );
    });

    it('should return mapped configs', async () => {
      mockExecute.mockResolvedValueOnce([
        {
          id: 1,
          name: 'Test Alert',
          description: 'Test description',
          model_id: 1,
          device_id: null,
          production_line_id: null,
          severity_threshold: 'medium',
          anomaly_score_threshold: '0.7000',
          consecutive_anomalies: 3,
          cooldown_minutes: 15,
          email_enabled: 1,
          email_recipients: '["test@example.com"]',
          telegram_enabled: 0,
          telegram_chat_ids: '[]',
          slack_enabled: 0,
          slack_webhook_url: null,
          slack_channel: null,
          is_active: 1,
          last_triggered_at: null,
          created_by: 1,
          created_at: '2024-01-01',
          updated_at: null,
        },
      ]);

      const configs = await anomalyAlertService.getAllAlertConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0]).toMatchObject({
        id: 1,
        name: 'Test Alert',
        severityThreshold: 'medium',
        anomalyScoreThreshold: 0.7,
        emailEnabled: true,
        emailRecipients: ['test@example.com'],
        isActive: true,
      });
    });
  });

  describe('createAlertConfig', () => {
    it('should create a new alert config', async () => {
      mockExecute
        .mockResolvedValueOnce([]) // INSERT
        .mockResolvedValueOnce([
          {
            id: 1,
            name: 'New Alert',
            description: null,
            model_id: 1,
            device_id: null,
            production_line_id: null,
            severity_threshold: 'high',
            anomaly_score_threshold: '0.8000',
            consecutive_anomalies: 5,
            cooldown_minutes: 30,
            email_enabled: 1,
            email_recipients: '["admin@example.com"]',
            telegram_enabled: 0,
            telegram_chat_ids: '[]',
            slack_enabled: 0,
            slack_webhook_url: null,
            slack_channel: null,
            is_active: 1,
            last_triggered_at: null,
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: null,
          },
        ]);

      const config = await anomalyAlertService.createAlertConfig({
        name: 'New Alert',
        modelId: 1,
        severityThreshold: 'high',
        anomalyScoreThreshold: 0.8,
        consecutiveAnomalies: 5,
        cooldownMinutes: 30,
        emailEnabled: true,
        emailRecipients: ['admin@example.com'],
        createdBy: 1,
      });

      expect(config).not.toBeNull();
      expect(config?.name).toBe('New Alert');
      expect(config?.severityThreshold).toBe('high');
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe('toggleAlertConfig', () => {
    it('should toggle config active status', async () => {
      mockExecute.mockResolvedValueOnce([]);

      const result = await anomalyAlertService.toggleAlertConfig(1, false);

      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE anomaly_alert_configs SET is_active = ?'),
        [0, 1]
      );
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history with pagination', async () => {
      mockExecute
        .mockResolvedValueOnce([{ total: 10 }]) // COUNT
        .mockResolvedValueOnce([
          {
            id: 1,
            config_id: 1,
            anomaly_detection_id: null,
            model_id: 1,
            device_id: null,
            alert_type: 'anomaly_detected',
            severity: 'high',
            title: 'Test Alert',
            message: 'Test message',
            anomaly_value: '45.5000',
            anomaly_score: '0.8500',
            expected_min: '20.0000',
            expected_max: '30.0000',
            email_sent: 1,
            email_sent_at: Date.now(),
            telegram_sent: 0,
            telegram_sent_at: null,
            slack_sent: 0,
            slack_sent_at: null,
            acknowledged: 0,
            acknowledged_by: null,
            acknowledged_at: null,
            resolution: null,
            triggered_at: Date.now(),
            created_at: '2024-01-01',
          },
        ]);

      const result = await anomalyAlertService.getAlertHistory({
        modelId: 1,
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(10);
      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0]).toMatchObject({
        id: 1,
        alertType: 'anomaly_detected',
        severity: 'high',
        emailSent: true,
      });
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert with resolution', async () => {
      mockExecute.mockResolvedValueOnce([]);

      const result = await anomalyAlertService.acknowledgeAlert(
        1,
        1,
        'Issue resolved by adjusting sensor calibration'
      );

      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE anomaly_alert_history SET acknowledged = 1'),
        expect.arrayContaining([1, expect.any(Number), 'Issue resolved by adjusting sensor calibration', 1])
      );
    });
  });

  describe('getAlertStats', () => {
    it('should return alert statistics', async () => {
      mockExecute
        .mockResolvedValueOnce([{ total: 100, acknowledged: 80 }])
        .mockResolvedValueOnce([
          { severity: 'low', count: 30 },
          { severity: 'medium', count: 40 },
          { severity: 'high', count: 20 },
          { severity: 'critical', count: 10 },
        ])
        .mockResolvedValueOnce([
          { alert_type: 'anomaly_detected', count: 60 },
          { alert_type: 'threshold_exceeded', count: 30 },
          { alert_type: 'consecutive_anomalies', count: 10 },
        ]);

      const stats = await anomalyAlertService.getAlertStats({});

      expect(stats.totalAlerts).toBe(100);
      expect(stats.acknowledgedCount).toBe(80);
      expect(stats.unacknowledgedCount).toBe(20);
      expect(stats.bySeverity).toEqual({
        low: 30,
        medium: 40,
        high: 20,
        critical: 10,
      });
    });
  });
});
