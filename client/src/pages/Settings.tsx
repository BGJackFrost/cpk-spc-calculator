import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  Database, 
  Bell, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  CheckCircle2,
  XCircle,
  TestTube,
  Search,
  Wifi,
  WifiOff,
  Radio,
  MessageCircle,
  Send,
  Key,
  Save
} from "lucide-react";
import DatabaseExplorer from "@/components/DatabaseExplorer";
import Breadcrumb from "@/components/Breadcrumb";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

interface ConnectionFormData {
  name: string;
  databaseType: "mysql" | "sqlserver" | "oracle" | "postgres" | "access" | "excel";
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  filePath?: string;
  description: string;
}

const defaultConnectionForm: ConnectionFormData = {
  name: "",
  databaseType: "mysql",
  host: "",
  port: 3306,
  database: "",
  username: "",
  password: "",
  description: "",
};

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ConnectionFormData>(defaultConnectionForm);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { data: connections, refetch: refetchConnections } = trpc.legacyDbConnection.list.useQuery(undefined, {
    enabled: isAdmin,
  });
  const { data: alertSettings } = trpc.alert.get.useQuery(undefined, {
    enabled: isAdmin,
  });

  const utils = trpc.useUtils();

  const createConnectionMutation = trpc.legacyDbConnection.create.useMutation({
    onSuccess: () => {
      toast.success("Tạo kết nối thành công!");
      setIsDialogOpen(false);
      resetForm();
      utils.legacyDbConnection.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateConnectionMutation = trpc.legacyDbConnection.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật kết nối thành công!");
      setIsDialogOpen(false);
      resetForm();
      utils.legacyDbConnection.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteConnectionMutation = trpc.legacyDbConnection.delete.useMutation({
    onSuccess: () => {
      toast.success("Xóa kết nối thành công!");
      utils.legacyDbConnection.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const testConnectionMutation = trpc.legacyDbConnection.testConnection.useMutation({
    onSuccess: (result) => {
      setTestResult(result);
      if (result.success) {
        toast.success("Kết nối thành công!");
      } else {
        toast.error("Kết nối thất bại: " + result.message);
      }
    },
    onError: (error) => {
      setTestResult({ success: false, message: error.message });
      toast.error(error.message);
    },
  });

  const updateAlertMutation = trpc.alert.update.useMutation({
    onSuccess: () => {
      toast.success("Cập nhật cài đặt cảnh báo thành công!");
      utils.alert.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData(defaultConnectionForm);
    setEditingId(null);
    setTestResult(null);
  };

  const handleEdit = (connection: typeof connections extends (infer T)[] | undefined ? T : never) => {
    if (!connection) return;
    setEditingId(connection.id);
    setFormData({
      name: connection.name,
      databaseType: connection.databaseType as ConnectionFormData['databaseType'],
      host: connection.host || "",
      port: connection.port || 3306,
      database: connection.database || "",
      username: connection.username || "",
      password: "", // Don't show password
      description: connection.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error("Vui lòng nhập tên kết nối");
      return;
    }

    if (editingId) {
      updateConnectionMutation.mutate({
        id: editingId,
        ...formData,
      });
    } else {
      createConnectionMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa kết nối này?")) {
      deleteConnectionMutation.mutate({ id });
    }
  };

  const handleTestConnection = () => {
    if (!formData.host && formData.databaseType !== 'access' && formData.databaseType !== 'excel') {
      toast.error("Vui lòng nhập thông tin kết nối");
      return;
    }
    setTestResult(null);
    testConnectionMutation.mutate({
      databaseType: formData.databaseType,
      host: formData.host,
      port: formData.port,
      database: formData.database,
      username: formData.username,
      password: formData.password,
      filePath: formData.filePath,
    });
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh]">
          <Card className="elegant-card max-w-md">
            <CardHeader>
              <CardTitle>Không có quyền truy cập</CardTitle>
              <CardDescription>
                Chỉ admin mới có thể truy cập cài đặt hệ thống
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: "Hệ thống", href: "/" },
          { label: "Cài đặt & Kết nối" }
        ]} />
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-primary" />
            Cài đặt & Kết nối
          </h1>
          <p className="text-muted-foreground mt-1">
            Quản lý kết nối database và cài đặt cảnh báo
          </p>
        </div>

        <Tabs defaultValue="connections" className="space-y-6">
          <TabsList>
            <TabsTrigger value="connections" className="gap-2">
              <Database className="h-4 w-4" />
              Kết nối & Dữ liệu
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Cảnh báo
            </TabsTrigger>
            <TabsTrigger value="websocket" className="gap-2">
              <Wifi className="h-4 w-4" />
              WebSocket
            </TabsTrigger>
            <TabsTrigger value="sse" className="gap-2">
              <Radio className="h-4 w-4" />
              SSE
            </TabsTrigger>
            <TabsTrigger value="telegram" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Telegram
            </TabsTrigger>
          </TabsList>

          {/* Kết nối & Dữ liệu Tab */}
          <TabsContent value="connections">
            <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Kết nối & Dữ liệu</CardTitle>
                  <CardDescription>
                    Quản lý các kết nối đến database bên ngoài
                  </CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm Connection
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>{editingId ? "Sửa Connection" : "Thêm Connection mới"}</DialogTitle>
                      <DialogDescription>
                        Cấu hình kết nối đến database chứa dữ liệu kiểm tra
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Tên kết nối *</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="VD: MachineDatabase"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Loại Database *</Label>
                        <select
                          value={formData.databaseType}
                          onChange={(e) => setFormData({ ...formData, databaseType: e.target.value as ConnectionFormData['databaseType'] })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="mysql">MySQL / MariaDB</option>
                          <option value="postgres">PostgreSQL</option>
                          <option value="sqlserver">SQL Server</option>
                          <option value="oracle">Oracle</option>
                          <option value="access">Microsoft Access</option>
                          <option value="excel">Excel</option>
                        </select>
                      </div>
                      {formData.databaseType !== 'access' && formData.databaseType !== 'excel' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Host *</Label>
                              <Input
                                value={formData.host || ''}
                                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                                placeholder="localhost"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Port</Label>
                              <Input
                                type="number"
                                value={formData.port || ''}
                                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || undefined })}
                                placeholder="3306"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Database</Label>
                            <Input
                              value={formData.database || ''}
                              onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                              placeholder="Tên database"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Username</Label>
                              <Input
                                value={formData.username || ''}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="root"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Password</Label>
                              <Input
                                type="password"
                                value={formData.password || ''}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                        </>
                      )}
                      {(formData.databaseType === 'access' || formData.databaseType === 'excel') && (
                        <div className="space-y-2">
                          <Label>Đường dẫn file *</Label>
                          <Input
                            value={formData.filePath || ''}
                            onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                            placeholder="C:\\path\\to\\file.xlsx"
                          />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Mô tả</Label>
                        <Input
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Mô tả kết nối..."
                        />
                      </div>

                      {/* Test Connection */}
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={testConnectionMutation.isPending}
                        >
                          {testConnectionMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <TestTube className="mr-2 h-4 w-4" />
                          )}
                          Test Connection
                        </Button>
                        {testResult && (
                          <div className={`flex items-center gap-2 ${testResult.success ? 'text-chart-3' : 'text-destructive'}`}>
                            {testResult.success ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            <span className="text-sm">{testResult.success ? "Thành công" : "Thất bại"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Hủy
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={createConnectionMutation.isPending || updateConnectionMutation.isPending}
                      >
                        {(createConnectionMutation.isPending || updateConnectionMutation.isPending) && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editingId ? "Cập nhật" : "Tạo mới"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {connections && connections.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Mô tả</TableHead>
                          <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {connections.map((conn) => (
                          <TableRow key={conn.id}>
                            <TableCell className="font-medium">{conn.name}</TableCell>
                            <TableCell>{conn.databaseType}</TableCell>
                            <TableCell className="text-muted-foreground">{conn.description || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(conn)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(conn.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Chưa có kết nối nào</h3>
                    <p className="text-muted-foreground mt-1">
                      Thêm kết nối database để bắt đầu
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Explorer - Embedded */}
            <div className="mt-6">
              <DatabaseExplorer />
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <Card className="bg-card rounded-xl border border-border/50 shadow-md hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <CardTitle>Cài đặt cảnh báo CPK</CardTitle>
                <CardDescription>
                  Cấu hình ngưỡng cảnh báo khi CPK vượt giới hạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ngưỡng cảnh báo CPK (Warning)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={(alertSettings?.cpkWarningThreshold || 133) / 100}
                        onChange={(e) => {
                          const value = Math.round(parseFloat(e.target.value) * 100);
                          updateAlertMutation.mutate({ cpkWarningThreshold: value });
                        }}
                        className="max-w-[150px]"
                      />
                      <span className="text-muted-foreground">
                        Cảnh báo khi CPK {"<"} giá trị này
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ngưỡng nghiêm trọng CPK (Critical)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={(alertSettings?.cpkCriticalThreshold || 100) / 100}
                        onChange={(e) => {
                          const value = Math.round(parseFloat(e.target.value) * 100);
                          updateAlertMutation.mutate({ cpkCriticalThreshold: value });
                        }}
                        className="max-w-[150px]"
                      />
                      <span className="text-muted-foreground">
                        Cảnh báo nghiêm trọng khi CPK {"<"} giá trị này
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <Label className="text-base">Thông báo cho Owner</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gửi thông báo cho owner khi phát hiện CPK dưới ngưỡng
                    </p>
                  </div>
                  <Switch
                    checked={alertSettings?.notifyOwner === 1}
                    onCheckedChange={(checked) => {
                      updateAlertMutation.mutate({ notifyOwner: checked ? 1 : 0 });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WebSocket Tab */}
          <TabsContent value="websocket">
            <WebSocketSettings />
          </TabsContent>

          {/* SSE Tab */}
          <TabsContent value="sse">
            <SseSettings />
          </TabsContent>

          {/* Telegram Tab */}
          <TabsContent value="telegram">
            <TelegramSettings />
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// WebSocket Settings Component
function WebSocketSettings() {
  const { data: wsStatus, refetch } = trpc.system.getWebSocketStatus.useQuery();
  const toggleMutation = trpc.system.setWebSocketEnabled.useMutation({
    onSuccess: (data) => {
      toast.success(data.enabled ? 'WebSocket đã được bật' : 'WebSocket đã được tắt');
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });

  return (
    <Card className="bg-card rounded-xl border border-border/50 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {wsStatus?.enabled ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-muted-foreground" />
          )}
          Cấu hình WebSocket
        </CardTitle>
        <CardDescription>
          Quản lý kết nối WebSocket cho dữ liệu realtime
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle WebSocket */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="space-y-1">
            <Label className="text-base font-medium">Bật WebSocket Server</Label>
            <p className="text-sm text-muted-foreground">
              Cho phép kết nối WebSocket để nhận dữ liệu realtime
            </p>
          </div>
          <Switch
            checked={wsStatus?.enabled ?? false}
            onCheckedChange={(checked) => {
              toggleMutation.mutate({ enabled: checked });
            }}
            disabled={toggleMutation.isPending}
          />
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Trạng thái</div>
            <div className="text-lg font-semibold flex items-center gap-2">
              {wsStatus?.enabled ? (
                <><CheckCircle2 className="h-4 w-4 text-green-500" /> Bật</>
              ) : (
                <><XCircle className="h-4 w-4 text-red-500" /> Tắt</>
              )}
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Server</div>
            <div className="text-lg font-semibold">
              {wsStatus?.initialized ? 'Hoạt động' : 'Chưa khởi tạo'}
            </div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Kết nối</div>
            <div className="text-lg font-semibold">
              {wsStatus?.clientCount ?? 0} clients
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Thông tin</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• WebSocket cho phép nhận dữ liệu realtime từ máy móc và cảnh báo</li>
            <li>• Mặc định WebSocket được tắt để tiết kiệm tài nguyên</li>
            <li>• Cấu hình được lưu vào database và giữ nguyên sau khi restart</li>
            <li>• Có thể bật qua biến môi trường: WEBSOCKET_ENABLED=true</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}


// SSE Settings Component
function SseSettings() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  
  const { data: sseStatus, refetch } = trpc.system.getSseStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });
  
  // Server toggle mutation (admin only)
  const serverToggleMutation = trpc.system.setSseServerEnabled.useMutation({
    onSuccess: (data) => {
      toast.success(data.enabled ? 'SSE Server đã được bật' : 'SSE Server đã được tắt');
      refetch();
    },
    onError: (error) => {
      toast.error('Lỗi: ' + error.message);
    },
  });
  
  // Get SSE enabled state from localStorage
  const [sseEnabled, setSseEnabledState] = useState(() => {
    const stored = localStorage.getItem('sse_enabled');
    return stored !== 'false'; // Default to true
  });
  
  // Notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState(() => {
    const stored = localStorage.getItem('sse_notification_prefs');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return getDefaultNotificationPrefs();
      }
    }
    return getDefaultNotificationPrefs();
  });
  
  function getDefaultNotificationPrefs() {
    return {
      spc_analysis_complete: true,
      cpk_alert: true,
      plan_status_change: true,
      oee_update: false,
      machine_status_change: true,
      maintenance_alert: true,
      realtime_alert: true,
    };
  }
  
  const handleToggle = (checked: boolean) => {
    localStorage.setItem('sse_enabled', checked ? 'true' : 'false');
    setSseEnabledState(checked);
    toast.success(checked ? 'SSE đã được bật' : 'SSE đã được tắt');
    window.dispatchEvent(new CustomEvent('sse-toggle', { detail: { enabled: checked } }));
  };
  
  const handleNotificationPrefChange = (key: string, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    localStorage.setItem('sse_notification_prefs', JSON.stringify(newPrefs));
    window.dispatchEvent(new CustomEvent('sse-notification-prefs-change', { detail: newPrefs }));
  };

  return (
    <div className="space-y-6">
      {/* Main SSE Card */}
      <Card className="bg-card rounded-xl border border-border/50 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {sseStatus?.enabled ? (
              <Radio className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            )}
            Cấu hình SSE (Server-Sent Events)
          </CardTitle>
          <CardDescription>
            Quản lý kết nối SSE cho thông báo realtime
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Server Toggle (Admin only) */}
          {isAdmin && (
            <div className="flex items-center justify-between p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Bật SSE Server (Admin)</Label>
                <p className="text-sm text-muted-foreground">
                  Bật/tắt SSE server cho toàn bộ hệ thống
                </p>
              </div>
              <Switch
                checked={sseStatus?.enabled ?? true}
                onCheckedChange={(checked) => {
                  serverToggleMutation.mutate({ enabled: checked });
                }}
                disabled={serverToggleMutation.isPending}
              />
            </div>
          )}
          
          {/* Client Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Bật SSE Client</Label>
              <p className="text-sm text-muted-foreground">
                Cho phép nhận thông báo realtime từ server
              </p>
            </div>
            <Switch
              checked={sseEnabled}
              onCheckedChange={handleToggle}
            />
          </div>

          {/* Status Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground">Server Status</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {sseStatus?.enabled ? (
                  <><CheckCircle2 className="h-4 w-4 text-green-500" /> Bật</>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-500" /> Tắt</>
                )}
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground">Client Status</div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {sseEnabled ? (
                  <><CheckCircle2 className="h-4 w-4 text-green-500" /> Bật</>
                ) : (
                  <><XCircle className="h-4 w-4 text-red-500" /> Tắt</>
                )}
              </div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground">Server Clients</div>
              <div className="text-lg font-semibold">
                {sseStatus?.clientCount ?? 0} clients
              </div>
            </div>
          </div>
          
          {/* Event Log Link */}
          {isAdmin && (
            <div className="flex justify-end">
              <Link href="/sse-event-log">
                <Button variant="outline" size="sm">
                  Xem Event Log
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Notification Preferences Card */}
      <Card className="bg-card rounded-xl border border-border/50 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Tùy chọn thông báo SSE
          </CardTitle>
          <CardDescription>
            Chọn loại thông báo bạn muốn nhận qua SSE
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="font-medium">Phân tích SPC hoàn thành</Label>
                <p className="text-xs text-muted-foreground">Thông báo khi phân tích SPC hoàn tất</p>
              </div>
              <Switch
                checked={notificationPrefs.spc_analysis_complete}
                onCheckedChange={(v) => handleNotificationPrefChange('spc_analysis_complete', v)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="font-medium">Cảnh báo CPK</Label>
                <p className="text-xs text-muted-foreground">Thông báo khi CPK vượt ngưỡng</p>
              </div>
              <Switch
                checked={notificationPrefs.cpk_alert}
                onCheckedChange={(v) => handleNotificationPrefChange('cpk_alert', v)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="font-medium">Thay đổi trạng thái kế hoạch</Label>
                <p className="text-xs text-muted-foreground">Thông báo khi kế hoạch SPC thay đổi</p>
              </div>
              <Switch
                checked={notificationPrefs.plan_status_change}
                onCheckedChange={(v) => handleNotificationPrefChange('plan_status_change', v)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="font-medium">Cập nhật OEE</Label>
                <p className="text-xs text-muted-foreground">Thông báo khi OEE được cập nhật</p>
              </div>
              <Switch
                checked={notificationPrefs.oee_update}
                onCheckedChange={(v) => handleNotificationPrefChange('oee_update', v)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="font-medium">Thay đổi trạng thái máy</Label>
                <p className="text-xs text-muted-foreground">Thông báo khi máy thay đổi trạng thái</p>
              </div>
              <Switch
                checked={notificationPrefs.machine_status_change}
                onCheckedChange={(v) => handleNotificationPrefChange('machine_status_change', v)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="font-medium">Cảnh báo bảo trì</Label>
                <p className="text-xs text-muted-foreground">Thông báo về lịch bảo trì máy</p>
              </div>
              <Switch
                checked={notificationPrefs.maintenance_alert}
                onCheckedChange={(v) => handleNotificationPrefChange('maintenance_alert', v)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label className="font-medium">Cảnh báo realtime</Label>
                <p className="text-xs text-muted-foreground">Các cảnh báo realtime khác</p>
              </div>
              <Switch
                checked={notificationPrefs.realtime_alert}
                onCheckedChange={(v) => handleNotificationPrefChange('realtime_alert', v)}
              />
            </div>
          </div>
          
          {/* Info */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Thông tin</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Tùy chọn này chỉ ảnh hưởng đến thông báo hiển thị trên trình duyệt của bạn</li>
              <li>• Cấu hình được lưu vào trình duyệt (localStorage)</li>
              <li>• Tắt các loại thông báo không cần thiết để giảm nhiễu</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// Telegram Settings Component
function TelegramSettings() {
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get current config
  const { data: config, refetch: refetchConfig } = trpc.telegram.getConfig.useQuery();

  // Mutations
  const saveConfig = trpc.telegram.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Đã lưu cấu hình Telegram");
      refetchConfig();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const testConnection = trpc.telegram.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Kết nối Telegram thành công!");
      } else {
        toast.error(`Lỗi: ${data.error}`);
      }
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  // Load config on mount
  useEffect(() => {
    if (config) {
      setBotToken(config.botToken || "");
      setChatId(config.chatId || "");
      setIsEnabled(config.isEnabled || false);
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveConfig.mutateAsync({
        botToken,
        chatId,
        isEnabled,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!botToken || !chatId) {
      toast.error("Vui lòng nhập Bot Token và Chat ID");
      return;
    }
    setIsTesting(true);
    try {
      await testConnection.mutateAsync({
        botToken,
        chatId,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card rounded-xl border border-border/50 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            Cấu hình Telegram Bot
          </CardTitle>
          <CardDescription>
            Cấu hình Telegram Bot để nhận thông báo cảnh báo qua Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-base font-medium">Kích hoạt thông báo Telegram</Label>
              <p className="text-sm text-muted-foreground">
                Bật để nhận thông báo qua Telegram khi có cảnh báo
              </p>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {/* Bot Token */}
          <div className="space-y-2">
            <Label htmlFor="botToken" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Bot Token
            </Label>
            <Input
              id="botToken"
              type="password"
              placeholder="Nhập Bot Token từ @BotFather"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tạo bot mới tại{" "}
              <a 
                href="https://t.me/BotFather" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                @BotFather
              </a>
              {" "}và lấy token
            </p>
          </div>

          {/* Chat ID */}
          <div className="space-y-2">
            <Label htmlFor="chatId" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat ID
            </Label>
            <Input
              id="chatId"
              placeholder="Nhập Chat ID hoặc Group ID"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Lấy Chat ID bằng cách gửi tin nhắn cho bot và truy cập{" "}
              <code className="bg-muted px-1 rounded">
                https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates
              </code>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !botToken || !chatId}
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Test kết nối
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Lưu cấu hình
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-card rounded-xl border border-border/50 shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Hướng dẫn cấu hình</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <p className="font-medium">Tạo Bot Telegram</p>
                <p className="text-sm text-muted-foreground">
                  Mở Telegram, tìm @BotFather và gửi lệnh /newbot để tạo bot mới
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <p className="font-medium">Lấy Bot Token</p>
                <p className="text-sm text-muted-foreground">
                  Sau khi tạo bot, BotFather sẽ gửi cho bạn token. Copy và dán vào ô Bot Token
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <p className="font-medium">Lấy Chat ID</p>
                <p className="text-sm text-muted-foreground">
                  Gửi tin nhắn cho bot, sau đó truy cập API getUpdates để lấy Chat ID
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <p className="font-medium">Test và Lưu</p>
                <p className="text-sm text-muted-foreground">
                  Nhấn "Test kết nối" để kiểm tra, sau đó "Lưu cấu hình" để hoàn tất
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
