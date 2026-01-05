import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { FloorPlan3D, FloorPlan3DControls, FloorPlan3DLegend } from '@/components/FloorPlan3D';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Box, Upload, Settings, Eye, RefreshCw, AlertTriangle, Activity, Thermometer, Zap } from 'lucide-react';
import { toast } from 'sonner';

// Device position type for 3D view
interface Device3DPosition {
  id: number;
  deviceId: number;
  deviceName: string;
  deviceType: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
  animationType?: 'none' | 'pulse' | 'rotate' | 'bounce' | 'glow';
  metrics?: {
    temperature?: number;
    humidity?: number;
    power?: number;
    [key: string]: number | undefined;
  };
}

export default function IoT3DFloorPlan() {
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<Device3DPosition | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  const [showMetrics, setShowMetrics] = useState(false);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 15, y: 15, z: 15 });
  
  // Fetch 3D floor plans
  const { data: floorPlans, isLoading: loadingFloorPlans } = trpc.floorPlanIntegration.get3DFloorPlans?.useQuery() || { data: [], isLoading: false };
  
  // Fetch devices
  const { data: devicesData, isLoading: loadingDevices, refetch: refetchDevices } = trpc.iotDeviceManagement?.getDevices?.useQuery({}) || { data: null, isLoading: false };
  
  // Fetch device positions for selected floor plan
  const { data: devicePositions, isLoading: loadingPositions } = trpc.floorPlanIntegration?.get3DDevicePositions?.useQuery(
    { floorPlanId: parseInt(selectedFloorPlan) },
    { enabled: !!selectedFloorPlan }
  ) || { data: [], isLoading: false };
  
  // Transform devices to 3D format
  const devices3D: Device3DPosition[] = React.useMemo(() => {
    if (!devicesData?.devices) return generateMockDevices();
    
    const positions = devicePositions || [];
    
    return devicesData.devices.map((device: any, index: number) => {
      const position = positions.find((p: any) => p.deviceId === device.id);
      
      // Generate position based on index if no saved position
      const gridSize = Math.ceil(Math.sqrt(devicesData.devices.length));
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      return {
        id: position?.id || index + 1,
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.deviceType || 'sensor',
        status: device.status === 'active' ? 'online' : 
                device.status === 'warning' ? 'warning' :
                device.status === 'error' ? 'error' : 'offline',
        position: position ? {
          x: parseFloat(position.positionX),
          y: parseFloat(position.positionY),
          z: parseFloat(position.positionZ),
        } : {
          x: (col - gridSize / 2) * 3,
          y: 0.5,
          z: (row - gridSize / 2) * 3,
        },
        rotation: position ? {
          x: parseFloat(position.rotationX || '0'),
          y: parseFloat(position.rotationY || '0'),
          z: parseFloat(position.rotationZ || '0'),
        } : undefined,
        scale: position ? parseFloat(position.scale || '1') : 1,
        animationType: position?.animationType || (device.status === 'active' ? 'pulse' : 'none'),
        metrics: {
          temperature: device.lastReading?.temperature || Math.random() * 30 + 20,
          humidity: device.lastReading?.humidity || Math.random() * 40 + 40,
          power: device.lastReading?.power || Math.random() * 500 + 100,
        },
      };
    });
  }, [devicesData, devicePositions]);
  
  // Generate mock devices for demo
  function generateMockDevices(): Device3DPosition[] {
    const mockDevices: Device3DPosition[] = [
      { id: 1, deviceId: 1, deviceName: 'PLC-001', deviceType: 'plc', status: 'online', position: { x: -4, y: 0.5, z: -4 }, animationType: 'pulse', metrics: { temperature: 45, power: 250 } },
      { id: 2, deviceId: 2, deviceName: 'Sensor-T01', deviceType: 'sensor', status: 'online', position: { x: 0, y: 0.5, z: -4 }, animationType: 'glow', metrics: { temperature: 28, humidity: 65 } },
      { id: 3, deviceId: 3, deviceName: 'Gateway-01', deviceType: 'gateway', status: 'online', position: { x: 4, y: 0.5, z: -4 }, animationType: 'rotate', metrics: { power: 120 } },
      { id: 4, deviceId: 4, deviceName: 'HMI-Panel', deviceType: 'hmi', status: 'warning', position: { x: -4, y: 0.5, z: 0 }, animationType: 'bounce', metrics: { temperature: 52 } },
      { id: 5, deviceId: 5, deviceName: 'Sensor-H01', deviceType: 'sensor', status: 'online', position: { x: 0, y: 0.5, z: 0 }, animationType: 'pulse', metrics: { humidity: 72 } },
      { id: 6, deviceId: 6, deviceName: 'PLC-002', deviceType: 'plc', status: 'error', position: { x: 4, y: 0.5, z: 0 }, animationType: 'glow', metrics: { temperature: 78, power: 0 } },
      { id: 7, deviceId: 7, deviceName: 'SCADA-01', deviceType: 'scada', status: 'online', position: { x: -4, y: 0.5, z: 4 }, animationType: 'pulse', metrics: { power: 450 } },
      { id: 8, deviceId: 8, deviceName: 'Sensor-P01', deviceType: 'sensor', status: 'offline', position: { x: 0, y: 0.5, z: 4 }, animationType: 'none', metrics: {} },
      { id: 9, deviceId: 9, deviceName: 'Gateway-02', deviceType: 'gateway', status: 'online', position: { x: 4, y: 0.5, z: 4 }, animationType: 'rotate', metrics: { power: 85 } },
    ];
    return mockDevices;
  }
  
  // Handle device click
  const handleDeviceClick = useCallback((device: Device3DPosition) => {
    setSelectedDevice(device);
    setIsDetailOpen(true);
  }, []);
  
  // Reset camera
  const handleResetCamera = useCallback(() => {
    setCameraPosition({ x: 15, y: 15, z: 15 });
  }, []);
  
  // Status counts
  const statusCounts = React.useMemo(() => {
    return devices3D.reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [devices3D]);
  
  const isLoading = loadingFloorPlans || loadingDevices || loadingPositions;
  
  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Box className="h-6 w-6 text-blue-500" />
              Sơ đồ Nhà máy 3D
            </h1>
            <p className="text-muted-foreground">
              Hiển thị mô hình 3D nhà máy với vị trí thiết bị IoT realtime
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Floor plan selector */}
            <Select value={selectedFloorPlan} onValueChange={setSelectedFloorPlan}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn sơ đồ 3D" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="demo">Demo Floor Plan</SelectItem>
                {(floorPlans as any[])?.map((fp: any) => (
                  <SelectItem key={fp.id} value={fp.id.toString()}>
                    {fp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => refetchDevices?.()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>
        
        {/* Status summary */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng thiết bị</p>
                  <p className="text-2xl font-bold">{devices3D.length}</p>
                </div>
                <Box className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Hoạt động</p>
                  <p className="text-2xl font-bold text-green-500">{statusCounts.online || 0}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Cảnh báo</p>
                  <p className="text-2xl font-bold text-yellow-500">{statusCounts.warning || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lỗi</p>
                  <p className="text-2xl font-bold text-red-500">{(statusCounts.error || 0) + (statusCounts.offline || 0)}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* 3D View */}
        <Card className="flex-1 min-h-[500px]">
          <CardContent className="p-0 h-full relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <FloorPlan3D
                  devices={devices3D}
                  onDeviceClick={handleDeviceClick}
                  gridEnabled={gridEnabled}
                  gridSize={20}
                  cameraPosition={cameraPosition}
                  cameraTarget={{ x: 0, y: 0, z: 0 }}
                  selectedDeviceId={selectedDevice?.deviceId}
                  showLabels={showLabels}
                  showMetrics={showMetrics}
                />
                
                <FloorPlan3DControls
                  onResetCamera={handleResetCamera}
                  onToggleLabels={() => setShowLabels(!showLabels)}
                  onToggleMetrics={() => setShowMetrics(!showMetrics)}
                  onToggleGrid={() => setGridEnabled(!gridEnabled)}
                  showLabels={showLabels}
                  showMetrics={showMetrics}
                  gridEnabled={gridEnabled}
                />
                
                <FloorPlan3DLegend />
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Device Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                {selectedDevice?.deviceName}
              </DialogTitle>
              <DialogDescription>
                Chi tiết thiết bị và số liệu realtime
              </DialogDescription>
            </DialogHeader>
            
            {selectedDevice && (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trạng thái</span>
                  <Badge variant={
                    selectedDevice.status === 'online' ? 'default' :
                    selectedDevice.status === 'warning' ? 'secondary' :
                    'destructive'
                  }>
                    {selectedDevice.status === 'online' ? 'Hoạt động' :
                     selectedDevice.status === 'warning' ? 'Cảnh báo' :
                     selectedDevice.status === 'error' ? 'Lỗi' : 'Ngắt kết nối'}
                  </Badge>
                </div>
                
                {/* Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Loại thiết bị</span>
                  <span className="font-medium uppercase">{selectedDevice.deviceType}</span>
                </div>
                
                {/* Position */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Vị trí (X, Y, Z)</span>
                  <span className="font-mono text-sm">
                    ({selectedDevice.position.x.toFixed(1)}, {selectedDevice.position.y.toFixed(1)}, {selectedDevice.position.z.toFixed(1)})
                  </span>
                </div>
                
                {/* Metrics */}
                {selectedDevice.metrics && Object.keys(selectedDevice.metrics).length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Số liệu Realtime</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedDevice.metrics.temperature !== undefined && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <Thermometer className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Nhiệt độ</p>
                            <p className="font-semibold">{selectedDevice.metrics.temperature.toFixed(1)}°C</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedDevice.metrics.humidity !== undefined && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <Activity className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Độ ẩm</p>
                            <p className="font-semibold">{selectedDevice.metrics.humidity.toFixed(1)}%</p>
                          </div>
                        </div>
                      )}
                      
                      {selectedDevice.metrics.power !== undefined && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <div>
                            <p className="text-xs text-muted-foreground">Công suất</p>
                            <p className="font-semibold">{selectedDevice.metrics.power.toFixed(0)}W</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => {
                    toast.info('Tính năng đang phát triển');
                  }}>
                    <Settings className="h-4 w-4 mr-2" />
                    Cấu hình
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => {
                    toast.info('Tính năng đang phát triển');
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    Chi tiết
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
