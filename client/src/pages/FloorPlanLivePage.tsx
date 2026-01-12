/**
 * FloorPlanLivePage - Trang hiển thị sơ đồ nhà máy với dữ liệu realtime
 */
import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { FloorPlanViewer, FloorPlanConfig, MachinePosition } from "@/components/FloorPlanViewer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Zap, 
  RefreshCw, 
  Factory,
  Building2,
  Loader2,
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Gauge,
  TrendingUp,
  Bell,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { cn } from "@/lib/utils";

interface LiveAlert {
  id: string;
  deviceId: number;
  deviceName: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
}

export default function FloorPlanLivePage() {
  const { toast } = useToast();
  const [selectedFactory, setSelectedFactory] = useState("all");
  const [selectedWorkshop, setSelectedWorkshop] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<FloorPlanConfig | null>(null);

  // Fetch factory/workshop dropdown options
  const { data: hierarchyOptions } = trpc.factoryWorkshop.getDropdownOptions.useQuery();

  // Fetch floor plan configs
  const { data: floorPlanConfigs, isLoading: isLoadingConfigs } = 
    trpc.floorPlan.getAll.useQuery();

  // Fetch machines with realtime status
  const { data: machinesData, refetch: refetchMachines } = trpc.machine.getAll.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // Fetch IoT devices with realtime status
  const { data: iotDevicesData, refetch: refetchDevices } = trpc.iotDevice.getAll.useQuery(undefined, {
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  // SSE for realtime updates
  const { messages, isConnected } = useRealtimeData({
    channels: ['iot:status', 'machine:status', 'alerts'],
    onMessage: (event) => {
      if (event.type === 'alert') {
        const newAlert: LiveAlert = {
          id: `alert-${Date.now()}`,
          deviceId: event.data.deviceId,
          deviceName: event.data.deviceName || 'Unknown',
          type: event.data.severity || 'info',
          message: event.data.message,
          timestamp: new Date(),
        };
        setLiveAlerts(prev => [newAlert, ...prev].slice(0, 50)); // Keep last 50 alerts
        
        toast({
          title: `Alert: ${newAlert.deviceName}`,
          description: newAlert.message,
          variant: newAlert.type === 'error' ? 'destructive' : 'default',
        });
      }
    },
  });

  // Filter workshops based on selected factory
  const filteredWorkshops = hierarchyOptions?.workshops?.filter(w => 
    selectedFactory === "all" || w.factoryId === parseInt(selectedFactory)
  ) || [];

  // Auto-select first config
  useEffect(() => {
    if (floorPlanConfigs && floorPlanConfigs.length > 0 && !selectedConfig) {
      setSelectedConfig(floorPlanConfigs[0] as FloorPlanConfig);
    }
  }, [floorPlanConfigs, selectedConfig]);

  // Calculate stats
  const machines = machinesData || [];
  const iotDevices = iotDevicesData || [];
  
  const runningMachines = machines.filter(m => m.status === 'running').length;
  const idleMachines = machines.filter(m => m.status === 'idle').length;
  const errorMachines = machines.filter(m => m.status === 'error').length;
  
  const onlineDevices = iotDevices.filter(d => d.status === 'online').length;
  const offlineDevices = iotDevices.filter(d => d.status === 'offline').length;

  const handleMachineClick = (machineId: number) => {
    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      toast({
        title: machine.name,
        description: `Status: ${machine.status} | Type: ${machine.machineType || 'N/A'}`,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Zap className="h-8 w-8 text-primary" />
              Floor Plan Live
            </h1>
            <p className="text-muted-foreground mt-1">
              Giám sát trạng thái máy móc và thiết bị IoT realtime
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* SSE Connection Status */}
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Realtime
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Polling
                </>
              )}
            </Badge>

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

            {/* Auto Refresh Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto
              </Label>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                refetchMachines();
                refetchDevices();
              }}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang chạy</p>
                  <p className="text-2xl font-bold text-green-500">{runningMachines}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Chờ</p>
                  <p className="text-2xl font-bold text-yellow-500">{idleMachines}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lỗi</p>
                  <p className="text-2xl font-bold text-red-500">{errorMachines}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">IoT Online</p>
                  <p className="text-2xl font-bold text-green-500">{onlineDevices}</p>
                </div>
                <Wifi className="h-8 w-8 text-green-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-500/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">IoT Offline</p>
                  <p className="text-2xl font-bold text-gray-500">{offlineDevices}</p>
                </div>
                <WifiOff className="h-8 w-8 text-gray-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Floor Plan */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Sơ đồ Live
                  </CardTitle>
                  <CardDescription>
                    Trạng thái realtime của máy móc và thiết bị
                  </CardDescription>
                </div>
                {/* Config Selection */}
                <Select 
                  value={selectedConfig?.id?.toString() || ""} 
                  onValueChange={(v) => {
                    const config = floorPlanConfigs?.find(c => c.id?.toString() === v);
                    if (config) setSelectedConfig(config as FloorPlanConfig);
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Chọn sơ đồ" />
                  </SelectTrigger>
                  <SelectContent>
                    {floorPlanConfigs?.map((config) => (
                      <SelectItem key={config.id} value={config.id?.toString() || ""}>
                        {config.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingConfigs ? (
                <div className="flex items-center justify-center h-[500px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : selectedConfig ? (
                <FloorPlanViewer 
                  config={selectedConfig}
                  onMachineClick={handleMachineClick}
                  refreshInterval={refreshInterval}
                  showLegend={true}
                  interactive={true}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                  <Zap className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Chưa có sơ đồ</p>
                  <p className="text-sm">
                    Tạo sơ đồ trong trang "Sơ đồ 2D" để hiển thị tại đây
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Alerts Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bell className="h-4 w-4" />
                Cảnh báo Live
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {liveAlerts.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Không có cảnh báo</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {liveAlerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className={cn(
                          "p-3 text-sm",
                          alert.type === 'error' && "bg-red-500/10",
                          alert.type === 'warning' && "bg-yellow-500/10",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {alert.type === 'error' ? (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          ) : alert.type === 'warning' ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <Activity className="h-4 w-4 text-blue-500" />
                          )}
                          <span className="font-medium">{alert.deviceName}</span>
                        </div>
                        <p className="text-muted-foreground">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {alert.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Machine Status Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trạng thái máy móc</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {machines.slice(0, 12).map((machine) => (
                <div 
                  key={machine.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                    machine.status === 'running' && "border-green-500/50 bg-green-500/5",
                    machine.status === 'idle' && "border-yellow-500/50 bg-yellow-500/5",
                    machine.status === 'error' && "border-red-500/50 bg-red-500/5",
                    machine.status === 'maintenance' && "border-blue-500/50 bg-blue-500/5",
                  )}
                  onClick={() => handleMachineClick(machine.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Cpu className="h-5 w-5" />
                    <Badge 
                      variant={machine.status === 'running' ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {machine.status}
                    </Badge>
                  </div>
                  <p className="font-medium text-sm truncate">{machine.name}</p>
                  <p className="text-xs text-muted-foreground">{machine.machineType || 'N/A'}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
