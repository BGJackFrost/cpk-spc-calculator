/**
 * Chart Image Service
 * Tạo biểu đồ dưới dạng SVG/Base64 để nhúng vào email
 */

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TrendDataPoint {
  label: string;
  cpk?: number | null;
  oee?: number | null;
}

export interface BarChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

/**
 * Generate SVG line chart for trend data
 */
export function generateTrendChartSvg(
  data: TrendDataPoint[],
  options: {
    width?: number;
    height?: number;
    showCpk?: boolean;
    showOee?: boolean;
    title?: string;
  } = {}
): string {
  const {
    width = 600,
    height = 300,
    showCpk = true,
    showOee = true,
    title = "Xu hướng KPI",
  } = options;

  const padding = { top: 50, right: 60, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const cpkValues = data.map(d => d.cpk).filter((v): v is number => v !== null && v !== undefined);
  const oeeValues = data.map(d => d.oee).filter((v): v is number => v !== null && v !== undefined);

  const cpkMin = Math.min(...cpkValues, 0);
  const cpkMax = Math.max(...cpkValues, 2);
  const oeeMin = Math.min(...oeeValues, 0);
  const oeeMax = Math.max(...oeeValues, 100);

  // Generate path for CPK line
  let cpkPath = "";
  if (showCpk && cpkValues.length > 0) {
    const points = data
      .map((d, i) => {
        if (d.cpk === null || d.cpk === undefined) return null;
        const x = padding.left + (i / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((d.cpk - cpkMin) / (cpkMax - cpkMin)) * chartHeight;
        return `${x},${y}`;
      })
      .filter(Boolean);
    
    if (points.length > 0) {
      cpkPath = `M ${points.join(" L ")}`;
    }
  }

  // Generate path for OEE line
  let oeePath = "";
  if (showOee && oeeValues.length > 0) {
    const points = data
      .map((d, i) => {
        if (d.oee === null || d.oee === undefined) return null;
        const x = padding.left + (i / (data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((d.oee - oeeMin) / (oeeMax - oeeMin)) * chartHeight;
        return `${x},${y}`;
      })
      .filter(Boolean);
    
    if (points.length > 0) {
      oeePath = `M ${points.join(" L ")}`;
    }
  }

  // Generate X-axis labels
  const xLabels = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    return `<text x="${x}" y="${height - 15}" text-anchor="middle" font-size="10" fill="#6b7280">${d.label}</text>`;
  }).join("");

  // Generate Y-axis labels for CPK (left)
  const cpkYLabels = [0, 0.5, 1, 1.33, 1.5, 2].map(v => {
    const y = padding.top + chartHeight - ((v - cpkMin) / (cpkMax - cpkMin)) * chartHeight;
    if (y < padding.top || y > padding.top + chartHeight) return "";
    return `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#3b82f6">${v.toFixed(2)}</text>`;
  }).join("");

  // Generate Y-axis labels for OEE (right)
  const oeeYLabels = [0, 25, 50, 75, 100].map(v => {
    const y = padding.top + chartHeight - ((v - oeeMin) / (oeeMax - oeeMin)) * chartHeight;
    if (y < padding.top || y > padding.top + chartHeight) return "";
    return `<text x="${width - padding.right + 10}" y="${y + 4}" text-anchor="start" font-size="10" fill="#10b981">${v}%</text>`;
  }).join("");

  // Reference lines
  const cpk133Line = padding.top + chartHeight - ((1.33 - cpkMin) / (cpkMax - cpkMin)) * chartHeight;
  const oee75Line = padding.top + chartHeight - ((75 - oeeMin) / (oeeMax - oeeMin)) * chartHeight;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="cpkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3"/>
          <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0"/>
        </linearGradient>
        <linearGradient id="oeeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#10b981;stop-opacity:0.3"/>
          <stop offset="100%" style="stop-color:#10b981;stop-opacity:0"/>
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f2937">${title}</text>
      
      <!-- Grid lines -->
      <g stroke="#e5e7eb" stroke-width="1">
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding.top + ratio * chartHeight;
          return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/>`;
        }).join("")}
      </g>
      
      <!-- Reference lines -->
      ${showCpk && cpk133Line >= padding.top && cpk133Line <= padding.top + chartHeight ? `
        <line x1="${padding.left}" y1="${cpk133Line}" x2="${width - padding.right}" y2="${cpk133Line}" 
              stroke="#3b82f6" stroke-width="1" stroke-dasharray="5,5"/>
        <text x="${padding.left + 5}" y="${cpk133Line - 5}" font-size="9" fill="#3b82f6">CPK=1.33</text>
      ` : ""}
      ${showOee && oee75Line >= padding.top && oee75Line <= padding.top + chartHeight ? `
        <line x1="${padding.left}" y1="${oee75Line}" x2="${width - padding.right}" y2="${oee75Line}" 
              stroke="#10b981" stroke-width="1" stroke-dasharray="5,5"/>
        <text x="${width - padding.right - 5}" y="${oee75Line - 5}" text-anchor="end" font-size="9" fill="#10b981">OEE=75%</text>
      ` : ""}
      
      <!-- CPK Line -->
      ${showCpk && cpkPath ? `
        <path d="${cpkPath}" fill="none" stroke="#3b82f6" stroke-width="2"/>
        ${data.map((d, i) => {
          if (d.cpk === null || d.cpk === undefined) return "";
          const x = padding.left + (i / (data.length - 1)) * chartWidth;
          const y = padding.top + chartHeight - ((d.cpk - cpkMin) / (cpkMax - cpkMin)) * chartHeight;
          return `<circle cx="${x}" cy="${y}" r="4" fill="#3b82f6"/>`;
        }).join("")}
      ` : ""}
      
      <!-- OEE Line -->
      ${showOee && oeePath ? `
        <path d="${oeePath}" fill="none" stroke="#10b981" stroke-width="2"/>
        ${data.map((d, i) => {
          if (d.oee === null || d.oee === undefined) return "";
          const x = padding.left + (i / (data.length - 1)) * chartWidth;
          const y = padding.top + chartHeight - ((d.oee - oeeMin) / (oeeMax - oeeMin)) * chartHeight;
          return `<circle cx="${x}" cy="${y}" r="4" fill="#10b981"/>`;
        }).join("")}
      ` : ""}
      
      <!-- Axes -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#374151" stroke-width="1"/>
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#374151" stroke-width="1"/>
      <line x1="${width - padding.right}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#374151" stroke-width="1"/>
      
      <!-- Axis labels -->
      ${xLabels}
      ${cpkYLabels}
      ${oeeYLabels}
      
      <!-- Legend -->
      <g transform="translate(${width / 2 - 80}, ${height - 10})">
        ${showCpk ? `
          <rect x="0" y="-8" width="12" height="12" fill="#3b82f6"/>
          <text x="16" y="0" font-size="10" fill="#374151">CPK</text>
        ` : ""}
        ${showOee ? `
          <rect x="${showCpk ? 60 : 0}" y="-8" width="12" height="12" fill="#10b981"/>
          <text x="${showCpk ? 76 : 16}" y="0" font-size="10" fill="#374151">OEE</text>
        ` : ""}
      </g>
    </svg>
  `.trim();
}

/**
 * Generate SVG bar chart for comparison data
 */
export function generateBarChartSvg(
  data: BarChartData,
  options: {
    width?: number;
    height?: number;
    title?: string;
  } = {}
): string {
  const {
    width = 600,
    height = 300,
    title = "So sánh KPI",
  } = options;

  const padding = { top: 50, right: 30, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const numBars = data.labels.length;
  const numDatasets = data.datasets.length;
  const groupWidth = chartWidth / numBars;
  const barWidth = (groupWidth * 0.7) / numDatasets;
  const barGap = groupWidth * 0.15;

  // Calculate max value
  const allValues = data.datasets.flatMap(d => d.data);
  const maxValue = Math.max(...allValues, 1);

  // Generate bars
  const bars = data.datasets.flatMap((dataset, datasetIndex) => {
    return dataset.data.map((value, labelIndex) => {
      const x = padding.left + labelIndex * groupWidth + barGap + datasetIndex * barWidth;
      const barHeight = (value / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      
      return `
        <rect x="${x}" y="${y}" width="${barWidth - 2}" height="${barHeight}" fill="${dataset.color}" rx="2"/>
        <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="9" fill="#374151">${value.toFixed(2)}</text>
      `;
    }).join("");
  }).join("");

  // Generate X-axis labels
  const xLabels = data.labels.map((label, i) => {
    const x = padding.left + i * groupWidth + groupWidth / 2;
    return `<text x="${x}" y="${height - 25}" text-anchor="middle" font-size="10" fill="#6b7280">${label}</text>`;
  }).join("");

  // Generate Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const value = ratio * maxValue;
    const y = padding.top + chartHeight - ratio * chartHeight;
    return `<text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#6b7280">${value.toFixed(1)}</text>`;
  }).join("");

  // Generate legend
  const legend = data.datasets.map((dataset, i) => {
    const x = width / 2 - (data.datasets.length * 60) / 2 + i * 60;
    return `
      <rect x="${x}" y="${height - 12}" width="12" height="12" fill="${dataset.color}"/>
      <text x="${x + 16}" y="${height - 3}" font-size="10" fill="#374151">${dataset.label}</text>
    `;
  }).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Title -->
      <text x="${width / 2}" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#1f2937">${title}</text>
      
      <!-- Grid lines -->
      <g stroke="#e5e7eb" stroke-width="1">
        ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding.top + (1 - ratio) * chartHeight;
          return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"/>`;
        }).join("")}
      </g>
      
      <!-- Bars -->
      ${bars}
      
      <!-- Axes -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#374151" stroke-width="1"/>
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#374151" stroke-width="1"/>
      
      <!-- Axis labels -->
      ${xLabels}
      ${yLabels}
      
      <!-- Legend -->
      ${legend}
    </svg>
  `.trim();
}

/**
 * Generate SVG gauge chart for single KPI value
 */
export function generateGaugeChartSvg(
  value: number,
  options: {
    width?: number;
    height?: number;
    title?: string;
    min?: number;
    max?: number;
    warningThreshold?: number;
    criticalThreshold?: number;
    unit?: string;
  } = {}
): string {
  const {
    width = 200,
    height = 150,
    title = "KPI",
    min = 0,
    max = 2,
    warningThreshold = 1.33,
    criticalThreshold = 1.0,
    unit = "",
  } = options;

  const centerX = width / 2;
  const centerY = height - 30;
  const radius = Math.min(width, height) / 2 - 20;

  // Calculate angle (180 degrees arc)
  const normalizedValue = Math.max(min, Math.min(max, value));
  const angle = ((normalizedValue - min) / (max - min)) * 180;
  const radians = (180 - angle) * (Math.PI / 180);
  
  const needleX = centerX + radius * 0.8 * Math.cos(radians);
  const needleY = centerY - radius * 0.8 * Math.sin(radians);

  // Determine color based on thresholds
  let color = "#ef4444"; // Red (critical)
  if (value >= warningThreshold) {
    color = "#10b981"; // Green (good)
  } else if (value >= criticalThreshold) {
    color = "#f59e0b"; // Yellow (warning)
  }

  // Generate arc segments
  const createArc = (startAngle: number, endAngle: number, arcColor: string) => {
    const startRad = (180 - startAngle) * (Math.PI / 180);
    const endRad = (180 - endAngle) * (Math.PI / 180);
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY - radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY - radius * Math.sin(endRad);
    
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    
    return `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}" 
                  fill="none" stroke="${arcColor}" stroke-width="15" stroke-linecap="round"/>`;
  };

  const criticalAngle = ((criticalThreshold - min) / (max - min)) * 180;
  const warningAngle = ((warningThreshold - min) / (max - min)) * 180;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="#ffffff"/>
      
      <!-- Title -->
      <text x="${centerX}" y="20" text-anchor="middle" font-size="12" font-weight="bold" fill="#1f2937">${title}</text>
      
      <!-- Gauge background -->
      ${createArc(0, criticalAngle, "#fee2e2")}
      ${createArc(criticalAngle, warningAngle, "#fef3c7")}
      ${createArc(warningAngle, 180, "#dcfce7")}
      
      <!-- Gauge foreground -->
      ${createArc(0, Math.min(angle, 180), color)}
      
      <!-- Needle -->
      <line x1="${centerX}" y1="${centerY}" x2="${needleX}" y2="${needleY}" 
            stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${centerX}" cy="${centerY}" r="8" fill="#1f2937"/>
      
      <!-- Value -->
      <text x="${centerX}" y="${centerY + 25}" text-anchor="middle" font-size="16" font-weight="bold" fill="${color}">
        ${value.toFixed(2)}${unit}
      </text>
      
      <!-- Min/Max labels -->
      <text x="${centerX - radius}" y="${centerY + 15}" text-anchor="middle" font-size="9" fill="#6b7280">${min}</text>
      <text x="${centerX + radius}" y="${centerY + 15}" text-anchor="middle" font-size="9" fill="#6b7280">${max}</text>
    </svg>
  `.trim();
}

/**
 * Convert SVG to base64 data URI
 */
export function svgToBase64(svg: string): string {
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Generate all charts for KPI report email
 */
export function generateKPIReportCharts(
  trendData: TrendDataPoint[],
  comparisonData?: {
    labels: string[];
    cpkValues: number[];
    oeeValues: number[];
  }
): {
  trendChart: string;
  cpkGauge?: string;
  oeeGauge?: string;
  comparisonChart?: string;
} {
  const result: {
    trendChart: string;
    cpkGauge?: string;
    oeeGauge?: string;
    comparisonChart?: string;
  } = {
    trendChart: svgToBase64(generateTrendChartSvg(trendData, { title: "Xu hướng CPK/OEE" })),
  };

  // Generate gauge charts for latest values
  if (trendData.length > 0) {
    const latest = trendData[trendData.length - 1];
    if (latest.cpk !== null && latest.cpk !== undefined) {
      result.cpkGauge = svgToBase64(generateGaugeChartSvg(latest.cpk, {
        title: "CPK hiện tại",
        min: 0,
        max: 2,
        warningThreshold: 1.33,
        criticalThreshold: 1.0,
      }));
    }
    if (latest.oee !== null && latest.oee !== undefined) {
      result.oeeGauge = svgToBase64(generateGaugeChartSvg(latest.oee, {
        title: "OEE hiện tại",
        min: 0,
        max: 100,
        warningThreshold: 75,
        criticalThreshold: 60,
        unit: "%",
      }));
    }
  }

  // Generate comparison chart
  if (comparisonData && comparisonData.labels.length > 0) {
    result.comparisonChart = svgToBase64(generateBarChartSvg({
      labels: comparisonData.labels,
      datasets: [
        { label: "CPK", data: comparisonData.cpkValues, color: "#3b82f6" },
        { label: "OEE", data: comparisonData.oeeValues.map(v => v / 50), color: "#10b981" }, // Scale OEE for comparison
      ],
    }, { title: "So sánh KPI theo dây chuyền" }));
  }

  return result;
}
