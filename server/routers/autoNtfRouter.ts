/**
 * Auto-NTF Detection Router - API endpoints cho AI tự động đề xuất NTF
 * Phân tích pattern lịch sử để đề xuất NTF, giảm thời gian xác nhận thủ công
 */
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { invokeLLM } from '../_core/llm';
import { 
  spcDefectRecords,
  spcDefectCategories,
  productionLines,
  workstations,
} from '../../drizzle/schema';
import { eq, desc, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { notifyNtfPatternDetected, notifyNtfSuggestionNew } from '../sse';

// NTF = No Trouble Found (Không tìm thấy lỗi)
const NTF_PATTERN_TYPES = {
  REPEATED_FALSE_ALARM: 'repeated_false_alarm',
  MEASUREMENT_DRIFT: 'measurement_drift',
  ENVIRONMENTAL_FACTOR: 'environmental_factor',
  OPERATOR_ERROR: 'operator_error',
  EQUIPMENT_CALIBRATION: 'equipment_calibration',
  INTERMITTENT_ISSUE: 'intermittent_issue',
} as const;

export const autoNtfRouter = router({
  // Analyze patterns and suggest NTF candidates
  analyzePatterns: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      workstationId: z.number().optional(),
      days: z.number().default(30),
      minOccurrences: z.number().default(3),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { suggestions: [], patterns: [] };

      try {
        const endDate = new Date();
        const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

        const conditions: any[] = [
          gte(spcDefectRecords.occurredAt, startDate.toISOString()),
          lte(spcDefectRecords.occurredAt, endDate.toISOString()),
        ];

        if (input.productionLineId) {
          conditions.push(eq(spcDefectRecords.productionLineId, input.productionLineId));
        }
        if (input.workstationId) {
          conditions.push(eq(spcDefectRecords.workstationId, input.workstationId));
        }

        const defects = await db.select()
          .from(spcDefectRecords)
          .where(and(...conditions))
          .orderBy(desc(spcDefectRecords.occurredAt))
          .limit(500);

        if (defects.length === 0) {
          return { suggestions: [], patterns: [], message: 'Không có dữ liệu lỗi trong khoảng thời gian đã chọn' };
        }

        const patterns = analyzeDefectPatterns(defects, input.minOccurrences);
        const suggestions = generateNtfSuggestions(patterns, defects);

        // Send SSE notifications for new patterns
        if (patterns.length > 0) {
          patterns.forEach((pattern, index) => {
            notifyNtfPatternDetected({
              patternId: `pattern-${Date.now()}-${index}`,
              patternType: pattern.type,
              confidence: pattern.confidence,
              affectedDefects: pattern.count,
              productionLineId: input.productionLineId,
              description: pattern.description,
              detectedAt: new Date(),
            });
          });
        }

        // Send SSE notifications for new suggestions
        if (suggestions.length > 0) {
          suggestions.slice(0, 5).forEach((suggestion, index) => {
            notifyNtfSuggestionNew({
              suggestionId: `suggestion-${Date.now()}-${index}`,
              defectIds: suggestion.defectIds,
              defectCount: suggestion.count,
              patternType: suggestion.patternType,
              confidence: suggestion.confidence,
              productionLineId: input.productionLineId,
              reasoning: suggestion.description,
              createdAt: new Date(),
            });
          });
        }

        return {
          suggestions,
          patterns,
          totalDefectsAnalyzed: defects.length,
          analysisDate: new Date().toISOString(),
          periodDays: input.days,
        };
      } catch (error) {
        console.error('Error analyzing NTF patterns:', error);
        return { suggestions: [], patterns: [], error: 'Lỗi khi phân tích pattern' };
      }
    }),

  // Get AI-powered NTF analysis
  getAiAnalysis: protectedProcedure
    .input(z.object({
      defectIds: z.array(z.number()),
      includeHistory: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const defects = await db.select()
          .from(spcDefectRecords)
          .where(inArray(spcDefectRecords.id, input.defectIds));

        if (defects.length === 0) {
          return { error: 'Không tìm thấy dữ liệu lỗi' };
        }

        const defectSummary = defects.map(d => ({
          id: d.id,
          categoryId: d.defectCategoryId,
          ruleViolated: d.ruleViolated,
          quantity: d.quantity,
          occurredAt: d.occurredAt,
          notes: d.notes,
          status: d.status,
        }));

        const prompt = `
Bạn là chuyên gia phân tích chất lượng sản xuất. Hãy phân tích các lỗi sau và xác định xem có phải là NTF (No Trouble Found) hay không.

Dữ liệu lỗi:
${JSON.stringify(defectSummary, null, 2)}

Hãy phân tích và trả về JSON với format:
{
  "isNtfCandidate": boolean,
  "confidence": number (0-100),
  "patternType": string,
  "reasoning": string,
  "recommendations": string[],
  "rootCauseAnalysis": string
}
`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'Bạn là chuyên gia phân tích chất lượng SPC/CPK. Trả lời bằng JSON hợp lệ.' },
            { role: 'user', content: prompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'ntf_analysis',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  isNtfCandidate: { type: 'boolean' },
                  confidence: { type: 'number' },
                  patternType: { type: 'string' },
                  reasoning: { type: 'string' },
                  recommendations: { type: 'array', items: { type: 'string' } },
                  rootCauseAnalysis: { type: 'string' },
                },
                required: ['isNtfCandidate', 'confidence', 'patternType', 'reasoning', 'recommendations', 'rootCauseAnalysis'],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) return { error: 'Không nhận được phản hồi từ AI' };

        return {
          analysis: JSON.parse(content),
          defectIds: input.defectIds,
          analyzedAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Error in AI analysis:', error);
        return { error: 'Lỗi khi phân tích AI' };
      }
    }),

  // Confirm NTF suggestion
  confirmNtf: protectedProcedure
    .input(z.object({
      defectIds: z.array(z.number()),
      isNtf: z.boolean(),
      rootCause: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return { success: false };

      try {
        await db.update(spcDefectRecords)
          .set({
            verificationStatus: input.isNtf ? 'ntf' : 'real_ng',
            verifiedBy: ctx.user?.id,
            verifiedAt: new Date().toISOString(),
            verificationNotes: input.notes || undefined,
            ntfReason: input.isNtf ? input.rootCause : undefined,
            rootCause: input.rootCause,
          })
          .where(inArray(spcDefectRecords.id, input.defectIds));

        return { 
          success: true, 
          updatedCount: input.defectIds.length,
        };
      } catch (error) {
        console.error('Error confirming NTF:', error);
        return { success: false, error: 'Lỗi khi xác nhận NTF' };
      }
    }),

  // Get NTF statistics
  getStatistics: protectedProcedure
    .input(z.object({
      days: z.number().default(30),
      productionLineId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      try {
        const endDate = new Date();
        const startDate = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

        const conditions: any[] = [
          gte(spcDefectRecords.occurredAt, startDate.toISOString()),
          lte(spcDefectRecords.occurredAt, endDate.toISOString()),
        ];

        if (input.productionLineId) {
          conditions.push(eq(spcDefectRecords.productionLineId, input.productionLineId));
        }

        const totalResult = await db.select({
          total: sql<number>`COUNT(*)`,
          ntfCount: sql<number>`SUM(CASE WHEN ${spcDefectRecords.verificationStatus} = 'ntf' THEN 1 ELSE 0 END)`,
          confirmedCount: sql<number>`SUM(CASE WHEN ${spcDefectRecords.verifiedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
          pendingCount: sql<number>`SUM(CASE WHEN ${spcDefectRecords.verificationStatus} = 'pending' THEN 1 ELSE 0 END)`,
        })
        .from(spcDefectRecords)
        .where(and(...conditions));

        const stats = totalResult[0];
        const total = Number(stats?.total) || 0;
        const ntfCount = Number(stats?.ntfCount) || 0;
        const confirmedCount = Number(stats?.confirmedCount) || 0;
        const pendingCount = Number(stats?.pendingCount) || 0;

        const byPatternType = await db.select({
          rootCause: spcDefectRecords.ntfReason,
          count: sql<number>`COUNT(*)`,
        })
        .from(spcDefectRecords)
        .where(
          and(
            ...conditions,
            eq(spcDefectRecords.verificationStatus, 'ntf'),
          )
        )
        .groupBy(spcDefectRecords.ntfReason);

        return {
          totalDefects: total,
          ntfCount,
          ntfRate: total > 0 ? Math.round((ntfCount / total) * 10000) / 100 : 0,
          confirmedCount,
          pendingCount,
          byPatternType: byPatternType.map(p => ({
            pattern: p.rootCause || 'Unknown',
            count: Number(p.count) || 0,
          })),
          periodDays: input.days,
        };
      } catch (error) {
        console.error('Error fetching NTF statistics:', error);
        return null;
      }
    }),

  // Get pending NTF suggestions
  getPendingSuggestions: protectedProcedure
    .input(z.object({
      productionLineId: z.number().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      try {
        const conditions: any[] = [
          eq(spcDefectRecords.verificationStatus, 'pending'),
        ];

        if (input.productionLineId) {
          conditions.push(eq(spcDefectRecords.productionLineId, input.productionLineId));
        }

        const pendingDefects = await db.select()
          .from(spcDefectRecords)
          .where(and(...conditions))
          .orderBy(desc(spcDefectRecords.occurredAt))
          .limit(input.limit);

        const grouped = groupSimilarDefects(pendingDefects);

        return grouped.map(group => ({
          defectIds: group.defects.map(d => d.id),
          defectType: String(group.defects[0]?.defectCategoryId) || 'Unknown',
          count: group.defects.length,
          latestOccurredAt: group.defects[0]?.occurredAt,
          workstationId: group.defects[0]?.workstationId,
          productionLineId: group.defects[0]?.productionLineId,
          suggestedPattern: group.suggestedPattern,
          confidence: group.confidence,
        }));
      } catch (error) {
        console.error('Error fetching pending suggestions:', error);
        return [];
      }
    }),
});

// Helper functions
function analyzeDefectPatterns(defects: any[], minOccurrences: number) {
  const patterns: any[] = [];
  
  const byType = new Map<string, any[]>();
  defects.forEach(d => {
    const key = String(d.defectCategoryId) || 'unknown';
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(d);
  });

  byType.forEach((group, type) => {
    if (group.length < minOccurrences) return;

    const quantityVariance = calculateVariance(group.map(d => Number(d.quantity) || 0));
    if (quantityVariance < 0.5 && group.length >= minOccurrences) {
      patterns.push({
        type: NTF_PATTERN_TYPES.REPEATED_FALSE_ALARM,
        defectType: type,
        count: group.length,
        confidence: 80,
        description: `Lỗi category "${type}" xuất hiện ${group.length} lần với số lượng tương tự`,
      });
    }

    const hourDistribution = analyzeHourDistribution(group);
    if (hourDistribution.peakHours.length > 0) {
      patterns.push({
        type: NTF_PATTERN_TYPES.ENVIRONMENTAL_FACTOR,
        defectType: type,
        count: group.length,
        confidence: 60,
        description: `Lỗi "${type}" tập trung vào các giờ: ${hourDistribution.peakHours.join(', ')}`,
        peakHours: hourDistribution.peakHours,
      });
    }
  });

  return patterns;
}

function generateNtfSuggestions(patterns: any[], defects: any[]) {
  const suggestions: any[] = [];

  patterns.forEach(pattern => {
    const relatedDefects = defects.filter(d => String(d.defectCategoryId) === pattern.defectType);
    
    suggestions.push({
      patternType: pattern.type,
      defectType: pattern.defectType,
      defectIds: relatedDefects.slice(0, 10).map(d => d.id),
      confidence: pattern.confidence,
      description: pattern.description,
      recommendation: getRecommendation(pattern.type),
      count: relatedDefects.length,
    });
  });

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function getRecommendation(patternType: string): string {
  const recommendations: Record<string, string> = {
    [NTF_PATTERN_TYPES.REPEATED_FALSE_ALARM]: 'Kiểm tra lại ngưỡng cảnh báo và hiệu chuẩn thiết bị đo',
    [NTF_PATTERN_TYPES.MEASUREMENT_DRIFT]: 'Thực hiện hiệu chuẩn thiết bị đo và kiểm tra độ ổn định',
    [NTF_PATTERN_TYPES.ENVIRONMENTAL_FACTOR]: 'Kiểm tra điều kiện môi trường trong các giờ cao điểm',
    [NTF_PATTERN_TYPES.OPERATOR_ERROR]: 'Đào tạo lại quy trình vận hành cho nhân viên',
    [NTF_PATTERN_TYPES.EQUIPMENT_CALIBRATION]: 'Lên lịch hiệu chuẩn thiết bị định kỳ',
    [NTF_PATTERN_TYPES.INTERMITTENT_ISSUE]: 'Theo dõi và ghi nhận chi tiết các điều kiện khi lỗi xảy ra',
  };
  return recommendations[patternType] || 'Cần phân tích thêm để xác định nguyên nhân';
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function analyzeHourDistribution(defects: any[]) {
  const hourCounts = new Array(24).fill(0);
  defects.forEach(d => {
    const hour = new Date(d.occurredAt).getHours();
    hourCounts[hour]++;
  });

  const avgCount = defects.length / 24;
  const peakHours = hourCounts
    .map((count, hour) => ({ hour, count }))
    .filter(h => h.count > avgCount * 2)
    .map(h => h.hour);

  return { hourCounts, peakHours };
}

function groupSimilarDefects(defects: any[]) {
  const groups: any[] = [];
  const grouped = new Map<string, any[]>();

  defects.forEach(d => {
    const key = `${d.defectCategoryId}_${d.workstationId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  });

  grouped.forEach((group, key) => {
    if (group.length >= 2) {
      groups.push({
        defects: group,
        suggestedPattern: NTF_PATTERN_TYPES.REPEATED_FALSE_ALARM,
        confidence: Math.min(50 + group.length * 10, 90),
      });
    }
  });

  return groups;
}
