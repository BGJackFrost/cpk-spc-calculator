/**
 * KPI Report Email Template
 * Template email báo cáo KPI với biểu đồ và thống kê chi tiết
 */

import { generateTrendChartSvg, generateBarChartSvg, generateGaugeChartSvg, svgToBase64, TrendDataPoint } from "./chartImageService";

export interface KPIReportData {
  reportName: string;
  reportType: "shift_summary" | "kpi_comparison" | "trend_analysis" | "full_report";
  frequency: "daily" | "weekly" | "monthly";
  dateRange: {
    start: Date;
    end: Date;
  };
  productionLines: Array<{
    id: number;
    name: string;
    avgCpk: number | null;
    avgOee: number | null;
    defectRate: number | null;
    totalSamples: number;
    cpkTrend: "up" | "down" | "stable";
    oeeTrend: "up" | "down" | "stable";
  }>;
  shiftData?: Array<{
    shift: string;
    avgCpk: number | null;
    avgOee: number | null;
    defectRate: number | null;
  }>;
  weeklyTrend?: Array<{
    week: number;
    year: number;
    avgCpk: number | null;
    avgOee: number | null;
  }>;
  alerts: Array<{
    type: "cpk_warning" | "cpk_critical" | "oee_warning" | "oee_critical" | "decline";
    message: string;
    productionLine?: string;
    value?: number;
    threshold?: number;
  }>;
  recommendations: string[];
}

/**
 * Tạo HTML email báo cáo KPI
 */
export function generateKPIReportEmail(data: KPIReportData): { html: string; text: string } {
  const dateRangeStr = `${formatDate(data.dateRange.start)} - ${formatDate(data.dateRange.end)}`;
  const frequencyLabel = {
    daily: "Hàng ngày",
    weekly: "Hàng tuần",
    monthly: "Hàng tháng",
  }[data.frequency];

  const reportTypeLabel = {
    shift_summary: "Tổng hợp theo ca",
    kpi_comparison: "So sánh KPI",
    trend_analysis: "Phân tích xu hướng",
    full_report: "Báo cáo đầy đủ",
  }[data.reportType];

  // Tính toán tổng hợp
  const totalLines = data.productionLines.length;
  const avgCpkOverall = calculateAverage(data.productionLines.map(l => l.avgCpk));
  const avgOeeOverall = calculateAverage(data.productionLines.map(l => l.avgOee));
  const totalSamples = data.productionLines.reduce((sum, l) => sum + l.totalSamples, 0);
  const linesWithAlerts = data.alerts.length;

  const textContent = `
BÁO CÁO KPI - ${data.reportName}
=====================================
Loại báo cáo: ${reportTypeLabel}
Tần suất: ${frequencyLabel}
Khoảng thời gian: ${dateRangeStr}

TỔNG QUAN
---------
Số dây chuyền: ${totalLines}
CPK trung bình: ${avgCpkOverall?.toFixed(3) || "N/A"}
OEE trung bình: ${avgOeeOverall?.toFixed(1) || "N/A"}%
Tổng số mẫu: ${totalSamples.toLocaleString()}
Số cảnh báo: ${linesWithAlerts}

CHI TIẾT THEO DÂY CHUYỀN
------------------------
${data.productionLines.map(line => `
${line.name}:
  - CPK: ${line.avgCpk?.toFixed(3) || "N/A"} (${getTrendIcon(line.cpkTrend)})
  - OEE: ${line.avgOee?.toFixed(1) || "N/A"}% (${getTrendIcon(line.oeeTrend)})
  - Tỷ lệ lỗi: ${line.defectRate?.toFixed(2) || "N/A"}%
  - Số mẫu: ${line.totalSamples.toLocaleString()}
`).join("")}

${data.shiftData ? `
THỐNG KÊ THEO CA
----------------
${data.shiftData.map(shift => `
Ca ${shift.shift}:
  - CPK: ${shift.avgCpk?.toFixed(3) || "N/A"}
  - OEE: ${shift.avgOee?.toFixed(1) || "N/A"}%
  - Tỷ lệ lỗi: ${shift.defectRate?.toFixed(2) || "N/A"}%
`).join("")}
` : ""}

${data.alerts.length > 0 ? `
CẢNH BÁO
--------
${data.alerts.map(alert => `⚠️ ${alert.message}`).join("\n")}
` : ""}

${data.recommendations.length > 0 ? `
KHUYẾN NGHỊ
-----------
${data.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join("\n")}
` : ""}

---
Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 40px 30px; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; font-weight: 600; }
    .header .subtitle { margin: 0; opacity: 0.9; font-size: 16px; }
    .header .meta { margin-top: 15px; display: flex; gap: 20px; flex-wrap: wrap; }
    .header .meta-item { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 14px; }
    
    .content { padding: 30px; }
    
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .summary-card { background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; }
    .summary-card .value { font-size: 32px; font-weight: 700; color: #1e40af; margin-bottom: 5px; }
    .summary-card .label { font-size: 14px; color: #64748b; }
    .summary-card.warning .value { color: #d97706; }
    .summary-card.danger .value { color: #dc2626; }
    .summary-card.success .value { color: #059669; }
    
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
    
    .table { width: 100%; border-collapse: collapse; }
    .table th { background: #f1f5f9; padding: 12px 15px; text-align: left; font-weight: 600; color: #475569; font-size: 13px; }
    .table td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .table tr:hover td { background: #f8fafc; }
    
    .trend-up { color: #059669; }
    .trend-down { color: #dc2626; }
    .trend-stable { color: #6b7280; }
    
    .kpi-value { font-weight: 600; }
    .kpi-value.good { color: #059669; }
    .kpi-value.warning { color: #d97706; }
    .kpi-value.critical { color: #dc2626; }
    
    .alert-list { list-style: none; padding: 0; margin: 0; }
    .alert-item { display: flex; align-items: flex-start; gap: 12px; padding: 15px; background: #fef2f2; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #ef4444; }
    .alert-item.warning { background: #fffbeb; border-left-color: #f59e0b; }
    .alert-icon { font-size: 20px; }
    .alert-content { flex: 1; }
    .alert-message { font-weight: 500; color: #1e293b; }
    .alert-detail { font-size: 13px; color: #64748b; margin-top: 4px; }
    
    .recommendation-list { list-style: none; padding: 0; margin: 0; }
    .recommendation-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 15px; background: #f0fdf4; border-radius: 8px; margin-bottom: 8px; }
    .recommendation-number { width: 24px; height: 24px; background: #059669; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
    .recommendation-text { color: #1e293b; font-size: 14px; }
    
    .shift-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .shift-card { background: #f8fafc; border-radius: 10px; padding: 20px; }
    .shift-card h4 { margin: 0 0 15px 0; color: #1e293b; font-size: 16px; }
    .shift-metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .shift-metric:last-child { border-bottom: none; }
    .shift-metric .label { color: #64748b; font-size: 13px; }
    .shift-metric .value { font-weight: 600; color: #1e293b; }
    
    .chart-placeholder { background: #f1f5f9; border-radius: 12px; padding: 40px; text-align: center; color: #64748b; }
    .chart-placeholder svg { width: 60px; height: 60px; margin-bottom: 10px; opacity: 0.5; }
    
    .footer { text-align: center; padding: 25px; background: #f8fafc; color: #64748b; font-size: 13px; }
    .footer a { color: #3b82f6; text-decoration: none; }
    
    @media (max-width: 600px) {
      .header .meta { flex-direction: column; gap: 10px; }
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${data.reportName}</h1>
      <p class="subtitle">${reportTypeLabel}</p>
      <div class="meta">
        <span class="meta-item">📅 ${dateRangeStr}</span>
        <span class="meta-item">🔄 ${frequencyLabel}</span>
        <span class="meta-item">🏭 ${totalLines} dây chuyền</span>
      </div>
    </div>
    
    <div class="content">
      <!-- Summary Cards -->
      <div class="summary-grid">
        <div class="summary-card ${getKPIClass(avgCpkOverall, 1.33, 1.0)}">
          <div class="value">${avgCpkOverall?.toFixed(2) || "N/A"}</div>
          <div class="label">CPK Trung bình</div>
        </div>
        <div class="summary-card ${getOEEClass(avgOeeOverall, 75, 60)}">
          <div class="value">${avgOeeOverall?.toFixed(0) || "N/A"}%</div>
          <div class="label">OEE Trung bình</div>
        </div>
        <div class="summary-card">
          <div class="value">${totalSamples.toLocaleString()}</div>
          <div class="label">Tổng số mẫu</div>
        </div>
        <div class="summary-card ${linesWithAlerts > 0 ? 'warning' : 'success'}">
          <div class="value">${linesWithAlerts}</div>
          <div class="label">Cảnh báo</div>
        </div>
      </div>
      
      <!-- Production Lines Table -->
      <div class="section">
        <h3 class="section-title">📈 Chi tiết theo dây chuyền</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Dây chuyền</th>
              <th>CPK</th>
              <th>OEE</th>
              <th>Tỷ lệ lỗi</th>
              <th>Số mẫu</th>
            </tr>
          </thead>
          <tbody>
            ${data.productionLines.map(line => `
            <tr>
              <td><strong>${line.name}</strong></td>
              <td>
                <span class="kpi-value ${getKPIClass(line.avgCpk, 1.33, 1.0)}">${line.avgCpk?.toFixed(3) || "N/A"}</span>
                <span class="${getTrendClass(line.cpkTrend)}">${getTrendArrow(line.cpkTrend)}</span>
              </td>
              <td>
                <span class="kpi-value ${getOEEClass(line.avgOee, 75, 60)}">${line.avgOee?.toFixed(1) || "N/A"}%</span>
                <span class="${getTrendClass(line.oeeTrend)}">${getTrendArrow(line.oeeTrend)}</span>
              </td>
              <td>${line.defectRate?.toFixed(2) || "N/A"}%</td>
              <td>${line.totalSamples.toLocaleString()}</td>
            </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      
      <!-- Inline Charts Section -->
      <div class="section">
        <h3 class="section-title">📈 Biểu đồ xu hướng KPI</h3>
        <div style="text-align: center; margin-bottom: 20px;">
          ${generateInlineCharts(data)}
        </div>
      </div>
      
      ${data.shiftData && data.shiftData.length > 0 ? `
      <!-- Shift Data -->
      <div class="section">
        <h3 class="section-title">🕐 Thống kê theo ca</h3>
        <div class="shift-grid">
          ${data.shiftData.map(shift => `
          <div class="shift-card">
            <h4>Ca ${shift.shift}</h4>
            <div class="shift-metric">
              <span class="label">CPK</span>
              <span class="value ${getKPIClass(shift.avgCpk, 1.33, 1.0)}">${shift.avgCpk?.toFixed(3) || "N/A"}</span>
            </div>
            <div class="shift-metric">
              <span class="label">OEE</span>
              <span class="value ${getOEEClass(shift.avgOee, 75, 60)}">${shift.avgOee?.toFixed(1) || "N/A"}%</span>
            </div>
            <div class="shift-metric">
              <span class="label">Tỷ lệ lỗi</span>
              <span class="value">${shift.defectRate?.toFixed(2) || "N/A"}%</span>
            </div>
          </div>
          `).join("")}
        </div>
      </div>
      ` : ""}
      
      ${data.alerts.length > 0 ? `
      <!-- Alerts -->
      <div class="section">
        <h3 class="section-title">⚠️ Cảnh báo</h3>
        <ul class="alert-list">
          ${data.alerts.map(alert => `
          <li class="alert-item ${alert.type.includes('warning') ? 'warning' : ''}">
            <span class="alert-icon">${getAlertIcon(alert.type)}</span>
            <div class="alert-content">
              <div class="alert-message">${alert.message}</div>
              ${alert.productionLine ? `<div class="alert-detail">Dây chuyền: ${alert.productionLine}</div>` : ""}
              ${alert.value !== undefined ? `<div class="alert-detail">Giá trị: ${alert.value.toFixed(2)} | Ngưỡng: ${alert.threshold?.toFixed(2) || "N/A"}</div>` : ""}
            </div>
          </li>
          `).join("")}
        </ul>
      </div>
      ` : ""}
      
      ${data.recommendations.length > 0 ? `
      <!-- Recommendations -->
      <div class="section">
        <h3 class="section-title">💡 Khuyến nghị</h3>
        <ul class="recommendation-list">
          ${data.recommendations.map((rec, i) => `
          <li class="recommendation-item">
            <span class="recommendation-number">${i + 1}</span>
            <span class="recommendation-text">${rec}</span>
          </li>
          `).join("")}
        </ul>
      </div>
      ` : ""}
    </div>

    <div class="footer">
      <p>Báo cáo được tạo tự động bởi <strong>Hệ thống SPC/CPK Calculator</strong></p>
      <p>Thời gian tạo: ${new Date().toLocaleString("vi-VN")}</p>
    </div>
  </div>
</body>
</html>
  `;

  return { html: htmlContent, text: textContent };
}

// Helper functions
function formatDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function calculateAverage(values: (number | null)[]): number | null {
  const validValues = values.filter((v): v is number => v !== null);
  if (validValues.length === 0) return null;
  return validValues.reduce((sum, v) => sum + v, 0) / validValues.length;
}

function getTrendIcon(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up": return "↑";
    case "down": return "↓";
    case "stable": return "→";
  }
}

function getTrendArrow(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up": return "↑";
    case "down": return "↓";
    case "stable": return "→";
  }
}

function getTrendClass(trend: "up" | "down" | "stable"): string {
  switch (trend) {
    case "up": return "trend-up";
    case "down": return "trend-down";
    case "stable": return "trend-stable";
  }
}

function getKPIClass(value: number | null, warning: number, critical: number): string {
  if (value === null) return "";
  if (value < critical) return "critical";
  if (value < warning) return "warning";
  return "good";
}

function getOEEClass(value: number | null, warning: number, critical: number): string {
  if (value === null) return "";
  if (value < critical) return "critical";
  if (value < warning) return "warning";
  return "good";
}

function getAlertIcon(type: string): string {
  if (type.includes("critical")) return "🔴";
  if (type.includes("warning")) return "🟡";
  if (type.includes("decline")) return "📉";
  return "⚠️";
}

/**
 * Tạo biểu đồ inline cho email
 */
function generateInlineCharts(data: KPIReportData): string {
  const charts: string[] = [];
  
  // Generate trend chart if weekly trend data exists
  if (data.weeklyTrend && data.weeklyTrend.length > 0) {
    const trendData: TrendDataPoint[] = data.weeklyTrend.map(w => ({
      label: `W${w.week}`,
      cpk: w.avgCpk,
      oee: w.avgOee,
    }));
    
    const trendSvg = generateTrendChartSvg(trendData, {
      width: 600,
      height: 250,
      title: "Xu hướng CPK/OEE theo tuần",
    });
    const trendBase64 = svgToBase64(trendSvg);
    charts.push(`<img src="${trendBase64}" alt="Biểu đồ xu hướng" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`);
  } else if (data.productionLines.length > 0) {
    // Generate comparison bar chart from production lines
    const barData = {
      labels: data.productionLines.map(l => l.name),
      datasets: [
        {
          label: "CPK",
          data: data.productionLines.map(l => l.avgCpk || 0),
          color: "#3b82f6",
        },
        {
          label: "OEE/50",
          data: data.productionLines.map(l => (l.avgOee || 0) / 50),
          color: "#10b981",
        },
      ],
    };
    
    const barSvg = generateBarChartSvg(barData, {
      width: 600,
      height: 250,
      title: "So sánh KPI theo dây chuyền",
    });
    const barBase64 = svgToBase64(barSvg);
    charts.push(`<img src="${barBase64}" alt="Biểu đồ so sánh" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />`);
  }
  
  // Generate gauge charts for overall KPI
  const avgCpk = calculateAverage(data.productionLines.map(l => l.avgCpk));
  const avgOee = calculateAverage(data.productionLines.map(l => l.avgOee));
  
  const gaugeContainer: string[] = [];
  
  if (avgCpk !== null) {
    const cpkGaugeSvg = generateGaugeChartSvg(avgCpk, {
      width: 180,
      height: 130,
      title: "CPK Tổng hợp",
      min: 0,
      max: 2,
      warningThreshold: 1.33,
      criticalThreshold: 1.0,
    });
    const cpkGaugeBase64 = svgToBase64(cpkGaugeSvg);
    gaugeContainer.push(`<img src="${cpkGaugeBase64}" alt="CPK Gauge" style="display: inline-block; margin: 0 10px;" />`);
  }
  
  if (avgOee !== null) {
    const oeeGaugeSvg = generateGaugeChartSvg(avgOee, {
      width: 180,
      height: 130,
      title: "OEE Tổng hợp",
      min: 0,
      max: 100,
      warningThreshold: 75,
      criticalThreshold: 60,
      unit: "%",
    });
    const oeeGaugeBase64 = svgToBase64(oeeGaugeSvg);
    gaugeContainer.push(`<img src="${oeeGaugeBase64}" alt="OEE Gauge" style="display: inline-block; margin: 0 10px;" />`);
  }
  
  if (gaugeContainer.length > 0) {
    charts.push(`<div style="margin-top: 20px; text-align: center;">${gaugeContainer.join("")}</div>`);
  }
  
  return charts.length > 0 ? charts.join("") : `
    <div style="background: #f1f5f9; border-radius: 12px; padding: 40px; text-align: center; color: #64748b;">
      <p>📊 Biểu đồ sẽ được hiển thị khi có dữ liệu xu hướng</p>
    </div>
  `;
}

/**
 * Tạo dữ liệu báo cáo mẫu để test
 */
export function generateSampleReportData(): KPIReportData {
  return {
    reportName: "Báo cáo KPI Tuần 52/2024",
    reportType: "shift_summary",
    frequency: "weekly",
    dateRange: {
      start: new Date("2024-12-23"),
      end: new Date("2024-12-29"),
    },
    productionLines: [
      { id: 1, name: "LINE 01", avgCpk: 1.45, avgOee: 82.5, defectRate: 1.2, totalSamples: 1500, cpkTrend: "up", oeeTrend: "stable" },
      { id: 2, name: "LINE 02", avgCpk: 1.28, avgOee: 78.3, defectRate: 2.1, totalSamples: 1200, cpkTrend: "down", oeeTrend: "down" },
      { id: 3, name: "LINE 03", avgCpk: 1.52, avgOee: 85.7, defectRate: 0.8, totalSamples: 1800, cpkTrend: "up", oeeTrend: "up" },
    ],
    shiftData: [
      { shift: "Sáng (6h-14h)", avgCpk: 1.42, avgOee: 83.2, defectRate: 1.3 },
      { shift: "Chiều (14h-22h)", avgCpk: 1.38, avgOee: 80.5, defectRate: 1.5 },
      { shift: "Đêm (22h-6h)", avgCpk: 1.35, avgOee: 78.8, defectRate: 1.8 },
    ],
    alerts: [
      { type: "cpk_warning", message: "CPK LINE 02 dưới ngưỡng warning (1.33)", productionLine: "LINE 02", value: 1.28, threshold: 1.33 },
      { type: "decline", message: "OEE LINE 02 giảm 5.2% so với tuần trước", productionLine: "LINE 02" },
    ],
    recommendations: [
      "Kiểm tra và bảo trì máy móc trên LINE 02 để cải thiện CPK",
      "Tăng cường giám sát ca đêm do hiệu suất thấp hơn các ca khác",
      "Xem xét điều chỉnh quy trình sản xuất để giảm tỷ lệ lỗi",
    ],
  };
}
