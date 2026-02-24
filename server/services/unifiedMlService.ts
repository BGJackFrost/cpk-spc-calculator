/**
 * Unified ML Service
 * Combines TensorFlow.js and sklearn-like implementations
 * Provides a unified interface for model training and predictions
 */

import * as tensorflowMl from './tensorflowMlService';
import * as sklearnApi from './sklearnApiService';

// Types
export type ModelFramework = 'tensorflow' | 'sklearn';
export type ModelType = 
  | 'cpk_prediction' 
  | 'spc_classification' 
  | 'anomaly_detection'
  | 'linear_regression'
  | 'random_forest'
  | 'gradient_boosting';

export interface UnifiedModelConfig {
  framework: ModelFramework;
  modelType: ModelType;
  hyperparameters?: Record<string, number | string | boolean>;
}

export interface UnifiedTrainingResult {
  modelId: string;
  framework: ModelFramework;
  modelType: ModelType;
  metrics: {
    accuracy?: number;
    r2Score?: number;
    loss?: number;
    mse?: number;
    mae?: number;
    rmse?: number;
  };
  featureImportance?: Record<string, number>;
  trainingTime: number;
  history?: {
    loss: number[];
    accuracy: number[];
  };
  crossValidationScores?: number[];
}

export interface UnifiedPredictionResult {
  predictions: number[];
  confidence?: number[];
  predictionIntervals?: {
    lower: number[];
    upper: number[];
  };
  processingTime: number;
}

// Model registry
interface ModelRegistry {
  framework: ModelFramework;
  modelType: ModelType;
  createdAt: Date;
  lastUsed: Date;
  totalPredictions: number;
  totalErrors: number;
  metrics: UnifiedTrainingResult['metrics'];
}

const modelRegistry = new Map<string, ModelRegistry>();

/**
 * Train a model using the specified framework
 */
export async function trainModel(
  modelId: string,
  config: UnifiedModelConfig,
  features: number[][],
  labels: number[]
): Promise<UnifiedTrainingResult> {
  const startTime = Date.now();
  
  let result: UnifiedTrainingResult;
  
  if (config.framework === 'tensorflow') {
    // Use TensorFlow.js
    const tfResult = await tensorflowMl.trainModel(
      modelId,
      config.modelType as 'cpk_prediction' | 'spc_classification' | 'anomaly_detection',
      { features, labels },
      {
        epochs: (config.hyperparameters?.epochs as number) || 100,
        batchSize: (config.hyperparameters?.batchSize as number) || 32
      }
    );
    
    result = {
      modelId,
      framework: 'tensorflow',
      modelType: config.modelType,
      metrics: {
        accuracy: tfResult.accuracy,
        loss: tfResult.loss
      },
      trainingTime: tfResult.trainingTime,
      history: tfResult.history
    };
  } else {
    // Use sklearn-like implementation
    const skConfig = {
      modelType: config.modelType as 'linear_regression' | 'random_forest' | 'gradient_boosting' | 'svm' | 'neural_network',
      hyperparameters: config.hyperparameters || {}
    };
    
    const skResult = await sklearnApi.trainSklearnModel(modelId, skConfig, features, labels);
    
    result = {
      modelId,
      framework: 'sklearn',
      modelType: config.modelType,
      metrics: {
        r2Score: skResult.metrics.r2Score,
        mse: skResult.metrics.mse,
        mae: skResult.metrics.mae,
        rmse: skResult.metrics.rmse
      },
      featureImportance: skResult.featureImportance,
      trainingTime: skResult.trainingTime,
      crossValidationScores: skResult.crossValidationScores
    };
  }
  
  // Register model
  modelRegistry.set(modelId, {
    framework: config.framework,
    modelType: config.modelType,
    createdAt: new Date(),
    lastUsed: new Date(),
    totalPredictions: 0,
    totalErrors: 0,
    metrics: result.metrics
  });
  
  return result;
}

/**
 * Make predictions using a trained model
 */
export async function predict(
  modelId: string,
  features: number[][]
): Promise<UnifiedPredictionResult> {
  const registry = modelRegistry.get(modelId);
  if (!registry) {
    throw new Error(`Model ${modelId} not found in registry`);
  }
  
  try {
    let result: UnifiedPredictionResult;
    
    if (registry.framework === 'tensorflow') {
      const tfResult = await tensorflowMl.predict(modelId, features);
      result = {
        predictions: tfResult.predictions,
        confidence: tfResult.confidence,
        processingTime: tfResult.processingTime
      };
    } else {
      const skResult = await sklearnApi.predictSklearn(modelId, features);
      result = {
        predictions: skResult.predictions,
        predictionIntervals: skResult.predictionIntervals,
        processingTime: skResult.processingTime
      };
    }
    
    // Update registry
    registry.lastUsed = new Date();
    registry.totalPredictions += features.length;
    
    return result;
  } catch (error) {
    registry.totalErrors += 1;
    throw error;
  }
}

/**
 * Get model info
 */
export function getModelInfo(modelId: string): ModelRegistry | null {
  return modelRegistry.get(modelId) || null;
}

/**
 * Get all models
 */
export function getAllModels(): Array<{ modelId: string } & ModelRegistry> {
  return Array.from(modelRegistry.entries()).map(([modelId, info]) => ({
    modelId,
    ...info
  }));
}

/**
 * Delete a model
 */
export function deleteModel(modelId: string): boolean {
  const registry = modelRegistry.get(modelId);
  if (!registry) return false;
  
  if (registry.framework === 'tensorflow') {
    tensorflowMl.deleteModel(modelId);
  } else {
    sklearnApi.deleteSklearnModel(modelId);
  }
  
  modelRegistry.delete(modelId);
  return true;
}

/**
 * Compare models performance
 */
export function compareModels(modelIds: string[]): Array<{
  modelId: string;
  framework: ModelFramework;
  modelType: ModelType;
  metrics: UnifiedTrainingResult['metrics'];
  totalPredictions: number;
  errorRate: number;
}> {
  return modelIds
    .map(id => {
      const info = modelRegistry.get(id);
      if (!info) return null;
      
      return {
        modelId: id,
        framework: info.framework,
        modelType: info.modelType,
        metrics: info.metrics,
        totalPredictions: info.totalPredictions,
        errorRate: info.totalErrors / (info.totalPredictions || 1)
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);
}

/**
 * Get best model for a specific task
 */
export function getBestModel(modelType: ModelType): { modelId: string; info: ModelRegistry } | null {
  let bestModel: { modelId: string; info: ModelRegistry } | null = null;
  let bestScore = -Infinity;
  
  for (const [modelId, info] of modelRegistry.entries()) {
    if (info.modelType !== modelType) continue;
    
    // Calculate score based on metrics
    let score = 0;
    if (info.metrics.accuracy !== undefined) {
      score = info.metrics.accuracy;
    } else if (info.metrics.r2Score !== undefined) {
      score = info.metrics.r2Score;
    } else if (info.metrics.loss !== undefined) {
      score = 1 - info.metrics.loss; // Lower loss is better
    }
    
    // Penalize error rate
    const errorRate = info.totalErrors / (info.totalPredictions || 1);
    score -= errorRate * 0.1;
    
    if (score > bestScore) {
      bestScore = score;
      bestModel = { modelId, info };
    }
  }
  
  return bestModel;
}

/**
 * Auto-select framework based on data characteristics
 */
export function recommendFramework(
  dataSize: number,
  featureCount: number,
  taskType: 'regression' | 'classification'
): { framework: ModelFramework; modelType: ModelType; reason: string } {
  // TensorFlow is better for:
  // - Large datasets (> 10000 samples)
  // - Complex patterns
  // - Classification tasks
  
  // Sklearn is better for:
  // - Smaller datasets
  // - Interpretability
  // - Quick training
  
  if (dataSize > 10000 || featureCount > 50) {
    return {
      framework: 'tensorflow',
      modelType: taskType === 'classification' ? 'spc_classification' : 'cpk_prediction',
      reason: 'TensorFlow recommended for large datasets with many features'
    };
  }
  
  if (taskType === 'classification') {
    return {
      framework: 'tensorflow',
      modelType: 'spc_classification',
      reason: 'TensorFlow neural networks excel at classification tasks'
    };
  }
  
  // For smaller regression tasks, sklearn is faster and more interpretable
  if (dataSize < 1000) {
    return {
      framework: 'sklearn',
      modelType: 'linear_regression',
      reason: 'Linear regression is fast and interpretable for small datasets'
    };
  }
  
  return {
    framework: 'sklearn',
    modelType: 'gradient_boosting',
    reason: 'Gradient boosting provides good accuracy with reasonable training time'
  };
}

/**
 * Generate training data based on task type
 */
export function generateTrainingData(
  taskType: 'cpk_prediction' | 'spc_classification',
  count: number
): { features: number[][]; labels: number[] } {
  if (taskType === 'cpk_prediction') {
    const data = sklearnApi.generateCpkRegressionData(count);
    return { features: data.X, labels: data.y };
  } else {
    return tensorflowMl.generateSyntheticSpcData(count);
  }
}

/**
 * Batch predict with multiple models and ensemble
 */
export async function ensemblePredict(
  modelIds: string[],
  features: number[][],
  method: 'average' | 'weighted' | 'voting' = 'average'
): Promise<UnifiedPredictionResult> {
  const startTime = Date.now();
  
  const results = await Promise.all(
    modelIds.map(id => predict(id, features).catch(() => null))
  );
  
  const validResults = results.filter((r): r is UnifiedPredictionResult => r !== null);
  
  if (validResults.length === 0) {
    throw new Error('No valid predictions from any model');
  }
  
  const numPredictions = features.length;
  const ensemblePredictions: number[] = [];
  const ensembleConfidence: number[] = [];
  
  for (let i = 0; i < numPredictions; i++) {
    const predictions = validResults.map(r => r.predictions[i]);
    
    if (method === 'average') {
      ensemblePredictions.push(
        predictions.reduce((a, b) => a + b, 0) / predictions.length
      );
    } else if (method === 'voting') {
      // For classification - majority voting
      const counts: Record<number, number> = {};
      predictions.forEach(p => {
        const rounded = Math.round(p);
        counts[rounded] = (counts[rounded] || 0) + 1;
      });
      const maxCount = Math.max(...Object.values(counts));
      const winner = Number(Object.keys(counts).find(k => counts[Number(k)] === maxCount));
      ensemblePredictions.push(winner);
    } else {
      // Weighted by confidence
      const confidences = validResults.map(r => r.confidence?.[i] || 0.5);
      const totalWeight = confidences.reduce((a, b) => a + b, 0);
      const weighted = predictions.reduce((sum, p, j) => sum + p * confidences[j], 0);
      ensemblePredictions.push(weighted / totalWeight);
    }
    
    // Average confidence
    const avgConfidence = validResults
      .map(r => r.confidence?.[i] || 0.5)
      .reduce((a, b) => a + b, 0) / validResults.length;
    ensembleConfidence.push(avgConfidence);
  }
  
  return {
    predictions: ensemblePredictions,
    confidence: ensembleConfidence,
    processingTime: Date.now() - startTime
  };
}

export default {
  trainModel,
  predict,
  getModelInfo,
  getAllModels,
  deleteModel,
  compareModels,
  getBestModel,
  recommendFramework,
  generateTrainingData,
  ensemblePredict
};
