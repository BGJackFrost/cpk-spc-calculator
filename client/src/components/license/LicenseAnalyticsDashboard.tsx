import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  LICENSED_SYSTEMS,
  SystemId 
} from "@shared/licenseTypes";
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Building2,
  DollarSign,
  Calendar,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { vi } from "date-fns/locale";

export default function LicenseAnalyticsDashboard() {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year">("month");
  
  // Queries
  const licensesQuery = trpc.license.list.useQuery();
  const statisticsQuery = trpc.license.statistics.useQuery();
  const revenueQuery = trpc.license.getRevenue.useQuery();
  
  const licenses = licensesQuery.data || [];
  const stats = statisticsQuery.data;
  const revenue = revenueQuery.data;
  
  // Calculate analytics
  const analytics = useMemo(() => {
    if (!licenses.length) return null;
    
    const now = new Date();
    
    // Status distribution
    const statusCounts = {
      active: licenses.filter(l => l.isActive === 1).length,
      inactive: licenses.filter(l => l.isActive === 0 && l.licenseStatus !== 'revoked' && l.licenseStatus !== 'expired').length,
      expired: licenses.filter(l => l.expiresAt && new Date(l.expiresAt) < now).length,
      revoked: licenses.filter(l => l.licenseStatus === 'revoked').length,
    };
    
    // Type distribution
    const typeCounts = {
      trial: licenses.filter(l => l.licenseType === 'trial').length,
      standard: licenses.filter(l => l.licenseType === 'standard').length,
      professional: licenses.filter(l => l.licenseType === 'professional').length,
      enterprise: licenses.filter(l => l.licenseType === 'enterprise').length,
    };
    
    // System distribution
    const systemCounts: Record<string, number> = {};
    licenses.forEach(l => {
      if (l.systems) {
        try {
          const systems = JSON.parse(l.systems) as string[];
          systems.forEach(s => {
            systemCounts[s] = (systemCounts[s] || 0) + 1;
          });
        } catch {}
      }
    });
    
    // Expiring soon (within 30 days)
    const expiringSoon = licenses.filter(l => {
      if (!l.expiresAt) return false;
      const expiresAt = new Date(l.expiresAt);
      const daysUntilExpiry = differenceInDays(expiresAt, now);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).sort((a, b) => {
      return new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime();
    });
    
    // Recently activated (last 7 days)
    const recentlyActivated = licenses.filter(l => {
      if (!l.activatedAt) return false;
      const activatedAt = new Date(l.activatedAt);
      return differenceInDays(now, activatedAt) <= 7;
    }).length;
    
    // Usage rate
    const usageRate = licenses.length > 0 
      ? (statusCounts.active / licenses.length) * 100 
      : 0;
    
    return {
      statusCounts,
      typeCounts,
      systemCounts,
      expiringSoon,
      recentlyActivated,
      usageRate,
      total: licenses.length,
    };
  }, [licenses]);
  
  // Format number
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };
  
  // Format currency
  const formatCurrency = (amount: number, currency: string = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'inactive': return 'bg-gray-400';
      case 'expired': return 'bg-red-500';
      case 'revoked': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };
  
  // Get type color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'trial': return 'bg-gray-500';
      case 'standard': return 'bg-blue-500';
      case 'professional': return 'bg-purple-500';
      case 'enterprise': return 'bg-amber-500';
      default: return 'bg-gray-500';
    }
  };
  
  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng License</p>
                <p className="text-3xl font-bold">{formatNumber(analytics.total)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500 font-medium">+{analytics.recentlyActivated}</span>
              <span className="text-muted-foreground ml-1">tuần này</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                <p className="text-3xl font-bold text-green-500">{formatNumber(analytics.statusCounts.active)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={analytics.usageRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.usageRate.toFixed(1)}% tỷ lệ sử dụng
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sắp hết hạn</p>
                <p className="text-3xl font-bold text-amber-500">{formatNumber(analytics.expiringSoon.length)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Trong 30 ngày tới
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doanh thu</p>
                <p className="text-2xl font-bold text-primary">
                  {revenue ? formatCurrency(revenue.totalVND) : '0 ₫'}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Tổng doanh thu license
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Phân bố theo Trạng thái
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.statusCounts).map(([status, count]) => {
                const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                const labels: Record<string, string> = {
                  active: 'Đang hoạt động',
                  inactive: 'Chưa kích hoạt',
                  expired: 'Đã hết hạn',
                  revoked: 'Đã thu hồi'
                };
                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{labels[status]}</span>
                        <span className="text-sm text-muted-foreground">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Phân bố theo Loại License
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.typeCounts).map(([type, count]) => {
                const percentage = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                const labels: Record<string, string> = {
                  trial: 'Trial',
                  standard: 'Standard',
                  professional: 'Professional',
                  enterprise: 'Enterprise'
                };
                return (
                  <div key={type} className="flex items-center gap-4">
                    <Badge className={getTypeColor(type)}>{labels[type]}</Badge>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-muted-foreground">
                          {count} license
                        </span>
                        <span className="text-sm font-medium">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* System Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Phân bố theo Hệ thống
          </CardTitle>
          <CardDescription>
            Số lượng license được cấp cho từng hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {(Object.keys(LICENSED_SYSTEMS) as SystemId[]).map((systemId) => {
              const count = analytics.systemCounts[systemId] || 0;
              const system = LICENSED_SYSTEMS[systemId];
              return (
                <Card key={systemId} className="border-2" style={{ borderColor: system.color + '40' }}>
                  <CardContent className="p-4 text-center">
                    <div 
                      className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                      style={{ backgroundColor: system.color + '20' }}
                    >
                      <span className="text-lg font-bold" style={{ color: system.color }}>
                        {system.name.charAt(0)}
                      </span>
                    </div>
                    <p className="font-medium text-sm">{system.name}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: system.color }}>
                      {count}
                    </p>
                    <p className="text-xs text-muted-foreground">license</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Expiring Soon Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                License sắp hết hạn
              </CardTitle>
              <CardDescription>
                Danh sách license sẽ hết hạn trong 30 ngày tới
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analytics.expiringSoon.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Key</TableHead>
                  <TableHead>Công ty</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Ngày hết hạn</TableHead>
                  <TableHead>Còn lại</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.expiringSoon.slice(0, 10).map((license) => {
                  const daysLeft = differenceInDays(new Date(license.expiresAt!), new Date());
                  return (
                    <TableRow key={license.id}>
                      <TableCell className="font-mono text-sm">
                        {license.licenseKey?.substring(0, 19)}...
                      </TableCell>
                      <TableCell>{license.companyName || '-'}</TableCell>
                      <TableCell>
                        <Badge className={getTypeColor(license.licenseType)}>
                          {license.licenseType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(license.expiresAt!), 'dd/MM/yyyy', { locale: vi })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"}>
                          {daysLeft} ngày
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm">
                          Gia hạn
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>Không có license nào sắp hết hạn</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
