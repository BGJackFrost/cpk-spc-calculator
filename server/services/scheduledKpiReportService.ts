/**
 * Scheduled KPI Report Service
 * Quản lý lịch gửi báo cáo KPI tự động qua email
 */

import { getDb } from "../db";
import { 
  scheduledKpiReports, 
  kpiReportHistory,
  productionLines,
  kpiAlertThresholds,
  spcAnalysisHistory
} from "../../drizzle/schema";
import { eq, and, desc, sql, lte, gte, inArray } from "drizzle-orm";
import { sendEmail } from "../emailService";
import { getWeeklyTrendData } from "./weeklyKpiService";
import { getShiftKPIData, getMachinePerformanceData } from "./shiftManagerService";
import { generateKPIReportEmail, KPIReportData } from "./kpiReportEmailTemplate";
import { getThresholdForLine } from "./kpiAlertService";

export interface ScheduledKpiReport {
  id: number;
  name: string;
  description: string | null;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  timeOfDay: string;
  mappingIds: number[] | null;
  reportType: "shift_summary" | "kpi_comparison" | "trend_analysis" | "full_report";
  includeCharts: boolean;
  includeDetails: boolean;
  recipients: string[];
  ccRecipients: string[];
  isEnabled: boolean;
  lastSentAt: Date | null;
  lastStatus: "success" | "failed" | "pending" | null;
  lastError: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScheduledReportInput {
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay?: string;
  mappingIds?: number[];
  reportType?: "shift_summary" | "kpi_comparison" | "trend_analysis" | "full_report";
  includeCharts?: boolean;
  includeDetails?: boolean;
  recipients: string[];
  ccRecipients?: string[];
  createdBy?: number;
}

export interface UpdateScheduledReportInput {
  name?: string;
  description?: string;
  frequency?: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  timeOfDay?: string;
  mappingIds?: number[];
  reportType?: "shift_summary" | "kpi_comparison" | "trend_analysis" | "full_report";
  includeCharts?: boolean;
  includeDetails?: boolean;
  recipients?: string[];
  ccRecipients?: string[];
  isEnabled?: boolean;
}

/**
 * Get all scheduled KPI reports
 */
export async function getScheduledKpiReports(): Promise<ScheduledKpiReport[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(scheduledKpiReports)
    .orderBy(desc(scheduledKpiReports.updatedAt));

  return results.map(r => ({
    ...r,
    mappingIds: r.mappingIds ? JSON.parse(r.mappingIds) : null,
    recipients: r.recipients.split(",").map(e => e.trim()).filter(Boolean),
    ccRecipients: r.ccRecipients ? r.ccRecipients.split(",").map(e => e.trim()).filter(Boolean) : [],
    includeCharts: r.includeCharts === 1,
    includeDetails: r.includeDetails === 1,
    isEnabled: r.isEnabled === 1
  }));
}

/**
 * Get scheduled report by ID
 */
export async function getScheduledKpiReportById(id: number): Promise<ScheduledKpiReport | null> {
  const db = await getDb();
  if (!db) return null;

  const results = await db
    .select()
    .from(scheduledKpiReports)
    .where(eq(scheduledKpiReports.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    ...r,
    mappingIds: r.mappingIds ? JSON.parse(r.mappingIds) : null,
    recipients: r.recipients.split(",").map(e => e.trim()).filter(Boolean),
    ccRecipients: r.ccRecipients ? r.ccRecipients.split(",").map(e => e.trim()).filter(Boolean) : [],
    includeCharts: r.includeCharts === 1,
    includeDetails: r.includeDetails === 1,
    isEnabled: r.isEnabled === 1
  };
}

/**
 * Create new scheduled KPI report
 */
export async function createScheduledKpiReport(input: CreateScheduledReportInput): Promise<ScheduledKpiReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(scheduledKpiReports).values({
    name: input.name,
    description: input.description || null,
    frequency: input.frequency,
    dayOfWeek: input.dayOfWeek ?? null,
    dayOfMonth: input.dayOfMonth ?? null,
    timeOfDay: input.timeOfDay || "08:00",
    mappingIds: input.mappingIds ? JSON.stringify(input.mappingIds) : null,
    reportType: input.reportType || "shift_summary",
    includeCharts: input.includeCharts !== false ? 1 : 0,
    includeDetails: input.includeDetails !== false ? 1 : 0,
    recipients: input.recipients.join(","),
    ccRecipients: input.ccRecipients?.join(",") || null,
    isEnabled: 1,
    createdBy: input.createdBy || null
  });

  const insertId = result[0].insertId;
  const created = await getScheduledKpiReportById(insertId);
  if (!created) throw new Error("Failed to create scheduled report");

  return created;
}

/**
 * Update scheduled KPI report
 */
export async function updateScheduledKpiReport(id: number, input: UpdateScheduledReportInput): Promise<ScheduledKpiReport> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.frequency !== undefined) updateData.frequency = input.frequency;
  if (input.dayOfWeek !== undefined) updateData.dayOfWeek = input.dayOfWeek;
  if (input.dayOfMonth !== undefined) updateData.dayOfMonth = input.dayOfMonth;
  if (input.timeOfDay !== undefined) updateData.timeOfDay = input.timeOfDay;
  if (input.mappingIds !== undefined) updateData.mappingIds = JSON.stringify(input.mappingIds);
  if (input.reportType !== undefined) updateData.reportType = input.reportType;
  if (input.includeCharts !== undefined) updateData.includeCharts = input.includeCharts ? 1 : 0;
  if (input.includeDetails !== undefined) updateData.includeDetails = input.includeDetails ? 1 : 0;
  if (input.recipients !== undefined) updateData.recipients = input.recipients.join(",");
  if (input.ccRecipients !== undefined) updateData.ccRecipients = input.ccRecipients.join(",");
  if (input.isEnabled !== undefined) updateData.isEnabled = input.isEnabled ? 1 : 0;

  await db.update(scheduledKpiReports)
    .set(updateData)
    .where(eq(scheduledKpiReports.id, id));

  const updated = await getScheduledKpiReportById(id);
  if (!updated) throw new Error("Scheduled report not found");

  return updated;
}

/**
 * Delete scheduled KPI report
 */
export async function deleteScheduledKpiReport(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.delete(scheduledKpiReports).where(eq(scheduledKpiReports.id, id));
  return true;
}

/**
 * Toggle report enabled status
 */
export async function toggleScheduledReport(id: number, enabled: boolean): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  await db.update(scheduledKpiReports)
    .set({ isEnabled: enabled ? 1 : 0 })
    .where(eq(scheduledKpiReports.id, id));

  return true;
}

/**
 * Get report history
 */
export async function getReportHistory(
  reportId?: number,
  limit: number = 50
): Promise<Array<{
  id: number;
  scheduledReportId: number;
  reportName: string;
  reportType: string;
  frequency: string;
  recipients: string;
  status: string;
  errorMessage: string | null;
  sentAt: Date | null;
  createdAt: Date;
}>> {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(kpiReportHistory);
  
  if (reportId) {
    query = query.where(eq(kpiReportHistory.scheduledReportId, reportId)) as typeof query;
  }

  const results = await query
    .orderBy(desc(kpiReportHistory.createdAt))
    .limit(limit);

  return results;
}

/**
 * Generate report content based on type
 */
async function generateReportContent(
  report: ScheduledKpiReport
): Promise<{
  subject: string;
  htmlContent: string;
  summary: Record<string, any>;
}> {
  const db = await getDb();
  const now = new Date();
  
  let subject = "";
  let htmlContent = "";
  const summary: Record<string, any> = {};

  // Get production lines
  let lineNames: string[] = [];
  if (report.mappingIds && report.mappingIds.length > 0 && db) {
    const lines = await db.select({ name: productionLines.name })
      .from(productionLines)
      .where(sql`${productionLines.id} IN (${report.mappingIds.join(",")})`);
    lineNames = lines.map(l => l.name);
  } else {
    lineNames = ["Tất cả dây chuyền"];
  }

  switch (report.reportType) {
    case "shift_summary": {
      subject = `[KPI Report] Báo cáo tổng hợp ca - ${now.toLocaleDateString("vi-VN")}`;
      
      const shiftData = await getShiftKPIData({ date: now });
      summary.shifts = shiftData;
      
      htmlContent = `
        <h2>Báo cáo Tổng hợp KPI theo Ca</h2>
        <p><strong>Ngày:</strong> ${now.toLocaleDateString("vi-VN")}</p>
        <p><strong>Dây chuyền:</strong> ${lineNames.join(", ")}</p>
        
        <h3>Tổng quan theo Ca</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>Ca</th>
              <th>CPK TB</th>
              <th>OEE TB</th>
              <th>Tỷ lệ lỗi</th>
              <th>Số mẫu</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${shiftData.map(s => `
              <tr>
                <td>${s.shiftName}</td>
                <td>${s.avgCpk?.toFixed(3) || "N/A"}</td>
                <td>${s.avgOee?.toFixed(1) || "N/A"}%</td>
                <td>${s.defectRate || 0}%</td>
                <td>${s.sampleCount}</td>
                <td style="color: ${s.status === 'critical' ? 'red' : s.status === 'warning' ? 'orange' : 'green'};">
                  ${s.status.toUpperCase()}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      break;
    }

    case "kpi_comparison": {
      subject = `[KPI Report] So sánh KPI tuần - ${now.toLocaleDateString("vi-VN")}`;
      
      const trendData = await getWeeklyTrendData(
        report.mappingIds?.[0] || null,
        4
      );
      summary.weeklyTrend = trendData;
      
      htmlContent = `
        <h2>Báo cáo So sánh KPI theo Tuần</h2>
        <p><strong>Ngày tạo:</strong> ${now.toLocaleDateString("vi-VN")}</p>
        <p><strong>Dây chuyền:</strong> ${lineNames.join(", ")}</p>
        
        <h3>Xu hướng 4 tuần gần nhất</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>Tuần</th>
              <th>CPK TB</th>
              <th>Thay đổi CPK</th>
              <th>OEE TB</th>
              <th>Thay đổi OEE</th>
              <th>Số mẫu</th>
            </tr>
          </thead>
          <tbody>
            ${trendData.map(w => `
              <tr>
                <td>${w.weekLabel}</td>
                <td>${w.avgCpk?.toFixed(3) || "N/A"}</td>
                <td style="color: ${(w.cpkChange || 0) >= 0 ? 'green' : 'red'};">
                  ${w.cpkChange !== undefined ? (w.cpkChange >= 0 ? "+" : "") + w.cpkChange.toFixed(1) + "%" : "N/A"}
                </td>
                <td>${w.avgOee?.toFixed(1) || "N/A"}%</td>
                <td style="color: ${(w.oeeChange || 0) >= 0 ? 'green' : 'red'};">
                  ${w.oeeChange !== undefined ? (w.oeeChange >= 0 ? "+" : "") + w.oeeChange.toFixed(1) + "%" : "N/A"}
                </td>
                <td>${w.totalSamples}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      break;
    }

    case "trend_analysis": {
      subject = `[KPI Report] Phân tích xu hướng - ${now.toLocaleDateString("vi-VN")}`;
      
      const trendData = await getWeeklyTrendData(
        report.mappingIds?.[0] || null,
        12
      );
      summary.trend = trendData;
      
      // Calculate overall trend
      const validCpk = trendData.filter(t => t.avgCpk !== null);
      let cpkTrend = "stable";
      if (validCpk.length >= 4) {
        const firstHalf = validCpk.slice(0, Math.floor(validCpk.length / 2));
        const secondHalf = validCpk.slice(Math.floor(validCpk.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + (b.avgCpk || 0), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + (b.avgCpk || 0), 0) / secondHalf.length;
        if (secondAvg > firstAvg * 1.05) cpkTrend = "improving";
        else if (secondAvg < firstAvg * 0.95) cpkTrend = "declining";
      }
      
      htmlContent = `
        <h2>Báo cáo Phân tích Xu hướng KPI</h2>
        <p><strong>Ngày tạo:</strong> ${now.toLocaleDateString("vi-VN")}</p>
        <p><strong>Dây chuyền:</strong> ${lineNames.join(", ")}</p>
        <p><strong>Khoảng thời gian:</strong> 12 tuần gần nhất</p>
        
        <h3>Đánh giá Xu hướng</h3>
        <p><strong>Xu hướng CPK:</strong> 
          <span style="color: ${cpkTrend === 'improving' ? 'green' : cpkTrend === 'declining' ? 'red' : 'gray'};">
            ${cpkTrend === 'improving' ? '↑ Cải thiện' : cpkTrend === 'declining' ? '↓ Giảm' : '→ Ổn định'}
          </span>
        </p>
        
        <h3>Chi tiết theo Tuần</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>Tuần</th>
              <th>CPK Min</th>
              <th>CPK TB</th>
              <th>CPK Max</th>
              <th>OEE Min</th>
              <th>OEE TB</th>
              <th>OEE Max</th>
            </tr>
          </thead>
          <tbody>
            ${trendData.slice(-8).map(w => `
              <tr>
                <td>${w.weekLabel}</td>
                <td>${w.minCpk?.toFixed(3) || "N/A"}</td>
                <td><strong>${w.avgCpk?.toFixed(3) || "N/A"}</strong></td>
                <td>${w.maxCpk?.toFixed(3) || "N/A"}</td>
                <td>${w.minOee?.toFixed(1) || "N/A"}%</td>
                <td><strong>${w.avgOee?.toFixed(1) || "N/A"}%</strong></td>
                <td>${w.maxOee?.toFixed(1) || "N/A"}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      break;
    }

    case "full_report":
    default: {
      subject = `[KPI Report] Báo cáo KPI đầy đủ - ${now.toLocaleDateString("vi-VN")}`;
      
      const shiftData = await getShiftKPIData({ date: now });
      const machineData = await getMachinePerformanceData({ date: now });
      const trendData = await getWeeklyTrendData(
        report.mappingIds?.[0] || null,
        4
      );
      
      summary.shifts = shiftData;
      summary.machines = machineData;
      summary.trend = trendData;
      
      htmlContent = `
        <h2>Báo cáo KPI Đầy đủ</h2>
        <p><strong>Ngày:</strong> ${now.toLocaleDateString("vi-VN")}</p>
        <p><strong>Dây chuyền:</strong> ${lineNames.join(", ")}</p>
        
        <h3>1. Tổng quan theo Ca</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>Ca</th>
              <th>CPK TB</th>
              <th>OEE TB</th>
              <th>Tỷ lệ lỗi</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${shiftData.map(s => `
              <tr>
                <td>${s.shiftName}</td>
                <td>${s.avgCpk?.toFixed(3) || "N/A"}</td>
                <td>${s.avgOee?.toFixed(1) || "N/A"}%</td>
                <td>${s.defectRate || 0}%</td>
                <td style="color: ${s.status === 'critical' ? 'red' : s.status === 'warning' ? 'orange' : 'green'};">
                  ${s.status.toUpperCase()}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <h3>2. Hiệu suất Máy (Top 10)</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>Máy</th>
              <th>Dây chuyền</th>
              <th>CPK</th>
              <th>OEE</th>
              <th>Tỷ lệ lỗi</th>
            </tr>
          </thead>
          <tbody>
            ${machineData.slice(0, 10).map(m => `
              <tr>
                <td>${m.machineName}</td>
                <td>${m.lineName}</td>
                <td>${m.cpk?.toFixed(3) || "N/A"}</td>
                <td>${m?.toFixed(1) || "N/A"}%</td>
                <td>${m.defectRate || 0}%</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <h3>3. Xu hướng 4 Tuần</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead style="background-color: #f0f0f0;">
            <tr>
              <th>Tuần</th>
              <th>CPK TB</th>
              <th>OEE TB</th>
              <th>Số mẫu</th>
            </tr>
          </thead>
          <tbody>
            ${trendData.map(w => `
              <tr>
                <td>${w.weekLabel}</td>
                <td>${w.avgCpk?.toFixed(3) || "N/A"}</td>
                <td>${w.avgOee?.toFixed(1) || "N/A"}%</td>
                <td>${w.totalSamples}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
      break;
    }
  }

  // Add footer
  htmlContent += `
    <hr style="margin-top: 30px;">
    <p style="color: #666; font-size: 12px;">
      Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator<br>
      Thời gian: ${now.toLocaleString("vi-VN")}<br>
      Loại báo cáo: ${report.reportType} | Tần suất: ${report.frequency}
    </p>
  `;

  return { subject, htmlContent, summary };
}

/**
 * Send scheduled report using enhanced email template
 */
export async function sendScheduledReport(reportId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, error: "Database not available" };

  const report = await getScheduledKpiReportById(reportId);
  if (!report) return { success: false, error: "Report not found" };

  try {
    // Generate enhanced report data
    const reportData = await generateEnhancedReportData(report);
    
    // Generate email content using the new template
    const { html: htmlContent, text: textContent } = generateKPIReportEmail(reportData);
    
    const subject = `📊 ${report.name} - ${new Date().toLocaleDateString("vi-VN")}`;

    // Send email to all recipients
    const allRecipients = [...report.recipients, ...report.ccRecipients];
    
    for (const recipient of report.recipients) {
      await sendEmail(recipient, subject, htmlContent);
    }

    // Log success
    await db.insert(kpiReportHistory).values({
      scheduledReportId: reportId,
      reportName: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      recipients: allRecipients.join(","),
      status: "sent",
      reportData: JSON.stringify(reportData),
      sentAt: new Date()
    });

    // Update report status
    await db.update(scheduledKpiReports)
      .set({
        lastSentAt: new Date(),
        lastStatus: "success",
        lastError: null
      })
      .where(eq(scheduledKpiReports.id, reportId));

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Log failure
    await db.insert(kpiReportHistory).values({
      scheduledReportId: reportId,
      reportName: report.name,
      reportType: report.reportType,
      frequency: report.frequency,
      recipients: report.recipients.join(","),
      status: "failed",
      errorMessage
    });

    // Update report status
    await db.update(scheduledKpiReports)
      .set({
        lastStatus: "failed",
        lastError: errorMessage
      })
      .where(eq(scheduledKpiReports.id, reportId));

    return { success: false, error: errorMessage };
  }
}

/**
 * Generate enhanced report data for the new email template
 */
async function generateEnhancedReportData(report: ScheduledKpiReport): Promise<KPIReportData> {
  const db = await getDb();
  const now = new Date();
  
  // Calculate date range based on frequency
  let startDate: Date;
  switch (report.frequency) {
    case "daily":
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case "weekly":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "monthly":
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Get production lines data
  const productionLinesData: KPIReportData["productionLines"] = [];
  const alerts: KPIReportData["alerts"] = [];
  const recommendations: string[] = [];

  if (db) {
    // Get production lines
    let lines;
    if (report.mappingIds && report.mappingIds.length > 0) {
      lines = await db.select()
        .from(productionLines)
        .where(sql`${productionLines.id} IN (${report.mappingIds.join(",")})`);
    } else {
      lines = await db.select().from(productionLines).limit(20);
    }

    // Get KPI data for each line
    for (const line of lines) {
      // Get threshold config for this line
      const threshold = await getThresholdForLine(line.id);
      
      // Get SPC analysis data for this line
      const analysisData = await db.select()
        .from(spcAnalysisHistory)
        .where(
          and(
            eq(spcAnalysisHistory.mappingId, line.id),
            gte(spcAnalysisHistory.createdAt, startDate),
            lte(spcAnalysisHistory.createdAt, now)
          )
        )
        .orderBy(desc(spcAnalysisHistory.createdAt));

      // Calculate averages
      const validCpk = analysisData.filter(a => a.cpk !== null).map(a => parseFloat(String(a.cpk)));
      const validOee = analysisData.filter(a => a !== null).map(a => parseFloat(String(a)));
      
      const avgCpk = validCpk.length > 0 ? validCpk.reduce((a, b) => a + b, 0) / validCpk.length : null;
      const avgOee = validOee.length > 0 ? validOee.reduce((a, b) => a + b, 0) / validOee.length : null;
      
      // Calculate defect rate (simplified)
      const defectRate = analysisData.length > 0 
        ? (analysisData.filter(a => a.cpk !== null && parseFloat(String(a.cpk)) < 1.0).length / analysisData.length) * 100
        : null;

      // Determine trends (compare with previous period)
      let cpkTrend: "up" | "down" | "stable" = "stable";
      let oeeTrend: "up" | "down" | "stable" = "stable";
      
      if (validCpk.length >= 4) {
        const firstHalf = validCpk.slice(0, Math.floor(validCpk.length / 2));
        const secondHalf = validCpk.slice(Math.floor(validCpk.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (secondAvg > firstAvg * 1.02) cpkTrend = "up";
        else if (secondAvg < firstAvg * 0.98) cpkTrend = "down";
      }

      if (validOee.length >= 4) {
        const firstHalf = validOee.slice(0, Math.floor(validOee.length / 2));
        const secondHalf = validOee.slice(Math.floor(validOee.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        if (secondAvg > firstAvg * 1.02) oeeTrend = "up";
        else if (secondAvg < firstAvg * 0.98) oeeTrend = "down";
      }

      productionLinesData.push({
        id: line.id,
        name: line.name,
        avgCpk,
        avgOee,
        defectRate,
        totalSamples: analysisData.length,
        cpkTrend,
        oeeTrend,
      });

      // Generate alerts based on thresholds
      if (avgCpk !== null && avgCpk < threshold.cpkCritical) {
        alerts.push({
          type: "cpk_critical",
          message: `CPK ${line.name} dưới ngưỡng critical (${threshold.cpkCritical})`,
          productionLine: line.name,
          value: avgCpk,
          threshold: threshold.cpkCritical,
        });
      } else if (avgCpk !== null && avgCpk < threshold.cpkWarning) {
        alerts.push({
          type: "cpk_warning",
          message: `CPK ${line.name} dưới ngưỡng warning (${threshold.cpkWarning})`,
          productionLine: line.name,
          value: avgCpk,
          threshold: threshold.cpkWarning,
        });
      }

      if (avgOee !== null && avgOee < config.thresholdCritical) {
        alerts.push({
          type: "oee_critical",
          message: `OEE ${line.name} dưới ngưỡng critical (${config.thresholdCritical}%)`,
          productionLine: line.name,
          value: avgOee,
          threshold: config.thresholdCritical,
        });
      } else if (avgOee !== null && avgOee < config.thresholdWarning) {
        alerts.push({
          type: "oee_warning",
          message: `OEE ${line.name} dưới ngưỡng warning (${config.thresholdWarning}%)`,
          productionLine: line.name,
          value: avgOee,
          threshold: config.thresholdWarning,
        });
      }

      // Add trend decline alerts
      if (cpkTrend === "down") {
        alerts.push({
          type: "decline",
          message: `CPK ${line.name} có xu hướng giảm`,
          productionLine: line.name,
        });
      }
    }
  }

  // Generate recommendations based on alerts
  if (alerts.filter(a => a.type.includes("cpk")).length > 0) {
    recommendations.push("Kiểm tra và hiệu chỉnh máy móc trên các dây chuyền có CPK thấp");
  }
  if (alerts.filter(a => a.type.includes("oee")).length > 0) {
    recommendations.push("Tối ưu hóa thời gian chạy máy và giảm thời gian dừng máy");
  }
  if (alerts.filter(a => a.type === "decline").length > 0) {
    recommendations.push("Phân tích nguyên nhân xu hướng giảm và có biện pháp khắc phục kịp thời");
  }
  if (recommendations.length === 0) {
    recommendations.push("Duy trì các quy trình hiện tại và tiếp tục giám sát KPI");
  }

  // Get shift data if report type requires it
  let shiftData: KPIReportData["shiftData"];
  if (report.reportType === "shift_summary" || report.reportType === "full_report") {
    const shifts = await getShiftKPIData({ date: now });
    shiftData = shifts.map(s => ({
      shift: s.shiftName,
      avgCpk: s.avgCpk,
      avgOee: s.avgOee,
      defectRate: s.defectRate,
    }));
  }

  return {
    reportName: report.name,
    reportType: report.reportType,
    frequency: report.frequency,
    dateRange: {
      start: startDate,
      end: now,
    },
    productionLines: productionLinesData,
    shiftData,
    alerts,
    recommendations,
  };
}

/**
 * Check and send due reports (called by scheduler)
 */
export async function processScheduledReports(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const db = await getDb();
  if (!db) return { processed: 0, sent: 0, failed: 0 };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay(); // 0-6
  const currentDate = now.getDate(); // 1-31
  const currentTimeStr = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;

  // Get enabled reports
  const reports = await db
    .select()
    .from(scheduledKpiReports)
    .where(eq(scheduledKpiReports.isEnabled, 1));

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const report of reports) {
    // Check if it's time to send
    if (report.timeOfDay !== currentTimeStr) continue;

    let shouldSend = false;

    switch (report.frequency) {
      case "daily":
        shouldSend = true;
        break;
      case "weekly":
        shouldSend = report.dayOfWeek === currentDay;
        break;
      case "monthly":
        shouldSend = report.dayOfMonth === currentDate;
        break;
    }

    if (!shouldSend) continue;

    // Check if already sent today
    if (report.lastSentAt) {
      const lastSent = new Date(report.lastSentAt);
      if (
        lastSent.getDate() === now.getDate() &&
        lastSent.getMonth() === now.getMonth() &&
        lastSent.getFullYear() === now.getFullYear()
      ) {
        continue; // Already sent today
      }
    }

    processed++;
    const result = await sendScheduledReport(report.id);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { processed, sent, failed };
}
