import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter, 
  RefreshCw,
  BarChart3,
  Calendar,
  TrendingUp,
  RotateCw,
  CheckSquare,
  Square
} from "lucide-react";
import { toast } from "sonner";

const NOTIFICATION_TYPES = [
  { value: "7_days_warning", label: "Cảnh báo 7 ngày", color: "bg-orange-100 text-orange-800" },
  { value: "30_days_warning", label: "Cảnh báo 30 ngày", color: "bg-yellow-100 text-yellow-800" },
  { value: "expired", label: "Đã hết hạn", color: "bg-red-100 text-red-800" },
  { value: "activated", label: "Kích hoạt", color: "bg-green-100 text-green-800" },
  { value: "deactivated", label: "Hủy kích hoạt", color: "bg-gray-100 text-gray-800" },
];

const STATUS_OPTIONS = [
  { value: "sent", label: "Đã gửi", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  { value: "failed", label: "Thất bại", color: "bg-red-100 text-red-800", icon: XCircle },
  { value: "pending", label: "Đang chờ", color: "bg-yellow-100 text-yellow-800", icon: Clock },
];

export default function LicenseNotificationReport() {
  const [filters, setFilters] = useState({
    notificationType: "all",
    status: "all",
    startDate: "",
    endDate: "",
    limit: 50,
    offset: 0,
  });
  const [statsDays, setStatsDays] = useState(30);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const { data: logsData, isLoading, refetch } = trpc.license.getNotificationLogs.useQuery({
    notificationType: filters.notificationType !== "all" ? filters.notificationType : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    startDate: filters.startDate ? new Date(filters.startDate) : undefined,
    endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    limit: filters.limit,
    offset: filters.offset,
  });

  const { data: stats, isLoading: statsLoading } = trpc.license.getNotificationStats.useQuery({ days: statsDays });

  const retryMutation = trpc.license.retryNotification.useMutation({
    onSuccess: () => {
      toast.success("Gửi lại thành công");
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
    onSettled: () => setRetryingId(null),
  });

  const bulkRetryMutation = trpc.license.bulkRetryNotifications.useMutation({
    onSuccess: (result) => {
      toast.success(`Gửi lại: ${result.successCount} thành công, ${result.failCount} thất bại`);
      setSelectedIds([]);
      refetch();
    },
    onError: (error) => toast.error(`Lỗi: ${error.message}`),
  });

  const handleRetry = (id: number) => {
    setRetryingId(id);
    retryMutation.mutate({ id });
  };

  const handleBulkRetry = () => {
    if (selectedIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 email");
      return;
    }
    bulkRetryMutation.mutate({ ids: selectedIds });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const failedLogs = logsData?.logs.filter(log => log.status === "failed") || [];
    if (selectedIds.length === failedLogs.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(failedLogs.map(log => log.id));
    }
  };

  const getTypeBadge = (type: string) => {
    const opt = NOTIFICATION_TYPES.find((t) => t.value === type);
    return opt ? (
      <Badge className={opt.color}>{opt.label}</Badge>
    ) : (
      <Badge variant="outline">{type}</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    if (!opt) return <Badge variant="outline">{status}</Badge>;
    const Icon = opt.icon;
    return (
      <Badge className={opt.color}>
        <Icon className="h-3 w-3 mr-1" />
        {opt.label}
      </Badge>
    );
  };

  const totalPages = Math.ceil((logsData?.total || 0) / filters.limit);
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Báo cáo Email License
            </h1>
            <p className="text-muted-foreground">
              Theo dõi các email thông báo license đã gửi
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tổng email đã gửi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.byStatus?.find(s => s.status === "sent")?.count || 0}
              </div>
              <p className="text-xs text-green-600 flex items-center mt-1">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Trong {statsDays} ngày qua
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Email thất bại
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? "..." : stats?.byStatus?.find(s => s.status === "failed")?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <XCircle className="h-3 w-3 mr-1" />
                Cần kiểm tra
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cảnh báo 7 ngày
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? "..." : stats?.byType?.find(t => t.notificationType === "7_days_warning")?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" />
                License sắp hết hạn
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Thông báo hết hạn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? "..." : stats?.byType?.find(t => t.notificationType === "expired")?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                License đã hết hạn
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart - Daily Stats */}
        {stats?.byDay && stats.byDay.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Thống kê theo ngày ({statsDays} ngày gần nhất)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <Label>Khoảng thời gian:</Label>
                <Select value={statsDays.toString()} onValueChange={(v) => setStatsDays(parseInt(v))}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 ngày</SelectItem>
                    <SelectItem value="14">14 ngày</SelectItem>
                    <SelectItem value="30">30 ngày</SelectItem>
                    <SelectItem value="60">60 ngày</SelectItem>
                    <SelectItem value="90">90 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-center">Đã gửi</TableHead>
                      <TableHead className="text-center">Thất bại</TableHead>
                      <TableHead className="text-center">Đang chờ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.byDay.slice(-10).map((day) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">{day.date}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50">{day.sent}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-red-50">{day.failed}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-yellow-50">{day.pending}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Bộ lọc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Loại thông báo</Label>
                <Select
                  value={filters.notificationType}
                  onValueChange={(v) => setFilters({ ...filters, notificationType: v, offset: 0 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {NOTIFICATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select
                  value={filters.status}
                  onValueChange={(v) => setFilters({ ...filters, status: v, offset: 0 })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Từ ngày</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value, offset: 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Đến ngày</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value, offset: 0 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Lịch sử Email ({logsData?.total || 0} bản ghi)
            </CardTitle>
            <CardDescription>
              Danh sách các email thông báo license đã gửi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
            ) : !logsData?.logs?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                Không có dữ liệu email nào
              </div>
            ) : (
              <>
                {/* Bulk Retry Button */}
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
                    <span className="text-sm">Đã chọn {selectedIds.length} email thất bại</span>
                    <Button 
                      size="sm" 
                      onClick={handleBulkRetry}
                      disabled={bulkRetryMutation.isPending}
                    >
                      {bulkRetryMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <RotateCw className="h-4 w-4 mr-1" />
                      )}
                      Gửi lại tất cả
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedIds([])}
                    >
                      Bỏ chọn
                    </Button>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <button 
                          onClick={toggleSelectAll}
                          className="p-1 hover:bg-muted rounded"
                          title="Chọn tất cả email thất bại"
                        >
                          {selectedIds.length > 0 && selectedIds.length === (logsData?.logs.filter(l => l.status === "failed").length || 0) ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>License Key</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Tiêu đề</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.status === "failed" && (
                            <button 
                              onClick={() => toggleSelect(log.id)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {selectedIds.includes(log.id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString("vi-VN") : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.licenseKey}</TableCell>
                        <TableCell>{log.recipientEmail}</TableCell>
                        <TableCell>{getTypeBadge(log.notificationType)}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell className="text-right">
                          {log.status === "failed" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRetry(log.id)}
                              disabled={retryingId === log.id}
                              title="Gửi lại"
                            >
                              {retryingId === log.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCw className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {(log?.retryCount ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({log?.retryCount ?? 0}x)
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Trang {currentPage} / {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setFilters({ ...filters, offset: filters.offset - filters.limit })}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
