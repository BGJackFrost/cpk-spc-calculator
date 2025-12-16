import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wrench,
  Search,
  Filter,
  RefreshCw,
  Wifi,
  WifiOff,
  Bell,
  BellRing,
  ChevronRight,
  Factory,
  Cpu,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface MachineStatus {
  id: number;
  name: string;
  code: string;
  status: "running" | "idle" | "error" | "maintenance";
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  cpk: number;
  alerts: number;
  lastUpdate: Date;
  productionLineId?: number;
  productionLineName?: string;
  trend: "up" | "down" | "stable";
  sparklineData: { value: number }[];
}

// Generate sparkline data once per machine
function generateSparklineData(): { value: number }[] {
  return Array.from({ length: 12 }, () => ({
    value: Math.random() * 20 + 70
  }));
}

export default function SupervisorDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lineFilter, setLineFilter] = useState<string>("all");
  const [alertFilter, setAlertFilter] = useState<string>("all");
  const [machineStatuses, setMachineStatuses] = useState<MachineStatus[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const initializedRef = useRef(false);

  // Fetch machines
  const { data: machines, isLoading: machinesLoading, refetch: refetchMachines } = trpc.machine.listAll.useQuery();
  
  // Fetch production lines
  const { data: productionLines } = trpc.productionLine.list.useQuery();

  // Fetch OEE records
  const { data: oeeRecords } = trpc.oee.listRecords.useQuery({ limit: 100 });

  // Process machine data with OEE and status - only run once when data is available
  useEffect(() => {
    if (!machines || initializedRef.current) return;
    
    initializedRef.current = true;

    const statuses: MachineStatus[] = machines.map((machine: any) => {
      // Find latest OEE record for this machine
      const machineOEE = oeeRecords?.find((r: any) => r.machineId === machine.id);

      // Find production line
      const line = productionLines?.find((l: any) => l.id === machine.productionLineId);

      // Use real data or generate demo data
      const oee = Number(machineOEE?.oee) || Math.floor(Math.random() * 30 + 65);
      const availability = Number(machineOEE?.availability) || Math.floor(Math.random() * 15 + 80);
      const performance = Number(machineOEE?.performance) || Math.floor(Math.random() * 15 + 80);
      const quality = Number(machineOEE?.quality) || Math.floor(Math.random() * 10 + 88);
      const cpk = Math.floor((Math.random() * 1.5 + 0.8) * 100) / 100;

      // Determine status based on OEE
      let status: MachineStatus["status"] = "running";
      if (oee < 50) {
        status = "error";
      } else if (oee < 70) {
        status = "idle";
      }

      // Count alerts
      let alerts = 0;
      if (oee < 70) alerts++;
      if (cpk < 1.0) alerts++;
      if (status === "error") alerts++;

      // Determine trend
      const rand = Math.random();
      const trend: MachineStatus["trend"] = rand > 0.6 ? "up" : rand > 0.3 ? "stable" : "down";

      return {
        id: machine.id,
        name: machine.name,
        code: machine.code,
        status,
        oee,
        availability,
        performance,
        quality,
        cpk,
        alerts,
        lastUpdate: new Date(),
        productionLineId: machine.productionLineId,
        productionLineName: line?.name || "N/A",
        trend,
        sparklineData: generateSparklineData()
      };
    });

    setMachineStatuses(statuses);
  }, [machines, oeeRecords, productionLines]);

  // Reset initialized flag when machines change
  useEffect(() => {
    if (machines) {
      initializedRef.current = false;
    }
  }, [machines?.length]);

  // Filter machines
  const filteredMachines = useMemo(() => {
    return machineStatuses.filter(machine => {
      // Search filter
      if (searchTerm && !machine.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !machine.code.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && machine.status !== statusFilter) {
        return false;
      }
      // Line filter
      if (lineFilter !== "all" && machine.productionLineId?.toString() !== lineFilter) {
        return false;
      }
      // Alert filter
      if (alertFilter === "with_alerts" && machine.alerts === 0) {
        return false;
      }
      if (alertFilter === "no_alerts" && machine.alerts > 0) {
        return false;
      }
      return true;
    });
  }, [machineStatuses, searchTerm, statusFilter, lineFilter, alertFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const total = machineStatuses.length;
    const running = machineStatuses.filter(m => m.status === "running").length;
    const idle = machineStatuses.filter(m => m.status === "idle").length;
    const error = machineStatuses.filter(m => m.status === "error").length;
    const maintenance = machineStatuses.filter(m => m.status === "maintenance").length;
    const withAlerts = machineStatuses.filter(m => m.alerts > 0).length;
    const avgOEE = machineStatuses.length > 0 
      ? machineStatuses.reduce((sum, m) => sum + m.oee, 0) / machineStatuses.length 
      : 0;
    return { total, running, idle, error, maintenance, withAlerts, avgOEE };
  }, [machineStatuses]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-500";
      case "idle": return "bg-yellow-500";
      case "error": return "bg-red-500";
      case "maintenance": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "running": return "Đang chạy";
      case "idle": return "Chờ";
      case "error": return "Lỗi";
      case "maintenance": return "Bảo trì";
      default: return "N/A";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOEEColor = (oee: number) => {
    if (oee >= 85) return "text-green-500";
    if (oee >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getCPKColor = (cpk: number) => {
    if (cpk >= 1.33) return "text-green-500";
    if (cpk >= 1.0) return "text-yellow-500";
    return "text-red-500";
  };

  const handleRefresh = useCallback(() => {
    initializedRef.current = false;
    refetchMachines();
  }, [refetchMachines]);

  if (machinesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard Supervisor</h1>
            <p className="text-muted-foreground">Giám sát tổng hợp tất cả máy trong nhà máy</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Wifi className="h-3 w-3 text-green-500" />
              Online
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Tổng máy</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Cpu className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Đang chạy</p>
                  <p className="text-2xl font-bold text-green-500">{stats.running}</p>
                </div>
                <Activity className="h-6 w-6 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Chờ</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.idle}</p>
                </div>
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Lỗi</p>
                  <p className="text-2xl font-bold text-red-500">{stats.error}</p>
                </div>
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Bảo trì</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.maintenance}</p>
                </div>
                <Wrench className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Có cảnh báo</p>
                  <p className="text-2xl font-bold text-orange-500">{stats.withAlerts}</p>
                </div>
                <BellRing className="h-6 w-6 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">OEE TB</p>
                  <p className={`text-2xl font-bold ${getOEEColor(stats.avgOEE)}`}>
                    {stats.avgOEE.toFixed(1)}%
                  </p>
                </div>
                <Gauge className="h-6 w-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm máy..."
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
                  <SelectItem value="running">Đang chạy</SelectItem>
                  <SelectItem value="idle">Chờ</SelectItem>
                  <SelectItem value="error">Lỗi</SelectItem>
                  <SelectItem value="maintenance">Bảo trì</SelectItem>
                </SelectContent>
              </Select>
              <Select value={lineFilter} onValueChange={setLineFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Dây chuyền" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả dây chuyền</SelectItem>
                  {productionLines?.map((line: any) => (
                    <SelectItem key={line.id} value={line.id.toString()}>
                      {line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={alertFilter} onValueChange={setAlertFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Cảnh báo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="with_alerts">Có cảnh báo</SelectItem>
                  <SelectItem value="no_alerts">Không cảnh báo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Machine Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMachines.map((machine) => (
            <Card 
              key={machine.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLocation(`/machine/${machine.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(machine.status)} animate-pulse`} />
                    <CardTitle className="text-sm font-medium">{machine.name}</CardTitle>
                  </div>
                  {machine.alerts > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <Bell className="h-3 w-3 mr-1" />
                      {machine.alerts}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {machine.code} • {machine.productionLineName}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* OEE Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">OEE</span>
                    <span className={`font-medium ${getOEEColor(machine.oee)}`}>
                      {machine.oee.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        machine.oee >= 85 ? 'bg-green-500' : 
                        machine.oee >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(machine.oee, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CPK</span>
                    <span className={`font-medium ${getCPKColor(machine.cpk)}`}>
                      {machine.cpk.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trend</span>
                    {getTrendIcon(machine.trend)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">A</span>
                    <span className="font-medium">{machine.availability.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">P</span>
                    <span className="font-medium">{machine.performance.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Status & Action */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <Badge variant="outline" className={`${getStatusColor(machine.status)} text-white text-xs`}>
                    {getStatusText(machine.status)}
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 px-2">
                    Chi tiết
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredMachines.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Factory className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Không tìm thấy máy nào phù hợp với bộ lọc</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
