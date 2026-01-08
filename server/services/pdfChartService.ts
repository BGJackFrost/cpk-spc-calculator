/**
 * PDF Chart Service - Tạo biểu đồ SVG cho PDF export
 */

export interface ChartDataPoint {
  index: number;
  value: number;
}

export interface ControlLimits {
  ucl: number;
  cl: number;
  lcl: number;
}

export interface ChartConfig {
  width?: number;
  height?: number;
  padding?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  title?: string;
  primaryColor?: string;
  warningColor?: string;
  dangerColor?: string;
}

const DEFAULT_CONFIG = {
  width: 700,
  height: 300,
  padding: 50,
  showGrid: true,
  showLegend: true,
  title: '',
  primaryColor: '#3b82f6',
  warningColor: '#f59e0b',
  dangerColor: '#ef4444',
};

export function generateXBarChartSvg(
  data: ChartDataPoint[],
  limits: ControlLimits,
  config: ChartConfig = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { width, height, padding, primaryColor, dangerColor } = cfg;
  
  if (data.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#6b7280">Không có dữ liệu</text>
    </svg>`;
  }
  
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const values = data.map(d => d.value);
  const allValues = [...values, limits.ucl, limits.lcl];
  const minValue = Math.min(...allValues) * 0.98;
  const maxValue = Math.max(...allValues) * 1.02;
  const valueRange = maxValue - minValue;
  
  const xScale = (index: number) => padding + (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => height - padding - ((value - minValue) / valueRange) * chartHeight;
  
  const violationPoints = data.filter(d => d.value > limits.ucl || d.value < limits.lcl);
  
  const dataPath = data.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.value).toFixed(1)}`
  ).join(' ');
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
    <rect width="${width}" height="${height}" fill="white"/>
    <text x="${width/2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">${config.title || 'X-bar Control Chart'}</text>
    <line x1="${padding}" y1="${yScale(limits.ucl).toFixed(1)}" x2="${width - padding}" y2="${yScale(limits.ucl).toFixed(1)}" stroke="${dangerColor}" stroke-width="2" stroke-dasharray="8,4"/>
    <line x1="${padding}" y1="${yScale(limits.cl).toFixed(1)}" x2="${width - padding}" y2="${yScale(limits.cl).toFixed(1)}" stroke="#10b981" stroke-width="2"/>
    <line x1="${padding}" y1="${yScale(limits.lcl).toFixed(1)}" x2="${width - padding}" y2="${yScale(limits.lcl).toFixed(1)}" stroke="${dangerColor}" stroke-width="2" stroke-dasharray="8,4"/>
    <text x="${width - padding + 5}" y="${yScale(limits.ucl).toFixed(1)}" font-size="10" fill="${dangerColor}">UCL: ${limits.ucl.toFixed(3)}</text>
    <text x="${width - padding + 5}" y="${yScale(limits.cl).toFixed(1)}" font-size="10" fill="#10b981">CL: ${limits.cl.toFixed(3)}</text>
    <text x="${width - padding + 5}" y="${yScale(limits.lcl).toFixed(1)}" font-size="10" fill="${dangerColor}">LCL: ${limits.lcl.toFixed(3)}</text>
    <path d="${dataPath}" fill="none" stroke="${primaryColor}" stroke-width="2"/>
    ${data.map((d, i) => {
      const isViolation = d.value > limits.ucl || d.value < limits.lcl;
      const color = isViolation ? dangerColor : primaryColor;
      const radius = isViolation ? 6 : 4;
      return `<circle cx="${xScale(i).toFixed(1)}" cy="${yScale(d.value).toFixed(1)}" r="${radius}" fill="${color}" stroke="white" stroke-width="1"/>`;
    }).join('\n    ')}
    <g transform="translate(${padding}, ${height - 15})">
      <circle cx="150" cy="0" r="4" fill="${primaryColor}"/>
      <text x="160" y="4" font-size="9" fill="#64748b">Data</text>
      <circle cx="210" cy="0" r="6" fill="${dangerColor}"/>
      <text x="220" y="4" font-size="9" fill="#64748b">Vi phạm (${violationPoints.length})</text>
    </g>
  </svg>`;
}

export function generateRChartSvg(
  data: ChartDataPoint[],
  limits: { uclR: number; avgR: number; lclR: number },
  config: ChartConfig = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { width, height, padding, warningColor, dangerColor } = cfg;
  
  if (data.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#6b7280">Không có dữ liệu</text>
    </svg>`;
  }
  
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const values = data.map(d => d.value);
  const allValues = [...values, limits.uclR, limits.lclR];
  const minValue = Math.min(0, Math.min(...allValues) * 0.98);
  const maxValue = Math.max(...allValues) * 1.1;
  const valueRange = maxValue - minValue;
  
  const xScale = (index: number) => padding + (index / (data.length - 1)) * chartWidth;
  const yScale = (value: number) => height - padding - ((value - minValue) / valueRange) * chartHeight;
  
  const violationPoints = data.filter(d => d.value > limits.uclR || d.value < limits.lclR);
  
  const dataPath = data.map((d, i) => 
    `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.value).toFixed(1)}`
  ).join(' ');
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
    <rect width="${width}" height="${height}" fill="white"/>
    <text x="${width/2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">${config.title || 'R Control Chart (Range)'}</text>
    <line x1="${padding}" y1="${yScale(limits.uclR).toFixed(1)}" x2="${width - padding}" y2="${yScale(limits.uclR).toFixed(1)}" stroke="${dangerColor}" stroke-width="2" stroke-dasharray="8,4"/>
    <line x1="${padding}" y1="${yScale(limits.avgR).toFixed(1)}" x2="${width - padding}" y2="${yScale(limits.avgR).toFixed(1)}" stroke="#10b981" stroke-width="2"/>
    <text x="${width - padding + 5}" y="${yScale(limits.uclR).toFixed(1)}" font-size="10" fill="${dangerColor}">UCL(R): ${limits.uclR.toFixed(3)}</text>
    <text x="${width - padding + 5}" y="${yScale(limits.avgR).toFixed(1)}" font-size="10" fill="#10b981">R̄: ${limits.avgR.toFixed(3)}</text>
    <path d="${dataPath}" fill="none" stroke="${warningColor}" stroke-width="2"/>
    ${data.map((d, i) => {
      const isViolation = d.value > limits.uclR || d.value < limits.lclR;
      const color = isViolation ? dangerColor : warningColor;
      const radius = isViolation ? 6 : 4;
      return `<circle cx="${xScale(i).toFixed(1)}" cy="${yScale(d.value).toFixed(1)}" r="${radius}" fill="${color}" stroke="white" stroke-width="1"/>`;
    }).join('\n    ')}
    <g transform="translate(${padding}, ${height - 15})">
      <circle cx="150" cy="0" r="4" fill="${warningColor}"/>
      <text x="160" y="4" font-size="9" fill="#64748b">Data</text>
      <circle cx="210" cy="0" r="6" fill="${dangerColor}"/>
      <text x="220" y="4" font-size="9" fill="#64748b">Vi phạm (${violationPoints.length})</text>
    </g>
  </svg>`;
}

export function generateHistogramSvg(
  values: number[],
  stats: { mean: number; stdDev: number; usl?: number | null; lsl?: number | null },
  config: ChartConfig = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { width, height, padding, primaryColor, dangerColor } = cfg;
  
  if (values.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#6b7280">Không có dữ liệu</text>
    </svg>`;
  }
  
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const binWidth = (maxVal - minVal) / binCount;
  
  const bins: { start: number; end: number; count: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({ start: minVal + i * binWidth, end: minVal + (i + 1) * binWidth, count: 0 });
  }
  
  values.forEach(v => {
    const binIndex = Math.min(Math.floor((v - minVal) / binWidth), binCount - 1);
    if (binIndex >= 0 && binIndex < bins.length) bins[binIndex].count++;
  });
  
  const maxCount = Math.max(...bins.map(b => b.count));
  const barWidth = chartWidth / binCount - 2;
  
  const xScale = (index: number) => padding + (index / binCount) * chartWidth;
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
    <rect width="${width}" height="${height}" fill="white"/>
    <text x="${width/2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">${config.title || 'Histogram với Normal Distribution'}</text>
    ${bins.map((bin, i) => {
      const x = xScale(i) + 1;
      const barHeight = (bin.count / maxCount) * chartHeight;
      const y = height - padding - barHeight;
      const isOutOfSpec = (stats.usl && bin.end > stats.usl) || (stats.lsl && bin.start < stats.lsl);
      const color = isOutOfSpec ? dangerColor : primaryColor;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barWidth.toFixed(1)}" height="${barHeight.toFixed(1)}" fill="${color}" opacity="0.7"/>`;
    }).join('\n    ')}
    ${stats.usl ? `<line x1="${xScale((stats.usl - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y1="${padding}" x2="${xScale((stats.usl - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y2="${height - padding}" stroke="${dangerColor}" stroke-width="2" stroke-dasharray="5,3"/>
    <text x="${xScale((stats.usl - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y="${padding - 5}" text-anchor="middle" font-size="10" fill="${dangerColor}">USL: ${stats.usl.toFixed(3)}</text>` : ''}
    ${stats.lsl ? `<line x1="${xScale((stats.lsl - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y1="${padding}" x2="${xScale((stats.lsl - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y2="${height - padding}" stroke="${dangerColor}" stroke-width="2" stroke-dasharray="5,3"/>
    <text x="${xScale((stats.lsl - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y="${padding - 5}" text-anchor="middle" font-size="10" fill="${dangerColor}">LSL: ${stats.lsl.toFixed(3)}</text>` : ''}
    <line x1="${xScale((stats.mean - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y1="${padding}" x2="${xScale((stats.mean - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y2="${height - padding}" stroke="#8b5cf6" stroke-width="2"/>
    <text x="${xScale((stats.mean - minVal) / (maxVal - minVal) * binCount).toFixed(1)}" y="${height - padding + 15}" text-anchor="middle" font-size="10" fill="#8b5cf6">Mean: ${stats.mean.toFixed(3)}</text>
  </svg>`;
}

export function generateCpkGaugeSvg(cpk: number | null, config: ChartConfig = {}): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { primaryColor, warningColor, dangerColor } = cfg;
  const size = 250;
  const centerX = size / 2;
  const centerY = size / 2 + 20;
  const radius = size / 2 - 30;
  
  if (cpk === null) {
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <text x="${centerX}" y="${centerY}" text-anchor="middle" fill="#6b7280">N/A</text>
    </svg>`;
  }
  
  const maxCpk = 2.5;
  const normalizedCpk = Math.min(cpk, maxCpk) / maxCpk;
  const angle = -180 + normalizedCpk * 180;
  
  const getColor = (cpkValue: number) => {
    if (cpkValue < 1.0) return dangerColor;
    if (cpkValue < 1.33) return warningColor;
    if (cpkValue < 1.67) return primaryColor;
    return '#10b981';
  };
  
  const getLabel = (cpkValue: number) => {
    if (cpkValue < 1.0) return 'Kém';
    if (cpkValue < 1.33) return 'Chấp nhận được';
    if (cpkValue < 1.67) return 'Tốt';
    return 'Xuất sắc';
  };
  
  const color = getColor(cpk);
  const label = getLabel(cpk);
  
  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(angleInRadians), y: cy + r * Math.sin(angleInRadians) };
  };
  
  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };
  
  const needleEnd = polarToCartesian(centerX, centerY, radius - 25, angle);
  
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" style="font-family: Arial, sans-serif;">
    <rect width="${size}" height="${size}" fill="white"/>
    <text x="${centerX}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="#1e293b">${config.title || 'CPK Index'}</text>
    <path d="${describeArc(centerX, centerY, radius, -180, -108)}" fill="none" stroke="${dangerColor}" stroke-width="20" stroke-linecap="round" opacity="0.3"/>
    <path d="${describeArc(centerX, centerY, radius, -108, -54)}" fill="none" stroke="${warningColor}" stroke-width="20" stroke-linecap="round" opacity="0.3"/>
    <path d="${describeArc(centerX, centerY, radius, -54, -12)}" fill="none" stroke="${primaryColor}" stroke-width="20" stroke-linecap="round" opacity="0.3"/>
    <path d="${describeArc(centerX, centerY, radius, -12, 0)}" fill="none" stroke="#10b981" stroke-width="20" stroke-linecap="round" opacity="0.3"/>
    <path d="${describeArc(centerX, centerY, radius, -180, angle)}" fill="none" stroke="${color}" stroke-width="20" stroke-linecap="round"/>
    <line x1="${centerX}" y1="${centerY}" x2="${needleEnd.x}" y2="${needleEnd.y}" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
    <circle cx="${centerX}" cy="${centerY}" r="8" fill="#1e293b"/>
    <text x="${centerX}" y="${centerY + 40}" text-anchor="middle" font-size="32" font-weight="bold" fill="${color}">${cpk.toFixed(2)}</text>
    <text x="${centerX}" y="${centerY + 60}" text-anchor="middle" font-size="14" fill="${color}">${label}</text>
  </svg>`;
}

export default {
  generateXBarChartSvg,
  generateRChartSvg,
  generateHistogramSvg,
  generateCpkGaugeSvg,
};
