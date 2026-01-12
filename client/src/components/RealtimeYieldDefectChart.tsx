/**
 * Component biểu đồ Yield Rate và Defect Rate theo thời gian thực
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  RefreshCw, 
  Wifi, 
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useRealtimeYieldDefect, YieldDefectAlert } from '@/hooks/useRealtimeYieldDefect';
import { toast } from 'sonner';

interface RealtimeYieldDefectChartProps {
  productionLineId?: number;
  productionLineName?: string;
  yieldWarningThreshold?: number;
  yieldCriticalThreshold?: number;
  defectWarningThreshold?: number;
  defectCriticalThreshold?: number;
  showAlerts?: boolean;
  height?: number;
}

export function RealtimeYieldDefectChart({
  productionLineId,
  productionLineName,
  yieldWarningThreshold = 95,
  yieldCriticalThreshold = 90,
  defectWarningThreshold = 3,
  defectCriticalThreshold = 5,
  showAlerts = true,
  height = 300,
}: RealtimeYieldDefectChartProps) {
  const [recentAlerts, setRecentAlerts] = useState<YieldDefectAlert[]>([]);

  const handleAlert = (alert: YieldDefectAlert) => {
    setRecentAlerts(prev => [...prev.slice(-4), alert]);
    
    const icon = alert.severity === 'critical' ? '🚨' : '⚠️';
    const toastFn = alert.severity === 'critical' ? toast.error : toast.warning;
    toastFn(`${icon} ${alert.message}`);
  };

  const {
    isConnected,
    wsEnabled,
    latency,
    connectionError,
    currentData,
    historicalData,
    lastUpdate,
    reconnect,
    getStatistics,
  } = useRealtimeYieldDefect({
    productionLineId,
    maxDataPoints: 60,
    onAlert: handleAlert,
  });

  const stats = getStatistics();

  // Format data for chart
  const chartData = historicalData.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    }),
    yieldRate: d.yieldRate,
    defectRate: d.defectRate,
    totalInspected: d.totalInspected,
  }));

  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getConnectionStatus = () => {
    if (wsEnabled === false) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          WebSocket tắt
        </Badge>
      );
    }
    if (isConnected) {
      return (
        <Badge className="bg-green-500 flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          Đang kết nối {latency ? `(${latency}ms)` : ''}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Mất kết nối
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Yield & Defect Rate Realtime
              {productionLineName && (
                <Badge variant="outline">{productionLineName}</Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              {lastUpdate ? (
                <>
                  <Clock className="h-3 w-3" />
                  Cập nhật lúc: {lastUpdate.toLocaleTimeString('vi-VN')}
                </>
              ) : (
                'Đang chờ dữ liệu...'
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionStatus()}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reconnect}
              disabled={isConnected}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {connectionError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        {/* Current Values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Yield Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {currentData?.yieldRate?.toFixed(2) ?? '--'}%
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Defect Rate</p>
            <p className="text-2xl font-bold text-red-600">
              {currentData?.defectRate?.toFixed(2) ?? '--'}%
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Đã kiểm tra</p>
            <p className="text-2xl font-bold">
              {currentData?.totalInspected?.toLocaleString() ?? '--'}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Xu hướng</p>
              <p className="text-lg font-semibold capitalize">{stats.trend}</p>
            </div>
            {getTrendIcon()}
          </div>
        </div>

        {/* Chart */}
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
                yAxisId="yield"
                orientation="left"
                domain={[80, 100]}
                tick={{ fontSize: 10 }}
                label={{ value: 'Yield %', angle: -90, position: 'insideLeft', fontSize: 10 }}
              />
              <YAxis 
                yAxisId="defect"
                orientation="right"
                domain={[0, 10]}
                tick={{ fontSize: 10 }}
                label={{ value: 'Defect %', angle: 90, position: 'insideRight', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)}%`,
                  name === 'yieldRate' ? 'Yield Rate' : 'Defect Rate'
                ]}
              />
              <Legend />
              
              {/* Threshold reference lines */}
              <ReferenceLine 
                yAxisId="yield" 
                y={yieldWarningThreshold} 
                stroke="#f59e0b" 
                strokeDasharray="5 5"
                label={{ value: 'Yield Warning', fontSize: 9, fill: '#f59e0b' }}
              />
              <ReferenceLine 
                yAxisId="yield" 
                y={yieldCriticalThreshold} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                label={{ value: 'Yield Critical', fontSize: 9, fill: '#ef4444' }}
              />
              <ReferenceLine 
                yAxisId="defect" 
                y={defectWarningThreshold} 
                stroke="#f59e0b" 
                strokeDasharray="5 5"
              />
              <ReferenceLine 
                yAxisId="defect" 
                y={defectCriticalThreshold} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
              />

              <Line
                yAxisId="yield"
                type="monotone"
                dataKey="yieldRate"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Yield Rate"
                isAnimationActive={false}
              />
              <Line
                yAxisId="defect"
                type="monotone"
                dataKey="defectRate"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Defect Rate"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Alerts */}
        {showAlerts && recentAlerts.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Cảnh báo gần đây
            </h4>
            {recentAlerts.slice(-3).map((alert, index) => (
              <Alert 
                key={index} 
                variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                className="py-2"
              >
                <AlertDescription className="text-sm">
                  {alert.message} ({new Date(alert.timestamp).toLocaleTimeString('vi-VN')})
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground">Yield TB</p>
            <p className="font-semibold">{stats.avgYieldRate.toFixed(2)}%</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground">Defect TB</p>
            <p className="font-semibold">{stats.avgDefectRate.toFixed(2)}%</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground">Điểm dữ liệu</p>
            <p className="font-semibold">{historicalData.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RealtimeYieldDefectChart;
