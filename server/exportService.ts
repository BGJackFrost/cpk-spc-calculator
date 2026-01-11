import ExcelJS from "exceljs";
import { SpcResult, getDefaultReportTemplate } from "./db";

// Report Template interface
export interface ReportTemplate {
  id: number;
  name: string;
  companyName: string | null;
  companyLogo: string | null;
  headerText: string | null;
  footerText: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  showLogo: number;
  showCompanyName: number;
  showDate: number;
  showCharts: number;
  showRawData: number;
}

export interface ExportData {
  productCode: string;
  stationName: string;
  startDate: Date;
  endDate: Date;
  spcResult: SpcResult;
  analysisDate: Date;
  analysisType?: "single" | "batch" | "spc-plan";
  planName?: string;
  usl?: number | null;
  lsl?: number | null;
  target?: number | null;
  template?: ReportTemplate | null;
}

// Helper function to get CPK status
function getCpkStatus(cpk: number | null): { color: string; label: string; bgColor: string } {
  if (cpk === null) return { color: "#6b7280", label: "N/A", bgColor: "#f3f4f6" };
  if (cpk >= 1.67) return { color: "#10b981", label: "Xuất sắc", bgColor: "#d1fae5" };
  if (cpk >= 1.33) return { color: "#3b82f6", label: "Tốt", bgColor: "#dbeafe" };
  if (cpk >= 1.0) return { color: "#f59e0b", label: "Chấp nhận được", bgColor: "#fef3c7" };
  return { color: "#ef4444", label: "Kém", bgColor: "#fee2e2" };
}

// Generate SVG charts for PDF export
function generateSpcChartsSvg(data: ExportData): string {
  const xBarData = data.spcResult.xBarData || [];
  const rangeData = data.spcResult.rangeData || [];
  const rawData = data.spcResult.rawData || [];
  
  // If no chart data, return empty string
  if (xBarData.length === 0 && rangeData.length === 0 && rawData.length === 0) {
    return '';
  }
  
  const chartWidth = 700;
  const chartHeight = 200;
  const padding = { top: 30, right: 50, bottom: 40, left: 70 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  
  // Generate X-Bar Chart SVG
  function generateXBarChart(): string {
    if (xBarData.length === 0) return '';
    
    const values = xBarData.map(d => d.value);
    const minVal = Math.min(...values, data.spcResult.lcl);
    const maxVal = Math.max(...values, data.spcResult.ucl);
    const range = maxVal - minVal || 1;
    const yScale = (v: number) => innerHeight - ((v - minVal) / range) * innerHeight;
    const xScale = (i: number) => (i / (xBarData.length - 1 || 1)) * innerWidth;
    
    // Generate path for data line
    const pathD = xBarData.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${padding.left + xScale(i)} ${padding.top + yScale(d.value)}`
    ).join(' ');
    
    // Generate points
    const points = xBarData.map((d, i) => {
      const x = padding.left + xScale(i);
      const y = padding.top + yScale(d.value);
      const isOutOfControl = d.value > data.spcResult.ucl || d.value < data.spcResult.lcl;
      return `<circle cx="${x}" cy="${y}" r="4" fill="${isOutOfControl ? '#ef4444' : '#3b82f6'}" />`;
    }).join('');
    
    // Control limits
    const uclY = padding.top + yScale(data.spcResult.ucl);
    const clY = padding.top + yScale(data.spcResult.mean);
    const lclY = padding.top + yScale(data.spcResult.lcl);
    
    return `
    <div class="section" style="page-break-inside: avoid;">
      <h2>Biểu đồ X-Bar (Control Chart)</h2>
      <svg width="${chartWidth}" height="${chartHeight}" style="background: #fafafa; border-radius: 8px;">
        <!-- Grid lines -->
        ${[0, 0.25, 0.5, 0.75, 1].map(p => `
          <line x1="${padding.left}" y1="${padding.top + innerHeight * p}" x2="${chartWidth - padding.right}" y2="${padding.top + innerHeight * p}" stroke="#e5e7eb" stroke-dasharray="4,4" />
        `).join('')}
        
        <!-- UCL line -->
        <line x1="${padding.left}" y1="${uclY}" x2="${chartWidth - padding.right}" y2="${uclY}" stroke="#ef4444" stroke-width="2" stroke-dasharray="8,4" />
        <text x="${chartWidth - padding.right + 5}" y="${uclY + 4}" font-size="10" fill="#ef4444">UCL</text>
        
        <!-- CL line -->
        <line x1="${padding.left}" y1="${clY}" x2="${chartWidth - padding.right}" y2="${clY}" stroke="#10b981" stroke-width="2" />
        <text x="${chartWidth - padding.right + 5}" y="${clY + 4}" font-size="10" fill="#10b981">CL</text>
        
        <!-- LCL line -->
        <line x1="${padding.left}" y1="${lclY}" x2="${chartWidth - padding.right}" y2="${lclY}" stroke="#ef4444" stroke-width="2" stroke-dasharray="8,4" />
        <text x="${chartWidth - padding.right + 5}" y="${lclY + 4}" font-size="10" fill="#ef4444">LCL</text>
        
        <!-- Data line -->
        <path d="${pathD}" fill="none" stroke="#3b82f6" stroke-width="2" />
        
        <!-- Data points -->
        ${points}
        
        <!-- X axis -->
        <line x1="${padding.left}" y1="${chartHeight - padding.bottom}" x2="${chartWidth - padding.right}" y2="${chartHeight - padding.bottom}" stroke="#374151" />
        <text x="${chartWidth / 2}" y="${chartHeight - 5}" font-size="11" fill="#374151" text-anchor="middle">Mẫu (Sample)</text>
        
        <!-- Y axis -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${chartHeight - padding.bottom}" stroke="#374151" />
        <text x="15" y="${chartHeight / 2}" font-size="11" fill="#374151" text-anchor="middle" transform="rotate(-90, 15, ${chartHeight / 2})">Giá trị</text>
        
        <!-- Y axis labels -->
        <text x="${padding.left - 5}" y="${uclY + 4}" font-size="9" fill="#6b7280" text-anchor="end">${data.spcResult.ucl.toFixed(3)}</text>
        <text x="${padding.left - 5}" y="${clY + 4}" font-size="9" fill="#6b7280" text-anchor="end">${data.spcResult.mean.toFixed(3)}</text>
        <text x="${padding.left - 5}" y="${lclY + 4}" font-size="9" fill="#6b7280" text-anchor="end">${data.spcResult.lcl.toFixed(3)}</text>
        
        <!-- Title -->
        <text x="${chartWidth / 2}" y="18" font-size="13" font-weight="bold" fill="#1f2937" text-anchor="middle">X-Bar Chart - ${data.productCode}</text>
      </svg>
    </div>`;
  }
  
  // Generate R Chart SVG
  function generateRChart(): string {
    if (rangeData.length === 0) return '';
    
    const values = rangeData.map(d => d.value);
    const minVal = Math.min(...values, data.spcResult.lclR, 0);
    const maxVal = Math.max(...values, data.spcResult.uclR);
    const range = maxVal - minVal || 1;
    const yScale = (v: number) => innerHeight - ((v - minVal) / range) * innerHeight;
    const xScale = (i: number) => (i / (rangeData.length - 1 || 1)) * innerWidth;
    
    // Generate path for data line
    const pathD = rangeData.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${padding.left + xScale(i)} ${padding.top + yScale(d.value)}`
    ).join(' ');
    
    // Generate points
    const points = rangeData.map((d, i) => {
      const x = padding.left + xScale(i);
      const y = padding.top + yScale(d.value);
      const isOutOfControl = d.value > data.spcResult.uclR || d.value < data.spcResult.lclR;
      return `<circle cx="${x}" cy="${y}" r="4" fill="${isOutOfControl ? '#ef4444' : '#f59e0b'}" />`;
    }).join('');
    
    // Control limits
    const uclRY = padding.top + yScale(data.spcResult.uclR);
    const rBarY = padding.top + yScale(data.spcResult.range);
    const lclRY = padding.top + yScale(Math.max(data.spcResult.lclR, 0));
    
    return `
    <div class="section" style="page-break-inside: avoid;">
      <h2>Biểu đồ R (Range Chart)</h2>
      <svg width="${chartWidth}" height="${chartHeight}" style="background: #fafafa; border-radius: 8px;">
        <!-- Grid lines -->
        ${[0, 0.25, 0.5, 0.75, 1].map(p => `
          <line x1="${padding.left}" y1="${padding.top + innerHeight * p}" x2="${chartWidth - padding.right}" y2="${padding.top + innerHeight * p}" stroke="#e5e7eb" stroke-dasharray="4,4" />
        `).join('')}
        
        <!-- UCL line -->
        <line x1="${padding.left}" y1="${uclRY}" x2="${chartWidth - padding.right}" y2="${uclRY}" stroke="#ef4444" stroke-width="2" stroke-dasharray="8,4" />
        <text x="${chartWidth - padding.right + 5}" y="${uclRY + 4}" font-size="10" fill="#ef4444">UCL</text>
        
        <!-- R-bar line -->
        <line x1="${padding.left}" y1="${rBarY}" x2="${chartWidth - padding.right}" y2="${rBarY}" stroke="#f59e0b" stroke-width="2" />
        <text x="${chartWidth - padding.right + 5}" y="${rBarY + 4}" font-size="10" fill="#f59e0b">R̄</text>
        
        <!-- LCL line -->
        <line x1="${padding.left}" y1="${lclRY}" x2="${chartWidth - padding.right}" y2="${lclRY}" stroke="#ef4444" stroke-width="2" stroke-dasharray="8,4" />
        <text x="${chartWidth - padding.right + 5}" y="${lclRY + 4}" font-size="10" fill="#ef4444">LCL</text>
        
        <!-- Data line -->
        <path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="2" />
        
        <!-- Data points -->
        ${points}
        
        <!-- X axis -->
        <line x1="${padding.left}" y1="${chartHeight - padding.bottom}" x2="${chartWidth - padding.right}" y2="${chartHeight - padding.bottom}" stroke="#374151" />
        <text x="${chartWidth / 2}" y="${chartHeight - 5}" font-size="11" fill="#374151" text-anchor="middle">Mẫu (Sample)</text>
        
        <!-- Y axis -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${chartHeight - padding.bottom}" stroke="#374151" />
        <text x="15" y="${chartHeight / 2}" font-size="11" fill="#374151" text-anchor="middle" transform="rotate(-90, 15, ${chartHeight / 2})">Range</text>
        
        <!-- Y axis labels -->
        <text x="${padding.left - 5}" y="${uclRY + 4}" font-size="9" fill="#6b7280" text-anchor="end">${data.spcResult.uclR.toFixed(3)}</text>
        <text x="${padding.left - 5}" y="${rBarY + 4}" font-size="9" fill="#6b7280" text-anchor="end">${data.spcResult.range.toFixed(3)}</text>
        
        <!-- Title -->
        <text x="${chartWidth / 2}" y="18" font-size="13" font-weight="bold" fill="#1f2937" text-anchor="middle">R Chart - ${data.productCode}</text>
      </svg>
    </div>`;
  }
  
  // Generate Histogram SVG
  function generateHistogram(): string {
    if (rawData.length === 0) return '';
    
    const values = rawData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = Math.min(15, Math.ceil(Math.sqrt(values.length)));
    const binWidth = (max - min) / binCount || 1;
    
    // Create bins
    const bins: number[] = new Array(binCount).fill(0);
    values.forEach(v => {
      const binIndex = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
      bins[binIndex]++;
    });
    
    const maxBinCount = Math.max(...bins);
    const barWidth = innerWidth / binCount - 2;
    
    // Generate bars
    const bars = bins.map((count, i) => {
      const x = padding.left + i * (innerWidth / binCount) + 1;
      const barHeight = (count / maxBinCount) * innerHeight;
      const y = padding.top + innerHeight - barHeight;
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      
      // Color based on whether bin is within spec limits
      let fillColor = '#3b82f6';
      if (data.usl !== null && data.usl !== undefined && binEnd > data.usl) fillColor = '#ef4444';
      if (data.lsl !== null && data.lsl !== undefined && binStart < data.lsl) fillColor = '#ef4444';
      
      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${fillColor}" opacity="0.8" rx="2" />`;
    }).join('');
    
    // Generate normal curve if we have spec limits
    let normalCurve = '';
    if (values.length > 5) {
      const mean = data.spcResult.mean;
      const stdDev = data.spcResult.stdDev;
      const curvePoints: string[] = [];
      
      for (let i = 0; i <= 50; i++) {
        const x = min + (i / 50) * (max - min);
        const z = (x - mean) / stdDev;
        const y = Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI));
        const scaledY = (y * binWidth * values.length / maxBinCount) * innerHeight;
        const px = padding.left + ((x - min) / (max - min)) * innerWidth;
        const py = padding.top + innerHeight - scaledY;
        curvePoints.push(`${i === 0 ? 'M' : 'L'} ${px} ${py}`);
      }
      normalCurve = `<path d="${curvePoints.join(' ')}" fill="none" stroke="#10b981" stroke-width="2" />`;
    }
    
    // Spec limit lines
    let specLines = '';
    if (data.usl !== null && data.usl !== undefined) {
      const uslX = padding.left + ((data.usl - min) / (max - min)) * innerWidth;
      specLines += `<line x1="${uslX}" y1="${padding.top}" x2="${uslX}" y2="${chartHeight - padding.bottom}" stroke="#ef4444" stroke-width="2" stroke-dasharray="5,5" />
        <text x="${uslX}" y="${padding.top - 5}" font-size="10" fill="#ef4444" text-anchor="middle">USL</text>`;
    }
    if (data.lsl !== null && data.lsl !== undefined) {
      const lslX = padding.left + ((data.lsl - min) / (max - min)) * innerWidth;
      specLines += `<line x1="${lslX}" y1="${padding.top}" x2="${lslX}" y2="${chartHeight - padding.bottom}" stroke="#2563eb" stroke-width="2" stroke-dasharray="5,5" />
        <text x="${lslX}" y="${padding.top - 5}" font-size="10" fill="#2563eb" text-anchor="middle">LSL</text>`;
    }
    
    return `
    <div class="section" style="page-break-inside: avoid;">
      <h2>Biểu đồ Histogram (Phân bố dữ liệu)</h2>
      <svg width="${chartWidth}" height="${chartHeight + 20}" style="background: #fafafa; border-radius: 8px;">
        <!-- Grid lines -->
        ${[0, 0.25, 0.5, 0.75, 1].map(p => `
          <line x1="${padding.left}" y1="${padding.top + innerHeight * p}" x2="${chartWidth - padding.right}" y2="${padding.top + innerHeight * p}" stroke="#e5e7eb" stroke-dasharray="4,4" />
        `).join('')}
        
        <!-- Bars -->
        ${bars}
        
        <!-- Normal curve -->
        ${normalCurve}
        
        <!-- Spec limit lines -->
        ${specLines}
        
        <!-- X axis -->
        <line x1="${padding.left}" y1="${chartHeight - padding.bottom}" x2="${chartWidth - padding.right}" y2="${chartHeight - padding.bottom}" stroke="#374151" />
        <text x="${chartWidth / 2}" y="${chartHeight + 10}" font-size="11" fill="#374151" text-anchor="middle">Giá trị đo</text>
        
        <!-- X axis labels -->
        <text x="${padding.left}" y="${chartHeight - padding.bottom + 15}" font-size="9" fill="#6b7280" text-anchor="middle">${min.toFixed(2)}</text>
        <text x="${chartWidth - padding.right}" y="${chartHeight - padding.bottom + 15}" font-size="9" fill="#6b7280" text-anchor="middle">${max.toFixed(2)}</text>
        
        <!-- Y axis -->
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${chartHeight - padding.bottom}" stroke="#374151" />
        <text x="15" y="${chartHeight / 2}" font-size="11" fill="#374151" text-anchor="middle" transform="rotate(-90, 15, ${chartHeight / 2})">Tần suất</text>
        
        <!-- Title -->
        <text x="${chartWidth / 2}" y="18" font-size="13" font-weight="bold" fill="#1f2937" text-anchor="middle">Histogram - ${data.productCode}</text>
        
        <!-- Legend -->
        <rect x="${chartWidth - 150}" y="${padding.top}" width="12" height="12" fill="#3b82f6" opacity="0.8" rx="2" />
        <text x="${chartWidth - 135}" y="${padding.top + 10}" font-size="10" fill="#374151">Trong spec</text>
        <rect x="${chartWidth - 150}" y="${padding.top + 18}" width="12" height="12" fill="#ef4444" opacity="0.8" rx="2" />
        <text x="${chartWidth - 135}" y="${padding.top + 28}" font-size="10" fill="#374151">Ngoài spec</text>
        <line x1="${chartWidth - 150}" y1="${padding.top + 42}" x2="${chartWidth - 138}" y2="${padding.top + 42}" stroke="#10b981" stroke-width="2" />
        <text x="${chartWidth - 135}" y="${padding.top + 46}" font-size="10" fill="#374151">Đường chuẩn</text>
      </svg>
    </div>`;
  }
  
  return generateXBarChart() + generateRChart() + generateHistogram();
}

// Generate professional PDF-ready HTML report with template support
export function generatePdfHtml(data: ExportData): string {
  const cpkStatus = getCpkStatus(data.spcResult.cpk);
  const analysisTypeLabel = data.analysisType === "batch" ? "Phân tích hàng loạt" : 
                            data.analysisType === "spc-plan" ? "Kế hoạch SPC" : "Phân tích đơn";
  
  // Template settings with defaults
  const template = data.template;
  const primaryColor = template?.primaryColor || '#3b82f6';
  const secondaryColor = template?.secondaryColor || '#1e40af';
  const fontFamily = template?.fontFamily || "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif";
  const companyName = template?.companyName || '';
  const companyLogo = template?.companyLogo || '';
  const headerText = template?.headerText || 'Báo cáo Phân tích SPC/CPK';
  const footerText = template?.footerText || 'Generated by SPC/CPK Calculator';
  const showLogo = template?.showLogo ?? 1;
  const showCompanyName = template?.showCompanyName ?? 1;
  const showDate = template?.showDate ?? 1;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo SPC/CPK - ${data.productCode}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: ${fontFamily}; 
      line-height: 1.6; 
      color: #1f2937; 
      background: white;
      font-size: 11pt;
    }
    .container { max-width: 100%; padding: 0; }
    
    /* Header */
    .header { 
      background: linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-logo { max-height: 48px; margin-right: 16px; }
    .header-left { display: flex; align-items: center; }
    .header-left-text h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .header-left-text p { font-size: 12px; opacity: 0.9; }
    .header-right { text-align: right; }
    .header-right .type-badge {
      background: rgba(255,255,255,0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
    }
    .header-right .date { font-size: 11px; margin-top: 8px; opacity: 0.9; }
    
    /* Info Grid */
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 12px; 
      margin-bottom: 24px; 
    }
    .info-item { 
      background: #f8fafc; 
      padding: 16px; 
      border-radius: 8px; 
      border-left: 4px solid #3b82f6;
    }
    .info-item label { 
      font-size: 10px; 
      color: #64748b; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    .info-item .value { 
      display: block; 
      font-size: 14px; 
      font-weight: 600; 
      color: #1e293b; 
      margin-top: 4px; 
    }
    
    /* CPK Highlight */
    .cpk-section {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 24px;
      margin-bottom: 24px;
    }
    .cpk-highlight { 
      text-align: center; 
      padding: 32px; 
      background: ${cpkStatus.bgColor};
      border-radius: 12px;
      border: 2px solid ${cpkStatus.color};
    }
    .cpk-highlight .value { 
      font-size: 56px; 
      font-weight: 800; 
      color: ${cpkStatus.color}; 
      line-height: 1;
    }
    .cpk-highlight .label { 
      font-size: 12px; 
      color: #64748b; 
      margin-top: 8px;
      font-weight: 500;
    }
    .cpk-highlight .status { 
      display: inline-block; 
      padding: 6px 16px; 
      border-radius: 20px; 
      font-size: 12px; 
      font-weight: 600; 
      color: white; 
      background: ${cpkStatus.color}; 
      margin-top: 12px; 
    }
    
    /* Capability Indices */
    .capability-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .capability-item {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .capability-item .name { font-size: 11px; color: #64748b; font-weight: 600; }
    .capability-item .value { font-size: 24px; font-weight: 700; color: #1e293b; margin-top: 4px; }
    .capability-item .desc { font-size: 9px; color: #94a3b8; margin-top: 2px; }
    
    /* Section */
    .section { 
      background: white; 
      border-radius: 12px; 
      border: 1px solid #e2e8f0; 
      padding: 20px; 
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section h2 { 
      font-size: 14px; 
      color: #1e293b; 
      margin-bottom: 16px; 
      padding-bottom: 12px; 
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section h2::before {
      content: '';
      width: 4px;
      height: 16px;
      background: #3b82f6;
      border-radius: 2px;
    }
    
    /* Stats Grid */
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(6, 1fr); 
      gap: 12px; 
    }
    .stat-item { 
      text-align: center; 
      padding: 12px; 
      background: #f8fafc; 
      border-radius: 8px; 
    }
    .stat-item .value { font-size: 18px; font-weight: 700; color: #1e293b; }
    .stat-item .label { font-size: 10px; color: #64748b; margin-top: 4px; }
    
    /* Table */
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { 
      background: #f1f5f9; 
      font-size: 10px; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
      color: #64748b;
      font-weight: 600;
    }
    td { font-family: 'SF Mono', 'Consolas', monospace; }
    tr:nth-child(even) { background: #f8fafc; }
    
    /* Spec Limits */
    .spec-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .spec-item {
      text-align: center;
      padding: 16px;
      border-radius: 8px;
    }
    .spec-item.usl { background: #fef2f2; border: 1px solid #fecaca; }
    .spec-item.target { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .spec-item.lsl { background: #eff6ff; border: 1px solid #bfdbfe; }
    .spec-item .label { font-size: 10px; color: #64748b; font-weight: 600; }
    .spec-item .value { font-size: 20px; font-weight: 700; margin-top: 4px; }
    .spec-item.usl .value { color: #dc2626; }
    .spec-item.target .value { color: #16a34a; }
    .spec-item.lsl .value { color: #2563eb; }
    
    /* Footer */
    .footer { 
      text-align: center; 
      margin-top: 32px; 
      padding-top: 16px; 
      border-top: 1px solid #e2e8f0; 
      color: #94a3b8; 
      font-size: 10px; 
    }
    .footer .logo { font-weight: 700; color: ${primaryColor}; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        ${showLogo && companyLogo ? `<img src="${companyLogo}" alt="Logo" class="header-logo" />` : ''}
        <div class="header-left-text">
          <h1>${headerText}</h1>
          <p>${showCompanyName && companyName ? companyName : 'Statistical Process Control Analysis Report'}</p>
        </div>
      </div>
      <div class="header-right">
        <div class="type-badge">${analysisTypeLabel}</div>
        ${showDate ? `<div class="date">Ngày tạo: ${data.analysisDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>` : ''}
      </div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <label>Mã sản phẩm</label>
        <span class="value">${data.productCode}</span>
      </div>
      <div class="info-item">
        <label>Trạm/Station</label>
        <span class="value">${data.stationName}</span>
      </div>
      <div class="info-item">
        <label>Khoảng thời gian</label>
        <span class="value">${data.startDate.toLocaleDateString('vi-VN')} - ${data.endDate.toLocaleDateString('vi-VN')}</span>
      </div>
      <div class="info-item">
        <label>Số mẫu</label>
        <span class="value">${data.spcResult.sampleCount} mẫu</span>
      </div>
    </div>

    <div class="cpk-section">
      <div class="cpk-highlight">
        <div class="value">${data.spcResult.cpk?.toFixed(3) ?? 'N/A'}</div>
        <div class="label">Chỉ số năng lực quy trình (Cpk)</div>
        <div class="status">${cpkStatus.label}</div>
      </div>
      <div class="capability-grid">
        <div class="capability-item">
          <div class="name">Cp</div>
          <div class="value">${data.spcResult.cp?.toFixed(3) ?? 'N/A'}</div>
          <div class="desc">Process Capability</div>
        </div>
        <div class="capability-item">
          <div class="name">Cpk</div>
          <div class="value">${data.spcResult.cpk?.toFixed(3) ?? 'N/A'}</div>
          <div class="desc">Capability Index</div>
        </div>
        <div class="capability-item">
          <div class="name">Cpu</div>
          <div class="value">${data.spcResult.cpu?.toFixed(3) ?? 'N/A'}</div>
          <div class="desc">Upper Capability</div>
        </div>
        <div class="capability-item">
          <div class="name">Cpl</div>
          <div class="value">${data.spcResult.cpl?.toFixed(3) ?? 'N/A'}</div>
          <div class="desc">Lower Capability</div>
        </div>
      </div>
    </div>

    ${data.usl !== undefined || data.lsl !== undefined || data.target !== undefined ? `
    <div class="section">
      <h2>Giới hạn Specification</h2>
      <div class="spec-grid">
        <div class="spec-item usl">
          <div class="label">USL (Giới hạn trên)</div>
          <div class="value">${data.usl?.toFixed(4) ?? 'N/A'}</div>
        </div>
        <div class="spec-item target">
          <div class="label">Target (Mục tiêu)</div>
          <div class="value">${data.target?.toFixed(4) ?? 'N/A'}</div>
        </div>
        <div class="spec-item lsl">
          <div class="label">LSL (Giới hạn dưới)</div>
          <div class="value">${data.lsl?.toFixed(4) ?? 'N/A'}</div>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2>Thống kê mô tả</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="value">${data.spcResult.sampleCount}</div>
          <div class="label">Số mẫu</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.mean.toFixed(4)}</div>
          <div class="label">Trung bình</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.stdDev.toFixed(4)}</div>
          <div class="label">Độ lệch chuẩn</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.min.toFixed(4)}</div>
          <div class="label">Giá trị nhỏ nhất</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.max.toFixed(4)}</div>
          <div class="label">Giá trị lớn nhất</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.range.toFixed(4)}</div>
          <div class="label">Khoảng biến thiên</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Giới hạn kiểm soát (Control Limits)</h2>
      <table>
        <thead>
          <tr>
            <th>Loại giới hạn</th>
            <th>Giá trị</th>
            <th>Mô tả</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>UCL (X-bar)</td>
            <td>${data.spcResult.ucl.toFixed(6)}</td>
            <td>Giới hạn kiểm soát trên cho biểu đồ X-bar</td>
          </tr>
          <tr>
            <td>CL (X-bar)</td>
            <td>${data.spcResult.mean.toFixed(6)}</td>
            <td>Đường trung tâm cho biểu đồ X-bar</td>
          </tr>
          <tr>
            <td>LCL (X-bar)</td>
            <td>${data.spcResult.lcl.toFixed(6)}</td>
            <td>Giới hạn kiểm soát dưới cho biểu đồ X-bar</td>
          </tr>
          <tr>
            <td>UCL (R)</td>
            <td>${data.spcResult.uclR.toFixed(6)}</td>
            <td>Giới hạn kiểm soát trên cho biểu đồ R</td>
          </tr>
          <tr>
            <td>LCL (R)</td>
            <td>${data.spcResult.lclR.toFixed(6)}</td>
            <td>Giới hạn kiểm soát dưới cho biểu đồ R</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${generateSpcChartsSvg(data)}

    <div class="footer">
      <p class="logo">${companyName || 'SPC/CPK Calculator System'}</p>
      <p>${footerText} • ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

// Generate Excel workbook with professional formatting
export async function generateExcelBuffer(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SPC/CPK Calculator";
  workbook.created = new Date();
  
  // Summary Sheet
  const summarySheet = workbook.addWorksheet("Tổng quan", {
    properties: { tabColor: { argb: "3B82F6" } }
  });
  
  // Set column widths
  summarySheet.columns = [
    { width: 25 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];
  
  // Title
  summarySheet.mergeCells("A1:D1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "BÁO CÁO PHÂN TÍCH SPC/CPK";
  titleCell.font = { size: 18, bold: true, color: { argb: "1E40AF" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  summarySheet.getRow(1).height = 35;
  
  // Subtitle
  summarySheet.mergeCells("A2:D2");
  const subtitleCell = summarySheet.getCell("A2");
  subtitleCell.value = "Statistical Process Control Analysis Report";
  subtitleCell.font = { size: 11, italic: true, color: { argb: "64748B" } };
  subtitleCell.alignment = { horizontal: "center" };
  
  // Info section
  const infoStartRow = 4;
  const infoData = [
    ["Mã sản phẩm:", data.productCode, "Trạm/Station:", data.stationName],
    ["Ngày bắt đầu:", data.startDate.toLocaleDateString("vi-VN"), "Ngày kết thúc:", data.endDate.toLocaleDateString("vi-VN")],
    ["Ngày phân tích:", data.analysisDate.toLocaleString("vi-VN"), "Số mẫu:", data.spcResult.sampleCount.toString()],
  ];
  
  infoData.forEach((row, idx) => {
    const rowNum = infoStartRow + idx;
    summarySheet.getRow(rowNum).values = row;
    summarySheet.getCell(`A${rowNum}`).font = { bold: true, color: { argb: "64748B" } };
    summarySheet.getCell(`C${rowNum}`).font = { bold: true, color: { argb: "64748B" } };
  });
  
  // CPK Highlight
  const cpkRow = 8;
  summarySheet.mergeCells(`A${cpkRow}:D${cpkRow}`);
  const cpkCell = summarySheet.getCell(`A${cpkRow}`);
  const cpkStatus = getCpkStatus(data.spcResult.cpk);
  cpkCell.value = `CPK: ${data.spcResult.cpk?.toFixed(3) ?? "N/A"} - ${cpkStatus.label}`;
  cpkCell.font = { size: 24, bold: true, color: { argb: cpkStatus.color.replace("#", "") } };
  cpkCell.alignment = { horizontal: "center", vertical: "middle" };
  cpkCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: cpkStatus.bgColor.replace("#", "") }
  };
  summarySheet.getRow(cpkRow).height = 45;
  
  // Process Capability Section
  const capStartRow = 10;
  summarySheet.getCell(`A${capStartRow}`).value = "Chỉ số năng lực quy trình";
  summarySheet.getCell(`A${capStartRow}`).font = { size: 14, bold: true };
  summarySheet.mergeCells(`A${capStartRow}:D${capStartRow}`);
  
  const capHeaders = ["Chỉ số", "Giá trị", "Mô tả", ""];
  summarySheet.getRow(capStartRow + 1).values = capHeaders;
  summarySheet.getRow(capStartRow + 1).font = { bold: true };
  summarySheet.getRow(capStartRow + 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F1F5F9" }
  };
  
  const capData = [
    ["Cp", data.spcResult.cp?.toFixed(4) ?? "N/A", "Process Capability"],
    ["Cpk", data.spcResult.cpk?.toFixed(4) ?? "N/A", "Capability Index"],
    ["Cpu", data.spcResult.cpu?.toFixed(4) ?? "N/A", "Upper Capability"],
    ["Cpl", data.spcResult.cpl?.toFixed(4) ?? "N/A", "Lower Capability"],
  ];
  
  capData.forEach((row, idx) => {
    summarySheet.getRow(capStartRow + 2 + idx).values = row;
  });
  
  // Statistics Section
  const statsStartRow = capStartRow + 7;
  summarySheet.getCell(`A${statsStartRow}`).value = "Thống kê mô tả";
  summarySheet.getCell(`A${statsStartRow}`).font = { size: 14, bold: true };
  summarySheet.mergeCells(`A${statsStartRow}:D${statsStartRow}`);
  
  const statsHeaders = ["Chỉ tiêu", "Giá trị", "", ""];
  summarySheet.getRow(statsStartRow + 1).values = statsHeaders;
  summarySheet.getRow(statsStartRow + 1).font = { bold: true };
  summarySheet.getRow(statsStartRow + 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F1F5F9" }
  };
  
  const statsData = [
    ["Số mẫu", data.spcResult.sampleCount],
    ["Trung bình (Mean)", data.spcResult.mean.toFixed(6)],
    ["Độ lệch chuẩn (Std Dev)", data.spcResult.stdDev.toFixed(6)],
    ["Giá trị nhỏ nhất (Min)", data.spcResult.min.toFixed(6)],
    ["Giá trị lớn nhất (Max)", data.spcResult.max.toFixed(6)],
    ["Khoảng biến thiên (Range)", data.spcResult.range.toFixed(6)],
  ];
  
  statsData.forEach((row, idx) => {
    summarySheet.getRow(statsStartRow + 2 + idx).values = row;
  });
  
  // Control Limits Section
  const limitsStartRow = statsStartRow + 9;
  summarySheet.getCell(`A${limitsStartRow}`).value = "Giới hạn kiểm soát";
  summarySheet.getCell(`A${limitsStartRow}`).font = { size: 14, bold: true };
  summarySheet.mergeCells(`A${limitsStartRow}:D${limitsStartRow}`);
  
  const limitsHeaders = ["Giới hạn", "Giá trị", "Mô tả", ""];
  summarySheet.getRow(limitsStartRow + 1).values = limitsHeaders;
  summarySheet.getRow(limitsStartRow + 1).font = { bold: true };
  summarySheet.getRow(limitsStartRow + 1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F1F5F9" }
  };
  
  const limitsData = [
    ["UCL (X-bar)", data.spcResult.ucl.toFixed(6), "Upper Control Limit"],
    ["CL (X-bar)", data.spcResult.mean.toFixed(6), "Center Line"],
    ["LCL (X-bar)", data.spcResult.lcl.toFixed(6), "Lower Control Limit"],
    ["UCL (R)", data.spcResult.uclR.toFixed(6), "Upper Control Limit (Range)"],
    ["LCL (R)", data.spcResult.lclR.toFixed(6), "Lower Control Limit (Range)"],
  ];
  
  limitsData.forEach((row, idx) => {
    summarySheet.getRow(limitsStartRow + 2 + idx).values = row;
  });
  
  // Data Sheet - X-bar data
  if (data.spcResult.xBarData && data.spcResult.xBarData.length > 0) {
    const dataSheet = workbook.addWorksheet("Dữ liệu X-bar", {
      properties: { tabColor: { argb: "10B981" } }
    });
    
    dataSheet.columns = [
      { header: "Subgroup", key: "index", width: 12 },
      { header: "Giá trị", key: "value", width: 18 },
      { header: "Thời gian", key: "timestamp", width: 22 },
      { header: "UCL", key: "ucl", width: 18 },
      { header: "CL", key: "cl", width: 18 },
      { header: "LCL", key: "lcl", width: 18 },
    ];
    
    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E40AF" }
    };
    dataSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    
    data.spcResult.xBarData.forEach((point) => {
      dataSheet.addRow({
        index: point.index,
        value: point.value,
        timestamp: point.timestamp.toLocaleString("vi-VN"),
        ucl: data.spcResult.ucl,
        cl: data.spcResult.mean,
        lcl: data.spcResult.lcl,
      });
    });
  }
  
  // Range Data Sheet
  if (data.spcResult.rangeData && data.spcResult.rangeData.length > 0) {
    const rangeSheet = workbook.addWorksheet("Dữ liệu Range", {
      properties: { tabColor: { argb: "F59E0B" } }
    });
    
    rangeSheet.columns = [
      { header: "Subgroup", key: "index", width: 12 },
      { header: "Range", key: "value", width: 18 },
      { header: "UCL (R)", key: "uclR", width: 18 },
      { header: "LCL (R)", key: "lclR", width: 18 },
    ];
    
    rangeSheet.getRow(1).font = { bold: true };
    rangeSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F59E0B" }
    };
    rangeSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    
    data.spcResult.rangeData.forEach((point) => {
      rangeSheet.addRow({
        index: point.index,
        value: point.value,
        uclR: data.spcResult.uclR,
        lclR: data.spcResult.lclR,
      });
    });
  }
  
  // Raw Data Sheet
  if (data.spcResult.rawData && data.spcResult.rawData.length > 0) {
    const rawSheet = workbook.addWorksheet("Dữ liệu thô", {
      properties: { tabColor: { argb: "8B5CF6" } }
    });
    
    rawSheet.columns = [
      { header: "#", key: "index", width: 8 },
      { header: "Giá trị", key: "value", width: 18 },
      { header: "Thời gian", key: "timestamp", width: 22 },
    ];
    
    rawSheet.getRow(1).font = { bold: true };
    rawSheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "8B5CF6" }
    };
    rawSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    
    data.spcResult.rawData.forEach((point, idx) => {
      rawSheet.addRow({
        index: idx + 1,
        value: point.value,
        timestamp: point.timestamp.toLocaleString("vi-VN"),
      });
    });
  }
  
  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// Generate CSV content (enhanced)
export function generateEnhancedCsv(data: ExportData): string {
  const lines: string[] = [];
  const cpkStatus = getCpkStatus(data.spcResult.cpk);
  
  // BOM for UTF-8
  lines.push("\uFEFF");
  
  // Header
  lines.push("BÁO CÁO PHÂN TÍCH SPC/CPK");
  lines.push("Statistical Process Control Analysis Report");
  lines.push("");
  
  // Info
  lines.push("THÔNG TIN CHUNG");
  lines.push(`Mã sản phẩm,${data.productCode}`);
  lines.push(`Trạm/Station,${data.stationName}`);
  lines.push(`Khoảng thời gian,${data.startDate.toLocaleDateString('vi-VN')} - ${data.endDate.toLocaleDateString('vi-VN')}`);
  lines.push(`Ngày phân tích,${data.analysisDate.toLocaleString('vi-VN')}`);
  lines.push(`Số mẫu,${data.spcResult.sampleCount}`);
  lines.push("");
  
  // CPK Status
  lines.push("CHỈ SỐ NĂNG LỰC QUY TRÌNH");
  lines.push(`CPK,${data.spcResult.cpk?.toFixed(4) ?? 'N/A'},${cpkStatus.label}`);
  lines.push(`Cp,${data.spcResult.cp?.toFixed(4) ?? 'N/A'}`);
  lines.push(`Cpu,${data.spcResult.cpu?.toFixed(4) ?? 'N/A'}`);
  lines.push(`Cpl,${data.spcResult.cpl?.toFixed(4) ?? 'N/A'}`);
  lines.push("");
  
  // Statistics
  lines.push("THỐNG KÊ MÔ TẢ");
  lines.push("Chỉ tiêu,Giá trị");
  lines.push(`Trung bình (Mean),${data.spcResult.mean.toFixed(6)}`);
  lines.push(`Độ lệch chuẩn (Std Dev),${data.spcResult.stdDev.toFixed(6)}`);
  lines.push(`Giá trị nhỏ nhất (Min),${data.spcResult.min.toFixed(6)}`);
  lines.push(`Giá trị lớn nhất (Max),${data.spcResult.max.toFixed(6)}`);
  lines.push(`Khoảng biến thiên (Range),${data.spcResult.range.toFixed(6)}`);
  lines.push("");
  
  // Control Limits
  lines.push("GIỚI HẠN KIỂM SOÁT");
  lines.push("Giới hạn,Giá trị");
  lines.push(`UCL (X-bar),${data.spcResult.ucl.toFixed(6)}`);
  lines.push(`CL (X-bar),${data.spcResult.mean.toFixed(6)}`);
  lines.push(`LCL (X-bar),${data.spcResult.lcl.toFixed(6)}`);
  lines.push(`UCL (R),${data.spcResult.uclR.toFixed(6)}`);
  lines.push(`LCL (R),${data.spcResult.lclR.toFixed(6)}`);
  lines.push("");
  
  // X-bar Data
  if (data.spcResult.xBarData && data.spcResult.xBarData.length > 0) {
    lines.push("DỮ LIỆU X-BAR");
    lines.push("Subgroup,Giá trị,Thời gian");
    data.spcResult.xBarData.forEach(point => {
      lines.push(`${point.index},${point.value.toFixed(6)},${point.timestamp.toLocaleString('vi-VN')}`);
    });
    lines.push("");
  }
  
  // Range Data
  if (data.spcResult.rangeData && data.spcResult.rangeData.length > 0) {
    lines.push("DỮ LIỆU RANGE");
    lines.push("Subgroup,Range");
    data.spcResult.rangeData.forEach(point => {
      lines.push(`${point.index},${point.value.toFixed(6)}`);
    });
    lines.push("");
  }
  
  // Raw Data
  if (data.spcResult.rawData && data.spcResult.rawData.length > 0) {
    lines.push("DỮ LIỆU THÔ");
    lines.push("#,Giá trị,Thời gian");
    data.spcResult.rawData.forEach((point, idx) => {
      lines.push(`${idx + 1},${point.value.toFixed(6)},${point.timestamp.toLocaleString('vi-VN')}`);
    });
  }
  
  return lines.join("\n");
}
