/**
 * Auto-Retrain Service
 * Automatically retrains ML models when performance degrades or new data is available
 */

import * as unifiedMl from './unifiedMlService';
import { getDb } from '../db';
import { aiAnomalyModels, spcAnalysisHistory } from '../../drizzle/schema';
import { eq, desc, gte, and } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

// Types
export interface RetrainConfig {
  modelId: string;
  accuracyThreshold: number; // Retrain if accuracy drops below this
  errorRateThreshold: number; // Retrain if error rate exceeds this
  minDataPoints: number; // Minimum new data points before retrain
  maxAgeDays: number; // Retrain if model is older than this
  enabled: boolean;
}

export interface RetrainJob {
  id: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  reason: string;
  startedAt?: Date;
  completedAt?: Date;
  previousAccuracy?: number;
  newAccuracy?: number;
  error?: string;
}

export interface RetrainResult {
  jobId: string;
  modelId: string;
  success: boolean;
  previousAccuracy: number;
  newAccuracy: number;
  improvement: number;
  trainingTime: number;
  dataPointsUsed: number;
}

// In-memory storage
const retrainConfigs = new Map<string, RetrainConfig>();
const retrainJobs = new Map<string, RetrainJob>();
const retrainHistory: RetrainResult[] = [];

// Default configs for different model types
const DEFAULT_CONFIGS: Record<string, Partial<RetrainConfig>> = {
  cpk_prediction: {
    accuracyThreshold: 0.85,
    errorRateThreshold: 0.05,
    minDataPoints: 500,
    maxAgeDays: 7,
    enabled: true
  },
  spc_classification: {
    accuracyThreshold: 0.80,
    errorRateThreshold: 0.10,
    minDataPoints: 1000,
    maxAgeDays: 14,
    enabled: true
  },
  anomaly_detection: {
    accuracyThreshold: 0.75,
    errorRateThreshold: 0.15,
    minDataPoints: 200,
    maxAgeDays: 3,
    enabled: true
  }
};

/**
 * Initialize retrain config for a model
 */
export function initRetrainConfig(modelId: string, modelType: string): RetrainConfig {
  const defaults = DEFAULT_CONFIGS[modelType] || DEFAULT_CONFIGS.cpk_prediction;
  const config: RetrainConfig = {
    modelId,
    accuracyThreshold: defaults.accuracyThreshold || 0.85,
    errorRateThreshold: defaults.errorRateThreshold || 0.05,
    minDataPoints: defaults.minDataPoints || 500,
    maxAgeDays: defaults.maxAgeDays || 7,
    enabled: defaults.enabled ?? true
  };
  retrainConfigs.set(modelId, config);
  return config;
}

/**
 * Update retrain config
 */
export function updateRetrainConfig(modelId: string, updates: Partial<RetrainConfig>): RetrainConfig | null {
  const config = retrainConfigs.get(modelId);
  if (!config) return null;
  
  const updated = { ...config, ...updates };
  retrainConfigs.set(modelId, updated);
  return updated;
}

/**
 * Get retrain config
 */
export function getRetrainConfig(modelId: string): RetrainConfig | null {
  return retrainConfigs.get(modelId) || null;
}

/**
 * Check if model needs retraining
 */
export async function checkRetrainNeeded(modelId: string): Promise<{
  needed: boolean;
  reasons: string[];
}> {
  const config = retrainConfigs.get(modelId);
  if (!config || !config.enabled) {
    return { needed: false, reasons: ['Retrain disabled for this model'] };
  }
  
  const modelInfo = unifiedMl.getModelInfo(modelId);
  if (!modelInfo) {
    return { needed: false, reasons: ['Model not found'] };
  }
  
  const reasons: string[] = [];
  
  // Check accuracy threshold
  const accuracy = modelInfo.metrics.accuracy || modelInfo.metrics.r2Score || 0;
  if (accuracy < config.accuracyThreshold) {
    reasons.push(`Accuracy (${(accuracy * 100).toFixed(1)}%) below threshold (${(config.accuracyThreshold * 100).toFixed(1)}%)`);
  }
  
  // Check error rate
  const errorRate = modelInfo.totalErrors / (modelInfo.totalPredictions || 1);
  if (errorRate > config.errorRateThreshold) {
    reasons.push(`Error rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (${(config.errorRateThreshold * 100).toFixed(2)}%)`);
  }
  
  // Check model age
  const ageInDays = (Date.now() - modelInfo.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > config.maxAgeDays) {
    reasons.push(`Model age (${ageInDays.toFixed(1)} days) exceeds max age (${config.maxAgeDays} days)`);
  }
  
  // Check new data availability
  const newDataCount = await getNewDataCount(modelInfo.createdAt);
  if (newDataCount >= config.minDataPoints) {
    reasons.push(`New data available (${newDataCount} points >= ${config.minDataPoints} minimum)`);
  }
  
  return {
    needed: reasons.length > 0,
    reasons
  };
}

/**
 * Get count of new data points since a date
 */
async function getNewDataCount(since: Date): Promise<number> {
  try {
    const db = await getDb();
    const results = await db.select()
      .from(spcAnalysisHistory)
      .where(gte(spcAnalysisHistory.createdAt, since))
      .limit(10000);
    return results.length;
  } catch {
    return 0;
  }
}

/**
 * Get training data from database
 */
async function getTrainingData(modelType: string, limit: number = 5000): Promise<{
  features: number[][];
  labels: number[];
}> {
  try {
    const db = await getDb();
    const results = await db.select()
      .from(spcAnalysisHistory)
      .orderBy(desc(spcAnalysisHistory.createdAt))
      .limit(limit);
    
    const features: number[][] = [];
    const labels: number[] = [];
    
    for (const row of results) {
      // Extract features from SPC analysis
      const mean = row.mean || 0;
      const stdDev = row.stdDev || 0;
      const usl = row.usl || 100;
      const lsl = row.lsl || 0;
      const sampleSize = row.sampleSize || 25;
      
      const range = usl - lsl;
      const centeredness = range > 0 ? (mean - (usl + lsl) / 2) / (range / 2) : 0;
      const capability = stdDev > 0 ? range / (6 * stdDev) : 0;
      
      features.push([
        mean,
        stdDev,
        usl,
        lsl,
        sampleSize,
        centeredness,
        capability,
        row.cp || 0,
        row.ucl || 0,
        row.lcl || 0
      ]);
      
      // Label is CPK for regression, or rule violation index for classification
      if (modelType === 'spc_classification') {
        // Map violations to class index
        const violations = row.violations as string[] || [];
        labels.push(violations.length > 0 ? 1 : 0);
      } else {
        labels.push(row.cpk || 0);
      }
    }
    
    return { features, labels };
  } catch {
    // Return synthetic data if database query fails
    return unifiedMl.generateTrainingData(
      modelType as 'cpk_prediction' | 'spc_classification',
      1000
    );
  }
}

/**
 * Execute retrain job
 */
export async function executeRetrain(modelId: string, reason: string): Promise<RetrainResult> {
  const jobId = `retrain_${modelId}_${Date.now()}`;
  
  // Create job record
  const job: RetrainJob = {
    id: jobId,
    modelId,
    status: 'running',
    reason,
    startedAt: new Date()
  };
  retrainJobs.set(jobId, job);
  
  try {
    // Get current model info
    const modelInfo = unifiedMl.getModelInfo(modelId);
    const previousAccuracy = modelInfo?.metrics.accuracy || modelInfo?.metrics.r2Score || 0;
    
    // Determine model type and framework
    const modelType = modelInfo?.modelType || 'cpk_prediction';
    const framework = modelInfo?.framework || 'sklearn';
    
    // Get training data
    const trainingData = await getTrainingData(modelType);
    
    if (trainingData.features.length < 100) {
      throw new Error('Insufficient training data');
    }
    
    // Train new model
    const startTime = Date.now();
    const newModelId = `${modelId}_v${Date.now()}`;
    
    const trainingResult = await unifiedMl.trainModel(
      newModelId,
      {
        framework,
        modelType: modelType as any,
        hyperparameters: {
          epochs: 100,
          batchSize: 32
        }
      },
      trainingData.features,
      trainingData.labels
    );
    
    const newAccuracy = trainingResult.metrics.accuracy || trainingResult.metrics.r2Score || 0;
    const improvement = newAccuracy - previousAccuracy;
    
    // Update job status
    job.status = 'completed';
    job.completedAt = new Date();
    job.previousAccuracy = previousAccuracy;
    job.newAccuracy = newAccuracy;
    
    // Create result
    const result: RetrainResult = {
      jobId,
      modelId: newModelId,
      success: true,
      previousAccuracy,
      newAccuracy,
      improvement,
      trainingTime: Date.now() - startTime,
      dataPointsUsed: trainingData.features.length
    };
    
    retrainHistory.push(result);
    
    // Send notification if improvement is significant
    if (improvement > 0.05) {
      await notifyOwner({
        title: 'Model Retrained Successfully',
        content: `Model ${modelId} has been retrained.\n\nPrevious accuracy: ${(previousAccuracy * 100).toFixed(1)}%\nNew accuracy: ${(newAccuracy * 100).toFixed(1)}%\nImprovement: ${(improvement * 100).toFixed(1)}%\n\nReason: ${reason}`
      });
    }
    
    return result;
  } catch (error) {
    job.status = 'failed';
    job.completedAt = new Date();
    job.error = error instanceof Error ? error.message : 'Unknown error';
    
    // Notify about failure
    await notifyOwner({
      title: 'Model Retrain Failed',
      content: `Failed to retrain model ${modelId}.\n\nError: ${job.error}\nReason for retrain: ${reason}`
    });
    
    throw error;
  }
}

/**
 * Run scheduled retrain check for all models
 */
export async function runScheduledRetrainCheck(): Promise<{
  checked: number;
  retrained: number;
  failed: number;
  results: Array<{ modelId: string; status: string; reason?: string }>;
}> {
  const allModels = unifiedMl.getAllModels();
  const results: Array<{ modelId: string; status: string; reason?: string }> = [];
  
  let retrained = 0;
  let failed = 0;
  
  for (const model of allModels) {
    // Initialize config if not exists
    if (!retrainConfigs.has(model.modelId)) {
      initRetrainConfig(model.modelId, model.modelType);
    }
    
    // Check if retrain needed
    const check = await checkRetrainNeeded(model.modelId);
    
    if (check.needed) {
      try {
        await executeRetrain(model.modelId, check.reasons.join('; '));
        retrained++;
        results.push({
          modelId: model.modelId,
          status: 'retrained',
          reason: check.reasons.join('; ')
        });
      } catch (error) {
        failed++;
        results.push({
          modelId: model.modelId,
          status: 'failed',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      results.push({
        modelId: model.modelId,
        status: 'skipped',
        reason: 'No retrain needed'
      });
    }
  }
  
  return {
    checked: allModels.length,
    retrained,
    failed,
    results
  };
}

/**
 * Get retrain history
 */
export function getRetrainHistory(limit: number = 50): RetrainResult[] {
  return retrainHistory.slice(-limit);
}

/**
 * Get retrain job status
 */
export function getRetrainJob(jobId: string): RetrainJob | null {
  return retrainJobs.get(jobId) || null;
}

/**
 * Get all pending/running jobs
 */
export function getActiveJobs(): RetrainJob[] {
  return Array.from(retrainJobs.values())
    .filter(j => j.status === 'pending' || j.status === 'running');
}

/**
 * Get retrain statistics
 */
export function getRetrainStats(): {
  totalRetrains: number;
  successfulRetrains: number;
  failedRetrains: number;
  avgImprovement: number;
  avgTrainingTime: number;
  lastRetrainDate: Date | null;
} {
  const successful = retrainHistory.filter(r => r.success);
  const failed = retrainHistory.filter(r => !r.success);
  
  const avgImprovement = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.improvement, 0) / successful.length
    : 0;
  
  const avgTrainingTime = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.trainingTime, 0) / successful.length
    : 0;
  
  const lastRetrain = retrainHistory.length > 0
    ? new Date()
    : null;
  
  return {
    totalRetrains: retrainHistory.length,
    successfulRetrains: successful.length,
    failedRetrains: failed.length,
    avgImprovement,
    avgTrainingTime,
    lastRetrainDate: lastRetrain
  };
}

export default {
  initRetrainConfig,
  updateRetrainConfig,
  getRetrainConfig,
  checkRetrainNeeded,
  executeRetrain,
  runScheduledRetrainCheck,
  getRetrainHistory,
  getRetrainJob,
  getActiveJobs,
  getRetrainStats
};
