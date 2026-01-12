/**
 * Unit tests for Widget Export Service
 */
import { describe, it, expect, vi } from 'vitest';
import {
  generateParetoPdfHtml,
  generateHeatMapPdfHtml,
  generateParetoExcelBuffer,
  generateHeatMapExcelBuffer,
  type ParetoExportData,
  type HeatMapExportData,
} from './widgetExportService';

describe('Widget Export Service', () => {
  describe('generateParetoPdfHtml', () => {
    it('should generate valid HTML for Pareto PDF export', () => {
      const mockData: ParetoExportData = {
        data: [
          {
            categoryId: 1,
            categoryName: 'Scratch',
            count: 50,
            totalQuantity: 50,
            percentage: 50,
            cumulativePercentage: 50,
            color: '#ef4444',
            isIn80Percent: true,
          },
          {
            categoryId: 2,
            categoryName: 'Dent',
            count: 30,
            totalQuantity: 30,
            percentage: 30,
            cumulativePercentage: 80,
            color: '#f97316',
            isIn80Percent: true,
          },
          {
            categoryId: 3,
            categoryName: 'Stain',
            count: 20,
            totalQuantity: 20,
            percentage: 20,
            cumulativePercentage: 100,
            color: '#f59e0b',
            isIn80Percent: false,
          },
        ],
        summary: {
          totalDefects: 100,
          totalCategories: 3,
          itemsIn80Percent: 2,
          percentageOfCategories: 66.67,
          periodDays: 30,
          lastUpdated: new Date().toISOString(),
        },
        filters: {
          productionLineId: 1,
          productionLineName: 'Line A',
        },
      };

      const html = generateParetoPdfHtml(mockData);

      // Verify HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Báo cáo Pareto Chart');
      expect(html).toContain('Scratch');
      expect(html).toContain('Dent');
      expect(html).toContain('Stain');
      expect(html).toContain('100'); // totalDefects
      expect(html).toContain('Line A'); // production line name
      expect(html).toContain('Nhóm A (80%)');
    });

    it('should handle empty data gracefully', () => {
      const emptyData: ParetoExportData = {
        data: [],
        summary: null,
      };

      const html = generateParetoPdfHtml(emptyData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Báo cáo Pareto Chart');
    });
  });

  describe('generateHeatMapPdfHtml', () => {
    it('should generate valid HTML for Heat Map PDF export', () => {
      const mockData: HeatMapExportData = {
        zones: [
          {
            id: 1,
            name: 'Zone A',
            location: 'Building 1',
            status: 'active',
            workstationCount: 5,
            yieldRate: 98.5,
            avgCpk: 1.67,
            totalSamples: 1000,
            passCount: 985,
            color: '#22c55e',
            statusLabel: 'Xuất sắc',
          },
          {
            id: 2,
            name: 'Zone B',
            location: 'Building 1',
            status: 'active',
            workstationCount: 4,
            yieldRate: 88.0,
            avgCpk: 1.2,
            totalSamples: 500,
            passCount: 440,
            color: '#ef4444',
            statusLabel: 'Nghiêm trọng',
          },
        ],
        summary: {
          totalZones: 2,
          averageYield: 93.25,
          problemZones: 1,
          excellentZones: 1,
          periodDays: 7,
          lastUpdated: new Date().toISOString(),
        },
        filters: {
          productionLineId: 1,
          productionLineName: 'Line A',
        },
      };

      const html = generateHeatMapPdfHtml(mockData);

      // Verify HTML structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Báo cáo Heat Map Yield');
      expect(html).toContain('Zone A');
      expect(html).toContain('Zone B');
      expect(html).toContain('98.5');
      expect(html).toContain('88.0');
      expect(html).toContain('Xuất sắc');
      expect(html).toContain('Nghiêm trọng');
    });

    it('should handle empty zones gracefully', () => {
      const emptyData: HeatMapExportData = {
        zones: [],
        summary: null,
      };

      const html = generateHeatMapPdfHtml(emptyData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Báo cáo Heat Map Yield');
    });
  });

  describe('generateParetoExcelBuffer', () => {
    it('should generate valid Excel buffer for Pareto data', async () => {
      const mockData: ParetoExportData = {
        data: [
          {
            categoryId: 1,
            categoryName: 'Scratch',
            count: 50,
            totalQuantity: 50,
            percentage: 50,
            cumulativePercentage: 50,
            color: '#ef4444',
            isIn80Percent: true,
          },
        ],
        summary: {
          totalDefects: 50,
          totalCategories: 1,
          itemsIn80Percent: 1,
          percentageOfCategories: 100,
          periodDays: 30,
          lastUpdated: new Date().toISOString(),
        },
      };

      const buffer = await generateParetoExcelBuffer(mockData);

      // Verify buffer is valid
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      
      // Check Excel file signature (PK for ZIP/XLSX)
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
    });

    it('should handle empty data', async () => {
      const emptyData: ParetoExportData = {
        data: [],
        summary: null,
      };

      const buffer = await generateParetoExcelBuffer(emptyData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('generateHeatMapExcelBuffer', () => {
    it('should generate valid Excel buffer for Heat Map data', async () => {
      const mockData: HeatMapExportData = {
        zones: [
          {
            id: 1,
            name: 'Zone A',
            location: 'Building 1',
            status: 'active',
            workstationCount: 5,
            yieldRate: 98.5,
            avgCpk: 1.67,
            totalSamples: 1000,
            passCount: 985,
            color: '#22c55e',
            statusLabel: 'Xuất sắc',
          },
        ],
        summary: {
          totalZones: 1,
          averageYield: 98.5,
          problemZones: 0,
          excellentZones: 1,
          periodDays: 7,
          lastUpdated: new Date().toISOString(),
        },
      };

      const buffer = await generateHeatMapExcelBuffer(mockData);

      // Verify buffer is valid
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      
      // Check Excel file signature
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
    });

    it('should handle empty zones', async () => {
      const emptyData: HeatMapExportData = {
        zones: [],
        summary: null,
      };

      const buffer = await generateHeatMapExcelBuffer(emptyData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
