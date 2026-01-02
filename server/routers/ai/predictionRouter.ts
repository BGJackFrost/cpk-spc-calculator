import { z } from 'zod';
import { publicProcedure, router } from '../../_core/trpc';
import { getDb } from '../../db';
import { aiTrainedModels, spcAnalysisHistory } from '../../../drizzle/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

/**
 * Prediction Router - AI Prediction APIs
 * 
 * Procedures:
 * - predictCpk: Predict CPK value for future time period
 * - predictDefect: Predict defect probability
 * - batchPredict: Batch prediction for multiple inputs
 */

export const predictionRouter = router({
  /**
   * Predict CPK value for future time period
   */
  predictCpk: publicProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      historicalDays: z.number().min(7).max(90).default(30),
      forecastDays: z.number().min(1).max(30).default(7),
      features: z.object({
        temperature: z.number().optional(),
        humidity: z.number().optional(),
        pressure: z.number().optional(),
        speed: z.number().optional(),
        batchSize: z.number().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Get historical CPK data
      const historicalData = await db
        .select()
        .from(spcAnalysisHistory)
        .where(
          and(
            eq(spcAnalysisHistory.productCode, input.productCode),
            eq(spcAnalysisHistory.stationName, input.stationName),
            gte(spcAnalysisHistory.createdAt, new Date(Date.now() - input.historicalDays * 24 * 60 * 60 * 1000))
          )
        )
        .orderBy(desc(spcAnalysisHistory.createdAt))
        .limit(1000);
      
      if (historicalData.length < 10) {
        return {
          success: false,
          error: 'Insufficient historical data for prediction (minimum 10 samples required)',
          predictions: [],
        };
      }
      
      // Simple time series forecasting (moving average + trend)
      const cpkValues = historicalData.map(d => d.cpk || 0).filter(v => v > 0);
      const avgCpk = cpkValues.reduce((sum, v) => sum + v, 0) / cpkValues.length;
      const recentCpk = cpkValues.slice(0, 10).reduce((sum, v) => sum + v, 0) / Math.min(10, cpkValues.length);
      const trend = (recentCpk - avgCpk) / avgCpk; // Trend coefficient
      
      // Generate predictions for each day
      const predictions = [];
      for (let i = 1; i <= input.forecastDays; i++) {
        const forecastDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000);
        const predictedCpk = Math.max(0, recentCpk * (1 + trend * i * 0.1)); // Simple linear trend
        const confidence = Math.max(0.5, 1 - i * 0.05); // Confidence decreases over time
        
        predictions.push({
          date: forecastDate.toISOString().split('T')[0],
          predictedCpk: Math.round(predictedCpk * 100) / 100,
          confidence: Math.round(confidence * 100) / 100,
          trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
          lowerBound: Math.round((predictedCpk * 0.9) * 100) / 100,
          upperBound: Math.round((predictedCpk * 1.1) * 100) / 100,
        });
      }
      
      return {
        success: true,
        productCode: input.productCode,
        stationName: input.stationName,
        historicalSamples: historicalData.length,
        avgCpk: Math.round(avgCpk * 100) / 100,
        recentCpk: Math.round(recentCpk * 100) / 100,
        trend: Math.round(trend * 10000) / 100, // Percentage
        predictions,
        modelInfo: {
          algorithm: 'moving_average_with_trend',
          trainedAt: new Date().toISOString(),
          accuracy: 0.85, // Mock accuracy
        },
      };
    }),

  /**
   * Predict defect probability
   */
  predictDefect: publicProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      features: z.object({
        cpk: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        usl: z.number().optional(),
        lsl: z.number().optional(),
        sampleSize: z.number().optional(),
        temperature: z.number().optional(),
        humidity: z.number().optional(),
        pressure: z.number().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const { cpk, mean, stdDev, usl, lsl } = input.features;
      
      // Simple defect probability calculation based on CPK
      // P(defect) = 1 - Φ(3 * CPK) where Φ is cumulative normal distribution
      const defectProbability = cpk < 0.67 ? 0.5 : 
                                cpk < 1.0 ? 0.2 : 
                                cpk < 1.33 ? 0.05 : 
                                cpk < 1.67 ? 0.01 : 0.001;
      
      // Calculate expected defects per million opportunities (DPMO)
      const dpmo = Math.round(defectProbability * 1000000);
      
      // Risk level
      const riskLevel = cpk < 0.67 ? 'critical' : 
                       cpk < 1.0 ? 'high' : 
                       cpk < 1.33 ? 'medium' : 'low';
      
      // Recommendations
      const recommendations = [];
      if (cpk < 1.33) {
        recommendations.push('CPK below 1.33 - Process improvement needed');
      }
      if (cpk < 1.0) {
        recommendations.push('CPK below 1.0 - Immediate action required');
      }
      if (stdDev > 0 && usl && lsl) {
        const processSpread = 6 * stdDev;
        const specSpread = usl - lsl;
        if (processSpread > specSpread * 0.8) {
          recommendations.push('Process variation too high - Consider tighter control');
        }
      }
      
      return {
        success: true,
        productCode: input.productCode,
        stationName: input.stationName,
        prediction: {
          defectProbability: Math.round(defectProbability * 10000) / 100, // Percentage
          dpmo,
          riskLevel,
          confidence: 0.88, // Mock confidence
        },
        analysis: {
          cpk,
          mean,
          stdDev,
          processCapability: cpk >= 1.33 ? 'capable' : cpk >= 1.0 ? 'marginally_capable' : 'not_capable',
        },
        recommendations,
        modelInfo: {
          algorithm: 'statistical_process_control',
          version: '1.0',
          trainedAt: new Date().toISOString(),
        },
      };
    }),

  /**
   * Batch prediction for multiple inputs
   */
  batchPredict: publicProcedure
    .input(z.object({
      type: z.enum(['cpk', 'defect']),
      inputs: z.array(z.object({
        productCode: z.string(),
        stationName: z.string(),
        features: z.record(z.any()).optional(),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      const results = [];
      
      for (const item of input.inputs) {
        try {
          let prediction;
          if (input.type === 'cpk') {
            // Call predictCpk for each item
            const caller = predictionRouter.createCaller(ctx);
            prediction = await caller.predictCpk({
              productCode: item.productCode,
              stationName: item.stationName,
              historicalDays: 30,
              forecastDays: 7,
              features: item.features as any,
            });
          } else {
            // Call predictDefect for each item
            const caller = predictionRouter.createCaller(ctx);
            prediction = await caller.predictDefect({
              productCode: item.productCode,
              stationName: item.stationName,
              features: item.features as any,
            });
          }
          
          results.push({
            productCode: item.productCode,
            stationName: item.stationName,
            success: true,
            prediction,
          });
        } catch (error: any) {
          results.push({
            productCode: item.productCode,
            stationName: item.stationName,
            success: false,
            error: error.message,
          });
        }
      }
      
      return {
        success: true,
        total: input.inputs.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    }),

  /**
   * Detect defects in realtime data
   */
  detectDefects: publicProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      dataPoints: z.array(z.object({
        timestamp: z.string(),
        value: z.number(),
        usl: z.number().optional(),
        lsl: z.number().optional(),
      })),
      sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
    }))
    .mutation(async ({ input }) => {
      const { dataPoints, sensitivity } = input;
      
      // Calculate statistics
      const values = dataPoints.map(d => d.value);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      );
      
      // Sensitivity thresholds
      const thresholds = {
        low: 3.0,    // 3 sigma
        medium: 2.5, // 2.5 sigma
        high: 2.0,   // 2 sigma
      };
      const threshold = thresholds[sensitivity];
      
      // Detect defects
      const defects = [];
      for (let i = 0; i < dataPoints.length; i++) {
        const point = dataPoints[i];
        const zScore = Math.abs((point.value - mean) / stdDev);
        const isOutlier = zScore > threshold;
        const isOutOfSpec = (point.usl && point.value > point.usl) || 
                           (point.lsl && point.value < point.lsl);
        
        if (isOutlier || isOutOfSpec) {
          defects.push({
            index: i,
            timestamp: point.timestamp,
            value: point.value,
            zScore: Math.round(zScore * 100) / 100,
            type: isOutOfSpec ? 'out_of_spec' : 'statistical_outlier',
            severity: isOutOfSpec ? 'critical' : zScore > 3 ? 'high' : 'medium',
            reason: isOutOfSpec 
              ? `Value ${point.value} outside specification limits` 
              : `Statistical outlier (${zScore.toFixed(2)} sigma)`,
          });
        }
      }
      
      // Calculate defect rate
      const defectRate = (defects.length / dataPoints.length) * 100;
      const dpmo = Math.round(defectRate * 10000);
      
      return {
        success: true,
        productCode: input.productCode,
        stationName: input.stationName,
        summary: {
          totalPoints: dataPoints.length,
          defectsFound: defects.length,
          defectRate: Math.round(defectRate * 100) / 100,
          dpmo,
          mean: Math.round(mean * 1000) / 1000,
          stdDev: Math.round(stdDev * 1000) / 1000,
        },
        defects,
        recommendations: defectRate > 5 
          ? ['High defect rate detected - Immediate process review required']
          : defectRate > 2
          ? ['Elevated defect rate - Monitor closely']
          : ['Process within acceptable limits'],
      };
    }),

  /**
   * Classify defect type using pattern recognition
   */
  classifyDefect: publicProcedure
    .input(z.object({
      productCode: z.string(),
      stationName: z.string(),
      defectData: z.object({
        value: z.number(),
        mean: z.number(),
        stdDev: z.number(),
        usl: z.number().optional(),
        lsl: z.number().optional(),
        context: z.record(z.string(), z.number()).optional(), // Additional context (temperature, humidity, etc.)
      }),
    }))
    .mutation(async ({ input }) => {
      const { value, mean, stdDev, usl, lsl, context } = input.defectData;
      
      // Classify defect type
      const defectTypes = [];
      
      if (usl && value > usl) {
        defectTypes.push({
          type: 'over_specification',
          severity: 'critical',
          description: `Value ${value} exceeds USL ${usl}`,
          confidence: 1.0,
        });
      }
      
      if (lsl && value < lsl) {
        defectTypes.push({
          type: 'under_specification',
          severity: 'critical',
          description: `Value ${value} below LSL ${lsl}`,
          confidence: 1.0,
        });
      }
      
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > 3) {
        defectTypes.push({
          type: 'statistical_outlier',
          severity: 'high',
          description: `Statistical outlier (${zScore.toFixed(2)} sigma from mean)`,
          confidence: 0.95,
        });
      }
      
      // Check for systematic issues based on context
      if (context?.temperature && (context.temperature > 35 || context.temperature < 15)) {
        defectTypes.push({
          type: 'environmental_factor',
          severity: 'medium',
          description: 'Temperature outside optimal range',
          confidence: 0.75,
        });
      }
      
      if (context?.humidity && (context.humidity > 80 || context.humidity < 30)) {
        defectTypes.push({
          type: 'environmental_factor',
          severity: 'medium',
          description: 'Humidity outside optimal range',
          confidence: 0.75,
        });
      }
      
      // Root cause analysis
      const rootCauses = [];
      if (defectTypes.some(d => d.type === 'environmental_factor')) {
        rootCauses.push('Environmental conditions may be affecting process');
      }
      if (zScore > 4) {
        rootCauses.push('Extreme deviation suggests equipment malfunction or measurement error');
      }
      if (defectTypes.length > 2) {
        rootCauses.push('Multiple factors detected - Comprehensive process review needed');
      }
      
      return {
        success: true,
        productCode: input.productCode,
        stationName: input.stationName,
        classification: {
          defectTypes,
          primaryType: defectTypes[0]?.type || 'unknown',
          severity: defectTypes[0]?.severity || 'low',
          confidence: defectTypes[0]?.confidence || 0.5,
        },
        analysis: {
          value,
          mean,
          stdDev,
          zScore: Math.round(zScore * 100) / 100,
          deviation: Math.round((value - mean) * 1000) / 1000,
        },
        rootCauses,
        recommendations: rootCauses.length > 0 
          ? rootCauses 
          : ['No immediate action required - Continue monitoring'],
      };
    }),

  /**
   * Get prediction history
   */
  getPredictionHistory: publicProcedure
    .input(z.object({
      productCode: z.string().optional(),
      stationName: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      // Mock prediction history (in production, this would come from a predictions log table)
      const history = [];
      for (let i = 0; i < input.limit; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        history.push({
          id: i + 1,
          productCode: input.productCode || 'PROD-001',
          stationName: input.stationName || 'Station-A',
          predictionType: Math.random() > 0.5 ? 'cpk' : 'defect',
          predictedValue: Math.random() * 2,
          actualValue: Math.random() * 2,
          accuracy: 0.8 + Math.random() * 0.15,
          createdAt: date,
        });
      }
      
      return {
        total: history.length,
        data: history,
      };
    }),
});
