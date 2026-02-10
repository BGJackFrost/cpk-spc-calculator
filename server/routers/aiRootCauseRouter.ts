import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { spcAnalysisHistory, oeeRecords, productionLines } from "../../drizzle/schema";
import { desc, eq, gte, sql } from "drizzle-orm";

/**
 * AI Root Cause Analysis Router
 * Uses LLM to perform 5M1E root cause analysis on SPC/OEE data
 */
export const aiRootCauseRouter = router({
  /**
   * Run AI-powered root cause analysis using 5M1E methodology
   */
  analyze: protectedProcedure
    .input(z.object({
      problemType: z.enum(["cpk_decline", "high_variation", "out_of_spec", "trend_shift"]),
      productionLineId: z.number().optional(),
      timeRange: z.enum(["7d", "30d", "90d"]).default("30d"),
    }))
    .mutation(async ({ input }) => {
      // Gather recent SPC data for context
      const daysAgo = input.timeRange === "7d" ? 7 : input.timeRange === "30d" ? 30 : 90;
      const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const db = await getDb();
      let recentSpcData: any[] = [];
      try {
        if (db) recentSpcData = await db
          .select({
            id: spcAnalysisHistory.id,
            cpk: spcAnalysisHistory.cpk,
            ppk: spcAnalysisHistory.ppk,
            mean: spcAnalysisHistory.mean,
            stdDev: spcAnalysisHistory.stdDev,
            sampleSize: spcAnalysisHistory.sampleSize,
            createdAt: spcAnalysisHistory.createdAt,
          })
          .from(spcAnalysisHistory)
          .where(gte(spcAnalysisHistory.createdAt, since))
          .orderBy(desc(spcAnalysisHistory.createdAt))
          .limit(50);
      } catch {
        // Table may not exist yet
      }

      let recentOeeData: any[] = [];
      try {
        if (db) recentOeeData = await db
          .select({
            id: oeeRecords.id,
            oee: oeeRecords.oee,
            availability: oeeRecords.availability,
            performance: oeeRecords.performance,
            quality: oeeRecords.quality,
            createdAt: oeeRecords.createdAt,
          })
          .from(oeeRecords)
          .where(gte(oeeRecords.createdAt, since))
          .orderBy(desc(oeeRecords.createdAt))
          .limit(50);
      } catch {
        // Table may not exist yet
      }

      const problemDescriptions: Record<string, string> = {
        cpk_decline: "CPK values are declining over time, indicating process capability deterioration",
        high_variation: "Process shows high variation/standard deviation, unstable measurement results",
        out_of_spec: "Products are going out of specification limits, quality issues detected",
        trend_shift: "Process mean is shifting/trending, indicating systematic changes",
      };

      const spcSummary = recentSpcData.length > 0
        ? `Recent SPC data (${recentSpcData.length} records): Average CPK=${(recentSpcData.reduce((s, r) => s + Number(r.cpk || 0), 0) / recentSpcData.length).toFixed(3)}, Average StdDev=${(recentSpcData.reduce((s, r) => s + Number(r.stdDev || 0), 0) / recentSpcData.length).toFixed(4)}`
        : "No recent SPC data available";

      const oeeSummary = recentOeeData.length > 0
        ? `Recent OEE data (${recentOeeData.length} records): Average OEE=${(recentOeeData.reduce((s, r) => s + Number(r.oee || 0), 0) / recentOeeData.length).toFixed(1)}%, Avg Availability=${(recentOeeData.reduce((s, r) => s + Number(r.availability || 0), 0) / recentOeeData.length).toFixed(1)}%`
        : "No recent OEE data available";

      const systemPrompt = `You are an expert manufacturing quality engineer specializing in SPC (Statistical Process Control) and root cause analysis using the 5M1E methodology (Man, Machine, Material, Method, Measurement, Environment).

Analyze the given problem and return a structured JSON response with root causes and causal chains.

IMPORTANT: Respond ONLY with valid JSON, no markdown or extra text.`;

      const userPrompt = `Problem: ${problemDescriptions[input.problemType]}
Time range: Last ${daysAgo} days
${spcSummary}
${oeeSummary}

Perform a 5M1E root cause analysis and return JSON with this exact structure:
{
  "rootCauses": [
    {
      "id": "rc1",
      "category": "man|machine|material|method|measurement|environment",
      "title": "Short title",
      "description": "Detailed description",
      "probability": 0.0-1.0,
      "impact": "low|medium|high|critical",
      "evidence": ["evidence1", "evidence2"],
      "recommendations": ["recommendation1", "recommendation2"],
      "relatedFactors": ["factor1", "factor2"]
    }
  ],
  "causalChains": [
    {
      "id": "cc1",
      "name": "Chain name",
      "steps": [
        {"factor": "Factor name", "description": "Step description", "category": "man|machine|material|method|measurement|environment"}
      ],
      "confidence": 0.0-1.0
    }
  ]
}

Generate 5-8 root causes across different 5M1E categories and 2-3 causal chains. Use Vietnamese for titles and descriptions. Base analysis on the actual data provided.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "root_cause_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  rootCauses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        category: { type: "string" },
                        title: { type: "string" },
                        description: { type: "string" },
                        probability: { type: "number" },
                        impact: { type: "string" },
                        evidence: { type: "array", items: { type: "string" } },
                        recommendations: { type: "array", items: { type: "string" } },
                        relatedFactors: { type: "array", items: { type: "string" } },
                      },
                      required: ["id", "category", "title", "description", "probability", "impact", "evidence", "recommendations", "relatedFactors"],
                      additionalProperties: false,
                    },
                  },
                  causalChains: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        steps: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              factor: { type: "string" },
                              description: { type: "string" },
                              category: { type: "string" },
                            },
                            required: ["factor", "description", "category"],
                            additionalProperties: false,
                          },
                        },
                        confidence: { type: "number" },
                      },
                      required: ["id", "name", "steps", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["rootCauses", "causalChains"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("No response from LLM");
        }

        const result = JSON.parse(content);
        return {
          rootCauses: result.rootCauses || [],
          causalChains: result.causalChains || [],
          dataContext: {
            spcRecords: recentSpcData.length,
            oeeRecords: recentOeeData.length,
            timeRange: input.timeRange,
            problemType: input.problemType,
          },
        };
      } catch (error: any) {
        // Fallback with basic analysis
        return {
          rootCauses: generateFallbackRootCauses(input.problemType),
          causalChains: generateFallbackCausalChains(input.problemType),
          dataContext: {
            spcRecords: recentSpcData.length,
            oeeRecords: recentOeeData.length,
            timeRange: input.timeRange,
            problemType: input.problemType,
            fallback: true,
            error: error.message,
          },
        };
      }
    }),
});

function generateFallbackRootCauses(problemType: string) {
  const causes: Record<string, any[]> = {
    cpk_decline: [
      { id: "rc1", category: "machine", title: "Mòn dụng cụ cắt/khuôn", description: "Dụng cụ cắt hoặc khuôn bị mòn theo thời gian, dẫn đến sai lệch kích thước sản phẩm", probability: 0.85, impact: "high", evidence: ["CPK giảm dần theo thời gian", "Biến động tăng ở cuối ca sản xuất"], recommendations: ["Kiểm tra và thay thế dụng cụ theo lịch", "Thiết lập giám sát mòn dụng cụ tự động"], relatedFactors: ["Tuổi thọ dụng cụ", "Tần suất bảo trì"] },
      { id: "rc2", category: "material", title: "Biến động chất lượng nguyên vật liệu", description: "Nguyên vật liệu đầu vào không đồng nhất giữa các lô", probability: 0.72, impact: "high", evidence: ["CPK thay đổi khi đổi lô nguyên liệu"], recommendations: ["Kiểm tra IQC chặt chẽ hơn", "Đánh giá lại nhà cung cấp"], relatedFactors: ["Nhà cung cấp", "Lô nguyên liệu"] },
      { id: "rc3", category: "man", title: "Kỹ năng vận hành không đồng đều", description: "Sự khác biệt kỹ năng giữa các ca sản xuất", probability: 0.55, impact: "medium", evidence: ["CPK khác nhau giữa các ca"], recommendations: ["Đào tạo lại nhân viên", "Chuẩn hóa quy trình vận hành"], relatedFactors: ["Ca sản xuất", "Kinh nghiệm"] },
      { id: "rc4", category: "environment", title: "Nhiệt độ môi trường thay đổi", description: "Biến động nhiệt độ nhà xưởng ảnh hưởng đến kích thước sản phẩm", probability: 0.45, impact: "medium", evidence: ["CPK giảm vào mùa hè/đông"], recommendations: ["Lắp đặt hệ thống điều hòa", "Giám sát nhiệt độ liên tục"], relatedFactors: ["Nhiệt độ", "Độ ẩm"] },
      { id: "rc5", category: "measurement", title: "Sai lệch thiết bị đo", description: "Thiết bị đo lường cần hiệu chuẩn lại", probability: 0.35, impact: "medium", evidence: ["Kết quả đo không lặp lại"], recommendations: ["Hiệu chuẩn thiết bị đo định kỳ", "Thực hiện MSA/GR&R"], relatedFactors: ["Thiết bị đo", "Tần suất hiệu chuẩn"] },
    ],
    high_variation: [
      { id: "rc1", category: "machine", title: "Rung động máy quá mức", description: "Máy rung động bất thường do lỏng bu-lông hoặc mòn ổ bi", probability: 0.80, impact: "critical", evidence: ["Biến động cao ở tất cả sản phẩm trên máy"], recommendations: ["Kiểm tra và siết chặt bu-lông", "Thay thế ổ bi mòn"], relatedFactors: ["Tình trạng máy", "Bảo trì"] },
      { id: "rc2", category: "method", title: "Thông số quy trình chưa tối ưu", description: "Tốc độ, áp suất hoặc nhiệt độ quy trình chưa được tối ưu", probability: 0.65, impact: "high", evidence: ["Biến động giảm khi điều chỉnh thông số"], recommendations: ["Thực hiện DOE để tối ưu thông số", "Cập nhật SOP"], relatedFactors: ["Thông số máy", "Quy trình"] },
      { id: "rc3", category: "material", title: "Nguyên liệu không đồng nhất", description: "Độ cứng, thành phần hóa học nguyên liệu biến động", probability: 0.55, impact: "high", evidence: ["Biến động tương quan với lô nguyên liệu"], recommendations: ["Tăng cường kiểm tra IQC", "Yêu cầu COA từ nhà cung cấp"], relatedFactors: ["Lô nguyên liệu", "Nhà cung cấp"] },
    ],
    out_of_spec: [
      { id: "rc1", category: "machine", title: "Máy lệch cài đặt", description: "Thông số máy bị lệch so với giá trị chuẩn", probability: 0.88, impact: "critical", evidence: ["Sản phẩm lệch một phía so với target"], recommendations: ["Điều chỉnh lại cài đặt máy", "Thiết lập kiểm tra đầu ca"], relatedFactors: ["Cài đặt máy", "Hiệu chuẩn"] },
      { id: "rc2", category: "man", title: "Lỗi vận hành", description: "Nhân viên không tuân thủ SOP hoặc cài đặt sai thông số", probability: 0.65, impact: "high", evidence: ["Lỗi xảy ra sau khi đổi ca"], recommendations: ["Đào tạo lại quy trình", "Thêm Poka-Yoke"], relatedFactors: ["Đào tạo", "SOP"] },
    ],
    trend_shift: [
      { id: "rc1", category: "machine", title: "Mòn progressive của dụng cụ", description: "Dụng cụ mòn dần tạo xu hướng dịch chuyển mean", probability: 0.82, impact: "high", evidence: ["Mean dịch chuyển đều theo thời gian"], recommendations: ["Thay dụng cụ theo lịch", "Giám sát tool life"], relatedFactors: ["Tool life", "Bảo trì phòng ngừa"] },
      { id: "rc2", category: "environment", title: "Thay đổi điều kiện môi trường", description: "Nhiệt độ, độ ẩm thay đổi theo mùa hoặc thời gian trong ngày", probability: 0.60, impact: "medium", evidence: ["Trend tương quan với nhiệt độ"], recommendations: ["Kiểm soát môi trường", "Bù trừ nhiệt độ"], relatedFactors: ["Nhiệt độ", "Mùa"] },
    ],
  };
  return causes[problemType] || causes.cpk_decline;
}

function generateFallbackCausalChains(problemType: string) {
  const chains: Record<string, any[]> = {
    cpk_decline: [
      { id: "cc1", name: "Chuỗi mòn dụng cụ → Sai lệch kích thước", steps: [{ factor: "Dụng cụ mòn", description: "Dụng cụ cắt mòn theo thời gian sử dụng", category: "machine" }, { factor: "Kích thước lệch", description: "Sản phẩm bị lệch kích thước dần", category: "measurement" }, { factor: "CPK giảm", description: "Chỉ số năng lực quy trình giảm", category: "method" }], confidence: 0.85 },
      { id: "cc2", name: "Chuỗi nguyên liệu → Biến động", steps: [{ factor: "Lô nguyên liệu mới", description: "Đổi sang lô nguyên liệu khác", category: "material" }, { factor: "Tính chất khác", description: "Độ cứng, thành phần hóa học khác", category: "material" }, { factor: "Biến động tăng", description: "Kết quả đo biến động nhiều hơn", category: "measurement" }], confidence: 0.72 },
    ],
    high_variation: [
      { id: "cc1", name: "Chuỗi rung động → Biến động", steps: [{ factor: "Bu-lông lỏng", description: "Bu-lông cố định bị lỏng", category: "machine" }, { factor: "Rung động tăng", description: "Máy rung động bất thường", category: "machine" }, { factor: "Biến động cao", description: "Kết quả đo biến động lớn", category: "measurement" }], confidence: 0.80 },
    ],
    out_of_spec: [
      { id: "cc1", name: "Chuỗi cài đặt sai → OOS", steps: [{ factor: "Cài đặt lệch", description: "Thông số máy bị lệch", category: "machine" }, { factor: "Sản phẩm lệch", description: "Kích thước sản phẩm lệch target", category: "measurement" }, { factor: "Ngoài spec", description: "Sản phẩm vượt giới hạn spec", category: "method" }], confidence: 0.88 },
    ],
    trend_shift: [
      { id: "cc1", name: "Chuỗi mòn → Trend shift", steps: [{ factor: "Mòn progressive", description: "Dụng cụ mòn dần theo thời gian", category: "machine" }, { factor: "Mean dịch chuyển", description: "Giá trị trung bình dịch chuyển dần", category: "measurement" }, { factor: "Trend shift", description: "Xu hướng thay đổi rõ rệt", category: "method" }], confidence: 0.82 },
    ],
  };
  return chains[problemType] || chains.cpk_decline;
}
