/**
 * OEE Analysis Dashboard
 * Task: OEE-02
 * Trang phân tích OEE với xu hướng và so sánh giữa các máy/dây chuyền
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Area
} from "recharts";
import { TrendingUp, TrendingDown, Minus, RefreshCw, Factory, Cpu, Calendar, Target } from "lucide-react";

export default function OEEAnalysisDashboard() {
  const [timeRange, setTimeRange] = useState("30");
  const [compareBy, setCompareBy] = useState<"machine" | "line">("machine");
  const [selectedLine, setSelectedLine] = useState<string>("all");

  // Fetch data
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();
  const { data: oeeComparison, isLoading, refetch } = trpc.oee.getComparison.useQuery({
    days: parseInt(timeRange),
  });

  // Get OEE trend data
  const { data: trendData } = trpc.oee.getTrend.useQuery({
    days: parseInt(timeRange),
  });

  // Transform data for charts
  const comparisonData = useMemo(() => {
    if (!oeeComparison?.items) return [];
    return oeeComparison.items.map((item: any) => ({
      name: item.machineName || `Machine ${item.id}`,
      oee: item.oee || 0,
      availability: item.availability || 0,
      performance: item.performance || 0,
      quality: item.quality || 0,
      trend: item.trend || 0,
    }));
  }, [oeeComparison]);

  // Radar chart data
  const radarData = useMemo(() => {
    if (comparisonData.length === 0) return [];
    const top5 = comparisonData.slice(0, 5);
    return [
      { metric: "OEE", ...Object.fromEntries(top5.map(d => [d.name, d.oee])) },
      { metric: "Availability", ...Object.fromEntries(top5.map(d => [d.name, d.availability])) },
      { metric: "Performance", ...Object.fromEntries(top5.map(d => [d.name, d.performance])) },
      { metric: "Quality", ...Object.fromEntries(top5.map(d => [d.name, d.quality])) },
    ];
  }, [comparisonData]);

  // Summary stats
  const summary = useMemo(() => {
    if (!oeeComparison?.summary) {
      return { avgOee: 0, bestMachine: "-", worstMachine: "-", totalMachines: 0 };
    }
    return {
      avgOee: oeeComparison.summary.avgOee || 0,
      bestMachine: comparisonData[0]?.name || "-",
      worstMachine: comparisonData[comparisonData.length - 1]?.name || "-",
      totalMachines: comparisonData.length,
    };
  }, [oeeComparison, comparisonData]);

  const getOEEColor = (oee: number) => {
    if (oee >= 85) return "text-green-600";
    if (oee >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getOEEBadge = (oee: number) => {
    if (oee >= 85) return <Badge className="bg-green-500">Xuất sắc</Badge>;
    if (oee >= 70) return <Badge className="bg-yellow-500">Tốt</Badge>;
    if (oee >= 60) return <Badge className="bg-orange-500">Trung bình</Badge>;
    return <Badge variant="destructive">Cần cải thiện</Badge>;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -1) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Factory className="h-6 w-6" />
              Phân tích OEE
            </h1>
            <p className="text-muted-foreground">
              Xu hướng và so sánh OEE giữa các máy/dây chuyền
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="60">60 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OEE Trung bình</p>
                  <p className={`text-3xl font-bold ${getOEEColor(summary.avgOee)}`}>
                    {summary.avgOee.toFixed(1)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Máy tốt nhất</p>
                  <p className="text-lg font-semibold truncate">{summary.bestMachine}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cần cải thiện</p>
                  <p className="text-lg font-semibold truncate">{summary.worstMachine}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng số máy</p>
                  <p className="text-3xl font-bold">{summary.totalMachines}</p>
                </div>
                <Cpu className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">Xu hướng OEE</TabsTrigger>
            <TabsTrigger value="comparison">So sánh máy</TabsTrigger>
            <TabsTrigger value="radar">Radar Chart</TabsTrigger>
            <TabsTrigger value="ranking">Bảng xếp hạng</TabsTrigger>
          </TabsList>

          {/* Trend Tab */}
          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng OEE theo thời gian</CardTitle>
                <CardDescription>Biểu đồ OEE trung bình trong {timeRange} ngày qua</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={oeeComparison?.trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="oee"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        stroke="#3b82f6"
                        name="OEE (%)"
                      />
                      <Line
                        type="monotone"
                        dataKey="availability"
                        stroke="#22c55e"
                        strokeDasharray="5 5"
                        name="Availability"
                      />
                      <Line
                        type="monotone"
                        dataKey="performance"
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        name="Performance"
                      />
                      <Line
                        type="monotone"
                        dataKey="quality"
                        stroke="#8b5cf6"
                        strokeDasharray="5 5"
                        name="Quality"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>So sánh OEE giữa các máy</CardTitle>
                <CardDescription>OEE, Availability, Performance, Quality của từng máy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="oee" fill="#3b82f6" name="OEE" />
                      <Bar dataKey="availability" fill="#22c55e" name="Availability" />
                      <Bar dataKey="performance" fill="#f59e0b" name="Performance" />
                      <Bar dataKey="quality" fill="#8b5cf6" name="Quality" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Radar Tab */}
          <TabsContent value="radar">
            <Card>
              <CardHeader>
                <CardTitle>Radar Chart - Top 5 máy</CardTitle>
                <CardDescription>So sánh đa chiều các chỉ số OEE</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis domain={[0, 100]} />
                      {comparisonData.slice(0, 5).map((item, index) => (
                        <Radar
                          key={item.name}
                          name={item.name}
                          dataKey={item.name}
                          stroke={COLORS[index]}
                          fill={COLORS[index]}
                          fillOpacity={0.2}
                        />
                      ))}
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking">
            <Card>
              <CardHeader>
                <CardTitle>Bảng xếp hạng OEE</CardTitle>
                <CardDescription>Xếp hạng máy theo OEE từ cao đến thấp</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3">Hạng</th>
                        <th className="text-left p-3">Máy</th>
                        <th className="text-center p-3">OEE</th>
                        <th className="text-center p-3">Availability</th>
                        <th className="text-center p-3">Performance</th>
                        <th className="text-center p-3">Quality</th>
                        <th className="text-center p-3">Xu hướng</th>
                        <th className="text-center p-3">Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonData.map((item, index) => (
                        <tr key={item.name} className="border-b hover:bg-muted/50">
                          <td className="p-3">
                            <span className={`font-bold ${index < 3 ? "text-yellow-500" : ""}`}>
                              #{index + 1}
                            </span>
                          </td>
                          <td className="p-3 font-medium">{item.name}</td>
                          <td className={`p-3 text-center font-bold ${getOEEColor(item.oee)}`}>
                            {item.oee.toFixed(1)}%
                          </td>
                          <td className="p-3 text-center">{item.availability.toFixed(1)}%</td>
                          <td className="p-3 text-center">{item.performance.toFixed(1)}%</td>
                          <td className="p-3 text-center">{item.quality.toFixed(1)}%</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {getTrendIcon(item.trend)}
                              <span className={item.trend > 0 ? "text-green-500" : item.trend < 0 ? "text-red-500" : ""}>
                                {item.trend > 0 ? "+" : ""}{item.trend.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">{getOEEBadge(item.oee)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
