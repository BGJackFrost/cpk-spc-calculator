import { router, protectedProcedure } from "../../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../../_core/llm";
import { getDb } from "../../db";
import { sampleMeasurements, spcAnalysisHistory, productionLines, machines } from "../../../drizzle/schema";
import { desc, sql } from "drizzle-orm";

// In-memory chat history (per user session)
const chatHistory: Map<string, Array<{ role: "user" | "assistant"; content: string; timestamp: Date }>> = new Map();

// Get system context from database
async function getSystemContext(): Promise<string> {
  try {
    const db = await getDb();
    if (!db) {
      return `Bạn là trợ lý AI chuyên về SPC (Statistical Process Control) và CPK (Process Capability Index). 
Hãy trả lời các câu hỏi về quản lý chất lượng, phân tích thống kê, và cải tiến quy trình sản xuất.`;
    }

    // Get recent measurements count
    const measurementsCount = await db.select({ count: sql<number>`count(*)` }).from(sampleMeasurements);
    
    // Get recent SPC analysis history
    const recentSpc = await db.select()
      .from(spcAnalysisHistory)
      .orderBy(desc(spcAnalysisHistory.analyzedAt))
      .limit(5);
    
    // Get production lines
    const lines = await db.select().from(productionLines).limit(10);
    
    // Get machines
    const machineList = await db.select().from(machines).limit(10);
    
    let context = `
Bạn là trợ lý AI chuyên về SPC (Statistical Process Control) và CPK (Process Capability Index).

Thông tin hệ thống hiện tại:
- Tổng số phép đo: ${measurementsCount[0]?.count || 0}
- Số dây chuyền sản xuất: ${lines.length}
- Số máy móc: ${machineList.length}

Dây chuyền sản xuất:
${lines.map(l => `- ${l.name} (${l.code}): ${l.status}`).join('\n')}

Máy móc:
${machineList.map(m => `- ${m.name} (${m.code}): ${m.status}`).join('\n')}

Phân tích SPC gần đây:
${recentSpc.map(s => `- Product: ${s.productCode || 'N/A'}, CPK=${s.cpk?.toFixed(2) || 'N/A'}`).join('\n')}

Hãy trả lời các câu hỏi về:
1. Giải thích các chỉ số CPK, Cp, Cpk, Ppk
2. Phân tích xu hướng chất lượng
3. Đề xuất cải tiến quy trình
4. Giải thích các quy tắc Western Electric
5. Hướng dẫn sử dụng hệ thống
`;
    return context;
  } catch (error) {
    return `Bạn là trợ lý AI chuyên về SPC (Statistical Process Control) và CPK (Process Capability Index). 
Hãy trả lời các câu hỏi về quản lý chất lượng, phân tích thống kê, và cải tiến quy trình sản xuất.`;
  }
}

export const naturalLanguageRouter = router({
  // Ask a question to AI
  askQuestion: protectedProcedure
    .input(z.object({
      question: z.string().min(1).max(2000),
      context: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userHistory = chatHistory.get(userId) || [];
      
      // Get system context
      const systemContext = await getSystemContext();
      
      // Build messages for LLM
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemContext },
      ];
      
      // Add recent history (last 5 exchanges)
      const recentHistory = userHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
      
      // Add current question
      messages.push({ role: "user", content: input.question });
      
      try {
        const response = await invokeLLM({ messages });
        const answer = response.choices[0]?.message?.content || "Xin lỗi, tôi không thể trả lời câu hỏi này.";
        
        // Save to history
        userHistory.push({ role: "user", content: input.question, timestamp: new Date() });
        userHistory.push({ role: "assistant", content: answer, timestamp: new Date() });
        chatHistory.set(userId, userHistory);
        
        return {
          answer,
          timestamp: new Date(),
          tokensUsed: response.usage?.total_tokens || 0,
        };
      } catch (error: any) {
        console.error("LLM Error:", error);
        return {
          answer: "Xin lỗi, đã có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.",
          timestamp: new Date(),
          tokensUsed: 0,
          error: error.message,
        };
      }
    }),

  // Get chat history
  getHistory: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional().default(20),
    }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const userHistory = chatHistory.get(userId) || [];
      const limit = input?.limit || 20;
      
      return {
        messages: userHistory.slice(-limit),
        total: userHistory.length,
      };
    }),

  // Clear chat history
  clearHistory: protectedProcedure
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;
      chatHistory.delete(userId);
      return { success: true, message: "Đã xóa lịch sử chat" };
    }),

  // Get suggested questions
  getSuggestions: protectedProcedure
    .query(async () => {
      return {
        suggestions: [
          "CPK là gì và cách tính như thế nào?",
          "Giải thích sự khác biệt giữa Cp và Cpk",
          "Các quy tắc Western Electric là gì?",
          "Làm thế nào để cải thiện chỉ số CPK?",
          "Phân tích xu hướng chất lượng gần đây",
          "Khi nào cần điều chỉnh quy trình sản xuất?",
          "Giải thích biểu đồ kiểm soát X-bar và R",
          "Cách xác định nguyên nhân gốc rễ của vấn đề chất lượng",
        ],
      };
    }),
});
