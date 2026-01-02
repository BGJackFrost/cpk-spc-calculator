import { getDb } from "../db";
import { spcAnalysisHistory, spcSamplingPlans, productionLines, oeeRecords } from "../../drizzle/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { cache, TTL, withCache } from "../cache";

// Cache keys for AI Predictive
const aiPredictiveCacheKeys = {
  cpkHistory: (productCode: string, stationName: string, days: number) => 
    `ai:cpk:history:${productCode}:${stationName}:${days}`,
  oeeHistory: (lineId: string, days: number) => 
    `ai:oee:history:${lineId}:${days}`,
  cpkPrediction: (productCode: string, stationName: string, forecastDays: number) => 
    `ai:cpk:prediction:${productCode}:${stationName}:${forecastDays}`,
  oeePrediction: (lineId: string, forecastDays: number) => 
    `ai:oee:prediction:${lineId}:${forecastDays}`,
};

// Cache TTL for AI predictions (2 minutes - balance between freshness and performance)
const AI_PREDICTION_TTL = 2 * 60 * 1000;
const AI_HISTORY_TTL = 5 * 60 * 1000; // 5 minutes for historical data

// Types
interface HistoricalDataPoint {
  date: Date;
  value: number;
}

interface PredictionResult {
  date: string;
  predictedValue: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
}

interface TrendAnalysis {
  trend: "up" | "down" | "stable";
  slope: number;
  rSquared: number;
  volatility: number;
}

interface CpkPrediction {
  productCode: string;
  stationName: string;
  currentCpk: number;
  historicalData: HistoricalDataPoint[];
  predictions: PredictionResult[];
  trend: TrendAnalysis;
  recommendations: string[];
  confidence: number;
}

interface OeePrediction {
  productionLineId: string;
  productionLineName: string;
  currentOee: number;
  availability: number;
  performance: number;
  quality: number;
  historicalData: HistoricalDataPoint[];
  predictions: PredictionResult[];
  trend: TrendAnalysis;
  recommendations: string[];
  confidence: number;
}

// Linear regression helper
function linearRegression(data: HistoricalDataPoint[]): { slope: number; intercept: number; rSquared: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0]?.value || 0, rSquared: 0 };

  const xValues = data.map((_, i) => i);
  const yValues = data.map(d => d.value);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const meanY = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => sum + Math.pow(y - (slope * i + intercept), 2), 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  return { slope, intercept, rSquared };
}

// Calculate volatility (standard deviation)
function calculateVolatility(data: HistoricalDataPoint[]): number {
  if (data.length < 2) return 0;
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

// Exponential smoothing prediction
function exponentialSmoothing(data: HistoricalDataPoint[], alpha: number = 0.3, forecastDays: number = 7): PredictionResult[] {
  if (data.length === 0) return [];

  const values = data.map(d => d.value);
  let smoothed = values[0];
  
  // Apply exponential smoothing to historical data
  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
  }

  // Calculate trend
  const regression = linearRegression(data);
  const volatility = calculateVolatility(data);

  // Generate predictions
  const predictions: PredictionResult[] = [];
  const lastDate = data[data.length - 1].date;
  
  for (let i = 1; i <= forecastDays; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    
    // Predicted value with trend adjustment
    const trendAdjustment = regression.slope * i;
    const predictedValue = smoothed + trendAdjustment;
    
    // Confidence interval widens over time
    const confidenceMultiplier = 1.96 * volatility * Math.sqrt(i);
    const confidence = Math.max(0.5, 1 - (i * 0.05)); // Confidence decreases over time
    
    predictions.push({
      date: futureDate.toISOString().split('T')[0],
      predictedValue: Math.max(0, predictedValue),
      lowerBound: Math.max(0, predictedValue - confidenceMultiplier),
      upperBound: predictedValue + confidenceMultiplier,
      confidence,
    });
  }

  return predictions;
}

// Get historical CPK data (with caching)
export async function getHistoricalCpkData(
  productCode: string,
  stationName: string,
  days: number = 30
): Promise<HistoricalDataPoint[]> {
  const cacheKey = aiPredictiveCacheKeys.cpkHistory(productCode, stationName, days);
  
  return withCache(cacheKey, AI_HISTORY_TTL, async () => {
    const db = await getDb();
    if (!db) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        cpk: spcAnalysisHistory.cpk,
        createdAt: spcAnalysisHistory.createdAt,
      })
      .from(spcAnalysisHistory)
      .where(
        and(
          eq(spcAnalysisHistory.productCode, productCode),
          eq(spcAnalysisHistory.stationName, stationName),
          gte(spcAnalysisHistory.createdAt, startDate)
        )
      )
      .orderBy(spcAnalysisHistory.createdAt);

    return results.map(r => ({
      date: r.createdAt || new Date(),
      value: r.cpk || 0,
    }));
  });
}

// Get historical OEE data (with caching)
export async function getHistoricalOeeData(
  productionLineId: string,
  days: number = 30
): Promise<HistoricalDataPoint[]> {
  const cacheKey = aiPredictiveCacheKeys.oeeHistory(productionLineId, days);
  
  return withCache(cacheKey, AI_HISTORY_TTL, async () => {
    const db = await getDb();
    if (!db) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        oee: oeeRecords.oee,
        recordDate: oeeRecords.recordDate,
      })
      .from(oeeRecords)
      .where(
        and(
          eq(oeeRecords.productionLineId, productionLineId),
          gte(oeeRecords.recordDate, startDate)
        )
      )
      .orderBy(oeeRecords.recordDate);

    return results.map(r => ({
      date: r.recordDate || new Date(),
      value: r.oee || 0,
    }));
  });
}

// Predict CPK trend
export async function predictCpkTrend(
  productCode: string,
  stationName: string,
  forecastDays: number = 7
): Promise<CpkPrediction> {
  const historicalData = await getHistoricalCpkData(productCode, stationName, 60);
  
  if (historicalData.length === 0) {
    return {
      productCode,
      stationName,
      currentCpk: 0,
      historicalData: [],
      predictions: [],
      trend: { trend: "stable", slope: 0, rSquared: 0, volatility: 0 },
      recommendations: ["Không có dữ liệu lịch sử để dự đoán. Vui lòng thu thập thêm dữ liệu."],
      confidence: 0,
    };
  }

  const currentCpk = historicalData[historicalData.length - 1].value;
  const predictions = exponentialSmoothing(historicalData, 0.3, forecastDays);
  const regression = linearRegression(historicalData);
  const volatility = calculateVolatility(historicalData);

  // Determine trend
  const trend: TrendAnalysis = {
    trend: regression.slope > 0.01 ? "up" : regression.slope < -0.01 ? "down" : "stable",
    slope: regression.slope,
    rSquared: regression.rSquared,
    volatility,
  };

  // Generate recommendations based on analysis
  const recommendations = await generateCpkRecommendations(currentCpk, trend, predictions);

  return {
    productCode,
    stationName,
    currentCpk,
    historicalData,
    predictions,
    trend,
    recommendations,
    confidence: Math.min(0.95, regression.rSquared + 0.3),
  };
}

// Predict OEE trend
export async function predictOeeTrend(
  productionLineId: string,
  forecastDays: number = 7
): Promise<OeePrediction> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get production line info
  const lines = await db
    .select()
    .from(productionLines)
    .where(eq(productionLines.id, productionLineId))
    .limit(1);

  const line = lines[0];
  if (!line) {
    throw new Error("Production line not found");
  }

  const historicalData = await getHistoricalOeeData(productionLineId, 60);
  
  if (historicalData.length === 0) {
    return {
      productionLineId,
      productionLineName: line.name,
      currentOee: 0,
      availability: 0,
      performance: 0,
      quality: 0,
      historicalData: [],
      predictions: [],
      trend: { trend: "stable", slope: 0, rSquared: 0, volatility: 0 },
      recommendations: ["Không có dữ liệu OEE lịch sử để dự đoán."],
      confidence: 0,
    };
  }

  // Get latest OEE record for current values
  const latestOee = await db
    .select()
    .from(oeeRecords)
    .where(eq(oeeRecords.productionLineId, productionLineId))
    .orderBy(desc(oeeRecords.recordDate))
    .limit(1);

  const currentOee = latestOee[0]?.oee || historicalData[historicalData.length - 1].value;
  const predictions = exponentialSmoothing(historicalData, 0.3, forecastDays);
  const regression = linearRegression(historicalData);
  const volatility = calculateVolatility(historicalData);

  const trend: TrendAnalysis = {
    trend: regression.slope > 0.5 ? "up" : regression.slope < -0.5 ? "down" : "stable",
    slope: regression.slope,
    rSquared: regression.rSquared,
    volatility,
  };

  const recommendations = await generateOeeRecommendations(currentOee, trend, latestOee[0]);

  return {
    productionLineId,
    productionLineName: line.name,
    currentOee,
    availability: latestOee[0]?.availability || 0,
    performance: latestOee[0]?.performance || 0,
    quality: latestOee[0]?.quality || 0,
    historicalData,
    predictions,
    trend,
    recommendations,
    confidence: Math.min(0.95, regression.rSquared + 0.3),
  };
}

// Generate CPK recommendations using LLM
async function generateCpkRecommendations(
  currentCpk: number,
  trend: TrendAnalysis,
  predictions: PredictionResult[]
): Promise<string[]> {
  const avgPredictedCpk = predictions.length > 0
    ? predictions.reduce((sum, p) => sum + p.predictedValue, 0) / predictions.length
    : currentCpk;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Bạn là chuyên gia SPC/CPK. Dựa trên dữ liệu phân tích, hãy đưa ra 3-5 khuyến nghị ngắn gọn, cụ thể bằng tiếng Việt để cải thiện chỉ số CPK. Mỗi khuyến nghị không quá 100 ký tự.`,
        },
        {
          role: "user",
          content: `Phân tích CPK:
- CPK hiện tại: ${currentCpk.toFixed(3)}
- CPK dự đoán trung bình: ${avgPredictedCpk.toFixed(3)}
- Xu hướng: ${trend.trend === "up" ? "Tăng" : trend.trend === "down" ? "Giảm" : "Ổn định"}
- Độ biến động: ${trend.volatility.toFixed(3)}
- R²: ${trend.rSquared.toFixed(3)}

Hãy đưa ra khuyến nghị dạng JSON array: ["khuyến nghị 1", "khuyến nghị 2", ...]`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return parsed.recommendations || [];
    }
  } catch (error) {
    console.error("Error generating CPK recommendations:", error);
  }

  // Fallback recommendations
  const recommendations: string[] = [];
  if (currentCpk < 1.0) {
    recommendations.push("CPK < 1.0: Quy trình không đạt yêu cầu, cần cải tiến ngay");
  } else if (currentCpk < 1.33) {
    recommendations.push("CPK < 1.33: Cần theo dõi và cải tiến quy trình");
  }
  if (trend.trend === "down") {
    recommendations.push("Xu hướng giảm: Kiểm tra nguyên nhân và có biện pháp khắc phục");
  }
  if (trend.volatility > 0.2) {
    recommendations.push("Độ biến động cao: Cần ổn định quy trình sản xuất");
  }
  if (recommendations.length === 0) {
    recommendations.push("Duy trì quy trình hiện tại và tiếp tục theo dõi");
  }
  return recommendations;
}

// Generate OEE recommendations using LLM
async function generateOeeRecommendations(
  currentOee: number,
  trend: TrendAnalysis,
  latestRecord?: { availability?: number; performance?: number; quality?: number }
): Promise<string[]> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Bạn là chuyên gia OEE (Overall Equipment Effectiveness). Dựa trên dữ liệu phân tích, hãy đưa ra 3-5 khuyến nghị ngắn gọn, cụ thể bằng tiếng Việt để cải thiện OEE. Mỗi khuyến nghị không quá 100 ký tự.`,
        },
        {
          role: "user",
          content: `Phân tích OEE:
- OEE hiện tại: ${currentOee.toFixed(1)}%
- Availability: ${latestRecord?.availability?.toFixed(1) || "N/A"}%
- Performance: ${latestRecord?.performance?.toFixed(1) || "N/A"}%
- Quality: ${latestRecord?.quality?.toFixed(1) || "N/A"}%
- Xu hướng: ${trend.trend === "up" ? "Tăng" : trend.trend === "down" ? "Giảm" : "Ổn định"}
- Độ biến động: ${trend.volatility.toFixed(1)}%

Hãy đưa ra khuyến nghị dạng JSON array: ["khuyến nghị 1", "khuyến nghị 2", ...]`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "recommendations",
          strict: true,
          schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return parsed.recommendations || [];
    }
  } catch (error) {
    console.error("Error generating OEE recommendations:", error);
  }

  // Fallback recommendations
  const recommendations: string[] = [];
  if (currentOee < 60) {
    recommendations.push("OEE < 60%: Cần cải thiện đáng kể hiệu suất thiết bị");
  } else if (currentOee < 85) {
    recommendations.push("OEE < 85%: Có cơ hội cải thiện, phân tích các yếu tố A/P/Q");
  }
  if (latestRecord?.availability && latestRecord.availability < 90) {
    recommendations.push("Availability thấp: Giảm thời gian dừng máy và bảo trì");
  }
  if (latestRecord?.performance && latestRecord.performance < 95) {
    recommendations.push("Performance thấp: Tối ưu tốc độ vận hành thiết bị");
  }
  if (latestRecord?.quality && latestRecord.quality < 99) {
    recommendations.push("Quality thấp: Giảm tỷ lệ phế phẩm và làm lại");
  }
  if (recommendations.length === 0) {
    recommendations.push("Duy trì hiệu suất hiện tại và tiếp tục theo dõi");
  }
  return recommendations;
}

// Get AI prediction summary for dashboard
export async function getAiPredictionSummary(): Promise<{
  totalPredictions: number;
  avgConfidence: number;
  cpkTrend: "up" | "down" | "stable";
  oeeTrend: "up" | "down" | "stable";
  alerts: Array<{ type: string; message: string; severity: "low" | "medium" | "high" }>;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalPredictions: 0,
      avgConfidence: 0,
      cpkTrend: "stable",
      oeeTrend: "stable",
      alerts: [],
    };
  }

  // Get recent CPK data for trend analysis
  const recentCpk = await db
    .select({
      cpk: spcAnalysisHistory.cpk,
      createdAt: spcAnalysisHistory.createdAt,
    })
    .from(spcAnalysisHistory)
    .orderBy(desc(spcAnalysisHistory.createdAt))
    .limit(100);

  // Get recent OEE data
  const recentOee = await db
    .select({
      oee: oeeRecords.oee,
      recordDate: oeeRecords.recordDate,
    })
    .from(oeeRecords)
    .orderBy(desc(oeeRecords.recordDate))
    .limit(100);

  // Analyze CPK trend
  const cpkData = recentCpk.map(r => ({ date: r.createdAt || new Date(), value: r.cpk || 0 }));
  const cpkRegression = linearRegression(cpkData);
  const cpkTrend = cpkRegression.slope > 0.01 ? "up" : cpkRegression.slope < -0.01 ? "down" : "stable";

  // Analyze OEE trend
  const oeeData = recentOee.map(r => ({ date: r.recordDate || new Date(), value: r.oee || 0 }));
  const oeeRegression = linearRegression(oeeData);
  const oeeTrend = oeeRegression.slope > 0.5 ? "up" : oeeRegression.slope < -0.5 ? "down" : "stable";

  // Generate alerts
  const alerts: Array<{ type: string; message: string; severity: "low" | "medium" | "high" }> = [];
  
  const avgCpk = cpkData.length > 0 ? cpkData.reduce((sum, d) => sum + d.value, 0) / cpkData.length : 0;
  if (avgCpk < 1.0) {
    alerts.push({ type: "cpk", message: "CPK trung bình dưới 1.0 - Cần cải tiến quy trình", severity: "high" });
  } else if (avgCpk < 1.33) {
    alerts.push({ type: "cpk", message: "CPK trung bình dưới 1.33 - Theo dõi chặt chẽ", severity: "medium" });
  }

  const avgOee = oeeData.length > 0 ? oeeData.reduce((sum, d) => sum + d.value, 0) / oeeData.length : 0;
  if (avgOee < 60) {
    alerts.push({ type: "oee", message: "OEE trung bình dưới 60% - Cần cải thiện đáng kể", severity: "high" });
  } else if (avgOee < 85) {
    alerts.push({ type: "oee", message: "OEE trung bình dưới 85% - Có cơ hội cải thiện", severity: "medium" });
  }

  if (cpkTrend === "down") {
    alerts.push({ type: "trend", message: "Xu hướng CPK đang giảm", severity: "medium" });
  }
  if (oeeTrend === "down") {
    alerts.push({ type: "trend", message: "Xu hướng OEE đang giảm", severity: "medium" });
  }

  return {
    totalPredictions: cpkData.length + oeeData.length,
    avgConfidence: Math.min(0.9, (cpkRegression.rSquared + oeeRegression.rSquared) / 2 + 0.3),
    cpkTrend,
    oeeTrend,
    alerts,
  };
}
