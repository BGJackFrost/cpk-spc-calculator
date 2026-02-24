import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, Clock, Plus, Play, Pause, Trash2, RefreshCw, Settings, History, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

const DAYS_OF_WEEK = [
  { value: 0, label: 'CN' },
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
];

export default function IoTScheduledOTA() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('schedules');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    firmwarePackageId: '',
    targetDeviceIds: [] as number[],
    scheduleType: 'once' as 'once' | 'daily' | 'weekly' | 'monthly',
    scheduledTime: '02:00',
    scheduledDate: '',
    daysOfWeek: [] as number[],
    dayOfMonth: 1,
    offPeakOnly: true,
    offPeakStartTime: '22:00',
    offPeakEndTime: '06:00',
    maxConcurrentDevices: 10,
    retryOnFailure: true,
    maxRetries: 3,
    notifyBeforeMinutes: 30,
  });
  
  // Queries
  const { data: schedulesData, isLoading, refetch } = trpc.scheduledOta.getSchedules.useQuery({});
  const { data: firmwarePackages } = trpc.firmwareOta?.getFirmwarePackages?.useQuery({}) || { data: null };
  const { data: devices } = trpc.iotDeviceManagement?.getDevices?.useQuery({}) || { data: null };
  
  // Mutations
  const createMutation = trpc.scheduledOta.createSchedule.useMutation({
    onSuccess: () => {
      toast.success('Đã tạo lịch cập nhật thành công');
      setIsCreateOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const pauseMutation = trpc.scheduledOta.pauseSchedule.useMutation({
    onSuccess: () => {
      toast.success('Đã tạm dừng lịch cập nhật');
      refetch();
    },
  });
  
  const resumeMutation = trpc.scheduledOta.resumeSchedule.useMutation({
    onSuccess: () => {
      toast.success('Đã kích hoạt lại lịch cập nhật');
      refetch();
    },
  });
  
  const deleteMutation = trpc.scheduledOta.deleteSchedule.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa lịch cập nhật');
      refetch();
    },
  });
  
  const executeNowMutation = trpc.scheduledOta.executeScheduleNow.useMutation({
    onSuccess: () => {
      toast.success('Đã bắt đầu cập nhật ngay');
      refetch();
    },
  });
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      firmwarePackageId: '',
      targetDeviceIds: [],
      scheduleType: 'once',
      scheduledTime: '02:00',
      scheduledDate: '',
      daysOfWeek: [],
      dayOfMonth: 1,
      offPeakOnly: true,
      offPeakStartTime: '22:00',
      offPeakEndTime: '06:00',
      maxConcurrentDevices: 10,
      retryOnFailure: true,
      maxRetries: 3,
      notifyBeforeMinutes: 30,
    });
  };
  
  const handleCreate = () => {
    if (!formData.name || !formData.firmwarePackageId || formData.targetDeviceIds.length === 0) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    
    createMutation.mutate({
      ...formData,
      firmwarePackageId: parseInt(formData.firmwarePackageId),
      scheduledDate: formData.scheduleType === 'once' ? formData.scheduledDate : undefined,
      daysOfWeek: formData.scheduleType === 'weekly' ? formData.daysOfWeek : undefined,
      dayOfMonth: formData.scheduleType === 'monthly' ? formData.dayOfMonth : undefined,
    });
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Đang hoạt động</Badge>;
      case 'paused':
        return <Badge variant="secondary">Tạm dừng</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500">Hoàn thành</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getScheduleTypeLabel = (type: string) => {
    switch (type) {
      case 'once': return 'Một lần';
      case 'daily': return 'Hàng ngày';
      case 'weekly': return 'Hàng tuần';
      case 'monthly': return 'Hàng tháng';
      default: return type;
    }
  };
  
  const schedules = schedulesData?.schedules || [];
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-500" />
              Lên lịch Cập nhật OTA
            </h1>
            <p className="text-muted-foreground">
              Lên lịch cập nhật firmware tự động vào giờ thấp điểm
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo lịch mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Tạo lịch cập nhật OTA</DialogTitle>
                  <DialogDescription>
                    Lên lịch cập nhật firmware cho các thiết bị IoT
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tên lịch *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: Cập nhật firmware v2.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Firmware Package *</Label>
                      <Select
                        value={formData.firmwarePackageId}
                        onValueChange={(v) => setFormData({ ...formData, firmwarePackageId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn firmware" />
                        </SelectTrigger>
                        <SelectContent>
                          {(firmwarePackages?.packages as any[])?.map((pkg: any) => (
                            <SelectItem key={pkg.id} value={pkg.id.toString()}>
                              {pkg.name} v{pkg.version}
                            </SelectItem>
                          )) || (
                            <SelectItem value="demo">Demo Firmware v1.0</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả về bản cập nhật..."
                    />
                  </div>
                  
                  {/* Schedule Type */}
                  <div className="space-y-2">
                    <Label>Loại lịch</Label>
                    <Select
                      value={formData.scheduleType}
                      onValueChange={(v: any) => setFormData({ ...formData, scheduleType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">Một lần</SelectItem>
                        <SelectItem value="daily">Hàng ngày</SelectItem>
                        <SelectItem value="weekly">Hàng tuần</SelectItem>
                        <SelectItem value="monthly">Hàng tháng</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Time Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Thời gian chạy</Label>
                      <Input
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      />
                    </div>
                    
                    {formData.scheduleType === 'once' && (
                      <div className="space-y-2">
                        <Label>Ngày chạy</Label>
                        <Input
                          type="date"
                          value={formData.scheduledDate}
                          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                        />
                      </div>
                    )}
                    
                    {formData.scheduleType === 'monthly' && (
                      <div className="space-y-2">
                        <Label>Ngày trong tháng</Label>
                        <Select
                          value={formData.dayOfMonth.toString()}
                          onValueChange={(v) => setFormData({ ...formData, dayOfMonth: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 28 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                Ngày {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  {/* Weekly days */}
                  {formData.scheduleType === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Ngày trong tuần</Label>
                      <div className="flex gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <Button
                            key={day.value}
                            type="button"
                            variant={formData.daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newDays = formData.daysOfWeek.includes(day.value)
                                ? formData.daysOfWeek.filter((d) => d !== day.value)
                                : [...formData.daysOfWeek, day.value];
                              setFormData({ ...formData, daysOfWeek: newDays });
                            }}
                          >
                            {day.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Off-peak settings */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Giờ thấp điểm</CardTitle>
                        <Switch
                          checked={formData.offPeakOnly}
                          onCheckedChange={(v) => setFormData({ ...formData, offPeakOnly: v })}
                        />
                      </div>
                      <CardDescription>
                        Chỉ chạy cập nhật trong khung giờ thấp điểm
                      </CardDescription>
                    </CardHeader>
                    {formData.offPeakOnly && (
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs">Bắt đầu</Label>
                            <Input
                              type="time"
                              value={formData.offPeakStartTime}
                              onChange={(e) => setFormData({ ...formData, offPeakStartTime: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Kết thúc</Label>
                            <Input
                              type="time"
                              value={formData.offPeakEndTime}
                              onChange={(e) => setFormData({ ...formData, offPeakEndTime: e.target.value })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                  
                  {/* Device selection */}
                  <div className="space-y-2">
                    <Label>Thiết bị mục tiêu *</Label>
                    <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                      {(devices?.devices as any[])?.map((device: any) => (
                        <div key={device.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.targetDeviceIds.includes(device.id)}
                            onCheckedChange={(checked) => {
                              const newIds = checked
                                ? [...formData.targetDeviceIds, device.id]
                                : formData.targetDeviceIds.filter((id) => id !== device.id);
                              setFormData({ ...formData, targetDeviceIds: newIds });
                            }}
                          />
                          <span className="text-sm">{device.name}</span>
                          <Badge variant="outline" className="text-xs">{device.deviceType}</Badge>
                        </div>
                      )) || (
                        <>
                          {[1, 2, 3, 4, 5].map((id) => (
                            <div key={id} className="flex items-center gap-2">
                              <Checkbox
                                checked={formData.targetDeviceIds.includes(id)}
                                onCheckedChange={(checked) => {
                                  const newIds = checked
                                    ? [...formData.targetDeviceIds, id]
                                    : formData.targetDeviceIds.filter((i) => i !== id);
                                  setFormData({ ...formData, targetDeviceIds: newIds });
                                }}
                              />
                              <span className="text-sm">Device {id}</span>
                              <Badge variant="outline" className="text-xs">sensor</Badge>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Đã chọn {formData.targetDeviceIds.length} thiết bị
                    </p>
                  </div>
                  
                  {/* Advanced settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Số thiết bị đồng thời</Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={formData.maxConcurrentDevices}
                        onChange={(e) => setFormData({ ...formData, maxConcurrentDevices: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thông báo trước (phút)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={1440}
                        value={formData.notifyBeforeMinutes}
                        onChange={(e) => setFormData({ ...formData, notifyBeforeMinutes: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.retryOnFailure}
                        onCheckedChange={(v) => setFormData({ ...formData, retryOnFailure: v })}
                      />
                      <Label>Tự động thử lại khi lỗi</Label>
                    </div>
                    {formData.retryOnFailure && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Số lần thử:</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={formData.maxRetries}
                          onChange={(e) => setFormData({ ...formData, maxRetries: parseInt(e.target.value) })}
                          className="w-20"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Hủy
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Tạo lịch
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng lịch</p>
                  <p className="text-2xl font-bold">{schedules.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                  <p className="text-2xl font-bold text-green-500">
                    {schedules.filter((s: any) => s.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tạm dừng</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {schedules.filter((s: any) => s.status === 'paused').length}
                  </p>
                </div>
                <Pause className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoàn thành</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {schedules.filter((s: any) => s.status === 'completed').length}
                  </p>
                </div>
                <History className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Schedules Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách lịch cập nhật</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : schedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Chưa có lịch cập nhật nào</p>
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo lịch đầu tiên
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Thiết bị</TableHead>
                    <TableHead>Lần chạy tiếp</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thống kê</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule: any) => (
                    <TableRow key={schedule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{schedule.name}</p>
                          {schedule.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {schedule.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getScheduleTypeLabel(schedule.scheduleType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {schedule.scheduledTime}
                        </div>
                        {schedule.offPeakOnly && (
                          <p className="text-xs text-muted-foreground">
                            Off-peak: {schedule.offPeakStartTime}-{schedule.offPeakEndTime}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {(schedule.targetDeviceIds as number[])?.length || 0} thiết bị
                      </TableCell>
                      <TableCell>
                        {schedule.nextRunAt ? (
                          <span className="text-sm">
                            {format(new Date(schedule.nextRunAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="text-green-500">{schedule.successfulRuns || 0} ✓</span>
                          {' / '}
                          <span className="text-red-500">{schedule.failedRuns || 0} ✗</span>
                          {' / '}
                          <span>{schedule.totalRuns || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {schedule.status === 'active' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => pauseMutation.mutate({ id: schedule.id })}
                              title="Tạm dừng"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : schedule.status === 'paused' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => resumeMutation.mutate({ id: schedule.id })}
                              title="Kích hoạt"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : null}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => executeNowMutation.mutate({ id: schedule.id })}
                            title="Chạy ngay"
                            disabled={schedule.status !== 'active'}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Bạn có chắc muốn xóa lịch này?')) {
                                deleteMutation.mutate({ id: schedule.id });
                              }
                            }}
                            title="Xóa"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
