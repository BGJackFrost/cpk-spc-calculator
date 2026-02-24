import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Bell, Settings, RefreshCw, CheckCircle2, XCircle, Eye, Activity, Shield, Clock, TrendingUp, TrendingDown, Minus, BarChart3, LineChart as LineChartIcon, Webhook, Download, FileSpreadsheet, FileText, Calendar, Sliders } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart, ReferenceLine } from "recharts";

export default function DataDriftMonitoring() {
  const { toast } = useToast();
  const [selectedModelId, setSelectedModelId] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isWebhookOpen, setIsWebhookOpen] = useState(false);
  const [configData, setConfigData] = useState({
    accuracyDropThreshold: 0.05, featureDriftThreshold: 0.10, predictionDriftThreshold: 0.10,
    monitoringWindowHours: 24, alertCooldownMinutes: 60, autoRollbackEnabled: false,
    autoRollbackThreshold: 0.15, notifyOwner: true, notifyEmail: "",
  });
  const [webhookData, setWebhookData] = useState({
    slackWebhookUrl: "", slackChannel: "", slackEnabled: false,
    teamsWebhookUrl: "", teamsEnabled: false,
  });
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAutoScalingOpen, setIsAutoScalingOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [autoScalingConfig, setAutoScalingConfig] = useState({
    enabled: false,
    algorithm: 'adaptive' as 'moving_average' | 'percentile' | 'std_deviation' | 'adaptive',
    windowSize: 100,
    sensitivityFactor: 1.0,
    minThreshold: 0.01,
    maxThreshold: 0.5,
    updateFrequency: 'daily' as 'hourly' | 'daily' | 'weekly',
  });

  const { data: alerts, refetch: refetchAlerts, isLoading } = trpc.aiAdvanced.drift.listAlerts.useQuery({
    modelId: selectedModelId, status: statusFilter === "all" ? undefined : statusFilter as any, limit: 50,
  });
  const { data: activeAlerts } = trpc.aiAdvanced.drift.getActiveAlerts.useQuery({ modelId: selectedModelId });
  const { data: config, refetch: refetchConfig } = trpc.aiAdvanced.drift.getConfig.useQuery({ modelId: selectedModelId });
  const { data: metricsHistory } = trpc.aiAdvanced.drift.getMetricsHistory.useQuery({ modelId: selectedModelId, hours: 168 });
  const { data: featureStats } = trpc.aiAdvanced.drift.getFeatureStatistics.useQuery({ modelId: selectedModelId });
  const { data: dashboardStats } = trpc.aiAdvanced.drift.getDashboardStats.useQuery({ modelId: selectedModelId });
  const { data: webhookConfig, refetch: refetchWebhook } = trpc.aiAdvanced.webhook.getConfig.useQuery();
  const { data: lastCheckSummary } = trpc.aiAdvanced.scheduledCheck.getLastSummary.useQuery();

  const acknowledgeAlert = trpc.aiAdvanced.drift.acknowledgeAlert.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã xác nhận alert" }); refetchAlerts(); } });
  const resolveAlert = trpc.aiAdvanced.drift.resolveAlert.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã giải quyết alert" }); refetchAlerts(); } });
  const ignoreAlert = trpc.aiAdvanced.drift.ignoreAlert.useMutation({ onSuccess: () => { toast({ title: "Thành công", description: "Đã bỏ qua alert" }); refetchAlerts(); } });
  const updateConfig = trpc.aiAdvanced.drift.updateConfig.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã cập nhật cấu hình" }); setIsConfigOpen(false); refetchConfig(); },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });
  const runDriftCheck = trpc.aiAdvanced.drift.runDriftCheck.useMutation({
    onSuccess: (result) => { toast({ title: "Hoàn thành", description: `Đã kiểm tra drift. ${result.alertsCreated} alerts mới.` }); refetchAlerts(); },
  });
  const runScheduledCheck = trpc.aiAdvanced.scheduledCheck.runNow.useMutation({
    onSuccess: (result) => { toast({ title: "Hoàn thành", description: `Đã kiểm tra ${result.modelsChecked} models, tạo ${result.alertsCreated} alerts.` }); refetchAlerts(); },
  });
  const updateWebhook = trpc.aiAdvanced.webhook.updateConfig.useMutation({
    onSuccess: () => { toast({ title: "Thành công", description: "Đã cập nhật webhook" }); setIsWebhookOpen(false); refetchWebhook(); },
  });
  const testSlack = trpc.aiAdvanced.webhook.testSlack.useMutation({
    onSuccess: (result) => { toast({ title: result.success ? "Thành công" : "Lỗi", description: result.success ? "Đã gửi test message đến Slack" : result.error, variant: result.success ? "default" : "destructive" }); },
  });
  const testTeams = trpc.aiAdvanced.webhook.testTeams.useMutation({
    onSuccess: (result) => { toast({ title: result.success ? "Thành công" : "Lỗi", description: result.success ? "Đã gửi test message đến Teams" : result.error, variant: result.success ? "default" : "destructive" }); },
  });

  // Export mutations
  const exportPdf = trpc.aiAdvanced.driftReport.exportPdf.useMutation({
    onSuccess: (result) => {
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Thành công", description: "Đã xuất báo cáo PDF" });
      setIsExportOpen(false);
    },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const exportExcel = trpc.aiAdvanced.driftReport.exportExcel.useMutation({
    onSuccess: (result) => {
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Thành công", description: "Đã xuất báo cáo Excel" });
      setIsExportOpen(false);
    },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  // Auto-scaling mutations
  const { data: autoScalingData, refetch: refetchAutoScaling } = trpc.aiAdvanced.autoScaling.getConfig.useQuery({ modelId: selectedModelId });
  const { data: suggestedAlgorithm } = trpc.aiAdvanced.autoScaling.suggestAlgorithm.useQuery({ modelId: selectedModelId });
  const { data: thresholdEffectiveness } = trpc.aiAdvanced.autoScaling.analyzeEffectiveness.useQuery({ modelId: selectedModelId });

  const updateAutoScaling = trpc.aiAdvanced.autoScaling.updateConfig.useMutation({
    onSuccess: () => {
      toast({ title: "Thành công", description: "Đã cập nhật cấu hình auto-scaling" });
      refetchAutoScaling();
    },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const calculateThresholds = trpc.aiAdvanced.autoScaling.calculateThresholds.useMutation({
    onSuccess: (result) => {
      toast({ title: "Thành công", description: `Đã tính toán thresholds mới. Confidence: ${(result.confidence * 100).toFixed(0)}%` });
      refetchAutoScaling();
    },
    onError: (error) => { toast({ title: "Lỗi", description: error.message, variant: "destructive" }); },
  });

  const handleExportPdf = () => {
    exportPdf.mutate({
      modelId: selectedModelId,
      startDate: exportDateRange.from,
      endDate: exportDateRange.to,
    });
  };

  const handleExportExcel = () => {
    exportExcel.mutate({
      modelId: selectedModelId,
      startDate: exportDateRange.from,
      endDate: exportDateRange.to,
    });
  };

  const handleSaveConfig = () => { 
    if (config?.id) {
      updateConfig.mutate({ configId: config.id, ...configData }); 
    }
  };
  const handleSaveWebhook = () => { updateWebhook.mutate(webhookData); };

  // Prepare chart data
  const chartData = metricsHistory?.map((m, i) => ({
    time: new Date(m.recordedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    accuracy: parseFloat(m.accuracy as string || '0') * 100,
    precision: m.precision ? parseFloat(m.precision as string) * 100 : null,
    recall: m.recall ? parseFloat(m.recall as string) * 100 : null,
    f1Score: m.f1Score ? parseFloat(m.f1Score as string) * 100 : null,
    predictions: m.predictionCount || 0,
  })) || [];

  // Alert trend data
  const alertTrendData = alerts?.alerts?.reduce((acc: any[], alert) => {
    const date = new Date(alert.createdAt).toLocaleDateString('vi-VN');
    const existing = acc.find(a => a.date === date);
    if (existing) {
      existing.count++;
      if (alert.severity === 'critical') existing.critical++;
      if (alert.severity === 'high') existing.high++;
      if (alert.severity === 'medium') existing.medium++;
      if (alert.severity === 'low') existing.low++;
    } else {
      acc.push({
        date,
        count: 1,
        critical: alert.severity === 'critical' ? 1 : 0,
        high: alert.severity === 'high' ? 1 : 0,
        medium: alert.severity === 'medium' ? 1 : 0,
        low: alert.severity === 'low' ? 1 : 0,
      });
    }
    return acc;
  }, []) || [];

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = { low: "bg-blue-500", medium: "bg-yellow-500", high: "bg-orange-500", critical: "bg-red-500" };
    return <Badge className={`${variants[severity] || variants.low} text-white`}>{severity.charAt(0).toUpperCase() + severity.slice(1)}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: React.ReactNode }> = {
      active: { color: "bg-red-500", icon: <AlertTriangle className="w-3 h-3" /> },
      acknowledged: { color: "bg-yellow-500", icon: <Eye className="w-3 h-3" /> },
      resolved: { color: "bg-green-500", icon: <CheckCircle2 className="w-3 h-3" /> },
      ignored: { color: "bg-gray-500", icon: <XCircle className="w-3 h-3" /> },
    };
    const v = variants[status] || variants.active;
    return <Badge className={`${v.color} text-white flex items-center gap-1`}>{v.icon}{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const getDriftTypeBadge = (type: string) => {
    const labels: Record<string, string> = { accuracy_drop: "Accuracy Drop", feature_drift: "Feature Drift", prediction_drift: "Prediction Drift", data_quality: "Data Quality" };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3"><AlertTriangle className="w-8 h-8 text-orange-500" />Data Drift Monitoring</h1>
            <p className="text-muted-foreground mt-1">Phát hiện và cảnh báo khi model accuracy giảm đột ngột</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedModelId)} onValueChange={(v) => setSelectedModelId(parseInt(v))}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Chọn Model" /></SelectTrigger>
              <SelectContent><SelectItem value="1">Model #1</SelectItem><SelectItem value="2">Model #2</SelectItem><SelectItem value="3">Model #3</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" onClick={() => runDriftCheck.mutate({ modelId: selectedModelId })} disabled={runDriftCheck.isPending}>
              <RefreshCw className={`w-4 h-4 mr-2 ${runDriftCheck.isPending ? 'animate-spin' : ''}`} />Kiểm tra ngay
            </Button>
            <Button variant="outline" onClick={() => runScheduledCheck.mutate()} disabled={runScheduledCheck.isPending}>
              <Activity className={`w-4 h-4 mr-2 ${runScheduledCheck.isPending ? 'animate-spin' : ''}`} />Kiểm tra tất cả
            </Button>
            {/* Export Dialog */}
            <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
              <DialogTrigger asChild><Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Xuất Báo cáo Drift Check</DialogTitle>
                  <DialogDescription>Chọn khoảng thời gian và định dạng xuất</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Khoảng thời gian</Label>
                    <div className="flex gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(exportDateRange.from, 'dd/MM/yyyy', { locale: vi })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent mode="single" selected={exportDateRange.from} onSelect={(date) => date && setExportDateRange({ ...exportDateRange, from: date })} />
                        </PopoverContent>
                      </Popover>
                      <span className="flex items-center">-</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <Calendar className="mr-2 h-4 w-4" />
                            {format(exportDateRange.to, 'dd/MM/yyyy', { locale: vi })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent mode="single" selected={exportDateRange.to} onSelect={(date) => date && setExportDateRange({ ...exportDateRange, to: date })} />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={handleExportPdf} disabled={exportPdf.isPending} className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {exportPdf.isPending ? 'Đang xuất...' : 'Xuất HTML/PDF'}
                    </Button>
                    <Button onClick={handleExportExcel} disabled={exportExcel.isPending} className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      {exportExcel.isPending ? 'Đang xuất...' : 'Xuất Excel'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {/* Auto-scaling Dialog */}
            <Dialog open={isAutoScalingOpen} onOpenChange={setIsAutoScalingOpen}>
              <DialogTrigger asChild><Button variant="outline"><Sliders className="w-4 h-4 mr-2" />Auto-scaling</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cấu hình Auto-scaling Threshold</DialogTitle>
                  <DialogDescription>Tự động điều chỉnh ngưỡng dựa trên dữ liệu lịch sử</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base">Kích hoạt Auto-scaling</Label>
                      <p className="text-sm text-muted-foreground">Tự động tính toán và cập nhật threshold</p>
                    </div>
                    <Switch checked={autoScalingConfig.enabled} onCheckedChange={(v) => setAutoScalingConfig({ ...autoScalingConfig, enabled: v })} />
                  </div>
                  {suggestedAlgorithm && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Đề xuất: {suggestedAlgorithm.algorithm}</p>
                      <p className="text-xs text-blue-600">{suggestedAlgorithm.reason}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Thuật toán</Label>
                      <Select value={autoScalingConfig.algorithm} onValueChange={(v: any) => setAutoScalingConfig({ ...autoScalingConfig, algorithm: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="moving_average">Moving Average</SelectItem>
                          <SelectItem value="percentile">Percentile</SelectItem>
                          <SelectItem value="std_deviation">Standard Deviation</SelectItem>
                          <SelectItem value="adaptive">Adaptive (EWMA)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Tần suất cập nhật</Label>
                      <Select value={autoScalingConfig.updateFrequency} onValueChange={(v: any) => setAutoScalingConfig({ ...autoScalingConfig, updateFrequency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Mỗi giờ</SelectItem>
                          <SelectItem value="daily">Mỗi ngày</SelectItem>
                          <SelectItem value="weekly">Mỗi tuần</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Window Size</Label>
                      <Input type="number" value={autoScalingConfig.windowSize} onChange={(e) => setAutoScalingConfig({ ...autoScalingConfig, windowSize: parseInt(e.target.value) })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Sensitivity Factor</Label>
                      <Input type="number" step="0.1" value={autoScalingConfig.sensitivityFactor} onChange={(e) => setAutoScalingConfig({ ...autoScalingConfig, sensitivityFactor: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Min Threshold</Label>
                      <Input type="number" step="0.01" value={autoScalingConfig.minThreshold} onChange={(e) => setAutoScalingConfig({ ...autoScalingConfig, minThreshold: parseFloat(e.target.value) })} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Max Threshold</Label>
                      <Input type="number" step="0.01" value={autoScalingConfig.maxThreshold} onChange={(e) => setAutoScalingConfig({ ...autoScalingConfig, maxThreshold: parseFloat(e.target.value) })} />
                    </div>
                  </div>
                  {thresholdEffectiveness && (
                    <div className="p-3 bg-gray-50 border rounded-lg">
                      <p className="text-sm font-medium">Hiệu quả Threshold hiện tại</p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <div>False Positive Rate: <span className="font-medium">{(thresholdEffectiveness.falsePositiveRate * 100).toFixed(1)}%</span></div>
                        <div>False Negative Rate: <span className="font-medium">{(thresholdEffectiveness.falseNegativeRate * 100).toFixed(1)}%</span></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{thresholdEffectiveness.recommendation}</p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => calculateThresholds.mutate({ modelId: selectedModelId })} disabled={calculateThresholds.isPending}>
                    {calculateThresholds.isPending ? 'Tính toán...' : 'Tính toán Thresholds'}
                  </Button>
                  <Button onClick={() => updateAutoScaling.mutate({ modelId: selectedModelId, ...autoScalingConfig })} disabled={updateAutoScaling.isPending}>
                    {updateAutoScaling.isPending ? 'Lưu...' : 'Lưu cấu hình'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isWebhookOpen} onOpenChange={setIsWebhookOpen}>
              <DialogTrigger asChild><Button variant="outline"><Webhook className="w-4 h-4 mr-2" />Webhook</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Cấu hình Webhook Notification</DialogTitle><DialogDescription>Thiết lập Slack/Teams webhook để nhận thông báo realtime</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><img src="https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg" className="w-6 h-6" alt="Slack" /><Label className="text-lg font-semibold">Slack</Label></div>
                      <Switch checked={webhookData.slackEnabled} onCheckedChange={(v) => setWebhookData({ ...webhookData, slackEnabled: v })} />
                    </div>
                    <div className="grid gap-2"><Label>Webhook URL</Label><Input value={webhookData.slackWebhookUrl} onChange={(e) => setWebhookData({ ...webhookData, slackWebhookUrl: e.target.value })} placeholder="https://hooks.slack.com/services/..." disabled={!webhookData.slackEnabled} /></div>
                    <div className="grid gap-2"><Label>Channel (optional)</Label><Input value={webhookData.slackChannel} onChange={(e) => setWebhookData({ ...webhookData, slackChannel: e.target.value })} placeholder="#alerts" disabled={!webhookData.slackEnabled} /></div>
                    <Button variant="outline" size="sm" onClick={() => testSlack.mutate()} disabled={!webhookData.slackEnabled || testSlack.isPending}>Test Slack</Button>
                  </div>
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><img src="https://cdn.worldvectorlogo.com/logos/microsoft-teams-1.svg" className="w-6 h-6" alt="Teams" /><Label className="text-lg font-semibold">Microsoft Teams</Label></div>
                      <Switch checked={webhookData.teamsEnabled} onCheckedChange={(v) => setWebhookData({ ...webhookData, teamsEnabled: v })} />
                    </div>
                    <div className="grid gap-2"><Label>Webhook URL</Label><Input value={webhookData.teamsWebhookUrl} onChange={(e) => setWebhookData({ ...webhookData, teamsWebhookUrl: e.target.value })} placeholder="https://outlook.office.com/webhook/..." disabled={!webhookData.teamsEnabled} /></div>
                    <Button variant="outline" size="sm" onClick={() => testTeams.mutate()} disabled={!webhookData.teamsEnabled || testTeams.isPending}>Test Teams</Button>
                  </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsWebhookOpen(false)}>Hủy</Button><Button onClick={handleSaveWebhook} disabled={updateWebhook.isPending}>{updateWebhook.isPending ? "Đang lưu..." : "Lưu cấu hình"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild><Button variant="outline"><Settings className="w-4 h-4 mr-2" />Cấu hình</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Cấu hình Drift Detection</DialogTitle><DialogDescription>Thiết lập ngưỡng và cảnh báo cho model #{selectedModelId}</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2"><Label>Accuracy Drop Threshold</Label><Input type="number" step="0.01" value={configData.accuracyDropThreshold} onChange={(e) => setConfigData({ ...configData, accuracyDropThreshold: parseFloat(e.target.value) })} /></div>
                    <div className="grid gap-2"><Label>Feature Drift Threshold</Label><Input type="number" step="0.01" value={configData.featureDriftThreshold} onChange={(e) => setConfigData({ ...configData, featureDriftThreshold: parseFloat(e.target.value) })} /></div>
                    <div className="grid gap-2"><Label>Prediction Drift Threshold</Label><Input type="number" step="0.01" value={configData.predictionDriftThreshold} onChange={(e) => setConfigData({ ...configData, predictionDriftThreshold: parseFloat(e.target.value) })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2"><Label>Monitoring Window (hours)</Label><Input type="number" value={configData.monitoringWindowHours} onChange={(e) => setConfigData({ ...configData, monitoringWindowHours: parseInt(e.target.value) })} /></div>
                    <div className="grid gap-2"><Label>Alert Cooldown (minutes)</Label><Input type="number" value={configData.alertCooldownMinutes} onChange={(e) => setConfigData({ ...configData, alertCooldownMinutes: parseInt(e.target.value) })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg"><div><Label>Auto Rollback</Label><p className="text-sm text-muted-foreground">Tự động rollback khi drift vượt ngưỡng</p></div><Switch checked={configData.autoRollbackEnabled} onCheckedChange={(v) => setConfigData({ ...configData, autoRollbackEnabled: v })} /></div>
                    <div className="grid gap-2"><Label>Auto Rollback Threshold</Label><Input type="number" step="0.01" value={configData.autoRollbackThreshold} onChange={(e) => setConfigData({ ...configData, autoRollbackThreshold: parseFloat(e.target.value) })} disabled={!configData.autoRollbackEnabled} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg"><div><Label>Notify Owner</Label><p className="text-sm text-muted-foreground">Gửi thông báo cho owner</p></div><Switch checked={configData.notifyOwner} onCheckedChange={(v) => setConfigData({ ...configData, notifyOwner: v })} /></div>
                    <div className="grid gap-2"><Label>Notify Email</Label><Input type="email" value={configData.notifyEmail} onChange={(e) => setConfigData({ ...configData, notifyEmail: e.target.value })} placeholder="email@example.com" /></div>
                  </div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsConfigOpen(false)}>Hủy</Button><Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>{updateConfig.isPending ? "Đang lưu..." : "Lưu cấu hình"}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className={activeAlerts && activeAlerts.length > 0 ? "border-red-500" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Alerts</CardTitle><AlertTriangle className={`w-4 h-4 ${activeAlerts && activeAlerts.length > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} /></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${activeAlerts && activeAlerts.length > 0 ? 'text-red-500' : ''}`}>{activeAlerts?.length || 0}</div></CardContent>
          </Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tổng Alerts</CardTitle><Bell className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardStats?.totalAlerts || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Critical</CardTitle><AlertTriangle className="w-4 h-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-500">{dashboardStats?.criticalAlerts || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Avg Drift Score</CardTitle><BarChart3 className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{((dashboardStats?.avgDriftScore || 0) * 100).toFixed(1)}%</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Trend</CardTitle>{getTrendIcon(dashboardStats?.recentTrend || 'stable')}</CardHeader><CardContent><div className="text-2xl font-bold capitalize">{dashboardStats?.recentTrend || 'Stable'}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="charts" className="space-y-4">
          <TabsList><TabsTrigger value="charts">Biểu đồ</TabsTrigger><TabsTrigger value="alerts">Alerts</TabsTrigger><TabsTrigger value="metrics">Metrics History</TabsTrigger><TabsTrigger value="features">Feature Statistics</TabsTrigger></TabsList>
          
          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Accuracy Trend Chart */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><LineChartIcon className="w-5 h-5" />Accuracy Trend (7 ngày)</CardTitle><CardDescription>Biến động accuracy của model theo thời gian</CardDescription></CardHeader>
                <CardContent>
                  {chartData.length === 0 ? <div className="h-[300px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu</div> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}%`} />
                        <Legend />
                        <ReferenceLine y={95} stroke="#22c55e" strokeDasharray="5 5" label="Target" />
                        <ReferenceLine y={parseFloat(config?.accuracyDropThreshold as string || '0.05') * 100} stroke="#ef4444" strokeDasharray="5 5" label="Threshold" />
                        <Area type="monotone" dataKey="accuracy" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAccuracy)" name="Accuracy" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Alert Trend Chart */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" />Alert Distribution</CardTitle><CardDescription>Phân bố alerts theo severity</CardDescription></CardHeader>
                <CardContent>
                  {alertTrendData.length === 0 ? <div className="h-[300px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu</div> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={alertTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                        <Bar dataKey="high" stackId="a" fill="#f97316" name="High" />
                        <Bar dataKey="medium" stackId="a" fill="#eab308" name="Medium" />
                        <Bar dataKey="low" stackId="a" fill="#3b82f6" name="Low" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Multi-metric Chart */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Model Performance Metrics</CardTitle><CardDescription>So sánh các metrics: Accuracy, Precision, Recall, F1 Score</CardDescription></CardHeader>
                <CardContent>
                  {chartData.length === 0 ? <div className="h-[300px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu</div> : (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip formatter={(value: number, name: string) => name === 'predictions' ? value : `${value?.toFixed(2) || 0}%`} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} name="Accuracy" dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="precision" stroke="#22c55e" strokeWidth={2} name="Precision" dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="recall" stroke="#f97316" strokeWidth={2} name="Recall" dot={false} />
                        <Line yAxisId="left" type="monotone" dataKey="f1Score" stroke="#8b5cf6" strokeWidth={2} name="F1 Score" dot={false} />
                        <Bar yAxisId="right" dataKey="predictions" fill="#94a3b8" opacity={0.3} name="Predictions" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Lọc theo trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="acknowledged">Acknowledged</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="ignored">Ignored</SelectItem></SelectContent></Select>
              <Button variant="outline" size="icon" onClick={() => refetchAlerts()}><RefreshCw className="w-4 h-4" /></Button>
            </div>
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Thời gian</TableHead><TableHead>Loại Drift</TableHead><TableHead>Mức độ</TableHead><TableHead>Drift Score</TableHead><TableHead>Trạng thái</TableHead><TableHead>Khuyến nghị</TableHead><TableHead className="text-right">Hành động</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoading ? <TableRow><TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell></TableRow>
                  : alerts?.alerts?.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Không có alerts</TableCell></TableRow>
                  : alerts?.alerts?.map((alert) => (
                    <TableRow key={alert.id} className={alert.status === 'active' ? 'bg-red-500/10' : ''}>
                      <TableCell>{new Date(alert.createdAt).toLocaleString('vi-VN')}</TableCell>
                      <TableCell>{getDriftTypeBadge(alert.driftType)}</TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell><span className="font-mono">{parseFloat(alert.driftScore as string).toFixed(4)}</span></TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{alert.recommendation || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {alert.status === 'active' && <Button variant="ghost" size="icon" onClick={() => acknowledgeAlert.mutate({ alertId: alert.id })}><Eye className="w-4 h-4 text-yellow-500" /></Button>}
                          {(alert.status === 'active' || alert.status === 'acknowledged') && <Button variant="ghost" size="icon" onClick={() => resolveAlert.mutate({ alertId: alert.id, resolution: "Đã xử lý" })}><CheckCircle2 className="w-4 h-4 text-green-500" /></Button>}
                          {alert.status === 'active' && <Button variant="ghost" size="icon" onClick={() => ignoreAlert.mutate({ alertId: alert.id, reason: "Bỏ qua" })}><XCircle className="w-4 h-4 text-gray-500" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Metrics History (7 ngày)</CardTitle></CardHeader><CardContent>
              {metricsHistory?.length === 0 ? <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu metrics</div>
              : <div className="space-y-4">{metricsHistory?.slice(0, 20).map((m, i) => (<div key={i} className="flex items-center gap-4 p-2 border rounded"><div className="w-32 text-sm">{new Date(m.recordedAt).toLocaleDateString('vi-VN')}</div><div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground w-16">Accuracy:</span><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(parseFloat(m.accuracy as string) || 0) * 100}%` }} /></div><span className="text-sm w-16 text-right">{((parseFloat(m.accuracy as string) || 0) * 100).toFixed(2)}%</span></div></div><div className="w-20 text-sm text-muted-foreground text-right">{m.predictionCount} preds</div></div>))}</div>}
            </CardContent></Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-4">
            <Card><CardContent className="p-0">
              <Table><TableHeader><TableRow><TableHead>Feature</TableHead><TableHead>Mean</TableHead><TableHead>Std Dev</TableHead><TableHead>Min</TableHead><TableHead>Max</TableHead><TableHead>Baseline</TableHead></TableRow></TableHeader>
                <TableBody>
                  {featureStats?.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu feature statistics</TableCell></TableRow>
                  : featureStats?.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.featureName}</TableCell>
                      <TableCell>{f.mean ? parseFloat(f.mean as string).toFixed(4) : '-'}</TableCell>
                      <TableCell>{f.stdDev ? parseFloat(f.stdDev as string).toFixed(4) : '-'}</TableCell>
                      <TableCell>{f.min ? parseFloat(f.min as string).toFixed(4) : '-'}</TableCell>
                      <TableCell>{f.max ? parseFloat(f.max as string).toFixed(4) : '-'}</TableCell>
                      <TableCell>{f.isBaseline ? <Badge className="bg-green-500">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>

        {/* Scheduled Check Info */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Scheduled Drift Check</CardTitle><CardDescription>Hệ thống tự động kiểm tra drift mỗi giờ</CardDescription></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Lần kiểm tra cuối: {lastCheckSummary?.lastCheck ? new Date(lastCheckSummary.lastCheck).toLocaleString('vi-VN') : 'Chưa có'}</p>
                <p className="text-sm text-muted-foreground">Webhook: {webhookConfig?.slackEnabled ? '✅ Slack' : ''} {webhookConfig?.teamsEnabled ? '✅ Teams' : ''} {!webhookConfig?.slackEnabled && !webhookConfig?.teamsEnabled ? '❌ Chưa cấu hình' : ''}</p>
              </div>
              <Button onClick={() => runScheduledCheck.mutate()} disabled={runScheduledCheck.isPending}>
                <RefreshCw className={`w-4 h-4 mr-2 ${runScheduledCheck.isPending ? 'animate-spin' : ''}`} />
                Chạy ngay
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
