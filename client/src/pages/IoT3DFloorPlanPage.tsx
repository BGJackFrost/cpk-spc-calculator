/**
 * IoT3DFloorPlanPage - Trang hiển thị sơ đồ 3D nhà máy với IoT devices
 */
import { useState, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Box, 
  RefreshCw, 
  Factory,
  Building2,
  Loader2,
  Cpu,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Grid3X3,
  Tag,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Home,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

// Lazy load FloorPlan3D component
import FloorPlan3DLazy from "@/components/FloorPlan3DLazy";

interface DevicePosition {
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

export default function IoT3DFloorPlanPage() {
  const { toast } = useToast();
  const [selectedFactory, setSelectedFactory] = useState("all");
  const [selectedWorkshop, setSelectedWorkshop] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | undefined>();
  
  // View controls
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  
  // Camera position
  const [cameraPosition, setCameraPosition] = useState({ x: 10, y: 10, z: 10 });

  // Fetch factory/workshop dropdown options
  const { data: hierarchyOptions } = trpc.factoryWorkshop.getDropdownOptions.useQuery();

  // Fetch IoT devices
  const { data: iotDevicesData, isLoading: isLoadingDevices, refetch: refetchDevices } = 
    trpc.iotDevice.getAll.useQuery();

  // Filter workshops based on selected factory
  const filteredWorkshops = hierarchyOptions?.workshops?.filter(w => 
    selectedFactory === "all" || w.factoryId === parseInt(selectedFactory)
  ) || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchDevices();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Convert IoT devices to 3D positions
  const devices: DevicePosition[] = (iotDevicesData || []).map((device, index) => {
    // Calculate grid position based on index
    const row = Math.floor(index / 5);
    const col = index % 5;
    
    return {
      id: index + 1,
      deviceId: device.id,
      deviceName: device.deviceName,
      deviceType: device.deviceType,
      status: (device.status as 'online' | 'offline' | 'warning' | 'error') || 'offline',
      position: {
        x: col * 3 - 6,
        y: 0.5,
        z: row * 3 - 3,
      },
      scale: 1,
      animationType: device.status === 'online' ? 'pulse' : 'none',
      metrics: {
        temperature: Math.random() * 30 + 20,
        humidity: Math.random() * 40 + 40,
        power: Math.random() * 100,
      },
    };
  });

  const handleDeviceClick = (device: DevicePosition) => {
    setSelectedDeviceId(device.deviceId);
    toast({
      title: device.deviceName,
      description: `Status: ${device.status} | Type: ${device.deviceType}`,
    });
  };

  const resetCamera = () => {
    setCameraPosition({ x: 10, y: 10, z: 10 });
  };

  // Count devices by status
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const warningCount = devices.filter(d => d.status === 'warning').length;
  const errorCount = devices.filter(d => d.status === 'error').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Box className="h-8 w-8 text-primary" />
              Sơ đồ Nhà máy 3D
            </h1>
            <p className="text-muted-foreground mt-1">
              Xem sơ đồ 3D với trạng thái thiết bị IoT realtime
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Factory Filter */}
            <Select value={selectedFactory} onValueChange={setSelectedFactory}>
              <SelectTrigger className="w-[150px]">
                <Factory className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Nhà máy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả nhà máy</SelectItem>
                {hierarchyOptions?.factories?.map((f) => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Workshop Filter */}
            <Select value={selectedWorkshop} onValueChange={setSelectedWorkshop}>
              <SelectTrigger className="w-[150px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Nhà xưởng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả xưởng</SelectItem>
                {filteredWorkshops.map((w) => (
                  <SelectItem key={w.id} value={w.id.toString()}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng thiết bị</p>
                  <p className="text-2xl font-bold">{devices.length}</p>
                </div>
                <Cpu className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Online</p>
                  <p className="text-2xl font-bold text-green-500">{onlineCount}</p>
                </div>
                <Wifi className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Offline</p>
                  <p className="text-2xl font-bold text-gray-500">{offlineCount}</p>
                </div>
                <WifiOff className="h-8 w-8 text-gray-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Warning</p>
                  <p className="text-2xl font-bold text-yellow-500">{warningCount}</p>
                </div>
                <Activity className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Error</p>
                  <p className="text-2xl font-bold text-red-500">{errorCount}</p>
                </div>
                <Badge variant="destructive">{errorCount}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 3D View */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Sơ đồ 3D
              </CardTitle>
              <CardDescription>
                Kéo để xoay, cuộn để zoom, click vào thiết bị để xem chi tiết
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] w-full bg-slate-900 rounded-b-lg overflow-hidden">
                {isLoadingDevices ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                ) : (
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  }>
                    <FloorPlan3DLazy
                      devices={devices}
                      onDeviceClick={handleDeviceClick}
                      gridEnabled={showGrid}
                      gridSize={gridSize}
                      cameraPosition={cameraPosition}
                      selectedDeviceId={selectedDeviceId}
                      showLabels={showLabels}
                      showMetrics={showMetrics}
                    />
                  </Suspense>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Controls Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Điều khiển</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* View Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Hiển thị</h4>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-grid" className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Lưới
                  </Label>
                  <Switch
                    id="show-grid"
                    checked={showGrid}
                    onCheckedChange={setShowGrid}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-labels" className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Nhãn
                  </Label>
                  <Switch
                    id="show-labels"
                    checked={showLabels}
                    onCheckedChange={setShowLabels}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-metrics" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Metrics
                  </Label>
                  <Switch
                    id="show-metrics"
                    checked={showMetrics}
                    onCheckedChange={setShowMetrics}
                  />
                </div>
              </div>

              {/* Grid Size */}
              <div className="space-y-2">
                <Label className="text-sm">Kích thước lưới: {gridSize}</Label>
                <Slider
                  value={[gridSize]}
                  onValueChange={(v) => setGridSize(v[0])}
                  min={10}
                  max={50}
                  step={5}
                />
              </div>

              {/* Camera Controls */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Camera</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={resetCamera}>
                    <Home className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCameraPosition({ x: 0, y: 15, z: 0 })}>
                    <Eye className="h-4 w-4 mr-1" />
                    Top
                  </Button>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Chú thích</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Online</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-500" />
                    <span>Offline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span>Warning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Error</span>
                  </div>
                </div>
              </div>

              {/* Selected Device Info */}
              {selectedDeviceId && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium">Thiết bị đã chọn</h4>
                  {(() => {
                    const device = devices.find(d => d.deviceId === selectedDeviceId);
                    if (!device) return null;
                    return (
                      <div className="text-sm space-y-1">
                        <p><strong>Tên:</strong> {device.deviceName}</p>
                        <p><strong>Loại:</strong> {device.deviceType}</p>
                        <p><strong>Trạng thái:</strong> 
                          <Badge variant={device.status === 'online' ? 'default' : 'secondary'} className="ml-2">
                            {device.status}
                          </Badge>
                        </p>
                        {device.metrics && (
                          <>
                            <p><strong>Nhiệt độ:</strong> {device.metrics.temperature?.toFixed(1)}°C</p>
                            <p><strong>Độ ẩm:</strong> {device.metrics.humidity?.toFixed(1)}%</p>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
