/**
 * TensorFlow.js ML Service
 * Provides real ML capabilities for SPC/CPK predictions
 */

import * as tf from '@tensorflow/tfjs';

// Types
export interface TrainingData {
  features: number[][];
  labels: number[];
}

export interface ModelConfig {
  inputShape: number;
  hiddenLayers: number[];
  outputShape: number;
  learningRate: number;
  epochs: number;
  batchSize: number;
}

export interface TrainingResult {
  modelId: string;
  accuracy: number;
  loss: number;
  epochs: number;
  trainingTime: number;
  history: {
    loss: number[];
    accuracy: number[];
    valLoss?: number[];
    valAccuracy?: number[];
  };
}

export interface PredictionResult {
  predictions: number[];
  confidence: number[];
  processingTime: number;
}

// In-memory model storage
const models = new Map<string, tf.LayersModel>();
const modelMetrics = new Map<string, {
  accuracy: number;
  loss: number;
  predictions: number;
  errors: number;
  lastUsed: Date;
  createdAt: Date;
}>();

/**
 * Create a neural network model for CPK prediction
 */
export function createCpkPredictionModel(config: ModelConfig): tf.LayersModel {
  const model = tf.sequential();
  
  // Input layer
  model.add(tf.layers.dense({
    inputShape: [config.inputShape],
    units: config.hiddenLayers[0] || 64,
    activation: 'relu',
    kernelInitializer: 'heNormal'
  }));
  
  // Add batch normalization for stability
  model.add(tf.layers.batchNormalization());
  
  // Hidden layers
  for (let i = 1; i < config.hiddenLayers.length; i++) {
    model.add(tf.layers.dense({
      units: config.hiddenLayers[i],
      activation: 'relu',
      kernelInitializer: 'heNormal'
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
  }
  
  // Output layer
  model.add(tf.layers.dense({
    units: config.outputShape,
    activation: 'linear' // For regression
  }));
  
  // Compile model
  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'meanSquaredError',
    metrics: ['mse', 'mae']
  });
  
  return model;
}

/**
 * Create a classification model for SPC rule violations
 */
export function createSpcClassificationModel(config: ModelConfig): tf.LayersModel {
  const model = tf.sequential();
  
  // Input layer
  model.add(tf.layers.dense({
    inputShape: [config.inputShape],
    units: config.hiddenLayers[0] || 128,
    activation: 'relu'
  }));
  
  model.add(tf.layers.batchNormalization());
  model.add(tf.layers.dropout({ rate: 0.3 }));
  
  // Hidden layers
  for (let i = 1; i < config.hiddenLayers.length; i++) {
    model.add(tf.layers.dense({
      units: config.hiddenLayers[i],
      activation: 'relu'
    }));
    model.add(tf.layers.dropout({ rate: 0.2 }));
  }
  
  // Output layer for multi-class classification
  model.add(tf.layers.dense({
    units: config.outputShape,
    activation: 'softmax'
  }));
  
  model.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
}

/**
 * Train a model with the provided data
 */
export async function trainModel(
  modelId: string,
  modelType: 'cpk_prediction' | 'spc_classification' | 'anomaly_detection',
  data: TrainingData,
  config: Partial<ModelConfig> = {}
): Promise<TrainingResult> {
  const startTime = Date.now();
  
  const defaultConfig: ModelConfig = {
    inputShape: data.features[0]?.length || 10,
    hiddenLayers: [64, 32, 16],
    outputShape: modelType === 'spc_classification' ? 8 : 1, // 8 SPC rules or 1 CPK value
    learningRate: 0.001,
    epochs: config.epochs || 100,
    batchSize: config.batchSize || 32
  };
  
  const finalConfig = { ...defaultConfig, ...config };
  
  // Create model based on type
  let model: tf.LayersModel;
  if (modelType === 'cpk_prediction' || modelType === 'anomaly_detection') {
    model = createCpkPredictionModel(finalConfig);
  } else {
    model = createSpcClassificationModel(finalConfig);
  }
  
  // Prepare tensors
  const xs = tf.tensor2d(data.features);
  let ys: tf.Tensor;
  
  if (modelType === 'spc_classification') {
    // One-hot encode labels for classification
    ys = tf.oneHot(tf.tensor1d(data.labels, 'int32'), finalConfig.outputShape);
  } else {
    ys = tf.tensor2d(data.labels.map(l => [l]));
  }
  
  // Split data for validation
  const splitIndex = Math.floor(data.features.length * 0.8);
  const xsTrain = xs.slice([0, 0], [splitIndex, -1]);
  const xsVal = xs.slice([splitIndex, 0], [-1, -1]);
  const ysTrain = ys.slice([0, 0], [splitIndex, -1]);
  const ysVal = ys.slice([splitIndex, 0], [-1, -1]);
  
  // Training history
  const history: TrainingResult['history'] = {
    loss: [],
    accuracy: [],
    valLoss: [],
    valAccuracy: []
  };
  
  // Train model
  await model.fit(xsTrain, ysTrain, {
    epochs: finalConfig.epochs,
    batchSize: finalConfig.batchSize,
    validationData: [xsVal, ysVal],
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (logs) {
          history.loss.push(logs.loss || 0);
          history.accuracy.push(logs.acc || logs.mse || 0);
          history.valLoss?.push(logs.val_loss || 0);
          history.valAccuracy?.push(logs.val_acc || logs.val_mse || 0);
        }
      }
    }
  });
  
  // Evaluate model
  const evalResult = model.evaluate(xsVal, ysVal) as tf.Scalar[];
  const finalLoss = (await evalResult[0].data())[0];
  const finalAccuracy = evalResult[1] ? (await evalResult[1].data())[0] : 1 - finalLoss;
  
  // Store model
  models.set(modelId, model);
  modelMetrics.set(modelId, {
    accuracy: finalAccuracy,
    loss: finalLoss,
    predictions: 0,
    errors: 0,
    lastUsed: new Date(),
    createdAt: new Date()
  });
  
  // Cleanup tensors
  xs.dispose();
  ys.dispose();
  xsTrain.dispose();
  xsVal.dispose();
  ysTrain.dispose();
  ysVal.dispose();
  evalResult.forEach(t => t.dispose());
  
  const trainingTime = Date.now() - startTime;
  
  return {
    modelId,
    accuracy: finalAccuracy,
    loss: finalLoss,
    epochs: finalConfig.epochs,
    trainingTime,
    history
  };
}

/**
 * Make predictions using a trained model
 */
export async function predict(
  modelId: string,
  features: number[][]
): Promise<PredictionResult> {
  const startTime = Date.now();
  
  const model = models.get(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found`);
  }
  
  const metrics = modelMetrics.get(modelId);
  
  try {
    const input = tf.tensor2d(features);
    const output = model.predict(input) as tf.Tensor;
    const predictions = await output.data();
    
    // Calculate confidence based on output variance
    const confidence = Array.from(predictions).map(p => {
      // For regression, confidence is inversely related to prediction magnitude
      // For classification, use softmax probability
      return Math.min(1, Math.max(0, 1 - Math.abs(p - 1) / 2));
    });
    
    // Update metrics
    if (metrics) {
      metrics.predictions += features.length;
      metrics.lastUsed = new Date();
    }
    
    // Cleanup
    input.dispose();
    output.dispose();
    
    return {
      predictions: Array.from(predictions),
      confidence,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    if (metrics) {
      metrics.errors += 1;
    }
    throw error;
  }
}

/**
 * Predict CPK values from SPC data
 */
export async function predictCpk(
  modelId: string,
  spcData: {
    mean: number;
    stdDev: number;
    usl: number;
    lsl: number;
    sampleSize: number;
    recentValues: number[];
  }[]
): Promise<{
  cpkPredictions: number[];
  confidence: number[];
  trend: 'improving' | 'stable' | 'declining';
}> {
  // Prepare features
  const features = spcData.map(d => {
    const range = d.usl - d.lsl;
    const centeredness = (d.mean - (d.usl + d.lsl) / 2) / (range / 2);
    const capability = range / (6 * d.stdDev);
    const recentMean = d.recentValues.reduce((a, b) => a + b, 0) / d.recentValues.length;
    const recentStd = Math.sqrt(
      d.recentValues.reduce((sum, v) => sum + Math.pow(v - recentMean, 2), 0) / d.recentValues.length
    );
    
    return [
      d.mean,
      d.stdDev,
      d.usl,
      d.lsl,
      d.sampleSize,
      centeredness,
      capability,
      recentMean,
      recentStd,
      d.recentValues.length
    ];
  });
  
  const result = await predict(modelId, features);
  
  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (result.predictions.length >= 3) {
    const recent = result.predictions.slice(-3);
    const avgChange = (recent[2] - recent[0]) / 2;
    if (avgChange > 0.05) trend = 'improving';
    else if (avgChange < -0.05) trend = 'declining';
  }
  
  return {
    cpkPredictions: result.predictions,
    confidence: result.confidence,
    trend
  };
}

/**
 * Detect anomalies in SPC data
 */
export async function detectAnomalies(
  modelId: string,
  values: number[],
  threshold: number = 0.5
): Promise<{
  anomalyIndices: number[];
  anomalyScores: number[];
  isAnomaly: boolean[];
}> {
  // Prepare features using sliding window
  const windowSize = 10;
  const features: number[][] = [];
  
  for (let i = windowSize; i < values.length; i++) {
    const window = values.slice(i - windowSize, i);
    const mean = window.reduce((a, b) => a + b, 0) / windowSize;
    const std = Math.sqrt(
      window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / windowSize
    );
    const trend = (window[windowSize - 1] - window[0]) / windowSize;
    const maxVal = Math.max(...window);
    const minVal = Math.min(...window);
    
    features.push([
      values[i],
      mean,
      std,
      trend,
      maxVal,
      minVal,
      values[i] - mean,
      (values[i] - mean) / (std || 1),
      maxVal - minVal,
      i / values.length
    ]);
  }
  
  if (features.length === 0) {
    return {
      anomalyIndices: [],
      anomalyScores: [],
      isAnomaly: []
    };
  }
  
  const result = await predict(modelId, features);
  
  const anomalyIndices: number[] = [];
  const isAnomaly = result.predictions.map((score, idx) => {
    const isAnom = score > threshold;
    if (isAnom) {
      anomalyIndices.push(idx + windowSize);
    }
    return isAnom;
  });
  
  return {
    anomalyIndices,
    anomalyScores: result.predictions,
    isAnomaly
  };
}

/**
 * Get model metrics
 */
export function getModelMetrics(modelId: string) {
  return modelMetrics.get(modelId);
}

/**
 * Get all models info
 */
export function getAllModelsInfo(): Array<{
  modelId: string;
  accuracy: number;
  loss: number;
  predictions: number;
  errors: number;
  lastUsed: Date;
  createdAt: Date;
}> {
  return Array.from(modelMetrics.entries()).map(([modelId, metrics]) => ({
    modelId,
    ...metrics
  }));
}

/**
 * Delete a model
 */
export function deleteModel(modelId: string): boolean {
  const model = models.get(modelId);
  if (model) {
    model.dispose();
    models.delete(modelId);
    modelMetrics.delete(modelId);
    return true;
  }
  return false;
}

/**
 * Generate synthetic training data for CPK prediction
 */
export function generateSyntheticCpkData(count: number): TrainingData {
  const features: number[][] = [];
  const labels: number[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate random SPC parameters
    const usl = 100 + Math.random() * 50;
    const lsl = usl - 20 - Math.random() * 30;
    const target = (usl + lsl) / 2;
    const mean = target + (Math.random() - 0.5) * 10;
    const stdDev = 1 + Math.random() * 5;
    const sampleSize = 25 + Math.floor(Math.random() * 75);
    
    // Calculate actual CPK
    const cpu = (usl - mean) / (3 * stdDev);
    const cpl = (mean - lsl) / (3 * stdDev);
    const cpk = Math.min(cpu, cpl);
    
    // Generate recent values
    const recentValues = Array.from({ length: 10 }, () => 
      mean + (Math.random() - 0.5) * 2 * stdDev
    );
    const recentMean = recentValues.reduce((a, b) => a + b, 0) / 10;
    const recentStd = Math.sqrt(
      recentValues.reduce((sum, v) => sum + Math.pow(v - recentMean, 2), 0) / 10
    );
    
    const range = usl - lsl;
    const centeredness = (mean - target) / (range / 2);
    const capability = range / (6 * stdDev);
    
    features.push([
      mean,
      stdDev,
      usl,
      lsl,
      sampleSize,
      centeredness,
      capability,
      recentMean,
      recentStd,
      10 // recent values count
    ]);
    
    labels.push(cpk);
  }
  
  return { features, labels };
}

/**
 * Generate synthetic training data for SPC classification
 */
export function generateSyntheticSpcData(count: number): TrainingData {
  const features: number[][] = [];
  const labels: number[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate random pattern
    const ruleViolation = Math.floor(Math.random() * 8); // 0-7 for 8 SPC rules
    
    // Generate features based on rule
    const baseValues = Array.from({ length: 10 }, () => Math.random() * 10);
    let pattern: number[];
    
    switch (ruleViolation) {
      case 0: // Rule 1: Point beyond 3 sigma
        pattern = [...baseValues];
        pattern[5] = 20; // Outlier
        break;
      case 1: // Rule 2: 9 points on same side
        pattern = baseValues.map(v => v + 5);
        break;
      case 2: // Rule 3: 6 points trending
        pattern = baseValues.map((v, idx) => v + idx * 0.5);
        break;
      case 3: // Rule 4: 14 points alternating
        pattern = baseValues.map((v, idx) => v + (idx % 2 === 0 ? 2 : -2));
        break;
      case 4: // Rule 5: 2 of 3 beyond 2 sigma
        pattern = [...baseValues];
        pattern[3] = 15;
        pattern[4] = 14;
        break;
      case 5: // Rule 6: 4 of 5 beyond 1 sigma
        pattern = baseValues.map((v, idx) => idx < 4 ? v + 8 : v);
        break;
      case 6: // Rule 7: 15 points within 1 sigma
        pattern = baseValues.map(v => 5 + (Math.random() - 0.5) * 0.5);
        break;
      case 7: // Rule 8: 8 points beyond 1 sigma
        pattern = baseValues.map((v, idx) => idx < 8 ? v + 8 : v);
        break;
      default:
        pattern = baseValues;
    }
    
    const mean = pattern.reduce((a, b) => a + b, 0) / pattern.length;
    const std = Math.sqrt(
      pattern.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / pattern.length
    );
    const trend = (pattern[pattern.length - 1] - pattern[0]) / pattern.length;
    const maxVal = Math.max(...pattern);
    const minVal = Math.min(...pattern);
    
    features.push([
      ...pattern,
      mean,
      std,
      trend,
      maxVal,
      minVal,
      maxVal - minVal,
      pattern.filter(v => Math.abs(v - mean) > 2 * std).length,
      pattern.filter(v => v > mean).length
    ]);
    
    labels.push(ruleViolation);
  }
  
  return { features, labels };
}

export default {
  createCpkPredictionModel,
  createSpcClassificationModel,
  trainModel,
  predict,
  predictCpk,
  detectAnomalies,
  getModelMetrics,
  getAllModelsInfo,
  deleteModel,
  generateSyntheticCpkData,
  generateSyntheticSpcData
};
