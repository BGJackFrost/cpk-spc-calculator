/**
 * OEE Forecasting Service
 * Dự báo OEE sử dụng các thuật toán: Simple Moving Average, Exponential Smoothing, Linear Regression
 */

import { getDb } from '../db';
import { oeeRecords, productionLines } from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

// Types
export interface OEEDataPoint {
  date: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

export interface OEEForecastResult {
  date: string;
  predictedOEE: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

export interface OEEForecastResponse {
  historicalData: OEEDataPoint[];
  forecastData: OEEForecastResult[];
  metrics: {
    mape: number;
    rmse: number;
    mae: number;
    r2: number;
  };
  trend: 'increasing' | 'decreasing' | 'stable';
  alerts: string[];
}

export interface OEEForecastConfig {
  algorithm: 'sma' | 'ema' | 'linear' | 'holt_winters';
  forecastDays: number;
  confidenceLevel: number;
  seasonalPeriod: number;
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

// Simple Moving Average
function simpleMovingAverage(data: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    const windowData = data.slice(i - window + 1, i + 1);
    result.push(calculateMean(windowData));
  }
  return result;
}

// Exponential Moving Average
function exponentialMovingAverage(data: number[], alpha: number = 0.3): number[] {
  if (data.length === 0) return [];
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// Linear Regression
function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0 };
  
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
  
  return { slope, intercept };
}

// Holt-Winters (simplified double exponential smoothing)
function holtWinters(data: number[], alpha: number = 0.3, beta: number = 0.1): { level: number; trend: number } {
  if (data.length < 2) return { level: data[0] || 0, trend: 0 };
  
  let level = data[0];
  let trend = data[1] - data[0];
  
  for (let i = 1; i < data.length; i++) {
    const prevLevel = level;
    level = alpha * data[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  
  return { level, trend };
}

// Generate forecasts based on algorithm
function generateForecasts(
  data: number[],
  config: OEEForecastConfig
): number[] {
  const forecasts: number[] = [];
  
  switch (config.algorithm) {
    case 'sma': {
      const window = Math.min(7, data.length);
      const lastValues = data.slice(-window);
      const avgValue = calculateMean(lastValues);
      for (let i = 0; i < config.forecastDays; i++) {
        forecasts.push(avgValue);
      }
      break;
    }
    case 'ema': {
      const ema = exponentialMovingAverage(data);
      const lastEma = ema[ema.length - 1] || data[data.length - 1] || 0;
      for (let i = 0; i < config.forecastDays; i++) {
        forecasts.push(lastEma);
      }
      break;
    }
    case 'linear': {
      const { slope, intercept } = linearRegression(data);
      for (let i = 0; i < config.forecastDays; i++) {
        const forecast = intercept + slope * (data.length + i);
        forecasts.push(Math.max(0, Math.min(100, forecast)));
      }
      break;
    }
    case 'holt_winters':
    default: {
      const { level, trend } = holtWinters(data);
      for (let i = 0; i < config.forecastDays; i++) {
        const forecast = level + trend * (i + 1);
        forecasts.push(Math.max(0, Math.min(100, forecast)));
      }
      break;
    }
  }
  
  return forecasts;
}

// Calculate forecast metrics
function calculateMetrics(actual: number[], predicted: number[]): { mape: number; rmse: number; mae: number; r2: number } {
  const n = Math.min(actual.length, predicted.length);
  if (n === 0) return { mape: 0, rmse: 0, mae: 0, r2: 0 };
  
  let sumAbsPercentError = 0;
  let sumSquaredError = 0;
  let sumAbsError = 0;
  
  for (let i = 0; i < n; i++) {
    const error = actual[i] - predicted[i];
    sumAbsError += Math.abs(error);
    sumSquaredError += error * error;
    if (actual[i] !== 0) {
      sumAbsPercentError += Math.abs(error / actual[i]);
    }
  }
  
  const mape = (sumAbsPercentError / n) * 100;
  const rmse = Math.sqrt(sumSquaredError / n);
  const mae = sumAbsError / n;
  
  // R-squared
  const actualMean = calculateMean(actual);
  const ssTot = actual.reduce((sum, val) => sum + Math.pow(val - actualMean, 2), 0);
  const ssRes = sumSquaredError;
  const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  
  return { mape, rmse, mae, r2 };
}

// Determine trend
function determineTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 3) return 'stable';
  
  const { slope } = linearRegression(data);
  const mean = calculateMean(data);
  const relativeSlope = mean !== 0 ? slope / mean : 0;
  
  if (relativeSlope > 0.01) return 'increasing';
  if (relativeSlope < -0.01) return 'decreasing';
  return 'stable';
}

// Generate alerts
function generateAlerts(forecastData: OEEForecastResult[], threshold: number = 85): string[] {
  const alerts: string[] = [];
  
  for (const forecast of forecastData) {
    if (forecast.predictedOEE < threshold - 10) {
      alerts.push(`⚠️ Cảnh báo: OEE dự báo ngày ${forecast.date} là ${forecast.predictedOEE.toFixed(1)}% - dưới ngưỡng cảnh báo`);
    }
  }
  
  // Check for declining trend
  if (forecastData.length >= 3) {
    const oeeValues = forecastData.map(f => f.predictedOEE);
    if (oeeValues[oeeValues.length - 1] < oeeValues[0] - 5) {
      alerts.push('📉 Xu hướng OEE giảm trong các ngày tới - Cần kiểm tra và có biện pháp cải thiện');
    }
  }
  
  return alerts;
}

// Main forecast function
export async function forecastOEE(
  productionLineId: number | null,
  machineId: number | null,
  config: OEEForecastConfig
): Promise<OEEForecastResponse> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);
  
  const db = await getDb();
  if (!db) {
    return {
      historicalData: [],
      forecastData: [],
      metrics: { mape: 0, rmse: 0, mae: 0, r2: 0 },
      trend: 'stable' as const,
      alerts: ['Database không khả dụng']
    };
  }
  
  // Query historical OEE data
  const records = await db
    .select({
      date: oeeRecords.recordDate,
      oee: oeeRecords.oee,
      availability: oeeRecords.availability,
      performance: oeeRecords.performance,
      quality: oeeRecords.quality,
    })
    .from(oeeRecords)
    .where(
      and(
        gte(oeeRecords.recordDate, startDate),
        lte(oeeRecords.recordDate, endDate),
        productionLineId ? eq(oeeRecords.productionLineId, productionLineId) : undefined,
        machineId ? eq(oeeRecords.machineId, machineId) : undefined
      )
    )
    .orderBy(oeeRecords.recordDate);
  
  // Convert to data points
  const historicalData: OEEDataPoint[] = records.map(r => ({
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    oee: Number(r.oee) || 0,
    availability: Number(r.availability) || 0,
    performance: Number(r.performance) || 0,
    quality: Number(r.quality) || 0,
  }));
  
  // Return early if no real data available
  if (historicalData.length === 0) {
    return {
      historicalData: [],
      forecastData: [],
      metrics: { mape: 0, rmse: 0, mae: 0, r2: 0 },
      trend: 'stable' as const,
      alerts: ['Không có dữ liệu OEE trong khoảng thời gian đã chọn'],
    };
  }
  
  const oeeValues = historicalData.map(d => d.oee);
  
  // Generate forecasts
  const forecastedValues = generateForecasts(oeeValues, config);
  
  // Calculate confidence intervals
  const stdDev = calculateStdDev(oeeValues);
  const zScore = config.confidenceLevel === 95 ? 1.96 : config.confidenceLevel === 99 ? 2.576 : 1.645;
  
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  const forecastData: OEEForecastResult[] = [];
  
  for (let i = 0; i < forecastedValues.length; i++) {
    const forecastDate = new Date(lastDate);
    forecastDate.setDate(forecastDate.getDate() + i + 1);
    
    const widthFactor = 1 + (i * 0.1);
    const margin = zScore * stdDev * widthFactor;
    
    forecastData.push({
      date: forecastDate.toISOString().split('T')[0],
      predictedOEE: Math.round(forecastedValues[i] * 100) / 100,
      lowerBound: Math.max(0, Math.round((forecastedValues[i] - margin) * 100) / 100),
      upperBound: Math.min(100, Math.round((forecastedValues[i] + margin) * 100) / 100),
      confidence: config.confidenceLevel,
    });
  }
  
  // Calculate metrics using cross-validation
  const splitIndex = Math.floor(oeeValues.length * 0.8);
  const trainData = oeeValues.slice(0, splitIndex);
  const testData = oeeValues.slice(splitIndex);
  
  const testForecasts = generateForecasts(trainData, { ...config, forecastDays: testData.length });
  const metrics = calculateMetrics(testData, testForecasts);
  
  const trend = determineTrend(oeeValues);
  const alerts = generateAlerts(forecastData);
  
  return {
    historicalData,
    forecastData,
    metrics,
    trend,
    alerts,
  };
}

// Get historical OEE data
export async function getOEEHistoricalData(
  productionLineId: number | null,
  machineId: number | null,
  days: number = 30
): Promise<OEEDataPoint[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const db = await getDb();
  if (!db) return [];
  
  const records = await db
    .select({
      date: oeeRecords.recordDate,
      oee: oeeRecords.oee,
      availability: oeeRecords.availability,
      performance: oeeRecords.performance,
      quality: oeeRecords.quality,
    })
    .from(oeeRecords)
    .where(
      and(
        gte(oeeRecords.recordDate, startDate),
        lte(oeeRecords.recordDate, endDate),
        productionLineId ? eq(oeeRecords.productionLineId, productionLineId) : undefined,
        machineId ? eq(oeeRecords.machineId, machineId) : undefined
      )
    )
    .orderBy(oeeRecords.recordDate);
  
  return records.map(r => ({
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    oee: Number(r.oee) || 0,
    availability: Number(r.availability) || 0,
    performance: Number(r.performance) || 0,
    quality: Number(r.quality) || 0,
  }));
}

// Compare OEE across multiple production lines
export async function compareProductionLines(
  productionLineIds: number[],
  config: OEEForecastConfig
): Promise<{ productionLineId: number; name: string; forecast: OEEForecastResponse }[]> {
  const results: { productionLineId: number; name: string; forecast: OEEForecastResponse }[] = [];
  
  for (const lineId of productionLineIds) {
    const db = await getDb();
    if (!db) continue;
    const line = await db.select().from(productionLines).where(eq(productionLines.id, lineId)).limit(1);
    const forecast = await forecastOEE(lineId, null, config);
    
    results.push({
      productionLineId: lineId,
      name: line[0]?.name || `Line ${lineId}`,
      forecast,
    });
  }
  
  return results;
}
