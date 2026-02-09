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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
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
  WifiOff,
  Bell,
  Settings,
  History,
  Package,
  Plus,
  Trash2,
  Edit,
  Loader2
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
  const { data: realtimeOEE } = useOEEUpdates(machineId);

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

  // Real SPC data from DB
  const { data: spcMachineData } = trpc.spcPlan.getSpcByMachine.useQuery(
    { machineId, limit: 50 },
    { enabled: machineId > 0 }
  );
  const spcData = useMemo(() => {
    if (!spcMachineData?.analyses?.length) return [];
    return spcMachineData.analyses.map((a: any, i: number) => ({
      id: a.id || i + 1,
      timestamp: a.createdAt ? new Date(a.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : `#${i + 1}`,
      value: a.mean ? Number(a.mean) / 1000 : 0,
      ucl: a.ucl ? Number(a.ucl) / 1000 : 0,
      lcl: a.lcl ? Number(a.lcl) / 1000 : 0,
      mean: a.mean ? Number(a.mean) / 1000 : 0,
    })).reverse();
  }, [spcMachineData]);
  const spcStats = spcMachineData?.stats;

  // Real OEE loss data from DB
  const { data: lossData = [] } = trpc.spcPlan.getOeeLossByMachine.useQuery(
    { machineId, days: 7 },
    { enabled: machineId > 0 }
  );

  // Real alerts data from DB
  const { data: machineAlerts } = trpc.spcPlan.getAlertsByMachine.useQuery(
    { machineId, days: 7 },
    { enabled: machineId > 0 }
  );

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
            <TabsTrigger value="bom">BOM Phụ tùng</TabsTrigger>
            <TabsTrigger value="maintenance">Bảo trì</TabsTrigger>
            <TabsTrigger value="alerts">Cảnh báo</TabsTrigger>
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
                  <p className={`text-2xl font-bold ${(spcStats?.avgCp || 0) >= 1.33 ? 'text-green-500' : (spcStats?.avgCp || 0) >= 1.0 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {spcStats?.avgCp?.toFixed(2) || '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Cpk</p>
                  <p className={`text-2xl font-bold ${(spcStats?.avgCpk || 0) >= 1.33 ? 'text-green-500' : (spcStats?.avgCpk || 0) >= 1.0 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {spcStats?.avgCpk?.toFixed(2) || '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng mẫu</p>
                  <p className="text-2xl font-bold">
                    {spcStats?.totalSamples?.toLocaleString() || '—'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Cảnh báo</p>
                  <p className={`text-2xl font-bold ${(spcStats?.alertCount || 0) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {spcStats?.alertCount ?? '—'}
                  </p>
                </CardContent>
              </Card>
            </div>
            {!spcMachineData?.analyses?.length && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có dữ liệu SPC cho máy này. Hãy tạo SPC Sampling Plan và liên kết với máy.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bom" className="space-y-4">
            <BomTab machineId={machineId} />
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

          <TabsContent value="alerts" className="space-y-4">
            {/* Alert History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Lịch sử cảnh báo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {machineAlerts && machineAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {machineAlerts.slice(0, 10).map((alert: any) => (
                      <div key={alert.id} className={`flex items-center justify-between p-3 border-l-4 ${
                        alert.severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                      } rounded-r-lg`}>
                        <div>
                          <p className="font-medium">{alert.alertType?.replace(/_/g, ' ') || 'Cảnh báo'}</p>
                          <p className="text-sm text-muted-foreground">{alert.message || 'Không có chi tiết'}</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.createdAt ? new Date(alert.createdAt).toLocaleString('vi-VN') : ''}
                          </p>
                        </div>
                        <Badge className={alert.severity === 'critical' ? 'bg-red-500' : 'bg-yellow-500'}>
                          {alert.severity === 'critical' ? 'Nghiêm trọng' : 'Cảnh báo'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Không có cảnh báo nào trong 7 ngày qua</p>
                )}
              </CardContent>
            </Card>

            {/* Alert Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Tổng cảnh báo</p>
                  <p className="text-2xl font-bold">{machineAlerts?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">7 ngày qua</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Nghiêm trọng</p>
                  <p className="text-2xl font-bold text-red-500">{machineAlerts?.filter((a: any) => a.severity === 'critical').length || 0}</p>
                  <p className="text-xs text-muted-foreground">Cần xử lý ngay</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Cảnh báo</p>
                  <p className="text-2xl font-bold text-yellow-500">{machineAlerts?.filter((a: any) => a.severity === 'warning').length || 0}</p>
                  <p className="text-xs text-muted-foreground">Cần theo dõi</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-muted-foreground">Đã xác nhận</p>
                  <p className="text-2xl font-bold text-green-500">{machineAlerts?.filter((a: any) => a.acknowledgedAt).length || 0}</p>
                  <p className="text-xs text-muted-foreground">Hoàn thành</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// BOM Tab Component
function BomTab({ machineId }: { machineId: number }) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedSparePartId, setSelectedSparePartId] = useState<number | null>(null);
  const [bomQuantity, setBomQuantity] = useState(1);
  const [isRequired, setIsRequired] = useState(true);
  const [replacementInterval, setReplacementInterval] = useState<number | null>(null);
  const [bomNotes, setBomNotes] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);

  // Queries
  const { data: bomItems, isLoading, refetch } = trpc.machine.getBom.useQuery({ machineId });
  const { data: bomSummary } = trpc.machine.getBomSummary.useQuery({ machineId });
  const { data: spareParts } = trpc.spareParts.listParts.useQuery({});

  // Mutations
  const addBomItem = trpc.machine.addBomItem.useMutation({
    onSuccess: () => {
      toast.success("Thêm phụ tùng vào BOM thành công");
      refetch();
      resetForm();
      setIsAddDialogOpen(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateBomItem = trpc.machine.updateBomItem.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật thành công");
      refetch();
      setEditingItem(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteBomItem = trpc.machine.deleteBomItem.useMutation({
    onSuccess: () => {
      toast.success("Xóa phụ tùng khỏi BOM thành công");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const exportBomExcel = trpc.machine.exportBomExcel.useMutation({
    onSuccess: (data) => {
      // Download file
      const link = document.createElement("a");
      link.href = `data:${data.mimeType};base64,${data.data}`;
      link.download = data.filename;
      link.click();
      toast.success("Xuất Excel thành công");
    },
    onError: (error) => toast.error(error.message),
  });

  const exportBomPdf = trpc.machine.exportBomPdf.useMutation({
    onSuccess: (data) => {
      // Open HTML in new tab for printing
      const newWindow = window.open();
      if (newWindow) {
        newWindow.document.write(atob(data.data));
        newWindow.document.close();
        newWindow.print();
      }
      toast.success("Xuất PDF thành công - Vui lòng in hoặc lưu dưới dạng PDF");
    },
    onError: (error) => toast.error(error.message),
  });

  const resetForm = () => {
    setSelectedSparePartId(null);
    setBomQuantity(1);
    setIsRequired(true);
    setReplacementInterval(null);
    setBomNotes("");
  };

  const handleAddBomItem = () => {
    if (!selectedSparePartId) {
      toast.error("Vui lòng chọn phụ tùng");
      return;
    }
    addBomItem.mutate({
      machineId,
      sparePartId: selectedSparePartId,
      quantity: bomQuantity,
      isRequired: isRequired ? 1 : 0,
      replacementInterval: replacementInterval || undefined,
      notes: bomNotes || undefined,
    });
  };

  const handleUpdateBomItem = () => {
    if (!editingItem) return;
    updateBomItem.mutate({
      id: editingItem.id,
      quantity: editingItem.quantity,
      isRequired: editingItem.isRequired,
      replacementInterval: editingItem.replacementInterval,
      notes: editingItem.notes,
    });
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Tổng phụ tùng</p>
            <p className="text-2xl font-bold">{bomSummary?.totalItems || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Bắt buộc</p>
            <p className="text-2xl font-bold text-blue-500">{bomSummary?.requiredItems || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Tồn kho thấp</p>
            <p className="text-2xl font-bold text-red-500">{bomSummary?.lowStockItems || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">Tổng giá trị</p>
            <p className="text-2xl font-bold text-green-500">
              {new Intl.NumberFormat('vi-VN').format(bomSummary?.totalValue || 0)} đ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* BOM List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Danh sách phụ tùng BOM
            </CardTitle>
            <CardDescription>Danh sách phụ tùng cần thiết cho máy</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => exportBomExcel.mutate({ machineId })}
              disabled={exportBomExcel.isPending || !bomItems?.length}
            >
              {exportBomExcel.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Xuất Excel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => exportBomPdf.mutate({ machineId })}
              disabled={exportBomPdf.isPending || !bomItems?.length}
            >
              {exportBomPdf.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Xuất PDF
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm phụ tùng
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : bomItems && bomItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Mã PT</th>
                    <th className="text-left p-2">Tên phụ tùng</th>
                    <th className="text-center p-2">SL cần</th>
                    <th className="text-center p-2">Tồn kho</th>
                    <th className="text-center p-2">Trạng thái</th>
                    <th className="text-center p-2">Bắt buộc</th>
                    <th className="text-center p-2">Chu kỳ thay</th>
                    <th className="text-right p-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {bomItems.map((item: any) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-sm">{item.sparePartCode}</td>
                      <td className="p-2">{item.sparePartName}</td>
                      <td className="p-2 text-center">{item.quantity} {item.sparePartUnit}</td>
                      <td className="p-2 text-center">
                        <span className={item.currentStock < (item.minStock || 0) ? "text-red-500 font-bold" : ""}>
                          {item.currentStock}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {item.currentStock >= item.quantity ? (
                          <Badge className="bg-green-500">Đủ</Badge>
                        ) : item.currentStock > 0 ? (
                          <Badge className="bg-yellow-500">Thiếu</Badge>
                        ) : (
                          <Badge className="bg-red-500">Hết</Badge>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {item.isRequired ? (
                          <Badge variant="outline">Bắt buộc</Badge>
                        ) : (
                          <Badge variant="secondary">Tùy chọn</Badge>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {item.replacementInterval ? `${item.replacementInterval} ngày` : "-"}
                      </td>
                      <td className="p-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Xác nhận xóa phụ tùng này khỏi BOM?")) {
                                deleteBomItem.mutate({ id: item.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có phụ tùng nào trong BOM</p>
              <p className="text-sm">Click "Thêm phụ tùng" để bắt đầu</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add BOM Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm phụ tùng vào BOM</DialogTitle>
            <DialogDescription>Chọn phụ tùng và cấu hình số lượng cần thiết</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Phụ tùng</Label>
              <Select
                value={selectedSparePartId?.toString() || ""}
                onValueChange={(v) => setSelectedSparePartId(parseInt(v))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Chọn phụ tùng" />
                </SelectTrigger>
                <SelectContent>
                  {spareParts?.filter((sp: any) => sp.isActive === 1).map((sp: any) => (
                    <SelectItem key={sp.id} value={sp.id.toString()}>
                      {sp.partNumber} - {sp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Số lượng cần</Label>
                <Input
                  type="number"
                  min={1}
                  value={bomQuantity}
                  onChange={(e) => setBomQuantity(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Chu kỳ thay (ngày)</Label>
                <Input
                  type="number"
                  min={1}
                  value={replacementInterval || ""}
                  onChange={(e) => setReplacementInterval(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Tùy chọn"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRequired"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isRequired">Phụ tùng bắt buộc</Label>
            </div>
            <div>
              <Label>Ghi chú</Label>
              <Input
                value={bomNotes}
                onChange={(e) => setBomNotes(e.target.value)}
                placeholder="Ghi chú thêm..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleAddBomItem} disabled={addBomItem.isPending}>
              {addBomItem.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit BOM Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa phụ tùng BOM</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label>Phụ tùng</Label>
                <p className="font-medium">{editingItem.sparePartCode} - {editingItem.sparePartName}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Số lượng cần</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Chu kỳ thay (ngày)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingItem.replacementInterval || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, replacementInterval: e.target.value ? parseInt(e.target.value) : null })}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingItem.isRequired === 1}
                  onChange={(e) => setEditingItem({ ...editingItem, isRequired: e.target.checked ? 1 : 0 })}
                  className="rounded"
                />
                <Label>Phụ tùng bắt buộc</Label>
              </div>
              <div>
                <Label>Ghi chú</Label>
                <Input
                  value={editingItem.notes || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Hủy</Button>
            <Button onClick={handleUpdateBomItem} disabled={updateBomItem.isPending}>
              {updateBomItem.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
