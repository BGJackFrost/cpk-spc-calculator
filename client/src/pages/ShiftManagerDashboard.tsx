/**
 * Shift Manager Dashboard
 * Dashboard tổng quan cho Shift Manager với KPI theo ca
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, ComposedChart, Cell
} from "recharts";
import { 
  Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Clock, Users, Factory, Gauge, RefreshCw, Download, Sun, Moon, Sunset
} from "lucide-react";

type ShiftType = "morning" | "afternoon" | "night" | "all";

interface ShiftKPI {
  shiftName: string;
  shiftType: ShiftType;
  avgCpk: number | null;
  avgOee: number | null;
  defectRate: number;
  sampleCount: number;
  violationCount: number;
  productionCount: number;
  status: "excellent" | "good" | "acceptable" | "warning" | "critical";
}

interface MachinePerformance {
  machineId: number;
  machineName: string;
  lineName: string;
  cpk: number | null;
  oee: number | null;
  defectRate: number;
  status: string;
}

const SHIFT_COLORS = {
  morning: "#f59e0b",
  afternoon: "#3b82f6",
  night: "#8b5cf6",
};

const STATUS_COLORS = {
  excellent: "#10b981",
  good: "#3b82f6",
  acceptable: "#f59e0b",
  warning: "#f97316",
  critical: "#ef4444",
};

function getShiftIcon(shift: ShiftType) {
  switch (shift) {
    case "morning": return <Sun className="h-4 w-4 text-amber-500" />;
    case "afternoon": return <Sunset className="h-4 w-4 text-blue-500" />;
    case "night": return <Moon className="h-4 w-4 text-purple-500" />;
    default: return <Clock className="h-4 w-4" />;
  }
}

function getStatusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    excellent: "default",
    good: "secondary",
    acceptable: "outline",
    warning: "secondary",
    critical: "destructive",
  };
  const labels: Record<string, string> = {
    excellent: "Xuất sắc",
    good: "Tốt",
    acceptable: "Chấp nhận",
    warning: "Cảnh báo",
    critical: "Nguy hiểm",
  };
  return (
    <Badge variant={variants[status] || "outline"} className="text-xs">
      {labels[status] || status}
    </Badge>
  );
}

export default function ShiftManagerDashboard() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedLine, setSelectedLine] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // WebSocket for real-time updates
  const ws = useWebSocket(["shift_comparison", "spc_updates"], {
    onMessage: (message) => {
      if (message.type === "shift_comparison" || message.type === "spc_update") {
        setRefreshKey((k) => k + 1);
      }
    },
  });

  // Fetch production lines
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  // Fetch shift comparison data
  const { data: shiftData, isLoading: isLoadingShift } = trpc.spc.compareShiftCpk.useQuery(
    {
      planId: 0, // 0 means all plans
      date: new Date(selectedDate),
    },
    { enabled: !!selectedDate }
  );

  // Fetch SPC summary for the day
  const { data: summaryData, isLoading: isLoadingSummary } = trpc.spc.getShiftSummaryForDay.useQuery(
    {
      planId: 0,
      date: new Date(selectedDate),
    },
    { enabled: !!selectedDate }
  );

  // Calculate KPIs for each shift
  const shiftKPIs: ShiftKPI[] = useMemo(() => {
    if (!shiftData) return [];

    const shifts: ShiftType[] = ["morning", "afternoon", "night"];
    return shifts.map((shift) => {
      const data = shiftData[shift] || { avgCpk: null, count: 0 };
      const cpk = data.avgCpk;
      
      let status: ShiftKPI["status"] = "acceptable";
      if (cpk === null) status = "acceptable";
      else if (cpk >= 1.67) status = "excellent";
      else if (cpk >= 1.33) status = "good";
      else if (cpk >= 1.0) status = "acceptable";
      else if (cpk >= 0.67) status = "warning";
      else status = "critical";

      return {
        shiftName: shift === "morning" ? "Ca sáng" : shift === "afternoon" ? "Ca chiều" : "Ca đêm",
        shiftType: shift,
        avgCpk: cpk,
        avgOee: Math.random() * 30 + 70, // Mock OEE data
        defectRate: cpk ? Math.max(0, (1.33 - cpk) * 2) : 0,
        sampleCount: data.count * 100,
        violationCount: Math.floor(Math.random() * 10),
        productionCount: Math.floor(Math.random() * 1000) + 500,
        status,
      };
    });
  }, [shiftData]);

  // Chart data for shift comparison
  const shiftChartData = useMemo(() => {
    return shiftKPIs.map((kpi) => ({
      name: kpi.shiftName,
      cpk: kpi.avgCpk || 0,
      oee: kpi.avgOee || 0,
      defectRate: kpi.defectRate,
      sampleCount: kpi.sampleCount,
      fill: SHIFT_COLORS[kpi.shiftType],
    }));
  }, [shiftKPIs]);

  // Radar chart data
  const radarData = useMemo(() => {
    const metrics = ["CPK", "OEE", "Chất lượng", "Năng suất", "Hiệu quả"];
    return metrics.map((metric) => {
      const result: any = { metric };
      shiftKPIs.forEach((kpi) => {
        let value = 0;
        switch (metric) {
          case "CPK":
            value = ((kpi.avgCpk || 0) / 2) * 100;
            break;
          case "OEE":
            value = kpi.avgOee || 0;
            break;
          case "Chất lượng":
            value = 100 - kpi.defectRate * 10;
            break;
          case "Năng suất":
            value = (kpi.productionCount / 1500) * 100;
            break;
          case "Hiệu quả":
            value = ((kpi.avgCpk || 0) * 30 + (kpi.avgOee || 0) * 0.7);
            break;
        }
        result[kpi.shiftName] = Math.min(100, Math.max(0, value));
      });
      return result;
    });
  }, [shiftKPIs]);

  // Mock machine performance data
  const machinePerformance: MachinePerformance[] = useMemo(() => {
    return [
      { machineId: 1, machineName: "MC01", lineName: "Line A", cpk: 1.45, oee: 85.2, defectRate: 0.8, status: "good" },
      { machineId: 2, machineName: "MC02", lineName: "Line A", cpk: 1.72, oee: 92.1, defectRate: 0.3, status: "excellent" },
      { machineId: 3, machineName: "MC03", lineName: "Line B", cpk: 1.12, oee: 78.5, defectRate: 1.5, status: "acceptable" },
      { machineId: 4, machineName: "MC04", lineName: "Line B", cpk: 0.89, oee: 71.3, defectRate: 2.1, status: "warning" },
      { machineId: 5, machineName: "MC05", lineName: "Line C", cpk: 1.55, oee: 88.7, defectRate: 0.6, status: "good" },
    ].filter((m) => selectedLine === "all" || m.lineName === selectedLine);
  }, [selectedLine]);

  // Calculate overall KPIs
  const overallKPIs = useMemo(() => {
    const validKPIs = shiftKPIs.filter((k) => k.avgCpk !== null);
    const avgCpk = validKPIs.length > 0
      ? validKPIs.reduce((sum, k) => sum + (k.avgCpk || 0), 0) / validKPIs.length
      : null;
    const avgOee = validKPIs.length > 0
      ? validKPIs.reduce((sum, k) => sum + (k.avgOee || 0), 0) / validKPIs.length
      : null;
    const totalSamples = shiftKPIs.reduce((sum, k) => sum + k.sampleCount, 0);
    const totalViolations = shiftKPIs.reduce((sum, k) => sum + k.violationCount, 0);

    return { avgCpk, avgOee, totalSamples, totalViolations };
  }, [shiftKPIs]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Quản lý Ca</h1>
            <p className="text-muted-foreground">
              Theo dõi KPI và hiệu suất sản xuất theo ca làm việc
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {ws.isConnected ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                  Realtime
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
                  Đang kết nối...
                </Badge>
              )}
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Dây chuyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {productionLines?.map((line) => (
                  <SelectItem key={line.id} value={line.name}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Overall KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                CPK Trung bình
              </CardTitle>
              <Gauge className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallKPIs.avgCpk?.toFixed(2) || "N/A"}
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {overallKPIs.avgCpk && overallKPIs.avgCpk >= 1.33 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">Đạt chuẩn</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-500">Cần cải thiện</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                OEE Trung bình
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallKPIs.avgOee?.toFixed(1) || "N/A"}%
              </div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {overallKPIs.avgOee && overallKPIs.avgOee >= 85 ? (
                  <>
                    <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">World Class</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 text-yellow-500 mr-1" />
                    <span className="text-yellow-500">Cần tối ưu</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng mẫu kiểm tra
              </CardTitle>
              <Factory className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallKPIs.totalSamples.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Trong ngày {new Date(selectedDate).toLocaleDateString("vi-VN")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vi phạm SPC
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {overallKPIs.totalViolations}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cần xử lý ngay
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Shift KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shiftKPIs.map((kpi) => (
            <Card key={kpi.shiftType} className="relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-1 h-full"
                style={{ backgroundColor: SHIFT_COLORS[kpi.shiftType] }}
              />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getShiftIcon(kpi.shiftType)}
                    <CardTitle className="text-lg">{kpi.shiftName}</CardTitle>
                  </div>
                  {getStatusBadge(kpi.status)}
                </div>
                <CardDescription>
                  {kpi.shiftType === "morning" ? "6:00 - 14:00" : 
                   kpi.shiftType === "afternoon" ? "14:00 - 22:00" : "22:00 - 6:00"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">CPK</p>
                    <p className="text-xl font-bold" style={{ color: STATUS_COLORS[kpi.status] }}>
                      {kpi.avgCpk?.toFixed(2) || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">OEE</p>
                    <p className="text-xl font-bold">
                      {kpi.avgOee?.toFixed(1) || "N/A"}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tỷ lệ lỗi</p>
                    <p className="text-lg font-semibold text-red-600">
                      {kpi.defectRate.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Số mẫu</p>
                    <p className="text-lg font-semibold">
                      {kpi.sampleCount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comparison">So sánh ca</TabsTrigger>
            <TabsTrigger value="radar">Radar đa chiều</TabsTrigger>
            <TabsTrigger value="machines">Hiệu suất máy</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>So sánh KPI giữa các ca</CardTitle>
                <CardDescription>
                  Biểu đồ so sánh CPK, OEE và tỷ lệ lỗi giữa các ca làm việc
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={shiftChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" domain={[0, 2]} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="cpk" name="CPK" radius={[4, 4, 0, 0]}>
                        {shiftChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="oee" 
                        name="OEE (%)" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: "#10b981" }}
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="defectRate" 
                        name="Tỷ lệ lỗi (%)" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "#ef4444" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="radar">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích đa chiều theo ca</CardTitle>
                <CardDescription>
                  So sánh hiệu suất tổng thể của các ca trên nhiều tiêu chí
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="metric" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar
                        name="Ca sáng"
                        dataKey="Ca sáng"
                        stroke={SHIFT_COLORS.morning}
                        fill={SHIFT_COLORS.morning}
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Ca chiều"
                        dataKey="Ca chiều"
                        stroke={SHIFT_COLORS.afternoon}
                        fill={SHIFT_COLORS.afternoon}
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Ca đêm"
                        dataKey="Ca đêm"
                        stroke={SHIFT_COLORS.night}
                        fill={SHIFT_COLORS.night}
                        fillOpacity={0.3}
                      />
                      <Legend />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="machines">
            <Card>
              <CardHeader>
                <CardTitle>Hiệu suất theo máy/dây chuyền</CardTitle>
                <CardDescription>
                  Chi tiết hiệu suất của từng máy trong ca hiện tại
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Máy</TableHead>
                      <TableHead>Dây chuyền</TableHead>
                      <TableHead className="text-right">CPK</TableHead>
                      <TableHead className="text-right">OEE (%)</TableHead>
                      <TableHead className="text-right">Tỷ lệ lỗi (%)</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {machinePerformance.map((machine) => (
                      <TableRow key={machine.machineId}>
                        <TableCell className="font-medium">{machine.machineName}</TableCell>
                        <TableCell>{machine.lineName}</TableCell>
                        <TableCell className="text-right">
                          <span 
                            className="font-semibold"
                            style={{ 
                              color: machine.cpk && machine.cpk >= 1.33 ? "#10b981" : 
                                     machine.cpk && machine.cpk >= 1.0 ? "#f59e0b" : "#ef4444" 
                            }}
                          >
                            {machine.cpk?.toFixed(2) || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{machine.oee?.toFixed(1)}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {machine.defectRate.toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(machine.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Hành động nhanh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Xuất báo cáo ca
              </Button>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Phân công nhân viên
              </Button>
              <Button variant="outline">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Xem cảnh báo
              </Button>
              <Button variant="outline">
                <Factory className="h-4 w-4 mr-2" />
                Quản lý máy móc
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
