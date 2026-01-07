/**
 * IoT Device Detail Popup
 * Hiển thị chi tiết thiết bị IoT khi click vào trên sơ đồ
 * Bao gồm: metrics hiện tại, lịch sử trạng thái, biểu đồ mini
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Cpu,
  Thermometer,
  Droplets,
  Gauge,
  Battery,
  Signal,
  Clock,
  MapPin,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  History,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { trpc } from '@/lib/trpc';

export interface IoTDeviceForPopup {
  id: number;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  location?: string;
  lastHeartbeat?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  ipAddress?: string;
  macAddress?: string;
  healthScore?: number;
}

interface IoTDeviceDetailPopupProps {
  device: IoTDeviceForPopup | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

// Mock data cho metrics history
const generateMockMetricsHistory = () => {
  const now = Date.now();
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now - i * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      temperature: 20 + Math.random() * 15 + Math.sin(i / 4) * 3,
      humidity: 40 + Math.random() * 20 + Math.cos(i / 4) * 5,
      pressure: 1010 + Math.random() * 10,
    });
  }
  return data;
};

// Mock data cho status history
const generateMockStatusHistory = () => {
  const statuses: Array<{ status: string; timestamp: Date; duration: string; reason?: string }> = [];
  const now = new Date();
  
  const statusTypes = ['online', 'offline', 'error', 'maintenance'];
  const reasons = {
    offline: ['Mất kết nối mạng', 'Thiết bị tắt nguồn', 'Timeout'],
    error: ['Lỗi cảm biến', 'Quá nhiệt', 'Lỗi giao tiếp'],
    maintenance: ['Bảo trì định kỳ', 'Cập nhật firmware', 'Kiểm tra thiết bị'],
  };

  for (let i = 0; i < 10; i++) {
    const status = statusTypes[Math.floor(Math.random() * statusTypes.length)];
    const timestamp = new Date(now.getTime() - i * 3600000 * (1 + Math.random() * 2));
    const durationMinutes = Math.floor(Math.random() * 120) + 5;
    
    statuses.push({
      status,
      timestamp,
      duration: durationMinutes < 60 
        ? `${durationMinutes} phút` 
        : `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      reason: status !== 'online' 
        ? (reasons as any)[status]?.[Math.floor(Math.random() * 3)] 
        : undefined,
    });
  }
  
  return statuses;
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = {
    online: { color: 'bg-green-500', icon: CheckCircle, label: 'Online' },
    offline: { color: 'bg-gray-500', icon: XCircle, label: 'Offline' },
    error: { color: 'bg-red-500', icon: AlertTriangle, label: 'Error' },
    maintenance: { color: 'bg-blue-500', icon: RefreshCw, label: 'Bảo trì' },
  };
  
  const { color, icon: Icon, label } = config[status as keyof typeof config] || config.offline;
  
  return (
    <Badge className={`${color} text-white flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
};

export function IoTDeviceDetailPopup({
  device,
  open,
  onOpenChange,
  onRefresh,
}: IoTDeviceDetailPopupProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Query để lấy alarms của device
  const { data: alarms } = trpc.iotCrud.getAlarms.useQuery(
    { deviceId: device?.id, limit: 10 },
    { enabled: !!device?.id && open }
  );

  if (!device) return null;

  const metricsHistory = generateMockMetricsHistory();
  const statusHistory = generateMockStatusHistory();

  // Mock metrics hiện tại
  const currentMetrics = {
    temperature: 25.5 + Math.random() * 5,
    humidity: 55 + Math.random() * 10,
    pressure: 1013 + Math.random() * 5,
    batteryLevel: 75 + Math.floor(Math.random() * 20),
    signalStrength: -50 - Math.floor(Math.random() * 30),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {device.deviceName}
                <StatusBadge status={device.status} />
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                {device.deviceCode} • {device.deviceType}
              </p>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} className="ml-auto">
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <Activity className="w-4 h-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="metrics" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="w-4 h-4" />
              Lịch sử
            </TabsTrigger>
            <TabsTrigger value="alarms" className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Cảnh báo
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4">
            {/* Tab Tổng quan */}
            <TabsContent value="overview" className="space-y-4">
              {/* Thông tin thiết bị */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Thông tin thiết bị
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mã thiết bị:</span>
                      <span className="font-medium">{device.deviceCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Loại:</span>
                      <span className="font-medium uppercase">{device.deviceType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nhà sản xuất:</span>
                      <span className="font-medium">{device.manufacturer || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{device.model || '-'}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Firmware:</span>
                      <span className="font-medium">{device.firmwareVersion || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP:</span>
                      <span className="font-medium">{device.ipAddress || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MAC:</span>
                      <span className="font-medium">{device.macAddress || '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Vị trí:</span>
                      <span className="font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {device.location || '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics hiện tại */}
              <div className="grid grid-cols-5 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <span className="text-xs">Nhiệt độ</span>
                  </div>
                  <p className="text-xl font-bold">{currentMetrics.temperature.toFixed(1)}°C</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <span className="text-xs">Độ ẩm</span>
                  </div>
                  <p className="text-xl font-bold">{currentMetrics.humidity.toFixed(1)}%</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Gauge className="w-4 h-4 text-purple-500" />
                    <span className="text-xs">Áp suất</span>
                  </div>
                  <p className="text-xl font-bold">{currentMetrics.pressure.toFixed(0)}</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Battery className="w-4 h-4 text-green-500" />
                    <span className="text-xs">Pin</span>
                  </div>
                  <p className="text-xl font-bold">{currentMetrics.batteryLevel}%</p>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Signal className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs">Tín hiệu</span>
                  </div>
                  <p className="text-xl font-bold">{currentMetrics.signalStrength} dBm</p>
                </Card>
              </div>

              {/* Mini chart */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Xu hướng nhiệt độ (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metricsHistory}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 10 }} 
                          interval="preserveStartEnd"
                        />
                        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="temperature"
                          stroke="#f97316"
                          fill="#f97316"
                          fillOpacity={0.2}
                          name="Nhiệt độ (°C)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Metrics */}
            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Biểu đồ Nhiệt độ & Độ ẩm (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metricsHistory}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="temp" orientation="left" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line
                          yAxisId="temp"
                          type="monotone"
                          dataKey="temperature"
                          stroke="#f97316"
                          strokeWidth={2}
                          dot={false}
                          name="Nhiệt độ (°C)"
                        />
                        <Line
                          yAxisId="humidity"
                          type="monotone"
                          dataKey="humidity"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          name="Độ ẩm (%)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Biểu đồ Áp suất (24h)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metricsHistory}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="pressure"
                          stroke="#8b5cf6"
                          fill="#8b5cf6"
                          fillOpacity={0.2}
                          name="Áp suất (hPa)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Lịch sử */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Lịch sử trạng thái
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statusHistory.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                      >
                        <StatusBadge status={item.status} />
                        <div className="flex-1">
                          <p className="text-sm">
                            {item.reason || (item.status === 'online' ? 'Hoạt động bình thường' : 'Không xác định')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.timestamp.toLocaleString('vi-VN')} • Kéo dài: {item.duration}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab Cảnh báo */}
            <TabsContent value="alarms" className="space-y-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Cảnh báo gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {alarms && alarms.length > 0 ? (
                    <div className="space-y-3">
                      {alarms.map((alarm: any) => (
                        <div
                          key={alarm.id}
                          className={`p-3 rounded-lg border ${
                            alarm.alarmType === 'critical'
                              ? 'border-red-500 bg-red-500/10'
                              : alarm.alarmType === 'error'
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-yellow-500 bg-yellow-500/10'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge
                              variant={
                                alarm.alarmType === 'critical'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {alarm.alarmType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(alarm.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{alarm.message}</p>
                          {alarm.value && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Giá trị: {alarm.value} {alarm.threshold && `(Ngưỡng: ${alarm.threshold})`}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>Không có cảnh báo nào</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default IoTDeviceDetailPopup;
