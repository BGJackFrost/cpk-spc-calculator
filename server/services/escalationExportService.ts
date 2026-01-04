/**
 * Escalation Report Export Service
 * Export báo cáo escalation ra PDF và Excel
 */

import ExcelJS from 'exceljs';
import { getDb } from '../db';
import { escalationHistory, escalationReportHistory, escalationReportConfigs } from '../../drizzle/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

export interface EscalationExportData {
  periodStart: number;
  periodEnd: number;
  alerts: EscalationAlertExport[];
  stats: {
    totalAlerts: number;
    resolvedAlerts: number;
    pendingAlerts: number;
    avgResolutionTimeMinutes: number | null;
    byAlertType: { alertType: string; count: number }[];
    bySeverity: { severity: string; count: number }[];
    byLevel: { level: number; count: number }[];
  };
  trends: { date: string; totalAlerts: number; resolvedAlerts: number }[];
}

export interface EscalationAlertExport {
  id: number;
  alertType: string;
  alertTitle: string;
  alertMessage: string;
  severity: string;
  escalationLevel: number;
  status: string;
  assignedTo: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
  createdAt: number;
  resolvedAt: number | null;
  resolutionTimeMinutes: number | null;
}

/**
 * Lấy dữ liệu escalation để export
 */
export async function getEscalationExportData(
  periodStart: number,
  periodEnd: number,
  filters?: {
    alertTypes?: string[];
    severities?: string[];
    statuses?: string[];
    productionLineIds?: number[];
  }
): Promise<EscalationExportData> {
  const db = await getDb();
  if (!db) {
    return {
      periodStart,
      periodEnd,
      alerts: [],
      stats: {
        totalAlerts: 0,
        resolvedAlerts: 0,
        pendingAlerts: 0,
        avgResolutionTimeMinutes: null,
        byAlertType: [],
        bySeverity: [],
        byLevel: [],
      },
      trends: [],
    };
  }

  // Build conditions
  const conditions = [
    gte(escalationHistory.createdAt, periodStart),
    lte(escalationHistory.createdAt, periodEnd),
  ];

  // Get all alerts in period
  const alerts = await db
    .select()
    .from(escalationHistory)
    .where(and(...conditions))
    .orderBy(desc(escalationHistory.createdAt));

  // Apply filters
  let filteredAlerts = alerts;
  if (filters?.alertTypes?.length) {
    filteredAlerts = filteredAlerts.filter(a => filters.alertTypes!.includes(a.alertType));
  }
  if (filters?.severities?.length) {
    filteredAlerts = filteredAlerts.filter(a => filters.severities!.includes(a.severity || 'unknown'));
  }
  if (filters?.statuses?.length) {
    filteredAlerts = filteredAlerts.filter(a => filters.statuses!.includes(a.status));
  }

  // Calculate stats
  const totalAlerts = filteredAlerts.length;
  const resolvedAlerts = filteredAlerts.filter(a => a.status === 'resolved').length;
  const pendingAlerts = totalAlerts - resolvedAlerts;

  const resolvedWithTime = filteredAlerts.filter(a => a.status === 'resolved' && a.resolvedAt);
  let avgResolutionTimeMinutes: number | null = null;
  if (resolvedWithTime.length > 0) {
    avgResolutionTimeMinutes = Math.round(
      resolvedWithTime.reduce((sum, a) => sum + (Number(a.resolvedAt) - Number(a.createdAt)) / 60000, 0) /
        resolvedWithTime.length
    );
  }

  // Group by alert type
  const byAlertType: { alertType: string; count: number }[] = [];
  const alertTypeMap = new Map<string, number>();
  filteredAlerts.forEach(a => alertTypeMap.set(a.alertType, (alertTypeMap.get(a.alertType) || 0) + 1));
  alertTypeMap.forEach((count, alertType) => byAlertType.push({ alertType, count }));
  byAlertType.sort((a, b) => b.count - a.count);

  // Group by severity
  const bySeverity: { severity: string; count: number }[] = [];
  const severityMap = new Map<string, number>();
  filteredAlerts.forEach(a => severityMap.set(a.severity || 'unknown', (severityMap.get(a.severity || 'unknown') || 0) + 1));
  severityMap.forEach((count, severity) => bySeverity.push({ severity, count }));

  // Group by level
  const byLevel: { level: number; count: number }[] = [];
  const levelMap = new Map<number, number>();
  filteredAlerts.forEach(a => levelMap.set(a.escalationLevel, (levelMap.get(a.escalationLevel) || 0) + 1));
  levelMap.forEach((count, level) => byLevel.push({ level, count }));
  byLevel.sort((a, b) => a.level - b.level);

  // Calculate trends
  const trends: { date: string; totalAlerts: number; resolvedAlerts: number }[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let t = periodStart; t < periodEnd; t += dayMs) {
    const dayAlerts = filteredAlerts.filter(a => Number(a.createdAt) >= t && Number(a.createdAt) < t + dayMs);
    trends.push({
      date: new Date(t).toLocaleDateString('vi-VN'),
      totalAlerts: dayAlerts.length,
      resolvedAlerts: dayAlerts.filter(a => a.status === 'resolved').length,
    });
  }

  // Map alerts to export format
  const exportAlerts: EscalationAlertExport[] = filteredAlerts.map(a => ({
    id: a.id,
    alertType: a.alertType,
    alertTitle: a.alertTitle,
    alertMessage: a.alertMessage || '',
    severity: a.severity || 'unknown',
    escalationLevel: a.escalationLevel,
    status: a.status,
    assignedTo: a.assignedTo || null,
    resolvedBy: a.resolvedBy || null,
    resolutionNotes: a.resolutionNotes || null,
    createdAt: Number(a.createdAt),
    resolvedAt: a.resolvedAt ? Number(a.resolvedAt) : null,
    resolutionTimeMinutes: a.resolvedAt ? Math.round((Number(a.resolvedAt) - Number(a.createdAt)) / 60000) : null,
  }));

  return {
    periodStart,
    periodEnd,
    alerts: exportAlerts,
    stats: {
      totalAlerts,
      resolvedAlerts,
      pendingAlerts,
      avgResolutionTimeMinutes,
      byAlertType,
      bySeverity,
      byLevel,
    },
    trends,
  };
}

/**
 * Export báo cáo escalation ra Excel
 */
export async function exportEscalationToExcel(
  data: EscalationExportData,
  options?: {
    includeStats?: boolean;
    includeTrends?: boolean;
    includeAlerts?: boolean;
  }
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SPC/CPK Calculator';
  workbook.created = new Date();

  const opts = {
    includeStats: options?.includeStats ?? true,
    includeTrends: options?.includeTrends ?? true,
    includeAlerts: options?.includeAlerts ?? true,
  };

  // ============ Sheet 1: Summary ============
  const summarySheet = workbook.addWorksheet('Tổng quan');
  
  // Title
  summarySheet.mergeCells('A1:F1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'BÁO CÁO ESCALATION';
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center' };

  // Period
  summarySheet.mergeCells('A2:F2');
  const periodCell = summarySheet.getCell('A2');
  periodCell.value = `Kỳ báo cáo: ${new Date(data.periodStart).toLocaleDateString('vi-VN')} - ${new Date(data.periodEnd).toLocaleDateString('vi-VN')}`;
  periodCell.font = { size: 12, italic: true };
  periodCell.alignment = { horizontal: 'center' };

  // Stats section
  if (opts.includeStats) {
    summarySheet.addRow([]);
    summarySheet.addRow(['THỐNG KÊ TỔNG QUAN']).font = { bold: true, size: 14 };
    
    const statsData = [
      ['Tổng số cảnh báo', data.stats.totalAlerts],
      ['Đã xử lý', data.stats.resolvedAlerts],
      ['Đang chờ', data.stats.pendingAlerts],
      ['Thời gian xử lý TB (phút)', data.stats.avgResolutionTimeMinutes || 'N/A'],
    ];
    
    statsData.forEach(row => {
      const r = summarySheet.addRow(row);
      r.getCell(1).font = { bold: true };
      r.getCell(2).alignment = { horizontal: 'right' };
    });

    // By Alert Type
    summarySheet.addRow([]);
    summarySheet.addRow(['THEO LOẠI CẢNH BÁO']).font = { bold: true, size: 14 };
    summarySheet.addRow(['Loại', 'Số lượng']).font = { bold: true };
    data.stats.byAlertType.forEach(item => {
      summarySheet.addRow([item.alertType, item.count]);
    });

    // By Severity
    summarySheet.addRow([]);
    summarySheet.addRow(['THEO MỨC ĐỘ']).font = { bold: true, size: 14 };
    summarySheet.addRow(['Mức độ', 'Số lượng']).font = { bold: true };
    data.stats.bySeverity.forEach(item => {
      const row = summarySheet.addRow([item.severity, item.count]);
      // Color code severity
      if (item.severity === 'critical') {
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
        row.getCell(1).font = { color: { argb: 'FFFFFFFF' } };
      } else if (item.severity === 'warning') {
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
      }
    });

    // By Level
    summarySheet.addRow([]);
    summarySheet.addRow(['THEO CẤP ĐỘ ESCALATION']).font = { bold: true, size: 14 };
    summarySheet.addRow(['Cấp độ', 'Số lượng']).font = { bold: true };
    data.stats.byLevel.forEach(item => {
      summarySheet.addRow([`Level ${item.level}`, item.count]);
    });
  }

  // Set column widths
  summarySheet.columns = [
    { width: 30 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
  ];

  // ============ Sheet 2: Trends ============
  if (opts.includeTrends && data.trends.length > 0) {
    const trendsSheet = workbook.addWorksheet('Xu hướng');
    
    trendsSheet.addRow(['BIỂU ĐỒ XU HƯỚNG THEO NGÀY']).font = { bold: true, size: 14 };
    trendsSheet.addRow([]);
    
    // Header
    const headerRow = trendsSheet.addRow(['Ngày', 'Tổng cảnh báo', 'Đã xử lý', 'Tỷ lệ xử lý (%)']);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Data rows
    data.trends.forEach(trend => {
      const rate = trend.totalAlerts > 0 ? Math.round((trend.resolvedAlerts / trend.totalAlerts) * 100) : 0;
      const row = trendsSheet.addRow([trend.date, trend.totalAlerts, trend.resolvedAlerts, `${rate}%`]);
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    trendsSheet.columns = [
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 18 },
    ];
  }

  // ============ Sheet 3: Alert Details ============
  if (opts.includeAlerts && data.alerts.length > 0) {
    const alertsSheet = workbook.addWorksheet('Chi tiết cảnh báo');
    
    // Header
    const headers = [
      'ID',
      'Loại',
      'Tiêu đề',
      'Nội dung',
      'Mức độ',
      'Cấp độ',
      'Trạng thái',
      'Người xử lý',
      'Ghi chú',
      'Thời gian tạo',
      'Thời gian xử lý',
      'TG xử lý (phút)',
    ];
    
    const headerRow = alertsSheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Data rows
    data.alerts.forEach(alert => {
      const row = alertsSheet.addRow([
        alert.id,
        alert.alertType,
        alert.alertTitle,
        alert.alertMessage,
        alert.severity,
        alert.escalationLevel,
        alert.status,
        alert.resolvedBy || '-',
        alert.resolutionNotes || '-',
        new Date(alert.createdAt).toLocaleString('vi-VN'),
        alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString('vi-VN') : '-',
        alert.resolutionTimeMinutes || '-',
      ]);

      // Color code severity
      const severityCell = row.getCell(5);
      if (alert.severity === 'critical') {
        severityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
        severityCell.font = { color: { argb: 'FFFFFFFF' } };
      } else if (alert.severity === 'warning') {
        severityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
      }

      // Color code status
      const statusCell = row.getCell(7);
      if (alert.status === 'resolved') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
        statusCell.font = { color: { argb: 'FFFFFFFF' } };
      } else if (alert.status === 'pending') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
        statusCell.font = { color: { argb: 'FFFFFFFF' } };
      }

      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Set column widths
    alertsSheet.columns = [
      { width: 8 },   // ID
      { width: 15 },  // Type
      { width: 30 },  // Title
      { width: 40 },  // Message
      { width: 12 },  // Severity
      { width: 10 },  // Level
      { width: 12 },  // Status
      { width: 15 },  // Resolved by
      { width: 30 },  // Notes
      { width: 20 },  // Created
      { width: 20 },  // Resolved
      { width: 15 },  // Resolution time
    ];

    // Freeze header row
    alertsSheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export báo cáo escalation ra PDF (HTML format for conversion)
 */
export async function generateEscalationPdfHtml(
  data: EscalationExportData,
  options?: {
    includeStats?: boolean;
    includeTrends?: boolean;
    includeAlerts?: boolean;
  }
): Promise<string> {
  const opts = {
    includeStats: options?.includeStats ?? true,
    includeTrends: options?.includeTrends ?? true,
    includeAlerts: options?.includeAlerts ?? true,
  };

  const periodStartStr = new Date(data.periodStart).toLocaleDateString('vi-VN');
  const periodEndStr = new Date(data.periodEnd).toLocaleDateString('vi-VN');

  let html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo Escalation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
    h1 { color: #1e40af; font-size: 24px; text-align: center; margin-bottom: 10px; }
    h2 { color: #374151; font-size: 16px; margin: 20px 0 10px; border-bottom: 2px solid #1e40af; padding-bottom: 5px; }
    .period { text-align: center; color: #6b7280; margin-bottom: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .stat-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #1e40af; }
    .stat-label { font-size: 11px; color: #6b7280; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #1e40af; color: white; padding: 10px; text-align: left; font-size: 11px; }
    td { padding: 8px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    tr:nth-child(even) { background: #f9fafb; }
    .severity-critical { background: #dc2626; color: white; padding: 2px 8px; border-radius: 4px; }
    .severity-warning { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; }
    .severity-info { background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; }
    .status-resolved { background: #059669; color: white; padding: 2px 8px; border-radius: 4px; }
    .status-pending { background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; }
    .status-escalated { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; }
    .footer { text-align: center; color: #9ca3af; font-size: 10px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>📊 BÁO CÁO ESCALATION</h1>
  <p class="period">Kỳ báo cáo: ${periodStartStr} - ${periodEndStr}</p>
`;

  // Stats section
  if (opts.includeStats) {
    html += `
  <h2>📈 Thống kê tổng quan</h2>
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-value">${data.stats.totalAlerts}</div>
      <div class="stat-label">Tổng số cảnh báo</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #059669;">${data.stats.resolvedAlerts}</div>
      <div class="stat-label">Đã xử lý</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #dc2626;">${data.stats.pendingAlerts}</div>
      <div class="stat-label">Đang chờ</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color: #7c3aed;">${data.stats.avgResolutionTimeMinutes || 'N/A'}</div>
      <div class="stat-label">TG xử lý TB (phút)</div>
    </div>
  </div>

  <h2>📋 Phân loại cảnh báo</h2>
  <table>
    <thead>
      <tr>
        <th>Loại cảnh báo</th>
        <th>Số lượng</th>
        <th>Tỷ lệ</th>
      </tr>
    </thead>
    <tbody>
      ${data.stats.byAlertType.map(item => `
      <tr>
        <td>${item.alertType}</td>
        <td>${item.count}</td>
        <td>${data.stats.totalAlerts > 0 ? Math.round((item.count / data.stats.totalAlerts) * 100) : 0}%</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>⚠️ Phân loại theo mức độ</h2>
  <table>
    <thead>
      <tr>
        <th>Mức độ</th>
        <th>Số lượng</th>
        <th>Tỷ lệ</th>
      </tr>
    </thead>
    <tbody>
      ${data.stats.bySeverity.map(item => `
      <tr>
        <td><span class="severity-${item.severity}">${item.severity}</span></td>
        <td>${item.count}</td>
        <td>${data.stats.totalAlerts > 0 ? Math.round((item.count / data.stats.totalAlerts) * 100) : 0}%</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
`;
  }

  // Trends section
  if (opts.includeTrends && data.trends.length > 0) {
    html += `
  <h2>📉 Xu hướng theo ngày</h2>
  <table>
    <thead>
      <tr>
        <th>Ngày</th>
        <th>Tổng cảnh báo</th>
        <th>Đã xử lý</th>
        <th>Tỷ lệ xử lý</th>
      </tr>
    </thead>
    <tbody>
      ${data.trends.map(trend => {
        const rate = trend.totalAlerts > 0 ? Math.round((trend.resolvedAlerts / trend.totalAlerts) * 100) : 0;
        return `
      <tr>
        <td>${trend.date}</td>
        <td>${trend.totalAlerts}</td>
        <td>${trend.resolvedAlerts}</td>
        <td>${rate}%</td>
      </tr>
        `;
      }).join('')}
    </tbody>
  </table>
`;
  }

  // Alerts section
  if (opts.includeAlerts && data.alerts.length > 0) {
    html += `
  <h2>📝 Chi tiết cảnh báo (${data.alerts.length} mục)</h2>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Loại</th>
        <th>Tiêu đề</th>
        <th>Mức độ</th>
        <th>Cấp độ</th>
        <th>Trạng thái</th>
        <th>Thời gian tạo</th>
        <th>TG xử lý</th>
      </tr>
    </thead>
    <tbody>
      ${data.alerts.slice(0, 100).map(alert => `
      <tr>
        <td>${alert.id}</td>
        <td>${alert.alertType}</td>
        <td>${alert.alertTitle}</td>
        <td><span class="severity-${alert.severity}">${alert.severity}</span></td>
        <td>Level ${alert.escalationLevel}</td>
        <td><span class="status-${alert.status}">${alert.status}</span></td>
        <td>${new Date(alert.createdAt).toLocaleString('vi-VN')}</td>
        <td>${alert.resolutionTimeMinutes ? `${alert.resolutionTimeMinutes} phút` : '-'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ${data.alerts.length > 100 ? `<p style="color: #6b7280; font-style: italic;">Hiển thị 100/${data.alerts.length} cảnh báo. Xem file Excel để xem đầy đủ.</p>` : ''}
`;
  }

  html += `
  <div class="footer">
    <p>Báo cáo được tạo tự động bởi SPC/CPK Calculator</p>
    <p>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</p>
  </div>
</body>
</html>
`;

  return html;
}

/**
 * Get scheduled report history
 */
export async function getScheduledReportHistory(
  configId?: number,
  limit: number = 50
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(escalationReportHistory);
  if (configId) {
    query = query.where(eq(escalationReportHistory.configId, configId)) as any;
  }
  
  const results = await query.orderBy(desc(escalationReportHistory.sentAt)).limit(limit);
  return results;
}

export default {
  getEscalationExportData,
  exportEscalationToExcel,
  generateEscalationPdfHtml,
  getScheduledReportHistory,
};
