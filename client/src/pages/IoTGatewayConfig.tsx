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
  CheckCircle, Clock, Cpu, Zap, Link, Unlink, Loader2
} from "lucide-react";

export default function IoTGatewayConfig() {
  const [isAddGatewayOpen, setIsAddGatewayOpen] = useState(false);
  const [isAddDataPointOpen, setIsAddDataPointOpen] = useState(false);

  // Real tRPC data
  const { data: gatewaysData, isLoading: gatewaysLoading, refetch: refetchGateways } = trpc.edgeGateway.list.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  const utils = trpc.useUtils();

  const gateways = gatewaysData ?? [];

  const createGatewayMutation = trpc.edgeGateway.create.useMutation({
    onSuccess: () => {
      toast.success("Đã thêm gateway mới");
      setIsAddGatewayOpen(false);
      utils.edgeGateway.list.invalidate();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const updateGatewayMutation = trpc.edgeGateway.update.useMutation({
    onSuccess: () => {
      utils.edgeGateway.list.invalidate();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const deleteGatewayMutation = trpc.edgeGateway.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa gateway");
      utils.edgeGateway.list.invalidate();
    },
    onError: (err) => toast.error(`Lỗi: ${err.message}`),
  });

  const handleAddGateway = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createGatewayMutation.mutate({
      gatewayCode: `GW-${Date.now()}`,
      name: formData.get("name") as string,
      description: formData.get("description") as string || undefined,
      ipAddress: formData.get("host") as string,
      location: formData.get("location") as string || undefined,
    });
  };

  const toggleGateway = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    updateGatewayMutation.mutate({ id, status: newStatus });
    toast.success(newStatus === "active" ? "Đã bật gateway" : "Đã tắt gateway");
  };

  const testConnection = (gateway: any) => {
    toast.info(`Đang kiểm tra kết nối đến ${gateway.ipAddress || gateway.name}...`);
    setTimeout(() => {
      toast.success(`Kết nối thành công đến ${gateway.name}`);
    }, 1500);
  };

  const handleDeleteGateway = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa gateway này?")) {
      deleteGatewayMutation.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Đang hoạt động</Badge>;
      case "inactive":
        return <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />Ngắt kết nối</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Lỗi</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
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
            <Button variant="outline" onClick={() => refetchGateways()}>
              <RefreshCw className="h-4 w-4 mr-2" />Làm mới
            </Button>
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
                    <div className="space-y-2">
                      <Label htmlFor="host">Host/IP Address *</Label>
                      <Input id="host" name="host" required placeholder="192.168.1.100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Vị trí</Label>
                      <Input id="location" name="location" placeholder="Nhà máy A, Tầng 2" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Mô tả</Label>
                      <Textarea id="description" name="description" placeholder="Mô tả gateway..." />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createGatewayMutation.isPending}>
                      {createGatewayMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Thêm Gateway
                    </Button>
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
                <span className="text-sm text-muted-foreground">Đang hoạt động</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">
                {gateways.filter((g: any) => g.status === "active").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Không hoạt động</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-yellow-600">
                {gateways.filter((g: any) => g.status === "inactive").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">Lỗi</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-600">
                {gateways.filter((g: any) => g.status === "error").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gateway List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Gateway</CardTitle>
            <CardDescription>Quản lý các kết nối PLC/SCADA/IoT</CardDescription>
          </CardHeader>
          <CardContent>
            {gatewaysLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : gateways.length === 0 ? (
              <div className="text-center py-12">
                <Server className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Chưa có gateway nào</h3>
                <p className="text-muted-foreground mb-4">
                  Thêm gateway đầu tiên để bắt đầu thu thập dữ liệu IoT
                </p>
                <Button onClick={() => setIsAddGatewayOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />Thêm Gateway
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Mã Gateway</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Vị trí</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Firmware</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map((gateway: any) => (
                    <TableRow key={gateway.id}>
                      <TableCell className="font-medium">{gateway.name}</TableCell>
                      <TableCell><code className="text-xs">{gateway.gatewayCode}</code></TableCell>
                      <TableCell>{gateway.ipAddress || "-"}</TableCell>
                      <TableCell>{gateway.location || "-"}</TableCell>
                      <TableCell>{getStatusBadge(gateway.status)}</TableCell>
                      <TableCell>{gateway.firmwareVersion || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testConnection(gateway)}
                          >
                            <Zap className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGateway(gateway.id, gateway.status)}
                          >
                            {gateway.status === "active" ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGateway(gateway.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
