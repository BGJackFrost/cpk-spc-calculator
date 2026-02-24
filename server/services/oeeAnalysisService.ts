/**
 * OEE Analysis Service
 * Task: OEE-01, OEE-02, OEE-03
 * Cung cấp các hàm tính toán và phân tích OEE nâng cao
 */

import { getDb } from "../db";
import { oeeRecords, machines, productionLines, workOrders, maintenanceSchedules, sparePartTransactions, spareParts } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, asc } from "drizzle-orm";

// Types
export interface OEECalculationResult {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  plannedProductionTime: number;
  actualRunTime: number;
  downtime: number;
  idealCycleTime: number;
  totalCount: number;
  goodCount: number;
  defectCount: number;
}

export interface OEEComparisonData {
  entityId: number;
  entityName: string;
  entityType: "machine" | "line";
  currentOee: number;
  previousOee: number;
  change: number;
  changePercent: number;
  availability: number;
  performance: number;
  quality: number;
  trend: "up" | "down" | "stable";
  rank: number;
}

export interface OEEShiftReport {
  shiftId: number;
  shiftName: string;
  date: Date;
  machineId?: number;
  machineName?: string;
  productionLineId?: number;
  productionLineName?: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  totalCount: number;
  goodCount: number;
  defectCount: number;
  downtime: number;
  topLosses: Array<{ category: string; minutes: number; percent: number }>;
}

// OEE-01: Tính toán OEE tự động từ dữ liệu máy
export async function calculateOEEFromMachineData(
  machineId: number,
  startTime: Date,
  endTime: Date
): Promise<OEECalculationResult | null> {
  const db = await getDb();
  if (!db) return null;

  // Lấy dữ liệu OEE records trong khoảng thời gian
  const records = await db
    .select()
    .from(oeeRecords)
    .where(and(
      eq(oeeRecords.machineId, machineId),
      gte(oeeRecords.recordDate, startTime),
      lte(oeeRecords.recordDate, endTime)
    ));

  if (records.length === 0) return null;

  // Tổng hợp dữ liệu
  let totalPlannedTime = 0;
  let totalActualTime = 0;
  let totalCount = 0;
  let totalGoodCount = 0;
  let avgCycleTime = 0;

  records.forEach(r => {
    totalPlannedTime += r.plannedProductionTime || 0;
    totalActualTime += r.actualRunTime || 0;
    totalCount += r.totalCount || 0;
    totalGoodCount += r.goodCount || 0;
    avgCycleTime += Number(r.idealCycleTime) || 0;
  });

  avgCycleTime = avgCycleTime / records.length;

  // Tính toán OEE components
  const availability = totalPlannedTime > 0 ? (totalActualTime / totalPlannedTime) * 100 : 0;
  const performance = totalActualTime > 0 ? ((totalCount * avgCycleTime) / totalActualTime) * 100 : 0;
  const quality = totalCount > 0 ? (totalGoodCount / totalCount) * 100 : 0;
  const oee = (availability * performance * quality) / 10000;

  return {
    oee,
    availability,
    performance,
    quality,
    plannedProductionTime: totalPlannedTime,
    actualRunTime: totalActualTime,
    downtime: totalPlannedTime - totalActualTime,
    idealCycleTime: avgCycleTime,
    totalCount,
    goodCount: totalGoodCount,
    defectCount: totalCount - totalGoodCount,
  };
}

// OEE-02: So sánh OEE giữa các máy/dây chuyền
export async function compareOEE(
  entityType: "machine" | "line",
  entityIds: number[],
  startDate: Date,
  endDate: Date,
  previousStartDate?: Date,
  previousEndDate?: Date
): Promise<OEEComparisonData[]> {
  const db = await getDb();
  if (!db) return [];

  const results: OEEComparisonData[] = [];

  // Tính previous period nếu không được cung cấp
  if (!previousStartDate || !previousEndDate) {
    const periodLength = endDate.getTime() - startDate.getTime();
    previousEndDate = new Date(startDate.getTime() - 1);
    previousStartDate = new Date(previousEndDate.getTime() - periodLength);
  }

  for (const entityId of entityIds) {
    let currentData: any;
    let previousData: any;
    let entityName = "";

    if (entityType === "machine") {
      // Lấy tên máy
      const [machine] = await db.select().from(machines).where(eq(machines.id, entityId));
      entityName = machine?.name || `Machine ${entityId}`;

      // Current period
      currentData = await db
        .select({
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
          avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
          avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
          avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
        })
        .from(oeeRecords)
        .where(and(
          eq(oeeRecords.machineId, entityId),
          gte(oeeRecords.recordDate, startDate),
          lte(oeeRecords.recordDate, endDate)
        ));

      // Previous period
      previousData = await db
        .select({
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
        })
        .from(oeeRecords)
        .where(and(
          eq(oeeRecords.machineId, entityId),
          gte(oeeRecords.recordDate, previousStartDate!),
          lte(oeeRecords.recordDate, previousEndDate!)
        ));
    } else {
      // Lấy tên dây chuyền
      const [line] = await db.select().from(productionLines).where(eq(productionLines.id, entityId));
      entityName = line?.name || `Line ${entityId}`;

      // Lấy danh sách máy thuộc dây chuyền
      const lineMachines = await db
        .select({ id: machines.id })
        .from(machines)
        .where(eq(machines.productionLineId, entityId));

      const machineIds = lineMachines.map(m => m.id);
      if (machineIds.length === 0) continue;

      // Current period
      currentData = await db
        .select({
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
          avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
          avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
          avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
        })
        .from(oeeRecords)
        .where(and(
          sql`${oeeRecords.machineId} IN (${sql.join(machineIds.map(id => sql`${id}`), sql`, `)})`,
          gte(oeeRecords.recordDate, startDate),
          lte(oeeRecords.recordDate, endDate)
        ));

      // Previous period
      previousData = await db
        .select({
          avgOee: sql<number>`AVG(${oeeRecords.oee})`,
        })
        .from(oeeRecords)
        .where(and(
          sql`${oeeRecords.machineId} IN (${sql.join(machineIds.map(id => sql`${id}`), sql`, `)})`,
          gte(oeeRecords.recordDate, previousStartDate!),
          lte(oeeRecords.recordDate, previousEndDate!)
        ));
    }

    const currentOee = Number(currentData[0]?.avgOee) || 0;
    const previousOee = Number(previousData[0]?.avgOee) || 0;
    const change = currentOee - previousOee;
    const changePercent = previousOee > 0 ? (change / previousOee) * 100 : 0;

    results.push({
      entityId,
      entityName,
      entityType,
      currentOee,
      previousOee,
      change,
      changePercent,
      availability: Number(currentData[0]?.avgAvailability) || 0,
      performance: Number(currentData[0]?.avgPerformance) || 0,
      quality: Number(currentData[0]?.avgQuality) || 0,
      trend: change > 1 ? "up" : change < -1 ? "down" : "stable",
      rank: 0, // Will be set after sorting
    });
  }

  // Sort by OEE and assign ranks
  results.sort((a, b) => b.currentOee - a.currentOee);
  results.forEach((r, i) => r.rank = i + 1);

  return results;
}

// OEE-03: Tạo báo cáo OEE theo ca/ngày/tuần/tháng
export async function generateOEEReport(
  reportType: "shift" | "day" | "week" | "month",
  startDate: Date,
  endDate: Date,
  machineIds?: number[],
  productionLineIds?: number[]
): Promise<{
  summary: {
    avgOee: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
    totalRecords: number;
    bestPerformer: { name: string; oee: number };
    worstPerformer: { name: string; oee: number };
  };
  data: Array<{
    period: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    recordCount: number;
  }>;
  machineBreakdown: Array<{
    machineId: number;
    machineName: string;
    avgOee: number;
    trend: number;
  }>;
}> {
  const db = await getDb();
  if (!db) {
    return {
      summary: { avgOee: 0, avgAvailability: 0, avgPerformance: 0, avgQuality: 0, totalRecords: 0, bestPerformer: { name: "", oee: 0 }, worstPerformer: { name: "", oee: 0 } },
      data: [],
      machineBreakdown: [],
    };
  }

  // Build conditions
  const conditions = [
    gte(oeeRecords.recordDate, startDate),
    lte(oeeRecords.recordDate, endDate),
  ];

  if (machineIds && machineIds.length > 0) {
    conditions.push(sql`${oeeRecords.machineId} IN (${sql.join(machineIds.map(id => sql`${id}`), sql`, `)})`);
  }

  // Get all records
  const records = await db
    .select({
      id: oeeRecords.id,
      machineId: oeeRecords.machineId,
      machineName: machines.name,
      recordDate: oeeRecords.recordDate,
      shiftId: oeeRecords.shiftId,
      oee: oeeRecords.oee,
      availability: oeeRecords.availability,
      performance: oeeRecords.performance,
      quality: oeeRecords.quality,
    })
    .from(oeeRecords)
    .leftJoin(machines, eq(oeeRecords.machineId, machines.id))
    .where(and(...conditions))
    .orderBy(asc(oeeRecords.recordDate));

  if (records.length === 0) {
    return {
      summary: { avgOee: 0, avgAvailability: 0, avgPerformance: 0, avgQuality: 0, totalRecords: 0, bestPerformer: { name: "", oee: 0 }, worstPerformer: { name: "", oee: 0 } },
      data: [],
      machineBreakdown: [],
    };
  }

  // Group by period
  const groupedData: Record<string, { oee: number[]; availability: number[]; performance: number[]; quality: number[] }> = {};

  records.forEach(r => {
    let periodKey: string;
    const date = new Date(r.recordDate);

    switch (reportType) {
      case "shift":
        periodKey = `${date.toISOString().split("T")[0]}-S${r.shiftId || 1}`;
        break;
      case "day":
        periodKey = date.toISOString().split("T")[0];
        break;
      case "week":
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        periodKey = `W${weekStart.toISOString().split("T")[0]}`;
        break;
      case "month":
        periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
    }

    if (!groupedData[periodKey]) {
      groupedData[periodKey] = { oee: [], availability: [], performance: [], quality: [] };
    }

    groupedData[periodKey].oee.push(Number(r.oee) || 0);
    groupedData[periodKey].availability.push(Number(r.availability) || 0);
    groupedData[periodKey].performance.push(Number(r.performance) || 0);
    groupedData[periodKey].quality.push(Number(r.quality) || 0);
  });

  // Calculate averages for each period
  const data = Object.entries(groupedData).map(([period, values]) => ({
    period,
    oee: values.oee.reduce((a, b) => a + b, 0) / values.oee.length,
    availability: values.availability.reduce((a, b) => a + b, 0) / values.availability.length,
    performance: values.performance.reduce((a, b) => a + b, 0) / values.performance.length,
    quality: values.quality.reduce((a, b) => a + b, 0) / values.quality.length,
    recordCount: values.oee.length,
  }));

  // Calculate summary
  const allOee = records.map(r => Number(r.oee) || 0);
  const allAvailability = records.map(r => Number(r.availability) || 0);
  const allPerformance = records.map(r => Number(r.performance) || 0);
  const allQuality = records.map(r => Number(r.quality) || 0);

  // Machine breakdown
  const machineStats: Record<number, { name: string; oee: number[]; }> = {};
  records.forEach(r => {
    if (!r.machineId) return;
    if (!machineStats[r.machineId]) {
      machineStats[r.machineId] = { name: r.machineName || `Machine ${r.machineId}`, oee: [] };
    }
    machineStats[r.machineId].oee.push(Number(r.oee) || 0);
  });

  const machineBreakdown = Object.entries(machineStats).map(([id, stats]) => {
    const avgOee = stats.oee.reduce((a, b) => a + b, 0) / stats.oee.length;
    const trend = stats.oee.length >= 2 ? stats.oee[stats.oee.length - 1] - stats.oee[0] : 0;
    return {
      machineId: parseInt(id),
      machineName: stats.name,
      avgOee,
      trend,
    };
  }).sort((a, b) => b.avgOee - a.avgOee);

  const bestPerformer = machineBreakdown[0] || { machineName: "", avgOee: 0 };
  const worstPerformer = machineBreakdown[machineBreakdown.length - 1] || { machineName: "", avgOee: 0 };

  return {
    summary: {
      avgOee: allOee.reduce((a, b) => a + b, 0) / allOee.length,
      avgAvailability: allAvailability.reduce((a, b) => a + b, 0) / allAvailability.length,
      avgPerformance: allPerformance.reduce((a, b) => a + b, 0) / allPerformance.length,
      avgQuality: allQuality.reduce((a, b) => a + b, 0) / allQuality.length,
      totalRecords: records.length,
      bestPerformer: { name: bestPerformer.machineName, oee: bestPerformer.avgOee },
      worstPerformer: { name: worstPerformer.machineName, oee: worstPerformer.avgOee },
    },
    data,
    machineBreakdown,
  };
}

// Tính OEE realtime cho một máy
export async function getRealtimeOEE(machineId: number): Promise<OEECalculationResult | null> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return calculateOEEFromMachineData(machineId, startOfDay, now);
}

// Lấy xu hướng OEE theo ngày
export async function getOEETrend(
  machineId: number | undefined,
  days: number = 30
): Promise<Array<{ date: string; oee: number; availability: number; performance: number; quality: number }>> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const conditions = [gte(oeeRecords.recordDate, startDate)];
  if (machineId) {
    conditions.push(eq(oeeRecords.machineId, machineId));
  }

  const data = await db
    .select({
      date: sql<string>`DATE(${oeeRecords.recordDate})`,
      avgOee: sql<number>`AVG(${oeeRecords.oee})`,
      avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
      avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
      avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
    })
    .from(oeeRecords)
    .where(and(...conditions))
    .groupBy(sql`DATE(${oeeRecords.recordDate})`)
    .orderBy(sql`DATE(${oeeRecords.recordDate})`);

  return data.map(d => ({
    date: d.date,
    oee: Number(d.avgOee) || 0,
    availability: Number(d.avgAvailability) || 0,
    performance: Number(d.avgPerformance) || 0,
    quality: Number(d.avgQuality) || 0,
  }));
}
