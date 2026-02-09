/**
 * MTTR/MTBF Prediction Service
 * Dự đoán xu hướng MTTR/MTBF bằng thuật toán và AI
 */
import { getDb } from '../db';
import { iotMttrMtbfStats, iotDevices, machines, productionLines } from '../../drizzle/schema';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { invokeLLM } from '../_core/llm';

// Types
export interface HistoricalDataPoint {
  date: string;
  mttr: number | null;
  mtbf: number | null;
  availability: number | null;
  failures: number;
}

export interface PredictionResult {
  date: string;
  predictedMttr: number | null;
  predictedMtbf: number | null;
  predictedAvailability: number | null;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface TrendAnalysis {
  mttrTrend: 'improving' | 'stable' | 'declining';
  mtbfTrend: 'improving' | 'stable' | 'declining';
  availabilityTrend: 'improving' | 'stable' | 'declining';
  mttrChangePercent: number;
  mtbfChangePercent: number;
  availabilityChangePercent: number;
}

export interface AIRecommendation {
  summary: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  predictedIssues: string[];
  maintenanceAdvice: string;
}

// Simple Moving Average
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// Exponential Moving Average
function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(ema);
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  
  return result;
}

// Linear Regression for trend prediction
function linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };
  
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;
  
  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = data[i] - yMean;
    ssXY += xDiff * yDiff;
    ssXX += xDiff * xDiff;
    ssYY += yDiff * yDiff;
  }
  
  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = yMean - slope * xMean;
  const r2 = ssYY !== 0 ? (ssXY * ssXY) / (ssXX * ssYY) : 0;
  
  return { slope, intercept, r2 };
}

// Predict future values using linear regression
function predictFuture(
  historicalData: number[],
  daysToPredict: number
): { predictions: number[]; confidence: number } {
  const { slope, intercept, r2 } = linearRegression(historicalData);
  const predictions: number[] = [];
  
  for (let i = 0; i < daysToPredict; i++) {
    const predictedValue = slope * (historicalData.length + i) + intercept;
    predictions.push(Math.max(0, predictedValue)); // Ensure non-negative
  }
  
  return { predictions, confidence: r2 };
}

// Determine trend from slope
function determineTrend(slope: number, mean: number, isHigherBetter: boolean): 'improving' | 'stable' | 'declining' {
  const threshold = mean * 0.01; // 1% change threshold
  
  if (Math.abs(slope) < threshold) return 'stable';
  
  if (isHigherBetter) {
    return slope > 0 ? 'improving' : 'declining';
  } else {
    return slope < 0 ? 'improving' : 'declining';
  }
}

// Get historical data
export async function getHistoricalData(
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number,
  days: number = 30
): Promise<HistoricalDataPoint[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const stats = await db.select()
      .from(iotMttrMtbfStats)
      .where(and(
        eq(iotMttrMtbfStats.targetType, targetType),
        eq(iotMttrMtbfStats.targetId, targetId),
        gte(iotMttrMtbfStats.periodStart, startDate.toISOString().slice(0, 10))
      ))
      .orderBy(asc(iotMttrMtbfStats.periodStart));

    return stats.map(s => ({
      date: s.periodStart,
      mttr: s.mttr ? Number(s.mttr) : null,
      mtbf: s.mtbf ? Number(s.mtbf) : null,
      availability: s.availability ? Number(s.availability) : null,
      failures: s.failureCount || 0,
    }));
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

// No more mock data - return empty if insufficient real data

// Main prediction function
export async function predictMttrMtbf(
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number,
  historicalDays: number = 30,
  predictionDays: number = 7
): Promise<{
  historical: HistoricalDataPoint[];
  predictions: PredictionResult[];
  trendAnalysis: TrendAnalysis;
}> {
  // Get historical data
  let historical = await getHistoricalData(targetType, targetId, historicalDays);
  
  // Return early if insufficient real data
  if (historical.length < 3) {
    return {
      historical,
      predictions: [],
      trendAnalysis: {
        mttrTrend: 'stable', mtbfTrend: 'stable', availabilityTrend: 'stable',
        mttrChangePercent: 0, mtbfChangePercent: 0, availabilityChangePercent: 0,
      },
    };
  }

  // Extract arrays for prediction
  const mttrValues = historical.map(d => d.mttr).filter((v): v is number => v !== null);
  const mtbfValues = historical.map(d => d.mtbf).filter((v): v is number => v !== null);
  const availValues = historical.map(d => d.availability).filter((v): v is number => v !== null);

  // Calculate predictions
  const mttrPred = mttrValues.length >= 3 ? predictFuture(mttrValues, predictionDays) : null;
  const mtbfPred = mtbfValues.length >= 3 ? predictFuture(mtbfValues, predictionDays) : null;
  const availPred = availValues.length >= 3 ? predictFuture(availValues, predictionDays) : null;

  // Calculate trends
  const mttrReg = linearRegression(mttrValues);
  const mtbfReg = linearRegression(mtbfValues);
  const availReg = linearRegression(availValues);

  const mttrMean = mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length;
  const mtbfMean = mtbfValues.reduce((a, b) => a + b, 0) / mtbfValues.length;
  const availMean = availValues.reduce((a, b) => a + b, 0) / availValues.length;

  const trendAnalysis: TrendAnalysis = {
    mttrTrend: determineTrend(mttrReg.slope, mttrMean, false), // Lower MTTR is better
    mtbfTrend: determineTrend(mtbfReg.slope, mtbfMean, true),  // Higher MTBF is better
    availabilityTrend: determineTrend(availReg.slope, availMean, true), // Higher availability is better
    mttrChangePercent: mttrMean !== 0 ? (mttrReg.slope * historicalDays / mttrMean) * 100 : 0,
    mtbfChangePercent: mtbfMean !== 0 ? (mtbfReg.slope * historicalDays / mtbfMean) * 100 : 0,
    availabilityChangePercent: availMean !== 0 ? (availReg.slope * historicalDays / availMean) * 100 : 0,
  };

  // Generate prediction results
  const predictions: PredictionResult[] = [];
  const lastDate = new Date(historical[historical.length - 1]?.date || new Date());

  for (let i = 0; i < predictionDays; i++) {
    const predDate = new Date(lastDate);
    predDate.setDate(predDate.getDate() + i + 1);

    const predictedMttr = mttrPred?.predictions[i] ?? null;
    const predictedMtbf = mtbfPred?.predictions[i] ?? null;
    const predictedAvail = availPred?.predictions[i] ?? null;

    // Determine overall trend
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    const trends = [trendAnalysis.mttrTrend, trendAnalysis.mtbfTrend, trendAnalysis.availabilityTrend];
    const improvingCount = trends.filter(t => t === 'improving').length;
    const decliningCount = trends.filter(t => t === 'declining').length;
    
    if (improvingCount > decliningCount) trend = 'improving';
    else if (decliningCount > improvingCount) trend = 'declining';

    predictions.push({
      date: predDate.toISOString().slice(0, 10),
      predictedMttr,
      predictedMtbf,
      predictedAvailability: predictedAvail ? Math.min(1, Math.max(0, predictedAvail)) : null,
      confidence: Math.min(mttrPred?.confidence || 0, mtbfPred?.confidence || 0, availPred?.confidence || 0),
      trend,
    });
  }

  return { historical, predictions, trendAnalysis };
}

// Generate AI recommendations
export async function generateAIRecommendations(
  targetType: 'device' | 'machine' | 'production_line',
  targetName: string,
  historical: HistoricalDataPoint[],
  predictions: PredictionResult[],
  trendAnalysis: TrendAnalysis
): Promise<AIRecommendation> {
  const targetTypeLabel = {
    device: 'thiết bị IoT',
    machine: 'máy móc',
    production_line: 'dây chuyền sản xuất',
  }[targetType];

  // Calculate statistics
  const mttrValues = historical.map(d => d.mttr).filter((v): v is number => v !== null);
  const mtbfValues = historical.map(d => d.mtbf).filter((v): v is number => v !== null);
  const avgMttr = mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length;
  const avgMtbf = mtbfValues.reduce((a, b) => a + b, 0) / mtbfValues.length;
  const totalFailures = historical.reduce((sum, d) => sum + d.failures, 0);

  const prompt = `
Bạn là chuyên gia phân tích bảo trì thiết bị công nghiệp. Hãy phân tích dữ liệu MTTR/MTBF sau và đưa ra khuyến nghị.

Thông tin ${targetTypeLabel}: ${targetName}

Dữ liệu thống kê ${historical.length} ngày qua:
- MTTR trung bình: ${avgMttr.toFixed(1)} phút
- MTBF trung bình: ${avgMtbf.toFixed(1)} phút
- Tổng số lỗi: ${totalFailures}
- Xu hướng MTTR: ${trendAnalysis.mttrTrend} (${trendAnalysis.mttrChangePercent.toFixed(1)}%)
- Xu hướng MTBF: ${trendAnalysis.mtbfTrend} (${trendAnalysis.mtbfChangePercent.toFixed(1)}%)
- Xu hướng Availability: ${trendAnalysis.availabilityTrend} (${trendAnalysis.availabilityChangePercent.toFixed(1)}%)

Dự đoán ${predictions.length} ngày tới:
- MTTR dự đoán: ${predictions[predictions.length - 1]?.predictedMttr?.toFixed(1) || 'N/A'} phút
- MTBF dự đoán: ${predictions[predictions.length - 1]?.predictedMtbf?.toFixed(1) || 'N/A'} phút
- Độ tin cậy: ${(predictions[0]?.confidence * 100).toFixed(0)}%

Hãy trả về JSON với format:
{
  "summary": "Tóm tắt ngắn gọn tình trạng thiết bị (1-2 câu)",
  "riskLevel": "low|medium|high",
  "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2", "Khuyến nghị 3"],
  "predictedIssues": ["Vấn đề tiềm ẩn 1", "Vấn đề tiềm ẩn 2"],
  "maintenanceAdvice": "Lời khuyên bảo trì cụ thể"
}
`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'Bạn là chuyên gia phân tích bảo trì thiết bị công nghiệp. Luôn trả về JSON hợp lệ.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ai_recommendation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
              recommendations: { type: 'array', items: { type: 'string' } },
              predictedIssues: { type: 'array', items: { type: 'string' } },
              maintenanceAdvice: { type: 'string' },
            },
            required: ['summary', 'riskLevel', 'recommendations', 'predictedIssues', 'maintenanceAdvice'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
  }

  // Fallback recommendations based on trend analysis
  const riskLevel = 
    trendAnalysis.mttrTrend === 'declining' || trendAnalysis.mtbfTrend === 'declining' 
      ? 'high' 
      : trendAnalysis.mttrTrend === 'stable' && trendAnalysis.mtbfTrend === 'stable'
        ? 'medium'
        : 'low';

  return {
    summary: `${targetTypeLabel} ${targetName} đang có xu hướng ${
      trendAnalysis.mtbfTrend === 'improving' ? 'cải thiện' : 
      trendAnalysis.mtbfTrend === 'declining' ? 'giảm sút' : 'ổn định'
    } về độ tin cậy.`,
    riskLevel,
    recommendations: [
      trendAnalysis.mttrTrend === 'declining' ? 'Cần đào tạo thêm kỹ thuật viên để giảm thời gian sửa chữa' : 'Duy trì quy trình sửa chữa hiện tại',
      trendAnalysis.mtbfTrend === 'declining' ? 'Tăng tần suất bảo trì phòng ngừa' : 'Tiếp tục lịch bảo trì định kỳ',
      'Theo dõi sát các chỉ số trong tuần tới',
    ],
    predictedIssues: trendAnalysis.mtbfTrend === 'declining' 
      ? ['Có thể xảy ra sự cố trong 7 ngày tới', 'Cần kiểm tra các bộ phận dễ hao mòn']
      : ['Không phát hiện vấn đề nghiêm trọng'],
    maintenanceAdvice: trendAnalysis.mtbfTrend === 'declining'
      ? 'Nên lên lịch bảo trì phòng ngừa trong 3-5 ngày tới'
      : 'Tiếp tục theo dõi và bảo trì theo lịch định kỳ',
  };
}

export const mttrMtbfPredictionService = {
  getHistoricalData,
  predictMttrMtbf,
  generateAIRecommendations,
  calculateSMA,
  calculateEMA,
  linearRegression,
};

export default mttrMtbfPredictionService;
