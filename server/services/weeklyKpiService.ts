/**
 * Weekly KPI Service
 * Quản lý dữ liệu KPI theo tuần để so sánh trend nhiều tuần
 */

import { getDb } from "../db";
import { 
  weeklyKpiSnapshots, 
  spcAnalysisHistory, 
  oeeRecords,
  productionLines 
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, between } from "drizzle-orm";

export interface WeeklyKpiSnapshot {
  id: number;
  productionLineId: number;
  weekNumber: number;
  year: number;
  weekStartDate: Date;
  weekEndDate: Date;
  avgCpk: number | null;
  minCpk: number | null;
  maxCpk: number | null;
  avgOee: number | null;
  minOee: number | null;
  maxOee: number | null;
  avgDefectRate: number | null;
  totalSamples: number;
  totalDefects: number;
  shiftData: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklyKpiWithLine extends WeeklyKpiSnapshot {
  lineName: string;
  lineCode: string;
}

export interface WeeklyTrendData {
  weekNumber: number;
  year: number;
  weekLabel: string;
  weekStartDate: Date;
  weekEndDate: Date;
  avgCpk: number | null;
  minCpk: number | null;
  maxCpk: number | null;
  avgOee: number | null;
  minOee: number | null;
  maxOee: number | null;
  avgDefectRate: number | null;
  totalSamples: number;
  cpkChange?: number;
  oeeChange?: number;
  defectRateChange?: number;
}

/**
 * Get ISO week number from date
 */
function getISOWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

/**
 * Get start and end date of ISO week
 */
function getWeekDateRange(year: number, week: number): { start: Date; end: Date } {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const start = new Date(simple);
  if (dow <= 4) {
    start.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    start.setDate(simple.getDate() + 8 - simple.getDay());
  }
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Get weekly KPI snapshots for a production line
 */
export async function getWeeklyKpiSnapshots(
  lineId: number,
  weeks: number = 12
): Promise<WeeklyKpiSnapshot[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(weeklyKpiSnapshots)
    .where(eq(weeklyKpiSnapshots.productionLineId, lineId))
    .orderBy(desc(weeklyKpiSnapshots.year), desc(weeklyKpiSnapshots.weekNumber))
    .limit(weeks);

  return results.map(r => ({
    ...r,
    avgCpk: r.avgCpk ? parseFloat(String(r.avgCpk)) : null,
    minCpk: r.minCpk ? parseFloat(String(r.minCpk)) : null,
    maxCpk: r.maxCpk ? parseFloat(String(r.maxCpk)) : null,
    avgOee: r.avgOee ? parseFloat(String(r.avgOee)) : null,
    minOee: r.minOee ? parseFloat(String(r.minOee)) : null,
    maxOee: r.maxOee ? parseFloat(String(r.maxOee)) : null,
    avgDefectRate: r.avgDefectRate ? parseFloat(String(r.avgDefectRate)) : null
  }));
}

/**
 * Get weekly trend data for multiple weeks with change calculations
 */
export async function getWeeklyTrendData(
  lineId: number | null,
  weeks: number = 12
): Promise<WeeklyTrendData[]> {
  const db = await getDb();
  if (!db) return [];

  // Calculate date range for the past N weeks
  const now = new Date();
  const { week: currentWeek, year: currentYear } = getISOWeekNumber(now);
  
  const results: WeeklyTrendData[] = [];
  
  for (let i = 0; i < weeks; i++) {
    let targetWeek = currentWeek - i;
    let targetYear = currentYear;
    
    while (targetWeek <= 0) {
      targetYear--;
      targetWeek += 52;
    }
    
    const { start, end } = getWeekDateRange(targetYear, targetWeek);
    
    // Query SPC data for this week
    let spcQuery = db
      .select({
        avgCpk: sql<number>`AVG(CAST(${spcAnalysisHistory.cpk} AS DECIMAL(10,4)))`,
        minCpk: sql<number>`MIN(CAST(${spcAnalysisHistory.cpk} AS DECIMAL(10,4)))`,
        maxCpk: sql<number>`MAX(CAST(${spcAnalysisHistory.cpk} AS DECIMAL(10,4)))`,
        totalSamples: sql<number>`COUNT(*)`,
      })
      .from(spcAnalysisHistory)
      .where(
        and(
          gte(spcAnalysisHistory.createdAt, start),
          lte(spcAnalysisHistory.createdAt, end),
          lineId ? eq(spcAnalysisHistory.productionLineId, lineId) : sql`1=1`
        )
      );

    // Query OEE data for this week
    let oeeQuery = db
      .select({
        avgOee: sql<number>`AVG(${oeeRecords.oee})`,
        minOee: sql<number>`MIN(${oeeRecords.oee})`,
        maxOee: sql<number>`MAX(${oeeRecords.oee})`,
      })
      .from(oeeRecords)
      .where(
        and(
          gte(oeeRecords.recordDate, start),
          lte(oeeRecords.recordDate, end),
          lineId ? eq(oeeRecords.productionLineId, lineId) : sql`1=1`
        )
      );

    const [spcData] = await spcQuery;
    const [oeeData] = await oeeQuery;

    results.push({
      weekNumber: targetWeek,
      year: targetYear,
      weekLabel: `W${targetWeek}/${targetYear}`,
      weekStartDate: start,
      weekEndDate: end,
      avgCpk: spcData?.avgCpk || null,
      minCpk: spcData?.minCpk || null,
      maxCpk: spcData?.maxCpk || null,
      avgOee: oeeData?.avgOee || null,
      minOee: oeeData?.minOee || null,
      maxOee: oeeData?.maxOee || null,
      avgDefectRate: null, // Calculate from defect records if available
      totalSamples: spcData?.totalSamples || 0
    });
  }

  // Calculate week-over-week changes
  for (let i = 0; i < results.length - 1; i++) {
    const current = results[i];
    const previous = results[i + 1];
    
    if (current.avgCpk !== null && previous.avgCpk !== null && previous.avgCpk !== 0) {
      current.cpkChange = ((current.avgCpk - previous.avgCpk) / previous.avgCpk) * 100;
    }
    
    if (current.avgOee !== null && previous.avgOee !== null && previous.avgOee !== 0) {
      current.oeeChange = ((current.avgOee - previous.avgOee) / previous.avgOee) * 100;
    }
    
    if (current.avgDefectRate !== null && previous.avgDefectRate !== null && previous.avgDefectRate !== 0) {
      current.defectRateChange = ((current.avgDefectRate - previous.avgDefectRate) / previous.avgDefectRate) * 100;
    }
  }

  return results.reverse(); // Return in chronological order
}

/**
 * Save or update weekly KPI snapshot
 */
export async function saveWeeklySnapshot(
  lineId: number,
  weekNumber: number,
  year: number,
  data: {
    avgCpk?: number | null;
    minCpk?: number | null;
    maxCpk?: number | null;
    avgOee?: number | null;
    minOee?: number | null;
    maxOee?: number | null;
    avgDefectRate?: number | null;
    totalSamples?: number;
    totalDefects?: number;
    shiftData?: string;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { start, end } = getWeekDateRange(year, weekNumber);

  // Check if snapshot exists
  const existing = await db
    .select()
    .from(weeklyKpiSnapshots)
    .where(
      and(
        eq(weeklyKpiSnapshots.productionLineId, lineId),
        eq(weeklyKpiSnapshots.weekNumber, weekNumber),
        eq(weeklyKpiSnapshots.year, year)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    await db.update(weeklyKpiSnapshots)
      .set({
        avgCpk: data.avgCpk !== undefined ? String(data.avgCpk) : undefined,
        minCpk: data.minCpk !== undefined ? String(data.minCpk) : undefined,
        maxCpk: data.maxCpk !== undefined ? String(data.maxCpk) : undefined,
        avgOee: data.avgOee !== undefined ? String(data.avgOee) : undefined,
        minOee: data.minOee !== undefined ? String(data.minOee) : undefined,
        maxOee: data.maxOee !== undefined ? String(data.maxOee) : undefined,
        avgDefectRate: data.avgDefectRate !== undefined ? String(data.avgDefectRate) : undefined,
        totalSamples: data.totalSamples,
        totalDefects: data.totalDefects,
        shiftData: data.shiftData
      })
      .where(eq(weeklyKpiSnapshots.id, existing[0].id));
  } else {
    // Insert new
    await db.insert(weeklyKpiSnapshots).values({
      productionLineId: lineId,
      weekNumber,
      year,
      weekStartDate: start,
      weekEndDate: end,
      avgCpk: data.avgCpk !== undefined ? String(data.avgCpk) : null,
      minCpk: data.minCpk !== undefined ? String(data.minCpk) : null,
      maxCpk: data.maxCpk !== undefined ? String(data.maxCpk) : null,
      avgOee: data.avgOee !== undefined ? String(data.avgOee) : null,
      minOee: data.minOee !== undefined ? String(data.minOee) : null,
      maxOee: data.maxOee !== undefined ? String(data.maxOee) : null,
      avgDefectRate: data.avgDefectRate !== undefined ? String(data.avgDefectRate) : null,
      totalSamples: data.totalSamples || 0,
      totalDefects: data.totalDefects || 0,
      shiftData: data.shiftData || null
    });
  }
}

/**
 * Get comparison data between weeks
 */
export async function getWeekComparison(
  lineId: number | null,
  weeksToCompare: number[] // Array of week numbers to compare
): Promise<{
  weeks: Array<{
    weekNumber: number;
    year: number;
    weekLabel: string;
    avgCpk: number | null;
    avgOee: number | null;
    totalSamples: number;
  }>;
  comparison: {
    cpkTrend: "improving" | "declining" | "stable";
    oeeTrend: "improving" | "declining" | "stable";
    bestWeek: string;
    worstWeek: string;
  };
}> {
  const trendData = await getWeeklyTrendData(lineId, Math.max(...weeksToCompare) + 1);
  
  const selectedWeeks = trendData.filter(w => weeksToCompare.includes(w.weekNumber));
  
  // Calculate trends
  let cpkTrend: "improving" | "declining" | "stable" = "stable";
  let oeeTrend: "improving" | "declining" | "stable" = "stable";
  
  if (selectedWeeks.length >= 2) {
    const firstCpk = selectedWeeks[0].avgCpk;
    const lastCpk = selectedWeeks[selectedWeeks.length - 1].avgCpk;
    
    if (firstCpk !== null && lastCpk !== null) {
      const cpkDiff = lastCpk - firstCpk;
      if (cpkDiff > 0.05) cpkTrend = "improving";
      else if (cpkDiff < -0.05) cpkTrend = "declining";
    }
    
    const firstOee = selectedWeeks[0].avgOee;
    const lastOee = selectedWeeks[selectedWeeks.length - 1].avgOee;
    
    if (firstOee !== null && lastOee !== null) {
      const oeeDiff = lastOee - firstOee;
      if (oeeDiff > 2) oeeTrend = "improving";
      else if (oeeDiff < -2) oeeTrend = "declining";
    }
  }
  
  // Find best and worst weeks
  const validCpkWeeks = selectedWeeks.filter(w => w.avgCpk !== null);
  const bestWeek = validCpkWeeks.length > 0 
    ? validCpkWeeks.reduce((a, b) => (a.avgCpk || 0) > (b.avgCpk || 0) ? a : b).weekLabel
    : "N/A";
  const worstWeek = validCpkWeeks.length > 0
    ? validCpkWeeks.reduce((a, b) => (a.avgCpk || 0) < (b.avgCpk || 0) ? a : b).weekLabel
    : "N/A";

  return {
    weeks: selectedWeeks.map(w => ({
      weekNumber: w.weekNumber,
      year: w.year,
      weekLabel: w.weekLabel,
      avgCpk: w.avgCpk,
      avgOee: w.avgOee,
      totalSamples: w.totalSamples
    })),
    comparison: {
      cpkTrend,
      oeeTrend,
      bestWeek,
      worstWeek
    }
  };
}

/**
 * Get all production lines with their latest weekly KPI
 */
export async function getAllLinesWeeklyKpi(): Promise<Array<{
  lineId: number;
  lineName: string;
  lineCode: string;
  currentWeek: WeeklyTrendData | null;
  previousWeek: WeeklyTrendData | null;
  weeklyChange: {
    cpk: number | null;
    oee: number | null;
  };
}>> {
  const db = await getDb();
  if (!db) return [];

  const lines = await db.select({
    id: productionLines.id,
    name: productionLines.name,
    code: productionLines.code
  }).from(productionLines);

  const results = await Promise.all(
    lines.map(async (line) => {
      const trend = await getWeeklyTrendData(line.id, 2);
      const currentWeek = trend.length > 0 ? trend[trend.length - 1] : null;
      const previousWeek = trend.length > 1 ? trend[trend.length - 2] : null;

      let cpkChange: number | null = null;
      let oeeChange: number | null = null;

      if (currentWeek && previousWeek) {
        if (currentWeek.avgCpk !== null && previousWeek.avgCpk !== null && previousWeek.avgCpk !== 0) {
          cpkChange = ((currentWeek.avgCpk - previousWeek.avgCpk) / previousWeek.avgCpk) * 100;
        }
        if (currentWeek.avgOee !== null && previousWeek.avgOee !== null && previousWeek.avgOee !== 0) {
          oeeChange = ((currentWeek.avgOee - previousWeek.avgOee) / previousWeek.avgOee) * 100;
        }
      }

      return {
        lineId: line.id,
        lineName: line.name,
        lineCode: line.code,
        currentWeek,
        previousWeek,
        weeklyChange: {
          cpk: cpkChange,
          oee: oeeChange
        }
      };
    })
  );

  return results;
}
