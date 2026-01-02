/**
 * Model Version Comparison Service
 * Compare accuracy metrics between different AI model versions
 */

import { getDb } from "../db";
import {
  aiAnomalyModels,
  aiModelVersions,
  aiPredictionHistory,
  aiModelPredictions,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";

// Types
interface VersionAccuracyMetrics {
  versionId: number;
  version: string;
  versionNumber: number;
  totalPredictions: number;
  verifiedPredictions: number;
  mae: number;
  rmse: number;
  mape: number;
  accuracy: number;
  withinConfidenceRate: number;
  avgResponseTime: number;
  deployedAt: string | null;
  isActive: boolean;
}

interface ModelVersionComparison {
  modelId: number;
  modelName: string;
  modelType: string;
  targetMetric: string;
  versions: VersionAccuracyMetrics[];
  bestVersion: {
    versionId: number;
    version: string;
    reason: string;
  } | null;
  recommendation: string;
  comparisonChart: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      metric: string;
    }[];
  };
}

interface MultiModelComparison {
  models: ModelVersionComparison[];
  overallBestModel: {
    modelId: number;
    modelName: string;
    versionId: number;
    version: string;
    accuracy: number;
  } | null;
  summary: {
    totalModels: number;
    totalVersions: number;
    avgAccuracy: number;
    bestAccuracy: number;
    worstAccuracy: number;
  };
}

/**
 * Get accuracy metrics for a specific model version
 */
async function getVersionAccuracyMetrics(
  modelId: number,
  versionId: number,
  startDate?: Date,
  endDate?: Date
): Promise<VersionAccuracyMetrics | null> {
  const db = await getDb();
  if (!db) return null;

  // Get version info
  const versions = await db
    .select()
    .from(aiModelVersions)
    .where(
      and(
        eq(aiModelVersions.modelId, modelId),
        eq(aiModelVersions.id, versionId)
      )
    )
    .limit(1);

  const version = versions[0];
  if (!version) return null;

  // Build date conditions
  const dateConditions = [];
  if (startDate) {
    dateConditions.push(gte(aiPredictionHistory.predictedAt, startDate.toISOString()));
  }
  if (endDate) {
    dateConditions.push(lte(aiPredictionHistory.predictedAt, endDate.toISOString()));
  }

  // Get predictions for this version
  const predictions = await db
    .select({
      absoluteError: aiPredictionHistory.absoluteError,
      percentError: aiPredictionHistory.percentError,
      squaredError: aiPredictionHistory.squaredError,
      isWithinConfidence: aiPredictionHistory.isWithinConfidence,
      status: aiPredictionHistory.status,
    })
    .from(aiPredictionHistory)
    .where(
      and(
        eq(aiPredictionHistory.modelId, modelId),
        eq(aiPredictionHistory.modelVersion, version.version),
        ...dateConditions
      )
    );

  const totalPredictions = predictions.length;
  const verifiedPredictions = predictions.filter(p => p.status === "verified").length;

  if (verifiedPredictions === 0) {
    return {
      versionId: version.id,
      version: version.version,
      versionNumber: version.versionNumber,
      totalPredictions,
      verifiedPredictions: 0,
      mae: 0,
      rmse: 0,
      mape: 0,
      accuracy: parseFloat(version.accuracy || "0"),
      withinConfidenceRate: 0,
      avgResponseTime: 0,
      deployedAt: version.deployedAt || null,
      isActive: version.isActive === 1,
    };
  }

  // Calculate metrics
  const verifiedPreds = predictions.filter(p => p.status === "verified");
  const mae = verifiedPreds.reduce((sum, p) => sum + parseFloat(p.absoluteError || "0"), 0) / verifiedPredictions;
  const mse = verifiedPreds.reduce((sum, p) => sum + parseFloat(p.squaredError || "0"), 0) / verifiedPredictions;
  const rmse = Math.sqrt(mse);
  const mape = verifiedPreds.reduce((sum, p) => sum + Math.abs(parseFloat(p.percentError || "0")), 0) / verifiedPredictions;
  const withinConfidenceCount = verifiedPreds.filter(p => p.isWithinConfidence === 1).length;
  const withinConfidenceRate = (withinConfidenceCount / verifiedPredictions) * 100;

  return {
    versionId: version.id,
    version: version.version,
    versionNumber: version.versionNumber,
    totalPredictions,
    verifiedPredictions,
    mae: Math.round(mae * 1000) / 1000,
    rmse: Math.round(rmse * 1000) / 1000,
    mape: Math.round(mape * 100) / 100,
    accuracy: parseFloat(version.accuracy || "0"),
    withinConfidenceRate: Math.round(withinConfidenceRate * 10) / 10,
    avgResponseTime: 0, // Can be calculated if we track response times
    deployedAt: version.deployedAt || null,
    isActive: version.isActive === 1,
  };
}

/**
 * Compare all versions of a specific model
 */
export async function compareModelVersions(
  modelId: number,
  startDate?: Date,
  endDate?: Date
): Promise<ModelVersionComparison | null> {
  const db = await getDb();
  if (!db) return null;

  // Get model info
  const models = await db
    .select()
    .from(aiAnomalyModels)
    .where(eq(aiAnomalyModels.id, modelId))
    .limit(1);

  const model = models[0];
  if (!model) return null;

  // Get all versions for this model
  const versions = await db
    .select()
    .from(aiModelVersions)
    .where(eq(aiModelVersions.modelId, modelId))
    .orderBy(desc(aiModelVersions.versionNumber));

  if (versions.length === 0) {
    return {
      modelId: model.id,
      modelName: model.name,
      modelType: model.modelType,
      targetMetric: model.targetMetric || "cpk",
      versions: [],
      bestVersion: null,
      recommendation: "Không có phiên bản nào để so sánh.",
      comparisonChart: {
        labels: [],
        datasets: [],
      },
    };
  }

  // Get metrics for each version
  const versionMetrics: VersionAccuracyMetrics[] = [];
  for (const version of versions) {
    const metrics = await getVersionAccuracyMetrics(modelId, version.id, startDate, endDate);
    if (metrics) {
      versionMetrics.push(metrics);
    }
  }

  // Find best version based on MAE (lower is better)
  let bestVersion = null;
  if (versionMetrics.length > 0) {
    const versionsWithData = versionMetrics.filter(v => v.verifiedPredictions > 0);
    if (versionsWithData.length > 0) {
      const best = versionsWithData.reduce((a, b) => a.mae < b.mae ? a : b);
      bestVersion = {
        versionId: best.versionId,
        version: best.version,
        reason: `MAE thấp nhất: ${best.mae}, Tỷ lệ trong khoảng tin cậy: ${best.withinConfidenceRate}%`,
      };
    }
  }

  // Generate recommendation
  let recommendation = "";
  if (versionMetrics.length === 0) {
    recommendation = "Không có dữ liệu để đánh giá.";
  } else if (versionMetrics.length === 1) {
    recommendation = "Chỉ có một phiên bản. Cần thêm phiên bản để so sánh.";
  } else {
    const activeVersion = versionMetrics.find(v => v.isActive);
    if (activeVersion && bestVersion && activeVersion.versionId !== bestVersion.versionId) {
      const bestMetrics = versionMetrics.find(v => v.versionId === bestVersion.versionId);
      if (bestMetrics && activeVersion.mae > 0) {
        const improvement = ((activeVersion.mae - bestMetrics.mae) / activeVersion.mae) * 100;
        recommendation = `Khuyến nghị chuyển sang phiên bản ${bestVersion.version}. Có thể cải thiện MAE ${improvement.toFixed(1)}%.`;
      }
    } else if (bestVersion) {
      recommendation = `Phiên bản ${bestVersion.version} đang hoạt động tốt nhất.`;
    }
  }

  // Build comparison chart data
  const comparisonChart = {
    labels: versionMetrics.map(v => `v${v.version}`),
    datasets: [
      {
        label: "MAE",
        data: versionMetrics.map(v => v.mae),
        metric: "mae",
      },
      {
        label: "RMSE",
        data: versionMetrics.map(v => v.rmse),
        metric: "rmse",
      },
      {
        label: "MAPE (%)",
        data: versionMetrics.map(v => v.mape),
        metric: "mape",
      },
      {
        label: "Trong khoảng tin cậy (%)",
        data: versionMetrics.map(v => v.withinConfidenceRate),
        metric: "confidence",
      },
    ],
  };

  return {
    modelId: model.id,
    modelName: model.name,
    modelType: model.modelType,
    targetMetric: model.targetMetric || "cpk",
    versions: versionMetrics,
    bestVersion,
    recommendation,
    comparisonChart,
  };
}

/**
 * Compare multiple models and their versions
 */
export async function compareMultipleModels(
  modelIds: number[],
  startDate?: Date,
  endDate?: Date
): Promise<MultiModelComparison> {
  const modelComparisons: ModelVersionComparison[] = [];

  for (const modelId of modelIds) {
    const comparison = await compareModelVersions(modelId, startDate, endDate);
    if (comparison) {
      modelComparisons.push(comparison);
    }
  }

  // Find overall best model/version
  let overallBestModel = null;
  let bestAccuracy = Infinity;
  let worstAccuracy = 0;
  let totalAccuracy = 0;
  let totalVersions = 0;

  for (const model of modelComparisons) {
    for (const version of model.versions) {
      if (version.verifiedPredictions > 0) {
        totalVersions++;
        totalAccuracy += version.mae;
        
        if (version.mae < bestAccuracy) {
          bestAccuracy = version.mae;
          overallBestModel = {
            modelId: model.modelId,
            modelName: model.modelName,
            versionId: version.versionId,
            version: version.version,
            accuracy: version.mae,
          };
        }
        
        if (version.mae > worstAccuracy) {
          worstAccuracy = version.mae;
        }
      }
    }
  }

  return {
    models: modelComparisons,
    overallBestModel,
    summary: {
      totalModels: modelComparisons.length,
      totalVersions,
      avgAccuracy: totalVersions > 0 ? Math.round((totalAccuracy / totalVersions) * 1000) / 1000 : 0,
      bestAccuracy: bestAccuracy === Infinity ? 0 : Math.round(bestAccuracy * 1000) / 1000,
      worstAccuracy: Math.round(worstAccuracy * 1000) / 1000,
    },
  };
}

/**
 * Get all models with their latest version accuracy
 */
export async function getAllModelsAccuracySummary(): Promise<{
  models: Array<{
    modelId: number;
    modelName: string;
    modelType: string;
    targetMetric: string;
    currentVersion: string;
    accuracy: number;
    totalVersions: number;
    status: string;
  }>;
  totalModels: number;
  activeModels: number;
}> {
  const db = await getDb();
  if (!db) {
    return { models: [], totalModels: 0, activeModels: 0 };
  }

  const models = await db
    .select()
    .from(aiAnomalyModels)
    .orderBy(desc(aiAnomalyModels.createdAt));

  const modelSummaries = [];

  for (const model of models) {
    // Get version count
    const versionCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiModelVersions)
      .where(eq(aiModelVersions.modelId, model.id));

    // Get active version
    const activeVersions = await db
      .select()
      .from(aiModelVersions)
      .where(
        and(
          eq(aiModelVersions.modelId, model.id),
          eq(aiModelVersions.isActive, 1)
        )
      )
      .limit(1);

    const activeVersion = activeVersions[0];

    modelSummaries.push({
      modelId: model.id,
      modelName: model.name,
      modelType: model.modelType,
      targetMetric: model.targetMetric || "cpk",
      currentVersion: activeVersion?.version || model.version || "1.0",
      accuracy: parseFloat(activeVersion?.accuracy || model.accuracy || "0"),
      totalVersions: versionCount[0]?.count || 0,
      status: model.status || "inactive",
    });
  }

  return {
    models: modelSummaries,
    totalModels: models.length,
    activeModels: models.filter(m => m.status === "active").length,
  };
}

/**
 * Get version history with accuracy trend
 */
export async function getVersionAccuracyTrend(
  modelId: number,
  limit: number = 10
): Promise<{
  modelId: number;
  modelName: string;
  trend: Array<{
    version: string;
    versionNumber: number;
    accuracy: number;
    mae: number;
    deployedAt: string | null;
    isActive: boolean;
  }>;
  trendDirection: "improving" | "declining" | "stable";
  improvementRate: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      modelId,
      modelName: "",
      trend: [],
      trendDirection: "stable",
      improvementRate: 0,
    };
  }

  // Get model info
  const models = await db
    .select()
    .from(aiAnomalyModels)
    .where(eq(aiAnomalyModels.id, modelId))
    .limit(1);

  const model = models[0];
  if (!model) {
    return {
      modelId,
      modelName: "",
      trend: [],
      trendDirection: "stable",
      improvementRate: 0,
    };
  }

  // Get versions ordered by version number
  const versions = await db
    .select()
    .from(aiModelVersions)
    .where(eq(aiModelVersions.modelId, modelId))
    .orderBy(aiModelVersions.versionNumber)
    .limit(limit);

  const trend = versions.map(v => ({
    version: v.version,
    versionNumber: v.versionNumber,
    accuracy: parseFloat(v.accuracy || "0"),
    mae: parseFloat(v.meanAbsoluteError || "0"),
    deployedAt: v.deployedAt || null,
    isActive: v.isActive === 1,
  }));

  // Calculate trend direction
  let trendDirection: "improving" | "declining" | "stable" = "stable";
  let improvementRate = 0;

  if (trend.length >= 2) {
    const firstMae = trend[0].mae;
    const lastMae = trend[trend.length - 1].mae;
    
    if (firstMae > 0) {
      improvementRate = ((firstMae - lastMae) / firstMae) * 100;
      
      if (improvementRate > 5) {
        trendDirection = "improving";
      } else if (improvementRate < -5) {
        trendDirection = "declining";
      }
    }
  }

  return {
    modelId,
    modelName: model.name,
    trend,
    trendDirection,
    improvementRate: Math.round(improvementRate * 10) / 10,
  };
}
