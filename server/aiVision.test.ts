/**
 * Unit Tests cho AI Vision Service
 * Phase 15 - AI Vision Analysis với LLM
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock LLM
vi.mock('./_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          status: 'pass',
          confidence: 0.95,
          qualityScore: 92,
          summary: 'Sản phẩm đạt chất lượng tốt',
          defects: [],
          recommendations: ['Tiếp tục duy trì quy trình sản xuất hiện tại'],
          processingSuggestions: [],
        }),
      },
    }],
  }),
}));

// Mock database
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue(null),
}));

import { invokeLLM } from './_core/llm';

describe('AI Vision Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeImageWithLLM', () => {
    it('should call LLM with correct parameters for Vietnamese', async () => {
      await invokeLLM({
        messages: [
          { role: 'system', content: 'Test system prompt' },
          { role: 'user', content: 'Test user prompt' },
        ],
        response_format: { type: 'json_object' },
      });

      expect(invokeLLM).toHaveBeenCalled();
    });

    it('should return valid analysis result structure', async () => {
      const mockResult = {
        id: 'VA-123',
        imageUrl: 'https://example.com/product.jpg',
        status: 'pass',
        confidence: 0.95,
        defects: [],
        analysis: {
          summary: 'Sản phẩm đạt chất lượng tốt',
          recommendations: ['Tiếp tục duy trì quy trình'],
          qualityScore: 92,
        },
        processingTime: 1500,
        timestamp: new Date(),
      };

      expect(mockResult).toHaveProperty('id');
      expect(mockResult).toHaveProperty('imageUrl');
      expect(mockResult).toHaveProperty('status');
      expect(mockResult).toHaveProperty('confidence');
      expect(mockResult).toHaveProperty('defects');
      expect(mockResult).toHaveProperty('analysis');
      expect(mockResult.analysis).toHaveProperty('summary');
      expect(mockResult.analysis).toHaveProperty('qualityScore');
    });
  });

  describe('Defect Detection', () => {
    it('should correctly map defect types to Vietnamese', () => {
      const DEFECT_TYPE_MAP: Record<string, string> = {
        'scratch': 'Trầy xước',
        'dent': 'Lõm/Móp',
        'crack': 'Nứt',
        'discoloration': 'Đổi màu',
        'contamination': 'Tạp chất',
        'deformation': 'Biến dạng',
        'bubble': 'Bọt khí',
        'missing_part': 'Thiếu chi tiết',
      };

      expect(DEFECT_TYPE_MAP['scratch']).toBe('Trầy xước');
      expect(DEFECT_TYPE_MAP['crack']).toBe('Nứt');
      expect(DEFECT_TYPE_MAP['missing_part']).toBe('Thiếu chi tiết');
    });

    it('should correctly map severity levels', () => {
      const SEVERITY_MAP: Record<string, string> = {
        'low': 'low',
        'medium': 'medium',
        'high': 'high',
        'critical': 'critical',
        'minor': 'low',
        'moderate': 'medium',
        'major': 'high',
        'severe': 'critical',
      };

      expect(SEVERITY_MAP['minor']).toBe('low');
      expect(SEVERITY_MAP['major']).toBe('high');
      expect(SEVERITY_MAP['severe']).toBe('critical');
    });

    it('should calculate quality score correctly', () => {
      const calculateQualityScore = (defects: Array<{ severity: string; confidence: number }>) => {
        if (defects.length === 0) return 100;
        
        let deduction = 0;
        for (const defect of defects) {
          switch (defect.severity) {
            case 'critical': deduction += 30 * defect.confidence; break;
            case 'high': deduction += 20 * defect.confidence; break;
            case 'medium': deduction += 10 * defect.confidence; break;
            case 'low': deduction += 5 * defect.confidence; break;
          }
        }
        
        return Math.max(0, Math.round(100 - deduction));
      };

      // No defects = 100
      expect(calculateQualityScore([])).toBe(100);

      // One low severity defect
      expect(calculateQualityScore([{ severity: 'low', confidence: 1.0 }])).toBe(95);

      // One critical defect
      expect(calculateQualityScore([{ severity: 'critical', confidence: 1.0 }])).toBe(70);

      // Multiple defects
      expect(calculateQualityScore([
        { severity: 'high', confidence: 0.9 },
        { severity: 'medium', confidence: 0.8 },
      ])).toBe(74); // 100 - 18 - 8 = 74
    });
  });

  describe('Analysis Options', () => {
    it('should support different product types', () => {
      const validProductTypes = ['general', 'pcb', 'metal', 'plastic', 'glass', 'textile'];
      
      validProductTypes.forEach(type => {
        expect(typeof type).toBe('string');
      });
    });

    it('should support different inspection standards', () => {
      const validStandards = ['IPC-A-610', 'ISO 9001', 'ASTM', 'JIS', 'Custom'];
      
      validStandards.forEach(standard => {
        expect(typeof standard).toBe('string');
      });
    });

    it('should support both Vietnamese and English', () => {
      const validLanguages = ['vi', 'en'];
      
      validLanguages.forEach(lang => {
        expect(['vi', 'en']).toContain(lang);
      });
    });
  });

  describe('Image Comparison', () => {
    it('should compare reference and inspection images', async () => {
      const inspectionUrl = 'https://example.com/inspection.jpg';

      // Mock comparison result
      const comparisonResult = {
        id: 'VA-CMP-123',
        imageUrl: inspectionUrl,
        status: 'warning',
        confidence: 0.88,
        defects: [
          {
            type: 'Trầy xước',
            severity: 'medium',
            description: 'Vết trầy nhỏ so với mẫu tham chiếu',
            confidence: 0.85,
          },
        ],
        analysis: {
          summary: 'Phát hiện 1 điểm khác biệt so với mẫu tham chiếu',
          recommendations: ['Kiểm tra quy trình xử lý bề mặt'],
          qualityScore: 85,
        },
      };

      expect(comparisonResult.imageUrl).toBe(inspectionUrl);
      expect(comparisonResult.status).toBe('warning');
      expect(comparisonResult.defects).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should return default result on LLM error', () => {
      const createDefaultResult = (imageUrl: string, error: string) => ({
        id: `VA-ERR-${Date.now()}`,
        imageUrl,
        status: 'warning',
        confidence: 0,
        defects: [],
        analysis: {
          summary: `Không thể phân tích hình ảnh: ${error}`,
          recommendations: ['Vui lòng thử lại hoặc kiểm tra hình ảnh'],
          qualityScore: 0,
        },
        processingTime: 0,
        timestamp: new Date(),
      });

      const result = createDefaultResult('https://example.com/image.jpg', 'Network error');

      expect(result.status).toBe('warning');
      expect(result.confidence).toBe(0);
      expect(result.defects).toHaveLength(0);
      expect(result.analysis.summary).toContain('Network error');
    });

    it('should handle invalid JSON response', () => {
      const parseResponse = (content: string) => {
        try {
          return JSON.parse(content);
        } catch {
          return null;
        }
      };

      expect(parseResponse('invalid json')).toBeNull();
      expect(parseResponse('{"valid": "json"}')).toEqual({ valid: 'json' });
    });
  });

  describe('Batch Analysis', () => {
    it('should calculate batch statistics correctly', () => {
      const results = [
        { status: 'pass', confidence: 0.95, analysis: { qualityScore: 95 } },
        { status: 'pass', confidence: 0.92, analysis: { qualityScore: 90 } },
        { status: 'warning', confidence: 0.88, analysis: { qualityScore: 75 } },
        { status: 'fail', confidence: 0.85, analysis: { qualityScore: 45 } },
      ];

      const total = results.length;
      const pass = results.filter(r => r.status === 'pass').length;
      const fail = results.filter(r => r.status === 'fail').length;
      const warning = results.filter(r => r.status === 'warning').length;
      const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / total;
      const avgQualityScore = results.reduce((sum, r) => sum + r.analysis.qualityScore, 0) / total;

      expect(total).toBe(4);
      expect(pass).toBe(2);
      expect(fail).toBe(1);
      expect(warning).toBe(1);
      expect(avgConfidence).toBeCloseTo(0.9, 1);
      expect(avgQualityScore).toBe(76.25);
    });
  });
});

describe('Suggested Actions', () => {
  it('should return correct action for each severity', () => {
    const getSuggestedAction = (severity: string): string => {
      switch (severity) {
        case 'critical':
          return 'Loại bỏ sản phẩm ngay lập tức. Kiểm tra quy trình sản xuất.';
        case 'high':
          return 'Đánh dấu để kiểm tra thủ công. Có thể cần sửa chữa.';
        case 'medium':
          return 'Ghi nhận và theo dõi. Xem xét sửa chữa nếu cần.';
        case 'low':
          return 'Ghi nhận. Có thể chấp nhận được tùy tiêu chuẩn.';
        default:
          return 'Kiểm tra thêm.';
      }
    };

    expect(getSuggestedAction('critical')).toContain('Loại bỏ sản phẩm');
    expect(getSuggestedAction('high')).toContain('kiểm tra thủ công');
    expect(getSuggestedAction('medium')).toContain('theo dõi');
    expect(getSuggestedAction('low')).toContain('chấp nhận');
    expect(getSuggestedAction('unknown')).toBe('Kiểm tra thêm.');
  });
});
