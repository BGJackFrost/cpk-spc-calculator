/**
 * Chart Renderer Service Tests
 */

import { describe, it, expect } from 'vitest';
import { 
  renderCpkTrendChart, 
  renderShiftStatsChart, 
  renderCpkDistributionChart 
} from './chartRenderer';

describe('Chart Renderer Service', () => {
  describe('renderCpkTrendChart', () => {
    it('should render a CPK trend chart as PNG buffer', async () => {
      const data = [
        { date: '2024-01-01', cpk: 1.5 },
        { date: '2024-01-02', cpk: 1.4 },
        { date: '2024-01-03', cpk: 1.6 },
        { date: '2024-01-04', cpk: 1.3 },
        { date: '2024-01-05', cpk: 1.45 },
      ];

      const buffer = await renderCpkTrendChart(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Check PNG signature
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    });

    it('should render with custom dimensions', async () => {
      const data = [
        { date: '2024-01-01', cpk: 1.5 },
        { date: '2024-01-02', cpk: 1.4 },
      ];

      const buffer = await renderCpkTrendChart(data, {
        width: 600,
        height: 300,
        title: 'Test Chart',
      });

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle empty data', async () => {
      const data: Array<{ date: string; cpk: number }> = [];

      const buffer = await renderCpkTrendChart(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('renderShiftStatsChart', () => {
    it('should render a shift statistics chart as PNG buffer', async () => {
      const data = {
        morning: { count: 100, avgCpk: 1.45 },
        afternoon: { count: 120, avgCpk: 1.38 },
        night: { count: 80, avgCpk: 1.52 },
      };

      const buffer = await renderShiftStatsChart(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Check PNG signature
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
    });

    it('should handle zero counts', async () => {
      const data = {
        morning: { count: 0, avgCpk: 0 },
        afternoon: { count: 50, avgCpk: 1.2 },
        night: { count: 0, avgCpk: 0 },
      };

      const buffer = await renderShiftStatsChart(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('renderCpkDistributionChart', () => {
    it('should render a CPK distribution doughnut chart as PNG buffer', async () => {
      const data = {
        excellent: 25,
        good: 40,
        acceptable: 20,
        needsImprovement: 15,
      };

      const buffer = await renderCpkDistributionChart(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Check PNG signature
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
    });

    it('should handle all zeros', async () => {
      const data = {
        excellent: 0,
        good: 0,
        acceptable: 0,
        needsImprovement: 0,
      };

      const buffer = await renderCpkDistributionChart(data);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
