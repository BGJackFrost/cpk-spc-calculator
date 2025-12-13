import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  FileSpreadsheet,
  Link,
  Unlink,
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

export default function DatabaseExplorer() {
  // External connections state
  const [connections, setConnections] = useState<ExternalConnection[]>([]);
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
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [showSchemaDialog, setShowSchemaDialog] = useState(false);
  const [showDataDialog, setShowDataDialog] = useState(false);
  
  // Error state
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Fetch connections
  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      setLoadingConnections(true);
      setConnectionError(null);
      const response = await fetch("/api/trpc/databaseConnection.list", {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (result.result?.data?.json && Array.isArray(result.result.data.json)) {
        setConnections(result.result.data.json);
      } else {
        setConnections([]);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
      setConnectionError("Không thể tải danh sách kết nối. Vui lòng thử lại.");
      setConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Test connection
  const testConnection = async (connectionId: number) => {
    try {
      setTestingConnection(connectionId);
      const response = await fetch("/api/trpc/databaseConnection.testConnectionById", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: connectionId }),
      });
      const result = await response.json();
      if (result.result?.data?.success) {
        toast.success("Kết nối thành công!");
        fetchConnections();
      } else {
        toast.error(result.result?.data?.message || "Kết nối thất bại");
      }
    } catch (error) {
      toast.error("Lỗi khi test kết nối");
    } finally {
      setTestingConnection(null);
    }
  };

  // Select connection and load tables
  const selectConnection = async (connection: ExternalConnection) => {
    setSelectedConnection(connection);
    setSelectedExternalTable(null);
    setExternalTableData(null);
    setExternalTableColumns([]);
    
    try {
      setLoadingExternalTables(true);
      const response = await fetch(`/api/trpc/databaseConnection.getTables?input=${encodeURIComponent(JSON.stringify({ json: { connectionId: connection.id } }))}`, {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      // tRPC returns data in result.result.data.json format
      const data = result.result?.data?.json || result.result?.data;
      if (data) {
        // Extract tables array from the response
        const tables = data.tableInfo || data.tables || [];
        setExternalTables(tables);
      }
    } catch (error) {
      console.error("Error loading tables:", error);
      toast.error("Lỗi khi tải danh sách bảng");
    } finally {
      setLoadingExternalTables(false);
    }
  };

  // Load table schema
  const loadTableSchema = async (tableName: string) => {
    if (!selectedConnection) return;
    
    try {
      const response = await fetch(`/api/trpc/databaseConnection.getColumns?input=${encodeURIComponent(JSON.stringify({ json: { connectionId: selectedConnection.id, tableName } }))}`, {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      if (result.result?.data) {
        setExternalTableColumns(result.result.data);
        setShowSchemaDialog(true);
      }
    } catch (error) {
      toast.error("Lỗi khi tải cấu trúc bảng");
    }
  };

  // Load table data
  const loadTableData = async (tableName: string, page = 1, pageSize = 50, sortColumn?: string, sortDir?: "asc" | "desc") => {
    if (!selectedConnection) return;
    
    setSelectedExternalTable(tableName);
    setExternalPage(page);
    setExternalPageSize(pageSize);
    
    try {
      setLoadingExternalData(true);
      const queryParams = {
          json: {
            connectionId: selectedConnection.id,
            tableName,
            page,
            pageSize,
            sortColumn: sortColumn || undefined,
            sortDirection: sortDir || "asc",
          }
        };
      const response = await fetch(`/api/trpc/databaseConnection.previewData?input=${encodeURIComponent(JSON.stringify(queryParams))}`, {
        method: "GET",
        credentials: "include",
      });
      const result = await response.json();
      // tRPC returns data in result.result.data.json format
      const data = result.result?.data?.json || result.result?.data;
      if (data) {
        setExternalTableData({
          columns: data.columns || [],
          rows: data.rows || [],
          total: data.total || 0,
          page,
          pageSize,
        });
        setShowDataDialog(true);
      }
    } catch (error) {
      console.error("Error loading table data:", error);
      toast.error("Lỗi khi tải dữ liệu bảng");
    } finally {
      setLoadingExternalData(false);
    }
  };

  // Handle sort
  const handleSort = (column: string) => {
    const newDirection = externalSortColumn === column && externalSortDirection === "asc" ? "desc" : "asc";
    setExternalSortColumn(column);
    setExternalSortDirection(newDirection);
    if (selectedExternalTable) {
      loadTableData(selectedExternalTable, externalPage, externalPageSize, column, newDirection);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Chọn Kết nối Database
            </CardTitle>
            <CardDescription>
              Chọn một kết nối để xem danh sách bảng và dữ liệu
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConnections}
            disabled={loadingConnections}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingConnections ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </CardHeader>
        <CardContent>
          {loadingConnections ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : connectionError ? (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-destructive font-medium mb-4">{connectionError}</p>
              <Button variant="outline" onClick={fetchConnections}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Thử lại
              </Button>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chưa có kết nối nào. Vui lòng thêm kết nối trong phần "Kết nối & Dữ liệu" ở trên.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(connections || []).map((conn) => (
                <Card
                  key={conn.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedConnection?.id === conn.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => selectConnection(conn)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getDatabaseIcon(conn.databaseType)}
                        <span className="font-medium">{conn.name}</span>
                      </div>
                      <Badge variant={conn.lastTestStatus === "success" ? "default" : "secondary"}>
                        {conn.lastTestStatus === "success" ? (
                          <><CheckCircle className="h-3 w-3 mr-1" /> OK</>
                        ) : (
                          <><XCircle className="h-3 w-3 mr-1" /> N/A</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {conn.databaseType.toUpperCase()} • {conn.host || conn.filePath || "N/A"}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          testConnection(conn.id);
                        }}
                        disabled={testingConnection === conn.id}
                        title="Test kết nối"
                      >
                        {testingConnection === conn.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Link className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedConnection?.id === conn.id ? "default" : "secondary"}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectConnection(conn);
                        }}
                        disabled={loadingExternalTables && selectedConnection?.id === conn.id}
                        title="Load danh sách bảng"
                      >
                        {loadingExternalTables && selectedConnection?.id === conn.id ? (
                          <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Đang tải...</>
                        ) : (
                          <><Table2 className="h-3 w-3 mr-1" /> Load</>  
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables List */}
      {selectedConnection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Table2 className="h-5 w-5" />
              Danh sách Bảng - {selectedConnection.name}
            </CardTitle>
            <CardDescription>
              Chọn bảng để xem cấu trúc hoặc dữ liệu
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingExternalTables ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : externalTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Unlink className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Không tìm thấy bảng nào hoặc không thể kết nối.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên bảng</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Số bản ghi</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {externalTables.map((table) => (
                      <TableRow key={table.name}>
                        <TableCell className="font-medium">{table.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{table.type}</Badge>
                        </TableCell>
                        <TableCell>{table.rowCount?.toLocaleString() || "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadTableSchema(table.name)}
                            >
                              <Columns className="h-3 w-3 mr-1" />
                              Cấu trúc
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => loadTableData(table.name)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Xem dữ liệu
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schema Dialog */}
      <Dialog open={showSchemaDialog} onOpenChange={setShowSchemaDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Cấu trúc bảng: {selectedExternalTable}</DialogTitle>
            <DialogDescription>
              Danh sách các cột và kiểu dữ liệu
            </DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên cột</TableHead>
                <TableHead>Kiểu dữ liệu</TableHead>
                <TableHead>Nullable</TableHead>
                <TableHead>Primary Key</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {externalTableColumns.map((col) => (
                <TableRow key={col.name}>
                  <TableCell className="font-medium">{col.name}</TableCell>
                  <TableCell><Badge variant="outline">{col.type}</Badge></TableCell>
                  <TableCell>{col.nullable ? "Yes" : "No"}</TableCell>
                  <TableCell>{col.isPrimaryKey ? <CheckCircle className="h-4 w-4 text-green-500" /> : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Data Dialog */}
      <Dialog open={showDataDialog} onOpenChange={setShowDataDialog}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Dữ liệu bảng: {selectedExternalTable}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Hiển thị {externalTableData?.rows.length || 0} / {externalTableData?.total || 0} bản ghi
                </span>
                <Select
                  value={externalPageSize.toString()}
                  onValueChange={(v) => {
                    const newSize = parseInt(v);
                    setExternalPageSize(newSize);
                    if (selectedExternalTable) {
                      loadTableData(selectedExternalTable, 1, newSize);
                    }
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {loadingExternalData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : externalTableData ? (
            <>
              <div className="border rounded-lg overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {externalTableData.columns.map((col) => (
                        <TableHead
                          key={col}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort(col)}
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
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-muted-foreground">NULL</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  Trang {externalPage} / {Math.ceil((externalTableData.total || 1) / externalPageSize)}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={externalPage <= 1}
                    onClick={() => loadTableData(selectedExternalTable!, externalPage - 1, externalPageSize, externalSortColumn || undefined, externalSortDirection)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={externalPage >= Math.ceil((externalTableData.total || 1) / externalPageSize)}
                    onClick={() => loadTableData(selectedExternalTable!, externalPage + 1, externalPageSize, externalSortColumn || undefined, externalSortDirection)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
