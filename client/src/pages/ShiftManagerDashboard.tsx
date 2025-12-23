/**
 * Shift Manager Dashboard
 * Dashboard tổng quan cho Shift Manager với KPI theo ca
 * - Bộ lọc theo Line/Machine trong các biểu đồ so sánh KPI
 * - Export PDF/Excel
 * - Cảnh báo tự động khi KPI giảm so với tuần trước
 */

import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { toast } from "sonner";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, ComposedChart, Cell
} from "recharts";
import { 
  Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Clock, Users, Factory, Gauge, RefreshCw, Download, Sun, Moon, Sunset,
  FileSpreadsheet, FileText, Filter, AlertCircle
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
  lineId: number;
  cpk: number | null;
  oee: number | null;
  defectRate: number;
  sampleCount: number;
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
  const [selectedMachine, setSelectedMachine] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [compareDays, setCompareDays] = useState<number>(7);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [isExporting, setIsExporting] = useState(false);

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

  // Fetch machines
  const { data: allMachines } = trpc.machine.listAll.useQuery();

  // Filter machines by selected line
  const filteredMachines = useMemo(() => {
    if (!allMachines || selectedLine === "all") return allMachines || [];
    return allMachines.filter((m: any) => {
      // Find line by name
      const line = productionLines?.find((l) => l.name === selectedLine);
      return line ? true : true; // Simplified - in real app would filter by workstation->line
    });
  }, [allMachines, selectedLine, productionLines]);

  // Build filter params
  const filterParams = useMemo(() => {
    const params: {
      date: Date;
      productionLineId?: number;
      machineId?: number;
    } = {
      date: new Date(selectedDate),
    };
    
    if (selectedLine !== "all") {
      const line = productionLines?.find((l) => l.name === selectedLine);
      if (line) params.productionLineId = line.id;
    }
    
    if (selectedMachine !== "all") {
      params.machineId = parseInt(selectedMachine);
    }
    
    return params;
  }, [selectedDate, selectedLine, selectedMachine, productionLines]);

  // Fetch shift KPI data with filters
  const { data: shiftKPIData, isLoading: isLoadingShiftKPI } = trpc.shiftManager.getShiftKPIs.useQuery(
    filterParams,
    { enabled: !!selectedDate }
  );

  // Fetch machine performance data
  const { data: machinePerformanceData, isLoading: isLoadingMachines } = trpc.shiftManager.getMachinePerformance.useQuery(
    filterParams,
    { enabled: !!selectedDate }
  );

  // Fetch daily trend data
  const { data: dailyTrendData, isLoading: isLoadingTrend } = trpc.shiftManager.getDailyTrend.useQuery(
    { ...filterParams, days: compareDays },
    { enabled: !!selectedDate }
  );

  // Fetch weekly comparison data
  const { data: weeklyCompareData, isLoading: isLoadingWeekly } = trpc.shiftManager.getWeeklyCompare.useQuery(
    { ...filterParams, weeks: 4 },
    { enabled: !!selectedDate }
  );

  // Fetch KPI comparison with previous week (for alerts)
  const { data: kpiComparison } = trpc.shiftManager.compareWithPreviousWeek.useQuery(
    filterParams,
    { enabled: !!selectedDate }
  );

  // Export mutations
  const exportExcelMutation = trpc.shiftManager.exportExcel.useMutation({
    onSuccess: (data) => {
      // Download the file
      const link = document.createElement("a");
      link.href = `data:${data.mimeType};base64,${data.data}`;
      link.download = data.filename;
      link.click();
      toast.success("Xuất Excel thành công!");
      setExportDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Lỗi xuất Excel: ${error.message}`);
    },
  });

  const exportPdfMutation = trpc.shiftManager.exportPdf.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = `data:${data.mimeType};base64,${data.data}`;
      link.download = data.filename;
      link.click();
      toast.success("Xuất PDF thành công!");
      setExportDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Lỗi xuất PDF: ${error.message}`);
    },
  });

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportFormat === "excel") {
        await exportExcelMutation.mutateAsync({ ...filterParams, days: compareDays });
      } else {
        await exportPdfMutation.mutateAsync(filterParams);
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate KPIs for each shift from API data
  const shiftKPIs: ShiftKPI[] = useMemo(() => {
    if (!shiftKPIData) return [];
    return shiftKPIData.map((kpi: any) => ({
      shiftName: kpi.shiftName,
      shiftType: kpi.shiftType as ShiftType,
      avgCpk: kpi.avgCpk,
      avgOee: kpi.avgOee,
      defectRate: kpi.defectRate,
      sampleCount: kpi.sampleCount,
      violationCount: kpi.violationCount,
      productionCount: kpi.productionCount,
      status: kpi.status as ShiftKPI["status"],
    }));
  }, [shiftKPIData]);

  // Chart data for shift comparison
  const shiftChartData = useMemo(() => {
    return shiftKPIs.map((kpi) => ({
      name: kpi.shiftName,
      cpk: kpi.avgCpk || 0,
      oee: kpi.avgOee || 0,
      defectRate: kpi.defectRate,
      sampleCount: kpi.sampleCount,
      fill: SHIFT_COLORS[kpi.shiftType as keyof typeof SHIFT_COLORS] || "#6b7280",
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

  // Machine performance from API
  const machinePerformance: MachinePerformance[] = useMemo(() => {
    if (!machinePerformanceData) return [];
    return machinePerformanceData.map((m: any) => ({
      machineId: m.machineId,
      machineName: m.machineName,
      lineName: m.lineName,
      lineId: m.lineId,
      cpk: m.cpk,
      oee: m.oee,
      defectRate: m.defectRate,
      sampleCount: m.sampleCount,
      status: m.status,
    }));
  }, [machinePerformanceData]);

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

  // Reset machine filter when line changes
  useEffect(() => {
    setSelectedMachine("all");
  }, [selectedLine]);

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
          <div className="flex items-center gap-3 flex-wrap">
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
                <SelectItem value="all">Tất cả Line</SelectItem>
                {productionLines?.map((line) => (
                  <SelectItem key={line.id} value={line.name}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Máy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả Máy</SelectItem>
                {filteredMachines?.map((machine: any) => (
                  <SelectItem key={machine.id} value={String(machine.id)}>
                    {machine.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI Decline Alert */}
        {kpiComparison && (kpiComparison.cpkDeclineAlert || kpiComparison.oeeDeclineAlert) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Cảnh báo KPI giảm so với tuần trước</AlertTitle>
            <AlertDescription>
              {kpiComparison.cpkDeclineAlert && (
                <span className="block">
                  CPK giảm {Math.abs(kpiComparison.cpkChange || 0).toFixed(1)}% 
                  (từ {kpiComparison.previousWeek.avgCpk?.toFixed(2)} xuống {kpiComparison.currentWeek.avgCpk?.toFixed(2)})
                </span>
              )}
              {kpiComparison.oeeDeclineAlert && (
                <span className="block">
                  OEE giảm {Math.abs(kpiComparison.oeeChange || 0).toFixed(1)}% 
                  (từ {kpiComparison.previousWeek.avgOee?.toFixed(1)}% xuống {kpiComparison.currentWeek.avgOee?.toFixed(1)}%)
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Info */}
        {(selectedLine !== "all" || selectedMachine !== "all") && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Đang lọc theo:</span>
            {selectedLine !== "all" && (
              <Badge variant="secondary">{selectedLine}</Badge>
            )}
            {selectedMachine !== "all" && (
              <Badge variant="secondary">
                {filteredMachines?.find((m: any) => String(m.id) === selectedMachine)?.name || selectedMachine}
              </Badge>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSelectedLine("all"); setSelectedMachine("all"); }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}

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
                style={{ backgroundColor: SHIFT_COLORS[kpi.shiftType as keyof typeof SHIFT_COLORS] || "#6b7280" }}
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
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="comparison">So sánh ca</TabsTrigger>
              <TabsTrigger value="radar">Radar đa chiều</TabsTrigger>
              <TabsTrigger value="daily-trend">Xu hướng theo ngày</TabsTrigger>
              <TabsTrigger value="weekly-compare">So sánh tuần</TabsTrigger>
              <TabsTrigger value="machines">Hiệu suất máy</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>So sánh KPI giữa các ca</CardTitle>
                    <CardDescription>
                      Biểu đồ so sánh CPK, OEE và tỷ lệ lỗi giữa các ca làm việc
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedLine} onValueChange={setSelectedLine}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả Line</SelectItem>
                        {productionLines?.map((line) => (
                          <SelectItem key={line.id} value={line.name}>
                            {line.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Máy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả Máy</SelectItem>
                        {filteredMachines?.map((machine: any) => (
                          <SelectItem key={machine.id} value={String(machine.id)}>
                            {machine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Hiệu suất theo máy/dây chuyền</CardTitle>
                    <CardDescription>
                      Chi tiết hiệu suất của từng máy trong ca hiện tại
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedLine} onValueChange={setSelectedLine}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả Line</SelectItem>
                        {productionLines?.map((line) => (
                          <SelectItem key={line.id} value={line.name}>
                            {line.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                      <TableHead className="text-right">Số mẫu</TableHead>
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
                        <TableCell className="text-right">{machine.oee?.toFixed(1) || "N/A"}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {machine.defectRate.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">{machine.sampleCount}</TableCell>
                        <TableCell>{getStatusBadge(machine.status)}</TableCell>
                      </TableRow>
                    ))}
                    {machinePerformance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Không có dữ liệu máy móc
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily-trend">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Xu hướng KPI theo ngày</CardTitle>
                    <CardDescription>
                      Biểu đồ xu hướng CPK và OEE trong {compareDays} ngày gần nhất
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedLine} onValueChange={setSelectedLine}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả Line</SelectItem>
                        {productionLines?.map((line) => (
                          <SelectItem key={line.id} value={line.name}>
                            {line.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={compareDays.toString()} onValueChange={(v) => setCompareDays(parseInt(v))}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 ngày</SelectItem>
                        <SelectItem value="14">14 ngày</SelectItem>
                        <SelectItem value="30">30 ngày</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={dailyTrendData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" domain={[0, 2]} label={{ value: 'CPK', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: 'OEE (%)', angle: 90, position: 'insideRight' }} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="morning" name="Ca sáng" stroke={SHIFT_COLORS.morning} strokeWidth={2} dot={{ fill: SHIFT_COLORS.morning }} connectNulls />
                      <Line yAxisId="left" type="monotone" dataKey="afternoon" name="Ca chiều" stroke={SHIFT_COLORS.afternoon} strokeWidth={2} dot={{ fill: SHIFT_COLORS.afternoon }} connectNulls />
                      <Line yAxisId="left" type="monotone" dataKey="night" name="Ca đêm" stroke={SHIFT_COLORS.night} strokeWidth={2} dot={{ fill: SHIFT_COLORS.night }} connectNulls />
                      <Area yAxisId="right" type="monotone" dataKey="avgOee" name="OEE TB (%)" stroke="#10b981" fill="#10b981" fillOpacity={0.2} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead className="text-right">Ca sáng</TableHead>
                        <TableHead className="text-right">Ca chiều</TableHead>
                        <TableHead className="text-right">Ca đêm</TableHead>
                        <TableHead className="text-right">CPK TB</TableHead>
                        <TableHead className="text-right">OEE TB</TableHead>
                        <TableHead className="text-right">Tỷ lệ lỗi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(dailyTrendData || []).slice(0, 7).map((day: any) => (
                        <TableRow key={day.fullDate}>
                          <TableCell className="font-medium">{day.date}</TableCell>
                          <TableCell className="text-right" style={{ color: day.morning && day.morning >= 1.33 ? '#10b981' : day.morning && day.morning >= 1.0 ? '#f59e0b' : '#ef4444' }}>
                            {day.morning?.toFixed(2) || "N/A"}
                          </TableCell>
                          <TableCell className="text-right" style={{ color: day.afternoon && day.afternoon >= 1.33 ? '#10b981' : day.afternoon && day.afternoon >= 1.0 ? '#f59e0b' : '#ef4444' }}>
                            {day.afternoon?.toFixed(2) || "N/A"}
                          </TableCell>
                          <TableCell className="text-right" style={{ color: day.night && day.night >= 1.33 ? '#10b981' : day.night && day.night >= 1.0 ? '#f59e0b' : '#ef4444' }}>
                            {day.night?.toFixed(2) || "N/A"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">{day.avgCpk?.toFixed(2) || "N/A"}</TableCell>
                          <TableCell className="text-right">{day.avgOee?.toFixed(1) || "N/A"}%</TableCell>
                          <TableCell className="text-right text-red-600">{day.defectRate?.toFixed(2) || "0.00"}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly-compare">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>So sánh KPI theo tuần</CardTitle>
                    <CardDescription>
                      So sánh hiệu suất giữa các tuần trong tháng
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={selectedLine} onValueChange={setSelectedLine}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Line" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả Line</SelectItem>
                        {productionLines?.map((line) => (
                          <SelectItem key={line.id} value={line.name}>
                            {line.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyCompareData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 2]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="morningCpk" name="Ca sáng" fill={SHIFT_COLORS.morning} />
                      <Bar dataKey="afternoonCpk" name="Ca chiều" fill={SHIFT_COLORS.afternoon} />
                      <Bar dataKey="nightCpk" name="Ca đêm" fill={SHIFT_COLORS.night} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(weeklyCompareData || []).map((week: any, index: number) => (
                    <Card key={week.week} className={index === (weeklyCompareData?.length || 0) - 1 ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{week.week}</CardTitle>
                        <CardDescription className="text-xs">{week.weekRange}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">CPK TB:</span>
                            <span 
                              className="font-semibold"
                              style={{ 
                                color: week.avgCpk && week.avgCpk >= 1.33 ? "#10b981" : 
                                       week.avgCpk && week.avgCpk >= 1.0 ? "#f59e0b" : "#ef4444" 
                              }}
                            >
                              {week.avgCpk?.toFixed(2) || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">OEE TB:</span>
                            <span className="font-semibold">{week.avgOee?.toFixed(1) || "N/A"}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Tỷ lệ lỗi:</span>
                            <span className="font-semibold text-red-600">{week.defectRate?.toFixed(2) || "0.00"}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Số mẫu:</span>
                            <span className="font-semibold">{week.sampleCount?.toLocaleString() || 0}</span>
                          </div>
                        </div>
                        {index === (weeklyCompareData?.length || 0) - 1 && (
                          <Badge className="mt-2 w-full justify-center" variant="outline">
                            Tuần hiện tại
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Xuất báo cáo ca
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Xuất báo cáo Shift Manager</DialogTitle>
                    <DialogDescription>
                      Chọn định dạng và xuất báo cáo KPI theo ca
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Định dạng xuất</label>
                      <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "excel" | "pdf")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excel">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="h-4 w-4" />
                              Excel (.xlsx)
                            </div>
                          </SelectItem>
                          <SelectItem value="pdf">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              PDF (.pdf)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Ngày: {new Date(selectedDate).toLocaleDateString("vi-VN")}</p>
                      {selectedLine !== "all" && <p>Dây chuyền: {selectedLine}</p>}
                      {selectedMachine !== "all" && <p>Máy: {filteredMachines?.find((m: any) => String(m.id) === selectedMachine)?.name}</p>}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                      Hủy
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                      {isExporting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Đang xuất...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4 mr-2" />
                          Xuất báo cáo
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={() => toast.info("Tính năng đang phát triển")}>
                <Users className="h-4 w-4 mr-2" />
                Phân công nhân viên
              </Button>
              <Button variant="outline" onClick={() => toast.info("Tính năng đang phát triển")}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Xem cảnh báo
              </Button>
              <Button variant="outline" onClick={() => toast.info("Tính năng đang phát triển")}>
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
