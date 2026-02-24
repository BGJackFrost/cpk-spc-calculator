import { SpcResult } from "./db";

export interface ExportData {
  productCode: string;
  stationName: string;
  startDate: Date;
  endDate: Date;
  spcResult: SpcResult;
  analysisDate: Date;
}

export function generateCsvContent(data: ExportData): string {
  const lines: string[] = [];
  
  // Header section
  lines.push("SPC/CPK Analysis Report");
  lines.push("");
  lines.push(`Product Code,${data.productCode}`);
  lines.push(`Station Name,${data.stationName}`);
  lines.push(`Analysis Period,${data.startDate.toISOString().split('T')[0]} to ${data.endDate.toISOString().split('T')[0]}`);
  lines.push(`Analysis Date,${data.analysisDate.toISOString()}`);
  lines.push("");
  
  // Statistics section
  lines.push("Statistical Summary");
  lines.push("Metric,Value");
  lines.push(`Sample Count,${data.spcResult.sampleCount}`);
  lines.push(`Mean,${data.spcResult.mean.toFixed(6)}`);
  lines.push(`Standard Deviation,${data.spcResult.stdDev.toFixed(6)}`);
  lines.push(`Minimum,${data.spcResult.min.toFixed(6)}`);
  lines.push(`Maximum,${data.spcResult.max.toFixed(6)}`);
  lines.push(`Range,${data.spcResult.range.toFixed(6)}`);
  lines.push("");
  
  // Process capability section
  lines.push("Process Capability Indices");
  lines.push("Index,Value");
  lines.push(`Cp,${data.spcResult.cp?.toFixed(4) ?? 'N/A'}`);
  lines.push(`Cpk,${data.spcResult.cpk?.toFixed(4) ?? 'N/A'}`);
  lines.push(`Cpu,${data.spcResult.cpu?.toFixed(4) ?? 'N/A'}`);
  lines.push(`Cpl,${data.spcResult.cpl?.toFixed(4) ?? 'N/A'}`);
  lines.push("");
  
  // Control limits section
  lines.push("Control Limits");
  lines.push("Limit,Value");
  lines.push(`UCL (X-bar),${data.spcResult.ucl.toFixed(6)}`);
  lines.push(`LCL (X-bar),${data.spcResult.lcl.toFixed(6)}`);
  lines.push(`UCL (R),${data.spcResult.uclR.toFixed(6)}`);
  lines.push(`LCL (R),${data.spcResult.lclR.toFixed(6)}`);
  lines.push("");
  
  // X-bar data section
  lines.push("X-bar Chart Data");
  lines.push("Subgroup,Value,Timestamp");
  data.spcResult.xBarData.forEach(point => {
    lines.push(`${point.index},${point.value.toFixed(6)},${point.timestamp.toISOString()}`);
  });
  lines.push("");
  
  // Range data section
  lines.push("R Chart Data");
  lines.push("Subgroup,Range");
  data.spcResult.rangeData.forEach(point => {
    lines.push(`${point.index},${point.value.toFixed(6)}`);
  });
  
  return lines.join("\n");
}

export function generateHtmlReport(data: ExportData): string {
  const getCpkStatus = (cpk: number | null): { color: string; label: string } => {
    if (cpk === null) return { color: "#6b7280", label: "N/A" };
    if (cpk >= 1.67) return { color: "#10b981", label: "Excellent" };
    if (cpk >= 1.33) return { color: "#3b82f6", label: "Good" };
    if (cpk >= 1.0) return { color: "#f59e0b", label: "Acceptable" };
    return { color: "#ef4444", label: "Poor" };
  };

  const cpkStatus = getCpkStatus(data.spcResult.cpk);

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPC/CPK Analysis Report - ${data.productCode}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; background: #f9fafb; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .header h1 { font-size: 28px; color: #111827; margin-bottom: 8px; }
    .header p { color: #6b7280; font-size: 14px; }
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 32px; }
    .info-item { background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .info-item label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-item value { display: block; font-size: 18px; font-weight: 600; color: #111827; margin-top: 4px; }
    .section { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 24px; margin-bottom: 24px; }
    .section h2 { font-size: 18px; color: #111827; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .stat-item { text-align: center; padding: 16px; background: #f9fafb; border-radius: 8px; }
    .stat-item .value { font-size: 24px; font-weight: 700; color: #111827; }
    .stat-item .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .cpk-highlight { text-align: center; padding: 24px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; margin-bottom: 24px; }
    .cpk-highlight .value { font-size: 48px; font-weight: 800; color: ${cpkStatus.color}; }
    .cpk-highlight .label { font-size: 14px; color: #6b7280; margin-top: 8px; }
    .cpk-highlight .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: white; background: ${cpkStatus.color}; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    td { font-family: 'Courier New', monospace; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SPC/CPK Analysis Report</h1>
      <p>Statistical Process Control Analysis</p>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <label>Product Code</label>
        <value>${data.productCode}</value>
      </div>
      <div class="info-item">
        <label>Station Name</label>
        <value>${data.stationName}</value>
      </div>
      <div class="info-item">
        <label>Analysis Period</label>
        <value>${data.startDate.toLocaleDateString('vi-VN')} - ${data.endDate.toLocaleDateString('vi-VN')}</value>
      </div>
      <div class="info-item">
        <label>Report Generated</label>
        <value>${data.analysisDate.toLocaleString('vi-VN')}</value>
      </div>
    </div>

    <div class="cpk-highlight">
      <div class="value">${data.spcResult.cpk?.toFixed(3) ?? 'N/A'}</div>
      <div class="label">Process Capability Index (Cpk)</div>
      <div class="status">${cpkStatus.label}</div>
    </div>

    <div class="section">
      <h2>Statistical Summary</h2>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="value">${data.spcResult.sampleCount}</div>
          <div class="label">Sample Count</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.mean.toFixed(4)}</div>
          <div class="label">Mean</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.stdDev.toFixed(4)}</div>
          <div class="label">Std Deviation</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.min.toFixed(4)}</div>
          <div class="label">Minimum</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.max.toFixed(4)}</div>
          <div class="label">Maximum</div>
        </div>
        <div class="stat-item">
          <div class="value">${data.spcResult.range.toFixed(4)}</div>
          <div class="label">Range</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Process Capability Indices</h2>
      <table>
        <tr><th>Index</th><th>Value</th><th>Description</th></tr>
        <tr><td>Cp</td><td>${data.spcResult.cp?.toFixed(4) ?? 'N/A'}</td><td>Process Capability</td></tr>
        <tr><td>Cpk</td><td>${data.spcResult.cpk?.toFixed(4) ?? 'N/A'}</td><td>Process Capability Index</td></tr>
        <tr><td>Cpu</td><td>${data.spcResult.cpu?.toFixed(4) ?? 'N/A'}</td><td>Upper Capability Index</td></tr>
        <tr><td>Cpl</td><td>${data.spcResult.cpl?.toFixed(4) ?? 'N/A'}</td><td>Lower Capability Index</td></tr>
      </table>
    </div>

    <div class="section">
      <h2>Control Limits</h2>
      <table>
        <tr><th>Limit</th><th>Value</th></tr>
        <tr><td>UCL (X-bar)</td><td>${data.spcResult.ucl.toFixed(6)}</td></tr>
        <tr><td>LCL (X-bar)</td><td>${data.spcResult.lcl.toFixed(6)}</td></tr>
        <tr><td>UCL (R)</td><td>${data.spcResult.uclR.toFixed(6)}</td></tr>
        <tr><td>LCL (R)</td><td>${data.spcResult.lclR.toFixed(6)}</td></tr>
      </table>
    </div>

    <div class="footer">
      <p>Generated by SPC/CPK Calculator System</p>
      <p>© ${new Date().getFullYear()} All rights reserved</p>
    </div>
  </div>
</body>
</html>
`;
}
