import { describe, it, expect } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

function createTestContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('AI Prediction Router', () => {
  describe('CPK Prediction', () => {
    it('should predict CPK for future time period', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ai.predict.predictCpk({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        historicalDays: 30,
        forecastDays: 7,
      });

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.productCode).toBe('PROD-001');
        expect(result.stationName).toBe('Station-A');
        expect(result.predictions).toBeDefined();
        expect(Array.isArray(result.predictions)).toBe(true);
        expect(result.predictions.length).toBe(7);
        
        const prediction = result.predictions[0];
        expect(prediction.date).toBeDefined();
        expect(prediction.predictedCpk).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeGreaterThanOrEqual(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction.trend).toMatch(/improving|declining|stable/);
      }
    });

    it('should handle insufficient historical data', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ai.predict.predictCpk({
        productCode: 'NONEXISTENT',
        stationName: 'NONEXISTENT',
        historicalDays: 7,
        forecastDays: 7,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient historical data');
    });
  });

  describe('Defect Prediction', () => {
    it('should predict defect probability', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ai.predict.predictDefect({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        features: {
          cpk: 1.5,
          mean: 100,
          stdDev: 2,
          usl: 110,
          lsl: 90,
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.prediction).toBeDefined();
      expect(result.prediction.defectProbability).toBeGreaterThanOrEqual(0);
      expect(result.prediction.defectProbability).toBeLessThanOrEqual(100);
      expect(result.prediction.dpmo).toBeGreaterThanOrEqual(0);
      expect(result.prediction.riskLevel).toMatch(/low|medium|high|critical/);
      expect(result.analysis.processCapability).toMatch(/capable|marginally_capable|not_capable/);
    });

    it('should identify high risk for low CPK', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ai.predict.predictDefect({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        features: {
          cpk: 0.5,
          mean: 100,
          stdDev: 5,
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.prediction.riskLevel).toMatch(/high|critical/);
      expect(result.prediction.defectProbability).toBeGreaterThan(10);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Defect Detection', () => {
    it('should detect defects in realtime data', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const dataPoints = [
        { timestamp: '2024-01-01T00:00:00Z', value: 100, usl: 110, lsl: 90 },
        { timestamp: '2024-01-01T01:00:00Z', value: 101, usl: 110, lsl: 90 },
        { timestamp: '2024-01-01T02:00:00Z', value: 115, usl: 110, lsl: 90 }, // Out of spec
        { timestamp: '2024-01-01T03:00:00Z', value: 99, usl: 110, lsl: 90 },
        { timestamp: '2024-01-01T04:00:00Z', value: 85, usl: 110, lsl: 90 }, // Out of spec
      ];

      const result = await caller.ai.predict.detectDefects({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        dataPoints,
        sensitivity: 'medium',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.summary.totalPoints).toBe(5);
      expect(result.summary.defectsFound).toBeGreaterThan(0);
      expect(result.defects).toBeDefined();
      expect(Array.isArray(result.defects)).toBe(true);
      
      // Should detect at least the 2 out-of-spec points
      expect(result.defects.length).toBeGreaterThanOrEqual(2);
      
      const outOfSpecDefects = result.defects.filter(d => d.type === 'out_of_spec');
      expect(outOfSpecDefects.length).toBeGreaterThanOrEqual(2);
    });

    it('should adjust detection based on sensitivity', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const dataPoints = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000).toISOString(),
        value: 100 + (Math.random() - 0.5) * 10,
      }));

      const resultLow = await caller.ai.predict.detectDefects({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        dataPoints,
        sensitivity: 'low',
      });

      const resultHigh = await caller.ai.predict.detectDefects({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        dataPoints,
        sensitivity: 'high',
      });

      expect(resultLow.success).toBe(true);
      expect(resultHigh.success).toBe(true);
      // High sensitivity should detect more defects than low
      expect(resultHigh.summary.defectsFound).toBeGreaterThanOrEqual(resultLow.summary.defectsFound);
    });
  });

  describe('Defect Classification', () => {
    it('should classify defect type', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ai.predict.classifyDefect({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        defectData: {
          value: 115,
          mean: 100,
          stdDev: 2,
          usl: 110,
          lsl: 90,
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.classification).toBeDefined();
      expect(result.classification.defectTypes).toBeDefined();
      expect(Array.isArray(result.classification.defectTypes)).toBe(true);
      expect(result.classification.defectTypes.length).toBeGreaterThan(0);
      
      const defectType = result.classification.defectTypes[0];
      expect(defectType.type).toBeDefined();
      expect(defectType.severity).toMatch(/low|medium|high|critical/);
      expect(defectType.confidence).toBeGreaterThanOrEqual(0);
      expect(defectType.confidence).toBeLessThanOrEqual(1);
    });

    it('should detect environmental factors', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ai.predict.classifyDefect({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        defectData: {
          value: 108,
          mean: 100,
          stdDev: 2,
          usl: 110,
          lsl: 90,
          context: {
            temperature: 40, // High temperature
            humidity: 85,    // High humidity
          },
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      
      const envFactors = result.classification.defectTypes.filter(
        d => d.type === 'environmental_factor'
      );
      expect(envFactors.length).toBeGreaterThan(0);
      expect(result.rootCauses.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Prediction', () => {
    it('should handle batch CPK predictions', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ai.predict.batchPredict({
        type: 'cpk',
        inputs: [
          { productCode: 'PROD-001', stationName: 'Station-A' },
          { productCode: 'PROD-002', stationName: 'Station-B' },
        ],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(2);
    });
  });

  describe('Prediction History', () => {
    it('should get prediction history', async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.ai.predict.getPredictionHistory({
        productCode: 'PROD-001',
        stationName: 'Station-A',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(10);
      
      if (result.data.length > 0) {
        const record = result.data[0];
        expect(record.id).toBeDefined();
        expect(record.productCode).toBeDefined();
        expect(record.predictionType).toMatch(/cpk|defect/);
        expect(record.accuracy).toBeGreaterThanOrEqual(0);
        expect(record.accuracy).toBeLessThanOrEqual(1);
      }
    });
  });
});
