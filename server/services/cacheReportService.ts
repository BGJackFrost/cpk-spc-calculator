/**
 * Cache Report Service
 * Export báo cáo cache theo định kỳ (daily/weekly)
 */

import { getCacheStats } from '../cache';
import { sendEmail } from '../emailService';
import ExcelJS from 'exceljs';

export interface CacheReportConfig {
  id: number;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  minute: number;
  format: 'excel' | 'pdf' | 'html';
  recipients: string[];
  includeCharts: boolean;
  includeAlertHistory: boolean;
  enabled: boolean;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CacheReportData {
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  summary: {
    avgHitRate: number;
    totalHits: number;
    totalMisses: number;
    totalEvictions: number;
    peakSize: number;
    avgSize: number;
  };
  currentStats: {
    hitRate: number;
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    evictions: number;
  };
  categoryBreakdown: Array<{ category: string; count: number; percentage: number }>;
  recommendations: string[];
}

let reportConfigs: CacheReportConfig[] = [];
let nextConfigId = 1;

const statsHistory: Array<{
  timestamp: Date;
  hitRate: number;
  size: number;
  hits: number;
  misses: number;
  evictions: number;
}> = [];

function recordStats(): void {
  const stats = getCacheStats();
  statsHistory.push({
    timestamp: new Date(),
    hitRate: stats.hitRate,
    size: stats.size,
    hits: stats.metrics.hits,
    misses: stats.metrics.misses,
    evictions: stats.metrics.evictions,
  });
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  while (statsHistory.length > 0 && statsHistory[0].timestamp < thirtyDaysAgo) {
    statsHistory.shift();
  }
}

setInterval(recordStats, 5 * 60 * 1000);
recordStats();

export const cacheReportService = {
  getReportConfigs(): CacheReportConfig[] {
    return [...reportConfigs];
  },

  getReportConfigById(id: number): CacheReportConfig | undefined {
    return reportConfigs.find(c => c.id === id);
  },

  createReportConfig(config: Omit<CacheReportConfig, 'id' | 'createdAt' | 'updatedAt'>): CacheReportConfig {
    const newConfig: CacheReportConfig = {
      ...config,
      id: nextConfigId++,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    reportConfigs.push(newConfig);
    return newConfig;
  },

  updateReportConfig(id: number, updates: Partial<CacheReportConfig>): CacheReportConfig | undefined {
    const index = reportConfigs.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    reportConfigs[index] = { ...reportConfigs[index], ...updates, updatedAt: new Date() };
    return reportConfigs[index];
  },

  deleteReportConfig(id: number): boolean {
    const index = reportConfigs.findIndex(c => c.id === id);
    if (index === -1) return false;
    reportConfigs.splice(index, 1);
    return true;
  },

  collectReportData(periodDays: number = 1): CacheReportData {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const periodHistory = statsHistory.filter(s => s.timestamp >= periodStart);
    
    const avgHitRate = periodHistory.length > 0
      ? periodHistory.reduce((sum, s) => sum + s.hitRate, 0) / periodHistory.length : 0;
    const totalHits = periodHistory.length > 0
      ? periodHistory[periodHistory.length - 1].hits - (periodHistory[0].hits || 0) : 0;
    const totalMisses = periodHistory.length > 0
      ? periodHistory[periodHistory.length - 1].misses - (periodHistory[0].misses || 0) : 0;
    const totalEvictions = periodHistory.length > 0
      ? periodHistory[periodHistory.length - 1].evictions - (periodHistory[0].evictions || 0) : 0;
    const peakSize = periodHistory.length > 0 ? Math.max(...periodHistory.map(s => s.size)) : 0;
    const avgSize = periodHistory.length > 0
      ? periodHistory.reduce((sum, s) => sum + s.size, 0) / periodHistory.length : 0;

    const currentStats = getCacheStats();
    const categories: Record<string, number> = {};
    currentStats.keys.forEach((key: string) => {
      const category = key.split(':')[0];
      categories[category] = (categories[category] || 0) + 1;
    });
    
    const categoryBreakdown = Object.entries(categories).map(([category, count]) => ({
      category,
      count,
      percentage: currentStats.size > 0 ? (count / currentStats.size) * 100 : 0,
    })).sort((a, b) => b.count - a.count);

    const recommendations: string[] = [];
    if (avgHitRate < 50) recommendations.push('Hit rate thấp. Xem xét tăng TTL.');
    if (currentStats.size > currentStats.maxSize * 0.9) recommendations.push('Cache gần đầy.');
    if (recommendations.length === 0) recommendations.push('Cache hoạt động tốt.');

    return {
      generatedAt: now,
      periodStart,
      periodEnd: now,
      summary: { avgHitRate, totalHits: Math.max(0, totalHits), totalMisses: Math.max(0, totalMisses), totalEvictions: Math.max(0, totalEvictions), peakSize, avgSize },
      currentStats: { hitRate: currentStats.hitRate, size: currentStats.size, maxSize: currentStats.maxSize, hits: currentStats.metrics.hits, misses: currentStats.metrics.misses, evictions: currentStats.metrics.evictions },
      categoryBreakdown,
      recommendations,
    };
  },

  async generateExcelReport(data: CacheReportData): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cache Report');
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];
    sheet.addRows([
      { metric: 'Generated At', value: data.generatedAt.toLocaleString('vi-VN') },
      { metric: 'Avg Hit Rate', value: data.summary.avgHitRate.toFixed(1) + '%' },
      { metric: 'Total Hits', value: data.summary.totalHits },
      { metric: 'Total Misses', value: data.summary.totalMisses },
      { metric: 'Current Size', value: data.currentStats.size + '/' + data.currentStats.maxSize },
    ]);
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  },

  generateHtmlReport(data: CacheReportData): string {
    return '<html><body><h1>Cache Report</h1><p>Hit Rate: ' + data.currentStats.hitRate.toFixed(1) + '%</p></body></html>';
  },

  async sendReport(configId: number): Promise<{ success: boolean; message: string; recipients: string[] }> {
    const config = reportConfigs.find(c => c.id === configId);
    if (!config) return { success: false, message: 'Config not found', recipients: [] };

    const periodDays = config.frequency === 'daily' ? 1 : config.frequency === 'weekly' ? 7 : 30;
    const data = this.collectReportData(periodDays);

    try {
      const html = this.generateHtmlReport(data);
      for (const email of config.recipients) {
        await sendEmail({ to: email, subject: 'Cache Report', html });
      }
      this.updateReportConfig(configId, { lastSentAt: new Date() });
      return { success: true, message: 'Report sent', recipients: config.recipients };
    } catch (error) {
      return { success: false, message: 'Error', recipients: [] };
    }
  },

  async processScheduledReports(): Promise<{ processed: number; sent: number }> {
    let processed = 0, sent = 0;
    for (const config of reportConfigs.filter(c => c.enabled)) {
      processed++;
      const result = await this.sendReport(config.id);
      if (result.success) sent++;
    }
    return { processed, sent };
  },
};

export default cacheReportService;
