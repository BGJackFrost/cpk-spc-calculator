import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  AlertTriangle,
  Settings,
  Cpu,
  Thermometer,
  Gauge,
  Activity,
  Server,
  Radio,
} from 'lucide-react';

interface DeviceFormData {
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  location: string;
  ipAddress: string;
  macAddress: string;
  status: string;
}

const defaultFormData: DeviceFormData = {
  deviceCode: '',
  deviceName: '',
  deviceType: 'sensor',
  manufacturer: '',
  model: '',
  serialNumber: '',
  firmwareVersion: '',
  location: '',
  ipAddress: '',
  macAddress: '',
  status: 'offline',
};

export default function IotDeviceCrud() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [formData, setFormData] = useState<DeviceFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: devices, refetch, isLoading } = trpc.iotCrud.getDevices.useQuery({
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    deviceType: typeFilter !== 'all' ? typeFilter : undefined,
  });

  const { data: stats, refetch: refetchStats } = trpc.iotCrud.getDeviceStats.useQuery();

  const createMutation = trpc.iotCrud.createDevice.useMutation({
    onSuccess: () => {
      toast.success('Thiết bị đã được tạo thành công');
      setIsCreateOpen(false);
      setFormData(defaultFormData);
      refetch();
      refetchStats();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const updateMutation = trpc.iotCrud.updateDevice.useMutation({
    onSuccess: () => {
      toast.success('Thiết bị đã được cập nhật');
      setIsEditOpen(false);
      setSelectedDevice(null);
      refetch();
      refetchStats();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const deleteMutation = trpc.iotCrud.deleteDevice.useMutation({
    onSuccess: () => {
      toast.success('Thiết bị đã được xóa');
      setIsDeleteOpen(false);
      setSelectedDevice(null);
      refetch();
      refetchStats();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const handleCreate = () => {
    if (!formData.deviceCode || !formData.deviceName) {
      toast.error('Vui lòng nhập mã thiết bị và tên thiết bị');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedDevice) return;
    updateMutation.mutate({
      id: selectedDevice.id,
      ...formData,
    });
  };

  const handleDelete = () => {
    if (!selectedDevice) return;
    deleteMutation.mutate({ id: selectedDevice.id });
  };

  const openEditDialog = (device: any) => {
    setSelectedDevice(device);
    setFormData({
      deviceCode: device.deviceCode || '',
      deviceName: device.deviceName || '',
      deviceType: device.deviceType || 'sensor',
      manufacturer: device.manufacturer || '',
      model: device.model || '',
      serialNumber: device.serialNumber || '',
      firmwareVersion: device.firmwareVersion || '',
      location: device.location || '',
      ipAddress: device.ipAddress || '',
      macAddress: device.macAddress || '',
      status: device.status || 'offline',
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (device: any) => {
    setSelectedDevice(device);
    setIsDeleteOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge className="bg-green-500"><Wifi className="h-3 w-3 mr-1" />Online</Badge>;
      case 'offline':
        return <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-500"><Settings className="h-3 w-3 mr-1" />Maintenance</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'sensor':
        return <Thermometer className="h-4 w-4" />;
      case 'plc':
        return <Cpu className="h-4 w-4" />;
      case 'gateway':
        return <Server className="h-4 w-4" />;
      case 'camera':
        return <Radio className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const DeviceForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Mã thiết bị *</Label>
          <Input
            value={formData.deviceCode}
            onChange={(e) => setFormData({ ...formData, deviceCode: e.target.value })}
            placeholder="VD: TEMP-001"
          />
        </div>
        <div>
          <Label>Tên thiết bị *</Label>
          <Input
            value={formData.deviceName}
            onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
            placeholder="VD: Cảm biến nhiệt độ Line 1"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Loại thiết bị</Label>
          <Select value={formData.deviceType} onValueChange={(v) => setFormData({ ...formData, deviceType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sensor">Cảm biến</SelectItem>
              <SelectItem value="plc">PLC</SelectItem>
              <SelectItem value="gateway">Gateway</SelectItem>
              <SelectItem value="camera">Camera</SelectItem>
              <SelectItem value="meter">Đồng hồ đo</SelectItem>
              <SelectItem value="other">Khác</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Trạng thái</Label>
          <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="maintenance">Bảo trì</SelectItem>
              <SelectItem value="error">Lỗi</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nhà sản xuất</Label>
          <Input
            value={formData.manufacturer}
            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
            placeholder="VD: Siemens"
          />
        </div>
        <div>
          <Label>Model</Label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="VD: S7-1200"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Serial Number</Label>
          <Input
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            placeholder="VD: SN123456"
          />
        </div>
        <div>
          <Label>Firmware Version</Label>
          <Input
            value={formData.firmwareVersion}
            onChange={(e) => setFormData({ ...formData, firmwareVersion: e.target.value })}
            placeholder="VD: v2.1.0"
          />
        </div>
      </div>
      <div>
        <Label>Vị trí</Label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="VD: Nhà máy A - Dây chuyền 1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>IP Address</Label>
          <Input
            value={formData.ipAddress}
            onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
            placeholder="VD: 192.168.1.100"
          />
        </div>
        <div>
          <Label>MAC Address</Label>
          <Input
            value={formData.macAddress}
            onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
            placeholder="VD: AA:BB:CC:DD:EE:FF"
          />
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Quản lý Thiết bị IoT</h1>
            <p className="text-muted-foreground mt-1">Thêm, sửa, xóa thiết bị IoT trong hệ thống</p>
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
                  Thêm thiết bị
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Thêm thiết bị mới</DialogTitle>
                  <DialogDescription>Nhập thông tin thiết bị IoT mới</DialogDescription>
                </DialogHeader>
                <DeviceForm />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Đang tạo...' : 'Tạo thiết bị'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wifi className="h-4 w-4 text-green-500" />Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats?.online || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-gray-500" />Offline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats?.offline || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />Lỗi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats?.error || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Settings className="h-4 w-4 text-yellow-500" />Bảo trì
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats?.maintenance || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bộ lọc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo mã hoặc tên..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                  <SelectItem value="error">Lỗi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Loại thiết bị" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="sensor">Cảm biến</SelectItem>
                  <SelectItem value="plc">PLC</SelectItem>
                  <SelectItem value="gateway">Gateway</SelectItem>
                  <SelectItem value="camera">Camera</SelectItem>
                  <SelectItem value="meter">Đồng hồ đo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Devices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách thiết bị</CardTitle>
            <CardDescription>Quản lý tất cả thiết bị IoT trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã thiết bị</TableHead>
                  <TableHead>Tên thiết bị</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Nhà SX / Model</TableHead>
                  <TableHead>Vị trí</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Đang tải...
                    </TableCell>
                  </TableRow>
                ) : devices?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Chưa có thiết bị nào. Nhấn "Thêm thiết bị" để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  devices?.map((device: any) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-mono">{device.deviceCode}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.deviceType)}
                          {device.deviceName}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{device.deviceType}</TableCell>
                      <TableCell>
                        {device.manufacturer && device.model
                          ? `${device.manufacturer} / ${device.model}`
                          : device.manufacturer || device.model || '-'}
                      </TableCell>
                      <TableCell>{device.location || '-'}</TableCell>
                      <TableCell>{getStatusBadge(device.status)}</TableCell>
                      <TableCell>
                        {device.lastSeen
                          ? new Date(device.lastSeen).toLocaleString('vi-VN')
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(device)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(device)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa thiết bị</DialogTitle>
              <DialogDescription>Cập nhật thông tin thiết bị {selectedDevice?.deviceCode}</DialogDescription>
            </DialogHeader>
            <DeviceForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Hủy</Button>
              <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận xóa</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn xóa thiết bị <strong>{selectedDevice?.deviceName}</strong> ({selectedDevice?.deviceCode})?
                Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Hủy</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa thiết bị'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
