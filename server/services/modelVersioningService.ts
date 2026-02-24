/**
 * Model Versioning Service
 * Quản lý phiên bản model AI với khả năng rollback
 */

import { getDb } from "../db";
import { 
  aiModelVersions,
  aiModelRollbackHistory,
  aiMlModels,
  type AiModelVersion,
  type AiModelRollbackHistory
} from "../../drizzle/schema";
import { eq, and, desc, count } from "drizzle-orm";

export type VersionStatus = 'active' | 'inactive' | 'retired';
export type RollbackType = 'manual' | 'automatic';
export type RollbackStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface CreateVersionInput {
  modelId: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  meanAbsoluteError?: number;
  rootMeanSquaredError?: number;
  trainingDataSize?: number;
  validationDataSize?: number;
  hyperparameters?: Record<string, any>;
  featureImportance?: Record<string, number>;
  changeLog?: string;
  createdBy?: number;
}

class ModelVersioningService {
  private async db() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db;
  }

  async createVersion(input: CreateVersionInput): Promise<AiModelVersion> {
    const db = await this.db();
    const [latestVersion] = await db.select().from(aiModelVersions)
      .where(eq(aiModelVersions.modelId, input.modelId))
      .orderBy(desc(aiModelVersions.versionNumber))
      .limit(1);

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
    const version = `${Math.floor(newVersionNumber / 100)}.${Math.floor((newVersionNumber % 100) / 10)}.${newVersionNumber % 10}`;

    const [result] = await db.insert(aiModelVersions).values({
      modelId: input.modelId,
      version,
      versionNumber: newVersionNumber,
      accuracy: input.accuracy !== undefined ? String(input.accuracy) : undefined,
      precision: input.precision !== undefined ? String(input.precision) : undefined,
      recall: input.recall !== undefined ? String(input.recall) : undefined,
      f1Score: input.f1Score !== undefined ? String(input.f1Score) : undefined,
      meanAbsoluteError: input.meanAbsoluteError !== undefined ? String(input.meanAbsoluteError) : undefined,
      rootMeanSquaredError: input.rootMeanSquaredError !== undefined ? String(input.rootMeanSquaredError) : undefined,
      trainingDataSize: input.trainingDataSize,
      validationDataSize: input.validationDataSize,
      hyperparameters: input.hyperparameters,
      featureImportance: input.featureImportance,
      changeLog: input.changeLog,
      isActive: 0,
      isRollbackTarget: 1,
      createdBy: input.createdBy,
    });

    const insertId = (result as any).insertId;
    const [newVersion] = await db.select().from(aiModelVersions).where(eq(aiModelVersions.id, insertId));
    return newVersion;
  }

  async getVersion(versionId: number): Promise<AiModelVersion | null> {
    const db = await this.db();
    const [version] = await db.select().from(aiModelVersions).where(eq(aiModelVersions.id, versionId));
    return version || null;
  }

  async getActiveVersion(modelId: number): Promise<AiModelVersion | null> {
    const db = await this.db();
    const [version] = await db.select().from(aiModelVersions)
      .where(and(eq(aiModelVersions.modelId, modelId), eq(aiModelVersions.isActive, 1)));
    return version || null;
  }

  async listVersions(modelId: number, options?: { includeRetired?: boolean; limit?: number; offset?: number }): Promise<{ versions: AiModelVersion[]; total: number }> {
    const db = await this.db();
    let conditions = [eq(aiModelVersions.modelId, modelId)];
    if (!options?.includeRetired) {
      conditions.push(eq(aiModelVersions.isRollbackTarget, 1));
    }

    const whereClause = and(...conditions);
    const versions = await db.select().from(aiModelVersions)
      .where(whereClause)
      .orderBy(desc(aiModelVersions.versionNumber))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);

    const [{ total }] = await db.select({ total: count() }).from(aiModelVersions).where(whereClause);
    return { versions, total };
  }

  async deployVersion(versionId: number, deployedBy?: number): Promise<AiModelVersion> {
    const db = await this.db();
    const version = await this.getVersion(versionId);
    if (!version) throw new Error("Version not found");

    await db.update(aiModelVersions)
      .set({ isActive: 0 })
      .where(and(eq(aiModelVersions.modelId, version.modelId), eq(aiModelVersions.isActive, 1)));

    await db.update(aiModelVersions)
      .set({ isActive: 1, deployedAt: new Date(), deployedBy })
      .where(eq(aiModelVersions.id, versionId));

    const [updatedVersion] = await db.select().from(aiModelVersions).where(eq(aiModelVersions.id, versionId));
    return updatedVersion;
  }

  async rollback(modelId: number, toVersionId: number, reason: string, rollbackBy?: number, rollbackType: RollbackType = 'manual'): Promise<{ success: boolean; fromVersion: AiModelVersion | null; toVersion: AiModelVersion }> {
    const db = await this.db();
    
    const currentVersion = await this.getActiveVersion(modelId);
    const targetVersion = await this.getVersion(toVersionId);
    
    if (!targetVersion) throw new Error("Target version not found");
    if (!targetVersion.isRollbackTarget) throw new Error("Target version is not available for rollback");

    const [historyResult] = await db.insert(aiModelRollbackHistory).values({
      modelId,
      fromVersionId: currentVersion?.id,
      toVersionId,
      reason,
      rollbackType,
      rollbackBy,
      status: 'in_progress',
    });

    const historyId = (historyResult as any).insertId;

    try {
      if (currentVersion) {
        await db.update(aiModelVersions).set({ isActive: 0 }).where(eq(aiModelVersions.id, currentVersion.id));
      }

      await db.update(aiModelVersions)
        .set({ isActive: 1, deployedAt: new Date(), deployedBy: rollbackBy })
        .where(eq(aiModelVersions.id, toVersionId));

      await db.update(aiModelRollbackHistory)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(aiModelRollbackHistory.id, historyId));

      const [updatedVersion] = await db.select().from(aiModelVersions).where(eq(aiModelVersions.id, toVersionId));
      return { success: true, fromVersion: currentVersion, toVersion: updatedVersion };
    } catch (error) {
      await db.update(aiModelRollbackHistory)
        .set({ status: 'failed', errorMessage: String(error) })
        .where(eq(aiModelRollbackHistory.id, historyId));
      throw error;
    }
  }

  async autoRollbackIfNeeded(modelId: number, currentAccuracy: number, threshold: number): Promise<{ rolled: boolean; toVersion?: AiModelVersion }> {
    const db = await this.db();
    const activeVersion = await this.getActiveVersion(modelId);
    if (!activeVersion) return { rolled: false };

    const baselineAccuracy = parseFloat(activeVersion.accuracy as string || '0');
    const accuracyDrop = (baselineAccuracy - currentAccuracy) / baselineAccuracy;

    if (accuracyDrop <= threshold) return { rolled: false };

    const [previousVersion] = await db.select().from(aiModelVersions)
      .where(and(
        eq(aiModelVersions.modelId, modelId),
        eq(aiModelVersions.isRollbackTarget, 1),
        eq(aiModelVersions.isActive, 0)
      ))
      .orderBy(desc(aiModelVersions.versionNumber))
      .limit(1);

    if (!previousVersion) return { rolled: false };

    const result = await this.rollback(
      modelId,
      previousVersion.id,
      `Auto-rollback triggered: accuracy dropped ${(accuracyDrop * 100).toFixed(2)}% (threshold: ${(threshold * 100).toFixed(2)}%)`,
      undefined,
      'automatic'
    );

    return { rolled: true, toVersion: result.toVersion };
  }

  async retireVersion(versionId: number): Promise<AiModelVersion> {
    const db = await this.db();
    const version = await this.getVersion(versionId);
    if (!version) throw new Error("Version not found");
    if (version.isActive) throw new Error("Cannot retire active version");

    await db.update(aiModelVersions)
      .set({ isRollbackTarget: 0 })
      .where(eq(aiModelVersions.id, versionId));

    const [updatedVersion] = await db.select().from(aiModelVersions).where(eq(aiModelVersions.id, versionId));
    return updatedVersion;
  }

  async restoreVersion(versionId: number): Promise<AiModelVersion> {
    const db = await this.db();
    await db.update(aiModelVersions)
      .set({ isRollbackTarget: 1 })
      .where(eq(aiModelVersions.id, versionId));

    const [updatedVersion] = await db.select().from(aiModelVersions).where(eq(aiModelVersions.id, versionId));
    return updatedVersion;
  }

  async compareVersions(versionAId: number, versionBId: number): Promise<any> {
    const versionA = await this.getVersion(versionAId);
    const versionB = await this.getVersion(versionBId);

    if (!versionA || !versionB) throw new Error("One or both versions not found");

    const metricsToCompare = [
      { name: 'accuracy', higherIsBetter: true },
      { name: 'precision', higherIsBetter: true },
      { name: 'recall', higherIsBetter: true },
      { name: 'f1Score', higherIsBetter: true },
      { name: 'meanAbsoluteError', higherIsBetter: false },
      { name: 'rootMeanSquaredError', higherIsBetter: false },
    ];

    const metrics: any[] = [];
    let aWins = 0, bWins = 0;

    for (const m of metricsToCompare) {
      const valueA = versionA[m.name as keyof AiModelVersion] !== null ? parseFloat(versionA[m.name as keyof AiModelVersion] as string) : null;
      const valueB = versionB[m.name as keyof AiModelVersion] !== null ? parseFloat(versionB[m.name as keyof AiModelVersion] as string) : null;

      let winner: 'A' | 'B' | 'tie' = 'tie';
      let diff = 0;

      if (valueA !== null && valueB !== null) {
        diff = valueA - valueB;
        if (Math.abs(diff) > 0.0001) {
          if (m.higherIsBetter) {
            winner = diff > 0 ? 'A' : 'B';
          } else {
            winner = diff < 0 ? 'A' : 'B';
          }
        }
      }

      if (winner === 'A') aWins++;
      if (winner === 'B') bWins++;

      metrics.push({ metric: m.name, valueA, valueB, diff, winner });
    }

    const overallWinner = aWins > bWins ? 'A' : bWins > aWins ? 'B' : 'tie';

    let recommendation = '';
    if (overallWinner === 'A') {
      recommendation = `Version ${versionA.version} performs better overall with ${aWins} metrics winning.`;
    } else if (overallWinner === 'B') {
      recommendation = `Version ${versionB.version} performs better overall with ${bWins} metrics winning.`;
    } else {
      recommendation = 'Both versions perform similarly.';
    }

    return { versionA, versionB, metrics, overallWinner, recommendation };
  }

  async getRollbackHistory(modelId: number, options?: { limit?: number; offset?: number }): Promise<{ history: AiModelRollbackHistory[]; total: number }> {
    const db = await this.db();
    const history = await db.select().from(aiModelRollbackHistory)
      .where(eq(aiModelRollbackHistory.modelId, modelId))
      .orderBy(desc(aiModelRollbackHistory.createdAt))
      .limit(options?.limit ?? 50)
      .offset(options?.offset ?? 0);

    const [{ total }] = await db.select({ total: count() }).from(aiModelRollbackHistory)
      .where(eq(aiModelRollbackHistory.modelId, modelId));

    return { history, total };
  }

  async getPerformanceTrend(modelId: number, metric: string = 'accuracy'): Promise<{ versions: { version: string; value: number; date: Date }[]; trend: 'improving' | 'declining' | 'stable' }> {
    const db = await this.db();
    const versions = await db.select().from(aiModelVersions)
      .where(eq(aiModelVersions.modelId, modelId))
      .orderBy(aiModelVersions.versionNumber)
      .limit(20);

    const data = versions
      .filter(v => v[metric as keyof AiModelVersion] !== null)
      .map(v => ({
        version: v.version,
        value: parseFloat(v[metric as keyof AiModelVersion] as string),
        date: v.createdAt,
      }));

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (data.length >= 3) {
      const recent = data.slice(-3);
      const diffs = recent.slice(1).map((v, i) => v.value - recent[i].value);
      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;

      if (avgDiff > 0.01) trend = 'improving';
      else if (avgDiff < -0.01) trend = 'declining';
    }

    return { versions: data, trend };
  }
}

export const modelVersioningService = new ModelVersioningService();
