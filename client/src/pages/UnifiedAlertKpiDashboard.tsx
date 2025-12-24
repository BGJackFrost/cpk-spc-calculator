import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc';
import { 
  BarChart3, TrendingUp, Clock, AlertTriangle, Download, 
  Bell, CheckCircle, XCircle, Timer, Activity, Target,
  MessageSquare, Send, RefreshCw, Zap, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

export default function UnifiedAlertKpiDashboard() {
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch alert analytics
  const { data: alertAnalytics, isLoading: alertLoading } = trpc.alerts.getAnalytics.useQuery({
    days: parseInt(timeRange),
    groupBy: 'day',
  });

  // Fetch SMS statistics
  const { data: smsStats } = trpc.alerts.getSmsStatistics.useQuery();

  // Fetch webhook statistics
  const { data: webhookStats } = trpc.alerts.getWebhookStatistics.useQuery();

  // Fetch retry statistics
  const { data: retryStats } = trpc.alerts.getRetryStatistics.useQuery();

  // Fetch SMS history
  const { data: smsHistory } = trpc.alerts.getSmsHistory.useQuery({ limit: 10 });

  // Fetch webhook history
  const { data: webhookHistory } = trpc.alerts.getWebhookHistory.useQuery({ limit: 10 });

  // Process retry mutation
  const processRetries = trpc.alerts.processWebhookRetries.useMutation();

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    if (!alertAnalytics) return null;

    const totalAlerts = alertAnalytics.totalAlerts || 0;
    const resolvedCount = alertAnalytics.resolvedCount || 0;
    const resolutionRate = totalAlerts > 0 ? (resolvedCount / totalAlerts) * 100 : 0;

    // Calculate average resolution time
    let avgResolutionTime = 0;
    if (alertAnalytics.resolvedAlerts && alertAnalytics.resolvedAlerts.length > 0) {
      const totalTime = alertAnalytics.resolvedAlerts.reduce((sum, alert) => {
        const created = new Date(alert.createdAt).getTime();
        const resolved = new Date(alert.resolvedAt).getTime();
        return sum + (resolved - created);
      }, 0);
      avgResolutionTime = totalTime / alertAnalytics.resolvedAlerts.length;
    }

    return {
      totalAlerts,
      resolvedCount,
      pendingCount: alertAnalytics.pendingCount || 0,
      resolutionRate: Math.round(resolutionRate * 10) / 10,
      avgResolutionTime,
      criticalAlerts: alertAnalytics.bySeverity?.critical || 0,
      warningAlerts: alertAnalytics.bySeverity?.warning || 0,
      infoAlerts: alertAnalytics.bySeverity?.info || 0,
    };
  }, [alertAnalytics]);

  // Format time duration
  const formatDuration = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    if (ms < 86400000) return `${Math.round(ms / 3600000)}h`;
    return `${Math.round(ms / 86400000)}d`;
  };

  // Severity distribution for pie chart
  const severityData = useMemo(() => {
    if (!alertAnalytics?.bySeverity) return [];
    return [
      { name: 'Critical', value: alertAnalytics.bySeverity.critical || 0, color: '#ef4444' },
      { name: 'Warning', value: alertAnalytics.bySeverity.warning || 0, color: '#f59e0b' },
      { name: 'Info', value: alertAnalytics.bySeverity.info || 0, color: '#3b82f6' },
    ].filter(d => d.value > 0);
  }, [alertAnalytics]);

  // Notification channel stats
  const channelStats = useMemo(() => {
    return [
      { 
        name: 'SMS', 
        sent: smsStats?.sent || 0, 
        failed: smsStats?.failed || 0,
        pending: smsStats?.pending || 0,
        icon: MessageSquare,
        color: 'text-blue-500'
      },
      { 
        name: 'Webhook', 
        sent: webhookStats?.success || 0, 
        failed: webhookStats?.failed || 0,
        pending: webhookStats?.pending || 0,
        icon: Send,
        color: 'text-purple-500'
      },
    ];
  }, [smsStats, webhookStats]);

  // Radar chart data for multi-dimensional analysis
  const radarData = useMemo(() => {
    if (!kpiMetrics) return [];
    return [
      { subject: 'Resolution Rate', A: kpiMetrics.resolutionRate, fullMark: 100 },
      { subject: 'Critical Handled', A: kpiMetrics.criticalAlerts > 0 ? 
        Math.min(100, (kpiMetrics.resolvedCount / kpiMetrics.criticalAlerts) * 20) : 100, fullMark: 100 },
      { subject: 'SMS Success', A: smsStats?.total ? 
        ((smsStats.sent || 0) / smsStats.total) * 100 : 100, fullMark: 100 },
      { subject: 'Webhook Success', A: webhookStats?.successRate || 100, fullMark: 100 },
      { subject: 'Response Time', A: kpiMetrics.avgResolutionTime < 3600000 ? 100 : 
        Math.max(0, 100 - (kpiMetrics.avgResolutionTime / 36000)), fullMark: 100 },
    ];
  }, [kpiMetrics, smsStats, webhookStats]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Tổng hợp Alert & KPI</h1>
            <p className="text-muted-foreground">
              Giám sát cảnh báo, thông báo và chỉ số hiệu suất
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng Alerts</p>
                  <p className="text-2xl font-bold">{kpiMetrics?.totalAlerts || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đã xử lý</p>
                  <p className="text-2xl font-bold text-green-600">{kpiMetrics?.resolvedCount || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chờ xử lý</p>
                  <p className="text-2xl font-bold text-yellow-600">{kpiMetrics?.pendingCount || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ xử lý</p>
                  <p className="text-2xl font-bold">{kpiMetrics?.resolutionRate || 0}%</p>
                </div>
                <Target className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MTTR</p>
                  <p className="text-2xl font-bold">
                    {kpiMetrics?.avgResolutionTime ? formatDuration(kpiMetrics.avgResolutionTime) : 'N/A'}
                  </p>
                </div>
                <Timer className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-red-600">{kpiMetrics?.criticalAlerts || 0}</p>
                </div>
                <Zap className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="notifications">Thông báo</TabsTrigger>
            <TabsTrigger value="trends">Xu hướng</TabsTrigger>
            <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Severity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Phân bố theo Mức độ</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Multi-dimensional Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Phân tích Đa chiều</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar
                          name="Performance"
                          dataKey="A"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.5}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Xu hướng Cảnh báo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={alertAnalytics?.trendData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="critical"
                        stackId="1"
                        stroke="#ef4444"
                        fill="#ef4444"
                        name="Critical"
                      />
                      <Area
                        type="monotone"
                        dataKey="warning"
                        stackId="1"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        name="Warning"
                      />
                      <Area
                        type="monotone"
                        dataKey="info"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        name="Info"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            {/* Channel Stats */}
            <div className="grid md:grid-cols-2 gap-4">
              {channelStats.map((channel) => (
                <Card key={channel.name}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <channel.icon className={`h-5 w-5 ${channel.color}`} />
                        {channel.name}
                      </CardTitle>
                      <Badge variant={channel.failed > 0 ? 'destructive' : 'default'}>
                        {channel.sent + channel.failed + channel.pending} total
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{channel.sent}</p>
                        <p className="text-xs text-muted-foreground">Đã gửi</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{channel.failed}</p>
                        <p className="text-xs text-muted-foreground">Thất bại</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-600">{channel.pending}</p>
                        <p className="text-xs text-muted-foreground">Đang chờ</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Retry Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Quản lý Retry</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => processRetries.mutate()}
                    disabled={processRetries.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${processRetries.isPending ? 'animate-spin' : ''}`} />
                    Xử lý Retry
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">{retryStats?.pendingRetries || 0}</p>
                    <p className="text-sm text-muted-foreground">Đang chờ retry</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-3xl font-bold text-red-600">{retryStats?.exhaustedRetries || 0}</p>
                    <p className="text-sm text-muted-foreground">Đã hết retry</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-3xl font-bold text-blue-600">
                      {retryStats?.nextRetryIn ? formatDuration(retryStats.nextRetryIn) : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">Retry tiếp theo</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent SMS History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lịch sử SMS gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {smsHistory && smsHistory.length > 0 ? (
                    smsHistory.map((sms: any) => (
                      <div key={sms.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant={sms.status === 'sent' ? 'default' : 'destructive'}>
                            {sms.status}
                          </Badge>
                          <span className="text-sm">{sms.to}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(sms.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Chưa có lịch sử SMS</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Webhook History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Lịch sử Webhook gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {webhookHistory && webhookHistory.length > 0 ? (
                    webhookHistory.map((wh: any) => (
                      <div key={wh.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            wh.status === 'success' ? 'default' : 
                            wh.status === 'retrying' ? 'secondary' : 'destructive'
                          }>
                            {wh.status}
                          </Badge>
                          <span className="text-sm">{wh.webhookName}</span>
                          <Badge variant="outline">{wh.webhookType}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {wh.retryCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Retry: {wh.retryCount}/{wh.maxRetries}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(wh.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Chưa có lịch sử Webhook</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            {/* Resolution Time Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Phân bố Thời gian Xử lý</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={alertAnalytics?.resolutionTimeDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="Số lượng" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Alert by Source */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cảnh báo theo Nguồn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={alertAnalytics?.bySource || []} 
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                      <Bar dataKey="warning" stackId="a" fill="#f59e0b" name="Warning" />
                      <Bar dataKey="info" stackId="a" fill="#3b82f6" name="Info" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* SMS Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hiệu suất SMS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Tổng số</span>
                      <span className="font-bold">{smsStats?.total || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Thành công</span>
                      <span className="font-bold text-green-600">{smsStats?.sent || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Thất bại</span>
                      <span className="font-bold text-red-600">{smsStats?.failed || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tỷ lệ thành công</span>
                      <span className="font-bold">
                        {smsStats?.total ? Math.round(((smsStats.sent || 0) / smsStats.total) * 100) : 0}%
                      </span>
                    </div>
                    {smsStats?.lastSent && (
                      <div className="flex items-center justify-between">
                        <span>Gửi gần nhất</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(smsStats.lastSent).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Webhook Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hiệu suất Webhook</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Tổng số</span>
                      <span className="font-bold">{webhookStats?.total || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Thành công</span>
                      <span className="font-bold text-green-600">{webhookStats?.success || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Thất bại</span>
                      <span className="font-bold text-red-600">{webhookStats?.failed || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Đang retry</span>
                      <span className="font-bold text-yellow-600">{webhookStats?.retrying || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tỷ lệ thành công</span>
                      <span className="font-bold">{webhookStats?.successRate || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Retry trung bình</span>
                      <span className="font-bold">{webhookStats?.avgRetries || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Combined Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">So sánh Hiệu suất Kênh Thông báo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: 'SMS',
                          success: smsStats?.sent || 0,
                          failed: smsStats?.failed || 0,
                          pending: smsStats?.pending || 0,
                        },
                        {
                          name: 'Webhook',
                          success: webhookStats?.success || 0,
                          failed: webhookStats?.failed || 0,
                          pending: (webhookStats?.pending || 0) + (webhookStats?.retrying || 0),
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="success" fill="#10b981" name="Thành công" />
                      <Bar dataKey="failed" fill="#ef4444" name="Thất bại" />
                      <Bar dataKey="pending" fill="#f59e0b" name="Đang chờ" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
