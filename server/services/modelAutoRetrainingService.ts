/**
 * Model Auto-Retraining Service
 * Triển khai cơ chế tự động retrain model khi accuracy giảm dưới ngưỡng
 */

import { getDb } from "../db";
import { sendEmail, getSmtpConfig } from "../emailService";

// Types
export interface RetrainingConfig {
  id: number;
  modelId: number;
  name: string;
  description?: string | null;
  accuracyThreshold: number;
  f1ScoreThreshold: number;
  driftThreshold: number;
  minSamplesSinceLastTrain: number;
  maxDaysSinceLastTrain: number;
  checkIntervalHours: number;
  lastCheckAt?: number | null;
  nextCheckAt?: number | null;
  trainingWindowDays: number;
  minTrainingSamples: number;
  validationSplit: number;
  notifyOnRetrain: boolean;
  notifyOnFailure: boolean;
  notificationEmails: string[];
  isEnabled: boolean;
  createdBy?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface RetrainingHistory {
  id: number;
  configId: number;
  modelId: number;
  triggerReason: 'accuracy_drop' | 'f1_drop' | 'drift_detected' | 'scheduled' | 'manual';
  previousAccuracy: number;
  previousF1Score: number;
  previousVersion: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: number | null;
  completedAt?: number | null;
  trainingSamples: number;
  validationSamples: number;
  trainingDurationSec?: number | null;
  newAccuracy?: number | null;
  newPrecision?: number | null;
  newRecall?: number | null;
  newF1Score?: number | null;
  newVersion?: number | null;
  accuracyImprovement?: number | null;
  errorMessage?: string | null;
  errorDetails?: string | null;
  notificationSent: boolean;
  notificationSentAt?: number | null;
  createdAt: string;
}

export interface CreateRetrainingConfigInput {
  modelId: number;
  name: string;
  description?: string;
  accuracyThreshold?: number;
  f1ScoreThreshold?: number;
  driftThreshold?: number;
  minSamplesSinceLastTrain?: number;
  maxDaysSinceLastTrain?: number;
  checkIntervalHours?: number;
  trainingWindowDays?: number;
  minTrainingSamples?: number;
  validationSplit?: number;
  notifyOnRetrain?: boolean;
  notifyOnFailure?: boolean;
  notificationEmails?: string[];
  createdBy?: number;
}

// Get all retraining configs
export async function getAllRetrainingConfigs(): Promise<RetrainingConfig[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const results = await db.execute(`SELECT * FROM model_retraining_configs ORDER BY created_at DESC`);
    return ((results as any[]) || []).map(mapConfigFromDb);
  } catch (error) {
    console.error('[ModelRetrain] Error fetching configs:', error);
    return [];
  }
}

// Get retraining config by ID
export async function getRetrainingConfigById(id: number): Promise<RetrainingConfig | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const results = await db.execute(`SELECT * FROM model_retraining_configs WHERE id = ?`, [id]);
    if (!results || (results as any[]).length === 0) return null;
    return mapConfigFromDb((results as any[])[0]);
  } catch (error) {
    console.error('[ModelRetrain] Error fetching config:', error);
    return null;
  }
}

// Create retraining config
export async function createRetrainingConfig(input: CreateRetrainingConfigInput): Promise<RetrainingConfig | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const nextCheckAt = Date.now() + (input.checkIntervalHours || 6) * 60 * 60 * 1000;
    await db.execute(
      `INSERT INTO model_retraining_configs (model_id, name, description, accuracy_threshold, f1_score_threshold, drift_threshold, min_samples_since_last_train, max_days_since_last_train, check_interval_hours, next_check_at, training_window_days, min_training_samples, validation_split, notify_on_retrain, notify_on_failure, notification_emails, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.modelId,
        input.name,
        input.description || null,
        input.accuracyThreshold ?? 0.85,
        input.f1ScoreThreshold ?? 0.8,
        input.driftThreshold ?? 0.15,
        input.minSamplesSinceLastTrain ?? 1000,
        input.maxDaysSinceLastTrain ?? 30,
        input.checkIntervalHours ?? 6,
        nextCheckAt,
        input.trainingWindowDays ?? 30,
        input.minTrainingSamples ?? 1000,
        input.validationSplit ?? 0.2,
        input.notifyOnRetrain ? 1 : 0,
        input.notifyOnFailure ? 1 : 0,
        JSON.stringify(input.notificationEmails || []),
        input.createdBy || null,
      ]
    );
    const results = await db.execute(`SELECT * FROM model_retraining_configs ORDER BY id DESC LIMIT 1`);
    if (!results || (results as any[]).length === 0) return null;
    return mapConfigFromDb((results as any[])[0]);
  } catch (error) {
    console.error('[ModelRetrain] Error creating config:', error);
    return null;
  }
}

// Toggle retraining config
export async function toggleRetrainingConfig(id: number, isEnabled: boolean): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.execute(`UPDATE model_retraining_configs SET is_enabled = ? WHERE id = ?`, [isEnabled ? 1 : 0, id]);
    return true;
  } catch (error) {
    console.error('[ModelRetrain] Error toggling config:', error);
    return false;
  }
}

// Check if model needs retraining
export async function checkModelNeedsRetraining(config: RetrainingConfig): Promise<{
  needsRetraining: boolean;
  reason?: string;
  currentAccuracy?: number;
  currentF1Score?: number;
}> {
  try {
    // Mock model metrics - in production, get from anomalyDetectionService
    const modelMetrics = {
      accuracy: 0.85,
      f1Score: 0.82,
      trainedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    };

    // Check accuracy threshold
    if (modelMetrics.accuracy < config.accuracyThreshold) {
      return {
        needsRetraining: true,
        reason: 'accuracy_drop',
        currentAccuracy: modelMetrics.accuracy,
        currentF1Score: modelMetrics.f1Score,
      };
    }

    // Check F1 score threshold
    if (modelMetrics.f1Score < config.f1ScoreThreshold) {
      return {
        needsRetraining: true,
        reason: 'f1_drop',
        currentAccuracy: modelMetrics.accuracy,
        currentF1Score: modelMetrics.f1Score,
      };
    }

    // Check max days since last train
    const daysSinceLastTrain = (Date.now() - modelMetrics.trainedAt) / (24 * 60 * 60 * 1000);
    if (daysSinceLastTrain > config.maxDaysSinceLastTrain) {
      return {
        needsRetraining: true,
        reason: 'scheduled',
        currentAccuracy: modelMetrics.accuracy,
        currentF1Score: modelMetrics.f1Score,
      };
    }

    return {
      needsRetraining: false,
      currentAccuracy: modelMetrics.accuracy,
      currentF1Score: modelMetrics.f1Score,
    };
  } catch (error) {
    console.error('[ModelRetrain] Error checking model:', error);
    return { needsRetraining: false };
  }
}

// Get retraining history
export async function getRetrainingHistory(options: {
  configId?: number;
  modelId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ history: RetrainingHistory[]; total: number }> {
  const db = await getDb();
  if (!db) return { history: [], total: 0 };
  try {
    let whereClause = '1=1';
    const params: any[] = [];
    if (options.configId) {
      whereClause += ' AND config_id = ?';
      params.push(options.configId);
    }
    if (options.modelId) {
      whereClause += ' AND model_id = ?';
      params.push(options.modelId);
    }
    if (options.status) {
      whereClause += ' AND status = ?';
      params.push(options.status);
    }
    const countResult = await db.execute(`SELECT COUNT(*) as total FROM model_retraining_history WHERE ${whereClause}`, params);
    const total = (countResult as any[])?.[0]?.total || 0;
    const limit = options.limit || 50;
    const offset = options.offset || 0;
    params.push(limit, offset);
    const results = await db.execute(
      `SELECT * FROM model_retraining_history WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );
    const history = ((results as any[]) || []).map(mapHistoryFromDb);
    return { history, total };
  } catch (error) {
    console.error('[ModelRetrain] Error fetching history:', error);
    return { history: [], total: 0 };
  }
}

// Cancel retraining
export async function cancelRetraining(historyId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  try {
    await db.execute(
      `UPDATE model_retraining_history SET status = 'cancelled', completed_at = ? WHERE id = ? AND status IN ('queued', 'running')`,
      [Date.now(), historyId]
    );
    return true;
  } catch (error) {
    console.error('[ModelRetrain] Error cancelling retraining:', error);
    return false;
  }
}

// Get retraining stats
export async function getRetrainingStats(): Promise<{
  totalRetrainings: number;
  successfulRetrainings: number;
  failedRetrainings: number;
  avgAccuracyImprovement: number;
  avgTrainingDuration: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalRetrainings: 0,
      successfulRetrainings: 0,
      failedRetrainings: 0,
      avgAccuracyImprovement: 0,
      avgTrainingDuration: 0,
    };
  }
  try {
    const results = await db.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        AVG(accuracy_improvement) as avg_improvement,
        AVG(training_duration_sec) as avg_duration
      FROM model_retraining_history
    `);
    const row = (results as any[])?.[0] || {};
    return {
      totalRetrainings: row.total || 0,
      successfulRetrainings: row.successful || 0,
      failedRetrainings: row.failed || 0,
      avgAccuracyImprovement: row.avg_improvement ? parseFloat(row.avg_improvement) : 0,
      avgTrainingDuration: row.avg_duration ? parseFloat(row.avg_duration) : 0,
    };
  } catch (error) {
    console.error('[ModelRetrain] Error fetching stats:', error);
    return {
      totalRetrainings: 0,
      successfulRetrainings: 0,
      failedRetrainings: 0,
      avgAccuracyImprovement: 0,
      avgTrainingDuration: 0,
    };
  }
}

// Helper: Map config from database row
function mapConfigFromDb(row: any): RetrainingConfig {
  return {
    id: row.id,
    modelId: row.model_id,
    name: row.name,
    description: row.description,
    accuracyThreshold: row.accuracy_threshold ? parseFloat(row.accuracy_threshold) : 0.85,
    f1ScoreThreshold: row.f1_score_threshold ? parseFloat(row.f1_score_threshold) : 0.8,
    driftThreshold: row.drift_threshold ? parseFloat(row.drift_threshold) : 0.15,
    minSamplesSinceLastTrain: row.min_samples_since_last_train || 1000,
    maxDaysSinceLastTrain: row.max_days_since_last_train || 30,
    checkIntervalHours: row.check_interval_hours || 6,
    lastCheckAt: row.last_check_at,
    nextCheckAt: row.next_check_at,
    trainingWindowDays: row.training_window_days || 30,
    minTrainingSamples: row.min_training_samples || 1000,
    validationSplit: row.validation_split ? parseFloat(row.validation_split) : 0.2,
    notifyOnRetrain: row.notify_on_retrain === 1,
    notifyOnFailure: row.notify_on_failure === 1,
    notificationEmails: row.notification_emails ? JSON.parse(row.notification_emails) : [],
    isEnabled: row.is_enabled === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper: Map history from database row
function mapHistoryFromDb(row: any): RetrainingHistory {
  return {
    id: row.id,
    configId: row.config_id,
    modelId: row.model_id,
    triggerReason: row.trigger_reason,
    previousAccuracy: row.previous_accuracy ? parseFloat(row.previous_accuracy) : 0,
    previousF1Score: row.previous_f1_score ? parseFloat(row.previous_f1_score) : 0,
    previousVersion: row.previous_version || 0,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    trainingSamples: row.training_samples || 0,
    validationSamples: row.validation_samples || 0,
    trainingDurationSec: row.training_duration_sec,
    newAccuracy: row.new_accuracy ? parseFloat(row.new_accuracy) : null,
    newPrecision: row.new_precision ? parseFloat(row.new_precision) : null,
    newRecall: row.new_recall ? parseFloat(row.new_recall) : null,
    newF1Score: row.new_f1_score ? parseFloat(row.new_f1_score) : null,
    newVersion: row.new_version,
    accuracyImprovement: row.accuracy_improvement ? parseFloat(row.accuracy_improvement) : null,
    errorMessage: row.error_message,
    errorDetails: row.error_details,
    notificationSent: row.notification_sent === 1,
    notificationSentAt: row.notification_sent_at,
    createdAt: row.created_at,
  };
}
