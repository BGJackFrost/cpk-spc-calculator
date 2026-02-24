import { getDb } from "../db";
import { 
  aiPredictionThresholds, 
  aiPredictionHistory,
  users,
  emailNotificationSettings
} from "../../drizzle/schema";
import { sendEmail } from "../emailService";
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


/**
 * Send email alert for prediction
 */
export async function sendPredictionEmailAlert(
  alertType: "warning" | "critical",
  metric: "cpk" | "oee",
  predictedValue: number,
  currentValue: number,
  threshold: number,
  context: {
    productCode?: string;
    stationName?: string;
    productionLineId?: number;
    productionLineName?: string;
  }
): Promise<{ success: boolean; sentCount: number }> {
  const db = await getDb();
  if (!db) {
    return { success: false, sentCount: 0 };
  }

  try {
    // Get users with email notification enabled for prediction alerts
    const notificationSettings = await db
      .select({
        userId: emailNotificationSettings.userId,
        email: users.email,
        cpkAlerts: emailNotificationSettings.cpkAlerts,
        oeeAlerts: emailNotificationSettings.oeeAlerts,
      })
      .from(emailNotificationSettings)
      .innerJoin(users, eq(emailNotificationSettings.userId, users.id))
      .where(
        and(
          eq(emailNotificationSettings.enabled, 1),
          metric === "cpk" 
            ? eq(emailNotificationSettings.cpkAlerts, 1)
            : eq(emailNotificationSettings.oeeAlerts, 1)
        )
      );

    if (notificationSettings.length === 0) {
      console.log("[PredictionAlert] No users configured for email alerts");
      return { success: true, sentCount: 0 };
    }

    const emails = notificationSettings.map(s => s.email).filter(Boolean) as string[];
    
    if (emails.length === 0) {
      return { success: true, sentCount: 0 };
    }

    // Generate email content
    const subject = alertType === "critical"
      ? `🚨 [CRITICAL] AI Prediction Alert - ${metric.toUpperCase()}`
      : `⚠️ [WARNING] AI Prediction Alert - ${metric.toUpperCase()}`;

    const contextInfo = metric === "cpk"
      ? `Sản phẩm: ${context.productCode || "N/A"}\nTrạm: ${context.stationName || "N/A"}`
      : `Dây chuyền: ${context.productionLineName || "N/A"}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${alertType === "critical" ? "#dc3545" : "#ffc107"}; color: ${alertType === "critical" ? "white" : "#333"}; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { background: #fff; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; padding: 20px; }
    .metric-box { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .metric-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .metric-label { color: #6c757d; }
    .metric-value { font-weight: bold; }
    .critical { color: #dc3545; }
    .warning { color: #ffc107; }
    .footer { text-align: center; color: #6c757d; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${alertType === "critical" ? "🚨" : "⚠️"} AI Prediction Alert - ${metric.toUpperCase()}</h1>
  </div>
  <div class="content">
    <p>Hệ thống AI đã phát hiện ${alertType === "critical" ? "cảnh báo nghiêm trọng" : "cảnh báo"} về ${metric.toUpperCase()} dự đoán:</p>
    
    <div class="metric-box">
      <div class="metric-row">
        <span class="metric-label">${metric.toUpperCase()} hiện tại:</span>
        <span class="metric-value">${currentValue.toFixed(metric === "cpk" ? 3 : 1)}${metric === "oee" ? "%" : ""}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">${metric.toUpperCase()} dự đoán:</span>
        <span class="metric-value ${alertType}">${predictedValue.toFixed(metric === "cpk" ? 3 : 1)}${metric === "oee" ? "%" : ""}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Ngưỡng ${alertType}:</span>
        <span class="metric-value">${threshold}${metric === "oee" ? "%" : ""}</span>
      </div>
    </div>
    
    <p><strong>Thông tin chi tiết:</strong></p>
    <pre style="background: #f8f9fa; padding: 10px; border-radius: 4px;">${contextInfo}</pre>
    
    <p>Vui lòng kiểm tra và thực hiện các biện pháp cần thiết.</p>
  </div>
  <div class="footer">
    <p>Email được gửi tự động từ SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} MSoftware AI</p>
  </div>
</body>
</html>
    `;

    const result = await sendEmail(emails, subject, html);
    
    console.log(`[PredictionAlert] Email sent to ${result.sentCount || 0} recipients`);
    
    return {
      success: result.success,
      sentCount: result.sentCount || 0,
    };
  } catch (error) {
    console.error("[PredictionAlert] Error sending email alert:", error);
    return { success: false, sentCount: 0 };
  }
}

/**
 * Enhanced CPK prediction check with email notification
 */
export async function checkCpkPredictionAlertWithEmail(
  predictedCpk: number,
  currentCpk: number,
  productCode: string,
  stationName: string,
  productId?: number,
  productionLineId?: number,
  workstationId?: number
): Promise<PredictionAlertResult & { emailSent: boolean; emailCount: number } | null> {
  // First check for alert
  const alertResult = await checkCpkPredictionAlert(
    predictedCpk,
    currentCpk,
    productCode,
    stationName,
    productId,
    productionLineId,
    workstationId
  );

  if (!alertResult) {
    return null;
  }

  // Send email for warning and critical alerts
  const emailResult = await sendPredictionEmailAlert(
    alertResult.alertType as "warning" | "critical",
    "cpk",
    predictedCpk,
    currentCpk,
    alertResult.threshold,
    { productCode, stationName }
  );

  return {
    ...alertResult,
    emailSent: emailResult.success,
    emailCount: emailResult.sentCount,
  };
}

/**
 * Enhanced OEE prediction check with email notification
 */
export async function checkOeePredictionAlertWithEmail(
  predictedOee: number,
  currentOee: number,
  productionLineId: number,
  productionLineName: string
): Promise<PredictionAlertResult & { emailSent: boolean; emailCount: number } | null> {
  // First check for alert
  const alertResult = await checkOeePredictionAlert(
    predictedOee,
    currentOee,
    productionLineId,
    productionLineName
  );

  if (!alertResult) {
    return null;
  }

  // Send email for warning and critical alerts
  const emailResult = await sendPredictionEmailAlert(
    alertResult.alertType as "warning" | "critical",
    "oee",
    predictedOee,
    currentOee,
    alertResult.threshold,
    { productionLineId, productionLineName }
  );

  return {
    ...alertResult,
    emailSent: emailResult.success,
    emailCount: emailResult.sentCount,
  };
}

/**
 * Log prediction alert to history
 */
export async function logPredictionAlert(
  predictionType: "cpk" | "oee" | "defect_rate" | "trend",
  predictedValue: number,
  alertType: "warning" | "critical",
  context: {
    modelId?: number;
    modelName?: string;
    modelVersion?: string;
    productId?: number;
    productCode?: string;
    productionLineId?: number;
    workstationId?: number;
    confidenceLevel?: number;
    confidenceLower?: number;
    confidenceUpper?: number;
  }
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(aiPredictionHistory).values({
      predictionType,
      modelId: context.modelId || null,
      modelName: context.modelName || null,
      modelVersion: context.modelVersion || null,
      productId: context.productId || null,
      productCode: context.productCode || null,
      productionLineId: context.productionLineId || null,
      workstationId: context.workstationId || null,
      predictedValue: predictedValue.toString(),
      predictedAt: new Date().toISOString(),
      forecastHorizon: 7,
      confidenceLevel: context.confidenceLevel?.toString() || null,
      confidenceLower: context.confidenceLower?.toString() || null,
      confidenceUpper: context.confidenceUpper?.toString() || null,
      status: alertType === "critical" ? "verified" : "pending",
    });

    return result[0]?.insertId || null;
  } catch (error) {
    console.error("[PredictionAlert] Error logging alert:", error);
    return null;
  }
}
