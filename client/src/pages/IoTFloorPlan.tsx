/**
 * IoTFloorPlan - Trang hiển thị sơ đồ nhà máy với realtime IoT status
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Map, Plus, Settings, Activity, AlertTriangle, 
  CheckCircle, RefreshCw, Maximize2, Grid3X3
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import FloorPlanViewer, { FloorPlanConfig, MachinePosition } from "@/components/FloorPlanViewer";
import ParetoChart, { DowntimeRecord } from "@/components/ParetoChart";
import LatencyMonitor, { LatencyRecord } from "@/components/LatencyMonitor";

// Demo data for floor plan
const demoFloorPlanConfig: FloorPlanConfig = {
  id: 'demo-1',
  name: 'Xưởng sản xuất A',
  width: 1000,
  height: 600,
  gridSize: 25,
  backgroundColor: '#f1f5f9',
  machines: [
    { id: 'm1', machineId: 1, machineName: 'CNC-001', machineType: 'CNC Machine', x: 50, y: 50, width: 120, height: 80, rotation: 0, color: '#3b82f6' },
    { id: 'm2', machineId: 2, machineName: 'CNC-002', machineType: 'CNC Machine', x: 200, y: 50, width: 120, height: 80, rotation: 0, color: '#3b82f6' },
    { id: 'm3', machineId: 3, machineName: 'LATHE-001', machineType: 'Lathe', x: 350, y: 50, width: 100, height: 70, rotation: 0, color: '#8b5cf6' },
    { id: 'm4', machineId: 4, machineName: 'MILL-001', machineType: 'Milling', x: 50, y: 180, width: 110, height: 90, rotation: 0, color: '#06b6d4' },
    { id: 'm5', machineId: 5, machineName: 'MILL-002', machineType: 'Milling', x: 200, y: 180, width: 110, height: 90, rotation: 0, color: '#06b6d4' },
    { id: 'm6', machineId: 6, machineName: 'GRIND-001', machineType: 'Grinding', x: 350, y: 180, width: 90, height: 70, rotation: 0, color: '#10b981' },
    { id: 'm7', machineId: 7, machineName: 'PRESS-001', machineType: 'Press', x: 500, y: 50, width: 130, height: 100, rotation: 0, color: '#f59e0b' },
    { id: 'm8', machineId: 8, machineName: 'WELD-001', machineType: 'Welding', x: 500, y: 180, width: 100, height: 80, rotation: 0, color: '#ef4444' },
    { id: 'm9', machineId: 9, machineName: 'INSP-001', machineType: 'Inspection', x: 650, y: 50, width: 80, height: 60, rotation: 0, color: '#ec4899' },
    { id: 'm10', machineId: 10, machineName: 'PACK-001', machineType: 'Packaging', x: 650, y: 180, width: 100, height: 70, rotation: 0, color: '#6366f1' },
    { id: 'm11', machineId: 11, machineName: 'CONV-001', machineType: 'Conveyor', x: 50, y: 320, width: 700, height: 40, rotation: 0, color: '#64748b' },
    { id: 'm12', machineId: 12, machineName: 'ROBOT-001', machineType: 'Robot Arm', x: 800, y: 100, width: 80, height: 80, rotation: 0, color: '#14b8a6' },
  ],
};

// Demo downtime data for Pareto chart
const demoDowntimeData: DowntimeRecord[] = [
  { id: 1, category: 'Hỏng cơ khí', reason: 'Gãy dao cắt', durationMinutes: 180, count: 5, severity: 'major' },
  { id: 2, category: 'Lỗi điện', reason: 'Mất nguồn', durationMinutes: 120, count: 3, severity: 'critical' },
  { id: 3, category: 'Thiếu nguyên liệu', reason: 'Chờ vật tư', durationMinutes: 90, count: 8, severity: 'moderate' },
  { id: 4, category: 'Bảo trì định kỳ', reason: 'PM hàng tháng', durationMinutes: 60, count: 2, severity: 'minor' },
  { id: 5, category: 'Lỗi phần mềm', reason: 'PLC lỗi', durationMinutes: 45, count: 4, severity: 'moderate' },
  { id: 6, category: 'Hỏng cơ khí', reason: 'Mòn bearing', durationMinutes: 75, count: 3, severity: 'major' },
  { id: 7, category: 'Setup máy', reason: 'Đổi khuôn', durationMinutes: 40, count: 12, severity: 'minor' },
  { id: 8, category: 'Lỗi chất lượng', reason: 'Sản phẩm NG', durationMinutes: 30, count: 6, severity: 'moderate' },
  { id: 9, category: 'Thiếu nhân lực', reason: 'Nghỉ phép', durationMinutes: 25, count: 2, severity: 'minor' },
  { id: 10, category: 'Lỗi điện', reason: 'Cháy motor', durationMinutes: 150, count: 1, severity: 'critical' },
];

// Demo latency data
const generateLatencyData = (): LatencyRecord[] => {
  const sources: Array<'sensor' | 'plc' | 'gateway' | 'server'> = ['sensor', 'plc', 'gateway', 'server'];
  const data: LatencyRecord[] = [];
  const now = Date.now();
  
  for (let i = 0; i < 100; i++) {
    const source = sources[Math.floor(Math.random() * sources.length)];
    let baseLatency = 0;
    switch (source) {
      case 'sensor': baseLatency = 20; break;
      case 'plc': baseLatency = 35; break;
      case 'gateway': baseLatency = 50; break;
      case 'server': baseLatency = 80; break;
    }
    
    data.push({
      id: i + 1,
      deviceId: Math.floor(Math.random() * 12) + 1,
      deviceName: `Device-${Math.floor(Math.random() * 12) + 1}`,
      sourceType: source,
      latencyMs: baseLatency + Math.random() * 50 + (Math.random() > 0.95 ? 150 : 0),
      timestamp: new Date(now - i * 60000),
    });
  }
  
  return data.reverse();
};

export default function IoTFloorPlan() {
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('floorplan');
  const [latencyData, setLatencyData] = useState<LatencyRecord[]>(generateLatencyData());

  // Fetch production lines
  const { data: productionLines } = trpc.productionLine.getAll.useQuery();
  
  // Fetch floor plan configs
  const { data: floorPlans, refetch: refetchFloorPlans } = trpc.floorPlan.getAll.useQuery();

  // Get current floor plan config
  const currentFloorPlan = useMemo(() => {
    if (floorPlans && floorPlans.length > 0) {
      const selected = selectedLine !== 'all' 
        ? floorPlans.find(fp => fp.productionLineId === parseInt(selectedLine))
        : floorPlans[0];
      
      if (selected) {
        return {
          id: String(selected.id),
          name: selected.name,
          width: selected.width,
          height: selected.height,
          gridSize: selected.gridSize,
          backgroundColor: selected.backgroundColor || '#f1f5f9',
          backgroundImage: selected.backgroundImage,
          machines: (selected.machinePositions || []) as MachinePosition[],
        };
      }
    }
    return demoFloorPlanConfig;
  }, [floorPlans, selectedLine]);

  const handleMachineClick = (machineId: number) => {
    toast.info(`Đã chọn máy ID: ${machineId}`);
  };

  const handleRefreshLatency = () => {
    setLatencyData(generateLatencyData());
    toast.success('Đã làm mới dữ liệu latency');
  };

  // Stats
  const stats = useMemo(() => {
    const machines = currentFloorPlan.machines;
    return {
      total: machines.length,
      online: Math.floor(machines.length * 0.75),
      offline: Math.floor(machines.length * 0.1),
      error: Math.floor(machines.length * 0.1),
      maintenance: Math.floor(machines.length * 0.05),
    };
  }, [currentFloorPlan]);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="h-6 w-6" />
            Sơ đồ Nhà máy IoT
          </h1>
          <p className="text-muted-foreground">
            Theo dõi realtime trạng thái thiết bị và phân tích hiệu suất
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedLine} onValueChange={setSelectedLine}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn dây chuyền" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả dây chuyền</SelectItem>
              {productionLines?.map((line) => (
                <SelectItem key={line.id} value={String(line.id)}>
                  {line.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetchFloorPlans()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Grid3X3 className="h-4 w-4" />
              <span className="text-sm">Tổng thiết bị</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Online</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.online}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Activity className="h-4 w-4" />
              <span className="text-sm">Offline</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-gray-500">{stats.offline}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Lỗi</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-500">{stats.error}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-yellow-500">
              <Settings className="h-4 w-4" />
              <span className="text-sm">Bảo trì</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-500">{stats.maintenance}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="floorplan" className="flex items-center gap-2">
            <Map className="h-4 w-4" />
            Sơ đồ nhà máy
          </TabsTrigger>
          <TabsTrigger value="pareto" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Pareto Analysis
          </TabsTrigger>
          <TabsTrigger value="latency" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Latency Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="floorplan" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                {currentFloorPlan.name}
              </CardTitle>
              <CardDescription>
                Click vào thiết bị để xem chi tiết sensor và trạng thái realtime
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FloorPlanViewer
                config={currentFloorPlan}
                onMachineClick={handleMachineClick}
                refreshInterval={5000}
                showLegend={true}
                interactive={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pareto" className="mt-4">
          <ParetoChart
            data={demoDowntimeData}
            title="Biểu đồ Pareto - Nguyên nhân dừng máy"
            description="Phân tích 80/20 các nguyên nhân chính gây dừng máy trong 30 ngày qua"
            showTable={true}
            maxItems={10}
            onCategoryClick={(category) => toast.info(`Xem chi tiết: ${category}`)}
          />
        </TabsContent>

        <TabsContent value="latency" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Giám sát Latency
              </CardTitle>
              <CardDescription>
                Theo dõi độ trễ từ Sensor → PLC → Gateway → Server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LatencyMonitor
                data={latencyData}
                thresholds={{ good: 50, warning: 100, critical: 200 }}
                refreshInterval={5000}
                onRefresh={handleRefreshLatency}
                showRealtime={true}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
