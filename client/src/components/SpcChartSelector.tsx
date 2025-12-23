/**
 * SPC Chart Selector Component
 * Cho phép người dùng lựa chọn các loại biểu đồ phân tích thống kê để hiển thị
 */

import { useState, useMemo } from "react";
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
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon, 
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Settings,
  ChevronDown,
  Eye,
  EyeOff,
  Gauge,
  Target,
  Layers,
  AreaChart as AreaChartIcon
} from "lucide-react";

interface ChartData {
  index: number;
  value: number;
  timestamp?: Date;
}

interface SpcChartSelectorProps {
  xBarData: ChartData[];
  rangeData: ChartData[];
  rawData: { value: number; timestamp: Date }[];
  mean: number;
  stdDev: number;
  ucl: number;
  lcl: number;
  uclR: number;
  lclR: number;
  usl?: number | null;
  lsl?: number | null;
  cp?: number | null;
  cpk?: number | null;
  cpu?: number | null;
  cpl?: number | null;
}

interface ChartConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "control" | "distribution" | "capability" | "trend" | "comparison";
  enabled: boolean;
}

const DEFAULT_CHART_CONFIG: ChartConfig[] = [
  // Control Charts
  { id: "xbar", name: "X-Bar Chart", description: "Biểu đồ kiểm soát giá trị trung bình", icon: <LineChartIcon className="h-4 w-4" />, category: "control", enabled: true },
  { id: "range", name: "R Chart", description: "Biểu đồ kiểm soát biên độ", icon: <Activity className="h-4 w-4" />, category: "control", enabled: true },
  { id: "cusum", name: "CUSUM Chart", description: "Biểu đồ tổng tích lũy", icon: <TrendingUp className="h-4 w-4" />, category: "control", enabled: false },
  { id: "ewma", name: "EWMA Chart", description: "Biểu đồ trung bình động có trọng số", icon: <TrendingDown className="h-4 w-4" />, category: "control", enabled: false },
  
  // Distribution Charts
  { id: "histogram", name: "Histogram", description: "Biểu đồ phân bổ tần suất", icon: <BarChart3 className="h-4 w-4" />, category: "distribution", enabled: true },
  { id: "normalProb", name: "Normal Probability", description: "Biểu đồ xác suất chuẩn", icon: <Layers className="h-4 w-4" />, category: "distribution", enabled: false },
  { id: "boxplot", name: "Box Plot", description: "Biểu đồ hộp (phân vị)", icon: <Target className="h-4 w-4" />, category: "distribution", enabled: false },
  
  // Capability Charts
  { id: "capabilityGauge", name: "Capability Gauge", description: "Đồng hồ đo năng lực quy trình", icon: <Gauge className="h-4 w-4" />, category: "capability", enabled: true },
  { id: "capabilityPie", name: "Capability Breakdown", description: "Phân tích thành phần năng lực", icon: <PieChartIcon className="h-4 w-4" />, category: "capability", enabled: false },
  
  // Trend Charts
  { id: "runChart", name: "Run Chart", description: "Biểu đồ chạy theo thời gian", icon: <AreaChartIcon className="h-4 w-4" />, category: "trend", enabled: false },
  { id: "movingAvg", name: "Moving Average", description: "Biểu đồ trung bình động", icon: <TrendingUp className="h-4 w-4" />, category: "trend", enabled: false },
  
  // Comparison Charts
  { id: "specComparison", name: "Spec Comparison", description: "So sánh với giới hạn kỹ thuật", icon: <Target className="h-4 w-4" />, category: "comparison", enabled: true },
  { id: "sigmaZones", name: "Sigma Zones", description: "Phân bố theo vùng sigma", icon: <Layers className="h-4 w-4" />, category: "comparison", enabled: false },
];

const CATEGORY_LABELS: Record<string, string> = {
  control: "Biểu đồ kiểm soát",
  distribution: "Biểu đồ phân bố",
  capability: "Năng lực quy trình",
  trend: "Xu hướng",
  comparison: "So sánh",
};

/**
 * CUSUM Chart Component
 */
function CusumChart({ xBarData, mean }: { xBarData: ChartData[]; mean: number }) {
  const cusumData = useMemo(() => {
    let cusumPlus = 0;
    let cusumMinus = 0;
    const k = 0.5; // Slack value
    const h = 5; // Decision interval
    
    return xBarData.map((d, idx) => {
      const deviation = d.value - mean;
      cusumPlus = Math.max(0, cusumPlus + deviation - k);
      cusumMinus = Math.min(0, cusumMinus + deviation + k);
      
      return {
        index: idx + 1,
        value: d.value,
        cusumPlus,
        cusumMinus,
        upperLimit: h,
        lowerLimit: -h,
      };
    });
  }, [xBarData, mean]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">CUSUM Chart</CardTitle>
        <CardDescription>Biểu đồ tổng tích lũy - phát hiện dịch chuyển nhỏ</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cusumData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine y={5} stroke="#ef4444" strokeDasharray="5 5" label="H+" />
            <ReferenceLine y={-5} stroke="#ef4444" strokeDasharray="5 5" label="H-" />
            <ReferenceLine y={0} stroke="#666" />
            <Line type="monotone" dataKey="cusumPlus" stroke="#3b82f6" name="CUSUM+" dot={false} />
            <Line type="monotone" dataKey="cusumMinus" stroke="#10b981" name="CUSUM-" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * EWMA Chart Component
 */
function EwmaChart({ xBarData, mean }: { xBarData: ChartData[]; mean: number }) {
  const lambda = 0.2; // Smoothing factor
  
  const ewmaData = useMemo(() => {
    let ewma = mean;
    const sigma = Math.sqrt(xBarData.reduce((sum, d) => sum + Math.pow(d.value - mean, 2), 0) / xBarData.length);
    
    return xBarData.map((d, idx) => {
      ewma = lambda * d.value + (1 - lambda) * ewma;
      const L = 3;
      const factor = Math.sqrt(lambda / (2 - lambda) * (1 - Math.pow(1 - lambda, 2 * (idx + 1))));
      const uclEwma = mean + L * sigma * factor;
      const lclEwma = mean - L * sigma * factor;
      
      return {
        index: idx + 1,
        value: d.value,
        ewma,
        ucl: uclEwma,
        lcl: lclEwma,
        mean,
      };
    });
  }, [xBarData, mean]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">EWMA Chart</CardTitle>
        <CardDescription>Biểu đồ trung bình động có trọng số mũ (λ = 0.2)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={ewmaData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="ucl" stroke="none" fill="#fee2e2" name="UCL" />
            <Area type="monotone" dataKey="lcl" stroke="none" fill="#fee2e2" name="LCL" />
            <ReferenceLine y={mean} stroke="#666" strokeDasharray="5 5" label="Mean" />
            <Line type="monotone" dataKey="ewma" stroke="#3b82f6" strokeWidth={2} name="EWMA" dot={false} />
            <Scatter dataKey="value" fill="#94a3b8" name="Raw" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Normal Probability Plot
 */
function NormalProbabilityPlot({ rawData }: { rawData: { value: number }[] }) {
  const sortedData = useMemo(() => {
    const values = rawData.map(d => d.value).sort((a, b) => a - b);
    const n = values.length;
    
    return values.map((value, i) => {
      const p = (i + 0.5) / n;
      // Approximate inverse normal CDF
      const z = p < 0.5 
        ? -Math.sqrt(-2 * Math.log(p)) 
        : Math.sqrt(-2 * Math.log(1 - p));
      
      return {
        value,
        expectedZ: z,
        percentile: (p * 100).toFixed(1),
      };
    });
  }, [rawData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Normal Probability Plot</CardTitle>
        <CardDescription>Kiểm tra tính chuẩn của dữ liệu</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="expectedZ" name="Expected Z" type="number" domain={['auto', 'auto']} />
            <YAxis dataKey="value" name="Observed Value" type="number" domain={['auto', 'auto']} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={sortedData} fill="#3b82f6" />
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-sm text-muted-foreground mt-2">
          Nếu dữ liệu tuân theo phân phối chuẩn, các điểm sẽ nằm gần đường thẳng
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Box Plot Component
 */
function BoxPlotChart({ rawData, usl, lsl }: { rawData: { value: number }[]; usl?: number | null; lsl?: number | null }) {
  const stats = useMemo(() => {
    const values = rawData.map(d => d.value).sort((a, b) => a - b);
    const n = values.length;
    
    const q1 = values[Math.floor(n * 0.25)];
    const median = values[Math.floor(n * 0.5)];
    const q3 = values[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const min = Math.max(values[0], q1 - 1.5 * iqr);
    const max = Math.min(values[n - 1], q3 + 1.5 * iqr);
    
    const outliers = values.filter(v => v < min || v > max);
    
    return { min, q1, median, q3, max, iqr, outliers, mean: values.reduce((a, b) => a + b, 0) / n };
  }, [rawData]);

  const chartData = [
    { name: "Data", min: stats.min, q1: stats.q1, median: stats.median, q3: stats.q3, max: stats.max },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Box Plot</CardTitle>
        <CardDescription>Phân bố dữ liệu theo phân vị</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-[300px]">
          <div className="relative w-full max-w-md">
            {/* Box plot visualization */}
            <div className="relative h-40 border-l-2 border-b-2 border-gray-300">
              {/* Scale markers */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground px-2">
                <span>{stats.min.toFixed(2)}</span>
                <span>{stats.median.toFixed(2)}</span>
                <span>{stats.max.toFixed(2)}</span>
              </div>
              
              {/* Box */}
              <div 
                className="absolute h-20 top-10 bg-blue-100 border-2 border-blue-500"
                style={{
                  left: `${((stats.q1 - stats.min) / (stats.max - stats.min)) * 100}%`,
                  width: `${((stats.q3 - stats.q1) / (stats.max - stats.min)) * 100}%`,
                }}
              >
                {/* Median line */}
                <div 
                  className="absolute h-full w-0.5 bg-red-500"
                  style={{
                    left: `${((stats.median - stats.q1) / (stats.q3 - stats.q1)) * 100}%`,
                  }}
                />
              </div>
              
              {/* Whiskers */}
              <div 
                className="absolute h-0.5 bg-gray-500 top-20"
                style={{
                  left: '0%',
                  width: `${((stats.q1 - stats.min) / (stats.max - stats.min)) * 100}%`,
                }}
              />
              <div 
                className="absolute h-0.5 bg-gray-500 top-20"
                style={{
                  left: `${((stats.q3 - stats.min) / (stats.max - stats.min)) * 100}%`,
                  width: `${((stats.max - stats.q3) / (stats.max - stats.min)) * 100}%`,
                }}
              />
              
              {/* USL/LSL lines */}
              {usl && (
                <div 
                  className="absolute h-full w-0.5 bg-red-600"
                  style={{ left: `${Math.min(100, ((usl - stats.min) / (stats.max - stats.min)) * 100)}%` }}
                  title={`USL: ${usl}`}
                />
              )}
              {lsl && (
                <div 
                  className="absolute h-full w-0.5 bg-red-600"
                  style={{ left: `${Math.max(0, ((lsl - stats.min) / (stats.max - stats.min)) * 100)}%` }}
                  title={`LSL: ${lsl}`}
                />
              )}
            </div>
            
            {/* Stats summary */}
            <div className="mt-4 grid grid-cols-5 gap-2 text-center text-sm">
              <div>
                <div className="font-semibold">Min</div>
                <div className="text-muted-foreground">{stats.min.toFixed(3)}</div>
              </div>
              <div>
                <div className="font-semibold">Q1</div>
                <div className="text-muted-foreground">{stats.q1.toFixed(3)}</div>
              </div>
              <div>
                <div className="font-semibold text-red-600">Median</div>
                <div className="text-muted-foreground">{stats.median.toFixed(3)}</div>
              </div>
              <div>
                <div className="font-semibold">Q3</div>
                <div className="text-muted-foreground">{stats.q3.toFixed(3)}</div>
              </div>
              <div>
                <div className="font-semibold">Max</div>
                <div className="text-muted-foreground">{stats.max.toFixed(3)}</div>
              </div>
            </div>
            
            {stats.outliers.length > 0 && (
              <div className="mt-2 text-sm text-orange-600">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                {stats.outliers.length} outlier(s) detected
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Capability Gauge Component
 */
function CapabilityGauge({ cp, cpk, cpu, cpl }: { cp?: number | null; cpk?: number | null; cpu?: number | null; cpl?: number | null }) {
  const getColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "#94a3b8";
    if (value >= 1.33) return "#10b981";
    if (value >= 1.0) return "#f59e0b";
    return "#ef4444";
  };

  const getStatus = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "N/A";
    if (value >= 1.33) return "Tốt";
    if (value >= 1.0) return "Chấp nhận";
    return "Không đạt";
  };

  const gauges = [
    { label: "Cp", value: cp, description: "Năng lực tiềm năng" },
    { label: "Cpk", value: cpk, description: "Năng lực thực tế" },
    { label: "Cpu", value: cpu, description: "Năng lực trên" },
    { label: "Cpl", value: cpl, description: "Năng lực dưới" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Process Capability Gauges</CardTitle>
        <CardDescription>Đánh giá năng lực quy trình</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gauges.map((gauge) => (
            <div key={gauge.label} className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-sm text-muted-foreground mb-1">{gauge.description}</div>
              <div className="text-3xl font-bold" style={{ color: getColor(gauge.value) }}>
                {gauge.value?.toFixed(3) || "N/A"}
              </div>
              <div className="text-lg font-semibold">{gauge.label}</div>
              <Badge 
                variant="outline" 
                className="mt-2"
                style={{ 
                  borderColor: getColor(gauge.value),
                  color: getColor(gauge.value),
                }}
              >
                {getStatus(gauge.value)}
              </Badge>
            </div>
          ))}
        </div>
        
        {/* Reference scale */}
        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>≥ 1.33 (Tốt)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>1.0 - 1.33 (Chấp nhận)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>&lt; 1.0 (Không đạt)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Capability Breakdown Pie Chart
 */
function CapabilityPieChart({ rawData, usl, lsl }: { rawData: { value: number }[]; usl?: number | null; lsl?: number | null }) {
  const breakdown = useMemo(() => {
    let withinSpec = 0;
    let aboveUsl = 0;
    let belowLsl = 0;

    rawData.forEach(d => {
      if (usl !== null && usl !== undefined && d.value > usl) {
        aboveUsl++;
      } else if (lsl !== null && lsl !== undefined && d.value < lsl) {
        belowLsl++;
      } else {
        withinSpec++;
      }
    });

    return [
      { name: "Trong spec", value: withinSpec, color: "#10b981" },
      { name: "Trên USL", value: aboveUsl, color: "#ef4444" },
      { name: "Dưới LSL", value: belowLsl, color: "#f59e0b" },
    ].filter(d => d.value > 0);
  }, [rawData, usl, lsl]);

  const total = rawData.length;
  const withinSpecPct = ((breakdown.find(d => d.name === "Trong spec")?.value || 0) / total * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Specification Breakdown</CardTitle>
        <CardDescription>Phân bố dữ liệu theo giới hạn kỹ thuật</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={breakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              >
                {breakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <span className="text-2xl font-bold text-green-600">{withinSpecPct}%</span>
          <span className="text-muted-foreground ml-2">trong giới hạn kỹ thuật</span>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Run Chart Component
 */
function RunChart({ rawData, mean }: { rawData: { value: number; timestamp: Date }[]; mean: number }) {
  const chartData = rawData.map((d, idx) => ({
    index: idx + 1,
    value: d.value,
    timestamp: new Date(d.timestamp).toLocaleTimeString("vi-VN"),
    mean,
  }));

  // Count runs
  const runs = useMemo(() => {
    let runCount = 1;
    let aboveMean = chartData[0]?.value > mean;
    
    chartData.forEach((d, idx) => {
      if (idx === 0) return;
      const currentAbove = d.value > mean;
      if (currentAbove !== aboveMean) {
        runCount++;
        aboveMean = currentAbove;
      }
    });
    
    return runCount;
  }, [chartData, mean]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Run Chart</CardTitle>
        <CardDescription>
          Biểu đồ chạy theo thời gian - {runs} runs detected
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <ReferenceLine y={mean} stroke="#666" strokeDasharray="5 5" label="Mean" />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              fill="#93c5fd" 
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Moving Average Chart
 */
function MovingAverageChart({ rawData, mean }: { rawData: { value: number; timestamp: Date }[]; mean: number }) {
  const windowSize = 5;
  
  const chartData = useMemo(() => {
    return rawData.map((d, idx) => {
      const start = Math.max(0, idx - windowSize + 1);
      const window = rawData.slice(start, idx + 1);
      const ma = window.reduce((sum, w) => sum + w.value, 0) / window.length;
      
      return {
        index: idx + 1,
        value: d.value,
        ma,
        mean,
      };
    });
  }, [rawData, mean]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Moving Average Chart</CardTitle>
        <CardDescription>Trung bình động {windowSize} điểm</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="index" />
            <YAxis />
            <Tooltip />
            <Legend />
            <ReferenceLine y={mean} stroke="#666" strokeDasharray="5 5" label="Mean" />
            <Scatter dataKey="value" fill="#94a3b8" name="Raw Data" />
            <Line type="monotone" dataKey="ma" stroke="#3b82f6" strokeWidth={2} name="Moving Avg" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Spec Comparison Chart
 */
function SpecComparisonChart({ rawData, mean, stdDev, usl, lsl }: { 
  rawData: { value: number }[]; 
  mean: number; 
  stdDev: number;
  usl?: number | null; 
  lsl?: number | null;
}) {
  const stats = useMemo(() => {
    const values = rawData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return {
      min,
      max,
      mean,
      sigma3Lower: mean - 3 * stdDev,
      sigma3Upper: mean + 3 * stdDev,
      usl: usl || mean + 4 * stdDev,
      lsl: lsl || mean - 4 * stdDev,
    };
  }, [rawData, mean, stdDev, usl, lsl]);

  const chartData = [
    { name: "LSL", value: stats.lsl, fill: "#ef4444" },
    { name: "-3σ", value: stats.sigma3Lower, fill: "#f59e0b" },
    { name: "Min", value: stats.min, fill: "#94a3b8" },
    { name: "Mean", value: stats.mean, fill: "#3b82f6" },
    { name: "Max", value: stats.max, fill: "#94a3b8" },
    { name: "+3σ", value: stats.sigma3Upper, fill: "#f59e0b" },
    { name: "USL", value: stats.usl, fill: "#ef4444" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Specification Comparison</CardTitle>
        <CardDescription>So sánh dữ liệu với giới hạn kỹ thuật và thống kê</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={['auto', 'auto']} />
            <YAxis type="category" dataKey="name" width={60} />
            <Tooltip />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Sigma Zones Chart
 */
function SigmaZonesChart({ xBarData, mean, ucl, lcl }: { 
  xBarData: ChartData[]; 
  mean: number; 
  ucl: number; 
  lcl: number;
}) {
  const sigma = (ucl - mean) / 3;
  
  const zones = useMemo(() => {
    const counts = { zone1: 0, zone2: 0, zone3: 0, outside: 0 };
    
    xBarData.forEach(d => {
      const deviation = Math.abs(d.value - mean);
      if (deviation <= sigma) counts.zone1++;
      else if (deviation <= 2 * sigma) counts.zone2++;
      else if (deviation <= 3 * sigma) counts.zone3++;
      else counts.outside++;
    });
    
    const total = xBarData.length;
    return [
      { name: "Zone A (0-1σ)", count: counts.zone1, expected: 68.27, actual: (counts.zone1 / total * 100), color: "#10b981" },
      { name: "Zone B (1-2σ)", count: counts.zone2, expected: 27.18, actual: (counts.zone2 / total * 100), color: "#3b82f6" },
      { name: "Zone C (2-3σ)", count: counts.zone3, expected: 4.28, actual: (counts.zone3 / total * 100), color: "#f59e0b" },
      { name: "Outside (>3σ)", count: counts.outside, expected: 0.27, actual: (counts.outside / total * 100), color: "#ef4444" },
    ];
  }, [xBarData, mean, sigma]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sigma Zones Distribution</CardTitle>
        <CardDescription>Phân bố dữ liệu theo vùng sigma</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={zones}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="actual" name="Thực tế (%)" fill="#3b82f6" />
            <Bar dataKey="expected" name="Kỳ vọng (%)" fill="#94a3b8" />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>Theo phân phối chuẩn: 68.27% trong 1σ, 95.45% trong 2σ, 99.73% trong 3σ</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main SpcChartSelector Component
 */
export default function SpcChartSelector(props: SpcChartSelectorProps) {
  const [chartConfig, setChartConfig] = useState<ChartConfig[]>(DEFAULT_CHART_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const toggleChart = (chartId: string) => {
    setChartConfig(prev => 
      prev.map(c => c.id === chartId ? { ...c, enabled: !c.enabled } : c)
    );
  };

  const enabledCharts = chartConfig.filter(c => c.enabled);
  const groupedConfig = chartConfig.reduce((acc, chart) => {
    if (!acc[chart.category]) acc[chart.category] = [];
    acc[chart.category].push(chart);
    return acc;
  }, {} as Record<string, ChartConfig[]>);

  const renderChart = (chartId: string) => {
    switch (chartId) {
      case "xbar":
        return null; // Already rendered in AdvancedCharts
      case "range":
        return null; // Already rendered in AdvancedCharts
      case "cusum":
        return <CusumChart xBarData={props.xBarData} mean={props.mean} />;
      case "ewma":
        return <EwmaChart xBarData={props.xBarData} mean={props.mean} />;
      case "histogram":
        return null; // Already rendered in AdvancedCharts
      case "normalProb":
        return <NormalProbabilityPlot rawData={props.rawData} />;
      case "boxplot":
        return <BoxPlotChart rawData={props.rawData} usl={props.usl} lsl={props.lsl} />;
      case "capabilityGauge":
        return <CapabilityGauge cp={props.cp} cpk={props.cpk} cpu={props.cpu} cpl={props.cpl} />;
      case "capabilityPie":
        return <CapabilityPieChart rawData={props.rawData} usl={props.usl} lsl={props.lsl} />;
      case "runChart":
        return <RunChart rawData={props.rawData} mean={props.mean} />;
      case "movingAvg":
        return <MovingAverageChart rawData={props.rawData} mean={props.mean} />;
      case "specComparison":
        return <SpecComparisonChart rawData={props.rawData} mean={props.mean} stdDev={props.stdDev} usl={props.usl} lsl={props.lsl} />;
      case "sigmaZones":
        return <SigmaZonesChart xBarData={props.xBarData} mean={props.mean} ucl={props.ucl} lcl={props.lcl} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Chart Configuration Panel */}
      <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Tùy chọn biểu đồ phân tích
                </CardTitle>
                <CardDescription>
                  Đang hiển thị {enabledCharts.length} / {chartConfig.length} biểu đồ
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <ChevronDown className={`h-4 w-4 transition-transform ${isConfigOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-6">
                {Object.entries(groupedConfig).map(([category, charts]) => (
                  <div key={category}>
                    <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                      {CATEGORY_LABELS[category]}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {charts.map((chart) => (
                        <div 
                          key={chart.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            chart.enabled ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-md ${chart.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {chart.icon}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{chart.name}</div>
                              <div className="text-xs text-muted-foreground">{chart.description}</div>
                            </div>
                          </div>
                          <Switch
                            checked={chart.enabled}
                            onCheckedChange={() => toggleChart(chart.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Rendered Charts */}
      <div className="space-y-6">
        {enabledCharts.map((chart) => {
          const chartComponent = renderChart(chart.id);
          if (!chartComponent) return null;
          return (
            <div key={chart.id}>
              {chartComponent}
            </div>
          );
        })}
      </div>

      {enabledCharts.filter(c => renderChart(c.id) !== null).length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Chưa có biểu đồ bổ sung nào được chọn.</p>
            <p className="text-sm">Mở panel cấu hình để chọn các biểu đồ phân tích thống kê.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
