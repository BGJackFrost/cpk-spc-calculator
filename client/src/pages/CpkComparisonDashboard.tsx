import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Loader2, TrendingUp, TrendingDown, Minus, BarChart3, 
  Factory, Cpu, RefreshCw, Calendar
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
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
