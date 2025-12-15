import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Key, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  TrendingUp,
  RefreshCw,
  Wifi,
  WifiOff,
  Calendar,
  Building2,
  Loader2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function LicenseServerDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get License Server status
  const serverStatus = trpc.licenseServer.getStatus.useQuery(undefined, {
    refetchInterval: 10000
  });
  
  // Get License Server stats
  const stats = trpc.licenseServer.getStats.useQuery(undefined, {
    refetchInterval: 30000
  });
  
  // Get licenses list
  const licenses = trpc.licenseServer.listLicenses.useQuery(undefined, {
    refetchInterval: 30000
  });
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      serverStatus.refetch(),
      stats.refetch(),
      licenses.refetch()
    ]);
    setIsRefreshing(false);
    toast.success("Đã cập nhật dữ liệu");
  };
  
  // Calculate online licenses (heartbeat within last 2 hours)
  const onlineLicenses = licenses.data?.filter(l => {
    if (!l.lastHeartbeat) return false;
    const lastHeartbeat = new Date(l.lastHeartbeat);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return lastHeartbeat > twoHoursAgo;
  }) || [];
  
  // Calculate expiring licenses
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const expiringIn7Days = licenses.data?.filter(l => {
    if (!l.expiresAt || l.status !== 'active') return false;
    const expDate = new Date(l.expiresAt);
    return expDate > now && expDate <= in7Days;
  }) || [];
  
  const expiringIn30Days = licenses.data?.filter(l => {
    if (!l.expiresAt || l.status !== 'active') return false;
    const expDate = new Date(l.expiresAt);
    return expDate > now && expDate <= in30Days;
  }) || [];
  
  // License by type for pie chart
  const licenseByType = licenses.data?.reduce((acc, l) => {
    const type = l.licenseType || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  const pieData = Object.entries(licenseByType).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));
  
  // License by status
  const licenseByStatus = licenses.data?.reduce((acc, l) => {
    const status = l.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  // Mock activation trend data (in real app, this would come from API)
  const activationTrend = [
    { date: 'T2', activations: 5, validations: 12 },
    { date: 'T3', activations: 8, validations: 18 },
    { date: 'T4', activations: 3, validations: 15 },
    { date: 'T5', activations: 12, validations: 25 },
    { date: 'T6', activations: 7, validations: 20 },
    { date: 'T7', activations: 4, validations: 10 },
    { date: 'CN', activations: 2, validations: 8 },
  ];
  
  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'revoked':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              License Server Dashboard
            </h1>
            <p className="text-muted-foreground">
              Giám sát và quản lý license server theo thời gian thực
            </p>
          </div>
          <div className="flex items-center gap-2">
            {serverStatus.data?.connected ? (
              <Badge className="bg-green-100 text-green-800">
                <Wifi className="h-3 w-3 mr-1" />
                Server Connected
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                <WifiOff className="h-3 w-3 mr-1" />
                Server Disconnected
              </Badge>
            )}
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng License</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.totalLicenses || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.data?.activeLicenses || 0} đang hoạt động
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">License Online</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{onlineLicenses.length}</div>
              <p className="text-xs text-muted-foreground">
                Có heartbeat trong 2 giờ qua
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sắp hết hạn (7 ngày)</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{expiringIn7Days.length}</div>
              <p className="text-xs text-muted-foreground">
                Cần gia hạn sớm
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Khách hàng</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data?.totalCustomers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Tổng số khách hàng
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Activation Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Xu hướng Activation
              </CardTitle>
              <CardDescription>
                Số lượng activation và validation trong tuần
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activationTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="activations" 
                      stackId="1"
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                      name="Activations"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="validations" 
                      stackId="2"
                      stroke="#22c55e" 
                      fill="#22c55e" 
                      fillOpacity={0.6}
                      name="Validations"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {/* License by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Phân bố theo Loại
              </CardTitle>
              <CardDescription>
                Tỷ lệ các loại license
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Chưa có dữ liệu
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-green-600">{licenseByStatus['active'] || 0}</div>
                <Progress value={((licenseByStatus['active'] || 0) / (stats.data?.totalLicenses || 1)) * 100} className="flex-1" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Expired</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-red-600">{licenseByStatus['expired'] || 0}</div>
                <Progress value={((licenseByStatus['expired'] || 0) / (stats.data?.totalLicenses || 1)) * 100} className="flex-1 [&>div]:bg-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Revoked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-gray-600">{licenseByStatus['revoked'] || 0}</div>
                <Progress value={((licenseByStatus['revoked'] || 0) / (stats.data?.totalLicenses || 1)) * 100} className="flex-1 [&>div]:bg-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expiring Soon & Online Licenses */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Expiring Soon */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                License Sắp Hết Hạn
              </CardTitle>
              <CardDescription>
                License hết hạn trong 30 ngày tới
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expiringIn30Days.length > 0 ? (
                <div className="space-y-3">
                  {expiringIn30Days.slice(0, 5).map((license) => {
                    const daysLeft = Math.ceil((new Date(license.expiresAt!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={license.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <div>
                          <p className="font-mono text-sm">{license.licenseKey}</p>
                          <p className="text-xs text-muted-foreground">{license.companyName || 'N/A'}</p>
                        </div>
                        <Badge className={daysLeft <= 7 ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}>
                          {daysLeft} ngày
                        </Badge>
                      </div>
                    );
                  })}
                  {expiringIn30Days.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{expiringIn30Days.length - 5} license khác
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p>Không có license sắp hết hạn</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Online Licenses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                License Đang Online
              </CardTitle>
              <CardDescription>
                License có heartbeat trong 2 giờ qua
              </CardDescription>
            </CardHeader>
            <CardContent>
              {onlineLicenses.length > 0 ? (
                <div className="space-y-3">
                  {onlineLicenses.slice(0, 5).map((license) => (
                    <div key={license.id} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <div>
                        <p className="font-mono text-sm">{license.licenseKey}</p>
                        <p className="text-xs text-muted-foreground">{license.companyName || 'N/A'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-xs text-muted-foreground">
                          {license.lastHeartbeat ? new Date(license.lastHeartbeat).toLocaleTimeString("vi-VN") : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {onlineLicenses.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{onlineLicenses.length - 5} license khác
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <WifiOff className="h-8 w-8 mx-auto mb-2" />
                  <p>Không có license online</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
