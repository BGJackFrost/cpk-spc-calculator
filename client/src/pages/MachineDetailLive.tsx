/**
 * Machine Detail Live Page
 * Task: IOT-01
 * Trang chi tiết OEE/SPC cho từng máy với live data
 */

import { useState, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Activity, Gauge, TrendingUp, TrendingDown, Clock, Zap,
  AlertTriangle, CheckCircle, RefreshCw, Download, Settings,
  Thermometer, Droplets, Wind, BarChart3, Target
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine
} from "recharts";

// Simulated live data hook
function useLiveData(machineId: number) {
  const [data, setData] = useState({
    oee: 78.5,
    availability: 92.3,
    performance: 88.7,
    quality: 96.2,
    status: "running" as "running" | "idle" | "stopped" | "maintenance",
    temperature: 45.2,
    vibration: 0.8,
    pressure: 2.5,
    speed: 1200,
    output: 450,
    defects: 5,
    lastUpdate: new Date(),
  });

  useEffect(() => {
    // Simulate live data updates
    const interval = setInterval(() => {
      setData(prev => ({
        ...prev,
        oee: Math.max(60, Math.min(95, prev.oee + (Math.random() - 0.5) * 2)),
        availability: Math.max(80, Math.min(100, prev.availability + (Math.random() - 0.5) * 1)),
        performance: Math.max(75, Math.min(100, prev.performance + (Math.random() - 0.5) * 1.5)),
        quality: Math.max(90, Math.min(100, prev.quality + (Math.random() - 0.5) * 0.5)),
        temperature: Math.max(35, Math.min(60, prev.temperature + (Math.random() - 0.5) * 2)),
        vibration: Math.max(0.2, Math.min(1.5, prev.vibration + (Math.random() - 0.5) * 0.1)),
        pressure: Math.max(1.5, Math.min(3.5, prev.pressure + (Math.random() - 0.5) * 0.2)),
        speed: Math.max(1000, Math.min(1400, prev.speed + (Math.random() - 0.5) * 50)),
        output: prev.output + Math.floor(Math.random() * 3),
        defects: prev.defects + (Math.random() > 0.95 ? 1 : 0),
        lastUpdate: new Date(),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [machineId]);

  return data;
}

// Live gauge component
function LiveGauge({ 
  title, 
  value, 
  unit, 
  min, 
  max, 
  target,
  icon: Icon,
  color 
}: { 
  title: string; 
  value: number; 
  unit: string; 
  min: number; 
  max: number; 
  target?: number;
  icon: any;
  color: string;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const isGood = target ? value >= target : true;

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <Badge variant={isGood ? "default" : "destructive"} className="text-xs">
            {isGood ? "OK" : "Alert"}
          </Badge>
        </div>
        <div className="text-2xl font-bold">{value.toFixed(1)}{unit}</div>
        <Progress value={percentage} className="h-2 mt-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{min}{unit}</span>
          {target && <span className="text-green-600">Target: {target}{unit}</span>}
          <span>{max}{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MachineDetailLive() {
  const [, params] = useRoute("/machine-detail/:id");
  const machineId = parseInt(params?.id || "1");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Fetch machine info
  const { data: machine } = trpc.machine.getById.useQuery({ id: machineId });
  
  // Live data
  const liveData = useLiveData(machineId);

  // Update history data
  useEffect(() => {
    const interval = setInterval(() => {
      setHistoryData(prev => {
        const newData = [
          ...prev,
          {
            time: new Date().toLocaleTimeString("vi-VN"),
            oee: liveData.oee,
            temperature: liveData.temperature,
            vibration: liveData.vibration,
            speed: liveData.speed,
          }
        ].slice(-30); // Keep last 30 data points
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [liveData]);

  // Status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-500";
      case "idle": return "bg-yellow-500";
      case "stopped": return "bg-red-500";
      case "maintenance": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "running": return "Đang chạy";
      case "idle": return "Chờ";
      case "stopped": return "Dừng";
      case "maintenance": return "Bảo trì";
      default: return status;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {machine?.name || `Máy #${machineId}`}
              </h1>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(liveData.status)} animate-pulse`} />
              <Badge variant="outline">{getStatusLabel(liveData.status)}</Badge>
            </div>
            <p className="text-muted-foreground">
              Cập nhật lúc: {liveData.lastUpdate.toLocaleTimeString("vi-VN")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Xuất dữ liệu
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Cài đặt
            </Button>
          </div>
        </div>

        {/* Live OEE Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">OEE</p>
                  <div className="text-4xl font-bold text-blue-600">
                    {liveData.oee.toFixed(1)}%
                  </div>
                </div>
                <Gauge className="h-12 w-12 text-blue-500 opacity-50" />
              </div>
              <Progress value={liveData.oee} className="h-2 mt-4" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Availability</p>
                  <div className="text-3xl font-bold text-green-600">
                    {liveData.availability.toFixed(1)}%
                  </div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Performance</p>
                  <div className="text-3xl font-bold text-orange-600">
                    {liveData.performance.toFixed(1)}%
                  </div>
                </div>
                <Zap className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Quality</p>
                  <div className="text-3xl font-bold text-purple-600">
                    {liveData.quality.toFixed(1)}%
                  </div>
                </div>
                <Target className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="sensors">Cảm biến</TabsTrigger>
            <TabsTrigger value="production">Sản xuất</TabsTrigger>
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Live OEE Chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    OEE Realtime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                      <YAxis domain={[60, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="3 3" label="Target" />
                      <Area type="monotone" dataKey="oee" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Production Stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Thống kê Sản xuất</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        <span>Sản lượng</span>
                      </div>
                      <span className="text-2xl font-bold">{liveData.output}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span>Lỗi</span>
                      </div>
                      <span className="text-2xl font-bold text-red-600">{liveData.defects}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-green-500" />
                        <span>Tốc độ</span>
                      </div>
                      <span className="text-2xl font-bold">{liveData.speed} rpm</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sensors Tab */}
          <TabsContent value="sensors" className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <LiveGauge
                title="Nhiệt độ"
                value={liveData.temperature}
                unit="°C"
                min={20}
                max={80}
                target={50}
                icon={Thermometer}
                color="text-red-500"
              />
              <LiveGauge
                title="Rung động"
                value={liveData.vibration}
                unit=" mm/s"
                min={0}
                max={2}
                target={1}
                icon={Activity}
                color="text-orange-500"
              />
              <LiveGauge
                title="Áp suất"
                value={liveData.pressure}
                unit=" bar"
                min={0}
                max={5}
                target={2.5}
                icon={Droplets}
                color="text-blue-500"
              />
              <LiveGauge
                title="Tốc độ"
                value={liveData.speed}
                unit=" rpm"
                min={0}
                max={2000}
                target={1200}
                icon={Wind}
                color="text-green-500"
              />
            </div>

            {/* Sensor History Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lịch sử Cảm biến</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="temp" domain={[30, 70]} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="vib" orientation="right" domain={[0, 2]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="temp" type="monotone" dataKey="temperature" stroke="#ef4444" name="Nhiệt độ (°C)" />
                    <Line yAxisId="vib" type="monotone" dataKey="vibration" stroke="#f59e0b" name="Rung động (mm/s)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-green-600">{liveData.output}</div>
                  <div className="text-sm text-muted-foreground">Sản phẩm hoàn thành</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-red-600">{liveData.defects}</div>
                  <div className="text-sm text-muted-foreground">Sản phẩm lỗi</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-4xl font-bold text-blue-600">
                    {((liveData.output - liveData.defects) / liveData.output * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Tỷ lệ đạt</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dữ liệu Realtime (30 điểm gần nhất)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Thời gian</th>
                        <th className="text-center py-2 px-3">OEE (%)</th>
                        <th className="text-center py-2 px-3">Nhiệt độ (°C)</th>
                        <th className="text-center py-2 px-3">Rung động (mm/s)</th>
                        <th className="text-center py-2 px-3">Tốc độ (rpm)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.slice().reverse().map((row, i) => (
                        <tr key={i} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3">{row.time}</td>
                          <td className="text-center py-2 px-3">{row.oee?.toFixed(1)}</td>
                          <td className="text-center py-2 px-3">{row.temperature?.toFixed(1)}</td>
                          <td className="text-center py-2 px-3">{row.vibration?.toFixed(2)}</td>
                          <td className="text-center py-2 px-3">{row.speed?.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
