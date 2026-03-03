import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Wifi, WifiOff, Server, Database, Activity, Settings, 
  Plus, Trash2, RefreshCw, Play, Pause, AlertTriangle,
  CheckCircle, Clock, Cpu, Zap, Link, Unlink
} from "lucide-react";

interface Gateway {
  id: number;
  name: string;
  type: "opcua" | "modbus" | "mqtt" | "http";
  host: string;
  port: number;
  status: "connected" | "disconnected" | "error";
  lastSync?: Date;
  enabled: boolean;
}

interface DataPoint {
  id: number;
  gatewayId: number;
  name: string;
  address: string;
  dataType: string;
  machineId?: number;
  sensorType?: string;
  pollInterval: number;
  lastValue?: string;
  lastUpdate?: Date;
}

// Demo data
const demoGateways: Gateway[] = [
  { id: 1, name: "OPC-UA Server 1", type: "opcua", host: "192.168.1.100", port: 4840, status: "connected", lastSync: new Date(), enabled: true },
  { id: 2, name: "Modbus RTU Gateway", type: "modbus", host: "192.168.1.101", port: 502, status: "connected", lastSync: new Date(), enabled: true },
  { id: 3, name: "MQTT Broker", type: "mqtt", host: "192.168.1.102", port: 1883, status: "disconnected", enabled: false },
];

const demoDataPoints: DataPoint[] = [
  { id: 1, gatewayId: 1, name: "CNC-001 Temperature", address: "ns=2;s=CNC001.Temperature", dataType: "Float", machineId: 1, sensorType: "temperature", pollInterval: 5000, lastValue: "45.2", lastUpdate: new Date() },
  { id: 2, gatewayId: 1, name: "CNC-001 Vibration", address: "ns=2;s=CNC001.Vibration", dataType: "Float", machineId: 1, sensorType: "vibration", pollInterval: 1000, lastValue: "0.15", lastUpdate: new Date() },
  { id: 3, gatewayId: 2, name: "Press-001 Pressure", address: "40001", dataType: "Int16", machineId: 2, sensorType: "pressure", pollInterval: 2000, lastValue: "1250", lastUpdate: new Date() },
];

export default function IoTGatewayConfig() {
  const [gateways, setGateways] = useState<Gateway[]>(demoGateways);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>(demoDataPoints);
  const [isAddGatewayOpen, setIsAddGatewayOpen] = useState(false);
  const [isAddDataPointOpen, setIsAddDataPointOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);

  const { data: machines } = trpc.machine.listAll.useQuery();

  const handleAddGateway = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newGateway: Gateway = {
      id: gateways.length + 1,
      name: formData.get("name") as string,
      type: formData.get("type") as Gateway["type"],
      host: formData.get("host") as string,
      port: Number(formData.get("port")),
      status: "disconnected",
      enabled: false,
    };
    setGateways([...gateways, newGateway]);
    toast.success("Đã thêm gateway mới");
    setIsAddGatewayOpen(false);
  };

  const handleAddDataPoint = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newDataPoint: DataPoint = {
      id: dataPoints.length + 1,
      gatewayId: Number(formData.get("gatewayId")),
      name: formData.get("name") as string,
      address: formData.get("address") as string,
      dataType: formData.get("dataType") as string,
      machineId: formData.get("machineId") ? Number(formData.get("machineId")) : undefined,
      sensorType: formData.get("sensorType") as string || undefined,
      pollInterval: Number(formData.get("pollInterval")) || 5000,
    };
    setDataPoints([...dataPoints, newDataPoint]);
    toast.success("Đã thêm data point mới");
    setIsAddDataPointOpen(false);
  };

  const toggleGateway = (id: number) => {
    setGateways(gateways.map(g => {
      if (g.id === id) {
        const enabled = !g.enabled;
        toast.success(enabled ? "Đã bật gateway" : "Đã tắt gateway");
        return { ...g, enabled, status: enabled ? "connected" : "disconnected" };
      }
      return g;
    }));
  };

  const testConnection = (gateway: Gateway) => {
    toast.info(`Đang kiểm tra kết nối đến ${gateway.host}:${gateway.port}...`);
    setTimeout(() => {
      toast.success(`Kết nối thành công đến ${gateway.name}`);
      setGateways(gateways.map(g => 
        g.id === gateway.id ? { ...g, status: "connected", lastSync: new Date() } : g
      ));
    }, 1500);
  };

  const deleteGateway = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa gateway này?")) {
      setGateways(gateways.filter(g => g.id !== id));
      setDataPoints(dataPoints.filter(dp => dp.gatewayId !== id));
      toast.success("Đã xóa gateway");
    }
  };

  const getStatusBadge = (status: Gateway["status"]) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Đã kết nối</Badge>;
      case "disconnected":
        return <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />Ngắt kết nối</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Lỗi</Badge>;
    }
  };

  const getTypeIcon = (type: Gateway["type"]) => {
    switch (type) {
      case "opcua": return <Server className="h-4 w-4" />;
      case "modbus": return <Cpu className="h-4 w-4" />;
      case "mqtt": return <Wifi className="h-4 w-4" />;
      case "http": return <Link className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">IoT Gateway Configuration</h1>
            <p className="text-muted-foreground">
              Cấu hình kết nối PLC/SCADA để thu thập dữ liệu sensor realtime
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAddGatewayOpen} onOpenChange={setIsAddGatewayOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Thêm Gateway</Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleAddGateway}>
                  <DialogHeader>
                    <DialogTitle>Thêm Gateway mới</DialogTitle>
                    <DialogDescription>Cấu hình kết nối đến PLC/SCADA</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Tên Gateway *</Label>
                      <Input id="name" name="name" required placeholder="VD: OPC-UA Server 1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Loại kết nối *</Label>
                        <Select name="type" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="opcua">OPC-UA</SelectItem>
                            <SelectItem value="modbus">Modbus TCP/RTU</SelectItem>
                            <SelectItem value="mqtt">MQTT</SelectItem>
                            <SelectItem value="http">HTTP/REST API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="port">Port *</Label>
                        <Input id="port" name="port" type="number" required placeholder="4840" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="host">Host/IP Address *</Label>
                      <Input id="host" name="host" required placeholder="192.168.1.100" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Thêm Gateway</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tổng Gateway</span>
              </div>
              <div className="text-2xl font-bold mt-1">{gateways.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Đang kết nối</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">
                {gateways.filter(g => g.status === "connected").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Data Points</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-600">{dataPoints.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Đang thu thập</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-purple-600">
                {dataPoints.filter(dp => gateways.find(g => g.id === dp.gatewayId)?.enabled).length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="gateways">
          <TabsList>
            <TabsTrigger value="gateways">Gateways</TabsTrigger>
            <TabsTrigger value="datapoints">Data Points</TabsTrigger>
            <TabsTrigger value="monitor">Giám sát Realtime</TabsTrigger>
          </TabsList>

          <TabsContent value="gateways" className="space-y-4">
            {gateways.map((gateway) => (
              <Card key={gateway.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        {getTypeIcon(gateway.type)}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {gateway.name}
                          {getStatusBadge(gateway.status)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {gateway.type.toUpperCase()} • {gateway.host}:{gateway.port}
                        </div>
                        {gateway.lastSync && (
                          <div className="text-xs text-muted-foreground">
                            Đồng bộ lần cuối: {gateway.lastSync.toLocaleString('vi-VN')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={gateway.enabled}
                        onCheckedChange={() => toggleGateway(gateway.id)}
                      />
                      <Button variant="outline" size="sm" onClick={() => testConnection(gateway)}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedGateway(gateway)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteGateway(gateway.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="datapoints">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Data Points</CardTitle>
                    <CardDescription>Cấu hình các điểm dữ liệu cần thu thập</CardDescription>
                  </div>
                  <Dialog open={isAddDataPointOpen} onOpenChange={setIsAddDataPointOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-2" />Thêm Data Point</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form onSubmit={handleAddDataPoint}>
                        <DialogHeader>
                          <DialogTitle>Thêm Data Point</DialogTitle>
                          <DialogDescription>Cấu hình điểm dữ liệu từ PLC/SCADA</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Gateway *</Label>
                              <Select name="gatewayId" required>
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn gateway" />
                                </SelectTrigger>
                                <SelectContent>
                                  {gateways.map(g => (
                                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Máy liên kết</Label>
                              <Select name="machineId">
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn máy" />
                                </SelectTrigger>
                                <SelectContent>
                                  {machines?.map(m => (
                                    <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Tên Data Point *</Label>
                            <Input name="name" required placeholder="VD: CNC-001 Temperature" />
                          </div>
                          <div className="space-y-2">
                            <Label>Địa chỉ/Tag *</Label>
                            <Input name="address" required placeholder="VD: ns=2;s=CNC001.Temperature" />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Kiểu dữ liệu</Label>
                              <Select name="dataType" defaultValue="Float">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Float">Float</SelectItem>
                                  <SelectItem value="Int16">Int16</SelectItem>
                                  <SelectItem value="Int32">Int32</SelectItem>
                                  <SelectItem value="Boolean">Boolean</SelectItem>
                                  <SelectItem value="String">String</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Loại sensor</Label>
                              <Select name="sensorType">
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="temperature">Nhiệt độ</SelectItem>
                                  <SelectItem value="vibration">Rung động</SelectItem>
                                  <SelectItem value="pressure">Áp suất</SelectItem>
                                  <SelectItem value="current">Dòng điện</SelectItem>
                                  <SelectItem value="speed">Tốc độ</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Poll Interval (ms)</Label>
                              <Input name="pollInterval" type="number" defaultValue="5000" />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Thêm</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Gateway</TableHead>
                      <TableHead>Địa chỉ</TableHead>
                      <TableHead>Kiểu</TableHead>
                      <TableHead>Máy</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Cập nhật</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dataPoints.map((dp) => {
                      const gateway = gateways.find(g => g.id === dp.gatewayId);
                      const machine = machines?.find(m => m.id === dp.machineId);
                      return (
                        <TableRow key={dp.id}>
                          <TableCell className="font-medium">{dp.name}</TableCell>
                          <TableCell>{gateway?.name || "N/A"}</TableCell>
                          <TableCell className="font-mono text-xs">{dp.address}</TableCell>
                          <TableCell>{dp.dataType}</TableCell>
                          <TableCell>{machine?.name || "-"}</TableCell>
                          <TableCell className="font-mono">{dp.lastValue || "-"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {dp.lastUpdate?.toLocaleTimeString('vi-VN') || "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitor">
            <Card>
              <CardHeader>
                <CardTitle>Giám sát Realtime</CardTitle>
                <CardDescription>Dữ liệu sensor đang được thu thập</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dataPoints.filter(dp => gateways.find(g => g.id === dp.gatewayId)?.enabled).map((dp) => (
                    <Card key={dp.id} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{dp.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {dp.pollInterval / 1000}s
                          </Badge>
                        </div>
                        <div className="text-3xl font-bold">
                          {dp.lastValue || "-"}
                          <span className="text-sm font-normal text-muted-foreground ml-1">
                            {dp.sensorType === "temperature" ? "°C" :
                             dp.sensorType === "vibration" ? "mm/s" :
                             dp.sensorType === "pressure" ? "bar" :
                             dp.sensorType === "current" ? "A" : ""}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Cập nhật: {dp.lastUpdate?.toLocaleTimeString('vi-VN') || "-"}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {dataPoints.filter(dp => gateways.find(g => g.id === dp.gatewayId)?.enabled).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Không có data point nào đang hoạt động. Hãy bật gateway để bắt đầu thu thập dữ liệu.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
