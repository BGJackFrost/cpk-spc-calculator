import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { 
  BarChart3, TrendingUp, Clock, AlertTriangle, Download, 
  Calendar, Bell, CheckCircle, XCircle, Timer
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { vi } from 'date-fns/locale';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

export default function AlertAnalytics() {
  const [timeRange, setTimeRange] = useState('30');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  // Fetch alert statistics
  const { data: alertStats, isLoading } = trpc.alerts.getAnalytics.useQuery({
    days: parseInt(timeRange),
    groupBy,
  });

  // Calculate MTTR (Mean Time To Resolve)
  const mttr = useMemo(() => {
    if (!alertStats?.resolvedAlerts || alertStats.resolvedAlerts.length === 0) return null;
    const totalTime = alertStats.resolvedAlerts.reduce((sum, alert) => {
      if (alert.resolvedAt && alert.createdAt) {
        return sum + (new Date(alert.resolvedAt).getTime() - new Date(alert.createdAt).getTime());
      }
      return sum;
    }, 0);
    const avgMs = totalTime / alertStats.resolvedAlerts.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, totalMs: avgMs };
  }, [alertStats?.resolvedAlerts]);

  // Prepare trend data
  const trendData = useMemo(() => {
    if (!alertStats?.trendData) return [];
    return alertStats.trendData.map(item => ({
      ...item,
      date: format(new Date(item.date), groupBy === 'month' ? 'MMM yyyy' : 'dd/MM', { locale: vi }),
    }));
  }, [alertStats?.trendData, groupBy]);

  // Prepare severity distribution
  const severityData = useMemo(() => {
    if (!alertStats?.bySeverity) return [];
    return Object.entries(alertStats.bySeverity).map(([name, value]) => ({
      name: name === 'critical' ? 'Nghiêm trọng' : 
            name === 'warning' ? 'Cảnh báo' : 
            name === 'info' ? 'Thông tin' : name,
      value,
      color: name === 'critical' ? '#ef4444' : 
             name === 'warning' ? '#f97316' : '#3b82f6',
    }));
  }, [alertStats?.bySeverity]);

  // Top alerts by type
  const topAlertTypes = useMemo(() => {
    if (!alertStats?.byType) return [];
    return Object.entries(alertStats.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [alertStats?.byType]);

  const handleExport = (format: 'pdf' | 'excel') => {
    // TODO: Implement export
    console.log('Export', format);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Phân tích Alerts</h1>
              <p className="text-muted-foreground">Báo cáo xu hướng và thống kê alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ngày</SelectItem>
                <SelectItem value="14">14 ngày</SelectItem>
                <SelectItem value="30">30 ngày</SelectItem>
                <SelectItem value="90">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'day' | 'week' | 'month')}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Theo ngày</SelectItem>
                <SelectItem value="week">Theo tuần</SelectItem>
                <SelectItem value="month">Theo tháng</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Alerts</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alertStats?.totalAlerts || 0}</div>
              <p className="text-xs text-muted-foreground">
                trong {timeRange} ngày qua
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã xử lý</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {alertStats?.resolvedCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {alertStats?.totalAlerts ? 
                  Math.round((alertStats.resolvedCount / alertStats.totalAlerts) * 100) : 0}% tổng số
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chưa xử lý</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {alertStats?.pendingCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                cần xử lý
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MTTR</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mttr ? `${mttr.hours}h ${mttr.minutes}m` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                thời gian xử lý trung bình
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Xu hướng Alerts
              </CardTitle>
              <CardDescription>
                Số lượng alerts theo {groupBy === 'day' ? 'ngày' : groupBy === 'week' ? 'tuần' : 'tháng'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="critical" 
                      name="Nghiêm trọng"
                      stackId="1"
                      stroke="#ef4444" 
                      fill="#ef4444" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="warning" 
                      name="Cảnh báo"
                      stackId="1"
                      stroke="#f97316" 
                      fill="#f97316" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="info" 
                      name="Thông tin"
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Phân bổ theo Severity
              </CardTitle>
              <CardDescription>
                Tỷ lệ alerts theo mức độ nghiêm trọng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
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
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Alert Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Loại Alerts
              </CardTitle>
              <CardDescription>
                Các loại alerts xuất hiện nhiều nhất
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topAlertTypes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" fontSize={12} />
                    <YAxis dataKey="name" type="category" fontSize={11} width={120} />
                    <Tooltip />
                    <Bar dataKey="count" name="Số lượng" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Thời gian xử lý
              </CardTitle>
              <CardDescription>
                Phân bổ thời gian xử lý alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertStats?.resolutionTimeDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" name="Số lượng" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        <Card>
          <CardHeader>
            <CardTitle>Chi tiết theo nguồn</CardTitle>
            <CardDescription>
              Thống kê alerts theo dây chuyền/công trạm
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Nguồn</th>
                    <th className="text-center py-3 px-4">Tổng</th>
                    <th className="text-center py-3 px-4">Critical</th>
                    <th className="text-center py-3 px-4">Warning</th>
                    <th className="text-center py-3 px-4">Info</th>
                    <th className="text-center py-3 px-4">Đã xử lý</th>
                    <th className="text-center py-3 px-4">MTTR</th>
                  </tr>
                </thead>
                <tbody>
                  {alertStats?.bySource?.map((source, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{source.name}</td>
                      <td className="text-center py-3 px-4">{source.total}</td>
                      <td className="text-center py-3 px-4 text-red-600">{source.critical}</td>
                      <td className="text-center py-3 px-4 text-orange-600">{source.warning}</td>
                      <td className="text-center py-3 px-4 text-blue-600">{source.info}</td>
                      <td className="text-center py-3 px-4 text-green-600">{source.resolved}</td>
                      <td className="text-center py-3 px-4">{source.mttr || 'N/A'}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        Không có dữ liệu
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
