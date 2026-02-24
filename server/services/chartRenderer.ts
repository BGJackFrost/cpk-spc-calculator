/**
 * Chart Renderer Service
 * Render Chart.js charts to images using QuickChart API
 * This approach avoids native module issues with canvas
 */

import axios from 'axios';

// QuickChart API endpoint
const QUICKCHART_URL = 'https://quickchart.io/chart';

// Chart dimensions
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;

interface ChartConfig {
  type: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string | string[];
      fill?: boolean;
      tension?: number;
      pointRadius?: number;
      pointBackgroundColor?: string;
      borderDash?: number[];
      yAxisID?: string;
      borderWidth?: number;
    }>;
  };
  options?: Record<string, any>;
}

/**
 * Render chart using QuickChart API
 */
async function renderChartViaApi(
  config: ChartConfig,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT
): Promise<Buffer> {
  try {
    const response = await axios.post(
      QUICKCHART_URL,
      {
        chart: config,
        width,
        height,
        backgroundColor: 'white',
        format: 'png',
      },
      {
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('QuickChart API error:', error);
    throw new Error('Failed to render chart');
  }
}

/**
 * Render a line chart for CPK trend
 */
export async function renderCpkTrendChart(
  data: Array<{ date: string; cpk: number }>,
  options?: {
    width?: number;
    height?: number;
    title?: string;
  }
): Promise<Buffer> {
  const config: ChartConfig = {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [
        {
          label: 'CPK',
          data: data.map(d => d.cpk),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: 'rgb(59, 130, 246)',
        },
        {
          label: 'Ngưỡng tốt (1.33)',
          data: data.map(() => 1.33),
          borderColor: 'rgb(34, 197, 94)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Ngưỡng cảnh báo (1.0)',
          data: data.map(() => 1.0),
          borderColor: 'rgb(234, 179, 8)',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: !!options?.title,
          text: options?.title || 'Xu hướng CPK',
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 0,
          max: Math.max(2, ...data.map(d => d.cpk)) + 0.5,
          title: {
            display: true,
            text: 'CPK',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Ngày',
          },
        },
      },
    },
  };

  return await renderChartViaApi(
    config,
    options?.width || DEFAULT_WIDTH,
    options?.height || DEFAULT_HEIGHT
  );
}

/**
 * Render a bar chart for shift statistics
 */
export async function renderShiftStatsChart(
  data: {
    morning: { count: number; avgCpk: number };
    afternoon: { count: number; avgCpk: number };
    night: { count: number; avgCpk: number };
  },
  options?: {
    width?: number;
    height?: number;
    title?: string;
  }
): Promise<Buffer> {
  // Use grouped bar chart without dual axis for better QuickChart compatibility
  const config: ChartConfig = {
    type: 'bar',
    data: {
      labels: ['Ca Sáng (6h-14h)', 'Ca Chiều (14h-22h)', 'Ca Tối (22h-6h)'],
      datasets: [
        {
          label: 'Số mẫu',
          data: [data.morning.count, data.afternoon.count, data.night.count],
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
        },
        {
          label: 'CPK Trung bình (x100)',
          data: [data.morning.avgCpk * 100, data.afternoon.avgCpk * 100, data.night.avgCpk * 100],
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: !!options?.title,
          text: options?.title || 'Thống kê theo Ca',
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          position: 'bottom',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Giá trị',
          },
        },
      },
    },
  };

  return await renderChartViaApi(
    config,
    options?.width || DEFAULT_WIDTH,
    options?.height || DEFAULT_HEIGHT
  );
}

/**
 * Render a pie/doughnut chart for CPK distribution
 */
export async function renderCpkDistributionChart(
  data: {
    excellent: number; // CPK >= 1.67
    good: number; // 1.33 <= CPK < 1.67
    acceptable: number; // 1.0 <= CPK < 1.33
    needsImprovement: number; // CPK < 1.0
  },
  options?: {
    width?: number;
    height?: number;
    title?: string;
  }
): Promise<Buffer> {
  const config: ChartConfig = {
    type: 'doughnut',
    data: {
      labels: ['Xuất sắc (≥1.67)', 'Tốt (1.33-1.67)', 'Chấp nhận (1.0-1.33)', 'Cần cải tiến (<1.0)'],
      datasets: [
        {
          label: 'Phân bố CPK',
          data: [data.excellent, data.good, data.acceptable, data.needsImprovement],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(234, 179, 8, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: !!options?.title,
          text: options?.title || 'Phân bố CPK',
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          position: 'right',
        },
      },
    },
  };

  return await renderChartViaApi(
    config,
    options?.width || 500,
    options?.height || 400
  );
}
