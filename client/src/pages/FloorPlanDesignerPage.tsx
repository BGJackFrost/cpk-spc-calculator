import React, { useState, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FloorPlanDesigner, FloorPlanConfig, FloorPlanItem, IoTDeviceForLayout } from '@/components/FloorPlanDesigner';
import { IoTDeviceDetailPopup, IoTDeviceForPopup } from '@/components/IoTDeviceDetailPopup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import {
  Plus,
  FolderOpen,
  Trash2,
  Edit,
  Eye,
  Map,
  Save,
  Download,
  Upload,
  FileJson,
} from 'lucide-react';

// Interface for exported JSON format
interface ExportedFloorPlan {
  version: string;
  exportedAt: string;
  name: string;
  width: number;
  height: number;
  gridSize: number;
  items: FloorPlanItem[];
  layers?: any[];
  groups?: any[];
}

export default function FloorPlanDesignerPage() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [isDesigning, setIsDesigning] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<FloorPlanConfig | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanLineId, setNewPlanLineId] = useState<string>('');
  const [importData, setImportData] = useState<ExportedFloorPlan | null>(null);
  const [importFileName, setImportFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // IoT Device Popup state
  const [selectedIoTDevice, setSelectedIoTDevice] = useState<IoTDeviceForPopup | null>(null);
  const [isIoTPopupOpen, setIsIoTPopupOpen] = useState(false);

  // Auto-refresh interval (30 giây)
  const AUTO_REFRESH_INTERVAL = 30000;

  // Queries
  const { data: floorPlans, refetch: refetchPlans } = trpc.floorPlan.list.useQuery();
  const { data: productionLines } = trpc.productionLine.list.useQuery();
  const { data: machines } = trpc.machine.list.useQuery();
  // Auto-refresh IoT devices mỗi 30 giây khi đang thiết kế
  const { data: iotDevicesData, refetch: refetchIoTDevices } = trpc.iotCrud.getDevices.useQuery(
    {},
    {
      refetchInterval: isDesigning ? AUTO_REFRESH_INTERVAL : false,
      refetchIntervalInBackground: false,
    }
  );

  // Mutations
  const createMutation = trpc.floorPlan.create.useMutation({
    onSuccess: (result) => {
      toast.success('Đã tạo sơ đồ mới');
      setIsCreateDialogOpen(false);
      refetchPlans();
      // Open designer with new plan
      setSelectedPlanId(result.id);
      setCurrentConfig({
        id: result.id,
        name: newPlanName,
        width: 1200,
        height: 800,
        gridSize: 20,
        showGrid: true,
        items: [],
      });
      setIsDesigning(true);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.floorPlan.update.useMutation({
    onSuccess: () => {
      toast.success('Đã lưu sơ đồ');
      refetchPlans();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.floorPlan.delete.useMutation({
    onSuccess: () => {
      toast.success('Đã xóa sơ đồ');
      refetchPlans();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleCreatePlan = () => {
    if (!newPlanName.trim()) {
      toast.error('Vui lòng nhập tên sơ đồ');
      return;
    }
    createMutation.mutate({
      name: newPlanName,
      productionLineId: newPlanLineId && newPlanLineId !== 'none' ? parseInt(newPlanLineId) : undefined,
      width: 1200,
      height: 800,
      gridSize: 20,
    });
  };

  const handleOpenPlan = (plan: any) => {
    const items: FloorPlanItem[] = (plan.machinePositions as any[] || []).map((pos: any, index: number) => ({
      id: pos.id || `item-${index}`,
      type: pos.type || 'machine',
      name: pos.name || `Item ${index + 1}`,
      x: pos.x || 0,
      y: pos.y || 0,
      width: pos.width || 80,
      height: pos.height || 60,
      rotation: pos.rotation || 0,
      color: pos.color || '#3b82f6',
      machineId: pos.machineId,
      iotDeviceId: pos.iotDeviceId,
      iotDeviceCode: pos.iotDeviceCode,
      iotDeviceType: pos.iotDeviceType,
      status: pos.status,
      layerId: pos.layerId,
      groupId: pos.groupId,
      metadata: pos.metadata,
    }));

    setCurrentConfig({
      id: plan.id,
      name: plan.name,
      width: plan.width || 1200,
      height: plan.height || 800,
      gridSize: plan.gridSize || 20,
      showGrid: true,
      items,
    });
    setSelectedPlanId(plan.id);
    setIsDesigning(true);
  };

  const handleSaveConfig = (config: FloorPlanConfig) => {
    if (!config.id) {
      toast.error('Không thể lưu: Sơ đồ chưa được tạo');
      return;
    }

    const machinePositions = config.items.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation,
      color: item.color,
      machineId: item.machineId,
      iotDeviceId: item.iotDeviceId,
      iotDeviceCode: item.iotDeviceCode,
      iotDeviceType: item.iotDeviceType,
      status: item.status,
      layerId: item.layerId,
      groupId: item.groupId,
      metadata: item.metadata,
    }));

    updateMutation.mutate({
      id: config.id,
      name: config.name,
      width: config.width,
      height: config.height,
      gridSize: config.gridSize,
      machinePositions,
    });
  };

  const handleDeletePlan = (id: number) => {
    if (confirm('Xác nhận xóa sơ đồ này?')) {
      deleteMutation.mutate({ id });
    }
  };

  // Export layout to JSON file
  const handleExportLayout = (plan: any) => {
    const items: FloorPlanItem[] = (plan.machinePositions as any[] || []).map((pos: any, index: number) => ({
      id: pos.id || `item-${index}`,
      type: pos.type || 'machine',
      name: pos.name || `Item ${index + 1}`,
      x: pos.x || 0,
      y: pos.y || 0,
      width: pos.width || 80,
      height: pos.height || 60,
      rotation: pos.rotation || 0,
      color: pos.color || '#3b82f6',
      machineId: pos.machineId,
      iotDeviceId: pos.iotDeviceId,
      iotDeviceCode: pos.iotDeviceCode,
      iotDeviceType: pos.iotDeviceType,
      status: pos.status,
      layerId: pos.layerId,
      groupId: pos.groupId,
      metadata: pos.metadata,
    }));

    const exportData: ExportedFloorPlan = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      name: plan.name,
      width: plan.width || 1200,
      height: plan.height || 800,
      gridSize: plan.gridSize || 20,
      items,
      layers: plan.layers,
      groups: plan.groups,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `floor-plan-${plan.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Đã xuất sơ đồ ra file JSON');
  };

  // Handle file input for import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Vui lòng chọn file JSON');
      return;
    }

    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ExportedFloorPlan;

        // Validate required fields
        if (!data.name || !data.items || !Array.isArray(data.items)) {
          toast.error('File JSON không hợp lệ: thiếu trường bắt buộc (name, items)');
          return;
        }

        // Validate items structure
        for (const item of data.items) {
          if (typeof item.x !== 'number' || typeof item.y !== 'number') {
            toast.error('File JSON không hợp lệ: items phải có tọa độ x, y');
            return;
          }
        }

        setImportData(data);
        setNewPlanName(data.name + ' (Imported)');
        setIsImportDialogOpen(true);
      } catch (err) {
        toast.error('Không thể đọc file JSON: định dạng không hợp lệ');
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Import layout from JSON
  const handleImportLayout = () => {
    if (!importData) return;

    createMutation.mutate({
      name: newPlanName,
      productionLineId: newPlanLineId && newPlanLineId !== 'none' ? parseInt(newPlanLineId) : undefined,
      width: importData.width || 1200,
      height: importData.height || 800,
      gridSize: importData.gridSize || 20,
      machinePositions: importData.items.map((item) => ({
        id: item.id,
        type: item.type,
        name: item.name,
        x: item.x,
        y: item.y,
        width: item.width || 80,
        height: item.height || 60,
        rotation: item.rotation || 0,
        color: item.color || '#3b82f6',
        machineId: item.machineId,
        status: item.status,
        metadata: item.metadata,
      })),
    }, {
      onSuccess: () => {
        setIsImportDialogOpen(false);
        setImportData(null);
        setImportFileName('');
        toast.success('Đã import sơ đồ thành công');
      },
    });
  };

  // Convert machines to format for designer
  const machineList = machines?.map((m: any) => ({
    id: m.id,
    name: m.name,
    status: 'idle' as const,
  })) || [];

  // Convert IoT devices to format for designer
  const iotDeviceList: IoTDeviceForLayout[] = (iotDevicesData as any[])?.map((d: any) => ({
    id: d.id,
    deviceCode: d.deviceCode || d.device_code || '',
    deviceName: d.deviceName || d.device_name || '',
    deviceType: d.deviceType || d.device_type || 'other',
    status: (d.status || 'offline') as 'online' | 'offline' | 'error' | 'maintenance',
    location: d.location || '',
  })) || [];

  // Handler khi click vào IoT device trên sơ đồ
  const handleIoTDeviceClick = useCallback((device: IoTDeviceForLayout) => {
    // Tìm thông tin đầy đủ của device từ iotDevicesData
    const fullDevice = (iotDevicesData as any[])?.find((d: any) => d.id === device.id);
    if (fullDevice) {
      const popupDevice: IoTDeviceForPopup = {
        id: fullDevice.id,
        deviceCode: fullDevice.deviceCode || fullDevice.device_code || '',
        deviceName: fullDevice.deviceName || fullDevice.device_name || '',
        deviceType: fullDevice.deviceType || fullDevice.device_type || 'other',
        status: (fullDevice.status || 'offline') as 'online' | 'offline' | 'error' | 'maintenance',
        location: fullDevice.location || '',
        lastHeartbeat: fullDevice.lastHeartbeat || fullDevice.last_heartbeat,
        manufacturer: fullDevice.manufacturer,
        model: fullDevice.model,
        firmwareVersion: fullDevice.firmwareVersion || fullDevice.firmware_version,
        ipAddress: fullDevice.ipAddress || fullDevice.ip_address,
        macAddress: fullDevice.macAddress || fullDevice.mac_address,
        healthScore: fullDevice.healthScore || fullDevice.health_score,
      };
      setSelectedIoTDevice(popupDevice);
      setIsIoTPopupOpen(true);
    }
  }, [iotDevicesData]);

  if (isDesigning && currentConfig) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-120px)]">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Thiết kế: {currentConfig.name}</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (currentConfig) {
                    const exportData: ExportedFloorPlan = {
                      version: '1.0',
                      exportedAt: new Date().toISOString(),
                      name: currentConfig.name,
                      width: currentConfig.width,
                      height: currentConfig.height,
                      gridSize: currentConfig.gridSize,
                      items: currentConfig.items,
                      layers: currentConfig.layers,
                      groups: currentConfig.groups,
                    };
                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `floor-plan-${currentConfig.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success('Đã xuất sơ đồ ra file JSON');
                  }
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
              <Button variant="outline" onClick={() => setIsDesigning(false)}>
                Quay lại danh sách
              </Button>
            </div>
          </div>
          <FloorPlanDesigner
            initialConfig={currentConfig}
            onSave={handleSaveConfig}
            machines={machineList}
            iotDevices={iotDeviceList}
            autoRefreshInterval={AUTO_REFRESH_INTERVAL}
            onIotDeviceClick={handleIoTDeviceClick}
          />

          {/* IoT Device Detail Popup */}
          <IoTDeviceDetailPopup
            device={selectedIoTDevice}
            open={isIoTPopupOpen}
            onOpenChange={setIsIoTPopupOpen}
            onRefresh={() => refetchIoTDevices()}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Thiết kế Sơ đồ Nhà máy</h1>
            <p className="text-muted-foreground">
              Tạo và quản lý layout nhà máy với drag-and-drop
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import JSON
            </Button>
            <Button onClick={() => {
              setNewPlanName('');
              setNewPlanLineId('');
              setIsCreateDialogOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Tạo sơ đồ mới
            </Button>
          </div>
        </div>

        {/* Floor plans list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Danh sách Sơ đồ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên sơ đồ</TableHead>
                  <TableHead>Dây chuyền</TableHead>
                  <TableHead>Kích thước</TableHead>
                  <TableHead>Số đối tượng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Cập nhật</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {floorPlans?.map((plan: any) => {
                  const positions = plan.machinePositions as any[] || [];
                  const line = productionLines?.find((l: any) => l.id === plan.productionLineId);
                  
                  return (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>
                        {line ? (
                          <Badge variant="outline">{line.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{plan.width} x {plan.height}</TableCell>
                      <TableCell>{positions.length}</TableCell>
                      <TableCell>
                        <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                          {plan.isActive ? 'Hoạt động' : 'Ẩn'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(plan.updatedAt).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportLayout(plan)}
                            title="Export JSON"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPlan(plan)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Sửa
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(!floorPlans || floorPlans.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Chưa có sơ đồ nào</p>
                      <div className="flex justify-center gap-2 mt-4">
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="w-4 h-4 mr-2" />
                          Import từ JSON
                        </Button>
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Tạo sơ đồ đầu tiên
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo sơ đồ mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên sơ đồ</Label>
                <Input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="VD: Sơ đồ nhà máy A"
                />
              </div>
              <div className="space-y-2">
                <Label>Dây chuyền (tùy chọn)</Label>
                <Select value={newPlanLineId} onValueChange={setNewPlanLineId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dây chuyền" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không chọn</SelectItem>
                    {productionLines?.map((line: any) => (
                      <SelectItem key={line.id} value={String(line.id)}>
                        {line.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleCreatePlan} disabled={createMutation.isPending}>
                Tạo mới
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                Import sơ đồ từ JSON
              </DialogTitle>
              <DialogDescription>
                File: {importFileName}
              </DialogDescription>
            </DialogHeader>
            {importData && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p><strong>Tên gốc:</strong> {importData.name}</p>
                  <p><strong>Kích thước:</strong> {importData.width} x {importData.height}</p>
                  <p><strong>Số đối tượng:</strong> {importData.items.length}</p>
                  {importData.exportedAt && (
                    <p><strong>Xuất lúc:</strong> {new Date(importData.exportedAt).toLocaleString('vi-VN')}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Tên sơ đồ mới</Label>
                  <Input
                    value={newPlanName}
                    onChange={(e) => setNewPlanName(e.target.value)}
                    placeholder="VD: Sơ đồ nhà máy A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dây chuyền (tùy chọn)</Label>
                  <Select value={newPlanLineId} onValueChange={setNewPlanLineId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn dây chuyền" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không chọn</SelectItem>
                      {productionLines?.map((line: any) => (
                        <SelectItem key={line.id} value={String(line.id)}>
                          {line.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsImportDialogOpen(false);
                setImportData(null);
                setImportFileName('');
              }}>
                Hủy
              </Button>
              <Button onClick={handleImportLayout} disabled={createMutation.isPending}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
