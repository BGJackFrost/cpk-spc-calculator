import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Activity,
  Zap,
  Target,
  RefreshCw,
  Download,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Info,
  Lightbulb,
  Plus,
  Eye,
} from "lucide-react";

export default function AnomalyDetection() {
  const { translate } = useLanguage();
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // === tRPC Queries ===
  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = trpc.anomalyDetectionAI.listModels.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.anomalyDetectionAI.stats.useQuery({});
  const { data: recentAnomalies, isLoading: anomaliesLoading, refetch: refetchAnomalies } = trpc.anomalyDetectionAI.recentAnomalies.useQuery({ limit: 50 });
  const { data: alertHistory, isLoading: alertsLoading, refetch: refetchAlerts } = trpc.anomalyAlert.getHistory.useQuery({ limit: 50 });
  const { data: alertStats } = trpc.anomalyAlert.getStats.useQuery({});
  const { data: alertConfigs } = trpc.anomalyAlert.getConfigs.useQuery();

  const acknowledgeMutation = trpc.anomalyAlert.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận cảnh báo");
      refetchAlerts();
    },
    onError: (err) => toast.error(err.message),
  });

  // Derived data
  const modelsList = models || [];
  const anomaliesList = recentAnomalies || [];
  const alertsList = alertHistory || [];
  const configsList = alertConfigs || [];

  const activeAlerts = useMemo(() => 
    alertsList.filter((a: any) => !a.acknowledgedAt), 
    [alertsList]
  );
  const criticalAlerts = useMemo(() => 
    alertsList.filter((a: any) => a.severity === "critical" && !a.acknowledgedAt), 
    [alertsList]
  );

  const handleRefresh = () => {
    refetchModels();
    refetchAnomalies();
    refetchAlerts();
    toast.success("Đã làm mới dữ liệu");
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return <Badge className={styles[severity] || ""}>{severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "trained") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Trained</Badge>;
    if (status === "training") return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Training</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  const isLoading = modelsLoading || statsLoading || anomaliesLoading || alertsLoading;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              AI Anomaly Detection
            </h1>
            <p className="text-muted-foreground mt-1">
              Phát hiện bất thường tự động và dự đoán xu hướng cho SPC/CPK
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">Auto Refresh</Label>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Critical Anomalies Detected!</AlertTitle>
            <AlertDescription>
              {criticalAlerts.length} critical anomalies require immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{modelsList.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {modelsList.filter((m: any) => m.status === "trained").length} trained
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Anomalies Detected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{anomaliesList.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Recent detections</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{activeAlerts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {criticalAlerts.length} critical
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alert Configs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{configsList.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {configsList.filter((c: any) => c.isActive).length} active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="models" className="space-y-4">
          <TabsList>
            <TabsTrigger value="models">
              <Brain className="h-4 w-4 mr-2" />
              Models
            </TabsTrigger>
            <TabsTrigger value="anomalies">
              <Zap className="h-4 w-4 mr-2" />
              Anomalies
            </TabsTrigger>
            <TabsTrigger value="alerts">
              <Bell className="h-4 w-4 mr-2" />
              Alerts ({activeAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="configs">
              <Settings className="h-4 w-4 mr-2" />
              Configs
            </TabsTrigger>
          </TabsList>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Anomaly Detection Models</CardTitle>
                <CardDescription>Danh sách các model AI phát hiện bất thường</CardDescription>
              </CardHeader>
              <CardContent>
                {modelsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : modelsList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Chưa có model nào</p>
                    <p className="text-sm mt-1">Tạo model mới để bắt đầu phát hiện bất thường</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên Model</TableHead>
                        <TableHead>Target Type</TableHead>
                        <TableHead>Sensor Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {modelsList.map((model: any) => (
                        <TableRow key={model.id}>
                          <TableCell className="font-medium">{model.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{model.targetType}</Badge>
                          </TableCell>
                          <TableCell>{model.sensorType || "—"}</TableCell>
                          <TableCell>{getStatusBadge(model.status)}</TableCell>
                          <TableCell>
                            {model.accuracy ? (
                              <div className="flex items-center gap-2">
                                <Progress value={model.accuracy * 100} className="w-16 h-2" />
                                <span className="text-sm">{(model.accuracy * 100).toFixed(1)}%</span>
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {model.createdAt ? new Date(model.createdAt).toLocaleDateString("vi-VN") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomalies Tab */}
          <TabsContent value="anomalies" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Anomalies</CardTitle>
                    <CardDescription>Các bất thường được phát hiện gần đây</CardDescription>
                  </div>
                  <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {anomaliesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : anomaliesList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                    <p className="font-medium">Không phát hiện bất thường</p>
                    <p className="text-sm mt-1">Hệ thống đang hoạt động bình thường</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anomaliesList
                        .filter((a: any) => selectedSeverity === "all" || a.severity === selectedSeverity)
                        .map((anomaly: any) => (
                          <TableRow key={anomaly.id}>
                            <TableCell className="text-sm">
                              {anomaly.detectedAt ? new Date(anomaly.detectedAt).toLocaleString("vi-VN") : "—"}
                            </TableCell>
                            <TableCell className="font-medium">{anomaly.modelName || `Model #${anomaly.modelId}`}</TableCell>
                            <TableCell>{anomaly.deviceName || `Device #${anomaly.deviceId || "—"}`}</TableCell>
                            <TableCell>{getSeverityBadge(anomaly.severity || "medium")}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={(anomaly.anomalyScore || 0) * 100} className="w-12 h-2" />
                                <span className="text-sm">{((anomaly.anomalyScore || 0) * 100).toFixed(0)}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {anomaly.description || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert History</CardTitle>
                <CardDescription>Lịch sử cảnh báo bất thường</CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : alertsList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Chưa có cảnh báo nào</p>
                    <p className="text-sm mt-1">Cấu hình alert configs để nhận cảnh báo tự động</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertsList.map((alert: any) => (
                        <TableRow key={alert.id}>
                          <TableCell className="text-sm">
                            {alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString("vi-VN") : "—"}
                          </TableCell>
                          <TableCell>{getSeverityBadge(alert.severity || "medium")}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{((alert.anomalyScore || 0) * 100).toFixed(0)}%</span>
                          </TableCell>
                          <TableCell>
                            {alert.acknowledgedAt ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Acknowledged
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                <XCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!alert.acknowledgedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => acknowledgeMutation.mutate({ alertId: alert.id })}
                                disabled={acknowledgeMutation.isPending}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Acknowledge
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Alert Stats */}
            {alertStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Alert Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold">{(alertStats as any).total || 0}</p>
                      <p className="text-sm text-muted-foreground">Total Alerts</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{(alertStats as any).unacknowledged || 0}</p>
                      <p className="text-sm text-muted-foreground">Unacknowledged</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{(alertStats as any).acknowledged || 0}</p>
                      <p className="text-sm text-muted-foreground">Acknowledged</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{(alertStats as any).critical || 0}</p>
                      <p className="text-sm text-muted-foreground">Critical</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Configs Tab */}
          <TabsContent value="configs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert Configurations</CardTitle>
                <CardDescription>Cấu hình ngưỡng cảnh báo và kênh thông báo</CardDescription>
              </CardHeader>
              <CardContent>
                {configsList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Chưa có cấu hình cảnh báo</p>
                    <p className="text-sm mt-1">Tạo cấu hình mới để nhận thông báo khi phát hiện bất thường</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên</TableHead>
                        <TableHead>Severity Threshold</TableHead>
                        <TableHead>Score Threshold</TableHead>
                        <TableHead>Channels</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configsList.map((config: any) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">{config.name}</TableCell>
                          <TableCell>{getSeverityBadge(config.severityThreshold || "medium")}</TableCell>
                          <TableCell>
                            <span className="font-mono">{((config.anomalyScoreThreshold || 0) * 100).toFixed(0)}%</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {config.emailEnabled && <Badge variant="outline" className="text-xs">Email</Badge>}
                              {config.telegramEnabled && <Badge variant="outline" className="text-xs">Telegram</Badge>}
                              {config.slackEnabled && <Badge variant="outline" className="text-xs">Slack</Badge>}
                              {!config.emailEnabled && !config.telegramEnabled && !config.slackEnabled && (
                                <span className="text-muted-foreground text-sm">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {config.isActive ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Banner */}
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertTitle>Hướng dẫn sử dụng</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Tạo model AI để phát hiện bất thường tự động từ dữ liệu sensor/SPC</li>
              <li>Cấu hình alert configs để nhận thông báo qua Email, Telegram hoặc Slack</li>
              <li>Sử dụng tab Anomalies để xem chi tiết các bất thường được phát hiện</li>
              <li>Acknowledge alerts để đánh dấu đã xử lý</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}
