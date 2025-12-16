import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useOEEUpdates } from "@/hooks/useWebSocket";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, Wifi, WifiOff, RefreshCw, Pause, Play } from "lucide-react";

interface OEEDataPoint {
  timestamp: Date | string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  machineId?: number;
  machineName?: string;
}

interface OEETrendChartProps {
  data: OEEDataPoint[];
  title?: string;
  description?: string;
  showComponents?: boolean;
  targetOEE?: number;
  height?: number;
  machineId?: number;
  enableRealtime?: boolean;
  onDataUpdate?: (newData: OEEDataPoint) => void;
}

export function OEETrendChart({
  data,
  title = "Xu hướng OEE",
  description = "Biểu đồ theo dõi OEE theo thời gian",
  showComponents = true,
  targetOEE = 85,
  height = 300,
  machineId,
  enableRealtime = false,
  onDataUpdate
}: OEETrendChartProps) {
  const [viewMode, setViewMode] = useState<"oee" | "components" | "all">("all");
  const [timeRange, setTimeRange] = useState<"1h" | "4h" | "8h" | "24h" | "7d">("8h");
  const [isPaused, setIsPaused] = useState(false);
  const [realtimeData, setRealtimeData] = useState<OEEDataPoint[]>(data);

  // WebSocket realtime updates
  const { data: wsOEEData, isConnected } = useOEEUpdates(machineId);

  // Update realtime data when WebSocket receives new data
  useEffect(() => {
    if (enableRealtime && wsOEEData && !isPaused) {
      const newPoint: OEEDataPoint = {
        timestamp: new Date(),
        oee: wsOEEData.oee,
        availability: wsOEEData.availability,
        performance: wsOEEData.performance,
        quality: wsOEEData.quality,
        machineId: wsOEEData.machineId
      };
      
      setRealtimeData(prev => {
        const updated = [...prev, newPoint];
        // Keep only last 100 data points
        if (updated.length > 100) {
          return updated.slice(-100);
        }
        return updated;
      });

      if (onDataUpdate) {
        onDataUpdate(newPoint);
      }
    }
  }, [wsOEEData, enableRealtime, isPaused, onDataUpdate]);

  // Sync with prop data when not in realtime mode
  useEffect(() => {
    if (!enableRealtime) {
      setRealtimeData(data);
    }
  }, [data, enableRealtime]);

  const displayData = enableRealtime ? realtimeData : data;

  const chartData = useMemo(() => {
    return displayData.map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      fullTime: new Date(point.timestamp).toLocaleString('vi-VN')
    }));
  }, [displayData]);

  const stats = useMemo(() => {
    if (displayData.length === 0) return null;
    
    const oeeValues = displayData.map(d => d.oee);
    const avgOEE = oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length;
    const minOEE = Math.min(...oeeValues);
    const maxOEE = Math.max(...oeeValues);
    const latestOEE = oeeValues[oeeValues.length - 1];
    const previousOEE = oeeValues.length > 1 ? oeeValues[oeeValues.length - 2] : latestOEE;
    const trend = latestOEE - previousOEE;

    return { avgOEE, minOEE, maxOEE, latestOEE, trend };
  }, [displayData]);

  const getTrendIcon = (trend: number) => {
    if (trend > 0.5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < -0.5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getOEEStatus = (oee: number) => {
    if (oee >= 85) return { color: "bg-green-500", label: "Xuất sắc" };
    if (oee >= 70) return { color: "bg-yellow-500", label: "Tốt" };
    if (oee >= 55) return { color: "bg-orange-500", label: "Trung bình" };
    return { color: "bg-red-500", label: "Cần cải thiện" };
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-2">{data.fullTime}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground">{entry.name}:</span>
                <span className="font-medium">{entry.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Realtime Controls */}
            {enableRealtime && (
              <>
                <Badge variant={isConnected ? "default" : "destructive"} className="gap-1">
                  {isConnected ? (
                    <><Wifi className="h-3 w-3" /> Live</>
                  ) : (
                    <><WifiOff className="h-3 w-3" /> Offline</>
                  )}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPaused(!isPaused)}
                  className="h-8"
                >
                  {isPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRealtimeData(data)}
                  className="h-8"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </>
            )}
            <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
              <SelectTrigger className="w-[140px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="oee">Chỉ OEE</SelectItem>
                <SelectItem value="components">Thành phần</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ</SelectItem>
                <SelectItem value="4h">4 giờ</SelectItem>
                <SelectItem value="8h">8 giờ</SelectItem>
                <SelectItem value="24h">24 giờ</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-5 gap-2 mt-3">
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Hiện tại</p>
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                {stats.latestOEE.toFixed(1)}%
                {getTrendIcon(stats.trend)}
              </p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Trung bình</p>
              <p className="text-lg font-bold">{stats.avgOEE.toFixed(1)}%</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Thấp nhất</p>
              <p className="text-lg font-bold text-red-500">{stats.minOEE.toFixed(1)}%</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Cao nhất</p>
              <p className="text-lg font-bold text-green-500">{stats.maxOEE.toFixed(1)}%</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded">
              <p className="text-xs text-muted-foreground">Trạng thái</p>
              <Badge className={`${getOEEStatus(stats.latestOEE).color} text-white`}>
                {getOEEStatus(stats.latestOEE).label}
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10 }} 
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Target OEE line */}
              <ReferenceLine 
                y={targetOEE} 
                stroke="#22c55e" 
                strokeDasharray="5 5" 
                label={{ value: `Mục tiêu ${targetOEE}%`, position: 'right', fontSize: 10 }}
              />

              {/* OEE Area */}
              {(viewMode === "oee" || viewMode === "all") && (
                <Area
                  type="monotone"
                  dataKey="oee"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name="OEE"
                  dot={false}
                />
              )}

              {/* Component Lines */}
              {(viewMode === "components" || viewMode === "all") && showComponents && (
                <>
                  <Line
                    type="monotone"
                    dataKey="availability"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    dot={false}
                    name="Availability"
                  />
                  <Line
                    type="monotone"
                    dataKey="performance"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    dot={false}
                    name="Performance"
                  />
                  <Line
                    type="monotone"
                    dataKey="quality"
                    stroke="#8b5cf6"
                    strokeWidth={1.5}
                    dot={false}
                    name="Quality"
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini version for dashboard cards
export function OEETrendMini({ data, height = 80 }: { data: OEEDataPoint[], height?: number }) {
  const chartData = useMemo(() => {
    return data.slice(-20).map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }));
  }, [data]);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData}>
          <Area
            type="monotone"
            dataKey="oee"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={false}
          />
          <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="3 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
