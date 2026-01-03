/**
 * LatencyMonitor - Component theo dõi độ trễ từ Sensor đến Server
 */
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, Cell
} from "recharts";
import { 
  Activity, Clock, AlertTriangle, CheckCircle, 
  TrendingUp, TrendingDown, Zap, Server, Wifi, RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LatencyRecord {
  id: number;
  deviceId: number;
  deviceName: string;
  sourceType: 'sensor' | 'plc' | 'gateway' | 'server';
  latencyMs: number;
  timestamp: Date;
}

interface LatencyMonitorProps {
  data: LatencyRecord[];
  thresholds?: {
    good: number;      // < good = green
    warning: number;   // < warning = yellow
    critical: number;  // >= critical = red
  };
  refreshInterval?: number;
  onRefresh?: () => void;
  showRealtime?: boolean;
}

const defaultThresholds = {
  good: 50,
  warning: 100,
  critical: 200,
};

const sourceTypeIcons: Record<string, React.ReactNode> = {
  sensor: <Activity className="h-4 w-4" />,
  plc: <Server className="h-4 w-4" />,
  gateway: <Wifi className="h-4 w-4" />,
  server: <Zap className="h-4 w-4" />,
};

const sourceTypeColors: Record<string, string> = {
  sensor: '#3b82f6',
  plc: '#8b5cf6',
  gateway: '#06b6d4',
  server: '#10b981',
};

export function LatencyMonitor({
  data,
  thresholds = defaultThresholds,
  refreshInterval = 5000,
  onRefresh,
  showRealtime = true,
}: LatencyMonitorProps) {
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('1h');
  const [isLive, setIsLive] = useState(showRealtime);

  // Auto refresh
  useEffect(() => {
    if (!isLive || !onRefresh) return;
    const interval = setInterval(onRefresh, refreshInterval);
    return () => clearInterval(interval);
  }, [isLive, onRefresh, refreshInterval]);

  // Filter data by source type
  const filteredData = useMemo(() => {
    if (selectedSource === 'all') return data;
    return data.filter(d => d.sourceType === selectedSource);
  }, [data, selectedSource]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        current: 0,
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
        p99: 0,
        trend: 'stable' as const,
        status: 'good' as const,
      };
    }

    const latencies = filteredData.map(d => d.latencyMs).sort((a, b) => a - b);
    const current = latencies[latencies.length - 1];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = latencies[0];
    const max = latencies[latencies.length - 1];
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);
    const p95 = latencies[p95Index] || max;
    const p99 = latencies[p99Index] || max;

    // Calculate trend (compare last 10 vs previous 10)
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (latencies.length >= 20) {
      const recent = latencies.slice(-10);
      const previous = latencies.slice(-20, -10);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / 10;
      const previousAvg = previous.reduce((a, b) => a + b, 0) / 10;
      const change = ((recentAvg - previousAvg) / previousAvg) * 100;
      if (change > 10) trend = 'up';
      else if (change < -10) trend = 'down';
    }

    // Determine status
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (avg >= thresholds.critical) status = 'critical';
    else if (avg >= thresholds.warning) status = 'warning';

    return { current, avg, min, max, p95, p99, trend, status };
  }, [filteredData, thresholds]);

  // Prepare chart data
  const chartData = useMemo(() => {
    return filteredData.slice(-60).map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      latency: d.latencyMs,
      device: d.deviceName,
      source: d.sourceType,
    }));
  }, [filteredData]);

  // Group by source type for distribution
  const distributionData = useMemo(() => {
    const grouped = new Map<string, number[]>();
    filteredData.forEach(d => {
      const existing = grouped.get(d.sourceType) || [];
      existing.push(d.latencyMs);
      grouped.set(d.sourceType, existing);
    });

    return Array.from(grouped.entries()).map(([source, latencies]) => ({
      source,
      avg: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
      min: Math.min(...latencies),
      max: Math.max(...latencies),
      count: latencies.length,
    }));
  }, [filteredData]);

  const getStatusColor = (latency: number) => {
    if (latency >= thresholds.critical) return '#ef4444';
    if (latency >= thresholds.warning) return '#f59e0b';
    return '#22c55e';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Tốt</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Cảnh báo</Badge>;
      case 'critical':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Nghiêm trọng</Badge>;
      default:
        return null;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium">{label}</p>
          <div className="space-y-1 mt-2 text-sm">
            <p className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Latency: <span className="font-medium" style={{ color: getStatusColor(data.latency) }}>
                {data.latency}ms
              </span>
            </p>
            <p className="flex items-center gap-2">
              {sourceTypeIcons[data.source]}
              <span className="capitalize">{data.source}</span>
            </p>
            {data.device && (
              <p className="text-muted-foreground">{data.device}</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Nguồn" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="sensor">Sensor</SelectItem>
              <SelectItem value="plc">PLC</SelectItem>
              <SelectItem value="gateway">Gateway</SelectItem>
              <SelectItem value="server">Server</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Thời gian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5m">5 phút</SelectItem>
              <SelectItem value="15m">15 phút</SelectItem>
              <SelectItem value="1h">1 giờ</SelectItem>
              <SelectItem value="6h">6 giờ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={isLive ? "default" : "outline"}
            onClick={() => setIsLive(!isLive)}
          >
            <Activity className={cn("h-4 w-4 mr-1", isLive && "animate-pulse")} />
            {isLive ? 'Live' : 'Paused'}
          </Button>
          <Button size="sm" variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Hiện tại</span>
              {getStatusBadge(stats.status)}
            </div>
            <p className="text-2xl font-bold mt-1" style={{ color: getStatusColor(stats.current) }}>
              {stats.current.toFixed(0)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Trung bình</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.avg.toFixed(1)}ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-sm">Min</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-500">{stats.min.toFixed(0)}ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span className="text-sm">Max</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-500">{stats.max.toFixed(0)}ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">P95</div>
            <p className="text-2xl font-bold mt-1">{stats.p95.toFixed(0)}ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">P99</div>
            <p className="text-2xl font-bold mt-1">{stats.p99.toFixed(0)}ms</p>
          </CardContent>
        </Card>
      </div>

      {/* Threshold Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Ngưỡng hiện tại</span>
              <span className="font-medium" style={{ color: getStatusColor(stats.avg) }}>
                {stats.avg.toFixed(1)}ms
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={Math.min((stats.avg / thresholds.critical) * 100, 100)} 
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0ms</span>
                <span className="text-green-500">{thresholds.good}ms</span>
                <span className="text-yellow-500">{thresholds.warning}ms</span>
                <span className="text-red-500">{thresholds.critical}ms</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="realtime" className="w-full">
        <TabsList>
          <TabsTrigger value="realtime">Realtime</TabsTrigger>
          <TabsTrigger value="distribution">Phân bố</TabsTrigger>
          <TabsTrigger value="sources">Theo nguồn</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Latency Realtime
              </CardTitle>
              <CardDescription>Độ trễ theo thời gian thực</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Threshold lines */}
                    <Line 
                      type="monotone" 
                      dataKey={() => thresholds.warning} 
                      stroke="#f59e0b" 
                      strokeDasharray="5 5" 
                      dot={false}
                      name="Warning"
                    />
                    <Line 
                      type="monotone" 
                      dataKey={() => thresholds.critical} 
                      stroke="#ef4444" 
                      strokeDasharray="5 5" 
                      dot={false}
                      name="Critical"
                    />
                    
                    <Area 
                      type="monotone" 
                      dataKey="latency" 
                      stroke="#3b82f6" 
                      fill="url(#latencyGradient)"
                      strokeWidth={2}
                      name="Latency"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Phân bố Latency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg" name="Trung bình (ms)" fill="#3b82f6" />
                    <Bar dataKey="min" name="Min (ms)" fill="#22c55e" />
                    <Bar dataKey="max" name="Max (ms)" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {distributionData.map(source => (
              <Card key={source.source}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {sourceTypeIcons[source.source]}
                    <span className="font-medium capitalize">{source.source}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trung bình</span>
                      <span className="font-medium">{source.avg}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min/Max</span>
                      <span>{source.min}/{source.max}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số mẫu</span>
                      <span>{source.count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>&lt; {thresholds.good}ms (Tốt)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span>&lt; {thresholds.warning}ms (Cảnh báo)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>≥ {thresholds.critical}ms (Nghiêm trọng)</span>
        </div>
      </div>
    </div>
  );
}

export default LatencyMonitor;
