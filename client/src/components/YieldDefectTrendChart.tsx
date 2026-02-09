/**
 * YieldDefectTrendChart - Biểu đồ xu hướng Yield/Defect dài hạn
 * Hỗ trợ time range: 7d, 14d, 30d, 90d
 * Hỗ trợ aggregation: daily, weekly, monthly
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Calendar, BarChart3, Loader2 } from "lucide-react";
import TrendExportButton from "./TrendExportButton";
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";

export interface TrendDataPoint {
  timestamp: number;
  date: string;
  yieldRate: number;
  defectRate: number;
  totalInspected: number;
  totalPassed: number;
  totalDefects: number;
}

interface AggregatedDataPoint {
  period: string;
  avgYieldRate: number;
  avgDefectRate: number;
  minYieldRate: number;
  maxYieldRate: number;
  minDefectRate: number;
  maxDefectRate: number;
  totalInspected: number;
  dataPoints: number;
}

interface YieldDefectTrendChartProps {
  data: TrendDataPoint[];
  yieldWarningThreshold?: number;
  yieldCriticalThreshold?: number;
  defectWarningThreshold?: number;
  defectCriticalThreshold?: number;
  title?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

type TimeRange = "7d" | "14d" | "30d" | "90d";
type Aggregation = "daily" | "weekly" | "monthly";

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; days: number }[] = [
  { value: "7d", label: "7 ngày", days: 7 },
  { value: "14d", label: "14 ngày", days: 14 },
  { value: "30d", label: "30 ngày", days: 30 },
  { value: "90d", label: "90 ngày", days: 90 },
];

const AGGREGATION_OPTIONS: { value: Aggregation; label: string }[] = [
  { value: "daily", label: "Theo ngày" },
  { value: "weekly", label: "Theo tuần" },
  { value: "monthly", label: "Theo tháng" },
];

export function YieldDefectTrendChart({
  data,
  yieldWarningThreshold = 95,
  yieldCriticalThreshold = 90,
  defectWarningThreshold = 3,
  defectCriticalThreshold = 5,
  title = "Xu hướng Yield/Defect Rate",
  onRefresh,
  isLoading = false,
}: YieldDefectTrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [aggregation, setAggregation] = useState<Aggregation>("daily");

  const filteredData = useMemo(() => {
    const days = TIME_RANGE_OPTIONS.find((o) => o.value === timeRange)?.days || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return data.filter((d) => d.timestamp >= cutoff);
  }, [data, timeRange]);

  const aggregatedData = useMemo(() => {
    if (filteredData.length === 0) return [];
    const groups = new Map<string, TrendDataPoint[]>();
    filteredData.forEach((point) => {
      const date = new Date(point.timestamp);
      let key: string;
      switch (aggregation) {
        case "weekly": {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split("T")[0];
          break;
        }
        case "monthly":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        default:
          key = point.date;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(point);
    });
    const result: AggregatedDataPoint[] = [];
    groups.forEach((points, period) => {
      const yieldRates = points.map((p) => p.yieldRate).filter((r) => !isNaN(r));
      const defectRates = points.map((p) => p.defectRate).filter((r) => !isNaN(r));
      if (yieldRates.length === 0) return;
      result.push({
        period,
        avgYieldRate: yieldRates.reduce((a, b) => a + b, 0) / yieldRates.length,
        avgDefectRate: defectRates.reduce((a, b) => a + b, 0) / defectRates.length,
        minYieldRate: Math.min(...yieldRates),
        maxYieldRate: Math.max(...yieldRates),
        minDefectRate: Math.min(...defectRates),
        maxDefectRate: Math.max(...defectRates),
        totalInspected: points.reduce((a, b) => a + b.totalInspected, 0),
        dataPoints: points.length,
      });
    });
    return result.sort((a, b) => a.period.localeCompare(b.period));
  }, [filteredData, aggregation]);

  const stats = useMemo(() => {
    if (aggregatedData.length === 0) {
      return { avgYield: 0, avgDefect: 0, minYield: 0, maxYield: 0, minDefect: 0, maxDefect: 0, yieldTrend: "stable" as const, defectTrend: "stable" as const, totalInspected: 0 };
    }
    const yieldRates = aggregatedData.map((d) => d.avgYieldRate);
    const defectRates = aggregatedData.map((d) => d.avgDefectRate);
    const getYieldTrend = () => {
      if (yieldRates.length < 6) return "stable" as const;
      const recent = yieldRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const previous = yieldRates.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      if (recent - previous > 1) return "up" as const;
      if (recent - previous < -1) return "down" as const;
      return "stable" as const;
    };
    const getDefectTrend = () => {
      if (defectRates.length < 6) return "stable" as const;
      const recent = defectRates.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const previous = defectRates.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
      if (recent - previous > 0.5) return "up" as const;
      if (recent - previous < -0.5) return "down" as const;
      return "stable" as const;
    };
    return {
      avgYield: yieldRates.reduce((a, b) => a + b, 0) / yieldRates.length,
      avgDefect: defectRates.reduce((a, b) => a + b, 0) / defectRates.length,
      minYield: Math.min(...yieldRates),
      maxYield: Math.max(...yieldRates),
      minDefect: Math.min(...defectRates),
      maxDefect: Math.max(...defectRates),
      yieldTrend: getYieldTrend(),
      defectTrend: getDefectTrend(),
      totalInspected: aggregatedData.reduce((a, b) => a + b.totalInspected, 0),
    };
  }, [aggregatedData]);

  const TrendIcon = ({ trend, isYield }: { trend: "up" | "down" | "stable"; isYield: boolean }) => {
    if (trend === "up") return <TrendingUp className={`h-4 w-4 ${isYield ? "text-green-500" : "text-red-500"}`} />;
    if (trend === "down") return <TrendingDown className={`h-4 w-4 ${isYield ? "text-red-500" : "text-green-500"}`} />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const formatPeriod = (period: string) => {
    if (aggregation === "monthly") { const [year, month] = period.split("-"); return `T${month}/${year}`; }
    if (aggregation === "weekly") { const date = new Date(period); return `W${Math.ceil(date.getDate() / 7)}/${date.getMonth() + 1}`; }
    return period.slice(5);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />{title}</CardTitle>
            <CardDescription>Phân tích xu hướng Yield Rate và Defect Rate theo thời gian</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[120px]"><Calendar className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>{TIME_RANGE_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={aggregation} onValueChange={(v) => setAggregation(v as Aggregation)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>{AGGREGATION_OPTIONS.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
            <TrendExportButton data={data} timeRange={timeRange} aggregation={aggregation} />
            {onRefresh && (<Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}><RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /></Button>)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Yield TB</span><TrendIcon trend={stats.yieldTrend} isYield={true} /></div>
            <p className="text-xl font-bold text-green-600">{stats.avgYield.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Min: {stats.minYield.toFixed(1)}% | Max: {stats.maxYield.toFixed(1)}%</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Defect TB</span><TrendIcon trend={stats.defectTrend} isYield={false} /></div>
            <p className="text-xl font-bold text-red-600">{stats.avgDefect.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground">Min: {stats.minDefect.toFixed(1)}% | Max: {stats.maxDefect.toFixed(1)}%</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <span className="text-sm text-muted-foreground">Tổng kiểm tra</span>
            <p className="text-xl font-bold text-blue-600">{stats.totalInspected.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{aggregatedData.length} điểm dữ liệu</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <span className="text-sm text-muted-foreground">Xu hướng</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={stats.yieldTrend === "up" ? "default" : stats.yieldTrend === "down" ? "destructive" : "secondary"}>Yield {stats.yieldTrend === "up" ? "↑" : stats.yieldTrend === "down" ? "↓" : "→"}</Badge>
              <Badge variant={stats.defectTrend === "down" ? "default" : stats.defectTrend === "up" ? "destructive" : "secondary"}>Defect {stats.defectTrend === "up" ? "↑" : stats.defectTrend === "down" ? "↓" : "→"}</Badge>
            </div>
          </div>
        </div>
        {isLoading ? (<div className="flex items-center justify-center h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>) : aggregatedData.length === 0 ? (<div className="flex items-center justify-center h-[300px] text-muted-foreground">Không có dữ liệu trong khoảng thời gian đã chọn</div>) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={aggregatedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="period" tickFormatter={formatPeriod} tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis yAxisId="yield" domain={[80, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} className="text-muted-foreground" />
              <YAxis yAxisId="defect" orientation="right" domain={[0, 10]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} className="text-muted-foreground" />
              <Tooltip content={({ active, payload, label }) => { if (!active || !payload?.length) return null; const d = payload[0].payload as AggregatedDataPoint; return (<div className="bg-background border rounded-lg shadow-lg p-3"><p className="font-medium mb-2">{label}</p><div className="space-y-1 text-sm"><p className="text-green-600">Yield: {d.avgYieldRate.toFixed(2)}%</p><p className="text-red-600">Defect: {d.avgDefectRate.toFixed(2)}%</p><p className="text-muted-foreground">Tổng: {d.totalInspected.toLocaleString()}</p></div></div>); }} />
              <Legend />
              <ReferenceLine yAxisId="yield" y={yieldWarningThreshold} stroke="#f59e0b" strokeDasharray="5 5" />
              <ReferenceLine yAxisId="yield" y={yieldCriticalThreshold} stroke="#ef4444" strokeDasharray="5 5" />
              <ReferenceLine yAxisId="defect" y={defectWarningThreshold} stroke="#f59e0b" strokeDasharray="5 5" />
              <ReferenceLine yAxisId="defect" y={defectCriticalThreshold} stroke="#ef4444" strokeDasharray="5 5" />
              <Area yAxisId="yield" type="monotone" dataKey="maxYieldRate" stroke="none" fill="#22c55e" fillOpacity={0.1} name="Yield Range" />
              <Line yAxisId="yield" type="monotone" dataKey="avgYieldRate" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Yield Rate" />
              <Line yAxisId="defect" type="monotone" dataKey="avgDefectRate" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} name="Defect Rate" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default YieldDefectTrendChart;
