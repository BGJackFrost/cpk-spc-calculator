/**
 * AI Report Service - Generate PDF reports for AI Analysis
 */

import { marked } from 'marked';

interface AiReportData {
  productCode: string;
  stationName: string;
  startDate: Date;
  endDate: Date;
  aiAnalysis: string;
  spcResult: {
    sampleCount: number;
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    range: number;
    cp: number | null;
    cpk: number | null;
    cpu: number | null;
    cpl: number | null;
    ucl: number;
    lcl: number;
    uclR: number;
    lclR: number;
  };
  usl?: number | null;
  lsl?: number | null;
  target?: number | null;
  generatedBy: string;
}

function getCpkStatus(cpk: number | null): { color: string; label: string; bgColor: string } {
  if (cpk === null) return { color: '#6b7280', label: 'N/A', bgColor: '#f3f4f6' };
  if (cpk >= 1.67) return { color: '#059669', label: 'Xuất sắc', bgColor: '#d1fae5' };
  if (cpk >= 1.33) return { color: '#10b981', label: 'Tốt', bgColor: '#d1fae5' };
  if (cpk >= 1.0) return { color: '#f59e0b', label: 'Chấp nhận', bgColor: '#fef3c7' };
  return { color: '#ef4444', label: 'Không đạt', bgColor: '#fee2e2' };
}

export async function generateAiAnalysisPdfHtml(data: AiReportData): Promise<string> {
  const cpkStatus = getCpkStatus(data.spcResult.cpk);
  
  // Convert markdown to HTML
  const aiAnalysisHtml = await marked.parse(data.aiAnalysis);
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (num: number | null | undefined, decimals = 4) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(decimals);
  };

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Analysis Report - ${data.productCode}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #f9fafb;
      padding: 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }
    
    .header .subtitle {
      font-size: 16px;
      opacity: 0.9;
    }
    
    .header .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      margin-top: 10px;
    }
    
    .content {
      padding: 30px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
    }
    
    .info-card .label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .info-card .value {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }
    
    .stats-section {
      margin-bottom: 30px;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
    }
    
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    
    .stat-box .stat-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    
    .stat-box .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
    }
    
    .cpk-highlight {
      background: ${cpkStatus.bgColor};
      border-color: ${cpkStatus.color};
    }
    
    .cpk-highlight .stat-value {
      color: ${cpkStatus.color};
    }
    
    .cpk-status {
      font-size: 11px;
      color: ${cpkStatus.color};
      margin-top: 4px;
      font-weight: 500;
    }
    
    .ai-analysis-section {
      margin-bottom: 30px;
    }
    
    .ai-analysis-content {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 1px solid #bae6fd;
      border-radius: 12px;
      padding: 25px;
    }
    
    .ai-analysis-content h1,
    .ai-analysis-content h2,
    .ai-analysis-content h3 {
      color: #0369a1;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    
    .ai-analysis-content h1:first-child,
    .ai-analysis-content h2:first-child,
    .ai-analysis-content h3:first-child {
      margin-top: 0;
    }
    
    .ai-analysis-content p {
      margin-bottom: 12px;
      color: #334155;
    }
    
    .ai-analysis-content ul,
    .ai-analysis-content ol {
      margin-left: 20px;
      margin-bottom: 12px;
    }
    
    .ai-analysis-content li {
      margin-bottom: 6px;
      color: #334155;
    }
    
    .ai-analysis-content strong {
      color: #0c4a6e;
    }
    
    .ai-analysis-content code {
      background: #e0f2fe;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    
    .ai-analysis-content blockquote {
      border-left: 4px solid #0ea5e9;
      padding-left: 15px;
      margin: 15px 0;
      color: #475569;
      font-style: italic;
    }
    
    .ai-analysis-content table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    .ai-analysis-content th,
    .ai-analysis-content td {
      border: 1px solid #bae6fd;
      padding: 10px;
      text-align: left;
    }
    
    .ai-analysis-content th {
      background: #e0f2fe;
      font-weight: 600;
    }
    
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #64748b;
    }
    
    .footer .logo {
      font-weight: 600;
      color: #3b82f6;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .container {
        box-shadow: none;
        border-radius: 0;
      }
      
      .ai-analysis-content {
        break-inside: avoid;
      }
    }
    
    @media (max-width: 768px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
      
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        AI Analysis Report
      </h1>
      <div class="subtitle">${data.productCode} - ${data.stationName}</div>
      <div class="ai-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        Powered by AI
      </div>
    </div>
    
    <div class="content">
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Mã sản phẩm</div>
          <div class="value">${data.productCode}</div>
        </div>
        <div class="info-card">
          <div class="label">Trạm sản xuất</div>
          <div class="value">${data.stationName}</div>
        </div>
        <div class="info-card">
          <div class="label">Từ ngày</div>
          <div class="value">${formatDate(data.startDate)}</div>
        </div>
        <div class="info-card">
          <div class="label">Đến ngày</div>
          <div class="value">${formatDate(data.endDate)}</div>
        </div>
      </div>
      
      <div class="stats-section">
        <h2 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          Thống kê SPC
        </h2>
        <div class="stats-grid">
          <div class="stat-box">
            <div class="stat-label">Số mẫu</div>
            <div class="stat-value">${data.spcResult.sampleCount}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Trung bình</div>
            <div class="stat-value">${formatNumber(data.spcResult.mean)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Độ lệch chuẩn</div>
            <div class="stat-value">${formatNumber(data.spcResult.stdDev)}</div>
          </div>
          <div class="stat-box cpk-highlight">
            <div class="stat-label">CPK</div>
            <div class="stat-value">${formatNumber(data.spcResult.cpk, 2)}</div>
            <div class="cpk-status">${cpkStatus.label}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">CP</div>
            <div class="stat-value">${formatNumber(data.spcResult.cp, 2)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Min</div>
            <div class="stat-value">${formatNumber(data.spcResult.min)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Max</div>
            <div class="stat-value">${formatNumber(data.spcResult.max)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">Range</div>
            <div class="stat-value">${formatNumber(data.spcResult.range)}</div>
          </div>
        </div>
        
        ${data.usl !== null || data.lsl !== null ? `
        <div class="stats-grid" style="margin-top: 15px;">
          <div class="stat-box">
            <div class="stat-label">USL</div>
            <div class="stat-value">${formatNumber(data.usl)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">LSL</div>
            <div class="stat-value">${formatNumber(data.lsl)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">UCL</div>
            <div class="stat-value">${formatNumber(data.spcResult.ucl)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">LCL</div>
            <div class="stat-value">${formatNumber(data.spcResult.lcl)}</div>
          </div>
        </div>
        ` : ''}
      </div>
      
      <div class="ai-analysis-section">
        <h2 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          Phân tích AI
        </h2>
        <div class="ai-analysis-content">
          ${aiAnalysisHtml}
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div class="logo">SPC/CPK Calculator</div>
      <div>
        Tạo bởi: ${data.generatedBy} | ${formatDate(new Date())}
      </div>
    </div>
  </div>
</body>
</html>`;
}
