/**
 * Cache Monitoring Dashboard
 * Displays cache hit rate, size, and performance metrics
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { RefreshCw, Database, TrendingUp, Trash2, AlertTriangle, CheckCircle, Activity, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function CacheMonitoringDashboard() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch cache stats
  const { data: cacheStats, isLoading, refetch } = trpc.cacheMonitoring.getStats.useQuery(undefined, {
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Fetch cache history
  const { data: cacheHistory } = trpc.cacheMonitoring.getHistory.useQuery({ minutes: 30 }, {
    refetchInterval: 10000,
  });

  // Clear cache mutation
  const clearCacheMutation = trpc.cacheMonitoring.clearCache.useMutation({
    onSuccess: () => {
      toast({
        title: "Cache đã được xóa",
        description: "Tất cả cache đã được xóa thành công",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear specific pattern mutation
  const clearPatternMutation = trpc.cacheMonitoring.clearPattern.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Đã xóa cache theo pattern",
        description: `Đã xóa ${data.cleared} entries`,
      });
      refetch();
    },
  });

  // Reset metrics mutation
  const resetMetricsMutation = trpc.cacheMonitoring.resetMetrics.useMutation({
    onSuccess: () => {
      toast({
        title: "Đã reset metrics",
        description: "Các chỉ số cache đã được reset",
      });
      refetch();
    },
  });

  // Cleanup expired entries mutation
  const cleanupMutation = trpc.cacheMonitoring.cleanup.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Đã dọn dẹp cache",
        description: `Đã xóa ${data.cleaned} entries hết hạn`,
      });
      refetch();
    },
  });

  // Calculate category stats
  const getCategoryStats = () => {
    if (!cacheStats?.keys) return [];
    
    const categories: Record<string, number> = {};
    cacheStats.keys.forEach((key: string) => {
      const category = key.split(':')[0];
      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.entries(categories).map(([name, count]) => ({
      name,
      count,
      percentage: ((count / cacheStats.keys.length) * 100).toFixed(1),
    }));
  };

  const categoryStats = getCategoryStats();

  // Filter keys by category
  const filteredKeys = cacheStats?.keys?.filter((key: string) => 
    selectedCategory === "all" || key.startsWith(selectedCategory + ":")
  ) || [];

  // Calculate hit rate status
  const getHitRateStatus = (hitRate: number) => {
    if (hitRate >= 80) return { status: "excellent", color: "text-green-500", icon: CheckCircle };
    if (hitRate >= 60) return { status: "good", color: "text-blue-500", icon: TrendingUp };
    if (hitRate >= 40) return { status: "fair", color: "text-yellow-500", icon: Activity };
    return { status: "poor", color: "text-red-500", icon: AlertTriangle };
  };

  const hitRateStatus = cacheStats ? getHitRateStatus(cacheStats.hitRate) : null;

  // Pie chart data for cache distribution
  const pieData = categoryStats.map((cat, index) => ({
    name: cat.name,
    value: cat.count,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cache Monitoring</h1>
            <p className="text-muted-foreground">
              Theo dõi hiệu suất và quản lý cache hệ thống
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button variant="outline" onClick={() => cleanupMutation.mutate()}>
              <Clock className="h-4 w-4 mr-2" />
              Dọn dẹp
            </Button>
            <Button variant="destructive" onClick={() => clearCacheMutation.mutate()}>
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa tất cả
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Hit Rate Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Hit Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {cacheStats?.hitRate?.toFixed(1) || 0}%
                </div>
                {hitRateStatus && (
                  <Badge variant={hitRateStatus.status === "excellent" ? "default" : "secondary"} className={hitRateStatus.color}>
                    <hitRateStatus.icon className="h-3 w-3 mr-1" />
                    {hitRateStatus.status}
                  </Badge>
                )}
              </div>
              <Progress value={cacheStats?.hitRate || 0} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {cacheStats?.metrics?.hits || 0} hits / {(cacheStats?.metrics?.hits || 0) + (cacheStats?.metrics?.misses || 0)} requests
              </p>
            </CardContent>
          </Card>

          {/* Cache Size Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Cache Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {cacheStats?.size || 0}
              </div>
              <Progress 
                value={((cacheStats?.size || 0) / (cacheStats?.maxSize || 10000)) * 100} 
                className="mt-2" 
              />
              <p className="text-xs text-muted-foreground mt-2">
                / {cacheStats?.maxSize || 10000} max entries
              </p>
            </CardContent>
          </Card>

          {/* Hits Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Cache Hits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {cacheStats?.metrics?.hits?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Số lần truy xuất từ cache thành công
              </p>
            </CardContent>
          </Card>

          {/* Misses Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Cache Misses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">
                {cacheStats?.metrics?.misses?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Evictions: {cacheStats?.metrics?.evictions?.toLocaleString() || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Hit Rate Alert */}
        {hitRateStatus && hitRateStatus.status === "poor" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Cảnh báo: Hit Rate thấp</AlertTitle>
            <AlertDescription>
              Hit rate hiện tại ({cacheStats?.hitRate?.toFixed(1)}%) thấp hơn mức khuyến nghị (40%). 
              Điều này có thể ảnh hưởng đến hiệu suất hệ thống. Hãy kiểm tra cấu hình cache và TTL.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs for detailed views */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="categories">Phân loại</TabsTrigger>
            <TabsTrigger value="keys">Chi tiết Keys</TabsTrigger>
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Cache Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ Cache theo Category</CardTitle>
                  <CardDescription>Tỷ lệ các loại cache trong hệ thống</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Stats Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Số lượng Cache theo Category</CardTitle>
                  <CardDescription>Thống kê số entries theo từng loại</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <CardTitle>Cache Categories</CardTitle>
                <CardDescription>Quản lý cache theo từng category</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead className="text-right">Tỷ lệ</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryStats.map((cat) => (
                      <TableRow key={cat.name}>
                        <TableCell className="font-medium">{cat.name}</TableCell>
                        <TableCell className="text-right">{cat.count}</TableCell>
                        <TableCell className="text-right">{cat.percentage}%</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => clearPatternMutation.mutate({ pattern: `^${cat.name}:` })}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Xóa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Keys Tab */}
          <TabsContent value="keys">
            <Card>
              <CardHeader>
                <CardTitle>Cache Keys</CardTitle>
                <CardDescription>
                  Danh sách tất cả cache keys ({filteredKeys.length} entries)
                </CardDescription>
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant={selectedCategory === "all" ? "default" : "outline"} 
                    size="sm"
                    onClick={() => setSelectedCategory("all")}
                  >
                    Tất cả
                  </Button>
                  {categoryStats.map((cat) => (
                    <Button
                      key={cat.name}
                      variant={selectedCategory === cat.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.name)}
                    >
                      {cat.name} ({cat.count})
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredKeys.slice(0, 100).map((key: string, index: number) => (
                        <TableRow key={key}>
                          <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-mono text-sm">{key}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{key.split(':')[0]}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredKeys.length > 100 && (
                    <p className="text-center text-muted-foreground mt-4">
                      Hiển thị 100 / {filteredKeys.length} keys
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử Hit Rate</CardTitle>
                <CardDescription>Biến động hit rate trong 30 phút gần nhất</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cacheHistory || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString('vi-VN')}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Hit Rate']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="hitRate" 
                        stroke="#3b82f6" 
                        fill="#3b82f680" 
                        name="Hit Rate"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>Các thao tác quản lý cache</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button variant="outline" onClick={() => resetMetricsMutation.mutate()}>
              <Activity className="h-4 w-4 mr-2" />
              Reset Metrics
            </Button>
            <Button variant="outline" onClick={() => clearPatternMutation.mutate({ pattern: "^products:" })}>
              Xóa cache Products
            </Button>
            <Button variant="outline" onClick={() => clearPatternMutation.mutate({ pattern: "^spcPlans:" })}>
              Xóa cache SPC Plans
            </Button>
            <Button variant="outline" onClick={() => clearPatternMutation.mutate({ pattern: "^ai:" })}>
              Xóa cache AI
            </Button>
            <Button variant="outline" onClick={() => clearPatternMutation.mutate({ pattern: "^iot:" })}>
              Xóa cache IoT
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
