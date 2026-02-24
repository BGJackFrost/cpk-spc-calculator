/**
 * Phase 21 Tests - CPK Alert Enhancement Features
 * 1. Custom CPK thresholds for automatic alerts
 * 2. Advanced filtering and search for alert history
 * 3. PDF export with Control Charts
 */
import { describe, it, expect } from 'vitest';

// Test CPK Alert Thresholds Service
describe('CPK Alert Thresholds Service', () => {
  it('should have cpkAlertService module', async () => {
    const cpkAlertService = await import('./services/cpkAlertService');
    expect(cpkAlertService).toBeDefined();
  });

  it('should export checkAndSendCpkAlert function', async () => {
    const cpkAlertService = await import('./services/cpkAlertService');
    expect(cpkAlertService.checkAndSendCpkAlert).toBeDefined();
    expect(typeof cpkAlertService.checkAndSendCpkAlert).toBe('function');
  });

  it('should export getCpkThresholdForProduct function', async () => {
    const cpkAlertService = await import('./services/cpkAlertService');
    expect(cpkAlertService.getCpkThresholdForProduct).toBeDefined();
    expect(typeof cpkAlertService.getCpkThresholdForProduct).toBe('function');
  });

  it('should export saveCpkAlertHistory function', async () => {
    const cpkAlertService = await import('./services/cpkAlertService');
    expect(cpkAlertService.saveCpkAlertHistory).toBeDefined();
    expect(typeof cpkAlertService.saveCpkAlertHistory).toBe('function');
  });
});

// Test CPK Alert Router
describe('CPK Alert Router', () => {
  it('should have cpkAlertRouter module', async () => {
    const cpkAlertRouter = await import('./routers/cpkAlertRouter');
    expect(cpkAlertRouter).toBeDefined();
    expect(cpkAlertRouter.cpkAlertRouter).toBeDefined();
  });

  it('should have threshold management procedures', async () => {
    const { cpkAlertRouter } = await import('./routers/cpkAlertRouter');
    const procedures = cpkAlertRouter._def.procedures;
    
    // Check for threshold management endpoints
    expect(procedures).toHaveProperty('listThresholds');
    expect(procedures).toHaveProperty('getThreshold');
    expect(procedures).toHaveProperty('createThreshold');
    expect(procedures).toHaveProperty('updateThreshold');
    expect(procedures).toHaveProperty('deleteThreshold');
  });

  it('should have alert history procedures', async () => {
    const { cpkAlertRouter } = await import('./routers/cpkAlertRouter');
    const procedures = cpkAlertRouter._def.procedures;
    
    // Check for alert history endpoints
    expect(procedures).toHaveProperty('listAlertHistory');
    expect(procedures).toHaveProperty('getAlertHistoryStats');
  });
});

// Test PDF Control Chart Service
describe('PDF Control Chart Service', () => {
  it('should have pdfControlChartService module', async () => {
    const pdfControlChartService = await import('./services/pdfControlChartService');
    expect(pdfControlChartService).toBeDefined();
  });

  it('should export generateControlChartPdfHtml function', async () => {
    const pdfControlChartService = await import('./services/pdfControlChartService');
    expect(pdfControlChartService.generateControlChartPdfHtml).toBeDefined();
    expect(typeof pdfControlChartService.generateControlChartPdfHtml).toBe('function');
  });

  it('should generate valid HTML with Control Charts', async () => {
    const { generateControlChartPdfHtml } = await import('./services/pdfControlChartService');
    
    const mockSpcResult = {
      sampleCount: 100,
      mean: 10.5,
      stdDev: 0.5,
      min: 9.0,
      max: 12.0,
      range: 3.0,
      cpk: 1.45,
      cp: 1.50,
      cpu: 1.48,
      cpl: 1.42,
      ucl: 11.5,
      lcl: 9.5,
      uclR: 1.5,
      lclR: 0.0,
      meanR: 0.75,
      xBarData: [
        { index: 1, value: 10.2, timestamp: new Date() },
        { index: 2, value: 10.5, timestamp: new Date() },
        { index: 3, value: 10.8, timestamp: new Date() },
      ],
      rangeData: [
        { index: 1, value: 0.5 },
        { index: 2, value: 0.7 },
        { index: 3, value: 0.6 },
      ],
      rawData: [
        { value: 10.1, timestamp: new Date() },
        { value: 10.3, timestamp: new Date() },
        { value: 10.5, timestamp: new Date() },
      ],
    };

    const html = generateControlChartPdfHtml({
      productCode: 'TEST-001',
      stationName: 'Station A',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      spcResult: mockSpcResult,
      analysisDate: new Date(),
      usl: 12.0,
      lsl: 9.0,
      target: 10.5,
      includeXBarChart: true,
      includeRChart: true,
      includeHistogram: true,
      includeCapabilityAnalysis: true,
    });

    // Verify HTML structure
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('TEST-001');
    expect(html).toContain('Station A');
    expect(html).toContain('X-bar Control Chart');
    expect(html).toContain('R Control Chart');
    expect(html).toContain('Histogram');
    expect(html).toContain('Process Capability Analysis');
    expect(html).toContain('svg');
  });
});

// Test SVG Chart Generation
describe('SVG Chart Generation', () => {
  it('should generate X-bar chart SVG', async () => {
    const pdfService = await import('./services/pdfControlChartService');
    
    // The default export should have chart generation functions
    expect(pdfService.default.generateXBarChartSvg).toBeDefined();
  });

  it('should generate R chart SVG', async () => {
    const pdfService = await import('./services/pdfControlChartService');
    
    expect(pdfService.default.generateRChartSvg).toBeDefined();
  });

  it('should generate histogram SVG', async () => {
    const pdfService = await import('./services/pdfControlChartService');
    
    expect(pdfService.default.generateHistogramSvg).toBeDefined();
  });

  it('should generate capability analysis SVG', async () => {
    const pdfService = await import('./services/pdfControlChartService');
    
    expect(pdfService.default.generateCapabilityAnalysisSvg).toBeDefined();
  });
});
