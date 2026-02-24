/**
 * KPI Alert Stats Service
 * Quản lý thống kê cảnh báo KPI: CRUD, Export Excel/PDF, Push Notification
 */

import { getDb } from "../db";
import { kpiAlertStats, productionLines, machines } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";
import ExcelJS from "exceljs";
import { notifyOwner } from "../_core/notification";
import { sendEmail } from "../emailService";

export interface KpiAlertStatRecord {
  id: number;
  productionLineId: number | null;
  machineId: number | null;
  alertType: string;
  severity: string;
  currentValue: string | null;
  previousValue: string | null;
  thresholdValue: string | null;
  changePercent: string | null;
  alertMessage: string | null;
  emailSent: number;
  notificationSent: number;
  acknowledgedBy: number | null;
  acknowledgedAt: Date | null;
  resolvedBy: number | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  productionLineName?: string;
  machineName?: string;
}

/**
 * Ghi nhận cảnh báo KPI mới vào database
 */
export async function recordKpiAlert(data: {
  productionLineId?: number;
  machineId?: number;
  alertType: "cpk_decline" | "oee_decline" | "cpk_below_warning" | "cpk_below_critical" | "oee_below_warning" | "oee_below_critical";
  severity: "warning" | "critical";
  currentValue?: number;
  previousValue?: number;
  thresholdValue?: number;
  changePercent?: number;
  alertMessage?: string;
  emailSent?: boolean;
  notificationSent?: boolean;
}): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(kpiAlertStats).values({
      productionLineId: data.productionLineId || null,
      machineId: data.machineId || null,
      alertType: data.alertType,
      severity: data.severity,
      currentValue: data.currentValue?.toString() || null,
      previousValue: data.previousValue?.toString() || null,
      thresholdValue: data.thresholdValue?.toString() || null,
      changePercent: data.changePercent?.toString() || null,
      alertMessage: data.alertMessage || null,
      emailSent: data.emailSent ? 1 : 0,
      notificationSent: data.notificationSent ? 1 : 0,
    });

    return result[0].insertId;
  } catch (error) {
    console.error("Error recording KPI alert:", error);
    return null;
  }
}

/**
 * Lấy danh sách cảnh báo KPI theo khoảng thời gian
 */
export async function getKpiAlertStats(params: {
  startDate?: Date;
  endDate?: Date;
  productionLineId?: number;
  alertType?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}): Promise<{ alerts: KpiAlertStatRecord[]; total: number }> {
  const db = await getDb();
  if (!db) return { alerts: [], total: 0 };

  try {
    const conditions = [];
    
    if (params.startDate) {
      conditions.push(gte(kpiAlertStats.createdAt, params.startDate));
    }
    if (params.endDate) {
      conditions.push(lte(kpiAlertStats.createdAt, params.endDate));
    }
    if (params.productionLineId) {
      conditions.push(eq(kpiAlertStats.productionLineId, params.productionLineId));
    }
    if (params.alertType) {
      conditions.push(eq(kpiAlertStats.alertType, params.alertType as any));
    }
    if (params.severity) {
      conditions.push(eq(kpiAlertStats.severity, params.severity as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(kpiAlertStats)
      .where(whereClause);

    // Get alerts with joins
    const alerts = await db
      .select({
        alert: kpiAlertStats,
        lineName: productionLines.name,
        machineName: machines.name,
      })
      .from(kpiAlertStats)
      .leftJoin(productionLines, eq(kpiAlertStats.productionLineId, productionLines.id))
      .leftJoin(machines, eq(kpiAlertStats.machineId, machines.id))
      .where(whereClause)
      .orderBy(desc(kpiAlertStats.createdAt))
      .limit(params.limit || 100)
      .offset(params.offset || 0);

    return {
      alerts: alerts.map(a => ({
        ...a.alert,
        productionLineName: a.lineName || undefined,
        machineName: a.machineName || undefined,
      })),
      total: countResult?.count || 0,
    };
  } catch (error) {
    console.error("Error getting KPI alert stats:", error);
    return { alerts: [], total: 0 };
  }
}

/**
 * Lấy thống kê cảnh báo theo ngày
 */
export async function getKpiAlertStatsByDay(days: number = 7): Promise<{
  date: string;
  cpkDecline: number;
  oeeDecline: number;
  cpkWarning: number;
  cpkCritical: number;
  oeeWarning: number;
  oeeCritical: number;
  total: number;
}[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const results = await db
      .select({
        date: sql<string>`DATE(${kpiAlertStats.createdAt})`.as("date"),
        alertType: kpiAlertStats.alertType,
        count: count(),
      })
      .from(kpiAlertStats)
      .where(gte(kpiAlertStats.createdAt, startDate))
      .groupBy(sql`DATE(${kpiAlertStats.createdAt})`, kpiAlertStats.alertType)
      .orderBy(sql`DATE(${kpiAlertStats.createdAt})`);

    // Group by date
    const dateMap = new Map<string, {
      cpkDecline: number;
      oeeDecline: number;
      cpkWarning: number;
      cpkCritical: number;
      oeeWarning: number;
      oeeCritical: number;
    }>();

    for (const r of results) {
      if (!dateMap.has(r.date)) {
        dateMap.set(r.date, {
          cpkDecline: 0,
          oeeDecline: 0,
          cpkWarning: 0,
          cpkCritical: 0,
          oeeWarning: 0,
          oeeCritical: 0,
        });
      }
      const entry = dateMap.get(r.date)!;
      switch (r.alertType) {
        case "cpk_decline": entry.cpkDecline = r.count; break;
        case "oee_decline": entry.oeeDecline = r.count; break;
        case "cpk_below_warning": entry.cpkWarning = r.count; break;
        case "cpk_below_critical": entry.cpkCritical = r.count; break;
        case "oee_below_warning": entry.oeeWarning = r.count; break;
        case "oee_below_critical": entry.oeeCritical = r.count; break;
      }
    }

    return Array.from(dateMap.entries()).map(([date, stats]) => ({
      date,
      ...stats,
      total: stats.cpkDecline + stats.oeeDecline + stats.cpkWarning + stats.cpkCritical + stats.oeeWarning + stats.oeeCritical,
    }));
  } catch (error) {
    console.error("Error getting KPI alert stats by day:", error);
    return [];
  }
}

/**
 * Lấy thống kê cảnh báo theo tuần
 */
export async function getKpiAlertStatsByWeek(weeks: number = 4): Promise<{
  week: string;
  weekStart: string;
  weekEnd: string;
  cpkDecline: number;
  oeeDecline: number;
  cpkWarning: number;
  cpkCritical: number;
  oeeWarning: number;
  oeeCritical: number;
  total: number;
}[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const results = await db
      .select({
        week: sql<string>`YEARWEEK(${kpiAlertStats.createdAt}, 1)`.as("week"),
        alertType: kpiAlertStats.alertType,
        count: count(),
      })
      .from(kpiAlertStats)
      .where(gte(kpiAlertStats.createdAt, startDate))
      .groupBy(sql`YEARWEEK(${kpiAlertStats.createdAt}, 1)`, kpiAlertStats.alertType)
      .orderBy(sql`YEARWEEK(${kpiAlertStats.createdAt}, 1)`);

    // Group by week
    const weekMap = new Map<string, {
      cpkDecline: number;
      oeeDecline: number;
      cpkWarning: number;
      cpkCritical: number;
      oeeWarning: number;
      oeeCritical: number;
    }>();

    for (const r of results) {
      if (!weekMap.has(r.week)) {
        weekMap.set(r.week, {
          cpkDecline: 0,
          oeeDecline: 0,
          cpkWarning: 0,
          cpkCritical: 0,
          oeeWarning: 0,
          oeeCritical: 0,
        });
      }
      const entry = weekMap.get(r.week)!;
      switch (r.alertType) {
        case "cpk_decline": entry.cpkDecline = r.count; break;
        case "oee_decline": entry.oeeDecline = r.count; break;
        case "cpk_below_warning": entry.cpkWarning = r.count; break;
        case "cpk_below_critical": entry.cpkCritical = r.count; break;
        case "oee_below_warning": entry.oeeWarning = r.count; break;
        case "oee_below_critical": entry.oeeCritical = r.count; break;
      }
    }

    return Array.from(weekMap.entries()).map(([week, stats]) => {
      // Calculate week start/end dates from YEARWEEK
      const year = parseInt(week.substring(0, 4));
      const weekNum = parseInt(week.substring(4));
      const weekStart = getDateOfISOWeek(weekNum, year);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      return {
        week: `W${weekNum}`,
        weekStart: weekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        ...stats,
        total: stats.cpkDecline + stats.oeeDecline + stats.cpkWarning + stats.cpkCritical + stats.oeeWarning + stats.oeeCritical,
      };
    });
  } catch (error) {
    console.error("Error getting KPI alert stats by week:", error);
    return [];
  }
}

/**
 * Lấy tổng hợp thống kê cảnh báo
 */
export async function getKpiAlertSummary(days: number = 30): Promise<{
  totalAlerts: number;
  byType: { type: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  byLine: { lineId: number; lineName: string; count: number }[];
  acknowledged: number;
  resolved: number;
  pending: number;
}> {
  const db = await getDb();
  if (!db) return {
    totalAlerts: 0,
    byType: [],
    bySeverity: [],
    byLine: [],
    acknowledged: 0,
    resolved: 0,
    pending: 0,
  };

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(kpiAlertStats)
      .where(gte(kpiAlertStats.createdAt, startDate));

    // By type
    const byType = await db
      .select({
        type: kpiAlertStats.alertType,
        count: count(),
      })
      .from(kpiAlertStats)
      .where(gte(kpiAlertStats.createdAt, startDate))
      .groupBy(kpiAlertStats.alertType);

    // By severity
    const bySeverity = await db
      .select({
        severity: kpiAlertStats.severity,
        count: count(),
      })
      .from(kpiAlertStats)
      .where(gte(kpiAlertStats.createdAt, startDate))
      .groupBy(kpiAlertStats.severity);

    // By production line
    const byLine = await db
      .select({
        lineId: kpiAlertStats.productionLineId,
        lineName: productionLines.name,
        count: count(),
      })
      .from(kpiAlertStats)
      .leftJoin(productionLines, eq(kpiAlertStats.productionLineId, productionLines.id))
      .where(gte(kpiAlertStats.createdAt, startDate))
      .groupBy(kpiAlertStats.productionLineId, productionLines.name);

    // Status counts
    const [acknowledgedResult] = await db
      .select({ count: count() })
      .from(kpiAlertStats)
      .where(and(
        gte(kpiAlertStats.createdAt, startDate),
        sql`${kpiAlertStats.acknowledgedAt} IS NOT NULL`
      ));

    const [resolvedResult] = await db
      .select({ count: count() })
      .from(kpiAlertStats)
      .where(and(
        gte(kpiAlertStats.createdAt, startDate),
        sql`${kpiAlertStats.resolvedAt} IS NOT NULL`
      ));

    const total = totalResult?.count || 0;
    const acknowledged = acknowledgedResult?.count || 0;
    const resolved = resolvedResult?.count || 0;

    return {
      totalAlerts: total,
      byType: byType.map(t => ({ type: t.type, count: t.count })),
      bySeverity: bySeverity.map(s => ({ severity: s.severity, count: s.count })),
      byLine: byLine
        .filter(l => l.lineId !== null)
        .map(l => ({
          lineId: l.lineId!,
          lineName: l.lineName || `Line ${l.lineId}`,
          count: l.count,
        })),
      acknowledged,
      resolved,
      pending: total - resolved,
    };
  } catch (error) {
    console.error("Error getting KPI alert summary:", error);
    return {
      totalAlerts: 0,
      byType: [],
      bySeverity: [],
      byLine: [],
      acknowledged: 0,
      resolved: 0,
      pending: 0,
    };
  }
}

/**
 * Export thống kê cảnh báo KPI ra Excel
 */
export async function exportKpiAlertStatsToExcel(params: {
  startDate?: Date;
  endDate?: Date;
  productionLineId?: number;
}): Promise<Buffer> {
  const { alerts } = await getKpiAlertStats({
    startDate: params.startDate,
    endDate: params.endDate,
    productionLineId: params.productionLineId,
    limit: 10000,
  });

  const summary = await getKpiAlertSummary(
    params.startDate && params.endDate
      ? Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SPC/CPK Calculator";
  workbook.created = new Date();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet("Tổng hợp");
  summarySheet.columns = [
    { header: "Chỉ số", key: "metric", width: 30 },
    { header: "Giá trị", key: "value", width: 20 },
  ];

  summarySheet.addRows([
    { metric: "Tổng số cảnh báo", value: summary.totalAlerts },
    { metric: "Đã xác nhận", value: summary.acknowledged },
    { metric: "Đã giải quyết", value: summary.resolved },
    { metric: "Đang chờ xử lý", value: summary.pending },
    { metric: "", value: "" },
    { metric: "--- Theo loại cảnh báo ---", value: "" },
  ]);

  for (const t of summary.byType) {
    summarySheet.addRow({ metric: getAlertTypeLabel(t.type), value: t.count });
  }

  summarySheet.addRow({ metric: "", value: "" });
  summarySheet.addRow({ metric: "--- Theo mức độ ---", value: "" });
  for (const s of summary.bySeverity) {
    summarySheet.addRow({ metric: s.severity === "warning" ? "Cảnh báo" : "Nghiêm trọng", value: s.count });
  }

  summarySheet.addRow({ metric: "", value: "" });
  summarySheet.addRow({ metric: "--- Theo dây chuyền ---", value: "" });
  for (const l of summary.byLine) {
    summarySheet.addRow({ metric: l.lineName, value: l.count });
  }

  // Style header
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Sheet 2: Chi tiết
  const detailSheet = workbook.addWorksheet("Chi tiết cảnh báo");
  detailSheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Thời gian", key: "createdAt", width: 20 },
    { header: "Dây chuyền", key: "productionLineName", width: 20 },
    { header: "Máy", key: "machineName", width: 20 },
    { header: "Loại cảnh báo", key: "alertType", width: 25 },
    { header: "Mức độ", key: "severity", width: 15 },
    { header: "Giá trị hiện tại", key: "currentValue", width: 18 },
    { header: "Giá trị trước", key: "previousValue", width: 18 },
    { header: "Ngưỡng", key: "thresholdValue", width: 15 },
    { header: "% Thay đổi", key: "changePercent", width: 15 },
    { header: "Nội dung", key: "alertMessage", width: 40 },
    { header: "Email", key: "emailSent", width: 10 },
    { header: "Thông báo", key: "notificationSent", width: 12 },
    { header: "Đã xác nhận", key: "acknowledged", width: 15 },
    { header: "Đã giải quyết", key: "resolved", width: 15 },
  ];

  for (const alert of alerts) {
    detailSheet.addRow({
      id: alert.id,
      createdAt: alert.createdAt.toLocaleString("vi-VN"),
      productionLineName: alert.productionLineName || "-",
      machineName: alert.machineName || "-",
      alertType: getAlertTypeLabel(alert.alertType),
      severity: alert.severity === "warning" ? "Cảnh báo" : "Nghiêm trọng",
      currentValue: alert.currentValue || "-",
      previousValue: alert.previousValue || "-",
      thresholdValue: alert.thresholdValue || "-",
      changePercent: alert.changePercent ? `${alert.changePercent}%` : "-",
      alertMessage: alert.alertMessage || "-",
      emailSent: alert.emailSent ? "Có" : "Không",
      notificationSent: alert.notificationSent ? "Có" : "Không",
      acknowledged: alert.acknowledgedAt ? "Có" : "Không",
      resolved: alert.resolvedAt ? "Có" : "Không",
    });
  }

  // Style header
  detailSheet.getRow(1).font = { bold: true };
  detailSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  detailSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Sheet 3: Thống kê theo ngày
  const dailyStats = await getKpiAlertStatsByDay(30);
  const dailySheet = workbook.addWorksheet("Theo ngày");
  dailySheet.columns = [
    { header: "Ngày", key: "date", width: 15 },
    { header: "CPK giảm", key: "cpkDecline", width: 12 },
    { header: "OEE giảm", key: "oeeDecline", width: 12 },
    { header: "CPK < Warning", key: "cpkWarning", width: 15 },
    { header: "CPK < Critical", key: "cpkCritical", width: 15 },
    { header: "OEE < Warning", key: "oeeWarning", width: 15 },
    { header: "OEE < Critical", key: "oeeCritical", width: 15 },
    { header: "Tổng", key: "total", width: 10 },
  ];

  for (const stat of dailyStats) {
    dailySheet.addRow(stat);
  }

  dailySheet.getRow(1).font = { bold: true };
  dailySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  dailySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export thống kê cảnh báo KPI ra PDF (HTML format)
 */
export async function exportKpiAlertStatsToPdf(params: {
  startDate?: Date;
  endDate?: Date;
  productionLineId?: number;
}): Promise<string> {
  const { alerts } = await getKpiAlertStats({
    startDate: params.startDate,
    endDate: params.endDate,
    productionLineId: params.productionLineId,
    limit: 1000,
  });

  const summary = await getKpiAlertSummary(
    params.startDate && params.endDate
      ? Math.ceil((params.endDate.getTime() - params.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30
  );

  const dailyStats = await getKpiAlertStatsByDay(14);

  const dateRange = params.startDate && params.endDate
    ? `${params.startDate.toLocaleDateString("vi-VN")} - ${params.endDate.toLocaleDateString("vi-VN")}`
    : "30 ngày gần nhất";

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo Thống kê Cảnh báo KPI</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .summary-card .label { font-size: 12px; color: #64748b; margin-top: 5px; }
    .summary-card.warning { border-color: #f59e0b; }
    .summary-card.warning .value { color: #f59e0b; }
    .summary-card.critical { border-color: #ef4444; }
    .summary-card.critical .value { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
    th { background: #2563eb; color: white; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .chart-container { margin: 20px 0; }
    .bar-chart { display: flex; align-items: flex-end; height: 150px; gap: 10px; }
    .bar { background: #3b82f6; border-radius: 4px 4px 0 0; min-width: 30px; }
    .bar-label { font-size: 10px; text-align: center; margin-top: 5px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; }
  </style>
</head>
<body>
  <h1>📊 Báo cáo Thống kê Cảnh báo KPI</h1>
  <p><strong>Khoảng thời gian:</strong> ${dateRange}</p>
  <p><strong>Ngày xuất báo cáo:</strong> ${new Date().toLocaleString("vi-VN")}</p>

  <h2>Tổng quan</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${summary.totalAlerts}</div>
      <div class="label">Tổng cảnh báo</div>
    </div>
    <div class="summary-card warning">
      <div class="value">${summary.bySeverity.find(s => s.severity === "warning")?.count || 0}</div>
      <div class="label">Cảnh báo</div>
    </div>
    <div class="summary-card critical">
      <div class="value">${summary.bySeverity.find(s => s.severity === "critical")?.count || 0}</div>
      <div class="label">Nghiêm trọng</div>
    </div>
    <div class="summary-card">
      <div class="value">${summary.resolved}</div>
      <div class="label">Đã giải quyết</div>
    </div>
  </div>

  <h2>Phân loại theo loại cảnh báo</h2>
  <table>
    <tr>
      <th>Loại cảnh báo</th>
      <th>Số lượng</th>
      <th>Tỷ lệ</th>
    </tr>
    ${summary.byType.map(t => `
      <tr>
        <td>${getAlertTypeLabel(t.type)}</td>
        <td>${t.count}</td>
        <td>${summary.totalAlerts > 0 ? ((t.count / summary.totalAlerts) * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join("")}
  </table>

  <h2>Phân loại theo dây chuyền</h2>
  <table>
    <tr>
      <th>Dây chuyền</th>
      <th>Số lượng</th>
      <th>Tỷ lệ</th>
    </tr>
    ${summary.byLine.map(l => `
      <tr>
        <td>${l.lineName}</td>
        <td>${l.count}</td>
        <td>${summary.totalAlerts > 0 ? ((l.count / summary.totalAlerts) * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join("")}
  </table>

  <h2>Xu hướng 14 ngày gần nhất</h2>
  <table>
    <tr>
      <th>Ngày</th>
      <th>CPK giảm</th>
      <th>OEE giảm</th>
      <th>CPK < Warning</th>
      <th>CPK < Critical</th>
      <th>OEE < Warning</th>
      <th>OEE < Critical</th>
      <th>Tổng</th>
    </tr>
    ${dailyStats.map(s => `
      <tr>
        <td>${s.date}</td>
        <td>${s.cpkDecline}</td>
        <td>${s.oeeDecline}</td>
        <td>${s.cpkWarning}</td>
        <td>${s.cpkCritical}</td>
        <td>${s.oeeWarning}</td>
        <td>${s.oeeCritical}</td>
        <td><strong>${s.total}</strong></td>
      </tr>
    `).join("")}
  </table>

  <h2>Chi tiết cảnh báo gần nhất (Top 50)</h2>
  <table>
    <tr>
      <th>Thời gian</th>
      <th>Dây chuyền</th>
      <th>Loại</th>
      <th>Mức độ</th>
      <th>Giá trị</th>
      <th>Nội dung</th>
    </tr>
    ${alerts.slice(0, 50).map(a => `
      <tr>
        <td>${a.createdAt.toLocaleString("vi-VN")}</td>
        <td>${a.productionLineName || "-"}</td>
        <td>${getAlertTypeLabel(a.alertType)}</td>
        <td><span class="badge badge-${a.severity}">${a.severity === "warning" ? "Cảnh báo" : "Nghiêm trọng"}</span></td>
        <td>${a.currentValue || "-"}</td>
        <td>${a.alertMessage || "-"}</td>
      </tr>
    `).join("")}
  </table>

  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} Foutec Digital - All rights reserved</p>
  </div>
</body>
</html>
  `;
}

/**
 * Gửi push notification khi có cảnh báo KPI mới
 */
export async function sendKpiAlertPushNotification(alertId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const [alert] = await db
      .select({
        alert: kpiAlertStats,
        lineName: productionLines.name,
      })
      .from(kpiAlertStats)
      .leftJoin(productionLines, eq(kpiAlertStats.productionLineId, productionLines.id))
      .where(eq(kpiAlertStats.id, alertId))
      .limit(1);

    if (!alert) return false;

    const title = `⚠️ Cảnh báo KPI ${alert.alert.severity === "critical" ? "NGHIÊM TRỌNG" : ""}`;
    const content = `
${getAlertTypeLabel(alert.alert.alertType)}
Dây chuyền: ${alert.lineName || "Không xác định"}
Giá trị hiện tại: ${alert.alert.currentValue || "N/A"}
${alert.alert.changePercent ? `Thay đổi: ${alert.alert.changePercent}%` : ""}
${alert.alert.alertMessage || ""}
    `.trim();

    // Gửi notification cho owner
    await notifyOwner({ title, content });

    // Cập nhật trạng thái đã gửi notification
    await db
      .update(kpiAlertStats)
      .set({ notificationSent: 1 })
      .where(eq(kpiAlertStats.id, alertId));

    return true;
  } catch (error) {
    console.error("Error sending KPI alert push notification:", error);
    return false;
  }
}

/**
 * Gửi email cảnh báo KPI
 */
export async function sendKpiAlertEmail(alertId: number, recipients: string[]): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const [alert] = await db
      .select({
        alert: kpiAlertStats,
        lineName: productionLines.name,
      })
      .from(kpiAlertStats)
      .leftJoin(productionLines, eq(kpiAlertStats.productionLineId, productionLines.id))
      .where(eq(kpiAlertStats.id, alertId))
      .limit(1);

    if (!alert || recipients.length === 0) return false;

    const subject = `⚠️ Cảnh báo KPI: ${getAlertTypeLabel(alert.alert.alertType)} - ${alert.lineName || "Hệ thống"}`;
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${alert.alert.severity === "critical" ? "#ef4444" : "#f59e0b"}; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
    .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; }
    .footer { background: #1e293b; color: #94a3b8; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
    .metric { display: inline-block; margin: 10px; padding: 10px 20px; background: white; border-radius: 8px; }
    .metric .value { font-size: 24px; font-weight: bold; color: #2563eb; }
    .metric .label { font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>⚠️ ${alert.alert.severity === "critical" ? "CẢNH BÁO NGHIÊM TRỌNG" : "Cảnh báo KPI"}</h2>
    </div>
    <div class="content">
      <h3>${getAlertTypeLabel(alert.alert.alertType)}</h3>
      <p><strong>Dây chuyền:</strong> ${alert.lineName || "Không xác định"}</p>
      <p><strong>Thời gian:</strong> ${alert.alert.createdAt.toLocaleString("vi-VN")}</p>
      
      <div style="margin: 20px 0;">
        <div class="metric">
          <div class="value">${alert.alert.currentValue || "N/A"}</div>
          <div class="label">Giá trị hiện tại</div>
        </div>
        ${alert.alert.previousValue ? `
        <div class="metric">
          <div class="value">${alert.alert.previousValue}</div>
          <div class="label">Giá trị trước</div>
        </div>
        ` : ""}
        ${alert.alert.changePercent ? `
        <div class="metric">
          <div class="value" style="color: ${parseFloat(alert.alert.changePercent) < 0 ? "#ef4444" : "#22c55e"}">${alert.alert.changePercent}%</div>
          <div class="label">Thay đổi</div>
        </div>
        ` : ""}
      </div>
      
      ${alert.alert.alertMessage ? `<p><strong>Chi tiết:</strong> ${alert.alert.alertMessage}</p>` : ""}
      
      <p style="margin-top: 20px;">
        <a href="#" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Xem chi tiết trên Dashboard
        </a>
      </p>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ Hệ thống SPC/CPK Calculator</p>
      <p>© ${new Date().getFullYear()} Foutec Digital</p>
    </div>
  </div>
</body>
</html>
    `;

    await sendEmail(recipients, subject, html);

    // Cập nhật trạng thái đã gửi email
    await db
      .update(kpiAlertStats)
      .set({ emailSent: 1 })
      .where(eq(kpiAlertStats.id, alertId));

    return true;
  } catch (error) {
    console.error("Error sending KPI alert email:", error);
    return false;
  }
}

// Helper functions
function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cpk_decline: "CPK giảm so với tuần trước",
    oee_decline: "OEE giảm so với tuần trước",
    cpk_below_warning: "CPK dưới ngưỡng cảnh báo",
    cpk_below_critical: "CPK dưới ngưỡng nghiêm trọng",
    oee_below_warning: "OEE dưới ngưỡng cảnh báo",
    oee_below_critical: "OEE dưới ngưỡng nghiêm trọng",
  };
  return labels[type] || type;
}

function getDateOfISOWeek(week: number, year: number): Date {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}
