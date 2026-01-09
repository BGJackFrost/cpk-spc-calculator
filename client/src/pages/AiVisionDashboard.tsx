import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  AlertTriangle, 
  BarChart3, 
  Brain, 
  CheckCircle2, 
  Clock, 
  Factory, 
  RefreshCw, 
  Settings, 
  TrendingDown, 
  TrendingUp, 
  XCircle,
  Sparkles,
  Eye,
  Zap
} from "lucide-react";
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
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Streamdown } from "streamdown";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export default function AiVisionDashboard() {
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const { data: dashboardData, isLoading, refetch } = trpc.aiVisionDashboard.getData.useQuery(
    { timeRange },
    { refetchInterval: autoRefresh ? 60000 : false }
  );
  
  const { data: config } = trpc.aiVisionDashboard.getConfig.useQuery();
  
  const aiInsightsMutation = trpc.aiVisionDashboard.getAiInsights.useMutation();
  
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  
  const handleGetAiInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const result = await aiInsightsMutation.mutateAsync({ timeRange });
      setAiInsights(result.insights);
    } catch (error) {
      console.error('Error getting AI insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };
  
  const getCpkStatusColor = (cpk: number) => {
    if (cpk >= 1.33) return 'text-green-500';
    if (cpk >= 1.0) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getCpkStatusBadge = (cpk: number) => {
    if (cpk >= 1.33) return <Badge className="bg-green-500">Tốt</Badge>;
    if (cpk >= 1.0) return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
    return <Badge className="bg-red-500">Nguy hiểm</Badge>;
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const pieData = dashboardData?.summary.cpkDistribution ? [
    { name: 'Xuất sắc (≥1.67)', value: dashboardData.summary.cpkDistribution.excellent },
    { name: 'Tốt (≥1.33)', value: dashboardData.summary.cpkDistribution.good },
    { name: 'Chấp nhận (≥1.0)', value: dashboardData.summary.cpkDistribution.acceptable },
    { name: 'Kém (<1.0)', value: dashboardData.summary.cpkDistribution.poor },
  ] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Eye className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Vision Dashboard</h1>
              <p className="text-muted-foreground">Tổng hợp tất cả chỉ số SPC/CPK trên một trang</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
              <SelectTrigger className="w-[140px]">
                <Clock className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 giờ qua</SelectItem>
                <SelectItem value="6h">6 giờ qua</SelectItem>
                <SelectItem value="24h">24 giờ qua</SelectItem>
                <SelectItem value="7d">7 ngày qua</SelectItem>
                <SelectItem value="30d">30 ngày qua</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Tự động' : 'Thủ công'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng phân tích</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {dashboardData?.summary.totalAnalyses || 0}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-blue-500/10 rounded-full">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CPK Trung bình</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className={`text-3xl font-bold ${getCpkStatusColor(dashboardData?.summary.avgCpk || 0)}`}>
                      {(dashboardData?.summary.avgCpk || 0).toFixed(3)}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-green-500/10 rounded-full">
                  {(dashboardData?.summary.avgCpk || 0) >= 1.33 ? (
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Số vi phạm</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {dashboardData?.summary.violationCount || 0}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tỷ lệ NG</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {(dashboardData?.summary.ngRate || 0).toFixed(1)}%
                    </p>
                  )}
                </div>
                <div className="p-3 bg-red-500/10 rounded-full">
                  <XCircle className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="lines">
              <Factory className="h-4 w-4 mr-2" />
              Dây chuyền
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Brain className="h-4 w-4 mr-2" />
              Phân tích AI
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Trend Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Xu hướng CPK & Tỷ lệ NG
                  </CardTitle>
                  <CardDescription>Biểu đồ theo thời gian</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dashboardData?.trendData || []}>
                        <defs>
                          <linearGradient id="colorCpk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorNg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis yAxisId="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }} 
                        />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="cpk"
                          name="CPK"
                          stroke="#3b82f6"
                          fillOpacity={1}
                          fill="url(#colorCpk)"
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="ngRate"
                          name="Tỷ lệ NG (%)"
                          stroke="#ef4444"
                          fillOpacity={1}
                          fill="url(#colorNg)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              
              {/* CPK Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Phân bổ CPK
                  </CardTitle>
                  <CardDescription>Theo mức độ chất lượng</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Cảnh báo gần đây
                </CardTitle>
                <CardDescription>Các vi phạm và cảnh báo CPK</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : dashboardData?.recentAlerts && dashboardData.recentAlerts.length > 0 ? (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {dashboardData.recentAlerts.map((alert, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <XCircle className="h-5 w-5 text-red-500" />
                            <div>
                              <p className="font-medium">CPK: {alert.cpk.toFixed(3)}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(alert.time).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 max-w-[300px]">
                            {alert.violations.slice(0, 2).map((v: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {v}
                              </Badge>
                            ))}
                            {alert.violations.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{alert.violations.length - 2}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                    <p>Không có cảnh báo trong khoảng thời gian này</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="lines" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  Trạng thái dây chuyền sản xuất
                </CardTitle>
                <CardDescription>Tổng quan hiệu suất từng dây chuyền</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : dashboardData?.lineStatus && dashboardData.lineStatus.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.lineStatus.map((line) => (
                      <div
                        key={line.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(line.status)}
                            <div>
                              <p className="font-medium">{line.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {line.analysisCount} phân tích | {line.violationCount} vi phạm
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${getCpkStatusColor(line.cpk)}`}>
                              {line.cpk.toFixed(3)}
                            </p>
                            <p className="text-sm text-muted-foreground">CPK</p>
                          </div>
                        </div>
                        <Progress 
                          value={Math.min(line.cpk / 2 * 100, 100)} 
                          className={`h-2 ${
                            line.status === 'good' ? '[&>div]:bg-green-500' :
                            line.status === 'warning' ? '[&>div]:bg-yellow-500' :
                            '[&>div]:bg-red-500'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Factory className="h-12 w-12 mb-2" />
                    <p>Chưa có dữ liệu dây chuyền</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  Phân tích AI
                </CardTitle>
                <CardDescription>
                  Sử dụng AI để phân tích xu hướng và đưa ra khuyến nghị
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    onClick={handleGetAiInsights}
                    disabled={isLoadingInsights}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
                  >
                    {isLoadingInsights ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Đang phân tích...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Tạo phân tích AI
                      </>
                    )}
                  </Button>
                  
                  {aiInsights && (
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/50 dark:to-indigo-950/50 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-2 mb-3">
                        <Zap className="h-5 w-5 text-purple-500" />
                        <h4 className="font-semibold">Kết quả phân tích</h4>
                      </div>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{aiInsights}</Streamdown>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Last Updated */}
        {dashboardData?.lastUpdated && (
          <p className="text-sm text-muted-foreground text-center">
            Cập nhật lần cuối: {new Date(dashboardData.lastUpdated).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
