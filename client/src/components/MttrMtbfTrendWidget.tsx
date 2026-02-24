/**
 * MTTR/MTBF Trend Widget Component
 * Displays trend charts for MTTR and MTBF metrics on dashboard
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { trpc } from '@/lib/trpc';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Wrench,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
} from 'recharts';

interface MttrMtbfTrendWidgetProps {
  className?: string;
  defaultDays?: number;
}

export default function MttrMtbfTrendWidget({ 
  className = '',
  defaultDays = 30 
}: MttrMtbfTrendWidgetProps) {
  const [days, setDays] = useState(defaultDays);
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Fetch trend data
  const { data: trendData, isLoading, refetch, isFetching } = trpc.iotCrud.getMttrMtbfTrend.useQuery({
    periodType,
    days,
  });

  // Fetch summary data
  const { data: summaryData } = trpc.iotCrud.getMttrMtbfSummary.useQuery({
    days,
  });

  // Format data for charts
  const chartData = useMemo(() => {
    if (!trendData || !Array.isArray(trendData)) return [];
    return trendData.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      mttr: item.mttr,
      mtbf: item.mtbf,
      availability: (item.availability * 100).toFixed(1),
      failures: item.failures,
    }));
  }, [trendData]);

  // Calculate trend indicators
  const getTrendIndicator = (trend: string, changePercent: number) => {
    if (trend === 'up') {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUpRight className="w-4 h-4" />
          <span className="text-sm">+{changePercent}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center text-red-600">
        <ArrowDownRight className="w-4 h-4" />
        <span className="text-sm">-{changePercent}%</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Xu hướng MTTR/MTBF
            </CardTitle>
            <CardDescription>
              Theo dõi chỉ số độ tin cậy thiết bị theo thời gian
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="60">60 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Theo ngày</SelectItem>
                <SelectItem value="weekly">Theo tuần</SelectItem>
                <SelectItem value="monthly">Theo tháng</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        {summaryData && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">MTTR</span>
                </div>
                {getTrendIndicator(summaryData.mttr.trend, summaryData.mttr.changePercent)}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {summaryData.mttr.current}
                </span>
                <span className="text-sm text-blue-600 dark:text-blue-400 ml-1">
                  {summaryData.mttr.unit}
                </span>
              </div>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                Trước đó: {summaryData.mttr.previous} {summaryData.mttr.unit}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">MTBF</span>
                </div>
                {getTrendIndicator(summaryData.mtbf.trend, summaryData.mtbf.changePercent)}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {summaryData.mtbf.current}
                </span>
                <span className="text-sm text-green-600 dark:text-green-400 ml-1">
                  {summaryData.mtbf.unit}
                </span>
              </div>
              <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                Trước đó: {summaryData.mtbf.previous} {summaryData.mtbf.unit}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Availability</span>
                </div>
                {getTrendIndicator(summaryData.availability.trend, summaryData.availability.changePercent)}
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {summaryData.availability.current}
                </span>
                <span className="text-sm text-purple-600 dark:text-purple-400 ml-1">
                  {summaryData.availability.unit}
                </span>
              </div>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">
                Trước đó: {summaryData.availability.previous}{summaryData.availability.unit}
              </p>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'MTTR (phút)', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'MTBF (giờ)', angle: 90, position: 'insideRight', fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="failures" 
                fill="hsl(var(--destructive))" 
                name="Số lỗi"
                opacity={0.3}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="mttr" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="MTTR (phút)"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="mtbf" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="MTBF (giờ)"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Additional Stats */}
        {summaryData && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-1">
                <TrendingDown className="w-3 h-3" />
                Tổng lỗi: {summaryData.totalFailures}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Wrench className="w-3 h-3" />
                Tổng sửa chữa: {summaryData.totalRepairs}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                Downtime: {Math.round(summaryData.totalDowntimeMinutes / 60)}h
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
