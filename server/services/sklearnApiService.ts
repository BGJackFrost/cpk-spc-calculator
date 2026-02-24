/**
 * Scikit-learn API Service
 * Provides Python ML capabilities through a REST API interface
 * For production use, this would connect to a Python Flask/FastAPI server
 * For now, we implement equivalent algorithms in TypeScript
 */

// Types
export interface SklearnModelConfig {
  modelType: 'linear_regression' | 'random_forest' | 'gradient_boosting' | 'svm' | 'neural_network';
  hyperparameters: Record<string, number | string | boolean>;
}

export interface SklearnTrainingResult {
  modelId: string;
  modelType: string;
  metrics: {
    r2Score: number;
    mse: number;
    mae: number;
    rmse: number;
  };
  featureImportance?: Record<string, number>;
  trainingTime: number;
  crossValidationScores?: number[];
}

export interface SklearnPredictionResult {
  predictions: number[];
  predictionIntervals?: {
    lower: number[];
    upper: number[];
  };
  processingTime: number;
}

// In-memory model storage
interface StoredModel {
  type: string;
  weights: number[];
  bias: number;
  config: SklearnModelConfig;
  featureMeans: number[];
  featureStds: number[];
  metrics: SklearnTrainingResult['metrics'];
  createdAt: Date;
}

const models = new Map<string, StoredModel>();

/**
 * Linear Regression implementation
 */
class LinearRegression {
  private weights: number[] = [];
  private bias: number = 0;
  private featureMeans: number[] = [];
  private featureStds: number[] = [];
  
  fit(X: number[][], y: number[]): void {
    const n = X.length;
    const m = X[0].length;
    
    // Normalize features
    this.featureMeans = Array(m).fill(0);
    this.featureStds = Array(m).fill(0);
    
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < n; i++) {
        this.featureMeans[j] += X[i][j];
      }
      this.featureMeans[j] /= n;
      
      for (let i = 0; i < n; i++) {
        this.featureStds[j] += Math.pow(X[i][j] - this.featureMeans[j], 2);
      }
      this.featureStds[j] = Math.sqrt(this.featureStds[j] / n) || 1;
    }
    
    // Normalize X
    const XNorm = X.map(row => 
      row.map((val, j) => (val - this.featureMeans[j]) / this.featureStds[j])
    );
    
    // Gradient descent
    this.weights = Array(m).fill(0);
    this.bias = 0;
    const learningRate = 0.01;
    const iterations = 1000;
    
    for (let iter = 0; iter < iterations; iter++) {
      const predictions = XNorm.map(row => 
        row.reduce((sum, val, j) => sum + val * this.weights[j], 0) + this.bias
      );
      
      // Compute gradients
      const errors = predictions.map((pred, i) => pred - y[i]);
      
      for (let j = 0; j < m; j++) {
        let gradient = 0;
        for (let i = 0; i < n; i++) {
          gradient += errors[i] * XNorm[i][j];
        }
        this.weights[j] -= (learningRate / n) * gradient;
      }
      
      this.bias -= (learningRate / n) * errors.reduce((a, b) => a + b, 0);
    }
  }
  
  predict(X: number[][]): number[] {
    return X.map(row => {
      const normalized = row.map((val, j) => 
        (val - this.featureMeans[j]) / this.featureStds[j]
      );
      return normalized.reduce((sum, val, j) => sum + val * this.weights[j], 0) + this.bias;
    });
  }
  
  getParams() {
    return {
      weights: this.weights,
      bias: this.bias,
      featureMeans: this.featureMeans,
      featureStds: this.featureStds
    };
  }
  
  setParams(params: ReturnType<LinearRegression['getParams']>) {
    this.weights = params.weights;
    this.bias = params.bias;
    this.featureMeans = params.featureMeans;
    this.featureStds = params.featureStds;
  }
}

/**
 * Random Forest implementation (simplified)
 */
class RandomForest {
  private trees: Array<{
    featureIndex: number;
    threshold: number;
    leftValue: number;
    rightValue: number;
  }> = [];
  private featureMeans: number[] = [];
  private featureStds: number[] = [];
  
  fit(X: number[][], y: number[], nTrees: number = 10): void {
    const n = X.length;
    const m = X[0].length;
    
    // Compute feature statistics
    this.featureMeans = Array(m).fill(0);
    this.featureStds = Array(m).fill(0);
    
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < n; i++) {
        this.featureMeans[j] += X[i][j];
      }
      this.featureMeans[j] /= n;
      
      for (let i = 0; i < n; i++) {
        this.featureStds[j] += Math.pow(X[i][j] - this.featureMeans[j], 2);
      }
      this.featureStds[j] = Math.sqrt(this.featureStds[j] / n) || 1;
    }
    
    // Build simple decision stumps
    this.trees = [];
    for (let t = 0; t < nTrees; t++) {
      const featureIndex = Math.floor(Math.random() * m);
      const featureValues = X.map(row => row[featureIndex]);
      const threshold = featureValues[Math.floor(Math.random() * n)];
      
      const leftIndices = X.map((row, i) => row[featureIndex] <= threshold ? i : -1).filter(i => i >= 0);
      const rightIndices = X.map((row, i) => row[featureIndex] > threshold ? i : -1).filter(i => i >= 0);
      
      const leftValue = leftIndices.length > 0 
        ? leftIndices.reduce((sum, i) => sum + y[i], 0) / leftIndices.length 
        : 0;
      const rightValue = rightIndices.length > 0 
        ? rightIndices.reduce((sum, i) => sum + y[i], 0) / rightIndices.length 
        : 0;
      
      this.trees.push({ featureIndex, threshold, leftValue, rightValue });
    }
  }
  
  predict(X: number[][]): number[] {
    return X.map(row => {
      const predictions = this.trees.map(tree => 
        row[tree.featureIndex] <= tree.threshold ? tree.leftValue : tree.rightValue
      );
      return predictions.reduce((a, b) => a + b, 0) / predictions.length;
    });
  }
  
  getFeatureImportance(): Record<string, number> {
    const importance: Record<string, number> = {};
    const featureCounts: Record<number, number> = {};
    
    this.trees.forEach(tree => {
      featureCounts[tree.featureIndex] = (featureCounts[tree.featureIndex] || 0) + 1;
    });
    
    Object.entries(featureCounts).forEach(([idx, count]) => {
      importance[`feature_${idx}`] = count / this.trees.length;
    });
    
    return importance;
  }
  
  getParams() {
    return {
      trees: this.trees,
      featureMeans: this.featureMeans,
      featureStds: this.featureStds
    };
  }
}

/**
 * Gradient Boosting implementation (simplified)
 */
class GradientBoosting {
  private models: LinearRegression[] = [];
  private learningRate: number = 0.1;
  private featureMeans: number[] = [];
  private featureStds: number[] = [];
  
  fit(X: number[][], y: number[], nEstimators: number = 10, learningRate: number = 0.1): void {
    this.learningRate = learningRate;
    this.models = [];
    
    const n = X.length;
    const m = X[0].length;
    
    // Compute feature statistics
    this.featureMeans = Array(m).fill(0);
    this.featureStds = Array(m).fill(0);
    
    for (let j = 0; j < m; j++) {
      for (let i = 0; i < n; i++) {
        this.featureMeans[j] += X[i][j];
      }
      this.featureMeans[j] /= n;
      
      for (let i = 0; i < n; i++) {
        this.featureStds[j] += Math.pow(X[i][j] - this.featureMeans[j], 2);
      }
      this.featureStds[j] = Math.sqrt(this.featureStds[j] / n) || 1;
    }
    
    let residuals = [...y];
    
    for (let i = 0; i < nEstimators; i++) {
      const model = new LinearRegression();
      model.fit(X, residuals);
      this.models.push(model);
      
      const predictions = model.predict(X);
      residuals = residuals.map((r, j) => r - this.learningRate * predictions[j]);
    }
  }
  
  predict(X: number[][]): number[] {
    return X.map(row => {
      let prediction = 0;
      for (const model of this.models) {
        prediction += this.learningRate * model.predict([row])[0];
      }
      return prediction;
    });
  }
  
  getParams() {
    return {
      models: this.models.map(m => m.getParams()),
      learningRate: this.learningRate,
      featureMeans: this.featureMeans,
      featureStds: this.featureStds
    };
  }
}

/**
 * Calculate regression metrics
 */
function calculateMetrics(yTrue: number[], yPred: number[]): SklearnTrainingResult['metrics'] {
  const n = yTrue.length;
  
  // MSE
  const mse = yTrue.reduce((sum, y, i) => sum + Math.pow(y - yPred[i], 2), 0) / n;
  
  // MAE
  const mae = yTrue.reduce((sum, y, i) => sum + Math.abs(y - yPred[i]), 0) / n;
  
  // RMSE
  const rmse = Math.sqrt(mse);
  
  // R2 Score
  const yMean = yTrue.reduce((a, b) => a + b, 0) / n;
  const ssRes = yTrue.reduce((sum, y, i) => sum + Math.pow(y - yPred[i], 2), 0);
  const ssTot = yTrue.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const r2Score = 1 - (ssRes / ssTot);
  
  return { r2Score, mse, mae, rmse };
}

/**
 * Train a model
 */
export async function trainSklearnModel(
  modelId: string,
  config: SklearnModelConfig,
  X: number[][],
  y: number[]
): Promise<SklearnTrainingResult> {
  const startTime = Date.now();
  
  let model: LinearRegression | RandomForest | GradientBoosting;
  let featureImportance: Record<string, number> | undefined;
  
  switch (config.modelType) {
    case 'linear_regression':
      model = new LinearRegression();
      (model as LinearRegression).fit(X, y);
      break;
      
    case 'random_forest':
      model = new RandomForest();
      const nTrees = (config.hyperparameters.n_estimators as number) || 10;
      (model as RandomForest).fit(X, y, nTrees);
      featureImportance = (model as RandomForest).getFeatureImportance();
      break;
      
    case 'gradient_boosting':
      model = new GradientBoosting();
      const nEstimators = (config.hyperparameters.n_estimators as number) || 10;
      const lr = (config.hyperparameters.learning_rate as number) || 0.1;
      (model as GradientBoosting).fit(X, y, nEstimators, lr);
      break;
      
    default:
      model = new LinearRegression();
      (model as LinearRegression).fit(X, y);
  }
  
  // Get predictions and metrics
  const predictions = model.predict(X);
  const metrics = calculateMetrics(y, predictions);
  
  // Cross-validation (simplified k-fold)
  const k = 5;
  const foldSize = Math.floor(X.length / k);
  const cvScores: number[] = [];
  
  for (let i = 0; i < k; i++) {
    const testStart = i * foldSize;
    const testEnd = testStart + foldSize;
    
    const XTrain = [...X.slice(0, testStart), ...X.slice(testEnd)];
    const yTrain = [...y.slice(0, testStart), ...y.slice(testEnd)];
    const XTest = X.slice(testStart, testEnd);
    const yTest = y.slice(testStart, testEnd);
    
    const cvModel = new LinearRegression();
    cvModel.fit(XTrain, yTrain);
    const cvPred = cvModel.predict(XTest);
    const cvMetrics = calculateMetrics(yTest, cvPred);
    cvScores.push(cvMetrics.r2Score);
  }
  
  // Store model
  const params = model.getParams();
  models.set(modelId, {
    type: config.modelType,
    weights: params.weights || [],
    bias: (params as any).bias || 0,
    config,
    featureMeans: params.featureMeans,
    featureStds: params.featureStds,
    metrics,
    createdAt: new Date()
  });
  
  return {
    modelId,
    modelType: config.modelType,
    metrics,
    featureImportance,
    trainingTime: Date.now() - startTime,
    crossValidationScores: cvScores
  };
}

/**
 * Make predictions
 */
export async function predictSklearn(
  modelId: string,
  X: number[][]
): Promise<SklearnPredictionResult> {
  const startTime = Date.now();
  
  const storedModel = models.get(modelId);
  if (!storedModel) {
    throw new Error(`Model ${modelId} not found`);
  }
  
  // Recreate model
  const model = new LinearRegression();
  model.setParams({
    weights: storedModel.weights,
    bias: storedModel.bias,
    featureMeans: storedModel.featureMeans,
    featureStds: storedModel.featureStds
  });
  
  const predictions = model.predict(X);
  
  // Calculate prediction intervals (simplified)
  const rmse = storedModel.metrics.rmse;
  const lower = predictions.map(p => p - 1.96 * rmse);
  const upper = predictions.map(p => p + 1.96 * rmse);
  
  return {
    predictions,
    predictionIntervals: { lower, upper },
    processingTime: Date.now() - startTime
  };
}

/**
 * Get model info
 */
export function getSklearnModelInfo(modelId: string) {
  const model = models.get(modelId);
  if (!model) return null;
  
  return {
    modelId,
    type: model.type,
    metrics: model.metrics,
    createdAt: model.createdAt
  };
}

/**
 * Get all models
 */
export function getAllSklearnModels() {
  return Array.from(models.entries()).map(([id, model]) => ({
    modelId: id,
    type: model.type,
    metrics: model.metrics,
    createdAt: model.createdAt
  }));
}

/**
 * Delete model
 */
export function deleteSklearnModel(modelId: string): boolean {
  return models.delete(modelId);
}

/**
 * Generate synthetic data for CPK regression
 */
export function generateCpkRegressionData(count: number): { X: number[][]; y: number[] } {
  const X: number[][] = [];
  const y: number[] = [];
  
  for (let i = 0; i < count; i++) {
    const usl = 100 + Math.random() * 50;
    const lsl = usl - 20 - Math.random() * 30;
    const mean = (usl + lsl) / 2 + (Math.random() - 0.5) * 10;
    const stdDev = 1 + Math.random() * 5;
    const sampleSize = 25 + Math.floor(Math.random() * 75);
    
    // Calculate CPK
    const cpu = (usl - mean) / (3 * stdDev);
    const cpl = (mean - lsl) / (3 * stdDev);
    const cpk = Math.min(cpu, cpl);
    
    X.push([mean, stdDev, usl, lsl, sampleSize]);
    y.push(cpk);
  }
  
  return { X, y };
}

export default {
  trainSklearnModel,
  predictSklearn,
  getSklearnModelInfo,
  getAllSklearnModels,
  deleteSklearnModel,
  generateCpkRegressionData
};
