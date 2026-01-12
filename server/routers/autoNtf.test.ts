/**
 * Tests for autoNtfRouter
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(() => null),
}));

// Mock LLM
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn(() => Promise.resolve({
    choices: [{
      message: {
        content: JSON.stringify({
          isNtfCandidate: true,
          confidence: 85,
          patternType: 'repeated_false_alarm',
          reasoning: 'Test reasoning',
          recommendations: ['Recommendation 1'],
          rootCauseAnalysis: 'Test root cause',
        }),
      },
    }],
  })),
}));

// Mock trpc
vi.mock('../_core/trpc', () => ({
  router: vi.fn((routes) => routes),
  publicProcedure: {
    input: vi.fn(() => ({
      query: vi.fn((fn) => fn),
      mutation: vi.fn((fn) => fn),
    })),
  },
  protectedProcedure: {
    input: vi.fn(() => ({
      query: vi.fn((fn) => fn),
      mutation: vi.fn((fn) => fn),
    })),
    use: vi.fn(() => ({
      input: vi.fn(() => ({
        query: vi.fn((fn) => fn),
        mutation: vi.fn((fn) => fn),
      })),
    })),
  },
}));

describe('autoNtfRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('router structure', () => {
    it('should be defined with correct procedures', async () => {
      const { autoNtfRouter } = await import('./autoNtfRouter');
      
      expect(autoNtfRouter).toBeDefined();
      expect(autoNtfRouter.analyzePatterns).toBeDefined();
      expect(autoNtfRouter.getAiAnalysis).toBeDefined();
      expect(autoNtfRouter.confirmNtf).toBeDefined();
      expect(autoNtfRouter.getStatistics).toBeDefined();
      expect(autoNtfRouter.getPendingSuggestions).toBeDefined();
    });
  });
});

describe('NTF Pattern Analysis Logic', () => {
  it('should calculate variance correctly', () => {
    const calculateVariance = (values: number[]): number => {
      if (values.length === 0) return 0;
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    };

    expect(calculateVariance([])).toBe(0);
    expect(calculateVariance([5, 5, 5, 5])).toBe(0);
    expect(calculateVariance([1, 2, 3, 4, 5])).toBe(2);
  });

  it('should group similar defects correctly', () => {
    const groupSimilarDefects = (defects: any[]) => {
      const groups: any[] = [];
      const grouped = new Map<string, any[]>();

      defects.forEach(d => {
        const key = `${d.defectCategoryId}_${d.workstationId}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(d);
      });

      grouped.forEach((group) => {
        if (group.length >= 2) {
          groups.push({
            defects: group,
            suggestedPattern: 'repeated_false_alarm',
            confidence: Math.min(50 + group.length * 10, 90),
          });
        }
      });

      return groups;
    };

    const defects = [
      { id: 1, defectCategoryId: 1, workstationId: 1 },
      { id: 2, defectCategoryId: 1, workstationId: 1 },
      { id: 3, defectCategoryId: 1, workstationId: 1 },
      { id: 4, defectCategoryId: 2, workstationId: 2 },
    ];

    const groups = groupSimilarDefects(defects);
    expect(groups.length).toBe(1);
    expect(groups[0].defects.length).toBe(3);
    expect(groups[0].confidence).toBe(80);
  });
});

describe('NTF Pattern Types', () => {
  it('should return correct recommendations for pattern types', () => {
    const getRecommendation = (patternType: string): string => {
      const recommendations: Record<string, string> = {
        'repeated_false_alarm': 'Kiểm tra lại ngưỡng cảnh báo',
        'environmental_factor': 'Kiểm tra điều kiện môi trường',
      };
      return recommendations[patternType] || 'Cần phân tích thêm';
    };

    expect(getRecommendation('repeated_false_alarm')).toContain('ngưỡng cảnh báo');
    expect(getRecommendation('environmental_factor')).toContain('môi trường');
    expect(getRecommendation('unknown')).toContain('phân tích thêm');
  });
});
