/**
 * OEE Export Service
 * Server-side PDF and Excel export for OEE reports
 */
import ExcelJS from 'exceljs';
import { getDb } from '../db';
import { oeeRecords, machines, productionLines, oeeTargets, oeeLossRecords, oeeLossCategories } from '../../drizzle/schema';
import { eq, and, gte, lte, desc, sql, asc } from 'drizzle-orm';
import { storagePut } from '../storage';

interface OEEExportInput {
  startDate: Date;
  endDate: Date;
  machineIds?: number[];
  productionLineId?: number;
  language?: 'vi' | 'en';
}

interface OEERecord {
  id: number;
  machineId: number | null;
  machineName: string | null;
  recordDate: Date | null;
  availability: string | number | null;
  performance: string | number | null;
  quality: string | number | null;
  oee: string | number | null;
  plannedProductionTime: number | null;
  actualRunTime: number | null;
  totalCount: number | null;
  goodCount: number | null;
  shift: string | null;
}

function getStatusClass(oee: number): string {
  if (oee >= 85) return 'excellent';
  if (oee >= 75) return 'good';
  if (oee >= 65) return 'warning';
  return 'critical';
}

function getStatusLabel(oee: number, lang: 'vi' | 'en'): string {
  if (lang === 'vi') {
    if (oee >= 85) return 'Xuất sắc';
    if (oee >= 75) return 'Tốt';
    if (oee >= 65) return 'Cảnh báo';
    return 'Kém';
  }
  if (oee >= 85) return 'Excellent';
  if (oee >= 75) return 'Good';
  if (oee >= 65) return 'Warning';
  return 'Critical';
}

async function getOEEData(input: OEEExportInput): Promise<OEERecord[]> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const conditions = [
    gte(oeeRecords.recordDate, input.startDate),
    lte(oeeRecords.recordDate, input.endDate),
  ];

  if (input.machineIds && input.machineIds.length > 0) {
    // Filter by specific machines
  }

  const records = await db
    .select({
      id: oeeRecords.id,
      machineId: oeeRecords.machineId,
      machineName: machines.name,
      recordDate: oeeRecords.recordDate,
      availability: oeeRecords.availability,
      performance: oeeRecords.performance,
      quality: oeeRecords.quality,
      oee: oeeRecords.oee,
      plannedProductionTime: oeeRecords.plannedProductionTime,
      actualRunTime: oeeRecords.actualRunTime,
      totalCount: oeeRecords.totalCount,
      goodCount: oeeRecords.goodCount,
      shift: oeeRecords.shift,
    })
    .from(oeeRecords)
    .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
    .where(and(...conditions))
    .orderBy(desc(oeeRecords.recordDate));

  return records;
}

function calculateSummary(records: OEERecord[]) {
  const total = records.length;
  if (total === 0) {
    return {
      totalRecords: 0,
      avgOEE: 0, avgAvailability: 0, avgPerformance: 0, avgQuality: 0,
      maxOEE: 0, minOEE: 0,
      excellentCount: 0, goodCount: 0, warningCount: 0, criticalCount: 0,
      totalPlannedTime: 0, totalActualTime: 0, totalProduced: 0, totalGood: 0,
    };
  }

  const oeeValues = records.map(r => Number(r.oee || 0));
  const availValues = records.map(r => Number(r.availability || 0));
  const perfValues = records.map(r => Number(r.performance || 0));
  const qualValues = records.map(r => Number(r.quality || 0));

  return {
    totalRecords: total,
    avgOEE: oeeValues.reduce((a, b) => a + b, 0) / total,
    avgAvailability: availValues.reduce((a, b) => a + b, 0) / total,
    avgPerformance: perfValues.reduce((a, b) => a + b, 0) / total,
    avgQuality: qualValues.reduce((a, b) => a + b, 0) / total,
    maxOEE: Math.max(...oeeValues),
    minOEE: Math.min(...oeeValues),
    excellentCount: oeeValues.filter(v => v >= 85).length,
    goodCount: oeeValues.filter(v => v >= 75 && v < 85).length,
    warningCount: oeeValues.filter(v => v >= 65 && v < 75).length,
    criticalCount: oeeValues.filter(v => v < 65).length,
    totalPlannedTime: records.reduce((s, r) => s + (r.plannedProductionTime || 0), 0),
    totalActualTime: records.reduce((s, r) => s + (r.actualRunTime || 0), 0),
    totalProduced: records.reduce((s, r) => s + (r.totalCount || 0), 0),
    totalGood: records.reduce((s, r) => s + (r.goodCount || 0), 0),
  };
}

// ========== EXCEL EXPORT ==========

export async function exportOEEToExcel(input: OEEExportInput): Promise<Buffer> {
  const records = await getOEEData(input);
  const summary = calculateSummary(records);
  const lang = input.language || 'vi';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SPC/CPK Calculator';
  workbook.created = new Date();

  // === Sheet 1: Summary ===
  const summarySheet = workbook.addWorksheet(lang === 'vi' ? 'Tổng quan' : 'Summary');

  // Title
  summarySheet.mergeCells('A1:F1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = lang === 'vi' ? 'BÁO CÁO OEE' : 'OEE REPORT';
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF1E40AF' } };
  titleCell.alignment = { horizontal: 'center' };

  // Date range
  summarySheet.mergeCells('A2:F2');
  const dateCell = summarySheet.getCell('A2');
  dateCell.value = `${input.startDate.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')} - ${input.endDate.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}`;
  dateCell.font = { size: 12, color: { argb: 'FF6B7280' } };
  dateCell.alignment = { horizontal: 'center' };

  // Summary cards
  const summaryData = [
    [lang === 'vi' ? 'Chỉ số' : 'Metric', lang === 'vi' ? 'Giá trị' : 'Value'],
    [lang === 'vi' ? 'Tổng số bản ghi' : 'Total Records', summary.totalRecords],
    ['OEE ' + (lang === 'vi' ? 'Trung bình' : 'Average'), `${summary.avgOEE.toFixed(1)}%`],
    ['Availability ' + (lang === 'vi' ? 'TB' : 'Avg'), `${summary.avgAvailability.toFixed(1)}%`],
    ['Performance ' + (lang === 'vi' ? 'TB' : 'Avg'), `${summary.avgPerformance.toFixed(1)}%`],
    ['Quality ' + (lang === 'vi' ? 'TB' : 'Avg'), `${summary.avgQuality.toFixed(1)}%`],
    ['OEE Max', `${summary.maxOEE.toFixed(1)}%`],
    ['OEE Min', `${summary.minOEE.toFixed(1)}%`],
    [lang === 'vi' ? 'Xuất sắc (≥85%)' : 'Excellent (≥85%)', summary.excellentCount],
    [lang === 'vi' ? 'Tốt (75-85%)' : 'Good (75-85%)', summary.goodCount],
    [lang === 'vi' ? 'Cảnh báo (65-75%)' : 'Warning (65-75%)', summary.warningCount],
    [lang === 'vi' ? 'Kém (<65%)' : 'Critical (<65%)', summary.criticalCount],
    [lang === 'vi' ? 'Tổng thời gian kế hoạch (phút)' : 'Total Planned Time (min)', summary.totalPlannedTime],
    [lang === 'vi' ? 'Tổng thời gian thực tế (phút)' : 'Total Actual Time (min)', summary.totalActualTime],
    [lang === 'vi' ? 'Tổng sản lượng' : 'Total Produced', summary.totalProduced],
    [lang === 'vi' ? 'Sản phẩm đạt' : 'Good Products', summary.totalGood],
  ];

  summaryData.forEach((row, i) => {
    const excelRow = summarySheet.addRow(row);
    if (i === 0) {
      excelRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      });
    }
  });

  summarySheet.getColumn(1).width = 35;
  summarySheet.getColumn(2).width = 20;

  // === Sheet 2: Detail Data ===
  const detailSheet = workbook.addWorksheet(lang === 'vi' ? 'Chi tiết' : 'Detail');

  const headers = [
    lang === 'vi' ? 'Ngày' : 'Date',
    lang === 'vi' ? 'Máy' : 'Machine',
    lang === 'vi' ? 'Ca' : 'Shift',
    'OEE (%)',
    'Availability (%)',
    'Performance (%)',
    'Quality (%)',
    lang === 'vi' ? 'TG Kế hoạch (phút)' : 'Planned Time (min)',
    lang === 'vi' ? 'TG Thực tế (phút)' : 'Actual Time (min)',
    lang === 'vi' ? 'Tổng SL' : 'Total Count',
    lang === 'vi' ? 'SL Đạt' : 'Good Count',
    lang === 'vi' ? 'Trạng thái' : 'Status',
  ];

  const headerRow = detailSheet.addRow(headers);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
  });

  records.forEach(r => {
    const oee = Number(r.oee || 0);
    const row = detailSheet.addRow([
      r.recordDate ? new Date(r.recordDate).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : '',
      r.machineName || `Machine #${r.machineId}`,
      r.shift || '-',
      oee.toFixed(1),
      Number(r.availability || 0).toFixed(1),
      Number(r.performance || 0).toFixed(1),
      Number(r.quality || 0).toFixed(1),
      r.plannedProductionTime || 0,
      r.actualRunTime || 0,
      r.totalCount || 0,
      r.goodCount || 0,
      getStatusLabel(oee, lang),
    ]);

    // Color-code OEE cell
    const oeeCell = row.getCell(4);
    if (oee >= 85) oeeCell.font = { color: { argb: 'FF059669' }, bold: true };
    else if (oee >= 75) oeeCell.font = { color: { argb: 'FF2563EB' } };
    else if (oee >= 65) oeeCell.font = { color: { argb: 'FFD97706' } };
    else oeeCell.font = { color: { argb: 'FFDC2626' }, bold: true };

    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
  });

  // Auto-fit columns
  detailSheet.columns.forEach(col => {
    col.width = Math.max(12, (col.header?.toString().length || 10) + 4);
  });

  // === Sheet 3: Machine Comparison ===
  const compSheet = workbook.addWorksheet(lang === 'vi' ? 'So sánh máy' : 'Machine Comparison');

  // Group by machine
  const byMachine = new Map<string, { oee: number[]; avail: number[]; perf: number[]; qual: number[] }>();
  records.forEach(r => {
    const name = r.machineName || `Machine #${r.machineId}`;
    if (!byMachine.has(name)) byMachine.set(name, { oee: [], avail: [], perf: [], qual: [] });
    const m = byMachine.get(name)!;
    m.oee.push(Number(r.oee || 0));
    m.avail.push(Number(r.availability || 0));
    m.perf.push(Number(r.performance || 0));
    m.qual.push(Number(r.quality || 0));
  });

  const compHeaders = [
    lang === 'vi' ? 'Máy' : 'Machine',
    lang === 'vi' ? 'Số bản ghi' : 'Records',
    'OEE TB (%)',
    'Availability TB (%)',
    'Performance TB (%)',
    'Quality TB (%)',
    'OEE Max (%)',
    'OEE Min (%)',
    lang === 'vi' ? 'Trạng thái' : 'Status',
  ];

  const compHeaderRow = compSheet.addRow(compHeaders);
  compHeaderRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center' };
  });

  byMachine.forEach((data, name) => {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const avgOee = avg(data.oee);
    compSheet.addRow([
      name,
      data.oee.length,
      avgOee.toFixed(1),
      avg(data.avail).toFixed(1),
      avg(data.perf).toFixed(1),
      avg(data.qual).toFixed(1),
      Math.max(...data.oee).toFixed(1),
      Math.min(...data.oee).toFixed(1),
      getStatusLabel(avgOee, lang),
    ]);
  });

  compSheet.columns.forEach(col => { col.width = 18; });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ========== PDF EXPORT (HTML) ==========

export async function exportOEEToPdfHtml(input: OEEExportInput): Promise<string> {
  const records = await getOEEData(input);
  const summary = calculateSummary(records);
  const lang = input.language || 'vi';

  // Group by machine for comparison
  const byMachine = new Map<string, number[]>();
  records.forEach(r => {
    const name = r.machineName || `Machine #${r.machineId}`;
    if (!byMachine.has(name)) byMachine.set(name, []);
    byMachine.get(name)!.push(Number(r.oee || 0));
  });

  // Group by date for trend
  const byDate = new Map<string, number[]>();
  records.forEach(r => {
    if (r.recordDate) {
      const dateStr = new Date(r.recordDate).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US');
      if (!byDate.has(dateStr)) byDate.set(dateStr, []);
      byDate.get(dateStr)!.push(Number(r.oee || 0));
    }
  });

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${lang === 'vi' ? 'Báo cáo OEE' : 'OEE Report'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; background: #fff; padding: 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1e40af; padding-bottom: 15px; margin-bottom: 30px; }
    .logo { font-size: 22px; font-weight: 700; color: #1e40af; }
    .logo span { color: #6b7280; font-size: 14px; font-weight: 400; display: block; }
    .date-info { text-align: right; color: #6b7280; font-size: 12px; }
    h1 { font-size: 20px; color: #1e40af; margin-bottom: 20px; }
    h2 { font-size: 16px; color: #374151; margin: 25px 0 12px; border-left: 4px solid #1e40af; padding-left: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .summary-card .value { font-size: 28px; font-weight: 700; }
    .summary-card .label { color: #6b7280; font-size: 11px; margin-top: 4px; }
    .excellent { color: #059669; }
    .good { color: #2563eb; }
    .warning { color: #d97706; }
    .critical { color: #dc2626; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .stat-item { background: #f1f5f9; padding: 10px; border-radius: 6px; text-align: center; }
    .stat-item .count { font-size: 20px; font-weight: 700; }
    .stat-item .desc { font-size: 10px; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #1e40af; color: #fff; padding: 8px 6px; text-align: left; font-weight: 600; }
    td { padding: 7px 6px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #e5e7eb; color: #9ca3af; font-size: 11px; display: flex; justify-content: space-between; }
    .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 120px; margin: 15px 0; padding: 10px 0; }
    .bar-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
    .bar { width: 100%; min-width: 30px; border-radius: 4px 4px 0 0; transition: height 0.3s; }
    .bar-label { font-size: 9px; color: #6b7280; margin-top: 4px; text-align: center; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bar-value { font-size: 10px; font-weight: 600; margin-bottom: 2px; }
    @media print { body { padding: 20px; } .header { page-break-after: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      MSoftware AI
      <span>SPC/CPK Calculator System</span>
    </div>
    <div class="date-info">
      <div>${lang === 'vi' ? 'Ngày tạo' : 'Generated'}: ${new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</div>
      <div>${lang === 'vi' ? 'Khoảng thời gian' : 'Period'}: ${input.startDate.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')} - ${input.endDate.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US')}</div>
    </div>
  </div>

  <h1>${lang === 'vi' ? 'BÁO CÁO HIỆU SUẤT THIẾT BỊ TỔNG THỂ (OEE)' : 'OVERALL EQUIPMENT EFFECTIVENESS (OEE) REPORT'}</h1>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="value ${getStatusClass(summary.avgOEE)}">${summary.avgOEE.toFixed(1)}%</div>
      <div class="label">OEE ${lang === 'vi' ? 'Trung bình' : 'Average'}</div>
    </div>
    <div class="summary-card">
      <div class="value">${summary.avgAvailability.toFixed(1)}%</div>
      <div class="label">Availability</div>
    </div>
    <div class="summary-card">
      <div class="value">${summary.avgPerformance.toFixed(1)}%</div>
      <div class="label">Performance</div>
    </div>
    <div class="summary-card">
      <div class="value">${summary.avgQuality.toFixed(1)}%</div>
      <div class="label">Quality</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-item">
      <div class="count excellent">${summary.excellentCount}</div>
      <div class="desc">${lang === 'vi' ? 'Xuất sắc' : 'Excellent'} (≥85%)</div>
    </div>
    <div class="stat-item">
      <div class="count good">${summary.goodCount}</div>
      <div class="desc">${lang === 'vi' ? 'Tốt' : 'Good'} (75-85%)</div>
    </div>
    <div class="stat-item">
      <div class="count warning">${summary.warningCount}</div>
      <div class="desc">${lang === 'vi' ? 'Cảnh báo' : 'Warning'} (65-75%)</div>
    </div>
    <div class="stat-item">
      <div class="count critical">${summary.criticalCount}</div>
      <div class="desc">${lang === 'vi' ? 'Kém' : 'Critical'} (<65%)</div>
    </div>
  </div>

  <h2>${lang === 'vi' ? 'So sánh theo máy' : 'Machine Comparison'}</h2>
  <div class="bar-chart">
    ${Array.from(byMachine.entries()).slice(0, 15).map(([name, values]) => {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const height = Math.max(10, (avg / 100) * 100);
      const color = avg >= 85 ? '#059669' : avg >= 75 ? '#2563eb' : avg >= 65 ? '#d97706' : '#dc2626';
      return `<div class="bar-item">
        <div class="bar-value" style="color:${color}">${avg.toFixed(0)}%</div>
        <div class="bar" style="height:${height}%;background:${color}"></div>
        <div class="bar-label" title="${name}">${name}</div>
      </div>`;
    }).join('')}
  </div>

  <h2>${lang === 'vi' ? 'Chi tiết theo ngày' : 'Daily Detail'}</h2>
  <table>
    <thead>
      <tr>
        <th>${lang === 'vi' ? 'Ngày' : 'Date'}</th>
        <th>${lang === 'vi' ? 'Máy' : 'Machine'}</th>
        <th>${lang === 'vi' ? 'Ca' : 'Shift'}</th>
        <th>OEE</th>
        <th>Avail.</th>
        <th>Perf.</th>
        <th>Quality</th>
        <th>${lang === 'vi' ? 'SL Đạt/Tổng' : 'Good/Total'}</th>
        <th>${lang === 'vi' ? 'Trạng thái' : 'Status'}</th>
      </tr>
    </thead>
    <tbody>
      ${records.slice(0, 50).map(r => {
        const oee = Number(r.oee || 0);
        return `<tr>
          <td>${r.recordDate ? new Date(r.recordDate).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : '-'}</td>
          <td>${r.machineName || `#${r.machineId}`}</td>
          <td>${r.shift || '-'}</td>
          <td class="${getStatusClass(oee)}" style="font-weight:600">${oee.toFixed(1)}%</td>
          <td>${Number(r.availability || 0).toFixed(1)}%</td>
          <td>${Number(r.performance || 0).toFixed(1)}%</td>
          <td>${Number(r.quality || 0).toFixed(1)}%</td>
          <td>${r.goodCount || 0}/${r.totalCount || 0}</td>
          <td class="${getStatusClass(oee)}">${getStatusLabel(oee, lang)}</td>
        </tr>`;
      }).join('')}
      ${records.length > 50 ? `<tr><td colspan="9" style="text-align:center;color:#6b7280;font-style:italic">${lang === 'vi' ? `... và ${records.length - 50} bản ghi khác` : `... and ${records.length - 50} more records`}</td></tr>` : ''}
    </tbody>
  </table>

  <h2>${lang === 'vi' ? 'Thông tin sản xuất' : 'Production Info'}</h2>
  <table>
    <thead>
      <tr>
        <th>${lang === 'vi' ? 'Chỉ số' : 'Metric'}</th>
        <th>${lang === 'vi' ? 'Giá trị' : 'Value'}</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>${lang === 'vi' ? 'Tổng bản ghi' : 'Total Records'}</td><td>${summary.totalRecords}</td></tr>
      <tr><td>${lang === 'vi' ? 'Tổng TG kế hoạch' : 'Total Planned Time'}</td><td>${(summary.totalPlannedTime / 60).toFixed(1)} ${lang === 'vi' ? 'giờ' : 'hours'}</td></tr>
      <tr><td>${lang === 'vi' ? 'Tổng TG thực tế' : 'Total Actual Time'}</td><td>${(summary.totalActualTime / 60).toFixed(1)} ${lang === 'vi' ? 'giờ' : 'hours'}</td></tr>
      <tr><td>${lang === 'vi' ? 'Tổng sản lượng' : 'Total Produced'}</td><td>${summary.totalProduced.toLocaleString()}</td></tr>
      <tr><td>${lang === 'vi' ? 'Sản phẩm đạt' : 'Good Products'}</td><td>${summary.totalGood.toLocaleString()}</td></tr>
      <tr><td>${lang === 'vi' ? 'Tỷ lệ đạt' : 'Yield Rate'}</td><td>${summary.totalProduced > 0 ? ((summary.totalGood / summary.totalProduced) * 100).toFixed(1) : 0}%</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <div>${lang === 'vi' ? 'Báo cáo được tạo tự động bởi hệ thống MSoftware AI - SPC/CPK Calculator' : 'Auto-generated by MSoftware AI - SPC/CPK Calculator System'}</div>
    <div>&copy; ${new Date().getFullYear()} MSoftware AI</div>
  </div>
</body>
</html>`;

  return html;
}

// ========== COMBINED EXPORT (Upload to S3) ==========

export async function exportOEEReportToS3(
  input: OEEExportInput,
  format: 'excel' | 'pdf',
  userId?: string
): Promise<{ url: string; filename: string }> {
  const timestamp = Date.now();

  if (format === 'excel') {
    const buffer = await exportOEEToExcel(input);
    const filename = `oee-report-${timestamp}.xlsx`;
    const { url } = await storagePut(
      `reports/oee/${userId || 'system'}/${filename}`,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return { url, filename };
  } else {
    const html = await exportOEEToPdfHtml(input);
    const filename = `oee-report-${timestamp}.html`;
    const { url } = await storagePut(
      `reports/oee/${userId || 'system'}/${filename}`,
      Buffer.from(html, 'utf-8'),
      'text/html'
    );
    return { url, filename };
  }
}
