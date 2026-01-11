import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

// Ngưỡng CPK tiêu chuẩn
const CPK_THRESHOLDS = {
  EXCELLENT: 1.67,
  GOOD: 1.33,
  ACCEPTABLE: 1.0,
};

interface CpkTrendChartProps {
  productionLineId?: number;
  workshopId?: number;
  className?: string;
  showControls?: boolean;
  height?: number;
}

export default function CpkTrendChart({
  productionLineId,
  workshopId,
  className,
  showControls = true,
  height = 350,
}: CpkTrendChartProps) {
  const [dateRange, setDateRange] = useState<"7" | "14" | "30" | "90">("30");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  // Fetch CPK trend data
  const { data: cpkTrend, isLoading, refetch } = trpc.report.getCpkTrend.useQuery({
    days: parseInt(dateRange),
    productionLineId,
    workshopId,
  });

  // Process data for chart
  const chartData = useMemo(() => {
    if (!cpkTrend?.data) return [];

    const data = cpkTrend.data;
    
    // Group by day/week/month
    if (groupBy === "day") {
      return data.map((item: { date: string; avgCpk: number; minCpk: number; maxCpk: number; count: number }) => ({
        date: new Date(item.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
        fullDate: item.date,
        avgCpk: item.avgCpk,
        minCpk: item.minCpk,
        maxCpk: item.maxCpk,
        count: item.count,
      }));
    }

    if (groupBy === "week") {
      const weeklyData: Record<string, { dates: string[]; cpkValues: number[]; minCpk: number; maxCpk: number; count: number }> = {};
      
      data.forEach((item: { date: string; avgCpk: number; minCpk: number; maxCpk: number; count: number }) => {
        const date = new Date(item.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split("T")[0];
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { dates: [], cpkValues: [], minCpk: Infinity, maxCpk: -Infinity, count: 0 };
        }
        weeklyData[weekKey].dates.push(item.date);
        weeklyData[weekKey].cpkValues.push(item.avgCpk);
        weeklyData[weekKey].minCpk = Math.min(weeklyData[weekKey].minCpk, item.minCpk);
        weeklyData[weekKey].maxCpk = Math.max(weeklyData[weekKey].maxCpk, item.maxCpk);
        weeklyData[weekKey].count += item.count;
      });

      return Object.entries(weeklyData).map(([weekKey, values]) => ({
        date: `W${new Date(weekKey).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`,
        fullDate: weekKey,
        avgCpk: values.cpkValues.reduce((a, b) => a + b, 0) / values.cpkValues.length,
        minCpk: values.minCpk,
        maxCpk: values.maxCpk,
        count: values.count,
      })).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    }

    // Group by month
    const monthlyData: Record<string, { cpkValues: number[]; minCpk: number; maxCpk: number; count: number }> = {};
    
    data.forEach((item: { date: string; avgCpk: number; minCpk: number; maxCpk: number; count: number }) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { cpkValues: [], minCpk: Infinity, maxCpk: -Infinity, count: 0 };
      }
      monthlyData[monthKey].cpkValues.push(item.avgCpk);
      monthlyData[monthKey].minCpk = Math.min(monthlyData[monthKey].minCpk, item.minCpk);
      monthlyData[monthKey].maxCpk = Math.max(monthlyData[monthKey].maxCpk, item.maxCpk);
      monthlyData[monthKey].count += item.count;
    });

    return Object.entries(monthlyData).map(([monthKey, values]) => ({
      date: new Date(monthKey + "-01").toLocaleDateString("vi-VN", { month: "short", year: "2-digit" }),
      fullDate: monthKey,
      avgCpk: values.cpkValues.reduce((a, b) => a + b, 0) / values.cpkValues.length,
      minCpk: values.minCpk,
      maxCpk: values.maxCpk,
      count: values.count,
    })).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [cpkTrend, groupBy]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!chartData.length) return null;

    const avgCpkValues = chartData.map((d) => d.avgCpk);
    const currentCpk = avgCpkValues[avgCpkValues.length - 1];
    const previousCpk = avgCpkValues.length > 1 ? avgCpkValues[avgCpkValues.length - 2] : currentCpk;
    const trend = currentCpk - previousCpk;
    const avgCpk = avgCpkValues.reduce((a, b) => a + b, 0) / avgCpkValues.length;
    const minCpk = Math.min(...chartData.map((d) => d.minCpk));
    const maxCpk = Math.max(...chartData.map((d) => d.maxCpk));
    const violationCount = chartData.filter((d) => d.avgCpk < CPK_THRESHOLDS.ACCEPTABLE).length;

    return {
      currentCpk,
      trend,
      avgCpk,
      minCpk,
      maxCpk,
      violationCount,
      totalDays: chartData.length,
    };
  }, [chartData]);

  const getCpkStatus = (cpk: number) => {
    if (cpk >= CPK_THRESHOLDS.EXCELLENT) return { label: "Xuất sắc", color: "text-green-600", bg: "bg-green-100" };
    if (cpk >= CPK_THRESHOLDS.GOOD) return { label: "Tốt", color: "text-blue-600", bg: "bg-blue-100" };
    if (cpk >= CPK_THRESHOLDS.ACCEPTABLE) return { label: "Chấp nhận", color: "text-yellow-600", bg: "bg-yellow-100" };
    return { label: "Cần cải tiến", color: "text-red-600", bg: "bg-red-100" };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const status = getCpkStatus(data.avgCpk);
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm">
              CPK TB: <span className={`font-bold ${status.color}`}>{data.avgCpk.toFixed(3)}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Min: {data.minCpk.toFixed(3)} | Max: {data.maxCpk.toFixed(3)}
            </p>
            <p className="text-sm text-muted-foreground">
              Số mẫu: {data.count}
            </p>
            <Badge className={`${status.bg} ${status.color} text-xs`}>{status.label}</Badge>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Xu hướng CPK theo thời gian
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Xu hướng CPK theo thời gian
            </CardTitle>
            <CardDescription>
              Theo dõi biến động CPK và phát hiện xu hướng
            </CardDescription>
          </div>
          {showControls && (
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 ngày</SelectItem>
                  <SelectItem value="14">14 ngày</SelectItem>
                  <SelectItem value="30">30 ngày</SelectItem>
                  <SelectItem value="90">90 ngày</SelectItem>
                </SelectContent>
              </Select>
              <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Ngày</SelectItem>
                  <SelectItem value="week">Tuần</SelectItem>
                  <SelectItem value="month">Tháng</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {summaryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">CPK Hiện tại</p>
              <p className={`text-2xl font-bold ${getCpkStatus(summaryStats.currentCpk).color}`}>
                {summaryStats.currentCpk.toFixed(3)}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                {summaryStats.trend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs ${summaryStats.trend >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {summaryStats.trend >= 0 ? "+" : ""}{summaryStats.trend.toFixed(3)}
                </span>
              </div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">CPK Trung bình</p>
              <p className={`text-2xl font-bold ${getCpkStatus(summaryStats.avgCpk).color}`}>
                {summaryStats.avgCpk.toFixed(3)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Min / Max</p>
              <p className="text-lg font-medium">
                {summaryStats.minCpk.toFixed(2)} / {summaryStats.maxCpk.toFixed(2)}
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground uppercase">Vi phạm</p>
              <p className={`text-2xl font-bold ${summaryStats.violationCount > 0 ? "text-red-500" : "text-green-500"}`}>
                {summaryStats.violationCount}
                <span className="text-sm font-normal text-muted-foreground">/{summaryStats.totalDays}</span>
              </p>
              {summaryStats.violationCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-red-500 mx-auto mt-1" />
              )}
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 ? (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, "auto"]}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Reference lines for CPK thresholds */}
                <ReferenceLine 
                  y={CPK_THRESHOLDS.EXCELLENT} 
                  stroke="#22c55e" 
                  strokeDasharray="5 5" 
                  label={{ value: "Xuất sắc (1.67)", position: "right", fontSize: 10, fill: "#22c55e" }}
                />
                <ReferenceLine 
                  y={CPK_THRESHOLDS.GOOD} 
                  stroke="#3b82f6" 
                  strokeDasharray="5 5" 
                  label={{ value: "Tốt (1.33)", position: "right", fontSize: 10, fill: "#3b82f6" }}
                />
                <ReferenceLine 
                  y={CPK_THRESHOLDS.ACCEPTABLE} 
                  stroke="#f59e0b" 
                  strokeDasharray="5 5" 
                  label={{ value: "Chấp nhận (1.0)", position: "right", fontSize: 10, fill: "#f59e0b" }}
                />

                <Area
                  type="monotone"
                  dataKey="avgCpk"
                  name="CPK Trung bình"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#cpkGradient)"
                  dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Không có dữ liệu CPK trong khoảng thời gian này
          </div>
        )}
      </CardContent>
    </Card>
  );
}
