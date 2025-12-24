/**
 * AI SPC Analysis Service
 * Provides AI-powered analysis for SPC data using LLM
 */

import { invokeLLM } from "../_core/llm";

// Types
export interface SpcMetrics {
  mean: number;
  stdDev: number;
  cp: number;
  cpk: number;
  pp?: number;
  ppk?: number;
  usl: number;
  lsl: number;
  ucl: number;
  lcl: number;
  sampleSize: number;
}

export interface SpcDataPoint {
  value: number;
  timestamp: Date;
  isViolation?: boolean;
  violationRules?: string[];
}

export interface SpcViolation {
  rule: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedPoints: number[];
}

export interface AiRecommendation {
  id: string;
  title: string;
  description: string;
  category: "process" | "equipment" | "material" | "operator" | "environment" | "measurement";
  priority: "low" | "medium" | "high" | "critical";
  expectedImpact: string;
  estimatedEffort: "low" | "medium" | "high";
  relatedRules?: string[];
}

export interface AiAnalysisResult {
  summary: string;
  healthScore: number;
  processHealth: "excellent" | "good" | "warning" | "critical";
  keyFindings: string[];
  rootCauseAnalysis: string[];
  recommendations: AiRecommendation[];
  trendPrediction: {
    direction: "improving" | "stable" | "declining";
    confidence: number;
    predictedCpk7Days?: number;
  };
  riskAssessment: {
    level: "low" | "medium" | "high" | "critical";
    factors: string[];
  };
}

export interface QuickInsight {
  insights: string[];
  alerts: string[];
}

/**
 * Generate quick insights based on SPC metrics (no LLM required)
 */
export function generateQuickInsights(metrics: SpcMetrics): QuickInsight {
  const insights: string[] = [];
  const alerts: string[] = [];

  // CPK Analysis
  if (metrics.cpk >= 1.67) {
    insights.push(`CPK xuất sắc (${metrics.cpk.toFixed(3)}) - Quy trình hoạt động rất tốt`);
  } else if (metrics.cpk >= 1.33) {
    insights.push(`CPK tốt (${metrics.cpk.toFixed(3)}) - Quy trình ổn định`);
  } else if (metrics.cpk >= 1.0) {
    alerts.push(`CPK chấp nhận được (${metrics.cpk.toFixed(3)}) - Cần cải thiện`);
  } else {
    alerts.push(`CPK không đạt (${metrics.cpk.toFixed(3)}) - Cần hành động ngay`);
  }

  // Process Centering
  const target = (metrics.usl + metrics.lsl) / 2;
  const offset = Math.abs(metrics.mean - target);
  const tolerance = metrics.usl - metrics.lsl;
  const offsetPercent = (offset / tolerance) * 100;

  if (offsetPercent > 25) {
    alerts.push(`Quy trình lệch tâm đáng kể (${offsetPercent.toFixed(1)}% so với target)`);
  } else if (offsetPercent > 15) {
    insights.push(`Quy trình hơi lệch tâm (${offsetPercent.toFixed(1)}%)`);
  } else {
    insights.push(`Quy trình căn tâm tốt (lệch ${offsetPercent.toFixed(1)}%)`);
  }

  // Variation Analysis
  const sixSigma = 6 * metrics.stdDev;
  const variationRatio = (sixSigma / tolerance) * 100;

  if (variationRatio > 100) {
    alerts.push(`Biến động vượt quá dung sai (${variationRatio.toFixed(1)}%)`);
  } else if (variationRatio > 80) {
    alerts.push(`Biến động cao (${variationRatio.toFixed(1)}% dung sai)`);
  } else {
    insights.push(`Biến động trong tầm kiểm soát (${variationRatio.toFixed(1)}% dung sai)`);
  }

  // CP vs CPK comparison
  if (metrics.cp > 0 && metrics.cpk > 0) {
    const cpCpkDiff = metrics.cp - metrics.cpk;
    if (cpCpkDiff > 0.3) {
      insights.push(`Chênh lệch CP-CPK lớn (${cpCpkDiff.toFixed(3)}) - Cần căn chỉnh tâm quy trình`);
    }
  }

  // Sample size
  if (metrics.sampleSize < 30) {
    alerts.push(`Cỡ mẫu nhỏ (${metrics.sampleSize}) - Kết quả có thể chưa đại diện`);
  }

  return { insights, alerts };
}

/**
 * Analyze CPK trend from historical data
 */
export function analyzeCpkTrend(historicalCpk: number[]): {
  direction: "improving" | "stable" | "declining";
  confidence: number;
  changeRate: number;
} {
  if (historicalCpk.length < 3) {
    return { direction: "stable", confidence: 0.5, changeRate: 0 };
  }

  const n = historicalCpk.length;
  const xMean = (n - 1) / 2;
  const yMean = historicalCpk.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;

  historicalCpk.forEach((cpk, i) => {
    numerator += (i - xMean) * (cpk - yMean);
    denominator += Math.pow(i - xMean, 2);
  });

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const changeRate = slope * n;

  // Calculate R-squared for confidence
  const predictions = historicalCpk.map((_, i) => yMean + slope * (i - xMean));
  const ssRes = historicalCpk.reduce((sum, cpk, i) => sum + Math.pow(cpk - predictions[i], 2), 0);
  const ssTot = historicalCpk.reduce((sum, cpk) => sum + Math.pow(cpk - yMean, 2), 0);
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  let direction: "improving" | "stable" | "declining" = "stable";
  if (changeRate > 0.05) direction = "improving";
  else if (changeRate < -0.05) direction = "declining";

  return {
    direction,
    confidence: Math.max(0.3, Math.min(0.95, rSquared)),
    changeRate,
  };
}

/**
 * Calculate process health score
 */
export function calculateHealthScore(
  metrics: SpcMetrics,
  violations: SpcViolation[]
): { score: number; health: "excellent" | "good" | "warning" | "critical" } {
  let score = 100;

  // CPK contribution (40 points)
  if (metrics.cpk >= 1.67) score -= 0;
  else if (metrics.cpk >= 1.33) score -= 10;
  else if (metrics.cpk >= 1.0) score -= 25;
  else score -= 40;

  // Violations contribution (30 points)
  const criticalViolations = violations.filter((v) => v.severity === "critical").length;
  const highViolations = violations.filter((v) => v.severity === "high").length;
  const mediumViolations = violations.filter((v) => v.severity === "medium").length;

  score -= criticalViolations * 15;
  score -= highViolations * 8;
  score -= mediumViolations * 3;

  // Centering contribution (15 points)
  const target = (metrics.usl + metrics.lsl) / 2;
  const offsetPercent = (Math.abs(metrics.mean - target) / (metrics.usl - metrics.lsl)) * 100;
  if (offsetPercent > 25) score -= 15;
  else if (offsetPercent > 15) score -= 8;
  else if (offsetPercent > 10) score -= 3;

  // Variation contribution (15 points)
  const sixSigma = 6 * metrics.stdDev;
  const variationRatio = sixSigma / (metrics.usl - metrics.lsl);
  if (variationRatio > 1) score -= 15;
  else if (variationRatio > 0.8) score -= 8;
  else if (variationRatio > 0.6) score -= 3;

  score = Math.max(0, Math.min(100, score));

  let health: "excellent" | "good" | "warning" | "critical";
  if (score >= 85) health = "excellent";
  else if (score >= 70) health = "good";
  else if (score >= 50) health = "warning";
  else health = "critical";

  return { score, health };
}

/**
 * Assess risk level
 */
export function assessRisk(
  metrics: SpcMetrics,
  violations: SpcViolation[]
): { level: "low" | "medium" | "high" | "critical"; factors: string[] } {
  const factors: string[] = [];
  let riskScore = 0;

  // CPK risk
  if (metrics.cpk < 1.0) {
    factors.push("CPK dưới ngưỡng chấp nhận");
    riskScore += 40;
  } else if (metrics.cpk < 1.33) {
    factors.push("CPK dưới ngưỡng mục tiêu");
    riskScore += 20;
  }

  // Violation risk
  const criticalCount = violations.filter((v) => v.severity === "critical").length;
  const highCount = violations.filter((v) => v.severity === "high").length;

  if (criticalCount > 0) {
    factors.push(`${criticalCount} vi phạm nghiêm trọng`);
    riskScore += criticalCount * 20;
  }
  if (highCount > 0) {
    factors.push(`${highCount} vi phạm mức cao`);
    riskScore += highCount * 10;
  }

  // Out of spec risk
  const distanceToUSL = metrics.usl - metrics.mean;
  const distanceToLSL = metrics.mean - metrics.lsl;
  const minDistance = Math.min(distanceToUSL, distanceToLSL);

  if (minDistance < metrics.stdDev) {
    factors.push("Giá trị trung bình gần giới hạn spec");
    riskScore += 25;
  } else if (minDistance < 2 * metrics.stdDev) {
    factors.push("Khoảng cách đến spec hẹp");
    riskScore += 10;
  }

  let level: "low" | "medium" | "high" | "critical";
  if (riskScore >= 60) level = "critical";
  else if (riskScore >= 40) level = "high";
  else if (riskScore >= 20) level = "medium";
  else level = "low";

  return { level, factors };
}

/**
 * Generate AI recommendations using LLM
 */
export async function generateAiAnalysis(
  productCode: string,
  stationName: string,
  metrics: SpcMetrics,
  recentData: SpcDataPoint[],
  violations: SpcViolation[],
  historicalCpk?: number[]
): Promise<AiAnalysisResult> {
  // Calculate basic metrics first
  const { score: healthScore, health: processHealth } = calculateHealthScore(metrics, violations);
  const trendAnalysis = historicalCpk ? analyzeCpkTrend(historicalCpk) : { direction: "stable" as const, confidence: 0.5, changeRate: 0 };
  const riskAssessment = assessRisk(metrics, violations);
  const quickInsights = generateQuickInsights(metrics);

  // Prepare context for LLM
  const context = `
Phân tích SPC cho sản phẩm ${productCode} tại trạm ${stationName}:

Chỉ số hiện tại:
- Mean: ${metrics.mean.toFixed(4)}
- StdDev: ${metrics.stdDev.toFixed(4)}
- CP: ${metrics.cp.toFixed(3)}
- CPK: ${metrics.cpk.toFixed(3)}
- USL: ${metrics.usl}, LSL: ${metrics.lsl}
- UCL: ${metrics.ucl.toFixed(4)}, LCL: ${metrics.lcl.toFixed(4)}
- Cỡ mẫu: ${metrics.sampleSize}

Vi phạm:
${violations.length > 0 ? violations.map((v) => `- ${v.rule}: ${v.description} (${v.severity})`).join("\n") : "Không có vi phạm"}

Xu hướng CPK: ${trendAnalysis.direction} (độ tin cậy ${(trendAnalysis.confidence * 100).toFixed(0)}%)
Điểm sức khỏe: ${healthScore}/100 (${processHealth})
Mức rủi ro: ${riskAssessment.level}
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Bạn là chuyên gia SPC/CPK với kinh nghiệm phân tích quy trình sản xuất. 
Hãy phân tích dữ liệu SPC và đưa ra:
1. Tóm tắt ngắn gọn (2-3 câu)
2. 3-5 phát hiện chính
3. 2-4 nguyên nhân gốc rễ có thể
4. 3-5 khuyến nghị cải tiến theo phương pháp 5M1E (Man, Machine, Material, Method, Measurement, Environment)

Trả lời bằng tiếng Việt, ngắn gọn và thực tế.`,
        },
        {
          role: "user",
          content: context,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "spc_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Tóm tắt ngắn gọn" },
              keyFindings: {
                type: "array",
                items: { type: "string" },
                description: "Các phát hiện chính",
              },
              rootCauses: {
                type: "array",
                items: { type: "string" },
                description: "Nguyên nhân gốc rễ có thể",
              },
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    category: {
                      type: "string",
                      enum: ["process", "equipment", "material", "operator", "environment", "measurement"],
                    },
                    priority: {
                      type: "string",
                      enum: ["low", "medium", "high", "critical"],
                    },
                    expectedImpact: { type: "string" },
                    estimatedEffort: {
                      type: "string",
                      enum: ["low", "medium", "high"],
                    },
                  },
                  required: ["title", "description", "category", "priority", "expectedImpact", "estimatedEffort"],
                  additionalProperties: false,
                },
                description: "Khuyến nghị cải tiến",
              },
            },
            required: ["summary", "keyFindings", "rootCauses", "recommendations"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("Invalid LLM response");
    }

    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary,
      healthScore,
      processHealth,
      keyFindings: parsed.keyFindings,
      rootCauseAnalysis: parsed.rootCauses,
      recommendations: parsed.recommendations.map((rec: any, idx: number) => ({
        id: `rec-${idx + 1}`,
        ...rec,
        relatedRules: violations.filter((v) => v.severity === "critical" || v.severity === "high").map((v) => v.rule),
      })),
      trendPrediction: {
        direction: trendAnalysis.direction,
        confidence: trendAnalysis.confidence,
        predictedCpk7Days: historicalCpk
          ? metrics.cpk + trendAnalysis.changeRate * 0.5
          : undefined,
      },
      riskAssessment,
    };
  } catch (error) {
    console.error("[AI SPC Analysis] LLM error:", error);

    // Fallback to rule-based analysis
    return generateFallbackAnalysis(
      productCode,
      stationName,
      metrics,
      violations,
      healthScore,
      processHealth,
      trendAnalysis,
      riskAssessment,
      quickInsights
    );
  }
}

/**
 * Fallback analysis when LLM is unavailable
 */
function generateFallbackAnalysis(
  productCode: string,
  stationName: string,
  metrics: SpcMetrics,
  violations: SpcViolation[],
  healthScore: number,
  processHealth: "excellent" | "good" | "warning" | "critical",
  trendAnalysis: { direction: "improving" | "stable" | "declining"; confidence: number; changeRate: number },
  riskAssessment: { level: "low" | "medium" | "high" | "critical"; factors: string[] },
  quickInsights: QuickInsight
): AiAnalysisResult {
  // Generate summary
  let summary = `Quy trình ${productCode} tại ${stationName} `;
  if (processHealth === "excellent") {
    summary += "đang hoạt động xuất sắc với CPK cao và ổn định.";
  } else if (processHealth === "good") {
    summary += "đang hoạt động tốt, cần duy trì các điều kiện hiện tại.";
  } else if (processHealth === "warning") {
    summary += "cần được cải thiện. CPK chưa đạt mục tiêu hoặc có vi phạm.";
  } else {
    summary += "đang gặp vấn đề nghiêm trọng, cần hành động khắc phục ngay.";
  }

  // Key findings
  const keyFindings = [...quickInsights.insights, ...quickInsights.alerts];

  // Root causes based on violations
  const rootCauses: string[] = [];
  if (metrics.cpk < metrics.cp - 0.2) {
    rootCauses.push("Quy trình lệch tâm - cần điều chỉnh setup hoặc offset");
  }
  if (metrics.stdDev > (metrics.usl - metrics.lsl) / 6) {
    rootCauses.push("Biến động cao - kiểm tra độ ổn định thiết bị và nguyên vật liệu");
  }
  if (violations.some((v) => v.rule.includes("Rule 1"))) {
    rootCauses.push("Có điểm ngoài giới hạn kiểm soát - kiểm tra nguyên nhân đặc biệt");
  }
  if (violations.some((v) => v.rule.includes("Rule 2") || v.rule.includes("trend"))) {
    rootCauses.push("Phát hiện xu hướng - kiểm tra sự mài mòn hoặc drift của thiết bị");
  }

  // Generate recommendations
  const recommendations: AiRecommendation[] = [];

  if (metrics.cpk < 1.33) {
    recommendations.push({
      id: "rec-1",
      title: "Cải thiện năng lực quy trình",
      description: "Giảm biến động bằng cách kiểm tra và cải tiến các yếu tố 5M1E",
      category: "process",
      priority: metrics.cpk < 1.0 ? "critical" : "high",
      expectedImpact: "Tăng CPK lên trên 1.33",
      estimatedEffort: "medium",
    });
  }

  if (Math.abs(metrics.mean - (metrics.usl + metrics.lsl) / 2) > (metrics.usl - metrics.lsl) * 0.1) {
    recommendations.push({
      id: "rec-2",
      title: "Căn chỉnh tâm quy trình",
      description: "Điều chỉnh offset hoặc setup để đưa mean về gần target",
      category: "equipment",
      priority: "high",
      expectedImpact: "Cải thiện CPK 0.1-0.3",
      estimatedEffort: "low",
    });
  }

  if (violations.length > 0) {
    recommendations.push({
      id: "rec-3",
      title: "Phân tích và xử lý vi phạm",
      description: "Điều tra nguyên nhân gốc rễ của các vi phạm Western Electric Rules",
      category: "measurement",
      priority: violations.some((v) => v.severity === "critical") ? "critical" : "high",
      expectedImpact: "Giảm số lượng vi phạm và cải thiện ổn định",
      estimatedEffort: "medium",
      relatedRules: violations.map((v) => v.rule),
    });
  }

  recommendations.push({
    id: "rec-4",
    title: "Tăng cường giám sát",
    description: "Thiết lập cảnh báo tự động khi CPK giảm dưới ngưỡng",
    category: "process",
    priority: "medium",
    expectedImpact: "Phát hiện sớm vấn đề",
    estimatedEffort: "low",
  });

  return {
    summary,
    healthScore,
    processHealth,
    keyFindings,
    rootCauseAnalysis: rootCauses.length > 0 ? rootCauses : ["Cần thu thập thêm dữ liệu để xác định nguyên nhân"],
    recommendations,
    trendPrediction: {
      direction: trendAnalysis.direction,
      confidence: trendAnalysis.confidence,
      predictedCpk7Days: metrics.cpk + trendAnalysis.changeRate * 0.5,
    },
    riskAssessment,
  };
}

/**
 * Chat about SPC data using LLM
 */
export async function chatAboutSpc(
  question: string,
  context: {
    productCode: string;
    stationName: string;
    cpk: number;
    mean: number;
    stdDev: number;
    violations: string[];
  }
): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `Bạn là chuyên gia SPC/CPK hỗ trợ phân tích quy trình sản xuất.
Ngữ cảnh hiện tại:
- Sản phẩm: ${context.productCode}
- Trạm: ${context.stationName}
- CPK: ${context.cpk.toFixed(3)}
- Mean: ${context.mean.toFixed(4)}
- StdDev: ${context.stdDev.toFixed(4)}
- Vi phạm: ${context.violations.length > 0 ? context.violations.join(", ") : "Không có"}

Trả lời ngắn gọn, thực tế và bằng tiếng Việt.`,
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === "string" ? content : "Không thể xử lý câu hỏi. Vui lòng thử lại.";
  } catch (error) {
    console.error("[AI SPC Chat] Error:", error);
    return "Xin lỗi, tôi không thể trả lời câu hỏi này lúc này. Vui lòng thử lại sau.";
  }
}

export default {
  generateQuickInsights,
  analyzeCpkTrend,
  calculateHealthScore,
  assessRisk,
  generateAiAnalysis,
  chatAboutSpc,
};
