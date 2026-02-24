import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { getDb } from './db';
import {
  iotMttrMtbfStats,
  iotFailureEvents,
  iotMaintenanceWorkOrders,
} from '../drizzle/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

// Types
interface MttrMtbfReportData {
  targetType: 'device' | 'machine' | 'production_line';
  targetId: number;
  targetName: string;
  startDate: Date;
  endDate: Date;
  summary: {
    mttr: number | null;
    mtbf: number | null;
    availability: number | null;
    totalFailures: number;
    totalDowntime: number;
    totalRepairTime: number;
    correctiveWorkOrders: number;
    preventiveWorkOrders: number;
    predictiveWorkOrders: number;
    emergencyWorkOrders: number;
  };
  historicalStats: Array<{
    periodStart: string;
    periodEnd: string;
    mttr: number | null;
    mtbf: number | null;
    availability: number | null;
    failureCount: number;
  }>;
  failureEvents: Array<{
    id: number;
    failureCode: string | null;
    failureType: string | null;
    severity: string | null;
    description: string | null;
    failureStartAt: string;
    failureEndAt: string | null;
    repairDuration: number | null;
    rootCauseCategory: string | null;
    resolution: string | null;
  }>;
}

// Helper function to format duration
function formatDuration(minutes: number | null): string {
  if (!minutes) return 'N/A';
  if (minutes < 60) return `${minutes.toFixed(0)} phút`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} giờ`;
  return `${(minutes / 1440).toFixed(1)} ngày`;
}

// Helper function to format percentage
function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(1)}%`;
}

// Get report data
async function getReportData(
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number,
  startDate: Date,
  endDate: Date,
  targetName?: string
): Promise<MttrMtbfReportData> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get historical stats
  const stats = await db.select()
    .from(iotMttrMtbfStats)
    .where(and(
      eq(iotMttrMtbfStats.targetType, targetType),
      eq(iotMttrMtbfStats.targetId, targetId),
      gte(iotMttrMtbfStats.periodStart, startDate.toISOString().slice(0, 19).replace('T', ' ')),
      lte(iotMttrMtbfStats.periodEnd, endDate.toISOString().slice(0, 19).replace('T', ' '))
    ))
    .orderBy(desc(iotMttrMtbfStats.periodStart));

  // Get failure events
  const failures = await db.select()
    .from(iotFailureEvents)
    .where(and(
      eq(iotFailureEvents.targetType, targetType),
      eq(iotFailureEvents.targetId, targetId),
      gte(iotFailureEvents.failureStartAt, startDate.toISOString().slice(0, 19).replace('T', ' ')),
      lte(iotFailureEvents.failureStartAt, endDate.toISOString().slice(0, 19).replace('T', ' '))
    ))
    .orderBy(desc(iotFailureEvents.failureStartAt))
    .limit(100);

  // Calculate summary
  let totalMttr = 0;
  let totalMtbf = 0;
  let totalAvailability = 0;
  let validMttrCount = 0;
  let validMtbfCount = 0;
  let validAvailCount = 0;
  let totalFailures = 0;
  let totalDowntime = 0;
  let totalRepairTime = 0;

  stats.forEach((stat) => {
    if (stat.mttr) {
      totalMttr += Number(stat.mttr);
      validMttrCount++;
    }
    if (stat.mtbf) {
      totalMtbf += Number(stat.mtbf);
      validMtbfCount++;
    }
    if (stat.availability) {
      totalAvailability += Number(stat.availability);
      validAvailCount++;
    }
    totalFailures += stat.failureCount || 0;
    totalDowntime += Number(stat.totalDowntime) || 0;
    totalRepairTime += Number(stat.totalRepairTime) || 0;
  });

  // Get work order counts
  const workOrderCounts = {
    correctiveWorkOrders: 0,
    preventiveWorkOrders: 0,
    predictiveWorkOrders: 0,
    emergencyWorkOrders: 0,
  };

  const workOrders = await db.select({
    workOrderType: iotMaintenanceWorkOrders.workOrderType,
    count: sql<number>`count(*)`,
  })
    .from(iotMaintenanceWorkOrders)
    .where(and(
      eq(iotMaintenanceWorkOrders.deviceId, targetId),
      gte(iotMaintenanceWorkOrders.createdAt, startDate.toISOString().slice(0, 19).replace('T', ' ')),
      lte(iotMaintenanceWorkOrders.createdAt, endDate.toISOString().slice(0, 19).replace('T', ' '))
    ))
    .groupBy(iotMaintenanceWorkOrders.workOrderType);

  workOrders.forEach((wo) => {
    switch (wo.workOrderType) {
      case 'corrective':
        workOrderCounts.correctiveWorkOrders = Number(wo.count);
        break;
      case 'preventive':
        workOrderCounts.preventiveWorkOrders = Number(wo.count);
        break;
      case 'predictive':
        workOrderCounts.predictiveWorkOrders = Number(wo.count);
        break;
      case 'emergency':
        workOrderCounts.emergencyWorkOrders = Number(wo.count);
        break;
    }
  });

  return {
    targetType,
    targetId,
    targetName: targetName || `${targetType} #${targetId}`,
    startDate,
    endDate,
    summary: {
      mttr: validMttrCount > 0 ? totalMttr / validMttrCount : null,
      mtbf: validMtbfCount > 0 ? totalMtbf / validMtbfCount : null,
      availability: validAvailCount > 0 ? totalAvailability / validAvailCount : null,
      totalFailures,
      totalDowntime,
      totalRepairTime,
      ...workOrderCounts,
    },
    historicalStats: stats.map((s) => ({
      periodStart: s.periodStart,
      periodEnd: s.periodEnd,
      mttr: Number(s.mttr) || null,
      mtbf: Number(s.mtbf) || null,
      availability: Number(s.availability) || null,
      failureCount: s.failureCount || 0,
    })),
    failureEvents: failures.map((f) => ({
      id: f.id,
      failureCode: f.failureCode,
      failureType: f.failureType,
      severity: f.severity,
      description: f.description,
      failureStartAt: f.failureStartAt,
      failureEndAt: f.failureEndAt,
      repairDuration: Number(f.repairDuration) || null,
      rootCauseCategory: f.rootCauseCategory,
      resolution: f.resolution,
    })),
  };
}

// Export to Excel
export async function exportMttrMtbfToExcel(
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number,
  startDate: Date,
  endDate: Date,
  targetName?: string
): Promise<Buffer> {
  const data = await getReportData(targetType, targetId, startDate, endDate, targetName);
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CPK/SPC Calculator';
  workbook.created = new Date();
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Tổng quan');
  
  // Title
  summarySheet.mergeCells('A1:F1');
  summarySheet.getCell('A1').value = 'BÁO CÁO MTTR/MTBF';
  summarySheet.getCell('A1').font = { bold: true, size: 16 };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Report info
  summarySheet.getCell('A3').value = 'Đối tượng:';
  summarySheet.getCell('B3').value = data.targetName;
  summarySheet.getCell('A4').value = 'Loại:';
  summarySheet.getCell('B4').value = data.targetType === 'device' ? 'Thiết bị IoT' : 
    data.targetType === 'machine' ? 'Máy móc' : 'Dây chuyền';
  summarySheet.getCell('A5').value = 'Từ ngày:';
  summarySheet.getCell('B5').value = data.startDate.toLocaleDateString('vi-VN');
  summarySheet.getCell('A6').value = 'Đến ngày:';
  summarySheet.getCell('B6').value = data.endDate.toLocaleDateString('vi-VN');
  
  // KPIs
  summarySheet.getCell('A8').value = 'CHỈ SỐ KPI';
  summarySheet.getCell('A8').font = { bold: true, size: 12 };
  
  const kpiData = [
    ['MTTR (Mean Time To Repair)', formatDuration(data.summary.mttr)],
    ['MTBF (Mean Time Between Failures)', formatDuration(data.summary.mtbf)],
    ['Availability (Tỷ lệ khả dụng)', formatPercent(data.summary.availability)],
    ['Tổng số lỗi', data.summary.totalFailures.toString()],
    ['Tổng thời gian dừng máy', formatDuration(data.summary.totalDowntime)],
    ['Tổng thời gian sửa chữa', formatDuration(data.summary.totalRepairTime)],
  ];
  
  kpiData.forEach((row, index) => {
    summarySheet.getCell(`A${9 + index}`).value = row[0];
    summarySheet.getCell(`B${9 + index}`).value = row[1];
  });
  
  // Work order breakdown
  summarySheet.getCell('A16').value = 'PHÂN BỔ WORK ORDER';
  summarySheet.getCell('A16').font = { bold: true, size: 12 };
  
  const woData = [
    ['Corrective (Sửa chữa)', data.summary.correctiveWorkOrders],
    ['Preventive (Bảo trì định kỳ)', data.summary.preventiveWorkOrders],
    ['Predictive (Dự đoán)', data.summary.predictiveWorkOrders],
    ['Emergency (Khẩn cấp)', data.summary.emergencyWorkOrders],
  ];
  
  woData.forEach((row, index) => {
    summarySheet.getCell(`A${17 + index}`).value = row[0];
    summarySheet.getCell(`B${17 + index}`).value = row[1];
  });
  
  // Style columns
  summarySheet.getColumn('A').width = 35;
  summarySheet.getColumn('B').width = 25;
  
  // Historical stats sheet
  const historySheet = workbook.addWorksheet('Xu hướng');
  
  historySheet.columns = [
    { header: 'Từ ngày', key: 'periodStart', width: 15 },
    { header: 'Đến ngày', key: 'periodEnd', width: 15 },
    { header: 'MTTR (phút)', key: 'mttr', width: 15 },
    { header: 'MTBF (giờ)', key: 'mtbf', width: 15 },
    { header: 'Availability (%)', key: 'availability', width: 18 },
    { header: 'Số lỗi', key: 'failureCount', width: 12 },
  ];
  
  // Style header
  historySheet.getRow(1).font = { bold: true };
  historySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  historySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  data.historicalStats.forEach((stat) => {
    historySheet.addRow({
      periodStart: new Date(stat.periodStart).toLocaleDateString('vi-VN'),
      periodEnd: new Date(stat.periodEnd).toLocaleDateString('vi-VN'),
      mttr: stat.mttr ? stat.mttr.toFixed(1) : 'N/A',
      mtbf: stat.mtbf ? (stat.mtbf / 60).toFixed(1) : 'N/A',
      availability: stat.availability ? (stat.availability * 100).toFixed(1) : 'N/A',
      failureCount: stat.failureCount,
    });
  });
  
  // Failure events sheet
  const failureSheet = workbook.addWorksheet('Sự kiện lỗi');
  
  failureSheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Mã lỗi', key: 'failureCode', width: 12 },
    { header: 'Loại lỗi', key: 'failureType', width: 15 },
    { header: 'Mức độ', key: 'severity', width: 12 },
    { header: 'Mô tả', key: 'description', width: 30 },
    { header: 'Thời điểm lỗi', key: 'failureStartAt', width: 18 },
    { header: 'Thời điểm khắc phục', key: 'failureEndAt', width: 18 },
    { header: 'Thời gian sửa (phút)', key: 'repairDuration', width: 18 },
    { header: 'Nguyên nhân gốc', key: 'rootCauseCategory', width: 18 },
    { header: 'Cách khắc phục', key: 'resolution', width: 30 },
  ];
  
  // Style header
  failureSheet.getRow(1).font = { bold: true };
  failureSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFED7D31' },
  };
  failureSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  data.failureEvents.forEach((event) => {
    failureSheet.addRow({
      id: event.id,
      failureCode: event.failureCode || 'N/A',
      failureType: event.failureType || 'N/A',
      severity: event.severity || 'N/A',
      description: event.description || 'N/A',
      failureStartAt: new Date(event.failureStartAt).toLocaleString('vi-VN'),
      failureEndAt: event.failureEndAt ? new Date(event.failureEndAt).toLocaleString('vi-VN') : 'Chưa khắc phục',
      repairDuration: event.repairDuration || 'N/A',
      rootCauseCategory: event.rootCauseCategory || 'N/A',
      resolution: event.resolution || 'N/A',
    });
  });
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Export to PDF
export async function exportMttrMtbfToPdf(
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number,
  startDate: Date,
  endDate: Date,
  targetName?: string
): Promise<Buffer> {
  const data = await getReportData(targetType, targetId, startDate, endDate, targetName);
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('BÁO CÁO MTTR/MTBF', { align: 'center' });
    doc.moveDown();
    
    // Report info
    doc.fontSize(12).font('Helvetica');
    doc.text(`Đối tượng: ${data.targetName}`);
    doc.text(`Loại: ${data.targetType === 'device' ? 'Thiết bị IoT' : data.targetType === 'machine' ? 'Máy móc' : 'Dây chuyền'}`);
    doc.text(`Từ ngày: ${data.startDate.toLocaleDateString('vi-VN')}`);
    doc.text(`Đến ngày: ${data.endDate.toLocaleDateString('vi-VN')}`);
    doc.moveDown();
    
    // KPIs section
    doc.fontSize(14).font('Helvetica-Bold').text('CHỈ SỐ KPI');
    doc.moveDown(0.5);
    
    doc.fontSize(11).font('Helvetica');
    
    // Draw KPI boxes
    const kpis = [
      { label: 'MTTR', value: formatDuration(data.summary.mttr), desc: 'Mean Time To Repair' },
      { label: 'MTBF', value: formatDuration(data.summary.mtbf), desc: 'Mean Time Between Failures' },
      { label: 'Availability', value: formatPercent(data.summary.availability), desc: 'Tỷ lệ khả dụng' },
    ];
    
    const boxWidth = 160;
    const boxHeight = 60;
    let x = 50;
    const y = doc.y;
    
    kpis.forEach((kpi, i) => {
      doc.rect(x, y, boxWidth, boxHeight).stroke();
      doc.fontSize(10).text(kpi.label, x + 10, y + 10);
      doc.fontSize(16).font('Helvetica-Bold').text(kpi.value, x + 10, y + 25);
      doc.fontSize(8).font('Helvetica').text(kpi.desc, x + 10, y + 45);
      x += boxWidth + 10;
    });
    
    doc.y = y + boxHeight + 20;
    
    // Statistics
    doc.fontSize(14).font('Helvetica-Bold').text('THỐNG KÊ');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`• Tổng số lỗi: ${data.summary.totalFailures}`);
    doc.text(`• Tổng thời gian dừng máy: ${formatDuration(data.summary.totalDowntime)}`);
    doc.text(`• Tổng thời gian sửa chữa: ${formatDuration(data.summary.totalRepairTime)}`);
    doc.moveDown();
    
    // Work order breakdown
    doc.fontSize(14).font('Helvetica-Bold').text('PHÂN BỔ WORK ORDER');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`• Corrective (Sửa chữa): ${data.summary.correctiveWorkOrders}`);
    doc.text(`• Preventive (Bảo trì định kỳ): ${data.summary.preventiveWorkOrders}`);
    doc.text(`• Predictive (Dự đoán): ${data.summary.predictiveWorkOrders}`);
    doc.text(`• Emergency (Khẩn cấp): ${data.summary.emergencyWorkOrders}`);
    doc.moveDown();
    
    // Historical trend table
    if (data.historicalStats.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('XU HƯỚNG THEO THỜI GIAN');
      doc.moveDown(0.5);
      
      // Table header
      const tableTop = doc.y;
      const colWidths = [80, 80, 80, 80, 80];
      const headers = ['Kỳ', 'MTTR', 'MTBF', 'Availability', 'Số lỗi'];
      
      doc.fontSize(10).font('Helvetica-Bold');
      let colX = 50;
      headers.forEach((header, i) => {
        doc.text(header, colX, tableTop, { width: colWidths[i] });
        colX += colWidths[i];
      });
      
      doc.moveTo(50, tableTop + 15).lineTo(450, tableTop + 15).stroke();
      
      // Table rows
      doc.font('Helvetica');
      let rowY = tableTop + 20;
      
      data.historicalStats.slice(0, 15).forEach((stat) => {
        colX = 50;
        const period = new Date(stat.periodStart).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
        const mttr = stat.mttr ? `${stat.mttr.toFixed(0)} phút` : 'N/A';
        const mtbf = stat.mtbf ? `${(stat.mtbf / 60).toFixed(1)} giờ` : 'N/A';
        const avail = stat.availability ? `${(stat.availability * 100).toFixed(1)}%` : 'N/A';
        
        const values = [period, mttr, mtbf, avail, stat.failureCount.toString()];
        values.forEach((val, i) => {
          doc.text(val, colX, rowY, { width: colWidths[i] });
          colX += colWidths[i];
        });
        rowY += 15;
      });
    }
    
    // Failure events
    if (data.failureEvents.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').text('DANH SÁCH SỰ KIỆN LỖI');
      doc.moveDown(0.5);
      
      doc.fontSize(9).font('Helvetica');
      
      data.failureEvents.slice(0, 20).forEach((event, i) => {
        doc.font('Helvetica-Bold').text(`${i + 1}. ${event.failureCode || 'N/A'} - ${event.failureType || 'Unknown'}`, { continued: false });
        doc.font('Helvetica');
        doc.text(`   Mức độ: ${event.severity || 'N/A'} | Thời điểm: ${new Date(event.failureStartAt).toLocaleString('vi-VN')}`);
        if (event.description) {
          doc.text(`   Mô tả: ${event.description}`);
        }
        if (event.resolution) {
          doc.text(`   Khắc phục: ${event.resolution}`);
        }
        doc.moveDown(0.3);
      });
    }
    
    // Footer
    doc.fontSize(8).text(
      `Báo cáo được tạo bởi CPK/SPC Calculator - ${new Date().toLocaleString('vi-VN')}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
    
    doc.end();
  });
}

export const mttrMtbfExportService = {
  exportToExcel: exportMttrMtbfToExcel,
  exportToPdf: exportMttrMtbfToPdf,
  getReportData,
};

export default mttrMtbfExportService;
