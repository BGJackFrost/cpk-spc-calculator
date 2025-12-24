import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Wifi, WifiOff, AlertTriangle, Plus, RefreshCw, Settings, Bell, Activity, Cpu, Thermometer, Gauge } from "lucide-react";
import { toast } from "sonner";

export default function IotDashboard() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDevice, setNewDevice] = useState({ deviceId: "", name: "", type: "sensor", location: "" });
  
  const { data: stats, refetch: refetchStats } = trpc.iotDashboard.getStats.useQuery();
  const { data: devices, refetch: refetchDevices } = trpc.iotDashboard.listDevices.useQuery();
  const { data: alarms, refetch: refetchAlarms } = trpc.iotDashboard.getAlarms.useQuery({ limit: 10, acknowledged: false });
  
  const registerDevice = trpc.iotDashboard.registerDevice.useMutation({
    onSuccess: () => {
      toast.success("Thiết bị đã được thêm thành công");
      setIsAddDialogOpen(false);
      setNewDevice({ deviceId: "", name: "", type: "sensor", location: "" });
      refetchDevices();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });
  
  const acknowledgeAlarm = trpc.iotDashboard.acknowledgeAlarm.useMutation({
    onSuccess: () => {
      toast.success("Đã xác nhận cảnh báo");
      refetchAlarms();
    },
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online": return <Badge className="bg-green-500">Online</Badge>;
      case "offline": return <Badge variant="secondary">Offline</Badge>;
      case "error": return <Badge variant="destructive">Error</Badge>;
      case "maintenance": return <Badge className="bg-yellow-500">Maintenance</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "sensor": return <Thermometer className="h-5 w-5" />;
      case "controller": return <Cpu className="h-5 w-5" />;
      case "meter": return <Gauge className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">IoT Dashboard</h1>
            <p className="text-muted-foreground mt-1">Giám sát và quản lý thiết bị IoT</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { refetchStats(); refetchDevices(); refetchAlarms(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Thêm thiết bị</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm thiết bị mới</DialogTitle>
                  <DialogDescription>Đăng ký thiết bị IoT mới vào hệ thống</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Device ID</Label>
                    <Input value={newDevice.deviceId} onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })} placeholder="DEV-001" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Tên thiết bị</Label>
                    <Input value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} placeholder="Cảm biến nhiệt độ #1" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Loại thiết bị</Label>
                    <Select value={newDevice.type} onValueChange={(v) => setNewDevice({ ...newDevice, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sensor">Cảm biến</SelectItem>
                        <SelectItem value="controller">Bộ điều khiển</SelectItem>
                        <SelectItem value="meter">Đồng hồ đo</SelectItem>
                        <SelectItem value="gateway">Gateway</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Vị trí</Label>
                    <Input value={newDevice.location} onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })} placeholder="Nhà máy A - Dây chuyền 1" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Hủy</Button>
                  <Button onClick={() => registerDevice.mutate(newDevice)} disabled={registerDevice.isPending}>
                    {registerDevice.isPending ? "Đang thêm..." : "Thêm thiết bị"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tổng thiết bị</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats?.totalDevices || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Wifi className="h-4 w-4 text-green-500" />Online</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-500">{stats?.onlineDevices || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><WifiOff className="h-4 w-4 text-gray-500" />Offline</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-gray-500">{stats?.offlineDevices || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" />Lỗi</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-500">{stats?.errorDevices || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Settings className="h-4 w-4 text-yellow-500" />Bảo trì</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-yellow-500">{stats?.maintenanceDevices || 0}</div></CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList>
            <TabsTrigger value="devices">Thiết bị</TabsTrigger>
            <TabsTrigger value="alarms">Cảnh báo ({alarms?.length || 0})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="devices">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices?.map((device) => (
                <Card key={device.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.type)}
                        <CardTitle className="text-base">{device.name}</CardTitle>
                      </div>
                      {getStatusBadge(device.status)}
                    </div>
                    <CardDescription>{device.deviceId}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <p>Loại: {device.type}</p>
                      <p>Vị trí: {device.location || "Chưa xác định"}</p>
                      <p>Cập nhật: {device.lastSeen ? new Date(device.lastSeen).toLocaleString("vi-VN") : "Chưa có"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!devices || devices.length === 0) && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  Chưa có thiết bị nào. Nhấn "Thêm thiết bị" để bắt đầu.
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="alarms">
            <div className="space-y-2">
              {alarms?.map((alarm) => (
                <Card key={alarm.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Bell className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">{alarm.message}</p>
                        <p className="text-sm text-muted-foreground">
                          Thiết bị ID: {alarm.deviceId} | {new Date(alarm.createdAt!).toLocaleString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => acknowledgeAlarm.mutate({ id: alarm.id })}>
                      Xác nhận
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {(!alarms || alarms.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  Không có cảnh báo chưa xử lý.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
