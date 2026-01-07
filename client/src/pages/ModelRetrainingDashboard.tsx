/**
 * Model Retraining Dashboard
 * Trang quản lý Model Auto-Retraining và Scheduled Jobs
 */

import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { 
  Brain, Plus, Settings, History, Clock, CheckCircle, XCircle,
  AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Calendar, 
  Target, Gauge, BarChart3, Mail
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type TriggerReason = 'accuracy_drop' | 'f1_drop' | 'drift_detected' | 'scheduled' | 'manual';
type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

interface RetrainingConfig {
  id: number;
  modelId: number;
  name: string;
  description?: string | null;
  accuracyThreshold: number;
  f1ScoreThreshold: number;
  driftThreshold: number;
  minSamplesSinceLastTrain: number;
  maxDaysSinceLastTrain: number;
  checkIntervalHours: number;
  lastCheckAt?: number | null;
  nextCheckAt?: number | null;
  trainingWindowDays: number;
  minTrainingSamples: number;
  validationSplit: number;
  notifyOnRetrain: boolean;
  notifyOnFailure: boolean;
  notificationEmails: string[];
  isEnabled: boolean;
  createdAt: string;
}

interface RetrainingHistory {
  id: number;
  configId: number;
  modelId: number;
  triggerReason: TriggerReason;
  previousAccuracy: number;
  previousF1Score: number;
  status: JobStatus;
  startedAt?: number | null;
  completedAt?: number | null;
  trainingSamples: number;
  trainingDurationSec?: number | null;
  newAccuracy?: number | null;
  newF1Score?: number | null;
  accuracyImprovement?: number | null;
  errorMessage?: string | null;
  createdAt: string;
}

const statusColors: Record<JobStatus, string> = {
  queued: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  running: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const statusLabels: Record<JobStatus, string> = {
  queued: "Đang chờ",
  running: "Đang chạy",
  completed: "Hoàn thành",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

const triggerLabels: Record<TriggerReason, string> = {
  accuracy_drop: "Accuracy giảm",
  f1_drop: "F1 Score giảm",
  drift_detected: "Data drift",
  scheduled: "Theo lịch",
  manual: "Thủ công",
};

export default function ModelRetrainingDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<{ status?: string }>({});

  // Queries
  const { data: configs = [], isLoading: configsLoading, refetch: refetchConfigs } = trpc.modelAutoRetrain.getConfigs.useQuery();
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = trpc.modelAutoRetrain.getHistory.useQuery({
    status: historyFilter.status,
    limit: 50,
  });
  const { data: stats } = trpc.modelAutoRetrain.getStats.useQuery();

  // Mutations
  const createConfig = trpc.modelAutoRetrain.createConfig.useMutation({
    onSuccess: () => {
      toast.success("Tạo cấu hình retraining thành công");
      setIsCreateDialogOpen(false);
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const toggleConfig = trpc.modelAutoRetrain.toggleConfig.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật trạng thái thành công");
      refetchConfigs();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const cancelRetraining = trpc.modelAutoRetrain.cancel.useMutation({
    onSuccess: () => {
      toast.success("Đã hủy retraining");
      refetchHistory();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const handleToggle = (config: RetrainingConfig) => {
    toggleConfig.mutate({ id: config.id, isEnabled: !config.isEnabled });
  };

  const handleCancel = (historyId: number) => {
    if (confirm("Bạn có chắc chắn muốn hủy retraining này?")) {
      cancelRetraining.mutate({ historyId });
    }
  };

  const formatDate = (timestamp: number | string) => {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleString('vi-VN');
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Mock data for charts
  const accuracyTrendData = [
    { date: '01/01', accuracy: 0.92, f1Score: 0.89 },
    { date: '08/01', accuracy: 0.91, f1Score: 0.88 },
    { date: '15/01', accuracy: 0.89, f1Score: 0.86 },
    { date: '22/01', accuracy: 0.87, f1Score: 0.84 },
    { date: '29/01', accuracy: 0.93, f1Score: 0.91 },
    { date: '05/02', accuracy: 0.94, f1Score: 0.92 },
  ];

  const retrainingStatsData = [
    { name: 'Accuracy Drop', value: 12 },
    { name: 'F1 Drop', value: 8 },
    { name: 'Scheduled', value: 15 },
    { name: 'Manual', value: 5 },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Model Auto-Retraining
            </h1>
            <p className="text-muted-foreground mt-1">
              Quản lý tự động retrain model khi accuracy giảm dưới ngưỡng
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo cấu hình mới
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng cấu hình</p>
                  <p className="text-2xl font-bold">{configs.length}</p>
                </div>
                <Settings className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-green-600">
                    {configs.filter((c: RetrainingConfig) => c.isEnabled).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng retraining</p>
                  <p className="text-2xl font-bold">{stats?.totalRetrainings || 0}</p>
                </div>
                <History className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thành công</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.successfulRetrainings || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Improvement</p>
                  <p className="text-2xl font-bold text-blue-600">
                    +{((stats?.avgAccuracyImprovement || 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <Gauge className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="configs" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Lịch sử
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lịch chạy
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Accuracy Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Model Performance Trend
                  </CardTitle>
                  <CardDescription>
                    Theo dõi accuracy và F1 score theo thời gian
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={accuracyTrendData}>
                        <defs>
                          <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorF1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0.8, 1]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                        <Tooltip 
                          formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="accuracy"
                          name="Accuracy"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#colorAccuracy)"
                        />
                        <Area
                          type="monotone"
                          dataKey="f1Score"
                          name="F1 Score"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#colorF1)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Retraining Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Retraining theo nguyên nhân
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={retrainingStatsData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Configs Tab */}
          <TabsContent value="configs" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Danh sách cấu hình Retraining</CardTitle>
                  <CardDescription>
                    Quản lý các cấu hình tự động retrain model
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchConfigs()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Làm mới
                </Button>
              </CardHeader>
              <CardContent>
                {configsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : configs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có cấu hình retraining nào</p>
                    <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo cấu hình đầu tiên
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Model ID</TableHead>
                        <TableHead>Accuracy Threshold</TableHead>
                        <TableHead>Check Interval</TableHead>
                        <TableHead>Next Check</TableHead>
                        <TableHead>Thông báo</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config: RetrainingConfig) => (
                        <TableRow key={config.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{config.name}</p>
                              {config.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {config.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{config.modelId}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{(config.accuracyThreshold * 100).toFixed(0)}%</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{config.checkIntervalHours}h</span>
                          </TableCell>
                          <TableCell>
                            {config.nextCheckAt ? (
                              <span className="text-sm">{formatDate(config.nextCheckAt)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {config.notifyOnRetrain && (
                                <Badge variant="outline" className="gap-1">
                                  <Mail className="h-3 w-3" />
                                  Retrain
                                </Badge>
                              )}
                              {config.notifyOnFailure && (
                                <Badge variant="outline" className="gap-1 text-red-600">
                                  <AlertTriangle className="h-3 w-3" />
                                  Failure
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={config.isEnabled}
                                onCheckedChange={() => handleToggle(config)}
                              />
                              <span className={config.isEnabled ? "text-green-600" : "text-muted-foreground"}>
                                {config.isEnabled ? "Bật" : "Tắt"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lịch sử Retraining</CardTitle>
                  <CardDescription>
                    Xem chi tiết các lần retrain model
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={historyFilter.status || "all"}
                    onValueChange={(v) => setHistoryFilter(prev => ({ ...prev, status: v === "all" ? undefined : v }))}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="queued">Đang chờ</SelectItem>
                      <SelectItem value="running">Đang chạy</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="failed">Thất bại</SelectItem>
                      <SelectItem value="cancelled">Đã hủy</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                ) : !historyData?.history || historyData.history.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có lịch sử retraining</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Model</TableHead>
                          <TableHead>Nguyên nhân</TableHead>
                          <TableHead>Accuracy trước</TableHead>
                          <TableHead>Accuracy sau</TableHead>
                          <TableHead>Cải thiện</TableHead>
                          <TableHead>Thời gian train</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historyData.history.map((item: RetrainingHistory) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <span className="text-sm">{formatDate(item.createdAt)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">#{item.modelId}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {triggerLabels[item.triggerReason]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">
                                {(item.previousAccuracy * 100).toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell>
                              {item.newAccuracy !== null ? (
                                <span className="font-mono">
                                  {(item.newAccuracy * 100).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.accuracyImprovement !== null ? (
                                <span className={`font-mono ${item.accuracyImprovement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.accuracyImprovement > 0 ? '+' : ''}
                                  {(item.accuracyImprovement * 100).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.trainingDurationSec !== null ? (
                                <span className="font-mono">
                                  {formatDuration(item.trainingDurationSec)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[item.status]}>
                                {statusLabels[item.status]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {(item.status === 'queued' || item.status === 'running') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCancel(item.id)}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Lịch kiểm tra tự động
                </CardTitle>
                <CardDescription>
                  Các cấu hình sẽ được kiểm tra theo lịch đã định
                </CardDescription>
              </CardHeader>
              <CardContent>
                {configs.filter((c: RetrainingConfig) => c.isEnabled).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Không có cấu hình nào đang hoạt động</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {configs
                      .filter((c: RetrainingConfig) => c.isEnabled)
                      .sort((a: RetrainingConfig, b: RetrainingConfig) => (a.nextCheckAt || 0) - (b.nextCheckAt || 0))
                      .map((config: RetrainingConfig) => {
                        const nextCheck = config.nextCheckAt ? new Date(config.nextCheckAt) : null;
                        const isOverdue = nextCheck && nextCheck < new Date();
                        return (
                          <div
                            key={config.id}
                            className={`p-4 border rounded-lg ${isOverdue ? 'border-orange-500 bg-orange-50 dark:bg-orange-950' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${isOverdue ? 'bg-orange-100 dark:bg-orange-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                                  <Clock className={`h-5 w-5 ${isOverdue ? 'text-orange-600' : 'text-blue-600'}`} />
                                </div>
                                <div>
                                  <p className="font-medium">{config.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Model #{config.modelId} • Kiểm tra mỗi {config.checkIntervalHours}h
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {nextCheck ? formatDate(nextCheck.getTime()) : 'Chưa lên lịch'}
                                </p>
                                {isOverdue && (
                                  <Badge variant="outline" className="text-orange-600">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Quá hạn
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Accuracy threshold</p>
                                <p className="font-mono">{(config.accuracyThreshold * 100).toFixed(0)}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">F1 threshold</p>
                                <p className="font-mono">{(config.f1ScoreThreshold * 100).toFixed(0)}%</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Max days</p>
                                <p className="font-mono">{config.maxDaysSinceLastTrain} ngày</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Last check</p>
                                <p className="text-xs">
                                  {config.lastCheckAt ? formatDate(config.lastCheckAt) : '-'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <RetrainingConfigDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSubmit={(data) => createConfig.mutate(data)}
          isLoading={createConfig.isPending}
        />
      </div>
    </DashboardLayout>
  );
}

// Retraining Config Dialog Component
interface RetrainingConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function RetrainingConfigDialog({ open, onOpenChange, onSubmit, isLoading }: RetrainingConfigDialogProps) {
  const [formData, setFormData] = useState({
    modelId: 1,
    name: "",
    description: "",
    accuracyThreshold: 0.85,
    f1ScoreThreshold: 0.8,
    driftThreshold: 0.15,
    minSamplesSinceLastTrain: 1000,
    maxDaysSinceLastTrain: 30,
    checkIntervalHours: 6,
    trainingWindowDays: 30,
    minTrainingSamples: 1000,
    validationSplit: 0.2,
    notifyOnRetrain: true,
    notifyOnFailure: true,
    notificationEmails: "",
  });

  const handleSubmit = () => {
    const data = {
      ...formData,
      notificationEmails: formData.notificationEmails.split(",").map(e => e.trim()).filter(Boolean),
    };
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo cấu hình Retraining mới</DialogTitle>
          <DialogDescription>
            Cấu hình tự động retrain model khi accuracy giảm dưới ngưỡng
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-medium">Thông tin cơ bản</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên cấu hình *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Auto-retrain Temperature Model"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelId">Model ID *</Label>
                <Input
                  id="modelId"
                  type="number"
                  min={1}
                  value={formData.modelId}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelId: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả chi tiết về cấu hình"
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* Thresholds */}
          <div className="space-y-4">
            <h4 className="font-medium">Ngưỡng kích hoạt</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Accuracy threshold: {(formData.accuracyThreshold * 100).toFixed(0)}%</Label>
                <Slider
                  value={[formData.accuracyThreshold * 100]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, accuracyThreshold: v / 100 }))}
                  min={50}
                  max={99}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>F1 Score threshold: {(formData.f1ScoreThreshold * 100).toFixed(0)}%</Label>
                <Slider
                  value={[formData.f1ScoreThreshold * 100]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, f1ScoreThreshold: v / 100 }))}
                  min={50}
                  max={99}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Drift threshold: {(formData.driftThreshold * 100).toFixed(0)}%</Label>
                <Slider
                  value={[formData.driftThreshold * 100]}
                  onValueChange={([v]) => setFormData(prev => ({ ...prev, driftThreshold: v / 100 }))}
                  min={5}
                  max={50}
                  step={1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxDays">Max days since last train</Label>
                <Input
                  id="maxDays"
                  type="number"
                  min={1}
                  value={formData.maxDaysSinceLastTrain}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxDaysSinceLastTrain: parseInt(e.target.value) || 30 }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Schedule */}
          <div className="space-y-4">
            <h4 className="font-medium">Lịch kiểm tra</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Check interval (giờ)</Label>
                <Input
                  id="interval"
                  type="number"
                  min={1}
                  value={formData.checkIntervalHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, checkIntervalHours: parseInt(e.target.value) || 6 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minSamples">Min samples since last train</Label>
                <Input
                  id="minSamples"
                  type="number"
                  min={100}
                  value={formData.minSamplesSinceLastTrain}
                  onChange={(e) => setFormData(prev => ({ ...prev, minSamplesSinceLastTrain: parseInt(e.target.value) || 1000 }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Notifications */}
          <div className="space-y-4">
            <h4 className="font-medium">Thông báo</h4>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.notifyOnRetrain}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, notifyOnRetrain: v }))}
                />
                <Label>Thông báo khi retrain</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.notifyOnFailure}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, notifyOnFailure: v }))}
                />
                <Label>Thông báo khi thất bại</Label>
              </div>
            </div>
            {(formData.notifyOnRetrain || formData.notifyOnFailure) && (
              <div className="space-y-2">
                <Label htmlFor="emails">Email nhận thông báo (phân cách bằng dấu phẩy)</Label>
                <Input
                  id="emails"
                  value={formData.notificationEmails}
                  onChange={(e) => setFormData(prev => ({ ...prev, notificationEmails: e.target.value }))}
                  placeholder="email1@example.com, email2@example.com"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !formData.name}>
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Đang tạo...
              </>
            ) : (
              "Tạo mới"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
