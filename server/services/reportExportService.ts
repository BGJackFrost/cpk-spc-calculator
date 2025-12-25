/**
 * Report Export Service
 * Task: RPT-01, RPT-03, RPT-04
 * Service xuất báo cáo OEE/Maintenance PDF/Excel với template chuyên nghiệp
 */

import { getDb } from "../db";
import { machines, productionLines, workOrders, spareParts, oeeRecords } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

// Types
export interface ReportConfig {
  reportType: "oee" | "maintenance" | "spc" | "ntf" | "combined";
  format: "pdf" | "excel" | "html";
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: {
    machineIds?: number[];
    productionLineIds?: number[];
    shiftIds?: number[];
  };
  includeCharts?: boolean;
  includeDetails?: boolean;
  language?: "vi" | "en";
}

export interface OEEReportData {
  summary: {
    avgOEE: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
    totalDowntime: number;
    totalProduction: number;
  };
  byMachine: Array<{
    machineId: number;
    machineName: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    downtime: number;
  }>;
  trend: Array<{
    date: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }>;
}

export interface MaintenanceReportData {
  summary: {
    totalWorkOrders: number;
    completedWorkOrders: number;
    pendingWorkOrders: number;
    avgMTTR: number;
    avgMTBF: number;
    totalCost: number;
  };
  byType: Array<{
    type: string;
    count: number;
    avgDuration: number;
    totalCost: number;
  }>;
  byMachine: Array<{
    machineId: number;
    machineName: string;
    workOrderCount: number;
    totalDowntime: number;
    totalCost: number;
  }>;
  recentWorkOrders: Array<{
    id: number;
    machineId: number;
    machineName: string;
    type: string;
    status: string;
    createdAt: Date;
    completedAt?: Date;
    duration?: number;
    cost?: number;
  }>;
}

// Generate OEE Report Data
export async function generateOEEReportData(config: ReportConfig): Promise<OEEReportData> {
  const db = await getDb();
  
  // Mock data for demonstration
  const summary = {
    avgOEE: 78.5,
    avgAvailability: 92.3,
    avgPerformance: 88.7,
    avgQuality: 96.2,
    totalDowntime: 1250, // minutes
    totalProduction: 45000, // units
  };

  const byMachine = [
    { machineId: 1, machineName: "CNC-001", oee: 82.5, availability: 94.2, performance: 90.1, quality: 97.2, downtime: 180 },
    { machineId: 2, machineName: "Laser-002", oee: 75.8, availability: 89.5, performance: 87.3, quality: 97.0, downtime: 320 },
    { machineId: 3, machineName: "Press-003", oee: 79.2, availability: 91.8, performance: 89.5, quality: 96.5, downtime: 250 },
    { machineId: 4, machineName: "Mill-004", oee: 76.5, availability: 90.2, performance: 86.8, quality: 97.8, downtime: 280 },
    { machineId: 5, machineName: "Drill-005", oee: 78.5, availability: 93.5, performance: 88.2, quality: 95.2, downtime: 220 },
  ];

  const days = Math.ceil((config.dateRange.end.getTime() - config.dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const trend = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const date = new Date(config.dateRange.start);
    date.setDate(date.getDate() + i);
    return {
      date: date.toISOString().split("T")[0],
      oee: 75 + Math.random() * 15,
      availability: 88 + Math.random() * 10,
      performance: 85 + Math.random() * 12,
      quality: 94 + Math.random() * 5,
    };
  });

  return { summary, byMachine, trend };
}

// Generate Maintenance Report Data
export async function generateMaintenanceReportData(config: ReportConfig): Promise<MaintenanceReportData> {
  const db = await getDb();
  
  // Mock data for demonstration
  const summary = {
    totalWorkOrders: 45,
    completedWorkOrders: 38,
    pendingWorkOrders: 7,
    avgMTTR: 45, // minutes
    avgMTBF: 168, // hours
    totalCost: 12500,
  };

  const byType = [
    { type: "Phòng ngừa", count: 25, avgDuration: 35, totalCost: 5000 },
    { type: "Sửa chữa", count: 15, avgDuration: 65, totalCost: 6500 },
    { type: "Dự đoán", count: 5, avgDuration: 25, totalCost: 1000 },
  ];

  const byMachine = [
    { machineId: 1, machineName: "CNC-001", workOrderCount: 12, totalDowntime: 420, totalCost: 3200 },
    { machineId: 2, machineName: "Laser-002", workOrderCount: 10, totalDowntime: 380, totalCost: 2800 },
    { machineId: 3, machineName: "Press-003", workOrderCount: 8, totalDowntime: 290, totalCost: 2500 },
    { machineId: 4, machineName: "Mill-004", workOrderCount: 9, totalDowntime: 350, totalCost: 2400 },
    { machineId: 5, machineName: "Drill-005", workOrderCount: 6, totalDowntime: 210, totalCost: 1600 },
  ];

  const recentWorkOrders = [
    { id: 1, machineId: 1, machineName: "CNC-001", type: "Sửa chữa", status: "completed", createdAt: new Date(), completedAt: new Date(), duration: 45, cost: 350 },
    { id: 2, machineId: 2, machineName: "Laser-002", type: "Phòng ngừa", status: "in_progress", createdAt: new Date(), duration: 30, cost: 200 },
    { id: 3, machineId: 3, machineName: "Press-003", type: "Dự đoán", status: "open", createdAt: new Date(), cost: 150 },
  ];

  return { summary, byType, byMachine, recentWorkOrders };
}

// Generate Excel Report
export async function generateExcelReport(
  config: ReportConfig,
  oeeData?: OEEReportData,
  maintenanceData?: MaintenanceReportData
): Promise<Buffer> {
  const workbook = XLSX.utils.book_new();

  // OEE Sheet
  if (config.reportType === "oee" || config.reportType === "combined") {
    const data = oeeData || await generateOEEReportData(config);
    
    // Summary sheet
    const summarySheet = XLSX.utils.json_to_sheet([
      { "Chỉ số": "OEE Trung bình", "Giá trị": `${data.summary.avgOEE.toFixed(1)}%` },
      { "Chỉ số": "Availability", "Giá trị": `${data.summary.avgAvailability.toFixed(1)}%` },
      { "Chỉ số": "Performance", "Giá trị": `${data.summary.avgPerformance.toFixed(1)}%` },
      { "Chỉ số": "Quality", "Giá trị": `${data.summary.avgQuality.toFixed(1)}%` },
      { "Chỉ số": "Tổng Downtime", "Giá trị": `${data.summary.totalDowntime} phút` },
      { "Chỉ số": "Tổng Sản lượng", "Giá trị": `${data.summary.totalProduction.toLocaleString()} đơn vị` },
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "OEE Summary");

    // By Machine sheet
    const machineSheet = XLSX.utils.json_to_sheet(data.byMachine.map(m => ({
      "Máy": m.machineName,
      "OEE (%)": m.oee.toFixed(1),
      "Availability (%)": m.availability.toFixed(1),
      "Performance (%)": m.performance.toFixed(1),
      "Quality (%)": m.quality.toFixed(1),
      "Downtime (phút)": m.downtime,
    })));
    XLSX.utils.book_append_sheet(workbook, machineSheet, "OEE by Machine");

    // Trend sheet
    const trendSheet = XLSX.utils.json_to_sheet(data.trend.map(t => ({
      "Ngày": t.date,
      "OEE (%)": t.oee.toFixed(1),
      "Availability (%)": t.availability.toFixed(1),
      "Performance (%)": t.performance.toFixed(1),
      "Quality (%)": t.quality.toFixed(1),
    })));
    XLSX.utils.book_append_sheet(workbook, trendSheet, "OEE Trend");
  }

  // Maintenance Sheet
  if (config.reportType === "maintenance" || config.reportType === "combined") {
    const data = maintenanceData || await generateMaintenanceReportData(config);
    
    // Summary sheet
    const summarySheet = XLSX.utils.json_to_sheet([
      { "Chỉ số": "Tổng Work Orders", "Giá trị": data.summary.totalWorkOrders },
      { "Chỉ số": "Hoàn thành", "Giá trị": data.summary.completedWorkOrders },
      { "Chỉ số": "Đang chờ", "Giá trị": data.summary.pendingWorkOrders },
      { "Chỉ số": "MTTR Trung bình", "Giá trị": `${data.summary.avgMTTR} phút` },
      { "Chỉ số": "MTBF Trung bình", "Giá trị": `${data.summary.avgMTBF} giờ` },
      { "Chỉ số": "Tổng Chi phí", "Giá trị": `$${data.summary.totalCost.toLocaleString()}` },
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Maintenance Summary");

    // By Type sheet
    const typeSheet = XLSX.utils.json_to_sheet(data.byType.map(t => ({
      "Loại": t.type,
      "Số lượng": t.count,
      "Thời gian TB (phút)": t.avgDuration,
      "Tổng Chi phí ($)": t.totalCost,
    })));
    XLSX.utils.book_append_sheet(workbook, typeSheet, "Maintenance by Type");

    // By Machine sheet
    const machineSheet = XLSX.utils.json_to_sheet(data.byMachine.map(m => ({
      "Máy": m.machineName,
      "Số Work Orders": m.workOrderCount,
      "Tổng Downtime (phút)": m.totalDowntime,
      "Tổng Chi phí ($)": m.totalCost,
    })));
    XLSX.utils.book_append_sheet(workbook, machineSheet, "Maintenance by Machine");

    // Recent Work Orders sheet
    const woSheet = XLSX.utils.json_to_sheet(data.recentWorkOrders.map(wo => ({
      "ID": wo.id,
      "Máy": wo.machineName,
      "Loại": wo.type,
      "Trạng thái": wo.status,
      "Ngày tạo": wo.createdAt.toLocaleDateString("vi-VN"),
      "Thời gian (phút)": wo.duration || "-",
      "Chi phí ($)": wo.cost || "-",
    })));
    XLSX.utils.book_append_sheet(workbook, woSheet, "Recent Work Orders");
  }

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

// Generate HTML Report (for PDF conversion)
export async function generateHTMLReport(
  config: ReportConfig,
  oeeData?: OEEReportData,
  maintenanceData?: MaintenanceReportData
): Promise<string> {
  const data = config.reportType === "oee" 
    ? oeeData || await generateOEEReportData(config)
    : maintenanceData || await generateMaintenanceReportData(config);

  const dateRangeStr = `${config.dateRange.start.toLocaleDateString("vi-VN")} - ${config.dateRange.end.toLocaleDateString("vi-VN")}`;
  const reportTitle = config.reportType === "oee" ? "Báo cáo OEE" : "Báo cáo Bảo trì";

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
    .header h1 { color: #3b82f6; margin: 0; }
    .header p { color: #666; margin: 5px 0; }
    .section { margin: 30px 0; }
    .section h2 { color: #1e40af; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
    .summary-card .value { font-size: 28px; font-weight: bold; color: #3b82f6; }
    .summary-card .label { color: #64748b; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
    th { background: #f1f5f9; color: #475569; font-weight: 600; }
    tr:nth-child(even) { background: #f8fafc; }
    .good { color: #22c55e; }
    .warning { color: #f59e0b; }
    .bad { color: #ef4444; }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportTitle}</h1>
    <p>Kỳ báo cáo: ${dateRangeStr}</p>
    <p>Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}</p>
  </div>

  ${config.reportType === "oee" ? generateOEEHTMLContent(data as OEEReportData) : generateMaintenanceHTMLContent(data as MaintenanceReportData)}

  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} - Mọi quyền được bảo lưu</p>
  </div>
</body>
</html>
  `;

  return html;
}

function generateOEEHTMLContent(data: OEEReportData): string {
  const getOEEClass = (oee: number) => oee >= 85 ? "good" : oee >= 70 ? "warning" : "bad";

  return `
    <div class="section">
      <h2>Tổng quan OEE</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="value ${getOEEClass(data.summary.avgOEE)}">${data.summary.avgOEE.toFixed(1)}%</div>
          <div class="label">OEE Trung bình</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.avgAvailability.toFixed(1)}%</div>
          <div class="label">Availability</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.avgPerformance.toFixed(1)}%</div>
          <div class="label">Performance</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.avgQuality.toFixed(1)}%</div>
          <div class="label">Quality</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.totalDowntime}</div>
          <div class="label">Tổng Downtime (phút)</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.totalProduction.toLocaleString()}</div>
          <div class="label">Tổng Sản lượng</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>OEE theo Máy</h2>
      <table>
        <thead>
          <tr>
            <th>Máy</th>
            <th>OEE</th>
            <th>Availability</th>
            <th>Performance</th>
            <th>Quality</th>
            <th>Downtime</th>
          </tr>
        </thead>
        <tbody>
          ${data.byMachine.map(m => `
            <tr>
              <td>${m.machineName}</td>
              <td class="${getOEEClass(m.oee)}">${m.oee.toFixed(1)}%</td>
              <td>${m.availability.toFixed(1)}%</td>
              <td>${m.performance.toFixed(1)}%</td>
              <td>${m.quality.toFixed(1)}%</td>
              <td>${m.downtime} phút</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function generateMaintenanceHTMLContent(data: MaintenanceReportData): string {
  return `
    <div class="section">
      <h2>Tổng quan Bảo trì</h2>
      <div class="summary-grid">
        <div class="summary-card">
          <div class="value">${data.summary.totalWorkOrders}</div>
          <div class="label">Tổng Work Orders</div>
        </div>
        <div class="summary-card">
          <div class="value good">${data.summary.completedWorkOrders}</div>
          <div class="label">Hoàn thành</div>
        </div>
        <div class="summary-card">
          <div class="value warning">${data.summary.pendingWorkOrders}</div>
          <div class="label">Đang chờ</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.avgMTTR} phút</div>
          <div class="label">MTTR Trung bình</div>
        </div>
        <div class="summary-card">
          <div class="value">${data.summary.avgMTBF} giờ</div>
          <div class="label">MTBF Trung bình</div>
        </div>
        <div class="summary-card">
          <div class="value">$${data.summary.totalCost.toLocaleString()}</div>
          <div class="label">Tổng Chi phí</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Phân loại Bảo trì</h2>
      <table>
        <thead>
          <tr>
            <th>Loại</th>
            <th>Số lượng</th>
            <th>Thời gian TB</th>
            <th>Tổng Chi phí</th>
          </tr>
        </thead>
        <tbody>
          ${data.byType.map(t => `
            <tr>
              <td>${t.type}</td>
              <td>${t.count}</td>
              <td>${t.avgDuration} phút</td>
              <td>$${t.totalCost.toLocaleString()}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>Bảo trì theo Máy</h2>
      <table>
        <thead>
          <tr>
            <th>Máy</th>
            <th>Số Work Orders</th>
            <th>Tổng Downtime</th>
            <th>Tổng Chi phí</th>
          </tr>
        </thead>
        <tbody>
          ${data.byMachine.map(m => `
            <tr>
              <td>${m.machineName}</td>
              <td>${m.workOrderCount}</td>
              <td>${m.totalDowntime} phút</td>
              <td>$${m.totalCost.toLocaleString()}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// Scheduled Report Configuration
export interface ScheduledReportConfig {
  id: number;
  name: string;
  reportType: ReportConfig["reportType"];
  format: ReportConfig["format"];
  schedule: "daily" | "weekly" | "monthly";
  recipients: string[];
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
}

// Get scheduled reports
export async function getScheduledReports(): Promise<ScheduledReportConfig[]> {
  // In production, fetch from database
  return [
    {
      id: 1,
      name: "Báo cáo OEE hàng tuần",
      reportType: "oee",
      format: "excel",
      schedule: "weekly",
      recipients: ["manager@company.com"],
      enabled: true,
      lastRunAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      id: 2,
      name: "Báo cáo Bảo trì hàng tháng",
      reportType: "maintenance",
      format: "pdf",
      schedule: "monthly",
      recipients: ["director@company.com", "maintenance@company.com"],
      enabled: true,
      lastRunAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      nextRunAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ];
}
