import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface ChartData {
  index: number;
  value: number;
  timestamp?: Date;
}

interface AdvancedChartsProps {
  xBarData: ChartData[];
  rangeData: ChartData[];
  rawData: { value: number; timestamp: Date }[];
  mean: number;
  ucl: number;
  lcl: number;
  uclR: number;
  lclR: number;
  usl?: number | null;
  lsl?: number | null;
}

/**
 * Histogram component for distribution analysis
 */
function Histogram({ data, title, bins = 10 }: { data: number[]; title: string; bins?: number }) {
  if (data.length === 0) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const binWidth = (max - min) / bins || 1;

  // Create bins
  const binCounts = Array(bins).fill(0);
  const binLabels: string[] = [];

  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    binLabels.push(`${binStart.toFixed(2)}`);
  }

  // Count values in each bin
  for (const value of data) {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
    binCounts[binIndex]++;
  }

  const histogramData = binLabels.map((label, index) => ({
    bin: label,
    count: binCounts[index],
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Phân bổ tần suất</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={histogramData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="bin" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * XBar Chart with control limits
 */
function XBarChart({ xBarData, mean, ucl, lcl, usl, lsl }: {
  xBarData: ChartData[];
  mean: number;
  ucl: number;
  lcl: number;
  usl?: number | null;
  lsl?: number | null;
}) {
  const chartData = xBarData.map(d => ({
    ...d,
    timestamp: d.timestamp ? new Date(d.timestamp).toLocaleTimeString("vi-VN") : `${d.index}`,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">XBar Chart (Trung bình nhóm con)</CardTitle>
        <CardDescription>Biểu đồ kiểm soát giá trị trung bình</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine y={mean} stroke="#666" strokeDasharray="5 5" label="Trung bình" />
            <ReferenceLine y={ucl} stroke="#ef4444" strokeDasharray="5 5" label="UCL" />
            <ReferenceLine y={lcl} stroke="#ef4444" strokeDasharray="5 5" label="LCL" />
            {usl && <ReferenceLine y={usl} stroke="#8b5cf6" label="USL" />}
            {lsl && <ReferenceLine y={lsl} stroke="#8b5cf6" label="LSL" />}
            <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={{ r: 4 }} name="XBar" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * R Chart (Range Chart) with control limits
 */
function RChart({ rangeData, uclR, lclR }: {
  rangeData: ChartData[];
  uclR: number;
  lclR: number;
}) {
  const chartData = rangeData.map((d, idx) => ({
    ...d,
    index: idx + 1,
  }));

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">R Chart (Biên độ)</CardTitle>
        <CardDescription>Biểu đồ kiểm soát biên độ nhóm con</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine y={uclR} stroke="#ef4444" strokeDasharray="5 5" label="UCL_R" />
            <ReferenceLine y={lclR} stroke="#ef4444" strokeDasharray="5 5" label="LCL_R" />
            <Line type="monotone" dataKey="value" stroke="#10b981" dot={{ r: 4 }} name="Range" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Sample Data Table
 */
function SampleDataTable({ rawData }: { rawData: { value: number; timestamp: Date }[] }) {
  const displayData = rawData.slice(0, 20); // Show first 20 samples

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Bảng dữ liệu mẫu</CardTitle>
        <CardDescription>Hiển thị {displayData.length} mẫu đầu tiên (tổng {rawData.length} mẫu)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">STT</th>
                <th className="px-4 py-2 text-left font-semibold">Giá trị</th>
                <th className="px-4 py-2 text-left font-semibold">Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((data, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">{idx + 1}</td>
                  <td className="px-4 py-2 font-mono">{data.value.toFixed(4)}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">
                    {new Date(data.timestamp).toLocaleString("vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Advanced Charts Component
 */
export function AdvancedCharts({
  xBarData,
  rangeData,
  rawData,
  mean,
  ucl,
  lcl,
  uclR,
  lclR,
  usl,
  lsl,
}: AdvancedChartsProps) {
  const rawValues = rawData.map(d => d.value);

  return (
    <div className="space-y-6">
      {/* XBar Chart */}
      <XBarChart xBarData={xBarData} mean={mean} ucl={ucl} lcl={lcl} usl={usl} lsl={lsl} />

      {/* R Chart */}
      <RChart rangeData={rangeData} uclR={uclR} lclR={lclR} />

      {/* Histograms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Histogram data={xBarData.map(d => d.value)} title="Phân bổ XBar" bins={10} />
        <Histogram data={rangeData.map(d => d.value)} title="Phân bổ Range" bins={10} />
      </div>

      {/* Sample Data Table */}
      <SampleDataTable rawData={rawData} />
    </div>
  );
}

export default AdvancedCharts;
