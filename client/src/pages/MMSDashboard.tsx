/**
 * MMS Dashboard Page
 * Task: DSH-01
 * Dashboard MMS tổng hợp với KPI chính: OEE, MTTR, MTBF, Spare Parts
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  Target, Clock, TrendingUp, TrendingDown, Package, Wrench,
  AlertTriangle, CheckCircle, Activity, BarChart3, RefreshCw,
  Calendar, Users, DollarSign, Gauge
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from "recharts";

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  unit, 
  target, 
  trend, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  unit: string; 
  target?: number; 
  trend?: number; 
  icon: any; 
  color: string;
}) {
  const isGood = target ? value >= target : trend ? trend >= 0 : true;
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-3xl font-bold ${color}`}>
                {value.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
            {target && (
              <p className="text-xs text-muted-foreground mt-1">
                Mục tiêu: {target}{unit}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-full ${isGood ? "bg-green-100" : "bg-red-100"}`}>
            <Icon className={`h-6 w-6 ${isGood ? "text-green-600" : "text-red-600"}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            <span>{Math.abs(trend).toFixed(1)}% so với tuần trước</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MMSDashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedLine, setSelectedLine] = useState("all");

  // Fetch data
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();
  const { data: workOrders } = trpc.mms.listWorkOrders.useQuery({ status: "all" });
  const { data: spareParts } = trpc.sparePart.list.useQuery();

  // Mock KPI data (in production, this would come from API)
  const kpiData = useMemo(() => ({
    oee: 78.5,
    oeeTarget: 85,
    oeeTrend: 2.3,
    mttr: 45, // minutes
    mttrTarget: 30,
    mttrTrend: -5.2,
    mtbf: 168, // hours
    mtbfTarget: 200,
    mtbfTrend: 8.1,
    availability: 92.3,
    performance: 88.7,
    quality: 96.2,
    workOrdersOpen: workOrders?.filter((w: any) => w.status === "open").length || 5,
    workOrdersInProgress: workOrders?.filter((w: any) => w.status === "in_progress").length || 3,
    workOrdersCompleted: workOrders?.filter((w: any) => w.status === "completed").length || 12,
    lowStockItems: spareParts?.filter((s: any) => s.currentStock < s.minStock).length || 4,
  }), [workOrders, spareParts]);

  // OEE Trend data
  const oeeTrendData = [
    { date: "T2", oee: 75, availability: 90, performance: 85, quality: 98 },
    { date: "T3", oee: 78, availability: 92, performance: 87, quality: 97 },
    { date: "T4", oee: 72, availability: 88, performance: 84, quality: 97 },
    { date: "T5", oee: 80, availability: 93, performance: 89, quality: 97 },
    { date: "T6", oee: 82, availability: 94, performance: 90, quality: 97 },
    { date: "T7", oee: 76, availability: 91, performance: 86, quality: 97 },
    { date: "CN", oee: 79, availability: 92, performance: 88, quality: 98 },
  ];

  // Work Order Status data
  const workOrderStatusData = [
    { name: "Mở", value: kpiData.workOrdersOpen, color: "#f59e0b" },
    { name: "Đang xử lý", value: kpiData.workOrdersInProgress, color: "#3b82f6" },
    { name: "Hoàn thành", value: kpiData.workOrdersCompleted, color: "#22c55e" },
  ];

  // MTTR/MTBF Trend
  const mttrMtbfData = [
    { week: "W1", mttr: 52, mtbf: 150 },
    { week: "W2", mttr: 48, mtbf: 158 },
    { week: "W3", mttr: 50, mtbf: 155 },
    { week: "W4", mttr: 45, mtbf: 168 },
  ];

  // Machine Status
  const machineStatusData = [
    { name: "Hoạt động", value: 15, color: "#22c55e" },
    { name: "Bảo trì", value: 3, color: "#f59e0b" },
    { name: "Dừng", value: 2, color: "#ef4444" },
  ];

  // OEE Gauge data
  const oeeGaugeData = [
    { name: "OEE", value: kpiData.oee, fill: kpiData.oee >= 85 ? "#22c55e" : kpiData.oee >= 70 ? "#f59e0b" : "#ef4444" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gauge className="h-6 w-6" />
              MMS Dashboard
            </h1>
            <p className="text-muted-foreground">
              Tổng quan hệ thống quản lý bảo trì
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedLine} onValueChange={setSelectedLine}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn dây chuyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {productionLines?.map((line: any) => (
                  <SelectItem key={line.id} value={line.id.toString()}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Hôm nay</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            title="OEE"
            value={kpiData.oee}
            unit="%"
            target={kpiData.oeeTarget}
            trend={kpiData.oeeTrend}
            icon={Target}
            color="text-blue-600"
          />
          <KPICard
            title="MTTR"
            value={kpiData.mttr}
            unit=" phút"
            target={kpiData.mttrTarget}
            trend={kpiData.mttrTrend}
            icon={Clock}
            color="text-orange-600"
          />
          <KPICard
            title="MTBF"
            value={kpiData.mtbf}
            unit=" giờ"
            target={kpiData.mtbfTarget}
            trend={kpiData.mtbfTrend}
            icon={Activity}
            color="text-green-600"
          />
          <KPICard
            title="Tồn kho thấp"
            value={kpiData.lowStockItems}
            unit=" items"
            icon={Package}
            color="text-red-600"
          />
        </div>

        {/* OEE Components */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Availability</span>
                <span className="text-sm font-bold text-green-600">{kpiData.availability}%</span>
              </div>
              <Progress value={kpiData.availability} className="h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Performance</span>
                <span className="text-sm font-bold text-blue-600">{kpiData.performance}%</span>
              </div>
              <Progress value={kpiData.performance} className="h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Quality</span>
                <span className="text-sm font-bold text-purple-600">{kpiData.quality}%</span>
              </div>
              <Progress value={kpiData.quality} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-2 gap-4">
          {/* OEE Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng OEE</CardTitle>
              <CardDescription>OEE và các thành phần theo ngày</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={oeeTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="oee" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="OEE" />
                  <Area type="monotone" dataKey="availability" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} name="Availability" />
                  <Area type="monotone" dataKey="performance" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Performance" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* OEE Gauge */}
          <Card>
            <CardHeader>
              <CardTitle>OEE Hiện tại</CardTitle>
              <CardDescription>So với mục tiêu {kpiData.oeeTarget}%</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="90%" 
                  data={oeeGaugeData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    background={{ fill: "#e5e7eb" }}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold">
                    {kpiData.oee}%
                  </text>
                  <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-muted-foreground">
                    OEE
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-3 gap-4">
          {/* Work Order Status */}
          <Card>
            <CardHeader>
              <CardTitle>Work Orders</CardTitle>
              <CardDescription>Trạng thái công việc bảo trì</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={workOrderStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {workOrderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* MTTR/MTBF Trend */}
          <Card>
            <CardHeader>
              <CardTitle>MTTR & MTBF</CardTitle>
              <CardDescription>Xu hướng theo tuần</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={mttrMtbfData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="mttr" stroke="#f59e0b" name="MTTR (phút)" />
                  <Line yAxisId="right" type="monotone" dataKey="mtbf" stroke="#22c55e" name="MTBF (giờ)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Machine Status */}
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái Máy</CardTitle>
              <CardDescription>Tổng quan thiết bị</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={machineStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {machineStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Alerts & Work Orders */}
        <div className="grid grid-cols-2 gap-4">
          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Cảnh báo Gần đây
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: "OEE thấp", machine: "CNC-001", value: "68%", time: "10 phút trước", severity: "warning" },
                  { type: "MTTR cao", machine: "Laser-002", value: "65 phút", time: "25 phút trước", severity: "critical" },
                  { type: "Tồn kho thấp", machine: "Bearing SKF", value: "5 cái", time: "1 giờ trước", severity: "warning" },
                ].map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={alert.severity === "critical" ? "destructive" : "default"}>
                        {alert.severity === "critical" ? "Nghiêm trọng" : "Cảnh báo"}
                      </Badge>
                      <div>
                        <div className="font-medium">{alert.type}</div>
                        <div className="text-sm text-muted-foreground">{alert.machine}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{alert.value}</div>
                      <div className="text-xs text-muted-foreground">{alert.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Work Orders */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-500" />
                Work Orders Mới
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: "WO-2024-001", machine: "CNC-001", type: "Sửa chữa", status: "in_progress", assignee: "Nguyễn Văn A" },
                  { id: "WO-2024-002", machine: "Laser-002", type: "Bảo trì định kỳ", status: "open", assignee: "Trần Văn B" },
                  { id: "WO-2024-003", machine: "Press-003", type: "Thay thế phụ tùng", status: "completed", assignee: "Lê Văn C" },
                ].map((wo, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={
                        wo.status === "completed" ? "default" : 
                        wo.status === "in_progress" ? "secondary" : "outline"
                      }>
                        {wo.status === "completed" ? "Hoàn thành" : 
                         wo.status === "in_progress" ? "Đang xử lý" : "Mở"}
                      </Badge>
                      <div>
                        <div className="font-medium">{wo.id}</div>
                        <div className="text-sm text-muted-foreground">{wo.machine} - {wo.type}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3" />
                        {wo.assignee}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
