import { getDb } from "./db";
import { oeeRecords, workOrders, machines, productionLines, maintenanceSchedules } from "../drizzle/schema";
import { eq, gte, lte, and, desc, sql } from "drizzle-orm";

export interface OEEReportData {
  period: { start: Date; end: Date };
  summary: {
    avgOEE: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
    totalRecords: number;
  };
  machineStats: Array<{
    machineId: number;
    machineName: string;
    avgOEE: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
    recordCount: number;
  }>;
  trends: Array<{
    date: string;
    avgOEE: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
  }>;
  recommendations: string[];
}

export interface MaintenanceReportData {
  period: { start: Date; end: Date };
  summary: {
    totalWorkOrders: number;
    completedWorkOrders: number;
    pendingWorkOrders: number;
    overdueWorkOrders: number;
    avgCompletionTime: number;
    completionRate: number;
  };
  workOrdersByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  workOrdersByPriority: Array<{
    priority: string;
    count: number;
    percentage: number;
  }>;
  upcomingSchedules: Array<{
    machineId: number;
    machineName: string;
    scheduledDate: Date;
    maintenanceType: string;
  }>;
  recommendations: string[];
}

export interface CombinedReportData {
  oee: OEEReportData;
  maintenance: MaintenanceReportData;
  correlations: {
    oeeVsMaintenance: string;
    topIssues: string[];
  };
}

// Generate OEE Report Data
export async function generateOEEReportData(
  startDate: Date,
  endDate: Date,
  machineIds?: number[],
  productionLineIds?: number[]
): Promise<OEEReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get OEE records for the period
  let query = db
    .select()
    .from(oeeRecords)
    .where(
      and(
        gte(oeeRecords.recordDate, startDate),
        lte(oeeRecords.recordDate, endDate)
      )
    );

  const records = await query;
  
  // Filter by machine IDs if provided
  const filteredRecords = machineIds && machineIds.length > 0
    ? records.filter(r => machineIds.includes(r.machineId))
    : records;

  // Calculate summary
  const totalRecords = filteredRecords.length;
  const avgOEE = totalRecords > 0 
    ? filteredRecords.reduce((sum, r) => sum + Number(r.oee || 0), 0) / totalRecords 
    : 0;
  const avgAvailability = totalRecords > 0
    ? filteredRecords.reduce((sum, r) => sum + Number(r.availability || 0), 0) / totalRecords
    : 0;
  const avgPerformance = totalRecords > 0
    ? filteredRecords.reduce((sum, r) => sum + Number(r.performance || 0), 0) / totalRecords
    : 0;
  const avgQuality = totalRecords > 0
    ? filteredRecords.reduce((sum, r) => sum + Number(r.quality || 0), 0) / totalRecords
    : 0;

  // Get machine stats
  const machineList = await db.select().from(machines);
  const machineMap = new Map(machineList.map(m => [m.id, m.name]));
  
  const machineStatsMap = new Map<number, { oee: number[]; availability: number[]; performance: number[]; quality: number[] }>();
  filteredRecords.forEach(r => {
    if (!machineStatsMap.has(r.machineId)) {
      machineStatsMap.set(r.machineId, { oee: [], availability: [], performance: [], quality: [] });
    }
    const stats = machineStatsMap.get(r.machineId)!;
    stats.oee.push(Number(r.oee || 0));
    stats.availability.push(Number(r.availability || 0));
    stats.performance.push(Number(r.performance || 0));
    stats.quality.push(Number(r.quality || 0));
  });

  const machineStats = Array.from(machineStatsMap.entries()).map(([machineId, stats]) => ({
    machineId,
    machineName: machineMap.get(machineId) || `Machine ${machineId}`,
    avgOEE: stats.oee.reduce((a, b) => a + b, 0) / stats.oee.length,
    avgAvailability: stats.availability.reduce((a, b) => a + b, 0) / stats.availability.length,
    avgPerformance: stats.performance.reduce((a, b) => a + b, 0) / stats.performance.length,
    avgQuality: stats.quality.reduce((a, b) => a + b, 0) / stats.quality.length,
    recordCount: stats.oee.length,
  }));

  // Calculate daily trends
  const trendMap = new Map<string, { oee: number[]; availability: number[]; performance: number[]; quality: number[] }>();
  filteredRecords.forEach(r => {
    const dateKey = r.recordDate.toISOString().split('T')[0];
    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { oee: [], availability: [], performance: [], quality: [] });
    }
    const trend = trendMap.get(dateKey)!;
    trend.oee.push(Number(r.oee || 0));
    trend.availability.push(Number(r.availability || 0));
    trend.performance.push(Number(r.performance || 0));
    trend.quality.push(Number(r.quality || 0));
  });

  const trends = Array.from(trendMap.entries())
    .map(([date, stats]) => ({
      date,
      avgOEE: stats.oee.reduce((a, b) => a + b, 0) / stats.oee.length,
      avgAvailability: stats.availability.reduce((a, b) => a + b, 0) / stats.availability.length,
      avgPerformance: stats.performance.reduce((a, b) => a + b, 0) / stats.performance.length,
      avgQuality: stats.quality.reduce((a, b) => a + b, 0) / stats.quality.length,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Generate recommendations
  const recommendations: string[] = [];
  if (avgOEE < 85) {
    recommendations.push(`OEE trung bình (${avgOEE.toFixed(1)}%) thấp hơn mục tiêu 85%. Cần cải thiện hiệu suất tổng thể.`);
  }
  if (avgAvailability < 90) {
    recommendations.push(`Availability (${avgAvailability.toFixed(1)}%) cần được cải thiện. Kiểm tra lịch bảo trì và giảm thời gian dừng máy.`);
  }
  if (avgPerformance < 95) {
    recommendations.push(`Performance (${avgPerformance.toFixed(1)}%) có thể được tối ưu. Xem xét tốc độ vận hành và micro-stops.`);
  }
  if (avgQuality < 99) {
    recommendations.push(`Quality (${avgQuality.toFixed(1)}%) cần chú ý. Phân tích nguyên nhân lỗi và cải thiện quy trình.`);
  }

  // Find worst performing machines
  const worstMachines = machineStats
    .filter(m => m.avgOEE < 80)
    .sort((a, b) => a.avgOEE - b.avgOEE)
    .slice(0, 3);
  
  if (worstMachines.length > 0) {
    recommendations.push(`Các máy cần ưu tiên cải thiện: ${worstMachines.map(m => `${m.machineName} (${m.avgOEE.toFixed(1)}%)`).join(', ')}`);
  }

  return {
    period: { start: startDate, end: endDate },
    summary: {
      avgOEE,
      avgAvailability,
      avgPerformance,
      avgQuality,
      totalRecords,
    },
    machineStats,
    trends,
    recommendations,
  };
}

// Generate Maintenance Report Data
export async function generateMaintenanceReportData(
  startDate: Date,
  endDate: Date,
  machineIds?: number[],
  productionLineIds?: number[]
): Promise<MaintenanceReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get work orders for the period
  const orders = await db
    .select()
    .from(workOrders)
    .where(
      and(
        gte(workOrders.createdAt, startDate),
        lte(workOrders.createdAt, endDate)
      )
    );

  // Filter by machine IDs if provided
  const filteredOrders = machineIds && machineIds.length > 0
    ? orders.filter(o => machineIds.includes(o.machineId))
    : orders;

  const totalWorkOrders = filteredOrders.length;
  const completedWorkOrders = filteredOrders.filter(o => o.status === 'completed').length;
  const pendingWorkOrders = filteredOrders.filter(o => o.status === 'pending' || o.status === 'in_progress').length;
  const overdueWorkOrders = filteredOrders.filter(o => {
    if (o.status === 'completed') return false;
    if (!o.scheduledStartAt) return false;
    return new Date(o.scheduledStartAt) < new Date();
  }).length;

  // Calculate average completion time
  const completedWithTime = filteredOrders.filter(o => o.status === 'completed' && o.completedAt && o.actualStartAt);
  const avgCompletionTime = completedWithTime.length > 0
    ? completedWithTime.reduce((sum, o) => {
        const start = new Date(o.actualStartAt!).getTime();
        const end = new Date(o.completedAt!).getTime();
        return sum + (end - start) / (1000 * 60 * 60); // hours
      }, 0) / completedWithTime.length
    : 0;

  const completionRate = totalWorkOrders > 0 ? (completedWorkOrders / totalWorkOrders) * 100 : 0;

  // Work orders by type
  const typeCount = new Map<string, number>();
  filteredOrders.forEach(o => {
    const type = o.maintenanceTypeId?.toString() || 'unknown';
    typeCount.set(type, (typeCount.get(type) || 0) + 1);
  });
  const workOrdersByType = Array.from(typeCount.entries()).map(([type, count]) => ({
    type,
    count,
    percentage: totalWorkOrders > 0 ? (count / totalWorkOrders) * 100 : 0,
  }));

  // Work orders by priority
  const priorityCount = new Map<string, number>();
  filteredOrders.forEach(o => {
    const priority = o.priority || 'medium';
    priorityCount.set(priority, (priorityCount.get(priority) || 0) + 1);
  });
  const workOrdersByPriority = Array.from(priorityCount.entries()).map(([priority, count]) => ({
    priority,
    count,
    percentage: totalWorkOrders > 0 ? (count / totalWorkOrders) * 100 : 0,
  }));

  // Get upcoming schedules
  const machineList = await db.select().from(machines);
  const machineMap = new Map(machineList.map(m => [m.id, m.name]));
  
  const schedules = await db
    .select()
    .from(maintenanceSchedules)
    .where(
      and(
        gte(maintenanceSchedules.nextDueAt, new Date()),
        lte(maintenanceSchedules.nextDueAt, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      )
    )
    .orderBy(maintenanceSchedules.nextDueAt)
    .limit(10);

  const upcomingSchedules = schedules.map(s => ({
    machineId: s.machineId,
    machineName: machineMap.get(s.machineId) || `Machine ${s.machineId}`,
    scheduledDate: s.nextDueAt!,
    maintenanceType: s.maintenanceTypeId?.toString() || 'Scheduled',
  }));

  // Generate recommendations
  const recommendations: string[] = [];
  if (completionRate < 90) {
    recommendations.push(`Tỷ lệ hoàn thành work orders (${completionRate.toFixed(1)}%) cần được cải thiện.`);
  }
  if (overdueWorkOrders > 0) {
    recommendations.push(`Có ${overdueWorkOrders} work orders quá hạn cần được xử lý ngay.`);
  }
  if (avgCompletionTime > 8) {
    recommendations.push(`Thời gian hoàn thành trung bình (${avgCompletionTime.toFixed(1)} giờ) cao. Xem xét tối ưu quy trình.`);
  }

  return {
    period: { start: startDate, end: endDate },
    summary: {
      totalWorkOrders,
      completedWorkOrders,
      pendingWorkOrders,
      overdueWorkOrders,
      avgCompletionTime,
      completionRate,
    },
    workOrdersByType,
    workOrdersByPriority,
    upcomingSchedules,
    recommendations,
  };
}

// Generate Combined Report Data
export async function generateCombinedReportData(
  startDate: Date,
  endDate: Date,
  machineIds?: number[],
  productionLineIds?: number[]
): Promise<CombinedReportData> {
  const [oee, maintenance] = await Promise.all([
    generateOEEReportData(startDate, endDate, machineIds, productionLineIds),
    generateMaintenanceReportData(startDate, endDate, machineIds, productionLineIds),
  ]);

  // Analyze correlations
  const correlations = {
    oeeVsMaintenance: oee.summary.avgOEE < 80 && maintenance.summary.overdueWorkOrders > 0
      ? "Có mối tương quan giữa OEE thấp và work orders quá hạn. Ưu tiên hoàn thành bảo trì để cải thiện OEE."
      : "OEE và tình trạng bảo trì đang ở mức ổn định.",
    topIssues: [
      ...oee.recommendations.slice(0, 2),
      ...maintenance.recommendations.slice(0, 2),
    ],
  };

  return { oee, maintenance, correlations };
}

// Generate HTML Report
export function generateHTMLReport(data: OEEReportData | MaintenanceReportData | CombinedReportData, type: string): string {
  const formatDate = (d: Date) => d.toLocaleDateString('vi-VN');
  
  let html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo ${type}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #1e3a8a; margin-top: 30px; }
    .summary { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1e40af; }
    .metric-label { font-size: 12px; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; }
    .recommendation { background: #fef3c7; padding: 10px 15px; margin: 5px 0; border-left: 4px solid #f59e0b; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
`;

  if ('oee' in data && 'maintenance' in data) {
    // Combined report
    const combined = data as CombinedReportData;
    html += `
  <h1>Báo cáo Tổng hợp OEE & Bảo trì</h1>
  <p>Kỳ báo cáo: ${formatDate(combined.oee.period.start)} - ${formatDate(combined.oee.period.end)}</p>
  
  <h2>Tổng quan OEE</h2>
  <div class="summary">
    <div class="metric"><div class="metric-value">${combined.oee.summary.avgOEE.toFixed(1)}%</div><div class="metric-label">OEE Trung bình</div></div>
    <div class="metric"><div class="metric-value">${combined.oee.summary.avgAvailability.toFixed(1)}%</div><div class="metric-label">Availability</div></div>
    <div class="metric"><div class="metric-value">${combined.oee.summary.avgPerformance.toFixed(1)}%</div><div class="metric-label">Performance</div></div>
    <div class="metric"><div class="metric-value">${combined.oee.summary.avgQuality.toFixed(1)}%</div><div class="metric-label">Quality</div></div>
  </div>
  
  <h2>Tổng quan Bảo trì</h2>
  <div class="summary">
    <div class="metric"><div class="metric-value">${combined.maintenance.summary.totalWorkOrders}</div><div class="metric-label">Tổng Work Orders</div></div>
    <div class="metric"><div class="metric-value">${combined.maintenance.summary.completedWorkOrders}</div><div class="metric-label">Đã hoàn thành</div></div>
    <div class="metric"><div class="metric-value">${combined.maintenance.summary.overdueWorkOrders}</div><div class="metric-label">Quá hạn</div></div>
    <div class="metric"><div class="metric-value">${combined.maintenance.summary.completionRate.toFixed(1)}%</div><div class="metric-label">Tỷ lệ hoàn thành</div></div>
  </div>
  
  <h2>Khuyến nghị</h2>
  ${combined.correlations.topIssues.map(r => `<div class="recommendation">${r}</div>`).join('')}
`;
  } else if ('avgOEE' in (data as OEEReportData).summary) {
    // OEE report
    const oee = data as OEEReportData;
    html += `
  <h1>Báo cáo OEE</h1>
  <p>Kỳ báo cáo: ${formatDate(oee.period.start)} - ${formatDate(oee.period.end)}</p>
  
  <div class="summary">
    <div class="metric"><div class="metric-value">${oee.summary.avgOEE.toFixed(1)}%</div><div class="metric-label">OEE Trung bình</div></div>
    <div class="metric"><div class="metric-value">${oee.summary.avgAvailability.toFixed(1)}%</div><div class="metric-label">Availability</div></div>
    <div class="metric"><div class="metric-value">${oee.summary.avgPerformance.toFixed(1)}%</div><div class="metric-label">Performance</div></div>
    <div class="metric"><div class="metric-value">${oee.summary.avgQuality.toFixed(1)}%</div><div class="metric-label">Quality</div></div>
    <div class="metric"><div class="metric-value">${oee.summary.totalRecords}</div><div class="metric-label">Số bản ghi</div></div>
  </div>
  
  <h2>Thống kê theo Máy</h2>
  <table>
    <tr><th>Máy</th><th>OEE</th><th>Availability</th><th>Performance</th><th>Quality</th><th>Số bản ghi</th></tr>
    ${oee.machineStats.map(m => `
    <tr>
      <td>${m.machineName}</td>
      <td>${m.avgOEE.toFixed(1)}%</td>
      <td>${m.avgAvailability.toFixed(1)}%</td>
      <td>${m.avgPerformance.toFixed(1)}%</td>
      <td>${m.avgQuality.toFixed(1)}%</td>
      <td>${m.recordCount}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Khuyến nghị</h2>
  ${oee.recommendations.map(r => `<div class="recommendation">${r}</div>`).join('')}
`;
  } else {
    // Maintenance report
    const maint = data as MaintenanceReportData;
    html += `
  <h1>Báo cáo Bảo trì</h1>
  <p>Kỳ báo cáo: ${formatDate(maint.period.start)} - ${formatDate(maint.period.end)}</p>
  
  <div class="summary">
    <div class="metric"><div class="metric-value">${maint.summary.totalWorkOrders}</div><div class="metric-label">Tổng Work Orders</div></div>
    <div class="metric"><div class="metric-value">${maint.summary.completedWorkOrders}</div><div class="metric-label">Đã hoàn thành</div></div>
    <div class="metric"><div class="metric-value">${maint.summary.pendingWorkOrders}</div><div class="metric-label">Đang chờ</div></div>
    <div class="metric"><div class="metric-value">${maint.summary.overdueWorkOrders}</div><div class="metric-label">Quá hạn</div></div>
    <div class="metric"><div class="metric-value">${maint.summary.completionRate.toFixed(1)}%</div><div class="metric-label">Tỷ lệ hoàn thành</div></div>
  </div>
  
  <h2>Lịch bảo trì sắp tới</h2>
  <table>
    <tr><th>Máy</th><th>Ngày dự kiến</th><th>Loại bảo trì</th></tr>
    ${maint.upcomingSchedules.map(s => `
    <tr>
      <td>${s.machineName}</td>
      <td>${formatDate(s.scheduledDate)}</td>
      <td>${s.maintenanceType}</td>
    </tr>
    `).join('')}
  </table>
  
  <h2>Khuyến nghị</h2>
  ${maint.recommendations.map(r => `<div class="recommendation">${r}</div>`).join('')}
`;
  }

  html += `
  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống CPK/SPC Calculator</p>
    <p>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</p>
  </div>
</body>
</html>
`;

  return html;
}
