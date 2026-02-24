import { describe, it, expect } from 'vitest';
import { generateXBarChartSvg, generateRChartSvg, generateHistogramSvg, generateCpkGaugeSvg } from './pdfChartService';

describe('PDF Chart Service', () => {
  describe('generateXBarChartSvg', () => {
    it('should generate valid SVG', () => {
      const data = [{ index: 1, value: 10.2 }, { index: 2, value: 10.5 }];
      const svg = generateXBarChartSvg(data, { ucl: 11, cl: 10.4, lcl: 9.8 });
      expect(svg).toContain('<svg');
      expect(svg).toContain('X-bar Control Chart');
    });
    it('should handle empty data', () => {
      const svg = generateXBarChartSvg([], { ucl: 11, cl: 10, lcl: 9 });
      expect(svg).toContain('Không có dữ liệu');
    });
  });
  describe('generateRChartSvg', () => {
    it('should generate valid SVG', () => {
      const data = [{ index: 1, value: 0.5 }, { index: 2, value: 0.8 }];
      const svg = generateRChartSvg(data, { uclR: 1.2, avgR: 0.52, lclR: 0 });
      expect(svg).toContain('<svg');
      expect(svg).toContain('R Control Chart');
    });
    it('should handle empty data', () => {
      const svg = generateRChartSvg([], { uclR: 1.2, avgR: 0.5, lclR: 0 });
      expect(svg).toContain('Không có dữ liệu');
    });
  });
  describe('generateHistogramSvg', () => {
    it('should generate valid SVG', () => {
      const values = [10.1, 10.2, 10.3, 10.2, 10.4];
      const svg = generateHistogramSvg(values, { mean: 10.24, stdDev: 0.11 });
      expect(svg).toContain('<svg');
      expect(svg).toContain('Histogram');
    });
    it('should handle empty values', () => {
      const svg = generateHistogramSvg([], { mean: 10, stdDev: 0.1 });
      expect(svg).toContain('Không có dữ liệu');
    });
  });
  describe('generateCpkGaugeSvg', () => {
    it('should generate valid SVG', () => {
      const svg = generateCpkGaugeSvg(1.45);
      expect(svg).toContain('<svg');
      expect(svg).toContain('1.45');
    });
    it('should handle null CPK', () => {
      expect(generateCpkGaugeSvg(null)).toContain('N/A');
    });
  });
});
