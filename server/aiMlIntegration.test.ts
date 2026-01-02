import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as unifiedMl from './services/unifiedMlService';
import * as autoRetrain from './services/autoRetrainService';

describe('AI ML Integration Tests', () => {
  describe('Unified ML Service', () => {
    const testModelId = 'test_model_' + Date.now();

    it('should recommend framework based on data characteristics', () => {
      // Small dataset - should recommend sklearn
      const smallDataRec = unifiedMl.recommendFramework(500, 10, 'regression');
      expect(smallDataRec.framework).toBe('sklearn');
      expect(smallDataRec.modelType).toBe('linear_regression');

      // Large dataset - should recommend tensorflow
      const largeDataRec = unifiedMl.recommendFramework(15000, 60, 'regression');
      expect(largeDataRec.framework).toBe('tensorflow');
      expect(largeDataRec.modelType).toBe('cpk_prediction');

      // Classification task - should recommend tensorflow
      const classificationRec = unifiedMl.recommendFramework(1000, 20, 'classification');
      expect(classificationRec.framework).toBe('tensorflow');
      expect(classificationRec.modelType).toBe('spc_classification');
    });

    it('should generate training data for CPK prediction', () => {
      const data = unifiedMl.generateTrainingData('cpk_prediction', 100);
      
      expect(data.features).toHaveLength(100);
      expect(data.labels).toHaveLength(100);
      expect(data.features[0].length).toBeGreaterThan(0);
    });

    it('should generate training data for SPC classification', () => {
      const data = unifiedMl.generateTrainingData('spc_classification', 100);
      
      expect(data.features).toHaveLength(100);
      expect(data.labels).toHaveLength(100);
    });

    it('should train sklearn model successfully', async () => {
      const trainingData = unifiedMl.generateTrainingData('cpk_prediction', 200);
      
      const result = await unifiedMl.trainModel(
        testModelId,
        {
          framework: 'sklearn',
          modelType: 'linear_regression',
          hyperparameters: {}
        },
        trainingData.features,
        trainingData.labels
      );

      expect(result.modelId).toBe(testModelId);
      expect(result.framework).toBe('sklearn');
      expect(result.metrics.r2Score).toBeDefined();
      expect(result.trainingTime).toBeGreaterThan(0);
    });

    it('should make predictions with trained model', async () => {
      // First train a model for this test
      const localModelId = 'predict_test_' + Date.now();
      const trainingData = unifiedMl.generateTrainingData('cpk_prediction', 200);
      await unifiedMl.trainModel(
        localModelId,
        {
          framework: 'sklearn',
          modelType: 'linear_regression',
          hyperparameters: {}
        },
        trainingData.features,
        trainingData.labels
      );

      const testFeatures = [
        [50, 2, 100, 0, 30, 0.1, 8, 45, 3, 10],
        [55, 3, 100, 0, 25, 0.2, 6, 50, 4, 10]
      ];

      const result = await unifiedMl.predict(localModelId, testFeatures);

      expect(result.predictions).toHaveLength(2);
      // processingTime may be 0 for very fast predictions
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
      
      // Cleanup
      unifiedMl.deleteModel(localModelId);
    });

    it('should get model info', async () => {
      // First train a model for this test
      const localModelId = 'info_test_' + Date.now();
      const trainingData = unifiedMl.generateTrainingData('cpk_prediction', 200);
      await unifiedMl.trainModel(
        localModelId,
        {
          framework: 'sklearn',
          modelType: 'linear_regression',
          hyperparameters: {}
        },
        trainingData.features,
        trainingData.labels
      );

      const info = unifiedMl.getModelInfo(localModelId);
      
      expect(info).not.toBeNull();
      expect(info?.framework).toBe('sklearn');
      
      // Cleanup
      unifiedMl.deleteModel(localModelId);
    });

    it('should get all models', () => {
      const models = unifiedMl.getAllModels();
      
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.modelId === testModelId)).toBe(true);
    });

    it('should compare models', () => {
      const comparison = unifiedMl.compareModels([testModelId]);
      
      expect(comparison).toHaveLength(1);
      expect(comparison[0].modelId).toBe(testModelId);
      expect(comparison[0].metrics).toBeDefined();
    });

    it('should delete model', () => {
      const deleted = unifiedMl.deleteModel(testModelId);
      expect(deleted).toBe(true);

      const info = unifiedMl.getModelInfo(testModelId);
      expect(info).toBeNull();
    });
  });

  describe('Auto-Retrain Service', () => {
    const testModelId = 'retrain_test_' + Date.now();

    beforeAll(async () => {
      // Create a test model first
      const trainingData = unifiedMl.generateTrainingData('cpk_prediction', 200);
      await unifiedMl.trainModel(
        testModelId,
        {
          framework: 'sklearn',
          modelType: 'cpk_prediction',
          hyperparameters: {}
        },
        trainingData.features,
        trainingData.labels
      );
    });

    afterAll(() => {
      unifiedMl.deleteModel(testModelId);
    });

    it('should initialize retrain config', () => {
      const config = autoRetrain.initRetrainConfig(testModelId, 'cpk_prediction');
      
      expect(config.modelId).toBe(testModelId);
      expect(config.accuracyThreshold).toBe(0.85);
      expect(config.errorRateThreshold).toBe(0.05);
      expect(config.minDataPoints).toBe(500);
      expect(config.maxAgeDays).toBe(7);
      expect(config.enabled).toBe(true);
    });

    it('should get retrain config', () => {
      const config = autoRetrain.getRetrainConfig(testModelId);
      
      expect(config).not.toBeNull();
      expect(config?.modelId).toBe(testModelId);
    });

    it('should update retrain config', () => {
      const updated = autoRetrain.updateRetrainConfig(testModelId, {
        accuracyThreshold: 0.90,
        enabled: false
      });

      expect(updated).not.toBeNull();
      expect(updated?.accuracyThreshold).toBe(0.90);
      expect(updated?.enabled).toBe(false);
    });

    it('should check if retrain needed', async () => {
      // Re-enable retrain
      autoRetrain.updateRetrainConfig(testModelId, { enabled: true });

      const check = await autoRetrain.checkRetrainNeeded(testModelId);
      
      expect(check).toHaveProperty('needed');
      expect(check).toHaveProperty('reasons');
      expect(Array.isArray(check.reasons)).toBe(true);
    });

    it('should get retrain stats', () => {
      const stats = autoRetrain.getRetrainStats();
      
      expect(stats).toHaveProperty('totalRetrains');
      expect(stats).toHaveProperty('successfulRetrains');
      expect(stats).toHaveProperty('failedRetrains');
      expect(stats).toHaveProperty('avgImprovement');
      expect(stats).toHaveProperty('avgTrainingTime');
    });

    it('should get retrain history', () => {
      const history = autoRetrain.getRetrainHistory(10);
      
      expect(Array.isArray(history)).toBe(true);
    });

    it('should get active retrain jobs', () => {
      const jobs = autoRetrain.getActiveJobs();
      
      expect(Array.isArray(jobs)).toBe(true);
    });
  });

  describe('TensorFlow ML Service', () => {
    // Note: TensorFlow.js tests may be slower and require more memory
    const tfModelId = 'tf_test_' + Date.now();

    it('should train tensorflow model', async () => {
      const trainingData = unifiedMl.generateTrainingData('cpk_prediction', 100);
      
      const result = await unifiedMl.trainModel(
        tfModelId,
        {
          framework: 'tensorflow',
          modelType: 'cpk_prediction',
          hyperparameters: {
            epochs: 10, // Use fewer epochs for testing
            batchSize: 16
          }
        },
        trainingData.features,
        trainingData.labels
      );

      expect(result.modelId).toBe(tfModelId);
      expect(result.framework).toBe('tensorflow');
      expect(result.metrics.accuracy).toBeDefined();
      expect(result.history).toBeDefined();
      expect(result.history?.loss.length).toBeGreaterThan(0);

      // Cleanup
      unifiedMl.deleteModel(tfModelId);
    }, 60000); // 60 second timeout for TensorFlow training
  });

  describe('Ensemble Predictions', () => {
    const modelIds: string[] = [];

    beforeAll(async () => {
      // Create multiple models for ensemble
      const trainingData = unifiedMl.generateTrainingData('cpk_prediction', 200);
      
      for (let i = 0; i < 3; i++) {
        const modelId = `ensemble_model_${i}_${Date.now()}`;
        await unifiedMl.trainModel(
          modelId,
          {
            framework: 'sklearn',
            modelType: i === 0 ? 'linear_regression' : i === 1 ? 'random_forest' : 'gradient_boosting',
            hyperparameters: {}
          },
          trainingData.features,
          trainingData.labels
        );
        modelIds.push(modelId);
      }
    });

    afterAll(() => {
      modelIds.forEach(id => unifiedMl.deleteModel(id));
    });

    it('should make ensemble predictions with average method', async () => {
      const testFeatures = [
        [50, 2, 100, 0, 30, 0.1, 8, 45, 3, 10],
        [55, 3, 100, 0, 25, 0.2, 6, 50, 4, 10]
      ];

      const result = await unifiedMl.ensemblePredict(modelIds, testFeatures, 'average');

      expect(result.predictions).toHaveLength(2);
      expect(result.confidence).toHaveLength(2);
      // processingTime may be 0 in fast test environments
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should make ensemble predictions with weighted method', async () => {
      const testFeatures = [
        [50, 2, 100, 0, 30, 0.1, 8, 45, 3, 10]
      ];

      const result = await unifiedMl.ensemblePredict(modelIds, testFeatures, 'weighted');

      expect(result.predictions).toHaveLength(1);
    });
  });
});
