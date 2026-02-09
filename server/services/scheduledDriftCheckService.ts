/**
 * Scheduled Drift Check Service
 * Tự động chạy drift check định kỳ cho tất cả models
 */

import { getDb } from "../db";
import { aiMlModels, aiDriftConfigs, aiDriftAlerts, aiDriftMetricsHistory } from "../../drizzle/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { dataDriftService } from "./dataDriftService";
import { webhookNotificationService } from "./webhookNotificationService";
import { notifyOwner } from "../_core/notification";

export interface DriftCheckResult {
  modelId: number;
  modelName: string;
  checked: boolean;
  driftDetected: boolean;
  alertCreated: boolean;
  severity?: string;
  error?: string;
}

export interface ScheduledCheckSummary {
  startTime: Date;
  endTime: Date;
  duration: number;
  modelsChecked: number;
  alertsCreated: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  errors: number;
  results: DriftCheckResult[];
}

class ScheduledDriftCheckService {
  private async db() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db;
  }

  // Get all models with drift config enabled
  async getModelsWithDriftConfig(): Promise<{ modelId: number; modelName: string }[]> {
    const db = await this.db();
    
    const configs = await db.select({
      modelId: aiDriftConfigs.modelId,
    })
    .from(aiDriftConfigs)
    .where(eq(aiDriftConfigs.isEnabled, 1));

    // Ensure configs is an array
    if (!Array.isArray(configs) || configs.length === 0) {
      return [];
    }

    // Get model names
    const models = await Promise.all(configs.map(async (c) => {
      const [model] = await db.select().from(aiMlModels).where(eq(aiMlModels.id, c.modelId));
      return {
        modelId: c.modelId,
        modelName: model?.name || `Model #${c.modelId}`,
      };
    }));

    return models;
  }

  // Get recent metrics for a model (simulate current accuracy)
  async getRecentMetrics(modelId: number): Promise<{ accuracy: number; predictionCount: number } | null> {
    const db = await this.db();
    
    // Get most recent metrics from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const metrics = await db.select()
      .from(aiDriftMetricsHistory)
      .where(and(
        eq(aiDriftMetricsHistory.modelId, modelId),
        gte(aiDriftMetricsHistory.recordedAt, oneDayAgo)
      ))
      .orderBy(desc(aiDriftMetricsHistory.recordedAt))
      .limit(10);

    if (metrics.length === 0) {
      return null;
    }

    // Calculate average accuracy from recent metrics
    const avgAccuracy = metrics.reduce((sum, m) => sum + parseFloat(m.accuracy as string || '0'), 0) / metrics.length;
    const totalPredictions = metrics.reduce((sum, m) => sum + (m.predictionCount || 0), 0);

    return {
      accuracy: avgAccuracy,
      predictionCount: totalPredictions,
    };
  }

  // Run drift check for a single model
  async checkModel(modelId: number, modelName: string): Promise<DriftCheckResult> {
    try {
      // Get recent metrics
      const metrics = await this.getRecentMetrics(modelId);
      
      if (!metrics) {
        return {
          modelId,
          modelName,
          checked: false,
          driftDetected: false,
          alertCreated: false,
          error: 'No recent metrics available',
        };
      }

      // Run monitoring check
      const result = await dataDriftService.runMonitoringCheck(modelId, {
        accuracy: metrics.accuracy,
      });

      return {
        modelId,
        modelName,
        checked: true,
        driftDetected: result.driftDetected,
        alertCreated: !!result.alert,
        severity: result.alert?.severity,
      };
    } catch (error) {
      return {
        modelId,
        modelName,
        checked: false,
        driftDetected: false,
        alertCreated: false,
        error: String(error),
      };
    }
  }

  // Run scheduled drift check for all models
  async runScheduledCheck(): Promise<ScheduledCheckSummary> {
    const startTime = new Date();
    console.log('[ScheduledDriftCheck] Starting scheduled drift check...');

    const results: DriftCheckResult[] = [];
    let alertsCreated = 0;
    let criticalAlerts = 0;
    let highAlerts = 0;
    let mediumAlerts = 0;
    let lowAlerts = 0;
    let errors = 0;

    try {
      // Get all models with drift config
      const models = await this.getModelsWithDriftConfig();
      console.log(`[ScheduledDriftCheck] Found ${models.length} models with drift config`);

      // Check each model
      for (const model of models) {
        const result = await this.checkModel(model.modelId, model.modelName);
        results.push(result);

        if (result.error) {
          errors++;
        }

        if (result.alertCreated) {
          alertsCreated++;
          
          switch (result.severity) {
            case 'critical': criticalAlerts++; break;
            case 'high': highAlerts++; break;
            case 'medium': mediumAlerts++; break;
            case 'low': lowAlerts++; break;
          }

          // Send webhook notification for each alert
          if (result.severity === 'critical' || result.severity === 'high') {
            await webhookNotificationService.sendDriftAlert({
              modelId: model.modelId,
              modelName: model.modelName,
              driftType: 'accuracy_drop',
              severity: result.severity,
              driftScore: 0.1, // Will be updated with actual score
              recommendation: 'Please review model performance',
            });
          }
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const summary: ScheduledCheckSummary = {
        startTime,
        endTime,
        duration,
        modelsChecked: models.length,
        alertsCreated,
        criticalAlerts,
        highAlerts,
        mediumAlerts,
        lowAlerts,
        errors,
        results,
      };

      console.log(`[ScheduledDriftCheck] Completed: ${models.length} models checked, ${alertsCreated} alerts created, ${errors} errors`);

      // Send summary notification if there are alerts
      if (alertsCreated > 0) {
        await webhookNotificationService.sendDriftCheckSummary({
          modelsChecked: models.length,
          alertsCreated,
          criticalAlerts,
          highAlerts,
          checkDuration: duration,
        });

        // Also notify owner for critical alerts
        if (criticalAlerts > 0) {
          await notifyOwner({
            title: `🔴 Critical Drift Alerts: ${criticalAlerts} models need attention`,
            content: `Scheduled drift check detected ${criticalAlerts} critical alerts.\n\nModels affected:\n${results.filter(r => r.severity === 'critical').map(r => `- ${r.modelName}`).join('\n')}\n\nPlease review immediately.`,
          });
        }
      }

      return summary;
    } catch (error) {
      console.error('[ScheduledDriftCheck] Error:', error);
      
      const endTime = new Date();
      return {
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        modelsChecked: 0,
        alertsCreated: 0,
        criticalAlerts: 0,
        highAlerts: 0,
        mediumAlerts: 0,
        lowAlerts: 0,
        errors: 1,
        results: [],
      };
    }
  }

  // Get last check summary
  async getLastCheckSummary(): Promise<{ lastCheck: Date | null; alertCount: number }> {
    const db = await this.db();
    
    const [lastAlert] = await db.select()
      .from(aiDriftAlerts)
      .orderBy(desc(aiDriftAlerts.createdAt))
      .limit(1);

    return {
      lastCheck: lastAlert?.createdAt || null,
      alertCount: 0, // Will be calculated from actual data
    };
  }
}

export const scheduledDriftCheckService = new ScheduledDriftCheckService();

// Export function for scheduled job
export async function runScheduledDriftCheck(): Promise<ScheduledCheckSummary> {
  return await scheduledDriftCheckService.runScheduledCheck();
}
