import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock getDb
vi.mock('../db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              {
                id: 1,
                machineId: 1,
                machineName: 'CNC-001',
                recordDate: new Date('2025-01-15'),
                availability: '92.5',
                performance: '88.3',
                quality: '99.1',
                oee: '81.0',
                plannedProductionTime: 480,
                actualRunTime: 444,
                totalCount: 1000,
                goodCount: 991,
                shift: 'morning',
              },
              {
                id: 2,
                machineId: 2,
                machineName: 'CNC-002',
                recordDate: new Date('2025-01-15'),
                availability: '88.0',
                performance: '91.5',
                quality: '98.5',
                oee: '79.3',
                plannedProductionTime: 480,
                actualRunTime: 422,
                totalCount: 950,
                goodCount: 936,
                shift: 'afternoon',
              },
            ]),
          }),
        }),
      }),
    }),
  }),
}));

// Mock storage
vi.mock('../storage', () => ({
  storagePut: vi.fn().mockResolvedValue({ url: 'https://storage.example.com/report.xlsx', key: 'reports/oee/report.xlsx' }),
}));

describe('OEE Export Service', () => {
  it('should export OEE to Excel with correct structure', async () => {
    const { exportOEEToExcel } = await import('./oeeExportService');
    
    const buffer = await exportOEEToExcel({
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      language: 'vi',
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
    
    // Verify it's a valid XLSX file (starts with PK zip header)
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4B); // K
  });

  it('should export OEE to PDF HTML with correct content', async () => {
    const { exportOEEToPdfHtml } = await import('./oeeExportService');
    
    const html = await exportOEEToPdfHtml({
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      language: 'vi',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('BÁO CÁO HIỆU SUẤT THIẾT BỊ TỔNG THỂ (OEE)');
    expect(html).toContain('CNC-001');
    expect(html).toContain('CNC-002');
    expect(html).toContain('Availability');
    expect(html).toContain('Performance');
    expect(html).toContain('Quality');
  });

  it('should export OEE to PDF HTML in English', async () => {
    const { exportOEEToPdfHtml } = await import('./oeeExportService');
    
    const html = await exportOEEToPdfHtml({
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      language: 'en',
    });

    expect(html).toContain('OVERALL EQUIPMENT EFFECTIVENESS (OEE) REPORT');
    expect(html).toContain('Machine Comparison');
  });

  it('should upload to S3 correctly', async () => {
    const { exportOEEReportToS3 } = await import('./oeeExportService');
    const { storagePut } = await import('../storage');

    const result = await exportOEEReportToS3({
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
    }, 'pdf', 'user-123');

    expect(result.url).toBeDefined();
    expect(result.filename).toContain('oee-report-');
    expect(storagePut).toHaveBeenCalled();
  });

  it('should calculate summary statistics correctly', async () => {
    const { exportOEEToPdfHtml } = await import('./oeeExportService');
    
    const html = await exportOEEToPdfHtml({
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-31'),
      language: 'vi',
    });

    // Average OEE should be (81.0 + 79.3) / 2 = 80.15
    expect(html).toContain('80.2%');
  });
});
