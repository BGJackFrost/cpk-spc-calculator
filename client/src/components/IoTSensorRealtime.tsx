import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Thermometer,
  Gauge,
  Zap,
  Droplets,
  Activity,
  Bell,
  BellOff,
  Eye,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface IoTSensorRealtimeProps {
  className?: string;
}

export default function IoTSensorRealtime({ className }: IoTSensorRealtimeProps) {
  const [selectedSensor, setSelectedSensor] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [sensorTypeFilter, setSensorTypeFilter] = useState<string>('all');

  // Fetch sensors with real data
  const { data: sensors, isLoading: sensorsLoading, refetch: refetchSensors } = trpc.iotSensor.getSensors.useQuery(
    { sensorType: sensorTypeFilter !== 'all' ? sensorTypeFilter : undefined },
    { refetchInterval: 10000 } // Refresh every 10 seconds
  );

  // Fetch sensor readings for selected sensor
  const { data: readings, isLoading: readingsLoading } = trpc.iotSensor.getReadings.useQuery(
    { deviceId: selectedSensor || 0, timeRange },
    { enabled: !!selectedSensor, refetchInterval: 5000 }
  );

  // Fetch active alerts
  const { data: alerts, refetch: refetchAlerts } = trpc.iotSensor.getAlerts.useQuery(
    { acknowledged: false },
    { refetchInterval: 15000 }
  );

  // Fetch statistics
  const { data: stats } = trpc.iotSensor.getStatistics.useQuery(
    undefined,
    { refetchInterval: 30000 }
  );

  // Acknowledge alert mutation
  const acknowledgeAlert = trpc.iotSensor.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận cảnh báo");
      refetchAlerts();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const getSensorIcon = (type: string) => {
    switch (type) {
      case 'temperature': return <Thermometer className="h-5 w-5" />;
      case 'humidity': return <Droplets className="h-5 w-5" />;
      case 'pressure': return <Gauge className="h-5 w-5" />;
      case 'voltage':
      case 'current': return <Zap className="h-5 w-5" />;
      case 'vibration': return <Activity className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'offline': return 'text-red-500';
      case 'error': return 'text-orange-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatValue = (value: number, unit: string) => {
    return `${value.toFixed(1)} ${unit}`;
  };

  // Auto-select first sensor if none selected
  useEffect(() => {
    if (sensors && sensors.length > 0 && !selectedSensor) {
      setSelectedSensor(sensors[0].id);
    }
  }, [sensors, selectedSensor]);

  if (sensorsLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng Sensors</p>
                <p className="text-2xl font-bold">{stats?.totalSensors || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online</p>
                <p className="text-2xl font-bold text-green-500">{stats?.onlineSensors || 0}</p>
              </div>
              <Wifi className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline</p>
                <p className="text-2xl font-bold text-red-500">{stats?.offlineSensors || 0}</p>
              </div>
              <WifiOff className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Lỗi</p>
                <p className="text-2xl font-bold text-orange-500">{stats?.errorSensors || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cảnh báo</p>
                <p className="text-2xl font-bold text-yellow-500">{stats?.activeAlerts || 0}</p>
              </div>
              <Bell className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">{stats?.criticalAlerts || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sensor List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Danh sách Sensors</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => refetchSensors()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Select value={sensorTypeFilter} onValueChange={setSensorTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Lọc theo loại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="temperature">Nhiệt độ</SelectItem>
                <SelectItem value="humidity">Độ ẩm</SelectItem>
                <SelectItem value="pressure">Áp suất</SelectItem>
                <SelectItem value="vibration">Rung động</SelectItem>
                <SelectItem value="current">Dòng điện</SelectItem>
                <SelectItem value="voltage">Điện áp</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {sensors?.map((sensor) => (
              <div
                key={sensor.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSensor === sensor.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedSensor(sensor.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={getStatusColor(sensor.status)}>
                      {getSensorIcon(sensor.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sensor.name}</p>
                      <p className="text-xs text-muted-foreground">{sensor.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {sensor.lastReading && (
                      <>
                        <p className="font-bold">
                          {formatValue(sensor.lastReading.value, sensor.lastReading.unit)}
                        </p>
                        <div className={`h-2 w-2 rounded-full inline-block ${getQualityColor(sensor.lastReading.quality)}`} />
                      </>
                    )}
                  </div>
                </div>
                {sensor.alertCount && sensor.alertCount > 0 && (
                  <Badge variant="destructive" className="mt-2">
                    {sensor.alertCount} cảnh báo
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sensor Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Biểu đồ Realtime</CardTitle>
                <CardDescription>
                  {selectedSensor 
                    ? sensors?.find(s => s.id === selectedSensor)?.name 
                    : 'Chọn sensor để xem biểu đồ'}
                </CardDescription>
              </div>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
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
            </div>
          </CardHeader>
          <CardContent>
            {readingsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : readings && readings.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={readings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleString('vi-VN')}
                    formatter={(value: number) => [value.toFixed(2), 'Giá trị']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Chọn sensor để xem dữ liệu
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Cảnh báo đang hoạt động ({alerts.length})
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => refetchAlerts()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'critical' 
                      ? 'border-red-500 bg-red-50 dark:bg-red-950/20' 
                      : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={`h-5 w-5 ${
                        alert.severity === 'critical' ? 'text-red-500' : 'text-yellow-500'
                      }`} />
                      <div>
                        <p className="font-medium">{alert.deviceName}</p>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                        {alert.severity}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => acknowledgeAlert.mutate({ alertId: alert.id })}
                        disabled={acknowledgeAlert.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
