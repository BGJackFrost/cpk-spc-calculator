/**
 * Scheduled Email Report Service
 * Service tạo và gửi báo cáo email định kỳ với biểu đồ Radar Chart
 */

import { getDb } from "./db";
import { scheduledReports, scheduledReportLogs, users, productionLines, products } from "../drizzle/schema";
import { eq, and, lte, isNull, or, inArray } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { sendEmail } from "./emailService";
import { storagePut } from "./storage";
import { format, subDays, subWeeks, subMonths, addDays, addWeeks, addMonths, startOfDay, setHours, setMinutes } from "date-fns";
import { vi } from "date-fns/locale";

// Types
export interface RadarChartData {
  metric: string;
  current: number;
  previous: number;
}

export interface ReportData {
  reportType: string;
  reportPeriod: string;
  startDate: string;
  endDate: string;
  productionLines: Array<{
    id: number;
    name: string;
    cpk: number;
    cp: number;
    pp: number;
    ppk: number;
    totalSamples: number;
    violations: number;
  }>;
  radarChartData: RadarChartData[];
  summary: {
    avgCpk: number;
    totalSamples: number;
    totalViolations: number;
    improvement: number;
    improvementPercent: number;
  };
}

/**
 * Generate HTML for Radar Chart (SVG-based for email compatibility)
 */
function generateRadarChartSvg(data: RadarChartData[]): string {
  const size = 400;
  const center = size / 2;
  const maxRadius = 150;
  const levels = 4;
  
  // Calculate points for each metric
  const angleStep = (2 * Math.PI) / data.length;
  
  // Generate grid lines
  let gridLines = '';
  for (let i = 1; i <= levels; i++) {
    const radius = (maxRadius / levels) * i;
    let points = '';
    for (let j = 0; j < data.length; j++) {
      const angle = j * angleStep - Math.PI / 2;
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      points += `${x},${y} `;
    }
    gridLines += `<polygon points="${points.trim()}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
  }
  
  // Generate axis lines and labels
  let axisLines = '';
  let labels = '';
  for (let i = 0; i < data.length; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + maxRadius * Math.cos(angle);
    const y = center + maxRadius * Math.sin(angle);
    axisLines += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#d1d5db" stroke-width="1"/>`;
    
    // Label position (slightly outside the chart)
    const labelX = center + (maxRadius + 20) * Math.cos(angle);
    const labelY = center + (maxRadius + 20) * Math.sin(angle);
    labels += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#374151">${data[i].metric}</text>`;
  }
  
  // Generate data polygons
  const maxValue = 2; // CPK max scale
  
  // Current data polygon
  let currentPoints = '';
  for (let i = 0; i < data.length; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = Math.min(data[i].current / maxValue, 1);
    const x = center + maxRadius * value * Math.cos(angle);
    const y = center + maxRadius * value * Math.sin(angle);
    currentPoints += `${x},${y} `;
  }
  
  // Previous data polygon
  let previousPoints = '';
  for (let i = 0; i < data.length; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const value = Math.min(data[i].previous / maxValue, 1);
    const x = center + maxRadius * value * Math.cos(angle);
    const y = center + maxRadius * value * Math.sin(angle);
    previousPoints += `${x},${y} `;
  }
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="white"/>
      ${gridLines}
      ${axisLines}
      <polygon points="${previousPoints.trim()}" fill="rgba(148, 163, 184, 0.2)" stroke="#94a3b8" stroke-width="2" stroke-dasharray="5,5"/>
      <polygon points="${currentPoints.trim()}" fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6" stroke-width="2"/>
      ${labels}
      <g transform="translate(20, ${size - 40})">
        <rect x="0" y="0" width="15" height="15" fill="rgba(59, 130, 246, 0.3)" stroke="#3b82f6"/>
        <text x="20" y="12" font-size="11" fill="#374151">Hiện tại</text>
        <rect x="80" y="0" width="15" height="15" fill="rgba(148, 163, 184, 0.2)" stroke="#94a3b8" stroke-dasharray="3,3"/>
        <text x="100" y="12" font-size="11" fill="#374151">Kỳ trước</text>
      </g>
    </svg>
  `;
}

/**
 * Generate HTML email content for report
 */
function generateReportHtml(data: ReportData): string {
  const radarChartSvg = generateRadarChartSvg(data.radarChartData);
  
  const improvementColor = data.summary.improvement >= 0 ? '#22c55e' : '#ef4444';
  const improvementIcon = data.summary.improvement >= 0 ? '📈' : '📉';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo CPK/SPC - ${data.reportPeriod}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .summary-cards { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 30px; }
    .summary-card { flex: 1; min-width: 150px; background: #f8fafc; border-radius: 8px; padding: 20px; text-align: center; border: 1px solid #e2e8f0; }
    .summary-card .value { font-size: 28px; font-weight: bold; color: #1e40af; }
    .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 5px; }
    .chart-section { margin: 30px 0; text-align: center; }
    .chart-section h2 { color: #1e40af; font-size: 18px; margin-bottom: 20px; }
    .table-section { margin: 30px 0; }
    .table-section h2 { color: #1e40af; font-size: 18px; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    tr:hover { background: #f8fafc; }
    .cpk-good { color: #22c55e; font-weight: bold; }
    .cpk-warning { color: #f59e0b; font-weight: bold; }
    .cpk-bad { color: #ef4444; font-weight: bold; }
    .improvement { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; }
    .improvement.positive { background: #dcfce7; color: #22c55e; }
    .improvement.negative { background: #fee2e2; color: #ef4444; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Báo cáo CPK/SPC</h1>
      <p>${data.reportPeriod} | ${data.startDate} - ${data.endDate}</p>
    </div>
    
    <div class="content">
      <div class="summary-cards">
        <div class="summary-card">
          <div class="value">${data.summary.avgCpk.toFixed(2)}</div>
          <div class="label">CPK Trung bình</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.totalSamples.toLocaleString()}</div>
          <div class="label">Tổng mẫu</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.totalViolations}</div>
          <div class="label">Vi phạm</div>
        </div>
        <div class="summary-card">
          <div class="value">
            <span class="improvement ${data.summary.improvement >= 0 ? 'positive' : 'negative'}">
              ${improvementIcon} ${data.summary.improvement >= 0 ? '+' : ''}${data.summary.improvementPercent.toFixed(1)}%
            </span>
          </div>
          <div class="label">Thay đổi CPK</div>
        </div>
      </div>
      
      <div class="chart-section">
        <h2>📈 Biểu đồ Radar Chart So sánh</h2>
        ${radarChartSvg}
      </div>
      
      <div class="table-section">
        <h2>📋 Chi tiết theo Dây chuyền</h2>
        <table>
          <thead>
            <tr>
              <th>Dây chuyền</th>
              <th>CPK</th>
              <th>CP</th>
              <th>PP</th>
              <th>PPK</th>
              <th>Mẫu</th>
              <th>Vi phạm</th>
            </tr>
          </thead>
          <tbody>
            ${data.productionLines.map(line => `
              <tr>
                <td>${line.name}</td>
                <td class="${line.cpk >= 1.67 ? 'cpk-good' : line.cpk >= 1.33 ? 'cpk-warning' : 'cpk-bad'}">${line.cpk.toFixed(3)}</td>
                <td>${line.cp.toFixed(3)}</td>
                <td>${line.pp.toFixed(3)}</td>
                <td>${line.ppk.toFixed(3)}</td>
                <td>${line.totalSamples.toLocaleString()}</td>
                <td>${line.violations}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="table-section">
        <h2>📊 So sánh Chỉ số (Hiện tại vs Kỳ trước)</h2>
        <table>
          <thead>
            <tr>
              <th>Chỉ số</th>
              <th>Hiện tại</th>
              <th>Kỳ trước</th>
              <th>Thay đổi</th>
            </tr>
          </thead>
          <tbody>
            ${data.radarChartData.map(item => {
              const change = item.current - item.previous;
              const changePercent = item.previous > 0 ? (change / item.previous) * 100 : 0;
              return `
                <tr>
                  <td><strong>${item.metric}</strong></td>
                  <td>${item.current.toFixed(3)}</td>
                  <td>${item.previous.toFixed(3)}</td>
                  <td class="${change >= 0 ? 'cpk-good' : 'cpk-bad'}">
                    ${change >= 0 ? '+' : ''}${change.toFixed(3)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="footer">
      <p>Báo cáo được tạo tự động bởi Hệ thống CPK/SPC Calculator</p>
      <p>Thời gian tạo: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Get report data based on report configuration
 */
async function getReportData(report: typeof scheduledReports.$inferSelect): Promise<ReportData> {
  const db = await getDb();
  
  // Calculate date range based on schedule type
  const now = new Date();
  let startDate: Date;
  let endDate = now;
  let reportPeriod: string;
  
  switch (report.scheduleType) {
    case 'daily':
      startDate = subDays(now, 1);
      reportPeriod = 'Báo cáo hàng ngày';
      break;
    case 'weekly':
      startDate = subWeeks(now, 1);
      reportPeriod = 'Báo cáo hàng tuần';
      break;
    case 'monthly':
      startDate = subMonths(now, 1);
      reportPeriod = 'Báo cáo hàng tháng';
      break;
    default:
      startDate = subDays(now, 1);
      reportPeriod = 'Báo cáo';
  }
  
  // Get production line IDs from report config
  const lineIds = report.productionLineIds 
    ? (typeof report.productionLineIds === 'string' 
        ? JSON.parse(report.productionLineIds) 
        : report.productionLineIds)
    : [];
  
  // Fetch production line data
  let lines: Array<typeof productionLines.$inferSelect> = [];
  if (lineIds.length > 0) {
    lines = await db.select().from(productionLines).where(inArray(productionLines.id, lineIds));
  } else {
    lines = await db.select().from(productionLines).limit(10);
  }
  
  // Generate mock data for demonstration (in production, this would query actual CPK data)
  const productionLineData = lines.map(line => ({
    id: line.id,
    name: line.name,
    cpk: 1.2 + Math.random() * 0.5,
    cp: 1.3 + Math.random() * 0.4,
    pp: 1.25 + Math.random() * 0.45,
    ppk: 1.15 + Math.random() * 0.5,
    totalSamples: Math.floor(500 + Math.random() * 1500),
    violations: Math.floor(Math.random() * 10),
  }));
  
  // Calculate averages
  const avgCpk = productionLineData.reduce((sum, l) => sum + l.cpk, 0) / productionLineData.length || 0;
  const totalSamples = productionLineData.reduce((sum, l) => sum + l.totalSamples, 0);
  const totalViolations = productionLineData.reduce((sum, l) => sum + l.violations, 0);
  
  // Generate radar chart data
  const previousAvgCpk = avgCpk * (0.9 + Math.random() * 0.15);
  const radarChartData: RadarChartData[] = [
    { metric: 'CPK', current: avgCpk, previous: previousAvgCpk },
    { metric: 'CP', current: avgCpk * 1.05, previous: previousAvgCpk * 1.05 },
    { metric: 'PP', current: avgCpk * 1.02, previous: previousAvgCpk * 1.02 },
    { metric: 'PPK', current: avgCpk * 0.98, previous: previousAvgCpk * 0.98 },
    { metric: 'CA', current: 1.85 + Math.random() * 0.2, previous: 1.8 + Math.random() * 0.2 },
    { metric: 'CR', current: 0.65 + Math.random() * 0.1, previous: 0.7 + Math.random() * 0.1 },
  ];
  
  const improvement = avgCpk - previousAvgCpk;
  const improvementPercent = previousAvgCpk > 0 ? (improvement / previousAvgCpk) * 100 : 0;
  
  return {
    reportType: report.reportType,
    reportPeriod,
    startDate: format(startDate, 'dd/MM/yyyy', { locale: vi }),
    endDate: format(endDate, 'dd/MM/yyyy', { locale: vi }),
    productionLines: productionLineData,
    radarChartData,
    summary: {
      avgCpk,
      totalSamples,
      totalViolations,
      improvement,
      improvementPercent,
    },
  };
}

/**
 * Calculate next run time for a scheduled report
 */
function calculateNextRunTime(report: typeof scheduledReports.$inferSelect): Date {
  const now = new Date();
  const [hours, minutes] = (report.scheduleTime || '08:00').split(':').map(Number);
  
  let nextRun = startOfDay(now);
  nextRun = setHours(nextRun, hours);
  nextRun = setMinutes(nextRun, minutes);
  
  switch (report.scheduleType) {
    case 'daily':
      if (nextRun <= now) {
        nextRun = addDays(nextRun, 1);
      }
      break;
    case 'weekly':
      const targetDay = report.scheduleDayOfWeek || 1; // Default Monday
      while (nextRun.getDay() !== targetDay || nextRun <= now) {
        nextRun = addDays(nextRun, 1);
      }
      break;
    case 'monthly':
      const targetDate = report.scheduleDayOfMonth || 1;
      nextRun.setDate(targetDate);
      if (nextRun <= now) {
        nextRun = addMonths(nextRun, 1);
        nextRun.setDate(targetDate);
      }
      break;
  }
  
  return nextRun;
}

/**
 * Execute a scheduled report
 */
export async function executeScheduledReport(reportId: number): Promise<{
  success: boolean;
  error?: string;
  emailsSent?: number;
}> {
  const db = await getDb();
  
  // Get report configuration
  const [report] = await db.select().from(scheduledReports).where(eq(scheduledReports.id, reportId));
  
  if (!report) {
    return { success: false, error: 'Report not found' };
  }
  
  if (!report.isActive) {
    return { success: false, error: 'Report is not active' };
  }
  
  // Create log entry
  const [logResult] = await db.insert(scheduledReportLogs).values({
    reportId: report.id,
    status: 'running',
    recipientCount: 0,
    emailsSent: 0,
  });
  const logId = logResult.insertId;
  
  try {
    // Get report data
    const reportData = await getReportData(report);
    
    // Generate HTML content
    const htmlContent = generateReportHtml(reportData);
    
    // Get recipients
    const recipients = typeof report.recipients === 'string' 
      ? JSON.parse(report.recipients) 
      : report.recipients;
    
    const ccRecipients = report.ccRecipients 
      ? (typeof report.ccRecipients === 'string' 
          ? JSON.parse(report.ccRecipients) 
          : report.ccRecipients)
      : [];
    
    // Send emails
    let emailsSent = 0;
    const allRecipients = [...recipients, ...ccRecipients];
    
    for (const recipient of allRecipients) {
      try {
        await sendEmail({
          to: recipient,
          subject: `📊 ${report.name} - ${reportData.reportPeriod}`,
          html: htmlContent,
        });
        emailsSent++;
      } catch (error) {
        console.error(`[ScheduledReport] Failed to send email to ${recipient}:`, error);
      }
    }
    
    // Calculate next run time
    const nextRunAt = calculateNextRunTime(report);
    
    // Update report status
    await db.update(scheduledReports).set({
      lastRunAt: sql`NOW()`,
      lastRunStatus: 'success',
      lastRunError: null,
      nextRunAt: nextRunAt.toISOString(),
    }).where(eq(scheduledReports.id, reportId));
    
    // Update log entry
    await db.update(scheduledReportLogs).set({
      completedAt: sql`NOW()`,
      status: 'success',
      recipientCount: allRecipients.length,
      emailsSent,
    }).where(eq(scheduledReportLogs.id, Number(logId)));
    
    return { success: true, emailsSent };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update report status
    await db.update(scheduledReports).set({
      lastRunAt: sql`NOW()`,
      lastRunStatus: 'failed',
      lastRunError: errorMessage,
    }).where(eq(scheduledReports.id, reportId));
    
    // Update log entry
    await db.update(scheduledReportLogs).set({
      completedAt: sql`NOW()`,
      status: 'failed',
      errorMessage,
    }).where(eq(scheduledReportLogs.id, Number(logId)));
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Process all due scheduled reports
 */
export async function processScheduledReports(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const db = await getDb();
  
  // Find all active reports that are due
  const dueReports = await db.select().from(scheduledReports).where(
    and(
      eq(scheduledReports.isActive, 1),
      or(
        isNull(scheduledReports.nextRunAt),
        lte(scheduledReports.nextRunAt, sql`NOW()`)
      )
    )
  );
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  for (const report of dueReports) {
    processed++;
    const result = await executeScheduledReport(report.id);
    if (result.success) {
      succeeded++;
    } else {
      failed++;
    }
  }
  
  return { processed, succeeded, failed };
}

/**
 * Send test report to a specific email
 */
export async function sendTestReport(reportId: number, testEmail: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const db = await getDb();
  
  // Get report configuration
  const [report] = await db.select().from(scheduledReports).where(eq(scheduledReports.id, reportId));
  
  if (!report) {
    return { success: false, error: 'Report not found' };
  }
  
  try {
    // Get report data
    const reportData = await getReportData(report);
    
    // Generate HTML content
    const htmlContent = generateReportHtml(reportData);
    
    // Send test email
    await sendEmail({
      to: testEmail,
      subject: `[TEST] 📊 ${report.name} - ${reportData.reportPeriod}`,
      html: htmlContent,
    });
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
