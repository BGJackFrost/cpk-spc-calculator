/**
 * AOI/AVI Summary Dashboard - Tổng hợp yield rate và defect rate thời gian thực
 */
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  BarChart3,
  Activity,
  Eye,
  Camera
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area
} from "recharts";

const TIME_RANGE_OPTIONS = [
  { value: "1h", label: "1 giờ" },
  { value: "6h", label: "6 giờ" },
  { value: "12h", label: "12 giờ" },
  { value: "24h", label: "24 giờ" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

export default function AoiAviSummaryDashboard() {
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "12h" | "24h" | "7d" | "30d">("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: summary, refetch: refetchSummary } = trpc.aoiAvi.dashboard.getSummary.useQuery(
    { timeRange },
    { refetchInterval: autoRefresh ? 30000 : false }
  );

  const { data: trendData, refetch: refetchTrend } = trpc.aoiAvi.dashboard.getTrendData.useQuery(
    { timeRange, inspectionType: "combined" },
    { refetchInterval: autoRefresh ? 30000 : false }
  );

  const { data: defectDistribution, refetch: refetchDefects } = trpc.aoiAvi.dashboard.getDefectDistribution.useQuery(
    { timeRange },
    { refetchInterval: autoRefresh ? 30000 : false }
  );

  const { data: machineComparison, refetch: refetchMachines } = trpc.aoiAvi.dashboard.getMachineComparison.useQuery(
    { timeRange },
    { refetchInterval: autoRefresh ? 30000 : false }
  );

  const handleRefresh = () => {
    refetchSummary();
    refetchTrend();
    refetchDefects();
    refetchMachines();
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    if (timeRange === "1h" || timeRange === "6h" || timeRange === "12h") {
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const trendChartData = trendData?.trend.map(t => ({
    ...t,
    time: formatTime(t.time),
  })) || [];

  const pieData = [
    { name: "Pass", value: summary?.combined.pass || 0, color: "#22c55e" },
    { name: "Fail", value: summary?.combined.fail || 0, color: "#ef4444" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Tổng hợp AOI/AVI</h1>
            <p className="text-muted-foreground">Theo dõi yield rate và defect rate thời gian thực</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className="h-4 w-4 mr-1" />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Tổng kiểm tra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{summary?.combined.total.toLocaleString() || 0}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {summary?.combined.pass.toLocaleString() || 0} Pass
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <XCircle className="h-3 w-3 mr-1" />
                  {summary?.combined.fail.toLocaleString() || 0} Fail
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Yield Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{summary?.combined.yieldRate || "0.00"}%</div>
              <Progress 
                value={parseFloat(summary?.combined.yieldRate || "0")} 
                className="mt-2 h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">Mục tiêu: 98%</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Defect Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{summary?.combined.defectRate || "0.00"}%</div>
              <Progress 
                value={parseFloat(summary?.combined.defectRate || "0")} 
                className="mt-2 h-2 [&>div]:bg-red-500"
              />
              <p className="text-xs text-muted-foreground mt-1">Giới hạn: 2%</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Cảnh báo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {((summary?.aoi.warning || 0) + (summary?.avi.warning || 0)).toLocaleString()}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <span>AOI: {summary?.aoi.warning || 0}</span>
                <span>|</span>
                <span>AVI: {summary?.avi.warning || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-500" />
                AOI - Automatic Optical Inspection
              </CardTitle>
              <CardDescription>Kiểm tra quang học tự động</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tổng kiểm tra</p>
                  <p className="text-2xl font-bold">{summary?.aoi.total.toLocaleString() || 0}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Yield Rate</p>
                  <p className="text-2xl font-bold text-green-600">{summary?.aoi.yieldRate || "0.00"}%</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Pass</p>
                  <p className="text-xl font-semibold text-green-600">{summary?.aoi.pass.toLocaleString() || 0}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Fail</p>
                  <p className="text-xl font-semibold text-red-600">{summary?.aoi.fail.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-purple-500" />
                AVI - Automatic Visual Inspection
              </CardTitle>
              <CardDescription>Kiểm tra hình ảnh tự động</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tổng kiểm tra</p>
                  <p className="text-2xl font-bold">{summary?.avi.total.toLocaleString() || 0}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Yield Rate</p>
                  <p className="text-2xl font-bold text-green-600">{summary?.avi.yieldRate || "0.00"}%</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Pass</p>
                  <p className="text-xl font-semibold text-green-600">{summary?.avi.pass.toLocaleString() || 0}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Fail</p>
                  <p className="text-xl font-semibold text-red-600">{summary?.avi.fail.toLocaleString() || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trend" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trend">Xu hướng</TabsTrigger>
            <TabsTrigger value="defects">Phân bố lỗi</TabsTrigger>
            <TabsTrigger value="machines">So sánh máy</TabsTrigger>
          </TabsList>

          <TabsContent value="trend">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng Yield Rate theo thời gian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" className="text-xs" />
                      <YAxis yAxisId="left" domain={[90, 100]} className="text-xs" />
                      <YAxis yAxisId="right" orientation="right" className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="yieldRate"
                        name="Yield Rate (%)"
                        fill="#22c55e"
                        fillOpacity={0.2}
                        stroke="#22c55e"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="defectRate"
                        name="Defect Rate (%)"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="total"
                        name="Số lượng"
                        fill="#3b82f6"
                        opacity={0.5}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defects">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Biểu đồ Pareto - Phân bố lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={defectDistribution?.distribution || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="defectCode" className="text-xs" />
                        <YAxis yAxisId="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="count" name="Số lượng" fill="#3b82f6" />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="cumulativePercentage"
                          name="Tích lũy (%)"
                          stroke="#ef4444"
                          strokeWidth={2}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tỷ lệ Pass/Fail</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={140}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="machines">
            <Card>
              <CardHeader>
                <CardTitle>So sánh hiệu suất giữa các máy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={machineComparison?.machines || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} className="text-xs" />
                      <YAxis dataKey="machineName" type="category" width={100} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="yieldRate" name="Yield Rate (%)" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Máy</th>
                        <th className="text-left py-2 px-3">Loại</th>
                        <th className="text-right py-2 px-3">Tổng</th>
                        <th className="text-right py-2 px-3">Pass</th>
                        <th className="text-right py-2 px-3">Fail</th>
                        <th className="text-right py-2 px-3">Yield</th>
                      </tr>
                    </thead>
                    <tbody>
                      {machineComparison?.machines.map(m => (
                        <tr key={m.machineId} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium">{m.machineName}</td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className={m.machineType === 'aoi' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}>
                              {m.machineType.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right">{m.total.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-green-600">{m.pass.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-red-600">{m.fail.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-semibold">{m.yieldRate}%</td>
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
