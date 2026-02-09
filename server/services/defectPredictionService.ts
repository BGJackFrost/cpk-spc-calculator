/**
 * Defect Rate Prediction Service
 * Dự báo tỷ lệ lỗi sử dụng các thuật toán ML
 */

import { getDb } from '../db';
import { spcDefectRecords, spcAnalysisHistory } from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql, count } from 'drizzle-orm';

// Types
export interface DefectDataPoint {
  date: string;
  defectRate: number;
  defectCount: number;
  totalSamples: number;
}

export interface DefectForecastResult {
  date: string;
  predictedDefectRate: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface DefectPredictionResponse {
  historicalData: DefectDataPoint[];
  forecastData: DefectForecastResult[];
  metrics: {
    mape: number;
    rmse: number;
    accuracy: number;
    precision: number;
    recall: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  alerts: string[];
  rootCauses: { cause: string; probability: number }[];
}

export interface DefectPredictionConfig {
  algorithm: 'poisson' | 'logistic' | 'arima' | 'ensemble';
  forecastDays: number;
  confidenceLevel: number;
  threshold: number;
}

// Helper functions
function calculateMean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

function calculateStdDev(data: number[]): number {
  if (data.length < 2) return 0;
  const mean = calculateMean(data);
  const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / (data.length - 1));
}

// Poisson-based prediction
function poissonPrediction(data: number[], forecastDays: number): number[] {
  const lambda = calculateMean(data);
  const forecasts: number[] = [];
  for (let i = 0; i < forecastDays; i++) {
    const noise = (Math.random() - 0.5) * 0.01;
    forecasts.push(Math.max(0, lambda + noise));
  }
  return forecasts;
}

// Logistic regression-based prediction
function logisticPrediction(data: number[], forecastDays: number): number[] {
  const n = data.length;
  if (n < 2) return Array(forecastDays).fill(data[0] || 0);
  
  const xMean = (n - 1) / 2;
  const yMean = calculateMean(data);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  const forecasts: number[] = [];
  for (let i = 0; i < forecastDays; i++) {
    const linearPred = intercept + slope * (n + i);
    const logisticPred = 1 / (1 + Math.exp(-10 * (linearPred - 0.5)));
    forecasts.push(Math.max(0, Math.min(1, logisticPred)));
  }
  return forecasts;
}

// ARIMA-like prediction (simplified)
function arimaPrediction(data: number[], forecastDays: number): number[] {
  if (data.length < 3) return Array(forecastDays).fill(calculateMean(data));
  
  const diffs: number[] = [];
  for (let i = 1; i < data.length; i++) {
    diffs.push(data[i] - data[i - 1]);
  }
  
  const avgDiff = calculateMean(diffs);
  const lastValue = data[data.length - 1];
  
  const forecasts: number[] = [];
  let currentValue = lastValue;
  
  for (let i = 0; i < forecastDays; i++) {
    currentValue += avgDiff * 0.7;
    const noise = (Math.random() - 0.5) * calculateStdDev(data) * 0.1;
    forecasts.push(Math.max(0, Math.min(1, currentValue + noise)));
  }
  
  return forecasts;
}

// Ensemble prediction
function ensemblePrediction(data: number[], forecastDays: number): number[] {
  const poisson = poissonPrediction(data, forecastDays);
  const logistic = logisticPrediction(data, forecastDays);
  const arima = arimaPrediction(data, forecastDays);
  
  const forecasts: number[] = [];
  for (let i = 0; i < forecastDays; i++) {
    const avg = (poisson[i] + logistic[i] + arima[i]) / 3;
    forecasts.push(Math.max(0, Math.min(1, avg)));
  }
  return forecasts;
}

// Get risk level
function getRiskLevel(rate: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
  if (rate >= threshold * 2) return 'critical';
  if (rate >= threshold * 1.5) return 'high';
  if (rate >= threshold) return 'medium';
  return 'low';
}

// Calculate metrics
function calculateMetrics(actual: number[], predicted: number[]): { mape: number; rmse: number; accuracy: number; precision: number; recall: number } {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return { mape: 0, rmse: 0, accuracy: 0, precision: 0, recall: 0 };
  
  let sumAbsPercentError = 0;
  let sumSquaredError = 0;
  let sumAbsError = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  
  const threshold = 0.05;
  
  for (let i = 0; i < n; i++) {
    const error = actual[i] - predicted[i];
    sumAbsError += Math.abs(error);
    sumSquaredError += error * error;
    if (actual[i] !== 0) {
      sumAbsPercentError += Math.abs(error / actual[i]);
    }
    
    const actualHigh = actual[i] >= threshold;
    const predictedHigh = predicted[i] >= threshold;
    
    if (actualHigh && predictedHigh) truePositives++;
    if (!actualHigh && predictedHigh) falsePositives++;
    if (actualHigh && !predictedHigh) falseNegatives++;
  }
  
  const mape = (sumAbsPercentError / n) * 100;
  const rmse = Math.sqrt(sumSquaredError / n);
  const accuracy = 1 - (sumAbsError / n);
  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  
  return { mape, rmse, accuracy: Math.max(0, accuracy), precision, recall };
}

// Determine trend
function determineTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 3) return 'stable';
  
  const n = data.length;
  const firstHalf = calculateMean(data.slice(0, Math.floor(n / 2)));
  const secondHalf = calculateMean(data.slice(Math.floor(n / 2)));
  
  const change = firstHalf !== 0 ? (secondHalf - firstHalf) / firstHalf : 0;
  
  if (change > 0.1) return 'increasing';
  if (change < -0.1) return 'decreasing';
  return 'stable';
}

// Generate alerts
function generateAlerts(forecastData: DefectForecastResult[], threshold: number): string[] {
  const alerts: string[] = [];
  
  for (const forecast of forecastData) {
    if (forecast.riskLevel === 'critical') {
      alerts.push(`🚨 CRITICAL: Dự báo tỷ lệ lỗi ngày ${forecast.date} là ${(forecast.predictedDefectRate * 100).toFixed(2)}%`);
    } else if (forecast.riskLevel === 'high') {
      alerts.push(`⚠️ HIGH: Dự báo tỷ lệ lỗi ngày ${forecast.date} là ${(forecast.predictedDefectRate * 100).toFixed(2)}%`);
    }
  }
  
  if (forecastData.length >= 3) {
    const rates = forecastData.map(f => f.predictedDefectRate);
    if (rates[rates.length - 1] > rates[0] * 1.2) {
      alerts.push('📈 Xu hướng tỷ lệ lỗi tăng trong các ngày tới');
    }
  }
  
  return alerts;
}

// Identify root causes
function identifyRootCauses(defectData: DefectDataPoint[]): { cause: string; probability: number }[] {
  const causes = [
    { cause: 'Nguyên vật liệu không đạt chuẩn', probability: 0.25 },
    { cause: 'Thiết bị cần bảo trì', probability: 0.20 },
    { cause: 'Thay đổi quy trình sản xuất', probability: 0.18 },
    { cause: 'Yếu tố môi trường', probability: 0.15 },
    { cause: 'Kỹ năng vận hành', probability: 0.12 },
    { cause: 'Công cụ đo lường cần hiệu chuẩn', probability: 0.10 }
  ];
  
  const trend = determineTrend(defectData.map(d => d.defectRate));
  if (trend === 'increasing') {
    causes[1].probability += 0.1;
    causes[2].probability += 0.05;
  }
  
  const total = causes.reduce((sum, c) => sum + c.probability, 0);
  return causes.map(c => ({ ...c, probability: c.probability / total })).sort((a, b) => b.probability - a.probability);
}

// Main prediction function
export async function predictDefectRate(
  productId: number | null,
  workstationId: number | null,
  config: DefectPredictionConfig
): Promise<DefectPredictionResponse> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  
  const db = await getDb();
  if (!db) {
    return {
      historicalData: [],
      forecastData: [],
      metrics: { mape: 0, rmse: 0, accuracy: 0, precision: 0, recall: 0 },
      trend: 'stable' as const,
      alerts: ['Database không khả dụng'],
      rootCauses: []
    };
  }
  
  // Query real defect data from spc_defect_records
  const historicalData: DefectDataPoint[] = [];
  try {
    const defectResults = await db.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as defect_count FROM spc_defect_records WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date ASC`,
      [startDate.toISOString()]
    ) as any[];
    
    const sampleResults = await db.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as total FROM spc_analysis_history WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date ASC`,
      [startDate.toISOString()]
    ) as any[];
    const sampleMap = new Map((sampleResults || []).map((r: any) => [String(r.date), Number(r.total)]));
    
    for (const r of (defectResults || [])) {
      const dateStr = String(r.date);
      const totalSamples = sampleMap.get(dateStr) || 100;
      const defectCount = Number(r.defect_count);
      historicalData.push({
        date: dateStr,
        defectRate: totalSamples > 0 ? defectCount / totalSamples : 0,
        defectCount,
        totalSamples,
      });
    }
  } catch (err) {
    console.error('[DefectPrediction] Error querying defect data:', err);
  }
  
  if (historicalData.length === 0) {
    return {
      historicalData: [],
      forecastData: [],
      metrics: { mape: 0, rmse: 0, accuracy: 0, precision: 0, recall: 0 },
      trend: 'stable' as const,
      alerts: ['Không có dữ liệu lỗi trong khoảng thời gian đã chọn'],
      rootCauses: []
    };
  }
  
  const defectRates = historicalData.map(d => d.defectRate);
  
  let predictedRates: number[] = [];
  switch (config.algorithm) {
    case 'poisson':
      predictedRates = poissonPrediction(defectRates, config.forecastDays);
      break;
    case 'logistic':
      predictedRates = logisticPrediction(defectRates, config.forecastDays);
      break;
    case 'arima':
      predictedRates = arimaPrediction(defectRates, config.forecastDays);
      break;
    case 'ensemble':
    default:
      predictedRates = ensemblePrediction(defectRates, config.forecastDays);
      break;
  }
  
  const stdDev = calculateStdDev(defectRates);
  const zScore = config.confidenceLevel === 95 ? 1.96 : config.confidenceLevel === 99 ? 2.576 : 1.645;
  
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  const forecastData: DefectForecastResult[] = [];
  
  for (let i = 0; i < predictedRates.length; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i + 1);
    
    const widthFactor = 1 + (i * 0.15);
    const margin = zScore * stdDev * widthFactor;
    
    const predictedRate = predictedRates[i];
    
    forecastData.push({
      date: forecastDate.toISOString().split('T')[0],
      predictedDefectRate: Math.round(predictedRate * 10000) / 10000,
      lowerBound: Math.max(0, Math.round((predictedRate - margin) * 10000) / 10000),
      upperBound: Math.min(1, Math.round((predictedRate + margin) * 10000) / 10000),
      confidence: config.confidenceLevel,
      riskLevel: getRiskLevel(predictedRate, config.threshold)
    });
  }
  
  const splitIndex = Math.floor(defectRates.length * 0.8);
  const trainData = defectRates.slice(0, splitIndex);
  const testData = defectRates.slice(splitIndex);
  
  const testPredictions = ensemblePrediction(trainData, testData.length);
  const metrics = calculateMetrics(testData, testPredictions);
  
  const trend = determineTrend(defectRates);
  const alerts = generateAlerts(forecastData, config.threshold);
  const rootCauses = identifyRootCauses(historicalData);
  
  return {
    historicalData,
    forecastData,
    metrics,
    trend,
    alerts,
    rootCauses
  };
}

// Get defect statistics by category
export async function getDefectStatsByCategory(
  productId: number | null,
  workstationId: number | null,
  days: number = 30
): Promise<{ category: string; count: number; percentage: number }[]> {
  const db = await getDb();
  if (!db) return [];
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const results = await db.execute(
      `SELECT c.name as category, COUNT(r.id) as cnt FROM spc_defect_records r LEFT JOIN spc_defect_categories c ON r.category_id = c.id WHERE r.created_at >= ? GROUP BY c.name ORDER BY cnt DESC`,
      [startDate.toISOString()]
    ) as any[];
    
    const total = (results || []).reduce((sum: number, r: any) => sum + Number(r.cnt), 0);
    return (results || []).map((r: any) => ({
      category: r.category || 'Khác',
      count: Number(r.cnt),
      percentage: total > 0 ? Math.round((Number(r.cnt) / total) * 100) : 0,
    }));
  } catch (err) {
    console.error('[DefectPrediction] Error querying defect stats:', err);
    return [];
  }
}

// Compare prediction accuracy across algorithms
export async function compareAlgorithms(
  productId: number | null,
  workstationId: number | null
): Promise<{ algorithm: string; mape: number; rmse: number; accuracy: number }[]> {
  const algorithms: DefectPredictionConfig['algorithm'][] = ['poisson', 'logistic', 'arima', 'ensemble'];
  const results: { algorithm: string; mape: number; rmse: number; accuracy: number }[] = [];
  
  for (const algorithm of algorithms) {
    const config: DefectPredictionConfig = {
      algorithm,
      forecastDays: 7,
      confidenceLevel: 95,
      threshold: 0.05
    };
    
    const prediction = await predictDefectRate(productId, workstationId, config);
    results.push({
      algorithm,
      mape: prediction.metrics.mape,
      rmse: prediction.metrics.rmse,
      accuracy: prediction.metrics.accuracy
    });
  }
  
  return results.sort((a, b) => a.mape - b.mape);
}
