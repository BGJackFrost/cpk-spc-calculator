import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Plus, Database, FileText, Globe, Play, Square, RefreshCw, 
  Trash2, Settings, CheckCircle, XCircle, AlertCircle, Loader2,
  Server, Wifi, WifiOff
} from "lucide-react";

interface ConnectionConfig {
  // Database
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  // File
  filePath?: string;
  fileType?: 'csv' | 'excel';
  // API
  apiUrl?: string;
  apiKey?: string;
  apiMethod?: 'GET' | 'POST';
}

interface MachineConnection {
  id: number;
  machineId: number;
  machineName?: string;
  connectionType: string;
  connectionConfig: string;
  dataQuery: string;
  timestampColumn: string;
  measurementColumn: string;
  pollingIntervalMs: number;
  isActive: number;
  lastDataAt: Date | null;
  lastError: string | null;
  createdAt: Date;
}

export default function RealtimeMachineConfig() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<MachineConnection | null>(null);
  const [formData, setFormData] = useState({
    machineId: 0,
    connectionType: 'database',
    pollingIntervalMs: 5000,
    dataQuery: '',
    timestampColumn: 'timestamp',
    measurementColumn: 'value',
    isActive: true,
    // Database config
    host: '',
    port: 3306,
    user: '',
    password: '',
    database: '',
    // File config
    filePath: '',
    fileType: 'csv' as 'csv' | 'excel',
    // API config
    apiUrl: '',
    apiKey: '',
    apiMethod: 'GET' as 'GET' | 'POST',
  });

  const { data: connections, refetch } = trpc.realtimeConnection.list.useQuery();
  const { data: machines } = trpc.machine.listAll.useQuery();
  
  const createMutation = trpc.realtimeConnection.create.useMutation({
    onSuccess: () => {
      toast.success("Đã tạo kết nối mới");
      setIsAddDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const updateMutation = trpc.realtimeConnection.update.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật kết nối");
      setSelectedConnection(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const deleteMutation = trpc.realtimeConnection.delete.useMutation({
    onSuccess: () => {
      toast.success("Đã xóa kết nối");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const testMutation = trpc.realtimeConnection.testConnection.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const toggleMutation = trpc.realtimeConnection.toggle.useMutation({
    onSuccess: () => {
      toast.success("Đã cập nhật trạng thái");
      refetch();
    },
    onError: (error) => {
      toast.error(`Lỗi: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      machineId: 0,
      connectionType: 'database',
      pollingIntervalMs: 5000,
      dataQuery: '',
      timestampColumn: 'timestamp',
      measurementColumn: 'value',
      isActive: true,
      host: '',
      port: 3306,
      user: '',
      password: '',
      database: '',
      filePath: '',
      fileType: 'csv',
      apiUrl: '',
      apiKey: '',
      apiMethod: 'GET',
    });
  };

  const buildConnectionConfig = (): string => {
    const config: ConnectionConfig = {};
    
    if (formData.connectionType === 'database') {
      config.host = formData.host;
      config.port = formData.port;
      config.user = formData.user;
      config.password = formData.password;
      config.database = formData.database;
    } else if (formData.connectionType === 'file') {
      config.filePath = formData.filePath;
      config.fileType = formData.fileType;
    } else if (formData.connectionType === 'api') {
      config.apiUrl = formData.apiUrl;
      config.apiKey = formData.apiKey;
      config.apiMethod = formData.apiMethod;
    }
    
    return JSON.stringify(config);
  };

  const handleSubmit = () => {
    if (!formData.machineId) {
      toast.error("Vui lòng chọn máy");
      return;
    }

    const data = {
      machineId: formData.machineId,
      connectionType: formData.connectionType as 'database' | 'file' | 'api' | 'opcua' | 'mqtt',
      connectionConfig: buildConnectionConfig(),
      dataQuery: formData.dataQuery,
      timestampColumn: formData.timestampColumn,
      measurementColumn: formData.measurementColumn,
      pollingIntervalMs: formData.pollingIntervalMs,
      isActive: formData.isActive ? 1 : 0,
    };

    if (selectedConnection) {
      updateMutation.mutate({ id: selectedConnection.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getStatusBadge = (conn: MachineConnection) => {
    if (!conn.isActive) {
      return <Badge variant="secondary"><WifiOff className="w-3 h-3 mr-1" />Tắt</Badge>;
    }
    if (conn.lastError) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Lỗi</Badge>;
    }
    if (conn.lastDataAt) {
      const lastData = new Date(conn.lastDataAt);
      const diff = Date.now() - lastData.getTime();
      if (diff < conn.pollingIntervalMs * 3) {
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Online</Badge>;
      }
    }
    return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Chờ</Badge>;
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case 'database': return <Database className="w-4 h-4" />;
      case 'file': return <FileText className="w-4 h-4" />;
      case 'api': return <Globe className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cấu hình Kết nối Máy Realtime</h1>
            <p className="text-muted-foreground">
              Quản lý kết nối thu thập dữ liệu từ máy sản xuất
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setSelectedConnection(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Thêm kết nối
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedConnection ? "Chỉnh sửa kết nối" : "Thêm kết nối mới"}
                </DialogTitle>
                <DialogDescription>
                  Cấu hình kết nối để thu thập dữ liệu từ máy sản xuất
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                  <TabsTrigger value="connection">Kết nối</TabsTrigger>
                  <TabsTrigger value="data">Dữ liệu</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Máy sản xuất</Label>
                    <Select
                      value={formData.machineId.toString()}
                      onValueChange={(v) => setFormData({ ...formData, machineId: parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn máy" />
                      </SelectTrigger>
                      <SelectContent>
                        {machines?.map((m: any) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name} ({m.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Loại kết nối</Label>
                    <Select
                      value={formData.connectionType}
                      onValueChange={(v) => setFormData({ ...formData, connectionType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="database">
                          <div className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Database (MySQL/SQL Server)
                          </div>
                        </SelectItem>
                        <SelectItem value="file">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            File (CSV/Excel)
                          </div>
                        </SelectItem>
                        <SelectItem value="api">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            REST API
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Chu kỳ lấy mẫu (ms)</Label>
                    <Input
                      type="number"
                      value={formData.pollingIntervalMs}
                      onChange={(e) => setFormData({ ...formData, pollingIntervalMs: parseInt(e.target.value) || 5000 })}
                      min={1000}
                      step={1000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tối thiểu 1000ms (1 giây)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label>Kích hoạt ngay sau khi tạo</Label>
                  </div>
                </TabsContent>

                <TabsContent value="connection" className="space-y-4 mt-4">
                  {formData.connectionType === 'database' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
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
                            type="number"
                            value={formData.port}
                            onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 3306 })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>User</Label>
                          <Input
                            value={formData.user}
                            onChange={(e) => setFormData({ ...formData, user: e.target.value })}
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
                        <Label>Database</Label>
                        <Input
                          value={formData.database}
                          onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                  {formData.connectionType === 'file' && (
                    <>
                      <div className="space-y-2">
                        <Label>Đường dẫn file</Label>
                        <Input
                          value={formData.filePath}
                          onChange={(e) => setFormData({ ...formData, filePath: e.target.value })}
                          placeholder="/path/to/data.csv"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Loại file</Label>
                        <Select
                          value={formData.fileType}
                          onValueChange={(v) => setFormData({ ...formData, fileType: v as 'csv' | 'excel' })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {formData.connectionType === 'api' && (
                    <>
                      <div className="space-y-2">
                        <Label>API URL</Label>
                        <Input
                          value={formData.apiUrl}
                          onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                          placeholder="https://api.example.com/data"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>API Key (optional)</Label>
                          <Input
                            value={formData.apiKey}
                            onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Method</Label>
                          <Select
                            value={formData.apiMethod}
                            onValueChange={(v) => setFormData({ ...formData, apiMethod: v as 'GET' | 'POST' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GET">GET</SelectItem>
                              <SelectItem value="POST">POST</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="data" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Query lấy dữ liệu</Label>
                    <Textarea
                      value={formData.dataQuery}
                      onChange={(e) => setFormData({ ...formData, dataQuery: e.target.value })}
                      placeholder="SELECT timestamp, value FROM measurements WHERE timestamp > NOW() - INTERVAL 1 MINUTE"
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground">
                      Query SQL hoặc endpoint path tùy loại kết nối
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cột timestamp</Label>
                      <Input
                        value={formData.timestampColumn}
                        onChange={(e) => setFormData({ ...formData, timestampColumn: e.target.value })}
                        placeholder="timestamp"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cột giá trị đo</Label>
                      <Input
                        value={formData.measurementColumn}
                        onChange={(e) => setFormData({ ...formData, measurementColumn: e.target.value })}
                        placeholder="value"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Hủy
                </Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {selectedConnection ? "Cập nhật" : "Tạo mới"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tổng kết nối</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connections?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Đang hoạt động</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {connections?.filter((c: any) => c.isActive).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Có lỗi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {connections?.filter((c: any) => c.lastError).length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Loại kết nối</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge variant="outline">
                  <Database className="w-3 h-3 mr-1" />
                  {connections?.filter((c: any) => c.connectionType === 'database').length || 0}
                </Badge>
                <Badge variant="outline">
                  <FileText className="w-3 h-3 mr-1" />
                  {connections?.filter((c: any) => c.connectionType === 'file').length || 0}
                </Badge>
                <Badge variant="outline">
                  <Globe className="w-3 h-3 mr-1" />
                  {connections?.filter((c: any) => c.connectionType === 'api').length || 0}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connections Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách kết nối</CardTitle>
            <CardDescription>
              Quản lý các kết nối thu thập dữ liệu từ máy sản xuất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Máy</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Chu kỳ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Dữ liệu cuối</TableHead>
                  <TableHead>Lỗi</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections?.map((conn: any) => (
                  <TableRow key={conn.id}>
                    <TableCell className="font-medium">
                      {conn.machineName || `Machine #${conn.machineId}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getConnectionTypeIcon(conn.connectionType)}
                        <span className="capitalize">{conn.connectionType}</span>
                      </div>
                    </TableCell>
                    <TableCell>{conn.pollingIntervalMs / 1000}s</TableCell>
                    <TableCell>{getStatusBadge(conn)}</TableCell>
                    <TableCell>
                      {conn.lastDataAt 
                        ? new Date(conn.lastDataAt).toLocaleString('vi-VN')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-red-500">
                      {conn.lastError || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => testMutation.mutate({ id: conn.id })}
                          disabled={testMutation.isPending}
                        >
                          {testMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleMutation.mutate({ id: conn.id, isActive: !conn.isActive })}
                        >
                          {conn.isActive ? (
                            <Square className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedConnection(conn);
                            const config = conn.connectionConfig ? JSON.parse(conn.connectionConfig) : {};
                            setFormData({
                              machineId: conn.machineId,
                              connectionType: conn.connectionType,
                              pollingIntervalMs: conn.pollingIntervalMs,
                              dataQuery: conn.dataQuery || '',
                              timestampColumn: conn.timestampColumn || 'timestamp',
                              measurementColumn: conn.measurementColumn || 'value',
                              isActive: !!conn.isActive,
                              host: config.host || '',
                              port: config.port || 3306,
                              user: config.user || '',
                              password: config.password || '',
                              database: config.database || '',
                              filePath: config.filePath || '',
                              fileType: config.fileType || 'csv',
                              apiUrl: config.apiUrl || '',
                              apiKey: config.apiKey || '',
                              apiMethod: config.apiMethod || 'GET',
                            });
                            setIsAddDialogOpen(true);
                          }}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm('Bạn có chắc muốn xóa kết nối này?')) {
                              deleteMutation.mutate({ id: conn.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!connections || connections.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chưa có kết nối nào. Nhấn "Thêm kết nối" để bắt đầu.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
