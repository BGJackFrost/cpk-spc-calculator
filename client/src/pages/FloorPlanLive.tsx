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
import { Map, ZoomIn, ZoomOut, RefreshCw, Activity, AlertTriangle, Pause, Wrench, Power } from "lucide-react";

type MachineStatus = "running" | "idle" | "error" | "maintenance" | "offline";

interface Machine {
  id: string;
  name: string;
  type: string;
  status: MachineStatus;
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
  running: "Dang chay",
  idle: "Cho",
  error: "Loi",
  maintenance: "Bao tri",
  offline: "Offline",
};

const statusIcons: Record<MachineStatus, React.ReactNode> = {
  running: <Activity className="h-4 w-4" />,
  idle: <Pause className="h-4 w-4" />,
  error: <AlertTriangle className="h-4 w-4" />,
  maintenance: <Wrench className="h-4 w-4" />,
  offline: <Power className="h-4 w-4" />,
};

const generateMockMachines = (): Machine[] => {
  const types = ["AVI", "AOI", "CMM", "CNC", "SMT"];
  const statuses: MachineStatus[] = ["running", "running", "running", "idle", "error", "maintenance", "offline"];
  return Array.from({ length: 15 }, (_, i) => ({
    id: `M-${String(i + 1).padStart(3, "0")}`,
    name: `${types[i % types.length]}-${String(Math.floor(i / types.length) + 1).padStart(2, "0")}`,
    type: types[i % types.length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    x: 50 + (i % 5) * 180,
    y: 50 + Math.floor(i / 5) * 150,
    oee: 70 + Math.random() * 25,
    cycleTime: 150 + Math.random() * 100,
    defectRate: Math.random() * 5,
    lastUpdate: new Date(),
  }));
};

export default function FloorPlanLive() {
  const [machines, setMachines] = useState<Machine[]>(() => generateMockMachines());
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [zoom, setZoom] = useState(100);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [selectedFloor, setSelectedFloor] = useState("floor-1");
  const [draggedMachine, setDraggedMachine] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setMachines((prev) =>
        prev.map((m) => ({
          ...m,
          status: Math.random() > 0.9 ? (["running", "idle", "error", "maintenance", "offline"] as MachineStatus[])[Math.floor(Math.random() * 5)] : m.status,
          oee: Math.max(0, Math.min(100, m.oee + (Math.random() - 0.5) * 5)),
          cycleTime: Math.max(100, m.cycleTime + (Math.random() - 0.5) * 20),
          defectRate: Math.max(0, Math.min(10, m.defectRate + (Math.random() - 0.5) * 0.5)),
          lastUpdate: new Date(),
        }))
      );
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleMouseDown = useCallback((e: React.MouseEvent, machineId: string) => {
    const machine = machines.find((m) => m.id === machineId);
    if (!machine) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDraggedMachine(machineId);
  }, [machines]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggedMachine) return;
    const container = e.currentTarget.getBoundingClientRect();
    const newX = Math.max(0, Math.min(container.width - 100, e.clientX - container.left - dragOffset.x));
    const newY = Math.max(0, Math.min(container.height - 80, e.clientY - container.top - dragOffset.y));
    setMachines((prev) => prev.map((m) => (m.id === draggedMachine ? { ...m, x: newX, y: newY } : m)));
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
            <p className="text-muted-foreground mt-1">So do nha may voi trang thai may realtime</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="floor-1">Tang 1</SelectItem>
                <SelectItem value="floor-2">Tang 2</SelectItem>
                <SelectItem value="floor-3">Tang 3</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} id="auto-refresh" />
              <Label htmlFor="auto-refresh">Auto Refresh</Label>
            </div>
            <Button variant="outline" size="icon" onClick={() => setMachines(generateMockMachines())}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Tong may</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
          <Card className="border-green-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Dang chay</p><p className="text-2xl font-bold text-green-500">{stats.running}</p></CardContent></Card>
          <Card className="border-yellow-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Cho</p><p className="text-2xl font-bold text-yellow-500">{stats.idle}</p></CardContent></Card>
          <Card className="border-red-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Loi</p><p className="text-2xl font-bold text-red-500">{stats.error}</p></CardContent></Card>
          <Card className="border-blue-500/50"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Bao tri</p><p className="text-2xl font-bold text-blue-500">{stats.maintenance}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">OEE TB</p><p className="text-2xl font-bold">{stats.avgOee.toFixed(1)}%</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>So do nha may</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.max(50, z - 10))}><ZoomOut className="h-4 w-4" /></Button>
                  <span className="text-sm w-12 text-center">{zoom}%</span>
                  <Button variant="outline" size="icon" onClick={() => setZoom((z) => Math.min(150, z + 10))}><ZoomIn className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                          className={`absolute w-24 h-20 rounded-lg border-2 cursor-move transition-shadow ${statusColors[machine.status]} bg-opacity-20 hover:shadow-lg ${selectedMachine?.id === machine.id ? "ring-2 ring-primary" : ""} ${draggedMachine === machine.id ? "opacity-70" : ""}`}
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
                          <div className="flex items-center gap-2">
                            {statusIcons[machine.status]}
                            <Badge className={statusColors[machine.status]}>{statusLabels[machine.status]}</Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div>OEE: <span className="font-medium">{machine.oee.toFixed(1)}%</span></div>
                            <div>Cycle Time: <span className="font-medium">{machine.cycleTime.toFixed(0)}ms</span></div>
                            <div>Defect Rate: <span className="font-medium">{machine.defectRate.toFixed(2)}%</span></div>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Chi tiet may</CardTitle></CardHeader>
            <CardContent>
              {selectedMachine ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-medium">{selectedMachine.name}</span>
                    <Badge className={statusColors[selectedMachine.status]}>{statusLabels[selectedMachine.status]}</Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between"><span className="text-muted-foreground">Loai may</span><span className="font-medium">{selectedMachine.type}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">OEE</span><span className={`font-medium ${selectedMachine.oee >= 85 ? "text-green-500" : selectedMachine.oee >= 70 ? "text-yellow-500" : "text-red-500"}`}>{selectedMachine.oee.toFixed(1)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cycle Time</span><span className="font-medium">{selectedMachine.cycleTime.toFixed(0)}ms</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Defect Rate</span><span className={`font-medium ${selectedMachine.defectRate <= 1 ? "text-green-500" : selectedMachine.defectRate <= 3 ? "text-yellow-500" : "text-red-500"}`}>{selectedMachine.defectRate.toFixed(2)}%</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cap nhat</span><span className="text-sm">{selectedMachine.lastUpdate.toLocaleTimeString("vi-VN")}</span></div>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button className="w-full" variant="outline">Xem chi tiet</Button>
                    <Button className="w-full" variant="outline">Lich su</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">Chon mot may de xem chi tiet</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Cau hinh</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Tan suat cap nhat (ms)</Label>
                <Slider value={[refreshInterval]} onValueChange={([v]) => setRefreshInterval(v)} min={1000} max={10000} step={500} />
                <p className="text-sm text-muted-foreground">{refreshInterval}ms</p>
              </div>
              <div className="space-y-2">
                <Label>Zoom</Label>
                <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={50} max={150} step={5} />
                <p className="text-sm text-muted-foreground">{zoom}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
