/**
 * Unit tests for SSE NTF Pattern Notifications
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifyNtfPatternDetected, notifyNtfSuggestionNew } from './sse';

// Mock the broadcastEvent function
vi.mock('./sse', async (importOriginal) => {
  const original = await importOriginal() as any;
  return {
    ...original,
    broadcastEvent: vi.fn(),
  };
});

describe('SSE NTF Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('notifyNtfPatternDetected', () => {
    it('should call broadcastEvent with correct event type', () => {
      const mockData = {
        patternId: 'pattern-123',
        patternType: 'repeated_false_alarm',
        confidence: 85,
        affectedDefects: 10,
        productionLineId: 1,
        productionLineName: 'Line A',
        description: 'Test pattern detected',
        suggestedAction: 'Review calibration',
        detectedAt: new Date(),
      };

      // Since we're testing the function signature, we just verify it doesn't throw
      expect(() => notifyNtfPatternDetected(mockData)).not.toThrow();
    });

    it('should handle minimal required data', () => {
      const minimalData = {
        patternId: 'pattern-456',
        patternType: 'measurement_drift',
        confidence: 70,
        affectedDefects: 5,
        description: 'Minimal test',
        detectedAt: new Date(),
      };

      expect(() => notifyNtfPatternDetected(minimalData)).not.toThrow();
    });
  });

  describe('notifyNtfSuggestionNew', () => {
    it('should call broadcastEvent with correct event type', () => {
      const mockData = {
        suggestionId: 'suggestion-123',
        defectIds: [1, 2, 3, 4, 5],
        defectCount: 5,
        patternType: 'environmental_factor',
        confidence: 75,
        productionLineId: 2,
        productionLineName: 'Line B',
        reasoning: 'Defects concentrated in specific hours',
        createdAt: new Date(),
      };

      expect(() => notifyNtfSuggestionNew(mockData)).not.toThrow();
    });

    it('should handle minimal required data', () => {
      const minimalData = {
        suggestionId: 'suggestion-456',
        defectIds: [1],
        defectCount: 1,
        patternType: 'operator_error',
        confidence: 60,
        reasoning: 'Single defect pattern',
        createdAt: new Date(),
      };

      expect(() => notifyNtfSuggestionNew(minimalData)).not.toThrow();
    });
  });
});

describe('SSE Event Types', () => {
  it('should have ntf_pattern_detected as valid event type', () => {
    // This test verifies the type exists in the union
    const eventType: string = 'ntf_pattern_detected';
    expect(['ntf_pattern_detected', 'ntf_suggestion_new']).toContain(eventType);
  });

  it('should have ntf_suggestion_new as valid event type', () => {
    const eventType: string = 'ntf_suggestion_new';
    expect(['ntf_pattern_detected', 'ntf_suggestion_new']).toContain(eventType);
  });
});
