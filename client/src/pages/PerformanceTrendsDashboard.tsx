import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart
} from "recharts";
import { 
  Activity, TrendingUp, Database, AlertTriangle, 
  RefreshCw, Clock, Zap
} from "lucide-react";

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d";

interface TrendDataPoint {
  timestamp: string;
  poolUtilization: number;
  cacheHitRate: number;
  queueLength: number;
  alertCount: number;
}

export default function PerformanceTrendsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  
  // Fetch check history for trends
  const { data: checkHistory, refetch: refetchHistory, isLoading } = trpc.performanceAlert.getCheckHistory.useQuery(
    { limit: getDataPointsForRange(timeRange) },
    { refetchInterval: autoRefresh ? refreshInterval * 1000 : false }
  );
  
  // Fetch check stats
  const { data: checkStats } = trpc.performanceAlert.getCheckStats.useQuery(
    undefined,
    { refetchInterval: autoRefresh ? refreshInterval * 1000 : false }
  );
  
  // Fetch alert stats
  const { data: alertStats } = trpc.performanceAlert.getStats.useQuery(
    undefined,
    { refetchInterval: autoRefresh ? refreshInterval * 1000 : false }
  );
  
  // Transform check history to trend data
  const trendData: TrendDataPoint[] = (checkHistory || [])
    .slice()
    .reverse()
    .map(check => ({
      timestamp: new Date(check.timestamp).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      }),
      poolUtilization: check.stats?.poolUtilization || 0,
      cacheHitRate: check.stats?.cacheHitRate || 0,
      queueLength: check.stats?.queueLength || 0,
      alertCount: check.alertsTriggered || 0,
    }));
  
  // Calculate daily alert counts for bar chart
  const dailyAlerts = aggregateAlertsByDay(checkHistory || []);
  
  function getDataPointsForRange(range: TimeRange): number {
    switch (range) {
      case "1h": return 12;
      case "6h": return 72;
      case "24h": return 288;
      case "7d": return 2016;
      case "30d": return 8640;
      default: return 288;
    }
  }
  
  function aggregateAlertsByDay(history: typeof checkHistory): Array<{ date: string; alerts: number; critical: number; warning: number }> {
    if (!history) return [];
    const byDay = new Map<string, { alerts: number; critical: number; warning: number }>();
    
    for (const check of history) {
      const date = new Date(check.timestamp).toLocaleDateString('vi-VN');
      const existing = byDay.get(date) || { alerts: 0, critical: 0, warning: 0 };
      existing.alerts += check.alertsTriggered || 0;
      
      for (const alert of check.alerts || []) {
        if (alert.severity === 'critical') existing.critical++;
        else if (alert.severity === 'warning') existing.warning++;
      }
      
      byDay.set(date, existing);
    }
    
    return Array.from(byDay.entries())
      .map(([date, data]) => ({ date, ...data }))
      .slice(-7);
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Performance Trends</h1>
            <p className="text-muted-foreground">
              Theo dõi xu hướng hiệu suất hệ thống theo thời gian
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ</SelectItem>
                <SelectItem value="6h">6 giờ</SelectItem>
                <SelectItem value="24h">24 giờ</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto-refresh
              </Label>
            </div>
            
            {autoRefresh && (
              <Select 
                value={refreshInterval.toString()} 
                onValueChange={(v) => setRefreshInterval(parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="30">30s</SelectItem>
                  <SelectItem value="60">1m</SelectItem>
                  <SelectItem value="300">5m</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button variant="outline" size="icon" onClick={() => refetchHistory()}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pool Utilization</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {checkStats?.averagePoolUtilization?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Trung bình sử dụng connection pool
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {checkStats?.averageCacheHitRate?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Tỷ lệ cache hit trung bình
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {checkStats?.totalChecks || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Tổng số lần kiểm tra
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {checkStats?.totalAlertsTriggered || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Tổng số cảnh báo đã trigger
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pool Utilization Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Pool Utilization Trend
              </CardTitle>
              <CardDescription>
                Xu hướng sử dụng connection pool theo thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Pool Utilization']} />
                    <Area type="monotone" dataKey="poolUtilization" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Cache Hit Rate Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Cache Hit Rate Trend
              </CardTitle>
              <CardDescription>
                Xu hướng tỷ lệ cache hit theo thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Cache Hit Rate']} />
                    <Area type="monotone" dataKey="cacheHitRate" stroke="#10b981" fill="#10b981" fillOpacity={0.3} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Queue Length Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Queue Length Trend
              </CardTitle>
              <CardDescription>
                Xu hướng độ dài hàng đợi connection theo thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => [value, 'Queue Length']} />
                    <Line type="monotone" dataKey="queueLength" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* Daily Alerts Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Daily Alert Count
              </CardTitle>
              <CardDescription>
                Số lượng cảnh báo theo ngày
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyAlerts}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" />
                    <Bar dataKey="warning" name="Warning" stackId="a" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Combined Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Combined Performance Overview
            </CardTitle>
            <CardDescription>
              Tổng quan các chỉ số hiệu suất trên cùng một biểu đồ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="poolUtilization" name="Pool Util %" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  <Line yAxisId="left" type="monotone" dataKey="cacheHitRate" name="Cache Hit %" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Bar yAxisId="right" dataKey="alertCount" name="Alerts" fill="#ef4444" opacity={0.7} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Alert Summary */}
        {alertStats && (
          <Card>
            <CardHeader>
              <CardTitle>Alert Summary</CardTitle>
              <CardDescription>
                Tổng quan cảnh báo theo loại và mức độ nghiêm trọng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-2">Theo mức độ</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="destructive">Critical</Badge>
                      <span className="font-mono">{alertStats.bySeverity?.critical || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge className="bg-orange-500">Warning</Badge>
                      <span className="font-mono">{alertStats.bySeverity?.warning || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Info</Badge>
                      <span className="font-mono">{alertStats.bySeverity?.info || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Theo loại</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Pool Utilization</span>
                      <span className="font-mono">{alertStats.byType?.pool_utilization || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cache Hit Rate</span>
                      <span className="font-mono">{alertStats.byType?.cache_hit_rate || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Slow Query</span>
                      <span className="font-mono">{alertStats.byType?.slow_query_threshold || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Queue Length</span>
                      <span className="font-mono">{alertStats.byType?.pool_queue_length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
