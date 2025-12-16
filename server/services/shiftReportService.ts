import { getDb } from "../db";
import type { OeeRecord, SpcAnalysisHistory } from "../../drizzle/schema";
import { shiftReports, oeeRecords, spcAnalysisHistory, machines, productionLines } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { sendEmail } from "../emailService";

// Shift definitions
export const SHIFTS = {
  morning: { start: 6, end: 14, name: "Ca sáng" },
  afternoon: { start: 14, end: 22, name: "Ca chiều" },
  night: { start: 22, end: 6, name: "Ca đêm" }
} as const;

export type ShiftType = keyof typeof SHIFTS;

/**
 * Get current shift based on hour
 */
export function getCurrentShift(): ShiftType {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return "morning";
  if (hour >= 14 && hour < 22) return "afternoon";
  return "night";
}

/**
 * Get shift time range
 */
export function getShiftTimeRange(date: Date, shiftType: ShiftType): { start: Date; end: Date } {
  const shift = SHIFTS[shiftType];
  const start = new Date(date);
  const end = new Date(date);
  
  if (shiftType === "night") {
    // Night shift spans two days
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
 * Generate shift report for a specific shift
 */
export async function generateShiftReport(
  shiftDate: Date,
  shiftType: ShiftType,
  productionLineId?: number,
  machineId?: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { start, end } = getShiftTimeRange(shiftDate, shiftType);
  
  // Get OEE records for the shift
  const oeeData = await db.select()
    .from(oeeRecords)
    .where(and(
      gte(oeeRecords.recordDate, start),
      lte(oeeRecords.recordDate, end),
      machineId ? eq(oeeRecords.machineId, machineId) : undefined
    ));

  // Get SPC analysis history for the shift
  const spcData = await db.select()
    .from(spcAnalysisHistory)
    .where(and(
      gte(spcAnalysisHistory.createdAt, start),
      lte(spcAnalysisHistory.createdAt, end)
    ));

  // Calculate averages
  const avgOEE = oeeData.length > 0 
    ? oeeData.reduce((sum: number, r: any) => sum + Number(r.oee || 0), 0) / oeeData.length 
    : null;
  const avgAvailability = oeeData.length > 0
    ? oeeData.reduce((sum: number, r: any) => sum + Number(r.availability || 0), 0) / oeeData.length
    : null;
  const avgPerformance = oeeData.length > 0
    ? oeeData.reduce((sum: number, r: any) => sum + Number(r.performance || 0), 0) / oeeData.length
    : null;
  const avgQuality = oeeData.length > 0
    ? oeeData.reduce((sum: number, r: any) => sum + Number(r.quality || 0), 0) / oeeData.length
    : null;

  const avgCpk = spcData.length > 0
    ? spcData.reduce((sum: number, r: any) => sum + Number(r.cpk || 0), 0) / spcData.length
    : null;
  const avgCp = spcData.length > 0
    ? spcData.reduce((sum: number, r: any) => sum + Number(r.cp || 0), 0) / spcData.length
    : null;
  const avgPpk = spcData.length > 0
    ? spcData.reduce((sum: number, r: any) => sum + Number(r.ppk || 0), 0) / spcData.length
    : null;

  // Count production
  const totalProduced = oeeData.reduce((sum: number, r: any) => sum + (r.totalCount || 0), 0);
  const goodCount = oeeData.reduce((sum: number, r: any) => sum + (r.goodCount || 0), 0);
  const defectCount = oeeData.reduce((sum: number, r: any) => sum + (r.defectCount || 0), 0);

  // Count alerts and violations
  const alertCount = oeeData.filter((r: any) => Number(r.oee || 0) < 70).length;
  const spcViolationCount = spcData.filter((r: any) => Number(r.cpk || 0) < 1.0).length;

  // Generate HTML report content
  const reportContent = generateReportHTML({
    shiftDate,
    shiftType,
    shiftName: SHIFTS[shiftType].name,
    oee: avgOEE,
    availability: avgAvailability,
    performance: avgPerformance,
    quality: avgQuality,
    cpk: avgCpk,
    totalProduced,
    goodCount,
    defectCount,
    alertCount,
    spcViolationCount
  });

  // Insert report into database
  const result = await db.insert(shiftReports).values({
    shiftDate,
    shiftType,
    shiftStart: start,
    shiftEnd: end,
    productionLineId,
    machineId,
    oee: avgOEE?.toFixed(2) || null,
    availability: avgAvailability?.toFixed(2) || null,
    performance: avgPerformance?.toFixed(2) || null,
    quality: avgQuality?.toFixed(2) || null,
    cpk: avgCpk?.toFixed(4) || null,
    cp: avgCp?.toFixed(4) || null,
    ppk: avgPpk?.toFixed(4) || null,
    totalProduced,
    goodCount,
    defectCount,
    plannedTime: 480, // 8 hours in minutes
    actualRunTime: Math.round(480 * (avgAvailability || 0) / 100),
    downtime: Math.round(480 * (1 - (avgAvailability || 0) / 100)),
    alertCount,
    spcViolationCount,
    status: "generated",
    reportContent
  });

  return result[0].insertId;
}

/**
 * Generate HTML report content
 */
function generateReportHTML(data: {
  shiftDate: Date;
  shiftType: ShiftType;
  shiftName: string;
  oee: number | null;
  availability: number | null;
  performance: number | null;
  quality: number | null;
  cpk: number | null;
  totalProduced: number;
  goodCount: number;
  defectCount: number;
  alertCount: number;
  spcViolationCount: number;
}): string {
  const formatDate = (d: Date) => d.toLocaleDateString('vi-VN', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  const getOEEStatus = (oee: number | null) => {
    if (!oee) return { text: "N/A", color: "#6b7280" };
    if (oee >= 85) return { text: "Xuất sắc", color: "#22c55e" };
    if (oee >= 70) return { text: "Tốt", color: "#f59e0b" };
    return { text: "Cần cải thiện", color: "#ef4444" };
  };

  const getCPKStatus = (cpk: number | null) => {
    if (!cpk) return { text: "N/A", color: "#6b7280" };
    if (cpk >= 1.33) return { text: "Đạt chuẩn", color: "#22c55e" };
    if (cpk >= 1.0) return { text: "Chấp nhận", color: "#f59e0b" };
    return { text: "Không đạt", color: "#ef4444" };
  };

  const oeeStatus = getOEEStatus(data.oee);
  const cpkStatus = getCPKStatus(data.cpk);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Báo cáo ${data.shiftName} - ${formatDate(data.shiftDate)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0 0 10px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: #f8fafc; border-radius: 8px; padding: 20px; }
    .stat-card h3 { margin: 0 0 15px 0; font-size: 14px; color: #64748b; text-transform: uppercase; }
    .stat-value { font-size: 36px; font-weight: bold; margin-bottom: 5px; }
    .stat-label { font-size: 12px; color: #64748b; }
    .metrics-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .metrics-table th, .metrics-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    .metrics-table th { background: #f8fafc; font-weight: 600; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .alerts-section { background: #fef3c7; border-radius: 8px; padding: 20px; margin-top: 20px; }
    .alerts-section.danger { background: #fee2e2; }
    .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Báo cáo ${data.shiftName}</h1>
      <p>${formatDate(data.shiftDate)}</p>
    </div>
    
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <h3>OEE Tổng hợp</h3>
          <div class="stat-value" style="color: ${oeeStatus.color}">${data.oee?.toFixed(1) || 'N/A'}%</div>
          <div class="stat-label">
            <span class="status-badge" style="background: ${oeeStatus.color}20; color: ${oeeStatus.color}">${oeeStatus.text}</span>
          </div>
        </div>
        <div class="stat-card">
          <h3>CPK Trung bình</h3>
          <div class="stat-value" style="color: ${cpkStatus.color}">${data.cpk?.toFixed(3) || 'N/A'}</div>
          <div class="stat-label">
            <span class="status-badge" style="background: ${cpkStatus.color}20; color: ${cpkStatus.color}">${cpkStatus.text}</span>
          </div>
        </div>
      </div>

      <table class="metrics-table">
        <tr>
          <th>Chỉ số</th>
          <th>Giá trị</th>
          <th>Mục tiêu</th>
        </tr>
        <tr>
          <td>Availability</td>
          <td>${data.availability?.toFixed(1) || 'N/A'}%</td>
          <td>≥ 90%</td>
        </tr>
        <tr>
          <td>Performance</td>
          <td>${data.performance?.toFixed(1) || 'N/A'}%</td>
          <td>≥ 95%</td>
        </tr>
        <tr>
          <td>Quality</td>
          <td>${data.quality?.toFixed(1) || 'N/A'}%</td>
          <td>≥ 99%</td>
        </tr>
        <tr>
          <td>Tổng sản xuất</td>
          <td>${data.totalProduced.toLocaleString()}</td>
          <td>-</td>
        </tr>
        <tr>
          <td>Sản phẩm đạt</td>
          <td>${data.goodCount.toLocaleString()}</td>
          <td>-</td>
        </tr>
        <tr>
          <td>Phế phẩm</td>
          <td>${data.defectCount.toLocaleString()}</td>
          <td>< 1%</td>
        </tr>
      </table>

      ${(data.alertCount > 0 || data.spcViolationCount > 0) ? `
      <div class="alerts-section ${data.alertCount > 3 || data.spcViolationCount > 3 ? 'danger' : ''}">
        <h3>⚠️ Cảnh báo trong ca</h3>
        <ul>
          ${data.alertCount > 0 ? `<li>${data.alertCount} cảnh báo OEE thấp</li>` : ''}
          ${data.spcViolationCount > 0 ? `<li>${data.spcViolationCount} vi phạm SPC</li>` : ''}
        </ul>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
      <p>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send shift report via email
 */
export async function sendShiftReportEmail(
  reportId: number,
  recipients: string[]
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    // Get report from database
    const [report] = await db.select()
      .from(shiftReports)
      .where(eq(shiftReports.id, reportId))
      .limit(1);

    if (!report) {
      console.error(`Shift report ${reportId} not found`);
      return false;
    }

    const shiftName = SHIFTS[report.shiftType as ShiftType]?.name || report.shiftType;
    const dateStr = new Date(report.shiftDate).toLocaleDateString('vi-VN');

    // Send email
    await sendEmail(
      recipients,
      `[Báo cáo] ${shiftName} - ${dateStr}`,
      report.reportContent || ''
    );

    // Update report status
    await db.update(shiftReports)
      .set({
        status: "sent",
        sentAt: new Date(),
        sentTo: JSON.stringify(recipients)
      })
      .where(eq(shiftReports.id, reportId));

    return true;
  } catch (error) {
    console.error("Failed to send shift report email:", error);
    
    // Update status to failed
    await db.update(shiftReports)
      .set({ status: "failed" })
      .where(eq(shiftReports.id, reportId));
    
    return false;
  }
}

/**
 * Get shift reports with pagination
 */
export async function getShiftReports(options: {
  limit?: number;
  offset?: number;
  shiftType?: ShiftType;
  productionLineId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { limit = 20, offset = 0, shiftType, productionLineId } = options;
  
  let query = db.select().from(shiftReports);
  
  const conditions = [];
  if (shiftType) conditions.push(eq(shiftReports.shiftType, shiftType));
  if (productionLineId) conditions.push(eq(shiftReports.productionLineId, productionLineId));
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query
    .orderBy(desc(shiftReports.shiftDate))
    .limit(limit)
    .offset(offset);
}

/**
 * Get shift report by ID
 */
export async function getShiftReportById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [report] = await db.select()
    .from(shiftReports)
    .where(eq(shiftReports.id, id))
    .limit(1);
  return report;
}
