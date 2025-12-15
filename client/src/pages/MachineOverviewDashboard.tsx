import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Monitor, Wifi, WifiOff, AlertTriangle, CheckCircle2, XCircle, 
  Activity, TrendingUp, Search, RefreshCw, Bell, Clock, Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import AlarmHeatmap from "@/components/AlarmHeatmap";

interface MachineStatus {
  isOnline: number;
  status: string | null;
  currentCpk: number | null;
  currentMean: number | null;
  activeAlarmCount: number;
  warningCount: number;
  criticalCount: number;
  lastHeartbeat: Date | null;
  statusMessage: string | null;
}

interface MachineWithStatus {
  id: number;
  name: string;
  code: string;
  status: MachineStatus | null;
  activeAlerts: any[];
  warningCount: number;
  criticalCount: number;
}

const statusColors: Record<string, string> = {
  idle: "bg-gray-100 border-gray-300 text-gray-700",
  running: "bg-green-100 border-green-300 text-green-700",
  warning: "bg-yellow-100 border-yellow-300 text-yellow-700",
  critical: "bg-red-100 border-red-300 text-red-700 animate-pulse",
  offline: "bg-gray-200 border-gray-400 text-gray-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  idle: <Monitor className="h-5 w-5" />,
  running: <Activity className="h-5 w-5 text-green-600" />,
  warning: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
  critical: <XCircle className="h-5 w-5 text-red-600" />,
  offline: <WifiOff className="h-5 w-5 text-gray-500" />,
};

export default function MachineOverviewDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMachine, setSelectedMachine] = useState<MachineWithStatus | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: overview, refetch, isLoading } = trpc.machineStatus.getOverview.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: alarmHeatmapData } = trpc.machineStatus.getAlarmHeatmap.useQuery({ days: 7 }, {
    refetchInterval: 60000, // Refresh every minute
  });

  const filteredMachines = overview?.machines.filter((m: MachineWithStatus) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.code.toLowerCase().includes(searchTerm.toLowerCase());
    const machineStatus = m.status?.status ?? "offline";
    const matchesStatus = statusFilter === "all" || machineStatus === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleMachineClick = (machine: MachineWithStatus) => {
    setSelectedMachine(machine);
    setDetailDialogOpen(true);
  };

  const formatTime = (dateInput: Date | string | null) => {
    if (!dateInput) return "N/A";
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Cpu className="h-6 w-6" />
              Tổng quan Máy móc
            </h1>
            <p className="text-muted-foreground">
              Giám sát trạng thái realtime của tất cả máy trong hệ thống
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Làm mới
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng số máy</p>
                  <p className="text-2xl font-bold">{overview?.summary.total || 0}</p>
                </div>
                <Monitor className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Online</p>
                  <p className="text-2xl font-bold text-green-700">{overview?.summary.online || 0}</p>
                </div>
                <Wifi className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-gray-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">Offline</p>
                  <p className="text-2xl font-bold text-gray-700">{overview?.summary.offline || 0}</p>
                </div>
                <WifiOff className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700">Warning</p>
                  <p className="text-2xl font-bold text-yellow-700">{overview?.summary.warning || 0}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">Critical</p>
                  <p className="text-2xl font-bold text-red-700">{overview?.summary.critical || 0}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Tìm kiếm máy..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="running">Đang chạy</SelectItem>
              <SelectItem value="idle">Chờ</SelectItem>
              <SelectItem value="warning">Cảnh báo</SelectItem>
              <SelectItem value="critical">Nghiêm trọng</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alarm Heatmap */}
        {alarmHeatmapData && alarmHeatmapData.length > 0 && (
          <AlarmHeatmap data={alarmHeatmapData} days={7} />
        )}

        {/* Machine Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMachines.map((machine: MachineWithStatus) => {
            const status = machine.status?.status || "offline";
            const isOnline = machine.status?.isOnline === 1;
            const cpk = machine.status?.currentCpk ? (machine.status.currentCpk / 10000).toFixed(2) : "N/A";
            
            return (
              <Card 
                key={machine.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-lg border-2",
                  statusColors[status]
                )}
                onClick={() => handleMachineClick(machine)}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {statusIcons[status]}
                      <div>
                        <p className="font-semibold text-sm truncate max-w-[120px]">{machine.name}</p>
                        <p className="text-xs opacity-70">{machine.code}</p>
                      </div>
                    </div>
                    {isOnline && (
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    )}
                  </div>
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>CPK:</span>
                      <span className={cn(
                        "font-medium",
                        cpk !== "N/A" && parseFloat(cpk) < 1.0 && "text-red-600",
                        cpk !== "N/A" && parseFloat(cpk) >= 1.0 && parseFloat(cpk) < 1.33 && "text-yellow-600",
                        cpk !== "N/A" && parseFloat(cpk) >= 1.33 && "text-green-600"
                      )}>
                        {cpk}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heartbeat:</span>
                      <span>{formatTime(machine.status?.lastHeartbeat || null)}</span>
                    </div>
                  </div>

                  {(machine.warningCount > 0 || machine.criticalCount > 0) && (
                    <div className="flex gap-1 mt-2">
                      {machine.criticalCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {machine.criticalCount} Critical
                        </Badge>
                      )}
                      {machine.warningCount > 0 && (
                        <Badge variant="secondary" className="text-xs bg-yellow-200 text-yellow-800">
                          {machine.warningCount} Warning
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          
          {filteredMachines.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {isLoading ? "Đang tải..." : "Không tìm thấy máy nào"}
            </div>
          )}
        </div>

        {/* Machine Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedMachine && statusIcons[selectedMachine.status?.status || "offline"]}
                {selectedMachine?.name}
              </DialogTitle>
              <DialogDescription>
                Mã máy: {selectedMachine?.code}
              </DialogDescription>
            </DialogHeader>

            {selectedMachine && (
              <Tabs defaultValue="status" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="status">Trạng thái</TabsTrigger>
                  <TabsTrigger value="alerts">
                    Cảnh báo 
                    {selectedMachine.activeAlerts.length > 0 && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        {selectedMachine.activeAlerts.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="actions">Thao tác</TabsTrigger>
                </TabsList>

                <TabsContent value="status" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Trạng thái kết nối</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          {selectedMachine.status?.isOnline === 1 ? (
                            <>
                              <Wifi className="h-5 w-5 text-green-500" />
                              <span className="text-green-600 font-medium">Online</span>
                            </>
                          ) : (
                            <>
                              <WifiOff className="h-5 w-5 text-gray-500" />
                              <span className="text-gray-600">Offline</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Heartbeat: {formatTime(selectedMachine.status?.lastHeartbeat || null)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">CPK hiện tại</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className={cn(
                          "text-2xl font-bold",
                          selectedMachine.status?.currentCpk && selectedMachine.status.currentCpk / 10000 < 1.0 && "text-red-600",
                          selectedMachine.status?.currentCpk && selectedMachine.status.currentCpk / 10000 >= 1.0 && selectedMachine.status.currentCpk / 10000 < 1.33 && "text-yellow-600",
                          selectedMachine.status?.currentCpk && selectedMachine.status.currentCpk / 10000 >= 1.33 && "text-green-600"
                        )}>
                          {selectedMachine.status?.currentCpk 
                            ? (selectedMachine.status.currentCpk / 10000).toFixed(3) 
                            : "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedMachine.status?.statusMessage && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Thông báo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{selectedMachine.status.statusMessage}</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="alerts" className="mt-4">
                  {selectedMachine.activeAlerts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loại</TableHead>
                          <TableHead>Mức độ</TableHead>
                          <TableHead>Nội dung</TableHead>
                          <TableHead>Thời gian</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedMachine.activeAlerts.map((alert: any) => (
                          <TableRow key={alert.id}>
                            <TableCell>{alert.alertType}</TableCell>
                            <TableCell>
                              <Badge variant={alert.severity === "critical" ? "destructive" : "secondary"}>
                                {alert.severity}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">{alert.message}</TableCell>
                            <TableCell>{formatTime(alert.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>Không có cảnh báo nào</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setLocation(`/realtime-line?machineId=${selectedMachine.id}`);
                      }}
                    >
                      <Activity className="h-6 w-6 mb-2" />
                      Xem Dashboard Realtime
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setLocation(`/realtime-history?machineId=${selectedMachine.id}`);
                      }}
                    >
                      <Clock className="h-6 w-6 mb-2" />
                      Xem Lịch sử
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setLocation(`/alarm-threshold-config?machineId=${selectedMachine.id}`);
                      }}
                    >
                      <Bell className="h-6 w-6 mb-2" />
                      Cấu hình Alarm
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-20 flex-col"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setLocation(`/analyze?machineId=${selectedMachine.id}`);
                      }}
                    >
                      <TrendingUp className="h-6 w-6 mb-2" />
                      Phân tích SPC
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
