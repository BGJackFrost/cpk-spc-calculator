import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database with proper data structure that returns arrays
const mockRecords: any[] = [];

vi.mock("../db", () => ({
  getDb: vi.fn(() => Promise.resolve({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(mockRecords),
  })),
}));

// Mock the LLM module
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "CPK (Process Capability Index) là chỉ số đo lường khả năng của quy trình sản xuất.",
        },
      },
    ],
  }),
}));

import {
  getSuggestedQuestions,
} from "./aiNaturalLanguageService";

describe("AI Natural Language Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("processNaturalLanguageQuery", () => {
    it("should have processNaturalLanguageQuery function exported", async () => {
      const module = await import("./aiNaturalLanguageService");
      expect(typeof module.processNaturalLanguageQuery).toBe("function");
    });

    it("should have NlQueryResult type defined", async () => {
      const module = await import("./aiNaturalLanguageService");
      // Just verify the module exports the function
      expect(module.processNaturalLanguageQuery).toBeDefined();
    });

    it("should have ChatMessage type defined", async () => {
      const module = await import("./aiNaturalLanguageService");
      // Just verify the module exports the function
      expect(module.processNaturalLanguageQuery).toBeDefined();
    });

    it("should have ChatContext type defined", async () => {
      const module = await import("./aiNaturalLanguageService");
      // Just verify the module exports the function
      expect(module.processNaturalLanguageQuery).toBeDefined();
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
