/**
 * Line Comparison Export Service
 * Export báo cáo so sánh hiệu suất dây chuyền ra PDF/Excel
 */
import ExcelJS from 'exceljs';
import { getDb } from '../db';
import { productionLines, oeeRecords, spcAnalysisHistory } from '../../drizzle/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export interface LineComparisonData {
  lineId: number;
  lineName: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  cpk: number;
  defectRate: number;
  totalSamples: number;
  oocCount: number;
}

export interface LineComparisonExportOptions {
  lineIds: number[];
  startDate: Date;
  endDate: Date;
  includeCharts?: boolean;
}

/**
 * Lấy dữ liệu so sánh dây chuyền
 */
export async function getLineComparisonData(
  options: LineComparisonExportOptions
): Promise<LineComparisonData[]> {
  const db = await getDb();
  if (!db) return [];

  const { lineIds, startDate, endDate } = options;

  try {
    // Lấy thông tin dây chuyền
    const lines = await db.select()
      .from(productionLines)
      .where(sql`${productionLines.id} IN (${lineIds.join(',')})`);

    const result: LineComparisonData[] = [];

    for (const line of lines) {
      // Lấy OEE data
      const oeeData = await db.select({
        avgOee: sql<number>`AVG(${oeeRecords.oee})`,
        avgAvailability: sql<number>`AVG(${oeeRecords.availability})`,
        avgPerformance: sql<number>`AVG(${oeeRecords.performance})`,
        avgQuality: sql<number>`AVG(${oeeRecords.quality})`,
      })
        .from(oeeRecords)
        .where(
          and(
            eq(oeeRecords.productionLineId, line.id),
            gte(oeeRecords.recordDate, startDate),
            lte(oeeRecords.recordDate, endDate)
          )
        );

      // Lấy SPC data
      const spcData = await db.select({
        avgCpk: sql<number>`AVG(${spcAnalysisHistory.cpk})`,
        totalSamples: sql<number>`SUM(${spcAnalysisHistory.sampleCount})`,
        oocCount: sql<number>`SUM(${spcAnalysisHistory.outOfControlCount})`,
      })
        .from(spcAnalysisHistory)
        .where(
          and(
            eq(spcAnalysisHistory.productionLineId, line.id),
            gte(spcAnalysisHistory.createdAt, startDate),
            lte(spcAnalysisHistory.createdAt, endDate)
          )
        );

      const oee = oeeData[0];
      const spc = spcData[0];

      const totalSamples = Number(spc?.totalSamples) || 0;
      const oocCount = Number(spc?.oocCount) || 0;
      const defectRate = totalSamples > 0 ? (oocCount / totalSamples) * 100 : 0;

      result.push({
        lineId: line.id,
        lineName: line.name,
        oee: Number(oee?.avgOee) || 0,
        availability: Number(oee?.avgAvailability) || 0,
        performance: Number(oee?.avgPerformance) || 0,
        quality: Number(oee?.avgQuality) || 0,
        cpk: Number(spc?.avgCpk) || 0,
        defectRate,
        totalSamples,
        oocCount,
      });
    }

    // Sắp xếp theo OEE giảm dần
    result.sort((a, b) => b.oee - a.oee);

    return result;
  } catch (error) {
    console.error('Error getting line comparison data:', error);
    return [];
  }
}

/**
 * Export báo cáo so sánh dây chuyền ra Excel
 */
export async function exportLineComparisonExcel(
  options: LineComparisonExportOptions
): Promise<Buffer> {
  const data = await getLineComparisonData(options);
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SPC/CPK Calculator';
  workbook.created = new Date();

  // Sheet 1: Tổng quan
  const summarySheet = workbook.addWorksheet('Tổng quan');
  
  // Header
  summarySheet.mergeCells('A1:I1');
  summarySheet.getCell('A1').value = 'BÁO CÁO SO SÁNH HIỆU SUẤT DÂY CHUYỀN';
  summarySheet.getCell('A1').font = { bold: true, size: 16 };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  summarySheet.mergeCells('A2:I2');
  summarySheet.getCell('A2').value = `Từ ${options.startDate.toLocaleDateString('vi-VN')} đến ${options.endDate.toLocaleDateString('vi-VN')}`;
  summarySheet.getCell('A2').alignment = { horizontal: 'center' };

  // Table header
  const headerRow = summarySheet.addRow([
    'STT',
    'Dây chuyền',
    'OEE (%)',
    'Availability (%)',
    'Performance (%)',
    'Quality (%)',
    'CPK',
    'Defect Rate (%)',
    'Tổng mẫu',
  ]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Data rows
  data.forEach((line, index) => {
    const row = summarySheet.addRow([
      index + 1,
      line.lineName,
      line.oee.toFixed(2),
      line.availability.toFixed(2),
      line.performance.toFixed(2),
      line.quality.toFixed(2),
      line.cpk.toFixed(3),
      line.defectRate.toFixed(2),
      line.totalSamples,
    ]);

    // Highlight best/worst
    if (index === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC6EFCE' },
      };
    } else if (index === data.length - 1 && data.length > 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC7CE' },
      };
    }
  });

  // Auto-fit columns
  summarySheet.columns.forEach((column) => {
    column.width = 15;
  });
  summarySheet.getColumn(2).width = 25;

  // Sheet 2: Chi tiết OEE
  const oeeSheet = workbook.addWorksheet('Chi tiết OEE');
  
  oeeSheet.addRow(['Dây chuyền', 'OEE', 'Availability', 'Performance', 'Quality', 'Xếp hạng']);
  oeeSheet.getRow(1).font = { bold: true };

  data.forEach((line, index) => {
    oeeSheet.addRow([
      line.lineName,
      line.oee,
      line.availability,
      line.performance,
      line.quality,
      index + 1,
    ]);
  });

  oeeSheet.columns.forEach((column) => {
    column.width = 18;
  });

  // Sheet 3: Chi tiết CPK
  const cpkSheet = workbook.addWorksheet('Chi tiết CPK');
  
  cpkSheet.addRow(['Dây chuyền', 'CPK', 'Tổng mẫu', 'OOC Count', 'Defect Rate (%)', 'Đánh giá']);
  cpkSheet.getRow(1).font = { bold: true };

  data.forEach((line) => {
    let evaluation = 'Cần cải thiện';
    if (line.cpk >= 1.67) evaluation = 'Xuất sắc';
    else if (line.cpk >= 1.33) evaluation = 'Tốt';
    else if (line.cpk >= 1.0) evaluation = 'Chấp nhận';

    cpkSheet.addRow([
      line.lineName,
      line.cpk,
      line.totalSamples,
      line.oocCount,
      line.defectRate,
      evaluation,
    ]);
  });

  cpkSheet.columns.forEach((column) => {
    column.width = 18;
  });

  // Sheet 4: Phân tích
  const analysisSheet = workbook.addWorksheet('Phân tích');
  
  analysisSheet.addRow(['Phân tích so sánh hiệu suất dây chuyền']);
  analysisSheet.getRow(1).font = { bold: true, size: 14 };
  analysisSheet.addRow([]);

  if (data.length > 0) {
    const best = data[0];
    const worst = data[data.length - 1];
    const avgOee = data.reduce((sum, d) => sum + d.oee, 0) / data.length;
    const avgCpk = data.reduce((sum, d) => sum + d.cpk, 0) / data.length;

    analysisSheet.addRow(['Dây chuyền tốt nhất:', best.lineName]);
    analysisSheet.addRow(['- OEE:', `${best.oee.toFixed(2)}%`]);
    analysisSheet.addRow(['- CPK:', best.cpk.toFixed(3)]);
    analysisSheet.addRow([]);

    if (data.length > 1) {
      analysisSheet.addRow(['Dây chuyền cần cải thiện:', worst.lineName]);
      analysisSheet.addRow(['- OEE:', `${worst.oee.toFixed(2)}%`]);
      analysisSheet.addRow(['- CPK:', worst.cpk.toFixed(3)]);
      analysisSheet.addRow([]);
    }

    analysisSheet.addRow(['Trung bình toàn bộ:']);
    analysisSheet.addRow(['- OEE trung bình:', `${avgOee.toFixed(2)}%`]);
    analysisSheet.addRow(['- CPK trung bình:', avgCpk.toFixed(3)]);
    analysisSheet.addRow([]);

    // Khuyến nghị
    analysisSheet.addRow(['Khuyến nghị:']);
    if (worst.oee < 60) {
      analysisSheet.addRow([`- ${worst.lineName}: OEE thấp (${worst.oee.toFixed(2)}%), cần kiểm tra availability và performance`]);
    }
    if (worst.cpk < 1.0) {
      analysisSheet.addRow([`- ${worst.lineName}: CPK thấp (${worst.cpk.toFixed(3)}), cần cải thiện quy trình sản xuất`]);
    }
    if (best.oee - worst.oee > 20) {
      analysisSheet.addRow([`- Chênh lệch OEE giữa các dây chuyền lớn (${(best.oee - worst.oee).toFixed(2)}%), cần đồng bộ hóa quy trình`]);
    }
  }

  analysisSheet.columns.forEach((column) => {
    column.width = 40;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Export báo cáo so sánh dây chuyền ra PDF (HTML format)
 */
export async function exportLineComparisonPdf(
  options: LineComparisonExportOptions
): Promise<string> {
  const data = await getLineComparisonData(options);

  const best = data[0];
  const worst = data.length > 1 ? data[data.length - 1] : null;
  const avgOee = data.reduce((sum, d) => sum + d.oee, 0) / data.length;
  const avgCpk = data.reduce((sum, d) => sum + d.cpk, 0) / data.length;

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo So sánh Hiệu suất Dây chuyền</title>
  <style>
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    h1 {
      color: #2563eb;
      text-align: center;
      margin-bottom: 10px;
    }
    .subtitle {
      text-align: center;
      color: #666;
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: center;
    }
    th {
      background-color: #2563eb;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    tr.best {
      background-color: #dcfce7;
    }
    tr.worst {
      background-color: #fee2e2;
    }
    .summary-box {
      background-color: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
    }
    .summary-label {
      color: #666;
      font-size: 14px;
    }
    .recommendations {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
    }
    .recommendations h3 {
      margin-top: 0;
      color: #92400e;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
    }
    .badge-success { background-color: #dcfce7; color: #166534; }
    .badge-warning { background-color: #fef3c7; color: #92400e; }
    .badge-danger { background-color: #fee2e2; color: #991b1b; }
    .footer {
      text-align: center;
      color: #999;
      font-size: 12px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <h1>BÁO CÁO SO SÁNH HIỆU SUẤT DÂY CHUYỀN</h1>
  <p class="subtitle">
    Từ ${options.startDate.toLocaleDateString('vi-VN')} đến ${options.endDate.toLocaleDateString('vi-VN')}
  </p>

  <div class="summary-box">
    <div class="summary-grid">
      <div class="summary-item">
        <div class="summary-value">${data.length}</div>
        <div class="summary-label">Dây chuyền</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${avgOee.toFixed(1)}%</div>
        <div class="summary-label">OEE Trung bình</div>
      </div>
      <div class="summary-item">
        <div class="summary-value">${avgCpk.toFixed(2)}</div>
        <div class="summary-label">CPK Trung bình</div>
      </div>
    </div>
  </div>

  <h2>Bảng so sánh chi tiết</h2>
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Dây chuyền</th>
        <th>OEE (%)</th>
        <th>Availability (%)</th>
        <th>Performance (%)</th>
        <th>Quality (%)</th>
        <th>CPK</th>
        <th>Defect Rate (%)</th>
        <th>Đánh giá</th>
      </tr>
    </thead>
    <tbody>
      ${data.map((line, index) => {
        let evaluation = 'Cần cải thiện';
        let badgeClass = 'badge-danger';
        if (line.cpk >= 1.67 && line.oee >= 85) {
          evaluation = 'Xuất sắc';
          badgeClass = 'badge-success';
        } else if (line.cpk >= 1.33 && line.oee >= 75) {
          evaluation = 'Tốt';
          badgeClass = 'badge-success';
        } else if (line.cpk >= 1.0 && line.oee >= 60) {
          evaluation = 'Chấp nhận';
          badgeClass = 'badge-warning';
        }

        const rowClass = index === 0 ? 'best' : (index === data.length - 1 && data.length > 1 ? 'worst' : '');
        
        return `
          <tr class="${rowClass}">
            <td>${index + 1}</td>
            <td>${line.lineName}</td>
            <td>${line.oee.toFixed(2)}</td>
            <td>${line.availability.toFixed(2)}</td>
            <td>${line.performance.toFixed(2)}</td>
            <td>${line.quality.toFixed(2)}</td>
            <td>${line.cpk.toFixed(3)}</td>
            <td>${line.defectRate.toFixed(2)}</td>
            <td><span class="badge ${badgeClass}">${evaluation}</span></td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  ${best ? `
  <h2>Phân tích</h2>
  <div class="summary-box">
    <h3>🏆 Dây chuyền tốt nhất: ${best.lineName}</h3>
    <p>OEE: ${best.oee.toFixed(2)}% | CPK: ${best.cpk.toFixed(3)} | Defect Rate: ${best.defectRate.toFixed(2)}%</p>
    
    ${worst ? `
    <h3>⚠️ Dây chuyền cần cải thiện: ${worst.lineName}</h3>
    <p>OEE: ${worst.oee.toFixed(2)}% | CPK: ${worst.cpk.toFixed(3)} | Defect Rate: ${worst.defectRate.toFixed(2)}%</p>
    ` : ''}
  </div>
  ` : ''}

  <div class="recommendations">
    <h3>📋 Khuyến nghị</h3>
    <ul>
      ${worst && worst.oee < 60 ? `<li><strong>${worst.lineName}:</strong> OEE thấp (${worst.oee.toFixed(2)}%), cần kiểm tra availability và performance</li>` : ''}
      ${worst && worst.cpk < 1.0 ? `<li><strong>${worst.lineName}:</strong> CPK thấp (${worst.cpk.toFixed(3)}), cần cải thiện quy trình sản xuất</li>` : ''}
      ${best && worst && (best.oee - worst.oee > 20) ? `<li>Chênh lệch OEE giữa các dây chuyền lớn (${(best.oee - worst.oee).toFixed(2)}%), cần đồng bộ hóa quy trình</li>` : ''}
      ${avgCpk < 1.33 ? `<li>CPK trung bình (${avgCpk.toFixed(3)}) chưa đạt mức tốt (≥1.33), cần cải thiện toàn diện</li>` : ''}
      ${avgOee < 75 ? `<li>OEE trung bình (${avgOee.toFixed(2)}%) chưa đạt mức tốt (≥75%), cần tối ưu hóa sản xuất</li>` : ''}
      ${avgCpk >= 1.33 && avgOee >= 75 ? `<li>Hiệu suất tổng thể tốt, tiếp tục duy trì và cải tiến liên tục</li>` : ''}
    </ul>
  </div>

  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
    <p>Ngày tạo: ${new Date().toLocaleString('vi-VN')}</p>
  </div>
</body>
</html>
  `;

  return html;
}
