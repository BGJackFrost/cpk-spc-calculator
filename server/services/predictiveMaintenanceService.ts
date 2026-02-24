/**
 * Predictive Maintenance Service
 * Sử dụng AI để dự đoán thời điểm cần bảo trì thiết bị
 */

import { getDb } from "../db";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import {
  iotPredictionModels,
  iotMaintenancePredictions,
  iotDeviceHealthHistory,
  iotDevices,
  iotDeviceHealth,
  type IotPredictionModel,
  type InsertIotPredictionModel,
  type IotMaintenancePrediction,
  type InsertIotMaintenancePrediction,
  type IotDeviceHealthHistory,
  type InsertIotDeviceHealthHistory,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

// ============================================
// Prediction Model Management
// ============================================

export async function createPredictionModel(
  data: Omit<InsertIotPredictionModel, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(iotPredictionModels).values(data);
  return result[0].insertId;
}

export async function getPredictionModels(filters?: {
  modelType?: string;
  isActive?: boolean;
}): Promise<IotPredictionModel[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(iotPredictionModels);

  const conditions = [];
  if (filters?.modelType) {
    conditions.push(eq(iotPredictionModels.modelType, filters.modelType as any));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(iotPredictionModels.isActive, filters.isActive ? 1 : 0));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(iotPredictionModels.createdAt)) as any;

  return await query;
}

export async function getPredictionModelById(id: number): Promise<IotPredictionModel | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(iotPredictionModels)
    .where(eq(iotPredictionModels.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updatePredictionModel(
  id: number,
  data: Partial<InsertIotPredictionModel>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(iotPredictionModels).set(data).where(eq(iotPredictionModels.id, id));
}

export async function deletePredictionModel(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(iotPredictionModels).where(eq(iotPredictionModels.id, id));
}

// ============================================
// Maintenance Prediction Management
// ============================================

export async function createMaintenancePrediction(
  data: Omit<InsertIotMaintenancePrediction, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(iotMaintenancePredictions).values(data);
  return result[0].insertId;
}

export async function getMaintenancePredictions(filters?: {
  deviceId?: number;
  modelId?: number;
  status?: string;
  severity?: string;
  limit?: number;
}): Promise<
  (IotMaintenancePrediction & { deviceName?: string; deviceCode?: string; modelName?: string })[]
> {
  const db = await getDb();
  if (!db) return [];

  let query = db
    .select({
      prediction: iotMaintenancePredictions,
      deviceName: iotDevices.deviceName,
      deviceCode: iotDevices.deviceCode,
      modelName: iotPredictionModels.name,
    })
    .from(iotMaintenancePredictions)
    .leftJoin(iotDevices, eq(iotMaintenancePredictions.deviceId, iotDevices.id))
    .leftJoin(iotPredictionModels, eq(iotMaintenancePredictions.modelId, iotPredictionModels.id));

  const conditions = [];
  if (filters?.deviceId) {
    conditions.push(eq(iotMaintenancePredictions.deviceId, filters.deviceId));
  }
  if (filters?.modelId) {
    conditions.push(eq(iotMaintenancePredictions.modelId, filters.modelId));
  }
  if (filters?.status) {
    conditions.push(eq(iotMaintenancePredictions.status, filters.status as any));
  }
  if (filters?.severity) {
    conditions.push(eq(iotMaintenancePredictions.severity, filters.severity as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(iotMaintenancePredictions.createdAt)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  const results = await query;
  return results.map((r) => ({
    ...r.prediction,
    deviceName: r.deviceName || undefined,
    deviceCode: r.deviceCode || undefined,
    modelName: r.modelName || undefined,
  }));
}

export async function getMaintenancePredictionById(
  id: number
): Promise<
  (IotMaintenancePrediction & { deviceName?: string; deviceCode?: string; modelName?: string }) | null
> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      prediction: iotMaintenancePredictions,
      deviceName: iotDevices.deviceName,
      deviceCode: iotDevices.deviceCode,
      modelName: iotPredictionModels.name,
    })
    .from(iotMaintenancePredictions)
    .leftJoin(iotDevices, eq(iotMaintenancePredictions.deviceId, iotDevices.id))
    .leftJoin(iotPredictionModels, eq(iotMaintenancePredictions.modelId, iotPredictionModels.id))
    .where(eq(iotMaintenancePredictions.id, id))
    .limit(1);

  if (!result[0]) return null;

  return {
    ...result[0].prediction,
    deviceName: result[0].deviceName || undefined,
    deviceCode: result[0].deviceCode || undefined,
    modelName: result[0].modelName || undefined,
  };
}

export async function updateMaintenancePrediction(
  id: number,
  data: Partial<InsertIotMaintenancePrediction>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotMaintenancePredictions)
    .set(data)
    .where(eq(iotMaintenancePredictions.id, id));
}

export async function acknowledgePrediction(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotMaintenancePredictions)
    .set({
      status: "acknowledged",
      acknowledgedBy: userId,
      acknowledgedAt: new Date().toISOString(),
    })
    .where(eq(iotMaintenancePredictions.id, id));
}

export async function resolvePrediction(
  id: number,
  outcome: string,
  wasAccurate: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(iotMaintenancePredictions)
    .set({
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      actualOutcome: outcome,
      wasAccurate: wasAccurate ? 1 : 0,
    })
    .where(eq(iotMaintenancePredictions.id, id));
}

// ============================================
// Device Health History Management
// ============================================

export async function recordDeviceHealthHistory(
  data: Omit<InsertIotDeviceHealthHistory, "id" | "createdAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(iotDeviceHealthHistory).values(data);
  return result[0].insertId;
}

export async function getDeviceHealthHistory(
  deviceId: number,
  options?: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
): Promise<IotDeviceHealthHistory[]> {
  const db = await getDb();
  if (!db) return [];

  // Build conditions array
  const conditions = [eq(iotDeviceHealthHistory.deviceId, deviceId)];
  
  if (options?.startDate) {
    conditions.push(gte(iotDeviceHealthHistory.recordedAt, options.startDate.toISOString()));
  }
  if (options?.endDate) {
    conditions.push(lte(iotDeviceHealthHistory.recordedAt, options.endDate.toISOString()));
  }

  let query = db
    .select()
    .from(iotDeviceHealthHistory)
    .where(and(...conditions))
    .orderBy(desc(iotDeviceHealthHistory.recordedAt));

  if (options?.limit) {
    query = query.limit(options.limit) as any;
  }

  return await query;
}

// ============================================
// AI Prediction Engine
// ============================================

interface HealthTrend {
  slope: number;
  intercept: number;
  r2: number;
  predictedDaysToThreshold: number | null;
}

function calculateLinearRegression(data: { x: number; y: number }[]): HealthTrend {
  if (data.length < 2) {
    return { slope: 0, intercept: 100, r2: 0, predictedDaysToThreshold: null };
  }

  const n = data.length;
  const sumX = data.reduce((sum, d) => sum + d.x, 0);
  const sumY = data.reduce((sum, d) => sum + d.y, 0);
  const sumXY = data.reduce((sum, d) => sum + d.x * d.y, 0);
  const sumX2 = data.reduce((sum, d) => sum + d.x * d.x, 0);
  const sumY2 = data.reduce((sum, d) => sum + d.y * d.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // R-squared
  const yMean = sumY / n;
  const ssTotal = data.reduce((sum, d) => sum + Math.pow(d.y - yMean, 2), 0);
  const ssResidual = data.reduce((sum, d) => sum + Math.pow(d.y - (slope * d.x + intercept), 2), 0);
  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  // Predict days until health score reaches threshold (e.g., 50)
  const threshold = 50;
  let predictedDaysToThreshold: number | null = null;
  if (slope < 0) {
    const currentX = data[data.length - 1].x;
    const currentY = slope * currentX + intercept;
    if (currentY > threshold) {
      predictedDaysToThreshold = Math.ceil((threshold - intercept) / slope - currentX);
    }
  }

  return { slope, intercept, r2, predictedDaysToThreshold };
}

export async function analyzeDeviceHealth(deviceId: number): Promise<{
  currentHealth: number;
  trend: HealthTrend;
  contributingFactors: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get recent health history (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const history = await getDeviceHealthHistory(deviceId, {
    startDate: thirtyDaysAgo,
    limit: 100,
  });

  // Get current health
  const currentHealthRecord = await db
    .select()
    .from(iotDeviceHealth)
    .where(eq(iotDeviceHealth.deviceId, deviceId))
    .limit(1);

  const currentHealth = currentHealthRecord[0]
    ? parseFloat(currentHealthRecord[0].healthScore || "100")
    : 100;

  // Calculate trend
  const trendData = history.map((h, i) => ({
    x: i,
    y: parseFloat(h.healthScore || "100"),
  }));
  const trend = calculateLinearRegression(trendData);

  // Identify contributing factors
  const contributingFactors: string[] = [];
  if (history.length > 0) {
    const latest = history[0];
    if (latest.errorCount && latest.errorCount > 5) {
      contributingFactors.push("High error count");
    }
    if (latest.warningCount && latest.warningCount > 10) {
      contributingFactors.push("Many warnings");
    }
    if (latest.downtimeHours && parseFloat(latest.downtimeHours) > 2) {
      contributingFactors.push("Significant downtime");
    }
    if (latest.temperature && parseFloat(latest.temperature) > 80) {
      contributingFactors.push("High temperature");
    }
    if (latest.vibration && parseFloat(latest.vibration) > 5) {
      contributingFactors.push("High vibration");
    }
  }

  // Determine risk level
  let riskLevel: "low" | "medium" | "high" | "critical" = "low";
  if (currentHealth < 50 || (trend.predictedDaysToThreshold && trend.predictedDaysToThreshold < 7)) {
    riskLevel = "critical";
  } else if (
    currentHealth < 70 ||
    (trend.predictedDaysToThreshold && trend.predictedDaysToThreshold < 14)
  ) {
    riskLevel = "high";
  } else if (
    currentHealth < 85 ||
    (trend.predictedDaysToThreshold && trend.predictedDaysToThreshold < 30)
  ) {
    riskLevel = "medium";
  }

  return {
    currentHealth,
    trend,
    contributingFactors,
    riskLevel,
  };
}

export async function generatePredictionWithLLM(
  deviceId: number,
  analysis: {
    currentHealth: number;
    trend: HealthTrend;
    contributingFactors: string[];
    riskLevel: string;
  }
): Promise<string> {
  const db = await getDb();
  if (!db) return "Unable to generate analysis";

  // Get device info
  const device = await db
    .select()
    .from(iotDevices)
    .where(eq(iotDevices.id, deviceId))
    .limit(1);

  const deviceInfo = device[0] || { deviceName: "Unknown", deviceType: "Unknown" };

  const prompt = `Analyze the following IoT device health data and provide maintenance recommendations:

Device: ${deviceInfo.deviceName} (${deviceInfo.deviceType})
Current Health Score: ${analysis.currentHealth.toFixed(1)}%
Health Trend: ${analysis.trend.slope > 0 ? "Improving" : analysis.trend.slope < 0 ? "Declining" : "Stable"} (slope: ${analysis.trend.slope.toFixed(4)})
Trend Reliability (R²): ${(analysis.trend.r2 * 100).toFixed(1)}%
${analysis.trend.predictedDaysToThreshold ? `Predicted days until critical threshold: ${analysis.trend.predictedDaysToThreshold}` : "No immediate risk of reaching critical threshold"}
Risk Level: ${analysis.riskLevel}
Contributing Factors: ${analysis.contributingFactors.length > 0 ? analysis.contributingFactors.join(", ") : "None identified"}

Please provide:
1. A brief assessment of the device's current condition
2. Specific maintenance recommendations
3. Priority level for maintenance action
4. Estimated timeframe for recommended maintenance

Keep the response concise and actionable.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an industrial maintenance expert. Provide concise, actionable maintenance recommendations based on device health data.",
        },
        { role: "user", content: prompt },
      ],
    });

    return response.choices[0]?.message?.content || "Unable to generate analysis";
  } catch (error) {
    console.error("LLM analysis error:", error);
    return "Unable to generate AI analysis at this time.";
  }
}

export async function runPredictiveAnalysis(modelId: number): Promise<{
  predictionsCreated: number;
  devicesAnalyzed: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const model = await getPredictionModelById(modelId);
  if (!model) throw new Error("Model not found");

  // Get target devices
  let deviceIds: number[] = [];
  if (model.targetDeviceIds) {
    deviceIds = model.targetDeviceIds as number[];
  } else {
    // Get all active devices
    const devices = await db
      .select({ id: iotDevices.id })
      .from(iotDevices)
      .where(eq(iotDevices.status, "active"));
    deviceIds = devices.map((d) => d.id);
  }

  let predictionsCreated = 0;

  for (const deviceId of deviceIds) {
    try {
      const analysis = await analyzeDeviceHealth(deviceId);

      // Only create prediction if risk level is medium or higher
      if (analysis.riskLevel !== "low") {
        const llmAnalysis = await generatePredictionWithLLM(deviceId, analysis);

        // Calculate predicted date
        let predictedDate: string | null = null;
        if (analysis.trend.predictedDaysToThreshold) {
          const date = new Date();
          date.setDate(date.getDate() + analysis.trend.predictedDaysToThreshold);
          predictedDate = date.toISOString();
        }

        // Determine prediction type
        let predictionType: "failure" | "maintenance_needed" | "health_decline" | "anomaly" | "remaining_life" =
          "maintenance_needed";
        if (analysis.riskLevel === "critical") {
          predictionType = "failure";
        } else if (analysis.trend.slope < -0.5) {
          predictionType = "health_decline";
        }

        await createMaintenancePrediction({
          modelId,
          deviceId,
          predictionType,
          predictedDate,
          confidenceScore: analysis.trend.r2.toString(),
          severity: analysis.riskLevel as any,
          currentHealthScore: analysis.currentHealth.toString(),
          predictedHealthScore: analysis.trend.predictedDaysToThreshold
            ? "50.00"
            : analysis.currentHealth.toString(),
          daysUntilMaintenance: analysis.trend.predictedDaysToThreshold,
          contributingFactors: analysis.contributingFactors,
          recommendedActions: [
            "Schedule preventive maintenance",
            "Review error logs",
            "Check sensor calibration",
          ],
          llmAnalysis,
          status: "active",
        });

        predictionsCreated++;
      }
    } catch (error) {
      console.error(`Error analyzing device ${deviceId}:`, error);
    }
  }

  // Update model last trained timestamp
  await updatePredictionModel(modelId, {
    lastTrainedAt: new Date().toISOString(),
  });

  return {
    predictionsCreated,
    devicesAnalyzed: deviceIds.length,
  };
}

// ============================================
// Dashboard Statistics
// ============================================

export async function getPredictiveMaintenanceStats(): Promise<{
  totalPredictions: number;
  activePredictions: number;
  criticalPredictions: number;
  highPredictions: number;
  averageConfidence: number;
  devicesAtRisk: number;
}> {
  const db = await getDb();
  if (!db)
    return {
      totalPredictions: 0,
      activePredictions: 0,
      criticalPredictions: 0,
      highPredictions: 0,
      averageConfidence: 0,
      devicesAtRisk: 0,
    };

  const predictions = await db.select().from(iotMaintenancePredictions);

  const activePredictions = predictions.filter((p) => p.status === "active");
  const criticalPredictions = activePredictions.filter((p) => p.severity === "critical");
  const highPredictions = activePredictions.filter((p) => p.severity === "high");

  const avgConfidence =
    activePredictions.length > 0
      ? activePredictions.reduce((sum, p) => sum + parseFloat(p.confidenceScore || "0"), 0) /
        activePredictions.length
      : 0;

  const uniqueDevices = new Set(activePredictions.map((p) => p.deviceId));

  return {
    totalPredictions: predictions.length,
    activePredictions: activePredictions.length,
    criticalPredictions: criticalPredictions.length,
    highPredictions: highPredictions.length,
    averageConfidence: avgConfidence,
    devicesAtRisk: uniqueDevices.size,
  };
}
