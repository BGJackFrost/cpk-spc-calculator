/**
 * Service xuất báo cáo AOI/AVI ra PDF và Excel
 */

import ExcelJS from 'exceljs';

export interface AoiAviInspectionData {
  id: number;
  inspectionDate: Date;
  productionLineId: number;
  productionLineName: string;
  productCode: string;
  batchNumber: string;
  totalInspected: number;
  totalPassed: number;
  totalFailed: number;
  yieldRate: number;
  defectRate: number;
  defectDetails: DefectDetail[];
  inspectorName?: string;
  machineId?: string;
}

export interface DefectDetail {
  defectType: string;
  defectCode: string;
  count: number;
  percentage: number;
  severity: 'minor' | 'major' | 'critical';
}

export interface AoiAviReportOptions {
  title?: string;
  companyName?: string;
  companyLogo?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  productionLineIds?: number[];
  includeCharts?: boolean;
  includeDefectDetails?: boolean;
}

/**
 * Xuất báo cáo AOI/AVI ra Excel
 */
export async function exportAoiAviToExcel(
  data: AoiAviInspectionData[],
  options: AoiAviReportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = options.companyName || 'SPC/CPK Calculator';
  workbook.created = new Date();
  
  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Tổng quan');
  
  // Header styling
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: 'FFFFFFFF' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  };

  // Title
  summarySheet.mergeCells('A1:J1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = options.title || 'Báo cáo Kiểm tra AOI/AVI';
  titleCell.font = { bold: true, size: 16 };
  titleCell.alignment = { horizontal: 'center' };

  // Date range
  summarySheet.mergeCells('A2:J2');
  const dateCell = summarySheet.getCell('A2');
  dateCell.value = `Từ ${options.dateRange.start.toLocaleDateString('vi-VN')} đến ${options.dateRange.end.toLocaleDateString('vi-VN')}`;
  dateCell.alignment = { horizontal: 'center' };

  // Summary statistics
  const totalInspected = data.reduce((sum, d) => sum + d.totalInspected, 0);
  const totalPassed = data.reduce((sum, d) => sum + d.totalPassed, 0);
  const totalFailed = data.reduce((sum, d) => sum + d.totalFailed, 0);
  const avgYieldRate = data.length > 0 
    ? data.reduce((sum, d) => sum + d.yieldRate, 0) / data.length 
    : 0;
  const avgDefectRate = data.length > 0 
    ? data.reduce((sum, d) => sum + d.defectRate, 0) / data.length 
    : 0;

  summarySheet.addRow([]);
  summarySheet.addRow(['Thống kê tổng hợp']);
  summarySheet.addRow(['Tổng số kiểm tra', totalInspected]);
  summarySheet.addRow(['Tổng số đạt', totalPassed]);
  summarySheet.addRow(['Tổng số lỗi', totalFailed]);
  summarySheet.addRow(['Yield Rate trung bình', `${avgYieldRate.toFixed(2)}%`]);
  summarySheet.addRow(['Defect Rate trung bình', `${avgDefectRate.toFixed(2)}%`]);

  // Headers for detail data
  summarySheet.addRow([]);
  const headerRow = summarySheet.addRow([
    'Ngày kiểm tra',
    'Dây chuyền',
    'Mã sản phẩm',
    'Số lô',
    'Tổng kiểm tra',
    'Đạt',
    'Lỗi',
    'Yield Rate (%)',
    'Defect Rate (%)',
    'Người kiểm tra',
  ]);
  headerRow.eachCell((cell) => {
    Object.assign(cell, headerStyle);
  });

  // Data rows
  data.forEach((item) => {
    const row = summarySheet.addRow([
      item.inspectionDate.toLocaleDateString('vi-VN'),
      item.productionLineName,
      item.productCode,
      item.batchNumber,
      item.totalInspected,
      item.totalPassed,
      item.totalFailed,
      item.yieldRate.toFixed(2),
      item.defectRate.toFixed(2),
      item.inspectorName || 'N/A',
    ]);

    // Conditional formatting for yield rate
    const yieldCell = row.getCell(8);
    if (item.yieldRate < 90) {
      yieldCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      yieldCell.font = { color: { argb: 'FFEF4444' } };
    } else if (item.yieldRate < 95) {
      yieldCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      yieldCell.font = { color: { argb: 'FFF59E0B' } };
    } else {
      yieldCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      yieldCell.font = { color: { argb: 'FF10B981' } };
    }
  });

  // Auto-fit columns
  summarySheet.columns.forEach((column) => {
    column.width = 15;
  });

  // Sheet 2: Defect Details (if enabled)
  if (options.includeDefectDetails) {
    const defectSheet = workbook.addWorksheet('Chi tiết lỗi');
    
    defectSheet.mergeCells('A1:G1');
    const defectTitleCell = defectSheet.getCell('A1');
    defectTitleCell.value = 'Chi tiết các loại lỗi';
    defectTitleCell.font = { bold: true, size: 14 };
    defectTitleCell.alignment = { horizontal: 'center' };

    const defectHeaderRow = defectSheet.addRow([
      'Ngày',
      'Dây chuyền',
      'Mã lỗi',
      'Loại lỗi',
      'Số lượng',
      'Tỷ lệ (%)',
      'Mức độ',
    ]);
    defectHeaderRow.eachCell((cell) => {
      Object.assign(cell, headerStyle);
    });

    data.forEach((item) => {
      item.defectDetails.forEach((defect) => {
        const row = defectSheet.addRow([
          item.inspectionDate.toLocaleDateString('vi-VN'),
          item.productionLineName,
          defect.defectCode,
          defect.defectType,
          defect.count,
          defect.percentage.toFixed(2),
          defect.severity === 'critical' ? 'Nghiêm trọng' : 
            defect.severity === 'major' ? 'Lớn' : 'Nhỏ',
        ]);

        // Color code severity
        const severityCell = row.getCell(7);
        if (defect.severity === 'critical') {
          severityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          severityCell.font = { color: { argb: 'FFEF4444' }, bold: true };
        } else if (defect.severity === 'major') {
          severityCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          severityCell.font = { color: { argb: 'FFF59E0B' } };
        }
      });
    });

    defectSheet.columns.forEach((column) => {
      column.width = 15;
    });
  }

  // Sheet 3: Trend Analysis
  const trendSheet = workbook.addWorksheet('Xu hướng');
  
  trendSheet.mergeCells('A1:E1');
  const trendTitleCell = trendSheet.getCell('A1');
  trendTitleCell.value = 'Phân tích xu hướng theo ngày';
  trendTitleCell.font = { bold: true, size: 14 };
  trendTitleCell.alignment = { horizontal: 'center' };

  const trendHeaderRow = trendSheet.addRow([
    'Ngày',
    'Tổng kiểm tra',
    'Yield Rate (%)',
    'Defect Rate (%)',
    'Số loại lỗi',
  ]);
  trendHeaderRow.eachCell((cell) => {
    Object.assign(cell, headerStyle);
  });

  // Group by date
  const groupedByDate = data.reduce((acc, item) => {
    const dateKey = item.inspectionDate.toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = {
        totalInspected: 0,
        totalPassed: 0,
        totalFailed: 0,
        defectTypes: new Set<string>(),
      };
    }
    acc[dateKey].totalInspected += item.totalInspected;
    acc[dateKey].totalPassed += item.totalPassed;
    acc[dateKey].totalFailed += item.totalFailed;
    item.defectDetails.forEach(d => acc[dateKey].defectTypes.add(d.defectCode));
    return acc;
  }, {} as Record<string, { totalInspected: number; totalPassed: number; totalFailed: number; defectTypes: Set<string> }>);

  Object.entries(groupedByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([date, stats]) => {
      const yieldRate = stats.totalInspected > 0 
        ? (stats.totalPassed / stats.totalInspected) * 100 
        : 0;
      const defectRate = stats.totalInspected > 0 
        ? (stats.totalFailed / stats.totalInspected) * 100 
        : 0;
      
      trendSheet.addRow([
        new Date(date).toLocaleDateString('vi-VN'),
        stats.totalInspected,
        yieldRate.toFixed(2),
        defectRate.toFixed(2),
        stats.defectTypes.size,
      ]);
    });

  trendSheet.columns.forEach((column) => {
    column.width = 18;
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Xuất báo cáo AOI/AVI ra PDF (HTML format for conversion)
 */
export function generateAoiAviPdfHtml(
  data: AoiAviInspectionData[],
  options: AoiAviReportOptions
): string {
  const totalInspected = data.reduce((sum, d) => sum + d.totalInspected, 0);
  const totalPassed = data.reduce((sum, d) => sum + d.totalPassed, 0);
  const totalFailed = data.reduce((sum, d) => sum + d.totalFailed, 0);
  const avgYieldRate = data.length > 0 
    ? data.reduce((sum, d) => sum + d.yieldRate, 0) / data.length 
    : 0;
  const avgDefectRate = data.length > 0 
    ? data.reduce((sum, d) => sum + d.defectRate, 0) / data.length 
    : 0;

  // Aggregate defect types
  const defectAggregation: Record<string, { count: number; type: string; severity: string }> = {};
  data.forEach(item => {
    item.defectDetails.forEach(defect => {
      if (!defectAggregation[defect.defectCode]) {
        defectAggregation[defect.defectCode] = {
          count: 0,
          type: defect.defectType,
          severity: defect.severity,
        };
      }
      defectAggregation[defect.defectCode].count += defect.count;
    });
  });

  const topDefects = Object.entries(defectAggregation)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10);

  const getYieldColor = (rate: number) => {
    if (rate >= 95) return '#10b981';
    if (rate >= 90) return '#f59e0b';
    return '#ef4444';
  };

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${options.title || 'Báo cáo AOI/AVI'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1f2937; line-height: 1.5; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; }
    .header h1 { font-size: 24px; color: #1e40af; margin-bottom: 10px; }
    .header .date-range { color: #6b7280; font-size: 14px; }
    .company-name { font-size: 16px; color: #374151; margin-bottom: 5px; }
    
    .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
    .summary-card { background: #f8fafc; border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #e2e8f0; }
    .summary-card .value { font-size: 28px; font-weight: bold; }
    .summary-card .label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    
    .section { margin-bottom: 25px; }
    .section h2 { font-size: 16px; color: #1e40af; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #374151; }
    tr:hover { background: #f8fafc; }
    
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    
    .chart-container { background: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #6b7280; font-size: 11px; }
    
    @media print {
      .container { max-width: 100%; }
      .summary-cards { grid-template-columns: repeat(3, 1fr); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${options.companyName ? `<div class="company-name">${options.companyName}</div>` : ''}
      <h1>${options.title || 'Báo cáo Kiểm tra AOI/AVI'}</h1>
      <div class="date-range">
        Từ ${options.dateRange.start.toLocaleDateString('vi-VN')} đến ${options.dateRange.end.toLocaleDateString('vi-VN')}
      </div>
    </div>

    <div class="summary-cards">
      <div class="summary-card">
        <div class="value">${totalInspected.toLocaleString()}</div>
        <div class="label">Tổng số kiểm tra</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: ${getYieldColor(avgYieldRate)}">${avgYieldRate.toFixed(2)}%</div>
        <div class="label">Yield Rate TB</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: ${avgDefectRate > 5 ? '#ef4444' : avgDefectRate > 3 ? '#f59e0b' : '#10b981'}">${avgDefectRate.toFixed(2)}%</div>
        <div class="label">Defect Rate TB</div>
      </div>
    </div>

    <div class="summary-cards">
      <div class="summary-card">
        <div class="value" style="color: #10b981">${totalPassed.toLocaleString()}</div>
        <div class="label">Tổng đạt</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: #ef4444">${totalFailed.toLocaleString()}</div>
        <div class="label">Tổng lỗi</div>
      </div>
      <div class="summary-card">
        <div class="value">${data.length}</div>
        <div class="label">Số lần kiểm tra</div>
      </div>
    </div>

    <div class="section">
      <h2>Chi tiết kiểm tra</h2>
      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Dây chuyền</th>
            <th>Mã SP</th>
            <th>Kiểm tra</th>
            <th>Đạt</th>
            <th>Lỗi</th>
            <th>Yield</th>
          </tr>
        </thead>
        <tbody>
          ${data.slice(0, 20).map(item => `
            <tr>
              <td>${item.inspectionDate.toLocaleDateString('vi-VN')}</td>
              <td>${item.productionLineName}</td>
              <td>${item.productCode}</td>
              <td>${item.totalInspected.toLocaleString()}</td>
              <td>${item.totalPassed.toLocaleString()}</td>
              <td>${item.totalFailed.toLocaleString()}</td>
              <td>
                <span class="badge ${item.yieldRate >= 95 ? 'badge-success' : item.yieldRate >= 90 ? 'badge-warning' : 'badge-danger'}">
                  ${item.yieldRate.toFixed(2)}%
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${data.length > 20 ? `<p style="color: #6b7280; font-style: italic;">... và ${data.length - 20} bản ghi khác</p>` : ''}
    </div>

    ${options.includeDefectDetails && topDefects.length > 0 ? `
    <div class="section">
      <h2>Top 10 loại lỗi phổ biến</h2>
      <table>
        <thead>
          <tr>
            <th>Mã lỗi</th>
            <th>Loại lỗi</th>
            <th>Số lượng</th>
            <th>Mức độ</th>
          </tr>
        </thead>
        <tbody>
          ${topDefects.map(([code, info]) => `
            <tr>
              <td>${code}</td>
              <td>${info.type}</td>
              <td>${info.count.toLocaleString()}</td>
              <td>
                <span class="badge ${info.severity === 'critical' ? 'badge-danger' : info.severity === 'major' ? 'badge-warning' : 'badge-success'}">
                  ${info.severity === 'critical' ? 'Nghiêm trọng' : info.severity === 'major' ? 'Lớn' : 'Nhỏ'}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="footer">
      <p>Báo cáo được tạo tự động bởi SPC/CPK Calculator</p>
      <p>Ngày tạo: ${new Date().toLocaleString('vi-VN')}</p>
    </div>
  </div>
</body>
</html>
  `;
}

export default {
  exportAoiAviToExcel,
  generateAoiAviPdfHtml,
};
