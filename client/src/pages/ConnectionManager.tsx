import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Columns,
  BarChart3,
} from "lucide-react";

interface ConnectionInfo {
  host: string;
  database: string;
  user: string;
  status: "connected" | "disconnected" | "error";
  version: string;
  uptime: number;
  connectionCount: number;
}

interface TableInfo {
  name: string;
  rowCount: number;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  key: string | null;
  defaultValue: string | null;
}

interface TableData {
  columns: string[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

interface DatabaseStats {
  tableCount: number;
  totalRows: number;
  databaseSize: string;
  indexSize: string;
}

export default function ConnectionManager() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [showTableData, setShowTableData] = useState(false);
  const [showTableSchema, setShowTableSchema] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | undefined>(undefined);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [tableSchema, setTableSchema] = useState<ColumnInfo[] | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);

  // Fetch connection info
  const fetchConnectionInfo = async () => {
    try {
      const response = await fetch('/api/trpc/databaseExplorer.connectionInfo');
      const data = await response.json();
      if (data.result?.data) {
        setConnectionInfo(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching connection info:", error);
    }
  };

  // Fetch tables
  const fetchTables = async () => {
    try {
      const response = await fetch('/api/trpc/databaseExplorer.tables');
      const data = await response.json();
      if (data.result?.data) {
        setTables(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/trpc/databaseExplorer.stats');
      const data = await response.json();
      if (data.result?.data) {
        setStats(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Fetch table data
  const fetchTableData = async (tableName: string, pg: number, ps: number, sc?: string, sd?: "asc" | "desc") => {
    setIsLoadingData(true);
    try {
      const params = { tableName, page: pg, pageSize: ps, sortColumn: sc, sortDirection: sd || "asc" };
      const response = await fetch(`/api/trpc/databaseExplorer.tableData?input=${encodeURIComponent(JSON.stringify(params))}`);
      const data = await response.json();
      if (data.result?.data) {
        setTableData(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
      toast.error("Không thể tải dữ liệu bảng");
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fetch table schema
  const fetchTableSchema = async (tableName: string) => {
    setIsLoadingSchema(true);
    try {
      const params = { tableName };
      const response = await fetch(`/api/trpc/databaseExplorer.tableSchema?input=${encodeURIComponent(JSON.stringify(params))}`);
      const data = await response.json();
      if (data.result?.data) {
        setTableSchema(data.result.data);
      }
    } catch (error) {
      console.error("Error fetching table schema:", error);
      toast.error("Không thể tải cấu trúc bảng");
    } finally {
      setIsLoadingSchema(false);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchConnectionInfo(), fetchTables(), fetchStats()]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Load table data when dialog opens
  useEffect(() => {
    if (showTableData && selectedTable) {
      fetchTableData(selectedTable, page, pageSize, sortColumn, sortDirection);
    }
  }, [showTableData, selectedTable, page, pageSize, sortColumn, sortDirection]);

  // Load table schema when dialog opens
  useEffect(() => {
    if (showTableSchema && selectedTable) {
      fetchTableSchema(selectedTable);
    }
  }, [showTableSchema, selectedTable]);

  // Filter tables by search term
  const filteredTables = tables.filter((table: TableInfo) => 
    table.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleViewData = (tableName: string) => {
    setSelectedTable(tableName);
    setPage(1);
    setSortColumn(undefined);
    setSortDirection("asc");
    setTableData(null);
    setShowTableData(true);
    setShowTableSchema(false);
  };

  const handleViewSchema = (tableName: string) => {
    setSelectedTable(tableName);
    setTableSchema(null);
    setShowTableSchema(true);
    setShowTableData(false);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await Promise.all([fetchConnectionInfo(), fetchTables(), fetchStats()]);
    setIsLoading(false);
    toast.success("Đã làm mới thông tin kết nối");
  };

  const formatCellValue = (value: unknown): string => {
    if (value === null) return "NULL";
    if (value === undefined) return "";
    if (typeof value === "object") {
      if (value instanceof Date) return value.toISOString();
      return JSON.stringify(value);
    }
    return String(value);
  };

  const totalPages = tableData ? Math.ceil(tableData.total / pageSize) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Quản lý Kết nối</h1>
            <p className="text-muted-foreground">
              Xem thông tin kết nối database và dữ liệu các bảng
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Làm mới
          </Button>
        </div>

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
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="flex items-center gap-2">
                  {connectionInfo?.status === "connected" ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-2xl font-bold capitalize">
                    {connectionInfo?.status === "connected" ? "Đã kết nối" : 
                     connectionInfo?.status === "disconnected" ? "Ngắt kết nối" : "Lỗi"}
                  </span>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                {connectionInfo?.host || "N/A"}
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
              <p className="text-2xl font-bold">{connectionInfo?.database || "N/A"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Version: {connectionInfo?.version || "N/A"}
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
                {connectionInfo ? formatUptime(connectionInfo.uptime) : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {connectionInfo?.connectionCount || 0} kết nối hoạt động
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
              <p className="text-2xl font-bold">{stats?.databaseSize || "N/A"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Index: {stats?.indexSize || "N/A"}
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
                  <p className="text-2xl font-bold">{stats?.tableCount || 0}</p>
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
                  <p className="text-2xl font-bold">{stats?.totalRows?.toLocaleString() || 0}</p>
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
                  <p className="text-2xl font-bold">{connectionInfo?.user || "N/A"}</p>
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
                  Danh sách Bảng
                </CardTitle>
                <CardDescription>
                  Xem cấu trúc và dữ liệu của các bảng trong database
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm bảng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
                  {filteredTables.map((table: TableInfo) => (
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
                            onClick={() => handleViewSchema(table.name)}
                          >
                            <Columns className="w-4 h-4 mr-1" />
                            Cấu trúc
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewData(table.name)}
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

        {/* Table Schema Dialog */}
        <Dialog open={showTableSchema} onOpenChange={setShowTableSchema}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Columns className="w-5 h-5" />
                Cấu trúc bảng: {selectedTable}
              </DialogTitle>
              <DialogDescription>
                Danh sách các cột và kiểu dữ liệu của bảng
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              {isLoadingSchema ? (
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
                    {tableSchema?.map((col: ColumnInfo) => (
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
                          {col.key && <Badge>{col.key}</Badge>}
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

        {/* Table Data Dialog */}
        <Dialog open={showTableData} onOpenChange={setShowTableData}>
          <DialogContent className="max-w-[90vw] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Dữ liệu bảng: {selectedTable}
              </DialogTitle>
              <DialogDescription>
                {tableData && `Hiển thị ${tableData.rows.length} / ${tableData.total.toLocaleString()} bản ghi`}
              </DialogDescription>
            </DialogHeader>
            
            {/* Controls */}
            <div className="flex items-center gap-4 py-2">
              <div className="flex items-center gap-2">
                <Label>Số bản ghi:</Label>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
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
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Trước
                </Button>
                <span className="text-sm">
                  Trang {page} / {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Sau
                </Button>
              </div>
            </div>
            
            <div className="max-h-[60vh] overflow-auto border rounded-lg">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tableData?.columns.map((col: string) => (
                        <TableHead 
                          key={col} 
                          className="cursor-pointer hover:bg-muted/50 whitespace-nowrap"
                          onClick={() => handleSort(col)}
                        >
                          <div className="flex items-center gap-1">
                            {col}
                            {sortColumn === col && (
                              sortDirection === "asc" ? 
                                <ChevronUp className="w-4 h-4" /> : 
                                <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData?.rows.map((row: Record<string, unknown>, idx: number) => (
                      <TableRow key={idx}>
                        {tableData.columns.map((col: string) => (
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
