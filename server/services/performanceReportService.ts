/**
 * Performance Report Service
 * 
 * Generates performance reports with metrics, slow queries, pool stats, and alerts.
 */

import ExcelJS from 'exceljs';
import { storagePut } from '../storage';

// Types
export interface PerformanceReportOptions {
  startDate: Date;
  endDate: Date;
  includeSlowQueries?: boolean;
  includePoolStats?: boolean;
  includeAlerts?: boolean;
  includeCacheStats?: boolean;
}

export interface PerformanceReportData {
  summary: {
    period: string;
    totalQueries: number;
    slowQueries: number;
    avgQueryTime: number;
    maxQueryTime: number;
    poolUtilizationAvg: number;
    cacheHitRate: number;
    totalAlerts: number;
    criticalAlerts: number;
  };
  slowQueries: Array<{
    query: string;
    executionTime: number;
    timestamp: Date;
    table?: string;
  }>;
  poolStats: Array<{
    timestamp: Date;
    activeConnections: number;
    idleConnections: number;
    waitingRequests: number;
    utilization: number;
  }>;
  alerts: Array<{
    id: number;
    type: string;
    severity: string;
    message: string;
    currentValue: number;
    threshold: number;
    createdAt: Date;
    acknowledged: boolean;
  }>;
  cacheStats: {
    totalEntries: number;
    hitRate: number;
    missRate: number;
    evictions: number;
    byCategory: Record<string, number>;
  };
}

/**
 * Generate performance report data
 */
export async function generatePerformanceReportData(
  options: PerformanceReportOptions
): Promise<PerformanceReportData> {
  const { startDate, endDate } = options;
  
  // Get slow queries
  let slowQueries: PerformanceReportData['slowQueries'] = [];
  if (options.includeSlowQueries !== false) {
    try {
      const { getSlowQueries } = await import('./queryPerformanceService');
      const queries = getSlowQueries(100);
      slowQueries = queries
        .filter((q: any) => {
          const timestamp = new Date(q.timestamp);
          return timestamp >= startDate && timestamp <= endDate;
        })
        .map((q: any) => ({
          query: q.query.substring(0, 500),
          executionTime: q.executionTime,
          timestamp: new Date(q.timestamp),
          table: q.table,
        }));
    } catch (error) {
      console.error('Error getting slow queries:', error);
    }
  }
  
  // Get pool stats
  let poolStats: PerformanceReportData['poolStats'] = [];
  if (options.includePoolStats !== false) {
    try {
      const { getPoolStats } = await import('./connectionPoolService');
      const stats = await getPoolStats();
      // Use current stats as single data point since history is not available
      if (stats) {
        const currentStats = [{
          timestamp: new Date(),
          activeConnections: stats.activeConnections,
          idleConnections: stats.idleConnections,
          waitingRequests: stats.waitingRequests,
          totalConnections: stats.totalConnections,
        }];
        poolStats = currentStats
          .filter((h: any) => {
            const timestamp = new Date(h.timestamp);
            return timestamp >= startDate && timestamp <= endDate;
          })
          .map((h: any) => ({
            timestamp: new Date(h.timestamp),
            activeConnections: h.activeConnections,
            idleConnections: h.idleConnections,
            waitingRequests: h.waitingRequests,
            utilization: h.totalConnections > 0 
              ? (h.activeConnections / h.totalConnections) * 100 
              : 0,
          }));
      }
    } catch (error) {
      console.error('Error getting pool stats:', error);
    }
  }
  
  // Get alerts
  let alerts: PerformanceReportData['alerts'] = [];
  if (options.includeAlerts !== false) {
    try {
      const { getAlerts } = await import('./performanceAlertService');
      const allAlerts = getAlerts({ startDate, endDate });
      alerts = allAlerts.map(a => ({
        id: a.id!,
        type: a.type,
        severity: a.severity,
        message: a.message,
        currentValue: a.currentValue,
        threshold: a.threshold,
        createdAt: a.createdAt!,
        acknowledged: !!a.acknowledgedAt,
      }));
    } catch (error) {
      console.error('Error getting alerts:', error);
    }
  }
  
  // Get cache stats
  let cacheStats: PerformanceReportData['cacheStats'] = {
    totalEntries: 0,
    hitRate: 0,
    missRate: 0,
    evictions: 0,
    byCategory: {},
  };
  if (options.includeCacheStats !== false) {
    try {
      const { queryCache } = await import('./queryCacheService');
      const stats = queryCache.getStats();
      cacheStats = {
        totalEntries: stats.size,
        hitRate: stats.hitRate * 100,
        missRate: (1 - stats.hitRate) * 100,
        evictions: stats.evictions,
        byCategory: stats.byCategory,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
    }
  }
  
  // Calculate summary
  const totalQueries = slowQueries.length;
  const avgQueryTime = slowQueries.length > 0
    ? slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / slowQueries.length
    : 0;
  const maxQueryTime = slowQueries.length > 0
    ? Math.max(...slowQueries.map(q => q.executionTime))
    : 0;
  const poolUtilizationAvg = poolStats.length > 0
    ? poolStats.reduce((sum, p) => sum + p.utilization, 0) / poolStats.length
    : 0;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  
  return {
    summary: {
      period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`,
      totalQueries,
      slowQueries: slowQueries.length,
      avgQueryTime: Math.round(avgQueryTime),
      maxQueryTime: Math.round(maxQueryTime),
      poolUtilizationAvg: Math.round(poolUtilizationAvg * 10) / 10,
      cacheHitRate: Math.round(cacheStats.hitRate * 10) / 10,
      totalAlerts: alerts.length,
      criticalAlerts,
    },
    slowQueries,
    poolStats,
    alerts,
    cacheStats,
  };
}

/**
 * Export performance report to Excel
 */
export async function exportPerformanceReportToExcel(
  data: PerformanceReportData
): Promise<{ url: string; filename: string }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CPK/SPC Calculator';
  workbook.created = new Date();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  
  summarySheet.addRows([
    { metric: 'Report Period', value: data.summary.period },
    { metric: 'Total Slow Queries', value: data.summary.slowQueries },
    { metric: 'Average Query Time (ms)', value: data.summary.avgQueryTime },
    { metric: 'Max Query Time (ms)', value: data.summary.maxQueryTime },
    { metric: 'Pool Utilization Avg (%)', value: data.summary.poolUtilizationAvg },
    { metric: 'Cache Hit Rate (%)', value: data.summary.cacheHitRate },
    { metric: 'Total Alerts', value: data.summary.totalAlerts },
    { metric: 'Critical Alerts', value: data.summary.criticalAlerts },
  ]);
  
  // Style header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Slow Queries Sheet
  if (data.slowQueries.length > 0) {
    const slowQueriesSheet = workbook.addWorksheet('Slow Queries');
    slowQueriesSheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'Execution Time (ms)', key: 'executionTime', width: 20 },
      { header: 'Table', key: 'table', width: 20 },
      { header: 'Query', key: 'query', width: 80 },
    ];
    
    data.slowQueries.forEach(q => {
      slowQueriesSheet.addRow({
        timestamp: q.timestamp.toISOString(),
        executionTime: q.executionTime,
        table: q.table || '-',
        query: q.query,
      });
    });
    
    slowQueriesSheet.getRow(1).font = { bold: true };
    slowQueriesSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    slowQueriesSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }
  
  // Pool Stats Sheet
  if (data.poolStats.length > 0) {
    const poolStatsSheet = workbook.addWorksheet('Pool Stats');
    poolStatsSheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'Active Connections', key: 'activeConnections', width: 20 },
      { header: 'Idle Connections', key: 'idleConnections', width: 20 },
      { header: 'Waiting Requests', key: 'waitingRequests', width: 20 },
      { header: 'Utilization (%)', key: 'utilization', width: 15 },
    ];
    
    data.poolStats.forEach(p => {
      poolStatsSheet.addRow({
        timestamp: p.timestamp.toISOString(),
        activeConnections: p.activeConnections,
        idleConnections: p.idleConnections,
        waitingRequests: p.waitingRequests,
        utilization: Math.round(p.utilization * 10) / 10,
      });
    });
    
    poolStatsSheet.getRow(1).font = { bold: true };
    poolStatsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    poolStatsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  }
  
  // Alerts Sheet
  if (data.alerts.length > 0) {
    const alertsSheet = workbook.addWorksheet('Alerts');
    alertsSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Timestamp', key: 'createdAt', width: 20 },
      { header: 'Type', key: 'type', width: 20 },
      { header: 'Severity', key: 'severity', width: 12 },
      { header: 'Message', key: 'message', width: 50 },
      { header: 'Value', key: 'currentValue', width: 12 },
      { header: 'Threshold', key: 'threshold', width: 12 },
      { header: 'Acknowledged', key: 'acknowledged', width: 15 },
    ];
    
    data.alerts.forEach(a => {
      alertsSheet.addRow({
        id: a.id,
        createdAt: a.createdAt.toISOString(),
        type: a.type,
        severity: a.severity,
        message: a.message,
        currentValue: a.currentValue,
        threshold: a.threshold,
        acknowledged: a.acknowledged ? 'Yes' : 'No',
      });
    });
    
    alertsSheet.getRow(1).font = { bold: true };
    alertsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    alertsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    
    // Color code severity
    alertsSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const severityCell = row.getCell(4);
        if (severityCell.value === 'critical') {
          severityCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' },
          };
          severityCell.font = { color: { argb: 'FFFFFFFF' } };
        } else if (severityCell.value === 'warning') {
          severityCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC000' },
          };
        }
      }
    });
  }
  
  // Cache Stats Sheet
  const cacheStatsSheet = workbook.addWorksheet('Cache Stats');
  cacheStatsSheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  
  cacheStatsSheet.addRows([
    { metric: 'Total Entries', value: data.cacheStats.totalEntries },
    { metric: 'Hit Rate (%)', value: Math.round(data.cacheStats.hitRate * 10) / 10 },
    { metric: 'Miss Rate (%)', value: Math.round(data.cacheStats.missRate * 10) / 10 },
    { metric: 'Evictions', value: data.cacheStats.evictions },
    { metric: '', value: '' },
    { metric: 'Entries by Category', value: '' },
  ]);
  
  Object.entries(data.cacheStats.byCategory).forEach(([category, count]) => {
    cacheStatsSheet.addRow({ metric: `  ${category}`, value: count });
  });
  
  cacheStatsSheet.getRow(1).font = { bold: true };
  cacheStatsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  cacheStatsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  // Upload to S3
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `performance-report-${timestamp}.xlsx`;
  const fileKey = `reports/performance/${filename}`;
  
  const { url } = await storagePut(
    fileKey,
    Buffer.from(buffer),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  
  return { url, filename };
}

/**
 * Generate and export performance report
 */
export async function generatePerformanceReport(
  options: PerformanceReportOptions
): Promise<{ url: string; filename: string; summary: PerformanceReportData['summary'] }> {
  const data = await generatePerformanceReportData(options);
  const { url, filename } = await exportPerformanceReportToExcel(data);
  
  return {
    url,
    filename,
    summary: data.summary,
  };
}

export default {
  generatePerformanceReportData,
  exportPerformanceReportToExcel,
  generatePerformanceReport,
};
