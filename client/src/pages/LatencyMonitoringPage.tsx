import React, { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LatencyHeatmap } from '@/components/LatencyHeatmap';
import { trpc } from '@/lib/trpc';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Clock, Zap, Server, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function LatencyMonitoringPage() {
  const [sourceType, setSourceType] = useState<string>('all');
  const [sourceId, setSourceId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [interval, setInterval] = useState<'hour' | 'day' | 'week'>('hour');

  const getDateRange = () => {
    const now = new Date();
    const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate: now };
  };

  const { startDate, endDate } = getDateRange();

  const { data: heatmapData, isLoading: heatmapLoading, refetch: refetchHeatmap } = trpc.latency.getHeatmap.useQuery({
    sourceType: sourceType !== 'all' ? sourceType : undefined,
    sourceId: sourceId !== 'all' ? sourceId : undefined,
    startDate,
    endDate,
  });

  const { data: stats, refetch: refetchStats } = trpc.latency.getStats.useQuery({
    sourceType: sourceType !== 'all' ? sourceType : undefined,
    sourceId: sourceId !== 'all' ? sourceId : undefined,
    startDate,
    endDate,
  });

  const { data: timeSeries, isLoading: timeSeriesLoading, refetch: refetchTimeSeries } = trpc.latency.getTimeSeries.useQuery({
    sourceType: sourceType !== 'all' ? sourceType : undefined,
    sourceId: sourceId !== 'all' ? sourceId : undefined,
    startDate,
    endDate,
    interval,
  });

  const { data: sources } = trpc.latency.getSources.useQuery();

  const uniqueSourceTypes = useMemo(() => {
    if (!sources) return [];
    return [...new Set(sources.map((s: any) => s.source_type))];
  }, [sources]);

  const filteredSources = useMemo(() => {
    if (!sources) return [];
    if (sourceType === 'all') return sources;
    return sources.filter((s: any) => s.source_type === sourceType);
  }, [sources, sourceType]);

  const handleRefresh = () => { refetchHeatmap(); refetchStats(); refetchTimeSeries(); };

  const formatLatency = (ms: number): string => ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;

  const getLatencyStatus = (avgLatency: number) => {
    if (avgLatency < 100) return { label: 'Tốt', color: 'bg-green-500', icon: TrendingDown };
    if (avgLatency < 500) return { label: 'Bình thường', color: 'bg-yellow-500', icon: Minus };
    if (avgLatency < 1000) return { label: 'Cao', color: 'bg-orange-500', icon: TrendingUp };
    return { label: 'Rất cao', color: 'bg-red-500', icon: TrendingUp };
  };

  const latencyStatus = stats ? getLatencyStatus(stats.avg_latency || 0) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Giám sát Độ trễ</h1>
            <p className="text-muted-foreground">Theo dõi và phân tích độ trễ hệ thống theo thời gian</p>
          </div>
          <Button onClick={handleRefresh} variant="outline"><RefreshCw className="w-4 h-4 mr-2" />Làm mới</Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Loại nguồn</label>
                <Select value={sourceType} onValueChange={(v) => { setSourceType(v); setSourceId('all'); }}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {uniqueSourceTypes.map((type: string) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nguồn cụ thể</label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {filteredSources.map((s: any) => <SelectItem key={s.source_id} value={s.source_id}>{s.source_name || s.source_id}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Khoảng thời gian</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">1 ngày</SelectItem>
                    <SelectItem value="7d">7 ngày</SelectItem>
                    <SelectItem value="30d">30 ngày</SelectItem>
                    <SelectItem value="90d">90 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Interval</label>
                <Select value={interval} onValueChange={(v) => setInterval(v as 'hour' | 'day' | 'week')}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hour">Giờ</SelectItem>
                    <SelectItem value="day">Ngày</SelectItem>
                    <SelectItem value="week">Tuần</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Độ trễ TB</p>
                  <p className="text-2xl font-bold">{stats ? formatLatency(stats.avg_latency || 0) : '-'}</p>
                </div>
                <div className={`p-3 rounded-full ${latencyStatus?.color || 'bg-gray-500'}`}><Activity className="w-5 h-5 text-white" /></div>
              </div>
              {latencyStatus && <Badge className="mt-2" variant={latencyStatus.label === 'Tốt' ? 'default' : latencyStatus.label === 'Bình thường' ? 'secondary' : 'destructive'}>{latencyStatus.label}</Badge>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Độ trễ Min</p>
                  <p className="text-2xl font-bold">{stats ? formatLatency(stats.min_latency || 0) : '-'}</p>
                </div>
                <div className="p-3 rounded-full bg-green-500"><TrendingDown className="w-5 h-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Độ trễ Max</p>
                  <p className="text-2xl font-bold">{stats ? formatLatency(stats.max_latency || 0) : '-'}</p>
                </div>
                <div className="p-3 rounded-full bg-red-500"><TrendingUp className="w-5 h-5 text-white" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ thành công</p>
                  <p className="text-2xl font-bold">{stats && stats.total_count > 0 ? `${Math.round((stats.success_count / stats.total_count) * 100)}%` : '-'}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500"><Zap className="w-5 h-5 text-white" /></div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{stats ? `${stats.success_count}/${stats.total_count} requests` : ''}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="heatmap">
          <TabsList>
            <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
            <TabsTrigger value="timeseries">Time Series</TabsTrigger>
            <TabsTrigger value="sources">Nguồn dữ liệu</TabsTrigger>
          </TabsList>

          <TabsContent value="heatmap" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Heatmap Độ trễ theo Giờ/Ngày</CardTitle>
                <CardDescription>Phân tích độ trễ theo từng giờ trong tuần</CardDescription>
              </CardHeader>
              <CardContent>
                {heatmapLoading ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">Đang tải...</div>
                ) : heatmapData && heatmapData.length > 0 ? (
                  <LatencyHeatmap data={heatmapData} title="" />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có dữ liệu độ trễ</p>
                      <p className="text-sm">Dữ liệu sẽ xuất hiện khi hệ thống ghi nhận các metrics</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeseries" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Biểu đồ Độ trễ theo Thời gian</CardTitle>
                <CardDescription>Xu hướng độ trễ trong khoảng thời gian đã chọn</CardDescription>
              </CardHeader>
              <CardContent>
                {timeSeriesLoading ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">Đang tải...</div>
                ) : timeSeries && timeSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time_bucket" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}ms`} />
                      <Tooltip formatter={(value: number) => [`${Math.round(value)}ms`, '']} labelFormatter={(label) => `Thời gian: ${label}`} />
                      <Legend />
                      <Area type="monotone" dataKey="avg_latency" name="Trung bình" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                      <Area type="monotone" dataKey="max_latency" name="Max" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                      <Area type="monotone" dataKey="min_latency" name="Min" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center"><Activity className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Chưa có dữ liệu time series</p></div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server className="w-5 h-5" />Danh sách Nguồn Dữ liệu</CardTitle>
                <CardDescription>Các nguồn đang ghi nhận độ trễ</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Tên</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources?.map((source: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell><Badge variant="outline">{source.source_type}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{source.source_id}</TableCell>
                        <TableCell>{source.source_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {(!sources || sources.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                          <Server className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Chưa có nguồn dữ liệu nào</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
