import { useState, useMemo, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Camera,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  BarChart3,
  RefreshCw,
  Target,
  Layers,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useAviAoiSSE, InspectionResultData, DefectDetectedData, AviAoiStatsData } from "@/hooks/useRealtimeSSE";
import { useToast } from "@/hooks/use-toast";

interface InspectionItem {
  id: string;
  serialNumber: string;
  machine: string;
  product: string;
  status: "pass" | "fail" | "warning";
  defectCount: number;
  cycleTime: number;
  timestamp: string;
}

export default function AviAoiDashboard() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [recentInspections, setRecentInspections] = useState<InspectionItem[]>([]);

  // Fetch inspection data from API
  const { data: inspectionApiData, isLoading, refetch } = trpc.realtime.getInspectionData.useQuery(
    { 
      timeRange,
      machineId: selectedMachine !== "all" ? parseInt(selectedMachine) : undefined,
    },
    {
      refetchInterval: autoRefresh ? 5000 : false,
      staleTime: 1000,
    }
  );

  // SSE for realtime updates
  const { isConnected, error: sseError } = useAviAoiSSE({
    enabled: autoRefresh,
    onInspectionResult: useCallback((data: InspectionResultData) => {
      // Add new inspection to the list
      setRecentInspections((prev) => {
        const newInspection: InspectionItem = {
          id: data.inspectionId,
          serialNumber: data.serialNumber,
          machine: data.machineName,
          product: data.productName || 'Unknown',
          status: data.result,
          defectCount: data.defectCount,
          cycleTime: data.cycleTime,
          timestamp: new Date().toLocaleTimeString("vi-VN"),
        };
        return [newInspection, ...prev.slice(0, 19)];
      });
    }, []),
    onDefectDetected: useCallback((data: DefectDetectedData) => {
      // Show toast for critical defects
      if (data.severity === 'critical' || data.severity === 'high') {
        toast({
          title: "Phát hiện lỗi nghiêm trọng",
          description: `${data.defectType} tại máy ${data.machineName}`,
          variant: "destructive",
        });
      }
    }, [toast]),
    onStatsUpdate: useCallback((data: AviAoiStatsData) => {
      console.log('[AviAoiDashboard] Stats update received:', data);
    }, []),
  });

  // Update recent inspections when API data changes
  useEffect(() => {
    if (inspectionApiData?.recentInspections) {
      setRecentInspections(inspectionApiData.recentInspections);
    }
  }, [inspectionApiData]);

  // Show SSE connection status
  useEffect(() => {
    if (sseError) {
      toast({
        title: "Lỗi kết nối realtime",
        description: "Không thể kết nối SSE. Đang sử dụng polling thay thế.",
        variant: "destructive",
      });
    }
  }, [sseError, toast]);

  const inspectionData = useMemo(() => {
    return inspectionApiData?.trendData || [];
  }, [inspectionApiData]);

  const defectTypeData = useMemo(() => {
    return inspectionApiData?.defectTypes || [];
  }, [inspectionApiData]);

  const stats = useMemo(() => {
    if (inspectionApiData?.stats) {
      return inspectionApiData.stats;
    }
    return {
      total: 0,
      pass: 0,
      fail: 0,
      warning: 0,
      passRate: "0.0",
      failRate: "0.0",
    };
  }, [inspectionApiData]);

  const pieData = [
    { name: "Đạt", value: parseFloat(stats.passRate), color: "#22c55e" },
    { name: "Không đạt", value: parseFloat(stats.failRate), color: "#ef4444" },
    { name: "Cảnh báo", value: Math.max(0, 100 - parseFloat(stats.passRate) - parseFloat(stats.failRate)), color: "#f59e0b" },
  ];

  // Fetch machines for machine status section
  const { data: machinesData } = trpc.realtime.getMachinesWithStatus.useQuery(
    {},
    {
      refetchInterval: autoRefresh ? 10000 : false,
      staleTime: 5000,
    }
  );

  const aviAoiMachines = useMemo(() => {
    if (!machinesData) return [];
    return machinesData
      .filter(m => m.machineType?.includes('AVI') || m.machineType?.includes('AOI') || m.name.includes('AVI') || m.name.includes('AOI'))
      .slice(0, 5)
      .map(m => ({
        name: m.name,
        status: m.status as "running" | "idle" | "maintenance" | "error" | "offline",
        oee: m.oee,
        inspections: Math.floor(m.oee * 15), // Estimate based on OEE
      }));
  }, [machinesData]);

  // Fallback machines if no data
  const displayMachines = aviAoiMachines.length > 0 ? aviAoiMachines : [
    { name: "AVI-01", status: "running" as const, oee: 92.5, inspections: 1250 },
    { name: "AVI-02", status: "running" as const, oee: 88.3, inspections: 1180 },
    { name: "AOI-01", status: "idle" as const, oee: 0, inspections: 0 },
    { name: "AOI-02", status: "running" as const, oee: 95.1, inspections: 1320 },
    { name: "AVI-03", status: "maintenance" as const, oee: 0, inspections: 0 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Camera className="h-8 w-8 text-primary" />
              AVI/AOI Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Tổng hợp thông tin kiểm tra từ hệ thống AVI/AOI
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* SSE Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  Realtime
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Polling
                </Badge>
              )}
            </div>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as "1h" | "6h" | "24h" | "7d")}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ</SelectItem>
                <SelectItem value="6h">6 giờ</SelectItem>
                <SelectItem value="24h">24 giờ</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả máy</SelectItem>
                {displayMachines.map((m) => (
                  <SelectItem key={m.name} value={m.name.toLowerCase().replace('-', '')}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="icon"
              onClick={() => {
                if (autoRefresh) {
                  setAutoRefresh(false);
                } else {
                  setAutoRefresh(true);
                  refetch();
                }
              }}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
              )}
            </Button>
          </div>
        </div>

        {isLoading && !inspectionApiData ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng kiểm tra</p>
                      <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                    </div>
                    <Activity className="h-8 w-8 text-primary opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-500/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Đạt</p>
                      <p className="text-2xl font-bold text-green-500">{stats.pass.toLocaleString()}</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-500/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Không đạt</p>
                      <p className="text-2xl font-bold text-red-500">{stats.fail.toLocaleString()}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Cảnh báo</p>
                      <p className="text-2xl font-bold text-yellow-500">{stats.warning.toLocaleString()}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tỷ lệ đạt</p>
                      <p className="text-2xl font-bold">{stats.passRate}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tỷ lệ lỗi</p>
                      <p className="text-2xl font-bold">{stats.failRate}%</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Xu hướng kiểm tra
                  </CardTitle>
                  <CardDescription>Số lượng kiểm tra theo thời gian</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {inspectionData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={inspectionData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="time" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Area type="monotone" dataKey="pass" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Đạt" />
                          <Area type="monotone" dataKey="warning" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Cảnh báo" />
                          <Area type="monotone" dataKey="fail" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Không đạt" />
                          <Legend />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Chưa có dữ liệu
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Tỷ lệ kết quả
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Phân tích loại lỗi
                  </CardTitle>
                  <CardDescription>Top loại lỗi phát hiện</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {defectTypeData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={defectTypeData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" className="text-xs" />
                          <YAxis dataKey="name" type="category" className="text-xs" width={80} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Số lượng" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        Chưa có dữ liệu lỗi
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Kiểm tra gần đây
                    {isConnected && (
                      <Badge variant="outline" className="ml-2 text-green-600 border-green-600 text-xs">
                        Live
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>20 kết quả kiểm tra mới nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {recentInspections.length > 0 ? (
                        recentInspections.map((inspection) => (
                          <div key={inspection.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${inspection.status === "pass" ? "bg-green-500" : inspection.status === "fail" ? "bg-red-500" : "bg-yellow-500"}`} />
                              <div>
                                <p className="text-sm font-medium">{inspection.serialNumber}</p>
                                <p className="text-xs text-muted-foreground">{inspection.machine} • {inspection.product}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={inspection.status === "pass" ? "default" : inspection.status === "fail" ? "destructive" : "secondary"} className={inspection.status === "pass" ? "bg-green-500" : inspection.status === "warning" ? "bg-yellow-500" : ""}>
                                {inspection.status === "pass" ? "Đạt" : inspection.status === "fail" ? "Lỗi" : "Cảnh báo"}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">{inspection.timestamp}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-full py-8 text-muted-foreground">
                          Chưa có dữ liệu kiểm tra
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Trạng thái máy AVI/AOI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {displayMachines.map((machine) => (
                    <div key={machine.name} className={`p-4 rounded-lg border ${machine.status === "running" ? "border-green-500/50 bg-green-500/10" : machine.status === "idle" ? "border-yellow-500/50 bg-yellow-500/10" : machine.status === "error" ? "border-red-500/50 bg-red-500/10" : "border-blue-500/50 bg-blue-500/10"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{machine.name}</span>
                        <Badge className={machine.status === "running" ? "bg-green-500" : machine.status === "idle" ? "bg-yellow-500" : machine.status === "error" ? "bg-red-500" : "bg-blue-500"}>
                          {machine.status === "running" ? "Đang chạy" : machine.status === "idle" ? "Chờ" : machine.status === "error" ? "Lỗi" : "Bảo trì"}
                        </Badge>
                      </div>
                      {machine.status === "running" && (
                        <>
                          <div className="text-sm text-muted-foreground mb-1">OEE: <span className="font-medium text-foreground">{machine.oee.toFixed(1)}%</span></div>
                          <Progress value={machine.oee} className="h-1" />
                          <div className="text-xs text-muted-foreground mt-2">{machine.inspections.toLocaleString()} kiểm tra</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
