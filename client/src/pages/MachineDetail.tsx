import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { OEETrendChart } from "@/components/OEETrendChart";
import { useMachineStatus, useOEEUpdates } from "@/hooks/useWebSocket";
import {
  Activity,
  Gauge,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  BarChart3,
  Download,
  RefreshCw,
  ArrowLeft,
  Wifi,
  WifiOff
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  BarChart,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function MachineDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const machineId = parseInt(params.id || "0");
  const [timeRange, setTimeRange] = useState<"1h" | "8h" | "24h" | "7d">("8h");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch machine data
  const { data: machines, isLoading: machineLoading } = trpc.machine.listAll.useQuery();
  const machine = machines?.find((m: any) => m.id === machineId);

  // Fetch OEE records for this machine
  const { data: oeeRecords } = trpc.oee.listRecords.useQuery(
    { machineId, limit: 50 },
    { enabled: machineId > 0 }
  );

  // Fetch maintenance history
  const { data: maintenanceHistory } = trpc.maintenance.listWorkOrders.useQuery(
    { machineId, limit: 20 },
    { enabled: machineId > 0 }
  );

  // WebSocket realtime updates
  const { isConnected, status: realtimeStatus } = useMachineStatus(machineId);
  const { oeeData: realtimeOEE } = useOEEUpdates(machineId);

  // Process OEE data for charts
  const oeeChartData = useMemo(() => {
    if (!oeeRecords || !Array.isArray(oeeRecords)) return [];
    return oeeRecords.map((record: any) => ({
      timestamp: new Date(record.recordDate),
      oee: record.oee / 100,
      availability: record.availability / 100,
      performance: record.performance / 100,
      quality: record.quality / 100
    })).reverse();
  }, [oeeRecords]);

  // Calculate OEE statistics
  const oeeStats = useMemo(() => {
    if (!oeeRecords || !Array.isArray(oeeRecords) || oeeRecords.length === 0) {
      return { avgOEE: 0, avgAvailability: 0, avgPerformance: 0, avgQuality: 0 };
    }
    const records = oeeRecords;
    return {
      avgOEE: records.reduce((sum: number, r: any) => sum + r.oee, 0) / records.length,
      avgAvailability: records.reduce((sum: number, r: any) => sum + r.availability, 0) / records.length,
      avgPerformance: records.reduce((sum: number, r: any) => sum + r.performance, 0) / records.length,
      avgQuality: records.reduce((sum: number, r: any) => sum + r.quality, 0) / records.length
    };
  }, [oeeRecords]);

  // Demo SPC data
  const spcData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      timestamp: new Date(Date.now() - (30 - i) * 5 * 60 * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      value: 50 + Math.random() * 10 - 5,
      ucl: 55,
      lcl: 45,
      mean: 50
    }));
  }, []);

  // Demo loss data
  const lossData = [
    { name: "Hỏng thiết bị", value: 25, color: "#ef4444" },
    { name: "Cài đặt/Điều chỉnh", value: 15, color: "#f97316" },
    { name: "Chạy không tải", value: 20, color: "#eab308" },
    { name: "Giảm tốc độ", value: 18, color: "#22c55e" },
    { name: "Lỗi quy trình", value: 12, color: "#3b82f6" },
    { name: "Giảm năng suất khởi động", value: 10, color: "#8b5cf6" }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return <Badge className="bg-green-500">Đang chạy</Badge>;
      case "idle":
        return <Badge className="bg-yellow-500">Chờ</Badge>;
      case "maintenance":
        return <Badge className="bg-blue-500">Bảo trì</Badge>;
      case "error":
        return <Badge className="bg-red-500">Lỗi</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  if (machineLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/machines")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{machine?.name || `Máy #${machineId}`}</h1>
              <p className="text-muted-foreground">{machine?.code || ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="gap-1">
                <Wifi className="h-3 w-3 text-green-500" />
                Realtime
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <WifiOff className="h-3 w-3 text-red-500" />
                Offline
              </Badge>
            )}
            {getStatusBadge(realtimeStatus?.status || machine?.status || "unknown")}
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ</SelectItem>
                <SelectItem value="8h">8 giờ</SelectItem>
                <SelectItem value="24h">24 giờ</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OEE Hiện tại</p>
                  <p className="text-2xl font-bold">{oeeStats.avgOEE.toFixed(1)}%</p>
                </div>
                <Gauge className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <p className="text-2xl font-bold">{oeeStats.avgAvailability.toFixed(1)}%</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <p className="text-2xl font-bold">{oeeStats.avgPerformance.toFixed(1)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality</p>
                  <p className="text-2xl font-bold">{oeeStats.avgQuality.toFixed(1)}%</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="oee">OEE Chi tiết</TabsTrigger>
            <TabsTrigger value="spc">SPC</TabsTrigger>
            <TabsTrigger value="maintenance">Bảo trì</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* OEE Trend */}
              <OEETrendChart
                data={oeeChartData}
                title="Xu hướng OEE"
                description="Theo dõi OEE theo thời gian"
                height={250}
              />

              {/* 6 Big Losses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">6 Big Losses</CardTitle>
                  <CardDescription>Phân tích nguyên nhân mất OEE</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={lossData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {lossData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SPC Quick View */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">SPC Realtime</CardTitle>
                <CardDescription>Biểu đồ kiểm soát quá trình</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={spcData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                      <YAxis domain={[40, 60]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <ReferenceLine y={55} stroke="#ef4444" strokeDasharray="5 5" label="UCL" />
                      <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="5 5" label="LCL" />
                      <ReferenceLine y={50} stroke="#22c55e" label="Mean" />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="oee" className="space-y-4">
            <OEETrendChart
              data={oeeChartData}
              title="OEE Chi tiết"
              description="Phân tích chi tiết các thành phần OEE"
              showComponents={true}
              height={350}
            />

            {/* OEE Components Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-500">{oeeStats.avgAvailability.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Thời gian máy chạy thực tế / Thời gian kế hoạch
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Downtime không kế hoạch</span>
                      <span className="text-red-500">-5.2%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cài đặt/Điều chỉnh</span>
                      <span className="text-orange-500">-3.1%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-yellow-500" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-500">{oeeStats.avgPerformance.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Tốc độ thực tế / Tốc độ lý thuyết
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Chạy không tải</span>
                      <span className="text-red-500">-4.8%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Giảm tốc độ</span>
                      <span className="text-orange-500">-2.5%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-purple-500" />
                    Quality
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-500">{oeeStats.avgQuality.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Sản phẩm đạt / Tổng sản phẩm
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Phế phẩm</span>
                      <span className="text-red-500">-1.2%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sản phẩm cần sửa</span>
                      <span className="text-orange-500">-0.8%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="spc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Biểu đồ X-bar</CardTitle>
                <CardDescription>Kiểm soát giá trị trung bình</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={spcData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} />
                      <YAxis domain={[40, 60]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={55} stroke="#ef4444" strokeDasharray="5 5" label="UCL" />
                      <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="5 5" label="LCL" />
                      <ReferenceLine y={50} stroke="#22c55e" label="CL" />
                      <Area type="monotone" dataKey="value" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" name="Giá trị" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* SPC Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Cp</p>
                  <p className="text-2xl font-bold">1.45</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Cpk</p>
                  <p className="text-2xl font-bold text-green-500">1.33</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Pp</p>
                  <p className="text-2xl font-bold">1.38</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Ppk</p>
                  <p className="text-2xl font-bold text-green-500">1.25</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Lịch sử bảo trì
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceHistory && Array.isArray(maintenanceHistory) && maintenanceHistory.length > 0 ? (
                    maintenanceHistory.map((wo: any) => (
                      <div key={wo.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{wo.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(wo.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <Badge variant={wo.status === 'completed' ? 'default' : 'outline'}>
                          {wo.status === 'completed' ? 'Hoàn thành' : 
                           wo.status === 'in_progress' ? 'Đang thực hiện' : 'Chờ xử lý'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Chưa có lịch sử bảo trì
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Lịch bảo trì sắp tới
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">Bảo trì định kỳ</p>
                      <p className="text-sm text-muted-foreground">Kiểm tra và bôi trơn</p>
                    </div>
                    <Badge className="bg-yellow-500">Trong 3 ngày</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                      <p className="font-medium">Thay thế linh kiện</p>
                      <p className="text-sm text-muted-foreground">Thay bạc đạn trục chính</p>
                    </div>
                    <Badge className="bg-blue-500">Trong 7 ngày</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
