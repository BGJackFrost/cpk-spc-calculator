import { describe, it, expect } from 'vitest';

describe('Latency Export Service', () => {
  it('should export exportLatencyToExcel function', async () => {
    const module = await import('./latencyExportService');
    expect(typeof module.exportLatencyToExcel).toBe('function');
  });

  it('should export generateLatencyReportHtml function', async () => {
    const module = await import('./latencyExportService');
    expect(typeof module.generateLatencyReportHtml).toBe('function');
  });

  it('should export getLatencyExportStats function', async () => {
    const module = await import('./latencyExportService');
    expect(typeof module.getLatencyExportStats).toBe('function');
  });

  it('should return statistics with expected structure', async () => {
    const { getLatencyExportStats } = await import('./latencyExportService');
    const stats = await getLatencyExportStats({});
    expect(stats).toBeDefined();
    expect(typeof stats.totalRecords).toBe('number');
    expect(typeof stats.avgLatency).toBe('number');
    expect(Array.isArray(stats.sourceBreakdown)).toBe(true);
  });

  it('should return a Buffer from exportLatencyToExcel', async () => {
    const { exportLatencyToExcel } = await import('./latencyExportService');
    const buffer = await exportLatencyToExcel({});
    expect(buffer).toBeDefined();
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it('should return HTML string from generateLatencyReportHtml', async () => {
    const { generateLatencyReportHtml } = await import('./latencyExportService');
    const html = await generateLatencyReportHtml({});
    expect(typeof html).toBe('string');
    expect(html).toContain('<!DOCTYPE html>');
  });
});
