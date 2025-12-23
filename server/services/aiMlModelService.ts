/**
 * AI/ML Model Service
 * 
 * Provides anomaly detection, predictive maintenance, and quality prediction
 * using machine learning models.
 */

// Model types
export type ModelType = 'anomaly_detection' | 'predictive_maintenance' | 'quality_prediction';

// Model status
export type ModelStatus = 'training' | 'ready' | 'failed' | 'deprecated';

// ML Model interface
export interface MLModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  status: ModelStatus;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  trainedAt?: Date;
  trainingDuration?: number; // seconds
  dataPointsUsed?: number;
  features: string[];
  hyperparameters: Record<string, any>;
  metadata: Record<string, any>;
}

// Prediction result
export interface PredictionResult {
  id: string;
  modelId: string;
  timestamp: Date;
  input: Record<string, number>;
  prediction: {
    value: number | string;
    confidence: number;
    probabilities?: Record<string, number>;
  };
  explanation?: string[];
}

// Anomaly detection result
export interface AnomalyResult {
  id: string;
  timestamp: Date;
  dataPoint: Record<string, number>;
  isAnomaly: boolean;
  anomalyScore: number;
  contributingFactors: { feature: string; contribution: number }[];
}

// Training job
export interface TrainingJob {
  id: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metrics?: {
    accuracy: number;
    loss: number;
    validationLoss: number;
  };
}

// Data pipeline configuration
export interface DataPipelineConfig {
  sourceTable: string;
  features: string[];
  target?: string;
  filters?: Record<string, any>;
  transformations?: {
    normalize?: boolean;
    fillMissing?: 'mean' | 'median' | 'zero';
    removeOutliers?: boolean;
  };
}

class AiMlModelService {
  private models: Map<string, MLModel> = new Map();
  private predictions: PredictionResult[] = [];
  private anomalies: AnomalyResult[] = [];
  private trainingJobs: Map<string, TrainingJob> = new Map();
  private maxPredictions: number = 5000;
  private maxAnomalies: number = 1000;

  /**
   * Create a new model
   */
  createModel(model: Omit<MLModel, 'id' | 'status' | 'trainedAt'>): MLModel {
    const newModel: MLModel = {
      ...model,
      id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'training',
    };

    this.models.set(newModel.id, newModel);
    return newModel;
  }

  /**
   * Get model by ID
   */
  getModel(id: string): MLModel | null {
    return this.models.get(id) || null;
  }

  /**
   * Get all models
   */
  getAllModels(options?: {
    type?: ModelType;
    status?: ModelStatus;
  }): MLModel[] {
    let models = Array.from(this.models.values());

    if (options?.type) {
      models = models.filter(m => m.type === options.type);
    }

    if (options?.status) {
      models = models.filter(m => m.status === options.status);
    }

    return models;
  }

  /**
   * Update model
   */
  updateModel(id: string, updates: Partial<Omit<MLModel, 'id'>>): MLModel | null {
    const model = this.models.get(id);
    if (!model) return null;

    Object.assign(model, updates);
    return model;
  }

  /**
   * Delete model
   */
  deleteModel(id: string): boolean {
    return this.models.delete(id);
  }

  /**
   * Start training job
   */
  startTraining(modelId: string, _config: DataPipelineConfig): TrainingJob {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const job: TrainingJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      modelId,
      status: 'pending',
      progress: 0,
    };

    this.trainingJobs.set(job.id, job);

    // Simulate training (in production, this would be async)
    this.simulateTraining(job, model);

    return job;
  }

  /**
   * Simulate training process
   */
  private simulateTraining(job: TrainingJob, model: MLModel): void {
    job.status = 'running';
    job.startedAt = new Date();

    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      job.progress = progress;

      if (progress >= 100) {
        clearInterval(interval);
        job.status = 'completed';
        job.completedAt = new Date();
        job.metrics = {
          accuracy: 0.85 + Math.random() * 0.1,
          loss: 0.1 + Math.random() * 0.05,
          validationLoss: 0.12 + Math.random() * 0.05,
        };

        // Update model
        model.status = 'ready';
        model.trainedAt = new Date();
        model.accuracy = job.metrics.accuracy;
        model.trainingDuration = (job.completedAt.getTime() - job.startedAt!.getTime()) / 1000;
      }
    }, 500);
  }

  /**
   * Get training job
   */
  getTrainingJob(jobId: string): TrainingJob | null {
    return this.trainingJobs.get(jobId) || null;
  }

  /**
   * Run prediction
   */
  predict(modelId: string, input: Record<string, number>): PredictionResult {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    if (model.status !== 'ready') {
      throw new Error(`Model ${modelId} is not ready for predictions`);
    }

    // Simulate prediction based on model type
    let prediction: PredictionResult['prediction'];

    switch (model.type) {
      case 'anomaly_detection':
        const anomalyScore = Math.random();
        prediction = {
          value: anomalyScore > 0.7 ? 'anomaly' : 'normal',
          confidence: 0.8 + Math.random() * 0.15,
          probabilities: {
            normal: 1 - anomalyScore,
            anomaly: anomalyScore,
          },
        };
        break;

      case 'predictive_maintenance':
        const rul = Math.floor(Math.random() * 100) + 10; // Remaining useful life in days
        prediction = {
          value: rul,
          confidence: 0.75 + Math.random() * 0.2,
        };
        break;

      case 'quality_prediction':
        const quality = Math.random() > 0.1 ? 'pass' : 'fail';
        prediction = {
          value: quality,
          confidence: 0.9 + Math.random() * 0.08,
          probabilities: {
            pass: quality === 'pass' ? 0.95 : 0.05,
            fail: quality === 'fail' ? 0.95 : 0.05,
          },
        };
        break;

      default:
        prediction = {
          value: Math.random() * 100,
          confidence: 0.8,
        };
    }

    const result: PredictionResult = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      modelId,
      timestamp: new Date(),
      input,
      prediction,
      explanation: this.generateExplanation(model, input),
    };

    this.predictions.push(result);
    if (this.predictions.length > this.maxPredictions) {
      this.predictions.shift();
    }

    return result;
  }

  /**
   * Generate prediction explanation
   */
  private generateExplanation(model: MLModel, input: Record<string, number>): string[] {
    const explanations: string[] = [];
    const features = Object.entries(input).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

    features.slice(0, 3).forEach(([feature, value]) => {
      explanations.push(`${feature} (${value.toFixed(2)}) contributed to the prediction`);
    });

    return explanations;
  }

  /**
   * Detect anomalies in data
   */
  detectAnomalies(data: Record<string, number>[]): AnomalyResult[] {
    const results: AnomalyResult[] = [];

    data.forEach((dataPoint) => {
      const anomalyScore = this.calculateAnomalyScore(dataPoint);
      const isAnomaly = anomalyScore > 0.7;

      const result: AnomalyResult = {
        id: `anom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        dataPoint,
        isAnomaly,
        anomalyScore,
        contributingFactors: this.getContributingFactors(dataPoint),
      };

      results.push(result);

      if (isAnomaly) {
        this.anomalies.push(result);
        if (this.anomalies.length > this.maxAnomalies) {
          this.anomalies.shift();
        }
      }
    });

    return results;
  }

  /**
   * Calculate anomaly score (simplified)
   */
  private calculateAnomalyScore(dataPoint: Record<string, number>): number {
    // Simple z-score based anomaly detection
    const values = Object.values(dataPoint);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
    
    const maxZScore = Math.max(...values.map(v => Math.abs((v - mean) / (std || 1))));
    return Math.min(1, maxZScore / 3); // Normalize to 0-1
  }

  /**
   * Get contributing factors for anomaly
   */
  private getContributingFactors(dataPoint: Record<string, number>): { feature: string; contribution: number }[] {
    const values = Object.values(dataPoint);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length) || 1;

    return Object.entries(dataPoint)
      .map(([feature, value]) => ({
        feature,
        contribution: Math.abs((value - mean) / std),
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5);
  }

  /**
   * Get predictions
   */
  getPredictions(options?: {
    modelId?: string;
    limit?: number;
  }): PredictionResult[] {
    let predictions = [...this.predictions];

    if (options?.modelId) {
      predictions = predictions.filter(p => p.modelId === options.modelId);
    }

    predictions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      predictions = predictions.slice(0, options.limit);
    }

    return predictions;
  }

  /**
   * Get anomalies
   */
  getAnomalies(options?: {
    limit?: number;
    minScore?: number;
  }): AnomalyResult[] {
    let anomalies = [...this.anomalies];

    if (options?.minScore) {
      anomalies = anomalies.filter(a => a.anomalyScore >= options.minScore!);
    }

    anomalies.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      anomalies = anomalies.slice(0, options.limit);
    }

    return anomalies;
  }

  /**
   * Get model statistics
   */
  getStats(): {
    totalModels: number;
    readyModels: number;
    trainingModels: number;
    totalPredictions: number;
    totalAnomalies: number;
    avgAccuracy: number;
  } {
    const models = Array.from(this.models.values());
    const readyModels = models.filter(m => m.status === 'ready');

    return {
      totalModels: models.length,
      readyModels: readyModels.length,
      trainingModels: models.filter(m => m.status === 'training').length,
      totalPredictions: this.predictions.length,
      totalAnomalies: this.anomalies.length,
      avgAccuracy: readyModels.length > 0
        ? readyModels.reduce((sum, m) => sum + (m.accuracy || 0), 0) / readyModels.length
        : 0,
    };
  }

  /**
   * Get model performance metrics
   */
  getModelPerformance(modelId: string): {
    predictions: number;
    avgConfidence: number;
    predictionsByDay: { date: string; count: number }[];
  } | null {
    const model = this.models.get(modelId);
    if (!model) return null;

    const modelPredictions = this.predictions.filter(p => p.modelId === modelId);
    const avgConfidence = modelPredictions.length > 0
      ? modelPredictions.reduce((sum, p) => sum + p.prediction.confidence, 0) / modelPredictions.length
      : 0;

    // Group by day
    const byDay: Record<string, number> = {};
    modelPredictions.forEach(p => {
      const date = p.timestamp.toISOString().split('T')[0];
      byDay[date] = (byDay[date] || 0) + 1;
    });

    return {
      predictions: modelPredictions.length,
      avgConfidence,
      predictionsByDay: Object.entries(byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}

// Singleton instance
export const aiMlModelService = new AiMlModelService();

// Export functions
export const createMLModel = aiMlModelService.createModel.bind(aiMlModelService);
export const getMLModel = aiMlModelService.getModel.bind(aiMlModelService);
export const getAllMLModels = aiMlModelService.getAllModels.bind(aiMlModelService);
export const updateMLModel = aiMlModelService.updateModel.bind(aiMlModelService);
export const deleteMLModel = aiMlModelService.deleteModel.bind(aiMlModelService);
export const startModelTraining = aiMlModelService.startTraining.bind(aiMlModelService);
export const getTrainingJob = aiMlModelService.getTrainingJob.bind(aiMlModelService);
export const runPrediction = aiMlModelService.predict.bind(aiMlModelService);
export const detectAnomalies = aiMlModelService.detectAnomalies.bind(aiMlModelService);
export const getMLPredictions = aiMlModelService.getPredictions.bind(aiMlModelService);
export const getMLAnomalies = aiMlModelService.getAnomalies.bind(aiMlModelService);
export const getMLStats = aiMlModelService.getStats.bind(aiMlModelService);
export const getModelPerformance = aiMlModelService.getModelPerformance.bind(aiMlModelService);
