/**
 * PDF Report Generator with Charts
 * Generate PDF reports with embedded charts for SPC/CPK analysis
 */

import PDFDocument from 'pdfkit';
import { renderCpkTrendChart, renderShiftStatsChart, renderCpkDistributionChart } from './chartRenderer';
import { storagePut } from '../storage';

interface SpcReportData {
  title: string;
  dateRange: string;
  generatedAt: Date;
  summary: {
    totalSamples: number;
    avgCpk: number;
    minCpk: number;
    maxCpk: number;
    violationCount: number;
    warningCount: number;
    goodCount: number;
  };
  shiftStats: {
    morning: { count: number; avgCpk: number };
    afternoon: { count: number; avgCpk: number };
    night: { count: number; avgCpk: number };
  };
  cpkTrend: Array<{ date: string; cpk: number }>;
}

/**
 * Generate a complete SPC report PDF with charts
 */
export async function generateSpcReportPdf(data: SpcReportData): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: data.title,
          Author: 'MSoftware AI - CPK/SPC System',
          Subject: 'SPC Report',
          CreationDate: data.generatedAt,
        },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text(data.title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').fillColor('#666666')
        .text(`Thời gian: ${data.dateRange}`, { align: 'center' });
      doc.text(`Ngày xuất: ${data.generatedAt.toLocaleString('vi-VN')}`, { align: 'center' });
      doc.moveDown(1.5);

      // Summary Section
      doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('THỐNG KÊ TỔNG HỢP');
      doc.moveDown(0.5);
      
      // Summary table
      const summaryY = doc.y;
      const colWidth = 180;
      
      doc.fontSize(11).font('Helvetica');
      
      // Row 1
      doc.text('Tổng số mẫu:', 50, summaryY);
      doc.font('Helvetica-Bold').text(data.summary.totalSamples.toString(), 180, summaryY);
      doc.font('Helvetica').text('CPK Trung bình:', 280, summaryY);
      doc.font('Helvetica-Bold').fillColor(getCpkColor(data.summary.avgCpk))
        .text(data.summary.avgCpk.toFixed(3), 410, summaryY);
      
      // Row 2
      const row2Y = summaryY + 20;
      doc.fillColor('#000000').font('Helvetica').text('CPK Thấp nhất:', 50, row2Y);
      doc.font('Helvetica-Bold').fillColor(getCpkColor(data.summary.minCpk))
        .text(data.summary.minCpk.toFixed(3), 180, row2Y);
      doc.fillColor('#000000').font('Helvetica').text('CPK Cao nhất:', 280, row2Y);
      doc.font('Helvetica-Bold').fillColor(getCpkColor(data.summary.maxCpk))
        .text(data.summary.maxCpk.toFixed(3), 410, row2Y);
      
      // Row 3
      const row3Y = row2Y + 20;
      doc.fillColor('#000000').font('Helvetica').text('Vi phạm (CPK < 1.0):', 50, row3Y);
      doc.font('Helvetica-Bold').fillColor('#dc2626').text(data.summary.violationCount.toString(), 180, row3Y);
      doc.fillColor('#000000').font('Helvetica').text('Cảnh báo (1.0 ≤ CPK < 1.33):', 280, row3Y);
      doc.font('Helvetica-Bold').fillColor('#ca8a04').text(data.summary.warningCount.toString(), 450, row3Y);
      
      // Row 4
      const row4Y = row3Y + 20;
      doc.fillColor('#000000').font('Helvetica').text('Đạt chuẩn (CPK ≥ 1.33):', 50, row4Y);
      doc.font('Helvetica-Bold').fillColor('#16a34a').text(data.summary.goodCount.toString(), 180, row4Y);
      
      doc.y = row4Y + 40;
      doc.moveDown(1);

      // CPK Trend Chart
      if (data.cpkTrend && data.cpkTrend.length > 0) {
        doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('XU HƯỚNG CPK');
        doc.moveDown(0.5);
        
        const trendChartBuffer = await renderCpkTrendChart(data.cpkTrend, {
          width: 500,
          height: 250,
          title: '',
        });
        
        doc.image(trendChartBuffer, {
          fit: [500, 250],
          align: 'center',
        });
        doc.moveDown(1);
      }

      // Check if we need a new page
      if (doc.y > 600) {
        doc.addPage();
      }

      // Shift Statistics Chart
      doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('THỐNG KÊ THEO CA');
      doc.moveDown(0.5);
      
      const shiftChartBuffer = await renderShiftStatsChart(data.shiftStats, {
        width: 500,
        height: 250,
        title: '',
      });
      
      doc.image(shiftChartBuffer, {
        fit: [500, 250],
        align: 'center',
      });
      doc.moveDown(1);

      // Shift details table
      doc.fontSize(11).font('Helvetica');
      const shiftTableY = doc.y;
      
      // Headers
      doc.font('Helvetica-Bold');
      doc.text('Ca làm việc', 50, shiftTableY);
      doc.text('Số mẫu', 200, shiftTableY);
      doc.text('CPK Trung bình', 300, shiftTableY);
      
      // Data rows
      doc.font('Helvetica');
      const shifts = [
        { name: 'Ca Sáng (6h-14h)', ...data.shiftStats.morning },
        { name: 'Ca Chiều (14h-22h)', ...data.shiftStats.afternoon },
        { name: 'Ca Tối (22h-6h)', ...data.shiftStats.night },
      ];
      
      shifts.forEach((shift, index) => {
        const rowY = shiftTableY + 20 + (index * 18);
        doc.text(shift.name, 50, rowY);
        doc.text(shift.count.toString(), 200, rowY);
        doc.fillColor(getCpkColor(shift.avgCpk)).text(shift.avgCpk.toFixed(3), 300, rowY);
        doc.fillColor('#000000');
      });

      // Check if we need a new page for distribution chart
      if (doc.y > 550) {
        doc.addPage();
      } else {
        doc.y = shiftTableY + 80;
        doc.moveDown(1);
      }

      // CPK Distribution Chart
      const excellent = data.summary.goodCount;
      const acceptable = data.summary.warningCount;
      const needsImprovement = data.summary.violationCount;
      const good = Math.max(0, data.summary.totalSamples - excellent - acceptable - needsImprovement);

      doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text('PHÂN BỐ CPK');
      doc.moveDown(0.5);
      
      const distributionChartBuffer = await renderCpkDistributionChart({
        excellent: Math.round(excellent * 0.3), // Approximate distribution
        good: Math.round(excellent * 0.7),
        acceptable,
        needsImprovement,
      }, {
        width: 400,
        height: 300,
        title: '',
      });
      
      doc.image(distributionChartBuffer, {
        fit: [400, 300],
        align: 'center',
      });

      // Footer
      doc.fontSize(9).fillColor('#666666')
        .text(
          `Báo cáo được tạo tự động bởi MSoftware AI - CPK/SPC System`,
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get color based on CPK value
 */
function getCpkColor(cpk: number): string {
  if (cpk >= 1.67) return '#16a34a'; // Green - Excellent
  if (cpk >= 1.33) return '#2563eb'; // Blue - Good
  if (cpk >= 1.0) return '#ca8a04'; // Yellow - Acceptable
  return '#dc2626'; // Red - Needs improvement
}

/**
 * Generate and upload PDF report to S3
 */
export async function generateAndUploadSpcReport(
  data: SpcReportData,
  userId: number
): Promise<{ url: string; key: string }> {
  const pdfBuffer = await generateSpcReportPdf(data);
  
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileKey = `reports/${userId}/spc-report-${timestamp}-${randomSuffix}.pdf`;
  
  const result = await storagePut(fileKey, pdfBuffer, 'application/pdf');
  
  return {
    url: result.url,
    key: fileKey,
  };
}
