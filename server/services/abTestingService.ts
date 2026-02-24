/**
 * A/B Testing Service
 * So sánh hiệu quả giữa các model versions trong production
 */

import { getDb } from "../db";
import { 
  aiAbTests,
  aiAbTestResults,
  aiAbTestStats,
  aiMlModels,
  type AiAbTest,
  type AiAbTestResult
} from "../../drizzle/schema";
import { eq, and, desc, count } from "drizzle-orm";

// Types
export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
export type ABTestVariant = 'A' | 'B';

export interface CreateABTestInput {
  name: string;
  description?: string;
  modelAId: number;
  modelBId: number;
  trafficSplitA?: number;
  trafficSplitB?: number;
  minSampleSize?: number;
  confidenceLevel?: number;
  startDate?: Date;
  endDate?: Date;
  createdBy?: number;
}

export interface ABTestStats {
  modelId: number;
  modelName: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  meanError: number;
  meanAbsoluteError: number;
  rootMeanSquaredError: number;
  avgResponseTime: number;
}

export interface ABTestComparison {
  testId: number;
  testName: string;
  status: ABTestStatus;
  modelA: ABTestStats;
  modelB: ABTestStats;
  winner: ABTestVariant | 'tie' | null;
  isSignificant: boolean;
  pValue: number;
  confidenceInterval: { lower: number; upper: number };
  sampleSizeReached: boolean;
  recommendation: string;
}

class ABTestingService {
  private async db() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    return db;
  }

  async createTest(input: CreateABTestInput): Promise<AiAbTest> {
    const db = await this.db();
    const trafficSplitA = input.trafficSplitA ?? 50;
    const trafficSplitB = input.trafficSplitB ?? 50;

    if (trafficSplitA + trafficSplitB !== 100) {
      throw new Error("Traffic split must sum to 100%");
    }

    const [result] = await db.insert(aiAbTests).values({
      name: input.name,
      description: input.description,
      modelAId: input.modelAId,
      modelBId: input.modelBId,
      trafficSplitA,
      trafficSplitB,
      minSampleSize: input.minSampleSize ?? 1000,
      confidenceLevel: String(input.confidenceLevel ?? 0.95),
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'draft',
      createdBy: input.createdBy,
    });

    const insertId = (result as any).insertId;
    const [test] = await db.select().from(aiAbTests).where(eq(aiAbTests.id, insertId));
    return test;
  }

  async startTest(testId: number): Promise<AiAbTest> {
    const db = await this.db();
    await db.update(aiAbTests).set({ status: 'running', startDate: new Date() }).where(eq(aiAbTests.id, testId));
    const [test] = await db.select().from(aiAbTests).where(eq(aiAbTests.id, testId));
    return test;
  }

  async pauseTest(testId: number): Promise<AiAbTest> {
    const db = await this.db();
    await db.update(aiAbTests).set({ status: 'paused' }).where(eq(aiAbTests.id, testId));
    const [test] = await db.select().from(aiAbTests).where(eq(aiAbTests.id, testId));
    return test;
  }

  async completeTest(testId: number, winnerId?: number): Promise<AiAbTest> {
    const db = await this.db();
    await db.update(aiAbTests).set({ status: 'completed', endDate: new Date(), winnerId }).where(eq(aiAbTests.id, testId));
    const [test] = await db.select().from(aiAbTests).where(eq(aiAbTests.id, testId));
    return test;
  }

  async cancelTest(testId: number): Promise<AiAbTest> {
    const db = await this.db();
    await db.update(aiAbTests).set({ status: 'cancelled', endDate: new Date() }).where(eq(aiAbTests.id, testId));
    const [test] = await db.select().from(aiAbTests).where(eq(aiAbTests.id, testId));
    return test;
  }

  async getTest(testId: number): Promise<AiAbTest | null> {
    const db = await this.db();
    const [test] = await db.select().from(aiAbTests).where(eq(aiAbTests.id, testId));
    return test || null;
  }

  async listTests(options?: { status?: ABTestStatus; limit?: number; offset?: number }): Promise<{ tests: AiAbTest[]; total: number }> {
    const db = await this.db();
    let conditions: any[] = [];
    if (options?.status) conditions.push(eq(aiAbTests.status, options.status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const tests = await db.select().from(aiAbTests).where(whereClause).orderBy(desc(aiAbTests.createdAt)).limit(options?.limit ?? 50).offset(options?.offset ?? 0);
    const [{ total }] = await db.select({ total: count() }).from(aiAbTests).where(whereClause);

    return { tests, total };
  }

  async getRunningTests(): Promise<AiAbTest[]> {
    const db = await this.db();
    return await db.select().from(aiAbTests).where(eq(aiAbTests.status, 'running'));
  }

  selectModelForPrediction(test: AiAbTest): { modelId: number; variant: ABTestVariant } {
    const random = Math.random() * 100;
    if (random < test.trafficSplitA) {
      return { modelId: test.modelAId, variant: 'A' };
    }
    return { modelId: test.modelBId, variant: 'B' };
  }

  async recordResult(input: { testId: number; variant: ABTestVariant; predictionId: number; predictedValue: number; actualValue?: number; isCorrect?: boolean; responseTimeMs?: number }): Promise<AiAbTestResult> {
    const db = await this.db();
    const [result] = await db.insert(aiAbTestResults).values({
      testId: input.testId,
      variant: input.variant,
      predictionId: input.predictionId,
      predictedValue: String(input.predictedValue),
      actualValue: input.actualValue !== undefined ? String(input.actualValue) : undefined,
      isCorrect: input.isCorrect !== undefined ? (input.isCorrect ? 1 : 0) : undefined,
      responseTimeMs: input.responseTimeMs,
    });

    const insertId = (result as any).insertId;
    const [record] = await db.select().from(aiAbTestResults).where(eq(aiAbTestResults.id, insertId));
    return record;
  }

  async getTestStats(testId: number): Promise<{ modelA: ABTestStats; modelB: ABTestStats }> {
    const db = await this.db();
    const test = await this.getTest(testId);
    if (!test) throw new Error("Test not found");

    const [modelA] = await db.select().from(aiMlModels).where(eq(aiMlModels.id, test.modelAId));
    const [modelB] = await db.select().from(aiMlModels).where(eq(aiMlModels.id, test.modelBId));

    const statsA = await this.calculateVariantStats(testId, 'A', modelA?.name || 'Model A');
    const statsB = await this.calculateVariantStats(testId, 'B', modelB?.name || 'Model B');

    return { modelA: statsA, modelB: statsB };
  }

  private async calculateVariantStats(testId: number, variant: ABTestVariant, modelName: string): Promise<ABTestStats> {
    const db = await this.db();
    const results = await db.select().from(aiAbTestResults).where(and(eq(aiAbTestResults.testId, testId), eq(aiAbTestResults.variant, variant)));

    const totalPredictions = results.length;
    const correctPredictions = results.filter(r => r.isCorrect === 1).length;
    const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

    let sumError = 0, sumAbsError = 0, sumSquaredError = 0, sumResponseTime = 0;
    let errorCount = 0, responseTimeCount = 0;

    for (const r of results) {
      if (r.actualValue !== null && r.predictedValue !== null) {
        const error = parseFloat(r.actualValue as string) - parseFloat(r.predictedValue as string);
        sumError += error;
        sumAbsError += Math.abs(error);
        sumSquaredError += error * error;
        errorCount++;
      }
      if (r.responseTimeMs !== null) {
        sumResponseTime += r.responseTimeMs;
        responseTimeCount++;
      }
    }

    return {
      modelId: 0,
      modelName,
      totalPredictions,
      correctPredictions,
      accuracy,
      meanError: errorCount > 0 ? sumError / errorCount : 0,
      meanAbsoluteError: errorCount > 0 ? sumAbsError / errorCount : 0,
      rootMeanSquaredError: errorCount > 0 ? Math.sqrt(sumSquaredError / errorCount) : 0,
      avgResponseTime: responseTimeCount > 0 ? sumResponseTime / responseTimeCount : 0,
    };
  }

  async compareModels(testId: number): Promise<ABTestComparison> {
    const db = await this.db();
    const test = await this.getTest(testId);
    if (!test) throw new Error("Test not found");

    const { modelA, modelB } = await this.getTestStats(testId);
    const confidenceLevel = parseFloat(test.confidenceLevel as string || '0.95');
    const { winner, isSignificant, pValue, confidenceInterval } = this.determineWinner(modelA, modelB, confidenceLevel);
    const sampleSizeReached = modelA.totalPredictions >= test.minSampleSize && modelB.totalPredictions >= test.minSampleSize;

    let recommendation = '';
    if (!sampleSizeReached) {
      recommendation = `Cần thêm ${Math.max(0, test.minSampleSize - modelA.totalPredictions)} predictions cho Model A và ${Math.max(0, test.minSampleSize - modelB.totalPredictions)} predictions cho Model B để đạt sample size tối thiểu.`;
    } else if (!isSignificant) {
      recommendation = 'Chưa có sự khác biệt có ý nghĩa thống kê giữa hai models. Tiếp tục thu thập dữ liệu hoặc điều chỉnh traffic split.';
    } else if (winner === 'A') {
      recommendation = `Model A (${modelA.modelName}) có hiệu suất tốt hơn với accuracy ${(modelA.accuracy * 100).toFixed(2)}%. Khuyến nghị deploy Model A.`;
    } else if (winner === 'B') {
      recommendation = `Model B (${modelB.modelName}) có hiệu suất tốt hơn với accuracy ${(modelB.accuracy * 100).toFixed(2)}%. Khuyến nghị deploy Model B.`;
    } else {
      recommendation = 'Hai models có hiệu suất tương đương. Có thể chọn model nào cũng được.';
    }

    return {
      testId,
      testName: test.name,
      status: test.status as ABTestStatus,
      modelA,
      modelB,
      winner,
      isSignificant,
      pValue,
      confidenceInterval,
      sampleSizeReached,
      recommendation,
    };
  }

  determineWinner(statsA: ABTestStats, statsB: ABTestStats, confidenceLevel: number): { winner: ABTestVariant | 'tie' | null; isSignificant: boolean; pValue: number; confidenceInterval: { lower: number; upper: number } } {
    const nA = statsA.totalPredictions;
    const nB = statsB.totalPredictions;

    if (nA < 30 || nB < 30) {
      return { winner: null, isSignificant: false, pValue: 1, confidenceInterval: { lower: -1, upper: 1 } };
    }

    const pA = statsA.accuracy;
    const pB = statsB.accuracy;
    const diff = pA - pB;

    const pooledSE = Math.sqrt((pA * (1 - pA) / nA) + (pB * (1 - pB) / nB));
    if (pooledSE === 0) {
      return { winner: 'tie', isSignificant: false, pValue: 1, confidenceInterval: { lower: 0, upper: 0 } };
    }

    const zScore = diff / pooledSE;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    const zAlpha = this.getZScore(confidenceLevel);
    const marginOfError = zAlpha * pooledSE;
    const confidenceInterval = { lower: diff - marginOfError, upper: diff + marginOfError };

    const alpha = 1 - confidenceLevel;
    const isSignificant = pValue < alpha;

    let winner: ABTestVariant | 'tie' | null = null;
    if (isSignificant) {
      winner = diff > 0 ? 'A' : diff < 0 ? 'B' : 'tie';
    }

    return { winner, isSignificant, pValue, confidenceInterval };
  }

  normalCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  private getZScore(confidenceLevel: number): number {
    const zScores: Record<number, number> = { 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 };
    return zScores[confidenceLevel] || 1.96;
  }

  async updateStats(testId: number): Promise<void> {
    const db = await this.db();
    const { modelA, modelB } = await this.getTestStats(testId);
    const comparison = await this.compareModels(testId);

    await db.delete(aiAbTestStats).where(eq(aiAbTestStats.testId, testId));

    await db.insert(aiAbTestStats).values([
      { testId, variant: 'A', totalPredictions: modelA.totalPredictions, correctPredictions: modelA.correctPredictions, accuracy: String(modelA.accuracy), meanError: String(modelA.meanError), meanAbsoluteError: String(modelA.meanAbsoluteError), rootMeanSquaredError: String(modelA.rootMeanSquaredError), avgResponseTimeMs: String(modelA.avgResponseTime) },
      { testId, variant: 'B', totalPredictions: modelB.totalPredictions, correctPredictions: modelB.correctPredictions, accuracy: String(modelB.accuracy), meanError: String(modelB.meanError), meanAbsoluteError: String(modelB.meanAbsoluteError), rootMeanSquaredError: String(modelB.rootMeanSquaredError), avgResponseTimeMs: String(modelB.avgResponseTime) },
    ]);

    await db.update(aiAbTests).set({ pValue: String(comparison.pValue), isSignificant: comparison.isSignificant ? 1 : 0, winnerId: comparison.winner === 'A' ? modelA.modelId : comparison.winner === 'B' ? modelB.modelId : null }).where(eq(aiAbTests.id, testId));
  }

  async autoCompleteIfReady(testId: number): Promise<boolean> {
    const test = await this.getTest(testId);
    if (!test || test.status !== 'running') return false;

    const comparison = await this.compareModels(testId);
    if (comparison.sampleSizeReached && comparison.isSignificant) {
      const winnerId = comparison.winner === 'A' ? test.modelAId : comparison.winner === 'B' ? test.modelBId : null;
      await this.completeTest(testId, winnerId ?? undefined);
      return true;
    }

    if (test.endDate && new Date() > test.endDate) {
      const winnerId = comparison.winner === 'A' ? test.modelAId : comparison.winner === 'B' ? test.modelBId : null;
      await this.completeTest(testId, winnerId ?? undefined);
      return true;
    }

    return false;
  }
}

export const abTestingService = new ABTestingService();
