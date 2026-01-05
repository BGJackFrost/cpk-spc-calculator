/**
 * MTTR/MTBF Thresholds Configuration Page
 * Trang cấu hình ngưỡng cảnh báo MTTR/MTBF
 */
import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  History,
  RefreshCw,
  Loader2,
  Mail,
  Send,
} from 'lucide-react';

export default function MttrMtbfThresholds() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    targetType: 'all' as 'device' | 'machine' | 'production_line' | 'all',
    targetId: null as number | null,
    mttrWarningThreshold: null as number | null,
    mttrCriticalThreshold: null as number | null,
    mtbfWarningThreshold: null as number | null,
    mtbfCriticalThreshold: null as number | null,
    availabilityWarningThreshold: null as number | null,
    availabilityCriticalThreshold: null as number | null,
    alertEmails: '',
    alertTelegram: 0,
    cooldownMinutes: 60,
  });
  const { toast } = useToast();

  // Queries
  const { data: thresholds, isLoading, refetch } = trpc.mttrMtbfAlert.listThresholds.useQuery();
  const { data: alertHistory, refetch: refetchHistory } = trpc.mttrMtbfAlert.getAlertHistory.useQuery({ days: 7, limit: 50 });

  // Mutations
  const createMutation = trpc.mttrMtbfAlert.createThreshold.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã tạo ngưỡng cảnh báo mới' });
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = trpc.mttrMtbfAlert.updateThreshold.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã cập nhật ngưỡng cảnh báo' });
      setEditingId(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = trpc.mttrMtbfAlert.deleteThreshold.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã xóa ngưỡng cảnh báo' });
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
    },
  });

  const acknowledgeMutation = trpc.mttrMtbfAlert.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast({ title: 'Thành công', description: 'Đã xác nhận cảnh báo' });
      refetchHistory();
    },
  });

  const resetForm = () => {
    setFormData({
      targetType: 'all',
      targetId: null,
      mttrWarningThreshold: null,
      mttrCriticalThreshold: null,
      mtbfWarningThreshold: null,
      mtbfCriticalThreshold: null,
      availabilityWarningThreshold: null,
      availabilityCriticalThreshold: null,
      alertEmails: '',
      alertTelegram: 0,
      cooldownMinutes: 60,
    });
  };

  const handleEdit = (threshold: any) => {
    setFormData({
      targetType: threshold.targetType,
      targetId: threshold.targetId,
      mttrWarningThreshold: threshold.mttrWarningThreshold ? Number(threshold.mttrWarningThreshold) : null,
      mttrCriticalThreshold: threshold.mttrCriticalThreshold ? Number(threshold.mttrCriticalThreshold) : null,
      mtbfWarningThreshold: threshold.mtbfWarningThreshold ? Number(threshold.mtbfWarningThreshold) : null,
      mtbfCriticalThreshold: threshold.mtbfCriticalThreshold ? Number(threshold.mtbfCriticalThreshold) : null,
      availabilityWarningThreshold: threshold.availabilityWarningThreshold ? Number(threshold.availabilityWarningThreshold) : null,
      availabilityCriticalThreshold: threshold.availabilityCriticalThreshold ? Number(threshold.availabilityCriticalThreshold) : null,
      alertEmails: threshold.alertEmails || '',
      alertTelegram: threshold.alertTelegram || 0,
      cooldownMinutes: threshold.cooldownMinutes || 60,
    });
    setEditingId(threshold.id);
  };

  const handleSubmit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const targetTypeLabel = {
    device: 'Thiết bị IoT',
    machine: 'Máy móc',
    production_line: 'Dây chuyền',
    all: 'Tất cả',
  };

  const alertTypeLabel = {
    mttr_warning: 'MTTR Warning',
    mttr_critical: 'MTTR Critical',
    mtbf_warning: 'MTBF Warning',
    mtbf_critical: 'MTBF Critical',
    availability_warning: 'Availability Warning',
    availability_critical: 'Availability Critical',
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-orange-500" />
              Cấu hình Ngưỡng Cảnh báo MTTR/MTBF
            </h1>
            <p className="text-muted-foreground">
              Thiết lập ngưỡng cảnh báo tự động khi MTTR/MTBF vượt giới hạn
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setEditingId(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm ngưỡng mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo ngưỡng cảnh báo mới</DialogTitle>
                <DialogDescription>
                  Thiết lập ngưỡng cảnh báo cho MTTR, MTBF và Availability
                </DialogDescription>
              </DialogHeader>
              <ThresholdForm 
                formData={formData} 
                setFormData={setFormData} 
                onSubmit={handleSubmit}
                isLoading={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="thresholds" className="space-y-4">
          <TabsList>
            <TabsTrigger value="thresholds">
              <Settings className="w-4 h-4 mr-2" />
              Ngưỡng cảnh báo
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              Lịch sử cảnh báo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="thresholds">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách ngưỡng cảnh báo</CardTitle>
                <CardDescription>
                  Quản lý các ngưỡng cảnh báo MTTR/MTBF cho thiết bị, máy móc và dây chuyền
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : thresholds && thresholds.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Đối tượng</TableHead>
                        <TableHead>MTTR (phút)</TableHead>
                        <TableHead>MTBF (phút)</TableHead>
                        <TableHead>Availability</TableHead>
                        <TableHead>Thông báo</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {thresholds.map((threshold: any) => (
                        <TableRow key={threshold.id}>
                          <TableCell>
                            <div>
                              <Badge variant="outline">{targetTypeLabel[threshold.targetType as keyof typeof targetTypeLabel]}</Badge>
                              {threshold.targetId && (
                                <span className="ml-2 text-sm text-muted-foreground">#{threshold.targetId}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {threshold.mttrWarningThreshold && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  <span className="text-sm">{threshold.mttrWarningThreshold}</span>
                                </div>
                              )}
                              {threshold.mttrCriticalThreshold && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-sm">{threshold.mttrCriticalThreshold}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {threshold.mtbfWarningThreshold && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  <span className="text-sm">{threshold.mtbfWarningThreshold}</span>
                                </div>
                              )}
                              {threshold.mtbfCriticalThreshold && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-sm">{threshold.mtbfCriticalThreshold}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {threshold.availabilityWarningThreshold && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  <span className="text-sm">{(Number(threshold.availabilityWarningThreshold) * 100).toFixed(1)}%</span>
                                </div>
                              )}
                              {threshold.availabilityCriticalThreshold && (
                                <div className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-sm">{(Number(threshold.availabilityCriticalThreshold) * 100).toFixed(1)}%</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {threshold.alertEmails && <Mail className="w-4 h-4 text-blue-500" />}
                              {threshold.alertTelegram === 1 && <Send className="w-4 h-4 text-blue-500" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={threshold.enabled ? 'default' : 'secondary'}>
                              {threshold.enabled ? 'Bật' : 'Tắt'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  handleEdit(threshold);
                                  setIsCreateOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMutation.mutate({ id: threshold.id })}
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
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Chưa có ngưỡng cảnh báo nào được cấu hình</p>
                    <p className="text-sm">Nhấn "Thêm ngưỡng mới" để bắt đầu</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Lịch sử cảnh báo</CardTitle>
                  <CardDescription>
                    Các cảnh báo MTTR/MTBF đã được kích hoạt trong 7 ngày qua
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchHistory()}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Làm mới
                </Button>
              </CardHeader>
              <CardContent>
                {alertHistory && alertHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Đối tượng</TableHead>
                        <TableHead>Loại cảnh báo</TableHead>
                        <TableHead>Giá trị</TableHead>
                        <TableHead>Ngưỡng</TableHead>
                        <TableHead>Thông báo</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertHistory.map((alert: any) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <span className="text-sm">
                              {new Date(alert.createdAt).toLocaleString('vi-VN')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-medium">{alert.targetName}</span>
                              <Badge variant="outline" className="ml-2">
                                {targetTypeLabel[alert.targetType as keyof typeof targetTypeLabel]}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={alert.alertType.includes('critical') ? 'destructive' : 'secondary'}>
                              {alertTypeLabel[alert.alertType as keyof typeof alertTypeLabel]}
                            </Badge>
                          </TableCell>
                          <TableCell>{alert.currentValue}</TableCell>
                          <TableCell>{alert.thresholdValue}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {alert.emailSent === 1 && <Mail className="w-4 h-4 text-green-500" />}
                              {alert.telegramSent === 1 && <Send className="w-4 h-4 text-green-500" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            {alert.acknowledgedAt ? (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Đã xác nhận
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Chưa xác nhận
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!alert.acknowledgedAt && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => acknowledgeMutation.mutate({ alertId: alert.id })}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Xác nhận
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Không có cảnh báo nào trong 7 ngày qua</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// Threshold Form Component
function ThresholdForm({ 
  formData, 
  setFormData, 
  onSubmit,
  isLoading,
}: {
  formData: any;
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Target Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Loại đối tượng</Label>
          <Select
            value={formData.targetType}
            onValueChange={(v) => setFormData({ ...formData, targetType: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="device">Thiết bị IoT</SelectItem>
              <SelectItem value="machine">Máy móc</SelectItem>
              <SelectItem value="production_line">Dây chuyền</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ID đối tượng (để trống = áp dụng tất cả)</Label>
          <Input
            type="number"
            placeholder="Để trống để áp dụng cho tất cả"
            value={formData.targetId || ''}
            onChange={(e) => setFormData({ ...formData, targetId: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      {/* MTTR Thresholds */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Ngưỡng MTTR (phút) - Cảnh báo khi MTTR vượt quá
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-yellow-600">Warning</Label>
            <Input
              type="number"
              placeholder="VD: 30"
              value={formData.mttrWarningThreshold || ''}
              onChange={(e) => setFormData({ ...formData, mttrWarningThreshold: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-red-600">Critical</Label>
            <Input
              type="number"
              placeholder="VD: 60"
              value={formData.mttrCriticalThreshold || ''}
              onChange={(e) => setFormData({ ...formData, mttrCriticalThreshold: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>
      </div>

      {/* MTBF Thresholds */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Ngưỡng MTBF (phút) - Cảnh báo khi MTBF thấp hơn
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-yellow-600">Warning</Label>
            <Input
              type="number"
              placeholder="VD: 1440 (24h)"
              value={formData.mtbfWarningThreshold || ''}
              onChange={(e) => setFormData({ ...formData, mtbfWarningThreshold: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-red-600">Critical</Label>
            <Input
              type="number"
              placeholder="VD: 720 (12h)"
              value={formData.mtbfCriticalThreshold || ''}
              onChange={(e) => setFormData({ ...formData, mtbfCriticalThreshold: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>
      </div>

      {/* Availability Thresholds */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Ngưỡng Availability (%) - Cảnh báo khi Availability thấp hơn
        </Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-sm text-yellow-600">Warning</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="VD: 95"
              value={formData.availabilityWarningThreshold ? (formData.availabilityWarningThreshold * 100).toFixed(1) : ''}
              onChange={(e) => setFormData({ ...formData, availabilityWarningThreshold: e.target.value ? Number(e.target.value) / 100 : null })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm text-red-600">Critical</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="VD: 90"
              value={formData.availabilityCriticalThreshold ? (formData.availabilityCriticalThreshold * 100).toFixed(1) : ''}
              onChange={(e) => setFormData({ ...formData, availabilityCriticalThreshold: e.target.value ? Number(e.target.value) / 100 : null })}
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Cài đặt thông báo
        </Label>
        <div className="space-y-2">
          <Label className="text-sm">Email (phân cách bằng dấu phẩy)</Label>
          <Textarea
            placeholder="email1@example.com, email2@example.com"
            value={formData.alertEmails}
            onChange={(e) => setFormData({ ...formData, alertEmails: e.target.value })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Gửi qua Telegram</Label>
          <Switch
            checked={formData.alertTelegram === 1}
            onCheckedChange={(checked) => setFormData({ ...formData, alertTelegram: checked ? 1 : 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Thời gian chờ giữa các cảnh báo (phút)</Label>
          <Input
            type="number"
            value={formData.cooldownMinutes}
            onChange={(e) => setFormData({ ...formData, cooldownMinutes: Number(e.target.value) })}
          />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Lưu
        </Button>
      </DialogFooter>
    </div>
  );
}
