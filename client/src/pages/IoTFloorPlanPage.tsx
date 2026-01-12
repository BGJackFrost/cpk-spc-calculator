/**
 * IoTFloorPlanPage - Trang hiển thị sơ đồ 2D nhà máy với IoT devices
 */
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { FloorPlanDesigner, FloorPlanConfig } from "@/components/FloorPlanDesigner";
import { FloorPlanViewer } from "@/components/FloorPlanViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Map, 
  Edit, 
  Eye, 
  RefreshCw, 
  Download, 
  Factory,
  Building2,
  Save,
  Plus,
  Loader2,
  Cpu,
  Wifi,
  WifiOff,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

export default function IoTFloorPlanPage() {
  const { toast } = useToast();
  const [selectedFactory, setSelectedFactory] = useState("all");
  const [selectedWorkshop, setSelectedWorkshop] = useState("all");
  const [activeTab, setActiveTab] = useState<"view" | "edit">("view");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<FloorPlanConfig | null>(null);

  // Fetch factory/workshop dropdown options
  const { data: hierarchyOptions } = trpc.factoryWorkshop.getDropdownOptions.useQuery();

  // Fetch floor plan configs
  const { data: floorPlanConfigs, isLoading: isLoadingConfigs, refetch: refetchConfigs } = 
    trpc.floorPlan.getAll.useQuery();

  // Fetch machines
  const { data: machinesData } = trpc.machine.getAll.useQuery();

  // Fetch IoT devices
  const { data: iotDevicesData } = trpc.iotDevice.getAll.useQuery();

  // Filter workshops based on selected factory
  const filteredWorkshops = hierarchyOptions?.workshops?.filter(w => 
    selectedFactory === "all" || w.factoryId === parseInt(selectedFactory)
  ) || [];

  // Save floor plan mutation
  const saveFloorPlanMutation = trpc.floorPlan.save.useMutation({
    onSuccess: () => {
      toast({
        title: "Lưu thành công",
        description: "Sơ đồ nhà máy đã được lưu.",
      });
      refetchConfigs();
    },
    onError: (error) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu sơ đồ.",
        variant: "destructive",
      });
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchConfigs();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSaveConfig = (config: FloorPlanConfig) => {
    saveFloorPlanMutation.mutate({
      id: config.id,
      name: config.name,
      width: config.width,
      height: config.height,
      gridSize: config.gridSize,
      showGrid: config.showGrid,
      items: config.items,
      layers: config.layers,
      groups: config.groups,
    });
  };

  const handleExport = (format: 'png' | 'pdf') => {
    toast({
      title: "Xuất file",
      description: `Đang xuất sơ đồ dạng ${format.toUpperCase()}...`,
    });
    // TODO: Implement export functionality
  };

  // Default config for new floor plan
  const defaultConfig: FloorPlanConfig = {
    name: "Sơ đồ nhà máy mới",
    width: 1200,
    height: 800,
    gridSize: 20,
    showGrid: true,
    items: [],
    layers: [
      { id: "default", name: "Mặc định", visible: true, locked: false, color: "#3b82f6", zIndex: 0 },
      { id: "machines", name: "Máy móc", visible: true, locked: false, color: "#22c55e", zIndex: 1 },
      { id: "iot", name: "IoT Devices", visible: true, locked: false, color: "#f59e0b", zIndex: 2 },
    ],
  };

  // Prepare machines for designer
  const machines = machinesData?.map(m => ({
    id: m.id,
    name: m.name,
    status: m.status || 'idle',
  })) || [];

  // Prepare IoT devices for designer
  const iotDevices = iotDevicesData?.map(d => ({
    id: d.id,
    deviceCode: d.deviceCode,
    deviceName: d.deviceName,
    deviceType: d.deviceType,
    status: d.status || 'offline',
    location: d.location,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Map className="h-8 w-8 text-primary" />
              Sơ đồ Nhà máy 2D
            </h1>
            <p className="text-muted-foreground mt-1">
              Thiết kế và xem sơ đồ bố trí máy móc, thiết bị IoT trong nhà máy
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "view" | "edit")}>
          <TabsList>
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Xem sơ đồ
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Thiết kế
            </TabsTrigger>
          </TabsList>

          {/* View Tab */}
          <TabsContent value="view" className="space-y-6">
            {/* Config Selection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Chọn sơ đồ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {isLoadingConfigs ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : floorPlanConfigs && floorPlanConfigs.length > 0 ? (
                    floorPlanConfigs.map((config) => (
                      <Button
                        key={config.id}
                        variant={selectedConfig?.id === config.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedConfig(config as FloorPlanConfig)}
                      >
                        {config.name}
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chưa có sơ đồ nào. Chuyển sang tab "Thiết kế" để tạo mới.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Floor Plan Viewer */}
            {selectedConfig ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-5 w-5" />
                    {selectedConfig.name}
                  </CardTitle>
                  <CardDescription>
                    Kích thước: {selectedConfig.width}x{selectedConfig.height}px | 
                    {selectedConfig.items?.length || 0} đối tượng
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FloorPlanViewer 
                    config={selectedConfig}
                    showLegend={true}
                    interactive={true}
                    onMachineClick={(machineId) => {
                      toast({
                        title: "Máy được chọn",
                        description: `Machine ID: ${machineId}`,
                      });
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Map className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Chọn sơ đồ để xem</p>
                  <p className="text-sm">
                    Chọn một sơ đồ từ danh sách phía trên hoặc tạo mới trong tab "Thiết kế"
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Device Status Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Máy móc</p>
                      <p className="text-2xl font-bold">{machines.length}</p>
                    </div>
                    <Cpu className="h-8 w-8 text-primary opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">IoT Devices</p>
                      <p className="text-2xl font-bold">{iotDevices.length}</p>
                    </div>
                    <Wifi className="h-8 w-8 text-green-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Online</p>
                      <p className="text-2xl font-bold text-green-500">
                        {iotDevices.filter(d => d.status === 'online').length}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-green-500 border-green-500">
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Offline</p>
                      <p className="text-2xl font-bold text-gray-500">
                        {iotDevices.filter(d => d.status === 'offline').length}
                      </p>
                    </div>
                    <WifiOff className="h-8 w-8 text-gray-500 opacity-80" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Edit Tab */}
          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Thiết kế Sơ đồ
                </CardTitle>
                <CardDescription>
                  Kéo thả máy móc và thiết bị IoT để thiết kế sơ đồ nhà máy
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <FloorPlanDesigner
                  initialConfig={selectedConfig || defaultConfig}
                  onSave={handleSaveConfig}
                  onExport={handleExport}
                  machines={machines}
                  iotDevices={iotDevices}
                  onIotDeviceClick={(device) => {
                    toast({
                      title: device.deviceName,
                      description: `Status: ${device.status} | Type: ${device.deviceType}`,
                    });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
