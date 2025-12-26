/**
 * Predictive Forecast Report Service
 * Service tạo báo cáo dự báo OEE và Defect ra PDF/Excel
 */

import ExcelJS from 'exceljs';

// Types
export interface OeeForecastData {
  productionLineId: number;
  productionLineName: string;
  forecastDate: string;
  currentOee: number;
  predictedOee: number;
  availability: { current: number; predicted: number };
  performance: { current: number; predicted: number };
  quality: { current: number; predicted: number };
  trend: 'improving' | 'stable' | 'declining';
  confidence: number;
  recommendations: string[];
  historicalData: Array<{
    date: string;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }>;
}

export interface DefectPredictionData {
  productionLineId: number;
  productionLineName: string;
  predictionDate: string;
  currentDefectRate: number;
  predictedDefectRate: number;
  defectsByType: Array<{
    type: string;
    currentCount: number;
    predictedCount: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  rootCauses: Array<{
    cause: string;
    probability: number;
    impact: 'low' | 'medium' | 'high';
  }>;
  preventiveActions: string[];
  historicalData: Array<{
    date: string;
    defectRate: number;
    defectCount: number;
  }>;
}

export interface ReportOptions {
  title?: string;
  subtitle?: string;
  companyName?: string;
  generatedBy?: string;
  includeCharts?: boolean;
  includeTrends?: boolean;
  includeRecommendations?: boolean;
  dateRange?: { from: string; to: string };
}

// Generate OEE Forecast HTML Report
export function generateOeeForecastHtml(
  data: OeeForecastData[],
  options: ReportOptions = {}
): string {
  const {
    title = 'Báo cáo Dự báo OEE',
    subtitle = 'Overall Equipment Effectiveness Forecast Report',
    companyName = 'Hệ thống SPC/CPK',
    generatedBy = 'System',
    includeRecommendations = true,
    dateRange,
  } = options;

  const now = new Date().toLocaleString('vi-VN');

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return '#22c55e';
      case 'declining': return '#ef4444';
      default: return '#eab308';
    }
  };

  const getOeeColor = (oee: number) => {
    if (oee >= 85) return '#22c55e';
    if (oee >= 65) return '#eab308';
    return '#ef4444';
  };

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .report-header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .report-header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .report-header p { opacity: 0.9; }
    .meta-info {
      display: flex;
      gap: 30px;
      margin-top: 20px;
      font-size: 0.9rem;
    }
    .meta-info span { display: flex; align-items: center; gap: 5px; }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .summary-card h3 { color: #666; font-size: 0.9rem; margin-bottom: 10px; }
    .summary-card .value { font-size: 2rem; font-weight: bold; }
    .summary-card .change { font-size: 0.85rem; margin-top: 5px; }
    
    .section { 
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .section h2 { 
      color: #1e40af;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .line-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .line-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .line-name { font-size: 1.2rem; font-weight: 600; }
    .trend-badge {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 15px;
    }
    .metric {
      text-align: center;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .metric-label { font-size: 0.8rem; color: #666; }
    .metric-value { font-size: 1.5rem; font-weight: bold; margin: 5px 0; }
    .metric-change { font-size: 0.75rem; }
    
    .recommendations {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      border-radius: 0 8px 8px 0;
    }
    .recommendations h4 { color: #1e40af; margin-bottom: 10px; }
    .recommendations ul { margin-left: 20px; }
    .recommendations li { margin-bottom: 5px; }
    
    .confidence-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, #22c55e, #3b82f6);
      border-radius: 4px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th { background: #f8fafc; font-weight: 600; }
    tr:hover { background: #f8fafc; }
    
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 0.85rem;
    }
    
    @media print {
      body { background: white; }
      .container { max-width: 100%; }
      .section { box-shadow: none; border: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="report-header">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <div class="meta-info">
        <span>🏢 ${companyName}</span>
        <span>📅 ${now}</span>
        <span>👤 ${generatedBy}</span>
        ${dateRange ? `<span>📆 ${dateRange.from} - ${dateRange.to}</span>` : ''}
      </div>
    </div>
    
    <div class="summary-cards">
      <div class="summary-card">
        <h3>Số dây chuyền</h3>
        <div class="value">${data.length}</div>
        <div class="change">Được phân tích</div>
      </div>
      <div class="summary-card">
        <h3>OEE Trung bình hiện tại</h3>
        <div class="value" style="color: ${getOeeColor(data.reduce((sum, d) => sum + d.currentOee, 0) / data.length)}">
          ${(data.reduce((sum, d) => sum + d.currentOee, 0) / data.length).toFixed(1)}%
        </div>
        <div class="change">Across all lines</div>
      </div>
      <div class="summary-card">
        <h3>OEE Dự báo trung bình</h3>
        <div class="value" style="color: ${getOeeColor(data.reduce((sum, d) => sum + d.predictedOee, 0) / data.length)}">
          ${(data.reduce((sum, d) => sum + d.predictedOee, 0) / data.length).toFixed(1)}%
        </div>
        <div class="change">Predicted average</div>
      </div>
      <div class="summary-card">
        <h3>Độ tin cậy TB</h3>
        <div class="value">${(data.reduce((sum, d) => sum + d.confidence, 0) / data.length).toFixed(0)}%</div>
        <div class="change">Prediction confidence</div>
      </div>
    </div>
    
    <div class="section">
      <h2>📊 Chi tiết Dự báo theo Dây chuyền</h2>
      ${data.map(line => `
        <div class="line-card">
          <div class="line-header">
            <span class="line-name">${line.productionLineName}</span>
            <span class="trend-badge" style="background: ${getTrendColor(line.trend)}20; color: ${getTrendColor(line.trend)}">
              ${getTrendIcon(line.trend)} ${line.trend === 'improving' ? 'Cải thiện' : line.trend === 'declining' ? 'Giảm' : 'Ổn định'}
            </span>
          </div>
          
          <div class="metrics-grid">
            <div class="metric">
              <div class="metric-label">OEE Hiện tại</div>
              <div class="metric-value" style="color: ${getOeeColor(line.currentOee)}">${line.currentOee.toFixed(1)}%</div>
            </div>
            <div class="metric">
              <div class="metric-label">OEE Dự báo</div>
              <div class="metric-value" style="color: ${getOeeColor(line.predictedOee)}">${line.predictedOee.toFixed(1)}%</div>
              <div class="metric-change" style="color: ${line.predictedOee >= line.currentOee ? '#22c55e' : '#ef4444'}">
                ${line.predictedOee >= line.currentOee ? '↑' : '↓'} ${Math.abs(line.predictedOee - line.currentOee).toFixed(1)}%
              </div>
            </div>
            <div class="metric">
              <div class="metric-label">Availability</div>
              <div class="metric-value">${line.availability.predicted.toFixed(1)}%</div>
              <div class="metric-change">(${line.availability.current.toFixed(1)}% → ${line.availability.predicted.toFixed(1)}%)</div>
            </div>
            <div class="metric">
              <div class="metric-label">Performance</div>
              <div class="metric-value">${line.performance.predicted.toFixed(1)}%</div>
              <div class="metric-change">(${line.performance.current.toFixed(1)}% → ${line.performance.predicted.toFixed(1)}%)</div>
            </div>
          </div>
          
          <div style="margin-bottom: 15px;">
            <small>Độ tin cậy dự báo: ${line.confidence}%</small>
            <div class="confidence-bar">
              <div class="confidence-fill" style="width: ${line.confidence}%"></div>
            </div>
          </div>
          
          ${includeRecommendations && line.recommendations.length > 0 ? `
            <div class="recommendations">
              <h4>💡 Khuyến nghị</h4>
              <ul>
                ${line.recommendations.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    
    <div class="section">
      <h2>📈 Bảng Tổng hợp</h2>
      <table>
        <thead>
          <tr>
            <th>Dây chuyền</th>
            <th>OEE Hiện tại</th>
            <th>OEE Dự báo</th>
            <th>Thay đổi</th>
            <th>Xu hướng</th>
            <th>Độ tin cậy</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(line => `
            <tr>
              <td>${line.productionLineName}</td>
              <td style="color: ${getOeeColor(line.currentOee)}">${line.currentOee.toFixed(1)}%</td>
              <td style="color: ${getOeeColor(line.predictedOee)}">${line.predictedOee.toFixed(1)}%</td>
              <td style="color: ${line.predictedOee >= line.currentOee ? '#22c55e' : '#ef4444'}">
                ${line.predictedOee >= line.currentOee ? '+' : ''}${(line.predictedOee - line.currentOee).toFixed(1)}%
              </td>
              <td>${getTrendIcon(line.trend)} ${line.trend === 'improving' ? 'Cải thiện' : line.trend === 'declining' ? 'Giảm' : 'Ổn định'}</td>
              <td>${line.confidence}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>Báo cáo được tạo tự động bởi ${companyName}</p>
      <p>© ${new Date().getFullYear()} - Hệ thống Quản lý Chất lượng SPC/CPK</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Generate Defect Prediction HTML Report
export function generateDefectPredictionHtml(
  data: DefectPredictionData[],
  options: ReportOptions = {}
): string {
  const {
    title = 'Báo cáo Dự báo Lỗi',
    subtitle = 'Defect Prediction Report',
    companyName = 'Hệ thống SPC/CPK',
    generatedBy = 'System',
    includeRecommendations = true,
    dateRange,
  } = options;

  const now = new Date().toLocaleString('vi-VN');

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#ca8a04';
      default: return '#16a34a';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'critical': return 'Nghiêm trọng';
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      default: return 'Thấp';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .report-header {
      background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);
      color: white;
      padding: 40px;
      border-radius: 12px;
      margin-bottom: 30px;
    }
    .report-header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .report-header p { opacity: 0.9; }
    .meta-info {
      display: flex;
      gap: 30px;
      margin-top: 20px;
      font-size: 0.9rem;
    }
    
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .summary-card h3 { color: #666; font-size: 0.9rem; margin-bottom: 10px; }
    .summary-card .value { font-size: 2rem; font-weight: bold; }
    
    .section { 
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .section h2 { 
      color: #dc2626;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .line-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .line-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    .line-name { font-size: 1.2rem; font-weight: 600; }
    .risk-badge {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      color: white;
    }
    
    .defect-types {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 15px;
    }
    .defect-type {
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
      border-left: 4px solid #e5e7eb;
    }
    .defect-type.increasing { border-left-color: #ef4444; }
    .defect-type.decreasing { border-left-color: #22c55e; }
    .defect-type.stable { border-left-color: #eab308; }
    
    .root-causes {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 15px;
    }
    .root-causes h4 { color: #b45309; margin-bottom: 10px; }
    
    .preventive-actions {
      background: #dcfce7;
      border-left: 4px solid #22c55e;
      padding: 15px;
      border-radius: 0 8px 8px 0;
    }
    .preventive-actions h4 { color: #166534; margin-bottom: 10px; }
    .preventive-actions ul { margin-left: 20px; }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th { background: #f8fafc; font-weight: 600; }
    
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 0.85rem;
    }
    
    @media print {
      body { background: white; }
      .section { box-shadow: none; border: 1px solid #e5e7eb; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="report-header">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <div class="meta-info">
        <span>🏢 ${companyName}</span>
        <span>📅 ${now}</span>
        <span>👤 ${generatedBy}</span>
        ${dateRange ? `<span>📆 ${dateRange.from} - ${dateRange.to}</span>` : ''}
      </div>
    </div>
    
    <div class="summary-cards">
      <div class="summary-card">
        <h3>Số dây chuyền</h3>
        <div class="value">${data.length}</div>
      </div>
      <div class="summary-card">
        <h3>Tỷ lệ lỗi TB hiện tại</h3>
        <div class="value" style="color: #ef4444">
          ${(data.reduce((sum, d) => sum + d.currentDefectRate, 0) / data.length).toFixed(2)}%
        </div>
      </div>
      <div class="summary-card">
        <h3>Tỷ lệ lỗi TB dự báo</h3>
        <div class="value" style="color: #f97316">
          ${(data.reduce((sum, d) => sum + d.predictedDefectRate, 0) / data.length).toFixed(2)}%
        </div>
      </div>
      <div class="summary-card">
        <h3>Dây chuyền rủi ro cao</h3>
        <div class="value" style="color: #dc2626">
          ${data.filter(d => d.riskLevel === 'high' || d.riskLevel === 'critical').length}
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2>⚠️ Chi tiết Dự báo Lỗi theo Dây chuyền</h2>
      ${data.map(line => `
        <div class="line-card">
          <div class="line-header">
            <span class="line-name">${line.productionLineName}</span>
            <span class="risk-badge" style="background: ${getRiskColor(line.riskLevel)}">
              ${getRiskLabel(line.riskLevel)}
            </span>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px;">
            <div style="text-align: center; padding: 15px; background: #fef2f2; border-radius: 8px;">
              <div style="font-size: 0.8rem; color: #666;">Tỷ lệ lỗi hiện tại</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #ef4444;">${line.currentDefectRate.toFixed(2)}%</div>
            </div>
            <div style="text-align: center; padding: 15px; background: #fff7ed; border-radius: 8px;">
              <div style="font-size: 0.8rem; color: #666;">Tỷ lệ lỗi dự báo</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #f97316;">${line.predictedDefectRate.toFixed(2)}%</div>
            </div>
            <div style="text-align: center; padding: 15px; background: #f0f9ff; border-radius: 8px;">
              <div style="font-size: 0.8rem; color: #666;">Độ tin cậy</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #3b82f6;">${line.confidence}%</div>
            </div>
          </div>
          
          <h4 style="margin-bottom: 10px;">Phân bố theo loại lỗi:</h4>
          <div class="defect-types">
            ${line.defectsByType.map(defect => `
              <div class="defect-type ${defect.trend}">
                <div style="font-weight: 600;">${defect.type}</div>
                <div style="font-size: 0.85rem; color: #666;">
                  ${defect.currentCount} → ${defect.predictedCount} ${getTrendIcon(defect.trend)}
                </div>
              </div>
            `).join('')}
          </div>
          
          ${line.rootCauses.length > 0 ? `
            <div class="root-causes">
              <h4>🔍 Nguyên nhân gốc rễ dự đoán</h4>
              <table>
                <thead>
                  <tr>
                    <th>Nguyên nhân</th>
                    <th>Xác suất</th>
                    <th>Mức độ ảnh hưởng</th>
                  </tr>
                </thead>
                <tbody>
                  ${line.rootCauses.map(cause => `
                    <tr>
                      <td>${cause.cause}</td>
                      <td>${(cause.probability * 100).toFixed(0)}%</td>
                      <td>${cause.impact === 'high' ? '🔴 Cao' : cause.impact === 'medium' ? '🟡 Trung bình' : '🟢 Thấp'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
          
          ${includeRecommendations && line.preventiveActions.length > 0 ? `
            <div class="preventive-actions">
              <h4>✅ Hành động phòng ngừa</h4>
              <ul>
                ${line.preventiveActions.map(action => `<li>${action}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    
    <div class="section">
      <h2>📊 Bảng Tổng hợp Rủi ro</h2>
      <table>
        <thead>
          <tr>
            <th>Dây chuyền</th>
            <th>Tỷ lệ lỗi hiện tại</th>
            <th>Tỷ lệ lỗi dự báo</th>
            <th>Thay đổi</th>
            <th>Mức rủi ro</th>
            <th>Độ tin cậy</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(line => `
            <tr>
              <td>${line.productionLineName}</td>
              <td>${line.currentDefectRate.toFixed(2)}%</td>
              <td>${line.predictedDefectRate.toFixed(2)}%</td>
              <td style="color: ${line.predictedDefectRate > line.currentDefectRate ? '#ef4444' : '#22c55e'}">
                ${line.predictedDefectRate > line.currentDefectRate ? '+' : ''}${(line.predictedDefectRate - line.currentDefectRate).toFixed(2)}%
              </td>
              <td>
                <span style="background: ${getRiskColor(line.riskLevel)}; color: white; padding: 2px 8px; border-radius: 4px;">
                  ${getRiskLabel(line.riskLevel)}
                </span>
              </td>
              <td>${line.confidence}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>Báo cáo được tạo tự động bởi ${companyName}</p>
      <p>© ${new Date().getFullYear()} - Hệ thống Quản lý Chất lượng SPC/CPK</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Generate OEE Forecast Excel
export async function generateOeeForecastExcel(
  data: OeeForecastData[],
  options: ReportOptions = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = options.companyName || 'Hệ thống SPC/CPK';
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Tổng hợp');
  
  // Title
  summarySheet.mergeCells('A1:G1');
  summarySheet.getCell('A1').value = options.title || 'Báo cáo Dự báo OEE';
  summarySheet.getCell('A1').font = { size: 16, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  // Headers
  summarySheet.addRow([]);
  summarySheet.addRow([
    'Dây chuyền',
    'OEE Hiện tại (%)',
    'OEE Dự báo (%)',
    'Thay đổi (%)',
    'Xu hướng',
    'Độ tin cậy (%)',
    'Ngày dự báo'
  ]);
  
  const headerRow = summarySheet.getRow(3);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Data
  data.forEach(line => {
    summarySheet.addRow([
      line.productionLineName,
      line.currentOee.toFixed(1),
      line.predictedOee.toFixed(1),
      (line.predictedOee - line.currentOee).toFixed(1),
      line.trend === 'improving' ? 'Cải thiện' : line.trend === 'declining' ? 'Giảm' : 'Ổn định',
      line.confidence,
      line.forecastDate
    ]);
  });

  // Auto width
  summarySheet.columns.forEach(column => {
    column.width = 18;
  });

  // Detail Sheet
  const detailSheet = workbook.addWorksheet('Chi tiết');
  
  detailSheet.addRow([
    'Dây chuyền',
    'Availability Hiện tại',
    'Availability Dự báo',
    'Performance Hiện tại',
    'Performance Dự báo',
    'Quality Hiện tại',
    'Quality Dự báo'
  ]);
  
  const detailHeaderRow = detailSheet.getRow(1);
  detailHeaderRow.font = { bold: true };
  detailHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF3B82F6' }
  };
  detailHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  data.forEach(line => {
    detailSheet.addRow([
      line.productionLineName,
      line.availability.current.toFixed(1),
      line.availability.predicted.toFixed(1),
      line.performance.current.toFixed(1),
      line.performance.predicted.toFixed(1),
      line.quality.current.toFixed(1),
      line.quality.predicted.toFixed(1)
    ]);
  });

  detailSheet.columns.forEach(column => {
    column.width = 20;
  });

  // Recommendations Sheet
  if (options.includeRecommendations !== false) {
    const recSheet = workbook.addWorksheet('Khuyến nghị');
    
    recSheet.addRow(['Dây chuyền', 'Khuyến nghị']);
    const recHeaderRow = recSheet.getRow(1);
    recHeaderRow.font = { bold: true };
    recHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF22C55E' }
    };
    recHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    data.forEach(line => {
      line.recommendations.forEach((rec, idx) => {
        recSheet.addRow([
          idx === 0 ? line.productionLineName : '',
          rec
        ]);
      });
    });

    recSheet.getColumn(1).width = 25;
    recSheet.getColumn(2).width = 60;
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Generate Defect Prediction Excel
export async function generateDefectPredictionExcel(
  data: DefectPredictionData[],
  options: ReportOptions = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = options.companyName || 'Hệ thống SPC/CPK';
  workbook.created = new Date();

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Tổng hợp');
  
  summarySheet.mergeCells('A1:G1');
  summarySheet.getCell('A1').value = options.title || 'Báo cáo Dự báo Lỗi';
  summarySheet.getCell('A1').font = { size: 16, bold: true };
  summarySheet.getCell('A1').alignment = { horizontal: 'center' };

  summarySheet.addRow([]);
  summarySheet.addRow([
    'Dây chuyền',
    'Tỷ lệ lỗi hiện tại (%)',
    'Tỷ lệ lỗi dự báo (%)',
    'Thay đổi (%)',
    'Mức rủi ro',
    'Độ tin cậy (%)',
    'Ngày dự báo'
  ]);
  
  const headerRow = summarySheet.getRow(3);
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDC2626' }
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  data.forEach(line => {
    const row = summarySheet.addRow([
      line.productionLineName,
      line.currentDefectRate.toFixed(2),
      line.predictedDefectRate.toFixed(2),
      (line.predictedDefectRate - line.currentDefectRate).toFixed(2),
      line.riskLevel === 'critical' ? 'Nghiêm trọng' : 
        line.riskLevel === 'high' ? 'Cao' :
        line.riskLevel === 'medium' ? 'Trung bình' : 'Thấp',
      line.confidence,
      line.predictionDate
    ]);

    // Color code risk level
    const riskCell = row.getCell(5);
    if (line.riskLevel === 'critical' || line.riskLevel === 'high') {
      riskCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' }
      };
    }
  });

  summarySheet.columns.forEach(column => {
    column.width = 20;
  });

  // Defect Types Sheet
  const defectSheet = workbook.addWorksheet('Loại lỗi');
  
  defectSheet.addRow([
    'Dây chuyền',
    'Loại lỗi',
    'Số lượng hiện tại',
    'Số lượng dự báo',
    'Xu hướng'
  ]);
  
  const defectHeaderRow = defectSheet.getRow(1);
  defectHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF97316' }
  };
  defectHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  data.forEach(line => {
    line.defectsByType.forEach((defect, idx) => {
      defectSheet.addRow([
        idx === 0 ? line.productionLineName : '',
        defect.type,
        defect.currentCount,
        defect.predictedCount,
        defect.trend === 'increasing' ? 'Tăng' : defect.trend === 'decreasing' ? 'Giảm' : 'Ổn định'
      ]);
    });
  });

  defectSheet.columns.forEach(column => {
    column.width = 20;
  });

  // Root Causes Sheet
  const causesSheet = workbook.addWorksheet('Nguyên nhân');
  
  causesSheet.addRow([
    'Dây chuyền',
    'Nguyên nhân',
    'Xác suất (%)',
    'Mức độ ảnh hưởng'
  ]);
  
  const causesHeaderRow = causesSheet.getRow(1);
  causesHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF59E0B' }
  };
  causesHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  data.forEach(line => {
    line.rootCauses.forEach((cause, idx) => {
      causesSheet.addRow([
        idx === 0 ? line.productionLineName : '',
        cause.cause,
        (cause.probability * 100).toFixed(0),
        cause.impact === 'high' ? 'Cao' : cause.impact === 'medium' ? 'Trung bình' : 'Thấp'
      ]);
    });
  });

  causesSheet.columns.forEach(column => {
    column.width = 25;
  });

  // Preventive Actions Sheet
  if (options.includeRecommendations !== false) {
    const actionsSheet = workbook.addWorksheet('Hành động phòng ngừa');
    
    actionsSheet.addRow(['Dây chuyền', 'Hành động phòng ngừa']);
    const actionsHeaderRow = actionsSheet.getRow(1);
    actionsHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF22C55E' }
    };
    actionsHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    data.forEach(line => {
      line.preventiveActions.forEach((action, idx) => {
        actionsSheet.addRow([
          idx === 0 ? line.productionLineName : '',
          action
        ]);
      });
    });

    actionsSheet.getColumn(1).width = 25;
    actionsSheet.getColumn(2).width = 60;
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
