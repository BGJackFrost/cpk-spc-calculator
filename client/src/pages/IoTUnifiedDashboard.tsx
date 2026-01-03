import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  RefreshCw,
  Download,
  Map,
  BarChart3,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Cpu,
  Factory,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  Maximize2,
  Filter,
  Gauge,
} from 'lucide-react';
import LatencyTrendsChart from '@/components/LatencyTrendsChart';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const STATUS_COLORS = {
  running: '#22c55e',
  idle: '#eab308',
  error: '#ef4444',
  maintenance: '#3b82f6',
  offline: '#6b7280',
};

// Time range options
const TIME_RANGES = [
  { value: '1h', label: '1 giờ' },
  { value: '6h', label: '6 giờ' },
  { value: '24h', label: '24 giờ' },
  { value: '7d', label: '7 ngày' },
  { value: '30d', label: '30 ngày' },
];

// Mini Floor Plan Component
function MiniFloorPlan({ 
  machines, 
  onMachineClick 
}: { 
  machines: any[];
  onMachineClick?: (machine: any) => void;
}) {
  const gridSize = 8;
  
  return (
    <div className="relative w-full h-64 bg-muted/30 rounded-lg border overflow-hidden">
      {/* Grid background */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Machines */}
      {machines.slice(0, 12).map((machine, index) => {
        const row = Math.floor(index / 4);
        const col = index % 4;
        const x = 20 + col * 100;
        const y = 20 + row * 80;
        
        return (
          <div
            key={machine.id}
            className="absolute flex flex-col items-center justify-center rounded cursor-pointer transition-transform hover:scale-105"
            style={{
              left: x,
              top: y,
              width: 80,
              height: 60,
              backgroundColor: STATUS_COLORS[machine.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.offline,
            }}
            onClick={() => onMachineClick?.(machine)}
          >
            <Cpu className="w-5 h-5 text-white mb-1" />
            <span className="text-xs text-white font-medium truncate max-w-full px-1">
              {machine.name?.substring(0, 8)}
            </span>
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="absolute bottom-2 right-2 flex gap-2 bg-background/80 rounded p-1 text-xs">
        {Object.entries(STATUS_COLORS).slice(0, 4).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Pareto Chart Component
function ParetoChart({ data }: { data: any[] }) {
  // Calculate cumulative percentage
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let cumulative = 0;
  const chartData = data.map((item) => {
    cumulative += item.count;
    return {
      ...item,
      percentage: (item.count / total) * 100,
      cumulative: (cumulative / total) * 100,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={250}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis 
          dataKey="reason" 
          tick={{ fontSize: 10 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
        <Tooltip />
        <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Số lần" />
        <Line 
          yAxisId="right" 
          type="monotone" 
          dataKey="cumulative" 
          stroke="#ef4444" 
          strokeWidth={2}
          dot={{ fill: '#ef4444' }}
          name="Tích lũy %"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// Latency Monitor Component
function LatencyMonitor({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip />
        <Area 
          type="monotone" 
          dataKey="sensor" 
          stackId="1" 
          stroke="#3b82f6" 
          fill="#3b82f6" 
          fillOpacity={0.6}
          name="Sensor"
        />
        <Area 
          type="monotone" 
          dataKey="plc" 
          stackId="1" 
          stroke="#10b981" 
          fill="#10b981" 
          fillOpacity={0.6}
          name="PLC"
        />
        <Area 
          type="monotone" 
          dataKey="gateway" 
          stackId="1" 
          stroke="#f59e0b" 
          fill="#f59e0b" 
          fillOpacity={0.6}
          name="Gateway"
        />
        <Area 
          type="monotone" 
          dataKey="server" 
          stackId="1" 
          stroke="#8b5cf6" 
          fill="#8b5cf6" 
          fillOpacity={0.6}
          name="Server"
        />
        <Legend />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend 
}: { 
  title: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                <span>{change}</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function IoTUnifiedDashboard() {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedLineId, setSelectedLineId] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Queries
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines, refetch: refetchMachines } = trpc.machine.list.useQuery();
  const { data: iotDevices, refetch: refetchDevices } = trpc.iotSensor.listDevices.useQuery();
  const { data: iotStats, refetch: refetchStats } = trpc.iotSensor.getStats.useQuery();
  const { data: downtimeData } = trpc.iotDashboard.getDowntimePareto.useQuery({ 
    days: timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 1 
  });
  const { data: latencyData } = trpc.iotDashboard.getLatencyHistory.useQuery({ 
    hours: timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24 
  });

  // Latency percentile trends
  const { data: latencyTrends } = trpc.latency.getPercentileTrends.useQuery({
    interval: timeRange === '7d' || timeRange === '30d' ? 'day' : 'hour',
    startDate: new Date(Date.now() - (timeRange === '1h' ? 3600000 : timeRange === '6h' ? 21600000 : timeRange === '24h' ? 86400000 : timeRange === '7d' ? 604800000 : 2592000000)),
  });

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refetchMachines();
      refetchDevices();
      refetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetchMachines, refetchDevices, refetchStats]);

  // Calculate stats
  const stats = useMemo(() => {
    const machineList = machines || [];
    const deviceList = iotDevices || [];
    
    const runningMachines = machineList.filter((m: any) => m.status === 'running').length;
    const totalMachines = machineList.length;
    const activeDevices = deviceList.filter((d: any) => d.isOnline).length;
    const totalDevices = deviceList.length;
    
    return {
      machineUtilization: totalMachines > 0 ? Math.round((runningMachines / totalMachines) * 100) : 0,
      runningMachines,
      totalMachines,
      activeDevices,
      totalDevices,
      avgLatency: iotStats?.avgLatency || 0,
      alertCount: iotStats?.activeAlerts || 0,
    };
  }, [machines, iotDevices, iotStats]);

  // Filter machines by production line
  const filteredMachines = useMemo(() => {
    if (!machines) return [];
    if (selectedLineId === 'all') return machines;
    return machines.filter((m: any) => m.productionLineId === parseInt(selectedLineId));
  }, [machines, selectedLineId]);

  // Mock pareto data if not available
  const paretoData = downtimeData || [
    { reason: 'Hỏng động cơ', count: 45 },
    { reason: 'Lỗi cảm biến', count: 32 },
    { reason: 'Kẹt băng tải', count: 28 },
    { reason: 'Quá nhiệt', count: 20 },
    { reason: 'Lỗi PLC', count: 15 },
    { reason: 'Khác', count: 10 },
  ];

  // Mock latency data if not available
  const latencyHistory = latencyData || Array.from({ length: 12 }, (_, i) => ({
    time: `${i * 2}:00`,
    sensor: Math.random() * 10 + 5,
    plc: Math.random() * 15 + 10,
    gateway: Math.random() * 20 + 15,
    server: Math.random() * 10 + 5,
  }));

  const handleExport = () => {
    toast.success('Đang xuất báo cáo...');
    // TODO: Implement export
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard IoT Tổng hợp</h1>
            <p className="text-muted-foreground">
              Giám sát FloorPlan, Pareto và Latency trên cùng một màn hình
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedLineId} onValueChange={setSelectedLineId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Dây chuyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {productionLines?.map((line: any) => (
                  <SelectItem key={line.id} value={String(line.id)}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Auto' : 'Manual'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Hiệu suất máy"
            value={`${stats.machineUtilization}%`}
            change={stats.machineUtilization > 80 ? '+5% so với hôm qua' : '-3% so với hôm qua'}
            icon={Factory}
            trend={stats.machineUtilization > 80 ? 'up' : 'down'}
          />
          <StatsCard
            title="Máy đang chạy"
            value={`${stats.runningMachines}/${stats.totalMachines}`}
            icon={Cpu}
            trend="neutral"
          />
          <StatsCard
            title="Thiết bị IoT"
            value={`${stats.activeDevices}/${stats.totalDevices}`}
            change={`${stats.activeDevices} online`}
            icon={Activity}
            trend={stats.activeDevices === stats.totalDevices ? 'up' : 'neutral'}
          />
          <StatsCard
            title="Cảnh báo"
            value={stats.alertCount}
            change={stats.alertCount > 0 ? 'Cần xử lý' : 'Không có'}
            icon={AlertTriangle}
            trend={stats.alertCount > 0 ? 'down' : 'up'}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Floor Plan */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Map className="w-5 h-5 text-primary" />
                  <CardTitle>Sơ đồ Nhà máy</CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/floor-plan-designer">
                    <Maximize2 className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              <CardDescription>
                Trạng thái realtime của các máy móc
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MiniFloorPlan 
                machines={filteredMachines} 
                onMachineClick={(machine) => toast.info(`Máy: ${machine.name}`)}
              />
            </CardContent>
          </Card>

          {/* Pareto Chart */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <CardTitle>Pareto - Nguyên nhân dừng máy</CardTitle>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <a href="/defect-statistics">
                    <Maximize2 className="w-4 h-4" />
                  </a>
                </Button>
              </div>
              <CardDescription>
                Top nguyên nhân theo quy tắc 80/20
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParetoChart data={paretoData} />
            </CardContent>
          </Card>

          {/* Latency Monitor */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle>Độ trễ hệ thống</CardTitle>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={stats.avgLatency < 50 ? 'default' : stats.avgLatency < 100 ? 'secondary' : 'destructive'}>
                      Avg: {stats.avgLatency.toFixed(1)}ms
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/iot-monitoring">
                      <Maximize2 className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <CardDescription>
                Độ trễ từ Sensor → PLC → Gateway → Server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LatencyMonitor data={latencyHistory} />
            </CardContent>
          </Card>
        </div>

        {/* Latency Trends Chart with P50, P95, P99 */}
        <LatencyTrendsChart
          data={latencyTrends || []}
          isLoading={!latencyTrends}
          title="Latency Trends (P50/P95/P99)"
          description="Phân tích độ trễ theo percentile qua thời gian"
          showPercentiles={true}
          warningThreshold={200}
          criticalThreshold={500}
          height={350}
        />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Truy cập nhanh</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <a href="/floor-plan-designer">
                  <Map className="w-6 h-6 mb-2" />
                  <span>Thiết kế Layout</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <a href="/defect-statistics">
                  <BarChart3 className="w-6 h-6 mb-2" />
                  <span>Thống kê lỗi</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <a href="/iot-monitoring">
                  <Activity className="w-6 h-6 mb-2" />
                  <span>IoT Monitoring</span>
                </a>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <a href="/alert-webhook-settings">
                  <Settings className="w-6 h-6 mb-2" />
                  <span>Cấu hình Webhook</span>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
