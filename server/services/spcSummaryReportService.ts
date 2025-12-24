/**
 * SPC Summary Report Service
 * Generates comprehensive SPC/CPK reports by shift/day/week/month
 */

import { getDb } from "../db";
import { spcSummaryStats, spcSamplingPlans, productionLines, products } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { getDefaultReportTemplate } from "../db";

export type PeriodType = "shift" | "day" | "week" | "month";

// Helper function to determine shift name based on time
function getShiftName(date: Date): string {
  const hour = date.getHours();
  if (hour >= 6 && hour < 14) return "Ca sáng";
  if (hour >= 14 && hour < 22) return "Ca chiều";
  return "Ca đêm";
}

export interface SpcSummaryReportData {
  title: string;
  subtitle: string;
  generatedAt: Date;
  dateRange: { start: Date; end: Date };
  periodType: PeriodType;
  planInfo?: {
    id: number;
    name: string;
    productName?: string;
    lineName?: string;
  };
  summary: {
    totalPeriods: number;
    avgCpk: number | null;
    minCpk: number | null;
    maxCpk: number | null;
    avgCp: number | null;
    totalSamples: number;
    excellentCount: number;
    goodCount: number;
    acceptableCount: number;
    needsImprovementCount: number;
    criticalCount: number;
  };
  periodData: Array<{
    periodStart: Date;
    periodEnd: Date;
    shiftName?: string;
    cpk: number | null;
    cp: number | null;
    ppk: number | null;
    mean: number | null;
    stdDev: number | null;
    sampleCount: number;
    status: string;
  }>;
  shiftComparison?: {
    morning: { avgCpk: number | null; count: number };
    afternoon: { avgCpk: number | null; count: number };
    night: { avgCpk: number | null; count: number };
  };
}

const SHIFT_NAMES: Record<string, string> = {
  morning: "Ca sáng (6h-14h)",
  afternoon: "Ca chiều (14h-22h)",
  night: "Ca đêm (22h-6h)",
};

function getCpkStatus(cpk: number | null): string {
  if (cpk === null) return "N/A";
  if (cpk >= 1.67) return "excellent";
  if (cpk >= 1.33) return "good";
  if (cpk >= 1.0) return "acceptable";
  if (cpk >= 0.67) return "needs_improvement";
  return "critical";
}

function getCpkStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    excellent: "Xuất sắc",
    good: "Tốt",
    acceptable: "Chấp nhận",
    needs_improvement: "Cần cải thiện",
    critical: "Nguy hiểm",
    "N/A": "Không có dữ liệu",
  };
  return labels[status] || status;
}

function getCpkStatusColor(status: string): { text: string; bg: string } {
  const colors: Record<string, { text: string; bg: string }> = {
    excellent: { text: "#059669", bg: "#d1fae5" },
    good: { text: "#2563eb", bg: "#dbeafe" },
    acceptable: { text: "#d97706", bg: "#fef3c7" },
    needs_improvement: { text: "#ea580c", bg: "#ffedd5" },
    critical: { text: "#dc2626", bg: "#fee2e2" },
    "N/A": { text: "#6b7280", bg: "#f3f4f6" },
  };
  return colors[status] || colors["N/A"];
}

/**
 * Get SPC Summary Report Data
 */
export async function getSpcSummaryReportData(
  planId: number,
  periodType: PeriodType,
  startDate: Date,
  endDate: Date
): Promise<SpcSummaryReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get plan info
  const [plan] = await db
    .select()
    .from(spcSamplingPlans)
    .where(eq(spcSamplingPlans.id, planId))
    .limit(1);

  if (!plan) {
    throw new Error(`SPC Plan ${planId} not found`);
  }

  // Get product and line info
  let productName = "";
  let lineName = "";

  if (plan.productId) {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, plan.productId))
      .limit(1);
    productName = product?.name || "";
  }

  if (plan.mappingId) {
    const [line] = await db
      .select()
      .from(productionLines)
      .where(eq(productionLines.id, plan.mappingId))
      .limit(1);
    lineName = line?.name || "";
  }

  // Get summary stats for the period
  const summaryData = await db
    .select()
    .from(spcSummaryStats)
    .where(
      and(
        eq(spcSummaryStats.planId, planId),
        eq(spcSummaryStats.periodType, periodType),
        gte(spcSummaryStats.periodStart, startDate),
        lte(spcSummaryStats.periodEnd, endDate)
      )
    )
    .orderBy(asc(spcSummaryStats.periodStart));

  // Calculate summary statistics
  const cpkValues = summaryData
    .map((d) => d.cpk)
    .filter((v): v is number => v !== null);
  const cpValues = summaryData
    .map((d) => d.cp)
    .filter((v): v is number => v !== null);

  const avgCpk = cpkValues.length > 0
    ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length
    : null;
  const minCpk = cpkValues.length > 0 ? Math.min(...cpkValues) : null;
  const maxCpk = cpkValues.length > 0 ? Math.max(...cpkValues) : null;
  const avgCp = cpValues.length > 0
    ? cpValues.reduce((a, b) => a + b, 0) / cpValues.length
    : null;

  const totalSamples = summaryData.reduce((sum, d) => sum + (d.sampleCount || 0), 0);

  // Count by status
  let excellentCount = 0;
  let goodCount = 0;
  let acceptableCount = 0;
  let needsImprovementCount = 0;
  let criticalCount = 0;

  summaryData.forEach((d) => {
    const status = getCpkStatus(d.cpk);
    switch (status) {
      case "excellent": excellentCount++; break;
      case "good": goodCount++; break;
      case "acceptable": acceptableCount++; break;
      case "needs_improvement": needsImprovementCount++; break;
      case "critical": criticalCount++; break;
    }
  });

  // Prepare period data
  const periodData = summaryData.map((d) => ({
    periodStart: d.periodStart,
    periodEnd: d.periodEnd,
    shiftName: getShiftName(d.periodStart) || undefined,
    cpk: d.cpk,
    cp: d.cp,
    ppk: d.ppk,
    mean: d.mean,
    stdDev: d.stdDev,
    sampleCount: d.sampleCount || 0,
    status: getCpkStatus(d.cpk),
  }));

  // Calculate shift comparison if period type is shift
  let shiftComparison: SpcSummaryReportData["shiftComparison"];
  if (periodType === "shift") {
    const morningData = summaryData.filter((d) => getShiftName(d.periodStart) === "Ca sáng");
    const afternoonData = summaryData.filter((d) => getShiftName(d.periodStart) === "Ca chiều");
    const nightData = summaryData.filter((d) => getShiftName(d.periodStart) === "Ca đêm");

    const calcAvg = (data: typeof summaryData) => {
      const values = data.map((d) => d.cpk).filter((v): v is number => v !== null);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    shiftComparison = {
      morning: { avgCpk: calcAvg(morningData), count: morningData.length },
      afternoon: { avgCpk: calcAvg(afternoonData), count: afternoonData.length },
      night: { avgCpk: calcAvg(nightData), count: nightData.length },
    };
  }

  return {
    title: `Báo cáo SPC/CPK - ${plan.name}`,
    subtitle: getPeriodTypeLabel(periodType),
    generatedAt: new Date(),
    dateRange: { start: startDate, end: endDate },
    periodType,
    planInfo: {
      id: plan.id,
      name: plan.name,
      productName,
      lineName,
    },
    summary: {
      totalPeriods: summaryData.length,
      avgCpk,
      minCpk,
      maxCpk,
      avgCp,
      totalSamples,
      excellentCount,
      goodCount,
      acceptableCount,
      needsImprovementCount,
      criticalCount,
    },
    periodData,
    shiftComparison,
  };
}

function getPeriodTypeLabel(periodType: PeriodType): string {
  const labels: Record<PeriodType, string> = {
    shift: "Theo ca làm việc",
    day: "Theo ngày",
    week: "Theo tuần",
    month: "Theo tháng",
  };
  return labels[periodType];
}

/**
 * Generate HTML Report for SPC Summary
 */
export async function generateSpcSummaryReportHtml(
  planId: number,
  periodType: PeriodType,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const data = await getSpcSummaryReportData(planId, periodType, startDate, endDate);
  const template = await getDefaultReportTemplate();

  const primaryColor = template?.primaryColor || "#3b82f6";
  const secondaryColor = template?.secondaryColor || "#1e40af";
  const fontFamily = template?.fontFamily || "'Segoe UI', 'Roboto', Arial, sans-serif";
  const companyName = template?.companyName || "";
  const companyLogo = template?.companyLogo || "";

  const avgCpkStatus = getCpkStatus(data.summary.avgCpk);
  const avgCpkColor = getCpkStatusColor(avgCpkStatus);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page-break { page-break-before: always; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${fontFamily}; 
      line-height: 1.5; 
      color: #1f2937; 
      background: white;
      font-size: 10pt;
    }
    
    /* Header */
    .header { 
      background: linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-logo { max-height: 40px; margin-right: 12px; }
    .header-left { display: flex; align-items: center; }
    .header-left-text h1 { font-size: 20px; font-weight: 700; }
    .header-left-text p { font-size: 11px; opacity: 0.9; margin-top: 4px; }
    .header-right { text-align: right; font-size: 10px; }
    
    /* Info Grid */
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 10px; 
      margin-bottom: 20px; 
    }
    .info-item { 
      background: #f8fafc; 
      padding: 12px; 
      border-radius: 8px; 
      border-left: 3px solid ${primaryColor};
    }
    .info-item label { 
      font-size: 9px; 
      color: #64748b; 
      text-transform: uppercase; 
      font-weight: 600;
    }
    .info-item .value { 
      display: block; 
      font-size: 13px; 
      font-weight: 600; 
      color: #1e293b; 
      margin-top: 2px; 
    }
    
    /* Summary Section */
    .summary-section {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .cpk-highlight { 
      text-align: center; 
      padding: 24px; 
      background: ${avgCpkColor.bg};
      border-radius: 10px;
      border: 2px solid ${avgCpkColor.text};
    }
    .cpk-highlight .value { 
      font-size: 48px; 
      font-weight: 800; 
      color: ${avgCpkColor.text}; 
      line-height: 1;
    }
    .cpk-highlight .label { 
      font-size: 11px; 
      color: #64748b; 
      margin-top: 6px;
    }
    .cpk-highlight .status { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 16px; 
      font-size: 11px; 
      font-weight: 600; 
      color: white; 
      background: ${avgCpkColor.text}; 
      margin-top: 10px; 
    }
    
    /* Stats Grid */
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      gap: 10px; 
    }
    .stat-item { 
      text-align: center; 
      padding: 12px; 
      background: #f8fafc; 
      border-radius: 8px; 
    }
    .stat-item .value { font-size: 20px; font-weight: 700; color: #1e293b; }
    .stat-item .label { font-size: 9px; color: #64748b; margin-top: 2px; }
    
    /* Distribution */
    .distribution-section {
      margin-bottom: 20px;
    }
    .distribution-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }
    .dist-item {
      text-align: center;
      padding: 10px;
      border-radius: 8px;
    }
    .dist-item .count { font-size: 24px; font-weight: 700; }
    .dist-item .label { font-size: 9px; margin-top: 2px; }
    
    /* Shift Comparison */
    .shift-section {
      margin-bottom: 20px;
    }
    .shift-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .shift-card {
      padding: 16px;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .shift-card .name { font-size: 12px; font-weight: 600; color: #374151; }
    .shift-card .cpk { font-size: 28px; font-weight: 700; margin: 8px 0; }
    .shift-card .count { font-size: 10px; color: #6b7280; }
    
    /* Section */
    .section { 
      background: white; 
      border-radius: 10px; 
      border: 1px solid #e2e8f0; 
      padding: 16px; 
      margin-bottom: 16px;
    }
    .section h2 { 
      font-size: 13px; 
      color: #1e293b; 
      margin-bottom: 12px; 
      padding-bottom: 8px; 
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section h2::before {
      content: '';
      width: 3px;
      height: 14px;
      background: ${primaryColor};
      border-radius: 2px;
    }
    
    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { 
      background: #f1f5f9; 
      font-size: 8pt; 
      text-transform: uppercase; 
      color: #64748b;
      font-weight: 600;
    }
    td { font-family: 'SF Mono', 'Consolas', monospace; }
    tr:nth-child(even) { background: #f8fafc; }
    
    /* Status Badge */
    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 600;
    }
    .status-excellent { background: #d1fae5; color: #059669; }
    .status-good { background: #dbeafe; color: #2563eb; }
    .status-acceptable { background: #fef3c7; color: #d97706; }
    .status-needs_improvement { background: #ffedd5; color: #ea580c; }
    .status-critical { background: #fee2e2; color: #dc2626; }
    
    /* Footer */
    .footer { 
      margin-top: 20px; 
      padding-top: 12px; 
      border-top: 1px solid #e2e8f0; 
      color: #6b7280; 
      font-size: 9px; 
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      ${companyLogo ? `<img src="${companyLogo}" alt="Logo" class="header-logo">` : ""}
      <div class="header-left-text">
        <h1>${data.title}</h1>
        <p>${data.subtitle}</p>
      </div>
    </div>
    <div class="header-right">
      ${companyName ? `<div style="font-weight: 600;">${companyName}</div>` : ""}
      <div>Ngày tạo: ${data.generatedAt.toLocaleDateString("vi-VN")}</div>
    </div>
  </div>
  
  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-item">
      <label>Kế hoạch SPC</label>
      <span class="value">${data.planInfo?.name || "N/A"}</span>
    </div>
    <div class="info-item">
      <label>Sản phẩm</label>
      <span class="value">${data.planInfo?.productName || "N/A"}</span>
    </div>
    <div class="info-item">
      <label>Dây chuyền</label>
      <span class="value">${data.planInfo?.lineName || "N/A"}</span>
    </div>
    <div class="info-item">
      <label>Khoảng thời gian</label>
      <span class="value">${data.dateRange.start.toLocaleDateString("vi-VN")} - ${data.dateRange.end.toLocaleDateString("vi-VN")}</span>
    </div>
  </div>
  
  <!-- Summary Section -->
  <div class="summary-section">
    <div class="cpk-highlight">
      <div class="value">${data.summary.avgCpk?.toFixed(3) || "N/A"}</div>
      <div class="label">CPK Trung bình</div>
      <div class="status">${getCpkStatusLabel(avgCpkStatus)}</div>
    </div>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="value">${data.summary.totalPeriods}</div>
        <div class="label">Tổng số chu kỳ</div>
      </div>
      <div class="stat-item">
        <div class="value">${data.summary.totalSamples.toLocaleString()}</div>
        <div class="label">Tổng số mẫu</div>
      </div>
      <div class="stat-item">
        <div class="value">${data.summary.avgCp?.toFixed(3) || "N/A"}</div>
        <div class="label">CP Trung bình</div>
      </div>
      <div class="stat-item">
        <div class="value">${data.summary.minCpk?.toFixed(3) || "N/A"}</div>
        <div class="label">CPK Thấp nhất</div>
      </div>
      <div class="stat-item">
        <div class="value">${data.summary.maxCpk?.toFixed(3) || "N/A"}</div>
        <div class="label">CPK Cao nhất</div>
      </div>
      <div class="stat-item">
        <div class="value">${data.summary.maxCpk && data.summary.minCpk ? (data.summary.maxCpk - data.summary.minCpk).toFixed(3) : "N/A"}</div>
        <div class="label">Biên độ CPK</div>
      </div>
    </div>
  </div>
  
  <!-- Distribution Section -->
  <div class="section distribution-section">
    <h2>Phân bố theo trạng thái CPK</h2>
    <div class="distribution-grid">
      <div class="dist-item status-excellent">
        <div class="count">${data.summary.excellentCount}</div>
        <div class="label">Xuất sắc (≥1.67)</div>
      </div>
      <div class="dist-item status-good">
        <div class="count">${data.summary.goodCount}</div>
        <div class="label">Tốt (≥1.33)</div>
      </div>
      <div class="dist-item status-acceptable">
        <div class="count">${data.summary.acceptableCount}</div>
        <div class="label">Chấp nhận (≥1.0)</div>
      </div>
      <div class="dist-item status-needs_improvement">
        <div class="count">${data.summary.needsImprovementCount}</div>
        <div class="label">Cần cải thiện (≥0.67)</div>
      </div>
      <div class="dist-item status-critical">
        <div class="count">${data.summary.criticalCount}</div>
        <div class="label">Nguy hiểm (<0.67)</div>
      </div>
    </div>
  </div>
  
  ${data.shiftComparison ? `
  <!-- Shift Comparison -->
  <div class="section shift-section">
    <h2>So sánh theo ca làm việc</h2>
    <div class="shift-grid">
      <div class="shift-card" style="background: #fef3c7;">
        <div class="name">☀️ Ca sáng (6h-14h)</div>
        <div class="cpk" style="color: ${getCpkStatusColor(getCpkStatus(data.shiftComparison.morning.avgCpk)).text}">
          ${data.shiftComparison.morning.avgCpk?.toFixed(3) || "N/A"}
        </div>
        <div class="count">${data.shiftComparison.morning.count} chu kỳ</div>
      </div>
      <div class="shift-card" style="background: #ffedd5;">
        <div class="name">🌤️ Ca chiều (14h-22h)</div>
        <div class="cpk" style="color: ${getCpkStatusColor(getCpkStatus(data.shiftComparison.afternoon.avgCpk)).text}">
          ${data.shiftComparison.afternoon.avgCpk?.toFixed(3) || "N/A"}
        </div>
        <div class="count">${data.shiftComparison.afternoon.count} chu kỳ</div>
      </div>
      <div class="shift-card" style="background: #e0e7ff;">
        <div class="name">🌙 Ca đêm (22h-6h)</div>
        <div class="cpk" style="color: ${getCpkStatusColor(getCpkStatus(data.shiftComparison.night.avgCpk)).text}">
          ${data.shiftComparison.night.avgCpk?.toFixed(3) || "N/A"}
        </div>
        <div class="count">${data.shiftComparison.night.count} chu kỳ</div>
      </div>
    </div>
  </div>
  ` : ""}
  
  <!-- Detail Table -->
  <div class="section">
    <h2>Chi tiết theo ${getPeriodTypeLabel(data.periodType).toLowerCase()}</h2>
    <table>
      <thead>
        <tr>
          <th>Thời gian</th>
          ${data.periodType === "shift" ? "<th>Ca</th>" : ""}
          <th>CPK</th>
          <th>CP</th>
          <th>PPK</th>
          <th>Mean</th>
          <th>StdDev</th>
          <th>Số mẫu</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${data.periodData.map((row) => `
        <tr>
          <td>${row.periodStart.toLocaleDateString("vi-VN")} ${row.periodStart.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</td>
          ${data.periodType === "shift" ? `<td>${row.shiftName || "N/A"}</td>` : ""}
          <td><strong>${row.cpk?.toFixed(3) || "N/A"}</strong></td>
          <td>${row.cp?.toFixed(3) || "N/A"}</td>
          <td>${row.ppk?.toFixed(3) || "N/A"}</td>
          <td>${row.mean?.toFixed(3) || "N/A"}</td>
          <td>${row.stdDev?.toFixed(4) || "N/A"}</td>
          <td>${row.sampleCount.toLocaleString()}</td>
          <td><span class="status-badge status-${row.status}">${getCpkStatusLabel(row.status)}</span></td>
        </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
  
  <!-- Footer -->
  <div class="footer">
    <div>Báo cáo được tạo tự động bởi Hệ thống Tính toán CPK/SPC</div>
    <div>Trang 1/1</div>
  </div>
</body>
</html>`;
}

/**
 * Generate CSV Export for SPC Summary
 */
export async function generateSpcSummaryCsv(
  planId: number,
  periodType: PeriodType,
  startDate: Date,
  endDate: Date
): Promise<string> {
  const data = await getSpcSummaryReportData(planId, periodType, startDate, endDate);

  const headers = [
    "Thời gian bắt đầu",
    "Thời gian kết thúc",
    ...(periodType === "shift" ? ["Ca"] : []),
    "CPK",
    "CP",
    "PPK",
    "Mean",
    "StdDev",
    "Số mẫu",
    "Trạng thái",
  ];

  const rows = data.periodData.map((row) => [
    row.periodStart.toISOString(),
    row.periodEnd.toISOString(),
    ...(periodType === "shift" ? [row.shiftName || ""] : []),
    row.cpk?.toString() || "",
    row.cp?.toString() || "",
    row.ppk?.toString() || "",
    row.mean?.toString() || "",
    row.stdDev?.toString() || "",
    row.sampleCount.toString(),
    getCpkStatusLabel(row.status),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  return csvContent;
}
