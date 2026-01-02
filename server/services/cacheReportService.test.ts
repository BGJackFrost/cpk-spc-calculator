/**
 * Tests for Cache Report Service
 */

import { describe, it, expect } from 'vitest';
import { cacheReportService } from './cacheReportService';

describe('CacheReportService', () => {
  describe('getReportConfigs', () => {
    it('should return array of report configs', () => {
      const configs = cacheReportService.getReportConfigs();
      expect(Array.isArray(configs)).toBe(true);
    });
  });

  describe('getReportConfigById', () => {
    it('should return undefined for non-existent id', () => {
      const config = cacheReportService.getReportConfigById(9999);
      expect(config).toBeUndefined();
    });
  });

  describe('createReportConfig', () => {
    it('should create new report config', () => {
      const newConfig = cacheReportService.createReportConfig({
        name: 'Test Report',
        frequency: 'daily',
        hour: 8,
        minute: 0,
        format: 'html',
        recipients: ['test@example.com'],
        includeCharts: true,
        includeAlertHistory: true,
        enabled: true,
      });
      expect(newConfig).toBeDefined();
      expect(newConfig.name).toBe('Test Report');
      expect(newConfig.frequency).toBe('daily');
    });
  });

  describe('updateReportConfig', () => {
    it('should return undefined for non-existent config', () => {
      const updated = cacheReportService.updateReportConfig(9999, { name: 'Test' });
      expect(updated).toBeUndefined();
    });
  });

  describe('collectReportData', () => {
    it('should return report data', () => {
      const data = cacheReportService.collectReportData(1);
      expect(data).toHaveProperty('generatedAt');
      expect(data).toHaveProperty('periodStart');
      expect(data).toHaveProperty('periodEnd');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('currentStats');
      expect(data).toHaveProperty('categoryBreakdown');
      expect(data).toHaveProperty('recommendations');
    });

    it('should have valid summary fields', () => {
      const data = cacheReportService.collectReportData(1);
      expect(data.summary).toHaveProperty('avgHitRate');
      expect(data.summary).toHaveProperty('totalHits');
      expect(data.summary).toHaveProperty('totalMisses');
    });

    it('should have valid currentStats fields', () => {
      const data = cacheReportService.collectReportData(1);
      expect(data.currentStats).toHaveProperty('hitRate');
      expect(data.currentStats).toHaveProperty('size');
      expect(data.currentStats).toHaveProperty('maxSize');
    });
  });

  describe('generateHtmlReport', () => {
    it('should generate HTML report', () => {
      const data = cacheReportService.collectReportData(1);
      const html = cacheReportService.generateHtmlReport(data);
      expect(typeof html).toBe('string');
      expect(html).toContain('html');
    });
  });

  describe('generateExcelReport', () => {
    it('should generate Excel report buffer', async () => {
      const data = cacheReportService.collectReportData(1);
      const buffer = await cacheReportService.generateExcelReport(data);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('processScheduledReports', () => {
    it('should return processing result', async () => {
      const result = await cacheReportService.processScheduledReports();
      expect(result).toHaveProperty('processed');
      expect(result).toHaveProperty('sent');
    });
  });
});
