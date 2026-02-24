/**
 * Predictive Alert Service
 * Service kiểm tra ngưỡng và gửi cảnh báo dựa trên kết quả dự báo
 */

import { getDb } from "../db";
import { 
  predictiveAlertThresholds, 
  predictiveAlertHistory,
  predictiveAlertAdjustmentLogs,
  productionLines,
  PredictiveAlertThreshold,
  PredictiveAlertHistory,
  InsertPredictiveAlertHistory,
  InsertPredictiveThresholdAdjustLog,
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, isNull, or, sql } from "drizzle-orm";
import { forecastOEE, OEEForecastResult } from "./oeeForecastingService";
import { predictDefectRate, DefectPredictionResult } from "./defectPredictionService";

// Types
export interface ThresholdConfig {
  id: number;
  name: string;
  productionLineId: number | null;
  predictionType: 'oee' | 'defect_rate' | 'both';
  oeeWarningThreshold: number;
  oeeCriticalThreshold: number;
  oeeDeclineThreshold: number;
  defectWarningThreshold: number;
  defectCriticalThreshold: number;
  defectIncreaseThreshold: number;
  autoAdjustEnabled: boolean;
  autoAdjustSensitivity: 'low' | 'medium' | 'high';
  autoAdjustPeriodDays: number;
  emailAlertEnabled: boolean;
  alertEmails: string[];
  alertFrequency: 'immediate' | 'hourly' | 'daily';
  isActive: boolean;
}

export interface AlertCheckResult {
  thresholdId: number;
  productionLineId: number | null;
  productionLineName: string;
  alerts: {
    type: 'oee_low' | 'oee_decline' | 'defect_high' | 'defect_increase';
    severity: 'warning' | 'critical' | 'info';
    title: string;
    message: string;
    currentValue: number;
    thresholdValue: number;
    predictedValue: number;
    changePercent?: number;
    recommendations: string[];
  }[];
}

export interface AutoAdjustResult {
  thresholdId: number;
  adjustments: {
    type: 'oee_warning' | 'oee_critical' | 'defect_warning' | 'defect_critical';
    oldValue: number;
    newValue: number;
    reason: string;
    confidenceScore: number;
  }[];
}

// Get all active thresholds
export async function getActiveThresholds(): Promise<ThresholdConfig[]> {
  try {
    const results = await (await getDb())
      .select()
      .from(predictiveAlertThresholds)
      .where(eq(predictiveAlertThresholds.isActive, 1));

    return results.map(r => ({
      id: r.id,
      name: r.name,
      productionLineId: r.productionLineId,
      predictionType: r.predictionType as 'oee' | 'defect_rate' | 'both',
      oeeWarningThreshold: parseFloat(r.oeeWarningThreshold || '75'),
      oeeCriticalThreshold: parseFloat(r.oeeCriticalThreshold || '65'),
      oeeDeclineThreshold: parseFloat(r.oeeDeclineThreshold || '5'),
      defectWarningThreshold: parseFloat(r.defectWarningThreshold || '3'),
      defectCriticalThreshold: parseFloat(r.defectCriticalThreshold || '5'),
      defectIncreaseThreshold: parseFloat(r.defectIncreaseThreshold || '20'),
      autoAdjustEnabled: r.autoAdjustEnabled === 1,
      autoAdjustSensitivity: (r.autoAdjustSensitivity || 'medium') as 'low' | 'medium' | 'high',
      autoAdjustPeriodDays: r.autoAdjustPeriodDays || 30,
      emailAlertEnabled: r.emailAlertEnabled === 1,
      alertEmails: r.alertEmails ? JSON.parse(r.alertEmails) : [],
      alertFrequency: (r.alertFrequency || 'immediate') as 'immediate' | 'hourly' | 'daily',
      isActive: r.isActive === 1,
    }));
  } catch (error) {
    console.error('Error getting active thresholds:', error);
    return [];
  }
}

// Get threshold by ID
export async function getThresholdById(id: number): Promise<ThresholdConfig | null> {
  try {
    const results = await (await getDb())
      .select()
      .from(predictiveAlertThresholds)
      .where(eq(predictiveAlertThresholds.id, id))
      .limit(1);

    if (results.length === 0) return null;

    const r = results[0];
    return {
      id: r.id,
      name: r.name,
      productionLineId: r.productionLineId,
      predictionType: r.predictionType as 'oee' | 'defect_rate' | 'both',
      oeeWarningThreshold: parseFloat(r.oeeWarningThreshold || '75'),
      oeeCriticalThreshold: parseFloat(r.oeeCriticalThreshold || '65'),
      oeeDeclineThreshold: parseFloat(r.oeeDeclineThreshold || '5'),
      defectWarningThreshold: parseFloat(r.defectWarningThreshold || '3'),
      defectCriticalThreshold: parseFloat(r.defectCriticalThreshold || '5'),
      defectIncreaseThreshold: parseFloat(r.defectIncreaseThreshold || '20'),
      autoAdjustEnabled: r.autoAdjustEnabled === 1,
      autoAdjustSensitivity: (r.autoAdjustSensitivity || 'medium') as 'low' | 'medium' | 'high',
      autoAdjustPeriodDays: r.autoAdjustPeriodDays || 30,
      emailAlertEnabled: r.emailAlertEnabled === 1,
      alertEmails: r.alertEmails ? JSON.parse(r.alertEmails) : [],
      alertFrequency: (r.alertFrequency || 'immediate') as 'immediate' | 'hourly' | 'daily',
      isActive: r.isActive === 1,
    };
  } catch (error) {
    console.error('Error getting threshold by ID:', error);
    return null;
  }
}

// Create new threshold
export async function createThreshold(data: Partial<ThresholdConfig> & { name: string }): Promise<number> {
  try {
    const result = await (await getDb()).insert(predictiveAlertThresholds).values({
      name: data.name,
      description: '',
      productionLineId: data.productionLineId || null,
      predictionType: data.predictionType || 'both',
      oeeWarningThreshold: data.oeeWarningThreshold?.toString() || '75.00',
      oeeCriticalThreshold: data.oeeCriticalThreshold?.toString() || '65.00',
      oeeDeclineThreshold: data.oeeDeclineThreshold?.toString() || '5.00',
      defectWarningThreshold: data.defectWarningThreshold?.toString() || '3.00',
      defectCriticalThreshold: data.defectCriticalThreshold?.toString() || '5.00',
      defectIncreaseThreshold: data.defectIncreaseThreshold?.toString() || '20.00',
      autoAdjustEnabled: data.autoAdjustEnabled ? 1 : 0,
      autoAdjustSensitivity: data.autoAdjustSensitivity || 'medium',
      autoAdjustPeriodDays: data.autoAdjustPeriodDays || 30,
      emailAlertEnabled: data.emailAlertEnabled !== false ? 1 : 0,
      alertEmails: data.alertEmails ? JSON.stringify(data.alertEmails) : null,
      alertFrequency: data.alertFrequency || 'immediate',
      isActive: 1,
    });

    return result.insertId;
  } catch (error) {
    console.error('Error creating threshold:', error);
    throw error;
  }
}

// Update threshold
export async function updateThreshold(id: number, data: Partial<ThresholdConfig>): Promise<boolean> {
  try {
    const updateData: any = {};
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.productionLineId !== undefined) updateData.productionLineId = data.productionLineId;
    if (data.predictionType !== undefined) updateData.predictionType = data.predictionType;
    if (data.oeeWarningThreshold !== undefined) updateData.oeeWarningThreshold = data.oeeWarningThreshold.toString();
    if (data.oeeCriticalThreshold !== undefined) updateData.oeeCriticalThreshold = data.oeeCriticalThreshold.toString();
    if (data.oeeDeclineThreshold !== undefined) updateData.oeeDeclineThreshold = data.oeeDeclineThreshold.toString();
    if (data.defectWarningThreshold !== undefined) updateData.defectWarningThreshold = data.defectWarningThreshold.toString();
    if (data.defectCriticalThreshold !== undefined) updateData.defectCriticalThreshold = data.defectCriticalThreshold.toString();
    if (data.defectIncreaseThreshold !== undefined) updateData.defectIncreaseThreshold = data.defectIncreaseThreshold.toString();
    if (data.autoAdjustEnabled !== undefined) updateData.autoAdjustEnabled = data.autoAdjustEnabled ? 1 : 0;
    if (data.autoAdjustSensitivity !== undefined) updateData.autoAdjustSensitivity = data.autoAdjustSensitivity;
    if (data.autoAdjustPeriodDays !== undefined) updateData.autoAdjustPeriodDays = data.autoAdjustPeriodDays;
    if (data.emailAlertEnabled !== undefined) updateData.emailAlertEnabled = data.emailAlertEnabled ? 1 : 0;
    if (data.alertEmails !== undefined) updateData.alertEmails = JSON.stringify(data.alertEmails);
    if (data.alertFrequency !== undefined) updateData.alertFrequency = data.alertFrequency;
    if (data.isActive !== undefined) updateData.isActive = data.isActive ? 1 : 0;

    await (await getDb())
      .update(predictiveAlertThresholds)
      .set(updateData)
      .where(eq(predictiveAlertThresholds.id, id));

    return true;
  } catch (error) {
    console.error('Error updating threshold:', error);
    return false;
  }
}

// Delete threshold
export async function deleteThreshold(id: number): Promise<boolean> {
  try {
    await (await getDb())
      .delete(predictiveAlertThresholds)
      .where(eq(predictiveAlertThresholds.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting threshold:', error);
    return false;
  }
}

// Check alerts for a threshold
export async function checkThresholdAlerts(threshold: ThresholdConfig): Promise<AlertCheckResult> {
  const alerts: AlertCheckResult['alerts'] = [];
  
  // Get production line name
  let productionLineName = 'Tất cả dây chuyền';
  if (threshold.productionLineId) {
    const lines = await (await getDb())
      .select()
      .from(productionLines)
      .where(eq(productionLines.id, threshold.productionLineId))
      .limit(1);
    if (lines.length > 0) {
      productionLineName = lines[0].name;
    }
  }

  // Check OEE alerts
  if (threshold.predictionType === 'oee' || threshold.predictionType === 'both') {
    try {
      const oeeForecast = await forecastOEE(threshold.productionLineId, null, {
        algorithm: 'holt_winters',
        forecastDays: 7,
        confidenceLevel: 95,
        seasonalPeriod: 7,
      });

      const currentOee = oeeForecast.historicalData.length > 0
        ? oeeForecast.historicalData[oeeForecast.historicalData.length - 1].oee
        : 85;

      const predictedOee = oeeForecast.forecastData.length > 0
        ? oeeForecast.forecastData.reduce((sum, d) => sum + d.predictedOEE, 0) / oeeForecast.forecastData.length
        : currentOee;

      // Check OEE low threshold
      if (predictedOee < threshold.oeeCriticalThreshold) {
        alerts.push({
          type: 'oee_low',
          severity: 'critical',
          title: `OEE dự báo nghiêm trọng thấp - ${productionLineName}`,
          message: `OEE dự báo (${predictedOee.toFixed(1)}%) thấp hơn ngưỡng nghiêm trọng (${threshold.oeeCriticalThreshold}%)`,
          currentValue: currentOee,
          thresholdValue: threshold.oeeCriticalThreshold,
          predictedValue: predictedOee,
          recommendations: [
            'Kiểm tra và bảo trì thiết bị ngay lập tức',
            'Xem xét tăng cường nhân lực vận hành',
            'Phân tích nguyên nhân gốc rễ của sự suy giảm',
          ],
        });
      } else if (predictedOee < threshold.oeeWarningThreshold) {
        alerts.push({
          type: 'oee_low',
          severity: 'warning',
          title: `Cảnh báo OEE dự báo thấp - ${productionLineName}`,
          message: `OEE dự báo (${predictedOee.toFixed(1)}%) thấp hơn ngưỡng cảnh báo (${threshold.oeeWarningThreshold}%)`,
          currentValue: currentOee,
          thresholdValue: threshold.oeeWarningThreshold,
          predictedValue: predictedOee,
          recommendations: [
            'Lên kế hoạch bảo trì phòng ngừa',
            'Theo dõi chặt chẽ hiệu suất thiết bị',
            'Xem xét tối ưu hóa quy trình sản xuất',
          ],
        });
      }

      // Check OEE decline
      const weekAgoOee = oeeForecast.historicalData.length >= 7
        ? oeeForecast.historicalData.slice(-7, -1).reduce((sum, d) => sum + d.oee, 0) / 6
        : currentOee;

      const oeeDecline = ((weekAgoOee - predictedOee) / weekAgoOee) * 100;
      if (oeeDecline > threshold.oeeDeclineThreshold) {
        alerts.push({
          type: 'oee_decline',
          severity: 'warning',
          title: `OEE dự báo giảm mạnh - ${productionLineName}`,
          message: `OEE dự báo giảm ${oeeDecline.toFixed(1)}% so với tuần trước (ngưỡng: ${threshold.oeeDeclineThreshold}%)`,
          currentValue: currentOee,
          thresholdValue: threshold.oeeDeclineThreshold,
          predictedValue: predictedOee,
          changePercent: oeeDecline,
          recommendations: [
            'Phân tích xu hướng suy giảm',
            'Kiểm tra các yếu tố ảnh hưởng đến hiệu suất',
            'Xem xét điều chỉnh kế hoạch sản xuất',
          ],
        });
      }
    } catch (error) {
      console.error('Error checking OEE alerts:', error);
    }
  }

  // Check Defect Rate alerts
  if (threshold.predictionType === 'defect_rate' || threshold.predictionType === 'both') {
    try {
      const defectPrediction = await predictDefectRate(null, null, {
        algorithm: 'ensemble',
        forecastDays: 7,
        confidenceLevel: 95,
        threshold: 0.05,
      });

      const currentDefectRate = defectPrediction.historicalData.length > 0
        ? defectPrediction.historicalData[defectPrediction.historicalData.length - 1].defectRate
        : 2.5;

      const predictedDefectRate = defectPrediction.forecastData.length > 0
        ? defectPrediction.forecastData.reduce((sum, d) => sum + d.predictedDefectRate, 0) / defectPrediction.forecastData.length
        : currentDefectRate;

      // Check Defect Rate high threshold
      if (predictedDefectRate > threshold.defectCriticalThreshold) {
        alerts.push({
          type: 'defect_high',
          severity: 'critical',
          title: `Tỷ lệ lỗi dự báo nghiêm trọng cao - ${productionLineName}`,
          message: `Tỷ lệ lỗi dự báo (${predictedDefectRate.toFixed(2)}%) cao hơn ngưỡng nghiêm trọng (${threshold.defectCriticalThreshold}%)`,
          currentValue: currentDefectRate,
          thresholdValue: threshold.defectCriticalThreshold,
          predictedValue: predictedDefectRate,
          recommendations: [
            'Dừng sản xuất và kiểm tra chất lượng ngay lập tức',
            'Xác định và xử lý nguyên nhân gốc rễ',
            'Tăng cường kiểm tra chất lượng đầu vào',
          ],
        });
      } else if (predictedDefectRate > threshold.defectWarningThreshold) {
        alerts.push({
          type: 'defect_high',
          severity: 'warning',
          title: `Cảnh báo tỷ lệ lỗi dự báo cao - ${productionLineName}`,
          message: `Tỷ lệ lỗi dự báo (${predictedDefectRate.toFixed(2)}%) cao hơn ngưỡng cảnh báo (${threshold.defectWarningThreshold}%)`,
          currentValue: currentDefectRate,
          thresholdValue: threshold.defectWarningThreshold,
          predictedValue: predictedDefectRate,
          recommendations: [
            'Tăng tần suất kiểm tra chất lượng',
            'Xem xét điều chỉnh thông số quy trình',
            'Đào tạo lại nhân viên về tiêu chuẩn chất lượng',
          ],
        });
      }

      // Check Defect Rate increase
      const weekAgoDefectRate = defectPrediction.historicalData.length >= 7
        ? defectPrediction.historicalData.slice(-7, -1).reduce((sum, d) => sum + d.defectRate, 0) / 6
        : currentDefectRate;

      const defectIncrease = weekAgoDefectRate > 0
        ? ((predictedDefectRate - weekAgoDefectRate) / weekAgoDefectRate) * 100
        : 0;

      if (defectIncrease > threshold.defectIncreaseThreshold) {
        alerts.push({
          type: 'defect_increase',
          severity: 'warning',
          title: `Tỷ lệ lỗi dự báo tăng mạnh - ${productionLineName}`,
          message: `Tỷ lệ lỗi dự báo tăng ${defectIncrease.toFixed(1)}% so với tuần trước (ngưỡng: ${threshold.defectIncreaseThreshold}%)`,
          currentValue: currentDefectRate,
          thresholdValue: threshold.defectIncreaseThreshold,
          predictedValue: predictedDefectRate,
          changePercent: defectIncrease,
          recommendations: [
            'Phân tích xu hướng tăng tỷ lệ lỗi',
            'Kiểm tra các thay đổi gần đây trong quy trình',
            'Xem xét điều chỉnh nguyên vật liệu đầu vào',
          ],
        });
      }
    } catch (error) {
      console.error('Error checking defect rate alerts:', error);
    }
  }

  return {
    thresholdId: threshold.id,
    productionLineId: threshold.productionLineId,
    productionLineName,
    alerts,
  };
}

// Save alert to history
export async function saveAlertHistory(
  thresholdId: number,
  productionLineId: number | null,
  alert: AlertCheckResult['alerts'][0]
): Promise<number> {
  try {
    const result = await (await getDb()).insert(predictiveAlertHistory).values({
      thresholdId,
      productionLineId,
      alertType: alert.type,
      severity: alert.severity,
      currentValue: alert.currentValue.toString(),
      thresholdValue: alert.thresholdValue.toString(),
      predictedValue: alert.predictedValue.toString(),
      changePercent: alert.changePercent?.toString() || null,
      title: alert.title,
      message: alert.message,
      recommendations: JSON.stringify(alert.recommendations),
      status: 'pending',
    });

    return result.insertId;
  } catch (error) {
    console.error('Error saving alert history:', error);
    throw error;
  }
}

// Get alert history
export async function getAlertHistory(options: {
  thresholdId?: number;
  productionLineId?: number;
  status?: 'pending' | 'sent' | 'acknowledged' | 'resolved';
  severity?: 'warning' | 'critical' | 'info';
  limit?: number;
  offset?: number;
}): Promise<PredictiveAlertHistory[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    let query = db.select().from(predictiveAlertHistory);
    const conditions = [];

    if (options.thresholdId) {
      conditions.push(eq(predictiveAlertHistory.thresholdId, options.thresholdId));
    }
    if (options.productionLineId) {
      conditions.push(eq(predictiveAlertHistory.productionLineId, options.productionLineId));
    }
    if (options.status) {
      conditions.push(eq(predictiveAlertHistory.status, options.status));
    }
    if (options.severity) {
      conditions.push(eq(predictiveAlertHistory.severity, options.severity));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const results = await query
      .orderBy(desc(predictiveAlertHistory.createdAt))
      .limit(options.limit || 50)
      .offset(options.offset || 0);

    return results;
  } catch (error) {
    console.error('Error getting alert history:', error);
    return [];
  }
}

// Acknowledge alert
export async function acknowledgeAlert(alertId: number, userId: number): Promise<boolean> {
  try {
    await (await getDb())
      .update(predictiveAlertHistory)
      .set({
        status: 'acknowledged',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      })
      .where(eq(predictiveAlertHistory.id, alertId));
    return true;
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return false;
  }
}

// Resolve alert
export async function resolveAlert(
  alertId: number, 
  userId: number, 
  notes: string
): Promise<boolean> {
  try {
    await (await getDb())
      .update(predictiveAlertHistory)
      .set({
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNotes: notes,
      })
      .where(eq(predictiveAlertHistory.id, alertId));
    return true;
  } catch (error) {
    console.error('Error resolving alert:', error);
    return false;
  }
}

// Auto-adjust thresholds based on historical data
export async function autoAdjustThresholds(threshold: ThresholdConfig): Promise<AutoAdjustResult> {
  const adjustments: AutoAdjustResult['adjustments'] = [];

  if (!threshold.autoAdjustEnabled) {
    return { thresholdId: threshold.id, adjustments };
  }

  // Calculate sensitivity multiplier
  const sensitivityMultiplier = {
    low: 1.5,
    medium: 1.0,
    high: 0.5,
  }[threshold.autoAdjustSensitivity];

  try {
    // Get historical OEE data
    const oeeForecast = await forecastOEE(threshold.productionLineId, null, {
      algorithm: 'holt_winters',
      forecastDays: 7,
      confidenceLevel: 95,
      seasonalPeriod: 7,
    });

    if (oeeForecast.historicalData.length >= threshold.autoAdjustPeriodDays) {
      const oeeValues = oeeForecast.historicalData.slice(-threshold.autoAdjustPeriodDays).map(d => d.oee);
      const oeeAvg = oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length;
      const oeeStd = Math.sqrt(oeeValues.reduce((sum, v) => sum + Math.pow(v - oeeAvg, 2), 0) / oeeValues.length);

      // Calculate new warning threshold (avg - 1*std * sensitivity)
      const newOeeWarning = Math.round((oeeAvg - oeeStd * sensitivityMultiplier) * 100) / 100;
      if (Math.abs(newOeeWarning - threshold.oeeWarningThreshold) > 2) {
        adjustments.push({
          type: 'oee_warning',
          oldValue: threshold.oeeWarningThreshold,
          newValue: newOeeWarning,
          reason: `Dựa trên ${oeeValues.length} điểm dữ liệu, OEE trung bình: ${oeeAvg.toFixed(1)}%, độ lệch chuẩn: ${oeeStd.toFixed(1)}%`,
          confidenceScore: Math.min(0.95, oeeValues.length / 100),
        });
      }

      // Calculate new critical threshold (avg - 2*std * sensitivity)
      const newOeeCritical = Math.round((oeeAvg - 2 * oeeStd * sensitivityMultiplier) * 100) / 100;
      if (Math.abs(newOeeCritical - threshold.oeeCriticalThreshold) > 2) {
        adjustments.push({
          type: 'oee_critical',
          oldValue: threshold.oeeCriticalThreshold,
          newValue: newOeeCritical,
          reason: `Dựa trên ${oeeValues.length} điểm dữ liệu, OEE trung bình: ${oeeAvg.toFixed(1)}%, độ lệch chuẩn: ${oeeStd.toFixed(1)}%`,
          confidenceScore: Math.min(0.95, oeeValues.length / 100),
        });
      }
    }

    // Get historical defect rate data
    const defectPrediction = await predictDefectRate(null, null, {
      algorithm: 'ensemble',
      forecastDays: 7,
      confidenceLevel: 95,
      threshold: 0.05,
    });

    if (defectPrediction.historicalData.length >= threshold.autoAdjustPeriodDays) {
      const defectValues = defectPrediction.historicalData.slice(-threshold.autoAdjustPeriodDays).map(d => d.defectRate);
      const defectAvg = defectValues.reduce((a, b) => a + b, 0) / defectValues.length;
      const defectStd = Math.sqrt(defectValues.reduce((sum, v) => sum + Math.pow(v - defectAvg, 2), 0) / defectValues.length);

      // Calculate new warning threshold (avg + 1*std * sensitivity)
      const newDefectWarning = Math.round((defectAvg + defectStd * sensitivityMultiplier) * 100) / 100;
      if (Math.abs(newDefectWarning - threshold.defectWarningThreshold) > 0.5) {
        adjustments.push({
          type: 'defect_warning',
          oldValue: threshold.defectWarningThreshold,
          newValue: newDefectWarning,
          reason: `Dựa trên ${defectValues.length} điểm dữ liệu, tỷ lệ lỗi trung bình: ${defectAvg.toFixed(2)}%, độ lệch chuẩn: ${defectStd.toFixed(2)}%`,
          confidenceScore: Math.min(0.95, defectValues.length / 100),
        });
      }

      // Calculate new critical threshold (avg + 2*std * sensitivity)
      const newDefectCritical = Math.round((defectAvg + 2 * defectStd * sensitivityMultiplier) * 100) / 100;
      if (Math.abs(newDefectCritical - threshold.defectCriticalThreshold) > 0.5) {
        adjustments.push({
          type: 'defect_critical',
          oldValue: threshold.defectCriticalThreshold,
          newValue: newDefectCritical,
          reason: `Dựa trên ${defectValues.length} điểm dữ liệu, tỷ lệ lỗi trung bình: ${defectAvg.toFixed(2)}%, độ lệch chuẩn: ${defectStd.toFixed(2)}%`,
          confidenceScore: Math.min(0.95, defectValues.length / 100),
        });
      }
    }

    // Apply adjustments and log
    for (const adj of adjustments) {
      // Update threshold
      const updateData: any = {};
      if (adj.type === 'oee_warning') updateData.oeeWarningThreshold = adj.newValue.toString();
      if (adj.type === 'oee_critical') updateData.oeeCriticalThreshold = adj.newValue.toString();
      if (adj.type === 'defect_warning') updateData.defectWarningThreshold = adj.newValue.toString();
      if (adj.type === 'defect_critical') updateData.defectCriticalThreshold = adj.newValue.toString();
      updateData.lastAutoAdjustAt = new Date();

      await (await getDb())
        .update(predictiveAlertThresholds)
        .set(updateData)
        .where(eq(predictiveAlertThresholds.id, threshold.id));

      // Log adjustment
      await (await getDb()).insert(predictiveAlertAdjustmentLogs).values({
        thresholdId: threshold.id,
        adjustType: adj.type,
        oldValue: adj.oldValue.toString(),
        newValue: adj.newValue.toString(),
        reason: adj.reason,
        dataPointsUsed: threshold.autoAdjustPeriodDays,
        confidenceScore: adj.confidenceScore.toString(),
      });
    }
  } catch (error) {
    console.error('Error auto-adjusting thresholds:', error);
  }

  return { thresholdId: threshold.id, adjustments };
}

// Get adjustment logs
export async function getAdjustmentLogs(thresholdId: number, limit: number = 20) {
  try {
    return await (await getDb())
      .select()
      .from(predictiveAlertAdjustmentLogs)
      .where(eq(predictiveAlertAdjustmentLogs.thresholdId, thresholdId))
      .orderBy(desc(predictiveAlertAdjustmentLogs.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Error getting adjustment logs:', error);
    return [];
  }
}

// Run alert check for all active thresholds
export async function runAlertCheck(): Promise<AlertCheckResult[]> {
  const thresholds = await getActiveThresholds();
  const results: AlertCheckResult[] = [];

  for (const threshold of thresholds) {
    const result = await checkThresholdAlerts(threshold);
    results.push(result);

    // Save alerts to history
    for (const alert of result.alerts) {
      await saveAlertHistory(threshold.id, threshold.productionLineId, alert);
    }

    // Check if auto-adjust is needed
    if (threshold.autoAdjustEnabled) {
      await autoAdjustThresholds(threshold);
    }
  }

  return results;
}


// Get forecast history data for accuracy comparison
export async function getForecastHistoryData(options: {
  days?: number;
  metricType?: 'cpk' | 'oee' | 'defect_rate';
  productionLineId?: number;
}): Promise<any[]> {
  try {
    const { forecastHistory } = await import("../../drizzle/schema");
    const db = await getDb();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (options.days || 30));

    const conditions: any[] = [
      gte(forecastHistory.forecastDate, startDate)
    ];

    if (options.metricType) {
      conditions.push(eq(forecastHistory.metricType, options.metricType));
    }

    if (options.productionLineId) {
      conditions.push(eq(forecastHistory.productionLineId, options.productionLineId));
    }

    const results = await db
      .select()
      .from(forecastHistory)
      .where(and(...conditions))
      .orderBy(desc(forecastHistory.forecastDate));

    return results.map(r => ({
      id: r.id,
      productionLineId: r.productionLineId,
      metricType: r.metricType,
      forecastDate: r.forecastDate,
      forecastCreatedAt: r.forecastCreatedAt,
      predictedValue: r.predictedValue ? parseFloat(r.predictedValue) : null,
      upperBound: r.upperBound ? parseFloat(r.upperBound) : null,
      lowerBound: r.lowerBound ? parseFloat(r.lowerBound) : null,
      confidenceLevel: r.confidenceLevel ? parseFloat(r.confidenceLevel) : 95,
      actualValue: r.actualValue ? parseFloat(r.actualValue) : null,
      actualRecordedAt: r.actualRecordedAt,
      absoluteError: r.absoluteError ? parseFloat(r.absoluteError) : null,
      percentageError: r.percentageError ? parseFloat(r.percentageError) : null,
      modelVersion: r.modelVersion,
      modelType: r.modelType,
    }));
  } catch (error) {
    console.error('Error getting forecast history:', error);
    return [];
  }
}

// Save forecast to history
export async function saveForecastToHistory(data: {
  productionLineId?: number;
  metricType: 'cpk' | 'oee' | 'defect_rate';
  forecastDate: Date;
  predictedValue: number;
  upperBound?: number;
  lowerBound?: number;
  confidenceLevel?: number;
  modelVersion?: string;
  modelType?: string;
}): Promise<number | null> {
  try {
    const { forecastHistory } = await import("../../drizzle/schema");
    const db = await getDb();

    const result = await db.insert(forecastHistory).values({
      productionLineId: data.productionLineId || null,
      metricType: data.metricType,
      forecastDate: data.forecastDate,
      forecastCreatedAt: new Date(),
      predictedValue: data.predictedValue.toString(),
      upperBound: data.upperBound?.toString() || null,
      lowerBound: data.lowerBound?.toString() || null,
      confidenceLevel: (data.confidenceLevel || 95).toString(),
      modelVersion: data.modelVersion || null,
      modelType: data.modelType || null,
    });

    return result[0]?.insertId || null;
  } catch (error) {
    console.error('Error saving forecast to history:', error);
    return null;
  }
}

// Update forecast with actual value
export async function updateForecastWithActual(
  forecastId: number,
  actualValue: number
): Promise<boolean> {
  try {
    const { forecastHistory } = await import("../../drizzle/schema");
    const db = await getDb();

    // Get the forecast record
    const [forecast] = await db
      .select()
      .from(forecastHistory)
      .where(eq(forecastHistory.id, forecastId));

    if (!forecast) return false;

    const predictedValue = parseFloat(forecast.predictedValue);
    const absoluteError = Math.abs(actualValue - predictedValue);
    const percentageError = predictedValue !== 0 
      ? (absoluteError / Math.abs(predictedValue)) * 100 
      : 0;

    await db
      .update(forecastHistory)
      .set({
        actualValue: actualValue.toString(),
        actualRecordedAt: new Date(),
        absoluteError: absoluteError.toString(),
        percentageError: percentageError.toString(),
      })
      .where(eq(forecastHistory.id, forecastId));

    return true;
  } catch (error) {
    console.error('Error updating forecast with actual:', error);
    return false;
  }
}
