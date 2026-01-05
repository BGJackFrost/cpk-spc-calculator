import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, Plus, Play, Pause, CheckCircle, XCircle, Clock, User, Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = { created: { label: 'Mới tạo', color: 'bg-gray-100 text-gray-700', icon: ClipboardList }, assigned: { label: 'Đã giao', color: 'bg-blue-100 text-blue-700', icon: User }, in_progress: { label: 'Đang xử lý', color: 'bg-yellow-100 text-yellow-700', icon: Play }, on_hold: { label: 'Tạm dừng', color: 'bg-orange-100 text-orange-700', icon: Pause }, completed: { label: 'Hoàn thành', color: 'bg-green-100 text-green-700', icon: CheckCircle }, verified: { label: 'Đã xác nhận', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle }, cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700', icon: XCircle } };
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = { low: { label: 'Thấp', color: 'bg-gray-100 text-gray-700' }, medium: { label: 'Trung bình', color: 'bg-blue-100 text-blue-700' }, high: { label: 'Cao', color: 'bg-orange-100 text-orange-700' }, critical: { label: 'Khẩn cấp', color: 'bg-red-100 text-red-700' } };
const VALID_TRANSITIONS: Record<string, string[]> = { created: ['assigned', 'cancelled'], assigned: ['in_progress', 'created', 'cancelled'], in_progress: ['on_hold', 'completed', 'cancelled'], on_hold: ['in_progress', 'cancelled'], completed: ['verified'], verified: [], cancelled: [] };

export default function IotWorkOrderManagement() {
  const [activeTab, setActiveTab] = useState('list');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({ title: '', description: '', priority: 'medium', deviceId: '', assigneeId: '' });

  const { data: workOrders, isLoading, refetch } = trpc.iotCrud.getWorkOrders.useQuery({ status: statusFilter === 'all' ? undefined : statusFilter });
  const { data: devices } = trpc.iotCrud.getDevices.useQuery({});
  const { data: users } = trpc.user.list.useQuery({});

  const createMutation = trpc.iotCrud.createWorkOrder.useMutation({ onSuccess: () => { toast.success('Đã tạo work order'); setIsCreateOpen(false); refetch(); setFormData({ title: '', description: '', priority: 'medium', deviceId: '', assigneeId: '' }); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });
  const updateStatusMutation = trpc.iotCrud.updateWorkOrderStatus.useMutation({ onSuccess: () => { toast.success('Đã cập nhật trạng thái'); refetch(); }, onError: (e) => toast.error(`Lỗi: ${e.message}`) });

  const handleCreate = () => { if (!formData.title) { toast.error('Nhập tiêu đề'); return; } createMutation.mutate({ title: formData.title, description: formData.description, priority: formData.priority as any, deviceId: formData.deviceId ? parseInt(formData.deviceId) : undefined, assigneeId: formData.assigneeId ? parseInt(formData.assigneeId) : undefined }); };
  const handleStatusChange = (workOrderId: number, currentStatus: string, newStatus: string) => { if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) { toast.error('Không thể chuyển trạng thái'); return; } updateStatusMutation.mutate({ id: workOrderId, status: newStatus as any }); };

  const stats = useMemo(() => {
    if (!workOrders) return { total: 0, byStatus: {}, byPriority: {}, avgMttr: 0 };
    const byStatus: Record<string, number> = {}; const byPriority: Record<string, number> = {}; let totalRepairTime = 0; let completedCount = 0;
    workOrders.forEach((wo: any) => { byStatus[wo.status] = (byStatus[wo.status] || 0) + 1; byPriority[wo.priority] = (byPriority[wo.priority] || 0) + 1; if (wo.status === 'completed' && wo.started_at && wo.completed_at) { totalRepairTime += new Date(wo.completed_at).getTime() - new Date(wo.started_at).getTime(); completedCount++; } });
    const avgMttr = completedCount > 0 ? totalRepairTime / completedCount / (1000 * 60) : 0;
    return { total: workOrders.length, byStatus, byPriority, avgMttr };
  }, [workOrders]);

  const statusChartData = Object.entries(stats.byStatus).map(([status, count]) => ({ name: STATUS_CONFIG[status]?.label || status, value: count, color: STATUS_CONFIG[status]?.color.includes('green') ? '#22c55e' : STATUS_CONFIG[status]?.color.includes('yellow') ? '#eab308' : STATUS_CONFIG[status]?.color.includes('blue') ? '#3b82f6' : '#6b7280' }));
  const priorityChartData = Object.entries(stats.byPriority).map(([priority, count]) => ({ name: PRIORITY_CONFIG[priority]?.label || priority, value: count }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-blue-500" />Quản lý Work Orders</h1><p className="text-muted-foreground">Theo dõi và quản lý các công việc bảo trì, sửa chữa</p></div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Tạo Work Order</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Tạo Work Order mới</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Tiêu đề *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Mô tả ngắn gọn công việc" /></div>
                <div className="space-y-2"><Label>Mô tả chi tiết</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Độ ưu tiên</Label><Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PRIORITY_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Thiết bị</Label><Select value={formData.deviceId} onValueChange={(v) => setFormData({ ...formData, deviceId: v })}><SelectTrigger><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger><SelectContent>{devices?.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>Người thực hiện</Label><Select value={formData.assigneeId} onValueChange={(v) => setFormData({ ...formData, assigneeId: v })}><SelectTrigger><SelectValue placeholder="Chọn người thực hiện" /></SelectTrigger><SelectContent>{users?.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button><Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Tạo</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Tổng Work Orders</CardTitle><ClipboardList className="h-4 w-4" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Đang xử lý</CardTitle><Play className="h-4 w-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{stats.byStatus['in_progress'] || 0}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">Hoàn thành</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{(stats.byStatus['completed'] || 0) + (stats.byStatus['verified'] || 0)}</div></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm">MTTR Trung bình</CardTitle><Clock className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{stats.avgMttr.toFixed(0)} phút</div></CardContent></Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList><TabsTrigger value="list">Danh sách</TabsTrigger><TabsTrigger value="stats">Thống kê</TabsTrigger></TabsList>
          <TabsContent value="list" className="mt-4"><Card><CardContent className="pt-6">
            <div className="flex gap-4 mb-4"><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Lọc theo trạng thái" /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả</SelectItem>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent></Select></div>
            {isLoading ? <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div> : !workOrders?.length ? <div className="text-center py-12 text-muted-foreground"><ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Chưa có work order nào</p></div> : <ScrollArea className="h-[500px]"><Table><TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Tiêu đề</TableHead><TableHead>Trạng thái</TableHead><TableHead>Độ ưu tiên</TableHead><TableHead>Người thực hiện</TableHead><TableHead>Tạo lúc</TableHead><TableHead>Thao tác</TableHead></TableRow></TableHeader><TableBody>{workOrders.map((wo: any) => { const statusConfig = STATUS_CONFIG[wo.status] || STATUS_CONFIG.created; const priorityConfig = PRIORITY_CONFIG[wo.priority] || PRIORITY_CONFIG.medium; const StatusIcon = statusConfig.icon; const nextStatuses = VALID_TRANSITIONS[wo.status] || []; return (<TableRow key={wo.id}><TableCell className="font-mono">#{wo.id}</TableCell><TableCell><div className="font-medium">{wo.title}</div>{wo.description && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{wo.description}</div>}</TableCell><TableCell><Badge className={statusConfig.color}><StatusIcon className="h-3 w-3 mr-1" />{statusConfig.label}</Badge></TableCell><TableCell><Badge className={priorityConfig.color}>{priorityConfig.label}</Badge></TableCell><TableCell>{wo.assignee_name || '-'}</TableCell><TableCell className="text-sm">{wo.created_at ? formatDistanceToNow(new Date(wo.created_at), { addSuffix: true, locale: vi }) : '-'}</TableCell><TableCell>{nextStatuses.length > 0 && (<Select onValueChange={(v) => handleStatusChange(wo.id, wo.status, v)}><SelectTrigger className="w-[130px] h-8"><SelectValue placeholder="Chuyển..." /></SelectTrigger><SelectContent>{nextStatuses.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</SelectItem>)}</SelectContent></Select>)}</TableCell></TableRow>); })}</TableBody></Table></ScrollArea>}
          </CardContent></Card></TabsContent>
          <TabsContent value="stats" className="mt-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card><CardHeader><CardTitle className="text-lg">Phân bổ theo trạng thái</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>{statusChartData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-lg">Phân bổ theo độ ưu tiên</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={priorityChartData}><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#3b82f6" /></BarChart></ResponsiveContainer></div></CardContent></Card>
          </div></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
