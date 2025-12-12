import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { 
  Factory, 
  Wrench, 
  Cpu, 
  Settings2,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Loader2,
  Eye,
  BarChart3,
  Layers,
  Box,
  Download,
  FileImage,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SpcPlan {
  id: number;
  name: string;
  description?: string | null;
  productionLineId: number;
  workstationId?: number | null;
  machineId?: number | null;
  fixtureId?: number | null;
  status: string;
}

interface ProductionLine {
  id: number;
  name: string;
  code: string;
  description?: string | null;
}

interface Workstation {
  id: number;
  name: string;
  code: string;
  productionLineId: number;
}

interface Machine {
  id: number;
  name: string;
  code: string;
  workstationId?: number | null;
}

interface Fixture {
  id: number;
  name: string;
  code: string;
  machineId?: number | null;
}

// Display metrics configuration
const defaultMetrics = [
  { key: "cpk", label: "CPK", enabled: true },
  { key: "mean", label: "Mean", enabled: true },
  { key: "stdDev", label: "Std Dev", enabled: false },
  { key: "sampleCount", label: "Samples", enabled: true },
  { key: "status", label: "Status", enabled: true },
];

export default function SpcPlanVisualization() {
  const [, setLocation] = useLocation();
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"hierarchy" | "grid">("hierarchy");
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [metrics, setMetrics] = useState(defaultMetrics);

  // Fetch data
  const { data: productionLines = [], isLoading: loadingLines } = trpc.productionLine.list.useQuery();
  const { data: workstations = [] } = trpc.workstation.listAll.useQuery();
  const { data: machines = [] } = trpc.machine.listAll.useQuery();
  const { data: fixtures = [] } = trpc.fixture.list.useQuery();
  const { data: spcPlans = [] } = trpc.spcPlan.list.useQuery();
  
  // Get active plan IDs for realtime data fetching
  const activePlanIds = useMemo(() => {
    return spcPlans.filter((p: SpcPlan) => p.status === "active").map((p: SpcPlan) => p.id);
  }, [spcPlans]);

  // Fetch realtime data for all active plans
  const { data: realtimeDataMap = {} } = trpc.spc.getRealtimeDataMultiple.useQuery(
    { planIds: activePlanIds },
    { 
      enabled: activePlanIds.length > 0,
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  // Export functions
  const handleExportPNG = async () => {
    try {
      toast.info("Đang xuất hình ảnh...");
      // Use html2canvas to capture the visualization
      const element = document.getElementById('spc-visualization-content');
      if (!element) {
        toast.error("Không tìm thấy nội dung để xuất");
        return;
      }
      
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      
      const link = document.createElement('a');
      link.download = `spc-visualization-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success("Đã xuất hình ảnh thành công");
    } catch (error) {
      console.error('Export PNG error:', error);
      toast.error("Lỗi khi xuất hình ảnh");
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info("Đang xuất PDF...");
      const element = document.getElementById('spc-visualization-content');
      if (!element) {
        toast.error("Không tìm thấy nội dung để xuất");
        return;
      }
      
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 280; // A4 landscape width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`spc-visualization-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Đã xuất PDF thành công");
    } catch (error) {
      console.error('Export PDF error:', error);
      toast.error("Lỗi khi xuất PDF");
    }
  };

  // Filter data by selected line
  const filteredWorkstations = useMemo(() => {
    if (!selectedLineId) return workstations;
    return workstations.filter((w: Workstation) => w.productionLineId === selectedLineId);
  }, [workstations, selectedLineId]);

  const filteredMachines = useMemo(() => {
    const wsIds = filteredWorkstations.map((w: Workstation) => w.id);
    return machines.filter((m: Machine) => m.workstationId && wsIds.includes(m.workstationId));
  }, [machines, filteredWorkstations]);

  const filteredFixtures = useMemo(() => {
    const machineIds = filteredMachines.map((m: Machine) => m.id);
    return fixtures.filter((f: Fixture) => f.machineId && machineIds.includes(f.machineId));
  }, [fixtures, filteredMachines]);

  // Get SPC plans for an entity
  const getPlansForEntity = (type: "line" | "workstation" | "machine" | "fixture", entityId: number) => {
    return spcPlans.filter((p: SpcPlan) => {
      if (type === "line") return p.productionLineId === entityId;
      if (type === "workstation") return p.workstationId === entityId;
      if (type === "machine") return p.machineId === entityId;
      if (type === "fixture") return p.fixtureId === entityId;
      return false;
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "paused": return "bg-yellow-500";
      case "draft": return "bg-gray-400";
      case "completed": return "bg-blue-500";
      default: return "bg-gray-400";
    }
  };

  // Get status badge based on realtime data
  const getStatusBadge = (plans: SpcPlan[]) => {
    const activePlans = plans.filter(p => p.status === "active");
    
    if (activePlans.length === 0) {
      return <Badge variant="outline" className="text-xs">Không có kế hoạch</Badge>;
    }
    
    // Check if any active plan has poor CPK (< 1.0)
    const hasViolation = activePlans.some(p => {
      const data = realtimeDataMap[p.id];
      return data && data.cpk !== null && data.cpk < 1.0;
    });
    
    // Check if any active plan has warning CPK (< 1.33)
    const hasWarning = activePlans.some(p => {
      const data = realtimeDataMap[p.id];
      return data && data.cpk !== null && data.cpk < 1.33;
    });
    
    if (hasViolation) {
      return <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />CPK thấp</Badge>;
    }
    if (hasWarning) {
      return <Badge className="bg-yellow-500 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Cần chú ý</Badge>;
    }
    return <Badge className="bg-green-500 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Bình thường</Badge>;
  };

  // Navigate to detail page
  const navigateToDetail = (type: string, id: number) => {
    setLocation(`/spc-visualization/${type}/${id}`);
  };

  // Render production line card (visual representation)
  const renderProductionLineVisual = (line: ProductionLine) => {
    const lineWorkstations = workstations.filter((w: Workstation) => w.productionLineId === line.id);
    const linePlans = getPlansForEntity("line", line.id);
    const activePlans = linePlans.filter((p: SpcPlan) => p.status === "active");

    return (
      <Card key={line.id} className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500/10 to-blue-600/5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Factory className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">{line.name}</CardTitle>
                <CardDescription>{line.code} • {lineWorkstations.length} công trạm</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(linePlans)}
              <Badge variant="outline">{activePlans.length} kế hoạch đang chạy</Badge>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigateToDetail("line", line.id)}
              >
                <Eye className="h-4 w-4 mr-1" />
                Chi tiết
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {/* Visual production line representation */}
          <div className="relative">
            {/* Conveyor belt visual */}
            <div className="absolute top-1/2 left-0 right-0 h-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-full -translate-y-1/2 z-0" />
            
            {/* Workstations along the line */}
            <div className="relative z-10 flex items-center justify-between gap-2 py-8 overflow-x-auto">
              {lineWorkstations.length > 0 ? (
                lineWorkstations.map((ws: Workstation, index: number) => {
                  const wsPlans = getPlansForEntity("workstation", ws.id);
                  const wsMachines = machines.filter((m: Machine) => m.workstationId === ws.id);
                  const hasActivePlan = wsPlans.some((p: SpcPlan) => p.status === "active");
                  
                  return (
                    <div key={ws.id} className="flex items-center">
                      {/* Workstation node */}
                      <div 
                        className={`
                          relative flex flex-col items-center p-3 rounded-xl cursor-pointer
                          transition-all duration-200 hover:scale-105 hover:shadow-lg
                          ${hasActivePlan ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50 border-2 border-gray-200'}
                        `}
                        onClick={() => navigateToDetail("workstation", ws.id)}
                      >
                        {/* Status indicator */}
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${hasActivePlan ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        
                        <div className={`p-2 rounded-lg ${hasActivePlan ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <Wrench className={`h-5 w-5 ${hasActivePlan ? 'text-green-600' : 'text-gray-500'}`} />
                        </div>
                        <span className="mt-2 text-xs font-medium text-center max-w-[80px] truncate">{ws.name}</span>
                        <span className="text-[10px] text-muted-foreground">{wsMachines.length} máy</span>
                        
                        {/* Metrics display */}
                        {hasActivePlan && metrics.find(m => m.key === "cpk")?.enabled && (() => {
                          // Find active plan for this workstation and get its realtime data
                          const activePlan = wsPlans.find((p: SpcPlan) => p.status === "active");
                          const planData = activePlan ? realtimeDataMap[activePlan.id] : null;
                          const cpkValue = planData?.cpk;
                          const cpkColor = cpkValue === null || cpkValue === undefined ? 'text-gray-500' : 
                                          cpkValue >= 1.33 ? 'text-green-600' : 
                                          cpkValue >= 1.0 ? 'text-yellow-600' : 'text-red-600';
                          return (
                            <div className={`mt-1 px-2 py-0.5 bg-white rounded text-[10px] font-mono ${cpkColor}`}>
                              CPK: {cpkValue !== null && cpkValue !== undefined ? cpkValue.toFixed(2) : 'N/A'}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Arrow connector */}
                      {index < lineWorkstations.length - 1 && (
                        <ChevronRight className="h-5 w-5 text-gray-400 mx-1 flex-shrink-0" />
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 text-center py-4 text-muted-foreground">
                  Chưa có công trạm nào được cấu hình
                </div>
              )}
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{lineWorkstations.length}</div>
              <div className="text-xs text-muted-foreground">Công trạm</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {machines.filter((m: Machine) => lineWorkstations.some((w: Workstation) => w.id === m.workstationId)).length}
              </div>
              <div className="text-xs text-muted-foreground">Máy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{activePlans.length}</div>
              <div className="text-xs text-muted-foreground">Kế hoạch Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">0</div>
              <div className="text-xs text-muted-foreground">Cảnh báo</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render grid view
  const renderGridView = () => {
    const lines = selectedLineId 
      ? productionLines.filter((l: ProductionLine) => l.id === selectedLineId)
      : productionLines;

    return (
      <Tabs defaultValue="lines" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="lines" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Dây chuyền ({productionLines.length})
          </TabsTrigger>
          <TabsTrigger value="workstations" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Công trạm ({filteredWorkstations.length})
          </TabsTrigger>
          <TabsTrigger value="machines" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Máy ({filteredMachines.length})
          </TabsTrigger>
          <TabsTrigger value="fixtures" className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            Fixture ({filteredFixtures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lines.map((line: ProductionLine) => {
              const linePlans = getPlansForEntity("line", line.id);
              const lineWs = workstations.filter((w: Workstation) => w.productionLineId === line.id);
              
              return (
                <Card 
                  key={line.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigateToDetail("line", line.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Factory className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{line.name}</CardTitle>
                        <CardDescription>{line.code}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm">
                        <span>{lineWs.length} công trạm</span>
                        <span>{linePlans.filter((p: SpcPlan) => p.status === "active").length} kế hoạch</span>
                      </div>
                      {getStatusBadge(linePlans)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="workstations" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkstations.map((ws: Workstation) => {
              const wsPlans = getPlansForEntity("workstation", ws.id);
              const wsMachines = machines.filter((m: Machine) => m.workstationId === ws.id);
              const line = productionLines.find((l: ProductionLine) => l.id === ws.productionLineId);
              
              return (
                <Card 
                  key={ws.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigateToDetail("workstation", ws.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Wrench className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{ws.name}</CardTitle>
                        <CardDescription>{ws.code} • {line?.name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm">
                        <span>{wsMachines.length} máy</span>
                        <span>{wsPlans.filter((p: SpcPlan) => p.status === "active").length} kế hoạch</span>
                      </div>
                      {getStatusBadge(wsPlans)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="machines" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMachines.map((machine: Machine) => {
              const machinePlans = getPlansForEntity("machine", machine.id);
              const machineFixtures = fixtures.filter((f: Fixture) => f.machineId === machine.id);
              const ws = workstations.find((w: Workstation) => w.id === machine.workstationId);
              
              return (
                <Card 
                  key={machine.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigateToDetail("machine", machine.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Cpu className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{machine.name}</CardTitle>
                        <CardDescription>{machine.code} • {ws?.name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-4 text-sm">
                        <span>{machineFixtures.length} fixture</span>
                        <span>{machinePlans.filter((p: SpcPlan) => p.status === "active").length} kế hoạch</span>
                      </div>
                      {getStatusBadge(machinePlans)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="fixtures" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFixtures.map((fixture: Fixture) => {
              const fixturePlans = getPlansForEntity("fixture", fixture.id);
              const machine = machines.find((m: Machine) => m.id === fixture.machineId);
              
              return (
                <Card 
                  key={fixture.id} 
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigateToDetail("fixture", fixture.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Box className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{fixture.name}</CardTitle>
                        <CardDescription>{fixture.code} • {machine?.name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{fixturePlans.filter((p: SpcPlan) => p.status === "active").length} kế hoạch</span>
                      {getStatusBadge(fixturePlans)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  if (loadingLines) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Trực quan hóa SPC Plan
            </h1>
            <p className="text-muted-foreground">
              Xem tổng quan các kế hoạch SPC theo dây chuyền sản xuất
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Line filter */}
            <Select 
              value={selectedLineId?.toString() || "all"} 
              onValueChange={(v) => setSelectedLineId(v === "all" ? null : parseInt(v))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tất cả dây chuyền" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                {productionLines.map((line: ProductionLine) => (
                  <SelectItem key={line.id} value={line.id.toString()}>
                    {line.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* View mode toggle */}
            <div className="flex items-center gap-2 border rounded-lg p-1">
              <Button
                variant={viewMode === "hierarchy" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("hierarchy")}
              >
                <Factory className="h-4 w-4 mr-1" />
                Dây chuyền
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Layers className="h-4 w-4 mr-1" />
                Lưới
              </Button>
            </div>

            {/* Export button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Xuất
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportPNG()}>
                  <FileImage className="h-4 w-4 mr-2" />
                  Xuất PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF()}>
                  <FileText className="h-4 w-4 mr-2" />
                  Xuất PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Config button */}
            <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
              <Settings2 className="h-4 w-4 mr-1" />
              Cấu hình
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Factory className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{productionLines.length}</div>
                  <div className="text-xs text-muted-foreground">Dây chuyền</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{workstations.length}</div>
                  <div className="text-xs text-muted-foreground">Công trạm</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {spcPlans.filter((p: SpcPlan) => p.status === "active").length}
                  </div>
                  <div className="text-xs text-muted-foreground">Kế hoạch Active</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-xs text-muted-foreground">Cảnh báo</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div id="spc-visualization-content">
        {viewMode === "hierarchy" ? (
          <div className="space-y-6">
            {(selectedLineId 
              ? productionLines.filter((l: ProductionLine) => l.id === selectedLineId)
              : productionLines
            ).map((line: ProductionLine) => renderProductionLineVisual(line))}
          </div>
        ) : (
          renderGridView()
        )}
        </div>

        {/* Config Dialog */}
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cấu hình hiển thị</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Chỉ số hiển thị</Label>
                {metrics.map((metric, index) => (
                  <div key={metric.key} className="flex items-center justify-between">
                    <span className="text-sm">{metric.label}</span>
                    <Switch
                      checked={metric.enabled}
                      onCheckedChange={(checked) => {
                        const newMetrics = [...metrics];
                        newMetrics[index].enabled = checked;
                        setMetrics(newMetrics);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
