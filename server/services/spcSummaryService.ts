/**
 * SPC Summary Service
 * Tự động tổng hợp SPC Summary theo ca/ngày/tuần/tháng
 * Task: SPC-02
 */

import { getDb } from "../db";
import { 
  spcAnalysisHistory, 
  spcSummaryStats, 
  spcSamplingPlans,
  spcRuleViolations 
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, between } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, format } from "date-fns";

// Định nghĩa ca làm việc
const SHIFTS = {
  morning: { startHour: 6, endHour: 14 },
  afternoon: { startHour: 14, endHour: 22 },
  night: { startHour: 22, endHour: 6 }, // Cross midnight
};

type PeriodType = "shift" | "day" | "week" | "month";
type ShiftType = "morning" | "afternoon" | "night";

interface SummaryData {
  planId: number;
  productionLineId: number;
  mappingId?: number;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  sampleCount: number;
  subgroupCount: number;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  cp: number | null;
  cpk: number | null;
  pp: number | null;
  ppk: number | null;
  ca: number | null;
  xBarUcl: number;
  xBarLcl: number;
  rUcl: number;
  rLcl: number;
  outOfSpecCount: number;
  outOfControlCount: number;
  rule1Violations: number;
  rule2Violations: number;
  rule3Violations: number;
  rule4Violations: number;
  rule5Violations: number;
  rule6Violations: number;
  rule7Violations: number;
  rule8Violations: number;
  overallStatus: "excellent" | "good" | "acceptable" | "needs_improvement" | "critical";
}

/**
 * Xác định ca làm việc từ thời gian
 */
function getShiftFromTime(date: Date): ShiftType {
  const hour = date.getHours();
  if (hour >= 6 && hour < 14) return "morning";
  if (hour >= 14 && hour < 22) return "afternoon";
  return "night";
}

/**
 * Lấy khoảng thời gian của ca làm việc
 */
function getShiftTimeRange(date: Date, shift: ShiftType): { start: Date; end: Date } {
  const start = new Date(date);
  const end = new Date(date);
  
  const shiftConfig = SHIFTS[shift];
  
  if (shift === "night") {
    // Ca đêm: 22:00 hôm trước đến 06:00 hôm sau
    if (date.getHours() < 6) {
      // Đang ở phần sau của ca đêm (00:00 - 06:00)
      start.setDate(start.getDate() - 1);
      start.setHours(22, 0, 0, 0);
      end.setHours(6, 0, 0, 0);
    } else {
      // Đang ở phần đầu của ca đêm (22:00 - 24:00)
      start.setHours(22, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      end.setHours(6, 0, 0, 0);
    }
  } else {
    start.setHours(shiftConfig.startHour, 0, 0, 0);
    end.setHours(shiftConfig.endHour, 0, 0, 0);
  }
  
  return { start, end };
}

/**
 * Tính toán trạng thái tổng thể dựa trên CPK
 */
function calculateOverallStatus(cpk: number | null): SummaryData["overallStatus"] {
  if (cpk === null) return "needs_improvement";
  if (cpk >= 1.67) return "excellent";
  if (cpk >= 1.33) return "good";
  if (cpk >= 1.0) return "acceptable";
  if (cpk >= 0.67) return "needs_improvement";
  return "critical";
}

/**
 * Tính toán thống kê từ dữ liệu phân tích
 */
function calculateStatistics(analyses: any[]): Partial<SummaryData> {
  if (analyses.length === 0) {
    return {
      sampleCount: 0,
      subgroupCount: 0,
      mean: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      range: 0,
      cp: null,
      cpk: null,
      pp: null,
      ppk: null,
      ca: null,
      xBarUcl: 0,
      xBarLcl: 0,
      rUcl: 0,
      rLcl: 0,
      outOfSpecCount: 0,
      outOfControlCount: 0,
      rule1Violations: 0,
      rule2Violations: 0,
      rule3Violations: 0,
      rule4Violations: 0,
      rule5Violations: 0,
      rule6Violations: 0,
      rule7Violations: 0,
      rule8Violations: 0,
      overallStatus: "needs_improvement",
    };
  }

  // Tổng hợp từ các bản ghi phân tích
  let totalSamples = 0;
  let totalMean = 0;
  let totalStdDev = 0;
  let minValue = Infinity;
  let maxValue = -Infinity;
  let cpkSum = 0;
  let cpSum = 0;
  let ppkSum = 0;
  let ppSum = 0;
  let caSum = 0;
  let validCpkCount = 0;
  let outOfSpec = 0;
  let outOfControl = 0;
  const ruleViolations = [0, 0, 0, 0, 0, 0, 0, 0];

  analyses.forEach((a) => {
    totalSamples += a.sampleCount || 0;
    totalMean += (a.mean || 0) * (a.sampleCount || 1);
    totalStdDev += Math.pow(a.stdDev || 0, 2) * (a.sampleCount || 1);
    
    if (a.min !== null && a.min < minValue) minValue = a.min;
    if (a.max !== null && a.max > maxValue) maxValue = a.max;
    
    if (a.cpk !== null) {
      cpkSum += a.cpk;
      validCpkCount++;
    }
    if (a.cp !== null) cpSum += a.cp;
    if (a.ppk !== null) ppkSum += a.ppk;
    if (a.pp !== null) ppSum += a.pp;
    if (a.ca !== null) caSum += a.ca;
    
    outOfSpec += a.outOfSpecCount || 0;
    outOfControl += a.outOfControlCount || 0;
  });

  // Tính giá trị trung bình
  const avgMean = totalSamples > 0 ? totalMean / totalSamples : 0;
  const avgStdDev = totalSamples > 0 ? Math.sqrt(totalStdDev / totalSamples) : 0;
  const avgCpk = validCpkCount > 0 ? cpkSum / validCpkCount : null;
  const avgCp = validCpkCount > 0 ? cpSum / validCpkCount : null;
  const avgPpk = validCpkCount > 0 ? ppkSum / validCpkCount : null;
  const avgPp = validCpkCount > 0 ? ppSum / validCpkCount : null;
  const avgCa = validCpkCount > 0 ? caSum / validCpkCount : null;

  // Tính control limits (sử dụng giá trị trung bình từ các phân tích)
  const xBarUcl = avgMean + 3 * avgStdDev;
  const xBarLcl = avgMean - 3 * avgStdDev;
  const avgRange = maxValue - minValue;
  const rUcl = avgRange * 2.114; // D4 for n=5
  const rLcl = 0; // D3 for n=5

  return {
    sampleCount: totalSamples,
    subgroupCount: analyses.length,
    mean: Math.round(avgMean * 10000), // Store as integer * 10000
    stdDev: Math.round(avgStdDev * 10000),
    min: minValue !== Infinity ? Math.round(minValue * 10000) : 0,
    max: maxValue !== -Infinity ? Math.round(maxValue * 10000) : 0,
    range: Math.round(avgRange * 10000),
    cp: avgCp !== null ? Math.round(avgCp * 1000) : null,
    cpk: avgCpk !== null ? Math.round(avgCpk * 1000) : null,
    pp: avgPp !== null ? Math.round(avgPp * 1000) : null,
    ppk: avgPpk !== null ? Math.round(avgPpk * 1000) : null,
    ca: avgCa !== null ? Math.round(avgCa * 1000) : null,
    xBarUcl: Math.round(xBarUcl * 10000),
    xBarLcl: Math.round(xBarLcl * 10000),
    rUcl: Math.round(rUcl * 10000),
    rLcl: Math.round(rLcl * 10000),
    outOfSpecCount: outOfSpec,
    outOfControlCount: outOfControl,
    rule1Violations: ruleViolations[0],
    rule2Violations: ruleViolations[1],
    rule3Violations: ruleViolations[2],
    rule4Violations: ruleViolations[3],
    rule5Violations: ruleViolations[4],
    rule6Violations: ruleViolations[5],
    rule7Violations: ruleViolations[6],
    rule8Violations: ruleViolations[7],
    overallStatus: calculateOverallStatus(avgCpk),
  };
}

/**
 * Tổng hợp SPC Summary cho một khoảng thời gian
 */
async function aggregateSummary(
  planId: number,
  productionLineId: number,
  periodType: PeriodType,
  periodStart: Date,
  periodEnd: Date,
  mappingId?: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Lấy dữ liệu phân tích trong khoảng thời gian
  const analyses = await db
    .select()
    .from(spcAnalysisHistory)
    .where(
      and(
        gte(spcAnalysisHistory.createdAt, periodStart),
        lte(spcAnalysisHistory.createdAt, periodEnd),
        mappingId ? eq(spcAnalysisHistory.mappingId, mappingId) : undefined
      )
    );

  // Tính toán thống kê
  const stats = calculateStatistics(analyses);

  // Kiểm tra xem đã có bản ghi chưa
  const existing = await db
    .select()
    .from(spcSummaryStats)
    .where(
      and(
        eq(spcSummaryStats.planId, planId),
        eq(spcSummaryStats.periodType, periodType),
        eq(spcSummaryStats.periodStart, periodStart)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Cập nhật bản ghi hiện có
    await db
      .update(spcSummaryStats)
      .set({
        ...stats,
        periodEnd,
        mappingId,
      })
      .where(eq(spcSummaryStats.id, existing[0].id));
  } else {
    // Tạo bản ghi mới
    await db.insert(spcSummaryStats).values({
      planId,
      productionLineId,
      mappingId,
      periodType,
      periodStart,
      periodEnd,
      ...stats,
    } as any);
  }
}

/**
 * Tổng hợp SPC Summary theo ca làm việc
 */
export async function aggregateShiftSummary(
  planId: number,
  productionLineId: number,
  date: Date,
  shift: ShiftType,
  mappingId?: number
): Promise<void> {
  const { start, end } = getShiftTimeRange(date, shift);
  await aggregateSummary(planId, productionLineId, "shift", start, end, mappingId);
}

/**
 * Tổng hợp SPC Summary theo ngày
 */
export async function aggregateDailySummary(
  planId: number,
  productionLineId: number,
  date: Date,
  mappingId?: number
): Promise<void> {
  const start = startOfDay(date);
  const end = endOfDay(date);
  await aggregateSummary(planId, productionLineId, "day", start, end, mappingId);
}

/**
 * Tổng hợp SPC Summary theo tuần
 */
export async function aggregateWeeklySummary(
  planId: number,
  productionLineId: number,
  date: Date,
  mappingId?: number
): Promise<void> {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 });
  await aggregateSummary(planId, productionLineId, "week", start, end, mappingId);
}

/**
 * Tổng hợp SPC Summary theo tháng
 */
export async function aggregateMonthlySummary(
  planId: number,
  productionLineId: number,
  date: Date,
  mappingId?: number
): Promise<void> {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  await aggregateSummary(planId, productionLineId, "month", start, end, mappingId);
}

/**
 * Tự động tổng hợp tất cả các loại summary
 * Được gọi sau mỗi lần phân tích SPC
 */
export async function autoAggregateSummaries(
  planId: number,
  productionLineId: number,
  analysisTime: Date,
  mappingId?: number
): Promise<void> {
  try {
    // Xác định ca làm việc
    const shift = getShiftFromTime(analysisTime);
    
    // Tổng hợp theo ca
    await aggregateShiftSummary(planId, productionLineId, analysisTime, shift, mappingId);
    
    // Tổng hợp theo ngày
    await aggregateDailySummary(planId, productionLineId, analysisTime, mappingId);
    
    // Tổng hợp theo tuần
    await aggregateWeeklySummary(planId, productionLineId, analysisTime, mappingId);
    
    // Tổng hợp theo tháng
    await aggregateMonthlySummary(planId, productionLineId, analysisTime, mappingId);
    
    console.log(`[SPC Summary] Auto-aggregated summaries for plan ${planId} at ${analysisTime.toISOString()}`);
  } catch (error) {
    console.error("[SPC Summary] Error auto-aggregating summaries:", error);
  }
}

/**
 * Chạy tổng hợp cho tất cả các kế hoạch SPC đang hoạt động
 * Được gọi bởi scheduled job
 */
export async function runScheduledAggregation(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Lấy tất cả kế hoạch SPC đang hoạt động
    const activePlans = await db
      .select()
      .from(spcSamplingPlans)
      .where(eq(spcSamplingPlans.status, "active"));

    const now = new Date();

    for (const plan of activePlans) {
      // Tổng hợp cho ngày hôm qua
      const yesterday = subDays(now, 1);
      await aggregateDailySummary(plan.id, plan.productionLineId, yesterday, plan.mappingId || undefined);

      // Tổng hợp cho tuần trước (nếu là thứ 2)
      if (now.getDay() === 1) {
        const lastWeek = subWeeks(now, 1);
        await aggregateWeeklySummary(plan.id, plan.productionLineId, lastWeek, plan.mappingId || undefined);
      }

      // Tổng hợp cho tháng trước (nếu là ngày 1)
      if (now.getDate() === 1) {
        const lastMonth = subMonths(now, 1);
        await aggregateMonthlySummary(plan.id, plan.productionLineId, lastMonth, plan.mappingId || undefined);
      }
    }

    console.log(`[SPC Summary] Scheduled aggregation completed for ${activePlans.length} plans`);
  } catch (error) {
    console.error("[SPC Summary] Error in scheduled aggregation:", error);
  }
}

/**
 * Lấy SPC Summary theo khoảng thời gian
 */
export async function getSummaryByTimeRange(
  periodType: PeriodType,
  startTime: Date,
  endTime: Date,
  productionLineId?: number
): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [
    eq(spcSummaryStats.periodType, periodType),
    gte(spcSummaryStats.periodStart, startTime),
    lte(spcSummaryStats.periodEnd, endTime),
  ];

  if (productionLineId) {
    conditions.push(eq(spcSummaryStats.productionLineId, productionLineId));
  }

  return await db
    .select()
    .from(spcSummaryStats)
    .where(and(...conditions))
    .orderBy(desc(spcSummaryStats.periodStart));
}

/**
 * Lấy SPC Summary mới nhất cho một kế hoạch
 */
export async function getLatestSummary(
  planId: number,
  periodType: PeriodType
): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(spcSummaryStats)
    .where(
      and(
        eq(spcSummaryStats.planId, planId),
        eq(spcSummaryStats.periodType, periodType)
      )
    )
    .orderBy(desc(spcSummaryStats.periodStart))
    .limit(1);

  return result[0] || null;
}

/**
 * So sánh CPK giữa các ca làm việc
 */
export async function compareShiftCpk(
  productionLineId: number,
  startDate: Date,
  endDate: Date
): Promise<{
  morning: { avgCpk: number; count: number };
  afternoon: { avgCpk: number; count: number };
  night: { avgCpk: number; count: number };
}> {
  const db = await getDb();
  if (!db) {
    return {
      morning: { avgCpk: 0, count: 0 },
      afternoon: { avgCpk: 0, count: 0 },
      night: { avgCpk: 0, count: 0 },
    };
  }

  const summaries = await db
    .select()
    .from(spcSummaryStats)
    .where(
      and(
        eq(spcSummaryStats.productionLineId, productionLineId),
        eq(spcSummaryStats.periodType, "shift"),
        gte(spcSummaryStats.periodStart, startDate),
        lte(spcSummaryStats.periodEnd, endDate)
      )
    );

  const result = {
    morning: { avgCpk: 0, count: 0, total: 0 },
    afternoon: { avgCpk: 0, count: 0, total: 0 },
    night: { avgCpk: 0, count: 0, total: 0 },
  };

  summaries.forEach((s) => {
    const hour = new Date(s.periodStart).getHours();
    let shift: ShiftType;
    if (hour >= 6 && hour < 14) shift = "morning";
    else if (hour >= 14 && hour < 22) shift = "afternoon";
    else shift = "night";

    if (s.cpk !== null) {
      result[shift].total += s.cpk / 1000; // Convert from stored format
      result[shift].count++;
    }
  });

  // Calculate averages
  Object.keys(result).forEach((shift) => {
    const s = shift as ShiftType;
    if (result[s].count > 0) {
      result[s].avgCpk = result[s].total / result[s].count;
    }
  });

  return {
    morning: { avgCpk: result.morning.avgCpk, count: result.morning.count },
    afternoon: { avgCpk: result.afternoon.avgCpk, count: result.afternoon.count },
    night: { avgCpk: result.night.avgCpk, count: result.night.count },
  };
}
