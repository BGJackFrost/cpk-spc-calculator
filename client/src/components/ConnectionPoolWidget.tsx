import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import {
  Database,
  Activity,
  Clock,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Server,
  Zap
} from "lucide-react";

interface PoolStats {
  active: number;
  idle: number;
  total: number;
  maxConnections: number;
  waitingRequests: number;
}

interface LatencyStats {
  avg: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
}

interface HistoryPoint {
  time: string;
  active: number;
  idle: number;
  latency: number;
}

export function ConnectionPoolWidget() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  const poolStatsQuery = trpc.databaseConnection.getPoolStats?.useQuery?.(undefined, {
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const latencyQuery = trpc.databaseConnection.getQueryLatency?.useQuery?.(undefined, {
    refetchInterval: autoRefresh ? 10000 : false,
  });

  const historyQuery = trpc.databaseConnection.getConnectionHistory?.useQuery?.(
    { minutes: 30 },
    { refetchInterval: autoRefresh ? 30000 : false }
  );

  // Mock data for demo
  const poolStats: PoolStats = poolStatsQuery?.data || {
    active: 3,
    idle: 7,
    total: 10,
    maxConnections: 20,
    waitingRequests: 0,
  };

  const latencyStats: LatencyStats = latencyQuery?.data || {
    avg: 12.5,
    min: 2.1,
    max: 45.3,
    p95: 28.4,
    p99: 42.1,
  };

  const history: HistoryPoint[] = historyQuery?.data || generateMockHistory();

  function generateMockHistory(): HistoryPoint[] {
    const now = Date.now();
    return Array.from({ length: 30 }, (_, i) => ({
      time: new Date(now - (29 - i) * 60000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      active: Math.floor(Math.random() * 5) + 2,
      idle: Math.floor(Math.random() * 8) + 3,
      latency: Math.random() * 30 + 5,
    }));
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        poolStatsQuery?.refetch?.(),
        latencyQuery?.refetch?.(),
        historyQuery?.refetch?.(),
      ]);
      toast({
        title: "Đã làm mới",
        description: "Dữ liệu đã được cập nhật",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const utilizationPercent = (poolStats.total / poolStats.maxConnections) * 100;
  const isHealthy = poolStats.waitingRequests === 0 && utilizationPercent < 80;
  const isWarning = utilizationPercent >= 80 && utilizationPercent < 95;
  const isCritical = utilizationPercent >= 95 || poolStats.waitingRequests > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Connection Pool Monitor
            </CardTitle>
            <CardDescription>Giám sát kết nối database realtime</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isHealthy ? "default" : isWarning ? "secondary" : "destructive"}>
              {isHealthy ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Healthy</>
              ) : isWarning ? (
                <><AlertTriangle className="h-3 w-3 mr-1" /> Warning</>
              ) : (
                <><AlertTriangle className="h-3 w-3 mr-1" /> Critical</>
              )}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pool Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-600">{poolStats.active}</div>
            <div className="text-sm text-green-700">Active</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">{poolStats.idle}</div>
            <div className="text-sm text-blue-700">Idle</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{poolStats.total}/{poolStats.maxConnections}</div>
            <div className="text-sm text-gray-700">Total/Max</div>
          </div>
          <div className={`text-center p-3 rounded-lg border ${poolStats.waitingRequests > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"}`}>
            <div className={`text-2xl font-bold ${poolStats.waitingRequests > 0 ? "text-red-600" : "text-gray-600"}`}>
              {poolStats.waitingRequests}
            </div>
            <div className={`text-sm ${poolStats.waitingRequests > 0 ? "text-red-700" : "text-gray-700"}`}>Waiting</div>
          </div>
        </div>

        {/* Utilization Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Pool Utilization</span>
            <span className={`font-medium ${isCritical ? "text-red-600" : isWarning ? "text-yellow-600" : "text-green-600"}`}>
              {utilizationPercent.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={utilizationPercent} 
            className={`h-2 ${isCritical ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`}
          />
        </div>

        {/* Latency Stats */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Query Latency (ms)
          </h4>
          <div className="grid grid-cols-5 gap-2 text-center">
            <div className="p-2 bg-muted rounded">
              <div className="text-lg font-semibold">{latencyStats.min.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Min</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="text-lg font-semibold">{latencyStats.avg.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Avg</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="text-lg font-semibold">{latencyStats.max.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">Max</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="text-lg font-semibold">{latencyStats.p95.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">P95</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="text-lg font-semibold">{latencyStats.p99.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">P99</div>
            </div>
          </div>
        </div>

        {/* Connection History Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Connection History (30 phút)
          </h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [
                    value.toFixed(1),
                    name === "active" ? "Active" : name === "idle" ? "Idle" : "Latency (ms)"
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="active"
                  stackId="1"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="idle"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Trend Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Latency Trend
          </h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number) => [`${value.toFixed(1)} ms`, "Latency"]}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Auto Refresh Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            Auto refresh: {autoRefresh ? "Bật (5s)" : "Tắt"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Tắt auto refresh" : "Bật auto refresh"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
