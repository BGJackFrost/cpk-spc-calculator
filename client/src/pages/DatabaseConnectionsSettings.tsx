import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Database, 
  Plus, 
  Pencil, 
  Trash2, 
  TestTube, 
  Star, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Shield,
  Settings2
} from "lucide-react";

type DatabaseType = "mysql" | "postgresql" | "postgres" | "sqlserver" | "oracle" | "access" | "excel" | "internal";

interface ConnectionFormData {
  name: string;
  databaseType: DatabaseType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  description: string;
  purpose: string;
  sslEnabled: boolean;
  maxConnections: string;
  connectionTimeout: string;
  healthCheckEnabled: boolean;
  healthCheckInterval: string;
  isDefault: boolean;
  isActive: boolean;
}

const defaultFormData: ConnectionFormData = {
  name: "",
  databaseType: "mysql",
  host: "",
  port: "",
  database: "",
  username: "",
  password: "",
  description: "",
  purpose: "",
  sslEnabled: false,
  maxConnections: "10",
  connectionTimeout: "30000",
  healthCheckEnabled: true,
  healthCheckInterval: "60000",
  isDefault: false,
  isActive: true,
};

const databaseTypeOptions: { value: DatabaseType; label: string; defaultPort: number }[] = [
  { value: "mysql", label: "MySQL", defaultPort: 3306 },
  { value: "postgresql", label: "PostgreSQL", defaultPort: 5432 },
  { value: "postgres", label: "PostgreSQL (alt)", defaultPort: 5432 },
  { value: "sqlserver", label: "SQL Server", defaultPort: 1433 },
  { value: "oracle", label: "Oracle", defaultPort: 1521 },
  { value: "access", label: "MS Access", defaultPort: 0 },
  { value: "excel", label: "Excel", defaultPort: 0 },
  { value: "internal", label: "Internal", defaultPort: 0 },
];

const purposeOptions = [
  { value: "spc_data", label: "SPC Data" },
  { value: "oee_data", label: "OEE Data" },
  { value: "failover", label: "Failover" },
  { value: "backup", label: "Backup" },
  { value: "reporting", label: "Reporting" },
  { value: "integration", label: "Integration" },
];

export default function DatabaseConnectionsSettings() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ConnectionFormData>(defaultFormData);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testingAll, setTestingAll] = useState(false);

  const utils = trpc.useUtils();
  
  const { data: connections, isLoading } = trpc.databaseConnection.list.useQuery({});
  const { data: stats } = trpc.databaseConnection.getStats.useQuery();
  
  const createMutation = trpc.databaseConnection.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo kết nối mới");
      utils.databaseConnection.list.invalidate();
      utils.databaseConnection.getStats.invalidate();
      setIsDialogOpen(false);
      setFormData(defaultFormData);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateMutation = trpc.databaseConnection.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật kết nối");
      utils.databaseConnection.list.invalidate();
      utils.databaseConnection.getStats.invalidate();
      setIsDialogOpen(false);
      setEditingId(null);
      setFormData(defaultFormData);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteMutation = trpc.databaseConnection.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa kết nối");
      utils.databaseConnection.list.invalidate();
      utils.databaseConnection.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const testMutation = trpc.databaseConnection.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Kết nối thành công! (${result.responseTime}ms)`);
      } else {
        toast.error(`Kết nối thất bại: ${result.error}`);
      }
      utils.databaseConnection.list.invalidate();
      setTestingId(null);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
      setTestingId(null);
    },
  });

  const setDefaultMutation = trpc.databaseConnection.setDefault.useMutation({
    onSuccess: () => {
      toast.success("Đã đặt làm mặc định");
      utils.databaseConnection.list.invalidate();
      utils.databaseConnection.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const testAllMutation = trpc.databaseConnection.testAll.useMutation({
    onSuccess: (results) => {
      const success = results.filter(r => r.success).length;
      const failed = results.length - success;
      toast.success(`Test hoàn tất: ${success} thành công, ${failed} thất bại`);
      utils.databaseConnection.list.invalidate();
      setTestingAll(false);
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
      setTestingAll(false);
    },
  });

  const handleOpenDialog = (connection?: typeof connections extends (infer T)[] | undefined ? T : never) => {
    if (connection) {
      setEditingId(connection.id);
      setFormData({
        name: connection.name,
        databaseType: connection.databaseType as DatabaseType,
        host: connection.host || "",
        port: connection.port?.toString() || "",
        database: connection.database || "",
        username: connection.username || "",
        password: "",
        description: connection.description || "",
        purpose: connection.purpose || "",
        sslEnabled: connection.sslEnabled === 1,
        maxConnections: connection.maxConnections?.toString() || "10",
        connectionTimeout: connection.connectionTimeout?.toString() || "30000",
        healthCheckEnabled: connection.healthCheckEnabled === 1,
        healthCheckInterval: connection.healthCheckInterval?.toString() || "60000",
        isDefault: connection.isDefault === 1,
        isActive: connection.isActive === 1,
      });
    } else {
      setEditingId(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      databaseType: formData.databaseType,
      host: formData.host || undefined,
      port: formData.port ? parseInt(formData.port) : undefined,
      database: formData.database || undefined,
      username: formData.username || undefined,
      password: formData.password || undefined,
      description: formData.description || undefined,
      purpose: formData.purpose || undefined,
      sslEnabled: formData.sslEnabled,
      maxConnections: formData.maxConnections ? parseInt(formData.maxConnections) : undefined,
      connectionTimeout: formData.connectionTimeout ? parseInt(formData.connectionTimeout) : undefined,
      healthCheckEnabled: formData.healthCheckEnabled,
      healthCheckInterval: formData.healthCheckInterval ? parseInt(formData.healthCheckInterval) : undefined,
      isDefault: formData.isDefault,
      isActive: formData.isActive,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDatabaseTypeChange = (value: DatabaseType) => {
    const option = databaseTypeOptions.find(o => o.value === value);
    setFormData(prev => ({
      ...prev,
      databaseType: value,
      port: option?.defaultPort ? option.defaultPort.toString() : "",
    }));
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Chưa test</Badge>;
    }
    if (status === "success") {
      return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Thành công</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Thất bại</Badge>;
  };

  const getDatabaseIcon = (type: string) => {
    switch (type) {
      case "mysql":
        return "🐬";
      case "postgresql":
        return "🐘";
      case "sqlserver":
        return "🗄️";
      case "oracle":
        return "🔶";
      default:
        return "📁";
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              Quản lý Kết nối Database
            </h1>
            <p className="text-muted-foreground">
              Cấu hình và quản lý các kết nối đến máy chủ database nội bộ
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTestingAll(true);
                testAllMutation.mutate();
              }}
              disabled={testingAll}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${testingAll ? "animate-spin" : ""}`} />
              Test tất cả
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm kết nối
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tổng kết nối</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hoạt động</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">{stats.byStatus.success}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Lỗi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{stats.byStatus.failed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Chưa test</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-500">{stats.byStatus.untested}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Connections List */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="mysql">MySQL</TabsTrigger>
            <TabsTrigger value="postgresql">PostgreSQL</TabsTrigger>
            <TabsTrigger value="sqlserver">SQL Server</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : connections?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Chưa có kết nối nào</p>
                  <Button className="mt-4" onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm kết nối đầu tiên
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {connections?.map((conn) => (
                  <Card key={conn.id} className={conn.isDefault ? "border-primary" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getDatabaseIcon(conn.databaseType)}</span>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {conn.name}
                              {conn.isDefault === 1 && (
                                <Badge variant="secondary" className="gap-1">
                                  <Star className="h-3 w-3" /> Mặc định
                                </Badge>
                              )}
                              {conn.isActive === 0 && (
                                <Badge variant="outline">Không hoạt động</Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              {conn.databaseType.toUpperCase()} • {conn.host}:{conn.port} • {conn.database}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(conn.lastTestStatus)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {conn.purpose && (
                            <span className="flex items-center gap-1">
                              <Settings2 className="h-4 w-4" />
                              {purposeOptions.find(p => p.value === conn.purpose)?.label || conn.purpose}
                            </span>
                          )}
                          {conn.sslEnabled === 1 && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-4 w-4" />
                              SSL
                            </span>
                          )}
                          {conn.lastTestedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Test lúc: {new Date(conn.lastTestedAt).toLocaleString("vi-VN")}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTestingId(conn.id);
                              testMutation.mutate({ id: conn.id });
                            }}
                            disabled={testingId === conn.id}
                          >
                            <TestTube className={`h-4 w-4 mr-1 ${testingId === conn.id ? "animate-pulse" : ""}`} />
                            Test
                          </Button>
                          {conn.isDefault !== 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDefaultMutation.mutate({ id: conn.id })}
                            >
                              <Star className="h-4 w-4 mr-1" />
                              Đặt mặc định
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(conn)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("Bạn có chắc muốn xóa kết nối này?")) {
                                deleteMutation.mutate({ id: conn.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {conn.lastTestError && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                          Lỗi: {conn.lastTestError}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {["mysql", "postgresql", "sqlserver"].map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {connections?.filter(c => c.databaseType === type).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Không có kết nối {type.toUpperCase()} nào</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {connections?.filter(c => c.databaseType === type).map((conn) => (
                    <Card key={conn.id} className={conn.isDefault ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getDatabaseIcon(conn.databaseType)}</span>
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                {conn.name}
                                {conn.isDefault === 1 && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Star className="h-3 w-3" /> Mặc định
                                  </Badge>
                                )}
                              </CardTitle>
                              <CardDescription>
                                {conn.host}:{conn.port} • {conn.database}
                              </CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(conn.lastTestStatus)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTestingId(conn.id);
                              testMutation.mutate({ id: conn.id });
                            }}
                            disabled={testingId === conn.id}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(conn)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {editingId ? "Chỉnh sửa kết nối" : "Thêm kết nối mới"}
              </DialogTitle>
              <DialogDescription>
                Cấu hình thông tin kết nối đến máy chủ database
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tên kết nối *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Production MySQL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="databaseType">Loại database *</Label>
                  <Select
                    value={formData.databaseType}
                    onValueChange={(value) => handleDatabaseTypeChange(value as DatabaseType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {databaseTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {getDatabaseIcon(option.value)} {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Connection Details */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="host">Host</Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                    placeholder="localhost hoặc IP address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port">Port</Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData(prev => ({ ...prev, port: e.target.value }))}
                    placeholder="3306"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="database">Database</Label>
                  <Input
                    id="database"
                    value={formData.database}
                    onChange={(e) => setFormData(prev => ({ ...prev, database: e.target.value }))}
                    placeholder="database_name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="root"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder={editingId ? "Để trống nếu không đổi" : "••••••••"}
                  />
                </div>
              </div>

              {/* Purpose and Description */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Mục đích sử dụng</Label>
                  <Select
                    value={formData.purpose}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, purpose: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn mục đích" />
                    </SelectTrigger>
                    <SelectContent>
                      {purposeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Mô tả</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mô tả ngắn về kết nối"
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Cài đặt nâng cao
                </h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxConnections">Max Connections</Label>
                    <Input
                      id="maxConnections"
                      type="number"
                      value={formData.maxConnections}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxConnections: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="connectionTimeout">Timeout (ms)</Label>
                    <Input
                      id="connectionTimeout"
                      type="number"
                      value={formData.connectionTimeout}
                      onChange={(e) => setFormData(prev => ({ ...prev, connectionTimeout: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="healthCheckInterval">Health Check (ms)</Label>
                    <Input
                      id="healthCheckInterval"
                      type="number"
                      value={formData.healthCheckInterval}
                      onChange={(e) => setFormData(prev => ({ ...prev, healthCheckInterval: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="sslEnabled"
                      checked={formData.sslEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sslEnabled: checked }))}
                    />
                    <Label htmlFor="sslEnabled" className="flex items-center gap-1">
                      <Shield className="h-4 w-4" />
                      SSL/TLS
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="healthCheckEnabled"
                      checked={formData.healthCheckEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, healthCheckEnabled: checked }))}
                    />
                    <Label htmlFor="healthCheckEnabled">Health Check</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isDefault: checked }))}
                    />
                    <Label htmlFor="isDefault" className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      Mặc định
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Hoạt động</Label>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                {editingId ? "Cập nhật" : "Tạo mới"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
