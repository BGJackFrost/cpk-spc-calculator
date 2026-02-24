import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  Database,
  ArrowRight,
  Table2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Eye,
  Download,
  Upload,
  FileText,
  Settings,
  History
} from "lucide-react";

interface TableInfo {
  name: string;
  rowCount: number;
  selected: boolean;
  status: "pending" | "migrating" | "success" | "error";
  migratedRows?: number;
  errorMessage?: string;
}

interface MigrationLog {
  id: number;
  timestamp: Date;
  sourceConnection: string;
  targetConnection: string;
  tablesCount: number;
  totalRows: number;
  successRows: number;
  failedRows: number;
  duration: number;
  status: "success" | "partial" | "failed";
}

export default function DataMigrationTool() {
  const [sourceConnectionId, setSourceConnectionId] = useState<string>("");
  const [targetConnectionId, setTargetConnectionId] = useState<string>("");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewTable, setPreviewTable] = useState<string>("");
  const [options, setOptions] = useState({
    truncateTarget: false,
    skipErrors: true,
    batchSize: 1000,
    validateData: true,
  });
  const { toast } = useToast();

  const connectionsQuery = trpc.databaseConnection.list.useQuery();
  const connections = connectionsQuery.data || [];

  // Mock migration history
  const migrationHistory: MigrationLog[] = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 86400000),
      sourceConnection: "Production DB",
      targetConnection: "Backup DB",
      tablesCount: 5,
      totalRows: 15000,
      successRows: 15000,
      failedRows: 0,
      duration: 45,
      status: "success",
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 172800000),
      sourceConnection: "Test DB",
      targetConnection: "Dev DB",
      tablesCount: 3,
      totalRows: 5000,
      successRows: 4950,
      failedRows: 50,
      duration: 20,
      status: "partial",
    },
  ];

  const handleLoadTables = async () => {
    if (!sourceConnectionId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn kết nối nguồn",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingTables(true);
    try {
      // Mock loading tables
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Mock data removed - mockTables (data comes from tRPC or is not yet implemented)
      setTables(mockTables);
      toast({
        title: "Thành công",
        description: `Đã tải ${([] as any[]).length} bảng từ database nguồn`,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể tải danh sách bảng",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handlePreviewTable = async (tableName: string) => {
    setPreviewTable(tableName);
    // Mock preview data
    // Mock data removed - null (data comes from tRPC or is not yet implemented)
    setPreviewData(null);
  };

  const handleStartMigration = async () => {
    const selectedTables = tables.filter(t => t.selected);
    if (selectedTables.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một bảng để migrate",
        variant: "destructive",
      });
      return;
    }

    if (!targetConnectionId) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn kết nối đích",
        variant: "destructive",
      });
      return;
    }

    if (sourceConnectionId === targetConnectionId) {
      toast({
        title: "Lỗi",
        description: "Kết nối nguồn và đích không được giống nhau",
        variant: "destructive",
      });
      return;
    }

    setIsMigrating(true);
    setMigrationProgress(0);

    // Simulate migration
    for (let i = 0; i < selectedTables.length; i++) {
      const table = selectedTables[i];
      setTables(prev => prev.map(t => 
        t.name === table.name ? { ...t, status: "migrating" } : t
      ));

      await new Promise(resolve => setTimeout(resolve, 1500));

      const success = Math.random() > 0.1; // 90% success rate
      setTables(prev => prev.map(t => 
        t.name === table.name ? {
          ...t,
          status: success ? "success" : "error",
          migratedRows: success ? t.rowCount : Math.floor(t.rowCount * 0.8),
          errorMessage: success ? undefined : "Connection timeout",
        } : t
      ));

      setMigrationProgress(((i + 1) / selectedTables.length) * 100);
    }

    setIsMigrating(false);
    toast({
      title: "Migration hoàn thành",
      description: `Đã migrate ${selectedTables.length} bảng`,
    });
  };

  const toggleTableSelection = (tableName: string) => {
    setTables(prev => prev.map(t =>
      t.name === tableName ? { ...t, selected: !t.selected } : t
    ));
  };

  const selectAllTables = (selected: boolean) => {
    setTables(prev => prev.map(t => ({ ...t, selected })));
  };

  const selectedCount = tables.filter(t => t.selected).length;
  const totalSelectedRows = tables.filter(t => t.selected).reduce((sum, t) => sum + t.rowCount, 0);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Database className="h-6 w-6" />
              Data Migration Tool
            </h1>
            <p className="text-muted-foreground">
              Migrate dữ liệu giữa các database connections
            </p>
          </div>
        </div>

        <Tabs defaultValue="migrate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="migrate">
              <Upload className="h-4 w-4 mr-2" />
              Migration
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Lịch sử
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Cài đặt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="migrate" className="space-y-6">
            {/* Connection Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Chọn kết nối</CardTitle>
                <CardDescription>Chọn database nguồn và đích cho migration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label>Kết nối nguồn</Label>
                    <Select value={sourceConnectionId} onValueChange={setSourceConnectionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn database nguồn" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.map((conn: any) => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            {conn.name} ({conn.databaseType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-center">
                    <ArrowRight className="h-8 w-8 text-muted-foreground" />
                  </div>

                  <div>
                    <Label>Kết nối đích</Label>
                    <Select value={targetConnectionId} onValueChange={setTargetConnectionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn database đích" />
                      </SelectTrigger>
                      <SelectContent>
                        {connections.map((conn: any) => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            {conn.name} ({conn.databaseType})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4">
                  <Button onClick={handleLoadTables} disabled={isLoadingTables || !sourceConnectionId}>
                    {isLoadingTables ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tải danh sách bảng
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tables Selection */}
            {tables.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Chọn bảng để migrate</CardTitle>
                      <CardDescription>
                        Đã chọn {selectedCount}/{tables.length} bảng ({totalSelectedRows.toLocaleString()} rows)
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => selectAllTables(true)}>
                        Chọn tất cả
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => selectAllTables(false)}>
                        Bỏ chọn
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Tên bảng</TableHead>
                        <TableHead className="text-right">Số dòng</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tables.map((table) => (
                        <TableRow key={table.name}>
                          <TableCell>
                            <Checkbox
                              checked={table.selected}
                              onCheckedChange={() => toggleTableSelection(table.name)}
                              disabled={isMigrating}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Table2 className="h-4 w-4 text-muted-foreground" />
                              {table.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {table.rowCount.toLocaleString()}
                            {table.migratedRows !== undefined && table.migratedRows !== table.rowCount && (
                              <span className="text-muted-foreground ml-1">
                                ({table.migratedRows.toLocaleString()} migrated)
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {table.status === "pending" && (
                              <Badge variant="secondary">Chờ</Badge>
                            )}
                            {table.status === "migrating" && (
                              <Badge variant="default" className="bg-blue-500">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Đang migrate
                              </Badge>
                            )}
                            {table.status === "success" && (
                              <Badge variant="default" className="bg-green-500">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Thành công
                              </Badge>
                            )}
                            {table.status === "error" && (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Lỗi
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewTable(table.name)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Preview Data */}
            {previewData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Preview: {previewTable}</CardTitle>
                  <CardDescription>10 dòng đầu tiên</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(previewData[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.map((row, i) => (
                          <TableRow key={i}>
                            {Object.values(row).map((value: any, j) => (
                              <TableCell key={j}>
                                {typeof value === "object" ? JSON.stringify(value) : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Migration Progress */}
            {isMigrating && (
              <Card>
                <CardHeader>
                  <CardTitle>Tiến trình Migration</CardTitle>
                </CardHeader>
                <CardContent>
                  <Progress value={migrationProgress} className="h-4" />
                  <p className="text-center mt-2 text-muted-foreground">
                    {migrationProgress.toFixed(0)}% hoàn thành
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {tables.length > 0 && (
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => setTables(prev => prev.map(t => ({ ...t, status: "pending", migratedRows: undefined, errorMessage: undefined })))}
                  disabled={isMigrating}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
                <Button
                  onClick={handleStartMigration}
                  disabled={isMigrating || selectedCount === 0 || !targetConnectionId}
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang migrate...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Bắt đầu Migration
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử Migration</CardTitle>
                <CardDescription>Các lần migration gần đây</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Nguồn → Đích</TableHead>
                      <TableHead className="text-right">Bảng</TableHead>
                      <TableHead className="text-right">Rows</TableHead>
                      <TableHead className="text-right">Thời lượng</TableHead>
                      <TableHead>Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {migrationHistory.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.timestamp.toLocaleString("vi-VN")}
                        </TableCell>
                        <TableCell>
                          {log.sourceConnection} → {log.targetConnection}
                        </TableCell>
                        <TableCell className="text-right">{log.tablesCount}</TableCell>
                        <TableCell className="text-right">
                          {log.successRows.toLocaleString()}/{log.totalRows.toLocaleString()}
                          {log.failedRows > 0 && (
                            <span className="text-red-500 ml-1">
                              ({log.failedRows} failed)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{log.duration}s</TableCell>
                        <TableCell>
                          {log.status === "success" && (
                            <Badge variant="default" className="bg-green-500">Thành công</Badge>
                          )}
                          {log.status === "partial" && (
                            <Badge variant="secondary" className="bg-yellow-500">Một phần</Badge>
                          )}
                          {log.status === "failed" && (
                            <Badge variant="destructive">Thất bại</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt Migration</CardTitle>
                <CardDescription>Tùy chỉnh các tùy chọn migration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Xóa dữ liệu đích trước khi migrate</Label>
                    <p className="text-sm text-muted-foreground">
                      TRUNCATE bảng đích trước khi insert dữ liệu mới
                    </p>
                  </div>
                  <Switch
                    checked={options.truncateTarget}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, truncateTarget: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bỏ qua lỗi</Label>
                    <p className="text-sm text-muted-foreground">
                      Tiếp tục migrate các bảng khác nếu có lỗi
                    </p>
                  </div>
                  <Switch
                    checked={options.skipErrors}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, skipErrors: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Validate dữ liệu</Label>
                    <p className="text-sm text-muted-foreground">
                      Kiểm tra dữ liệu sau khi migrate
                    </p>
                  </div>
                  <Switch
                    checked={options.validateData}
                    onCheckedChange={(checked) => setOptions(prev => ({ ...prev, validateData: checked }))}
                  />
                </div>

                <div>
                  <Label>Batch size</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Số dòng insert trong mỗi batch
                  </p>
                  <Input
                    type="number"
                    value={options.batchSize}
                    onChange={(e) => setOptions(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 1000 }))}
                    min={100}
                    max={10000}
                    step={100}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
