import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertTriangle, Bell, Settings, RefreshCw, CheckCircle2, XCircle, Eye, Activity, Shield, Clock } from "lucide-react";

export default function DataDriftMonitoring() {
  const { toast } = useToast();
  const [selectedModelId, setSelectedModelId] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configData, setConfigData] = useState({
    accuracyDropThreshold: 0.05, featureDriftThreshold: 0.10, predictionDriftThreshold: 0.10,
    monitoringWindowHours: 24, alertCooldownMinutes: 60, autoRollbackEnabled: false,
    autoRollbackThreshold: 0.15, notifyOwner: true, notifyEmail: "",
  });

  const { data: alerts, refetch: refetchAlerts, isLoading } = trpc.aiAdvanced.drift.listAlerts.useQuery({
    modelId: selectedModelId, status: statusFilter === "all" ? undefined : statusFilter as any, limit: 50,
  });
  const { data: activeAlerts } = trpc.aiAdvanced.drift.getActiveAlerts.useQuery({ modelId: selectedModelId });
  const { data: config, refetch: refetchConfig } = trpc.aiAdvanced.drift.getConfig.useQuery({ modelId: selectedModelId });
  const { data: metricsHistory } = trpc.aiAdvanced.drift.getMetricsHistory.useQuery({ modelId: selectedModelId, hours: 168 });
  const { data: featureStats } = trpc.aiAdvanced.drift.getFeatureStatistics.useQuery({ modelId: selectedModelId });

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

  const handleSaveConfig = () => { updateConfig.mutate({ modelId: selectedModelId, ...configData }); };

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={activeAlerts && activeAlerts.length > 0 ? "border-red-500" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Alerts</CardTitle><AlertTriangle className={`w-4 h-4 ${activeAlerts && activeAlerts.length > 0 ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} /></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${activeAlerts && activeAlerts.length > 0 ? 'text-red-500' : ''}`}>{activeAlerts?.length || 0}</div></CardContent>
          </Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tổng Alerts</CardTitle><Bell className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{alerts?.total || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Auto Rollback</CardTitle><Shield className="w-4 h-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{config?.autoRollbackEnabled ? <Badge className="bg-green-500">Bật</Badge> : <Badge variant="secondary">Tắt</Badge>}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Monitoring Window</CardTitle><Clock className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{config?.monitoringWindowHours || 24}h</div></CardContent></Card>
        </div>

        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList><TabsTrigger value="alerts">Alerts</TabsTrigger><TabsTrigger value="metrics">Metrics History</TabsTrigger><TabsTrigger value="features">Feature Statistics</TabsTrigger></TabsList>
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
                          {alert.status === 'active' && <Button variant="ghost" size="icon" onClick={() => ignoreAlert.mutate({ alertId: alert.id })}><XCircle className="w-4 h-4 text-gray-500" /></Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="metrics" className="space-y-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" />Metrics History (7 ngày)</CardTitle></CardHeader><CardContent>
              {metricsHistory?.length === 0 ? <div className="text-center py-8 text-muted-foreground">Chưa có dữ liệu metrics</div>
              : <div className="space-y-4">{metricsHistory?.slice(0, 20).map((m, i) => (<div key={i} className="flex items-center gap-4 p-2 border rounded"><div className="w-32 text-sm">{new Date(m.recordedAt).toLocaleDateString('vi-VN')}</div><div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground w-16">Accuracy:</span><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(parseFloat(m.accuracy as string) || 0) * 100}%` }} /></div><span className="text-sm w-16 text-right">{((parseFloat(m.accuracy as string) || 0) * 100).toFixed(2)}%</span></div></div><div className="w-20 text-sm text-muted-foreground text-right">{m.predictionCount} preds</div></div>))}</div>}
            </CardContent></Card>
          </TabsContent>
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
      </div>
    </DashboardLayout>
  );
}
