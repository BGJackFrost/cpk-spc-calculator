import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Database,
  Server,
  Shield,
  Activity,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  TestTube,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Settings2,
  Eye,
  EyeOff,
  Save,
  ArrowRightLeft,
  AlertTriangle,
  Loader2,
  HardDrive,
  Zap,
  Link2,
  Unlink
} from "lucide-react";

// Types
type DatabaseType = "mysql" | "postgresql" | "internal";

interface DatabaseConnection {
  id: number;
  name: string;
  databaseType: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  isPrimary: boolean;
  syncEnabled: boolean;
  lastHealthCheck?: Date;
  healthStatus: "healthy" | "warning" | "error" | "unknown";
  connectionCount: number;
  maxConnections: number;
}

interface HealthMetrics {
  activeConnections: number;
  idleConnections: number;
  totalQueries: number;
  avgLatency: number;
  uptime: number;
  lastError?: string;
}

interface SyncStatus {
  lastSyncTime?: Date;
  recordsSynced: number;
  pendingChanges: number;
  syncErrors: number;
  isRunning: boolean;
}

// Mock data for demonstration
const mockConnections: DatabaseConnection[] = [
  {
    id: 1,
    name: "PostgreSQL Primary",
    databaseType: "postgresql",
    host: "localhost",
    port: 5432,
    database: "spc_calculator",
    username: "spc_user",
    description: "Database chính của hệ thống - PostgreSQL",
    isDefault: true,
    isActive: true,
    isPrimary: true,
    syncEnabled: false,
    healthStatus: "healthy",
    connectionCount: 5,
    maxConnections: 100,
  },
  {
    id: 2,
    name: "MySQL Secondary",
    databaseType: "mysql",
    host: "localhost",
    port: 3306,
    database: "spc_calculator_mysql",
    username: "spc_user",
    description: "Database phụ - MySQL (sync từ PostgreSQL)",
    isDefault: false,
    isActive: true,
    isPrimary: false,
    syncEnabled: true,
    healthStatus: "healthy",
    connectionCount: 2,
    maxConnections: 50,
  },
  {
    id: 3,
    name: "Internal System DB",
    databaseType: "internal",
    host: "internal",
    port: 0,
    database: "system",
    username: "system",
    description: "Database nội bộ của Manus",
    isDefault: false,
    isActive: true,
    isPrimary: false,
    syncEnabled: false,
    healthStatus: "healthy",
    connectionCount: 1,
    maxConnections: 10,
  },
];

export default function DatabaseUnified() {
  const [activeTab, setActiveTab] = useState("overview");
  const [connections, setConnections] = useState<DatabaseConnection[]>(mockConnections);
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: "",
    databaseType: "postgresql" as DatabaseType,
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    description: "",
    isActive: true,
    isPrimary: false,
    syncEnabled: false,
  });

  // Health metrics (mock)
  const [healthMetrics, setHealthMetrics] = useState<Record<number, HealthMetrics>>({
    1: { activeConnections: 5, idleConnections: 15, totalQueries: 12500, avgLatency: 2.3, uptime: 99.9 },
    2: { activeConnections: 2, idleConnections: 8, totalQueries: 3200, avgLatency: 4.1, uptime: 99.5 },
    3: { activeConnections: 1, idleConnections: 4, totalQueries: 850, avgLatency: 1.2, uptime: 100 },
  });

  // Sync status (mock)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: new Date(Date.now() - 300000),
    recordsSynced: 15420,
    pendingChanges: 23,
    syncErrors: 0,
    isRunning: false,
  });

  // Get primary and secondary databases
  const primaryDb = useMemo(() => connections.find(c => c.isPrimary), [connections]);
  const secondaryDbs = useMemo(() => connections.filter(c => !c.isPrimary && c.syncEnabled), [connections]);

  // Test connection
  const handleTestConnection = async (connectionId: number) => {
    setIsTesting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Kết nối thành công!");
      setConnections(prev => prev.map(c => 
        c.id === connectionId ? { ...c, healthStatus: "healthy" as const, lastHealthCheck: new Date() } : c
      ));
    } catch {
      toast.error("Kết nối thất bại!");
      setConnections(prev => prev.map(c => 
        c.id === connectionId ? { ...c, healthStatus: "error" as const } : c
      ));
    } finally {
      setIsTesting(false);
    }
  };

  // Set as primary
  const handleSetPrimary = (connectionId: number) => {
    setConnections(prev => prev.map(c => ({
      ...c,
      isPrimary: c.id === connectionId,
      isDefault: c.id === connectionId,
      syncEnabled: c.id !== connectionId ? c.syncEnabled : false,
    })));
    toast.success("Đã đặt làm database chính!");
  };

  // Toggle sync
  const handleToggleSync = (connectionId: number, enabled: boolean) => {
    setConnections(prev => prev.map(c => 
      c.id === connectionId ? { ...c, syncEnabled: enabled } : c
    ));
    toast.success(enabled ? "Đã bật đồng bộ" : "Đã tắt đồng bộ");
  };

  // Run sync
  const handleRunSync = async () => {
    if (!primaryDb || secondaryDbs.length === 0) {
      toast.error("Cần có database chính và ít nhất 1 database phụ để đồng bộ");
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus(prev => ({ ...prev, isRunning: true }));

    try {
      // Simulate sync progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        setSyncProgress(i);
      }

      setSyncStatus({
        lastSyncTime: new Date(),
        recordsSynced: syncStatus.recordsSynced + 23,
        pendingChanges: 0,
        syncErrors: 0,
        isRunning: false,
      });

      toast.success("Đồng bộ hoàn tất!");
    } catch {
      toast.error("Đồng bộ thất bại!");
      setSyncStatus(prev => ({ ...prev, syncErrors: prev.syncErrors + 1, isRunning: false }));
    } finally {
      setIsSyncing(false);
    }
  };

  // Add connection
  const handleAddConnection = () => {
    const newConnection: DatabaseConnection = {
      id: Math.max(...connections.map(c => c.id)) + 1,
      name: formData.name,
      databaseType: formData.databaseType,
      host: formData.host,
      port: parseInt(formData.port),
      database: formData.database,
      username: formData.username,
      description: formData.description,
      isDefault: false,
      isActive: formData.isActive,
      isPrimary: formData.isPrimary,
      syncEnabled: formData.syncEnabled,
      healthStatus: "unknown",
      connectionCount: 0,
      maxConnections: 50,
    };

    setConnections([...connections, newConnection]);
    setIsAddDialogOpen(false);
    resetForm();
    toast.success("Đã thêm kết nối mới!");
  };

  // Edit connection
  const handleEditConnection = () => {
    if (!selectedConnection) return;
    
    setConnections(prev => prev.map(conn => {
      if (conn.id === selectedConnection.id) {
        return {
          ...conn,
          name: formData.name,
          databaseType: formData.databaseType,
          host: formData.host,
          port: parseInt(formData.port),
          database: formData.database,
          username: formData.username,
          description: formData.description,
          isActive: formData.isActive,
          isPrimary: formData.isPrimary,
          syncEnabled: formData.syncEnabled,
        };
      }
      return conn;
    }));
    
    setIsEditDialogOpen(false);
    resetForm();
    toast.success("Đã cập nhật kết nối!");
  };

  // Delete connection
  const handleDeleteConnection = (connectionId: number) => {
    const conn = connections.find(c => c.id === connectionId);
    if (conn?.isPrimary) {
      toast.error("Không thể xóa database chính!");
      return;
    }
    setConnections(prev => prev.filter(c => c.id !== connectionId));
    toast.success("Đã xóa kết nối!");
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      databaseType: "postgresql",
      host: "",
      port: "5432",
      database: "",
      username: "",
      password: "",
      description: "",
      isActive: true,
      isPrimary: false,
      syncEnabled: false,
    });
  };

  // Get status badge
  const getStatusBadge = (status: DatabaseConnection["healthStatus"]) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Unknown</Badge>;
    }
  };

  // Get database icon
  const getDatabaseIcon = (type: DatabaseType) => {
    switch (type) {
      case "postgresql":
        return <Database className="h-5 w-5 text-blue-500" />;
      case "mysql":
        return <Database className="h-5 w-5 text-orange-500" />;
      default:
        return <HardDrive className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              Quản lý Database Hệ thống
            </h1>
            <p className="text-muted-foreground mt-1">
              Cấu hình kết nối, giám sát sức khỏe và đồng bộ dữ liệu giữa các database
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm kết nối
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tổng kết nối</p>
                  <p className="text-2xl font-bold">{connections.length}</p>
                </div>
                <Server className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Database chính</p>
                  <p className="text-2xl font-bold">{primaryDb?.name || "Chưa cấu hình"}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Đang đồng bộ</p>
                  <p className="text-2xl font-bold">{secondaryDbs.length}</p>
                </div>
                <ArrowRightLeft className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Thay đổi chờ sync</p>
                  <p className="text-2xl font-bold">{syncStatus.pendingChanges}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <Server className="h-4 w-4 mr-2" />
              Tổng quan
            </TabsTrigger>
            <TabsTrigger value="connections">
              <Database className="h-4 w-4 mr-2" />
              Kết nối
            </TabsTrigger>
            <TabsTrigger value="sync">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Đồng bộ
            </TabsTrigger>
            <TabsTrigger value="health">
              <Activity className="h-4 w-4 mr-2" />
              Sức khỏe
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Primary Database */}
              <Card className="border-2 border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Database Chính (Primary)
                    </CardTitle>
                    {primaryDb && getStatusBadge(primaryDb.healthStatus)}
                  </div>
                  <CardDescription>
                    Tất cả dữ liệu được ghi vào database này trước
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {primaryDb ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {getDatabaseIcon(primaryDb.databaseType)}
                        <div>
                          <p className="font-medium">{primaryDb.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {primaryDb.databaseType.toUpperCase()} - {primaryDb.host}:{primaryDb.port}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Database</p>
                          <p className="font-mono">{primaryDb.database}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Connections</p>
                          <p>{primaryDb.connectionCount}/{primaryDb.maxConnections}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleTestConnection(primaryDb.id)}
                        disabled={isTesting}
                      >
                        {isTesting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4 mr-2" />
                        )}
                        Test kết nối
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Chưa cấu hình database chính</p>
                      <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Thêm database
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Secondary Databases */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                    Database Phụ (Secondary)
                  </CardTitle>
                  <CardDescription>
                    Dữ liệu được đồng bộ từ database chính
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {secondaryDbs.length > 0 ? (
                    <div className="space-y-3">
                      {secondaryDbs.map(db => (
                        <div key={db.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getDatabaseIcon(db.databaseType)}
                            <div>
                              <p className="font-medium">{db.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {db.host}:{db.port}/{db.database}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(db.healthStatus)}
                            <Switch
                              checked={db.syncEnabled}
                              onCheckedChange={(checked) => handleToggleSync(db.id, checked)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Unlink className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Chưa có database phụ nào được cấu hình đồng bộ</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sync Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Trạng thái đồng bộ</CardTitle>
                  <Button 
                    onClick={handleRunSync} 
                    disabled={isSyncing || !primaryDb || secondaryDbs.length === 0}
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Đang đồng bộ...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Đồng bộ ngay
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isSyncing && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Tiến trình</span>
                      <span>{syncProgress}%</span>
                    </div>
                    <Progress value={syncProgress} />
                  </div>
                )}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{syncStatus.recordsSynced.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Records đã sync</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{syncStatus.pendingChanges}</p>
                    <p className="text-sm text-muted-foreground">Đang chờ</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{syncStatus.syncErrors}</p>
                    <p className="text-sm text-muted-foreground">Lỗi</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">
                      {syncStatus.lastSyncTime 
                        ? new Date(syncStatus.lastSyncTime).toLocaleTimeString("vi-VN")
                        : "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">Lần sync cuối</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách kết nối Database</CardTitle>
                <CardDescription>
                  Quản lý tất cả các kết nối database của hệ thống
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Database</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Vai trò</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.map((conn) => (
                      <TableRow key={conn.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getDatabaseIcon(conn.databaseType)}
                            <span className="font-medium">{conn.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{conn.databaseType.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {conn.host}:{conn.port}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{conn.database}</TableCell>
                        <TableCell>{getStatusBadge(conn.healthStatus)}</TableCell>
                        <TableCell>
                          {conn.isPrimary ? (
                            <Badge className="bg-yellow-500">
                              <Star className="h-3 w-3 mr-1" />
                              Primary
                            </Badge>
                          ) : conn.syncEnabled ? (
                            <Badge variant="secondary">
                              <Link2 className="h-3 w-3 mr-1" />
                              Sync
                            </Badge>
                          ) : (
                            <Badge variant="outline">Standalone</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTestConnection(conn.id)}
                              disabled={isTesting}
                            >
                              <TestTube className="h-4 w-4" />
                            </Button>
                            {!conn.isPrimary && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleSetPrimary(conn.id)}
                              >
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedConnection(conn);
                                setFormData({
                                  name: conn.name,
                                  databaseType: conn.databaseType,
                                  host: conn.host,
                                  port: conn.port.toString(),
                                  database: conn.database,
                                  username: conn.username,
                                  password: "",
                                  description: conn.description || "",
                                  isActive: conn.isActive,
                                  isPrimary: conn.isPrimary,
                                  syncEnabled: conn.syncEnabled,
                                });
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!conn.isPrimary && conn.databaseType !== "internal" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteConnection(conn.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
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

          {/* Sync Tab */}
          <TabsContent value="sync" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Sync Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Cấu hình đồng bộ</CardTitle>
                  <CardDescription>
                    Thiết lập cách dữ liệu được đồng bộ từ PostgreSQL sang MySQL
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">PostgreSQL → MySQL</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      PostgreSQL là database chính. Tất cả thay đổi sẽ được đồng bộ sang MySQL.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Tự động đồng bộ</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Đồng bộ realtime</Label>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Sync interval (giây)</Label>
                      <Input type="number" className="w-24" defaultValue="60" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Batch size</Label>
                      <Input type="number" className="w-24" defaultValue="1000" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Tables được đồng bộ</Label>
                    <div className="flex flex-wrap gap-2">
                      {["users", "products", "measurements", "spc_data", "alerts"].map(table => (
                        <Badge key={table} variant="secondary" className="cursor-pointer">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sync History */}
              <Card>
                <CardHeader>
                  <CardTitle>Lịch sử đồng bộ</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">Sync #{10 - i}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(Date.now() - i * 3600000).toLocaleString("vi-VN")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge className="bg-green-500">Thành công</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {Math.floor(Math.random() * 100) + 10} records
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-4">
            {connections.map(conn => {
              const metrics = healthMetrics[conn.id];
              if (!metrics) return null;

              return (
                <Card key={conn.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {getDatabaseIcon(conn.databaseType)}
                        {conn.name}
                      </CardTitle>
                      {getStatusBadge(conn.healthStatus)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <Zap className="h-6 w-6 mx-auto mb-2 text-green-500" />
                        <p className="text-2xl font-bold">{metrics.activeConnections}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <Clock className="h-6 w-6 mx-auto mb-2 text-gray-500" />
                        <p className="text-2xl font-bold">{metrics.idleConnections}</p>
                        <p className="text-xs text-muted-foreground">Idle</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <Activity className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                        <p className="text-2xl font-bold">{metrics.totalQueries.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Queries</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <RefreshCw className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                        <p className="text-2xl font-bold">{metrics.avgLatency}ms</p>
                        <p className="text-xs text-muted-foreground">Avg Latency</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <Shield className="h-6 w-6 mx-auto mb-2 text-green-500" />
                        <p className="text-2xl font-bold">{metrics.uptime}%</p>
                        <p className="text-xs text-muted-foreground">Uptime</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Add Connection Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Thêm kết nối Database</DialogTitle>
              <DialogDescription>
                Nhập thông tin kết nối database mới
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên kết nối</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: PostgreSQL Production"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại Database</Label>
                <Select
                  value={formData.databaseType}
                  onValueChange={(value: DatabaseType) => {
                    setFormData({ 
                      ...formData, 
                      databaseType: value,
                      port: value === "postgresql" ? "5432" : "3306"
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Host</Label>
                  <Input
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="localhost"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Database</Label>
                <Input
                  value={formData.database}
                  onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  placeholder="spc_calculator"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về kết nối này"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Đặt làm database chính</Label>
                <Switch
                  checked={formData.isPrimary}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Bật đồng bộ (nếu không phải primary)</Label>
                <Switch
                  checked={formData.syncEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, syncEnabled: checked })}
                  disabled={formData.isPrimary}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleAddConnection}>
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Connection Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sửa kết nối Database</DialogTitle>
              <DialogDescription>
                Chỉnh sửa thông tin kết nối database
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tên kết nối</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: PostgreSQL Production"
                />
              </div>
              <div className="space-y-2">
                <Label>Loại Database</Label>
                <Select
                  value={formData.databaseType}
                  onValueChange={(value: DatabaseType) => {
                    setFormData({ 
                      ...formData, 
                      databaseType: value,
                      port: value === "postgresql" ? "5432" : "3306"
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Host</Label>
                  <Input
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    placeholder="localhost"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Port</Label>
                  <Input
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Database</Label>
                <Input
                  value={formData.database}
                  onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  placeholder="spc_calculator"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Để trống nếu không thay đổi"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn về kết nối này"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Đặt làm database chính</Label>
                <Switch
                  checked={formData.isPrimary}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPrimary: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Bật đồng bộ (nếu không phải primary)</Label>
                <Switch
                  checked={formData.syncEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, syncEnabled: checked })}
                  disabled={formData.isPrimary}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleEditConnection}>
                <Save className="h-4 w-4 mr-2" />
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
