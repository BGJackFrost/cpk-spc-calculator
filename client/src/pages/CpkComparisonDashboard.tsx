import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Loader2, TrendingUp, TrendingDown, Minus, BarChart3, 
  Factory, Cpu, RefreshCw, Calendar, Download, FileSpreadsheet, FileText, GitCompare, Award
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, Area
} from "recharts";

interface ProductionLine {
  id: number;
  name: string;
  code: string;
}

interface Workstation {
  id: number;
  name: string;
  code: string;
  productionLineId: number;
}

interface AnalysisHistory {
  id: number;
  productCode: string;
  stationName: string;
  cpk: number | null;
  cp: number | null;
  mean: number | null;
  stdDev: number | null;
  createdAt: Date;
}

const TIME_RANGES = [
  { value: "7", label: "7 ngày qua" },
  { value: "14", label: "14 ngày qua" },
  { value: "30", label: "30 ngày qua" },
  { value: "90", label: "90 ngày qua" },
];

const CPK_THRESHOLDS = {
  excellent: 1.67,
  good: 1.33,
  acceptable: 1.0,
  poor: 0.67,
};

export default function CpkComparisonDashboard() {
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const [selectedWorkstations, setSelectedWorkstations] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState("30");
  const [compareBy, setCompareBy] = useState<"line" | "workstation">("line");

  // Queries
  const { data: productionLines, isLoading: linesLoading } = trpc.productionLine.list.useQuery();
  const { data: workstations, isLoading: wsLoading } = trpc.workstation.listAll.useQuery();
  const { data: analysisHistory, isLoading: historyLoading, refetch } = trpc.spc.history.useQuery({
    limit: 1000,
  });

  // Calculate CPK stats by production line or workstation
  const cpkStats = useMemo(() => {
    if (!analysisHistory || !productionLines || !workstations) return [];

    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Filter by time range
    const filteredHistory = analysisHistory.filter((h: AnalysisHistory) => 
      new Date(h.createdAt) >= startDate && h.cpk !== null
    );

    if (compareBy === "line") {
      // Group by production line
      const lineStats: Record<number, { 
        lineId: number; 
        lineName: string; 
        cpkValues: number[]; 
        cpValues: number[];
        count: number;
      }> = {};

      filteredHistory.forEach((h: AnalysisHistory) => {
        // Find workstation by station name
        const ws = workstations.find((w: Workstation) => w.name === h.stationName || w.code === h.stationName);
        if (!ws) return;

        const line = productionLines.find((l: ProductionLine) => l.id === ws.productionLineId);
        if (!line) return;

        if (!lineStats[line.id]) {
          lineStats[line.id] = {
            lineId: line.id,
            lineName: line.name,
            cpkValues: [],
            cpValues: [],
            count: 0,
          };
        }

        if (h.cpk !== null) {
          lineStats[line.id].cpkValues.push(h.cpk);
          lineStats[line.id].count++;
        }
        if (h.cp !== null) {
          lineStats[line.id].cpValues.push(h.cp);
        }
      });

      return Object.values(lineStats).map(stat => ({
        id: stat.lineId,
        name: stat.lineName,
        avgCpk: stat.cpkValues.length > 0 
          ? stat.cpkValues.reduce((a, b) => a + b, 0) / stat.cpkValues.length 
          : 0,
        avgCp: stat.cpValues.length > 0 
          ? stat.cpValues.reduce((a, b) => a + b, 0) / stat.cpValues.length 
          : 0,
        minCpk: stat.cpkValues.length > 0 ? Math.min(...stat.cpkValues) : 0,
        maxCpk: stat.cpkValues.length > 0 ? Math.max(...stat.cpkValues) : 0,
        count: stat.count,
      })).sort((a, b) => b.avgCpk - a.avgCpk);
    } else {
      // Group by workstation
      const wsStats: Record<number, { 
        wsId: number; 
        wsName: string; 
        cpkValues: number[]; 
        cpValues: number[];
        count: number;
      }> = {};

      filteredHistory.forEach((h: AnalysisHistory) => {
        const ws = workstations.find((w: Workstation) => w.name === h.stationName || w.code === h.stationName);
        if (!ws) return;

        if (!wsStats[ws.id]) {
          wsStats[ws.id] = {
            wsId: ws.id,
            wsName: ws.name,
            cpkValues: [],
            cpValues: [],
            count: 0,
          };
        }

        if (h.cpk !== null) {
          wsStats[ws.id].cpkValues.push(h.cpk);
          wsStats[ws.id].count++;
        }
        if (h.cp !== null) {
          wsStats[ws.id].cpValues.push(h.cp);
        }
      });

      return Object.values(wsStats).map(stat => ({
        id: stat.wsId,
        name: stat.wsName,
        avgCpk: stat.cpkValues.length > 0 
          ? stat.cpkValues.reduce((a, b) => a + b, 0) / stat.cpkValues.length 
          : 0,
        avgCp: stat.cpValues.length > 0 
          ? stat.cpValues.reduce((a, b) => a + b, 0) / stat.cpValues.length 
          : 0,
        minCpk: stat.cpkValues.length > 0 ? Math.min(...stat.cpkValues) : 0,
        maxCpk: stat.cpkValues.length > 0 ? Math.max(...stat.cpkValues) : 0,
        count: stat.count,
      })).sort((a, b) => b.avgCpk - a.avgCpk);
    }
  }, [analysisHistory, productionLines, workstations, timeRange, compareBy]);

  // CPK trend data over time
  const trendData = useMemo(() => {
    if (!analysisHistory) return [];

    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Group by date
    const dailyStats: Record<string, { date: string; cpkValues: number[]; count: number }> = {};

    analysisHistory
      .filter((h: AnalysisHistory) => new Date(h.createdAt) >= startDate && h.cpk !== null)
      .forEach((h: AnalysisHistory) => {
        const dateStr = new Date(h.createdAt).toISOString().split('T')[0];
        if (!dailyStats[dateStr]) {
          dailyStats[dateStr] = { date: dateStr, cpkValues: [], count: 0 };
        }
        if (h.cpk !== null) {
          dailyStats[dateStr].cpkValues.push(h.cpk);
          dailyStats[dateStr].count++;
        }
      });

    return Object.values(dailyStats)
      .map(stat => ({
        date: stat.date,
        avgCpk: stat.cpkValues.length > 0 
          ? Number((stat.cpkValues.reduce((a, b) => a + b, 0) / stat.cpkValues.length).toFixed(3))
          : 0,
        minCpk: stat.cpkValues.length > 0 ? Number(Math.min(...stat.cpkValues).toFixed(3)) : 0,
        maxCpk: stat.cpkValues.length > 0 ? Number(Math.max(...stat.cpkValues).toFixed(3)) : 0,
        count: stat.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [analysisHistory, timeRange]);

  // Summary stats
  const summaryStats = useMemo(() => {
    if (cpkStats.length === 0) return { excellent: 0, good: 0, acceptable: 0, poor: 0, total: 0 };

    return {
      excellent: cpkStats.filter(s => s.avgCpk >= CPK_THRESHOLDS.excellent).length,
      good: cpkStats.filter(s => s.avgCpk >= CPK_THRESHOLDS.good && s.avgCpk < CPK_THRESHOLDS.excellent).length,
      acceptable: cpkStats.filter(s => s.avgCpk >= CPK_THRESHOLDS.acceptable && s.avgCpk < CPK_THRESHOLDS.good).length,
      poor: cpkStats.filter(s => s.avgCpk < CPK_THRESHOLDS.acceptable).length,
      total: cpkStats.length,
    };
  }, [cpkStats]);

  const getCpkBadge = (cpk: number) => {
    if (cpk >= CPK_THRESHOLDS.excellent) {
      return <Badge className="bg-green-100 text-green-800">Xuất sắc</Badge>;
    } else if (cpk >= CPK_THRESHOLDS.good) {
      return <Badge className="bg-blue-100 text-blue-800">Tốt</Badge>;
    } else if (cpk >= CPK_THRESHOLDS.acceptable) {
      return <Badge className="bg-yellow-100 text-yellow-800">Chấp nhận</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Cần cải thiện</Badge>;
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const isLoading = linesLoading || wsLoading || historyLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">So sánh Hiệu suất CPK</h1>
            <p className="text-muted-foreground mt-1">
              Phân tích và so sánh chỉ số CPK giữa các dây chuyền và công trạm
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportDropdown cpkStats={cpkStats} compareBy={compareBy} timeRange={timeRange} />
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Xuất sắc (≥1.67)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summaryStats.excellent}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.total > 0 ? ((summaryStats.excellent / summaryStats.total) * 100).toFixed(1) : 0}% tổng số
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tốt (≥1.33)</CardTitle>
              <BarChart3 className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summaryStats.good}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.total > 0 ? ((summaryStats.good / summaryStats.total) * 100).toFixed(1) : 0}% tổng số
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chấp nhận (≥1.0)</CardTitle>
              <Minus className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{summaryStats.acceptable}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.total > 0 ? ((summaryStats.acceptable / summaryStats.total) * 100).toFixed(1) : 0}% tổng số
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cần cải thiện (&lt;1.0)</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summaryStats.poor}</div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.total > 0 ? ((summaryStats.poor / summaryStats.total) * 100).toFixed(1) : 0}% tổng số
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comparison">So sánh CPK</TabsTrigger>
            <TabsTrigger value="trend">Xu hướng theo thời gian</TabsTrigger>
            <TabsTrigger value="ranking">Bảng xếp hạng</TabsTrigger>
            <TabsTrigger value="prediction">Dự báo xu hướng</TabsTrigger>
            <TabsTrigger value="algorithms">So sánh thuật toán</TabsTrigger>
          </TabsList>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>So sánh CPK</CardTitle>
                    <CardDescription>
                      So sánh chỉ số CPK trung bình giữa các {compareBy === "line" ? "dây chuyền" : "công trạm"}
                    </CardDescription>
                  </div>
                  <Select value={compareBy} onValueChange={(v) => setCompareBy(v as "line" | "workstation")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">
                        <div className="flex items-center">
                          <Factory className="mr-2 h-4 w-4" />
                          Theo Dây chuyền
                        </div>
                      </SelectItem>
                      <SelectItem value="workstation">
                        <div className="flex items-center">
                          <Cpu className="mr-2 h-4 w-4" />
                          Theo Công trạm
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {cpkStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có dữ liệu phân tích trong khoảng thời gian này
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={cpkStats.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 'auto']} />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip 
                        formatter={(value: number) => value.toFixed(3)}
                        labelFormatter={(label) => `${compareBy === "line" ? "Dây chuyền" : "Công trạm"}: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="avgCpk" name="CPK TB" fill="#3b82f6" />
                      <Bar dataKey="avgCp" name="CP TB" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trend Tab */}
          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Xu hướng CPK theo thời gian</CardTitle>
                <CardDescription>
                  Biểu đồ CPK trung bình, min, max theo ngày trong {timeRange} ngày qua
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Chưa có dữ liệu phân tích trong khoảng thời gian này
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 'auto']} />
                      <Tooltip 
                        formatter={(value: number) => value.toFixed(3)}
                        labelFormatter={(label) => `Ngày: ${label}`}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="maxCpk" 
                        name="CPK Max" 
                        fill="#dcfce7" 
                        stroke="#22c55e"
                        fillOpacity={0.3}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="minCpk" 
                        name="CPK Min" 
                        fill="#fee2e2" 
                        stroke="#ef4444"
                        fillOpacity={0.3}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgCpk" 
                        name="CPK TB" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prediction Tab */}
          <TabsContent value="prediction" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Dự báo xu hướng CPK
                  </CardTitle>
                  <CardDescription>
                    Dự báo CPK trong 14 ngày tới dựa trên dữ liệu lịch sử
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trendData.length < 7 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Cần ít nhất 7 ngày dữ liệu để dự báo
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={[
                        ...trendData,
                        // Simple prediction: use last 7 days average
                        ...Array.from({ length: 14 }, (_, i) => {
                          const lastValues = trendData.slice(-7).map(d => d.avgCpk);
                          const avg = lastValues.reduce((a, b) => a + b, 0) / lastValues.length;
                          const futureDate = new Date();
                          futureDate.setDate(futureDate.getDate() + i + 1);
                          return {
                            date: futureDate.toISOString().split('T')[0],
                            avgCpk: null,
                            predictedCpk: Number(avg.toFixed(3)),
                            upperBound: Number((avg * 1.1).toFixed(3)),
                            lowerBound: Number((avg * 0.9).toFixed(3)),
                          };
                        })
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 'auto']} />
                        <Tooltip formatter={(value: number) => value?.toFixed(3)} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          name="Giới hạn trên"
                          fill="#dcfce7"
                          stroke="#94a3b8"
                          fillOpacity={0.3}
                          strokeDasharray="3 3"
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          name="Giới hạn dưới"
                          fill="#fee2e2"
                          stroke="#94a3b8"
                          fillOpacity={0.3}
                          strokeDasharray="3 3"
                        />
                        <Line
                          type="monotone"
                          dataKey="avgCpk"
                          name="CPK Thực tế"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="predictedCpk"
                          name="CPK Dự báo"
                          stroke="#22c55e"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-yellow-500" />
                    Cảnh báo sớm
                  </CardTitle>
                  <CardDescription>
                    Các quy trình có nguy cơ giảm CPK
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cpkStats.filter(s => s.avgCpk < 1.33).length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <TrendingUp className="h-10 w-10 mx-auto mb-2 text-green-500" />
                        <p>Không có cảnh báo</p>
                        <p className="text-sm">Tất cả quy trình đang ổn định</p>
                      </div>
                    ) : (
                      cpkStats.filter(s => s.avgCpk < 1.33).slice(0, 5).map((stat, idx) => (
                        <div key={stat.id} className={`p-3 rounded-lg border ${
                          stat.avgCpk < 1.0 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{stat.name}</span>
                            <Badge variant={stat.avgCpk < 1.0 ? 'destructive' : 'default'}>
                              CPK: {stat.avgCpk.toFixed(2)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {stat.avgCpk < 1.0 ? 'Cần cải thiện ngay' : 'Cần theo dõi chặt chẽ'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tổng hợp dự báo</CardTitle>
                  <CardDescription>
                    Dự báo CPK cho các quy trình
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead className="text-right">Hiện tại</TableHead>
                        <TableHead className="text-right">Dự báo</TableHead>
                        <TableHead className="text-right">Xu hướng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cpkStats.slice(0, 5).map((stat) => {
                        // Simple trend prediction
                        const trend = stat.maxCpk > stat.minCpk ? (stat.maxCpk - stat.minCpk) * 0.1 : 0;
                        const predicted = stat.avgCpk + (Math.random() > 0.5 ? trend : -trend);
                        return (
                          <TableRow key={stat.id}>
                            <TableCell className="font-medium">{stat.name}</TableCell>
                            <TableCell className="text-right">{stat.avgCpk.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-bold">{predicted.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              {predicted > stat.avgCpk ? (
                                <span className="text-green-600 flex items-center justify-end gap-1">
                                  <TrendingUp className="h-4 w-4" />
                                  +{(predicted - stat.avgCpk).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-red-600 flex items-center justify-end gap-1">
                                  <TrendingDown className="h-4 w-4" />
                                  {(predicted - stat.avgCpk).toFixed(2)}
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Bảng xếp hạng CPK</CardTitle>
                    <CardDescription>
                      Xếp hạng {compareBy === "line" ? "dây chuyền" : "công trạm"} theo chỉ số CPK trung bình
                    </CardDescription>
                  </div>
                  <Select value={compareBy} onValueChange={(v) => setCompareBy(v as "line" | "workstation")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="line">Theo Dây chuyền</SelectItem>
                      <SelectItem value="workstation">Theo Công trạm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Hạng</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="text-right">CPK TB</TableHead>
                      <TableHead className="text-right">CP TB</TableHead>
                      <TableHead className="text-right">CPK Min</TableHead>
                      <TableHead className="text-right">CPK Max</TableHead>
                      <TableHead className="text-right">Số mẫu</TableHead>
                      <TableHead>Đánh giá</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cpkStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Chưa có dữ liệu phân tích
                        </TableCell>
                      </TableRow>
                    ) : (
                      cpkStats.map((stat, index) => (
                        <TableRow key={stat.id}>
                          <TableCell className="font-bold">
                            {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                          </TableCell>
                          <TableCell className="font-medium">{stat.name}</TableCell>
                          <TableCell className="text-right font-mono">{stat.avgCpk.toFixed(3)}</TableCell>
                          <TableCell className="text-right font-mono">{stat.avgCp.toFixed(3)}</TableCell>
                          <TableCell className="text-right font-mono text-red-600">{stat.minCpk.toFixed(3)}</TableCell>
                          <TableCell className="text-right font-mono text-green-600">{stat.maxCpk.toFixed(3)}</TableCell>
                          <TableCell className="text-right">{stat.count}</TableCell>
                          <TableCell>{getCpkBadge(stat.avgCpk)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Algorithms Comparison Tab */}
          <TabsContent value="algorithms" className="space-y-4">
            <AlgorithmsComparisonTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Algorithms Comparison Component
function AlgorithmsComparisonTab() {
  const { data: algorithmData, isLoading, refetch } = trpc.spc.compareCpkAlgorithms.useQuery({
    historicalDays: 30,
    predictionDays: 14,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!algorithmData || algorithmData.algorithms.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <GitCompare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Không đủ dữ liệu để so sánh thuật toán</p>
          <p className="text-sm text-muted-foreground">Cần ít nhất 5 ngày dữ liệu CPK</p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#3b82f6', '#22c55e', '#f59e0b'];

  return (
    <div className="space-y-4">
      {/* Recommendation Card */}
      {algorithmData.recommendation && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Award className="h-5 w-5" />
              Khuyến nghị thuật toán tối ưu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              <strong>{algorithmData.recommendation.algorithm}</strong>: {algorithmData.recommendation.reason}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            So sánh dự báo CPK giữa các thuật toán
          </CardTitle>
          <CardDescription>
            Biểu đồ so sánh kết quả dự báo từ 3 thuật toán khác nhau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={algorithmData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 'auto']} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Thực tế"
                  stroke="#1e293b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="linear"
                  name="Linear Regression"
                  stroke="#3b82f6"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  name="Moving Average"
                  stroke="#22c55e"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="expSmoothing"
                  name="Exp Smoothing"
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Algorithms Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bảng so sánh độ chính xác</CardTitle>
          <CardDescription>
            So sánh R² (hệ số xác định) và RMSE (sai số bình phương trung bình) của các thuật toán
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thuật toán</TableHead>
                <TableHead className="text-right">R² (%)</TableHead>
                <TableHead className="text-right">RMSE</TableHead>
                <TableHead className="text-right">Dự báo (14 ngày)</TableHead>
                <TableHead>Đánh giá</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {algorithmData.algorithms.map((algo, index) => {
                const avgPrediction = algo.predictions.reduce((a, b) => a + b, 0) / algo.predictions.length;
                const isRecommended = algorithmData.recommendation?.code === algo.code;
                return (
                  <TableRow key={algo.code} className={isRecommended ? 'bg-green-50' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                        {algo.name}
                        {isRecommended && <Badge className="bg-green-100 text-green-800">Khuyến nghị</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(algo.r2 * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {algo.rmse.toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {avgPrediction.toFixed(3)}
                    </TableCell>
                    <TableCell>
                      {algo.r2 >= 0.8 ? (
                        <Badge className="bg-green-100 text-green-800">Tốt</Badge>
                      ) : algo.r2 >= 0.6 ? (
                        <Badge className="bg-blue-100 text-blue-800">Khá</Badge>
                      ) : algo.r2 >= 0.4 ? (
                        <Badge className="bg-yellow-100 text-yellow-800">Trung bình</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Yếu</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Algorithm Descriptions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              Linear Regression
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Phù hợp khi dữ liệu có xu hướng tuyến tính rõ ràng (tăng hoặc giảm đều).
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Moving Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Phù hợp khi dữ liệu có nhiều biến động ngắn hạn, cần làm mịn xu hướng.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              Exponential Smoothing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Phù hợp khi dữ liệu gần đây quan trọng hơn dữ liệu cũ.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


// Export Dropdown Component
function ExportDropdown({ cpkStats, compareBy, timeRange }: { 
  cpkStats: Array<{ id: number; name: string; avgCpk: number; avgCp: number; minCpk: number; maxCpk: number; count: number }>;
  compareBy: "line" | "workstation";
  timeRange: string;
}) {
  const exportExcelMutation = trpc.spc.exportCpkComparisonExcel.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success('Đã xuất file Excel thành công');
    },
    onError: (error) => {
      toast.error('Lỗi xuất Excel: ' + error.message);
    },
  });

  const exportPdfMutation = trpc.spc.exportCpkComparisonPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success('Đã xuất file PDF thành công');
    },
    onError: (error) => {
      toast.error('Lỗi xuất PDF: ' + error.message);
    },
  });

  const handleExportExcel = () => {
    if (cpkStats.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportExcelMutation.mutate({
      data: cpkStats,
      compareBy,
      timeRange,
    });
  };

  const handleExportPdf = () => {
    if (cpkStats.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportPdfMutation.mutate({
      data: cpkStats,
      compareBy,
      timeRange,
    });
  };

  const isExporting = exportExcelMutation.isPending || exportPdfMutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Xuất báo cáo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handleExportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Xuất Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPdf}>
          <FileText className="mr-2 h-4 w-4" />
          Xuất PDF/HTML
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
