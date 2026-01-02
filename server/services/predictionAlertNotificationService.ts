import { getDb } from "../db";
import { 
  aiPredictionThresholds, 
  aiPredictionHistory,
  users 
} from "../../drizzle/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { broadcastEvent } from "../sse";

/**
 * Prediction Alert Notification Service
 * Handles push notifications when AI predictions exceed configured thresholds
 */

interface ThresholdConfig {
  cpkWarning: number;
  cpkCritical: number;
  oeeWarning: number;
  oeeCritical: number;
  trendDeclineWarning: number;
  trendDeclineCritical: number;
  emailAlertEnabled: boolean;
  alertEmails: string | null;
  webhookEnabled: boolean;
  webhookUrl: string | null;
}

interface PredictionAlertResult {
  alertType: "warning" | "critical" | "info";
  metric: "cpk" | "oee" | "trend";
  currentValue: number;
  threshold: number;
  message: string;
  notificationSent: boolean;
}

// Get effective threshold for a context
export async function getEffectiveThreshold(
  productId?: number,
  productionLineId?: number,
  workstationId?: number
): Promise<ThresholdConfig> {
  const db = await getDb();
  
  // Default thresholds
  const defaultConfig: ThresholdConfig = {
    cpkWarning: 1.33,
    cpkCritical: 1.0,
    oeeWarning: 75,
    oeeCritical: 60,
    trendDeclineWarning: 5,
    trendDeclineCritical: 10,
    emailAlertEnabled: true,
    alertEmails: null,
    webhookEnabled: false,
    webhookUrl: null,
  };

  if (!db) return defaultConfig;

  try {
    const results = await db.select()
      .from(aiPredictionThresholds)
      .where(eq(aiPredictionThresholds.isActive, 1))
      .orderBy(desc(aiPredictionThresholds.priority));

    let bestMatch = null;
    let bestScore = -1;

    for (const threshold of results) {
      let score = 0;
      
      if (workstationId && threshold.workstationId === workstationId) {
        score += 100;
      } else if (threshold.workstationId && threshold.workstationId !== workstationId) {
        continue;
      }
      
      if (productId && threshold.productId === productId) {
        score += 50;
      } else if (threshold.productId && threshold.productId !== productId) {
        continue;
      }
      
      if (productionLineId && threshold.productionLineId === productionLineId) {
        score += 25;
      } else if (threshold.productionLineId && threshold.productionLineId !== productionLineId) {
        continue;
      }
      
      if (!threshold.workstationId && !threshold.productId && !threshold.productionLineId) {
        score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = threshold;
      }
    }

    if (bestMatch) {
      return {
        cpkWarning: parseFloat(bestMatch.cpkWarning || "1.33"),
        cpkCritical: parseFloat(bestMatch.cpkCritical || "1.0"),
        oeeWarning: parseFloat(bestMatch.oeeWarning || "75"),
        oeeCritical: parseFloat(bestMatch.oeeCritical || "60"),
        trendDeclineWarning: parseFloat(bestMatch.trendDeclineWarning || "5"),
        trendDeclineCritical: parseFloat(bestMatch.trendDeclineCritical || "10"),
        emailAlertEnabled: bestMatch.emailAlertEnabled === 1,
        alertEmails: bestMatch.alertEmails,
        webhookEnabled: bestMatch.webhookEnabled === 1,
        webhookUrl: bestMatch.webhookUrl,
      };
    }

    return defaultConfig;
  } catch (error) {
    console.error("[PredictionAlert] Error getting threshold:", error);
    return defaultConfig;
  }
}

// Check and send notification for CPK prediction
export async function checkCpkPredictionAlert(
  predictedCpk: number,
  currentCpk: number,
  productCode: string,
  stationName: string,
  productId?: number,
  productionLineId?: number,
  workstationId?: number
): Promise<PredictionAlertResult | null> {
  const threshold = await getEffectiveThreshold(productId, productionLineId, workstationId);
  
  let alertType: "warning" | "critical" | "info" | null = null;
  let thresholdValue = 0;
  let message = "";

  // Check critical threshold
  if (predictedCpk < threshold.cpkCritical) {
    alertType = "critical";
    thresholdValue = threshold.cpkCritical;
    message = `🚨 CẢNH BÁO NGHIÊM TRỌNG: CPK dự đoán (${predictedCpk.toFixed(3)}) thấp hơn ngưỡng critical (${threshold.cpkCritical}) cho sản phẩm ${productCode} tại trạm ${stationName}`;
  }
  // Check warning threshold
  else if (predictedCpk < threshold.cpkWarning) {
    alertType = "warning";
    thresholdValue = threshold.cpkWarning;
    message = `⚠️ CẢNH BÁO: CPK dự đoán (${predictedCpk.toFixed(3)}) thấp hơn ngưỡng warning (${threshold.cpkWarning}) cho sản phẩm ${productCode} tại trạm ${stationName}`;
  }
  // Check trend decline
  else if (currentCpk > 0) {
    const declinePercent = ((currentCpk - predictedCpk) / currentCpk) * 100;
    if (declinePercent >= threshold.trendDeclineCritical) {
      alertType = "critical";
      thresholdValue = threshold.trendDeclineCritical;
      message = `🚨 CẢNH BÁO: CPK dự đoán giảm ${declinePercent.toFixed(1)}% (vượt ngưỡng ${threshold.trendDeclineCritical}%) cho sản phẩm ${productCode}`;
    } else if (declinePercent >= threshold.trendDeclineWarning) {
      alertType = "warning";
      thresholdValue = threshold.trendDeclineWarning;
      message = `⚠️ CẢNH BÁO: CPK dự đoán giảm ${declinePercent.toFixed(1)}% (vượt ngưỡng ${threshold.trendDeclineWarning}%) cho sản phẩm ${productCode}`;
    }
  }

  if (!alertType) return null;

  // Send notifications
  let notificationSent = false;

  // Send SSE notification
  try {
    broadcastEvent({
      type: "prediction_alert",
      data: {
        alertType,
        metric: "cpk",
        predictedValue: predictedCpk,
        currentValue: currentCpk,
        threshold: thresholdValue,
        productCode,
        stationName,
        message,
        timestamp: new Date().toISOString(),
      },
    });
    notificationSent = true;
  } catch (error) {
    console.error("[PredictionAlert] SSE broadcast error:", error);
  }

  // Send owner notification for critical alerts
  if (alertType === "critical" && threshold.emailAlertEnabled) {
    try {
      await notifyOwner({
        title: `🚨 AI Prediction Alert - CPK Critical`,
        content: `${message}\n\nCPK hiện tại: ${currentCpk.toFixed(3)}\nCPK dự đoán: ${predictedCpk.toFixed(3)}\nNgưỡng: ${thresholdValue}`,
      });
      notificationSent = true;
    } catch (error) {
      console.error("[PredictionAlert] Owner notification error:", error);
    }
  }

  // Send webhook if configured
  if (threshold.webhookEnabled && threshold.webhookUrl) {
    try {
      await fetch(threshold.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertType,
          metric: "cpk",
          predictedValue: predictedCpk,
          currentValue: currentCpk,
          threshold: thresholdValue,
          productCode,
          stationName,
          message,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("[PredictionAlert] Webhook error:", error);
    }
  }

  return {
    alertType,
    metric: "cpk",
    currentValue: currentCpk,
    threshold: thresholdValue,
    message,
    notificationSent,
  };
}

// Check and send notification for OEE prediction
export async function checkOeePredictionAlert(
  predictedOee: number,
  currentOee: number,
  productionLineId: number,
  productionLineName: string
): Promise<PredictionAlertResult | null> {
  const threshold = await getEffectiveThreshold(undefined, productionLineId);
  
  let alertType: "warning" | "critical" | "info" | null = null;
  let thresholdValue = 0;
  let message = "";

  // Check critical threshold
  if (predictedOee < threshold.oeeCritical) {
    alertType = "critical";
    thresholdValue = threshold.oeeCritical;
    message = `🚨 CẢNH BÁO NGHIÊM TRỌNG: OEE dự đoán (${predictedOee.toFixed(1)}%) thấp hơn ngưỡng critical (${threshold.oeeCritical}%) cho dây chuyền ${productionLineName}`;
  }
  // Check warning threshold
  else if (predictedOee < threshold.oeeWarning) {
    alertType = "warning";
    thresholdValue = threshold.oeeWarning;
    message = `⚠️ CẢNH BÁO: OEE dự đoán (${predictedOee.toFixed(1)}%) thấp hơn ngưỡng warning (${threshold.oeeWarning}%) cho dây chuyền ${productionLineName}`;
  }
  // Check trend decline
  else if (currentOee > 0) {
    const declinePercent = ((currentOee - predictedOee) / currentOee) * 100;
    if (declinePercent >= threshold.trendDeclineCritical) {
      alertType = "critical";
      thresholdValue = threshold.trendDeclineCritical;
      message = `🚨 CẢNH BÁO: OEE dự đoán giảm ${declinePercent.toFixed(1)}% (vượt ngưỡng ${threshold.trendDeclineCritical}%) cho dây chuyền ${productionLineName}`;
    } else if (declinePercent >= threshold.trendDeclineWarning) {
      alertType = "warning";
      thresholdValue = threshold.trendDeclineWarning;
      message = `⚠️ CẢNH BÁO: OEE dự đoán giảm ${declinePercent.toFixed(1)}% (vượt ngưỡng ${threshold.trendDeclineWarning}%) cho dây chuyền ${productionLineName}`;
    }
  }

  if (!alertType) return null;

  // Send notifications
  let notificationSent = false;

  // Send SSE notification
  try {
    broadcastEvent({
      type: "prediction_alert",
      data: {
        alertType,
        metric: "oee",
        predictedValue: predictedOee,
        currentValue: currentOee,
        threshold: thresholdValue,
        productionLineId,
        productionLineName,
        message,
        timestamp: new Date().toISOString(),
      },
    });
    notificationSent = true;
  } catch (error) {
    console.error("[PredictionAlert] SSE broadcast error:", error);
  }

  // Send owner notification for critical alerts
  if (alertType === "critical") {
    try {
      await notifyOwner({
        title: `🚨 AI Prediction Alert - OEE Critical`,
        content: `${message}\n\nOEE hiện tại: ${currentOee.toFixed(1)}%\nOEE dự đoán: ${predictedOee.toFixed(1)}%\nNgưỡng: ${thresholdValue}%`,
      });
      notificationSent = true;
    } catch (error) {
      console.error("[PredictionAlert] Owner notification error:", error);
    }
  }

  return {
    alertType,
    metric: "oee",
    currentValue: currentOee,
    threshold: thresholdValue,
    message,
    notificationSent,
  };
}

// Get recent prediction alerts
export async function getRecentPredictionAlerts(
  limit: number = 50,
  hours: number = 24
): Promise<Array<{
  id: number;
  predictionType: string;
  predictedValue: number;
  actualValue: number | null;
  status: string;
  createdAt: string;
}>> {
  const db = await getDb();
  if (!db) return [];

  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hours);

  try {
    const results = await db.select({
      id: aiPredictionHistory.id,
      predictionType: aiPredictionHistory.predictionType,
      predictedValue: aiPredictionHistory.predictedValue,
      actualValue: aiPredictionHistory.actualValue,
      status: aiPredictionHistory.status,
      createdAt: aiPredictionHistory.createdAt,
    })
    .from(aiPredictionHistory)
    .where(
      and(
        gte(aiPredictionHistory.createdAt, startTime.toISOString()),
        sql`${aiPredictionHistory.status} IN ('warning', 'critical')`
      )
    )
    .orderBy(desc(aiPredictionHistory.createdAt))
    .limit(limit);

    return results.map(r => ({
      id: r.id,
      predictionType: r.predictionType,
      predictedValue: parseFloat(r.predictedValue || "0"),
      actualValue: r.actualValue ? parseFloat(r.actualValue) : null,
      status: r.status || "pending",
      createdAt: r.createdAt || "",
    }));
  } catch (error) {
    console.error("[PredictionAlert] Error getting recent alerts:", error);
    return [];
  }
}

// Get prediction alert statistics
export async function getPredictionAlertStats(
  days: number = 7
): Promise<{
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  cpkAlerts: number;
  oeeAlerts: number;
  alertsByDay: Array<{ date: string; count: number }>;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      cpkAlerts: 0,
      oeeAlerts: 0,
      alertsByDay: [],
    };
  }

  const startTime = new Date();
  startTime.setDate(startTime.getDate() - days);

  try {
    const results = await db.select({
      status: aiPredictionHistory.status,
      predictionType: aiPredictionHistory.predictionType,
      createdAt: aiPredictionHistory.createdAt,
    })
    .from(aiPredictionHistory)
    .where(
      and(
        gte(aiPredictionHistory.createdAt, startTime.toISOString()),
        sql`${aiPredictionHistory.status} IN ('warning', 'critical')`
      )
    );

    const stats = {
      totalAlerts: results.length,
      criticalAlerts: results.filter(r => r.status === "critical").length,
      warningAlerts: results.filter(r => r.status === "warning").length,
      cpkAlerts: results.filter(r => r.predictionType === "cpk").length,
      oeeAlerts: results.filter(r => r.predictionType === "oee").length,
      alertsByDay: [] as Array<{ date: string; count: number }>,
    };

    // Group by day
    const byDay = new Map<string, number>();
    for (const r of results) {
      const date = r.createdAt?.split("T")[0] || "";
      byDay.set(date, (byDay.get(date) || 0) + 1);
    }
    stats.alertsByDay = Array.from(byDay.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  } catch (error) {
    console.error("[PredictionAlert] Error getting stats:", error);
    return {
      totalAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      cpkAlerts: 0,
      oeeAlerts: 0,
      alertsByDay: [],
    };
  }
}
