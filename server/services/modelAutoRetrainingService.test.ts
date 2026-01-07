/**
 * Unit tests for Model Auto-Retraining Service
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

// Mock anomaly detection service
vi.mock('./anomalyDetectionService', () => ({
  getModelById: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Test Model',
    accuracy: 0.85,
    f1Score: 0.82,
    version: 1,
    trainedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
  }),
  trainModel: vi.fn().mockResolvedValue({
    success: true,
    metrics: { trainingSamples: 1000 },
  }),
}));

import * as retrainingService from './modelAutoRetrainingService';

describe('ModelAutoRetrainingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getAllRetrainingConfigs', () => {
    it('should return empty array when no configs exist', async () => {
      mockExecute.mockResolvedValueOnce([]);
      
      const configs = await retrainingService.getAllRetrainingConfigs();
      
      expect(configs).toEqual([]);
    });

    it('should return mapped configs', async () => {
      mockExecute.mockResolvedValueOnce([
        {
          id: 1,
          model_id: 1,
          name: 'Auto Retrain Config',
          description: 'Test config',
          accuracy_threshold: '0.8500',
          f1_score_threshold: '0.8000',
          drift_threshold: '0.1500',
          min_samples_since_last_train: 1000,
          max_days_since_last_train: 30,
          check_interval_hours: 6,
          last_check_at: null,
          next_check_at: Date.now() + 6 * 60 * 60 * 1000,
          training_window_days: 30,
          min_training_samples: 1000,
          validation_split: '0.20',
          notify_on_retrain: 1,
          notify_on_failure: 1,
          notification_emails: '["admin@example.com"]',
          is_enabled: 1,
          created_by: 1,
          created_at: '2024-01-01',
          updated_at: null,
        },
      ]);

      const configs = await retrainingService.getAllRetrainingConfigs();

      expect(configs).toHaveLength(1);
      expect(configs[0]).toMatchObject({
        id: 1,
        modelId: 1,
        name: 'Auto Retrain Config',
        accuracyThreshold: 0.85,
        f1ScoreThreshold: 0.8,
        notifyOnRetrain: true,
        isEnabled: true,
        notificationEmails: ['admin@example.com'],
      });
    });
  });

  describe('createRetrainingConfig', () => {
    it('should create a new retraining config', async () => {
      mockExecute
        .mockResolvedValueOnce([]) // INSERT
        .mockResolvedValueOnce([
          {
            id: 1,
            model_id: 1,
            name: 'New Retrain Config',
            description: null,
            accuracy_threshold: '0.9000',
            f1_score_threshold: '0.8500',
            drift_threshold: '0.1000',
            min_samples_since_last_train: 500,
            max_days_since_last_train: 14,
            check_interval_hours: 12,
            last_check_at: null,
            next_check_at: Date.now() + 12 * 60 * 60 * 1000,
            training_window_days: 14,
            min_training_samples: 500,
            validation_split: '0.25',
            notify_on_retrain: 1,
            notify_on_failure: 1,
            notification_emails: '[]',
            is_enabled: 1,
            created_by: 1,
            created_at: '2024-01-01',
            updated_at: null,
          },
        ]);

      const config = await retrainingService.createRetrainingConfig({
        modelId: 1,
        name: 'New Retrain Config',
        accuracyThreshold: 0.9,
        f1ScoreThreshold: 0.85,
        driftThreshold: 0.1,
        minSamplesSinceLastTrain: 500,
        maxDaysSinceLastTrain: 14,
        checkIntervalHours: 12,
        trainingWindowDays: 14,
        minTrainingSamples: 500,
        validationSplit: 0.25,
        createdBy: 1,
      });

      expect(config).not.toBeNull();
      expect(config?.name).toBe('New Retrain Config');
      expect(config?.accuracyThreshold).toBe(0.9);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe('toggleRetrainingConfig', () => {
    it('should toggle config enabled status', async () => {
      mockExecute.mockResolvedValueOnce([]);

      const result = await retrainingService.toggleRetrainingConfig(1, false);

      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE model_retraining_configs SET is_enabled = ?'),
        [0, 1]
      );
    });
  });

  describe('getRetrainingHistory', () => {
    it('should return retraining history with pagination', async () => {
      mockExecute
        .mockResolvedValueOnce([{ total: 5 }]) // COUNT
        .mockResolvedValueOnce([
          {
            id: 1,
            config_id: 1,
            model_id: 1,
            trigger_reason: 'accuracy_drop',
            previous_accuracy: '0.7500',
            previous_f1_score: '0.7200',
            previous_version: 1,
            status: 'completed',
            started_at: Date.now() - 3600000,
            completed_at: Date.now(),
            training_samples: 1000,
            validation_samples: 200,
            training_duration_sec: 120,
            new_accuracy: '0.8800',
            new_precision: '0.8600',
            new_recall: '0.8400',
            new_f1_score: '0.8500',
            new_version: 2,
            accuracy_improvement: '0.1300',
            error_message: null,
            error_details: null,
            notification_sent: 1,
            notification_sent_at: Date.now(),
            created_at: '2024-01-01',
          },
        ]);

      const result = await retrainingService.getRetrainingHistory({
        modelId: 1,
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(5);
      expect(result.history).toHaveLength(1);
      expect(result.history[0]).toMatchObject({
        id: 1,
        triggerReason: 'accuracy_drop',
        status: 'completed',
        previousAccuracy: 0.75,
        newAccuracy: 0.88,
        accuracyImprovement: 0.13,
      });
    });
  });

  describe('cancelRetraining', () => {
    it('should cancel a queued retraining', async () => {
      mockExecute.mockResolvedValueOnce([]);

      const result = await retrainingService.cancelRetraining(1);

      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining("status = 'cancelled'"),
        expect.arrayContaining([expect.any(Number), 1])
      );
    });
  });

  describe('getRetrainingStats', () => {
    it('should return retraining statistics', async () => {
      mockExecute.mockResolvedValueOnce([
        {
          total: 20,
          successful: 15,
          failed: 3,
          avg_improvement: '0.0850',
          avg_duration: '150.50',
        },
      ]);

      const stats = await retrainingService.getRetrainingStats();

      expect(stats.totalRetrainings).toBe(20);
      expect(stats.successfulRetrainings).toBe(15);
      expect(stats.failedRetrainings).toBe(3);
      expect(stats.avgAccuracyImprovement).toBeCloseTo(0.085);
      expect(stats.avgTrainingDuration).toBeCloseTo(150.5);
    });
  });
});
