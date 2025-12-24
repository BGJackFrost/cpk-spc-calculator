/**
 * IoT Realtime Chart Component
 * Biểu đồ realtime cho dữ liệu IoT với auto-refresh và alerts
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Activity, Pause, Play, RefreshCw, Settings, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface DataPoint {
  timestamp: Date;
  value: number;
  metric?: string;
  deviceId?: string;
}

interface ThresholdConfig {
  upper?: number;
  lower?: number;
  upperWarning?: number;
  lowerWarning?: number;
}

interface IoTRealtimeChartProps {
  title: string;
  deviceId: string;
  metric: string;
  unit?: string;
  thresholds?: ThresholdConfig;
  maxDataPoints?: number;
  defaultInterval?: number;
  onAlert?: (type: 'upper' | 'lower' | 'upperWarning' | 'lowerWarning', value: number) => void;
  className?: string;
  height?: number;
  showGauge?: boolean;
  color?: string;
  fetchData?: () => Promise<DataPoint | null>;
}

// Gauge Component
function GaugeChart({ 
  value, 
  min = 0, 
  max = 100, 
  thresholds,
  unit = '',
  title 
}: { 
  value: number; 
  min?: number; 
  max?: number; 
  thresholds?: ThresholdConfig;
  unit?: string;
  title: string;
}) {
  const percentage = Math.min(Math.max((value - min) / (max - min) * 100, 0), 100);
  const angle = (percentage / 100) * 180 - 90;
  
  // Determine color based on thresholds
  let color = '#22c55e'; // green
  if (thresholds) {
    if (thresholds.upper && value >= thresholds.upper) {
      color = '#ef4444'; // red
    } else if (thresholds.lower && value <= thresholds.lower) {
      color = '#ef4444'; // red
    } else if (thresholds.upperWarning && value >= thresholds.upperWarning) {
      color = '#f59e0b'; // amber
    } else if (thresholds.lowerWarning && value <= thresholds.lowerWarning) {
      color = '#f59e0b'; // amber
    }
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 2.51} 251`}
        />
        {/* Needle */}
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="35"
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="6" fill="#374151" />
        </g>
        {/* Min/Max labels */}
        <text x="20" y="115" textAnchor="middle" className="text-xs fill-muted-foreground">
          {min}
        </text>
        <text x="180" y="115" textAnchor="middle" className="text-xs fill-muted-foreground">
          {max}
        </text>
      </svg>
      <div className="text-center mt-2">
        <div className="text-2xl font-bold" style={{ color }}>
          {value.toFixed(2)} {unit}
        </div>
        <div className="text-sm text-muted-foreground">{title}</div>
      </div>
    </div>
  );
}

// Main Component
export function IoTRealtimeChart({
  title,
  deviceId,
  metric,
  unit = '',
  thresholds,
  maxDataPoints = 100,
  defaultInterval = 5000,
  onAlert,
  className,
  height = 300,
  showGauge = true,
  color = '#3b82f6',
  fetchData,
}: IoTRealtimeChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [interval, setInterval] = useState(defaultInterval);
  const [lastValue, setLastValue] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Array<{ type: string; value: number; timestamp: Date }>>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Generate mock data for demo
  const generateMockData = useCallback((): DataPoint => {
    const baseValue = 50;
    const noise = (Math.random() - 0.5) * 20;
    const trend = Math.sin(Date.now() / 10000) * 10;
    return {
      timestamp: new Date(),
      value: baseValue + noise + trend,
      metric,
      deviceId,
    };
  }, [metric, deviceId]);

  // Check thresholds and trigger alerts
  const checkThresholds = useCallback((value: number) => {
    if (!thresholds || !onAlert) return;

    if (thresholds.upper && value >= thresholds.upper) {
      onAlert('upper', value);
      setAlerts(prev => [...prev.slice(-9), { type: 'upper', value, timestamp: new Date() }]);
    } else if (thresholds.lower && value <= thresholds.lower) {
      onAlert('lower', value);
      setAlerts(prev => [...prev.slice(-9), { type: 'lower', value, timestamp: new Date() }]);
    } else if (thresholds.upperWarning && value >= thresholds.upperWarning) {
      onAlert('upperWarning', value);
      setAlerts(prev => [...prev.slice(-9), { type: 'upperWarning', value, timestamp: new Date() }]);
    } else if (thresholds.lowerWarning && value <= thresholds.lowerWarning) {
      onAlert('lowerWarning', value);
      setAlerts(prev => [...prev.slice(-9), { type: 'lowerWarning', value, timestamp: new Date() }]);
    }
  }, [thresholds, onAlert]);

  // Fetch or generate data
  const updateData = useCallback(async () => {
    let newPoint: DataPoint | null = null;

    if (fetchData) {
      newPoint = await fetchData();
    } else {
      newPoint = generateMockData();
    }

    if (newPoint) {
      setData(prev => {
        const updated = [...prev, newPoint!];
        if (updated.length > maxDataPoints) {
          return updated.slice(-maxDataPoints);
        }
        return updated;
      });
      setLastValue(newPoint.value);
      checkThresholds(newPoint.value);
    }
  }, [fetchData, generateMockData, maxDataPoints, checkThresholds]);

  // Auto-refresh effect
  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(updateData, interval);
    return () => window.clearInterval(timer);
  }, [isRunning, interval, updateData]);

  // Initial data load
  useEffect(() => {
    updateData();
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    const values = data.map(d => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Trend (simple linear regression)
    const n = values.length;
    const xSum = (n * (n - 1)) / 2;
    const ySum = sum;
    const xySum = values.reduce((acc, val, i) => acc + i * val, 0);
    const x2Sum = (n * (n - 1) * (2 * n - 1)) / 6;
    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    
    return { mean, min, max, stdDev, slope, count: n };
  }, [data]);

  // Format chart data
  const chartData = useMemo(() => {
    return data.map(d => ({
      time: d.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: d.value,
      timestamp: d.timestamp.getTime(),
    }));
  }, [data]);

  // Determine status
  const status = useMemo(() => {
    if (lastValue === null) return 'unknown';
    if (thresholds) {
      if ((thresholds.upper && lastValue >= thresholds.upper) || 
          (thresholds.lower && lastValue <= thresholds.lower)) {
        return 'critical';
      }
      if ((thresholds.upperWarning && lastValue >= thresholds.upperWarning) || 
          (thresholds.lowerWarning && lastValue <= thresholds.lowerWarning)) {
        return 'warning';
      }
    }
    return 'normal';
  }, [lastValue, thresholds]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge 
              variant={status === 'critical' ? 'destructive' : status === 'warning' ? 'outline' : 'secondary'}
              className={cn(
                status === 'warning' && 'border-amber-500 text-amber-500',
                status === 'normal' && 'border-green-500 text-green-500'
              )}
            >
              {status === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
              {status === 'normal' && <Activity className="w-3 h-3 mr-1" />}
              {status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(interval)} onValueChange={(v) => setInterval(Number(v))}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1000">1s</SelectItem>
                <SelectItem value="5000">5s</SelectItem>
                <SelectItem value="10000">10s</SelectItem>
                <SelectItem value="30000">30s</SelectItem>
                <SelectItem value="60000">1m</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsRunning(!isRunning)}
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={updateData}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats bar */}
        {stats && (
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>Min: {stats.min.toFixed(2)}</span>
            <span>Max: {stats.max.toFixed(2)}</span>
            <span>Avg: {stats.mean.toFixed(2)}</span>
            <span>σ: {stats.stdDev.toFixed(2)}</span>
            <span className="flex items-center gap-1">
              Trend: 
              {stats.slope > 0.1 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : stats.slope < -0.1 ? (
                <TrendingDown className="w-4 h-4 text-red-500" />
              ) : (
                <span className="text-muted-foreground">→</span>
              )}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className={cn('grid gap-4', showGauge ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1')}>
          {/* Gauge */}
          {showGauge && lastValue !== null && (
            <div className="flex items-center justify-center">
              <GaugeChart
                value={lastValue}
                min={stats?.min ? Math.floor(stats.min - 10) : 0}
                max={stats?.max ? Math.ceil(stats.max + 10) : 100}
                thresholds={thresholds}
                unit={unit}
                title={metric}
              />
            </div>
          )}
          
          {/* Line Chart */}
          <div className={cn(showGauge ? 'lg:col-span-3' : '')}>
            <ResponsiveContainer width="100%" height={height}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${deviceId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => v.toFixed(1)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, metric]}
                />
                <Legend />
                
                {/* Threshold lines */}
                {thresholds?.upper && (
                  <ReferenceLine 
                    y={thresholds.upper} 
                    stroke="#ef4444" 
                    strokeDasharray="5 5"
                    label={{ value: 'UCL', position: 'right', fill: '#ef4444', fontSize: 10 }}
                  />
                )}
                {thresholds?.lower && (
                  <ReferenceLine 
                    y={thresholds.lower} 
                    stroke="#ef4444" 
                    strokeDasharray="5 5"
                    label={{ value: 'LCL', position: 'right', fill: '#ef4444', fontSize: 10 }}
                  />
                )}
                {thresholds?.upperWarning && (
                  <ReferenceLine 
                    y={thresholds.upperWarning} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3"
                    label={{ value: 'UWL', position: 'right', fill: '#f59e0b', fontSize: 10 }}
                  />
                )}
                {thresholds?.lowerWarning && (
                  <ReferenceLine 
                    y={thresholds.lowerWarning} 
                    stroke="#f59e0b" 
                    strokeDasharray="3 3"
                    label={{ value: 'LWL', position: 'right', fill: '#f59e0b', fontSize: 10 }}
                  />
                )}
                
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  fill={`url(#gradient-${deviceId})`}
                  strokeWidth={2}
                  name={metric}
                  dot={false}
                  activeDot={{ r: 4, fill: color }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Recent Alerts ({alerts.length})
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {alerts.slice(-5).reverse().map((alert, i) => (
                <div key={i} className="text-xs flex items-center gap-2">
                  <Badge 
                    variant={alert.type.includes('Warning') ? 'outline' : 'destructive'}
                    className={cn(
                      'text-xs',
                      alert.type.includes('Warning') && 'border-amber-500 text-amber-500'
                    )}
                  >
                    {alert.type}
                  </Badge>
                  <span>{alert.value.toFixed(2)} {unit}</span>
                  <span className="text-muted-foreground">
                    {alert.timestamp.toLocaleTimeString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-4 p-4 border rounded-lg space-y-4">
            <h4 className="font-medium">Chart Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Data Points</Label>
                <Select 
                  value={String(maxDataPoints)} 
                  onValueChange={(v) => console.log('Max points:', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="show-gauge" checked={showGauge} />
                <Label htmlFor="show-gauge">Show Gauge</Label>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Multi-metric chart for comparing multiple sensors
export function IoTMultiMetricChart({
  title,
  metrics,
  height = 300,
  className,
}: {
  title: string;
  metrics: Array<{
    deviceId: string;
    metric: string;
    color: string;
    data: DataPoint[];
  }>;
  height?: number;
  className?: string;
}) {
  const chartData = useMemo(() => {
    const timeMap = new Map<number, Record<string, number>>();
    
    metrics.forEach(m => {
      m.data.forEach(d => {
        const time = Math.floor(d.timestamp.getTime() / 1000) * 1000;
        if (!timeMap.has(time)) {
          timeMap.set(time, { timestamp: time });
        }
        timeMap.get(time)![`${m.deviceId}_${m.metric}`] = d.value;
      });
    });
    
    return Array.from(timeMap.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(d => ({
        ...d,
        time: new Date(d.timestamp).toLocaleTimeString('vi-VN', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        }),
      }));
  }, [metrics]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            {metrics.map(m => (
              <Line
                key={`${m.deviceId}_${m.metric}`}
                type="monotone"
                dataKey={`${m.deviceId}_${m.metric}`}
                stroke={m.color}
                strokeWidth={2}
                dot={false}
                name={`${m.deviceId} - ${m.metric}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default IoTRealtimeChart;
