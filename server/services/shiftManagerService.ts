/**
 * Shift Manager Dashboard Service
 * Cung cấp dữ liệu KPI theo ca với filter Line/Machine và export PDF/Excel
 */

import { getDb } from "../db";
import { 
  spcAnalysisHistory, 
  oeeRecords, 
  machines, 
  productionLines,
  spcSummaryStats,
  spcSamplingPlans
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, inArray } from "drizzle-orm";

// Shift definitions
export const SHIFTS = {
  morning: { start: 6, end: 14, name: "Ca sáng" },
  afternoon: { start: 14, end: 22, name: "Ca chiều" },
  night: { start: 22, end: 6, name: "Ca đêm" }
} as const;

export type ShiftType = keyof typeof SHIFTS;

export interface ShiftKPIData {
  shiftType: ShiftType;
  shiftName: string;
  avgCpk: number | null;
  avgOee: number | null;
  defectRate: number;
  sampleCount: number;
  violationCount: number;
  productionCount: number;
  status: "excellent" | "good" | "acceptable" | "warning" | "critical";
}

export interface MachineKPIData {
  machineId: number;
  machineName: string;
  lineId: number;
  lineName: string;
  cpk: number | null;
  oee: number | null;
  defectRate: number;
  sampleCount: number;
  status: string;
}

export interface ShiftManagerFilters {
  date: Date;
  productionLineId?: number;
  machineId?: number;
  days?: number;
}

/**
 * Get shift time range for a specific date
 */
function getShiftTimeRange(date: Date, shiftType: ShiftType): { start: Date; end: Date } {
  const shift = SHIFTS[shiftType];
  const start = new Date(date);
  const end = new Date(date);
  
  if (shiftType === "night") {
    start.setHours(shift.start, 0, 0, 0);
    end.setDate(end.getDate() + 1);
    end.setHours(shift.end, 0, 0, 0);
  } else {
    start.setHours(shift.start, 0, 0, 0);
    end.setHours(shift.end, 0, 0, 0);
  }
  
  return { start, end };
}

/**
 * Determine status from CPK value
 */
function getStatusFromCpk(cpk: number | null): ShiftKPIData["status"] {
  if (cpk === null) return "acceptable";
  if (cpk >= 1.67) return "excellent";
  if (cpk >= 1.33) return "good";
  if (cpk >= 1.0) return "acceptable";
  if (cpk >= 0.67) return "warning";
  return "critical";
}

/**
 * Get KPI data for all shifts on a specific date with optional filters
 */
export async function getShiftKPIData(filters: ShiftManagerFilters): Promise<ShiftKPIData[]> {
  const db = await getDb();
  if (!db) return [];

  const { date, productionLineId, machineId } = filters;
  const results: ShiftKPIData[] = [];

  for (const shiftType of ["morning", "afternoon", "night"] as ShiftType[]) {
    const { start, end } = getShiftTimeRange(date, shiftType);
    
    // Build conditions for SPC data
    const spcConditions = [
      gte(spcAnalysisHistory.createdAt, start),
      lte(spcAnalysisHistory.createdAt, end)
    ];

    // Get SPC data
    const spcData = await db.select({
      cpk: spcAnalysisHistory.cpk,
      cp: spcAnalysisHistory.cp,
      sampleCount: spcAnalysisHistory.sampleCount,
      alertTriggered: spcAnalysisHistory.alertTriggered
    })
    .from(spcAnalysisHistory)
    .where(and(...spcConditions));

    // Build conditions for OEE data
    const oeeConditions = [
      gte(oeeRecords.recordDate, start),
      lte(oeeRecords.recordDate, end)
    ];
    
    if (machineId) {
      oeeConditions.push(eq(oeeRecords.machineId, machineId));
    }

    // Get OEE data
    const oeeData = await db.select({
      oee: oeeRecords.oee,
      totalCount: oeeRecords.totalCount,
      goodCount: oeeRecords.goodCount,
      defectCount: oeeRecords.defectCount
    })
    .from(oeeRecords)
    .where(and(...oeeConditions));

    // Calculate averages
    const cpkValues = spcData
      .filter(d => d.cpk !== null)
      .map(d => (d.cpk || 0) / 1000);
    const avgCpk = cpkValues.length > 0 
      ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length 
      : null;

    const oeeValues = oeeData
      .filter(d => d.oee !== null)
      .map(d => Number(d.oee));
    const avgOee = oeeValues.length > 0
      ? oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length
      : null;

    const totalProduced = oeeData.reduce((sum, d) => sum + (d.totalCount || 0), 0);
    const defectCount = oeeData.reduce((sum, d) => sum + (d.defectCount || 0), 0);
    const defectRate = totalProduced > 0 ? (defectCount / totalProduced) * 100 : 0;

    const violationCount = spcData.filter(d => d.alertTriggered === 1).length;
    const sampleCount = spcData.reduce((sum, d) => sum + (d.sampleCount || 0), 0);

    results.push({
      shiftType,
      shiftName: SHIFTS[shiftType].name,
      avgCpk,
      avgOee,
      defectRate,
      sampleCount,
      violationCount,
      productionCount: totalProduced,
      status: getStatusFromCpk(avgCpk)
    });
  }

  return results;
}

/**
 * Get machine performance data with optional filters
 */
export async function getMachinePerformanceData(filters: ShiftManagerFilters): Promise<MachineKPIData[]> {
  const db = await getDb();
  if (!db) return [];

  const { date, productionLineId, machineId } = filters;
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Get machines with optional filters
  let machineConditions = [eq(machines.isActive, 1)];
  if (machineId) {
    machineConditions.push(eq(machines.id, machineId));
  }

  const machineList = await db.select({
    id: machines.id,
    name: machines.name,
    workstationId: machines.workstationId
  })
  .from(machines)
  .where(and(...machineConditions));

  // Get production lines for filtering
  let lineList: { id: number; name: string }[] = [];
  if (productionLineId) {
    const line = await db.select({ id: productionLines.id, name: productionLines.name })
      .from(productionLines)
      .where(eq(productionLines.id, productionLineId))
      .limit(1);
    lineList = line;
  } else {
    lineList = await db.select({ id: productionLines.id, name: productionLines.name })
      .from(productionLines);
  }

  const results: MachineKPIData[] = [];

  for (const machine of machineList) {
    // Get OEE data for this machine
    const oeeData = await db.select({
      oee: oeeRecords.oee,
      totalCount: oeeRecords.totalCount,
      defectCount: oeeRecords.defectCount
    })
    .from(oeeRecords)
    .where(and(
      eq(oeeRecords.machineId, machine.id),
      gte(oeeRecords.recordDate, dayStart),
      lte(oeeRecords.recordDate, dayEnd)
    ));

    // Get SPC data (we'll use the latest CPK for this machine)
    const spcData = await db.select({
      cpk: spcAnalysisHistory.cpk,
      sampleCount: spcAnalysisHistory.sampleCount
    })
    .from(spcAnalysisHistory)
    .where(and(
      gte(spcAnalysisHistory.createdAt, dayStart),
      lte(spcAnalysisHistory.createdAt, dayEnd)
    ))
    .orderBy(desc(spcAnalysisHistory.createdAt))
    .limit(10);

    // Calculate averages
    const oeeValues = oeeData.filter(d => d.oee !== null).map(d => Number(d.oee));
    const avgOee = oeeValues.length > 0 
      ? oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length 
      : null;

    const cpkValues = spcData.filter(d => d.cpk !== null).map(d => (d.cpk || 0) / 1000);
    const avgCpk = cpkValues.length > 0 
      ? cpkValues.reduce((a, b) => a + b, 0) / cpkValues.length 
      : null;

    const totalProduced = oeeData.reduce((sum, d) => sum + (d.totalCount || 0), 0);
    const defectCount = oeeData.reduce((sum, d) => sum + (d.defectCount || 0), 0);
    const defectRate = totalProduced > 0 ? (defectCount / totalProduced) * 100 : 0;

    const sampleCount = spcData.reduce((sum, d) => sum + (d.sampleCount || 0), 0);

    // Find line name (simplified - in real app would use proper relations)
    const lineName = lineList.length > 0 ? lineList[0].name : "Unknown";

    results.push({
      machineId: machine.id,
      machineName: machine.name,
      lineId: lineList.length > 0 ? lineList[0].id : 0,
      lineName,
      cpk: avgCpk,
      oee: avgOee,
      defectRate,
      sampleCount,
      status: getStatusFromCpk(avgCpk)
    });
  }

  return results;
}

/**
 * Get daily trend data for the past N days
 */
export async function getDailyTrendData(filters: ShiftManagerFilters & { days: number }): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const { days, productionLineId, machineId } = filters;
  const results = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Get shift KPIs for this day
    const shiftKPIs = await getShiftKPIData({ date, productionLineId, machineId });

    const morningKPI = shiftKPIs.find(s => s.shiftType === "morning");
    const afternoonKPI = shiftKPIs.find(s => s.shiftType === "afternoon");
    const nightKPI = shiftKPIs.find(s => s.shiftType === "night");

    // Calculate daily averages
    const validCpks = shiftKPIs.filter(s => s.avgCpk !== null).map(s => s.avgCpk!);
    const avgCpk = validCpks.length > 0 
      ? validCpks.reduce((a, b) => a + b, 0) / validCpks.length 
      : null;

    const validOees = shiftKPIs.filter(s => s.avgOee !== null).map(s => s.avgOee!);
    const avgOee = validOees.length > 0 
      ? validOees.reduce((a, b) => a + b, 0) / validOees.length 
      : null;

    const totalDefectRate = shiftKPIs.reduce((sum, s) => sum + s.defectRate, 0) / shiftKPIs.length;

    results.push({
      date: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
      fullDate: date.toISOString().split("T")[0],
      morning: morningKPI?.avgCpk || null,
      afternoon: afternoonKPI?.avgCpk || null,
      night: nightKPI?.avgCpk || null,
      avgCpk,
      avgOee,
      defectRate: totalDefectRate
    });
  }

  return results;
}

/**
 * Get weekly comparison data
 */
export async function getWeeklyCompareData(filters: ShiftManagerFilters & { weeks?: number }): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const { weeks = 4, productionLineId, machineId } = filters;
  const results = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - (w * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    // Aggregate data for the week
    let totalCpk = 0, cpkCount = 0;
    let totalOee = 0, oeeCount = 0;
    let totalDefectRate = 0, defectCount = 0;
    let totalSamples = 0;
    let morningCpks: number[] = [];
    let afternoonCpks: number[] = [];
    let nightCpks: number[] = [];

    for (let d = 0; d < 7; d++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + d);
      
      const shiftKPIs = await getShiftKPIData({ date, productionLineId, machineId });

      for (const kpi of shiftKPIs) {
        if (kpi.avgCpk !== null) {
          totalCpk += kpi.avgCpk;
          cpkCount++;
          
          if (kpi.shiftType === "morning") morningCpks.push(kpi.avgCpk);
          else if (kpi.shiftType === "afternoon") afternoonCpks.push(kpi.avgCpk);
          else nightCpks.push(kpi.avgCpk);
        }
        if (kpi.avgOee !== null) {
          totalOee += kpi.avgOee;
          oeeCount++;
        }
        totalDefectRate += kpi.defectRate;
        defectCount++;
        totalSamples += kpi.sampleCount;
      }
    }

    results.push({
      week: `Tuần ${weeks - w}`,
      weekRange: `${weekStart.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - ${weekEnd.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`,
      avgCpk: cpkCount > 0 ? totalCpk / cpkCount : null,
      avgOee: oeeCount > 0 ? totalOee / oeeCount : null,
      defectRate: defectCount > 0 ? totalDefectRate / defectCount : 0,
      sampleCount: totalSamples,
      morningCpk: morningCpks.length > 0 ? morningCpks.reduce((a, b) => a + b, 0) / morningCpks.length : null,
      afternoonCpk: afternoonCpks.length > 0 ? afternoonCpks.reduce((a, b) => a + b, 0) / afternoonCpks.length : null,
      nightCpk: nightCpks.length > 0 ? nightCpks.reduce((a, b) => a + b, 0) / nightCpks.length : null
    });
  }

  return results;
}

/**
 * Compare KPI with previous week to detect decline
 */
export async function compareKPIWithPreviousWeek(filters: ShiftManagerFilters): Promise<{
  currentWeek: { avgCpk: number | null; avgOee: number | null };
  previousWeek: { avgCpk: number | null; avgOee: number | null };
  cpkChange: number | null;
  oeeChange: number | null;
  cpkDeclineAlert: boolean;
  oeeDeclineAlert: boolean;
  alertThreshold: number;
}> {
  const weeklyData = await getWeeklyCompareData({ ...filters, weeks: 2 });
  
  const previousWeek = weeklyData[0] || { avgCpk: null, avgOee: null };
  const currentWeek = weeklyData[1] || { avgCpk: null, avgOee: null };

  const cpkChange = previousWeek.avgCpk !== null && currentWeek.avgCpk !== null
    ? ((currentWeek.avgCpk - previousWeek.avgCpk) / previousWeek.avgCpk) * 100
    : null;

  const oeeChange = previousWeek.avgOee !== null && currentWeek.avgOee !== null
    ? ((currentWeek.avgOee - previousWeek.avgOee) / previousWeek.avgOee) * 100
    : null;

  const alertThreshold = -5; // Alert if KPI drops more than 5%

  return {
    currentWeek: { avgCpk: currentWeek.avgCpk, avgOee: currentWeek.avgOee },
    previousWeek: { avgCpk: previousWeek.avgCpk, avgOee: previousWeek.avgOee },
    cpkChange,
    oeeChange,
    cpkDeclineAlert: cpkChange !== null && cpkChange < alertThreshold,
    oeeDeclineAlert: oeeChange !== null && oeeChange < alertThreshold,
    alertThreshold
  };
}

/**
 * Export Shift Manager data to Excel format
 */
export async function exportShiftManagerExcel(filters: ShiftManagerFilters & { days?: number }): Promise<{
  data: string;
  filename: string;
  mimeType: string;
}> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Shift KPIs
  const shiftSheet = workbook.addWorksheet("KPI theo Ca");
  shiftSheet.columns = [
    { header: "Ca làm việc", key: "shiftName", width: 15 },
    { header: "CPK TB", key: "avgCpk", width: 12 },
    { header: "OEE TB (%)", key: "avgOee", width: 12 },
    { header: "Tỷ lệ lỗi (%)", key: "defectRate", width: 15 },
    { header: "Số mẫu", key: "sampleCount", width: 12 },
    { header: "Vi phạm", key: "violationCount", width: 12 },
    { header: "Sản lượng", key: "productionCount", width: 15 },
    { header: "Trạng thái", key: "status", width: 15 }
  ];

  const shiftKPIs = await getShiftKPIData(filters);
  shiftKPIs.forEach(kpi => {
    shiftSheet.addRow({
      shiftName: kpi.shiftName,
      avgCpk: kpi.avgCpk?.toFixed(3) || "N/A",
      avgOee: kpi.avgOee?.toFixed(1) || "N/A",
      defectRate: kpi.defectRate.toFixed(2),
      sampleCount: kpi.sampleCount,
      violationCount: kpi.violationCount,
      productionCount: kpi.productionCount,
      status: kpi.status
    });
  });

  // Sheet 2: Machine Performance
  const machineSheet = workbook.addWorksheet("Hiệu suất Máy");
  machineSheet.columns = [
    { header: "Máy", key: "machineName", width: 15 },
    { header: "Dây chuyền", key: "lineName", width: 15 },
    { header: "CPK", key: "cpk", width: 12 },
    { header: "OEE (%)", key: "oee", width: 12 },
    { header: "Tỷ lệ lỗi (%)", key: "defectRate", width: 15 },
    { header: "Số mẫu", key: "sampleCount", width: 12 },
    { header: "Trạng thái", key: "status", width: 15 }
  ];

  const machineData = await getMachinePerformanceData(filters);
  machineData.forEach(machine => {
    machineSheet.addRow({
      machineName: machine.machineName,
      lineName: machine.lineName,
      cpk: machine.cpk?.toFixed(3) || "N/A",
      oee: machine.oee?.toFixed(1) || "N/A",
      defectRate: machine.defectRate.toFixed(2),
      sampleCount: machine.sampleCount,
      status: machine.status
    });
  });

  // Sheet 3: Daily Trend
  const trendSheet = workbook.addWorksheet("Xu hướng theo Ngày");
  trendSheet.columns = [
    { header: "Ngày", key: "date", width: 12 },
    { header: "Ca sáng", key: "morning", width: 12 },
    { header: "Ca chiều", key: "afternoon", width: 12 },
    { header: "Ca đêm", key: "night", width: 12 },
    { header: "CPK TB", key: "avgCpk", width: 12 },
    { header: "OEE TB (%)", key: "avgOee", width: 12 },
    { header: "Tỷ lệ lỗi (%)", key: "defectRate", width: 15 }
  ];

  const trendData = await getDailyTrendData({ ...filters, days: filters.days || 7 });
  trendData.forEach(day => {
    trendSheet.addRow({
      date: day.date,
      morning: day.morning?.toFixed(3) || "N/A",
      afternoon: day.afternoon?.toFixed(3) || "N/A",
      night: day.night?.toFixed(3) || "N/A",
      avgCpk: day.avgCpk?.toFixed(3) || "N/A",
      avgOee: day.avgOee?.toFixed(1) || "N/A",
      defectRate: day.defectRate.toFixed(2)
    });
  });

  // Style headers
  [shiftSheet, machineSheet, trendSheet].forEach(sheet => {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = filters.date.toISOString().split("T")[0];

  return {
    data: Buffer.from(buffer as ArrayBuffer).toString("base64"),
    filename: `shift_manager_report_${dateStr}.xlsx`,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
}

/**
 * Export Shift Manager data to PDF format
 */
export async function exportShiftManagerPdf(filters: ShiftManagerFilters): Promise<{
  data: string;
  filename: string;
  mimeType: string;
}> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  // Title
  doc.fontSize(20).font("Helvetica-Bold").text("BÁO CÁO QUẢN LÝ CA", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).font("Helvetica").text(`Ngày: ${filters.date.toLocaleDateString("vi-VN")}`, { align: "center" });
  doc.moveDown(2);

  // Shift KPIs
  const shiftKPIs = await getShiftKPIData(filters);
  
  doc.fontSize(14).font("Helvetica-Bold").text("1. KPI THEO CA");
  doc.moveDown();

  // Table header
  const colWidths = [100, 60, 60, 70, 60, 70];
  let x = 50;
  doc.fontSize(10).font("Helvetica-Bold");
  ["Ca làm việc", "CPK TB", "OEE TB", "Tỷ lệ lỗi", "Số mẫu", "Trạng thái"].forEach((header, i) => {
    doc.text(header, x, doc.y, { width: colWidths[i], continued: i < 5 });
    x += colWidths[i];
  });
  doc.moveDown();

  // Table rows
  doc.font("Helvetica");
  shiftKPIs.forEach(kpi => {
    x = 50;
    const y = doc.y;
    doc.text(kpi.shiftName, x, y, { width: colWidths[0] }); x += colWidths[0];
    doc.text(kpi.avgCpk?.toFixed(3) || "N/A", x, y, { width: colWidths[1] }); x += colWidths[1];
    doc.text(kpi.avgOee?.toFixed(1) + "%" || "N/A", x, y, { width: colWidths[2] }); x += colWidths[2];
    doc.text(kpi.defectRate.toFixed(2) + "%", x, y, { width: colWidths[3] }); x += colWidths[3];
    doc.text(String(kpi.sampleCount), x, y, { width: colWidths[4] }); x += colWidths[4];
    doc.text(kpi.status, x, y, { width: colWidths[5] });
    doc.moveDown();
  });

  doc.moveDown(2);

  // Machine Performance
  const machineData = await getMachinePerformanceData(filters);
  
  doc.fontSize(14).font("Helvetica-Bold").text("2. HIỆU SUẤT MÁY");
  doc.moveDown();

  // Table header
  x = 50;
  doc.fontSize(10).font("Helvetica-Bold");
  ["Máy", "Dây chuyền", "CPK", "OEE", "Tỷ lệ lỗi", "Trạng thái"].forEach((header, i) => {
    doc.text(header, x, doc.y, { width: colWidths[i], continued: i < 5 });
    x += colWidths[i];
  });
  doc.moveDown();

  // Table rows
  doc.font("Helvetica");
  machineData.slice(0, 10).forEach(machine => {
    x = 50;
    const y = doc.y;
    doc.text(machine.machineName, x, y, { width: colWidths[0] }); x += colWidths[0];
    doc.text(machine.lineName, x, y, { width: colWidths[1] }); x += colWidths[1];
    doc.text(machine.cpk?.toFixed(3) || "N/A", x, y, { width: colWidths[2] }); x += colWidths[2];
    doc.text(machine.oee?.toFixed(1) + "%" || "N/A", x, y, { width: colWidths[3] }); x += colWidths[3];
    doc.text(machine.defectRate.toFixed(2) + "%", x, y, { width: colWidths[4] }); x += colWidths[4];
    doc.text(machine.status, x, y, { width: colWidths[5] });
    doc.moveDown();
  });

  // Footer
  doc.moveDown(2);
  doc.fontSize(10).font("Helvetica").text(
    `Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator - ${new Date().toLocaleString("vi-VN")}`,
    { align: "center" }
  );

  doc.end();

  return new Promise((resolve) => {
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(chunks);
      const dateStr = filters.date.toISOString().split("T")[0];
      resolve({
        data: pdfBuffer.toString("base64"),
        filename: `shift_manager_report_${dateStr}.pdf`,
        mimeType: "application/pdf"
      });
    });
  });
}
