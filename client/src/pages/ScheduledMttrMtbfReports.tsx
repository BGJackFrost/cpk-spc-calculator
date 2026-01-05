/**
 * Scheduled MTTR/MTBF Reports Page
 * Trang cấu hình báo cáo MTTR/MTBF định kỳ
 */

import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Trash2,
  Edit,
  Send,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Chủ nhật' },
  { value: 1, label: 'Thứ hai' },
  { value: 2, label: 'Thứ ba' },
  { value: 3, label: 'Thứ tư' },
  { value: 4, label: 'Thứ năm' },
  { value: 5, label: 'Thứ sáu' },
  { value: 6, label: 'Thứ bảy' },
];

export default function ScheduledMttrMtbfReports() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formTargetType, setFormTargetType] = useState<'device' | 'machine' | 'production_line'>('machine');
  const [formTargetId, setFormTargetId] = useState('');
  const [formTargetName, setFormTargetName] = useState('');
  const [formFrequency, setFormFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [formDayOfWeek, setFormDayOfWeek] = useState('1');
  const [formDayOfMonth, setFormDayOfMonth] = useState('1');
  const [formTimeOfDay, setFormTimeOfDay] = useState('08:00');
  const [formRecipients, setFormRecipients] = useState('');
  const [formFormat, setFormFormat] = useState<'excel' | 'pdf' | 'both'>('excel');
  const [formIsActive, setFormIsActive] = useState(true);

  // Fetch configs
  const { data: configs, isLoading, refetch } = trpc.scheduledMttrMtbf.getConfigs.useQuery();

  // Mutations
  const createMutation = trpc.scheduledMttrMtbf.createConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo cấu hình báo cáo định kỳ');
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi khi tạo cấu hình', { description: error.message });
    },
  });

  const updateMutation = trpc.scheduledMttrMtbf.updateConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã cập nhật cấu hình');
      setEditingConfig(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi khi cập nhật', { description: error.message });
    },
  });

  const deleteMutation = trpc.scheduledMttrMtbf.deleteConfig.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa cấu hình');
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi khi xóa', { description: error.message });
    },
  });

  const sendNowMutation = trpc.scheduledMttrMtbf.sendNow.useMutation({
    onSuccess: () => {
      toast.success('Đã gửi báo cáo thành công!');
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi khi gửi báo cáo', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormTargetType('machine');
    setFormTargetId('');
    setFormTargetName('');
    setFormFrequency('weekly');
    setFormDayOfWeek('1');
    setFormDayOfMonth('1');
    setFormTimeOfDay('08:00');
    setFormRecipients('');
    setFormFormat('excel');
    setFormIsActive(true);
  };

  const handleCreate = () => {
    const recipients = formRecipients.split(',').map(e => e.trim()).filter(e => e);
    if (recipients.length === 0) {
      toast.error('Vui lòng nhập ít nhất một email');
      return;
    }

    createMutation.mutate({
      name: formName,
      targetType: formTargetType,
      targetId: parseInt(formTargetId),
      targetName: formTargetName,
      frequency: formFrequency,
      dayOfWeek: formFrequency === 'weekly' ? parseInt(formDayOfWeek) : undefined,
      dayOfMonth: formFrequency === 'monthly' ? parseInt(formDayOfMonth) : undefined,
      timeOfDay: formTimeOfDay,
      recipients,
      format: formFormat,
      isActive: formIsActive,
    });
  };

  const handleUpdate = () => {
    if (!editingConfig) return;
    
    const recipients = formRecipients.split(',').map(e => e.trim()).filter(e => e);
    
    updateMutation.mutate({
      id: editingConfig.id,
      name: formName,
      targetType: formTargetType,
      targetId: parseInt(formTargetId),
      targetName: formTargetName,
      frequency: formFrequency,
      dayOfWeek: formFrequency === 'weekly' ? parseInt(formDayOfWeek) : null,
      dayOfMonth: formFrequency === 'monthly' ? parseInt(formDayOfMonth) : null,
      timeOfDay: formTimeOfDay,
      recipients,
      format: formFormat,
      isActive: formIsActive,
    });
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setFormName(config.name);
    setFormTargetType(config.targetType);
    setFormTargetId(config.targetId.toString());
    setFormTargetName(config.targetName);
    setFormFrequency(config.frequency);
    setFormDayOfWeek(config.dayOfWeek?.toString() || '1');
    setFormDayOfMonth(config.dayOfMonth?.toString() || '1');
    setFormTimeOfDay(config.timeOfDay);
    setFormRecipients(config.recipients.join(', '));
    setFormFormat(config.format);
    setFormIsActive(config.isActive);
  };

  const handleToggleActive = (config: any) => {
    updateMutation.mutate({
      id: config.id,
      isActive: !config.isActive,
    });
  };

  const getFrequencyLabel = (config: any) => {
    if (config.frequency === 'daily') return 'Hàng ngày';
    if (config.frequency === 'weekly') {
      const day = DAYS_OF_WEEK.find(d => d.value === config.dayOfWeek);
      return `Hàng tuần (${day?.label || ''})`;
    }
    if (config.frequency === 'monthly') {
      return `Hàng tháng (ngày ${config.dayOfMonth})`;
    }
    return config.frequency;
  };

  const getStatusBadge = (config: any) => {
    if (!config.lastSentStatus) {
      return <Badge variant="secondary">Chưa gửi</Badge>;
    }
    if (config.lastSentStatus === 'success') {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Thành công</Badge>;
    }
    if (config.lastSentStatus === 'failed') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Thất bại</Badge>;
    }
    return <Badge variant="secondary">{config.lastSentStatus}</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="w-6 h-6" />
              Báo cáo MTTR/MTBF định kỳ
            </h1>
            <p className="text-muted-foreground">
              Cấu hình gửi báo cáo MTTR/MTBF tự động theo lịch
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Tạo mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Tạo báo cáo định kỳ mới</DialogTitle>
                <DialogDescription>
                  Cấu hình gửi báo cáo MTTR/MTBF tự động
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tên báo cáo</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Báo cáo MTTR/MTBF hàng tuần"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Loại đối tượng</Label>
                    <Select value={formTargetType} onValueChange={(v: any) => setFormTargetType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="device">Thiết bị IoT</SelectItem>
                        <SelectItem value="machine">Máy móc</SelectItem>
                        <SelectItem value="production_line">Dây chuyền</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>ID đối tượng</Label>
                    <Input
                      type="number"
                      value={formTargetId}
                      onChange={(e) => setFormTargetId(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tên đối tượng</Label>
                  <Input
                    value={formTargetName}
                    onChange={(e) => setFormTargetName(e.target.value)}
                    placeholder="VD: Máy CNC #1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tần suất</Label>
                    <Select value={formFrequency} onValueChange={(v: any) => setFormFrequency(v)}>
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
                  
                  {formFrequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Ngày trong tuần</Label>
                      <Select value={formDayOfWeek} onValueChange={setFormDayOfWeek}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(day => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {formFrequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label>Ngày trong tháng</Label>
                      <Input
                        type="number"
                        min={1}
                        max={31}
                        value={formDayOfMonth}
                        onChange={(e) => setFormDayOfMonth(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Giờ gửi</Label>
                    <Input
                      type="time"
                      value={formTimeOfDay}
                      onChange={(e) => setFormTimeOfDay(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Định dạng</Label>
                    <Select value={formFormat} onValueChange={(v: any) => setFormFormat(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="both">Cả hai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Email nhận báo cáo</Label>
                  <Input
                    value={formRecipients}
                    onChange={(e) => setFormRecipients(e.target.value)}
                    placeholder="email1@example.com, email2@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Nhiều email cách nhau bằng dấu phẩy
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Kích hoạt</Label>
                  <Switch
                    checked={formIsActive}
                    onCheckedChange={setFormIsActive}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Tạo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa báo cáo định kỳ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tên báo cáo</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Loại đối tượng</Label>
                  <Select value={formTargetType} onValueChange={(v: any) => setFormTargetType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="device">Thiết bị IoT</SelectItem>
                      <SelectItem value="machine">Máy móc</SelectItem>
                      <SelectItem value="production_line">Dây chuyền</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ID đối tượng</Label>
                  <Input
                    type="number"
                    value={formTargetId}
                    onChange={(e) => setFormTargetId(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tên đối tượng</Label>
                <Input
                  value={formTargetName}
                  onChange={(e) => setFormTargetName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tần suất</Label>
                  <Select value={formFrequency} onValueChange={(v: any) => setFormFrequency(v)}>
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
                
                {formFrequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Ngày trong tuần</Label>
                    <Select value={formDayOfWeek} onValueChange={setFormDayOfWeek}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {formFrequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Ngày trong tháng</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={formDayOfMonth}
                      onChange={(e) => setFormDayOfMonth(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Giờ gửi</Label>
                  <Input
                    type="time"
                    value={formTimeOfDay}
                    onChange={(e) => setFormTimeOfDay(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Định dạng</Label>
                  <Select value={formFormat} onValueChange={(v: any) => setFormFormat(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="both">Cả hai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email nhận báo cáo</Label>
                <Input
                  value={formRecipients}
                  onChange={(e) => setFormRecipients(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Kích hoạt</Label>
                <Switch
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingConfig(null)}>
                Hủy
              </Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Edit className="w-4 h-4 mr-2" />
                )}
                Cập nhật
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Configs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách báo cáo định kỳ</CardTitle>
            <CardDescription>
              {configs?.length || 0} cấu hình báo cáo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {configs && configs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Đối tượng</TableHead>
                    <TableHead>Tần suất</TableHead>
                    <TableHead>Giờ gửi</TableHead>
                    <TableHead>Định dạng</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Lần gửi cuối</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((config: any) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{config.targetName}</div>
                          <div className="text-muted-foreground text-xs">
                            {config.targetType === 'device' ? 'Thiết bị' : 
                             config.targetType === 'machine' ? 'Máy móc' : 'Dây chuyền'} #{config.targetId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getFrequencyLabel(config)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {config.timeOfDay}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {config.format === 'excel' && <FileSpreadsheet className="w-4 h-4 text-green-600" />}
                          {config.format === 'pdf' && <FileText className="w-4 h-4 text-red-600" />}
                          {config.format === 'both' && (
                            <>
                              <FileSpreadsheet className="w-4 h-4 text-green-600" />
                              <FileText className="w-4 h-4 text-red-600" />
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={config.isActive}
                            onCheckedChange={() => handleToggleActive(config)}
                          />
                          {getStatusBadge(config)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {config.lastSentAt ? (
                          <div className="text-sm">
                            {new Date(config.lastSentAt).toLocaleString('vi-VN')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendNowMutation.mutate({ id: config.id })}
                            disabled={sendNowMutation.isPending}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(config)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm('Bạn có chắc muốn xóa cấu hình này?')) {
                                deleteMutation.mutate({ id: config.id });
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có báo cáo định kỳ</h3>
                <p className="text-muted-foreground mb-4">
                  Tạo báo cáo định kỳ để tự động nhận email MTTR/MTBF
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Tạo báo cáo đầu tiên
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Lưu ý
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Báo cáo sẽ được gửi tự động vào thời gian đã cấu hình</p>
            <p>• Đảm bảo SMTP đã được cấu hình đúng trong phần Cài đặt Email</p>
            <p>• Báo cáo hàng ngày sẽ chứa dữ liệu của 24h trước</p>
            <p>• Báo cáo hàng tuần sẽ chứa dữ liệu của 7 ngày trước</p>
            <p>• Báo cáo hàng tháng sẽ chứa dữ liệu của 30 ngày trước</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
