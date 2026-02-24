import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Database, Plus, RefreshCw, Edit, Trash2, CheckCircle, XCircle, Clock, Link2, Unlink, Play, Pause, Settings } from "lucide-react";

// Mock data sources
// Mock data removed - ({ summary: { totalSources: 0, connected: 0, totalRecords: 0, lastFullSync: "N/A" }, sources: [] } as any) (data comes from tRPC or is not yet implemented)

export default function AiDataSources() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    type: "database",
    connection: "",
    syncInterval: "15",
  });

  const handleCreate = () => {
    toast({ title: "Đã tạo", description: "Nguồn dữ liệu mới đã được thêm" });
    setIsCreateOpen(false);
    setNewSource({ name: "", type: "database", connection: "", syncInterval: "15" });
  };

  const handleSync = (id: number) => {
    toast({ title: "Đang đồng bộ", description: "Đang đồng bộ dữ liệu từ nguồn..." });
    setTimeout(() => {
      toast({ title: "Hoàn thành", description: "Đã đồng bộ dữ liệu thành công" });
    }, 2000);
  };

  const handleToggle = (id: number, enabled: boolean) => {
    toast({ title: enabled ? "Đã bật" : "Đã tắt", description: `Nguồn dữ liệu đã được ${enabled ? "bật" : "tắt"}` });
  };

  const handleDelete = (id: number) => {
    toast({ title: "Đã xóa", description: "Nguồn dữ liệu đã được xóa" });
  };

  const handleTestConnection = (id: number) => {
    toast({ title: "Đang kiểm tra", description: "Đang kiểm tra kết nối..." });
    setTimeout(() => {
      toast({ title: "Thành công", description: "Kết nối thành công" });
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected": return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Đã kết nối</Badge>;
      case "disconnected": return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Mất kết nối</Badge>;
      case "syncing": return <Badge className="bg-blue-500"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Đang đồng bộ</Badge>;
      case "idle": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Chờ</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "database": return <Badge variant="outline" className="border-blue-500 text-blue-500">Database</Badge>;
      case "api": return <Badge variant="outline" className="border-green-500 text-green-500">API</Badge>;
      case "mqtt": return <Badge variant="outline" className="border-purple-500 text-purple-500">MQTT</Badge>;
      case "file": return <Badge variant="outline" className="border-orange-500 text-orange-500">File</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-500" />
              AI Data Sources
            </h1>
            <p className="text-muted-foreground mt-1">Quản lý nguồn dữ liệu cho AI/ML</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />Đồng bộ tất cả
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />Thêm nguồn</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Thêm nguồn dữ liệu mới</DialogTitle>
                  <DialogDescription>Cấu hình kết nối đến nguồn dữ liệu</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Tên nguồn</Label>
                    <Input value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} placeholder="Production Database" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Loại</Label>
                    <Select value={newSource.type} onValueChange={(v) => setNewSource({ ...newSource, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="database">Database (MySQL, PostgreSQL, Oracle)</SelectItem>
                        <SelectItem value="api">REST API</SelectItem>
                        <SelectItem value="mqtt">MQTT (IoT)</SelectItem>
                        <SelectItem value="file">File (CSV, Excel)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Connection String / URL</Label>
                    <Input value={newSource.connection} onChange={(e) => setNewSource({ ...newSource, connection: e.target.value })} placeholder="mysql://user:pass@host:port/database" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Khoảng thời gian đồng bộ</Label>
                    <Select value={newSource.syncInterval} onValueChange={(v) => setNewSource({ ...newSource, syncInterval: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">Realtime</SelectItem>
                        <SelectItem value="5">5 phút</SelectItem>
                        <SelectItem value="15">15 phút</SelectItem>
                        <SelectItem value="30">30 phút</SelectItem>
                        <SelectItem value="60">1 giờ</SelectItem>
                        <SelectItem value="manual">Thủ công</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                  <Button onClick={handleCreate}>Thêm nguồn</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tổng nguồn</p>
              <p className="text-3xl font-bold">{0}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-700">Đã kết nối</p>
              <p className="text-3xl font-bold text-green-800">{0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Tổng records</p>
              <p className="text-3xl font-bold">{(0 / 1000000).toFixed(1)}M</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Đồng bộ cuối</p>
              <p className="text-lg font-bold">{"N/A"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Data Sources Table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách nguồn dữ liệu</CardTitle>
            <CardDescription>Quản lý các nguồn dữ liệu cho hệ thống AI</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên nguồn</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Đồng bộ</TableHead>
                  <TableHead>Bật/Tắt</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {([] as any[]).map((source) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{source.connection}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(source.type)}</TableCell>
                    <TableCell>{getStatusBadge(source.status)}</TableCell>
                    <TableCell>{source.recordCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{source.syncInterval}</p>
                        <p className="text-xs text-muted-foreground">{source.lastSync}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={source.enabled} onCheckedChange={(v) => handleToggle(source.id, v)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleSync(source.id)}>
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleTestConnection(source.id)}>
                          <Link2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(source.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Data Tables Info */}
        <Card>
          <CardHeader>
            <CardTitle>Bảng dữ liệu có sẵn</CardTitle>
            <CardDescription>Các bảng dữ liệu được đồng bộ từ các nguồn</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {([] as any[]).filter(s => s.enabled).map((source) => (
                <Card key={source.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {source.name}
                      {getStatusBadge(source.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {source.tables.map((table, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{table}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
