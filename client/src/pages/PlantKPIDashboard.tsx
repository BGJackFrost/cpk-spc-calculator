import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Activity, TrendingUp, TrendingDown, Target, Clock, Wrench,
  AlertTriangle, CheckCircle, Factory, Gauge, BarChart3, 
  RefreshCw, Download, Zap, Package, Users, DollarSign
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar, RadialBarChart, RadialBar,
  ComposedChart, Line
} from "recharts";

// Demo data for KPIs
const generateKPIData = () => {
  const today = new Date();
  const data = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      oee: 75 + Math.random() * 15,
      availability: 85 + Math.random() * 10,
      performance: 88 + Math.random() * 10,
      quality: 95 + Math.random() * 4,
      mtbf: 100 + Math.random() * 50,
      mttr: 2 + Math.random() * 3,
      downtime: 10 + Math.random() * 20,
      production: 800 + Math.random() * 400,
    });
  }
  return data;
};

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PlantKPIDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [selectedArea, setSelectedArea] = useState("all");

  // Queries
  const { data: machines } = trpc.machine.listAll.useQuery();
  const { data: oeeRecords } = trpc.oee.listRecords.useQuery({});
  const { data: workOrders } = trpc.maintenance.listWorkOrders.useQuery({});
  const { data: maintenanceStats } = trpc.maintenance.getStats.useQuery({});

  const kpiData = useMemo(() => generateKPIData(), []);
  
  // Calculate current KPIs
  const currentKPIs = useMemo(() => {
    const latest = kpiData[kpiData.length - 1];
    const previous = kpiData[kpiData.length - 2];
    
    return {
      oee: { value: latest.oee, change: latest.oee - previous.oee, target: 85 },
      availability: { value: latest.availability, change: latest.availability - previous.availability, target: 90 },
      performance: { value: latest.performance, change: latest.performance - previous.performance, target: 95 },
      quality: { value: latest.quality, change: latest.quality - previous.quality, target: 99 },
      mtbf: { value: latest.mtbf, change: latest.mtbf - previous.mtbf, target: 150 },
      mttr: { value: latest.mttr, change: previous.mttr - latest.mttr, target: 2 },
    };
  }, [kpiData]);

  // Maintenance KPIs
  const maintenanceKPIs = useMemo(() => {
    if (!workOrders) return { total: 0, completed: 0, pending: 0, overdue: 0, preventiveRatio: 0 };
    
    const total = workOrders.length;
    const completed = workOrders.filter(w => w.status === "completed").length;
    const pending = workOrders.filter(w => w.status === "pending").length;
    const overdue = workOrders.filter(w => 
      w.status !== "completed" && w.scheduledStartAt && new Date(w.scheduledStartAt) < new Date()
    ).length;
    const preventive = workOrders.filter(w => w.typeCategory === "preventive").length;
    
    return {
      total,
      completed,
      pending,
      overdue,
      preventiveRatio: total > 0 ? (preventive / total) * 100 : 0,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }, [workOrders]);

  // Machine status distribution
  const machineStatusData = useMemo(() => {
    if (!machines) return [];
    
    const statusCount: Record<string, number> = {};
    machines.forEach(m => {
      const status = m.status || "unknown";
      statusCount[status] = (statusCount[status] || 0) + 1;
    });
    
    return Object.entries(statusCount).map(([name, value]) => ({
      name: name === "running" ? "Đang chạy" :
            name === "idle" ? "Chờ" :
            name === "maintenance" ? "Bảo trì" :
            name === "stopped" ? "Dừng" : name,
      value,
      fill: name === "running" ? "#22c55e" :
            name === "idle" ? "#f59e0b" :
            name === "maintenance" ? "#3b82f6" :
            name === "stopped" ? "#ef4444" : "#94a3b8",
    }));
  }, [machines]);

  // Work order type distribution
  const workOrderTypeData = useMemo(() => {
    if (!workOrders) return [];
    
    const typeCount: Record<string, number> = {};
    workOrders.forEach(w => {
      const type = w.typeCategory || "other";
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    return Object.entries(typeCount).map(([name, value]) => ({
      name: name === "preventive" ? "Định kỳ" :
            name === "corrective" ? "Sửa chữa" :
            name === "predictive" ? "Dự đoán" : name,
      value,
      fill: name === "preventive" ? "#3b82f6" :
            name === "corrective" ? "#f59e0b" :
            name === "predictive" ? "#8b5cf6" : "#94a3b8",
    }));
  }, [workOrders]);

  const getKPIStatus = (value: number, target: number, higherIsBetter = true) => {
    const ratio = value / target;
    if (higherIsBetter) {
      if (ratio >= 1) return { color: "text-green-500", bg: "bg-green-500", label: "Đạt" };
      if (ratio >= 0.9) return { color: "text-yellow-500", bg: "bg-yellow-500", label: "Gần đạt" };
      return { color: "text-red-500", bg: "bg-red-500", label: "Chưa đạt" };
    } else {
      if (ratio <= 1) return { color: "text-green-500", bg: "bg-green-500", label: "Đạt" };
      if (ratio <= 1.2) return { color: "text-yellow-500", bg: "bg-yellow-500", label: "Gần đạt" };
      return { color: "text-red-500", bg: "bg-red-500", label: "Chưa đạt" };
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard KPI Nhà máy</h1>
            <p className="text-muted-foreground">
              Tổng quan các chỉ số hiệu suất chính của toàn bộ nhà máy
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
                <SelectItem value="1y">1 năm</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* OEE */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Gauge className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className={getKPIStatus(currentKPIs.oee.value, currentKPIs.oee.target).color}>
                  {getKPIStatus(currentKPIs.oee.value, currentKPIs.oee.target).label}
                </Badge>
              </div>
              <div className="text-2xl font-bold">{currentKPIs.oee.value.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">OEE</p>
              <div className="flex items-center gap-1 text-xs mt-1">
                {currentKPIs.oee.change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={currentKPIs.oee.change >= 0 ? "text-green-500" : "text-red-500"}>
                  {currentKPIs.oee.change >= 0 ? "+" : ""}{currentKPIs.oee.change.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Mục tiêu: {currentKPIs.availability.target}%</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{currentKPIs.availability.value.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Availability</p>
              <Progress value={currentKPIs.availability.value} className="mt-2 h-1" />
            </CardContent>
          </Card>

          {/* Performance */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Mục tiêu: {currentKPIs.performance.target}%</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{currentKPIs.performance.value.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Performance</p>
              <Progress value={currentKPIs.performance.value} className="mt-2 h-1" />
            </CardContent>
          </Card>

          {/* Quality */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Package className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">Mục tiêu: {currentKPIs.quality.target}%</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{currentKPIs.quality.value.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Quality</p>
              <Progress value={currentKPIs.quality.value} className="mt-2 h-1" />
            </CardContent>
          </Card>

          {/* MTBF */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="h-4 w-4 text-cyan-500" />
                <Badge variant="outline" className={getKPIStatus(currentKPIs.mtbf.value, currentKPIs.mtbf.target).color}>
                  {getKPIStatus(currentKPIs.mtbf.value, currentKPIs.mtbf.target).label}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-cyan-600">{currentKPIs.mtbf.value.toFixed(0)}h</div>
              <p className="text-xs text-muted-foreground">MTBF</p>
              <p className="text-xs text-muted-foreground mt-1">Mục tiêu: {currentKPIs.mtbf.target}h</p>
            </CardContent>
          </Card>

          {/* MTTR */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <Wrench className="h-4 w-4 text-orange-500" />
                <Badge variant="outline" className={getKPIStatus(currentKPIs.mttr.value, currentKPIs.mttr.target, false).color}>
                  {getKPIStatus(currentKPIs.mttr.value, currentKPIs.mttr.target, false).label}
                </Badge>
              </div>
              <div className="text-2xl font-bold text-orange-600">{currentKPIs.mttr.value.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">MTTR</p>
              <p className="text-xs text-muted-foreground mt-1">Mục tiêu: ≤{currentKPIs.mttr.target}h</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OEE Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng OEE</CardTitle>
              <CardDescription>OEE và các thành phần trong 30 ngày qua</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={kpiData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('vi-VN')}
                      formatter={(value: number) => [`${value.toFixed(1)}%`]}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="availability" name="Availability" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" />
                    <Area type="monotone" dataKey="performance" name="Performance" fill="#22c55e" fillOpacity={0.1} stroke="#22c55e" />
                    <Area type="monotone" dataKey="quality" name="Quality" fill="#a855f7" fillOpacity={0.1} stroke="#a855f7" />
                    <Line type="monotone" dataKey="oee" name="OEE" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Machine Status */}
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái Máy móc</CardTitle>
              <CardDescription>Phân bố trạng thái {machines?.length || 0} máy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={machineStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {machineStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
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

        {/* Maintenance KPIs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Maintenance Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Thống kê Bảo trì</CardTitle>
              <CardDescription>Tổng quan công việc bảo trì</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tổng công việc</span>
                  <span className="font-bold">{maintenanceKPIs.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Hoàn thành
                  </span>
                  <span className="font-bold text-green-600">{maintenanceKPIs.completed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    Đang chờ
                  </span>
                  <span className="font-bold text-yellow-600">{maintenanceKPIs.pending}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Quá hạn
                  </span>
                  <span className="font-bold text-red-600">{maintenanceKPIs.overdue}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Tỷ lệ hoàn thành</span>
                    <span className="font-bold">{(maintenanceKPIs.completionRate || 0).toFixed(1)}%</span>
                  </div>
                  <Progress value={maintenanceKPIs.completionRate || 0} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Work Order Types */}
          <Card>
            <CardHeader>
              <CardTitle>Phân loại Công việc</CardTitle>
              <CardDescription>Theo loại bảo trì</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workOrderTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {workOrderTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm text-muted-foreground">
                  Tỷ lệ bảo trì định kỳ: <span className="font-bold">{maintenanceKPIs.preventiveRatio.toFixed(1)}%</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Hành động nhanh</CardTitle>
              <CardDescription>Các tác vụ thường dùng</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/maintenance-schedule">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Xem lịch Gantt
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/oee-dashboard">
                  <Gauge className="h-4 w-4 mr-2" />
                  Chi tiết OEE
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/predictive-maintenance">
                  <Activity className="h-4 w-4 mr-2" />
                  Predictive Maintenance
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <a href="/equipment-qr">
                  <Factory className="h-4 w-4 mr-2" />
                  Tra cứu thiết bị
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
