/**
 * PDF Control Chart Service - Xuất PDF với biểu đồ Control Chart
 */

export interface ControlChartPdfOptions {
  productCode: string;
  stationName: string;
  startDate: Date;
  endDate: Date;
  spcResult: {
    sampleCount: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    range: number;
    cpk: number | null;
    cp: number | null;
    cpu: number | null;
    cpl: number | null;
    ucl: number;
    lcl: number;
    uclR: number;
    lclR: number;
    meanR: number;
    xBarData?: { index: number; value: number; timestamp: Date }[];
    rangeData?: { index: number; value: number }[];
    rawData?: { value: number; timestamp: Date }[];
  };
  analysisDate: Date;
  usl?: number | null;
  lsl?: number | null;
  target?: number | null;
  includeXBarChart?: boolean;
  includeRChart?: boolean;
  includeHistogram?: boolean;
  includeCapabilityAnalysis?: boolean;
  companyName?: string;
  companyLogo?: string;
  reportTitle?: string;
}

function getCpkStatus(cpk: number | null): { color: string; label: string; bgColor: string } {
  if (cpk === null) return { color: "#6b7280", label: "N/A", bgColor: "#f3f4f6" };
  if (cpk >= 1.67) return { color: "#10b981", label: "Xuất sắc", bgColor: "#d1fae5" };
  if (cpk >= 1.33) return { color: "#3b82f6", label: "Tốt", bgColor: "#dbeafe" };
  if (cpk >= 1.0) return { color: "#f59e0b", label: "Chấp nhận được", bgColor: "#fef3c7" };
  return { color: "#ef4444", label: "Kém", bgColor: "#fee2e2" };
}

/**
 * Tạo SVG cho X-bar Control Chart
 */
export function generateXBarChartSvg(spcResult: ControlChartPdfOptions['spcResult'], width: number = 700, height: number = 300): string {
  const padding = { top: 30, right: 50, bottom: 40, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const xBarData = spcResult.xBarData || [];
  if (xBarData.length === 0) return '';

  const values = xBarData.map(d => d.value);
  const allValues = [...values, spcResult.ucl, spcResult.lcl, spcResult.mean];
  const minVal = Math.min(...allValues) * 0.99;
  const maxVal = Math.max(...allValues) * 1.01;
  const range = maxVal - minVal;

  const scaleX = (i: number) => padding.left + (i / (xBarData.length - 1 || 1)) * chartWidth;
  const scaleY = (v: number) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight;

  const dataPath = xBarData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.value)}`).join(' ');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white" rx="8"/>
      <text x="${width/2}" y="20" text-anchor="middle" font-size="14" font-weight="600" fill="#1f2937">X-bar Control Chart</text>
      <line x1="${padding.left}" y1="${scaleY(spcResult.ucl)}" x2="${width - padding.right}" y2="${scaleY(spcResult.ucl)}" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,3"/>
      <line x1="${padding.left}" y1="${scaleY(spcResult.mean)}" x2="${width - padding.right}" y2="${scaleY(spcResult.mean)}" stroke="#10b981" stroke-width="2"/>
      <line x1="${padding.left}" y1="${scaleY(spcResult.lcl)}" x2="${width - padding.right}" y2="${scaleY(spcResult.lcl)}" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,3"/>
      <path d="${dataPath}" fill="none" stroke="#3b82f6" stroke-width="2"/>
      ${xBarData.map((d, i) => `<circle cx="${scaleX(i)}" cy="${scaleY(d.value)}" r="4" fill="#3b82f6" stroke="white" stroke-width="2"/>`).join('')}
    </svg>
  `;
}

/**
 * Tạo SVG cho R Control Chart
 */
export function generateRChartSvg(spcResult: ControlChartPdfOptions['spcResult'], width: number = 700, height: number = 250): string {
  const padding = { top: 30, right: 50, bottom: 40, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const rangeData = spcResult.rangeData || [];
  if (rangeData.length === 0) return '';

  const values = rangeData.map(d => d.value);
  const allValues = [...values, spcResult.uclR, spcResult.lclR, spcResult.meanR];
  const minVal = Math.min(0, Math.min(...allValues) * 0.99);
  const maxVal = Math.max(...allValues) * 1.1;
  const range = maxVal - minVal;

  const scaleX = (i: number) => padding.left + (i / (rangeData.length - 1 || 1)) * chartWidth;
  const scaleY = (v: number) => padding.top + chartHeight - ((v - minVal) / range) * chartHeight;

  const dataPath = rangeData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.value)}`).join(' ');

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white" rx="8"/>
      <text x="${width/2}" y="20" text-anchor="middle" font-size="14" font-weight="600" fill="#1f2937">R Control Chart</text>
      <line x1="${padding.left}" y1="${scaleY(spcResult.uclR)}" x2="${width - padding.right}" y2="${scaleY(spcResult.uclR)}" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,3"/>
      <line x1="${padding.left}" y1="${scaleY(spcResult.meanR)}" x2="${width - padding.right}" y2="${scaleY(spcResult.meanR)}" stroke="#10b981" stroke-width="2"/>
      <line x1="${padding.left}" y1="${scaleY(spcResult.lclR)}" x2="${width - padding.right}" y2="${scaleY(spcResult.lclR)}" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,3"/>
      <path d="${dataPath}" fill="none" stroke="#8b5cf6" stroke-width="2"/>
      ${rangeData.map((d, i) => `<circle cx="${scaleX(i)}" cy="${scaleY(d.value)}" r="4" fill="#8b5cf6" stroke="white" stroke-width="2"/>`).join('')}
    </svg>
  `;
}

/**
 * Tạo SVG cho Histogram
 */
export function generateHistogramSvg(spcResult: ControlChartPdfOptions['spcResult'], usl?: number | null, lsl?: number | null, width: number = 700, height: number = 250): string {
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const rawData = spcResult.rawData || [];
  if (rawData.length === 0) return '';

  const values = rawData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const numBins = Math.min(20, Math.ceil(Math.sqrt(values.length)));
  const binWidth = (max - min) / numBins;

  const bins: number[] = new Array(numBins).fill(0);
  values.forEach(v => {
    const binIdx = Math.min(Math.floor((v - min) / binWidth), numBins - 1);
    bins[binIdx]++;
  });

  const maxBinCount = Math.max(...bins);
  const barWidth = chartWidth / numBins - 2;

  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white" rx="8"/>
      <text x="${width/2}" y="20" text-anchor="middle" font-size="14" font-weight="600" fill="#1f2937">Histogram phân bố dữ liệu</text>
      ${bins.map((count, i) => {
        const x = padding.left + (i / numBins) * chartWidth + 1;
        const h = (count / maxBinCount) * chartHeight;
        const y = padding.top + chartHeight - h;
        return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="#3b82f6" opacity="0.7" rx="2"/>`;
      }).join('')}
    </svg>
  `;
}

/**
 * Tạo SVG cho Capability Analysis
 */
export function generateCapabilityAnalysisSvg(spcResult: ControlChartPdfOptions['spcResult'], usl?: number | null, lsl?: number | null, width: number = 700, height: number = 200): string {
  const cpkStatus = getCpkStatus(spcResult.cpk);
  
  return `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="white" rx="8"/>
      <text x="${width/2}" y="25" text-anchor="middle" font-size="14" font-weight="600" fill="#1f2937">Process Capability Analysis</text>
      <g transform="translate(100, 60)">
        <text x="0" y="0" font-size="12" font-weight="600" fill="#6b7280">CPK</text>
        <rect x="0" y="10" width="200" height="20" fill="#e5e7eb" rx="10"/>
        <rect x="0" y="10" width="${Math.min(200, (spcResult.cpk || 0) / 2 * 200)}" height="20" fill="${cpkStatus.color}" rx="10"/>
        <text x="210" y="25" font-size="16" font-weight="700" fill="${cpkStatus.color}">${spcResult.cpk?.toFixed(3) || 'N/A'}</text>
      </g>
      <g transform="translate(100, 100)">
        <text x="0" y="0" font-size="12" font-weight="600" fill="#6b7280">Cp</text>
        <rect x="0" y="10" width="200" height="20" fill="#e5e7eb" rx="10"/>
        <rect x="0" y="10" width="${Math.min(200, (spcResult.cp || 0) / 2 * 200)}" height="20" fill="#3b82f6" rx="10"/>
        <text x="210" y="25" font-size="16" font-weight="700" fill="#3b82f6">${spcResult.cp?.toFixed(3) || 'N/A'}</text>
      </g>
    </svg>
  `;
}

/**
 * Tạo HTML cho báo cáo PDF với Control Chart
 */
export function generateControlChartPdfHtml(options: ControlChartPdfOptions): string {
  const {
    productCode,
    stationName,
    startDate,
    endDate,
    spcResult,
    analysisDate,
    usl,
    lsl,
    target,
    includeXBarChart = true,
    includeRChart = true,
    includeHistogram = true,
    includeCapabilityAnalysis = true,
    companyName = '',
    companyLogo = '',
    reportTitle = 'Báo cáo Phân tích SPC với Control Chart',
  } = options;

  const cpkStatus = getCpkStatus(spcResult.cpk);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle} - ${productCode}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.5; color: #1f2937; }
    .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { font-size: 20px; margin: 0; }
    .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .info-item { background: #f8fafc; padding: 12px; border-radius: 6px; border-left: 3px solid #3b82f6; }
    .info-item label { font-size: 9px; color: #64748b; text-transform: uppercase; }
    .info-item .value { font-size: 12px; font-weight: 600; color: #1e293b; }
    .cpk-highlight { text-align: center; padding: 24px; background: ${cpkStatus.bgColor}; border-radius: 8px; border: 2px solid ${cpkStatus.color}; margin-bottom: 20px; }
    .cpk-highlight .value { font-size: 42px; font-weight: 800; color: ${cpkStatus.color}; }
    .cpk-highlight .status { display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 600; color: white; background: ${cpkStatus.color}; margin-top: 10px; }
    .section { background: white; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 16px; }
    .section h2 { font-size: 13px; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .chart-container { display: flex; justify-content: center; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; color: #64748b; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${reportTitle}</h1>
    <p>${companyName || 'SPC/CPK Calculator System'}</p>
  </div>
  
  <div class="info-grid">
    <div class="info-item"><label>Mã sản phẩm</label><span class="value">${productCode}</span></div>
    <div class="info-item"><label>Trạm/Station</label><span class="value">${stationName}</span></div>
    <div class="info-item"><label>Khoảng thời gian</label><span class="value">${startDate.toLocaleDateString('vi-VN')} - ${endDate.toLocaleDateString('vi-VN')}</span></div>
    <div class="info-item"><label>Số mẫu</label><span class="value">${spcResult.sampleCount}</span></div>
  </div>
  
  <div class="cpk-highlight">
    <div class="value">${spcResult.cpk?.toFixed(3) ?? 'N/A'}</div>
    <div>Process Capability Index (CPK)</div>
    <div class="status">${cpkStatus.label}</div>
  </div>
  
  ${includeXBarChart && spcResult.xBarData && spcResult.xBarData.length > 0 ? `
  <div class="section">
    <h2>X-bar Control Chart</h2>
    <div class="chart-container">${generateXBarChartSvg(spcResult)}</div>
  </div>
  ` : ''}
  
  ${includeRChart && spcResult.rangeData && spcResult.rangeData.length > 0 ? `
  <div class="section">
    <h2>R Control Chart</h2>
    <div class="chart-container">${generateRChartSvg(spcResult)}</div>
  </div>
  ` : ''}
  
  ${includeHistogram && spcResult.rawData && spcResult.rawData.length > 0 ? `
  <div class="section">
    <h2>Histogram phân bố dữ liệu</h2>
    <div class="chart-container">${generateHistogramSvg(spcResult, usl, lsl)}</div>
  </div>
  ` : ''}
  
  ${includeCapabilityAnalysis ? `
  <div class="section">
    <h2>Process Capability Analysis</h2>
    <div class="chart-container">${generateCapabilityAnalysisSvg(spcResult, usl, lsl)}</div>
  </div>
  ` : ''}
  
  <div class="section">
    <h2>Giới hạn kiểm soát</h2>
    <table>
      <tr><th>Thông số</th><th>Giá trị</th></tr>
      <tr><td>UCL (X-bar)</td><td>${spcResult.ucl.toFixed(4)}</td></tr>
      <tr><td>CL (X-bar)</td><td>${spcResult.mean.toFixed(4)}</td></tr>
      <tr><td>LCL (X-bar)</td><td>${spcResult.lcl.toFixed(4)}</td></tr>
      <tr><td>UCL (R)</td><td>${spcResult.uclR.toFixed(4)}</td></tr>
      <tr><td>R̄</td><td>${spcResult.meanR.toFixed(4)}</td></tr>
      <tr><td>LCL (R)</td><td>${spcResult.lclR.toFixed(4)}</td></tr>
    </table>
  </div>
</body>
</html>`;
}

export default {
  generateControlChartPdfHtml,
  generateXBarChartSvg,
  generateRChartSvg,
  generateHistogramSvg,
  generateCapabilityAnalysisSvg,
};
