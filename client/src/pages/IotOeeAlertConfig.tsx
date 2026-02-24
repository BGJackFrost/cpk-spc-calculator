import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Bell, Plus, Settings, AlertTriangle, CheckCircle, Clock, Mail, MessageSquare, Loader2, Trash2, Play, History } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const SEVERITY_COLORS = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };

export default function IotOeeAlertConfig() {
  const [activeTab, setActiveTab] = useState('configs');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', targetType: 'all', targetId: '', oeeWarningThreshold: 75, oeeCriticalThreshold: 65, mttrWarningMinutes: 60, mttrCriticalMinutes: 120, mtbfWarningHours: 100, mtbfCriticalHours: 50, notifyEmail: true, notifyTelegram: false, emailRecipients: '', checkIntervalMinutes: 15, cooldownMinutes: 30 });

  const { data: configs, isLoading: configsLoading, refetch: refetchConfigs } = trpc.iotOeeAlert.getConfigs.useQuery({});
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = trpc.iotOeeAlert.getHistory.useQuery({ limit: 100 });
  const { data: statistics } = trpc.iotOeeAlert.getStatistics.useQuery({ days: 7 });

  const createMutation = trpc.iotOeeAlert.createConfig.useMutation({ onSuccess: () => { toast.success('Đã tạo cấu hình'); setIsCreateOpen(false); refetchConfigs(); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const updateMutation = trpc.iotOeeAlert.updateConfig.useMutation({ onSuccess: () => { toast.success('Đã cập nhật'); refetchConfigs(); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const deleteMutation = trpc.iotOeeAlert.deleteConfig.useMutation({ onSuccess: () => { toast.success('Đã xóa'); refetchConfigs(); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const acknowledgeMutation = trpc.iotOeeAlert.acknowledgeAlert.useMutation({ onSuccess: () => { toast.success('Đã xác nhận'); refetchHistory(); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const runCheckMutation = trpc.iotOeeAlert.runCheck.useMutation({ onSuccess: (r) => { toast.success(`Kiểm tra ${r.length} cấu hình`); refetchHistory(); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });

  const handleCreate = () => { if (!formData.name) { toast.error('Nhập tên'); return; } createMutation.mutate({ ...formData, targetId: formData.targetId ? parseInt(formData.targetId) : undefined, emailRecipients: formData.emailRecipients ? formData.emailRecipients.split(',').map(e => e.trim()) : [] }); };
  const severityChartData = statistics?.bySeverity ? [{ name: 'Critical', value: statistics.bySeverity.critical || 0, color: SEVERITY_COLORS.critical }, { name: 'Warning', value: statistics.bySeverity.warning || 0, color: SEVERITY_COLORS.warning }, { name: 'Info', value: statistics.bySeverity.info || 0, color: SEVERITY_COLORS.info }] : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-orange-500" />Cấu hình Cảnh báo OEE</h1><p className="text-muted-foreground">Thiết lập cảnh báo tự động khi OEE giảm</p></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runCheckMutation.mutate()} disabled={runCheckMutation.isPending}>{runCheckMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}Kiểm tra</Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Thêm</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Tạo cấu hình cảnh báo</DialogTitle><DialogDescription>Thiết lập ngưỡng và kênh thông báo</DialogDescription></DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Tên *</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Cảnh báo OEE" /></div><div className="space-y-2"><Label>Đối tượng</Label><Select value={formData.targetType} onValueChange={(v) => setFormData({ ...formData, targetType: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="production_line">Dây chuyền</SelectItem><SelectItem value="machine">Máy</SelectItem></SelectContent></Select></div></div>
                  <div className="space-y-4"><h4 className="font-medium">Ngưỡng OEE</h4><div className="grid grid-cols-2 gap-6"><div className="space-y-3"><Label>Warning: {formData.oeeWarningThreshold}%</Label><Slider value={[formData.oeeWarningThreshold]} onValueChange={([v]) => setFormData({ ...formData, oeeWarningThreshold: v })} min={0} max={100} /></div><div className="space-y-3"><Label>Critical: {formData.oeeCriticalThreshold}%</Label><Slider value={[formData.oeeCriticalThreshold]} onValueChange={([v]) => setFormData({ ...formData, oeeCriticalThreshold: v })} min={0} max={100} /></div></div></div>
                  <div className="space-y-4"><h4 className="font-medium">Kênh thông báo</h4><div className="flex gap-6"><div className="flex items-center gap-2"><Switch checked={formData.notifyEmail} onCheckedChange={(v) => setFormData({ ...formData, notifyEmail: v })} /><Label><Mail className="h-4 w-4 inline mr-1" />Email</Label></div><div className="flex items-center gap-2"><Switch checked={formData.notifyTelegram} onCheckedChange={(v) => setFormData({ ...formData, notifyTelegram: v })} /><Label><MessageSquare className="h-4 w-4 inline mr-1" />Telegram</Label></div></div>{formData.notifyEmail && <div className="space-y-2"><Label>Email (phân cách bằng dấu phẩy)</Label><Input value={formData.emailRecipients} onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })} /></div>}</div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button><Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Tạo</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Tổng (7 ngày)</CardTitle><Bell className="h-4 w-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{statistics?.total || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Critical</CardTitle><AlertTriangle className="h-4 w-4 text-red-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{statistics?.bySeverity?.critical || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Chờ xác nhận</CardTitle><Clock className="h-4 w-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{statistics?.pending || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Đã xác nhận</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{statistics?.acknowledged || 0}</div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList><TabsTrigger value="configs">Cấu hình</TabsTrigger><TabsTrigger value="history">Lịch sử</TabsTrigger><TabsTrigger value="statistics">Thống kê</TabsTrigger></TabsList>
          <TabsContent value="configs" className="mt-4"><Card><CardContent className="pt-6">{configsLoading ? <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div> : !configs?.length ? <div className="text-center py-12 text-muted-foreground"><Settings className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Chưa có cấu hình</p></div> : <Table><TableHeader><TableRow><TableHead>Tên</TableHead><TableHead>Đối tượng</TableHead><TableHead>Ngưỡng OEE</TableHead><TableHead>Kênh</TableHead><TableHead>Trạng thái</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{configs.map((c: any) => (<TableRow key={c.id}><TableCell><div className="font-medium">{c.name}</div></TableCell><TableCell><Badge variant="outline">{c.target_type || 'all'}</Badge></TableCell><TableCell><span className="text-yellow-600">W:{c.oee_warning_threshold}%</span> / <span className="text-red-600">C:{c.oee_critical_threshold}%</span></TableCell><TableCell><div className="flex gap-1">{c.notify_email && <Badge variant="secondary"><Mail className="h-3 w-3" /></Badge>}{c.notify_telegram && <Badge variant="secondary"><MessageSquare className="h-3 w-3" /></Badge>}</div></TableCell><TableCell><Switch checked={c.is_enabled} onCheckedChange={() => updateMutation.mutate({ id: c.id, isEnabled: !c.is_enabled })} /></TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: c.id })}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell></TableRow>))}</TableBody></Table>}</CardContent></Card></TabsContent>
          <TabsContent value="history" className="mt-4"><Card><CardContent className="pt-6">{historyLoading ? <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div> : !history?.length ? <div className="text-center py-12 text-muted-foreground"><History className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Chưa có lịch sử</p></div> : <ScrollArea className="h-[500px]"><Table><TableHeader><TableRow><TableHead>Thời gian</TableHead><TableHead>Loại</TableHead><TableHead>Mức độ</TableHead><TableHead>Đối tượng</TableHead><TableHead>Giá trị</TableHead><TableHead>Trạng thái</TableHead><TableHead></TableHead></TableRow></TableHeader><TableBody>{history.map((a: any) => (<TableRow key={a.id}><TableCell className="text-sm">{a.created_at ? format(new Date(a.created_at), 'dd/MM HH:mm') : '-'}</TableCell><TableCell><Badge variant="outline">{a.alert_type}</Badge></TableCell><TableCell><Badge style={{ backgroundColor: SEVERITY_COLORS[a.severity as keyof typeof SEVERITY_COLORS] }} className="text-white">{a.severity}</Badge></TableCell><TableCell className="text-sm">{a.target_name || '-'}</TableCell><TableCell className="text-sm font-mono">{a.current_value?.toFixed(1)} / {a.threshold_value?.toFixed(1)}</TableCell><TableCell>{a.acknowledged ? <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Đã xác nhận</Badge> : <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Chờ</Badge>}</TableCell><TableCell>{!a.acknowledged && <Button variant="ghost" size="sm" onClick={() => acknowledgeMutation.mutate({ alertId: a.id })}><CheckCircle className="h-4 w-4" /></Button>}</TableCell></TableRow>))}</TableBody></Table></ScrollArea>}</CardContent></Card></TabsContent>
          <TabsContent value="statistics" className="mt-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><Card><CardHeader><CardTitle className="text-lg">Phân bổ theo mức độ</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={severityChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{severityChartData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card><Card><CardHeader><CardTitle className="text-lg">Tổng quan</CardTitle></CardHeader><CardContent><div className="space-y-4"><div className="flex justify-between p-3 bg-muted/50 rounded-lg"><span>Tổng (7 ngày)</span><span className="font-bold text-xl">{statistics?.total || 0}</span></div><div className="flex justify-between p-3 bg-red-50 rounded-lg"><span className="text-red-700">Critical</span><span className="font-bold text-xl text-red-600">{statistics?.bySeverity?.critical || 0}</span></div><div className="flex justify-between p-3 bg-yellow-50 rounded-lg"><span className="text-yellow-700">Warning</span><span className="font-bold text-xl text-yellow-600">{statistics?.bySeverity?.warning || 0}</span></div><div className="flex justify-between p-3 bg-green-50 rounded-lg"><span className="text-green-700">Đã xác nhận</span><span className="font-bold text-xl text-green-600">{statistics?.acknowledged || 0}</span></div></div></CardContent></Card></div></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
