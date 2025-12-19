import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Plus,
  Minus,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronRight,
  Table2,
  Columns,
  Key,
  Link2,
  FileText,
  Loader2,
  Eye,
  Filter,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

// Types
interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef?: string;
  comment?: string;
}

interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  indexes: IndexSchema[];
  rowCount: number;
}

interface SchemaDiff {
  tableName: string;
  status: "match" | "added" | "removed" | "modified";
  sourceTable?: TableSchema;
  targetTable?: TableSchema;
  columnDiffs?: ColumnDiff[];
  indexDiffs?: IndexDiff[];
}

interface ColumnDiff {
  columnName: string;
  status: "match" | "added" | "removed" | "modified";
  sourceColumn?: ColumnSchema;
  targetColumn?: ColumnSchema;
  differences?: string[];
}

interface IndexDiff {
  indexName: string;
  status: "match" | "added" | "removed" | "modified";
  sourceIndex?: IndexSchema;
  targetIndex?: IndexSchema;
}

// Mock data for schema comparison
const MOCK_SOURCE_SCHEMA: TableSchema[] = [
  {
    name: "measurements",
    rowCount: 15000,
    columns: [
      { name: "id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: "product_code", type: "VARCHAR(50)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: true, foreignKeyRef: "products.code" },
      { name: "station_name", type: "VARCHAR(100)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "value", type: "DECIMAL(10,4)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "measured_at", type: "DATETIME", nullable: false, defaultValue: "CURRENT_TIMESTAMP", isPrimaryKey: false, isForeignKey: false },
      { name: "operator", type: "VARCHAR(50)", nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "batch_number", type: "VARCHAR(30)", nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["id"], unique: true },
      { name: "idx_product_code", columns: ["product_code"], unique: false },
      { name: "idx_measured_at", columns: ["measured_at"], unique: false },
    ]
  },
  {
    name: "products",
    rowCount: 50,
    columns: [
      { name: "id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: "code", type: "VARCHAR(50)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "name", type: "VARCHAR(200)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "description", type: "TEXT", nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "created_at", type: "DATETIME", nullable: false, defaultValue: "CURRENT_TIMESTAMP", isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["id"], unique: true },
      { name: "idx_code", columns: ["code"], unique: true },
    ]
  },
  {
    name: "stations",
    rowCount: 20,
    columns: [
      { name: "id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: "name", type: "VARCHAR(100)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "line_id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: true, foreignKeyRef: "production_lines.id" },
      { name: "status", type: "VARCHAR(20)", nullable: false, defaultValue: "'active'", isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["id"], unique: true },
    ]
  },
  {
    name: "audit_logs",
    rowCount: 50000,
    columns: [
      { name: "id", type: "BIGINT", nullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: "action", type: "VARCHAR(50)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "user_id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: true },
      { name: "details", type: "JSON", nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "created_at", type: "DATETIME", nullable: false, defaultValue: "CURRENT_TIMESTAMP", isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["id"], unique: true },
      { name: "idx_user_action", columns: ["user_id", "action"], unique: false },
    ]
  },
];

const MOCK_TARGET_SCHEMA: TableSchema[] = [
  {
    name: "tbl_measurements",
    rowCount: 0,
    columns: [
      { name: "measurement_id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: "product_id", type: "VARCHAR(50)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: true },
      { name: "station", type: "VARCHAR(100)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "measured_value", type: "DECIMAL(12,6)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "measurement_time", type: "TIMESTAMP", nullable: false, defaultValue: "CURRENT_TIMESTAMP", isPrimaryKey: false, isForeignKey: false },
      { name: "operator_name", type: "VARCHAR(100)", nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["measurement_id"], unique: true },
      { name: "idx_product", columns: ["product_id"], unique: false },
    ]
  },
  {
    name: "tbl_products",
    rowCount: 10,
    columns: [
      { name: "product_id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: "product_code", type: "VARCHAR(50)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "product_name", type: "VARCHAR(200)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "product_desc", type: "TEXT", nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "create_date", type: "DATETIME", nullable: false, defaultValue: "CURRENT_TIMESTAMP", isPrimaryKey: false, isForeignKey: false },
      { name: "updated_at", type: "DATETIME", nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["product_id"], unique: true },
      { name: "idx_product_code", columns: ["product_code"], unique: true },
    ]
  },
  {
    name: "tbl_stations",
    rowCount: 5,
    columns: [
      { name: "station_id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: "station_name", type: "VARCHAR(100)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "production_line_id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: true },
      { name: "station_status", type: "ENUM('active','inactive','maintenance')", nullable: false, defaultValue: "'active'", isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["station_id"], unique: true },
      { name: "idx_line", columns: ["production_line_id"], unique: false },
    ]
  },
  {
    name: "tbl_operators",
    rowCount: 30,
    columns: [
      { name: "id", type: "INT", nullable: false, defaultValue: null, isPrimaryKey: true, isForeignKey: false },
      { name: "name", type: "VARCHAR(100)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "employee_id", type: "VARCHAR(20)", nullable: false, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
      { name: "department", type: "VARCHAR(50)", nullable: true, defaultValue: null, isPrimaryKey: false, isForeignKey: false },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["id"], unique: true },
    ]
  },
];

export default function SchemaComparison() {
  const [sourceConnectionId, setSourceConnectionId] = useState<string>("");
  const [targetConnectionId, setTargetConnectionId] = useState<string>("");
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<SchemaDiff[]>([]);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { toast } = useToast();
  const connectionsQuery = trpc.databaseConnection.list.useQuery();
  const connections = connectionsQuery.data || [];

  // Compare schemas
  const compareSchemas = async () => {
    if (!sourceConnectionId || !targetConnectionId) {
      toast({ title: "Lỗi", description: "Vui lòng chọn cả database nguồn và đích", variant: "destructive" });
      return;
    }

    setIsComparing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const diffs: SchemaDiff[] = [];

      // Compare source tables
      MOCK_SOURCE_SCHEMA.forEach(sourceTable => {
        const targetTable = MOCK_TARGET_SCHEMA.find(t => 
          t.name.toLowerCase().replace("tbl_", "") === sourceTable.name.toLowerCase() ||
          t.name.toLowerCase() === sourceTable.name.toLowerCase()
        );

        if (!targetTable) {
          diffs.push({
            tableName: sourceTable.name,
            status: "removed",
            sourceTable,
          });
        } else {
          const columnDiffs: ColumnDiff[] = [];
          
          sourceTable.columns.forEach(sourceCol => {
            const targetCol = targetTable.columns.find(c => 
              c.name.toLowerCase().replace(/_/g, "") === sourceCol.name.toLowerCase().replace(/_/g, "") ||
              c.name.toLowerCase() === sourceCol.name.toLowerCase()
            );

            if (!targetCol) {
              columnDiffs.push({
                columnName: sourceCol.name,
                status: "removed",
                sourceColumn: sourceCol,
              });
            } else {
              const differences: string[] = [];
              if (sourceCol.type !== targetCol.type) differences.push(`Type: ${sourceCol.type} → ${targetCol.type}`);
              if (sourceCol.nullable !== targetCol.nullable) differences.push(`Nullable: ${sourceCol.nullable} → ${targetCol.nullable}`);
              if (sourceCol.defaultValue !== targetCol.defaultValue) differences.push(`Default: ${sourceCol.defaultValue || "NULL"} → ${targetCol.defaultValue || "NULL"}`);

              columnDiffs.push({
                columnName: sourceCol.name,
                status: differences.length > 0 ? "modified" : "match",
                sourceColumn: sourceCol,
                targetColumn: targetCol,
                differences,
              });
            }
          });

          targetTable.columns.forEach(targetCol => {
            const sourceCol = sourceTable.columns.find(c => 
              c.name.toLowerCase().replace(/_/g, "") === targetCol.name.toLowerCase().replace(/_/g, "") ||
              c.name.toLowerCase() === targetCol.name.toLowerCase()
            );

            if (!sourceCol) {
              columnDiffs.push({
                columnName: targetCol.name,
                status: "added",
                targetColumn: targetCol,
              });
            }
          });

          const hasChanges = columnDiffs.some(d => d.status !== "match");
          diffs.push({
            tableName: sourceTable.name,
            status: hasChanges ? "modified" : "match",
            sourceTable,
            targetTable,
            columnDiffs,
          });
        }
      });

      // Find added tables in target
      MOCK_TARGET_SCHEMA.forEach(targetTable => {
        const sourceTable = MOCK_SOURCE_SCHEMA.find(t => 
          t.name.toLowerCase().replace("tbl_", "") === targetTable.name.toLowerCase().replace("tbl_", "") ||
          t.name.toLowerCase() === targetTable.name.toLowerCase()
        );

        if (!sourceTable) {
          diffs.push({
            tableName: targetTable.name,
            status: "added",
            targetTable,
          });
        }
      });

      setComparisonResult(diffs);
      toast({ title: "So sánh hoàn tất", description: `Đã phân tích ${diffs.length} bảng` });
    } catch {
      toast({ title: "Lỗi", description: "Không thể so sánh schema", variant: "destructive" });
    } finally {
      setIsComparing(false);
    }
  };

  // Toggle table expansion
  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  // Filter results
  const filteredResults = useMemo(() => {
    return comparisonResult.filter(diff => {
      if (filterStatus !== "all" && diff.status !== filterStatus) return false;
      if (searchTerm && !diff.tableName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [comparisonResult, filterStatus, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const match = comparisonResult.filter(d => d.status === "match").length;
    const modified = comparisonResult.filter(d => d.status === "modified").length;
    const added = comparisonResult.filter(d => d.status === "added").length;
    const removed = comparisonResult.filter(d => d.status === "removed").length;
    return { match, modified, added, removed, total: comparisonResult.length };
  }, [comparisonResult]);

  // Export report
  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      sourceConnection: connections.find((c: { id: number }) => c.id.toString() === sourceConnectionId)?.name,
      targetConnection: connections.find((c: { id: number }) => c.id.toString() === targetConnectionId)?.name,
      summary: stats,
      details: comparisonResult,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schema-comparison-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Đã xuất báo cáo", description: "File JSON đã được tải xuống" });
  };

  // Get status badge
  const getStatusBadge = (status: SchemaDiff["status"]) => {
    switch (status) {
      case "match":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Match</Badge>;
      case "modified":
        return <Badge className="bg-yellow-500"><AlertTriangle className="h-3 w-3 mr-1" />Modified</Badge>;
      case "added":
        return <Badge className="bg-blue-500"><Plus className="h-3 w-3 mr-1" />Added</Badge>;
      case "removed":
        return <Badge className="bg-red-500"><Minus className="h-3 w-3 mr-1" />Removed</Badge>;
    }
  };

  // Get column status icon
  const getColumnStatusIcon = (status: ColumnDiff["status"]) => {
    switch (status) {
      case "match":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "modified":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "added":
        return <Plus className="h-4 w-4 text-blue-500" />;
      case "removed":
        return <Minus className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowLeftRight className="h-6 w-6" />
              Schema Comparison
            </h1>
            <p className="text-muted-foreground">
              So sánh cấu trúc giữa 2 database để phát hiện khác biệt
            </p>
          </div>
          {comparisonResult.length > 0 && (
            <Button onClick={exportReport}>
              <Download className="h-4 w-4 mr-2" />
              Xuất báo cáo
            </Button>
          )}
        </div>

        {/* Connection Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Chọn Database
            </CardTitle>
            <CardDescription>Chọn 2 database để so sánh cấu trúc schema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-end">
              <div>
                <label className="text-sm font-medium mb-2 block">Database Nguồn</label>
                <Select value={sourceConnectionId} onValueChange={setSourceConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn database nguồn" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.map((conn: { id: number; name: string; databaseType: string }) => (
                      <SelectItem key={conn.id} value={conn.id.toString()}>
                        {conn.name} ({conn.databaseType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-center pb-2">
                <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Database Đích</label>
                <Select value={targetConnectionId} onValueChange={setTargetConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn database đích" />
                  </SelectTrigger>
                  <SelectContent>
                    {connections.filter((c: { id: number }) => c.id.toString() !== sourceConnectionId).map((conn: { id: number; name: string; databaseType: string }) => (
                      <SelectItem key={conn.id} value={conn.id.toString()}>
                        {conn.name} ({conn.databaseType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <Button onClick={compareSchemas} disabled={isComparing || !sourceConnectionId || !targetConnectionId} size="lg">
                {isComparing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Đang so sánh...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    So sánh Schema
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {comparisonResult.length > 0 && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{stats.total}</div>
                    <div className="text-sm text-muted-foreground">Tổng số bảng</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.match}</div>
                    <div className="text-sm text-green-600">Khớp hoàn toàn</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{stats.modified}</div>
                    <div className="text-sm text-yellow-600">Có thay đổi</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.added}</div>
                    <div className="text-sm text-blue-600">Thêm mới</div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{stats.removed}</div>
                    <div className="text-sm text-red-600">Đã xóa</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Compatibility Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Độ tương thích Schema</span>
                  <span className="text-2xl font-bold">
                    {Math.round((stats.match / stats.total) * 100)}%
                  </span>
                </div>
                <Progress value={(stats.match / stats.total) * 100} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {stats.match} / {stats.total} bảng khớp hoàn toàn
                </p>
              </CardContent>
            </Card>

            {/* Detailed Comparison */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Chi tiết So sánh
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Tìm kiếm bảng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-[200px]"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="match">Khớp</SelectItem>
                        <SelectItem value="modified">Thay đổi</SelectItem>
                        <SelectItem value="added">Thêm mới</SelectItem>
                        <SelectItem value="removed">Đã xóa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                    <TabsTrigger value="details">Chi tiết</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bảng nguồn</TableHead>
                          <TableHead>Bảng đích</TableHead>
                          <TableHead className="text-center">Trạng thái</TableHead>
                          <TableHead className="text-right">Columns</TableHead>
                          <TableHead className="text-right">Rows (Nguồn)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((diff) => (
                          <TableRow key={diff.tableName} className={
                            diff.status === "removed" ? "bg-red-50 dark:bg-red-950/30" :
                            diff.status === "added" ? "bg-blue-50 dark:bg-blue-950/30" :
                            diff.status === "modified" ? "bg-yellow-50 dark:bg-yellow-950/30" : ""
                          }>
                            <TableCell className="font-mono">
                              <div className="flex items-center gap-2">
                                <Table2 className="h-4 w-4 text-muted-foreground" />
                                {diff.sourceTable?.name || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              <div className="flex items-center gap-2">
                                <Table2 className="h-4 w-4 text-muted-foreground" />
                                {diff.targetTable?.name || "-"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(diff.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              {diff.sourceTable?.columns.length || diff.targetTable?.columns.length || 0}
                            </TableCell>
                            <TableCell className="text-right">
                              {diff.sourceTable?.rowCount.toLocaleString() || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>

                  <TabsContent value="details" className="mt-4">
                    <ScrollArea className="h-[600px]">
                      <div className="space-y-4">
                        {filteredResults.map((diff) => (
                          <Collapsible
                            key={diff.tableName}
                            open={expandedTables.has(diff.tableName)}
                            onOpenChange={() => toggleTable(diff.tableName)}
                          >
                            <CollapsibleTrigger asChild>
                              <div className={`p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                                diff.status === "removed" ? "border-red-300 bg-red-50 dark:bg-red-950/30" :
                                diff.status === "added" ? "border-blue-300 bg-blue-50 dark:bg-blue-950/30" :
                                diff.status === "modified" ? "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30" :
                                "border-green-300 bg-green-50 dark:bg-green-950/30"
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {expandedTables.has(diff.tableName) ? (
                                      <ChevronDown className="h-5 w-5" />
                                    ) : (
                                      <ChevronRight className="h-5 w-5" />
                                    )}
                                    <Table2 className="h-5 w-5" />
                                    <span className="font-mono font-medium">{diff.tableName}</span>
                                    {getStatusBadge(diff.status)}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Columns className="h-4 w-4" />
                                      {diff.columnDiffs?.length || diff.sourceTable?.columns.length || diff.targetTable?.columns.length || 0} columns
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 ml-8 border rounded-lg overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-8"></TableHead>
                                      <TableHead>Column</TableHead>
                                      <TableHead>Type (Nguồn)</TableHead>
                                      <TableHead>Type (Đích)</TableHead>
                                      <TableHead>Nullable</TableHead>
                                      <TableHead>Keys</TableHead>
                                      <TableHead>Khác biệt</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {diff.columnDiffs?.map((colDiff) => (
                                      <TableRow key={colDiff.columnName} className={
                                        colDiff.status === "removed" ? "bg-red-50 dark:bg-red-950/30" :
                                        colDiff.status === "added" ? "bg-blue-50 dark:bg-blue-950/30" :
                                        colDiff.status === "modified" ? "bg-yellow-50 dark:bg-yellow-950/30" : ""
                                      }>
                                        <TableCell>{getColumnStatusIcon(colDiff.status)}</TableCell>
                                        <TableCell className="font-mono">{colDiff.columnName}</TableCell>
                                        <TableCell className="font-mono text-sm">
                                          {colDiff.sourceColumn?.type || "-"}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                          {colDiff.targetColumn?.type || "-"}
                                        </TableCell>
                                        <TableCell>
                                          {colDiff.sourceColumn?.nullable ? "Yes" : "No"}
                                          {colDiff.targetColumn && colDiff.sourceColumn?.nullable !== colDiff.targetColumn?.nullable && (
                                            <span className="text-yellow-600"> → {colDiff.targetColumn?.nullable ? "Yes" : "No"}</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex gap-1">
                                            {colDiff.sourceColumn?.isPrimaryKey && (
                                              <Badge variant="outline" className="text-xs"><Key className="h-3 w-3 mr-1" />PK</Badge>
                                            )}
                                            {colDiff.sourceColumn?.isForeignKey && (
                                              <Badge variant="outline" className="text-xs"><Link2 className="h-3 w-3 mr-1" />FK</Badge>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {colDiff.differences && colDiff.differences.length > 0 && (
                                            <div className="text-xs text-yellow-600">
                                              {colDiff.differences.join(", ")}
                                            </div>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                    {!diff.columnDiffs && diff.sourceTable?.columns.map((col) => (
                                      <TableRow key={col.name}>
                                        <TableCell><XCircle className="h-4 w-4 text-red-500" /></TableCell>
                                        <TableCell className="font-mono">{col.name}</TableCell>
                                        <TableCell className="font-mono text-sm">{col.type}</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>{col.nullable ? "Yes" : "No"}</TableCell>
                                        <TableCell>
                                          <div className="flex gap-1">
                                            {col.isPrimaryKey && <Badge variant="outline" className="text-xs">PK</Badge>}
                                            {col.isForeignKey && <Badge variant="outline" className="text-xs">FK</Badge>}
                                          </div>
                                        </TableCell>
                                        <TableCell>-</TableCell>
                                      </TableRow>
                                    ))}
                                    {!diff.columnDiffs && diff.targetTable?.columns.map((col) => (
                                      <TableRow key={col.name} className="bg-blue-50 dark:bg-blue-950/30">
                                        <TableCell><Plus className="h-4 w-4 text-blue-500" /></TableCell>
                                        <TableCell className="font-mono">{col.name}</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell className="font-mono text-sm">{col.type}</TableCell>
                                        <TableCell>{col.nullable ? "Yes" : "No"}</TableCell>
                                        <TableCell>
                                          <div className="flex gap-1">
                                            {col.isPrimaryKey && <Badge variant="outline" className="text-xs">PK</Badge>}
                                            {col.isForeignKey && <Badge variant="outline" className="text-xs">FK</Badge>}
                                          </div>
                                        </TableCell>
                                        <TableCell>-</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
