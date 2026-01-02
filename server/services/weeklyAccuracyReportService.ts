/**
 * Weekly Accuracy Report Service
 * Generates and sends weekly accuracy metrics reports via email
 */

import ExcelJS from "exceljs";
import { getDb } from "../db";
import { 
  aiPredictionHistory, 
  aiPredictionAccuracyStats,
  aiAnomalyModels,
  aiModelVersions,
  users 
} from "../../drizzle/schema";
import { desc, eq, and, gte, lte, sql } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { notifyOwner } from "../_core/notification";

// Types
interface AccuracyMetrics {
  mae: number;
  rmse: number;
  mape: number;
  withinConfidenceRate: number;
  totalPredictions: number;
  verifiedPredictions: number;
}

interface ModelAccuracyData {
  modelId: number;
  modelName: string;
  modelVersion: string;
  predictionType: string;
  accuracy: AccuracyMetrics;
  trend: "improving" | "declining" | "stable";
  trendPercent: number;
}

interface WeeklyReportData {
  reportPeriod: {
    start: Date;
    end: Date;
  };
  overallMetrics: AccuracyMetrics;
  byPredictionType: {
    cpk: AccuracyMetrics;
    oee: AccuracyMetrics;
    defectRate: AccuracyMetrics;
    trend: AccuracyMetrics;
  };
  modelComparison: ModelAccuracyData[];
  topPerformingModels: ModelAccuracyData[];
  underperformingModels: ModelAccuracyData[];
  weekOverWeekChange: {
    maeChange: number;
    rmseChange: number;
    mapeChange: number;
    withinConfidenceChange: number;
  };
  alerts: string[];
}

/**
 * Calculate accuracy metrics from prediction history
 */
async function calculateAccuracyMetrics(
  startDate: Date,
  endDate: Date,
  predictionType?: string,
  modelId?: number
): Promise<AccuracyMetrics> {
  const db = await getDb();
  if (!db) {
    return {
      mae: 0,
      rmse: 0,
      mape: 0,
      withinConfidenceRate: 0,
      totalPredictions: 0,
      verifiedPredictions: 0,
    };
  }

  const conditions = [
    gte(aiPredictionHistory.predictedAt, startDate.toISOString()),
    lte(aiPredictionHistory.predictedAt, endDate.toISOString()),
    eq(aiPredictionHistory.status, "verified"),
  ];

  if (predictionType) {
    conditions.push(eq(aiPredictionHistory.predictionType, predictionType as any));
  }

  if (modelId) {
    conditions.push(eq(aiPredictionHistory.modelId, modelId));
  }

  const results = await db
    .select({
      absoluteError: aiPredictionHistory.absoluteError,
      percentError: aiPredictionHistory.percentError,
      squaredError: aiPredictionHistory.squaredError,
      isWithinConfidence: aiPredictionHistory.isWithinConfidence,
      status: aiPredictionHistory.status,
    })
    .from(aiPredictionHistory)
    .where(and(...conditions));

  const totalPredictions = results.length;
  const verifiedPredictions = results.filter(r => r.status === "verified").length;

  if (verifiedPredictions === 0) {
    return {
      mae: 0,
      rmse: 0,
      mape: 0,
      withinConfidenceRate: 0,
      totalPredictions,
      verifiedPredictions,
    };
  }

  const mae = results.reduce((sum, r) => sum + parseFloat(r.absoluteError || "0"), 0) / verifiedPredictions;
  const mse = results.reduce((sum, r) => sum + parseFloat(r.squaredError || "0"), 0) / verifiedPredictions;
  const rmse = Math.sqrt(mse);
  const mape = results.reduce((sum, r) => sum + Math.abs(parseFloat(r.percentError || "0")), 0) / verifiedPredictions;
  const withinConfidenceCount = results.filter(r => r.isWithinConfidence === 1).length;
  const withinConfidenceRate = (withinConfidenceCount / verifiedPredictions) * 100;

  return {
    mae: Math.round(mae * 1000) / 1000,
    rmse: Math.round(rmse * 1000) / 1000,
    mape: Math.round(mape * 100) / 100,
    withinConfidenceRate: Math.round(withinConfidenceRate * 10) / 10,
    totalPredictions,
    verifiedPredictions,
  };
}

/**
 * Get model accuracy comparison data
 */
async function getModelAccuracyComparison(
  startDate: Date,
  endDate: Date
): Promise<ModelAccuracyData[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all active models
  const models = await db
    .select()
    .from(aiAnomalyModels)
    .where(eq(aiAnomalyModels.status, "active"));

  const modelAccuracyData: ModelAccuracyData[] = [];

  for (const model of models) {
    const currentMetrics = await calculateAccuracyMetrics(startDate, endDate, undefined, model.id);
    
    // Get previous week metrics for trend
    const prevStart = new Date(startDate);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevEnd = new Date(startDate);
    const prevMetrics = await calculateAccuracyMetrics(prevStart, prevEnd, undefined, model.id);

    let trend: "improving" | "declining" | "stable" = "stable";
    let trendPercent = 0;

    if (prevMetrics.mae > 0 && currentMetrics.mae > 0) {
      const maeChange = ((prevMetrics.mae - currentMetrics.mae) / prevMetrics.mae) * 100;
      trendPercent = Math.round(maeChange * 10) / 10;
      
      if (maeChange > 5) {
        trend = "improving";
      } else if (maeChange < -5) {
        trend = "declining";
      }
    }

    modelAccuracyData.push({
      modelId: model.id,
      modelName: model.name,
      modelVersion: model.version || "1.0",
      predictionType: model.targetMetric || "cpk",
      accuracy: currentMetrics,
      trend,
      trendPercent,
    });
  }

  return modelAccuracyData.sort((a, b) => a.accuracy.mae - b.accuracy.mae);
}

/**
 * Generate weekly accuracy report data
 */
export async function generateWeeklyReportData(): Promise<WeeklyReportData> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  // Previous week for comparison
  const prevEndDate = new Date(startDate);
  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - 7);

  // Calculate overall metrics
  const overallMetrics = await calculateAccuracyMetrics(startDate, endDate);
  const prevOverallMetrics = await calculateAccuracyMetrics(prevStartDate, prevEndDate);

  // Calculate by prediction type
  const cpkMetrics = await calculateAccuracyMetrics(startDate, endDate, "cpk");
  const oeeMetrics = await calculateAccuracyMetrics(startDate, endDate, "oee");
  const defectRateMetrics = await calculateAccuracyMetrics(startDate, endDate, "defect_rate");
  const trendMetrics = await calculateAccuracyMetrics(startDate, endDate, "trend");

  // Get model comparison
  const modelComparison = await getModelAccuracyComparison(startDate, endDate);

  // Identify top and underperforming models
  const topPerformingModels = modelComparison.filter(m => m.accuracy.mae < 0.1 && m.accuracy.verifiedPredictions > 10).slice(0, 5);
  const underperformingModels = modelComparison.filter(m => m.accuracy.mae > 0.5 || m.accuracy.withinConfidenceRate < 70).slice(0, 5);

  // Calculate week-over-week changes
  const weekOverWeekChange = {
    maeChange: prevOverallMetrics.mae > 0 
      ? Math.round(((overallMetrics.mae - prevOverallMetrics.mae) / prevOverallMetrics.mae) * 100 * 10) / 10
      : 0,
    rmseChange: prevOverallMetrics.rmse > 0
      ? Math.round(((overallMetrics.rmse - prevOverallMetrics.rmse) / prevOverallMetrics.rmse) * 100 * 10) / 10
      : 0,
    mapeChange: prevOverallMetrics.mape > 0
      ? Math.round(((overallMetrics.mape - prevOverallMetrics.mape) / prevOverallMetrics.mape) * 100 * 10) / 10
      : 0,
    withinConfidenceChange: Math.round((overallMetrics.withinConfidenceRate - prevOverallMetrics.withinConfidenceRate) * 10) / 10,
  };

  // Generate alerts
  const alerts: string[] = [];
  
  if (overallMetrics.mape > 15) {
    alerts.push(`⚠️ MAPE tổng thể cao: ${overallMetrics.mape}% (ngưỡng: 15%)`);
  }
  
  if (overallMetrics.withinConfidenceRate < 80) {
    alerts.push(`⚠️ Tỷ lệ dự đoán trong khoảng tin cậy thấp: ${overallMetrics.withinConfidenceRate}% (ngưỡng: 80%)`);
  }
  
  if (weekOverWeekChange.maeChange > 20) {
    alerts.push(`📈 MAE tăng ${weekOverWeekChange.maeChange}% so với tuần trước`);
  }
  
  for (const model of underperformingModels) {
    alerts.push(`🔴 Model "${model.modelName}" có độ chính xác thấp (MAE: ${model.accuracy.mae})`);
  }

  return {
    reportPeriod: {
      start: startDate,
      end: endDate,
    },
    overallMetrics,
    byPredictionType: {
      cpk: cpkMetrics,
      oee: oeeMetrics,
      defectRate: defectRateMetrics,
      trend: trendMetrics,
    },
    modelComparison,
    topPerformingModels,
    underperformingModels,
    weekOverWeekChange,
    alerts,
  };
}

/**
 * Generate Excel report
 */
export async function generateWeeklyAccuracyExcel(): Promise<Buffer> {
  const reportData = await generateWeeklyReportData();
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SPC/CPK Calculator";
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet("Tổng quan");
  summarySheet.columns = [
    { header: "Chỉ số", key: "metric", width: 30 },
    { header: "Giá trị", key: "value", width: 20 },
    { header: "Thay đổi so với tuần trước", key: "change", width: 25 },
  ];

  summarySheet.addRow({ metric: "Kỳ báo cáo", value: `${reportData.reportPeriod.start.toLocaleDateString("vi-VN")} - ${reportData.reportPeriod.end.toLocaleDateString("vi-VN")}`, change: "" });
  summarySheet.addRow({ metric: "", value: "", change: "" });
  summarySheet.addRow({ metric: "TỔNG QUAN", value: "", change: "" });
  summarySheet.addRow({ metric: "Tổng số dự đoán", value: reportData.overallMetrics.totalPredictions, change: "" });
  summarySheet.addRow({ metric: "Dự đoán đã xác minh", value: reportData.overallMetrics.verifiedPredictions, change: "" });
  summarySheet.addRow({ metric: "MAE (Mean Absolute Error)", value: reportData.overallMetrics.mae, change: `${reportData.weekOverWeekChange.maeChange}%` });
  summarySheet.addRow({ metric: "RMSE (Root Mean Squared Error)", value: reportData.overallMetrics.rmse, change: `${reportData.weekOverWeekChange.rmseChange}%` });
  summarySheet.addRow({ metric: "MAPE (Mean Absolute Percentage Error)", value: `${reportData.overallMetrics.mape}%`, change: `${reportData.weekOverWeekChange.mapeChange}%` });
  summarySheet.addRow({ metric: "Tỷ lệ trong khoảng tin cậy", value: `${reportData.overallMetrics.withinConfidenceRate}%`, change: `${reportData.weekOverWeekChange.withinConfidenceChange}%` });

  // Style header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // By Prediction Type Sheet
  const typeSheet = workbook.addWorksheet("Theo loại dự đoán");
  typeSheet.columns = [
    { header: "Loại dự đoán", key: "type", width: 20 },
    { header: "Tổng dự đoán", key: "total", width: 15 },
    { header: "Đã xác minh", key: "verified", width: 15 },
    { header: "MAE", key: "mae", width: 12 },
    { header: "RMSE", key: "rmse", width: 12 },
    { header: "MAPE (%)", key: "mape", width: 12 },
    { header: "Trong khoảng tin cậy (%)", key: "confidence", width: 25 },
  ];

  typeSheet.addRow({
    type: "CPK",
    total: reportData.byPredictionType.cpk.totalPredictions,
    verified: reportData.byPredictionType.cpk.verifiedPredictions,
    mae: reportData.byPredictionType.cpk.mae,
    rmse: reportData.byPredictionType.cpk.rmse,
    mape: reportData.byPredictionType.cpk.mape,
    confidence: reportData.byPredictionType.cpk.withinConfidenceRate,
  });
  typeSheet.addRow({
    type: "OEE",
    total: reportData.byPredictionType.oee.totalPredictions,
    verified: reportData.byPredictionType.oee.verifiedPredictions,
    mae: reportData.byPredictionType.oee.mae,
    rmse: reportData.byPredictionType.oee.rmse,
    mape: reportData.byPredictionType.oee.mape,
    confidence: reportData.byPredictionType.oee.withinConfidenceRate,
  });
  typeSheet.addRow({
    type: "Tỷ lệ lỗi",
    total: reportData.byPredictionType.defectRate.totalPredictions,
    verified: reportData.byPredictionType.defectRate.verifiedPredictions,
    mae: reportData.byPredictionType.defectRate.mae,
    rmse: reportData.byPredictionType.defectRate.rmse,
    mape: reportData.byPredictionType.defectRate.mape,
    confidence: reportData.byPredictionType.defectRate.withinConfidenceRate,
  });
  typeSheet.addRow({
    type: "Xu hướng",
    total: reportData.byPredictionType.trend.totalPredictions,
    verified: reportData.byPredictionType.trend.verifiedPredictions,
    mae: reportData.byPredictionType.trend.mae,
    rmse: reportData.byPredictionType.trend.rmse,
    mape: reportData.byPredictionType.trend.mape,
    confidence: reportData.byPredictionType.trend.withinConfidenceRate,
  });

  typeSheet.getRow(1).font = { bold: true };
  typeSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  typeSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Model Comparison Sheet
  const modelSheet = workbook.addWorksheet("So sánh Model");
  modelSheet.columns = [
    { header: "Model", key: "name", width: 25 },
    { header: "Phiên bản", key: "version", width: 12 },
    { header: "Loại", key: "type", width: 15 },
    { header: "MAE", key: "mae", width: 12 },
    { header: "RMSE", key: "rmse", width: 12 },
    { header: "MAPE (%)", key: "mape", width: 12 },
    { header: "Trong khoảng tin cậy (%)", key: "confidence", width: 25 },
    { header: "Xu hướng", key: "trend", width: 15 },
    { header: "Thay đổi (%)", key: "trendPercent", width: 15 },
  ];

  for (const model of reportData.modelComparison) {
    modelSheet.addRow({
      name: model.modelName,
      version: model.modelVersion,
      type: model.predictionType,
      mae: model.accuracy.mae,
      rmse: model.accuracy.rmse,
      mape: model.accuracy.mape,
      confidence: model.accuracy.withinConfidenceRate,
      trend: model.trend === "improving" ? "↑ Cải thiện" : model.trend === "declining" ? "↓ Giảm" : "→ Ổn định",
      trendPercent: model.trendPercent,
    });
  }

  modelSheet.getRow(1).font = { bold: true };
  modelSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  modelSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Alerts Sheet
  const alertsSheet = workbook.addWorksheet("Cảnh báo");
  alertsSheet.columns = [
    { header: "STT", key: "index", width: 10 },
    { header: "Nội dung cảnh báo", key: "alert", width: 80 },
  ];

  reportData.alerts.forEach((alert, index) => {
    alertsSheet.addRow({ index: index + 1, alert });
  });

  alertsSheet.getRow(1).font = { bold: true };
  alertsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFF0000" },
  };
  alertsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(reportData: WeeklyReportData): string {
  const formatDate = (date: Date) => date.toLocaleDateString("vi-VN");
  const formatNumber = (num: number) => num.toFixed(2);
  const formatPercent = (num: number) => `${num.toFixed(1)}%`;
  const getChangeColor = (change: number) => change > 0 ? "#dc3545" : change < 0 ? "#28a745" : "#6c757d";
  const getChangeIcon = (change: number) => change > 0 ? "↑" : change < 0 ? "↓" : "→";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .section { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .section h2 { color: #667eea; margin-top: 0; font-size: 18px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .metric-card { background: #f8f9fa; padding: 15px; border-radius: 6px; }
    .metric-card .label { color: #6c757d; font-size: 12px; text-transform: uppercase; }
    .metric-card .value { font-size: 24px; font-weight: bold; color: #333; }
    .metric-card .change { font-size: 12px; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e0e0e0; }
    th { background: #f8f9fa; font-weight: 600; color: #333; }
    .alert { padding: 12px 15px; border-radius: 6px; margin-bottom: 10px; }
    .alert-warning { background: #fff3cd; border-left: 4px solid #ffc107; }
    .alert-danger { background: #f8d7da; border-left: 4px solid #dc3545; }
    .trend-up { color: #28a745; }
    .trend-down { color: #dc3545; }
    .trend-stable { color: #6c757d; }
    .footer { text-align: center; color: #6c757d; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Báo cáo Accuracy Metrics Hàng Tuần</h1>
    <p>Kỳ báo cáo: ${formatDate(reportData.reportPeriod.start)} - ${formatDate(reportData.reportPeriod.end)}</p>
  </div>

  <div class="section">
    <h2>📈 Tổng quan Độ chính xác</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="label">MAE (Mean Absolute Error)</div>
        <div class="value">${formatNumber(reportData.overallMetrics.mae)}</div>
        <div class="change" style="color: ${getChangeColor(reportData.weekOverWeekChange.maeChange)}">
          ${getChangeIcon(reportData.weekOverWeekChange.maeChange)} ${formatPercent(Math.abs(reportData.weekOverWeekChange.maeChange))} so với tuần trước
        </div>
      </div>
      <div class="metric-card">
        <div class="label">RMSE</div>
        <div class="value">${formatNumber(reportData.overallMetrics.rmse)}</div>
        <div class="change" style="color: ${getChangeColor(reportData.weekOverWeekChange.rmseChange)}">
          ${getChangeIcon(reportData.weekOverWeekChange.rmseChange)} ${formatPercent(Math.abs(reportData.weekOverWeekChange.rmseChange))} so với tuần trước
        </div>
      </div>
      <div class="metric-card">
        <div class="label">MAPE</div>
        <div class="value">${formatPercent(reportData.overallMetrics.mape)}</div>
        <div class="change" style="color: ${getChangeColor(reportData.weekOverWeekChange.mapeChange)}">
          ${getChangeIcon(reportData.weekOverWeekChange.mapeChange)} ${formatPercent(Math.abs(reportData.weekOverWeekChange.mapeChange))} so với tuần trước
        </div>
      </div>
      <div class="metric-card">
        <div class="label">Tỷ lệ trong khoảng tin cậy</div>
        <div class="value">${formatPercent(reportData.overallMetrics.withinConfidenceRate)}</div>
        <div class="change" style="color: ${getChangeColor(-reportData.weekOverWeekChange.withinConfidenceChange)}">
          ${getChangeIcon(-reportData.weekOverWeekChange.withinConfidenceChange)} ${formatPercent(Math.abs(reportData.weekOverWeekChange.withinConfidenceChange))}
        </div>
      </div>
    </div>
    <p style="margin-top: 15px; color: #6c757d;">
      Tổng số dự đoán: <strong>${reportData.overallMetrics.totalPredictions}</strong> | 
      Đã xác minh: <strong>${reportData.overallMetrics.verifiedPredictions}</strong>
    </p>
  </div>

  <div class="section">
    <h2>📊 Theo loại dự đoán</h2>
    <table>
      <tr>
        <th>Loại</th>
        <th>Dự đoán</th>
        <th>MAE</th>
        <th>MAPE</th>
        <th>Trong khoảng tin cậy</th>
      </tr>
      <tr>
        <td>CPK</td>
        <td>${reportData.byPredictionType.cpk.verifiedPredictions}</td>
        <td>${formatNumber(reportData.byPredictionType.cpk.mae)}</td>
        <td>${formatPercent(reportData.byPredictionType.cpk.mape)}</td>
        <td>${formatPercent(reportData.byPredictionType.cpk.withinConfidenceRate)}</td>
      </tr>
      <tr>
        <td>OEE</td>
        <td>${reportData.byPredictionType.oee.verifiedPredictions}</td>
        <td>${formatNumber(reportData.byPredictionType.oee.mae)}</td>
        <td>${formatPercent(reportData.byPredictionType.oee.mape)}</td>
        <td>${formatPercent(reportData.byPredictionType.oee.withinConfidenceRate)}</td>
      </tr>
      <tr>
        <td>Tỷ lệ lỗi</td>
        <td>${reportData.byPredictionType.defectRate.verifiedPredictions}</td>
        <td>${formatNumber(reportData.byPredictionType.defectRate.mae)}</td>
        <td>${formatPercent(reportData.byPredictionType.defectRate.mape)}</td>
        <td>${formatPercent(reportData.byPredictionType.defectRate.withinConfidenceRate)}</td>
      </tr>
      <tr>
        <td>Xu hướng</td>
        <td>${reportData.byPredictionType.trend.verifiedPredictions}</td>
        <td>${formatNumber(reportData.byPredictionType.trend.mae)}</td>
        <td>${formatPercent(reportData.byPredictionType.trend.mape)}</td>
        <td>${formatPercent(reportData.byPredictionType.trend.withinConfidenceRate)}</td>
      </tr>
    </table>
  </div>

  ${reportData.topPerformingModels.length > 0 ? `
  <div class="section">
    <h2>🏆 Top Model Hiệu suất cao</h2>
    <table>
      <tr>
        <th>Model</th>
        <th>Phiên bản</th>
        <th>MAE</th>
        <th>Xu hướng</th>
      </tr>
      ${reportData.topPerformingModels.map(m => `
      <tr>
        <td>${m.modelName}</td>
        <td>${m.modelVersion}</td>
        <td>${formatNumber(m.accuracy.mae)}</td>
        <td class="${m.trend === 'improving' ? 'trend-up' : m.trend === 'declining' ? 'trend-down' : 'trend-stable'}">
          ${m.trend === 'improving' ? '↑ Cải thiện' : m.trend === 'declining' ? '↓ Giảm' : '→ Ổn định'} (${formatPercent(Math.abs(m.trendPercent))})
        </td>
      </tr>
      `).join('')}
    </table>
  </div>
  ` : ''}

  ${reportData.alerts.length > 0 ? `
  <div class="section">
    <h2>⚠️ Cảnh báo</h2>
    ${reportData.alerts.map(alert => `
    <div class="alert ${alert.includes('🔴') || alert.includes('📈') ? 'alert-danger' : 'alert-warning'}">
      ${alert}
    </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="footer">
    <p>Báo cáo được tạo tự động bởi SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} MSoftware AI</p>
  </div>
</body>
</html>
  `;
}

/**
 * Send weekly accuracy report via email
 */
export async function sendWeeklyAccuracyReport(): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  message: string;
}> {
  console.log("[WeeklyAccuracyReport] Starting weekly accuracy report generation...");

  try {
    // Generate report data
    const reportData = await generateWeeklyReportData();
    
    // Generate email HTML
    const emailHtml = generateEmailHtml(reportData);
    
    // Get recipients from database (users with email notification enabled)
    const db = await getDb();
    if (!db) {
      return { success: false, sent: 0, failed: 0, message: "Database not available" };
    }

    const recipients = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.role, "admin"));

    const emails = recipients.map(r => r.email).filter(Boolean) as string[];

    if (emails.length === 0) {
      // Send to owner if no admin emails configured
      await notifyOwner({
        title: "📊 Báo cáo Accuracy Metrics Hàng Tuần",
        content: `Kỳ báo cáo: ${reportData.reportPeriod.start.toLocaleDateString("vi-VN")} - ${reportData.reportPeriod.end.toLocaleDateString("vi-VN")}\n\n` +
          `Tổng quan:\n` +
          `- MAE: ${reportData.overallMetrics.mae}\n` +
          `- RMSE: ${reportData.overallMetrics.rmse}\n` +
          `- MAPE: ${reportData.overallMetrics.mape}%\n` +
          `- Tỷ lệ trong khoảng tin cậy: ${reportData.overallMetrics.withinConfidenceRate}%\n\n` +
          `Cảnh báo: ${reportData.alerts.length > 0 ? reportData.alerts.join('\n') : 'Không có cảnh báo'}`,
      });
      
      return { success: true, sent: 1, failed: 0, message: "Report sent to owner (no admin emails configured)" };
    }

    // Send email
    const result = await sendEmail(
      emails,
      `📊 Báo cáo Accuracy Metrics Hàng Tuần - ${reportData.reportPeriod.start.toLocaleDateString("vi-VN")} đến ${reportData.reportPeriod.end.toLocaleDateString("vi-VN")}`,
      emailHtml
    );

    console.log(`[WeeklyAccuracyReport] Report sent to ${result.sentCount || 0} recipients`);

    return {
      success: result.success,
      sent: result.sentCount || 0,
      failed: emails.length - (result.sentCount || 0),
      message: result.success ? "Weekly accuracy report sent successfully" : result.error || "Failed to send report",
    };
  } catch (error) {
    console.error("[WeeklyAccuracyReport] Error generating/sending report:", error);
    return {
      success: false,
      sent: 0,
      failed: 0,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Manually trigger weekly report (for testing)
 */
export async function triggerWeeklyAccuracyReport(): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  message: string;
}> {
  return await sendWeeklyAccuracyReport();
}
