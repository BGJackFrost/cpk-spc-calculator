/**
 * AI Natural Language Service
 * Provides natural language interface for SPC queries using LLM
 */

import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { spcAnalysisHistory, products, workstations, productionLines, machines } from "../../drizzle/schema";
import { desc, eq, sql, and, gte, lte } from "drizzle-orm";

// Types
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface ChatContext {
  productCode?: string;
  stationName?: string;
  dateRange?: { from: Date; to: Date };
  lastQuery?: string;
}

export interface NlQueryResult {
  answer: string;
  data?: Record<string, unknown>;
  charts?: Array<{
    type: "line" | "bar" | "pie" | "scatter";
    title: string;
    data: unknown[];
  }>;
  suggestions?: string[];
  confidence: number;
}

export interface SpcSummary {
  totalRecords: number;
  avgCpk: number;
  minCpk: number;
  maxCpk: number;
  avgMean: number;
  avgStdDev: number;
  violationCount: number;
  products: string[];
  stations: string[];
}

/**
 * Get SPC summary data from database
 */
async function getSpcSummary(
  productCode?: string,
  stationName?: string,
  fromDate?: Date,
  toDate?: Date
): Promise<SpcSummary> {
  const conditions = [];
  
  if (productCode) {
    conditions.push(eq(spcAnalysisHistory.productCode, productCode));
  }
  if (stationName) {
    conditions.push(eq(spcAnalysisHistory.stationName, stationName));
  }
  if (fromDate) {
    conditions.push(gte(spcAnalysisHistory.createdAt, fromDate));
  }
  if (toDate) {
    conditions.push(lte(spcAnalysisHistory.createdAt, toDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const db = await getDb();
  const records = await db
    .select()
    .from(spcAnalysisHistory)
    .where(whereClause)
    .orderBy(desc(spcAnalysisHistory.createdAt))
    .limit(1000);

  if (records.length === 0) {
    return {
      totalRecords: 0,
      avgCpk: 0,
      minCpk: 0,
      maxCpk: 0,
      avgMean: 0,
      avgStdDev: 0,
      violationCount: 0,
      products: [],
      stations: [],
    };
  }

  const cpkValues = records.map((r) => Number(r.cpk) || 0).filter((v) => v > 0);
  const meanValues = records.map((r) => Number(r.mean) || 0);
  const stdDevValues = records.map((r) => Number(r.stdDev) || 0);

  const uniqueProducts = [...new Set(records.map((r) => r.productCode))];
  const uniqueStations = [...new Set(records.map((r) => r.stationName))];

  return {
    totalRecords: records.length,
    avgCpk: cpkValues.length > 0 ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length : 0,
    minCpk: cpkValues.length > 0 ? Math.min(...cpkValues) : 0,
    maxCpk: cpkValues.length > 0 ? Math.max(...cpkValues) : 0,
    avgMean: meanValues.length > 0 ? meanValues.reduce((a, b) => a + b, 0) / meanValues.length : 0,
    avgStdDev: stdDevValues.length > 0 ? stdDevValues.reduce((a, b) => a + b, 0) / stdDevValues.length : 0,
    violationCount: records.filter((r) => r.violationCount && r.violationCount > 0).length,
    products: uniqueProducts,
    stations: uniqueStations,
  };
}

/**
 * Get recent CPK trend data
 */
async function getCpkTrend(
  productCode?: string,
  stationName?: string,
  days: number = 7
): Promise<Array<{ date: string; cpk: number }>> {
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const conditions = [gte(spcAnalysisHistory.createdAt, fromDate)];
  
  if (productCode) {
    conditions.push(eq(spcAnalysisHistory.productCode, productCode));
  }
  if (stationName) {
    conditions.push(eq(spcAnalysisHistory.stationName, stationName));
  }

  const db = await getDb();
  const records = await db
    .select({
      createdAt: spcAnalysisHistory.createdAt,
      cpk: spcAnalysisHistory.cpk,
    })
    .from(spcAnalysisHistory)
    .where(and(...conditions))
    .orderBy(spcAnalysisHistory.createdAt);

  // Group by date
  const grouped = new Map<string, number[]>();
  records.forEach((r) => {
    const date = r.createdAt.toISOString().split("T")[0];
    if (!grouped.has(date)) {
      grouped.set(date, []);
    }
    grouped.get(date)!.push(Number(r.cpk) || 0);
  });

  return Array.from(grouped.entries()).map(([date, cpks]) => ({
    date,
    cpk: cpks.reduce((a, b) => a + b, 0) / cpks.length,
  }));
}

/**
 * Get product list
 */
async function getProductList(): Promise<string[]> {
  const db = await getDb();
  const productList = await db.select({ code: products.code }).from(products);
  return productList.map((p) => p.code);
}

/**
 * Get station list
 */
async function getStationList(): Promise<string[]> {
  const db = await getDb();
  const stationList = await db.select({ name: workstations.name }).from(workstations);
  return stationList.map((s) => s.name);
}

/**
 * Parse natural language query to extract intent and parameters
 */
function parseQuery(query: string): {
  intent: "cpk_status" | "trend" | "comparison" | "recommendation" | "alert" | "general";
  productCode?: string;
  stationName?: string;
  timeRange?: string;
} {
  const lowerQuery = query.toLowerCase();
  
  let intent: "cpk_status" | "trend" | "comparison" | "recommendation" | "alert" | "general" = "general";
  
  // Detect intent
  if (lowerQuery.includes("cpk") || lowerQuery.includes("chỉ số") || lowerQuery.includes("hiện tại")) {
    intent = "cpk_status";
  } else if (lowerQuery.includes("xu hướng") || lowerQuery.includes("trend") || lowerQuery.includes("biến động")) {
    intent = "trend";
  } else if (lowerQuery.includes("so sánh") || lowerQuery.includes("compare") || lowerQuery.includes("khác nhau")) {
    intent = "comparison";
  } else if (lowerQuery.includes("cải thiện") || lowerQuery.includes("khuyến nghị") || lowerQuery.includes("đề xuất")) {
    intent = "recommendation";
  } else if (lowerQuery.includes("cảnh báo") || lowerQuery.includes("alert") || lowerQuery.includes("vi phạm")) {
    intent = "alert";
  }

  // Extract time range
  let timeRange: string | undefined;
  if (lowerQuery.includes("7 ngày") || lowerQuery.includes("tuần")) {
    timeRange = "7d";
  } else if (lowerQuery.includes("30 ngày") || lowerQuery.includes("tháng")) {
    timeRange = "30d";
  } else if (lowerQuery.includes("hôm nay") || lowerQuery.includes("today")) {
    timeRange = "1d";
  }

  return { intent, timeRange };
}

/**
 * Process natural language query about SPC data
 */
export async function processNaturalLanguageQuery(
  query: string,
  context: ChatContext = {},
  conversationHistory: ChatMessage[] = []
): Promise<NlQueryResult> {
  // Parse query intent
  const { intent, timeRange } = parseQuery(query);

  // Get relevant data based on context
  const fromDate = timeRange
    ? new Date(Date.now() - (timeRange === "1d" ? 1 : timeRange === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000)
    : context.dateRange?.from;
  const toDate = context.dateRange?.to;

  const summary = await getSpcSummary(context.productCode, context.stationName, fromDate, toDate);
  const trend = await getCpkTrend(context.productCode, context.stationName, 7);
  const productList = await getProductList();
  const stationList = await getStationList();

  // Build context for LLM
  const dataContext = `
Dữ liệu SPC hiện có:
- Tổng số bản ghi: ${summary.totalRecords}
- CPK trung bình: ${summary.avgCpk.toFixed(3)}
- CPK thấp nhất: ${summary.minCpk.toFixed(3)}
- CPK cao nhất: ${summary.maxCpk.toFixed(3)}
- Mean trung bình: ${summary.avgMean.toFixed(4)}
- StdDev trung bình: ${summary.avgStdDev.toFixed(4)}
- Số lần vi phạm: ${summary.violationCount}
- Sản phẩm: ${summary.products.slice(0, 5).join(", ")}${summary.products.length > 5 ? "..." : ""}
- Công trạm: ${summary.stations.slice(0, 5).join(", ")}${summary.stations.length > 5 ? "..." : ""}

Xu hướng CPK 7 ngày gần nhất:
${trend.map((t) => `${t.date}: ${t.cpk.toFixed(3)}`).join("\n")}

Danh sách sản phẩm: ${productList.slice(0, 10).join(", ")}
Danh sách công trạm: ${stationList.slice(0, 10).join(", ")}
`;

  // Build conversation messages for LLM
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: `Bạn là trợ lý AI chuyên về SPC/CPK trong sản xuất. Bạn có thể:
1. Trả lời câu hỏi về chỉ số CPK, CP, Mean, StdDev
2. Phân tích xu hướng chất lượng
3. So sánh hiệu suất giữa các sản phẩm/công trạm
4. Đưa ra khuyến nghị cải thiện quy trình
5. Giải thích các quy tắc SPC (Western Electric Rules)
6. Cảnh báo về các vấn đề tiềm ẩn

Tiêu chuẩn CPK:
- CPK >= 1.67: Xuất sắc
- CPK >= 1.33: Tốt
- CPK >= 1.00: Chấp nhận được
- CPK < 1.00: Cần cải thiện

Hãy trả lời ngắn gọn, súc tích và thực tế. Sử dụng tiếng Việt.

${dataContext}`,
    },
  ];

  // Add conversation history
  conversationHistory.slice(-6).forEach((msg) => {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    });
  });

  // Add current query
  messages.push({
    role: "user",
    content: query,
  });

  try {
    const response = await invokeLLM({
      messages,
    });

    const answer = response.choices[0]?.message?.content || "Xin lỗi, tôi không thể xử lý câu hỏi này.";

    // Generate suggestions based on intent
    const suggestions = generateSuggestions(intent, summary);

    // Prepare chart data if relevant
    const charts = intent === "trend" && trend.length > 0
      ? [
          {
            type: "line" as const,
            title: "Xu hướng CPK",
            data: trend,
          },
        ]
      : undefined;

    return {
      answer,
      data: {
        summary,
        trend: intent === "trend" ? trend : undefined,
      },
      charts,
      suggestions,
      confidence: 0.85,
    };
  } catch (error) {
    console.error("LLM error:", error);
    
    // Fallback response
    return generateFallbackResponse(query, intent, summary, trend);
  }
}

/**
 * Generate follow-up suggestions
 */
function generateSuggestions(
  intent: string,
  summary: SpcSummary
): string[] {
  const suggestions: string[] = [];

  switch (intent) {
    case "cpk_status":
      suggestions.push("Phân tích xu hướng CPK trong 7 ngày qua");
      suggestions.push("So sánh CPK giữa các công trạm");
      if (summary.avgCpk < 1.33) {
        suggestions.push("Đề xuất cải thiện CPK");
      }
      break;
    case "trend":
      suggestions.push("CPK hiện tại là bao nhiêu?");
      suggestions.push("Dự báo CPK tuần tới");
      suggestions.push("Nguyên nhân gây biến động CPK");
      break;
    case "comparison":
      suggestions.push("Công trạm nào có CPK tốt nhất?");
      suggestions.push("Sản phẩm nào cần cải thiện?");
      break;
    case "recommendation":
      suggestions.push("Liệt kê các vi phạm SPC gần đây");
      suggestions.push("Phân tích nguyên nhân gốc rễ");
      break;
    case "alert":
      suggestions.push("Có bao nhiêu vi phạm trong tuần qua?");
      suggestions.push("Công trạm nào có nhiều vi phạm nhất?");
      break;
    default:
      suggestions.push("CPK hiện tại là bao nhiêu?");
      suggestions.push("Phân tích xu hướng chất lượng");
      suggestions.push("Đề xuất cải thiện quy trình");
  }

  return suggestions.slice(0, 4);
}

/**
 * Generate fallback response when LLM fails
 */
function generateFallbackResponse(
  query: string,
  intent: string,
  summary: SpcSummary,
  trend: Array<{ date: string; cpk: number }>
): NlQueryResult {
  let answer = "";

  switch (intent) {
    case "cpk_status":
      answer = `📊 **Tổng quan CPK:**
- CPK trung bình: ${summary.avgCpk.toFixed(3)}
- CPK thấp nhất: ${summary.minCpk.toFixed(3)}
- CPK cao nhất: ${summary.maxCpk.toFixed(3)}
- Tổng số bản ghi: ${summary.totalRecords}
- Số lần vi phạm: ${summary.violationCount}

${summary.avgCpk >= 1.33 ? "✅ Quy trình đang hoạt động tốt." : summary.avgCpk >= 1.0 ? "⚠️ Quy trình cần cải thiện." : "❌ Quy trình cần hành động ngay."}`;
      break;

    case "trend":
      const trendDirection = trend.length >= 2
        ? trend[trend.length - 1].cpk > trend[0].cpk
          ? "tăng"
          : trend[trend.length - 1].cpk < trend[0].cpk
          ? "giảm"
          : "ổn định"
        : "chưa đủ dữ liệu";
      
      answer = `📈 **Xu hướng CPK 7 ngày:**
${trend.map((t) => `- ${t.date}: ${t.cpk.toFixed(3)}`).join("\n")}

Xu hướng: ${trendDirection}`;
      break;

    case "alert":
      answer = `⚠️ **Cảnh báo SPC:**
- Tổng số vi phạm: ${summary.violationCount}
- Tỷ lệ vi phạm: ${((summary.violationCount / Math.max(1, summary.totalRecords)) * 100).toFixed(1)}%

${summary.violationCount > 0 ? "Cần kiểm tra các vi phạm và thực hiện hành động khắc phục." : "Không có vi phạm nào được ghi nhận."}`;
      break;

    case "recommendation":
      const recommendations = [];
      if (summary.avgCpk < 1.33) {
        recommendations.push("- Cải thiện độ chính xác quy trình để tăng CPK");
      }
      if (summary.violationCount > 0) {
        recommendations.push("- Phân tích nguyên nhân gốc rễ các vi phạm SPC");
      }
      if (summary.avgStdDev > 0.1) {
        recommendations.push("- Giảm biến động quy trình (StdDev cao)");
      }
      recommendations.push("- Thực hiện bảo trì định kỳ thiết bị");
      recommendations.push("- Đào tạo nhân viên về kiểm soát quy trình");

      answer = `💡 **Khuyến nghị cải thiện:**
${recommendations.join("\n")}`;
      break;

    default:
      answer = `Tôi có thể giúp bạn với các câu hỏi về:
- Chỉ số CPK hiện tại
- Xu hướng chất lượng
- So sánh giữa các sản phẩm/công trạm
- Khuyến nghị cải thiện
- Cảnh báo vi phạm SPC

Hãy hỏi cụ thể hơn để tôi có thể hỗ trợ tốt nhất.`;
  }

  return {
    answer,
    data: { summary },
    suggestions: generateSuggestions(intent, summary),
    confidence: 0.7,
  };
}

/**
 * Chat about SPC with context
 */
export async function chatAboutSpc(
  message: string,
  conversationHistory: ChatMessage[] = [],
  context: ChatContext = {}
): Promise<{ response: string; suggestions: string[] }> {
  const result = await processNaturalLanguageQuery(message, context, conversationHistory);
  return {
    response: result.answer,
    suggestions: result.suggestions || [],
  };
}

/**
 * Get suggested questions based on current data
 */
export async function getSuggestedQuestions(): Promise<string[]> {
  const summary = await getSpcSummary();
  const suggestions: string[] = [];

  suggestions.push("CPK hiện tại của tất cả sản phẩm là bao nhiêu?");
  suggestions.push("Phân tích xu hướng CPK trong 7 ngày qua");
  
  if (summary.avgCpk < 1.33) {
    suggestions.push("Tại sao CPK đang thấp? Cách cải thiện?");
  }
  
  if (summary.violationCount > 0) {
    suggestions.push("Liệt kê các vi phạm SPC gần đây");
  }
  
  suggestions.push("So sánh hiệu suất giữa các công trạm");
  suggestions.push("Dự báo CPK cho tuần tới");
  suggestions.push("Giải thích 8 quy tắc Western Electric");

  return suggestions.slice(0, 8);
}
