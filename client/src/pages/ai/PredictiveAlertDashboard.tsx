import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc';
import { 
  AlertTriangle, 
  Bell, 
  CheckCircle, 
  Clock, 
  Filter, 
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Activity,
  Target,
  Gauge,
  AlertCircle,
  Search,
  Download
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
const SEVERITY_COLORS = {
  critical: '#ef4444',
  warning: '#f97316',
  info: '#3b82f6'
};

export default function PredictiveAlertDashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  const [alertType, setAlertType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  // Fetch active alerts
  const { data: alertHistory, isLoading: loadingHistory, refetch: refetchHistory } = trpc.predictiveAlert.getAlertHistory.useQuery({
    limit: 100,
    status: 'active'
  });

  // Fetch thresholds
  const { data: thresholds, isLoading: loadingThresholds } = trpc.predictiveAlert.listThresholds.useQuery();

  // Acknowledge alert mutation
  const acknowledgeAlert = trpc.predictiveAlert.acknowledgeAlert.useMutation({
    onSuccess: () => {
      refetchHistory();
    }
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!alertHistory) return { total: 0, critical: 0, warning: 0, info: 0, acknowledged: 0 };
    
    return {
      total: alertHistory.length,
      critical: alertHistory.filter((a: any) => a.severity === 'critical').length,
      warning: alertHistory.filter((a: any) => a.severity === 'warning').length,
      info: alertHistory.filter((a: any) => a.severity === 'info').length,
      acknowledged: alertHistory.filter((a: any) => a.acknowledgedAt).length
    };
  }, [alertHistory]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    if (!alertHistory) return [];
    
    return alertHistory.filter((alert: any) => {
      if (alertType !== 'all' && alert.alertType !== alertType) return false;
      if (selectedSeverity !== 'all' && alert.severity !== selectedSeverity) return false;
      if (searchTerm && !alert.message?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [alertHistory, alertType, selectedSeverity, searchTerm]);

  // Group alerts by type for pie chart
  const alertsByType = useMemo(() => {
    if (!alertHistory) return [];
    
    const grouped: Record<string, number> = {};
    alertHistory.forEach((alert: any) => {
      const type = alert.alertType || 'unknown';
      grouped[type] = (grouped[type] || 0) + 1;
    });
    
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [alertHistory]);

  // Group alerts by hour for trend chart
  const alertTrend = useMemo(() => {
    if (!alertHistory) return [];
    
    const now = new Date();
    const hours: Record<string, { hour: string; critical: number; warning: number; info: number }> = {};
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      hours[key] = { hour: key, critical: 0, warning: 0, info: 0 };
    }
    
    alertHistory.forEach((alert: any) => {
      const alertTime = new Date(alert.createdAt);
      const hourDiff = Math.floor((now.getTime() - alertTime.getTime()) / (60 * 60 * 1000));
      if (hourDiff < 24) {
        const key = alertTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (hours[key]) {
          hours[key][alert.severity as 'critical' | 'warning' | 'info']++;
        }
      }
    });
    
    return Object.values(hours);
  }, [alertHistory]);

  const handleAcknowledge = (alertId: number) => {
    acknowledgeAlert.mutate({ alertId });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Nghiêm trọng</Badge>;
      case 'warning':
        return <Badge className="bg-orange-500">Cảnh báo</Badge>;
      default:
        return <Badge variant="secondary">Thông tin</Badge>;
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'oee_low':
        return <Gauge className="h-4 w-4 text-red-500" />;
      case 'defect_high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'trend_declining':
        return <TrendingDown className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Cảnh báo Dự báo</h1>
            <p className="text-muted-foreground">
              Tổng hợp và giám sát tất cả cảnh báo từ hệ thống dự báo AI
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchHistory()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                  <p className="text-sm text-red-600">Nghiêm trọng</p>
                  <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Cảnh báo</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.warning}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Thông tin</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.info}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Đã xử lý</p>
                  <p className="text-2xl font-bold text-green-600">{stats.acknowledged}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alert Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng cảnh báo 24h</CardTitle>
              <CardDescription>Số lượng cảnh báo theo giờ</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={alertTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="critical" 
                      stackId="1"
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      name="Nghiêm trọng"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="warning" 
                      stackId="1"
                      stroke="#f97316" 
                      fill="#f97316" 
                      name="Cảnh báo"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="info" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      name="Thông tin"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Alert Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Phân bổ theo loại cảnh báo</CardTitle>
              <CardDescription>Tỷ lệ các loại cảnh báo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={alertsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {alertsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Cảnh báo đang hoạt động</CardTitle>
                <CardDescription>Danh sách các cảnh báo cần xử lý</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-[200px]"
                  />
                </div>
                <Select value={alertType} onValueChange={setAlertType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Loại cảnh báo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="oee_low">OEE thấp</SelectItem>
                    <SelectItem value="defect_high">Lỗi cao</SelectItem>
                    <SelectItem value="trend_declining">Xu hướng giảm</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Mức độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="critical">Nghiêm trọng</SelectItem>
                    <SelectItem value="warning">Cảnh báo</SelectItem>
                    <SelectItem value="info">Thông tin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHistory ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mb-2 text-green-500" />
                <p>Không có cảnh báo nào đang hoạt động</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.severity === 'critical' 
                        ? 'border-red-200 bg-red-50 dark:bg-red-950/20' 
                        : alert.severity === 'warning'
                        ? 'border-orange-200 bg-orange-50 dark:bg-orange-950/20'
                        : 'border-blue-200 bg-blue-50 dark:bg-blue-950/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {getAlertTypeIcon(alert.alertType)}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getSeverityBadge(alert.severity)}
                            <span className="text-sm text-muted-foreground">
                              {new Date(alert.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <p className="font-medium">{alert.message}</p>
                          {alert.details && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Giá trị: {alert.details.actualValue?.toFixed(2)} | 
                              Ngưỡng: {alert.details.thresholdValue?.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {alert.acknowledgedAt ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Đã xử lý
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledgeAlert.isPending}
                          >
                            Xác nhận
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Ngưỡng cảnh báo đang hoạt động</CardTitle>
            <CardDescription>Danh sách các ngưỡng đã cấu hình</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingThresholds ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : !thresholds || thresholds.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Target className="h-12 w-12 mb-2" />
                <p>Chưa có ngưỡng cảnh báo nào được cấu hình</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {thresholds.filter((t: any) => t.isEnabled).map((threshold: any) => (
                  <div
                    key={threshold.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={threshold.metricType === 'oee' ? 'default' : 'secondary'}>
                        {threshold.metricType === 'oee' ? 'OEE' : 'Defect Rate'}
                      </Badge>
                      <Badge variant="outline" className="text-green-600">
                        Đang hoạt động
                      </Badge>
                    </div>
                    <h4 className="font-medium mb-1">{threshold.name}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        Ngưỡng cảnh báo: <span className="text-orange-600 font-medium">{threshold.warningThreshold}%</span>
                      </p>
                      <p>
                        Ngưỡng nghiêm trọng: <span className="text-red-600 font-medium">{threshold.criticalThreshold}%</span>
                      </p>
                      {threshold.productionLineId && (
                        <p>Dây chuyền ID: {threshold.productionLineId}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
