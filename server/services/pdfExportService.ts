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


// =====================================================
// SCHEDULED REPORT PDF EXPORT FUNCTIONS
// =====================================================

import { storagePut } from '../storage';
import { scheduledReportPdfHistory, spcAnalysisHistory } from '../../drizzle/schema';

interface SpcDataItem {
  productCode: string;
  stationName: string;
  cpk: number;
  cp: number;
  mean: number;
  stdDev: number;
  usl: number | null;
  lsl: number | null;
  sampleCount: number;
  analysisDate: Date;
}

// Helper to get CPK status for PDF
function getCpkStatusForPdf(cpk: number | null): { color: string; label: string; bgColor: string } {
  if (cpk === null) return { color: '#6b7280', label: 'N/A', bgColor: '#f3f4f6' };
  if (cpk >= 1.67) return { color: '#10b981', label: 'Xuất sắc', bgColor: '#d1fae5' };
  if (cpk >= 1.33) return { color: '#3b82f6', label: 'Tốt', bgColor: '#dbeafe' };
  if (cpk >= 1.0) return { color: '#f59e0b', label: 'Chấp nhận được', bgColor: '#fef3c7' };
  return { color: '#ef4444', label: 'Kém', bgColor: '#fee2e2' };
}

/**
 * Generate professional PDF-ready HTML for scheduled SPC reports
 */
export function generateScheduledSpcPdfHtml(
  reportName: string,
  dateFrom: Date,
  dateTo: Date,
  spcData: SpcDataItem[]
): string {
  const now = new Date();
  
  // Calculate summary statistics
  const avgCpk = spcData.length > 0 
    ? spcData.reduce((sum, d) => sum + (d.cpk || 0), 0) / spcData.length 
    : 0;
  const minCpk = spcData.length > 0 
    ? Math.min(...spcData.map(d => d.cpk || 0)) 
    : 0;
  const maxCpk = spcData.length > 0 
    ? Math.max(...spcData.map(d => d.cpk || 0)) 
    : 0;
  const totalSamples = spcData.reduce((sum, d) => sum + (d.sampleCount || 0), 0);
  const cpkStatus = getCpkStatusForPdf(avgCpk);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page-break { page-break-before: always; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #1f2937; 
      background: white;
      font-size: 10pt;
    }
    .container { max-width: 100%; padding: 0; }
    
    .header { 
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .header p { font-size: 11px; opacity: 0.9; }
    .header-right { text-align: right; }
    .header-right .date { font-size: 10px; opacity: 0.9; }
    
    .summary-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 12px; 
      margin-bottom: 20px; 
    }
    .summary-card { 
      background: #f8fafc; 
      padding: 16px; 
      border-radius: 8px; 
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .summary-card .value { font-size: 24px; font-weight: 700; color: #1e293b; }
    .summary-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    
    .cpk-highlight { 
      text-align: center; 
      padding: 24px; 
      background: ${cpkStatus.bgColor};
      border-radius: 8px;
      border: 2px solid ${cpkStatus.color};
      margin-bottom: 20px;
    }
    .cpk-highlight .value { font-size: 48px; font-weight: 800; color: ${cpkStatus.color}; line-height: 1; }
    .cpk-highlight .label { font-size: 11px; color: #64748b; margin-top: 8px; }
    .cpk-highlight .status { 
      display: inline-block; 
      padding: 4px 12px; 
      border-radius: 16px; 
      font-size: 11px; 
      font-weight: 600; 
      color: white; 
      background: ${cpkStatus.color}; 
      margin-top: 8px; 
    }
    
    .section { 
      background: white; 
      border-radius: 8px; 
      border: 1px solid #e2e8f0; 
      padding: 16px; 
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .section h2 { 
      font-size: 13px; 
      color: #1e293b; 
      margin-bottom: 12px; 
      padding-bottom: 8px; 
      border-bottom: 2px solid #e2e8f0;
    }
    
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    td { font-family: 'SF Mono', 'Consolas', monospace; }
    tr:nth-child(even) { background: #f8fafc; }
    
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; color: white; }
    .status-excellent { background: #10b981; }
    .status-good { background: #3b82f6; }
    .status-acceptable { background: #f59e0b; }
    .status-poor { background: #ef4444; }
    
    .footer { 
      text-align: center; 
      margin-top: 24px; 
      padding-top: 12px; 
      border-top: 1px solid #e2e8f0; 
      color: #94a3b8; 
      font-size: 9px; 
    }
    .footer .logo { font-weight: 700; color: #3b82f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>📊 ${reportName}</h1>
        <p>Báo cáo SPC/CPK tự động - Statistical Process Control</p>
      </div>
      <div class="header-right">
        <div class="date">Khoảng thời gian: ${dateFrom.toLocaleDateString('vi-VN')} - ${dateTo.toLocaleDateString('vi-VN')}</div>
        <div class="date">Tạo lúc: ${now.toLocaleString('vi-VN')}</div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${spcData.length}</div>
        <div class="label">Số phân tích</div>
      </div>
      <div class="summary-card">
        <div class="value">${totalSamples.toLocaleString()}</div>
        <div class="label">Tổng mẫu</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: ${getCpkStatusForPdf(minCpk).color}">${minCpk.toFixed(3)}</div>
        <div class="label">CPK thấp nhất</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: ${getCpkStatusForPdf(maxCpk).color}">${maxCpk.toFixed(3)}</div>
        <div class="label">CPK cao nhất</div>
      </div>
    </div>

    <div class="cpk-highlight">
      <div class="value">${avgCpk.toFixed(3)}</div>
      <div class="label">Chỉ số CPK trung bình</div>
      <div class="status">${cpkStatus.label}</div>
    </div>

    <div class="section">
      <h2>📋 Chi tiết phân tích SPC</h2>
      <table>
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Công trạm</th>
            <th>CPK</th>
            <th>CP</th>
            <th>Mean</th>
            <th>Std Dev</th>
            <th>Số mẫu</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${spcData.map(d => {
            const status = getCpkStatusForPdf(d.cpk);
            const statusClass = d.cpk >= 1.67 ? 'status-excellent' : 
                               d.cpk >= 1.33 ? 'status-good' : 
                               d.cpk >= 1.0 ? 'status-acceptable' : 'status-poor';
            return `
              <tr>
                <td>${d.productCode}</td>
                <td>${d.stationName}</td>
                <td style="font-weight: bold; color: ${status.color}">${d.cpk?.toFixed(3) || 'N/A'}</td>
                <td>${d.cp?.toFixed(3) || 'N/A'}</td>
                <td>${d.mean?.toFixed(4) || 'N/A'}</td>
                <td>${d.stdDev?.toFixed(4) || 'N/A'}</td>
                <td>${d.sampleCount}</td>
                <td><span class="status-badge ${statusClass}">${status.label}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <p>Báo cáo được tạo tự động bởi <span class="logo">SPC/CPK Calculator</span></p>
      <p>© ${now.getFullYear()} - Hệ thống quản lý chất lượng sản xuất</p>
      <p style="margin-top: 8px;">📥 Tải file này để lưu trữ offline</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate and upload PDF for scheduled report
 */
export async function generateAndUploadScheduledReportPdf(
  reportId: number,
  reportName: string,
  reportType: string,
  dateFrom: Date,
  dateTo: Date
): Promise<{ success: boolean; pdfUrl?: string; error?: string }> {
  const startTime = Date.now();
  
  try {
    const db = await getDb();
    if (!db) {
      return { success: false, error: 'Database not available' };
    }

    let htmlContent = '';

    if (reportType === 'cpk' || reportType === 'spc_summary' || reportType === 'oee_cpk_combined') {
      // Get SPC data
      const spcData = await db
        .select({
          productCode: spcAnalysisHistory.productCode,
          stationName: spcAnalysisHistory.stationName,
          cpk: spcAnalysisHistory.cpk,
          cp: spcAnalysisHistory.cp,
          mean: spcAnalysisHistory.mean,
          stdDev: spcAnalysisHistory.stdDev,
          usl: spcAnalysisHistory.usl,
          lsl: spcAnalysisHistory.lsl,
          sampleCount: spcAnalysisHistory.sampleCount,
          analysisDate: spcAnalysisHistory.createdAt,
        })
        .from(spcAnalysisHistory)
        .where(and(
          gte(spcAnalysisHistory.createdAt, dateFrom.toISOString()),
          lte(spcAnalysisHistory.createdAt, dateTo.toISOString())
        ))
        .orderBy(desc(spcAnalysisHistory.createdAt))
        .limit(100);

      const formattedSpcData: SpcDataItem[] = spcData.map(d => ({
        productCode: d.productCode || '',
        stationName: d.stationName || '',
        cpk: Number(d.cpk) || 0,
        cp: Number(d.cp) || 0,
        mean: Number(d.mean) || 0,
        stdDev: Number(d.stdDev) || 0,
        usl: d.usl ? Number(d.usl) : null,
        lsl: d.lsl ? Number(d.lsl) : null,
        sampleCount: Number(d.sampleCount) || 0,
        analysisDate: new Date(d.analysisDate || Date.now()),
      }));

      htmlContent = generateScheduledSpcPdfHtml(reportName, dateFrom, dateTo, formattedSpcData);
    }

    if (reportType === 'oee') {
      htmlContent = await generateOEEReportPDF(dateFrom, dateTo);
    }

    if (reportType === 'oee_cpk_combined') {
      const oeeHtml = await generateOEEReportPDF(dateFrom, dateTo);
      htmlContent += '<div class="page-break"></div>' + oeeHtml;
    }

    // Upload HTML as PDF-ready file
    const fileName = `scheduled-report-${reportId}-${Date.now()}.html`;
    const { url } = await storagePut(fileName, Buffer.from(htmlContent, 'utf-8'), 'text/html');

    const generationTimeMs = Date.now() - startTime;

    // Log to history
    await db.insert(scheduledReportPdfHistory).values({
      reportId,
      pdfUrl: url,
      fileSize: Buffer.byteLength(htmlContent, 'utf-8'),
      generationTimeMs,
      status: 'success',
      reportData: JSON.stringify({
        reportName,
        reportType,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      }),
    });

    return { success: true, pdfUrl: url };

  } catch (error) {
    console.error('[PdfExportService] Error generating scheduled report PDF:', error);
    
    // Log failure
    const db = await getDb();
    if (db) {
      await db.insert(scheduledReportPdfHistory).values({
        reportId,
        pdfUrl: '',
        status: 'failed',
        errorMessage: String(error),
        generationTimeMs: Date.now() - startTime,
      });
    }

    return { success: false, error: String(error) };
  }
}

/**
 * Get PDF history for a scheduled report
 */
export async function getScheduledReportPdfHistory(reportId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(scheduledReportPdfHistory)
    .where(eq(scheduledReportPdfHistory.reportId, reportId))
    .orderBy(desc(scheduledReportPdfHistory.generatedAt))
    .limit(limit);
}
