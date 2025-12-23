import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Play, Pause, RefreshCw, Trash2, Clock, 
  AlertTriangle, CheckCircle2, Settings
} from "lucide-react";

export function ScheduledChecksWidget() {
  const [showConfig, setShowConfig] = useState(false);
  
  const { data: config, refetch: refetchConfig } = trpc.performanceAlert.getScheduledCheckConfig.useQuery();
  const { data: history, refetch: refetchHistory } = trpc.performanceAlert.getCheckHistory.useQuery(
    { limit: 50 },
    { refetchInterval: 30000 }
  );
  const { data: stats } = trpc.performanceAlert.getCheckStats.useQuery(undefined, { refetchInterval: 30000 });
  
  const updateConfig = trpc.performanceAlert.updateScheduledCheckConfig.useMutation({
    onSuccess: () => { toast.success("Cấu hình đã được cập nhật"); refetchConfig(); },
    onError: (error) => { toast.error(`Lỗi: ${error.message}`); },
  });
  
  const runCheck = trpc.performanceAlert.runSingleCheck.useMutation({
    onSuccess: (result) => { toast.success(`Kiểm tra hoàn thành: ${result.alertsTriggered} cảnh báo`); refetchHistory(); },
    onError: (error) => { toast.error(`Lỗi: ${error.message}`); },
  });
  
  const clearHistory = trpc.performanceAlert.clearCheckHistory.useMutation({
    onSuccess: () => { toast.success("Đã xóa lịch sử kiểm tra"); refetchHistory(); },
  });
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Trạng thái</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {config?.enabled ? (
                <><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="font-medium text-green-500">Đang chạy</span></>
              ) : (
                <><Pause className="h-5 w-5 text-yellow-500" /><span className="font-medium text-yellow-500">Tạm dừng</span></>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng số kiểm tra</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats?.totalChecks || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Có cảnh báo</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-500">{stats?.checksWithAlerts || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng cảnh báo</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-500">{stats?.totalAlertsTriggered || 0}</div></CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Scheduled Performance Checks</CardTitle><CardDescription>Tự động kiểm tra hiệu suất hệ thống theo interval</CardDescription></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}><Settings className="h-4 w-4 mr-1" />Cấu hình</Button>
              <Button variant="outline" size="sm" onClick={() => runCheck.mutate()} disabled={runCheck.isPending}>
                {runCheck.isPending ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}Chạy ngay
              </Button>
            </div>
          </div>
        </CardHeader>
        {showConfig && (
          <CardContent className="border-t pt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Kích hoạt</Label>
                <Switch id="enabled" checked={config?.enabled || false} onCheckedChange={(checked) => updateConfig.mutate({ enabled: checked })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (phút)</Label>
                <Input id="interval" type="number" min={1} max={60} value={config?.intervalMinutes || 5} onChange={(e) => updateConfig.mutate({ intervalMinutes: parseInt(e.target.value) || 5 })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifyEmail">Gửi Email</Label>
                <Switch id="notifyEmail" checked={config?.notifyEmail || false} onCheckedChange={(checked) => updateConfig.mutate({ notifyEmail: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="notifyOwner">Thông báo Owner</Label>
                <Switch id="notifyOwner" checked={config?.notifyOwner || false} onCheckedChange={(checked) => updateConfig.mutate({ notifyOwner: checked })} />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle>Lịch sử kiểm tra</CardTitle><CardDescription>{stats?.lastCheckTime ? `Lần kiểm tra cuối: ${new Date(stats.lastCheckTime).toLocaleString('vi-VN')}` : 'Chưa có kiểm tra nào'}</CardDescription></div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchHistory()}><RefreshCw className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => clearHistory.mutate()} disabled={!history?.length}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {history?.map((check) => (
                <div key={check.id} className={`p-3 rounded-lg border ${check.alertsTriggered > 0 ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{new Date(check.timestamp).toLocaleString('vi-VN')}</span>
                      {check.alertsTriggered > 0 && <Badge variant="destructive" className="ml-2"><AlertTriangle className="h-3 w-3 mr-1" />{check.alertsTriggered} cảnh báo</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{check.duration}ms</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Pool: </span><span className="font-mono">{check.stats?.poolUtilization?.toFixed(1) || 0}%</span></div>
                    <div><span className="text-muted-foreground">Cache: </span><span className="font-mono">{check.stats?.cacheHitRate?.toFixed(1) || 0}%</span></div>
                    <div><span className="text-muted-foreground">Queue: </span><span className="font-mono">{check.stats?.queueLength || 0}</span></div>
                  </div>
                  {check.alerts && check.alerts.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      {check.alerts.map((alert, idx) => (<div key={idx} className="text-xs text-muted-foreground">[{alert.severity}] {alert.message}</div>))}
                    </div>
                  )}
                </div>
              ))}
              {(!history || history.length === 0) && <div className="text-center py-8 text-muted-foreground">Chưa có lịch sử kiểm tra</div>}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ScheduledChecksWidget;
