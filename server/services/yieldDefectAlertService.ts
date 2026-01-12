/**
 * Service cảnh báo tự động cho Yield Rate và Defect Rate
 */

import { db } from '../db';
import { notifyOwner } from '../_core/notification';

export interface AlertThreshold {
  id?: number;
  productionLineId?: number;
  yieldWarningThreshold: number;      // % - cảnh báo khi yield < ngưỡng này
  yieldCriticalThreshold: number;     // % - cảnh báo nghiêm trọng khi yield < ngưỡng này
  defectWarningThreshold: number;     // % - cảnh báo khi defect > ngưỡng này
  defectCriticalThreshold: number;    // % - cảnh báo nghiêm trọng khi defect > ngưỡng này
  yieldDropThreshold: number;         // % - cảnh báo khi yield giảm đột ngột > ngưỡng này
  defectSpikeThreshold: number;       // % - cảnh báo khi defect tăng đột ngột > ngưỡng này
  cooldownMinutes: number;            // Thời gian chờ giữa các cảnh báo cùng loại
  enabled: boolean;
  notifyEmail: boolean;
  notifyWebSocket: boolean;
  notifyPush: boolean;
  emailRecipients: string[];
}

export interface AlertEvent {
  id?: number;
  type: 'yield_low' | 'yield_critical' | 'defect_high' | 'defect_critical' | 'yield_drop' | 'defect_spike';
  severity: 'warning' | 'critical';
  productionLineId?: number;
  productionLineName?: string;
  currentValue: number;
  previousValue?: number;
  threshold: number;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// Default thresholds
export const DEFAULT_THRESHOLDS: AlertThreshold = {
  yieldWarningThreshold: 95,
  yieldCriticalThreshold: 90,
  defectWarningThreshold: 3,
  defectCriticalThreshold: 5,
  yieldDropThreshold: 5,      // Cảnh báo khi yield giảm > 5% so với trung bình
  defectSpikeThreshold: 50,   // Cảnh báo khi defect tăng > 50% so với trung bình
  cooldownMinutes: 30,
  enabled: true,
  notifyEmail: true,
  notifyWebSocket: true,
  notifyPush: true,
  emailRecipients: [],
};

// In-memory cache for recent values (for trend detection)
const recentValues: Map<number, { yieldRates: number[]; defectRates: number[]; timestamps: number[] }> = new Map();
const lastAlerts: Map<string, number> = new Map(); // key: alertType_lineId, value: timestamp

/**
 * Kiểm tra và tạo cảnh báo dựa trên dữ liệu mới
 */
export async function checkAndCreateAlerts(
  productionLineId: number,
  productionLineName: string,
  yieldRate: number,
  defectRate: number,
  thresholds: AlertThreshold = DEFAULT_THRESHOLDS
): Promise<AlertEvent[]> {
  if (!thresholds.enabled) {
    return [];
  }

  const alerts: AlertEvent[] = [];
  const now = Date.now();

  // Update recent values cache
  if (!recentValues.has(productionLineId)) {
    recentValues.set(productionLineId, { yieldRates: [], defectRates: [], timestamps: [] });
  }
  const cache = recentValues.get(productionLineId)!;
  cache.yieldRates.push(yieldRate);
  cache.defectRates.push(defectRate);
  cache.timestamps.push(now);

  // Keep only last 60 values (1 hour at 1 value/minute)
  if (cache.yieldRates.length > 60) {
    cache.yieldRates.shift();
    cache.defectRates.shift();
    cache.timestamps.shift();
  }

  // Check cooldown
  const canAlert = (alertType: string): boolean => {
    const key = `${alertType}_${productionLineId}`;
    const lastAlert = lastAlerts.get(key);
    if (!lastAlert) return true;
    return (now - lastAlert) > thresholds.cooldownMinutes * 60 * 1000;
  };

  const recordAlert = (alertType: string) => {
    lastAlerts.set(`${alertType}_${productionLineId}`, now);
  };

  // Check yield rate thresholds
  if (yieldRate < thresholds.yieldCriticalThreshold && canAlert('yield_critical')) {
    alerts.push({
      type: 'yield_critical',
      severity: 'critical',
      productionLineId,
      productionLineName,
      currentValue: yieldRate,
      threshold: thresholds.yieldCriticalThreshold,
      message: `🚨 CRITICAL: Yield Rate (${yieldRate.toFixed(2)}%) dưới ngưỡng nghiêm trọng (${thresholds.yieldCriticalThreshold}%) tại ${productionLineName}`,
      timestamp: new Date(),
      acknowledged: false,
    });
    recordAlert('yield_critical');
  } else if (yieldRate < thresholds.yieldWarningThreshold && canAlert('yield_low')) {
    alerts.push({
      type: 'yield_low',
      severity: 'warning',
      productionLineId,
      productionLineName,
      currentValue: yieldRate,
      threshold: thresholds.yieldWarningThreshold,
      message: `⚠️ WARNING: Yield Rate (${yieldRate.toFixed(2)}%) dưới ngưỡng cảnh báo (${thresholds.yieldWarningThreshold}%) tại ${productionLineName}`,
      timestamp: new Date(),
      acknowledged: false,
    });
    recordAlert('yield_low');
  }

  // Check defect rate thresholds
  if (defectRate > thresholds.defectCriticalThreshold && canAlert('defect_critical')) {
    alerts.push({
      type: 'defect_critical',
      severity: 'critical',
      productionLineId,
      productionLineName,
      currentValue: defectRate,
      threshold: thresholds.defectCriticalThreshold,
      message: `🚨 CRITICAL: Defect Rate (${defectRate.toFixed(2)}%) vượt ngưỡng nghiêm trọng (${thresholds.defectCriticalThreshold}%) tại ${productionLineName}`,
      timestamp: new Date(),
      acknowledged: false,
    });
    recordAlert('defect_critical');
  } else if (defectRate > thresholds.defectWarningThreshold && canAlert('defect_high')) {
    alerts.push({
      type: 'defect_high',
      severity: 'warning',
      productionLineId,
      productionLineName,
      currentValue: defectRate,
      threshold: thresholds.defectWarningThreshold,
      message: `⚠️ WARNING: Defect Rate (${defectRate.toFixed(2)}%) vượt ngưỡng cảnh báo (${thresholds.defectWarningThreshold}%) tại ${productionLineName}`,
      timestamp: new Date(),
      acknowledged: false,
    });
    recordAlert('defect_high');
  }

  // Check for sudden drops/spikes (need at least 10 data points)
  if (cache.yieldRates.length >= 10) {
    const recentYield = cache.yieldRates.slice(-5);
    const previousYield = cache.yieldRates.slice(-10, -5);
    const avgRecent = recentYield.reduce((a, b) => a + b, 0) / recentYield.length;
    const avgPrevious = previousYield.reduce((a, b) => a + b, 0) / previousYield.length;
    
    const yieldDrop = avgPrevious - avgRecent;
    if (yieldDrop > thresholds.yieldDropThreshold && canAlert('yield_drop')) {
      alerts.push({
        type: 'yield_drop',
        severity: 'warning',
        productionLineId,
        productionLineName,
        currentValue: avgRecent,
        previousValue: avgPrevious,
        threshold: thresholds.yieldDropThreshold,
        message: `📉 TREND: Yield Rate giảm đột ngột ${yieldDrop.toFixed(2)}% (${avgPrevious.toFixed(2)}% → ${avgRecent.toFixed(2)}%) tại ${productionLineName}`,
        timestamp: new Date(),
        acknowledged: false,
      });
      recordAlert('yield_drop');
    }

    const recentDefect = cache.defectRates.slice(-5);
    const previousDefect = cache.defectRates.slice(-10, -5);
    const avgRecentDefect = recentDefect.reduce((a, b) => a + b, 0) / recentDefect.length;
    const avgPreviousDefect = previousDefect.reduce((a, b) => a + b, 0) / previousDefect.length;
    
    const defectIncrease = avgPreviousDefect > 0 
      ? ((avgRecentDefect - avgPreviousDefect) / avgPreviousDefect) * 100 
      : 0;
    if (defectIncrease > thresholds.defectSpikeThreshold && canAlert('defect_spike')) {
      alerts.push({
        type: 'defect_spike',
        severity: 'warning',
        productionLineId,
        productionLineName,
        currentValue: avgRecentDefect,
        previousValue: avgPreviousDefect,
        threshold: thresholds.defectSpikeThreshold,
        message: `📈 TREND: Defect Rate tăng đột biến ${defectIncrease.toFixed(0)}% (${avgPreviousDefect.toFixed(2)}% → ${avgRecentDefect.toFixed(2)}%) tại ${productionLineName}`,
        timestamp: new Date(),
        acknowledged: false,
      });
      recordAlert('defect_spike');
    }
  }

  // Send notifications for alerts
  for (const alert of alerts) {
    if (thresholds.notifyEmail && thresholds.emailRecipients.length > 0) {
      // Send email notification (implementation depends on email service)
      console.log(`[YieldDefectAlert] Email notification: ${alert.message}`);
    }

    // Notify owner for critical alerts
    if (alert.severity === 'critical') {
      try {
        await notifyOwner({
          title: `🚨 Cảnh báo ${alert.type === 'yield_critical' ? 'Yield Rate' : 'Defect Rate'}`,
          content: alert.message,
        });
      } catch (error) {
        console.error('[YieldDefectAlert] Failed to notify owner:', error);
      }
    }
  }

  return alerts;
}

/**
 * Lấy thống kê cảnh báo
 */
export function getAlertStatistics(productionLineId?: number): {
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  lastAlertTime: Date | null;
} {
  // This would typically query from database
  return {
    totalAlerts: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
    lastAlertTime: null,
  };
}

/**
 * Xóa cache cho production line
 */
export function clearCache(productionLineId?: number): void {
  if (productionLineId) {
    recentValues.delete(productionLineId);
    // Clear related alerts
    for (const key of lastAlerts.keys()) {
      if (key.endsWith(`_${productionLineId}`)) {
        lastAlerts.delete(key);
      }
    }
  } else {
    recentValues.clear();
    lastAlerts.clear();
  }
}

export default {
  checkAndCreateAlerts,
  getAlertStatistics,
  clearCache,
  DEFAULT_THRESHOLDS,
};
