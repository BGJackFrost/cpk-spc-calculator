/**
 * Data Drift Detection Service
 * Phát hiện data drift và alerting khi model accuracy giảm đột ngột
 */

import { getDb } from "../db";
import { 
  aiDriftAlerts,
  aiDriftConfigs,
  aiDriftMetricsHistory,
  aiFeatureStatistics,
  aiMlModels,
  type AiDriftAlert,
  type AiDriftConfig,
  type AiDriftMetricsHistory,
  type AiFeatureStatistics
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";
import { modelVersioningService } from "./modelVersioningService";

// Types
export type DriftSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'ignored';
export type DriftType = 'accuracy_drop' | 'feature_drift' | 'prediction_drift' | 'data_quality';

export interface FeatureStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  uniqueCount: number;
  histogram: { bin: number; count: number }[];
}

export interface DriftDetectionResult {
  hasDrift: boolean;
  severity: DriftSeverity;
  driftScore: number;
  driftType: DriftType;
  details: {
    metric: string;
    baselineValue: number;
    currentValue: number;
    changePercent: number;
    threshold: number;
  }[];
  recommendation: string;
}

export interface DriftConfigInput {
  modelId: number;
  accuracyDropThreshold?: number;
  featureDriftThreshold?: number;
  predictionDriftThreshold?: number;
  monitoringWindowHours?: number;
  alertCooldownMinutes?: number;
  autoRollbackEnabled?: boolean;
  autoRollbackThreshold?: number;
  notifyOwner?: boolean;
  notifyEmail?: string;
  createdBy?: number;
}

class DataDriftService {
  private async db() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db;
  }

  // Configuration Management
  async createConfig(input: DriftConfigInput): Promise<AiDriftConfig> {
    const db = await this.db();
    const [result] = await db.insert(aiDriftConfigs).values({
      modelId: input.modelId,
      accuracyDropThreshold: String(input.accuracyDropThreshold ?? 0.05),
      featureDriftThreshold: String(input.featureDriftThreshold ?? 0.1),
      predictionDriftThreshold: String(input.predictionDriftThreshold ?? 0.1),
      monitoringWindowHours: input.monitoringWindowHours ?? 24,
      alertCooldownMinutes: input.alertCooldownMinutes ?? 60,
      autoRollbackEnabled: input.autoRollbackEnabled ? 1 : 0,
      autoRollbackThreshold: String(input.autoRollbackThreshold ?? 0.15),
      notifyOwner: input.notifyOwner ? 1 : 0,
      notifyEmail: input.notifyEmail,
      isEnabled: 1,
      createdBy: input.createdBy,
    });

    const insertId = (result as any).insertId;
    const [config] = await db.select().from(aiDriftConfigs).where(eq(aiDriftConfigs.id, insertId));
    return config;
  }

  async getConfig(modelId: number): Promise<AiDriftConfig | null> {
    const db = await this.db();
    const [config] = await db.select().from(aiDriftConfigs)
      .where(and(eq(aiDriftConfigs.modelId, modelId), eq(aiDriftConfigs.isEnabled, 1)));
    return config || null;
  }

  async updateConfig(configId: number, updates: Partial<DriftConfigInput>): Promise<AiDriftConfig> {
    const db = await this.db();
    const updateData: any = {};
    
    if (updates.accuracyDropThreshold !== undefined) updateData.accuracyDropThreshold = String(updates.accuracyDropThreshold);
    if (updates.featureDriftThreshold !== undefined) updateData.featureDriftThreshold = String(updates.featureDriftThreshold);
    if (updates.predictionDriftThreshold !== undefined) updateData.predictionDriftThreshold = String(updates.predictionDriftThreshold);
    if (updates.monitoringWindowHours !== undefined) updateData.monitoringWindowHours = updates.monitoringWindowHours;
    if (updates.alertCooldownMinutes !== undefined) updateData.alertCooldownMinutes = updates.alertCooldownMinutes;
    if (updates.autoRollbackEnabled !== undefined) updateData.autoRollbackEnabled = updates.autoRollbackEnabled ? 1 : 0;
    if (updates.autoRollbackThreshold !== undefined) updateData.autoRollbackThreshold = String(updates.autoRollbackThreshold);
    if (updates.notifyOwner !== undefined) updateData.notifyOwner = updates.notifyOwner ? 1 : 0;
    if (updates.notifyEmail !== undefined) updateData.notifyEmail = updates.notifyEmail;

    await db.update(aiDriftConfigs).set(updateData).where(eq(aiDriftConfigs.id, configId));
    const [config] = await db.select().from(aiDriftConfigs).where(eq(aiDriftConfigs.id, configId));
    return config;
  }

  // Feature Statistics
  calculateFeatureStats(data: number[]): FeatureStats {
    if (data.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0, median: 0, q1: 0, q3: 0, uniqueCount: 0, histogram: [] };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;
    const mean = data.reduce((a, b) => a + b, 0) / n;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];

    // Create histogram with 10 bins
    const min = sorted[0];
    const max = sorted[n - 1];
    const binWidth = (max - min) / 10 || 1;
    const histogram: { bin: number; count: number }[] = [];
    
    for (let i = 0; i < 10; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = data.filter(v => v >= binStart && (i === 9 ? v <= binEnd : v < binEnd)).length;
      histogram.push({ bin: binStart + binWidth / 2, count });
    }

    return {
      mean,
      stdDev,
      min,
      max,
      median,
      q1,
      q3,
      uniqueCount: new Set(data).size,
      histogram,
    };
  }

  async saveFeatureStatistics(modelId: number, featureName: string, stats: FeatureStats, isBaseline: boolean = false): Promise<AiFeatureStatistics> {
    const db = await this.db();
    const [result] = await db.insert(aiFeatureStatistics).values({
      modelId,
      featureName,
      mean: String(stats.mean),
      stdDev: String(stats.stdDev),
      min: String(stats.min),
      max: String(stats.max),
      median: String(stats.median),
      q1: String(stats.q1),
      q3: String(stats.q3),
      uniqueCount: stats.uniqueCount,
      histogram: stats.histogram,
      isBaseline: isBaseline ? 1 : 0,
    });

    const insertId = (result as any).insertId;
    const [saved] = await db.select().from(aiFeatureStatistics).where(eq(aiFeatureStatistics.id, insertId));
    return saved;
  }

  async getBaselineStats(modelId: number, featureName: string): Promise<AiFeatureStatistics | null> {
    const db = await this.db();
    const [stats] = await db.select().from(aiFeatureStatistics)
      .where(and(
        eq(aiFeatureStatistics.modelId, modelId),
        eq(aiFeatureStatistics.featureName, featureName),
        eq(aiFeatureStatistics.isBaseline, 1)
      ))
      .orderBy(desc(aiFeatureStatistics.createdAt))
      .limit(1);
    return stats || null;
  }

  // Drift Detection
  async detectDrift(modelId: number, currentMetrics: { accuracy: number; features?: Record<string, number[]> }): Promise<DriftDetectionResult> {
    const config = await this.getConfig(modelId);
    if (!config) {
      return {
        hasDrift: false,
        severity: 'low',
        driftScore: 0,
        driftType: 'accuracy_drop',
        details: [],
        recommendation: 'No drift configuration found for this model.',
      };
    }

    const activeVersion = await modelVersioningService.getActiveVersion(modelId);
    const baselineAccuracy = activeVersion ? parseFloat(activeVersion.accuracy as string || '0') : 0;
    const accuracyThreshold = parseFloat(config.accuracyDropThreshold as string);

    const details: DriftDetectionResult['details'] = [];
    let maxDriftScore = 0;
    let primaryDriftType: DriftType = 'accuracy_drop';

    // Check accuracy drop
    if (baselineAccuracy > 0) {
      const accuracyDrop = (baselineAccuracy - currentMetrics.accuracy) / baselineAccuracy;
      details.push({
        metric: 'accuracy',
        baselineValue: baselineAccuracy,
        currentValue: currentMetrics.accuracy,
        changePercent: accuracyDrop * 100,
        threshold: accuracyThreshold * 100,
      });

      if (accuracyDrop > maxDriftScore) {
        maxDriftScore = accuracyDrop;
        primaryDriftType = 'accuracy_drop';
      }
    }

    // Check feature drift
    if (currentMetrics.features) {
      const featureThreshold = parseFloat(config.featureDriftThreshold as string);
      
      for (const [featureName, values] of Object.entries(currentMetrics.features)) {
        const baseline = await this.getBaselineStats(modelId, featureName);
        if (baseline) {
          const currentStats = this.calculateFeatureStats(values);
          const baselineHistogram = baseline.histogram as { bin: number; count: number }[];
          const driftScore = this.calculateKSStatistic(baselineHistogram, currentStats.histogram);

          details.push({
            metric: `feature:${featureName}`,
            baselineValue: parseFloat(baseline.mean as string),
            currentValue: currentStats.mean,
            changePercent: driftScore * 100,
            threshold: featureThreshold * 100,
          });

          if (driftScore > maxDriftScore) {
            maxDriftScore = driftScore;
            primaryDriftType = 'feature_drift';
          }
        }
      }
    }

    // Determine severity
    let severity: DriftSeverity = 'low';
    if (maxDriftScore > accuracyThreshold * 3) severity = 'critical';
    else if (maxDriftScore > accuracyThreshold * 2) severity = 'high';
    else if (maxDriftScore > accuracyThreshold) severity = 'medium';

    const hasDrift = maxDriftScore > accuracyThreshold;

    // Generate recommendation
    let recommendation = '';
    if (!hasDrift) {
      recommendation = 'Model performance is within acceptable thresholds.';
    } else if (severity === 'critical') {
      recommendation = 'Critical drift detected! Immediate action required. Consider rolling back to a previous model version.';
    } else if (severity === 'high') {
      recommendation = 'Significant drift detected. Review recent data changes and consider retraining the model.';
    } else if (severity === 'medium') {
      recommendation = 'Moderate drift detected. Monitor closely and prepare for potential model update.';
    } else {
      recommendation = 'Minor drift detected. Continue monitoring.';
    }

    return {
      hasDrift,
      severity,
      driftScore: maxDriftScore,
      driftType: primaryDriftType,
      details,
      recommendation,
    };
  }

  calculateKSStatistic(baseline: { bin: number; count: number }[] | null | undefined, current: { bin: number; count: number }[]): number {
    if (!baseline || !current || baseline.length === 0 || current.length === 0) return 0;

    const baselineTotal = baseline.reduce((sum, b) => sum + b.count, 0);
    const currentTotal = current.reduce((sum, b) => sum + b.count, 0);

    if (baselineTotal === 0 || currentTotal === 0) return 0;

    // Calculate cumulative distributions
    let baselineCum = 0, currentCum = 0;
    let maxDiff = 0;

    const allBins = new Set([...baseline.map(b => b.bin), ...current.map(b => b.bin)]);
    const sortedBins = Array.from(allBins).sort((a, b) => a - b);

    for (const bin of sortedBins) {
      const baselineCount = baseline.find(b => b.bin === bin)?.count || 0;
      const currentCount = current.find(b => b.bin === bin)?.count || 0;

      baselineCum += baselineCount / baselineTotal;
      currentCum += currentCount / currentTotal;

      const diff = Math.abs(baselineCum - currentCum);
      if (diff > maxDiff) maxDiff = diff;
    }

    return maxDiff;
  }

  // Alert Management
  async createAlert(modelId: number, driftResult: DriftDetectionResult): Promise<AiDriftAlert> {
    const db = await this.db();
    const [result] = await db.insert(aiDriftAlerts).values({
      modelId,
      driftType: driftResult.driftType,
      severity: driftResult.severity,
      driftScore: String(driftResult.driftScore),
      details: driftResult.details,
      recommendation: driftResult.recommendation,
      status: 'active',
    });

    const insertId = (result as any).insertId;
    const [alert] = await db.select().from(aiDriftAlerts).where(eq(aiDriftAlerts.id, insertId));
    return alert;
  }

  async getActiveAlerts(modelId?: number): Promise<AiDriftAlert[]> {
    const db = await this.db();
    let conditions = [eq(aiDriftAlerts.status, 'active')];
    if (modelId) conditions.push(eq(aiDriftAlerts.modelId, modelId));

    return await db.select().from(aiDriftAlerts)
      .where(and(...conditions))
      .orderBy(desc(aiDriftAlerts.createdAt));
  }

  async acknowledgeAlert(alertId: number, acknowledgedBy?: number): Promise<AiDriftAlert> {
    const db = await this.db();
    await db.update(aiDriftAlerts)
      .set({ status: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBy })
      .where(eq(aiDriftAlerts.id, alertId));

    const [alert] = await db.select().from(aiDriftAlerts).where(eq(aiDriftAlerts.id, alertId));
    return alert;
  }

  async resolveAlert(alertId: number, resolution: string, resolvedBy?: number): Promise<AiDriftAlert> {
    const db = await this.db();
    await db.update(aiDriftAlerts)
      .set({ status: 'resolved', resolvedAt: new Date(), resolvedBy, resolution })
      .where(eq(aiDriftAlerts.id, alertId));

    const [alert] = await db.select().from(aiDriftAlerts).where(eq(aiDriftAlerts.id, alertId));
    return alert;
  }

  async ignoreAlert(alertId: number, reason: string): Promise<AiDriftAlert> {
    const db = await this.db();
    await db.update(aiDriftAlerts)
      .set({ status: 'ignored', resolution: reason })
      .where(eq(aiDriftAlerts.id, alertId));

    const [alert] = await db.select().from(aiDriftAlerts).where(eq(aiDriftAlerts.id, alertId));
    return alert;
  }

  async listAlerts(options?: { modelId?: number; status?: AlertStatus; severity?: DriftSeverity; limit?: number; offset?: number }): Promise<{ alerts: AiDriftAlert[]; total: number }> {
    const db = await this.db();
    let conditions: any[] = [];
    
    if (options?.modelId) conditions.push(eq(aiDriftAlerts.modelId, options.modelId));
    if (options?.status) conditions.push(eq(aiDriftAlerts.status, options.status));
    if (options?.severity) conditions.push(eq(aiDriftAlerts.severity, options.severity));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const alerts = await db.select().from(aiDriftAlerts)
      .where(whereClause)
      .orderBy(desc(aiDriftAlerts.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);

    const [{ total }] = await db.select({ total: count() }).from(aiDriftAlerts).where(whereClause);
    return { alerts, total };
  }

  // Metrics History
  async recordMetrics(modelId: number, metrics: { accuracy: number; precision?: number; recall?: number; f1Score?: number; predictionCount: number }): Promise<AiDriftMetricsHistory> {
    const db = await this.db();
    const [result] = await db.insert(aiDriftMetricsHistory).values({
      modelId,
      accuracy: String(metrics.accuracy),
      precision: metrics.precision !== undefined ? String(metrics.precision) : undefined,
      recall: metrics.recall !== undefined ? String(metrics.recall) : undefined,
      f1Score: metrics.f1Score !== undefined ? String(metrics.f1Score) : undefined,
      predictionCount: metrics.predictionCount,
    });

    const insertId = (result as any).insertId;
    const [record] = await db.select().from(aiDriftMetricsHistory).where(eq(aiDriftMetricsHistory.id, insertId));
    return record;
  }

  async getMetricsHistory(modelId: number, hours: number = 24): Promise<AiDriftMetricsHistory[]> {
    const db = await this.db();
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return await db.select().from(aiDriftMetricsHistory)
      .where(and(
        eq(aiDriftMetricsHistory.modelId, modelId),
        gte(aiDriftMetricsHistory.recordedAt, startTime)
      ))
      .orderBy(aiDriftMetricsHistory.recordedAt);
  }

  // Monitoring Job
  async runMonitoringCheck(modelId: number, currentMetrics: { accuracy: number; features?: Record<string, number[]> }): Promise<{ driftDetected: boolean; alert?: AiDriftAlert; rollbackPerformed?: boolean }> {
    const config = await this.getConfig(modelId);
    if (!config) return { driftDetected: false };

    // Record metrics
    await this.recordMetrics(modelId, { accuracy: currentMetrics.accuracy, predictionCount: 1 });

    // Detect drift
    const driftResult = await this.detectDrift(modelId, currentMetrics);

    if (!driftResult.hasDrift) {
      return { driftDetected: false };
    }

    // Check cooldown
    const recentAlerts = await this.getActiveAlerts(modelId);
    const cooldownMs = config.alertCooldownMinutes * 60 * 1000;
    const hasRecentAlert = recentAlerts.some(a => 
      new Date().getTime() - new Date(a.createdAt).getTime() < cooldownMs
    );

    if (hasRecentAlert) {
      return { driftDetected: true };
    }

    // Create alert
    const alert = await this.createAlert(modelId, driftResult);

    // Check auto-rollback
    let rollbackPerformed = false;
    if (config.autoRollbackEnabled && driftResult.severity === 'critical') {
      const autoRollbackThreshold = parseFloat(config.autoRollbackThreshold as string);
      const rollbackResult = await modelVersioningService.autoRollbackIfNeeded(
        modelId,
        currentMetrics.accuracy,
        autoRollbackThreshold
      );
      rollbackPerformed = rollbackResult.rolled;

      if (rollbackPerformed) {
        await this.resolveAlert(alert.id, `Auto-rollback performed to version ${rollbackResult.toVersion?.version}`);
      }
    }

    return { driftDetected: true, alert, rollbackPerformed };
  }

  // Dashboard Stats
  async getDashboardStats(modelId?: number): Promise<{
    totalAlerts: number;
    activeAlerts: number;
    criticalAlerts: number;
    avgDriftScore: number;
    recentTrend: 'improving' | 'stable' | 'declining';
  }> {
    const db = await this.db();
    let conditions: any[] = [];
    if (modelId) conditions.push(eq(aiDriftAlerts.modelId, modelId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(aiDriftAlerts).where(whereClause);
    
    const activeConditions = [...conditions, eq(aiDriftAlerts.status, 'active')];
    const [{ active }] = await db.select({ active: count() }).from(aiDriftAlerts).where(and(...activeConditions));
    
    const criticalConditions = [...conditions, eq(aiDriftAlerts.severity, 'critical')];
    const [{ critical }] = await db.select({ critical: count() }).from(aiDriftAlerts).where(and(...criticalConditions));

    // Calculate average drift score from recent alerts
    const recentAlerts = await db.select().from(aiDriftAlerts)
      .where(whereClause)
      .orderBy(desc(aiDriftAlerts.createdAt))
      .limit(10);

    const avgDriftScore = recentAlerts.length > 0
      ? recentAlerts.reduce((sum, a) => sum + parseFloat(a.driftScore as string), 0) / recentAlerts.length
      : 0;

    // Determine trend
    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentAlerts.length >= 3) {
      const scores = recentAlerts.slice(0, 3).map(a => parseFloat(a.driftScore as string));
      const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length;
      const olderScores = recentAlerts.slice(3, 6).map(a => parseFloat(a.driftScore as string));
      
      if (olderScores.length > 0) {
        const avgOlder = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;
        if (avgRecent < avgOlder * 0.9) recentTrend = 'improving';
        else if (avgRecent > avgOlder * 1.1) recentTrend = 'declining';
      }
    }

    return {
      totalAlerts: total,
      activeAlerts: active,
      criticalAlerts: critical,
      avgDriftScore,
      recentTrend,
    };
  }
}

export const dataDriftService = new DataDriftService();
