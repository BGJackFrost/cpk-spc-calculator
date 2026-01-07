/**
 * Edge Simulator Dashboard
 * Giao diện trực quan để start/stop simulator và xem realtime stats
 */

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Play, Square, Plus, Settings, Activity, Wifi, WifiOff,
  Thermometer, Droplets, Gauge, Zap, RefreshCw, Clock, 
  Database, TrendingUp, Server
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

type SensorType = 'temperature' | 'humidity' | 'pressure' | 'vibration' | 'current' | 'voltage' | 'custom';

interface SimulatorConfig {
  id: number;
  name: string;
  description?: string | null;
  sensorType: SensorType;
  baseValue: number;
  noiseLevel: number;
  anomalyProbability: number;
  anomalyMagnitude: number;
  latencyMin: number;
  latencyMax: number;
  packetLossRate: number;
  bufferEnabled: boolean;
  bufferSize: number;
  offlineProbability: number;
  samplingInterval: number;
  isActive: boolean;
  createdAt: string;
}

const sensorIcons: Record<SensorType, any> = {
  temperature: Thermometer,
  humidity: Droplets,
  pressure: Gauge,
  vibration: Activity,
  current: Zap,
  voltage: Zap,
  custom: Settings,
};

const sensorLabels: Record<SensorType, string> = {
  temperature: "Nhiệt độ",
  humidity: "Độ ẩm",
  pressure: "Áp suất",
  vibration: "Rung động",
  current: "Dòng điện",
  voltage: "Điện áp",
  custom: "Tùy chỉnh",
};

const sensorUnits: Record<SensorType, string> = {
  temperature: "°C",
  humidity: "%",
  pressure: "bar",
  vibration: "mm/s",
  current: "A",
  voltage: "V",
  custom: "",
};

export default function EdgeSimulatorDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [realtimeData, setRealtimeData] = useState<{ time: string; value: number }[]>([]);

  // Queries
  const { data: configs = [], isLoading: configsLoading, refetch: refetchConfigs } = trpc.edgeSimulator.getConfigs.useQuery();
  const { data: runningSimulators = [], refetch: refetchRunning } = trpc.edgeSimulator.getRunning.useQuery(undefined, {
    refetchInterval: 2000,
  });

  // Mutations
  const createConfig = trpc.edgeSimulator.createConfig.useMutation({
    onSuccess: () => {
      toast.success("Tạo cấu hình simulator thành công");
      setIsCreateDialogOpen(false);
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const startSimulator = trpc.edgeSimulator.start.useMutation({
    onSuccess: () => {
      toast.success("Đã khởi động simulator");
      refetchRunning();
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const stopSimulator = trpc.edgeSimulator.stop.useMutation({
    onSuccess: () => {
      toast.success("Đã dừng simulator");
      refetchRunning();
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  // Simulate realtime data
  useEffect(() => {
    if (runningSimulators.length > 0) {
      const interval = setInterval(() => {
        const now = new Date();
        const newPoint = {
          time: now.toLocaleTimeString('vi-VN'),
          value: 25 + Math.random() * 10 - 5 + Math.sin(Date.now() / 5000) * 3,
        };
        setRealtimeData(prev => [...prev.slice(-29), newPoint]);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [runningSimulators.length]);

  const handleStart = (configId: number) => {
    startSimulator.mutate({ configId });
  };

  const handleStop = (configId: number) => {
    stopSimulator.mutate({ configId });
  };

  const isRunning = (configId: number) => {
    return runningSimulators.some((s: any) => s.configId === configId);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-6 w-6" />
              Edge Gateway Simulator
            </h1>
            <p className="text-muted-foreground mt-1">
              Mô phỏng dữ liệu sensor từ Edge Gateway để test hệ thống
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo Simulator mới
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cấu hình</p>
                  <p className="text-2xl font-bold">{configs.length}</p>
                </div>
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang chạy</p>
                  <p className="text-2xl font-bold text-green-600">
                    {runningSimulators.length}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-500 animate-pulse" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Data Points</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {runningSimulators.reduce((sum: number, s: any) => sum + (s.dataPointsGenerated || 0), 0)}
                  </p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Latency</p>
                  <p className="text-2xl font-bold">
                    {runningSimulators.length > 0 
                      ? Math.round(runningSimulators.reduce((sum: number, s: any) => sum + (s.avgLatency || 0), 0) / runningSimulators.length)
                      : 0} ms
                  </p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="configs" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Realtime Data
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Running Simulators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Simulator đang chạy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {runningSimulators.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Không có simulator nào đang chạy</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {runningSimulators.map((sim: any) => {
                        const config = configs.find((c: SimulatorConfig) => c.id === sim.configId);
                        if (!config) return null;
                        const Icon = sensorIcons[config.sensorType];
                        return (
                          <div key={sim.configId} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Icon className="h-5 w-5" />
                                <span className="font-medium">{config.name}</span>
                                <Badge variant="outline" className="text-green-600">
                                  <Wifi className="h-3 w-3 mr-1" />
                                  Running
                                </Badge>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleStop(config.id)}
                                disabled={stopSimulator.isPending}
                              >
                                <Square className="h-4 w-4 mr-1" />
                                Stop
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Data Points</p>
                                <p className="font-mono font-bold">{sim.dataPointsGenerated || 0}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Last Value</p>
                                <p className="font-mono font-bold">
                                  {sim.lastValue?.toFixed(2) || '-'} {sensorUnits[config.sensorType]}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Avg Latency</p>
                                <p className="font-mono font-bold">{sim.avgLatency || 0} ms</p>
                              </div>
                            </div>
                            {sim.bufferedCount > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-muted-foreground">Buffer</span>
                                  <span>{sim.bufferedCount} / {config.bufferSize}</span>
                                </div>
                                <Progress value={(sim.bufferedCount / config.bufferSize) * 100} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Start */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Khởi động nhanh
                  </CardTitle>
                  <CardDescription>
                    Chọn một cấu hình để bắt đầu mô phỏng
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {configs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có cấu hình nào</p>
                      <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Tạo cấu hình
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {configs.filter((c: SimulatorConfig) => !isRunning(c.id)).slice(0, 5).map((config: SimulatorConfig) => {
                        const Icon = sensorIcons[config.sensorType];
                        return (
                          <div
                            key={config.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{config.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {sensorLabels[config.sensorType]} • {config.samplingInterval}ms
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleStart(config.id)}
                              disabled={startSimulator.isPending}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Configs Tab */}
          <TabsContent value="configs" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách cấu hình Simulator</CardTitle>
                  <CardDescription>
                    Quản lý các cấu hình mô phỏng sensor
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchConfigs()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Làm mới
                </Button>
              </CardHeader>
              <CardContent>
                {configsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : configs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có cấu hình simulator nào</p>
                    <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo cấu hình đầu tiên
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Loại sensor</TableHead>
                        <TableHead>Base Value</TableHead>
                        <TableHead>Noise</TableHead>
                        <TableHead>Anomaly</TableHead>
                        <TableHead>Interval</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config: SimulatorConfig) => {
                        const Icon = sensorIcons[config.sensorType];
                        const running = isRunning(config.id);
                        return (
                          <TableRow key={config.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                <span className="font-medium">{config.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {sensorLabels[config.sensorType]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">
                                {config.baseValue} {sensorUnits[config.sensorType]}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">{(config.noiseLevel * 100).toFixed(0)}%</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">{(config.anomalyProbability * 100).toFixed(1)}%</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">{config.samplingInterval}ms</span>
                            </TableCell>
                            <TableCell>
                              {running ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <Activity className="h-3 w-3 mr-1 animate-pulse" />
                                  Running
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Stopped</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {running ? (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleStop(config.id)}
                                  disabled={stopSimulator.isPending}
                                >
                                  <Square className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleStart(config.id)}
                                  disabled={startSimulator.isPending}
                                >
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Realtime Tab */}
          <TabsContent value="realtime" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Dữ liệu Realtime
                </CardTitle>
                <CardDescription>
                  Biểu đồ trực quan dữ liệu từ các simulator đang chạy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {runningSimulators.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Không có simulator nào đang chạy</p>
                    <p className="text-sm mt-2">Khởi động một simulator để xem dữ liệu realtime</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Main Chart */}
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={realtimeData}>
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="time" 
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            className="text-muted-foreground"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#colorValue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {runningSimulators.map((sim: any) => {
                        const config = configs.find((c: SimulatorConfig) => c.id === sim.configId);
                        if (!config) return null;
                        return (
                          <Card key={sim.configId}>
                            <CardContent className="pt-4">
                              <div className="text-sm text-muted-foreground mb-1">
                                {config.name}
                              </div>
                              <div className="text-2xl font-bold">
                                {sim.lastValue?.toFixed(2) || '-'}
                                <span className="text-sm font-normal text-muted-foreground ml-1">
                                  {sensorUnits[config.sensorType]}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>{sim.dataPointsGenerated} points</span>
                                <span>•</span>
                                <span>{sim.avgLatency}ms latency</span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <SimulatorConfigDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={(data) => createConfig.mutate(data)}
          isLoading={createConfig.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

// Simulator Config Dialog Component
interface SimulatorConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function SimulatorConfigDialog({ open, onOpenChange, onSubmit, isLoading }: SimulatorConfigDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sensorType: "temperature" as SensorType,
    baseValue: 25,
    noiseLevel: 0.1,
    driftRate: 0,
    anomalyProbability: 0.05,
    anomalyMagnitude: 2,
    latencyMin: 10,
    latencyMax: 100,
    packetLossRate: 0.01,
    bufferEnabled: true,
    bufferSize: 100,
    offlineProbability: 0.01,
    offlineDurationMin: 5000,
    offlineDurationMax: 30000,
    samplingInterval: 1000,
  });

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'normal':
        setFormData(prev => ({
          ...prev,
          noiseLevel: 0.05,
          driftRate: 0,
          anomalyProbability: 0.01,
          packetLossRate: 0.001,
          offlineProbability: 0.001,
        }));
        break;
      case 'noisy':
        setFormData(prev => ({
          ...prev,
          noiseLevel: 0.3,
          driftRate: 0.01,
          anomalyProbability: 0.1,
          packetLossRate: 0.05,
          offlineProbability: 0.02,
        }));
        break;
      case 'unstable':
        setFormData(prev => ({
          ...prev,
          noiseLevel: 0.2,
          driftRate: 0.05,
          anomalyProbability: 0.2,
          packetLossRate: 0.1,
          offlineProbability: 0.05,
        }));
        break;
    }
    toast.success(`Đã áp dụng preset: ${preset}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo cấu hình Simulator mới</DialogTitle>
          <DialogDescription>
            Cấu hình các thông số mô phỏng sensor data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Presets */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => applyPreset('normal')}>
              Normal
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('noisy')}>
              Noisy
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('unstable')}>
              Unstable
            </Button>
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium">Thông tin cơ bản</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên simulator *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Temperature Sensor 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại sensor</Label>
                <Select
                  value={formData.sensorType}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, sensorType: v as SensorType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="temperature">Nhiệt độ</SelectItem>
                    <SelectItem value="humidity">Độ ẩm</SelectItem>
                    <SelectItem value="pressure">Áp suất</SelectItem>
                    <SelectItem value="vibration">Rung động</SelectItem>
                    <SelectItem value="current">Dòng điện</SelectItem>
                    <SelectItem value="voltage">Điện áp</SelectItem>
                    <SelectItem value="custom">Tùy chỉnh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Data Generation */}
          <div className="space-y-4">
            <h4 className="font-medium">Tạo dữ liệu</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Value: {formData.baseValue}</Label>
                <Slider
                  value={[formData.baseValue]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, baseValue: v }))}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Noise Level: {(formData.noiseLevel * 100).toFixed(0)}%</Label>
                <Slider
                  value={[formData.noiseLevel * 100]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, noiseLevel: v / 100 }))}
                  min={0}
                  max={50}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Anomaly Probability: {(formData.anomalyProbability * 100).toFixed(1)}%</Label>
                <Slider
                  value={[formData.anomalyProbability * 100]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, anomalyProbability: v / 100 }))}
                  min={0}
                  max={30}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <Label>Anomaly Magnitude: {formData.anomalyMagnitude}x</Label>
                <Slider
                  value={[formData.anomalyMagnitude]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, anomalyMagnitude: v }))}
                  min={1}
                  max={10}
                  step={0.5}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sampling */}
          <div className="space-y-4">
            <h4 className="font-medium">Lấy mẫu</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Sampling Interval (ms)</Label>
                <Input
                  id="interval"
                  type="number"
                  min={100}
                  value={formData.samplingInterval}
                  onChange={(e) => setFormData(prev => ({ ...prev, samplingInterval: parseInt(e.target.value) || 1000 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bufferSize">Buffer Size</Label>
                <Input
                  id="bufferSize"
                  type="number"
                  min={1}
                  value={formData.bufferSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, bufferSize: parseInt(e.target.value) || 100 }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.bufferEnabled}
                onCheckedChange={(v) => setFormData(prev => ({ ...prev, bufferEnabled: v }))}
              />
              <Label>Bật buffering khi offline</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              "Tạo mới"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
