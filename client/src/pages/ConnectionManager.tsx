import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
  Database,
  RefreshCw,
  Table2,
  Server,
  HardDrive,
  Clock,
  Users,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Columns,
  BarChart3,
  Plus,
  Trash2,
  Settings,
  FileSpreadsheet,
  Link,
  Unlink,
  AlertCircle,
} from "lucide-react";

// Types
interface ExternalConnection {
  id: number;
  name: string;
  databaseType: string;
  host: string | null;
  port: number | null;
  database: string | null;
  username: string | null;
  filePath: string | null;
  description: string | null;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  createdAt: string;
}

interface DatabaseType {
  value: string;
  label: string;
  icon: string;
  defaultPort: number;
}

interface TableInfo {
  name: string;
  schema?: string;
  type: string;
  rowCount?: number;
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
}

interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

interface InternalConnectionInfo {
  host: string;
  database: string;
  user: string;
  status: "connected" | "disconnected" | "error";
  version: string;
  uptime: number;
  connectionCount: number;
}

interface InternalTableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
}

interface DatabaseStats {
  tableCount: number;
  totalRows: number;
  databaseSize: string;
  indexSize: string;
}

// Database type icons
const getDatabaseIcon = (type: string) => {
  switch (type) {
    case "mysql":
    case "postgres":
    case "sqlserver":
    case "oracle":
      return <Server className="h-4 w-4" />;
    case "access":
      return <HardDrive className="h-4 w-4" />;
    case "excel":
      return <FileSpreadsheet className="h-4 w-4" />;
    default:
      return <Database className="h-4 w-4" />;
  }
};

export default function ConnectionManager() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"external" | "internal">("external");
  
  // External connections state
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
  const [databaseTypes, setDatabaseTypes] = useState<DatabaseType[]>([
    { value: "mysql", label: "MySQL / MariaDB", icon: "database", defaultPort: 3306 },
    { value: "postgres", label: "PostgreSQL", icon: "database", defaultPort: 5432 },
    { value: "sqlserver", label: "SQL Server", icon: "database", defaultPort: 1433 },
    { value: "oracle", label: "Oracle", icon: "database", defaultPort: 1521 },
    { value: "access", label: "Microsoft Access", icon: "file", defaultPort: 0 },
    { value: "excel", label: "Excel (.xlsx/.xls)", icon: "file", defaultPort: 0 },
  ]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<ExternalConnection | null>(null);
  
  // External tables state
  const [externalTables, setExternalTables] = useState<TableInfo[]>([]);
  const [loadingExternalTables, setLoadingExternalTables] = useState(false);
  const [selectedExternalTable, setSelectedExternalTable] = useState<string | null>(null);
  
  // External table data state
  const [externalTableData, setExternalTableData] = useState<TableData | null>(null);
  const [externalTableColumns, setExternalTableColumns] = useState<ColumnInfo[]>([]);
  const [loadingExternalData, setLoadingExternalData] = useState(false);
  const [externalPage, setExternalPage] = useState(1);
  const [externalPageSize, setExternalPageSize] = useState(50);
  const [externalSortColumn, setExternalSortColumn] = useState<string | null>(null);
  const [externalSortDirection, setExternalSortDirection] = useState<"asc" | "desc">("asc");
  
  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    databaseType: "mysql",
    host: "",
    port: 3306,
    database: "",
    username: "",
    password: "",
    filePath: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  
  // Internal database state
  const [internalConnectionInfo, setInternalConnectionInfo] = useState<InternalConnectionInfo | null>(null);
  const [internalTables, setInternalTables] = useState<InternalTableInfo[]>([]);
  const [internalStats, setInternalStats] = useState<DatabaseStats | null>(null);
  const [loadingInternal, setLoadingInternal] = useState(true);
  const [internalSearchTerm, setInternalSearchTerm] = useState("");
  const [selectedInternalTable, setSelectedInternalTable] = useState<string | null>(null);
  const [internalTableData, setInternalTableData] = useState<TableData | null>(null);
  const [internalTableSchema, setInternalTableSchema] = useState<ColumnInfo[] | null>(null);
  const [loadingInternalData, setLoadingInternalData] = useState(false);
  const [loadingInternalSchema, setLoadingInternalSchema] = useState(false);
  const [showInternalDataDialog, setShowInternalDataDialog] = useState(false);
  const [showInternalSchemaDialog, setShowInternalSchemaDialog] = useState(false);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(50);
  const [internalSortColumn, setInternalSortColumn] = useState<string | undefined>(undefined);
  const [internalSortDirection, setInternalSortDirection] = useState<"asc" | "desc">("asc");

  // ============ EXTERNAL DATABASE FUNCTIONS ============
  
  // Fetch external connections
  const fetchConnections = useCallback(async () => {
    try {
      const response = await fetch("/api/trpc/databaseConnection.list?input=" + encodeURIComponent(JSON.stringify({ json: {} })), {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (result.result?.data?.json) {
        setConnections(result.result.data.json);
      } else if (result.result?.data) {
        setConnections(Array.isArray(result.result.data) ? result.result.data : []);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
      toast.error("Không thể tải danh sách kết nối");
    } finally {
      setLoadingConnections(false);
    }
  }, []);
  
  // Fetch database types
  const fetchDatabaseTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/trpc/databaseConnection.getSupportedTypes?input=" + encodeURIComponent(JSON.stringify({ json: {} })), {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (result.result?.data?.json) {
        setDatabaseTypes(result.result.data.json);
      } else if (result.result?.data) {
        setDatabaseTypes(result.result.data);
      }
    } catch (error) {
      console.error("Failed to fetch database types:", error);
    }
  }, []);
  
  // Fetch tables for selected connection
  const fetchExternalTables = useCallback(async (connectionId: number) => {
    setLoadingExternalTables(true);
    setExternalTables([]);
    setSelectedExternalTable(null);
    setExternalTableData(null);
    
    try {
      const response = await fetch(`/api/trpc/databaseConnection.getTables?input=${encodeURIComponent(JSON.stringify({ connectionId }))}`, {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (result.result?.data?.tableInfo) {
        setExternalTables(result.result.data.tableInfo);
      } else if (result.result?.data?.tables) {
        setExternalTables(result.result.data.tables.map((name: string) => ({ name, type: "table" })));
      }
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      toast.error("Không thể tải danh sách bảng");
    } finally {
      setLoadingExternalTables(false);
    }
  }, []);
  
  // Fetch external table schema
  const fetchExternalTableSchema = useCallback(async (connectionId: number, tableName: string) => {
    try {
      const response = await fetch(`/api/trpc/databaseConnection.getColumns?input=${encodeURIComponent(JSON.stringify({ connectionId, tableName }))}`, {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (result.result?.data?.columns) {
        setExternalTableColumns(result.result.data.columns);
      }
    } catch (error) {
      console.error("Failed to fetch table schema:", error);
    }
  }, []);
  
  // Fetch external table data
  const fetchExternalTableData = useCallback(async (connectionId: number, tableName: string, p: number = 1, ps: number = 50, sc?: string | null, sd?: "asc" | "desc") => {
    setLoadingExternalData(true);
    
    try {
      const input = {
        connectionId,
        tableName,
        page: p,
        pageSize: ps,
        ...(sc && { sortColumn: sc }),
        sortDirection: sd || "asc",
      };
      
      const response = await fetch(`/api/trpc/databaseConnection.previewData?input=${encodeURIComponent(JSON.stringify(input))}`, {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (result.result?.data) {
        setExternalTableData(result.result.data);
      }
    } catch (error) {
      console.error("Failed to fetch table data:", error);
      toast.error("Không thể tải dữ liệu bảng");
    } finally {
      setLoadingExternalData(false);
    }
  }, []);
  
  // Test external connection
  const testConnection = async (connectionId: number) => {
    setTestingConnection(connectionId);
    
    try {
      const response = await fetch("/api/trpc/databaseConnection.testConnectionById", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ connectionId }),
      });
      const result = await response.json();
      
      if (result.result?.data?.success) {
        toast.success(`Kết nối thành công! ${result.result.data.message || ""}`);
        fetchConnections();
      } else {
        toast.error(`Kết nối thất bại: ${result.result?.data?.message || "Unknown error"}`);
      }
    } catch (error) {
      toast.error("Không thể test kết nối");
    } finally {
      setTestingConnection(null);
    }
  };
  
  // Create external connection
  const createConnection = async () => {
    setSaving(true);
    
    try {
      const response = await fetch("/api/trpc/databaseConnection.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      
      if (result.result?.data?.id) {
        toast.success("Tạo kết nối thành công");
        setShowAddDialog(false);
        resetForm();
        fetchConnections();
      } else {
        toast.error("Không thể tạo kết nối");
      }
    } catch (error) {
      toast.error("Lỗi khi tạo kết nối");
    } finally {
      setSaving(false);
    }
  };
  
  // Delete external connection
  const deleteConnection = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa kết nối này?")) return;
    
    try {
      const response = await fetch("/api/trpc/databaseConnection.delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      const result = await response.json();
      
      if (result.result?.data?.success) {
        toast.success("Đã xóa kết nối");
        if (selectedConnection?.id === id) {
          setSelectedConnection(null);
          setExternalTables([]);
          setSelectedExternalTable(null);
          setExternalTableData(null);
        }
        fetchConnections();
      }
    } catch (error) {
      toast.error("Không thể xóa kết nối");
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      databaseType: "mysql",
      host: "",
      port: 3306,
      database: "",
      username: "",
      password: "",
      filePath: "",
      description: "",
    });
  };
  
  // Handle external connection select
  const handleSelectConnection = (conn: ExternalConnection) => {
    setSelectedConnection(conn);
    fetchExternalTables(conn.id);
  };
  
  // Handle external table select
  const handleSelectExternalTable = (tableName: string) => {
    if (!selectedConnection) return;
    setSelectedExternalTable(tableName);
    setExternalPage(1);
    setExternalSortColumn(null);
    setExternalSortDirection("asc");
    fetchExternalTableSchema(selectedConnection.id, tableName);
    fetchExternalTableData(selectedConnection.id, tableName, 1, externalPageSize);
  };
  
  // Handle external sort
  const handleExternalSort = (column: string) => {
    if (!selectedConnection || !selectedExternalTable) return;
    
    const newDirection = externalSortColumn === column && externalSortDirection === "asc" ? "desc" : "asc";
    setExternalSortColumn(column);
    setExternalSortDirection(newDirection);
    fetchExternalTableData(selectedConnection.id, selectedExternalTable, externalPage, externalPageSize, column, newDirection);
  };
  
  // Handle external page change
  const handleExternalPageChange = (newPage: number) => {
    if (!selectedConnection || !selectedExternalTable) return;
    setExternalPage(newPage);
    fetchExternalTableData(selectedConnection.id, selectedExternalTable, newPage, externalPageSize, externalSortColumn, externalSortDirection);
  };
  
  // Handle external page size change
  const handleExternalPageSizeChange = (newSize: string) => {
    if (!selectedConnection || !selectedExternalTable) return;
    const size = parseInt(newSize);
    setExternalPageSize(size);
    setExternalPage(1);
    fetchExternalTableData(selectedConnection.id, selectedExternalTable, 1, size, externalSortColumn, externalSortDirection);
  };
  
  // ============ INTERNAL DATABASE FUNCTIONS ============
  
  // Fetch internal connection info
  const fetchInternalConnectionInfo = async () => {
    try {
      const response = await fetch('/api/trpc/databaseExplorer.connectionInfo');
      const data = await response.json();
      if (data.result?.data) {
        setInternalConnectionInfo(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching connection info:", error);
    }
  };

  // Fetch internal tables
  const fetchInternalTables = async () => {
    try {
      const response = await fetch('/api/trpc/databaseExplorer.tables');
      const data = await response.json();
      if (data.result?.data) {
        setInternalTables(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  };

  // Fetch internal stats
  const fetchInternalStats = async () => {
    try {
      const response = await fetch('/api/trpc/databaseExplorer.stats');
      const data = await response.json();
      if (data.result?.data) {
        setInternalStats(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fetch internal table data
  const fetchInternalTableData = async (tableName: string, pg: number, ps: number, sc?: string, sd?: "asc" | "desc") => {
    setLoadingInternalData(true);
    try {
      const params = { tableName, page: pg, pageSize: ps, sortColumn: sc, sortDirection: sd || "asc" };
      const response = await fetch(`/api/trpc/databaseExplorer.tableData?input=${encodeURIComponent(JSON.stringify(params))}`);
      const data = await response.json();
      if (data.result?.data) {
        setInternalTableData(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
      toast.error("Không thể tải dữ liệu bảng");
    } finally {
      setLoadingInternalData(false);
    }
  };

  // Fetch internal table schema
  const fetchInternalTableSchema = async (tableName: string) => {
    setLoadingInternalSchema(true);
    try {
      const params = { tableName };
      const response = await fetch(`/api/trpc/databaseExplorer.tableSchema?input=${encodeURIComponent(JSON.stringify(params))}`);
      const data = await response.json();
      if (data.result?.data) {
        setInternalTableSchema(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching table schema:", error);
      toast.error("Không thể tải cấu trúc bảng");
    } finally {
      setLoadingInternalSchema(false);
    }
  };

  // Load internal data
  const loadInternalData = async () => {
    setLoadingInternal(true);
    await Promise.all([fetchInternalConnectionInfo(), fetchInternalTables(), fetchInternalStats()]);
    setLoadingInternal(false);
  };

  // Handle internal table data view
  const handleViewInternalData = (tableName: string) => {
    setSelectedInternalTable(tableName);
    setInternalPage(1);
    setInternalSortColumn(undefined);
    setInternalSortDirection("asc");
    setInternalTableData(null);
    setShowInternalDataDialog(true);
    setShowInternalSchemaDialog(false);
  };

  // Handle internal table schema view
  const handleViewInternalSchema = (tableName: string) => {
    setSelectedInternalTable(tableName);
    setInternalTableSchema(null);
    setShowInternalSchemaDialog(true);
    setShowInternalDataDialog(false);
  };

  // Handle internal sort
  const handleInternalSort = (column: string) => {
    if (internalSortColumn === column) {
      setInternalSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setInternalSortColumn(column);
      setInternalSortDirection("asc");
    }
  };

  // Format cell value
  const formatCellValue = (value: unknown): string => {
    if (value === null) return "NULL";
    if (value === undefined) return "";
    if (typeof value === "object") {
      if (value instanceof Date) return value.toISOString();
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Filter internal tables
  const filteredInternalTables = internalTables.filter((table) => 
    table.name.toLowerCase().includes(internalSearchTerm.toLowerCase())
  );

  // Update port when database type changes
  useEffect(() => {
    const dbType = databaseTypes.find(t => t.value === formData.databaseType);
    if (dbType && dbType.defaultPort > 0) {
      setFormData(prev => ({ ...prev, port: dbType.defaultPort }));
    }
  }, [formData.databaseType, databaseTypes]);
  
  // Initial load
  useEffect(() => {
    fetchConnections();
    fetchDatabaseTypes();
    loadInternalData();
  }, [fetchConnections, fetchDatabaseTypes]);

  // Load internal table data when dialog opens
  useEffect(() => {
    if (showInternalDataDialog && selectedInternalTable) {
      fetchInternalTableData(selectedInternalTable, internalPage, internalPageSize, internalSortColumn, internalSortDirection);
    }
  }, [showInternalDataDialog, selectedInternalTable, internalPage, internalPageSize, internalSortColumn, internalSortDirection]);

  // Load internal table schema when dialog opens
  useEffect(() => {
    if (showInternalSchemaDialog && selectedInternalTable) {
      fetchInternalTableSchema(selectedInternalTable);
    }
  }, [showInternalSchemaDialog, selectedInternalTable]);
  
  // Check if file-based database
  const isFileBased = formData.databaseType === "access" || formData.databaseType === "excel";

  const internalTotalPages = internalTableData ? Math.ceil(internalTableData.total / internalPageSize) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Kết nối Database</h1>
            <p className="text-muted-foreground">
              Quản lý kết nối đến database bên ngoài và xem dữ liệu hệ thống
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "external" | "internal")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="external" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Kết nối Bên ngoài
            </TabsTrigger>
            <TabsTrigger value="internal" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Hệ thống
            </TabsTrigger>
          </TabsList>

          {/* External Connections Tab */}
          <TabsContent value="external" className="space-y-6">
            {/* Add Connection Button */}
            <div className="flex justify-end">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Thêm Kết nối
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Thêm Kết nối Mới</DialogTitle>
                    <DialogDescription>
                      Cấu hình kết nối đến database bên ngoài để lấy dữ liệu mapping
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Tên kết nối *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="VD: Production Database"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Loại Database *</Label>
                      <Select
                        value={formData.databaseType}
                        onValueChange={(value) => setFormData({ ...formData, databaseType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(databaseTypes || []).map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                {getDatabaseIcon(type.value)}
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {isFileBased ? (
                      <div className="space-y-2">
                        <Label>Đường dẫn file *</Label>
                        <Input
                          value={formData.filePath}
                          onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                          placeholder="VD: C:\\Data\\file.xlsx hoặc /path/to/file.xlsx"
                        />
                        <p className="text-xs text-muted-foreground">
                          Đường dẫn đầy đủ đến file Excel hoặc Access trên máy chủ
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Host *</Label>
                            <Input
                              value={formData.host}
                              onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                              placeholder="localhost hoặc IP"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Port</Label>
                            <Input
                              type="number"
                              value={formData.port}
                              onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Database *</Label>
                          <Input
                            value={formData.database}
                            onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                            placeholder="Tên database"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Username</Label>
                            <Input
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              placeholder="username"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                              type="password"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="space-y-2">
                      <Label>Mô tả</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Mô tả kết nối (tùy chọn)"
                        rows={2}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Hủy
                    </Button>
                    <Button onClick={createConnection} disabled={saving || !formData.name}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Tạo Kết nối
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* External Database Layout */}
            <div className="grid grid-cols-12 gap-6">
              {/* Connections list */}
              <div className="col-span-3">
                <Card className="h-[calc(100vh-320px)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Danh sách Kết nối
                    </CardTitle>
                    <CardDescription>
                      {connections.length} kết nối
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="overflow-auto h-[calc(100%-100px)]">
                    {loadingConnections ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-20 w-full" />
                        ))}
                      </div>
                    ) : connections.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Unlink className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Chưa có kết nối nào</p>
                        <p className="text-sm mt-1">Nhấn "Thêm Kết nối" để bắt đầu</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {connections.map((conn) => (
                          <div
                            key={conn.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedConnection?.id === conn.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => handleSelectConnection(conn)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getDatabaseIcon(conn.databaseType)}
                                <span className="font-medium truncate">{conn.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {conn.lastTestStatus === "success" ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : conn.lastTestStatus === "failed" ? (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {conn.host ? `${conn.host}:${conn.port}` : conn.filePath || conn.databaseType}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  testConnection(conn.id);
                                }}
                                disabled={testingConnection === conn.id}
                              >
                                {testingConnection === conn.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                                <span className="ml-1">Test</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConnection(conn.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Tables list */}
              <div className="col-span-3">
                <Card className="h-[calc(100vh-320px)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Table2 className="h-5 w-5" />
                      Danh sách Bảng
                    </CardTitle>
                    {selectedConnection && (
                      <CardDescription>
                        {selectedConnection.name}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="overflow-auto h-[calc(100%-100px)]">
                    {!selectedConnection ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Table2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Chọn một kết nối</p>
                        <p className="text-sm mt-1">để xem danh sách bảng</p>
                      </div>
                    ) : loadingExternalTables ? (
                      <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-10 w-full" />
                        ))}
                      </div>
                    ) : externalTables.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Table2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Không tìm thấy bảng</p>
                        <p className="text-sm mt-1">Kiểm tra lại kết nối</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {externalTables.map((table) => (
                          <div
                            key={table.name}
                            className={`p-2 rounded-md cursor-pointer transition-colors flex items-center justify-between ${
                              selectedExternalTable === table.name
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                            onClick={() => handleSelectExternalTable(table.name)}
                          >
                            <div className="flex items-center gap-2">
                              <Table2 className="h-4 w-4" />
                              <span className="text-sm truncate">{table.name}</span>
                            </div>
                            {table.rowCount !== undefined && (
                              <Badge variant="secondary" className="text-xs">
                                {table.rowCount.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Table data */}
              <div className="col-span-6">
                <Card className="h-[calc(100vh-320px)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Eye className="h-5 w-5" />
                          Dữ liệu Bảng
                        </CardTitle>
                        {selectedExternalTable && (
                          <CardDescription>
                            {selectedExternalTable} {externalTableData && `(${externalTableData.total.toLocaleString()} bản ghi)`}
                          </CardDescription>
                        )}
                      </div>
                      {selectedExternalTable && (
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Số bản ghi:</Label>
                          <Select value={externalPageSize.toString()} onValueChange={handleExternalPageSizeChange}>
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                              <SelectItem value="200">200</SelectItem>
                              <SelectItem value="500">500</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="overflow-auto h-[calc(100%-180px)]">
                    {!selectedExternalTable ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <Eye className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Chọn một bảng để xem dữ liệu</p>
                        <p className="text-sm mt-2">
                          1. Chọn kết nối từ danh sách bên trái<br />
                          2. Chọn bảng từ danh sách ở giữa<br />
                          3. Xem và sắp xếp dữ liệu tại đây
                        </p>
                      </div>
                    ) : loadingExternalData ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : !externalTableData || externalTableData.rows.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <Table2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>Bảng không có dữ liệu</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {externalTableData.columns.map((col) => (
                                <TableHead
                                  key={col}
                                  className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                                  onClick={() => handleExternalSort(col)}
                                >
                                  <div className="flex items-center gap-1">
                                    {col}
                                    {externalSortColumn === col && (
                                      externalSortDirection === "asc" ?
                                        <ChevronUp className="h-3 w-3" /> :
                                        <ChevronDown className="h-3 w-3" />
                                    )}
                                  </div>
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {externalTableData.rows.map((row, idx) => (
                              <TableRow key={idx}>
                                {externalTableData.columns.map((col) => (
                                  <TableCell key={col} className="max-w-[200px] truncate">
                                    {row[col] === null ? (
                                      <span className="text-muted-foreground italic">NULL</span>
                                    ) : typeof row[col] === "object" ? (
                                      JSON.stringify(row[col])
                                    ) : (
                                      String(row[col])
                                    )}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                  
                  {/* Pagination */}
                  {externalTableData && externalTableData.total > externalPageSize && (
                    <div className="px-6 py-3 border-t flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Trang {externalPage} / {Math.ceil(externalTableData.total / externalPageSize)} ({externalTableData.total} bản ghi)
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExternalPageChange(externalPage - 1)}
                          disabled={externalPage <= 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExternalPageChange(externalPage + 1)}
                          disabled={externalPage >= Math.ceil(externalTableData.total / externalPageSize)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Internal Database Tab */}
          <TabsContent value="internal" className="space-y-6">
            {/* Connection Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Trạng thái
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingInternal ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      {internalConnectionInfo?.status === "connected" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="text-2xl font-bold capitalize">
                        {internalConnectionInfo?.status === "connected" ? "Đã kết nối" : 
                         internalConnectionInfo?.status === "disconnected" ? "Ngắt kết nối" : "Lỗi"}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">
                    {internalConnectionInfo?.host || "N/A"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{internalConnectionInfo?.database || "N/A"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Version: {internalConnectionInfo?.version || "N/A"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Uptime
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {internalConnectionInfo ? formatUptime(internalConnectionInfo.uptime) : "N/A"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {internalConnectionInfo?.connectionCount || 0} kết nối hoạt động
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Dung lượng
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{internalStats?.databaseSize || "N/A"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Index: {internalStats?.indexSize || "N/A"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <Table2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng số bảng</p>
                      <p className="text-2xl font-bold">{internalStats?.tableCount || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng số bản ghi</p>
                      <p className="text-2xl font-bold">{internalStats?.totalRows?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">User</p>
                      <p className="text-2xl font-bold">{internalConnectionInfo?.user || "N/A"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tables List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Table2 className="w-5 h-5" />
                      Danh sách Bảng Hệ thống
                    </CardTitle>
                    <CardDescription>
                      Xem cấu trúc và dữ liệu của các bảng trong database hệ thống
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm bảng..."
                        value={internalSearchTerm}
                        onChange={(e) => setInternalSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Button onClick={loadInternalData} variant="outline" disabled={loadingInternal}>
                      {loadingInternal ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingInternal ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên bảng</TableHead>
                        <TableHead className="text-right">Số bản ghi</TableHead>
                        <TableHead className="text-right">Số cột</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInternalTables.map((table) => (
                        <TableRow key={table.name}>
                          <TableCell className="font-medium">{table.name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{table.rowCount.toLocaleString()}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{table.columns.length}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInternalSchema(table.name)}
                              >
                                <Columns className="w-4 h-4 mr-1" />
                                Cấu trúc
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInternalData(table.name)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Xem dữ liệu
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
          </TabsContent>
        </Tabs>

        {/* Internal Table Schema Dialog */}
        <Dialog open={showInternalSchemaDialog} onOpenChange={setShowInternalSchemaDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Columns className="w-5 h-5" />
                Cấu trúc bảng: {selectedInternalTable}
              </DialogTitle>
              <DialogDescription>
                Danh sách các cột và kiểu dữ liệu của bảng
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              {loadingInternalSchema ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên cột</TableHead>
                      <TableHead>Kiểu dữ liệu</TableHead>
                      <TableHead>Nullable</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Giá trị mặc định</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internalTableSchema?.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-medium">{col.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{col.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {col.nullable ? (
                            <Badge variant="secondary">Yes</Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {col.isPrimaryKey && <Badge>PRI</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {col.defaultValue || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Internal Table Data Dialog */}
        <Dialog open={showInternalDataDialog} onOpenChange={setShowInternalDataDialog}>
          <DialogContent className="max-w-[90vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Dữ liệu bảng: {selectedInternalTable}
              </DialogTitle>
              <DialogDescription>
                {internalTableData && `Hiển thị ${internalTableData.rows.length} / ${internalTableData.total.toLocaleString()} bản ghi`}
              </DialogDescription>
            </DialogHeader>
            
            {/* Controls */}
            <div className="flex items-center gap-4 py-2">
              <div className="flex items-center gap-2">
                <Label>Số bản ghi:</Label>
                <Select value={String(internalPageSize)} onValueChange={(v) => { setInternalPageSize(Number(v)); setInternalPage(1); }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={internalPage <= 1}
                  onClick={() => setInternalPage(p => p - 1)}
                >
                  Trước
                </Button>
                <span className="text-sm">
                  Trang {internalPage} / {internalTotalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={internalPage >= internalTotalPages}
                  onClick={() => setInternalPage(p => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
            
            <div className="max-h-[60vh] overflow-auto border rounded-lg">
              {loadingInternalData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {internalTableData?.columns.map((col: string) => (
                        <TableHead 
                          key={col} 
                          className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                          onClick={() => handleInternalSort(col)}
                        >
                          <div className="flex items-center gap-1">
                            {col}
                            {internalSortColumn === col && (
                              internalSortDirection === "asc" ? 
                                <ChevronUp className="w-4 h-4" /> : 
                                <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internalTableData?.rows.map((row: Record<string, unknown>, idx: number) => (
                      <TableRow key={idx}>
                        {internalTableData.columns.map((col: string) => (
                          <TableCell key={col} className="max-w-xs truncate" title={formatCellValue(row[col])}>
                            {formatCellValue(row[col])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
