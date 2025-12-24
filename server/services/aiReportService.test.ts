import { describe, it, expect } from 'vitest';
import { generateAiAnalysisPdfHtml } from './aiReportService';

describe('AI Report Service', () => {
  const mockData = {
    productCode: 'PROD-001',
    stationName: 'Station A',
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31'),
    aiAnalysis: `## Phân tích SPC

### Tổng quan
Quy trình đang hoạt động **ổn định** với CPK = 1.45.

### Khuyến nghị
- Tiếp tục giám sát quy trình
- Xem xét giảm biến động

### Kết luận
Quy trình đạt yêu cầu chất lượng.`,
    spcResult: {
      sampleCount: 100,
      mean: 125.5,
      stdDev: 2.3,
      min: 120.1,
      max: 130.2,
      range: 10.1,
      cp: 1.52,
      cpk: 1.45,
      cpu: 1.48,
      cpl: 1.45,
      ucl: 132.4,
      lcl: 118.6,
      uclR: 8.5,
      lclR: 0,
    },
    usl: 135,
    lsl: 115,
    target: 125,
    generatedBy: 'Test User',
  };

  describe('generateAiAnalysisPdfHtml', () => {
    it('should generate valid HTML report', async () => {
      const html = await generateAiAnalysisPdfHtml(mockData);

      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('AI Analysis Report');
    });

    it('should include product information', async () => {
      const html = await generateAiAnalysisPdfHtml(mockData);

      expect(html).toContain(mockData.productCode);
      expect(html).toContain(mockData.stationName);
    });

    it('should include SPC statistics', async () => {
      const html = await generateAiAnalysisPdfHtml(mockData);

      expect(html).toContain(mockData.spcResult.sampleCount.toString());
      expect(html).toContain('1.45'); // CPK value
    });

    it('should render markdown AI analysis', async () => {
      const html = await generateAiAnalysisPdfHtml(mockData);

      // Markdown should be converted to HTML
      expect(html).toContain('<h2>'); // ## should become h2
      expect(html).toContain('<strong>'); // ** should become strong
      expect(html).toContain('<li>'); // - should become li
    });

    it('should include CPK status indicator', async () => {
      const html = await generateAiAnalysisPdfHtml(mockData);

      // CPK 1.45 should show "Tốt" status
      expect(html).toContain('Tốt');
    });

    it('should include specification limits when provided', async () => {
      const html = await generateAiAnalysisPdfHtml(mockData);

      expect(html).toContain('USL');
      expect(html).toContain('LSL');
      expect(html).toContain('135'); // USL value
      expect(html).toContain('115'); // LSL value
    });

    it('should include generator information', async () => {
      const html = await generateAiAnalysisPdfHtml(mockData);

      expect(html).toContain(mockData.generatedBy);
    });

    it('should handle different CPK statuses', async () => {
      // Test excellent CPK
      const excellentData = {
        ...mockData,
        spcResult: { ...mockData.spcResult, cpk: 1.8 },
      };
      const excellentHtml = await generateAiAnalysisPdfHtml(excellentData);
      expect(excellentHtml).toContain('Xuất sắc');

      // Test warning CPK
      const warningData = {
        ...mockData,
        spcResult: { ...mockData.spcResult, cpk: 1.1 },
      };
      const warningHtml = await generateAiAnalysisPdfHtml(warningData);
      expect(warningHtml).toContain('Chấp nhận');

      // Test failing CPK
      const failingData = {
        ...mockData,
        spcResult: { ...mockData.spcResult, cpk: 0.8 },
      };
      const failingHtml = await generateAiAnalysisPdfHtml(failingData);
      expect(failingHtml).toContain('Không đạt');
    });

    it('should handle null CPK', async () => {
      const nullCpkData = {
        ...mockData,
        spcResult: { ...mockData.spcResult, cpk: null },
      };
      const html = await generateAiAnalysisPdfHtml(nullCpkData);

      expect(html).toContain('N/A');
    });

    it('should handle missing optional fields', async () => {
      const minimalData = {
        ...mockData,
        usl: null,
        lsl: null,
        target: null,
      };
      const html = await generateAiAnalysisPdfHtml(minimalData);

      expect(html).toBeDefined();
      expect(html).toContain('<!DOCTYPE html>');
    });
  });
});
