import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processNaturalLanguageQuery,
  getSuggestedQuestions,
  type ChatMessage,
  type ChatContext,
} from "./aiNaturalLanguageService";

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            answer: "CPK (Process Capability Index) là chỉ số đo lường khả năng của quy trình sản xuất.",
            confidence: 0.95,
            suggestions: ["Hỏi về cách cải thiện CPK", "Tìm hiểu về các yếu tố ảnh hưởng"],
            dataUsed: ["spc_metrics", "historical_data"],
          }),
        },
      },
    ],
  }),
}));

describe("AI Natural Language Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processNaturalLanguageQuery", () => {
    it("should process a simple SPC question", async () => {
      const query = "CPK là gì?";
      const context: ChatContext = {};
      const history: ChatMessage[] = [];

      const result = await processNaturalLanguageQuery(query, context, history);

      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
      expect(typeof result.answer).toBe("string");
      expect(result.answer.length).toBeGreaterThan(0);
    });

    it("should handle context with product and station", async () => {
      const query = "Phân tích CPK của sản phẩm này";
      const context: ChatContext = {
        productCode: "PROD-001",
        stationName: "Station A",
      };
      const history: ChatMessage[] = [];

      const result = await processNaturalLanguageQuery(query, context, history);

      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
    });

    it("should handle conversation history", async () => {
      const query = "Còn gì nữa không?";
      const context: ChatContext = {};
      const history: ChatMessage[] = [
        { role: "user", content: "CPK là gì?" },
        { role: "assistant", content: "CPK là chỉ số đo lường khả năng quy trình." },
      ];

      const result = await processNaturalLanguageQuery(query, context, history);

      expect(result).toBeDefined();
      expect(result.answer).toBeDefined();
    });

    it("should return suggestions for follow-up questions", async () => {
      const query = "Làm sao để cải thiện CPK?";
      const context: ChatContext = {};
      const history: ChatMessage[] = [];

      const result = await processNaturalLanguageQuery(query, context, history);

      expect(result).toBeDefined();
      // Suggestions should be an array
      if (result.suggestions) {
        expect(Array.isArray(result.suggestions)).toBe(true);
      }
    });
  });

  describe("getSuggestedQuestions", () => {
    it("should return an array of suggested questions", async () => {
      const questions = await getSuggestedQuestions();

      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });

    it("should return questions in Vietnamese", async () => {
      const questions = await getSuggestedQuestions();

      // Check that at least one question contains Vietnamese characters
      const hasVietnamese = questions.some(
        (q) => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(q)
      );
      expect(hasVietnamese).toBe(true);
    });
  });
});
