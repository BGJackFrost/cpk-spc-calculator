/**
 * Fixture Report Service
 * Generates comparison reports for Fixtures in PDF/Excel format
 */

import ExcelJS from "exceljs";
import { getDb } from "../db";
import { fixtures, machines, spcAnalysisHistory, spcSummaryStats } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";

export interface FixtureComparisonData {
  mappingId: number;
  fixtureName: string;
  machineName: string;
  avgCpk: number | null;
  avgCp: number | null;
  avgPpk: number | null;
  minCpk: number | null;
  maxCpk: number | null;
  sampleCount: number;
  oocCount: number;
  oocRate: number;
  status: string;
}

export interface FixtureReportData {
  title: string;
  generatedAt: Date;
  dateRange: { start: Date; end: Date };
  fixtures: FixtureComparisonData[];
  summary: {
    totalFixtures: number;
    avgCpk: number | null;
    bestFixture: string | null;
    worstFixture: string | null;
    totalSamples: number;
    avgOocRate: number;
  };
}

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

/**
 * Get Fixture Comparison Data
 */
export async function getFixtureComparisonData(
  mappingIds: number[],
  startDate: Date,
  endDate: Date
): Promise<FixtureReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get fixture info with machine names
  const fixtureList = await db
    .select({
      id: fixtures.id,
      name: fixtures.name,
      machineId: fixtures.machineId,
    })
    .from(fixtures)
    .where(inArray(fixtures.id, mappingIds));

  // Get machine names
  const machineIds = [...new Set(fixtureList.map((f) => f.machineId).filter(Boolean))];
  const machineList = machineIds.length > 0
    ? await db
        .select({ id: machines.id, name: machines.name })
        .from(machines)
        .where(inArray(machines.id, machineIds as number[]))
    : [];
  
  const machineMap = new Map(machineList.map((m) => [m.id, m.name]));

  // Get analysis data for each fixture
  const fixtureData: FixtureComparisonData[] = [];

  for (const fixture of fixtureList) {
    // Get analysis history for this fixture
    const analysisData = await db
      .select()
      .from(spcAnalysisHistory)
      .where(
        and(
          eq(spcAnalysisHistory.mappingId, fixture.id),
          gte(spcAnalysisHistory.createdAt, startDate),
          lte(spcAnalysisHistory.createdAt, endDate)
        )
      );

    if (analysisData.length === 0) {
      fixtureData.push({
        mappingId: fixture.id,
        fixtureName: fixture.name,
        machineName: fixture.machineId ? machineMap.get(fixture.machineId) || "N/A" : "N/A",
        avgCpk: null,
        avgCp: null,
        avgPpk: null,
        minCpk: null,
        maxCpk: null,
        sampleCount: 0,
        oocCount: 0,
        oocRate: 0,
        status: "N/A",
      });
      continue;
    }

    // Calculate statistics
    const cpkValues = analysisData
      .map((d) => d.cpk)
      .filter((v): v is number => v !== null);
    const cpValues = analysisData
      .map((d) => d.cp)
      .filter((v): v is number => v !== null);
    const ppkValues = analysisData
      .map((d) => d.ppk)
      .filter((v): v is number => v !== null);

    const avgCpk = cpkValues.length > 0
      ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length
      : null;
    const avgCp = cpValues.length > 0
      ? cpValues.reduce((a, b) => a + b, 0) / cpValues.length
      : null;
    const avgPpk = ppkValues.length > 0
      ? ppkValues.reduce((a, b) => a + b, 0) / ppkValues.length
      : null;
    const minCpk = cpkValues.length > 0 ? Math.min(...cpkValues) : null;
    const maxCpk = cpkValues.length > 0 ? Math.max(...cpkValues) : null;

    const sampleCount = analysisData.reduce((sum, d) => sum + (d.sampleCount || 0), 0);
    const oocCount = analysisData.reduce((sum, d) => sum + (d.outOfControlCount || 0), 0);
    const oocRate = sampleCount > 0 ? (oocCount / sampleCount) * 100 : 0;

    fixtureData.push({
      mappingId: fixture.id,
      fixtureName: fixture.name,
      machineName: fixture.machineId ? machineMap.get(fixture.machineId) || "N/A" : "N/A",
      avgCpk,
      avgCp,
      avgPpk,
      minCpk,
      maxCpk,
      sampleCount,
      oocCount,
      oocRate,
      status: getCpkStatus(avgCpk),
    });
  }

  // Sort by CPK descending
  fixtureData.sort((a, b) => {
    if (a.avgCpk === null) return 1;
    if (b.avgCpk === null) return -1;
    return b.avgCpk - a.avgCpk;
  });

  // Calculate summary
  const validCpks = fixtureData
    .map((f) => f.avgCpk)
    .filter((v): v is number => v !== null);
  const avgCpk = validCpks.length > 0
    ? validCpks.reduce((a, b) => a + b, 0) / validCpks.length
    : null;
  const totalSamples = fixtureData.reduce((sum, f) => sum + f.sampleCount, 0);
  const avgOocRate = fixtureData.length > 0
    ? fixtureData.reduce((sum, f) => sum + f.oocRate, 0) / fixtureData.length
    : 0;

  const bestFixture = fixtureData.find((f) => f.avgCpk !== null)?.fixtureName || null;
  const worstFixture = [...fixtureData]
    .reverse()
    .find((f) => f.avgCpk !== null)?.fixtureName || null;

  return {
    title: "Báo cáo So sánh Fixture",
    generatedAt: new Date(),
    dateRange: { start: startDate, end: endDate },
    fixtures: fixtureData,
    summary: {
      totalFixtures: fixtureData.length,
      avgCpk,
      bestFixture,
      worstFixture,
      totalSamples,
      avgOocRate,
    },
  };
}

/**
 * Generate HTML Report for Fixture Comparison
 */
export async function generateFixtureReportHtml(
  mappingIds: number[],
  startDate: Date,
  endDate: Date
): Promise<string> {
  const data = await getFixtureComparisonData(mappingIds, startDate, endDate);

  const formatDate = (d: Date) => d.toLocaleDateString("vi-VN");
  const formatNumber = (n: number | null, decimals = 3) =>
    n !== null ? n.toFixed(decimals) : "N/A";

  const statusColors: Record<string, { bg: string; text: string }> = {
    excellent: { bg: "#d1fae5", text: "#059669" },
    good: { bg: "#dbeafe", text: "#2563eb" },
    acceptable: { bg: "#fef3c7", text: "#d97706" },
    needs_improvement: { bg: "#ffedd5", text: "#ea580c" },
    critical: { bg: "#fee2e2", text: "#dc2626" },
    "N/A": { bg: "#f3f4f6", text: "#6b7280" },
  };

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', 'Roboto', Arial, sans-serif; 
      line-height: 1.5; 
      color: #1f2937; 
      background: white;
      font-size: 10pt;
      padding: 20px;
    }
    
    .header { 
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header p { font-size: 12px; opacity: 0.9; margin-top: 4px; }
    
    .summary-grid { 
      display: grid; 
      grid-template-columns: repeat(6, 1fr); 
      gap: 10px; 
      margin-bottom: 20px; 
    }
    .summary-card { 
      background: #f8fafc; 
      padding: 15px; 
      border-radius: 8px; 
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .summary-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; }
    .summary-card .value { font-size: 20px; font-weight: 700; color: #1e40af; margin-top: 5px; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #475569; }
    tr:hover { background: #f8fafc; }
    
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 600;
    }
    
    .footer { 
      margin-top: 30px; 
      padding-top: 15px; 
      border-top: 1px solid #e2e8f0; 
      text-align: center; 
      color: #64748b; 
      font-size: 10px; 
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.title}</h1>
    <p>Khoảng thời gian: ${formatDate(data.dateRange.start)} - ${formatDate(data.dateRange.end)} | Xuất lúc: ${data.generatedAt.toLocaleString("vi-VN")}</p>
  </div>
  
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Tổng Fixture</div>
      <div class="value">${data.summary.totalFixtures}</div>
    </div>
    <div class="summary-card">
      <div class="label">CPK Trung bình</div>
      <div class="value">${formatNumber(data.summary.avgCpk)}</div>
    </div>
    <div class="summary-card">
      <div class="label">Fixture tốt nhất</div>
      <div class="value" style="font-size: 14px;">${data.summary.bestFixture || "N/A"}</div>
    </div>
    <div class="summary-card">
      <div class="label">Fixture cần cải thiện</div>
      <div class="value" style="font-size: 14px;">${data.summary.worstFixture || "N/A"}</div>
    </div>
    <div class="summary-card">
      <div class="label">Tổng mẫu</div>
      <div class="value">${data.summary.totalSamples.toLocaleString()}</div>
    </div>
    <div class="summary-card">
      <div class="label">Tỷ lệ OOC TB</div>
      <div class="value">${data.summary.avgOocRate.toFixed(2)}%</div>
    </div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Fixture</th>
        <th>Máy</th>
        <th>CPK TB</th>
        <th>CP TB</th>
        <th>PPK TB</th>
        <th>CPK Min</th>
        <th>CPK Max</th>
        <th>Số mẫu</th>
        <th>OOC</th>
        <th>Tỷ lệ OOC</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      ${data.fixtures
        .map(
          (f, i) => `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${f.fixtureName}</strong></td>
          <td>${f.machineName}</td>
          <td>${formatNumber(f.avgCpk)}</td>
          <td>${formatNumber(f.avgCp)}</td>
          <td>${formatNumber(f.avgPpk)}</td>
          <td>${formatNumber(f.minCpk)}</td>
          <td>${formatNumber(f.maxCpk)}</td>
          <td>${f.sampleCount.toLocaleString()}</td>
          <td>${f.oocCount}</td>
          <td>${f.oocRate.toFixed(2)}%</td>
          <td>
            <span class="status-badge" style="background: ${statusColors[f.status].bg}; color: ${statusColors[f.status].text};">
              ${getCpkStatusLabel(f.status)}
            </span>
          </td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK - Foutec Digital</p>
  </div>
</body>
</html>`;
}

/**
 * Generate Excel Report for Fixture Comparison
 */
export async function generateFixtureReportExcel(
  mappingIds: number[],
  startDate: Date,
  endDate: Date
): Promise<Buffer> {
  const data = await getFixtureComparisonData(mappingIds, startDate, endDate);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SPC/CPK System";
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet("Tổng quan");
  summarySheet.columns = [
    { header: "Chỉ số", key: "metric", width: 25 },
    { header: "Giá trị", key: "value", width: 20 },
  ];

  summarySheet.addRows([
    { metric: "Tiêu đề báo cáo", value: data.title },
    { metric: "Ngày xuất", value: data.generatedAt.toLocaleString("vi-VN") },
    { metric: "Từ ngày", value: data.dateRange.start.toLocaleDateString("vi-VN") },
    { metric: "Đến ngày", value: data.dateRange.end.toLocaleDateString("vi-VN") },
    { metric: "", value: "" },
    { metric: "Tổng số Fixture", value: data.summary.totalFixtures },
    { metric: "CPK Trung bình", value: data.summary.avgCpk?.toFixed(3) || "N/A" },
    { metric: "Fixture tốt nhất", value: data.summary.bestFixture || "N/A" },
    { metric: "Fixture cần cải thiện", value: data.summary.worstFixture || "N/A" },
    { metric: "Tổng số mẫu", value: data.summary.totalSamples },
    { metric: "Tỷ lệ OOC trung bình", value: `${data.summary.avgOocRate.toFixed(2)}%` },
  ]);

  // Style summary header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Detail Sheet
  const detailSheet = workbook.addWorksheet("Chi tiết Fixture");
  detailSheet.columns = [
    { header: "STT", key: "index", width: 6 },
    { header: "Fixture", key: "fixtureName", width: 20 },
    { header: "Máy", key: "machineName", width: 20 },
    { header: "CPK TB", key: "avgCpk", width: 12 },
    { header: "CP TB", key: "avgCp", width: 12 },
    { header: "PPK TB", key: "avgPpk", width: 12 },
    { header: "CPK Min", key: "minCpk", width: 12 },
    { header: "CPK Max", key: "maxCpk", width: 12 },
    { header: "Số mẫu", key: "sampleCount", width: 12 },
    { header: "OOC", key: "oocCount", width: 10 },
    { header: "Tỷ lệ OOC", key: "oocRate", width: 12 },
    { header: "Trạng thái", key: "status", width: 15 },
  ];

  data.fixtures.forEach((f, i) => {
    detailSheet.addRow({
      index: i + 1,
      fixtureName: f.fixtureName,
      machineName: f.machineName,
      avgCpk: f.avgCpk?.toFixed(3) || "N/A",
      avgCp: f.avgCp?.toFixed(3) || "N/A",
      avgPpk: f.avgPpk?.toFixed(3) || "N/A",
      minCpk: f.minCpk?.toFixed(3) || "N/A",
      maxCpk: f.maxCpk?.toFixed(3) || "N/A",
      sampleCount: f.sampleCount,
      oocCount: f.oocCount,
      oocRate: `${f.oocRate.toFixed(2)}%`,
      status: getCpkStatusLabel(f.status),
    });
  });

  // Style detail header
  detailSheet.getRow(1).font = { bold: true };
  detailSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" },
  };
  detailSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Add conditional formatting for status
  const statusColors: Record<string, string> = {
    "Xuất sắc": "FF059669",
    "Tốt": "FF2563EB",
    "Chấp nhận": "FFD97706",
    "Cần cải thiện": "FFEA580C",
    "Nguy hiểm": "FFDC2626",
  };

  data.fixtures.forEach((f, i) => {
    const row = detailSheet.getRow(i + 2);
    const statusCell = row.getCell(12);
    const color = statusColors[getCpkStatusLabel(f.status)];
    if (color) {
      statusCell.font = { color: { argb: color }, bold: true };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
