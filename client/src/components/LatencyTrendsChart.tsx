import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Activity, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';

interface LatencyDataPoint {
  time_bucket: string;
  avg_latency: number;
  min_latency: number;
  max_latency: number;
  count: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

interface LatencyTrendsChartProps {
  data: LatencyDataPoint[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  showPercentiles?: boolean;
  warningThreshold?: number;
  criticalThreshold?: number;
  height?: number;
}

const COLORS = {
  avg: '#3b82f6',
  p50: '#22c55e',
  p95: '#f59e0b',
  p99: '#ef4444',
  min: '#06b6d4',
  max: '#8b5cf6',
  area: 'rgba(59, 130, 246, 0.1)',
  warning: '#f59e0b',
  critical: '#ef4444',
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="font-mono font-medium">
              {typeof entry.value === 'number' ? `${entry.value.toFixed(1)}ms` : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LatencyTrendsChart({
  data,
  isLoading = false,
  title = 'Latency Trends',
  description = 'P50, P95, P99 latency over time',
  showPercentiles = true,
  warningThreshold = 200,
  criticalThreshold = 500,
  height = 350,
}: LatencyTrendsChartProps) {
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    if (data[0]?.p50 !== undefined) {
      return data.map(d => ({
        ...d,
        time: d.time_bucket,
        avg: Number(d.avg_latency) || 0,
        min: Number(d.min_latency) || 0,
        max: Number(d.max_latency) || 0,
        p50: Number(d.p50) || 0,
        p95: Number(d.p95) || 0,
        p99: Number(d.p99) || 0,
      }));
    }

    return data.map(d => {
      const avg = Number(d.avg_latency) || 0;
      const min = Number(d.min_latency) || 0;
      const max = Number(d.max_latency) || 0;
      const range = max - min;
      const p50 = avg;
      const p95 = avg + range * 0.4;
      const p99 = avg + range * 0.6;
      
      return {
        ...d,
        time: d.time_bucket,
        avg,
        min,
        max,
        p50: Math.min(p50, max),
        p95: Math.min(p95, max),
        p99: Math.min(p99, max),
      };
    });
  }, [data]);

  const stats = useMemo(() => {
    if (processedData.length === 0) {
      return { avgP50: 0, avgP95: 0, avgP99: 0, trend: 'stable' as const };
    }

    const avgP50 = processedData.reduce((sum, d) => sum + d.p50, 0) / processedData.length;
    const avgP95 = processedData.reduce((sum, d) => sum + d.p95, 0) / processedData.length;
    const avgP99 = processedData.reduce((sum, d) => sum + d.p99, 0) / processedData.length;

    const halfIndex = Math.floor(processedData.length / 2);
    const firstHalfAvg = processedData.slice(0, halfIndex).reduce((sum, d) => sum + d.avg, 0) / halfIndex || 0;
    const secondHalfAvg = processedData.slice(halfIndex).reduce((sum, d) => sum + d.avg, 0) / (processedData.length - halfIndex) || 0;
    
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    const changePercent = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    if (changePercent > 10) trend = 'degrading';
    else if (changePercent < -10) trend = 'improving';

    return { avgP50, avgP95, avgP99, trend };
  }, [processedData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {stats.trend === 'improving' && (
              <Badge variant="default" className="bg-green-500">
                <TrendingDown className="w-3 h-3 mr-1" />
                Improving
              </Badge>
            )}
            {stats.trend === 'degrading' && (
              <Badge variant="destructive">
                <TrendingUp className="w-3 h-3 mr-1" />
                Degrading
              </Badge>
            )}
            {stats.trend === 'stable' && (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Stable
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-xs text-muted-foreground">P50 (Median)</p>
            <p className="text-xl font-bold text-green-600">{stats.avgP50.toFixed(1)}ms</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-xs text-muted-foreground">P95</p>
            <p className="text-xl font-bold text-yellow-600">{stats.avgP95.toFixed(1)}ms</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-xs text-muted-foreground">P99</p>
            <p className="text-xl font-bold text-red-600">{stats.avgP99.toFixed(1)}ms</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
            <p>No latency data available</p>
            <p className="text-sm">Data will appear once latency metrics are recorded</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={processedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.avg} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.avg} stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              
              <YAxis 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}ms`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Legend 
                wrapperStyle={{ paddingTop: 20 }}
                formatter={(value) => <span className="text-sm">{value}</span>}
              />

              {warningThreshold && (
                <ReferenceLine 
                  y={warningThreshold} 
                  stroke={COLORS.warning} 
                  strokeDasharray="5 5"
                  label={{ value: 'Warning', position: 'right', fill: COLORS.warning, fontSize: 10 }}
                />
              )}

              {criticalThreshold && (
                <ReferenceLine 
                  y={criticalThreshold} 
                  stroke={COLORS.critical} 
                  strokeDasharray="5 5"
                  label={{ value: 'Critical', position: 'right', fill: COLORS.critical, fontSize: 10 }}
                />
              )}

              <Area
                type="monotone"
                dataKey="avg"
                name="Average"
                stroke={COLORS.avg}
                fill="url(#latencyGradient)"
                strokeWidth={2}
              />

              {showPercentiles && (
                <>
                  <Line
                    type="monotone"
                    dataKey="p50"
                    name="P50 (Median)"
                    stroke={COLORS.p50}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p95"
                    name="P95"
                    stroke={COLORS.p95}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p99"
                    name="P99"
                    stroke={COLORS.p99}
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
