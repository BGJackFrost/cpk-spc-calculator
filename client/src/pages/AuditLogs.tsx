import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Eye, FileText, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface AuditLog {
  id: number;
  userId: number;
  userName: string | null;
  action: "create" | "update" | "delete" | "login" | "logout" | "export" | "analyze";
  module: string;
  tableName: string | null;
  recordId: number | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  authType: "local" | "online" | null;
  createdAt: Date;
}

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-purple-100 text-purple-800",
  logout: "bg-gray-100 text-gray-800",
  export: "bg-orange-100 text-orange-800",
  analyze: "bg-cyan-100 text-cyan-800",
};

const actionLabels: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xóa",
  login: "Đăng nhập",
  logout: "Đăng xuất",
  export: "Xuất báo cáo",
  analyze: "Phân tích",
};

export default function AuditLogs() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filters, setFilters] = useState({
    action: "all",
    module: "all",
    search: "",
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.audit.list.useQuery({
    page,
    pageSize,
    action: filters.action !== "all" ? filters.action : undefined,
    module: filters.module !== "all" ? filters.module : undefined,
    search: filters.search || undefined,
  });

  const logs = data?.logs || [];
  const totalPages = data?.totalPages || 1;

  const openDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const formatJson = (jsonString: string | null) => {
    if (!jsonString) return null;
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nhật ký Hoạt động</h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi các thao tác quan trọng trong hệ thống
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Hành động</label>
                <Select
                  value={filters.action}
                  onValueChange={(value) => {
                    setFilters({ ...filters, action: value });
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="create">Tạo mới</SelectItem>
                    <SelectItem value="update">Cập nhật</SelectItem>
                    <SelectItem value="delete">Xóa</SelectItem>
                    <SelectItem value="login">Đăng nhập</SelectItem>
                    <SelectItem value="logout">Đăng xuất</SelectItem>
                    <SelectItem value="export">Xuất báo cáo</SelectItem>
                    <SelectItem value="analyze">Phân tích</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Module</label>
                <Select
                  value={filters.module}
                  onValueChange={(value) => {
                    setFilters({ ...filters, module: value });
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="product">Sản phẩm</SelectItem>
                    <SelectItem value="production_line">Dây chuyền</SelectItem>
                    <SelectItem value="workstation">Công trạm</SelectItem>
                    <SelectItem value="machine">Máy</SelectItem>
                    <SelectItem value="mapping">Mapping</SelectItem>
                    <SelectItem value="spc">SPC/CPK</SelectItem>
                    <SelectItem value="user">Người dùng</SelectItem>
                    <SelectItem value="permission">Phân quyền</SelectItem>
                    <SelectItem value="system">Hệ thống</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1 block">Tìm kiếm</label>
                <Input
                  placeholder="Tìm theo mô tả, tên người dùng..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Danh sách Nhật ký
            </CardTitle>
            <CardDescription>
              Hiển thị {logs.length} / {data?.total || 0} bản ghi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Không có nhật ký nào
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Thời gian</TableHead>
                      <TableHead>Người dùng</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Hành động</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Mô tả</TableHead>
                      <TableHead className="w-[80px]">Chi tiết</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: AuditLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
                        </TableCell>
                        <TableCell>{log.userName || `User #${log.userId}`}</TableCell>
                        <TableCell>
                          <Badge variant={log.authType === "local" ? "secondary" : "outline"} className="text-xs">
                            {log.authType === "local" ? "Local" : "Online"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={actionColors[log.action]}>
                            {actionLabels[log.action]}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{log.module}</TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {log.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Trang {page} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chi tiết Nhật ký #{selectedLog?.id}</DialogTitle>
              <DialogDescription>
                {selectedLog && format(new Date(selectedLog.createdAt), "dd/MM/yyyy HH:mm:ss", { locale: vi })}
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Người dùng</label>
                    <p>{selectedLog.userName || `User #${selectedLog.userId}`}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Hành động</label>
                    <p>
                      <Badge className={actionColors[selectedLog.action]}>
                        {actionLabels[selectedLog.action]}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Module</label>
                    <p className="capitalize">{selectedLog.module}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Bảng / Record ID</label>
                    <p>{selectedLog.tableName || "-"} {selectedLog.recordId ? `#${selectedLog.recordId}` : ""}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mô tả</label>
                  <p>{selectedLog.description || "-"}</p>
                </div>

                {selectedLog.oldValue && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Giá trị cũ</label>
                    <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                      {formatJson(selectedLog.oldValue)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValue && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Giá trị mới</label>
                    <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                      {formatJson(selectedLog.newValue)}
                    </pre>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                    <p>{selectedLog.ipAddress || "-"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                    <p className="truncate">{selectedLog.userAgent || "-"}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
