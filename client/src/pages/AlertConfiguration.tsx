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
import { toast } from "sonner";
import { 
  Bell, BellOff, Plus, Trash2, Settings, AlertTriangle,
  CheckCircle, Clock, Mail, MessageSquare, Smartphone,
  RefreshCw, Eye, EyeOff
} from "lucide-react";
import { format } from "date-fns";

interface AlertConfig {
  id: number;
  name: string;
  type: "oee_low" | "maintenance_overdue" | "predictive_alert" | "spare_parts_low" | "custom";
  condition: string;
  threshold?: number;
  machineId?: number;
  notifyEmail: boolean;
  notifySms: boolean;
  notifyInApp: boolean;
  recipients?: string;
  enabled: boolean;
}

interface AlertLog {
  id: number;
  configName: string;
  message: string;
  severity: "info" | "warning" | "critical";
  machineId?: number;
  machineName?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
}

// Demo data
// Mock data removed - demoConfigs (data comes from tRPC or is not yet implemented)

// Mock data removed - demoLogs (data comes from tRPC or is not yet implemented)

export default function AlertConfiguration() {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [isAddConfigOpen, setIsAddConfigOpen] = useState(false);

  const handleAddConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newConfig: AlertConfig = {
      id: configs.length + 1,
      name: formData.get("name") as string,
      type: formData.get("type") as AlertConfig["type"],
      condition: formData.get("condition") as string,
      threshold: formData.get("threshold") ? Number(formData.get("threshold")) : undefined,
      notifyEmail: formData.get("notifyEmail") === "on",
      notifySms: formData.get("notifySms") === "on",
      notifyInApp: formData.get("notifyInApp") === "on",
      recipients: formData.get("recipients") as string || undefined,
      enabled: true,
    };
    setConfigs([...configs, newConfig]);
    toast.success("Đã thêm cấu hình cảnh báo mới");
    setIsAddConfigOpen(false);
  };

  const toggleConfig = (id: number) => {
    setConfigs(configs.map(c => {
      if (c.id === id) {
        const enabled = !c.enabled;
        toast.success(enabled ? "Đã bật cảnh báo" : "Đã tắt cảnh báo");
        return { ...c, enabled };
      }
      return c;
    }));
  };

  const deleteConfig = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa cấu hình này?")) {
      setConfigs(configs.filter(c => c.id !== id));
      toast.success("Đã xóa cấu hình");
    }
  };

  const acknowledgeAlert = (id: number) => {
    setLogs(logs.map(l => {
      if (l.id === id) {
        toast.success("Đã xác nhận cảnh báo");
        return { ...l, acknowledgedAt: new Date() };
      }
      return l;
    }));
  };

  const getTypeLabel = (type: AlertConfig["type"]) => {
    switch (type) {
      case "oee_low": return "OEE thấp";
      case "maintenance_overdue": return "Bảo trì quá hạn";
      case "predictive_alert": return "Predictive";
      case "spare_parts_low": return "Phụ tùng thấp";
      case "custom": return "Tùy chỉnh";
    }
  };

  const getSeverityBadge = (severity: AlertLog["severity"]) => {
    switch (severity) {
      case "info": return <Badge variant="secondary">Thông tin</Badge>;
      case "warning": return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
      case "critical": return <Badge variant="destructive">Nghiêm trọng</Badge>;
    }
  };

  const stats = {
    total: logs.length,
    unacknowledged: logs.filter(l => !l.acknowledgedAt).length,
    today: logs.filter(l => l.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
    activeConfigs: configs.filter(c => c.enabled).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Cảnh báo Tự động</h1>
            <p className="text-muted-foreground">
              Thiết lập email/SMS notification khi có sự cố
            </p>
          </div>
          <Button onClick={() => toast.info("Đang kiểm tra cảnh báo...")}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Kiểm tra ngay
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tổng cảnh báo</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Chưa xác nhận</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.unacknowledged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Hôm nay</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-blue-600">{stats.today}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Cấu hình hoạt động</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-green-600">{stats.activeConfigs}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="configs">
          <TabsList>
            <TabsTrigger value="configs">Cấu hình cảnh báo</TabsTrigger>
            <TabsTrigger value="logs">
              Lịch sử cảnh báo
              {stats.unacknowledged > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.unacknowledged}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configs" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddConfigOpen} onOpenChange={setIsAddConfigOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Thêm cấu hình</Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddConfig}>
                    <DialogHeader>
                      <DialogTitle>Thêm cấu hình cảnh báo</DialogTitle>
                      <DialogDescription>Thiết lập điều kiện và kênh thông báo</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Tên cảnh báo *</Label>
                        <Input id="name" name="name" required placeholder="VD: OEE thấp < 75%" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Loại cảnh báo *</Label>
                          <Select name="type" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn loại" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="oee_low">OEE thấp</SelectItem>
                              <SelectItem value="maintenance_overdue">Bảo trì quá hạn</SelectItem>
                              <SelectItem value="predictive_alert">Predictive</SelectItem>
                              <SelectItem value="spare_parts_low">Phụ tùng thấp</SelectItem>
                              <SelectItem value="custom">Tùy chỉnh</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="threshold">Ngưỡng</Label>
                          <Input id="threshold" name="threshold" type="number" placeholder="75" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="condition">Điều kiện</Label>
                        <Input id="condition" name="condition" placeholder="VD: oee < 75" />
                      </div>
                      <div className="space-y-2">
                        <Label>Kênh thông báo</Label>
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2">
                            <Switch id="notifyEmail" name="notifyEmail" defaultChecked />
                            <Label htmlFor="notifyEmail" className="flex items-center gap-1">
                              <Mail className="h-4 w-4" /> Email
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch id="notifySms" name="notifySms" />
                            <Label htmlFor="notifySms" className="flex items-center gap-1">
                              <Smartphone className="h-4 w-4" /> SMS
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch id="notifyInApp" name="notifyInApp" defaultChecked />
                            <Label htmlFor="notifyInApp" className="flex items-center gap-1">
                              <Bell className="h-4 w-4" /> In-App
                            </Label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recipients">Người nhận (email, cách bởi dấu phẩy)</Label>
                        <Input id="recipients" name="recipients" placeholder="manager@company.com, tech@company.com" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Thêm cấu hình</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {configs.map((config) => (
              <Card key={config.id} className={!config.enabled ? "opacity-60" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${config.enabled ? "bg-green-100" : "bg-gray-100"}`}>
                        {config.enabled ? <Bell className="h-4 w-4 text-green-600" /> : <BellOff className="h-4 w-4 text-gray-400" />}
                      </div>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {config.name}
                          <Badge variant="outline">{getTypeLabel(config.type)}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Điều kiện: {config.condition}
                          {config.threshold && ` (ngưỡng: ${config.threshold})`}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {config.notifyEmail && <Mail className="h-3 w-3 text-muted-foreground" />}
                          {config.notifySms && <Smartphone className="h-3 w-3 text-muted-foreground" />}
                          {config.notifyInApp && <Bell className="h-3 w-3 text-muted-foreground" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={() => toggleConfig(config.id)}
                      />
                      <Button variant="outline" size="sm" onClick={() => deleteConfig(config.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử cảnh báo</CardTitle>
                <CardDescription>Các cảnh báo đã được kích hoạt</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Máy</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(log.createdAt, "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.configName}</Badge>
                        </TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell className="max-w-[300px]">{log.message}</TableCell>
                        <TableCell>{log.machineName || "-"}</TableCell>
                        <TableCell>
                          {log.acknowledgedAt ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Đã xác nhận
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Chưa xác nhận</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!log.acknowledgedAt && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => acknowledgeAlert(log.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Xác nhận
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
