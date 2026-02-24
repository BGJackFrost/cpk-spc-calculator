import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { FloorPlanViewer, FloorPlanConfig } from "@/components/FloorPlanViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Factory,
  Building2,
  Cpu,
  Brain,
  Sparkles,
  MapPin,
  Download,
  Settings,
  Zap,
  Bell,
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
import { RealtimeYieldDefectChart } from "@/components/RealtimeYieldDefectChart";
import { AoiAviExportButton } from "@/components/AoiAviExportButton";
import { AlertThresholdConfig } from "@/components/AlertThresholdConfig";
import { YieldDefectTrendChart, TrendDataPoint } from "@/components/YieldDefectTrendChart";

interface InspectionItem {
  id: string;
  serialNumber: string;
  machine: string;
  product: string;
  status: "pass" | "fail" | "warning";
  defectCount: number;
  cycleTime: number;
  timestamp: string;
  factoryName?: string;
  workshopName?: string;
}

export default function AviAoiDashboard() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h" | "7d">("24h");
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedFactory, setSelectedFactory] = useState("all");
  const [selectedWorkshop, setSelectedWorkshop] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [recentInspections, setRecentInspections] = useState<InspectionItem[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch factory/workshop dropdown options
  const { data: hierarchyOptions } = trpc.factoryWorkshop.getDropdownOptions.useQuery();

  // Filter workshops based on selected factory
  const filteredWorkshops = useMemo(() => {
    if (!hierarchyOptions?.workshops) return [];
    if (selectedFactory === "all") return hierarchyOptions.workshops;
    return hierarchyOptions.workshops.filter(w => w.factoryId === parseInt(selectedFactory));
  }, [hierarchyOptions?.workshops, selectedFactory]);

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

  // Reset workshop when factory changes
  useEffect(() => {
    setSelectedWorkshop("all");
  }, [selectedFactory]);

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
      .slice(0, 8)
      .map(m => ({
        id: m.id,
        name: m.name,
        status: m.status as "running" | "idle" | "maintenance" | "error" | "offline",
        oee: m.oee,
        inspections: Math.floor(m.oee * 15),
        machineType: m.machineType || 'AVI',
      }));
  }, [machinesData]);

  // Fallback machines if no data
  const displayMachines = aviAoiMachines.length > 0 ? aviAoiMachines : [
    { id: 1, name: "AVI-01", status: "running" as const, oee: 92.5, inspections: 1250, machineType: "AVI" },
    { id: 2, name: "AVI-02", status: "running" as const, oee: 88.3, inspections: 1180, machineType: "AVI" },
    { id: 3, name: "AOI-01", status: "idle" as const, oee: 0, inspections: 0, machineType: "AOI" },
    { id: 4, name: "AOI-02", status: "running" as const, oee: 95.1, inspections: 1320, machineType: "AOI" },
    { id: 5, name: "AVI-03", status: "maintenance" as const, oee: 0, inspections: 0, machineType: "AVI" },
  ];

  // AI Vision mock data
  const aiVisionStats = {
    modelsActive: 3,
    accuracy: 98.5,
    defectsDetected: 127,
    falsePositives: 2,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
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
          <div className="flex flex-wrap items-center gap-2">
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
            
            {/* Factory Filter */}
            <Select value={selectedFactory} onValueChange={setSelectedFactory}>
              <SelectTrigger className="w-[150px]">
                <Factory className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Nhà máy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhà máy</SelectItem>
                {hierarchyOptions?.factories?.map((f) => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Workshop Filter */}
            <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
              <SelectTrigger className="w-[150px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Nhà xưởng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả xưởng</SelectItem>
                {filteredWorkshops.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Time Range */}
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

            {/* Machine Filter */}
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả máy</SelectItem>
                {displayMachines.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="machines" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Trạng thái máy
            </TabsTrigger>
            <TabsTrigger value="ai-vision" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Vision
            </TabsTrigger>
            <TabsTrigger value="floor-plan" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Sơ đồ xưởng
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Realtime
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cài đặt
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {isLoading && !inspectionApiData ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Stats Cards */}
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

                {/* Charts */}
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

                {/* Defect Analysis & Recent Inspections */}
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
              </>
            )}
          </TabsContent>

          {/* Machines Tab */}
          <TabsContent value="machines" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Trạng thái máy AVI/AOI
                </CardTitle>
                <CardDescription>
                  Theo dõi realtime trạng thái từng máy kiểm tra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {displayMachines.map((machine) => (
                    <div key={machine.id} className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                      machine.status === "running" ? "border-green-500/50 bg-green-500/5" : 
                      machine.status === "idle" ? "border-yellow-500/50 bg-yellow-500/5" : 
                      machine.status === "error" ? "border-red-500/50 bg-red-500/5" : 
                      "border-blue-500/50 bg-blue-500/5"
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">{machine.name}</span>
                        </div>
                        <Badge className={
                          machine.status === "running" ? "bg-green-500" : 
                          machine.status === "idle" ? "bg-yellow-500" : 
                          machine.status === "error" ? "bg-red-500" : 
                          "bg-blue-500"
                        }>
                          {machine.status === "running" ? "Đang chạy" : 
                           machine.status === "idle" ? "Chờ" : 
                           machine.status === "error" ? "Lỗi" : "Bảo trì"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Loại: {machine.machineType}
                      </div>
                      {machine.status === "running" && (
                        <>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">OEE</span>
                              <span className="font-medium">{machine.oee.toFixed(1)}%</span>
                            </div>
                            <Progress value={machine.oee} className="h-2" />
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Kiểm tra</span>
                              <span className="font-medium">{machine.inspections.toLocaleString()}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Vision Tab */}
          <TabsContent value="ai-vision" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Models Active</p>
                      <p className="text-2xl font-bold">{aiVisionStats.modelsActive}</p>
                    </div>
                    <Brain className="h-8 w-8 text-purple-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-500/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Độ chính xác</p>
                      <p className="text-2xl font-bold text-green-500">{aiVisionStats.accuracy}%</p>
                    </div>
                    <Target className="h-8 w-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-500/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Lỗi phát hiện</p>
                      <p className="text-2xl font-bold text-red-500">{aiVisionStats.defectsDetected}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">False Positives</p>
                      <p className="text-2xl font-bold">{aiVisionStats.falsePositives}</p>
                    </div>
                    <Sparkles className="h-8 w-8 text-yellow-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Vision Analysis
                </CardTitle>
                <CardDescription>
                  Phân tích hình ảnh và phát hiện lỗi tự động bằng AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">AI Vision đang hoạt động</p>
                  <p className="text-sm">
                    Hệ thống đang phân tích hình ảnh realtime từ các máy AVI/AOI
                  </p>
                  <Button variant="outline" className="mt-4">
                    Xem chi tiết AI Vision Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Floor Plan Tab */}
          <TabsContent value="floor-plan" className="space-y-6">
            {/* Quick Navigation */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setLocation("/iot-floor-plan")}>
                <MapPin className="h-4 w-4 mr-2" />
                Sơ đồ 2D
              </Button>
              <Button variant="outline" onClick={() => setLocation("/iot-3d-floor-plan")}>
                <Layers className="h-4 w-4 mr-2" />
                Sơ đồ 3D
              </Button>
              <Button variant="outline" onClick={() => setLocation("/floor-plan-live")}>
                <Activity className="h-4 w-4 mr-2" />
                Floor Plan Live
              </Button>
              <Button variant="outline" onClick={() => setLocation("/floor-plan-heatmap")}>
                <Target className="h-4 w-4 mr-2" />
                Bản đồ Nhiệt
              </Button>
            </div>

            {/* Floor Plan Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Sơ đồ nhà xưởng - Máy AVI/AOI
                </CardTitle>
                <CardDescription>
                  Vị trí và trạng thái máy AVI/AOI trong xưởng (Xem nhanh)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mini Floor Plan with AVI/AOI machines */}
                <div className="relative w-full h-[400px] bg-muted/30 rounded-lg border overflow-hidden">
                  {/* Grid background */}
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                  }} />
                  
                  {/* Machine positions - simplified view */}
                  <div className="absolute inset-4">
                    {displayMachines.map((machine, index) => {
                      const row = Math.floor(index / 3);
                      const col = index % 3;
                      const statusColor = machine.status === 'running' ? 'bg-green-500' : 
                                          machine.status === 'idle' ? 'bg-yellow-500' : 
                                          machine.status === 'maintenance' ? 'bg-orange-500' : 'bg-red-500';
                      return (
                        <div
                          key={machine.id}
                          className={`absolute w-24 h-20 rounded-lg border-2 ${statusColor} bg-opacity-20 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-transform`}
                          style={{
                            left: `${col * 35 + 5}%`,
                            top: `${row * 45 + 10}%`,
                          }}
                          title={`${machine.name} - ${machine.status}`}
                        >
                          <Cpu className="h-6 w-6 mb-1" />
                          <span className="text-xs font-medium">{machine.name}</span>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {machine.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="absolute bottom-2 right-2 flex gap-2 bg-background/80 p-2 rounded-lg text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>Running</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-yellow-500" />
                      <span>Idle</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-orange-500" />
                      <span>Maintenance</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Machine Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {displayMachines.map((machine) => (
                <Card key={machine.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{machine.name}</span>
                      <Badge variant={machine.status === 'running' ? 'default' : 'secondary'}>
                        {machine.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>OEE:</span>
                        <span className="font-medium">{machine.oee.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kiểm tra:</span>
                        <span className="font-medium">{machine.inspections}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Realtime Tab - WebSocket Yield/Defect Chart */}
          <TabsContent value="realtime" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Biểu đồ Yield/Defect Rate Realtime
                </h2>
                <p className="text-sm text-muted-foreground">
                  Theo dõi yield rate và defect rate theo thời gian thực qua WebSocket
                </p>
              </div>
              <AoiAviExportButton
                timeRange={timeRange}
                machineId={selectedMachine !== "all" ? parseInt(selectedMachine) : undefined}
              />
            </div>

            {/* Main Realtime Chart */}
            <RealtimeYieldDefectChart
              productionLineId={selectedMachine !== "all" ? parseInt(selectedMachine) : undefined}
              productionLineName={selectedMachine !== "all" ? displayMachines.find(m => m.id.toString() === selectedMachine)?.name : undefined}
              yieldWarningThreshold={95}
              yieldCriticalThreshold={90}
              defectWarningThreshold={3}
              defectCriticalThreshold={5}
              showAlerts={true}
              height={400}
            />

            {/* Additional Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Yield Rate TB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{stats.passRate}%</p>
                  <p className="text-xs text-muted-foreground">Trong {timeRange}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Defect Rate TB
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{stats.failRate}%</p>
                  <p className="text-xs text-muted-foreground">Trong {timeRange}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    Tổng kiểm tra
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Trong {timeRange}</p>
                </CardContent>
              </Card>
            </div>

            {/* Long-term Trend Chart */}
            <YieldDefectTrendChart
              data={inspectionApiData?.recentInspections?.map((item: any) => ({
                timestamp: new Date(item.timestamp || item.createdAt).getTime(),
                date: new Date(item.timestamp || item.createdAt).toISOString().split('T')[0],
                yieldRate: item.yieldRate ?? (item.passed / (item.passed + item.failed) * 100) ?? 0,
                defectRate: item.defectRate ?? (item.failed / (item.passed + item.failed) * 100) ?? 0,
                totalInspected: item.total ?? (item.passed + item.failed) ?? 0,
                totalPassed: item.passed ?? 0,
                totalDefects: item.failed ?? 0,
              } as TrendDataPoint)) || []}
              title="Xu hướng Yield/Defect Rate dài hạn"
            />
          </TabsContent>

          {/* Settings Tab - Alert Configuration */}
          <TabsContent value="settings" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Cấu hình cảnh báo Yield/Defect
              </h2>
              <p className="text-sm text-muted-foreground">
                Thiết lập ngưỡng cảnh báo khi yield rate giảm hoặc defect rate tăng
              </p>
            </div>

            <AlertThresholdConfig
              productionLineId={selectedMachine !== "all" ? parseInt(selectedMachine) : undefined}
            />

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Xuất báo cáo
                </CardTitle>
                <CardDescription>
                  Xuất dữ liệu kiểm tra AOI/AVI ra file PDF hoặc Excel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <AoiAviExportButton
                    timeRange={timeRange}
                    machineId={selectedMachine !== "all" ? parseInt(selectedMachine) : undefined}
                    variant="pdf"
                  />
                  <AoiAviExportButton
                    timeRange={timeRange}
                    machineId={selectedMachine !== "all" ? parseInt(selectedMachine) : undefined}
                    variant="excel"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
