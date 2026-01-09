import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Map, ZoomIn, ZoomOut, RefreshCw, Activity, AlertTriangle, Pause, Wrench, Power, Wifi, WifiOff, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useFloorPlanSSE, MachineUpdateData, FloorPlanStatsData } from "@/hooks/useRealtimeSSE";
import { useToast } from "@/hooks/use-toast";

type MachineStatus = "running" | "idle" | "error" | "maintenance" | "offline";

interface Machine {
  id: number;
  name: string;
  code: string;
  type: string | null;
  status: MachineStatus;
  workstationId: number;
  workstationName: string;
  productionLineId: number | null;
  productionLineName: string | null;
  x: number;
  y: number;
  oee: number;
  cycleTime: number;
  defectRate: number;
  lastUpdate: Date;
}

const statusColors: Record<MachineStatus, string> = {
  running: "bg-green-500",
  idle: "bg-yellow-500",
  error: "bg-red-500",
  maintenance: "bg-blue-500",
  offline: "bg-gray-500",
};

const statusLabels: Record<MachineStatus, string> = {
  running: "Đang chạy",
  idle: "Chờ",
  error: "Lỗi",
  maintenance: "Bảo trì",
  offline: "Offline",
};

const statusIcons: Record<MachineStatus, React.ReactNode> = {
  running: <Activity className="h-4 w-4" />,
  idle: <Pause className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  offline: <Power className="h-4 w-4" />,
};

export default function FloorPlanLive() {
  const { toast } = useToast();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [zoom, setZoom] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [selectedFloor, setSelectedFloor] = useState("floor-1");
  const [draggedMachine, setDraggedMachine] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Fetch machines from API
  const { data: machinesData, isLoading, refetch } = trpc.realtime.getMachinesWithStatus.useQuery(
    { floorPlanId: selectedFloor === "floor-1" ? 1 : selectedFloor === "floor-2" ? 2 : 3 },
    {
      refetchInterval: autoRefresh ? refreshInterval : false,
      staleTime: 1000,
    }
  );

  // SSE for realtime updates
  const { isConnected, error: sseError } = useFloorPlanSSE({
    enabled: autoRefresh,
    onMachineUpdate: useCallback((data: MachineUpdateData) => {
      setMachines((prev) =>
        prev.map((m) =>
          m.id === data.machineId
            ? {
                ...m,
                status: data.status as MachineStatus,
                oee: data.oee,
                cycleTime: data.cycleTime,
                defectRate: data.defectRate,
                x: data.x ?? m.x,
                y: data.y ?? m.y,
                lastUpdate: new Date(),
              }
            : m
        )
      );
    }, []),
    onStatsUpdate: useCallback((data: FloorPlanStatsData) => {
      // Stats will be recalculated from machines array
      console.log('[FloorPlanLive] Stats update received:', data);
    }, []),
  });

  // Update machines when API data changes
  useEffect(() => {
    if (machinesData && machinesData.length > 0) {
      setMachines(
        machinesData.map((m) => ({
          id: m.id,
          name: m.name,
          code: m.code,
          type: m.machineType,
          status: m.status as MachineStatus,
          workstationId: m.workstationId,
          workstationName: m.workstationName,
          productionLineId: m.productionLineId,
          productionLineName: m.productionLineName,
          x: m.x,
          y: m.y,
          oee: m.oee,
          cycleTime: m.cycleTime,
          defectRate: m.defectRate,
          lastUpdate: new Date(m.lastUpdate),
        }))
      );
    }
  }, [machinesData]);

  // Show SSE connection status
  useEffect(() => {
    if (sseError) {
      toast({
        title: "Lỗi kết nối realtime",
        description: "Không thể kết nối SSE. Đang sử dụng polling thay thế.",
        variant: "destructive",
      });
    }
  }, [sseError, toast]);

  const handleMouseDown = useCallback((e: React.MouseEvent, machineId: number) => {
    const machine = machines.find((m) => m.id === machineId);
    if (!machine) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDraggedMachine(String(machineId));
  }, [machines]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedMachine) return;
    const container = e.currentTarget.getBoundingClientRect();
    const newX = Math.max(0, Math.min(container.width - 100, e.clientX - container.left - dragOffset.x));
    const newY = Math.max(0, Math.min(container.height - 80, e.clientY - container.top - dragOffset.y));
    setMachines((prev) => prev.map((m) => (String(m.id) === draggedMachine ? { ...m, x: newX, y: newY } : m)));
  }, [draggedMachine, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setDraggedMachine(null);
  }, []);

  const stats = useMemo(() => ({
    total: machines.length,
    running: machines.filter((m) => m.status === "running").length,
    idle: machines.filter((m) => m.status === "idle").length,
    error: machines.filter((m) => m.status === "error").length,
    maintenance: machines.filter((m) => m.status === "maintenance").length,
    offline: machines.filter((m) => m.status === "offline").length,
    avgOee: machines.filter((m) => m.status === "running").reduce((sum, m) => sum + m.oee, 0) / Math.max(1, machines.filter((m) => m.status === "running").length),
  }), [machines]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Map className="h-8 w-8 text-primary" />
              Floor Plan Live
            </h1>
            <p className="text-muted-foreground mt-1">Sơ đồ nhà máy với trạng thái máy realtime</p>
          </div>
          <div className="flex items-center gap-4">
            {/* SSE Connection Status */}
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  Realtime
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Polling
                </Badge>
              )}
            </div>
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="floor-1">Tầng 1</SelectItem>
                <SelectItem value="floor-2">Tầng 2</SelectItem>
                <SelectItem value="floor-3">Tầng 3</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} id="auto-refresh" />
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Tổng máy</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card className="border-green-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Đang chạy</p><p className="text-2xl font-bold text-green-500">{stats.running}</p></CardContent></Card>
          <Card className="border-yellow-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Chờ</p><p className="text-2xl font-bold text-yellow-500">{stats.idle}</p></CardContent></Card>
          <Card className="border-red-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Lỗi</p><p className="text-2xl font-bold text-red-500">{stats.error}</p></CardContent></Card>
          <Card className="border-blue-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Bảo trì</p><p className="text-2xl font-bold text-blue-500">{stats.maintenance}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">OEE TB</p><p className="text-2xl font-bold">{stats.avgOee.toFixed(1)}%</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Sơ đồ nhà máy</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(50, z - 10))}><ZoomOut className="h-4 w-4" /></Button>
                  <span className="text-sm w-12 text-center">{zoom}%</span>
                  <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(150, z + 10))}><ZoomIn className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading && machines.length === 0 ? (
                <div className="flex items-center justify-center h-[500px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : machines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                  <Map className="h-12 w-12 mb-4 opacity-50" />
                  <p>Chưa có máy nào được cấu hình</p>
                  <p className="text-sm">Vui lòng thêm máy trong phần Quản lý Máy</p>
                </div>
              ) : (
                <div
                  className="relative bg-muted/30 rounded-lg border overflow-hidden"
                  style={{ height: "500px", transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground) / 0.2) 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                  <TooltipProvider>
                    {machines.map((machine) => (
                      <Tooltip key={machine.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute w-24 h-20 rounded-lg border-2 cursor-move transition-shadow ${statusColors[machine.status]} bg-opacity-20 hover:shadow-lg ${selectedMachine?.id === machine.id ? "ring-2 ring-primary" : ""} ${draggedMachine === String(machine.id) ? "opacity-70" : ""}`}
                            style={{ left: machine.x, top: machine.y }}
                            onMouseDown={(e) => handleMouseDown(e, machine.id)}
                            onClick={() => setSelectedMachine(machine)}
                          >
                            <div className="p-2 h-full flex flex-col justify-between bg-background/80 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium truncate">{machine.name}</span>
                                <div className={`w-2 h-2 rounded-full ${statusColors[machine.status]} ${machine.status === "running" ? "animate-pulse" : ""}`} />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                <div>OEE: {machine.oee.toFixed(1)}%</div>
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="p-3">
                          <div className="space-y-2">
                            <div className="font-medium">{machine.name}</div>
                            <div className="text-xs text-muted-foreground">{machine.code}</div>
                            <div className="flex items-center gap-2">
                              {statusIcons[machine.status]}
                              <Badge className={statusColors[machine.status]}>{statusLabels[machine.status]}</Badge>
                            </div>
                            <div className="text-sm space-y-1">
                              <div>OEE: <span className="font-medium">{machine.oee.toFixed(1)}%</span></div>
                              <div>Cycle Time: <span className="font-medium">{machine.cycleTime.toFixed(0)}ms</span></div>
                              <div>Defect Rate: <span className="font-medium">{machine.defectRate.toFixed(2)}%</span></div>
                              {machine.workstationName && (
                                <div>Công trạm: <span className="font-medium">{machine.workstationName}</span></div>
                              )}
                              {machine.productionLineName && (
                                <div>Dây chuyền: <span className="font-medium">{machine.productionLineName}</span></div>
                              )}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Chi tiết máy</CardTitle></CardHeader>
            <CardContent>
              {selectedMachine ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{selectedMachine.name}</span>
                    <Badge className={statusColors[selectedMachine.status]}>{statusLabels[selectedMachine.status]}</Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Mã máy</span><span className="font-medium">{selectedMachine.code}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Loại máy</span><span className="font-medium">{selectedMachine.type || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Công trạm</span><span className="font-medium">{selectedMachine.workstationName}</span></div>
                    {selectedMachine.productionLineName && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Dây chuyền</span><span className="font-medium">{selectedMachine.productionLineName}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">OEE</span><span className={`font-medium ${selectedMachine.oee >= 85 ? "text-green-500" : selectedMachine.oee >= 70 ? "text-yellow-500" : "text-red-500"}`}>{selectedMachine.oee.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cycle Time</span><span className="font-medium">{selectedMachine.cycleTime.toFixed(0)}ms</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Defect Rate</span><span className={`font-medium ${selectedMachine.defectRate <= 1 ? "text-green-500" : selectedMachine.defectRate <= 3 ? "text-yellow-500" : "text-red-500"}`}>{selectedMachine.defectRate.toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cập nhật</span><span className="text-sm">{selectedMachine.lastUpdate.toLocaleTimeString("vi-VN")}</span></div>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button className="w-full" variant="outline" onClick={() => toast({ title: "Tính năng đang phát triển", description: "Xem chi tiết máy sẽ sớm được cập nhật" })}>Xem chi tiết</Button>
                    <Button className="w-full" variant="outline" onClick={() => toast({ title: "Tính năng đang phát triển", description: "Lịch sử máy sẽ sớm được cập nhật" })}>Lịch sử</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Chọn một máy để xem chi tiết</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Cấu hình</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Tần suất cập nhật (ms)</Label>
                <Slider value={[refreshInterval]} onValueChange={([v]) => setRefreshInterval(v)} min={1000} max={10000} step={500} />
                <p className="text-sm text-muted-foreground">{refreshInterval}ms</p>
              </div>
              <div className="space-y-2">
                <Label>Zoom</Label>
                <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={50} max={150} step={5} />
                <p className="text-sm text-muted-foreground">{zoom}%</p>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái kết nối</Label>
                <div className="flex items-center gap-2 mt-2">
                  {isConnected ? (
                    <>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm text-green-600">Đã kết nối SSE realtime</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-sm text-yellow-600">Đang sử dụng polling ({refreshInterval}ms)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
