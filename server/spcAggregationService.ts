/**
 * SPC Aggregation Service
 * Tự động tổng hợp dữ liệu SPC từ spc_analysis_history vào spc_summary_stats
 * theo các chu kỳ: ca (shift), ngày (day), tuần (week), tháng (month)
 */

import { getDb } from './db';
import { spcAnalysisHistory, spcSummaryStats, spcSamplingPlans } from '../drizzle/schema';
import { eq, and, gte, lte, sql, desc, asc } from 'drizzle-orm';

// Định nghĩa ca làm việc (shifts)
export const SHIFT_DEFINITIONS = {
  morning: { name: 'Ca sáng', startHour: 6, endHour: 14 },
  afternoon: { name: 'Ca chiều', startHour: 14, endHour: 22 },
  night: { name: 'Ca đêm', startHour: 22, endHour: 6 }, // Qua ngày
} as const;

export type ShiftType = keyof typeof SHIFT_DEFINITIONS;

/**
 * Xác định ca làm việc từ giờ
 */
export function getShiftFromHour(hour: number): ShiftType {
  if (hour >= 6 && hour < 14) return 'morning';
  if (hour >= 14 && hour < 22) return 'afternoon';
  return 'night';
}

/**
 * Lấy thời gian bắt đầu và kết thúc của ca
 */
export function getShiftTimeRange(date: Date, shift: ShiftType): { start: Date; end: Date } {
  const startDate = new Date(date);
  const endDate = new Date(date);
  
  const shiftDef = SHIFT_DEFINITIONS[shift];
  
  startDate.setHours(shiftDef.startHour, 0, 0, 0);
  
  if (shift === 'night') {
    // Ca đêm kết thúc vào ngày hôm sau
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(shiftDef.endHour, 0, 0, 0);
  } else {
    endDate.setHours(shiftDef.endHour, 0, 0, 0);
  }
  
  return { start: startDate, end: endDate };
}

/**
 * Lấy thời gian bắt đầu và kết thúc của ngày
 */
export function getDayTimeRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Lấy thời gian bắt đầu và kết thúc của tuần (Thứ 2 - Chủ nhật)
 */
export function getWeekTimeRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Điều chỉnh về thứ 2
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Lấy thời gian bắt đầu và kết thúc của tháng
 */
export function getMonthTimeRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Tính toán các chỉ số thống kê từ danh sách giá trị
 */
function calculateStatistics(values: number[]) {
  if (values.length === 0) {
    return {
      mean: null,
      stdDev: null,
      min: null,
      max: null,
      range: null,
    };
  }
  
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1 || 1);
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  
  return { mean, stdDev, min, max, range };
}

/**
 * Xác định trạng thái tổng quan từ CPK
 */
function determineOverallStatus(cpk: number | null): "excellent" | "good" | "acceptable" | "needs_improvement" | "critical" {
  if (cpk === null) return 'needs_improvement';
  if (cpk >= 1.67) return 'excellent';
  if (cpk >= 1.33) return 'good';
  if (cpk >= 1.0) return 'acceptable';
  if (cpk >= 0.67) return 'needs_improvement';
  return 'critical';
}

/**
 * Tổng hợp dữ liệu SPC cho một kế hoạch theo chu kỳ
 */
export async function aggregateSpcData(
  planId: number,
  periodType: 'shift' | 'day' | 'week' | 'month',
  periodStart: Date,
  periodEnd: Date
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    // Lấy thông tin kế hoạch SPC
    const plan = await db.select().from(spcSamplingPlans)
      .where(eq(spcSamplingPlans.id, planId))
      .limit(1);
    
    if (plan.length === 0) {
      console.error(`SPC Plan ${planId} not found`);
      return false;
    }
    
    const planData = plan[0];
    
    // Lấy dữ liệu phân tích SPC trong khoảng thời gian
    const analysisData = await db.select().from(spcAnalysisHistory)
      .where(and(
        planData.mappingId ? eq(spcAnalysisHistory.mappingId, planData.mappingId) : sql`1=1`,
        gte(spcAnalysisHistory.createdAt, periodStart),
        lte(spcAnalysisHistory.createdAt, periodEnd)
      ))
      .orderBy(asc(spcAnalysisHistory.createdAt));
    
    if (analysisData.length === 0) {
      console.log(`No analysis data found for plan ${planId} in period ${periodStart.toISOString()} - ${periodEnd.toISOString()}`);
      return true; // Không có lỗi, chỉ là không có dữ liệu
    }
    
    // Tính toán thống kê - các giá trị trong DB đã được nhân 10000 hoặc 1000
    const cpkValues = analysisData.map(d => d.cpk).filter((v): v is number => v !== null);
    const cpValues = analysisData.map(d => d.cp).filter((v): v is number => v !== null);
    const meanValues = analysisData.map(d => d.mean).filter((v): v is number => v !== null);
    const stdDevValues = analysisData.map(d => d.stdDev).filter((v): v is number => v !== null);
    
    const stats = calculateStatistics(meanValues);
    
    // Đếm vi phạm dựa trên alertTriggered
    let outOfSpecCount = 0;
    let outOfControlCount = 0;
    
    for (const analysis of analysisData) {
      // alertTriggered = 1 nghĩa là có cảnh báo CPK
      if (analysis.alertTriggered === 1) {
        outOfSpecCount++;
      }
      
      // Kiểm tra out of control dựa trên UCL/LCL
      if (analysis.ucl !== null && analysis.lcl !== null && analysis.mean !== null) {
        if (analysis.mean > analysis.ucl || analysis.mean < analysis.lcl) {
          outOfControlCount++;
        }
      }
    }
    
    // Tính CPK trung bình (giá trị đã được nhân 1000 trong DB)
    const avgCpk = cpkValues.length > 0 
      ? cpkValues.reduce((sum, v) => sum + v, 0) / cpkValues.length 
      : null;
    
    const avgCp = cpValues.length > 0
      ? cpValues.reduce((sum, v) => sum + v, 0) / cpValues.length
      : null;
    
    const avgStdDev = stdDevValues.length > 0
      ? stdDevValues.reduce((sum, v) => sum + v, 0) / stdDevValues.length
      : null;
    
    // Kiểm tra xem đã có record chưa
    const existing = await db.select().from(spcSummaryStats)
      .where(and(
        eq(spcSummaryStats.planId, planId),
        eq(spcSummaryStats.periodType, periodType),
        eq(spcSummaryStats.periodStart, periodStart)
      ))
      .limit(1);
    
    // Chuyển đổi CPK về dạng thực để xác định status (CPK trong DB đã nhân 1000)
    const realCpk = avgCpk !== null ? avgCpk / 1000 : null;
    
    const summaryData = {
      planId,
      productionLineId: planData.productionLineId,
      mappingId: planData.mappingId,
      periodType,
      periodStart,
      periodEnd,
      sampleCount: analysisData.reduce((sum, d) => sum + d.sampleCount, 0),
      subgroupCount: analysisData.length,
      mean: stats.mean !== null ? Math.round(stats.mean) : null, // Đã là dạng nhân 10000
      stdDev: avgStdDev !== null ? Math.round(avgStdDev) : null, // Đã là dạng nhân 10000
      min: stats.min !== null ? Math.round(stats.min) : null,
      max: stats.max !== null ? Math.round(stats.max) : null,
      range: stats.range !== null ? Math.round(stats.range) : null,
      cp: avgCp !== null ? Math.round(avgCp) : null, // Đã là dạng nhân 1000
      cpk: avgCpk !== null ? Math.round(avgCpk) : null, // Đã là dạng nhân 1000
      pp: null,
      ppk: null,
      ca: null,
      xBarUcl: null,
      xBarLcl: null,
      rUcl: null,
      rLcl: null,
      outOfSpecCount,
      outOfControlCount,
      rule1Violations: 0,
      rule2Violations: 0,
      rule3Violations: 0,
      rule4Violations: 0,
      rule5Violations: 0,
      rule6Violations: 0,
      rule7Violations: 0,
      rule8Violations: 0,
      overallStatus: determineOverallStatus(realCpk),
    };
    
    if (existing.length > 0) {
      // Update existing record
      await db.update(spcSummaryStats)
        .set(summaryData)
        .where(eq(spcSummaryStats.id, existing[0].id));
      console.log(`Updated summary stats for plan ${planId}, period ${periodType}, start ${periodStart.toISOString()}`);
    } else {
      // Insert new record
      await db.insert(spcSummaryStats).values(summaryData);
      console.log(`Inserted summary stats for plan ${planId}, period ${periodType}, start ${periodStart.toISOString()}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error aggregating SPC data:', error);
    return false;
  }
}

/**
 * Tổng hợp dữ liệu SPC cho tất cả kế hoạch đang hoạt động
 */
export async function aggregateAllActivePlans(periodType: 'shift' | 'day' | 'week' | 'month'): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  try {
    // Lấy tất cả kế hoạch đang hoạt động
    const activePlans = await db.select().from(spcSamplingPlans)
      .where(eq(spcSamplingPlans.status, 'active'));
    
    let successCount = 0;
    const now = new Date();
    
    for (const plan of activePlans) {
      let timeRange: { start: Date; end: Date };
      
      switch (periodType) {
        case 'shift':
          const currentShift = getShiftFromHour(now.getHours());
          timeRange = getShiftTimeRange(now, currentShift);
          break;
        case 'day':
          timeRange = getDayTimeRange(now);
          break;
        case 'week':
          timeRange = getWeekTimeRange(now);
          break;
        case 'month':
          timeRange = getMonthTimeRange(now);
          break;
      }
      
      const success = await aggregateSpcData(plan.id, periodType, timeRange.start, timeRange.end);
      if (success) successCount++;
    }
    
    return successCount;
  } catch (error) {
    console.error('Error aggregating all active plans:', error);
    return 0;
  }
}

/**
 * Tổng hợp dữ liệu SPC cho một kế hoạch cụ thể (tất cả các chu kỳ)
 */
export async function aggregatePlanAllPeriods(planId: number): Promise<boolean> {
  const now = new Date();
  const currentShift = getShiftFromHour(now.getHours());
  
  const shiftRange = getShiftTimeRange(now, currentShift);
  const dayRange = getDayTimeRange(now);
  const weekRange = getWeekTimeRange(now);
  const monthRange = getMonthTimeRange(now);
  
  const results = await Promise.all([
    aggregateSpcData(planId, 'shift', shiftRange.start, shiftRange.end),
    aggregateSpcData(planId, 'day', dayRange.start, dayRange.end),
    aggregateSpcData(planId, 'week', weekRange.start, weekRange.end),
    aggregateSpcData(planId, 'month', monthRange.start, monthRange.end),
  ]);
  
  return results.every(r => r);
}

/**
 * Tổng hợp dữ liệu SPC cho khoảng thời gian trong quá khứ
 * Dùng để backfill dữ liệu lịch sử
 */
export async function backfillSpcSummary(
  planId: number,
  periodType: 'shift' | 'day' | 'week' | 'month',
  startDate: Date,
  endDate: Date
): Promise<number> {
  let successCount = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    let timeRange: { start: Date; end: Date };
    let increment: number;
    
    switch (periodType) {
      case 'shift':
        // Xử lý 3 ca mỗi ngày
        for (const shift of ['morning', 'afternoon', 'night'] as ShiftType[]) {
          timeRange = getShiftTimeRange(current, shift);
          if (timeRange.start <= endDate) {
            const success = await aggregateSpcData(planId, periodType, timeRange.start, timeRange.end);
            if (success) successCount++;
          }
        }
        increment = 1; // Chuyển sang ngày tiếp theo
        break;
      case 'day':
        timeRange = getDayTimeRange(current);
        if (await aggregateSpcData(planId, periodType, timeRange.start, timeRange.end)) {
          successCount++;
        }
        increment = 1;
        break;
      case 'week':
        timeRange = getWeekTimeRange(current);
        if (await aggregateSpcData(planId, periodType, timeRange.start, timeRange.end)) {
          successCount++;
        }
        increment = 7;
        break;
      case 'month':
        timeRange = getMonthTimeRange(current);
        if (await aggregateSpcData(planId, periodType, timeRange.start, timeRange.end)) {
          successCount++;
        }
        // Chuyển sang tháng tiếp theo
        current.setMonth(current.getMonth() + 1);
        continue;
    }
    
    current.setDate(current.getDate() + increment);
  }
  
  return successCount;
}

/**
 * Lấy thống kê tổng hợp theo ca cho một ngày
 */
export async function getShiftSummaryForDay(planId: number, date: Date) {
  const db = await getDb();
  if (!db) return [];
  
  const dayRange = getDayTimeRange(date);
  
  return await db.select().from(spcSummaryStats)
    .where(and(
      eq(spcSummaryStats.planId, planId),
      eq(spcSummaryStats.periodType, 'shift'),
      gte(spcSummaryStats.periodStart, dayRange.start),
      lte(spcSummaryStats.periodEnd, dayRange.end)
    ))
    .orderBy(asc(spcSummaryStats.periodStart));
}

/**
 * So sánh CPK giữa các ca
 */
export async function compareShiftCpk(planId: number, days: number = 7) {
  const db = await getDb();
  if (!db) return null;
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const summaries = await db.select().from(spcSummaryStats)
    .where(and(
      eq(spcSummaryStats.planId, planId),
      eq(spcSummaryStats.periodType, 'shift'),
      gte(spcSummaryStats.periodStart, startDate),
      lte(spcSummaryStats.periodEnd, endDate)
    ))
    .orderBy(asc(spcSummaryStats.periodStart));
  
  // Phân loại theo ca
  const shiftData: Record<string, { cpkValues: number[]; count: number }> = {
    morning: { cpkValues: [], count: 0 },
    afternoon: { cpkValues: [], count: 0 },
    night: { cpkValues: [], count: 0 },
  };
  
  for (const summary of summaries) {
    const hour = summary.periodStart.getHours();
    const shift = getShiftFromHour(hour);
    
    if (summary.cpk !== null) {
      shiftData[shift].cpkValues.push(summary.cpk / 1000); // Convert back from stored format
    }
    shiftData[shift].count++;
  }
  
  // Tính trung bình CPK cho mỗi ca
  const result = Object.entries(shiftData).map(([shift, data]) => ({
    shift,
    shiftName: SHIFT_DEFINITIONS[shift as ShiftType].name,
    avgCpk: data.cpkValues.length > 0 
      ? data.cpkValues.reduce((sum, v) => sum + v, 0) / data.cpkValues.length 
      : null,
    minCpk: data.cpkValues.length > 0 ? Math.min(...data.cpkValues) : null,
    maxCpk: data.cpkValues.length > 0 ? Math.max(...data.cpkValues) : null,
    sampleCount: data.count,
  }));
  
  // Tìm ca tốt nhất và tệ nhất
  const validShifts = result.filter(r => r.avgCpk !== null);
  const bestShift = validShifts.length > 0 
    ? validShifts.reduce((best, curr) => (curr.avgCpk! > best.avgCpk! ? curr : best))
    : null;
  const worstShift = validShifts.length > 0
    ? validShifts.reduce((worst, curr) => (curr.avgCpk! < worst.avgCpk! ? curr : worst))
    : null;
  
  return {
    shifts: result,
    bestShift,
    worstShift,
    periodDays: days,
  };
}

/**
 * Trigger aggregation sau mỗi phân tích SPC mới
 * Gọi hàm này sau khi lưu kết quả phân tích vào spc_analysis_history
 */
export async function triggerAggregationAfterAnalysis(planId: number): Promise<void> {
  try {
    // Chạy aggregation cho tất cả các chu kỳ
    await aggregatePlanAllPeriods(planId);
    console.log(`Aggregation triggered for plan ${planId}`);
  } catch (error) {
    console.error(`Failed to trigger aggregation for plan ${planId}:`, error);
  }
}

// Export các hàm tiện ích
export {
  calculateStatistics,
  determineOverallStatus,
};
