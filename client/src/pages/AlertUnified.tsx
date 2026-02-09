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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { 
  Bell, BellOff, Plus, Trash2, Settings, AlertTriangle, CheckCircle, Clock, 
  Mail, MessageSquare, Smartphone, RefreshCw, Eye, EyeOff, TrendingUp, 
  TrendingDown, Activity, Zap, Users, Filter, Download, History, Sliders
} from "lucide-react";
import { format } from "date-fns";

// Types
interface AlertConfig {
  id: number;
  name: string;
  type: "oee_low" | "maintenance_overdue" | "predictive_alert" | "spare_parts_low" | "cpk_low" | "custom";
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
  resolvedAt?: Date;
  createdAt: Date;
}

interface ThresholdConfig {
  id: number;
  name: string;
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
}

// Demo data
// Mock data removed - demoConfigs (data comes from tRPC or is not yet implemented)

// Mock data removed - demoLogs (data comes from tRPC or is not yet implemented)

// Mock data removed - demoThresholds (data comes from tRPC or is not yet implemented)

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function AlertUnified() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>([]);
  const [isAddConfigOpen, setIsAddConfigOpen] = useState(false);
  const [isAddThresholdOpen, setIsAddThresholdOpen] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailEnabled: true,
    smsEnabled: false,
    inAppEnabled: true,
    emailRecipients: "admin@company.com",
    smsRecipients: "",
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    escalationEnabled: true,
    escalationDelay: 30,
  });

  // Stats calculation
  const stats = {
    total: logs.length,
    unacknowledged: logs.filter(l => !l.acknowledgedAt).length,
    today: logs.filter(l => l.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)).length,
    activeConfigs: configs.filter(c => c.enabled).length,
    critical: logs.filter(l => l.severity === "critical" && !l.resolvedAt).length,
    warning: logs.filter(l => l.severity === "warning" && !l.resolvedAt).length,
  };

  // Chart data
  const alertTrendData = [
    { date: "T2", critical: 2, warning: 5, info: 3 },
    { date: "T3", critical: 1, warning: 4, info: 2 },
    { date: "T4", critical: 3, warning: 6, info: 4 },
    { date: "T5", critical: 0, warning: 3, info: 2 },
    { date: "T6", critical: 2, warning: 4, info: 3 },
    { date: "T7", critical: 1, warning: 2, info: 1 },
    { date: "CN", critical: 0, warning: 1, info: 1 },
  ];

  const alertByTypeData = [
    { name: "OEE thấp", value: 35 },
    { name: "Bảo trì", value: 25 },
    { name: "CPK", value: 20 },
    { name: "Phụ tùng", value: 15 },
    { name: "Khác", value: 5 },
  ];

  // Handlers
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

  const resolveAlert = (id: number) => {
    setLogs(logs.map(l => {
      if (l.id === id) {
        toast.success("Đã giải quyết cảnh báo");
        return { ...l, resolvedAt: new Date() };
      }
      return l;
    }));
  };

  const updateThreshold = (id: number, field: keyof ThresholdConfig, value: any) => {
    setThresholds(thresholds.map(t => {
      if (t.id === id) {
        return { ...t, [field]: value };
      }
      return t;
    }));
    toast.success("Đã cập nhật ngưỡng");
  };

  const getTypeLabel = (type: AlertConfig["type"]) => {
    switch (type) {
      case "oee_low": return "OEE thấp";
      case "maintenance_overdue": return "Bảo trì quá hạn";
      case "predictive_alert": return "Predictive";
      case "spare_parts_low": return "Phụ tùng thấp";
      case "cpk_low": return "CPK thấp";
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

  const filteredLogs = filterSeverity === "all" 
    ? logs 
    : logs.filter(l => l.severity === filterSeverity);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Cảnh báo</h1>
            <p className="text-muted-foreground">
              Dashboard, cấu hình, lịch sử và ngưỡng cảnh báo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 ngày</SelectItem>
                <SelectItem value="14d">14 ngày</SelectItem>
                <SelectItem value="30d">30 ngày</SelectItem>
                <SelectItem value="90d">90 ngày</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toast.info("Đang làm mới...")}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                <Zap className="h-4 w-4 text-red-600" />
                <span className="text-sm text-muted-foreground">Nghiêm trọng</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-red-600">{stats.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Cảnh báo</span>
              </div>
              <div className="text-2xl font-bold mt-1 text-yellow-600">{stats.warning}</div>
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

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">
              <Activity className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="configs">
              <Settings className="h-4 w-4 mr-2" />
              Cấu hình
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Lịch sử
              {stats.unacknowledged > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.unacknowledged}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="thresholds">
              <Sliders className="h-4 w-4 mr-2" />
              Ngưỡng
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Thông báo
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng cảnh báo</CardTitle>
                  <CardDescription>Số lượng cảnh báo theo ngày</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={alertTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="#ef4444" name="Nghiêm trọng" />
                      <Area type="monotone" dataKey="warning" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Cảnh báo" />
                      <Area type="monotone" dataKey="info" stackId="1" stroke="#3b82f6" fill="#3b82f6" name="Thông tin" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ theo loại</CardTitle>
                  <CardDescription>Tỷ lệ cảnh báo theo loại</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={alertByTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {alertByTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Cảnh báo gần đây</CardTitle>
                <CardDescription>5 cảnh báo mới nhất cần xử lý</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.slice(0, 5).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(log.createdAt, "dd/MM HH:mm")}</TableCell>
                        <TableCell>{log.configName}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>
                          {log.resolvedAt ? (
                            <Badge variant="outline" className="text-green-600">Đã giải quyết</Badge>
                          ) : log.acknowledgedAt ? (
                            <Badge variant="outline" className="text-blue-600">Đã xác nhận</Badge>
                          ) : (
                            <Badge variant="destructive">Chờ xử lý</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!log.acknowledgedAt && (
                            <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(log.id)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {log.acknowledgedAt && !log.resolvedAt && (
                            <Button size="sm" variant="outline" onClick={() => resolveAlert(log.id)}>
                              Giải quyết
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

          {/* Configs Tab */}
          <TabsContent value="configs" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isAddConfigOpen} onOpenChange={setIsAddConfigOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Thêm cấu hình</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
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
                              <SelectItem value="cpk_low">CPK thấp</SelectItem>
                              <SelectItem value="custom">Tùy chỉnh</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="threshold">Ngưỡng</Label>
                          <Input id="threshold" name="threshold" type="number" step="0.01" placeholder="75" />
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
                            <input type="checkbox" id="notifyEmail" name="notifyEmail" defaultChecked />
                            <Label htmlFor="notifyEmail" className="flex items-center gap-1">
                              <Mail className="h-4 w-4" /> Email
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="notifySms" name="notifySms" />
                            <Label htmlFor="notifySms" className="flex items-center gap-1">
                              <Smartphone className="h-4 w-4" /> SMS
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" id="notifyInApp" name="notifyInApp" defaultChecked />
                            <Label htmlFor="notifyInApp" className="flex items-center gap-1">
                              <Bell className="h-4 w-4" /> In-App
                            </Label>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recipients">Người nhận (email, cách nhau bởi dấu phẩy)</Label>
                        <Input id="recipients" name="recipients" placeholder="user1@company.com, user2@company.com" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddConfigOpen(false)}>Hủy</Button>
                      <Button type="submit">Thêm</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Điều kiện</TableHead>
                      <TableHead>Kênh thông báo</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">{config.name}</TableCell>
                        <TableCell><Badge variant="outline">{getTypeLabel(config.type)}</Badge></TableCell>
                        <TableCell className="font-mono text-sm">{config.condition}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {config.notifyEmail && <Mail className="h-4 w-4 text-blue-500" />}
                            {config.notifySms && <Smartphone className="h-4 w-4 text-green-500" />}
                            {config.notifyInApp && <Bell className="h-4 w-4 text-yellow-500" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch checked={config.enabled} onCheckedChange={() => toggleConfig(config.id)} />
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => deleteConfig(config.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Lọc mức độ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="critical">Nghiêm trọng</SelectItem>
                    <SelectItem value="warning">Cảnh báo</SelectItem>
                    <SelectItem value="info">Thông tin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Xuất Excel
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Loại cảnh báo</TableHead>
                      <TableHead>Nội dung</TableHead>
                      <TableHead>Máy</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead>Xác nhận</TableHead>
                      <TableHead>Giải quyết</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(log.createdAt, "dd/MM/yyyy HH:mm")}</TableCell>
                        <TableCell>{log.configName}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.message}</TableCell>
                        <TableCell>{log.machineName || "-"}</TableCell>
                        <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                        <TableCell>
                          {log.acknowledgedAt ? format(log.acknowledgedAt, "HH:mm") : "-"}
                        </TableCell>
                        <TableCell>
                          {log.resolvedAt ? format(log.resolvedAt, "HH:mm") : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!log.acknowledgedAt && (
                              <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(log.id)}>
                                Xác nhận
                              </Button>
                            )}
                            {log.acknowledgedAt && !log.resolvedAt && (
                              <Button size="sm" variant="outline" onClick={() => resolveAlert(log.id)}>
                                Giải quyết
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Thresholds Tab */}
          <TabsContent value="thresholds" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình ngưỡng cảnh báo</CardTitle>
                <CardDescription>Thiết lập ngưỡng cảnh báo và nghiêm trọng cho từng chỉ số</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {thresholds.map((threshold) => (
                    <div key={threshold.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{threshold.name}</h4>
                          <p className="text-sm text-muted-foreground">Metric: {threshold.metric}</p>
                        </div>
                        <Switch 
                          checked={threshold.enabled} 
                          onCheckedChange={(checked) => updateThreshold(threshold.id, "enabled", checked)} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ngưỡng cảnh báo (Warning)</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              step="0.01"
                              value={threshold.warningThreshold} 
                              onChange={(e) => updateThreshold(threshold.id, "warningThreshold", parseFloat(e.target.value))}
                              className="w-24"
                            />
                            <div className="flex-1">
                              <Slider 
                                value={[threshold.warningThreshold]} 
                                max={100}
                                step={1}
                                onValueChange={([value]) => updateThreshold(threshold.id, "warningThreshold", value)}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Ngưỡng nghiêm trọng (Critical)</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              step="0.01"
                              value={threshold.criticalThreshold} 
                              onChange={(e) => updateThreshold(threshold.id, "criticalThreshold", parseFloat(e.target.value))}
                              className="w-24"
                            />
                            <div className="flex-1">
                              <Slider 
                                value={[threshold.criticalThreshold]} 
                                max={100}
                                step={1}
                                onValueChange={([value]) => updateThreshold(threshold.id, "criticalThreshold", value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Kênh thông báo</CardTitle>
                  <CardDescription>Cấu hình các kênh gửi thông báo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <Label>Email</Label>
                    </div>
                    <Switch 
                      checked={notificationSettings.emailEnabled}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailEnabled: checked})}
                    />
                  </div>
                  {notificationSettings.emailEnabled && (
                    <div className="space-y-2 pl-6">
                      <Label>Người nhận mặc định</Label>
                      <Textarea 
                        value={notificationSettings.emailRecipients}
                        onChange={(e) => setNotificationSettings({...notificationSettings, emailRecipients: e.target.value})}
                        placeholder="email1@company.com, email2@company.com"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      <Label>SMS</Label>
                    </div>
                    <Switch 
                      checked={notificationSettings.smsEnabled}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, smsEnabled: checked})}
                    />
                  </div>
                  {notificationSettings.smsEnabled && (
                    <div className="space-y-2 pl-6">
                      <Label>Số điện thoại nhận</Label>
                      <Textarea 
                        value={notificationSettings.smsRecipients}
                        onChange={(e) => setNotificationSettings({...notificationSettings, smsRecipients: e.target.value})}
                        placeholder="+84123456789, +84987654321"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <Label>Thông báo trong ứng dụng</Label>
                    </div>
                    <Switch 
                      checked={notificationSettings.inAppEnabled}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, inAppEnabled: checked})}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cài đặt nâng cao</CardTitle>
                  <CardDescription>Giờ yên tĩnh và leo thang cảnh báo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Giờ yên tĩnh (Quiet Hours)</Label>
                      <p className="text-sm text-muted-foreground">Không gửi thông báo trong khoảng thời gian này</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.quietHoursEnabled}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, quietHoursEnabled: checked})}
                    />
                  </div>
                  {notificationSettings.quietHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label>Bắt đầu</Label>
                        <Input 
                          type="time" 
                          value={notificationSettings.quietHoursStart}
                          onChange={(e) => setNotificationSettings({...notificationSettings, quietHoursStart: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Kết thúc</Label>
                        <Input 
                          type="time" 
                          value={notificationSettings.quietHoursEnd}
                          onChange={(e) => setNotificationSettings({...notificationSettings, quietHoursEnd: e.target.value})}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Leo thang cảnh báo (Escalation)</Label>
                      <p className="text-sm text-muted-foreground">Tự động leo thang nếu không được xử lý</p>
                    </div>
                    <Switch 
                      checked={notificationSettings.escalationEnabled}
                      onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, escalationEnabled: checked})}
                    />
                  </div>
                  {notificationSettings.escalationEnabled && (
                    <div className="space-y-2 pl-6">
                      <Label>Thời gian chờ trước khi leo thang (phút)</Label>
                      <Input 
                        type="number" 
                        value={notificationSettings.escalationDelay}
                        onChange={(e) => setNotificationSettings({...notificationSettings, escalationDelay: parseInt(e.target.value)})}
                        className="w-24"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => toast.success("Đã lưu cài đặt thông báo")}>
                Lưu cài đặt
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
