/**
 * Maintenance History Chart Component
 * Task: DSH-04
 * Biểu đồ lịch sử bảo trì và OEE cho QR lookup
 */

import { useState, useMemo } from "react";
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
import { 
  Wrench, Activity, Clock, TrendingUp, TrendingDown,
  Calendar, AlertTriangle, CheckCircle, XCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine, Cell
} from "recharts";

interface MaintenanceRecord {
  id: number;
  date: Date;
  type: "preventive" | "corrective" | "predictive";
  duration: number; // minutes
  cost: number;
  technician: string;
  description: string;
  status: "completed" | "pending" | "cancelled";
}

interface OEERecord {
  date: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

interface MaintenanceHistoryChartProps {
  machineId: number;
  machineName: string;
  maintenanceRecords?: MaintenanceRecord[];
  oeeRecords?: OEERecord[];
  timeRange?: "7d" | "30d" | "90d" | "1y";
}

export default function MaintenanceHistoryChart({
  machineId,
  machineName,
  maintenanceRecords,
  oeeRecords,
  timeRange = "30d",
}: MaintenanceHistoryChartProps) {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  // Generate mock data if not provided
  const mockMaintenanceData = useMemo(() => {
    if (maintenanceRecords) return maintenanceRecords;
    
    const types: MaintenanceRecord["type"][] = ["preventive", "corrective", "predictive"];
    const statuses: MaintenanceRecord["status"][] = ["completed", "pending", "cancelled"];
    
    return Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
      type: types[Math.floor(Math.random() * types.length)],
      duration: 30 + Math.floor(Math.random() * 180),
      cost: 100 + Math.floor(Math.random() * 900),
      technician: `Kỹ thuật viên ${Math.floor(Math.random() * 5) + 1}`,
      description: `Bảo trì #${i + 1}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    }));
  }, [maintenanceRecords]);

  const mockOEEData = useMemo(() => {
    if (oeeRecords) return oeeRecords;
    
    const days = selectedTimeRange === "7d" ? 7 : 
                 selectedTimeRange === "30d" ? 30 : 
                 selectedTimeRange === "90d" ? 90 : 365;
    
    return Array.from({ length: Math.min(days, 30) }, (_, i) => {
      const availability = 85 + Math.random() * 12;
      const performance = 80 + Math.random() * 15;
      const quality = 95 + Math.random() * 4;
      return {
        date: `D${i + 1}`,
        oee: (availability * performance * quality) / 10000,
        availability,
        performance,
        quality,
      };
    });
  }, [oeeRecords, selectedTimeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    const completed = mockMaintenanceData.filter(m => m.status === "completed");
    const totalDuration = completed.reduce((sum, m) => sum + m.duration, 0);
    const totalCost = completed.reduce((sum, m) => sum + m.cost, 0);
    const avgOEE = mockOEEData.reduce((sum, o) => sum + o.oee, 0) / mockOEEData.length;
    
    const byType = {
      preventive: mockMaintenanceData.filter(m => m.type === "preventive").length,
      corrective: mockMaintenanceData.filter(m => m.type === "corrective").length,
      predictive: mockMaintenanceData.filter(m => m.type === "predictive").length,
    };

    return {
      totalMaintenance: mockMaintenanceData.length,
      completedMaintenance: completed.length,
      avgDuration: completed.length > 0 ? totalDuration / completed.length : 0,
      totalCost,
      avgOEE,
      byType,
    };
  }, [mockMaintenanceData, mockOEEData]);

  // Maintenance by type chart data
  const maintenanceByTypeData = [
    { name: "Phòng ngừa", value: stats.byType.preventive, color: "#22c55e" },
    { name: "Sửa chữa", value: stats.byType.corrective, color: "#ef4444" },
    { name: "Dự đoán", value: stats.byType.predictive, color: "#3b82f6" },
  ];

  // Monthly maintenance trend
  const monthlyTrendData = useMemo(() => {
    const months = ["T1", "T2", "T3", "T4", "T5", "T6"];
    return months.map(month => ({
      month,
      preventive: Math.floor(Math.random() * 5) + 1,
      corrective: Math.floor(Math.random() * 3),
      cost: Math.floor(Math.random() * 2000) + 500,
    }));
  }, []);

  // OEE with maintenance markers
  const oeeWithMaintenanceData = useMemo(() => {
    return mockOEEData.map((oee, i) => ({
      ...oee,
      maintenance: i % 7 === 0 ? 1 : 0, // Mark maintenance days
    }));
  }, [mockOEEData]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "preventive": return "bg-green-100 text-green-700";
      case "corrective": return "bg-red-100 text-red-700";
      case "predictive": return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "preventive": return "Phòng ngừa";
      case "corrective": return "Sửa chữa";
      case "predictive": return "Dự đoán";
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Lịch sử Bảo trì & OEE
          </h3>
          <p className="text-sm text-muted-foreground">{machineName}</p>
        </div>
        <Select value={selectedTimeRange} onValueChange={(v: any) => setSelectedTimeRange(v)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 ngày</SelectItem>
            <SelectItem value="30d">30 ngày</SelectItem>
            <SelectItem value="90d">90 ngày</SelectItem>
            <SelectItem value="1y">1 năm</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.completedMaintenance}</div>
            <div className="text-xs text-muted-foreground">Lần bảo trì</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.avgDuration.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Phút/lần TB</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">${stats.totalCost.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Tổng chi phí</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.avgOEE.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">OEE trung bình</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="oee">OEE</TabsTrigger>
          <TabsTrigger value="maintenance">Bảo trì</TabsTrigger>
          <TabsTrigger value="history">Lịch sử</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* OEE Trend with Maintenance Markers */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">OEE & Bảo trì</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={oeeWithMaintenanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="oee" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" name="OEE" />
                    <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="3 3" label="Target" />
                    <Bar dataKey="maintenance" fill="#f59e0b" name="Bảo trì" barSize={4} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Maintenance by Type */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Phân loại Bảo trì</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={maintenanceByTypeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {maintenanceByTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OEE Tab */}
        <TabsContent value="oee">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chi tiết OEE</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={mockOEEData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="availability" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} name="Availability" />
                  <Area type="monotone" dataKey="performance" stackId="2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Performance" />
                  <Area type="monotone" dataKey="quality" stackId="3" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Quality" />
                  <Line type="monotone" dataKey="oee" stroke="#8b5cf6" strokeWidth={2} name="OEE" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Xu hướng Bảo trì theo tháng</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="preventive" stackId="a" fill="#22c55e" name="Phòng ngừa" />
                  <Bar yAxisId="left" dataKey="corrective" stackId="a" fill="#ef4444" name="Sửa chữa" />
                  <Line yAxisId="right" type="monotone" dataKey="cost" stroke="#8b5cf6" name="Chi phí ($)" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Lịch sử Bảo trì Gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {mockMaintenanceData
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .slice(0, 10)
                  .map(record => (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={getTypeColor(record.type)}>
                          {getTypeLabel(record.type)}
                        </Badge>
                        <div>
                          <div className="text-sm font-medium">{record.description}</div>
                          <div className="text-xs text-muted-foreground">
                            {record.date.toLocaleDateString("vi-VN")} • {record.technician}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{record.duration} phút</div>
                        <div className="text-xs text-muted-foreground">${record.cost}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
