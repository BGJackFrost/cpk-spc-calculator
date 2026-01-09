/**
 * AI Vision Trend Chart Component
 * Hiển thị biểu đồ xu hướng pass/fail theo thời gian
 */

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, BarChart3, Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
  Line,
} from "recharts";

interface TrendDataPoint {
  period: string;
  total: number;
  passCount: number;
  failCount: number;
  warningCount: number;
  passRate: number;
  failRate: number;
  avgQualityScore: number;
  avgConfidence: number;
  totalDefects: number;
}

interface TrendSummary {
  totalAnalyses: number;
  avgPassRate: number;
  avgQualityScore: number;
  totalDefects?: number;
}

interface AiVisionTrendChartProps {
  trendData: TrendDataPoint[];
  summary: TrendSummary;
  isLoading?: boolean;
  days: number;
  groupBy: "day" | "week" | "month";
  onDaysChange: (days: number) => void;
  onGroupByChange: (groupBy: "day" | "week" | "month") => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Tổng phân tích:</span>
            <span className="font-medium">{data.total}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-green-500">Đạt:</span>
            <span className="font-medium text-green-500">{data.passCount} ({data.passRate.toFixed(1)}%)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-red-500">Lỗi:</span>
            <span className="font-medium text-red-500">{data.failCount} ({data.failRate.toFixed(1)}%)</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-yellow-500">Cảnh báo:</span>
            <span className="font-medium text-yellow-500">{data.warningCount}</span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t">
            <span className="text-muted-foreground">Điểm chất lượng TB:</span>
            <span className="font-medium">{data.avgQualityScore.toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function AiVisionTrendChart({
  trendData,
  summary,
  isLoading,
  days,
  groupBy,
  onDaysChange,
  onGroupByChange,
}: AiVisionTrendChartProps) {
  // Calculate trend direction
  const trendDirection = useMemo(() => {
    if (trendData.length < 2) return "stable";
    const recentData = trendData.slice(-7);
    if (recentData.length < 2) return "stable";
    
    const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
    const secondHalf = recentData.slice(Math.floor(recentData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.passRate, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.passRate, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    if (diff > 2) return "up";
    if (diff < -2) return "down";
    return "stable";
  }, [trendData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Xu hướng Pass/Fail
            </CardTitle>
            <CardDescription>
              Biểu đồ xu hướng tỷ lệ pass/fail theo thời gian
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => onDaysChange(Number(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as any)}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="week">Theo tuần</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Tổng phân tích</p>
            <p className="text-2xl font-bold">{summary.totalAnalyses.toLocaleString()}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Tỷ lệ Pass TB</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-green-500">{summary.avgPassRate.toFixed(1)}%</p>
              {trendDirection === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
              {trendDirection === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
              {trendDirection === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Điểm chất lượng TB</p>
            <p className="text-2xl font-bold">{summary.avgQualityScore.toFixed(1)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Tổng lỗi phát hiện</p>
            <p className="text-2xl font-bold text-red-500">{(summary.totalDefects || 0).toLocaleString()}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {trendData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
            <p>Chưa có dữ liệu trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pass/Fail Area Chart */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    label={{ value: 'Số lượng', angle: -90, position: 'insideLeft', fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    label={{ value: 'Tỷ lệ (%)', angle: 90, position: 'insideRight', fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="passCount"
                    name="Đạt"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="warningCount"
                    name="Cảnh báo"
                    stackId="1"
                    stroke="#eab308"
                    fill="#eab308"
                    fillOpacity={0.6}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="failCount"
                    name="Lỗi"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="passRate"
                    name="Tỷ lệ Pass (%)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Quality Score Trend */}
            <div className="h-[200px]">
              <h4 className="text-sm font-medium mb-2">Xu hướng điểm chất lượng</h4>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value: number) => [value.toFixed(1), 'Điểm chất lượng']}
                    labelFormatter={(label) => `Ngày: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgQualityScore"
                    name="Điểm chất lượng"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
