import { useState, useMemo } from "react";
import { DateRange } from "react-day-picker";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DateRangePicker } from "@/components/DateRangePicker";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Bell, BellOff, Mail, AlertTriangle, CheckCircle, Info, 
  Clock, Search, RefreshCw, Filter, Trash2, Eye, EyeOff,
  ChevronLeft, ChevronRight, BarChart3, TrendingUp, FileText
} from "lucide-react";

export default function NotificationHistory() {
  const { language } = useLanguage();
  const isVi = language === "vi";
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    return { from: startDate, to: endDate };
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // API calls
  const { data: notifications, isLoading, refetch } = trpc.userNotification.list.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    unreadOnly: showUnreadOnly,
    types: selectedTypes.length > 0 ? selectedTypes as any : undefined,
    severities: selectedSeverities.length > 0 ? selectedSeverities as any : undefined,
    timeRange: "custom",
    startDate: dateRange?.from?.toISOString(),
    endDate: dateRange?.to?.toISOString(),
    search: searchQuery || undefined,
  });

  const { data: stats } = trpc.userNotification.getStats.useQuery({
    timeRange: "30days",
  });

  const { data: unreadCount } = trpc.userNotification.getUnreadCount.useQuery();

  const markAsReadMutation = trpc.userNotification.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(isVi ? "Đã đánh dấu đã đọc" : "Marked as read");
    },
  });

  const markAllAsReadMutation = trpc.userNotification.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(isVi ? "Đã đánh dấu tất cả đã đọc" : "All marked as read");
    },
  });

  const deleteMutation = trpc.userNotification.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(isVi ? "Đã xóa thông báo" : "Notification deleted");
    },
  });

  const notificationTypes = [
    { value: "report_sent", label: isVi ? "Báo cáo" : "Report", icon: FileText },
    { value: "spc_violation", label: isVi ? "Vi phạm SPC" : "SPC Violation", icon: AlertTriangle },
    { value: "cpk_alert", label: isVi ? "Cảnh báo CPK" : "CPK Alert", icon: TrendingUp },
    { value: "system", label: isVi ? "Hệ thống" : "System", icon: Bell },
    { value: "anomaly_detected", label: isVi ? "Phát hiện bất thường" : "Anomaly", icon: BarChart3 },
  ];

  const severityLevels = [
    { value: "info", label: "Info", color: "bg-blue-100 text-blue-700" },
    { value: "warning", label: "Warning", color: "bg-yellow-100 text-yellow-700" },
    { value: "critical", label: "Critical", color: "bg-red-100 text-red-700" },
  ];

  const getSeverityBadge = (severity: string) => {
    const level = severityLevels.find(l => l.value === severity);
    return (
      <Badge className={level?.color || "bg-gray-100 text-gray-700"}>
        {severity}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeInfo = notificationTypes.find(t => t.value === type);
    const Icon = typeInfo?.icon || Bell;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {typeInfo?.label || type}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(isVi ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    setPage(0);
  };

  const handleSeverityToggle = (severity: string) => {
    setSelectedSeverities(prev => 
      prev.includes(severity) 
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
    setPage(0);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isVi ? "Lịch sử Thông báo" : "Notification History"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isVi ? "Xem và quản lý tất cả thông báo của bạn" : "View and manage all your notifications"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isVi ? "Làm mới" : "Refresh"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={!unreadCount?.count}
            >
              <Eye className="h-4 w-4 mr-2" />
              {isVi ? "Đánh dấu tất cả đã đọc" : "Mark all read"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isVi ? "Tổng thông báo" : "Total Notifications"}
              </CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {isVi ? "Trong 30 ngày qua" : "Last 30 days"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isVi ? "Chưa đọc" : "Unread"}
              </CardTitle>
              <BellOff className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{unreadCount?.count || 0}</div>
              <p className="text-xs text-muted-foreground">
                {isVi ? "Cần xem xét" : "Needs attention"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isVi ? "Cảnh báo" : "Warnings"}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.bySeverity?.find((s: any) => s.severity === "warning")?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {isVi ? "Mức độ warning" : "Warning level"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {isVi ? "Nghiêm trọng" : "Critical"}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.bySeverity?.find((s: any) => s.severity === "critical")?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {isVi ? "Cần xử lý ngay" : "Immediate action"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {isVi ? "Bộ lọc" : "Filters"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>{isVi ? "Tìm kiếm" : "Search"}</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={isVi ? "Tìm theo tiêu đề hoặc nội dung..." : "Search by title or content..."}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(0);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>{isVi ? "Khoảng thời gian" : "Date Range"}</Label>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={(range) => {
                    setDateRange(range);
                    setPage(0);
                  }}
                  showPresets={true}
                />
              </div>

              {/* Unread Only */}
              <div className="space-y-2">
                <Label>{isVi ? "Trạng thái" : "Status"}</Label>
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="unread-only"
                    checked={showUnreadOnly}
                    onCheckedChange={(checked) => {
                      setShowUnreadOnly(checked as boolean);
                      setPage(0);
                    }}
                  />
                  <label htmlFor="unread-only" className="text-sm cursor-pointer">
                    {isVi ? "Chỉ hiển thị chưa đọc" : "Show unread only"}
                  </label>
                </div>
              </div>
            </div>

            {/* Type Filters */}
            <div className="space-y-2">
              <Label>{isVi ? "Loại thông báo" : "Notification Type"}</Label>
              <div className="flex flex-wrap gap-2">
                {notificationTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedTypes.includes(type.value);
                  return (
                    <Button
                      key={type.value}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleTypeToggle(type.value)}
                      className="flex items-center gap-1"
                    >
                      <Icon className="h-3 w-3" />
                      {type.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Severity Filters */}
            <div className="space-y-2">
              <Label>{isVi ? "Mức độ nghiêm trọng" : "Severity"}</Label>
              <div className="flex flex-wrap gap-2">
                {severityLevels.map((level) => {
                  const isSelected = selectedSeverities.includes(level.value);
                  return (
                    <Button
                      key={level.value}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSeverityToggle(level.value)}
                      className={isSelected ? "" : level.color}
                    >
                      {level.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification List */}
        <Card>
          <CardHeader>
            <CardTitle>{isVi ? "Danh sách thông báo" : "Notification List"}</CardTitle>
            <CardDescription>
              {isVi 
                ? `Hiển thị ${notifications?.length || 0} thông báo` 
                : `Showing ${notifications?.length || 0} notifications`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      notification.isRead 
                        ? "bg-background border-border" 
                        : "bg-accent/50 border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTypeBadge(notification.type)}
                          {getSeverityBadge(notification.severity)}
                          {!notification.isRead && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {isVi ? "Mới" : "New"}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold">{notification.title}</h4>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(notification.createdAt)}
                          {notification.readAt && (
                            <>
                              <span>•</span>
                              <Eye className="h-3 w-3" />
                              {isVi ? "Đã đọc" : "Read"}: {formatDate(notification.readAt)}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsReadMutation.mutate({ notificationId: notification.id })}
                            title={isVi ? "Đánh dấu đã đọc" : "Mark as read"}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ notificationId: notification.id })}
                          title={isVi ? "Xóa" : "Delete"}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {isVi ? "Trước" : "Previous"}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {isVi ? `Trang ${page + 1}` : `Page ${page + 1}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={(notifications?.length || 0) < pageSize}
                  >
                    {isVi ? "Sau" : "Next"}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  {isVi ? "Không có thông báo" : "No notifications"}
                </p>
                <p className="text-sm">
                  {isVi 
                    ? "Thử thay đổi bộ lọc để xem thêm thông báo" 
                    : "Try adjusting filters to see more notifications"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
