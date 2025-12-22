import { useState, useCallback, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Eye, FileText, RefreshCw, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface AuditLog {
  id: number;
  userId: number;
  userName: string | null;
  action: "create" | "update" | "delete" | "login" | "logout" | "export" | "analyze" | "import" | "backup" | "restore" | "config_change" | "permission_change" | "license_activate" | "license_revoke" | "api_access";
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
  import: "bg-teal-100 text-teal-800",
  backup: "bg-indigo-100 text-indigo-800",
  restore: "bg-amber-100 text-amber-800",
  config_change: "bg-yellow-100 text-yellow-800",
  permission_change: "bg-pink-100 text-pink-800",
  license_activate: "bg-emerald-100 text-emerald-800",
  license_revoke: "bg-rose-100 text-rose-800",
  api_access: "bg-slate-100 text-slate-800",
};

const actionLabels: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xóa",
  login: "Đăng nhập",
  logout: "Đăng xuất",
  export: "Xuất báo cáo",
  analyze: "Phân tích",
  import: "Nhập dữ liệu",
  backup: "Sao lưu",
  restore: "Khôi phục",
  config_change: "Thay đổi cấu hình",
  permission_change: "Thay đổi quyền",
  license_activate: "Kích hoạt license",
  license_revoke: "Thu hồi license",
  api_access: "Truy cập API",
};

export default function AuditLogs() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filters, setFilters] = useState({
    action: "all",
    module: "all",
    search: "",
  });
  
  // Cursor pagination state
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20;

  // Fetch logs with cursor pagination
  const { data, isLoading, refetch } = trpc.audit.listWithCursor.useQuery({
    cursor,
    limit: pageSize,
    direction: 'forward',
    action: filters.action !== "all" ? filters.action : undefined,
    module: filters.module !== "all" ? filters.module : undefined,
    search: filters.search || undefined,
  });

  // Update allLogs when data changes
  useEffect(() => {
    if (data?.items) {
      if (!cursor) {
        // First load or filter change - replace all
        setAllLogs(data.items as AuditLog[]);
      } else if (isLoadingMore) {
        // Loading more - append
        setAllLogs(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const newItems = (data.items as AuditLog[]).filter(l => !existingIds.has(l.id));
          return [...prev, ...newItems];
        });
        setIsLoadingMore(false);
      }
    }
  }, [data, cursor, isLoadingMore]);

  // Reset when filters change
  useEffect(() => {
    setAllLogs([]);
    setCursor(undefined);
    setIsLoadingMore(false);
  }, [filters.action, filters.module, filters.search]);

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

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (data?.nextCursor && !isLoading && !isLoadingMore) {
      setIsLoadingMore(true);
      setCursor(data.nextCursor);
    }
  }, [data?.nextCursor, isLoading, isLoadingMore]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setAllLogs([]);
    setCursor(undefined);
    setIsLoadingMore(false);
    refetch();
  }, [refetch]);

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
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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
              Đang hiển thị {allLogs.length} / {data?.totalCount || 0} bản ghi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && allLogs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : allLogs.length === 0 ? (
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
                    {allLogs.map((log: AuditLog) => (
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

                {/* Load More Button */}
                <div className="flex flex-col items-center gap-2 py-4 mt-4 border-t">
                  {data?.totalCount !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      Đang hiển thị {allLogs.length} / {data.totalCount} bản ghi
                      {data.totalCount > 0 && ` (${Math.round((allLogs.length / data.totalCount) * 100)}%)`}
                    </div>
                  )}
                  
                  {data?.hasMore ? (
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          Tải thêm
                        </>
                      )}
                    </Button>
                  ) : allLogs.length > 0 ? (
                    <span className="text-sm text-muted-foreground">Đã hiển thị tất cả</span>
                  ) : null}

                  {/* Progress bar */}
                  {data?.totalCount !== undefined && data.totalCount > 0 && (
                    <div className="w-full max-w-xs">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.round((allLogs.length / data.totalCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
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
