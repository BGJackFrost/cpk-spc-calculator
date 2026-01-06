/**
 * IoT Overview Dashboard
 * Dashboard tổng quan IoT với thống kê thiết bị, alarm và biểu đồ trend
 * Bao gồm biểu đồ MTTR/MTBF
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Cpu,
  Wifi,
  WifiOff,
  AlertTriangle,
  AlertCircle,
  Bell,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Zap,
  Wrench,
  Timer,
  Gauge,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  ComposedChart,
  Bar,
} from 'recharts';
import { trpc } from '@/lib/trpc';
import { useSSE } from '@/hooks/useSSE';
import { toast } from 'sonner';
import MttrMtbfComparisonWidget from '@/components/MttrMtbfComparisonWidget';
import MqttRealtimeWidget from '@/components/MqttRealtimeWidget';
import OeeLineComparisonRealtime from '@/components/OeeLineComparisonRealtime';

// Colors for severity
const SEVERITY_COLORS = {
  critical: '#ef4444',
  error: '#f97316',
  warning: '#eab308',
  info: '#3b82f6',
};

// Colors for MTTR/MTBF charts
const MTTR_MTBF_COLORS = {
  mttr: '#f59e0b', // Amber
  mtbf: '#10b981', // Emerald
  availability: '#6366f1', // Indigo
};

export default function IotOverviewDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Calculate days from timeRange
  const days = useMemo(() => {
    switch (timeRange) {
      case '7d': return 7;
      case '14d': return 14;
      case '30d': return 30;
      default: return 7;
    }
  }, [timeRange]);

  // Fetch device stats
  const { data: deviceStats, isLoading: loadingDevices, refetch: refetchDevices } = 
    trpc.iotCrud.getDeviceStats.useQuery();

  // Fetch alarm stats
  const { data: alarmStats, isLoading: loadingAlarms, refetch: refetchAlarms } = 
    trpc.iotCrud.getAlarmStats.useQuery();

  // Fetch recent alarms
  const { data: recentAlarms, isLoading: loadingRecentAlarms, refetch: refetchRecentAlarms } = 
    trpc.iotCrud.getAlarms.useQuery({
      resolved: false,
      limit: 10,
    });

  // Fetch devices for list
  const { data: devices, isLoading: loadingDeviceList } = 
    trpc.iotCrud.getDevices.useQuery({ limit: 100 });

  // Fetch MTTR/MTBF trend data
  const { data: mttrMtbfTrend, isLoading: loadingMttrMtbf, refetch: refetchMttrMtbf } = 
    trpc.iotCrud.getMttrMtbfTrend.useQuery({ days });

  // Fetch MTTR/MTBF summary
  const { data: mttrMtbfSummary, isLoading: loadingMttrMtbfSummary, refetch: refetchMttrMtbfSummary } = 
    trpc.iotCrud.getMttrMtbfSummary.useQuery({ days });

  // SSE for realtime updates
  const { isConnected } = useSSE({
    enabled: autoRefresh,
    onIotAlarm: useCallback((data: any) => {
      toast.warning('Alarm mới', {
        description: data.message || 'Có alarm mới từ thiết bị IoT',
      });
      refetchAlarms();
      refetchRecentAlarms();
    }, [refetchAlarms, refetchRecentAlarms]),
    onIotDeviceStatus: useCallback((data: any) => {
      if (data.newStatus === 'offline') {
        toast.error('Thiết bị offline', {
          description: `${data.deviceName} đã mất kết nối`,
        });
      }
      refetchDevices();
    }, [refetchDevices]),
  });

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refetchDevices();
      refetchAlarms();
      refetchRecentAlarms();
      refetchMttrMtbf();
      refetchMttrMtbfSummary();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetchDevices, refetchAlarms, refetchRecentAlarms, refetchMttrMtbf, refetchMttrMtbfSummary]);

  // Calculate device status counts
  const onlineDevices = devices?.filter(d => d.status === 'online').length || 0;
  const offlineDevices = devices?.filter(d => d.status === 'offline').length || 0;
  const warningDevices = devices?.filter(d => d.status === 'warning').length || 0;
  const totalDevices = devices?.length || 0;

  // Generate mock trend data (in real app, this would come from API)
  const generateTrendData = () => {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
        critical: Math.floor(Math.random() * 5),
        error: Math.floor(Math.random() * 10),
        warning: Math.floor(Math.random() * 20),
        info: Math.floor(Math.random() * 30),
      });
    }
    return data;
  };

  const [trendData] = useState(generateTrendData);

  // Severity distribution data
  const severityData = [
    { name: 'Critical', value: alarmStats?.critical || 0, color: SEVERITY_COLORS.critical },
    { name: 'Error', value: alarmStats?.error || 0, color: SEVERITY_COLORS.error },
    { name: 'Warning', value: alarmStats?.warning || 0, color: SEVERITY_COLORS.warning },
  ];

  // Format MTTR/MTBF trend data for chart
  const formattedMttrMtbfTrend = useMemo(() => {
    if (!mttrMtbfTrend || !Array.isArray(mttrMtbfTrend)) return [];
    return mttrMtbfTrend.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      mttr: item.mttr,
      mtbf: item.mtbf,
      availability: Math.round(item.availability * 100),
    }));
  }, [mttrMtbfTrend]);

  const handleRefresh = () => {
    refetchDevices();
    refetchAlarms();
    refetchRecentAlarms();
    refetchMttrMtbf();
    refetchMttrMtbfSummary();
    toast.success('Đã làm mới dữ liệu');
  };

  // Render trend indicator
  const renderTrendIndicator = (trend: string, changePercent: number) => {
    const isUp = trend === 'up';
    const Icon = isUp ? TrendingUp : TrendingDown;
    const color = isUp ? 'text-green-500' : 'text-red-500';
    
    return (
      <span className={`flex items-center gap-1 text-xs ${color}`}>
        <Icon className="h-3 w-3" />
        {changePercent}%
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">IoT Overview Dashboard</h1>
            <p className="text-muted-foreground">
              Tổng quan thiết bị IoT và cảnh báo
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Realtime' : 'Offline'}
              </span>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="14d">14 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Devices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingDevices ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{totalDevices}</div>
                  <p className="text-xs text-muted-foreground">
                    {onlineDevices} online, {offlineDevices} offline
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Online Devices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Thiết bị Online</CardTitle>
              <Wifi className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {loadingDevices ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-green-600">{onlineDevices}</div>
                  <p className="text-xs text-muted-foreground">
                    {totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0}% hoạt động
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Offline Devices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Thiết bị Offline</CardTitle>
              <WifiOff className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {loadingDevices ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">{offlineDevices}</div>
                  <p className="text-xs text-muted-foreground">
                    {warningDevices} cảnh báo
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Unresolved Alarms */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alarm chưa xử lý</CardTitle>
              <Bell className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {loadingAlarms ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">
                    {alarmStats?.unresolved || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {alarmStats?.unacknowledged || 0} chưa xác nhận
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MTTR/MTBF Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MTTR Card */}
          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Timer className="h-4 w-4 text-amber-500" />
                MTTR (Mean Time To Repair)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMttrMtbfSummary ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-amber-600">
                      {mttrMtbfSummary?.mttr?.current || 0}
                    </span>
                    <span className="text-sm text-muted-foreground">phút</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mttrMtbfSummary?.mttr && renderTrendIndicator(
                      mttrMtbfSummary.mttr.trend,
                      mttrMtbfSummary.mttr.changePercent
                    )}
                    <span className="text-xs text-muted-foreground">
                      so với kỳ trước
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MTBF Card */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wrench className="h-4 w-4 text-emerald-500" />
                MTBF (Mean Time Between Failures)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMttrMtbfSummary ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-emerald-600">
                      {mttrMtbfSummary?.mtbf?.current || 0}
                    </span>
                    <span className="text-sm text-muted-foreground">giờ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mttrMtbfSummary?.mtbf && renderTrendIndicator(
                      mttrMtbfSummary.mtbf.trend,
                      mttrMtbfSummary.mtbf.changePercent
                    )}
                    <span className="text-xs text-muted-foreground">
                      so với kỳ trước
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Availability Card */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gauge className="h-4 w-4 text-indigo-500" />
                Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMttrMtbfSummary ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-indigo-600">
                      {mttrMtbfSummary?.availability?.current || 0}
                    </span>
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mttrMtbfSummary?.availability && renderTrendIndicator(
                      mttrMtbfSummary.availability.trend,
                      mttrMtbfSummary.availability.changePercent
                    )}
                    <span className="text-xs text-muted-foreground">
                      so với kỳ trước
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alarm Stats by Severity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {alarmStats?.critical || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {alarmStats?.error || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {alarmStats?.warning || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alarm Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Xu hướng Alarm
              </CardTitle>
              <CardDescription>
                Số lượng alarm theo ngày trong {days} ngày qua
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="critical"
                      stackId="1"
                      stroke={SEVERITY_COLORS.critical}
                      fill={SEVERITY_COLORS.critical}
                      name="Critical"
                    />
                    <Area
                      type="monotone"
                      dataKey="error"
                      stackId="1"
                      stroke={SEVERITY_COLORS.error}
                      fill={SEVERITY_COLORS.error}
                      name="Error"
                    />
                    <Area
                      type="monotone"
                      dataKey="warning"
                      stackId="1"
                      stroke={SEVERITY_COLORS.warning}
                      fill={SEVERITY_COLORS.warning}
                      name="Warning"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Phân bố Severity
              </CardTitle>
              <CardDescription>
                Tỷ lệ alarm theo mức độ nghiêm trọng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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

        {/* MTTR/MTBF Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MTTR Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-amber-500" />
                Xu hướng MTTR
              </CardTitle>
              <CardDescription>
                Thời gian sửa chữa trung bình (phút) trong {days} ngày qua
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMttrMtbf ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={formattedMttrMtbfTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="mttr"
                        fill={MTTR_MTBF_COLORS.mttr}
                        name="MTTR (phút)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="availability"
                        stroke={MTTR_MTBF_COLORS.availability}
                        name="Availability (%)"
                        strokeWidth={2}
                        dot={{ fill: MTTR_MTBF_COLORS.availability }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MTBF Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-emerald-500" />
                Xu hướng MTBF
              </CardTitle>
              <CardDescription>
                Thời gian giữa các lần hỏng (giờ) trong {days} ngày qua
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMttrMtbf ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formattedMttrMtbfTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="mtbf"
                        stroke={MTTR_MTBF_COLORS.mtbf}
                        fill={MTTR_MTBF_COLORS.mtbf}
                        fillOpacity={0.3}
                        name="MTBF (giờ)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MTTR/MTBF Comparison Widget */}
        <MttrMtbfComparisonWidget className="" />

        {/* OEE Line Comparison Realtime */}
        <OeeLineComparisonRealtime className="" />

        {/* MQTT Realtime Sensors Widget with Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Sensors Realtime & Trend
            </CardTitle>
            <CardDescription>
              Theo dõi sensors realtime và biểu đồ xu hướng. Click vào sensor để thêm vào biểu đồ trend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MqttRealtimeWidget 
              className="" 
              showMessages={false} 
              maxSensors={16} 
            />
          </CardContent>
        </Card>

        {/* Recent Alarms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alarm gần đây
            </CardTitle>
            <CardDescription>
              10 alarm chưa xử lý gần nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRecentAlarms ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentAlarms && recentAlarms.length > 0 ? (
              <div className="space-y-2">
                {recentAlarms.map((alarm: any) => (
                  <div
                    key={alarm.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        alarm.alarmType === 'critical' ? 'bg-red-100 text-red-600' :
                        alarm.alarmType === 'error' ? 'bg-orange-100 text-orange-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>
                        {alarm.alarmType === 'critical' ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{alarm.message}</p>
                        <p className="text-sm text-muted-foreground">
                          Device ID: {alarm.deviceId} • {alarm.alarmCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        alarm.alarmType === 'critical' ? 'destructive' :
                        alarm.alarmType === 'error' ? 'default' :
                        'secondary'
                      }>
                        {alarm.alarmType}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alarm.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                <p>Không có alarm chưa xử lý</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
