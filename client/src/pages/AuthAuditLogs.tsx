import { useState, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { 
  Shield, 
  Search,
  RefreshCw,
  User,
  Calendar,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Unlock,
  Key,
  LogIn,
  LogOut,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// Event type labels
const EVENT_TYPE_LABELS: Record<string, string> = {
  login_success: "Đăng nhập thành công",
  login_failed: "Đăng nhập thất bại",
  logout: "Đăng xuất",
  password_change: "Đổi mật khẩu",
  password_reset: "Reset mật khẩu",
  "2fa_enabled": "Bật 2FA",
  "2fa_disabled": "Tắt 2FA",
  "2fa_verified": "Xác thực 2FA",
  account_locked: "Khóa tài khoản",
  account_unlocked: "Mở khóa tài khoản",
  session_expired: "Phiên hết hạn",
  token_refresh: "Làm mới token",
};

// Severity colors
const SEVERITY_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  info: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Info },
  warning: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: AlertTriangle },
  critical: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: AlertCircle },
};

// Event type icons
const getEventIcon = (eventType: string) => {
  switch (eventType) {
    case "login_success":
      return <LogIn className="h-4 w-4 text-green-500" />;
    case "login_failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "logout":
      return <LogOut className="h-4 w-4 text-blue-500" />;
    case "password_change":
    case "password_reset":
      return <Key className="h-4 w-4 text-orange-500" />;
    case "2fa_enabled":
    case "2fa_verified":
      return <Smartphone className="h-4 w-4 text-green-500" />;
    case "2fa_disabled":
      return <Smartphone className="h-4 w-4 text-red-500" />;
    case "account_locked":
      return <Lock className="h-4 w-4 text-red-500" />;
    case "account_unlocked":
      return <Unlock className="h-4 w-4 text-green-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

export default function AuthAuditLogs() {
  const [filters, setFilters] = useState({
    userId: "",
    username: "",
    eventType: "all",
    severity: "all",
    dateFrom: "",
    dateTo: ""
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch users for filter dropdown
  const usersQuery = trpc.localAuth.getUsersForFilter.useQuery();

  // Fetch auth audit logs with filters
  const logsQuery = trpc.localAuth.getAuthAuditLogsWithUserInfo.useQuery({
    userId: filters.userId ? parseInt(filters.userId) : undefined,
    username: filters.username || undefined,
    eventType: filters.eventType !== "all" ? filters.eventType as any : undefined,
    severity: filters.severity !== "all" ? filters.severity as any : undefined,
    startDate: filters.dateFrom || undefined,
    endDate: filters.dateTo || undefined,
    page,
    pageSize,
  });

  // Fetch stats
  const statsQuery = trpc.localAuth.getAuthAuditStats.useQuery({ days: 30 });

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      userId: "",
      username: "",
      eventType: "all",
      severity: "all",
      dateFrom: "",
      dateTo: ""
    });
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    logsQuery.refetch();
    statsQuery.refetch();
    toast.success("Đã làm mới dữ liệu");
  }, [logsQuery, statsQuery]);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd/MM/yyyy HH:mm:ss", { locale: vi });
    } catch {
      return dateStr;
    }
  };

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return null;
    }
  };

  const stats = statsQuery.data;
  const logs = logsQuery.data?.logs || [];
  const totalPages = logsQuery.data?.totalPages || 1;
  const total = logsQuery.data?.total || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Auth Audit Logs
            </h1>
            <p className="text-muted-foreground">
              Theo dõi và giám sát các hoạt động xác thực trong hệ thống
            </p>
          </div>
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Statistics Cards */}
        {statsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Đăng nhập thành công</p>
                    <p className="text-2xl font-bold text-green-600">{stats.loginSuccess}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Đăng nhập thất bại</p>
                    <p className="text-2xl font-bold text-red-600">{stats.loginFailed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Lock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tài khoản bị khóa</p>
                    <p className="text-2xl font-bold text-orange-600">{stats.accountLocked}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng sự kiện (30 ngày)</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalEvents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* User filter */}
              <div className="space-y-2">
                <Label>Người dùng</Label>
                <Select 
                  value={filters.userId} 
                  onValueChange={(v) => handleFilterChange({...filters, userId: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả người dùng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả người dùng</SelectItem>
                    {usersQuery.data?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.email || user.openId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Username search */}
              <div className="space-y-2">
                <Label>Tên đăng nhập</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-9"
                    placeholder="Tìm theo username..."
                    value={filters.username}
                    onChange={(e) => handleFilterChange({...filters, username: e.target.value})}
                  />
                </div>
              </div>

              {/* Event type filter */}
              <div className="space-y-2">
                <Label>Loại sự kiện</Label>
                <Select 
                  value={filters.eventType} 
                  onValueChange={(v) => handleFilterChange({...filters, eventType: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả sự kiện</SelectItem>
                    <SelectItem value="login_success">Đăng nhập thành công</SelectItem>
                    <SelectItem value="login_failed">Đăng nhập thất bại</SelectItem>
                    <SelectItem value="logout">Đăng xuất</SelectItem>
                    <SelectItem value="password_change">Đổi mật khẩu</SelectItem>
                    <SelectItem value="password_reset">Reset mật khẩu</SelectItem>
                    <SelectItem value="2fa_enabled">Bật 2FA</SelectItem>
                    <SelectItem value="2fa_disabled">Tắt 2FA</SelectItem>
                    <SelectItem value="account_locked">Khóa tài khoản</SelectItem>
                    <SelectItem value="account_unlocked">Mở khóa tài khoản</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Severity filter */}
              <div className="space-y-2">
                <Label>Mức độ</Label>
                <Select 
                  value={filters.severity} 
                  onValueChange={(v) => handleFilterChange({...filters, severity: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả mức độ</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date from */}
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input 
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange({...filters, dateFrom: e.target.value})}
                />
              </div>

              {/* Date to */}
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input 
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange({...filters, dateTo: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách sự kiện</CardTitle>
              <span className="text-sm text-muted-foreground">
                Tổng: {total} sự kiện
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {logsQuery.isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Không có sự kiện nào phù hợp với bộ lọc</p>
              </div>
            ) : (
              <>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Thời gian</TableHead>
                        <TableHead>Người dùng</TableHead>
                        <TableHead>Sự kiện</TableHead>
                        <TableHead>Mức độ</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Chi tiết</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log: any) => {
                        const severityConfig = SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.info;
                        const SeverityIcon = severityConfig.icon;
                        const details = parseDetails(log.details);
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono text-sm">
                              {formatDate(log.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={log.user_avatar} />
                                  <AvatarFallback>
                                    {(log.user_name || log.username || "U")[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {log.user_name || log.username || "Unknown"}
                                  </p>
                                  {log.user_email && (
                                    <p className="text-xs text-muted-foreground">{log.user_email}</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getEventIcon(log.event_type)}
                                <span className="text-sm">
                                  {EVENT_TYPE_LABELS[log.event_type] || log.event_type}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${severityConfig.bg} ${severityConfig.text} border-0`}>
                                <SeverityIcon className="h-3 w-3 mr-1" />
                                {log.severity.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                {log.ip_address || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px]">
                              {details ? (
                                <span className="text-xs text-muted-foreground truncate block">
                                  {details.reason || details.unlockedBy || JSON.stringify(details).substring(0, 50)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Trang {page} / {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Sau
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
