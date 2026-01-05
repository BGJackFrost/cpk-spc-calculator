import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  RefreshCw,
  Search,
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  CheckCircle,
  Clock,
  Filter,
} from 'lucide-react';

interface AlarmFormData {
  deviceId: number;
  alarmType: string;
  alarmCode: string;
  message: string;
  value?: number;
  thresholdValue?: number;
}

const defaultFormData: AlarmFormData = {
  deviceId: 0,
  alarmType: 'warning',
  alarmCode: '',
  message: '',
  value: undefined,
  thresholdValue: undefined,
};

export default function IotAlarmCrud() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<AlarmFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('all');
  const [selectedAlarms, setSelectedAlarms] = useState<number[]>([]);

  const { data: alarms, refetch, isLoading } = trpc.iotCrud.getAlarms.useQuery({
    alarmType: typeFilter !== 'all' ? typeFilter : undefined,
    acknowledged: acknowledgedFilter === 'all' ? undefined : acknowledgedFilter === 'yes',
    resolved: resolvedFilter === 'all' ? undefined : resolvedFilter === 'yes',
  });

  const { data: stats, refetch: refetchStats } = trpc.iotCrud.getAlarmStats.useQuery();
  const { data: devices } = trpc.iotCrud.getDevices.useQuery({});

  const createMutation = trpc.iotCrud.createAlarm.useMutation({
    onSuccess: () => {
      toast.success('Cảnh báo đã được tạo thành công');
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      refetch();
      refetchStats();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const acknowledgeMutation = trpc.iotCrud.acknowledgeAlarm.useMutation({
    onSuccess: () => {
      toast.success('Đã xác nhận cảnh báo');
      refetch();
      refetchStats();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const resolveMutation = trpc.iotCrud.resolveAlarm.useMutation({
    onSuccess: () => {
      toast.success('Đã xử lý cảnh báo');
      refetch();
      refetchStats();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const batchAcknowledgeMutation = trpc.iotCrud.batchAcknowledgeAlarms.useMutation({
    onSuccess: () => {
      toast.success(`Đã xác nhận ${selectedAlarms.length} cảnh báo`);
      setSelectedAlarms([]);
      refetch();
      refetchStats();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const handleCreate = () => {
    if (!formData.deviceId || !formData.alarmCode || !formData.message) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleAcknowledge = (id: number) => {
    acknowledgeMutation.mutate({ id });
  };

  const handleResolve = (id: number) => {
    resolveMutation.mutate({ id });
  };

  const handleBatchAcknowledge = () => {
    if (selectedAlarms.length === 0) {
      toast.error('Vui lòng chọn ít nhất một cảnh báo');
      return;
    }
    batchAcknowledgeMutation.mutate({ ids: selectedAlarms });
  };

  const toggleSelectAlarm = (id: number) => {
    setSelectedAlarms((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!alarms) return;
    if (selectedAlarms.length === alarms.length) {
      setSelectedAlarms([]);
    } else {
      setSelectedAlarms(alarms.map((a: any) => a.id));
    }
  };

  const getAlarmTypeBadge = (type: string) => {
    switch (type) {
      case 'critical':
        return <Badge variant="destructive"><AlertOctagon className="h-3 w-3 mr-1" />Critical</Badge>;
      case 'error':
        return <Badge className="bg-red-500"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getDeviceName = (deviceId: number) => {
    const device = devices?.find((d: any) => d.id === deviceId);
    return device ? `${device.deviceName} (${device.deviceCode})` : `Device #${deviceId}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quản lý Cảnh báo IoT</h1>
            <p className="text-muted-foreground mt-1">Theo dõi và xử lý cảnh báo từ thiết bị IoT</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { refetch(); refetchStats(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setFormData(defaultFormData)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo cảnh báo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tạo cảnh báo mới</DialogTitle>
                  <DialogDescription>Tạo cảnh báo thủ công cho thiết bị IoT</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div>
                    <Label>Thiết bị *</Label>
                    <Select
                      value={formData.deviceId ? String(formData.deviceId) : ''}
                      onValueChange={(v) => setFormData({ ...formData, deviceId: parseInt(v) })}
                    >
                      <SelectTrigger><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger>
                      <SelectContent>
                        {devices?.map((device: any) => (
                          <SelectItem key={device.id} value={String(device.id)}>
                            {device.deviceName} ({device.deviceCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Loại cảnh báo *</Label>
                      <Select
                        value={formData.alarmType}
                        onValueChange={(v) => setFormData({ ...formData, alarmType: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Mã cảnh báo *</Label>
                      <Input
                        value={formData.alarmCode}
                        onChange={(e) => setFormData({ ...formData, alarmCode: e.target.value })}
                        placeholder="VD: TEMP_HIGH"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Nội dung cảnh báo *</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Mô tả chi tiết cảnh báo..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Giá trị hiện tại</Label>
                      <Input
                        type="number"
                        value={formData.value || ''}
                        onChange={(e) => setFormData({ ...formData, value: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="VD: 85.5"
                      />
                    </div>
                    <div>
                      <Label>Ngưỡng</Label>
                      <Input
                        type="number"
                        value={formData.thresholdValue || ''}
                        onChange={(e) => setFormData({ ...formData, thresholdValue: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="VD: 80"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Đang tạo...' : 'Tạo cảnh báo'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tổng cảnh báo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />Chưa xác nhận
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats?.unacknowledged || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />Chưa xử lý
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats?.unresolved || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-red-600" />Critical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats?.critical || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats?.error || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />Warning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.warning || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={acknowledgedFilter} onValueChange={setAcknowledgedFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Xác nhận" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="no">Chưa xác nhận</SelectItem>
                  <SelectItem value="yes">Đã xác nhận</SelectItem>
                </SelectContent>
              </Select>
              <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Xử lý" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="no">Chưa xử lý</SelectItem>
                  <SelectItem value="yes">Đã xử lý</SelectItem>
                </SelectContent>
              </Select>
              {selectedAlarms.length > 0 && (
                <Button onClick={handleBatchAcknowledge} disabled={batchAcknowledgeMutation.isPending}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Xác nhận {selectedAlarms.length} cảnh báo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alarms Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách cảnh báo</CardTitle>
            <CardDescription>Theo dõi và xử lý tất cả cảnh báo từ thiết bị IoT</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={alarms?.length > 0 && selectedAlarms.length === alarms?.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Thiết bị</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Mã</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Giá trị</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : alarms?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Không có cảnh báo nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  alarms?.map((alarm: any) => (
                    <TableRow key={alarm.id} className={alarm.alarmType === 'critical' ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAlarms.includes(alarm.id)}
                          onCheckedChange={() => toggleSelectAlarm(alarm.id)}
                        />
                      </TableCell>
                      <TableCell>{getDeviceName(alarm.deviceId)}</TableCell>
                      <TableCell>{getAlarmTypeBadge(alarm.alarmType)}</TableCell>
                      <TableCell className="font-mono">{alarm.alarmCode}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{alarm.message}</TableCell>
                      <TableCell>
                        {alarm.value && alarm.threshold
                          ? `${alarm.value} / ${alarm.threshold}`
                          : alarm.value || '-'}
                      </TableCell>
                      <TableCell>
                        {alarm.createdAt
                          ? new Date(alarm.createdAt).toLocaleString('vi-VN')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {alarm.acknowledgedAt ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />Đã xác nhận
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-500">
                              <Bell className="h-3 w-3 mr-1" />Chưa xác nhận
                            </Badge>
                          )}
                          {alarm.resolvedAt ? (
                            <Badge variant="outline" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />Đã xử lý
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-500">
                              <Clock className="h-3 w-3 mr-1" />Chưa xử lý
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!alarm.acknowledgedAt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(alarm.id)}
                              disabled={acknowledgeMutation.isPending}
                            >
                              Xác nhận
                            </Button>
                          )}
                          {!alarm.resolvedAt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolve(alarm.id)}
                              disabled={resolveMutation.isPending}
                            >
                              Xử lý
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
