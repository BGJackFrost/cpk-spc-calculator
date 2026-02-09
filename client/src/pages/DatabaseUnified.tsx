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
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  Unlink,
  GripVertical,
  Copy,
  Download,
  Upload,
  FileJson
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
  sortOrder?: number;
  responseTime?: number;
  lastError?: string;
}

// Sortable Table Row Component
function SortableConnectionTableRow({
  conn,
  getDatabaseIcon,
  getStatusBadge,
  handleTestConnection,
  handleSetPrimary,
  handleCloneConnection,
  handleDeleteConnection,
  isTesting,
  onEdit,
}: {
  conn: DatabaseConnection;
  getDatabaseIcon: (type: DatabaseType) => React.ReactNode;
  getStatusBadge: (conn: DatabaseConnection) => React.ReactNode;
  handleTestConnection: (id: number) => void;
  handleSetPrimary: (id: number) => void;
  handleCloneConnection: (conn: DatabaseConnection) => void;
  handleDeleteConnection: (id: number) => void;
  isTesting: boolean;
  onEdit: (conn: DatabaseConnection) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: conn.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-muted" : ""}>
      <TableCell className="w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
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
      <TableCell>{getStatusBadge(conn)}</TableCell>
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
            title="Test kết nối"
          >
            <TestTube className="h-4 w-4" />
          </Button>
          {!conn.isPrimary && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSetPrimary(conn.id)}
              title="Đặt làm Primary"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCloneConnection(conn)}
            title="Clone kết nối"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(conn)}
            title="Sửa kết nối"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!conn.isPrimary && conn.databaseType !== "internal" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteConnection(conn.id)}
              title="Xóa kết nối"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
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
// Mock data removed - mockConnections (data comes from tRPC or is not yet implemented)

export default function DatabaseUnified() {
  const [activeTab, setActiveTab] = useState("overview");
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  
  // Load connections from API
  const connectionsQuery = trpc.databaseConnection.list.useQuery({});
  
  // Update connections when API data changes
  useEffect(() => {
    if (connectionsQuery.data) {
      // Transform API data to match DatabaseConnection interface
      const transformedConnections: DatabaseConnection[] = connectionsQuery.data.map((conn: any) => ({
        id: conn.id,
        name: conn.name,
        databaseType: conn.databaseType as DatabaseType,
        host: conn.host || '',
        port: conn.port || 0,
        database: conn.database || '',
        username: conn.username || '',
        description: conn.description || '',
        isDefault: conn.isDefault === 1,
        isActive: conn.isActive === 1,
        isPrimary: conn.isDefault === 1,
        syncEnabled: false,
        healthStatus: conn.healthCheckEnabled ? 'healthy' : 'unknown' as const,
        connectionCount: 0,
        maxConnections: conn.maxConnections || 100,
        lastHealthCheck: conn.lastHealthCheck ? new Date(conn.lastHealthCheck) : undefined,
      }));
      if (transformedConnections.length > 0) {
        setConnections(transformedConnections);
      }
      setIsLoadingConnections(false);
    } else if (connectionsQuery.isError) {
      // Keep mock data on error
      setIsLoadingConnections(false);
    }
  }, [connectionsQuery.data, connectionsQuery.isError]);
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<string>("");
  const [importPreview, setImportPreview] = useState<DatabaseConnection[]>([]);

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

  // Test connection mutation
  const testConnectionMutation = trpc.databaseConnection.test.useMutation({
    onSuccess: (result, variables) => {
      if (result.success) {
        toast.success(`Kết nối thành công! (${result.responseTime}ms)`);
        setConnections(prev => prev.map(c => 
          c.id === variables.id ? { 
            ...c, 
            healthStatus: "healthy" as const, 
            lastHealthCheck: new Date(),
            responseTime: result.responseTime 
          } : c
        ));
      } else {
        toast.error(`Kết nối thất bại: ${result.error}`);
        setConnections(prev => prev.map(c => 
          c.id === variables.id ? { 
            ...c, 
            healthStatus: "error" as const,
            lastError: result.error 
          } : c
        ));
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    }
  });

  // Test connection
  const handleTestConnection = async (connectionId: number) => {
    setIsTesting(true);
    try {
      await testConnectionMutation.mutateAsync({ id: connectionId });
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setConnections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update sortOrder for each item
        return newItems.map((item, index) => ({ ...item, sortOrder: index }));
      });
      toast.success("Đã cập nhật thứ tự kết nối!");
    }
  };

  // Clone connection
  const handleCloneConnection = (conn: DatabaseConnection) => {
    const newConnection: DatabaseConnection = {
      ...conn,
      id: Math.max(...connections.map(c => c.id)) + 1,
      name: `${conn.name} (Copy)`,
      isPrimary: false,
      isDefault: false,
      healthStatus: "unknown",
      connectionCount: 0,
      lastHealthCheck: undefined,
    };
    setConnections([...connections, newConnection]);
    toast.success(`Đã clone kết nối "${conn.name}"!`);
  };

  // Export connections to JSON
  const handleExportConnections = () => {
    const exportData = connections.map(conn => ({
      name: conn.name,
      databaseType: conn.databaseType,
      host: conn.host,
      port: conn.port,
      database: conn.database,
      username: conn.username,
      description: conn.description,
      isActive: conn.isActive,
      isPrimary: conn.isPrimary,
      syncEnabled: conn.syncEnabled,
      maxConnections: conn.maxConnections,
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-connections-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất ${connections.length} kết nối!`);
  };

  // Handle import file change
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setImportData(content);
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          const preview: DatabaseConnection[] = parsed.map((item, index) => ({
            id: Math.max(...connections.map(c => c.id), 0) + index + 1,
            name: item.name || `Connection ${index + 1}`,
            databaseType: item.databaseType || 'postgresql',
            host: item.host || '',
            port: item.port || 5432,
            database: item.database || '',
            username: item.username || '',
            description: item.description || '',
            isDefault: false,
            isActive: item.isActive !== false,
            isPrimary: false,
            syncEnabled: item.syncEnabled || false,
            healthStatus: 'unknown' as const,
            connectionCount: 0,
            maxConnections: item.maxConnections || 100,
          }));
          setImportPreview(preview);
        } else {
          toast.error('File không hợp lệ! Cần là mảng JSON.');
        }
      } catch {
        toast.error('Không thể đọc file JSON!');
      }
    };
    reader.readAsText(file);
  };

  // Confirm import
  const handleConfirmImport = () => {
    if (importPreview.length === 0) {
      toast.error('Không có dữ liệu để import!');
      return;
    }
    setConnections([...connections, ...importPreview]);
    toast.success(`Đã import ${importPreview.length} kết nối!`);
    setIsImportDialogOpen(false);
    setImportData('');
    setImportPreview([]);
  };

  // Get status badge with tooltip
  const getStatusBadge = (conn: DatabaseConnection) => {
    const { healthStatus, responseTime, lastError, lastHealthCheck } = conn;
    const lastCheckStr = lastHealthCheck 
      ? new Date(lastHealthCheck).toLocaleString("vi-VN")
      : "Chưa kiểm tra";
    
    switch (healthStatus) {
      case "healthy":
        return (
          <div className="flex items-center gap-2" title={`Response: ${responseTime || 'N/A'}ms\nKiểm tra lần cuối: ${lastCheckStr}`}>
            <Badge className="bg-green-500 hover:bg-green-600 cursor-help">
              <CheckCircle className="h-3 w-3 mr-1" />
              Healthy
            </Badge>
            {responseTime && (
              <span className="text-xs text-muted-foreground">{responseTime}ms</span>
            )}
          </div>
        );
      case "warning":
        return (
          <div className="flex items-center gap-2" title={`Kiểm tra lần cuối: ${lastCheckStr}`}>
            <Badge className="bg-yellow-500 hover:bg-yellow-600 cursor-help">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Warning
            </Badge>
          </div>
        );
      case "error":
        return (
          <div className="flex items-center gap-2" title={`Lỗi: ${lastError || 'Unknown'}\nKiểm tra lần cuối: ${lastCheckStr}`}>
            <Badge variant="destructive" className="cursor-help">
              <XCircle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2" title="Chưa kiểm tra kết nối">
            <Badge variant="secondary" className="cursor-help">
              <Clock className="h-3 w-3 mr-1" />
              Unknown
            </Badge>
          </div>
        );
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportConnections}>
              <Download className="h-4 w-4 mr-2" />
              Xuất
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Nhập
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm kết nối
            </Button>
          </div>
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
                    {primaryDb && getStatusBadge(primaryDb)}
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
                            {getStatusBadge(db)}
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Tên</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Host</TableHead>
                        <TableHead>Database</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <SortableContext
                      items={connections.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <TableBody>
                        {connections.map((conn) => (
                          <SortableConnectionTableRow
                            key={conn.id}
                            conn={conn}
                            getDatabaseIcon={getDatabaseIcon}
                            getStatusBadge={getStatusBadge}
                            handleTestConnection={handleTestConnection}
                            handleSetPrimary={handleSetPrimary}
                            handleCloneConnection={handleCloneConnection}
                            handleDeleteConnection={handleDeleteConnection}
                            isTesting={isTesting}
                            onEdit={(c) => {
                              setSelectedConnection(c);
                              setFormData({
                                name: c.name,
                                databaseType: c.databaseType,
                                host: c.host,
                                port: c.port.toString(),
                                database: c.database,
                                username: c.username,
                                password: "",
                                description: c.description || "",
                                isActive: c.isActive,
                                isPrimary: c.isPrimary,
                                syncEnabled: c.syncEnabled,
                              });
                              setIsEditDialogOpen(true);
                            }}
                          />
                        ))}
                      </TableBody>
                    </SortableContext>
                  </Table>
                </DndContext>
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
                      {getStatusBadge(conn)}
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

        {/* Import Dialog */}
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Nhập cấu hình Database
              </DialogTitle>
              <DialogDescription>
                Chọn file JSON chứa cấu hình database connections để import
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Chọn file JSON</Label>
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleImportFileChange}
                />
              </div>
              
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <Label>Xem trước ({importPreview.length} kết nối)</Label>
                  <ScrollArea className="h-[200px] border rounded-md p-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Host</TableHead>
                          <TableHead>Database</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importPreview.map((conn) => (
                          <TableRow key={conn.id}>
                            <TableCell className="font-medium">{conn.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{conn.databaseType.toUpperCase()}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{conn.host}:{conn.port}</TableCell>
                            <TableCell className="font-mono text-sm">{conn.database}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
              
              {importData && importPreview.length === 0 && (
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-md text-red-600 dark:text-red-400">
                  File không hợp lệ hoặc không chứa dữ liệu connections.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsImportDialogOpen(false);
                setImportData('');
                setImportPreview([]);
              }}>
                Hủy
              </Button>
              <Button onClick={handleConfirmImport} disabled={importPreview.length === 0}>
                <Upload className="h-4 w-4 mr-2" />
                Import {importPreview.length > 0 ? `(${importPreview.length})` : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
