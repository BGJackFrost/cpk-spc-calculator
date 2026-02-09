/**
 * Trend Export Service - Xuất báo cáo Trend ra PDF/Excel
 */
import ExcelJS from "exceljs";

export interface TrendDataPoint {
  timestamp: number;
  date: string;
  yieldRate: number;
  defectRate: number;
  totalInspected: number;
  totalPassed: number;
  totalDefects: number;
}

export interface TrendExportOptions {
  title: string;
  timeRange: string;
  aggregation: string;
  yieldWarningThreshold: number;
  yieldCriticalThreshold: number;
  defectWarningThreshold: number;
  defectCriticalThreshold: number;
}

function computeStats(data: TrendDataPoint[]) {
  if (data.length === 0) return { avgYield: 0, avgDefect: 0, minYield: 0, maxYield: 0, minDefect: 0, maxDefect: 0, totalInspected: 0 };
  const yields = data.map(d => d.yieldRate);
  const defects = data.map(d => d.defectRate);
  return {
    avgYield: yields.reduce((a, b) => a + b, 0) / yields.length,
    avgDefect: defects.reduce((a, b) => a + b, 0) / defects.length,
    minYield: Math.min(...yields),
    maxYield: Math.max(...yields),
    minDefect: Math.min(...defects),
    maxDefect: Math.max(...defects),
    totalInspected: data.reduce((a, b) => a + b.totalInspected, 0),
  };
}

function getSeverityClass(value: number, warning: number, critical: number, isYield: boolean): string {
  if (isYield) {
    if (value < critical) return "critical";
    if (value < warning) return "warning";
    return "normal";
  } else {
    if (value > critical) return "critical";
    if (value > warning) return "warning";
    return "normal";
  }
}

export function generateTrendPdfHtml(data: TrendDataPoint[], options: TrendExportOptions): string {
  const stats = computeStats(data);
  const now = new Date().toLocaleString("vi-VN");

  if (data.length === 0) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${options.title}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{color:#1a56db}
    .empty{text-align:center;padding:60px;color:#666;font-size:18px}</style></head>
    <body><h1>${options.title}</h1><p>Ngày xuất: ${now}</p>
    <div class="empty">Không có dữ liệu trong khoảng thời gian đã chọn</div></body></html>`;
  }

  const rows = data.map(d => {
    const yieldClass = getSeverityClass(d.yieldRate, options.yieldWarningThreshold, options.yieldCriticalThreshold, true);
    const defectClass = getSeverityClass(d.defectRate, options.defectWarningThreshold, options.defectCriticalThreshold, false);
    return `<tr>
      <td>${d.date}</td>
      <td class="${yieldClass}">${d.yieldRate.toFixed(2)}%</td>
      <td class="${defectClass}">${d.defectRate.toFixed(2)}%</td>
      <td>${d.totalInspected.toLocaleString()}</td>
      <td>${d.totalPassed.toLocaleString()}</td>
      <td>${d.totalDefects.toLocaleString()}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${options.title}</title>
<style>
body{font-family:Arial,sans-serif;padding:30px;color:#333;font-size:12px}
h1{color:#1a56db;font-size:20px;margin-bottom:5px}
h2{color:#374151;font-size:16px;margin-top:20px}
.meta{color:#666;margin-bottom:20px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.stat-card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
.stat-value{font-size:18px;font-weight:bold;margin:4px 0}
.stat-label{font-size:11px;color:#666}
.yield-color{color:#16a34a}.defect-color{color:#dc2626}.blue-color{color:#2563eb}
table{width:100%;border-collapse:collapse;margin-top:10px}
th{background:#1e40af;color:white;padding:8px;text-align:left;font-size:11px}
td{padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:11px}
tr:nth-child(even){background:#f9fafb}
.critical{color:#dc2626;font-weight:bold}
.warning{color:#d97706;font-weight:bold}
.normal{color:#16a34a}
.threshold-info{background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:10px;margin:15px 0;font-size:11px}
.footer{margin-top:20px;text-align:center;color:#999;font-size:10px;border-top:1px solid #e5e7eb;padding-top:10px}
</style></head><body>
<h1>${options.title}</h1>
<div class="meta">Ngày xuất: ${now} | Khoảng thời gian: ${options.timeRange} | Tổng hợp: ${options.aggregation}</div>

<div class="stats-grid">
  <div class="stat-card"><div class="stat-label">Yield TB</div><div class="stat-value yield-color">${stats.avgYield.toFixed(2)}%</div><div class="stat-label">Min: ${stats.minYield.toFixed(1)}% | Max: ${stats.maxYield.toFixed(1)}%</div></div>
  <div class="stat-card"><div class="stat-label">Defect TB</div><div class="stat-value defect-color">${stats.avgDefect.toFixed(2)}%</div><div class="stat-label">Min: ${stats.minDefect.toFixed(1)}% | Max: ${stats.maxDefect.toFixed(1)}%</div></div>
  <div class="stat-card"><div class="stat-label">Tổng kiểm tra</div><div class="stat-value blue-color">${stats.totalInspected.toLocaleString()}</div><div class="stat-label">${data.length} điểm dữ liệu</div></div>
  <div class="stat-card"><div class="stat-label">Số ngày</div><div class="stat-value blue-color">${data.length}</div><div class="stat-label">Khoảng thời gian</div></div>
</div>

<div class="threshold-info">
  <strong>Ngưỡng cảnh báo:</strong> Yield Warning: ${options.yieldWarningThreshold}% | Yield Critical: ${options.yieldCriticalThreshold}% | Defect Warning: ${options.defectWarningThreshold}% | Defect Critical: ${options.defectCriticalThreshold}%
</div>

<h2>Chi tiết dữ liệu</h2>
<table>
  <thead><tr><th>Ngày</th><th>Yield Rate</th><th>Defect Rate</th><th>Tổng KT</th><th>Đạt</th><th>Lỗi</th></tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="footer">Báo cáo được tạo tự động bởi Hệ thống CPK/SPC Calculator</div>
</body></html>`;
}

export async function generateTrendExcel(data: TrendDataPoint[], options: TrendExportOptions): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CPK/SPC Calculator";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Tổng quan");
  const stats = computeStats(data);

  summarySheet.columns = [
    { header: "Thông tin", key: "label", width: 25 },
    { header: "Giá trị", key: "value", width: 20 },
  ];
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summarySheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };

  const summaryData = [
    { label: "Báo cáo", value: options.title },
    { label: "Ngày xuất", value: new Date().toLocaleString("vi-VN") },
    { label: "Khoảng thời gian", value: options.timeRange },
    { label: "Tổng hợp", value: options.aggregation },
    { label: "", value: "" },
    { label: "Yield TB", value: `${stats.avgYield.toFixed(2)}%` },
    { label: "Yield Min", value: `${stats.minYield.toFixed(1)}%` },
    { label: "Yield Max", value: `${stats.maxYield.toFixed(1)}%` },
    { label: "Defect TB", value: `${stats.avgDefect.toFixed(2)}%` },
    { label: "Defect Min", value: `${stats.minDefect.toFixed(1)}%` },
    { label: "Defect Max", value: `${stats.maxDefect.toFixed(1)}%` },
    { label: "Tổng kiểm tra", value: stats.totalInspected.toLocaleString() },
    { label: "Số điểm dữ liệu", value: data.length.toString() },
  ];
  summaryData.forEach(row => summarySheet.addRow(row));

  const detailSheet = workbook.addWorksheet("Chi tiết");
  detailSheet.columns = [
    { header: "Ngày", key: "date", width: 15 },
    { header: "Yield Rate (%)", key: "yieldRate", width: 15 },
    { header: "Defect Rate (%)", key: "defectRate", width: 15 },
    { header: "Tổng kiểm tra", key: "totalInspected", width: 15 },
    { header: "Đạt", key: "totalPassed", width: 12 },
    { header: "Lỗi", key: "totalDefects", width: 12 },
  ];
  detailSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  detailSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };

  data.forEach(d => {
    const row = detailSheet.addRow({
      date: d.date, yieldRate: d.yieldRate, defectRate: d.defectRate,
      totalInspected: d.totalInspected, totalPassed: d.totalPassed, totalDefects: d.totalDefects,
    });
    const yieldCell = row.getCell("yieldRate");
    const defectCell = row.getCell("defectRate");
    if (d.yieldRate < options.yieldCriticalThreshold) yieldCell.font = { bold: true, color: { argb: "FFDC2626" } };
    else if (d.yieldRate < options.yieldWarningThreshold) yieldCell.font = { bold: true, color: { argb: "FFD97706" } };
    if (d.defectRate > options.defectCriticalThreshold) defectCell.font = { bold: true, color: { argb: "FFDC2626" } };
    else if (d.defectRate > options.defectWarningThreshold) defectCell.font = { bold: true, color: { argb: "FFD97706" } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
