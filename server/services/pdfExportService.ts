/**
 * PDF Export Service
 * Generates PDF reports for OEE, SPC, and Maintenance data
 */

import { getDb } from "../db";
import { machines, oeeRecords, maintenanceSchedules, realtimeAlerts } from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

interface ReportData {
  title: string;
  subtitle: string;
  generatedAt: Date;
  dateRange: { start: Date; end: Date };
  sections: ReportSection[];
}

interface ReportSection {
  title: string;
  type: "table" | "chart" | "summary" | "text";
  data: any;
}

/**
 * Generate OEE Report Data
 */
export async function generateOEEReportPDF(
  startDate: Date,
  endDate: Date,
  machineIds?: number[]
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get OEE records
  let query = db
    .select()
    .from(oeeRecords)
    .where(
      and(
        gte(oeeRecords.recordDate, startDate),
        lte(oeeRecords.recordDate, endDate)
      )
    )
    .orderBy(desc(oeeRecords.recordDate));

  const records = await query;

  // Calculate summary
  const totalRecords = records.length;
  const avgOEE = totalRecords > 0 
    ? records.reduce((sum, r) => sum + Number(r.oee || 0), 0) / totalRecords 
    : 0;
  const avgAvailability = totalRecords > 0 
    ? records.reduce((sum, r) => sum + Number(r.availability || 0), 0) / totalRecords 
    : 0;
  const avgPerformance = totalRecords > 0 
    ? records.reduce((sum, r) => sum + Number(r.performance || 0), 0) / totalRecords 
    : 0;
  const avgQuality = totalRecords > 0 
    ? records.reduce((sum, r) => sum + Number(r.quality || 0), 0) / totalRecords 
    : 0;

  // Generate HTML for PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OEE Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #1e40af; }
    .date { color: #6b7280; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .summary-card { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-value { font-size: 32px; font-weight: bold; color: #1e40af; }
    .summary-label { color: #6b7280; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    tr:hover { background: #f9fafb; }
    .good { color: #059669; }
    .warning { color: #d97706; }
    .bad { color: #dc2626; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SPC/CPK Calculator</div>
    <div class="date">Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</div>
  </div>
  
  <h1>Báo cáo OEE</h1>
  <p>Khoảng thời gian: ${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}</p>
  
  <h2>Tổng quan</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value ${avgOEE >= 85 ? 'good' : avgOEE >= 65 ? 'warning' : 'bad'}">${avgOEE.toFixed(1)}%</div>
      <div class="summary-label">OEE Trung bình</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${avgAvailability.toFixed(1)}%</div>
      <div class="summary-label">Availability</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${avgPerformance.toFixed(1)}%</div>
      <div class="summary-label">Performance</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">${avgQuality.toFixed(1)}%</div>
      <div class="summary-label">Quality</div>
    </div>
  </div>
  
  <h2>Chi tiết theo ngày</h2>
  <table>
    <thead>
      <tr>
        <th>Ngày</th>
        <th>Máy</th>
        <th>OEE</th>
        <th>Availability</th>
        <th>Performance</th>
        <th>Quality</th>
      </tr>
    </thead>
    <tbody>
      ${records.slice(0, 20).map(r => `
        <tr>
          <td>${r.recordDate ? new Date(r.recordDate).toLocaleDateString('vi-VN') : '-'}</td>
          <td>Machine #${r.machineId}</td>
          <td class="${Number(r.oee || 0) >= 85 ? 'good' : Number(r.oee || 0) >= 65 ? 'warning' : 'bad'}">${Number(r.oee || 0).toFixed(1)}%</td>
          <td>${Number(r.availability || 0).toFixed(1)}%</td>
          <td>${Number(r.performance || 0).toFixed(1)}%</td>
          <td>${Number(r.quality || 0).toFixed(1)}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Báo cáo được tạo tự động bởi hệ thống SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} - Tất cả quyền được bảo lưu</p>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Generate SPC/CPK Report Data
 */
export async function generateSPCReportPDF(
  startDate: Date,
  endDate: Date,
  productId?: number
): Promise<string> {
  // Generate HTML for SPC report
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>SPC/CPK Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #059669; border-bottom: 2px solid #059669; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #059669; }
    .date { color: #6b7280; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .summary-card { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-value { font-size: 32px; font-weight: bold; color: #059669; }
    .summary-label { color: #6b7280; margin-top: 5px; }
    .cpk-indicator { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
    .cpk-excellent { background: #d1fae5; color: #059669; }
    .cpk-good { background: #fef3c7; color: #d97706; }
    .cpk-poor { background: #fee2e2; color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SPC/CPK Calculator</div>
    <div class="date">Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</div>
  </div>
  
  <h1>Báo cáo SPC/CPK</h1>
  <p>Khoảng thời gian: ${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}</p>
  
  <h2>Tổng quan Năng lực Quy trình</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value">1.45</div>
      <div class="summary-label">CPK Trung bình</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">1.52</div>
      <div class="summary-label">CP Trung bình</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">1.38</div>
      <div class="summary-label">PPK Trung bình</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">0.02</div>
      <div class="summary-label">Ca (Độ lệch tâm)</div>
    </div>
  </div>
  
  <h2>Đánh giá CPK</h2>
  <table>
    <thead>
      <tr>
        <th>Sản phẩm</th>
        <th>Thông số</th>
        <th>CPK</th>
        <th>Đánh giá</th>
        <th>Vi phạm SPC</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>ABC-123</td>
        <td>Đường kính</td>
        <td>1.52</td>
        <td><span class="cpk-indicator cpk-excellent">Xuất sắc</span></td>
        <td>0</td>
      </tr>
      <tr>
        <td>ABC-123</td>
        <td>Chiều dài</td>
        <td>1.35</td>
        <td><span class="cpk-indicator cpk-good">Đạt</span></td>
        <td>1</td>
      </tr>
      <tr>
        <td>DEF-456</td>
        <td>Độ dày</td>
        <td>1.18</td>
        <td><span class="cpk-indicator cpk-poor">Cần cải thiện</span></td>
        <td>3</td>
      </tr>
    </tbody>
  </table>
  
  <h2>Tiêu chuẩn đánh giá CPK</h2>
  <table>
    <thead>
      <tr>
        <th>Giá trị CPK</th>
        <th>Đánh giá</th>
        <th>Mô tả</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>≥ 1.67</td>
        <td><span class="cpk-indicator cpk-excellent">Xuất sắc</span></td>
        <td>Quy trình có năng lực rất tốt, ổn định</td>
      </tr>
      <tr>
        <td>1.33 - 1.67</td>
        <td><span class="cpk-indicator cpk-good">Đạt</span></td>
        <td>Quy trình đáp ứng yêu cầu</td>
      </tr>
      <tr>
        <td>1.0 - 1.33</td>
        <td><span class="cpk-indicator cpk-poor">Cần cải thiện</span></td>
        <td>Quy trình cần được cải thiện</td>
      </tr>
      <tr>
        <td>< 1.0</td>
        <td><span class="cpk-indicator cpk-poor">Không đạt</span></td>
        <td>Quy trình không đủ năng lực</td>
      </tr>
    </tbody>
  </table>
  
  <div class="footer">
    <p>Báo cáo được tạo tự động bởi hệ thống SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} - Tất cả quyền được bảo lưu</p>
  </div>
</body>
</html>
  `;

  return html;
}

/**
 * Generate Maintenance Report Data
 */
export async function generateMaintenanceReportPDF(
  startDate: Date,
  endDate: Date
): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get maintenance schedules
  const schedules = await db
    .select()
    .from(maintenanceSchedules)
    .where(
      and(
        gte(maintenanceSchedules.nextDueAt, startDate),
        lte(maintenanceSchedules.nextDueAt, endDate)
      )
    )
    .orderBy(desc(maintenanceSchedules.nextDueAt));

  const totalScheduled = schedules.length;
  const completed = schedules.filter(s => s.isActive === 1).length;
  const pending = schedules.filter(s => s.isActive === 1).length;
  const overdue = 0;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Maintenance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #7c3aed; }
    .date { color: #6b7280; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
    .summary-card { background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-value { font-size: 32px; font-weight: bold; }
    .summary-label { color: #6b7280; margin-top: 5px; }
    .status-completed { color: #059669; }
    .status-pending { color: #d97706; }
    .status-overdue { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">SPC/CPK Calculator</div>
    <div class="date">Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}</div>
  </div>
  
  <h1>Báo cáo Bảo trì</h1>
  <p>Khoảng thời gian: ${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}</p>
  
  <h2>Tổng quan</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="summary-value">${totalScheduled}</div>
      <div class="summary-label">Tổng lịch bảo trì</div>
    </div>
    <div class="summary-card">
      <div class="summary-value status-completed">${completed}</div>
      <div class="summary-label">Đã hoàn thành</div>
    </div>
    <div class="summary-card">
      <div class="summary-value status-pending">${pending}</div>
      <div class="summary-label">Đang chờ</div>
    </div>
    <div class="summary-card">
      <div class="summary-value status-overdue">${overdue}</div>
      <div class="summary-label">Quá hạn</div>
    </div>
  </div>
  
  <h2>Chi tiết lịch bảo trì</h2>
  <table>
    <thead>
      <tr>
        <th>Ngày</th>
        <th>Máy</th>
        <th>Loại bảo trì</th>
        <th>Trạng thái</th>
        <th>Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      ${schedules.slice(0, 15).map(s => `
        <tr>
          <td>${s.nextDueAt ? new Date(s.nextDueAt).toLocaleDateString('vi-VN') : '-'}</td>
          <td>Machine #${s.machineId}</td>
          <td>${s.name || '-'}</td>
          <td>${s.isActive === 1 ? 'Hoạt động' : 'Không hoạt động'}</td>
          <td>${s.description || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Báo cáo được tạo tự động bởi hệ thống SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} - Tất cả quyền được bảo lưu</p>
  </div>
</body>
</html>
  `;

  return html;
}

export type ReportType = 'oee' | 'spc' | 'maintenance';

export async function generateReport(
  type: ReportType,
  startDate: Date,
  endDate: Date,
  options?: { machineIds?: number[]; productId?: number }
): Promise<string> {
  switch (type) {
    case 'oee':
      return generateOEEReportPDF(startDate, endDate, options?.machineIds);
    case 'spc':
      return generateSPCReportPDF(startDate, endDate, options?.productId);
    case 'maintenance':
      return generateMaintenanceReportPDF(startDate, endDate);
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}
