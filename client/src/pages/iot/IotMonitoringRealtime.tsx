import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Activity, 
  AlertTriangle, 
  Bell, 
  BellOff,
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Settings,
  Thermometer,
  Droplets,
  Gauge,
  Zap,
  Wind,
  Volume2,
  Search,
  Filter,
  Download,
  Maximize2,
  Grid3X3,
  List
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart,
  Bar
} from 'recharts';
import { useToast } from '@/hooks/use-toast';

// Sensor types with icons
const SENSOR_TYPES = {
  temperature: { icon: Thermometer, color: '#ef4444', unit: '°C', name: 'Nhiệt độ' },
  humidity: { icon: Droplets, color: '#3b82f6', unit: '%', name: 'Độ ẩm' },
  pressure: { icon: Gauge, color: '#8b5cf6', unit: 'bar', name: 'Áp suất' },
  voltage: { icon: Zap, color: '#f59e0b', unit: 'V', name: 'Điện áp' },
  vibration: { icon: Activity, color: '#10b981', unit: 'mm/s', name: 'Rung động' },
  flow: { icon: Wind, color: '#06b6d4', unit: 'L/min', name: 'Lưu lượng' },
  noise: { icon: Volume2, color: '#ec4899', unit: 'dB', name: 'Tiếng ồn' }
};

// Generate mock sensor data
const generateSensorData = (sensorId: string, type: string) => {
  const baseValues: Record<string, { min: number; max: number; target: number }> = {
    temperature: { min: 20, max: 80, target: 45 },
    humidity: { min: 30, max: 90, target: 60 },
    pressure: { min: 0.5, max: 10, target: 5 },
    voltage: { min: 200, max: 250, target: 220 },
    vibration: { min: 0, max: 10, target: 2 },
    flow: { min: 0, max: 100, target: 50 },
    noise: { min: 40, max: 100, target: 65 }
  };
  
  const base = baseValues[type] || { min: 0, max: 100, target: 50 };
  const value = base.target + (Math.random() - 0.5) * (base.max - base.min) * 0.3;
  
  return {
    value: Math.round(value * 100) / 100,
    min: base.min,
    max: base.max,
    target: base.target,
    lsl: base.target - (base.max - base.min) * 0.2,
    usl: base.target + (base.max - base.min) * 0.2
  };
};

// Mock sensors
// Mock data removed - ([] as any[]) (data comes from tRPC or is not yet implemented)

// Sensor Card Component
const SensorCard: React.FC<{
  sensor: any;
  data: ReturnType<typeof generateSensorData>;
  history: { time: string; value: number }[];
  onExpand: () => void;
  alertEnabled: boolean;
  onToggleAlert: () => void;
}> = ({ sensor, data, history, onExpand, alertEnabled, onToggleAlert }) => {
  const sensorType = SENSOR_TYPES[sensor.type as keyof typeof SENSOR_TYPES];
  const Icon = sensorType?.icon || Activity;
  
  const isWarning = data.value < data.lsl || data.value > data.usl;
  const isCritical = data.value < data.min * 1.1 || data.value > data.max * 0.9;
  
  const statusColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500';
  const statusText = isCritical ? 'Nguy hiểm' : isWarning ? 'Cảnh báo' : 'Bình thường';
  
  return (
    <Card className={`relative overflow-hidden ${isCritical ? 'border-red-500 border-2' : isWarning ? 'border-yellow-500 border-2' : ''}`}>
      {/* Status indicator */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${statusColor}`} />
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg`} style={{ backgroundColor: `${sensorType?.color}20` }}>
              <Icon className="h-5 w-5" style={{ color: sensorType?.color }} />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{sensor.name}</CardTitle>
              <CardDescription className="text-xs">{sensor.machine} • {sensor.line}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleAlert}>
              {alertEnabled ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onExpand}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Current Value */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold" style={{ color: sensorType?.color }}>
            {data.value}
          </span>
          <span className="text-sm text-muted-foreground">{sensorType?.unit}</span>
          <Badge variant={isCritical ? 'destructive' : isWarning ? 'warning' : 'default'} className="ml-auto">
            {statusText}
          </Badge>
        </div>
        
        {/* Mini Chart */}
        <div className="h-16 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id={`gradient-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={sensorType?.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={sensorType?.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={sensorType?.color} 
                fill={`url(#gradient-${sensor.id})`}
                strokeWidth={2}
              />
              <ReferenceLine y={data.usl} stroke="#ef4444" strokeDasharray="3 3" />
              <ReferenceLine y={data.lsl} stroke="#ef4444" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Limits */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>LSL: {data.lsl.toFixed(1)}</span>
          <span>Target: {data.target}</span>
          <span>USL: {data.usl.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

// Alert Item Component
const AlertItem: React.FC<{
  alert: {
    id: string;
    sensorId: string;
    sensorName: string;
    type: 'warning' | 'critical';
    message: string;
    value: number;
    threshold: number;
    time: Date;
    acknowledged: boolean;
  };
  onAcknowledge: () => void;
}> = ({ alert, onAcknowledge }) => {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${
      alert.type === 'critical' ? 'bg-red-500/10 border border-red-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'
    }`}>
      <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{alert.sensorName}</span>
          <Badge variant={alert.type === 'critical' ? 'destructive' : 'warning'} className="text-xs">
            {alert.type === 'critical' ? 'Nguy hiểm' : 'Cảnh báo'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>Giá trị: {alert.value}</span>
          <span>Ngưỡng: {alert.threshold}</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {alert.time.toLocaleTimeString()}
          </span>
        </div>
      </div>
      {!alert.acknowledged && (
        <Button variant="outline" size="sm" onClick={onAcknowledge}>
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Xác nhận
        </Button>
      )}
    </div>
  );
};

// Main Component
export default function IotMonitoringRealtime() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLine, setFilterLine] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [alertsEnabled, setAlertsEnabled] = useState<Record<string, boolean>>({});
  const [expandedSensor, setExpandedSensor] = useState<string | null>(null);
  
  // Sensor data state
  const [sensorData, setSensorData] = useState<Record<string, ReturnType<typeof generateSensorData>>>({});
  const [sensorHistory, setSensorHistory] = useState<Record<string, { time: string; value: number }[]>>({});
  const [alerts, setAlerts] = useState<Array<{
    id: string;
    sensorId: string;
    sensorName: string;
    type: 'warning' | 'critical';
    message: string;
    value: number;
    threshold: number;
    time: Date;
    acknowledged: boolean;
  }>>([]);
  
  // Initialize sensor data
  useEffect(() => {
    const initialData: Record<string, ReturnType<typeof generateSensorData>> = {};
    const initialHistory: Record<string, { time: string; value: number }[]> = {};
    const initialAlerts: Record<string, boolean> = {};
    
    ([] as any[]).forEach(sensor => {
      initialData[sensor.id] = generateSensorData(sensor.id, sensor.type);
      initialHistory[sensor.id] = Array.from({ length: 20 }, (_, i) => ({
        time: new Date(Date.now() - (19 - i) * 5000).toLocaleTimeString(),
        value: generateSensorData(sensor.id, sensor.type).value
      }));
      initialAlerts[sensor.id] = true;
    });
    
    setSensorData(initialData);
    setSensorHistory(initialHistory);
    setAlertsEnabled(initialAlerts);
  }, []);
  
  // Update sensor data periodically
  const updateSensorData = useCallback(() => {
    const newData: Record<string, ReturnType<typeof generateSensorData>> = {};
    const newHistory: Record<string, { time: string; value: number }[]> = {};
    const newAlerts: typeof alerts = [];
    
    ([] as any[]).forEach(sensor => {
      const data = generateSensorData(sensor.id, sensor.type);
      newData[sensor.id] = data;
      
      // Update history
      const history = sensorHistory[sensor.id] || [];
      newHistory[sensor.id] = [
        ...history.slice(-19),
        { time: new Date().toLocaleTimeString(), value: data.value }
      ];
      
      // Check for alerts
      if (alertsEnabled[sensor.id]) {
        if (data.value > data.usl) {
          newAlerts.push({
            id: `${sensor.id}-${Date.now()}`,
            sensorId: sensor.id,
            sensorName: sensor.name,
            type: data.value > data.max * 0.9 ? 'critical' : 'warning',
            message: `Giá trị vượt ngưỡng trên (USL: ${data.usl.toFixed(1)})`,
            value: data.value,
            threshold: data.usl,
            time: new Date(),
            acknowledged: false
          });
        } else if (data.value < data.lsl) {
          newAlerts.push({
            id: `${sensor.id}-${Date.now()}`,
            sensorId: sensor.id,
            sensorName: sensor.name,
            type: data.value < data.min * 1.1 ? 'critical' : 'warning',
            message: `Giá trị dưới ngưỡng dưới (LSL: ${data.lsl.toFixed(1)})`,
            value: data.value,
            threshold: data.lsl,
            time: new Date(),
            acknowledged: false
          });
        }
      }
    });
    
    setSensorData(newData);
    setSensorHistory(newHistory);
    
    // Add new alerts
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
      
      // Show toast for critical alerts
      const criticalAlerts = newAlerts.filter(a => a.type === 'critical');
      if (criticalAlerts.length > 0) {
        toast({
          title: '⚠️ Cảnh báo nghiêm trọng!',
          description: criticalAlerts[0].message,
          variant: 'destructive'
        });
      }
    }
  }, [sensorHistory, alertsEnabled, toast]);
  
  // Auto refresh
  useEffect(() => {
    if (!isAutoRefresh) return;
    
    const interval = setInterval(updateSensorData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, updateSensorData]);
  
  // Filter sensors
  const filteredSensors = useMemo(() => {
    return ([] as any[]).filter(sensor => {
      if (searchQuery && !sensor.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !sensor.id.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterType !== 'all' && sensor.type !== filterType) return false;
      if (filterLine !== 'all' && sensor.line !== filterLine) return false;
      if (filterStatus !== 'all' && sensor.status !== filterStatus) return false;
      return true;
    });
  }, [searchQuery, filterType, filterLine, filterStatus]);
  
  // Get unique lines
  const uniqueLines = useMemo(() => {
    return [...new Set(([] as any[]).map(s => s.line))];
  }, []);
  
  // Stats
  const stats = useMemo(() => {
    let online = 0, warning = 0, critical = 0;
    ([] as any[]).forEach(sensor => {
      const data = sensorData[sensor.id];
      if (!data) return;
      if (data.value < data.min * 1.1 || data.value > data.max * 0.9) critical++;
      else if (data.value < data.lsl || data.value > data.usl) warning++;
      else online++;
    });
    return { online, warning, critical, total: ([] as any[]).length };
  }, [sensorData]);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">IoT Monitoring Realtime</h1>
            <p className="text-muted-foreground">Giám sát tất cả sensors theo thời gian thực</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Switch
                id="auto-refresh"
                checked={isAutoRefresh}
                onCheckedChange={setIsAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">Tự động cập nhật</Label>
            </div>
            
            <Select value={String(refreshInterval)} onValueChange={(v) => setRefreshInterval(Number(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 giây</SelectItem>
                <SelectItem value="5">5 giây</SelectItem>
                <SelectItem value="10">10 giây</SelectItem>
                <SelectItem value="30">30 giây</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={updateSensorData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Sensors</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Bình thường</p>
                  <p className="text-2xl font-bold text-green-500">{stats.online}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cảnh báo</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.warning}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nguy hiểm</p>
                  <p className="text-2xl font-bold text-red-500">{stats.critical}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="sensors" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sensors">Sensors ({filteredSensors.length})</TabsTrigger>
            <TabsTrigger value="alerts">
              Cảnh báo
              {alerts.filter(a => !a.acknowledged).length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {alerts.filter(a => !a.acknowledged).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="sensors" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm sensor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Loại sensor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  {Object.entries(SENSOR_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterLine} onValueChange={setFilterLine}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Dây chuyền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                  {uniqueLines.map(line => (
                    <SelectItem key={line} value={line}>{line}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="online">Bình thường</SelectItem>
                  <SelectItem value="warning">Cảnh báo</SelectItem>
                  <SelectItem value="critical">Nguy hiểm</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-1 border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Sensor Grid */}
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-4'
            }>
              {filteredSensors.map(sensor => (
                <SensorCard
                  key={sensor.id}
                  sensor={sensor}
                  data={sensorData[sensor.id] || generateSensorData(sensor.id, sensor.type)}
                  history={sensorHistory[sensor.id] || []}
                  onExpand={() => setExpandedSensor(sensor.id)}
                  alertEnabled={alertsEnabled[sensor.id] ?? true}
                  onToggleAlert={() => setAlertsEnabled(prev => ({
                    ...prev,
                    [sensor.id]: !prev[sensor.id]
                  }))}
                />
              ))}
            </div>
            
            {filteredSensors.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Không tìm thấy sensor nào phù hợp với bộ lọc</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {alerts.filter(a => !a.acknowledged).length} cảnh báo chưa xác nhận
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })))}
                disabled={alerts.filter(a => !a.acknowledged).length === 0}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Xác nhận tất cả
              </Button>
            </div>
            
            <div className="space-y-2">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Không có cảnh báo nào</p>
                </div>
              ) : (
                alerts.map(alert => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={() => setAlerts(prev => 
                      prev.map(a => a.id === alert.id ? { ...a, acknowledged: true } : a)
                    )}
                  />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
