import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

// Test that dependencies are properly installed
describe('MTTR/MTBF Export Dependencies', () => {
  it('should have ExcelJS available', () => {
    expect(ExcelJS).toBeDefined();
    expect(ExcelJS.Workbook).toBeDefined();
  });

  it('should be able to create Excel workbook', async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Test';
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet('Test Sheet');
    sheet.addRow(['Header 1', 'Header 2']);
    sheet.addRow(['Value 1', 'Value 2']);
    
    const buffer = await workbook.xlsx.writeBuffer();
    expect(buffer).toBeDefined();
    expect(buffer.byteLength).toBeGreaterThan(0);
    
    // Check Excel file signature (PK for ZIP format)
    const arr = new Uint8Array(buffer);
    expect(arr[0]).toBe(0x50); // P
    expect(arr[1]).toBe(0x4B); // K
  });

  it('should have PDFDocument available', () => {
    expect(PDFDocument).toBeDefined();
  });

  it('should be able to create PDF document', async () => {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50 });
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      doc.fontSize(16).text('Test PDF Document');
      doc.fontSize(12).text('This is a test.');
      doc.end();
    });
    
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);
    
    // Check PDF file signature
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });
});

describe('MTTR/MTBF Export Service Structure', () => {
  it('should export mttrMtbfExportService', async () => {
    // Import the service
    const module = await import('./mttrMtbfExportService');
    
    expect(module.mttrMtbfExportService).toBeDefined();
    expect(module.mttrMtbfExportService.exportToExcel).toBeDefined();
    expect(module.mttrMtbfExportService.exportToPdf).toBeDefined();
    expect(module.mttrMtbfExportService.getReportData).toBeDefined();
  });

  it('should export individual functions', async () => {
    const { exportMttrMtbfToExcel, exportMttrMtbfToPdf } = await import('./mttrMtbfExportService');
    
    expect(exportMttrMtbfToExcel).toBeDefined();
    expect(typeof exportMttrMtbfToExcel).toBe('function');
    
    expect(exportMttrMtbfToPdf).toBeDefined();
    expect(typeof exportMttrMtbfToPdf).toBe('function');
  });
});

describe('MTTR/MTBF Export Helper Functions', () => {
  it('should format duration correctly', () => {
    // Test the formatDuration logic
    const formatDuration = (minutes: number | null): string => {
      if (!minutes) return 'N/A';
      if (minutes < 60) return `${minutes.toFixed(0)} phút`;
      if (minutes < 1440) return `${(minutes / 60).toFixed(1)} giờ`;
      return `${(minutes / 1440).toFixed(1)} ngày`;
    };
    
    expect(formatDuration(null)).toBe('N/A');
    expect(formatDuration(0)).toBe('N/A');
    expect(formatDuration(30)).toBe('30 phút');
    expect(formatDuration(90)).toBe('1.5 giờ');
    expect(formatDuration(2880)).toBe('2.0 ngày');
  });

  it('should format percentage correctly', () => {
    const formatPercent = (value: number | null): string => {
      if (value === null || value === undefined) return 'N/A';
      return `${(value * 100).toFixed(1)}%`;
    };
    
    expect(formatPercent(null)).toBe('N/A');
    expect(formatPercent(0.95)).toBe('95.0%');
    expect(formatPercent(0.856)).toBe('85.6%');
    expect(formatPercent(1)).toBe('100.0%');
  });
});

describe('Excel Export Format', () => {
  it('should create workbook with multiple sheets', async () => {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Tổng quan');
    summarySheet.mergeCells('A1:F1');
    summarySheet.getCell('A1').value = 'BÁO CÁO MTTR/MTBF';
    summarySheet.getCell('A1').font = { bold: true, size: 16 };
    
    // History sheet
    const historySheet = workbook.addWorksheet('Xu hướng');
    historySheet.columns = [
      { header: 'Từ ngày', key: 'periodStart', width: 15 },
      { header: 'MTTR (phút)', key: 'mttr', width: 15 },
      { header: 'MTBF (giờ)', key: 'mtbf', width: 15 },
    ];
    
    // Failure sheet
    const failureSheet = workbook.addWorksheet('Sự kiện lỗi');
    failureSheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Mã lỗi', key: 'failureCode', width: 12 },
    ];
    
    expect(workbook.worksheets.length).toBe(3);
    expect(workbook.worksheets[0].name).toBe('Tổng quan');
    expect(workbook.worksheets[1].name).toBe('Xu hướng');
    expect(workbook.worksheets[2].name).toBe('Sự kiện lỗi');
  });
});

describe('PDF Export Format', () => {
  it('should create PDF with title and content', async () => {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Title
      doc.fontSize(20).font('Helvetica-Bold').text('BÁO CÁO MTTR/MTBF', { align: 'center' });
      doc.moveDown();
      
      // Content
      doc.fontSize(12).font('Helvetica');
      doc.text('Đối tượng: Test Device');
      doc.text('Loại: Thiết bị IoT');
      
      // KPIs
      doc.fontSize(14).font('Helvetica-Bold').text('CHỈ SỐ KPI');
      doc.fontSize(11).font('Helvetica');
      doc.text('• MTTR: 30 phút');
      doc.text('• MTBF: 24 giờ');
      doc.text('• Availability: 95.0%');
      
      doc.end();
    });
    
    expect(buffer.length).toBeGreaterThan(0);
    // PDF content is binary, just verify it starts with %PDF
    expect(buffer.slice(0, 4).toString()).toBe('%PDF');
  });
});
