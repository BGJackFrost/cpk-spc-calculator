/**
 * Scheduled CPK Jobs Management Page
 * Quản lý các scheduled jobs kiểm tra CPK tự động
 */
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { Plus, Edit, Trash2, Play, Clock, Calendar, Mail, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface JobFormData {
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  runTime: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  productCode?: string;
  stationName?: string;
  warningThreshold: number;
  criticalThreshold: number;
  emailRecipients: string;
  enableEmail: boolean;
  enableOwnerNotification: boolean;
}

const defaultFormData: JobFormData = {
  name: '',
  description: '',
  frequency: 'daily',
  runTime: '08:00',
  warningThreshold: 1.33,
  criticalThreshold: 1.0,
  emailRecipients: '',
  enableEmail: true,
  enableOwnerNotification: true,
};

export default function ScheduledCpkJobs() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<JobFormData>(defaultFormData);

  const utils = trpc.useUtils();

  // Get jobs list
  const { data: jobsData, isLoading } = trpc.scheduledCpkCheck.list.useQuery({ page: 1, pageSize: 100 });

  // Get products and workstations for filters
  const { data: products } = trpc.product.list.useQuery({});
  const { data: workstations } = trpc.workstation.list.useQuery({});

  // Mutations
  const createMutation = trpc.scheduledCpkCheck.create.useMutation({
    onSuccess: () => {
      toast.success('Tạo scheduled job thành công!');
      setIsDialogOpen(false);
      setFormData(defaultFormData);
      utils.scheduledCpkCheck.list.invalidate();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const updateMutation = trpc.scheduledCpkCheck.update.useMutation({
    onSuccess: () => {
      toast.success('Cập nhật thành công!');
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(defaultFormData);
      utils.scheduledCpkCheck.list.invalidate();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const deleteMutation = trpc.scheduledCpkCheck.delete.useMutation({
    onSuccess: () => {
      toast.success('Xóa thành công!');
      utils.scheduledCpkCheck.list.invalidate();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const runNowMutation = trpc.scheduledCpkCheck.runNow.useMutation({
    onSuccess: () => {
      toast.success('Đã kích hoạt job!');
      utils.scheduledCpkCheck.list.invalidate();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Vui lòng nhập tên job');
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (job: typeof jobsData extends { items: (infer T)[] } ? T : never) => {
    setEditingId(job.id);
    setFormData({
      name: job.name,
      description: job.description || '',
      frequency: job.frequency as 'daily' | 'weekly' | 'monthly',
      runTime: job.runTime,
      dayOfWeek: job.dayOfWeek ?? undefined,
      dayOfMonth: job.dayOfMonth ?? undefined,
      productCode: job.productCode ?? undefined,
      stationName: job.stationName ?? undefined,
      warningThreshold: (job.warningThreshold || 1330) / 1000,
      criticalThreshold: (job.criticalThreshold || 1000) / 1000,
      emailRecipients: job.emailRecipients || '',
      enableEmail: job.enableEmail ?? true,
      enableOwnerNotification: job.enableOwnerNotification ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Bạn có chắc muốn xóa job này?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleRunNow = (id: number) => {
    runNowMutation.mutate({ id });
  };

  const getFrequencyLabel = (frequency: string, dayOfWeek?: number | null, dayOfMonth?: number | null) => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    switch (frequency) {
      case 'daily':
        return 'Hàng ngày';
      case 'weekly':
        return `Hàng tuần (${days[dayOfWeek ?? 0]})`;
      case 'monthly':
        return `Hàng tháng (ngày ${dayOfMonth ?? 1})`;
      default:
        return frequency;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Scheduled CPK Jobs</h1>
            <p className="text-muted-foreground">Quản lý các job kiểm tra CPK tự động và gửi báo cáo</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingId(null);
              setFormData(defaultFormData);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Job mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Chỉnh sửa Job' : 'Tạo Job mới'}</DialogTitle>
                <DialogDescription>
                  Cấu hình scheduled job kiểm tra CPK và gửi báo cáo tự động
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Tên Job *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="VD: Báo cáo CPK hàng ngày"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Tần suất</Label>
                    <Select
                      value={formData.frequency}
                      onValueChange={(v) => setFormData({ ...formData, frequency: v as 'daily' | 'weekly' | 'monthly' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Hàng ngày</SelectItem>
                        <SelectItem value="weekly">Hàng tuần</SelectItem>
                        <SelectItem value="monthly">Hàng tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả job..."
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="runTime">Giờ chạy</Label>
                    <Input
                      id="runTime"
                      type="time"
                      value={formData.runTime}
                      onChange={(e) => setFormData({ ...formData, runTime: e.target.value })}
                    />
                  </div>
                  {formData.frequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Ngày trong tuần</Label>
                      <Select
                        value={String(formData.dayOfWeek ?? 1)}
                        onValueChange={(v) => setFormData({ ...formData, dayOfWeek: Number(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Chủ nhật</SelectItem>
                          <SelectItem value="1">Thứ 2</SelectItem>
                          <SelectItem value="2">Thứ 3</SelectItem>
                          <SelectItem value="3">Thứ 4</SelectItem>
                          <SelectItem value="4">Thứ 5</SelectItem>
                          <SelectItem value="5">Thứ 6</SelectItem>
                          <SelectItem value="6">Thứ 7</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {formData.frequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Ngày trong tháng</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={formData.dayOfMonth ?? 1}
                        onChange={(e) => setFormData({ ...formData, dayOfMonth: Number(e.target.value) })}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sản phẩm (tùy chọn)</Label>
                    <Select
                      value={formData.productCode || 'all'}
                      onValueChange={(v) => setFormData({ ...formData, productCode: v === 'all' ? undefined : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả sản phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả sản phẩm</SelectItem>
                        {products?.map((p: { id: number; code: string; name: string }) => (
                          <SelectItem key={p.id} value={p.code}>{p.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Công trạm (tùy chọn)</Label>
                    <Select
                      value={formData.stationName || 'all'}
                      onValueChange={(v) => setFormData({ ...formData, stationName: v === 'all' ? undefined : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Tất cả công trạm" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả công trạm</SelectItem>
                        {workstations?.map((w: { id: number; name: string }) => (
                          <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ngưỡng cảnh báo (Warning)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.warningThreshold}
                      onChange={(e) => setFormData({ ...formData, warningThreshold: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ngưỡng nghiêm trọng (Critical)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.criticalThreshold}
                      onChange={(e) => setFormData({ ...formData, criticalThreshold: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email nhận báo cáo (phân cách bằng dấu phẩy)</Label>
                  <Input
                    value={formData.emailRecipients}
                    onChange={(e) => setFormData({ ...formData, emailRecipients: e.target.value })}
                    placeholder="email1@example.com, email2@example.com"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.enableEmail}
                      onCheckedChange={(checked) => setFormData({ ...formData, enableEmail: checked })}
                    />
                    <Label>Gửi email báo cáo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.enableOwnerNotification}
                      onCheckedChange={(checked) => setFormData({ ...formData, enableOwnerNotification: checked })}
                    />
                    <Label>Thông báo Owner khi có lỗi</Label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? 'Cập nhật' : 'Tạo Job'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Jobs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Danh sách Scheduled Jobs
            </CardTitle>
            <CardDescription>
              Các job kiểm tra CPK và gửi báo cáo tự động
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-40 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên Job</TableHead>
                    <TableHead>Tần suất</TableHead>
                    <TableHead>Giờ chạy</TableHead>
                    <TableHead>Ngưỡng</TableHead>
                    <TableHead>Thông báo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Lần chạy cuối</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobsData?.items?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Chưa có scheduled job nào. Nhấn "Tạo Job mới" để bắt đầu.
                      </TableCell>
                    </TableRow>
                  ) : (
                    jobsData?.items?.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{job.name}</div>
                            {job.description && (
                              <div className="text-sm text-muted-foreground">{job.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {getFrequencyLabel(job.frequency, job.dayOfWeek, job.dayOfMonth)}
                          </div>
                        </TableCell>
                        <TableCell>{job.runTime}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>Warning: {((job.warningThreshold || 1330) / 1000).toFixed(2)}</div>
                            <div>Critical: {((job.criticalThreshold || 1000) / 1000).toFixed(2)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {job.enableEmail && <Mail className="h-4 w-4 text-blue-500" title="Email" />}
                            {job.enableOwnerNotification && <Bell className="h-4 w-4 text-yellow-500" title="Owner Notification" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.isActive ? (
                            <Badge variant="secondary" className="bg-green-500 text-white">Hoạt động</Badge>
                          ) : (
                            <Badge variant="outline">Tạm dừng</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {job.lastRunAt ? new Date(job.lastRunAt).toLocaleString('vi-VN') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleRunNow(job.id)} title="Chạy ngay">
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(job)} title="Chỉnh sửa">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(job.id)} title="Xóa">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
