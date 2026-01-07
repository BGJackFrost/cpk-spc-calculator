/**
 * Timeseries Dashboard
 * Hiển thị và phân tích dữ liệu time-series từ IoT sensors
 */

import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend } from "recharts";
import { RefreshCw, TrendingUp, TrendingDown, Activity, Clock, Database, Loader2 } from "lucide-react";

export default function TimeseriesDashboard() {
  const [deviceId] = useState<number>(1);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  
  const timeRangeMs = { '1h': 3600000, '24h': 86400000, '7d': 604800000, '30d': 2592000000 };
  const now = Date.now();
  const startTime = now - timeRangeMs[timeRange];

  const { data: rawData, isLoading: loadingRaw, refetch } = trpc.timeseries.query.useQuery({
    deviceId, startTime, endTime: now, limit: 500
  });

  const { data: hourlyData, isLoading: loadingHourly } = trpc.timeseries.hourlyAggregates.useQuery({
    deviceId, startTime, endTime: now
  }, { enabled: timeRange !== '1h' });

  const { data: dailyData, isLoading: loadingDaily } = trpc.timeseries.dailyAggregates.useQuery({
    deviceId, startTime, endTime: now
  }, { enabled: timeRange === '7d' || timeRange === '30d' });

  const { data: stats } = trpc.timeseries.statistics.useQuery({ deviceId, timeRange });

  const chartData = useMemo(() => {
    if (!rawData) return [];
    return rawData.map(d => ({
      time: new Date(d.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      value: d.value,
      timestamp: d.timestamp
    }));
  }, [rawData]);

  const aggregateChartData = useMemo(() => {
    const data = timeRange === '30d' ? dailyData : hourlyData;
    if (!data) return [];
    return data.map(d => ({
      time: new Date(d.timeBucket).toLocaleString('vi-VN', { 
        month: 'short', day: 'numeric', hour: timeRange === '30d' ? undefined : '2-digit' 
      }),
      min: d.minValue,
      max: d.maxValue,
      avg: d.avgValue,
      count: d.sampleCount
    }));
  }, [hourlyData, dailyData, timeRange]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Time-Series Dashboard</h1>
            <p className="text-muted-foreground">Phân tích dữ liệu IoT theo thời gian thực</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ</SelectItem>
                <SelectItem value="24h">24 giờ</SelectItem>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Làm mới</Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng mẫu</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSamples?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Database className="w-3 h-3" />Trong {timeRange}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Giá trị TB</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.avgValue?.toFixed(2) || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" />Mean value</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Min</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.minValue?.toFixed(2) || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3" />Thấp nhất</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Max</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats?.maxValue?.toFixed(2) || 0}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" />Cao nhất</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Độ lệch chuẩn</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.stdDev?.toFixed(3) || 0}</div>
              <p className="text-xs text-muted-foreground">σ (Standard Dev)</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="realtime" className="space-y-4">
          <TabsList>
            <TabsTrigger value="realtime"><Activity className="w-4 h-4 mr-2" />Realtime</TabsTrigger>
            <TabsTrigger value="aggregates"><Clock className="w-4 h-4 mr-2" />Aggregates</TabsTrigger>
            <TabsTrigger value="distribution"><Database className="w-4 h-4 mr-2" />Distribution</TabsTrigger>
          </TabsList>

          <TabsContent value="realtime">
            <Card>
              <CardHeader>
                <CardTitle>Dữ liệu thời gian thực</CardTitle>
                <CardDescription>Giá trị sensor theo thời gian ({rawData?.length || 0} điểm)</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingRaw ? (
                  <div className="flex items-center justify-center h-80"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="aggregates">
            <Card>
              <CardHeader>
                <CardTitle>Dữ liệu tổng hợp</CardTitle>
                <CardDescription>Min/Max/Avg theo {timeRange === '30d' ? 'ngày' : 'giờ'}</CardDescription>
              </CardHeader>
              <CardContent>
                {(loadingHourly || loadingDaily) ? (
                  <div className="flex items-center justify-center h-80"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={aggregateChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Legend />
                      <Line type="monotone" dataKey="min" stroke="#3b82f6" name="Min" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="avg" stroke="#22c55e" name="Avg" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="max" stroke="#ef4444" name="Max" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <Card>
              <CardHeader>
                <CardTitle>Phân phối số lượng mẫu</CardTitle>
                <CardDescription>Số lượng mẫu theo thời gian</CardDescription>
              </CardHeader>
              <CardContent>
                {(loadingHourly || loadingDaily) ? (
                  <div className="flex items-center justify-center h-80"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={aggregateChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="count" fill="#8b5cf6" name="Số mẫu" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
