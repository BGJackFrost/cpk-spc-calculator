import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, ComposedChart, Area,
} from "recharts";
import { BarChart3, Activity, Target, Award, RefreshCw } from "lucide-react";

interface ComparisonChartProps {
  className?: string;
}

export default function ProductionLineComparisonChart({ className }: ComparisonChartProps) {
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [selectedMetric, setSelectedMetric] = useState<string>("all");
  const [chartType, setChartType] = useState<string>("bar");

  const { data: performanceData, isLoading, refetch } = trpc.dashboard.getLinePerformanceComparison.useQuery({
    days: timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 7,
  });

  const { data: trendData } = trpc.dashboard.getLinePerformanceTrend.useQuery({
    days: timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 7,
  });

  const chartData = useMemo(() => {
    if (!performanceData?.lines) return [];
    
    return performanceData.lines.map((line: any) => ({
      name: line.name?.length > 15 ? line.name.substring(0, 15) + "..." : line.name,
      fullName: line.name,
      cpk: Number(line.avgCpk?.toFixed(2) || 0),
      oee: Number(line.avgOee?.toFixed(1) || 0),
      defectRate: Number(line.avgDefectRate?.toFixed(2) || 0),
      output: Number(line.totalOutput || 0),
      efficiency: Number(line.efficiency?.toFixed(1) || 0),
      availability: Number(line.availability?.toFixed(1) || 0),
      quality: Number(line.quality?.toFixed(1) || 0),
      performance: Number(line.performance?.toFixed(1) || 0),
    }));
  }, [performanceData]);

  const radarData = useMemo(() => {
    if (!chartData.length) return [];
    
    const metrics = ["CPK", "OEE", "Quality", "Availability", "Performance"];
    return metrics.map(metric => {
      const dataPoint: any = { metric };
      chartData.forEach((line: any) => {
        switch (metric) {
          case "CPK": dataPoint[line.name] = Math.min(line.cpk * 50, 100); break;
          case "OEE": dataPoint[line.name] = line.oee; break;
          case "Quality": dataPoint[line.name] = line.quality; break;
          case "Availability": dataPoint[line.name] = line.availability; break;
          case "Performance": dataPoint[line.name] = line.performance; break;
        }
      });
      return dataPoint;
    });
  }, [chartData]);

  const rankings = useMemo(() => {
    if (!chartData.length) return { best: null, worst: null };
    
    const sorted = [...chartData].sort((a: any, b: any) => {
      const scoreA = a.oee * 0.5 + a.cpk * 25 + (100 - a.defectRate * 100) * 0.25;
      const scoreB = b.oee * 0.5 + b.cpk * 25 + (100 - b.defectRate * 100) * 0.25;
      return scoreB - scoreA;
    });

    return { best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [chartData]);

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <BarChart3 className="h-5 w-5" />
              So sánh Hiệu suất Dây chuyền
            </CardTitle>
            <CardDescription>Phân tích và so sánh hiệu suất giữa các dây chuyền sản xuất</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">Hiệu suất tốt nhất</span>
              </div>
              {rankings.best && (
                <>
                  <p className="text-lg font-bold text-green-800 dark:text-green-300">{rankings.best.fullName}</p>
                  <div className="flex gap-3 mt-2 text-sm">
                    <span>OEE: {rankings.best.oee}%</span>
                    <span>CPK: {rankings.best.cpk}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Trung bình hệ thống</span>
              </div>
              <p className="text-lg font-bold text-blue-800 dark:text-blue-300">
                OEE: {performanceData?.avgOee?.toFixed(1) || 0}%
              </p>
              <div className="flex gap-3 mt-2 text-sm">
                <span>CPK: {performanceData?.avgCpk?.toFixed(2) || 0}</span>
                <span>Lines: {chartData.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Cần cải thiện</span>
              </div>
              {rankings.worst && (
                <>
                  <p className="text-lg font-bold text-amber-800 dark:text-amber-300">{rankings.worst.fullName}</p>
                  <div className="flex gap-3 mt-2 text-sm">
                    <span>OEE: {rankings.worst.oee}%</span>
                    <span>CPK: {rankings.worst.cpk}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart Tabs */}
        <Tabs value={chartType} onValueChange={setChartType}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bar">Cột</TabsTrigger>
            <TabsTrigger value="radar">Radar</TabsTrigger>
            <TabsTrigger value="composed">Kết hợp</TabsTrigger>
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
          </TabsList>

          <TabsContent value="bar" className="mt-4">
            <div className="mb-4">
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Chọn chỉ số" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả chỉ số</SelectItem>
                  <SelectItem value="oee">OEE</SelectItem>
                  <SelectItem value="cpk">CPK</SelectItem>
                  <SelectItem value="defectRate">Tỉ lệ lỗi</SelectItem>
                  <SelectItem value="output">Sản lượng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
                {(selectedMetric === "all" || selectedMetric === "oee") && (
                  <Bar yAxisId="left" dataKey="oee" name="OEE (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                )}
                {(selectedMetric === "all" || selectedMetric === "cpk") && (
                  <Bar yAxisId="right" dataKey="cpk" name="CPK" fill="#10b981" radius={[4, 4, 0, 0]} />
                )}
                {selectedMetric === "defectRate" && (
                  <Bar yAxisId="left" dataKey="defectRate" name="Tỉ lệ lỗi (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                )}
                {selectedMetric === "output" && (
                  <Bar yAxisId="left" dataKey="output" name="Sản lượng" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="radar" className="mt-4">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                {chartData.slice(0, 5).map((line: any, index: number) => (
                  <Radar key={line.name} name={line.name} dataKey={line.name} stroke={COLORS[index]} fill={COLORS[index]} fillOpacity={0.2} />
                ))}
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            {chartData.length > 5 && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                Hiển thị 5 dây chuyền đầu tiên. Tổng: {chartData.length} dây chuyền
              </p>
            )}
          </TabsContent>

          <TabsContent value="composed" className="mt-4">
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="oee" name="OEE (%)" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
                <Bar yAxisId="right" dataKey="cpk" name="CPK" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="quality" name="Quality (%)" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="trend" className="mt-4">
            {trendData?.trends && trendData.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData.trends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  {Object.keys(trendData.trends[0] || {})
                    .filter(key => key !== 'date')
                    .slice(0, 5)
                    .map((lineName, index) => (
                      <Line key={lineName} type="monotone" dataKey={lineName} name={lineName} stroke={COLORS[index]} strokeWidth={2} dot={{ fill: COLORS[index], r: 3 }} />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                Không có dữ liệu xu hướng
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Detailed Table */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Chi tiết theo dây chuyền</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Dây chuyền</th>
                  <th className="text-right py-2 px-3">OEE</th>
                  <th className="text-right py-2 px-3">CPK</th>
                  <th className="text-right py-2 px-3">Availability</th>
                  <th className="text-right py-2 px-3">Performance</th>
                  <th className="text-right py-2 px-3">Quality</th>
                  <th className="text-right py-2 px-3">Defect Rate</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((line: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3 font-medium">{line.fullName}</td>
                    <td className="text-right py-2 px-3">
                      <Badge variant={line.oee >= 85 ? "default" : line.oee >= 70 ? "secondary" : "destructive"}>
                        {line.oee}%
                      </Badge>
                    </td>
                    <td className="text-right py-2 px-3">
                      <Badge variant={line.cpk >= 1.33 ? "default" : line.cpk >= 1.0 ? "secondary" : "destructive"}>
                        {line.cpk}
                      </Badge>
                    </td>
                    <td className="text-right py-2 px-3">{line.availability}%</td>
                    <td className="text-right py-2 px-3">{line.performance}%</td>
                    <td className="text-right py-2 px-3">{line.quality}%</td>
                    <td className="text-right py-2 px-3">
                      <span className={line.defectRate > 5 ? "text-red-500" : "text-green-500"}>
                        {line.defectRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
