/**
 * MTTR/MTBF Comparison Export Service
 * Xuất báo cáo so sánh MTTR/MTBF giữa nhiều thiết bị/máy/dây chuyền
 */
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { getDb } from '../db';
import {
  iotMttrMtbfStats,
  iotFailureEvents,
  iotDevices,
  machines,
  productionLines,
} from '../../drizzle/schema';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

// Types
export interface ComparisonItem {
  id: number;
  name: string;
  mttr: number | null;
  mtbf: number | null;
  availability: number | null;
  failures: number;
  repairs: number;
  downtime: number;
  category?: string;
}

export interface ComparisonReportData {
  targetType: 'device' | 'machine' | 'production_line';
  startDate: Date;
  endDate: Date;
  items: ComparisonItem[];
  summary: {
    avgMttr: number | null;
    avgMtbf: number | null;
    avgAvailability: number | null;
    totalFailures: number;
    bestPerformer: ComparisonItem | null;
    worstPerformer: ComparisonItem | null;
  };
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

// Get target name by type and id
async function getTargetName(
  targetType: 'device' | 'machine' | 'production_line',
  targetId: number
): Promise<string> {
  const db = await getDb();
  if (!db) return `${targetType} #${targetId}`;

  try {
    if (targetType === 'device') {
      const [device] = await db.select({ name: iotDevices.name })
        .from(iotDevices)
        .where(eq(iotDevices.id, targetId))
        .limit(1);
      return device?.name || `Device #${targetId}`;
    } else if (targetType === 'machine') {
      const [machine] = await db.select({ name: machines.name })
        .from(machines)
        .where(eq(machines.id, targetId))
        .limit(1);
      return machine?.name || `Machine #${targetId}`;
    } else {
      const [line] = await db.select({ name: productionLines.name })
        .from(productionLines)
        .where(eq(productionLines.id, targetId))
        .limit(1);
      return line?.name || `Line #${targetId}`;
    }
  } catch {
    return `${targetType} #${targetId}`;
  }
}

// Get comparison data for multiple targets
export async function getComparisonData(
  targetType: 'device' | 'machine' | 'production_line',
  targetIds: number[],
  startDate: Date,
  endDate: Date
): Promise<ComparisonReportData> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const items: ComparisonItem[] = [];

  for (const targetId of targetIds) {
    const name = await getTargetName(targetType, targetId);

    // Get stats for this target
    const stats = await db.select()
      .from(iotMttrMtbfStats)
      .where(and(
        eq(iotMttrMtbfStats.targetType, targetType),
        eq(iotMttrMtbfStats.targetId, targetId),
        gte(iotMttrMtbfStats.periodStart, startDate.toISOString().slice(0, 19).replace('T', ' ')),
        lte(iotMttrMtbfStats.periodEnd, endDate.toISOString().slice(0, 19).replace('T', ' '))
      ));

    // Calculate averages
    let totalMttr = 0, totalMtbf = 0, totalAvailability = 0;
    let validMttrCount = 0, validMtbfCount = 0, validAvailCount = 0;
    let totalFailures = 0, totalDowntime = 0, totalRepairs = 0;

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
      totalRepairs += stat.repairCount || 0;
    });

    items.push({
      id: targetId,
      name,
      mttr: validMttrCount > 0 ? totalMttr / validMttrCount : null,
      mtbf: validMtbfCount > 0 ? totalMtbf / validMtbfCount : null,
      availability: validAvailCount > 0 ? totalAvailability / validAvailCount : null,
      failures: totalFailures,
      repairs: totalRepairs,
      downtime: totalDowntime,
    });
  }

  // Calculate summary
  const validItems = items.filter(i => i.mtbf !== null);
  const avgMttr = items.filter(i => i.mttr !== null).reduce((sum, i) => sum + (i.mttr || 0), 0) / 
    (items.filter(i => i.mttr !== null).length || 1);
  const avgMtbf = validItems.reduce((sum, i) => sum + (i.mtbf || 0), 0) / (validItems.length || 1);
  const avgAvailability = items.filter(i => i.availability !== null).reduce((sum, i) => sum + (i.availability || 0), 0) / 
    (items.filter(i => i.availability !== null).length || 1);

  // Find best/worst performers by MTBF
  const sortedByMtbf = [...validItems].sort((a, b) => (b.mtbf || 0) - (a.mtbf || 0));
  const bestPerformer = sortedByMtbf[0] || null;
  const worstPerformer = sortedByMtbf[sortedByMtbf.length - 1] || null;

  return {
    targetType,
    startDate,
    endDate,
    items,
    summary: {
      avgMttr: items.filter(i => i.mttr !== null).length > 0 ? avgMttr : null,
      avgMtbf: validItems.length > 0 ? avgMtbf : null,
      avgAvailability: items.filter(i => i.availability !== null).length > 0 ? avgAvailability : null,
      totalFailures: items.reduce((sum, i) => sum + i.failures, 0),
      bestPerformer,
      worstPerformer,
    },
  };
}

// Export to Excel
export async function exportComparisonToExcel(
  targetType: 'device' | 'machine' | 'production_line',
  targetIds: number[],
  startDate: Date,
  endDate: Date
): Promise<Buffer> {
  const data = await getComparisonData(targetType, targetIds, startDate, endDate);
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CPK/SPC Calculator';
  workbook.created = new Date();
  
  const targetTypeLabel = {
    device: 'Thiết bị IoT',
    machine: 'Máy móc',
    production_line: 'Dây chuyền',
  }[targetType];
  
  // Summary sheet
  const summarySheet = workbook.addWorksheet('Tổng quan');
  
  // Title
  summarySheet.mergeCells('A1:H1');
  summarySheet.getCell('A1').value = 'BÁO CÁO SO SÁNH MTTR/MTBF';
  summarySheet.getCell('A1').font = { bold: true, size: 16 };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };
  
  // Report info
  summarySheet.getCell('A3').value = 'Loại đối tượng:';
  summarySheet.getCell('B3').value = targetTypeLabel;
  summarySheet.getCell('A4').value = 'Số lượng so sánh:';
  summarySheet.getCell('B4').value = data.items.length;
  summarySheet.getCell('A5').value = 'Từ ngày:';
  summarySheet.getCell('B5').value = data.startDate.toLocaleDateString('vi-VN');
  summarySheet.getCell('A6').value = 'Đến ngày:';
  summarySheet.getCell('B6').value = data.endDate.toLocaleDateString('vi-VN');
  
  // Summary KPIs
  summarySheet.getCell('A8').value = 'THỐNG KÊ TỔNG HỢP';
  summarySheet.getCell('A8').font = { bold: true, size: 12 };
  
  const summaryData = [
    ['MTTR trung bình', formatDuration(data.summary.avgMttr)],
    ['MTBF trung bình', formatDuration(data.summary.avgMtbf)],
    ['Availability trung bình', formatPercent(data.summary.avgAvailability)],
    ['Tổng số lỗi', data.summary.totalFailures.toString()],
    ['Hiệu suất tốt nhất', data.summary.bestPerformer?.name || 'N/A'],
    ['Hiệu suất kém nhất', data.summary.worstPerformer?.name || 'N/A'],
  ];
  
  summaryData.forEach((row, index) => {
    summarySheet.getCell(`A${9 + index}`).value = row[0];
    summarySheet.getCell(`B${9 + index}`).value = row[1];
  });
  
  // Style columns
  summarySheet.getColumn('A').width = 25;
  summarySheet.getColumn('B').width = 25;
  
  // Comparison data sheet
  const comparisonSheet = workbook.addWorksheet('So sánh chi tiết');
  
  comparisonSheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Tên', key: 'name', width: 25 },
    { header: 'MTTR (phút)', key: 'mttr', width: 15 },
    { header: 'MTBF (giờ)', key: 'mtbf', width: 15 },
    { header: 'Availability (%)', key: 'availability', width: 18 },
    { header: 'Số lỗi', key: 'failures', width: 12 },
    { header: 'Số sửa chữa', key: 'repairs', width: 15 },
    { header: 'Downtime (phút)', key: 'downtime', width: 18 },
    { header: 'Đánh giá', key: 'rating', width: 15 },
  ];
  
  // Style header
  comparisonSheet.getRow(1).font = { bold: true };
  comparisonSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  comparisonSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Add data rows
  data.items.forEach((item, index) => {
    const availability = item.availability || 0;
    const mtbf = item.mtbf || 0;
    let rating = 'Cần cải thiện';
    if (availability > 0.95 && mtbf > 150) rating = 'Tốt';
    else if (availability > 0.90 && mtbf > 100) rating = 'Trung bình';
    
    const row = comparisonSheet.addRow({
      stt: index + 1,
      name: item.name,
      mttr: item.mttr ? item.mttr.toFixed(1) : 'N/A',
      mtbf: item.mtbf ? (item.mtbf / 60).toFixed(1) : 'N/A',
      availability: item.availability ? (item.availability * 100).toFixed(1) : 'N/A',
      failures: item.failures,
      repairs: item.repairs,
      downtime: item.downtime.toFixed(0),
      rating,
    });
    
    // Color code rating
    const ratingCell = row.getCell('rating');
    if (rating === 'Tốt') {
      ratingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22C55E' } };
      ratingCell.font = { color: { argb: 'FFFFFFFF' } };
    } else if (rating === 'Trung bình') {
      ratingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } };
      ratingCell.font = { color: { argb: 'FFFFFFFF' } };
    } else {
      ratingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } };
      ratingCell.font = { color: { argb: 'FFFFFFFF' } };
    }
  });
  
  // Ranking sheet
  const rankingSheet = workbook.addWorksheet('Xếp hạng');
  
  rankingSheet.columns = [
    { header: 'Hạng', key: 'rank', width: 10 },
    { header: 'Tên', key: 'name', width: 25 },
    { header: 'MTBF (giờ)', key: 'mtbf', width: 15 },
    { header: 'MTTR (phút)', key: 'mttr', width: 15 },
    { header: 'Availability (%)', key: 'availability', width: 18 },
    { header: 'Điểm tổng hợp', key: 'score', width: 15 },
  ];
  
  // Style header
  rankingSheet.getRow(1).font = { bold: true };
  rankingSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF22C55E' },
  };
  rankingSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Calculate scores and rank
  const maxMtbf = Math.max(...data.items.map(i => i.mtbf || 0));
  const minMttr = Math.min(...data.items.filter(i => i.mttr !== null).map(i => i.mttr || Infinity));
  
  const scoredItems = data.items.map(item => {
    const mtbfScore = maxMtbf > 0 ? ((item.mtbf || 0) / maxMtbf) * 40 : 0;
    const mttrScore = minMttr > 0 && item.mttr ? (minMttr / item.mttr) * 30 : 0;
    const availScore = (item.availability || 0) * 30;
    return {
      ...item,
      score: mtbfScore + mttrScore + availScore,
    };
  }).sort((a, b) => b.score - a.score);
  
  scoredItems.forEach((item, index) => {
    const row = rankingSheet.addRow({
      rank: index + 1,
      name: item.name,
      mtbf: item.mtbf ? (item.mtbf / 60).toFixed(1) : 'N/A',
      mttr: item.mttr ? item.mttr.toFixed(1) : 'N/A',
      availability: item.availability ? (item.availability * 100).toFixed(1) : 'N/A',
      score: item.score.toFixed(1),
    });
    
    // Highlight top 3
    if (index < 3) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: index === 0 ? 'FFFFD700' : index === 1 ? 'FFC0C0C0' : 'FFCD7F32' },
        };
      });
    }
  });
  
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Export to PDF
export async function exportComparisonToPdf(
  targetType: 'device' | 'machine' | 'production_line',
  targetIds: number[],
  startDate: Date,
  endDate: Date
): Promise<Buffer> {
  const data = await getComparisonData(targetType, targetIds, startDate, endDate);
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    
    const targetTypeLabel = {
      device: 'Thiết bị IoT',
      machine: 'Máy móc',
      production_line: 'Dây chuyền',
    }[targetType];
    
    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('BÁO CÁO SO SÁNH MTTR/MTBF', { align: 'center' });
    doc.moveDown();
    
    // Report info
    doc.fontSize(11).font('Helvetica');
    doc.text(`Loại đối tượng: ${targetTypeLabel}`);
    doc.text(`Số lượng so sánh: ${data.items.length}`);
    doc.text(`Từ ngày: ${data.startDate.toLocaleDateString('vi-VN')}`);
    doc.text(`Đến ngày: ${data.endDate.toLocaleDateString('vi-VN')}`);
    doc.text(`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`);
    doc.moveDown();
    
    // Summary section
    doc.fontSize(14).font('Helvetica-Bold').text('THỐNG KÊ TỔNG HỢP');
    doc.moveDown(0.5);
    
    doc.fontSize(11).font('Helvetica');
    doc.text(`MTTR trung bình: ${formatDuration(data.summary.avgMttr)}`);
    doc.text(`MTBF trung bình: ${formatDuration(data.summary.avgMtbf)}`);
    doc.text(`Availability trung bình: ${formatPercent(data.summary.avgAvailability)}`);
    doc.text(`Tổng số lỗi: ${data.summary.totalFailures}`);
    doc.text(`Hiệu suất tốt nhất: ${data.summary.bestPerformer?.name || 'N/A'}`);
    doc.text(`Hiệu suất kém nhất: ${data.summary.worstPerformer?.name || 'N/A'}`);
    doc.moveDown();
    
    // Comparison table
    doc.fontSize(14).font('Helvetica-Bold').text('BẢNG SO SÁNH CHI TIẾT');
    doc.moveDown(0.5);
    
    // Table header
    const tableTop = doc.y;
    const colWidths = [30, 100, 60, 60, 70, 50, 60];
    const headers = ['STT', 'Tên', 'MTTR', 'MTBF', 'Availability', 'Lỗi', 'Đánh giá'];
    
    doc.fontSize(9).font('Helvetica-Bold');
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });
    
    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke();
    
    // Table rows
    doc.font('Helvetica').fontSize(9);
    let yPos = tableTop + 20;
    
    data.items.forEach((item, index) => {
      if (yPos > 750) {
        doc.addPage();
        yPos = 50;
      }
      
      const availability = item.availability || 0;
      const mtbf = item.mtbf || 0;
      let rating = 'Cần cải thiện';
      if (availability > 0.95 && mtbf > 150) rating = 'Tốt';
      else if (availability > 0.90 && mtbf > 100) rating = 'Trung bình';
      
      xPos = 50;
      const rowData = [
        (index + 1).toString(),
        item.name.substring(0, 15),
        item.mttr ? `${item.mttr.toFixed(0)}p` : 'N/A',
        item.mtbf ? `${(item.mtbf / 60).toFixed(1)}h` : 'N/A',
        item.availability ? `${(item.availability * 100).toFixed(1)}%` : 'N/A',
        item.failures.toString(),
        rating,
      ];
      
      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, yPos, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });
      
      yPos += 15;
    });
    
    // Ranking section
    doc.addPage();
    doc.fontSize(14).font('Helvetica-Bold').text('BẢNG XẾP HẠNG');
    doc.moveDown(0.5);
    
    // Calculate scores
    const maxMtbf = Math.max(...data.items.map(i => i.mtbf || 0));
    const minMttr = Math.min(...data.items.filter(i => i.mttr !== null).map(i => i.mttr || Infinity));
    
    const scoredItems = data.items.map(item => {
      const mtbfScore = maxMtbf > 0 ? ((item.mtbf || 0) / maxMtbf) * 40 : 0;
      const mttrScore = minMttr > 0 && item.mttr ? (minMttr / item.mttr) * 30 : 0;
      const availScore = (item.availability || 0) * 30;
      return {
        ...item,
        score: mtbfScore + mttrScore + availScore,
      };
    }).sort((a, b) => b.score - a.score);
    
    doc.fontSize(11).font('Helvetica');
    scoredItems.forEach((item, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      doc.text(`${medal} ${item.name} - Điểm: ${item.score.toFixed(1)} (MTBF: ${item.mtbf ? (item.mtbf / 60).toFixed(1) : 'N/A'}h, MTTR: ${item.mttr ? item.mttr.toFixed(0) : 'N/A'}p)`);
    });
    
    // Footer
    doc.fontSize(8).text('Báo cáo được tạo bởi CPK/SPC Calculator', 50, 780, { align: 'center' });
    
    doc.end();
  });
}

// Export service object
export const mttrMtbfComparisonExportService = {
  getComparisonData,
  exportToExcel: exportComparisonToExcel,
  exportToPdf: exportComparisonToPdf,
};

export default mttrMtbfComparisonExportService;
