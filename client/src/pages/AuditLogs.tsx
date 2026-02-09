import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  Loader2, Search, Eye, FileText, RefreshCw, Download,
  Activity, Users, Shield, BarChart3, Clock, ChevronLeft, ChevronRight,
  ArrowUpDown, Filter, CalendarDays
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface AuditLog {
  id: number;
  userId: number;
  userName: string | null;
  action: string;
  module: string;
  tableName: string | null;
  recordId: number | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  authType: "local" | "online" | null;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  login: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  logout: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  export: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  analyze: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  import: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  backup: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  restore: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  config_change: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  permission_change: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  license_activate: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  license_revoke: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  api_access: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
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

const actionIcons: Record<string, string> = {
  create: "➕", update: "✏️", delete: "🗑️", login: "🔑", logout: "🚪",
  export: "📤", analyze: "📊", import: "📥", backup: "💾", restore: "♻️",
};

export default function AuditLogs() {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("logs");
  const [filters, setFilters] = useState({
    action: "all",
    module: "all",
    userId: undefined as number | undefined,
    search: "",
    startDate: "",
    endDate: "",
    authType: "all",
    sortOrder: "desc" as "asc" | "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  // Stabilize query inputs
  const queryInput = useMemo(() => ({
    page,
    pageSize,
    action: filters.action !== "all" ? filters.action : undefined,
    module: filters.module !== "all" ? filters.module : undefined,
    userId: filters.userId,
    search: filters.search || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    authType: filters.authType !== "all" ? filters.authType : undefined,
    sortOrder: filters.sortOrder,
  }), [page, pageSize, filters]);

  const statsInput = useMemo(() => ({
    userId: filters.userId,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
  }), [filters.userId, filters.startDate, filters.endDate]);

  // Queries
  const { data: logsData, isLoading: logsLoading, refetch } = trpc.audit.advancedSearch.useQuery(queryInput);
  const { data: stats } = trpc.audit.stats.useQuery(statsInput);
  const { data: auditUsers } = trpc.audit.users.useQuery();
  const { data: auditModules } = trpc.audit.modules.useQuery();

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

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleExportCSV = useCallback(() => {
    if (!logsData?.logs || logsData.logs.length === 0) return;
    const headers = ["ID", "Thời gian", "Người dùng", "Hành động", "Module", "Bảng", "Record ID", "Mô tả", "IP", "Loại xác thực"];
    const rows = logsData.logs.map((log: any) => [
      log.id,
      log.createdAt ? format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss") : "",
      log.userName || `User #${log.userId}`,
      actionLabels[log.action] || log.action,
      log.module,
      log.tableName || "",
      log.recordId || "",
      (log.description || "").replace(/"/g, '""'),
      log.ipAddress || "",
      log.authType || "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyyMMdd-HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logsData]);

  const resetFilters = useCallback(() => {
    setFilters({
      action: "all", module: "all", userId: undefined,
      search: "", startDate: "", endDate: "", authType: "all", sortOrder: "desc",
    });
    setPage(1);
  }, []);

  const totalPages = logsData?.totalPages || 0;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" />
              Nhật ký Hoạt động
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Theo dõi và giám sát mọi thao tác trong hệ thống
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!logsData?.logs?.length}>
              <Download className="h-4 w-4 mr-1" />
              Xuất CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={logsLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Tổng sự kiện</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">
                    {stats?.total?.toLocaleString() || "0"}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Loại hành động</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">
                    {stats?.byAction?.length || "0"}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Người dùng</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">
                    {stats?.topUsers?.length || "0"}
                  </p>
                </div>
                <Users className="h-8 w-8 text-green-500/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Hoạt động 24h</p>
                  <p className="text-xl md:text-2xl font-bold mt-1">
                    {stats?.recentActivity?.reduce((sum: number, a: any) => sum + (a.count || 0), 0)?.toLocaleString() || "0"}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-500/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="logs" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Nhật ký
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" />
              Thống kê
            </TabsTrigger>
          </TabsList>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-4 mt-4">
            {/* Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Bộ lọc nâng cao
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* User filter */}
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Người dùng</label>
                    <Select
                      value={filters.userId?.toString() || "all"}
                      onValueChange={(v) => handleFilterChange("userId", v === "all" ? undefined : parseInt(v))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Tất cả" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả người dùng</SelectItem>
                        {auditUsers?.map((u: any) => (
                          <SelectItem key={u.userId} value={u.userId.toString()}>
                            {u.userName || `User #${u.userId}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Action filter */}
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Hành động</label>
                    <Select value={filters.action} onValueChange={(v) => handleFilterChange("action", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả hành động</SelectItem>
                        {Object.entries(actionLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Module filter */}
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Module</label>
                    <Select value={filters.module} onValueChange={(v) => handleFilterChange("module", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả module</SelectItem>
                        {auditModules?.map((m: any) => (
                          <SelectItem key={m.module} value={m.module}>
                            {m.module}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Auth type filter */}
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Loại xác thực</label>
                    <Select value={filters.authType} onValueChange={(v) => handleFilterChange("authType", v)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="online">Online (OAuth)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date range */}
                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">
                      <CalendarDays className="h-3 w-3 inline mr-1" />
                      Từ ngày
                    </label>
                    <Input
                      type="datetime-local"
                      className="h-9 text-sm"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">
                      <CalendarDays className="h-3 w-3 inline mr-1" />
                      Đến ngày
                    </label>
                    <Input
                      type="datetime-local"
                      className="h-9 text-sm"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    />
                  </div>

                  {/* Search */}
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="text-xs font-medium mb-1 block text-muted-foreground">Tìm kiếm</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Mô tả, tên người dùng..."
                        className="h-9 pl-8 text-sm"
                        value={filters.search}
                        onChange={(e) => handleFilterChange("search", e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Sort & Reset */}
                  <div className="flex items-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9"
                      onClick={() => handleFilterChange("sortOrder", filters.sortOrder === "desc" ? "asc" : "desc")}
                    >
                      <ArrowUpDown className="h-4 w-4 mr-1" />
                      {filters.sortOrder === "desc" ? "Mới nhất" : "Cũ nhất"}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={resetFilters}>
                      Xóa lọc
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Logs Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Danh sách Nhật ký</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {logsData ? `${logsData.total.toLocaleString()} bản ghi | Trang ${page}/${totalPages || 1}` : "Đang tải..."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !logsData?.logs?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Không có nhật ký nào phù hợp</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[160px]">Thời gian</TableHead>
                            <TableHead className="w-[140px]">Người dùng</TableHead>
                            <TableHead className="w-[70px]">Loại</TableHead>
                            <TableHead className="w-[120px]">Hành động</TableHead>
                            <TableHead className="w-[120px]">Module</TableHead>
                            <TableHead>Mô tả</TableHead>
                            <TableHead className="w-[100px]">IP</TableHead>
                            <TableHead className="w-[60px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logsData.logs.map((log: any) => (
                            <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(log)}>
                              <TableCell className="text-xs font-mono">
                                {log.createdAt ? format(new Date(log.createdAt), "dd/MM/yy HH:mm:ss", { locale: vi }) : "-"}
                              </TableCell>
                              <TableCell className="text-sm">
                                <span className="font-medium">{log.userName || `User #${log.userId}`}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={log.authType === "local" ? "secondary" : "outline"} className="text-[10px] px-1.5">
                                  {log.authType === "local" ? "Local" : "OAuth"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={`text-xs ${actionColors[log.action] || "bg-gray-100 text-gray-800"}`}>
                                  {actionIcons[log.action] || "📋"} {actionLabels[log.action] || log.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm capitalize">{log.module}</TableCell>
                              <TableCell className="text-sm max-w-[250px] truncate text-muted-foreground">
                                {log.description || "-"}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {log.ipAddress || "-"}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); openDetail(log); }}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Hiển thị {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, logsData.total)} / {logsData.total.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={page <= 1}
                          onClick={() => setPage(p => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={page === pageNum ? "default" : "outline"}
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setPage(pageNum)}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={page >= totalPages}
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Action Distribution */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Phân bổ theo Hành động</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.byAction?.length ? (
                    <div className="space-y-2">
                      {stats.byAction.map((item: any) => {
                        const pct = stats.total > 0 ? ((item.count / stats.total) * 100) : 0;
                        return (
                          <div key={item.action} className="flex items-center gap-3">
                            <div className="w-24 text-sm">
                              <Badge className={`text-xs ${actionColors[item.action] || "bg-gray-100 text-gray-800"}`}>
                                {actionLabels[item.action] || item.action}
                              </Badge>
                            </div>
                            <div className="flex-1">
                              <div className="h-5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary/70 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(pct, 1)}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-20 text-right text-sm font-mono">
                              {item.count.toLocaleString()} <span className="text-muted-foreground text-xs">({pct.toFixed(1)}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
                  )}
                </CardContent>
              </Card>

              {/* Module Distribution */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Top 10 Module</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.byModule?.length ? (
                    <div className="space-y-2">
                      {stats.byModule.map((item: any, idx: number) => {
                        const maxCount = stats.byModule[0]?.count || 1;
                        const pct = (item.count / maxCount) * 100;
                        return (
                          <div key={item.module} className="flex items-center gap-3">
                            <div className="w-6 text-xs text-muted-foreground font-mono">{idx + 1}.</div>
                            <div className="w-28 text-sm capitalize truncate font-medium">{item.module}</div>
                            <div className="flex-1">
                              <div className="h-5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500/60 rounded-full transition-all duration-500"
                                  style={{ width: `${Math.max(pct, 2)}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-16 text-right text-sm font-mono">{item.count.toLocaleString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
                  )}
                </CardContent>
              </Card>

              {/* Top Users */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Top 10 Người dùng hoạt động</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.topUsers?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Người dùng</TableHead>
                          <TableHead className="text-right">Số sự kiện</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.topUsers.map((user: any, idx: number) => (
                          <TableRow key={user.userId}>
                            <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{user.userName || `User #${user.userId}`}</TableCell>
                            <TableCell className="text-right font-mono">{user.count.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
                  )}
                </CardContent>
              </Card>

              {/* Activity Timeline (24h) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Hoạt động 24 giờ qua</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.recentActivity?.length ? (
                    <div className="space-y-1">
                      {stats.recentActivity.map((item: any) => {
                        const maxCount = Math.max(...stats.recentActivity.map((a: any) => a.count || 0), 1);
                        const pct = ((item.count || 0) / maxCount) * 100;
                        const hour = item.hour ? format(new Date(item.hour), "HH:mm") : "";
                        return (
                          <div key={item.hour} className="flex items-center gap-2">
                            <div className="w-12 text-xs font-mono text-muted-foreground">{hour}</div>
                            <div className="flex-1">
                              <div className="h-4 bg-muted rounded overflow-hidden">
                                <div
                                  className="h-full bg-green-500/60 rounded transition-all duration-300"
                                  style={{ width: `${Math.max(pct, 1)}%` }}
                                />
                              </div>
                            </div>
                            <div className="w-10 text-right text-xs font-mono">{item.count}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Không có hoạt động trong 24h qua</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Chi tiết Nhật ký #{selectedLog?.id}
              </DialogTitle>
              <DialogDescription>
                {selectedLog?.createdAt && format(new Date(selectedLog.createdAt), "EEEE, dd/MM/yyyy HH:mm:ss", { locale: vi })}
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Người dùng</label>
                    <p className="font-medium mt-0.5">{selectedLog.userName || `User #${selectedLog.userId}`}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hành động</label>
                    <p className="mt-0.5">
                      <Badge className={actionColors[selectedLog.action]}>
                        {actionIcons[selectedLog.action] || "📋"} {actionLabels[selectedLog.action] || selectedLog.action}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Module</label>
                    <p className="capitalize font-medium mt-0.5">{selectedLog.module}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bảng / Record</label>
                    <p className="mt-0.5">{selectedLog.tableName || "-"} {selectedLog.recordId ? `#${selectedLog.recordId}` : ""}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Xác thực</label>
                    <p className="mt-0.5">
                      <Badge variant={selectedLog.authType === "local" ? "secondary" : "outline"}>
                        {selectedLog.authType === "local" ? "Local" : "Online (OAuth)"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IP Address</label>
                    <p className="font-mono text-sm mt-0.5">{selectedLog.ipAddress || "-"}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mô tả</label>
                  <p className="mt-1 text-sm">{selectedLog.description || "Không có mô tả"}</p>
                </div>

                {selectedLog.userAgent && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">User Agent</label>
                    <p className="mt-1 text-xs font-mono text-muted-foreground break-all">{selectedLog.userAgent}</p>
                  </div>
                )}

                {selectedLog.oldValue && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Giá trị cũ</label>
                    <pre className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-3 rounded-md text-xs overflow-x-auto mt-1 max-h-48">
                      {formatJson(selectedLog.oldValue)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValue && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Giá trị mới</label>
                    <pre className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 p-3 rounded-md text-xs overflow-x-auto mt-1 max-h-48">
                      {formatJson(selectedLog.newValue)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
