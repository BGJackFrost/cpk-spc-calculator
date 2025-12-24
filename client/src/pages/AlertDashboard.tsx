import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Mail,
  MessageSquare,
  Users,
  Activity,
  Zap,
} from 'lucide-react';

// Colors for charts
const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
const SEVERITY_COLORS = {
  critical: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
};

export default function AlertDashboard() {
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [showEscalationConfig, setShowEscalationConfig] = useState(false);
  const [escalationConfig, setEscalationConfig] = useState({
    enabled: false,
    levels: [
      { level: 1, name: 'Supervisor', timeoutMinutes: 15, notifyEmails: '', notifyPhones: '' },
      { level: 2, name: 'Manager', timeoutMinutes: 30, notifyEmails: '', notifyPhones: '' },
      { level: 3, name: 'Director', timeoutMinutes: 60, notifyEmails: '', notifyPhones: '' },
    ],
  });

  // Queries
  const alertStatsQuery = trpc.kpiAlert.getStats.useQuery(
    { days: timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 90 },
    { refetchInterval: autoRefresh ? refreshInterval * 1000 : false }
  );

  const pendingAlertsQuery = trpc.kpiAlert.getPending.useQuery(
    undefined,
    { refetchInterval: autoRefresh ? refreshInterval * 1000 : false }
  );

  const escalationStatsQuery = trpc.escalation.getStats.useQuery(
    { days: timeRange === '7d' ? 7 : timeRange === '14d' ? 14 : timeRange === '30d' ? 30 : 90 },
    { refetchInterval: autoRefresh ? refreshInterval * 1000 : false }
  );

  // Mutations
  const acknowledgeAlertMutation = trpc.kpiAlert.acknowledge.useMutation({
    onSuccess: () => {
      toast.success('Đã xác nhận cảnh báo');
      pendingAlertsQuery.refetch();
      alertStatsQuery.refetch();
    },
  });

  const resolveAlertMutation = trpc.kpiAlert.resolve.useMutation({
    onSuccess: () => {
      toast.success('Đã giải quyết cảnh báo');
      pendingAlertsQuery.refetch();
      alertStatsQuery.refetch();
    },
  });

  const saveEscalationConfigMutation = trpc.escalation.saveConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu cấu hình escalation');
      setShowEscalationConfig(false);
    },
  });

  // Stats data
  const stats = alertStatsQuery.data || {
    total: 0,
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    critical: 0,
    warning: 0,
    byType: [],
    byDay: [],
    avgResolveTime: 0,
  };

  const pendingAlerts = pendingAlertsQuery.data || [];
  const escalationStats = escalationStatsQuery.data || {
    totalEscalations: 0,
    byLevel: [],
    avgTimeToResolve: 0,
    escalationRate: 0,
  };

  // Chart data
  const trendData = useMemo(() => {
    return (stats.byDay || []).map((item: any) => ({
      date: item.date,
      critical: item.critical || 0,
      warning: item.warning || 0,
      total: (item.critical || 0) + (item.warning || 0),
    }));
  }, [stats.byDay]);

  const typeDistribution = useMemo(() => {
    return (stats.byType || []).map((item: any, index: number) => ({
      name: item.type,
      value: item.count,
      color: COLORS[index % COLORS.length],
    }));
  }, [stats.byType]);

  const severityDistribution = [
    { name: 'Critical', value: stats.critical, color: SEVERITY_COLORS.critical },
    { name: 'Warning', value: stats.warning, color: SEVERITY_COLORS.warning },
  ];

  const escalationLevelData = escalationStats.byLevel.map((item: any) => ({
    name: `Level ${item.level}`,
    count: item.count,
  }));

  // Handle escalation config save
  const handleSaveEscalationConfig = () => {
    const levels = escalationConfig.levels.map(l => ({
      ...l,
      notifyEmails: l.notifyEmails.split(',').map(e => e.trim()).filter(Boolean),
      notifyPhones: l.notifyPhones.split(',').map(p => p.trim()).filter(Boolean),
      notifyOwner: l.level >= 2,
    }));

    saveEscalationConfigMutation.mutate({
      enabled: escalationConfig.enabled,
      levels,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Cảnh báo</h1>
            <p className="text-muted-foreground">
              Giám sát và quản lý cảnh báo realtime
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-refresh" className="text-sm">Tự động làm mới</Label>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="14d">14 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                alertStatsQuery.refetch();
                pendingAlertsQuery.refetch();
                escalationStatsQuery.refetch();
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setShowEscalationConfig(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Cấu hình Escalation
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cảnh báo</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Chờ xử lý</p>
                  <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Đã xác nhận</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Đã giải quyết</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Escalations</p>
                  <p className="text-2xl font-bold">{escalationStats.totalEscalations}</p>
                </div>
                <ArrowUpRight className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thời gian xử lý TB</p>
                  <p className="text-2xl font-bold">{Math.round(stats.avgResolveTime)}p</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="pending">
              Chờ xử lý
              {pendingAlerts.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingAlerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="escalation">Escalation</TabsTrigger>
            <TabsTrigger value="analytics">Phân tích</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng cảnh báo</CardTitle>
                  <CardDescription>Số lượng cảnh báo theo thời gian</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="critical"
                        stackId="1"
                        stroke={SEVERITY_COLORS.critical}
                        fill={SEVERITY_COLORS.critical}
                        fillOpacity={0.6}
                        name="Critical"
                      />
                      <Area
                        type="monotone"
                        dataKey="warning"
                        stackId="1"
                        stroke={SEVERITY_COLORS.warning}
                        fill={SEVERITY_COLORS.warning}
                        fillOpacity={0.6}
                        name="Warning"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Severity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố theo mức độ</CardTitle>
                  <CardDescription>Critical vs Warning</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={severityDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {severityDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bố theo loại</CardTitle>
                  <CardDescription>Các loại cảnh báo phổ biến</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={typeDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={150} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Escalation Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Thống kê Escalation</CardTitle>
                  <CardDescription>Số lượng escalation theo cấp độ</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={escalationLevelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Pending Alerts Tab */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cảnh báo chờ xử lý</CardTitle>
                <CardDescription>Các cảnh báo cần được xác nhận hoặc giải quyết</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Không có cảnh báo nào đang chờ xử lý</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingAlerts.map((alert: any) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border ${
                          alert.severity === 'critical'
                            ? 'border-red-200 bg-red-50 dark:bg-red-950/20'
                            : 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                              >
                                {alert.severity}
                              </Badge>
                              <span className="font-medium">{alert.alertType}</span>
                              {alert.escalationLevel > 0 && (
                                <Badge variant="outline">
                                  Escalation L{alert.escalationLevel}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mb-2">{alert.alertMessage}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>Giá trị: {alert.currentValue?.toFixed(3)}</span>
                              <span>Ngưỡng: {alert.thresholdValue?.toFixed(3)}</span>
                              {alert.productionLineName && (
                                <span>Dây chuyền: {alert.productionLineName}</span>
                              )}
                              <span>
                                {new Date(alert.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!alert.acknowledgedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeAlertMutation.mutate({ id: alert.id })}
                                disabled={acknowledgeAlertMutation.isPending}
                              >
                                Xác nhận
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => resolveAlertMutation.mutate({ id: alert.id })}
                              disabled={resolveAlertMutation.isPending}
                            >
                              Giải quyết
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Escalation Tab */}
          <TabsContent value="escalation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <ArrowUpRight className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                    <p className="text-2xl font-bold">{escalationStats.totalEscalations}</p>
                    <p className="text-sm text-muted-foreground">Tổng Escalations</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                    <p className="text-2xl font-bold">{escalationStats.escalationRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Tỷ lệ Escalation</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                    <p className="text-2xl font-bold">{Math.round(escalationStats.avgTimeToResolve)}p</p>
                    <p className="text-sm text-muted-foreground">Thời gian xử lý TB</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Escalation theo cấp độ</CardTitle>
                <CardDescription>Phân bố số lượng escalation theo từng cấp</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={escalationLevelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                      {escalationLevelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Hiệu suất xử lý</CardTitle>
                  <CardDescription>Tỷ lệ giải quyết cảnh báo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Tỷ lệ giải quyết</span>
                      <span className="font-bold">
                        {stats.total > 0
                          ? ((stats.resolved / stats.total) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-green-500 h-4 rounded-full transition-all"
                        style={{
                          width: `${stats.total > 0 ? (stats.resolved / stats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-red-500">{stats.pending}</p>
                        <p className="text-xs text-muted-foreground">Chờ xử lý</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-500">{stats.acknowledged}</p>
                        <p className="text-xs text-muted-foreground">Đã xác nhận</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-500">{stats.resolved}</p>
                        <p className="text-xs text-muted-foreground">Đã giải quyết</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kênh thông báo</CardTitle>
                  <CardDescription>Trạng thái các kênh gửi thông báo</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <span>Email</span>
                      </div>
                      <Badge variant="outline" className="text-green-500">Hoạt động</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-5 w-5 text-green-500" />
                        <span>SMS (Twilio)</span>
                      </div>
                      <Badge variant="outline" className="text-yellow-500">Cấu hình</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-purple-500" />
                        <span>Push Notification</span>
                      </div>
                      <Badge variant="outline" className="text-green-500">Hoạt động</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-orange-500" />
                        <span>Webhook</span>
                      </div>
                      <Badge variant="outline" className="text-green-500">Hoạt động</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Escalation Config Dialog */}
        <Dialog open={showEscalationConfig} onOpenChange={setShowEscalationConfig}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cấu hình Escalation</DialogTitle>
              <DialogDescription>
                Thiết lập các cấp độ escalation và thông báo tự động
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Bật Escalation tự động</Label>
                  <p className="text-sm text-muted-foreground">
                    Tự động escalate khi cảnh báo không được xử lý
                  </p>
                </div>
                <Switch
                  checked={escalationConfig.enabled}
                  onCheckedChange={(checked) =>
                    setEscalationConfig({ ...escalationConfig, enabled: checked })
                  }
                />
              </div>

              {escalationConfig.levels.map((level, index) => (
                <Card key={level.level}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Level {level.level}: {level.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Tên cấp độ</Label>
                        <Input
                          value={level.name}
                          onChange={(e) => {
                            const newLevels = [...escalationConfig.levels];
                            newLevels[index].name = e.target.value;
                            setEscalationConfig({ ...escalationConfig, levels: newLevels });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Thời gian chờ (phút)</Label>
                        <Input
                          type="number"
                          value={level.timeoutMinutes}
                          onChange={(e) => {
                            const newLevels = [...escalationConfig.levels];
                            newLevels[index].timeoutMinutes = parseInt(e.target.value) || 15;
                            setEscalationConfig({ ...escalationConfig, levels: newLevels });
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Email thông báo (phân cách bằng dấu phẩy)</Label>
                      <Input
                        placeholder="email1@example.com, email2@example.com"
                        value={level.notifyEmails}
                        onChange={(e) => {
                          const newLevels = [...escalationConfig.levels];
                          newLevels[index].notifyEmails = e.target.value;
                          setEscalationConfig({ ...escalationConfig, levels: newLevels });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Số điện thoại SMS (phân cách bằng dấu phẩy)</Label>
                      <Input
                        placeholder="+84901234567, +84909876543"
                        value={level.notifyPhones}
                        onChange={(e) => {
                          const newLevels = [...escalationConfig.levels];
                          newLevels[index].notifyPhones = e.target.value;
                          setEscalationConfig({ ...escalationConfig, levels: newLevels });
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEscalationConfig(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleSaveEscalationConfig}
                disabled={saveEscalationConfigMutation.isPending}
              >
                Lưu cấu hình
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
