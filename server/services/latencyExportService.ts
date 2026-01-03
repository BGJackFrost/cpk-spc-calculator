import ExcelJS from 'exceljs';
import { getDb } from '../db';
import { latencyRecords } from '../../drizzle/schema';
import { and, gte, lte, eq, desc } from 'drizzle-orm';

export interface LatencyExportFilter { sourceType?: string; sourceId?: string; startDate?: Date; endDate?: Date; }
interface LatencyRecord { id: number; deviceId: number | null; deviceName: string | null; sourceType: string; latencyMs: string; timestamp: string; metadata: any; createdAt: string; }
interface LatencyStatistics { totalRecords: number; avgLatency: number; minLatency: number; maxLatency: number; p50Latency: number; p95Latency: number; p99Latency: number; successRate: number; sourceBreakdown: { sourceType: string; count: number; avgLatency: number; }[]; hourlyDistribution: { hour: number; count: number; avgLatency: number; }[]; }

async function getLatencyRecords(filter: LatencyExportFilter): Promise<LatencyRecord[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filter.sourceType) conditions.push(eq(latencyRecords.sourceType, filter.sourceType as any));
  if (filter.startDate) conditions.push(gte(latencyRecords.timestamp, filter.startDate.toISOString()));
  if (filter.endDate) conditions.push(lte(latencyRecords.timestamp, filter.endDate.toISOString()));
  const query = conditions.length > 0 ? db.select().from(latencyRecords).where(and(...conditions)) : db.select().from(latencyRecords);
  return await query.orderBy(desc(latencyRecords.timestamp)).limit(10000) as LatencyRecord[];
}

function calculateStatistics(records: LatencyRecord[]): LatencyStatistics {
  if (records.length === 0) return { totalRecords: 0, avgLatency: 0, minLatency: 0, maxLatency: 0, p50Latency: 0, p95Latency: 0, p99Latency: 0, successRate: 0, sourceBreakdown: [], hourlyDistribution: [] };
  const latencies = records.map(r => parseFloat(r.latencyMs)).sort((a, b) => a - b);
  const successCount = records.filter(r => (r.metadata as any)?.isSuccess !== false).length;
  const getPercentile = (arr: number[], p: number) => arr[Math.max(0, Math.ceil((p / 100) * arr.length) - 1)];
  const sourceMap = new Map<string, { count: number; totalLatency: number }>();
  records.forEach(r => { const existing = sourceMap.get(r.sourceType) || { count: 0, totalLatency: 0 }; existing.count++; existing.totalLatency += parseFloat(r.latencyMs); sourceMap.set(r.sourceType, existing); });
  const sourceBreakdown = Array.from(sourceMap.entries()).map(([sourceType, data]) => ({ sourceType, count: data.count, avgLatency: data.totalLatency / data.count }));
  const hourlyMap = new Map<number, { count: number; totalLatency: number }>();
  records.forEach(r => { const hour = new Date(r.timestamp).getHours(); const existing = hourlyMap.get(hour) || { count: 0, totalLatency: 0 }; existing.count++; existing.totalLatency += parseFloat(r.latencyMs); hourlyMap.set(hour, existing); });
  const hourlyDistribution = Array.from(hourlyMap.entries()).map(([hour, data]) => ({ hour, count: data.count, avgLatency: data.totalLatency / data.count })).sort((a, b) => a.hour - b.hour);
  return { totalRecords: records.length, avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length, minLatency: latencies[0], maxLatency: latencies[latencies.length - 1], p50Latency: getPercentile(latencies, 50), p95Latency: getPercentile(latencies, 95), p99Latency: getPercentile(latencies, 99), successRate: (successCount / records.length) * 100, sourceBreakdown, hourlyDistribution };
}

export async function exportLatencyToExcel(filter: LatencyExportFilter): Promise<Buffer> {
  const records = await getLatencyRecords(filter);
  const stats = calculateStatistics(records);
  const workbook = new ExcelJS.Workbook();
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.getCell('A1').value = 'LATENCY MONITORING REPORT';
  summarySheet.getCell('A1').font = { bold: true, size: 16 };
  const statsData = [['Total Records', stats.totalRecords], ['Avg Latency (ms)', stats.avgLatency.toFixed(2)], ['Min Latency (ms)', stats.minLatency.toFixed(2)], ['Max Latency (ms)', stats.maxLatency.toFixed(2)], ['P50 (ms)', stats.p50Latency.toFixed(2)], ['P95 (ms)', stats.p95Latency.toFixed(2)], ['P99 (ms)', stats.p99Latency.toFixed(2)], ['Success Rate (%)', stats.successRate.toFixed(2)]];
  statsData.forEach((row, index) => { summarySheet.getRow(3 + index).values = row; });
  const dataSheet = workbook.addWorksheet('Details');
  dataSheet.getRow(1).values = ['ID', 'Device', 'Source Type', 'Latency (ms)', 'Timestamp', 'Status'];
  records.forEach((record, index) => {
    const metadata = record.metadata as any || {};
    dataSheet.getRow(index + 2).values = [record.id, record.deviceName || '-', record.sourceType, parseFloat(record.latencyMs), new Date(record.timestamp).toLocaleString('vi-VN'), metadata.isSuccess !== false ? 'Success' : 'Failed'];
  });
  return await workbook.xlsx.writeBuffer() as Buffer;
}

export async function generateLatencyReportHtml(filter: LatencyExportFilter): Promise<string> {
  const records = await getLatencyRecords(filter);
  const stats = calculateStatistics(records);
  const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Latency Report</title><style>body{font-family:Arial;margin:20px}.header{text-align:center;margin-bottom:30px}.section{margin-bottom:30px}.section-title{background:#4472C4;color:white;padding:10px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border-bottom:1px solid #ddd}th{background:#e2efda}</style></head><body><div class="header"><h1>BAO CAO LATENCY MONITORING</h1></div><div class="section"><div class="section-title">THONG KE TONG HOP</div><table><tr><td>Tong so ban ghi</td><td>' + stats.totalRecords + '</td></tr><tr><td>Latency TB (ms)</td><td>' + stats.avgLatency.toFixed(2) + '</td></tr><tr><td>P95 (ms)</td><td>' + stats.p95Latency.toFixed(2) + '</td></tr><tr><td>Ty le thanh cong</td><td>' + stats.successRate.toFixed(1) + '%</td></tr></table></div></body></html>';
  return html;
}

export async function getLatencyExportStats(filter: LatencyExportFilter): Promise<LatencyStatistics> {
  const records = await getLatencyRecords(filter);
  return calculateStatistics(records);
}

export default { exportLatencyToExcel, generateLatencyReportHtml, getLatencyExportStats };
