/**
 * Widget Preview - Preview các widget với dữ liệu realtime
 */

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Copy, TrendingUp, TrendingDown, Minus, Activity, AlertTriangle, Gauge, BarChart3 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function WidgetPreview() {
  const [selectedWidgetId, setSelectedWidgetId] = useState('cpk-summary-default');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: configs } = trpc.widgetData.getConfigs.useQuery();
  const { data: cpkData, refetch: refetchCpk } = trpc.widgetData.getCpkSummary.useQuery({ widgetId: selectedWidgetId });
  const { data: oeeData, refetch: refetchOee } = trpc.widgetData.getOeeRealtime.useQuery({ widgetId: selectedWidgetId });
  const { data: alertsData, refetch: refetchAlerts } = trpc.widgetData.getActiveAlerts.useQuery({ limit: 5 });
  const { data: quickStats, refetch: refetchStats } = trpc.widgetData.getQuickStats.useQuery();
  const { data: embedUrl } = trpc.widgetData.getEmbedUrl.useQuery({ widgetId: selectedWidgetId });

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchCpk(); refetchOee(); refetchAlerts(); refetchStats();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetchCpk, refetchOee, refetchAlerts, refetchStats]);

  const handleRefresh = () => {
    refetchCpk(); refetchOee(); refetchAlerts(); refetchStats();
    toast.success('Đã làm mới dữ liệu');
  };

  const copyEmbedCode = () => {
    if (embedUrl?.iframeCode) {
      navigator.clipboard.writeText(embedUrl.iframeCode);
      toast.success('Đã copy embed code');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'excellent': return <Badge className="bg-green-500">Xuất sắc</Badge>;
      case 'good': return <Badge className="bg-blue-500">Tốt</Badge>;
      case 'warning': return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
      case 'critical': return <Badge variant="destructive">Nguy hiểm</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Widget Preview</h1>
            <p className="text-muted-foreground">Preview và cấu hình widgets với dữ liệu realtime</p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-refresh" className="text-sm">Auto Refresh</Label>
              <input type="checkbox" id="auto-refresh" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="h-4 w-4" />
            </div>
            <Select value={refreshInterval.toString()} onValueChange={(v) => setRefreshInterval(parseInt(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
                <SelectItem value="60">60s</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />Làm mới
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Chọn Widget</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label>Widget Config</Label>
                <Select value={selectedWidgetId} onValueChange={setSelectedWidgetId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {configs?.map((config: any) => (
                      <SelectItem key={config.id} value={config.id}>{config.title} ({config.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={copyEmbedCode}>
                <Copy className="h-4 w-4 mr-2" />Copy Embed Code
              </Button>
            </div>
            {embedUrl && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <Label className="text-xs text-muted-foreground">Embed URL</Label>
                <code className="text-xs block mt-1 break-all">{embedUrl.embedUrl}</code>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Tất cả Widgets</TabsTrigger>
            <TabsTrigger value="cpk">CPK Summary</TabsTrigger>
            <TabsTrigger value="oee">OEE Realtime</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" />CPK Summary</CardTitle>
                  <CardDescription className="text-xs">Cập nhật: {cpkData ? new Date(cpkData.lastUpdated).toLocaleTimeString('vi-VN') : '-'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-3xl font-bold ${getStatusColor(cpkData?.status || '')}`}>{cpkData?.avgCpk?.toFixed(2) || '-'}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <TrendIcon trend={cpkData?.trend || 'stable'} />
                        <span className="text-xs text-muted-foreground">Min: {cpkData?.minCpk?.toFixed(2)} | Max: {cpkData?.maxCpk?.toFixed(2)}</span>
                      </div>
                    </div>
                    {cpkData && getStatusBadge(cpkData.status)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />OEE Realtime</CardTitle>
                  <CardDescription className="text-xs">Cập nhật: {oeeData ? new Date(oeeData.lastUpdated).toLocaleTimeString('vi-VN') : '-'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`text-3xl font-bold ${getStatusColor(oeeData?.status || '')}`}>{oeeData?.oee?.toFixed(1) || '-'}%</div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div><span className="text-muted-foreground">A:</span> {oeeData?.availability?.toFixed(1)}%</div>
                        <div><span className="text-muted-foreground">P:</span> {oeeData?.performance?.toFixed(1)}%</div>
                        <div><span className="text-muted-foreground">Q:</span> {oeeData?.quality?.toFixed(1)}%</div>
                      </div>
                    </div>
                    {oeeData && getStatusBadge(oeeData.status)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Active Alerts</CardTitle>
                  <CardDescription className="text-xs">Tổng: {alertsData?.total || 0} | Chưa đọc: {alertsData?.unreadCount || 0}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {alertsData?.alerts?.slice(0, 3).map((alert: any) => (
                      <div key={alert.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">{alert.severity}</Badge>
                          <span className="text-sm">{alert.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{alert.source}</span>
                      </div>
                    ))}
                    {(!alertsData?.alerts || alertsData.alerts.length === 0) && (
                      <div className="text-center py-4 text-muted-foreground text-sm">Không có alerts</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Quick Stats</CardTitle>
                  <CardDescription className="text-xs">Cập nhật: {quickStats ? new Date(quickStats.lastUpdated).toLocaleTimeString('vi-VN') : '-'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">CPK</div>
                      <div className={`text-xl font-bold ${getStatusColor(quickStats?.cpk?.status || '')}`}>{quickStats?.cpk?.value?.toFixed(2) || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">OEE</div>
                      <div className={`text-xl font-bold ${getStatusColor(quickStats?.oee?.status || '')}`}>{quickStats?.oee?.value?.toFixed(1) || '-'}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Machines</div>
                      <div className="text-xl font-bold">{quickStats?.activeMachines || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Alerts</div>
                      <div className="text-xl font-bold text-yellow-500">{quickStats?.activeAlerts || 0}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cpk" className="mt-4">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" />CPK Summary Widget</CardTitle>
                <CardDescription>Hiển thị chỉ số CPK trung bình và trạng thái</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className={`text-5xl font-bold ${getStatusColor(cpkData?.status || '')}`}>{cpkData?.avgCpk?.toFixed(2) || '-'}</div>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <TrendIcon trend={cpkData?.trend || 'stable'} />
                    {cpkData && getStatusBadge(cpkData.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="oee" className="mt-4">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />OEE Realtime Widget</CardTitle>
                <CardDescription>Hiển thị OEE và các thành phần A, P, Q</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-6">
                  <div className={`text-5xl font-bold ${getStatusColor(oeeData?.status || '')}`}>{oeeData?.oee?.toFixed(1) || '-'}%</div>
                  <div className="mt-2">{oeeData && getStatusBadge(oeeData.status)}</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="mt-4">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Alerts Widget</CardTitle>
                <CardDescription>Hiển thị các cảnh báo đang hoạt động</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alertsData?.alerts?.map((alert: any) => (
                    <div key={alert.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>{alert.severity}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(alert.createdAt).toLocaleTimeString('vi-VN')}</span>
                      </div>
                      <div className="mt-2">
                        <div className="font-medium">{alert.title}</div>
                        <div className="text-sm text-muted-foreground">{alert.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
