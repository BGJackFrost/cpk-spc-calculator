/**
 * Drift Report Export Service
 * Export drift check reports to PDF/Excel
 */

import ExcelJS from 'exceljs';

// Types
export interface DriftReportData {
  modelId: string;
  modelName: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalChecks: number;
    alertsTriggered: number;
    avgAccuracy: number;
    avgAccuracyDrop: number;
    avgFeatureDrift: number;
    avgPredictionDrift: number;
    maxSeverity: 'low' | 'medium' | 'high' | 'critical';
  };
  metricsHistory: Array<{
    timestamp: Date;
    accuracy: number;
    accuracyDrop: number;
    featureDrift: number;
    predictionDrift: number;
    severity: string;
  }>;
  alerts: Array<{
    id: string;
    timestamp: Date;
    alertType: string;
    severity: string;
    message: string;
    acknowledged: boolean;
    resolvedAt?: Date;
  }>;
  recommendations: string[];
}

/**
 * Generate HTML report for PDF export
 */
export function generateDriftReportHtml(data: DriftReportData): string {
  const severityColor = {
    low: '#22c55e',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444'
  };

  const formatDate = (date: Date) => new Date(date).toLocaleString('vi-VN');
  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo Drift Check - ${data.modelName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1f2937; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; }
    .header h1 { color: #1e40af; font-size: 28px; margin-bottom: 10px; }
    .header .subtitle { color: #6b7280; font-size: 14px; }
    .section { margin-bottom: 30px; }
    .section-title { font-size: 18px; color: #1e40af; margin-bottom: 15px; border-left: 4px solid #3b82f6; padding-left: 10px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #1e40af; }
    .summary-card .label { font-size: 12px; color: #6b7280; margin-top: 5px; }
    .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: white; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    tr:hover { background: #f8fafc; }
    .alert-row { border-left: 4px solid; }
    .recommendations { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; }
    .recommendations ul { margin-left: 20px; }
    .recommendations li { margin-bottom: 8px; color: #1e40af; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .chart-placeholder { background: #f1f5f9; height: 200px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📊 Báo cáo Drift Check</h1>
    <div class="subtitle">
      Model: <strong>${data.modelName}</strong> (${data.modelId})<br>
      Kỳ báo cáo: ${formatDate(data.reportPeriod.startDate)} - ${formatDate(data.reportPeriod.endDate)}
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Tổng quan</h2>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="value">${data.summary.totalChecks}</div>
        <div class="label">Tổng số lần kiểm tra</div>
      </div>
      <div class="summary-card">
        <div class="value">${data.summary.alertsTriggered}</div>
        <div class="label">Cảnh báo đã kích hoạt</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatPercent(data.summary.avgAccuracy)}</div>
        <div class="label">Độ chính xác trung bình</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatPercent(data.summary.avgAccuracyDrop)}</div>
        <div class="label">Mức giảm accuracy TB</div>
      </div>
      <div class="summary-card">
        <div class="value">${formatPercent(data.summary.avgFeatureDrift)}</div>
        <div class="label">Feature Drift TB</div>
      </div>
      <div class="summary-card">
        <div class="value" style="color: ${severityColor[data.summary.maxSeverity]}">
          <span class="severity-badge" style="background: ${severityColor[data.summary.maxSeverity]}">${data.summary.maxSeverity.toUpperCase()}</span>
        </div>
        <div class="label">Mức độ nghiêm trọng cao nhất</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Lịch sử Metrics (${data.metricsHistory.length} bản ghi)</h2>
    <table>
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Accuracy</th>
          <th>Accuracy Drop</th>
          <th>Feature Drift</th>
          <th>Prediction Drift</th>
          <th>Severity</th>
        </tr>
      </thead>
      <tbody>
        ${data.metricsHistory.slice(0, 20).map(m => `
          <tr>
            <td>${formatDate(m.timestamp)}</td>
            <td>${formatPercent(m.accuracy)}</td>
            <td>${formatPercent(m.accuracyDrop)}</td>
            <td>${formatPercent(m.featureDrift)}</td>
            <td>${formatPercent(m.predictionDrift)}</td>
            <td><span class="severity-badge" style="background: ${severityColor[m.severity as keyof typeof severityColor] || '#6b7280'}">${m.severity}</span></td>
          </tr>
        `).join('')}
        ${data.metricsHistory.length > 20 ? `<tr><td colspan="6" style="text-align: center; color: #6b7280;">... và ${data.metricsHistory.length - 20} bản ghi khác</td></tr>` : ''}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Danh sách Cảnh báo (${data.alerts.length})</h2>
    ${data.alerts.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Thời gian</th>
          <th>Loại</th>
          <th>Mức độ</th>
          <th>Thông báo</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        ${data.alerts.slice(0, 15).map(a => `
          <tr class="alert-row" style="border-left-color: ${severityColor[a.severity as keyof typeof severityColor] || '#6b7280'}">
            <td>${formatDate(a.timestamp)}</td>
            <td>${a.alertType}</td>
            <td><span class="severity-badge" style="background: ${severityColor[a.severity as keyof typeof severityColor] || '#6b7280'}">${a.severity}</span></td>
            <td>${a.message}</td>
            <td>${a.resolvedAt ? '✅ Đã xử lý' : (a.acknowledged ? '👀 Đã xem' : '⚠️ Chưa xử lý')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p style="color: #6b7280; text-align: center; padding: 20px;">Không có cảnh báo trong kỳ báo cáo</p>'}
  </div>

  <div class="section">
    <h2 class="section-title">Khuyến nghị</h2>
    <div class="recommendations">
      <ul>
        ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
  </div>

  <div class="footer">
    <p>Báo cáo được tạo tự động bởi Hệ thống SPC/CPK Calculator</p>
    <p>Thời gian tạo: ${new Date().toLocaleString('vi-VN')}</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate Excel report with multiple sheets
 */
export async function generateDriftReportExcel(data: DriftReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SPC/CPK Calculator';
  workbook.created = new Date();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Tổng quan');
  summarySheet.columns = [
    { header: 'Chỉ số', key: 'metric', width: 30 },
    { header: 'Giá trị', key: 'value', width: 25 }
  ];
  
  summarySheet.addRows([
    { metric: 'Model ID', value: data.modelId },
    { metric: 'Model Name', value: data.modelName },
    { metric: 'Kỳ báo cáo (Bắt đầu)', value: new Date(data.reportPeriod.startDate).toLocaleString('vi-VN') },
    { metric: 'Kỳ báo cáo (Kết thúc)', value: new Date(data.reportPeriod.endDate).toLocaleString('vi-VN') },
    { metric: '', value: '' },
    { metric: 'Tổng số lần kiểm tra', value: data.summary.totalChecks },
    { metric: 'Số cảnh báo đã kích hoạt', value: data.summary.alertsTriggered },
    { metric: 'Độ chính xác trung bình', value: `${(data.summary.avgAccuracy * 100).toFixed(2)}%` },
    { metric: 'Mức giảm accuracy TB', value: `${(data.summary.avgAccuracyDrop * 100).toFixed(2)}%` },
    { metric: 'Feature Drift TB', value: `${(data.summary.avgFeatureDrift * 100).toFixed(2)}%` },
    { metric: 'Prediction Drift TB', value: `${(data.summary.avgPredictionDrift * 100).toFixed(2)}%` },
    { metric: 'Mức độ nghiêm trọng cao nhất', value: data.summary.maxSeverity.toUpperCase() }
  ]);

  // Style header row
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Sheet 2: Metrics History
  const metricsSheet = workbook.addWorksheet('Lịch sử Metrics');
  metricsSheet.columns = [
    { header: 'Thời gian', key: 'timestamp', width: 20 },
    { header: 'Accuracy', key: 'accuracy', width: 15 },
    { header: 'Accuracy Drop', key: 'accuracyDrop', width: 15 },
    { header: 'Feature Drift', key: 'featureDrift', width: 15 },
    { header: 'Prediction Drift', key: 'predictionDrift', width: 15 },
    { header: 'Severity', key: 'severity', width: 12 }
  ];

  data.metricsHistory.forEach(m => {
    metricsSheet.addRow({
      timestamp: new Date(m.timestamp).toLocaleString('vi-VN'),
      accuracy: `${(m.accuracy * 100).toFixed(2)}%`,
      accuracyDrop: `${(m.accuracyDrop * 100).toFixed(2)}%`,
      featureDrift: `${(m.featureDrift * 100).toFixed(2)}%`,
      predictionDrift: `${(m.predictionDrift * 100).toFixed(2)}%`,
      severity: m.severity
    });
  });

  metricsSheet.getRow(1).font = { bold: true };
  metricsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
  metricsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Sheet 3: Alerts
  const alertsSheet = workbook.addWorksheet('Cảnh báo');
  alertsSheet.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'Thời gian', key: 'timestamp', width: 20 },
    { header: 'Loại', key: 'alertType', width: 20 },
    { header: 'Mức độ', key: 'severity', width: 12 },
    { header: 'Thông báo', key: 'message', width: 50 },
    { header: 'Đã xem', key: 'acknowledged', width: 10 },
    { header: 'Thời gian xử lý', key: 'resolvedAt', width: 20 }
  ];

  data.alerts.forEach(a => {
    alertsSheet.addRow({
      id: a.id,
      timestamp: new Date(a.timestamp).toLocaleString('vi-VN'),
      alertType: a.alertType,
      severity: a.severity,
      message: a.message,
      acknowledged: a.acknowledged ? 'Có' : 'Không',
      resolvedAt: a.resolvedAt ? new Date(a.resolvedAt).toLocaleString('vi-VN') : ''
    });
  });

  alertsSheet.getRow(1).font = { bold: true };
  alertsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
  alertsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Sheet 4: Recommendations
  const recsSheet = workbook.addWorksheet('Khuyến nghị');
  recsSheet.columns = [
    { header: 'STT', key: 'index', width: 10 },
    { header: 'Khuyến nghị', key: 'recommendation', width: 80 }
  ];

  data.recommendations.forEach((r, i) => {
    recsSheet.addRow({ index: i + 1, recommendation: r });
  });

  recsSheet.getRow(1).font = { bold: true };
  recsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
  recsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Generate recommendations based on drift data
 */
export function generateDriftRecommendations(data: Omit<DriftReportData, 'recommendations'>): string[] {
  const recommendations: string[] = [];

  // Accuracy-based recommendations
  if (data.summary.avgAccuracy < 0.8) {
    recommendations.push('Độ chính xác model dưới 80%. Cần xem xét retrain model với dữ liệu mới.');
  } else if (data.summary.avgAccuracy < 0.9) {
    recommendations.push('Độ chính xác model ở mức trung bình (80-90%). Theo dõi chặt chẽ và chuẩn bị phương án retrain.');
  }

  // Accuracy drop recommendations
  if (data.summary.avgAccuracyDrop > 0.1) {
    recommendations.push('Mức giảm accuracy trung bình > 10%. Cần điều tra nguyên nhân và có hành động khắc phục ngay.');
  } else if (data.summary.avgAccuracyDrop > 0.05) {
    recommendations.push('Mức giảm accuracy trung bình 5-10%. Theo dõi xu hướng và chuẩn bị kế hoạch retrain.');
  }

  // Feature drift recommendations
  if (data.summary.avgFeatureDrift > 0.3) {
    recommendations.push('Feature drift cao (>30%). Dữ liệu đầu vào đã thay đổi đáng kể. Cần xem xét lại feature engineering.');
  } else if (data.summary.avgFeatureDrift > 0.15) {
    recommendations.push('Feature drift ở mức trung bình (15-30%). Theo dõi các features có drift cao nhất.');
  }

  // Prediction drift recommendations
  if (data.summary.avgPredictionDrift > 0.2) {
    recommendations.push('Prediction drift cao (>20%). Phân phối dự đoán đã thay đổi. Cần kiểm tra lại model.');
  }

  // Alert-based recommendations
  if (data.summary.alertsTriggered > 10) {
    recommendations.push(`Có ${data.summary.alertsTriggered} cảnh báo trong kỳ. Cần review và xử lý các cảnh báo chưa giải quyết.`);
  }

  // Severity-based recommendations
  if (data.summary.maxSeverity === 'critical') {
    recommendations.push('Có cảnh báo mức CRITICAL. Cần hành động khẩn cấp để khắc phục.');
  } else if (data.summary.maxSeverity === 'high') {
    recommendations.push('Có cảnh báo mức HIGH. Cần ưu tiên xử lý trong thời gian sớm nhất.');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Model hoạt động ổn định. Tiếp tục theo dõi định kỳ.');
  }

  recommendations.push('Đảm bảo cấu hình drift detection phù hợp với đặc thù dữ liệu của model.');
  recommendations.push('Thiết lập webhook notification để nhận cảnh báo kịp thời.');

  return recommendations;
}
