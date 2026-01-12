/**
 * Widget Export Service - Export Pareto Chart và Heat Map ra PDF/Excel
 */
import ExcelJS from 'exceljs';

// Types
export interface ParetoExportData {
  data: Array<{
    categoryId: number | null;
    categoryName: string;
    count: number;
    totalQuantity: number;
    percentage: number;
    cumulativePercentage: number;
    color: string;
    isIn80Percent: boolean;
  }>;
  summary: {
    totalDefects: number;
    totalCategories: number;
    itemsIn80Percent: number;
    percentageOfCategories: number;
    periodDays: number;
    lastUpdated: string;
  } | null;
  filters?: {
    productionLineId?: number;
    productionLineName?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface HeatMapExportData {
  zones: Array<{
    id: number;
    name: string;
    location: string | null;
    status: string | null;
    workstationCount: number;
    yieldRate: number;
    avgCpk: number;
    totalSamples: number;
    passCount: number;
    color: string;
    statusLabel: string;
  }>;
  summary: {
    totalZones: number;
    averageYield: number;
    problemZones: number;
    excellentZones: number;
    periodDays: number;
    lastUpdated: string;
  } | null;
  filters?: {
    productionLineId?: number;
    productionLineName?: string;
    startDate?: string;
    endDate?: string;
  };
}

// Helper function to get CPK status color
function getCpkStatusColor(yieldRate: number): { argb: string; label: string } {
  if (yieldRate >= 98) return { argb: '22C55E', label: 'Xuất sắc' };
  if (yieldRate >= 95) return { argb: '84CC16', label: 'Tốt' };
  if (yieldRate >= 90) return { argb: 'EAB308', label: 'Cảnh báo' };
  if (yieldRate >= 85) return { argb: 'F97316', label: 'Quan ngại' };
  return { argb: 'EF4444', label: 'Nghiêm trọng' };
}

// Generate Pareto Chart PDF HTML
export function generateParetoPdfHtml(data: ParetoExportData): string {
  const now = new Date().toLocaleString('vi-VN');
  const { summary, filters } = data;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo Pareto Chart</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
    .header h1 { color: #1e40af; font-size: 28px; margin-bottom: 8px; }
    .header .subtitle { color: #64748b; font-size: 14px; }
    .meta-info { display: flex; justify-content: space-between; margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
    .meta-item { text-align: center; }
    .meta-item .label { font-size: 12px; color: #64748b; }
    .meta-item .value { font-size: 18px; font-weight: bold; color: #1e293b; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .summary-card { padding: 16px; background: #f1f5f9; border-radius: 8px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: bold; }
    .summary-card .label { font-size: 12px; color: #64748b; }
    .summary-card.highlight { background: #fef3c7; }
    .summary-card.highlight .value { color: #d97706; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-80 { background: #fee2e2; color: #dc2626; }
    .color-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .chart-placeholder { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 40px; text-align: center; color: #64748b; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Báo cáo Pareto Chart - Top Defects</h1>
    <div class="subtitle">Phân tích 80/20: Xác định nguyên nhân chính gây ra 80% lỗi</div>
  </div>

  <div class="meta-info">
    <div class="meta-item">
      <div class="label">Ngày xuất báo cáo</div>
      <div class="value">${now}</div>
    </div>
    <div class="meta-item">
      <div class="label">Khoảng thời gian</div>
      <div class="value">${summary?.periodDays || 30} ngày</div>
    </div>
    ${filters?.productionLineName ? `
    <div class="meta-item">
      <div class="label">Dây chuyền</div>
      <div class="value">${filters.productionLineName}</div>
    </div>
    ` : ''}
  </div>

  ${summary ? `
  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${summary.totalDefects}</div>
      <div class="label">Tổng số lỗi</div>
    </div>
    <div class="summary-card">
      <div class="value">${summary.totalCategories}</div>
      <div class="label">Loại lỗi</div>
    </div>
    <div class="summary-card highlight">
      <div class="value">${summary.itemsIn80Percent}</div>
      <div class="label">Loại trong 80%</div>
    </div>
    <div class="summary-card">
      <div class="value">${summary.percentageOfCategories.toFixed(0)}%</div>
      <div class="label">% Categories</div>
    </div>
  </div>
  ` : ''}

  <div class="chart-placeholder">
    <p>📈 Biểu đồ Pareto (Bar + Line Chart)</p>
    <p style="font-size: 12px; margin-top: 8px;">Xem biểu đồ tương tác trên ứng dụng web</p>
  </div>

  <h3 style="margin-bottom: 16px;">Chi tiết Top Defects</h3>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Loại lỗi</th>
        <th>Số lượng</th>
        <th>Tỷ lệ (%)</th>
        <th>Tích lũy (%)</th>
        <th>Nhóm</th>
      </tr>
    </thead>
    <tbody>
      ${data.data.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>
          <span class="color-dot" style="background-color: ${item.color}"></span>
          ${item.categoryName}
        </td>
        <td><strong>${item.count}</strong></td>
        <td>${item.percentage.toFixed(2)}%</td>
        <td>${item.cumulativePercentage.toFixed(2)}%</td>
        <td>${item.isIn80Percent ? '<span class="badge badge-80">Nhóm A (80%)</span>' : 'Nhóm B'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} - Phân tích Pareto 80/20</p>
  </div>
</body>
</html>`;
}

// Generate Heat Map PDF HTML
export function generateHeatMapPdfHtml(data: HeatMapExportData): string {
  const now = new Date().toLocaleString('vi-VN');
  const { summary, filters } = data;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo Heat Map Yield</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #22c55e; padding-bottom: 20px; }
    .header h1 { color: #166534; font-size: 28px; margin-bottom: 8px; }
    .header .subtitle { color: #64748b; font-size: 14px; }
    .meta-info { display: flex; justify-content: space-between; margin-bottom: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; }
    .meta-item { text-align: center; }
    .meta-item .label { font-size: 12px; color: #64748b; }
    .meta-item .value { font-size: 18px; font-weight: bold; color: #1e293b; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .summary-card { padding: 16px; background: #f1f5f9; border-radius: 8px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: bold; }
    .summary-card .label { font-size: 12px; color: #64748b; }
    .summary-card.good .value { color: #22c55e; }
    .summary-card.bad .value { color: #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    tr:hover { background: #f8fafc; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: white; }
    .yield-bar { height: 20px; border-radius: 4px; min-width: 20px; }
    .legend { display: flex; gap: 16px; justify-content: center; margin: 24px 0; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .legend-color { width: 16px; height: 16px; border-radius: 4px; }
    .footer { margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .heat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .heat-cell { padding: 16px; border-radius: 8px; color: white; text-align: center; }
    .heat-cell .name { font-size: 12px; opacity: 0.9; }
    .heat-cell .yield { font-size: 24px; font-weight: bold; }
    .heat-cell .samples { font-size: 11px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🗺️ Báo cáo Heat Map Yield - Floor Plan</h1>
    <div class="subtitle">Bản đồ nhiệt hiển thị yield rate theo vùng nhà xưởng</div>
  </div>

  <div class="meta-info">
    <div class="meta-item">
      <div class="label">Ngày xuất báo cáo</div>
      <div class="value">${now}</div>
    </div>
    <div class="meta-item">
      <div class="label">Khoảng thời gian</div>
      <div class="value">${summary?.periodDays || 7} ngày</div>
    </div>
    ${filters?.productionLineName ? `
    <div class="meta-item">
      <div class="label">Dây chuyền</div>
      <div class="value">${filters.productionLineName}</div>
    </div>
    ` : ''}
  </div>

  ${summary ? `
  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${summary.totalZones}</div>
      <div class="label">Tổng khu vực</div>
    </div>
    <div class="summary-card good">
      <div class="value">${summary.averageYield.toFixed(1)}%</div>
      <div class="label">Yield TB</div>
    </div>
    <div class="summary-card good">
      <div class="value">${summary.excellentZones}</div>
      <div class="label">Xuất sắc (≥98%)</div>
    </div>
    <div class="summary-card bad">
      <div class="value">${summary.problemZones}</div>
      <div class="label">Có vấn đề (<90%)</div>
    </div>
  </div>
  ` : ''}

  <div class="legend">
    <div class="legend-item"><div class="legend-color" style="background: #22c55e"></div>≥98% Xuất sắc</div>
    <div class="legend-item"><div class="legend-color" style="background: #84cc16"></div>95-98% Tốt</div>
    <div class="legend-item"><div class="legend-color" style="background: #eab308"></div>90-95% Cảnh báo</div>
    <div class="legend-item"><div class="legend-color" style="background: #f97316"></div>85-90% Quan ngại</div>
    <div class="legend-item"><div class="legend-color" style="background: #ef4444"></div><85% Nghiêm trọng</div>
  </div>

  <div class="heat-grid">
    ${data.zones.slice(0, 12).map(zone => `
    <div class="heat-cell" style="background-color: ${zone.color}">
      <div class="name">${zone.name}</div>
      <div class="yield">${zone.yieldRate.toFixed(1)}%</div>
      <div class="samples">${zone.totalSamples} mẫu</div>
    </div>
    `).join('')}
  </div>

  <h3 style="margin-bottom: 16px;">Chi tiết các khu vực</h3>
  <table>
    <thead>
      <tr>
        <th>Khu vực</th>
        <th>Yield Rate</th>
        <th>CPK TB</th>
        <th>Tổng mẫu</th>
        <th>Pass</th>
        <th>Công trạm</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>
      ${data.zones.map(zone => `
      <tr>
        <td><strong>${zone.name}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="yield-bar" style="width: ${zone.yieldRate}%; background-color: ${zone.color}"></div>
            <span>${zone.yieldRate.toFixed(2)}%</span>
          </div>
        </td>
        <td>${zone.avgCpk.toFixed(3)}</td>
        <td>${zone.totalSamples}</td>
        <td>${zone.passCount}</td>
        <td>${zone.workstationCount}</td>
        <td><span class="badge" style="background-color: ${zone.color}">${zone.statusLabel}</span></td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
    <p>© ${new Date().getFullYear()} - Heat Map Yield Analysis</p>
  </div>
</body>
</html>`;
}

// Generate Pareto Excel
export async function generateParetoExcelBuffer(data: ParetoExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SPC/CPK Calculator';
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Tổng quan', {
    properties: { tabColor: { argb: '3B82F6' } }
  });

  summarySheet.columns = [
    { width: 25 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  // Title
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'BÁO CÁO PARETO CHART - TOP DEFECTS';
  titleCell.font = { size: 18, bold: true, color: { argb: '1E40AF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 35;

  // Subtitle
  summarySheet.mergeCells('A2:D2');
  const subtitleCell = summarySheet.getCell('A2');
  subtitleCell.value = 'Phân tích 80/20: Xác định nguyên nhân chính gây ra 80% lỗi';
  subtitleCell.font = { size: 11, italic: true, color: { argb: '64748B' } };
  subtitleCell.alignment = { horizontal: 'center' };

  // Summary stats
  if (data.summary) {
    const statsRow = 4;
    summarySheet.getCell(`A${statsRow}`).value = 'Thống kê tổng quan';
    summarySheet.getCell(`A${statsRow}`).font = { size: 14, bold: true };
    summarySheet.mergeCells(`A${statsRow}:D${statsRow}`);

    const statsData = [
      ['Tổng số lỗi', data.summary.totalDefects, 'Loại lỗi', data.summary.totalCategories],
      ['Loại trong 80%', data.summary.itemsIn80Percent, '% Categories', `${data.summary.percentageOfCategories.toFixed(0)}%`],
      ['Khoảng thời gian', `${data.summary.periodDays} ngày`, 'Cập nhật lúc', data.summary.lastUpdated],
    ];

    statsData.forEach((row, idx) => {
      const rowNum = statsRow + 1 + idx;
      summarySheet.getRow(rowNum).values = row;
      summarySheet.getCell(`A${rowNum}`).font = { bold: true, color: { argb: '64748B' } };
      summarySheet.getCell(`C${rowNum}`).font = { bold: true, color: { argb: '64748B' } };
    });
  }

  // Data Sheet
  const dataSheet = workbook.addWorksheet('Chi tiết Defects', {
    properties: { tabColor: { argb: 'EF4444' } }
  });

  dataSheet.columns = [
    { header: '#', key: 'index', width: 8 },
    { header: 'Loại lỗi', key: 'categoryName', width: 30 },
    { header: 'Số lượng', key: 'count', width: 12 },
    { header: 'Tổng SL', key: 'totalQuantity', width: 12 },
    { header: 'Tỷ lệ (%)', key: 'percentage', width: 12 },
    { header: 'Tích lũy (%)', key: 'cumulativePercentage', width: 14 },
    { header: 'Nhóm', key: 'group', width: 15 },
  ];

  // Style header
  dataSheet.getRow(1).font = { bold: true };
  dataSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F1F5F9' }
  };

  // Add data
  data.data.forEach((item, index) => {
    const row = dataSheet.addRow({
      index: index + 1,
      categoryName: item.categoryName,
      count: item.count,
      totalQuantity: item.totalQuantity,
      percentage: item.percentage,
      cumulativePercentage: item.cumulativePercentage,
      group: item.isIn80Percent ? 'Nhóm A (80%)' : 'Nhóm B',
    });

    // Highlight 80% items
    if (item.isIn80Percent) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FEF3C7' }
      };
    }
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Generate Heat Map Excel
export async function generateHeatMapExcelBuffer(data: HeatMapExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SPC/CPK Calculator';
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Tổng quan', {
    properties: { tabColor: { argb: '22C55E' } }
  });

  summarySheet.columns = [
    { width: 25 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  // Title
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'BÁO CÁO HEAT MAP YIELD - FLOOR PLAN';
  titleCell.font = { size: 18, bold: true, color: { argb: '166534' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 35;

  // Subtitle
  summarySheet.mergeCells('A2:D2');
  const subtitleCell = summarySheet.getCell('A2');
  subtitleCell.value = 'Bản đồ nhiệt hiển thị yield rate theo vùng nhà xưởng';
  subtitleCell.font = { size: 11, italic: true, color: { argb: '64748B' } };
  subtitleCell.alignment = { horizontal: 'center' };

  // Summary stats
  if (data.summary) {
    const statsRow = 4;
    summarySheet.getCell(`A${statsRow}`).value = 'Thống kê tổng quan';
    summarySheet.getCell(`A${statsRow}`).font = { size: 14, bold: true };
    summarySheet.mergeCells(`A${statsRow}:D${statsRow}`);

    const statsData = [
      ['Tổng khu vực', data.summary.totalZones, 'Yield TB', `${data.summary.averageYield.toFixed(1)}%`],
      ['Xuất sắc (≥98%)', data.summary.excellentZones, 'Có vấn đề (<90%)', data.summary.problemZones],
      ['Khoảng thời gian', `${data.summary.periodDays} ngày`, 'Cập nhật lúc', data.summary.lastUpdated],
    ];

    statsData.forEach((row, idx) => {
      const rowNum = statsRow + 1 + idx;
      summarySheet.getRow(rowNum).values = row;
      summarySheet.getCell(`A${rowNum}`).font = { bold: true, color: { argb: '64748B' } };
      summarySheet.getCell(`C${rowNum}`).font = { bold: true, color: { argb: '64748B' } };
    });
  }

  // Data Sheet
  const dataSheet = workbook.addWorksheet('Chi tiết Khu vực', {
    properties: { tabColor: { argb: '22C55E' } }
  });

  dataSheet.columns = [
    { header: 'Khu vực', key: 'name', width: 25 },
    { header: 'Vị trí', key: 'location', width: 20 },
    { header: 'Yield Rate (%)', key: 'yieldRate', width: 15 },
    { header: 'CPK TB', key: 'avgCpk', width: 12 },
    { header: 'Tổng mẫu', key: 'totalSamples', width: 12 },
    { header: 'Pass', key: 'passCount', width: 12 },
    { header: 'Công trạm', key: 'workstationCount', width: 12 },
    { header: 'Trạng thái', key: 'statusLabel', width: 15 },
  ];

  // Style header
  dataSheet.getRow(1).font = { bold: true };
  dataSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F1F5F9' }
  };

  // Add data
  data.zones.forEach(zone => {
    const row = dataSheet.addRow({
      name: zone.name,
      location: zone.location || '-',
      yieldRate: zone.yieldRate,
      avgCpk: zone.avgCpk,
      totalSamples: zone.totalSamples,
      passCount: zone.passCount,
      workstationCount: zone.workstationCount,
      statusLabel: zone.statusLabel,
    });

    // Color based on yield rate
    const statusColor = getCpkStatusColor(zone.yieldRate);
    row.getCell('yieldRate').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: statusColor.argb + '30' }
    };
    row.getCell('statusLabel').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: statusColor.argb + '30' }
    };
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
