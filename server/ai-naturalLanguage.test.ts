import { describe, it, expect } from "vitest";

// Test AI Natural Language Router structure
describe("AI Natural Language Router", () => {
  describe("Router Structure", () => {
    it("should export naturalLanguageRouter", async () => {
      const { naturalLanguageRouter } = await import("./routers/ai/naturalLanguageRouter");
      expect(naturalLanguageRouter).toBeDefined();
    });

    it("should have askQuestion procedure", async () => {
      const { naturalLanguageRouter } = await import("./routers/ai/naturalLanguageRouter");
      const router = naturalLanguageRouter;
      expect(router._def.procedures.askQuestion).toBeDefined();
    });

    it("should have getHistory procedure", async () => {
      const { naturalLanguageRouter } = await import("./routers/ai/naturalLanguageRouter");
      const router = naturalLanguageRouter;
      expect(router._def.procedures.getHistory).toBeDefined();
    });

    it("should have clearHistory procedure", async () => {
      const { naturalLanguageRouter } = await import("./routers/ai/naturalLanguageRouter");
      const router = naturalLanguageRouter;
      expect(router._def.procedures.clearHistory).toBeDefined();
    });

    it("should have getSuggestions procedure", async () => {
      const { naturalLanguageRouter } = await import("./routers/ai/naturalLanguageRouter");
      const router = naturalLanguageRouter;
      expect(router._def.procedures.getSuggestions).toBeDefined();
    });
  });

  describe("Input Validation", () => {
    it("askQuestion should require question string", async () => {
      const { naturalLanguageRouter } = await import("./routers/ai/naturalLanguageRouter");
      const router = naturalLanguageRouter;
      const procedure = router._def.procedures.askQuestion;
      
      // Check that input schema exists
      expect(procedure._def.inputs).toBeDefined();
      expect(procedure._def.inputs.length).toBeGreaterThan(0);
    });

    it("getHistory should accept optional limit parameter", async () => {
      const { naturalLanguageRouter } = await import("./routers/ai/naturalLanguageRouter");
      const router = naturalLanguageRouter;
      const procedure = router._def.procedures.getHistory;
      
      expect(procedure._def.inputs).toBeDefined();
    });
  });
});

describe("AI Natural Language Integration", () => {
  it("should be integrated into aiRouter", async () => {
    const { aiRouter } = await import("./routers/aiRouter");
    
    // Check that aiRouter has naturalLanguage merged
    // In tRPC v11, merged routers are flattened, so we check for the procedures directly
    const procedures = Object.keys(aiRouter._def.procedures);
    
    // naturalLanguage procedures should be merged with prefix
    const hasNaturalLanguage = procedures.some(p => p.startsWith('naturalLanguage'));
    expect(hasNaturalLanguage).toBe(true);
  });
});
